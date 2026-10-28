const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture() {
    const events = {}, players = [], timers = new Map();
    let now=0,next=0;
    const doc = {hidden:false,addEventListener(type,fn){events[type]=fn},createElement(){
        const p={plays:0,pauses:0,play(){this.plays++;return Promise.resolve()},pause(){this.pauses++},load(){},removeAttribute(){this.src=''}};
        players.push(p);return p;
    }};
    const window={addEventListener(type,fn){events[type]=fn}};
    vm.runInNewContext(fs.readFileSync('js/core/GameMusic.js','utf8'),{window,document:doc,performance:{now:()=>now},setTimeout(fn){const id=++next;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}});
    return {music:window.GameMusic,doc,events,players,timers,tick(ms){now+=ms;const jobs=[...timers];timers.clear();for(const [,fn] of jobs)fn()}};
}
test('loading controller and user gestures during dialogue do not start music',()=>{
    const {events,players}=fixture();events.pointerdown();events.keydown();events.visibilitychange();
    assert.equal(players.length,0);
});
test('all chosen game tracks map correctly, while payment and test levels stay silent',()=>{
    const {music,players}=fixture();
    for(const [owner,level,key] of [['defense',1,'ready'],['defense',2,'ready'],['defense',3,'han'],['memory',1,'town'],['quiz',1,'town'],['interact',1,'walk']]){
        music.start(owner,level);assert.equal(music.player.src,music.tracks[key]);assert.equal(music.player.plays,1);assert.equal(music.player.loop,true);
    }
    music.start('payment');assert.equal(music.owner,null);
    const count=players.length;music.start('defense',99);assert.equal(players.length,count);
});
test('an old game cannot stop the next game and late play completion cannot restart it',async()=>{
    const {music}=fixture();music.start('memory');const old=music.player;
    music.start('interact');const current=music.player;music.stop('memory');
    assert.equal(music.player,current);assert.equal(old.src,'');
    await Promise.resolve();assert.ok(old.pauses>=1);
    music.stop();assert.equal(music.player,null);assert.equal(current.src,'');
});
test('hidden tabs pause, active games resume, and exit prevents resume',()=>{
    const {music,doc,events}=fixture();music.start('interact');const p=music.player;
    doc.hidden=true;events.visibilitychange();assert.equal(p.pauses,1);
    doc.hidden=false;events.visibilitychange();assert.equal(p.plays,2);
    events.pagehide();events.visibilitychange();assert.equal(p.plays,2);
});
test('blocked autoplay retries only for the active game after a gesture',async()=>{
    const {music,events}=fixture();music.start('memory');const p=music.player;
    p.play=()=>Promise.reject({name:'NotAllowedError'});music.play();
    await new Promise(setImmediate);assert.equal(music.needsGesture,true);
    p.play=()=>{p.plays++;return Promise.resolve()};events.pointerdown();await new Promise(setImmediate);
    assert.equal(music.needsGesture,false);music.stop();events.pointerdown();assert.equal(music.owner,null);
});
test('missing audio fails silently and volume zero pauses',()=>{
    const {music}=fixture();music.start('defense',1);const p=music.player;
    music.setVolume(0);assert.equal(p.pauses,1);music.setVolume(.2);assert.equal(p.volume,.2);
    p.onerror();assert.equal(music.owner,null);assert.equal(p.src,'');
});

test('mobile touchend and click retry blocked music, including synchronous rejection',async()=>{
    for (const gesture of ['touchend','click']) {
        const {music,events}=fixture();
        music.start('memory');
        await new Promise(setImmediate);
        const p=music.player;
        p.play=()=>{throw {name:'NotAllowedError'}};
        music.play();assert.equal(music.needsGesture,true);
        p.play=()=>{p.plays++;return Promise.resolve()};
        events[gesture]();await new Promise(setImmediate);
        assert.equal(p.plays,2);assert.equal(music.needsGesture,false);
        music.stop();events[gesture]();assert.equal(music.player,null);
    }
});


test('quiz music begins after the first question and stops before the story callback',()=>{
    const calls=[],window={GameMusic:{start:k=>calls.push('start:'+k),fadeOut:k=>calls.push('fade:'+k)}};
    const context={window,console:{log(){},warn(){}},QuizQuestions:{getRandomQuestions:()=>[{text:'test'}]}};
    vm.runInNewContext(fs.readFileSync('js/core/DialogueSystem.js','utf8'),context);
    const quiz=window.DialogueSystem,show=quiz.showQuizQuestion;
    quiz.showQuizQuestion=()=>calls.push('question');
    quiz.startQuiz({start:0,end:1},1,()=>calls.push('story'));
    assert.deepEqual(calls,['question','start:quiz']);
    quiz.currentQuizIndex=1;show.call(quiz);
    assert.deepEqual(calls.slice(-2),['fade:quiz','story']);
});
test('scene transitions dispose music before exposing the next scene',()=>{
    const order=[],window={GameMusic:{stop:()=>order.push('stop')}};
    vm.runInNewContext(fs.readFileSync('js/core/SceneManager.js','utf8'),{window,document:{}});
    window.SceneManager.scenes={story:{style:{set display(value){order.push(value)}}}};
    window.SceneManager.show('story');assert.equal(order[0],'stop');assert.equal(order.at(-1),'flex');
});


test('completion fades over 800ms, then releases the audio; repeated completion does not reset it',async()=>{
    const {music,tick,timers}=fixture();music.start('memory');const p=music.player;
    music.fadeOut('memory');music.fadeOut('memory');assert.equal(music.player,null);assert.equal(p.volume,.2);
    await Promise.resolve();assert.equal(p.pauses,0,'late play promise must not cut the fade');
    tick(400);assert.ok(Math.abs(p.volume-.1)<.001);assert.equal(p.pauses,0);
    tick(400);assert.equal(p.volume,0);assert.equal(p.pauses,1);assert.equal(p.src,'');
    assert.equal(timers.size,0);assert.equal(music.fading.size,0);
});
test('a new game cancels old fades and stale timer callbacks cannot change its volume',()=>{
    const {music,timers,tick}=fixture();music.start('memory');const old=music.player;music.fadeOut('memory');
    const late=[...timers.values()][0];music.start('interact');const current=music.player;
    late();tick(1000);assert.equal(current.volume,.2);assert.equal(current.pauses,0);assert.equal(old.src,'');
    assert.equal(music.fading.size,0);assert.equal(timers.size,0);
});
test('hiding the page or muting clears fading audio and never resumes it',()=>{
    for(const mode of ['hidden','muted']){
        const {music,doc,events,timers}=fixture();music.start('defense',1);const p=music.player;music.fadeOut('defense');
        if(mode==='hidden'){doc.hidden=true;events.visibilitychange();doc.hidden=false;events.visibilitychange()}
        else music.setVolume(0);
        assert.equal(p.src,'');assert.equal(music.fading.size,0);assert.equal(timers.size,0);assert.equal(p.plays,1);
    }
});
