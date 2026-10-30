const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
    let now=10000,next=0,portrait=false;const timers=new Map(),nodes=new Map(),events={};
    const element=()=>({style:{},dataset:{},hidden:true,disabled:false,inert:false,handlers:{},getAnimations(){return this.animations||[];},contains(node){return node===this||node?.parent===this;},focus(){this.focused=true;},addEventListener(k,fn){this.handlers[k]=fn;}});
    for(const id of ['game-pause-button','game-pause-overlay','game-pause-status','game-pause-resume','game-pause-exit','game-container'])nodes.set(id,element());
    for(const id of ['game-pause-resume','game-pause-exit'])nodes.get(id).parent=nodes.get('game-pause-overlay');
    const add=(k,fn)=>(events[k]||=[]).push(fn);
    const window={addEventListener:add,matchMedia:()=>({matches:portrait})},document={hidden:false,addEventListener:add,getElementById:id=>nodes.get(id)||null};
    const schedule=(fn,delay=0)=>{const id=++next;timers.set(id,{fn,at:now+delay});return id;};
    const context=vm.createContext({window,document,AbortController,performance:{now:()=>now},Date:{now:()=>now},
        setTimeout:schedule,clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>schedule(()=>fn(now),16),cancelAnimationFrame:id=>timers.delete(id),
        console:{log(){},warn(){}}});
    for(const file of ['js/core/GameClock.js','js/core/MinigameSession.js','js/core/GamePause.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
    const tick=duration=>{const end=now+duration;let steps=0;while(true){const job=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!job)break;if(++steps>10000)throw Error('loop');now=job[1].at;timers.delete(job[0]);job[1].fn();}now=end;};
    const emit=(type,event={})=>(events[type]||[]).forEach(fn=>fn(event));
    window.GamePause.init();
    return {window,document,context,timers,nodes,tick,emit,element,portrait(value){portrait=value;emit('resize');},clock:()=>new window.GameClock()};
}
test('clock preserves timeout remainder and recurring interval phase across long pauses without catch-up',()=>{
    const f=fixture(),clock=f.clock();let timeout=0,interval=0;
    clock.setTimeout(()=>timeout++,1000);const recurring=clock.setInterval(()=>interval++,1000);
    f.tick(425);const before=clock.now();clock.pause();f.tick(90000);
    assert.equal(clock.now(),before);assert.equal(timeout,0);assert.equal(interval,0);
    clock.resume();f.tick(574);assert.equal(timeout,0);f.tick(1);assert.equal(timeout,1);assert.equal(interval,1);
    f.tick(1000);assert.equal(interval,2);clock.clearInterval(recurring);f.tick(5000);assert.equal(interval,2);
});
test('animation timestamps do not jump over paused time and stale frame callbacks cannot execute after resume',()=>{
    const f=fixture(),clock=f.clock();let frames=0,elapsed=0;const start=clock.now();
    const animate=now=>{frames++;elapsed=now-start;if(elapsed<400)clock.requestAnimationFrame(animate);};
    clock.requestAnimationFrame(animate);f.tick(160);const count=frames;
    const stale=[...f.timers.values()][0].fn;clock.pause();f.tick(30000);assert.equal(frames,count);
    clock.resume();stale();assert.equal(frames,count);f.tick(16);assert.equal(elapsed,176);
    f.tick(224);assert.equal(elapsed,400);
});
test('session timers freeze and disposing a paused session prevents every late callback',()=>{
    const f=fixture(),session=new f.window.MinigameSession();let calls=0;
    session.timeout(()=>calls++,1000);session.interval(()=>calls++,1000);
    f.tick(500);session.clock.pause();f.tick(5000);assert.equal(calls,0);
    session.clock.resume();f.tick(500);assert.equal(calls,2);
    session.clock.pause();const stale=[...f.timers.values()];session.dispose();session.clock.resume();f.tick(5000);stale.forEach(job=>job.fn());assert.equal(calls,2);
});
test('real memory memorization and game timer preserve their remaining duration through pause',()=>{
    const f=fixture();vm.runInContext(fs.readFileSync('js/minigames/MemoryGameV2.js','utf8'),f.context);
    const game=f.window.MemoryGameV2;game.session=new f.window.MinigameSession();
    const cards=[0,1].map(()=>({style:{},classList:{values:new Set(),add(c){this.values.add(c);},remove(c){this.values.delete(c);}}}));
    Object.assign(game,{gameActive:true,gameMode:'time',playerMode:'adult',gameTime:60,memorizationTime:2000,statusText:{},grid:{querySelectorAll:()=>cards},cardSymbols:[1,1],gridRows:1,gridCols:2});
    game.updateStats=game.updateStrikes=game.adjustCardSize=game.prepareCardSymbols=game.setCardContents=()=>{};
    game.startGameSequence(true);f.tick(1400);assert.equal(game.isMemorizing,true);
    game.session.clock.pause();f.tick(50000);assert.equal(game.isMemorizing,true);assert.equal(game.canFlip,false);
    game.session.clock.resume();f.tick(1599);assert.equal(game.canFlip,false);f.tick(1);assert.equal(game.canFlip,true);
    f.tick(400);game.session.clock.pause();f.tick(20000);assert.equal(game.timeLeft,60);
    game.session.clock.resume();f.tick(599);assert.equal(game.timeLeft,60);f.tick(1);assert.equal(game.timeLeft,59);
    game.session.dispose();
});
test('defense pause blocks input and freezes CSS, sound and time until its three-second countdown ends',()=>{
    const f=fixture(),clock=f.clock(),root=f.element();let pausedAnimations=0,playedAnimations=0,audioPauses=0,audioPlays=0,work=0;
    root.animations=[{playState:'running',pause(){pausedAnimations++;},play(){playedAnimations++;}}];
    f.window.GameMusic={player:{pause(){audioPauses++;}},play(){audioPlays++;}};
    const game={container:root,session:{clock}};clock.setTimeout(()=>work++,1000);
    const pause=f.window.GamePause;pause.attach(game,'defense');f.tick(400);pause.pause();
    assert.equal(root.inert,true);assert.equal(pausedAnimations,1);assert.equal(audioPauses,1);assert.equal(f.nodes.get('game-pause-overlay').hidden,false);
    let blocked=0;f.emit('pointerup',{target:root,preventDefault(){blocked++;},stopImmediatePropagation(){blocked++;}});assert.equal(blocked,2);
    pause.continueGame();f.tick(2999);assert.equal(work,0);assert.equal(pause.paused,true);f.tick(1);
    assert.equal(pause.paused,false);assert.equal(root.inert,false);assert.equal(playedAnimations,1);assert.equal(audioPlays,1);
    f.tick(599);assert.equal(work,0);f.tick(1);assert.equal(work,1);
});
test('hidden tab and portrait auto-pause, visible return stays paused and interrupted countdown restarts safely',()=>{
    const f=fixture(),pause=f.window.GamePause;pause.attach({session:{clock:f.clock()}},'defense');
    f.document.hidden=true;f.emit('visibilitychange');assert.equal(pause.paused,true);
    f.document.hidden=false;f.emit('visibilitychange');assert.equal(pause.paused,true);
    pause.continueGame();f.tick(1000);f.document.hidden=true;f.emit('visibilitychange');f.tick(9000);assert.equal(pause.paused,true);
    f.document.hidden=false;f.portrait(true);pause.continueGame();f.tick(5000);assert.equal(pause.paused,true);
    f.portrait(false);pause.continueGame();f.tick(3000);assert.equal(pause.paused,false);
});
test('quiz and third chapter never enable manual or automatic pause',()=>{
    for (const kind of ['quiz','interact']) {
        const f=fixture(),pause=f.window.GamePause,clock=f.clock();let canceled=0,work=0;
        pause.attach({container:f.element(),session:{clock},cancelDrag(){canceled++;}},kind);
        assert.equal(pause.owner,null);assert.equal(f.nodes.get('game-pause-button').hidden,true);
        clock.setTimeout(()=>work++,1000);f.document.hidden=true;f.emit('visibilitychange');f.portrait(true);pause.pause();f.tick(1000);
        assert.equal(canceled,0);assert.equal(pause.paused,false);assert.equal(work,1);
    }
});
test('exit or ending invalidates countdown and a stale game cannot dismiss the next pause session',()=>{
    const f=fixture(),pause=f.window.GamePause,first={session:{clock:f.clock()}},second={session:{clock:f.clock()}};
    pause.attach(first,'defense');pause.pause();pause.continueGame();const stale=[...f.timers.values()][0].fn;
    pause.end();pause.attach(second,'defense');pause.pause();stale();f.tick(5000);assert.equal(pause.paused,true);assert.equal(pause.owner,second);
    pause.end(first);assert.equal(pause.owner,second);pause.end(second);assert.equal(f.nodes.get('game-pause-overlay').hidden,true);
});
test('memory resumes immediately, preserving the remaining timer fraction without a countdown',()=>{
    const f=fixture(),pause=f.window.GamePause,clock=f.clock();let work=0;
    clock.setTimeout(()=>work++,1000);pause.attach({session:{clock}},'memory');f.tick(400);pause.pause();f.tick(20000);
    assert.equal(work,0);pause.continueGame();assert.equal(pause.paused,false);assert.equal(pause.countdownTimer,null);
    assert.equal(f.nodes.get('game-pause-overlay').hidden,true);f.tick(599);assert.equal(work,0);f.tick(1);assert.equal(work,1);
});
test('defense gameplay uses the virtual clock for all timers, animation frames and timestamp checks',()=>{
    for(const file of ['js/minigames/DefenseGameV2.js','js/minigames/defense/DefenseAttackRunner.js','js/minigames/defense/DefenseTrailRender.js']){
        const source=fs.readFileSync(file,'utf8');const gameplay=source.replace(/get clock\(\) \{[\s\S]*?\n    \},/,'');
        assert.equal(/(?<![\w.])(setTimeout|setInterval|requestAnimationFrame)\(/.test(gameplay),false,file);
        assert.equal(/Date\.now\(|performance\.now\(/.test(gameplay),false,file);
    }
});
