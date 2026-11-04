const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({boards=3,mode='adult',reduced=false,variant='endless'}={}){
    let now=10000,id=0;const jobs=new Map(),nodes=[];
    const node=()=>({hidden:true,dataset:{},style:{},offsetWidth:10,setAttribute(){},remove(){this.removed=true;}});
    const window={matchMedia:()=>({matches:reduced}),GamePause:{paused:false}},document={hidden:false,createElement(){const n=node();nodes.push(n);return n;},addEventListener(){},getElementById(){return null;}};
    const context=vm.createContext({window,document,AbortController,console:{log(){},warn(){}},performance:{now:()=>now},setTimeout(fn,ms=0){jobs.set(++id,{fn,at:now+ms});return id;},clearTimeout(n){jobs.delete(n);}});
    for(const file of ['js/core/GameClock.js','js/core/MinigameSession.js','js/core/TimedChallenge.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
    const c=window.TimedChallenge,session=new window.MinigameSession();
    const game={challenge:c,session,gameActive:true,canFlip:true,isMemorizing:false,flippedCards:[],statusText:{innerText:'開始配對！'},grid:{appendChild(){},getAnimations:()=>[]}};
    Object.assign(c,{active:true,kind:'memory',variant,boards,mode,game});
    const tick=ms=>{const end=now+ms;let count=0;while(true){const next=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++count>10000)throw Error('loop');now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=end;};
    c.setupMemoryInterference(game);return {c,game,session,tick,window,document,nodes};
}
test('clouds begin only after three boards, once per session, and never in timed memory',()=>{
    for(const options of [{boards:0},{boards:2},{boards:8,variant:'timed'}])assert.equal(fixture(options).nodes.length,0);
    const f=fixture();f.c.setupMemoryInterference(f.game);assert.equal(f.nodes.length,1);
    assert.equal(f.c.memoryCloudInterval(),18000);f.c.mode='child';assert.equal(f.c.memoryCloudInterval(),22000);
    f.c.boards=99;assert.equal(f.c.memoryCloudInterval(),16000);f.c.mode='adult';assert.equal(f.c.memoryCloudInterval(),12000);
});
test('a preannounced blink briefly locks an idle board then restores input, without changing cards or penalties',()=>{
    const f=fixture(),g=f.game;g.cards=['a','b'];f.c.lives=3;f.c.memoryMistakes=1;
    f.tick(7000);assert.equal(g.statusText.innerText,'雲影將掠過…');assert.equal(g.canFlip,true);
    f.tick(1199);assert.equal(f.nodes[0].hidden,true);f.tick(1);
    assert.equal(f.nodes[0].hidden,false);assert.equal(g.interferenceLocked,true);assert.equal(g.canFlip,false);assert.equal(f.nodes[0].dataset.phase,'closing');
    f.tick(560);assert.equal(f.nodes[0].dataset.phase,'opening');f.tick(380);
    assert.equal(g.canFlip,true);assert.equal(g.interferenceLocked,false);assert.equal(f.nodes[0].hidden,true);assert.equal(g.statusText.innerText,'開始配對！');
    assert.equal(f.c.lives,3);assert.equal(f.c.memoryMistakes,1);assert.deepEqual(g.cards,['a','b']);
    f.tick(18000+1200+940);assert.equal(f.c.memoryInterference.count,2);f.tick(100000);assert.equal(f.c.memoryInterference.count,2);
});
test('active flips, memorization, animation, hidden pages and a pair started during warning skip interference',()=>{
    for(const mutate of [f=>f.game.flippedCards.push({}),f=>f.game.isMemorizing=true,f=>f.game.grid.getAnimations=()=>[{playState:'running'}],f=>f.document.hidden=true]){
        const f=fixture();mutate(f);f.tick(8200);assert.equal(f.nodes[0].hidden,true);assert.equal(f.c.memoryInterference.count,0);
    }
    const f=fixture();f.tick(7000);f.game.flippedCards.push({});f.game.canFlip=false;f.game.statusText.innerText='配對中';f.tick(1200);
    assert.equal(f.nodes[0].hidden,true);assert.equal(f.game.statusText.innerText,'配對中');assert.equal(f.c.memoryInterference.count,0);
});
test('pause preserves shutter phase and release delay; exit and replaced sessions invalidate old work',()=>{
    const f=fixture();f.tick(8200);f.session.clock.pause();f.tick(10000);assert.equal(f.nodes[0].dataset.phase,'closing');assert.equal(f.game.canFlip,false);
    f.session.clock.resume();f.tick(940);assert.equal(f.game.canFlip,true);
    const closed=fixture();closed.tick(8200);closed.c.stop();closed.tick(100000);assert.equal(closed.nodes[0].removed,true);assert.equal(closed.game.interferenceLocked,false);assert.equal(closed.game.canFlip,true);
    const replaced=fixture();replaced.tick(7000);replaced.session.dispose();replaced.game.session={};replaced.game.canFlip=true;replaced.tick(10000);assert.equal(replaced.game.canFlip,true);assert.equal(replaced.nodes[0].removed,true);
});
test('reduced motion uses a non-obscuring border and never locks input',()=>{
    const f=fixture({reduced:true});f.tick(8200);assert.equal(f.nodes[0].dataset.effect,'quiet');assert.equal(f.game.canFlip,true);assert.notEqual(f.game.interferenceLocked,true);
    f.tick(940);assert.equal(f.nodes[0].hidden,true);assert.equal(f.game.statusText.innerText,'開始配對！');
});
