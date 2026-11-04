const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({boards=1,mode='adult',reduced=false,variant='endless',random=.99}={}){
 let now=10000,id=0;const jobs=new Map(),nodes=[];
 const node=()=>({hidden:true,dataset:{},style:{},offsetWidth:10,setAttribute(){},remove(){this.removed=true;}});
 const window={matchMedia:()=>({matches:reduced}),GamePause:{paused:false}},document={hidden:false,createElement(){const n=node();nodes.push(n);return n;},addEventListener(){},getElementById(){return null;}};
 const context=vm.createContext({window,document,AbortController,console:{log(){},warn(){}},performance:{now:()=>now},setTimeout(fn,ms=0){jobs.set(++id,{fn,at:now+ms});return id;},clearTimeout(n){jobs.delete(n);}});
 vm.runInContext(`Math.random=()=>${random}`,context);
 for(const file of ['js/core/GameClock.js','js/core/MinigameSession.js','js/core/TimedChallenge.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 const c=window.TimedChallenge,session=new window.MinigameSession();
 const cards=['a','a','b','b','c','c'].map((symbol,index)=>{const classes=new Set();return {dataset:{symbol,index},style:{},classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)},getBoundingClientRect:()=>({left:index*50,top:0}),animate(frames,options){this.frames=frames;this.duration=options.duration;return {cancel:()=>{this.cancelled=true;}};}};});
 const game={challenge:c,session,gameActive:true,canFlip:true,isMemorizing:false,flippedCards:[],statusText:{innerText:'開始配對！'},grid:{appendChild(){},getAnimations:()=>[],querySelectorAll:()=>cards}};
 Object.assign(c,{active:true,kind:'memory',variant,boards,mode,game,lives:3,memoryMistakes:1,score:50});
 const tick=ms=>{const end=now+ms;let count=0;while(true){const next=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++count>10000)throw Error('loop');now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=end;};
 c.setupMemoryInterference(game);return {c,game,session,tick,window,document,nodes,cards};
}
test('second board warns immediately, once per session; first board and timed mode unchanged',()=>{
 for(const options of [{boards:0},{boards:8,variant:'timed'}])assert.equal(fixture(options).nodes.length,0);
 const f=fixture();f.c.setupMemoryInterference(f.game);assert.equal(f.nodes.length,1);assert.match(f.game.statusText.innerText,/即將換位/);assert.equal(f.game.interferenceLocked,true);
 f.tick(1099);assert.equal(f.c.memoryInterference.count,0);f.tick(1);assert.equal(f.c.memoryInterference.count,1);
});
test('swap moves exactly two different unmatched visible cards, preserving symbols, score and lives',()=>{
 const f=fixture();f.cards[0].classList.add('matched');f.cards[1].style.visibility='hidden';const symbols=f.cards.map(c=>c.dataset.symbol);f.tick(1100);
 const selected=f.c.memoryInterference.swapCards;assert.equal(selected.length,2);assert.notEqual(selected[0].dataset.symbol,selected[1].dataset.symbol);assert.ok(selected.every(c=>!f.cards.slice(0,2).includes(c)));assert.equal(f.game.canFlip,false);assert.ok(selected.every(c=>c.frames.length===4&&c.duration===1000));
 f.tick(1000);assert.equal(f.game.canFlip,true);assert.equal(f.game.interferenceLocked,false);assert.deepEqual(f.cards.map(c=>c.dataset.symbol),symbols);assert.equal(f.cards.filter((c,i)=>c.style.order!==String(i)).length,2);assert.ok(selected.every(c=>c.cancelled&&!c.classList.contains('memory-wind-selected')));assert.equal(f.c.lives,3);assert.equal(f.c.memoryMistakes,1);assert.equal(f.c.score,50);
});
test('random bag varies types, avoids previous-board repeats and has bounded random intervals',()=>{
 const types=new Set();for(const random of [0,.4,.99])types.add(fixture({random}).c.memoryInterference.type);assert.equal(types.size,3);
 const f=fixture({boards:6});f.tick(2100);f.tick(18000);assert.equal(f.c.memoryInterference.type,'paper');f.tick(18000);assert.equal(f.c.memoryInterference.type,'blink');f.tick(50000);assert.equal(f.c.memoryInterference.count,3);
 for(const mode of ['adult','child'])for(const boards of [1,99]){const x=fixture({mode,boards}),interval=x.c.memoryCloudInterval();assert.ok(interval>=(mode==='child'?12000:9000));assert.ok(interval<=(mode==='child'?20000:16000));}
 const next=fixture({boards:0});next.c.boards=1;next.c.lastMemoryEffect='swap';next.c.setupMemoryInterference(next.game);assert.notEqual(next.c.memoryInterference.type,'swap');
});
test('paper and blink release input without changing cards or penalties',()=>{
 for(const random of [0,.4]){const f=fixture({random});f.tick(1100);assert.ok(['paper','blink'].includes(f.c.memoryInterference.type));assert.equal(f.game.canFlip,false);f.tick(1200);assert.equal(f.game.canFlip,true);assert.equal(f.nodes[0].hidden,true);assert.equal(f.c.lives,3);assert.equal(f.c.score,50);assert.ok(f.cards.every((c,i)=>c.style.order===String(i)));}
});
test('busy play retries; a pair begun during warning is never interrupted',()=>{
 const f=fixture();f.tick(2100);f.game.flippedCards.push({});f.game.canFlip=false;f.tick(20000);assert.equal(f.c.memoryInterference.count,1);
 f.game.flippedCards=[];f.game.canFlip=true;f.tick(1200);assert.match(f.game.statusText.innerText,/即將掠過/);f.game.flippedCards.push({});f.game.canFlip=false;f.game.statusText.innerText='配對中';f.tick(1100);assert.equal(f.c.memoryInterference.count,1);assert.equal(f.game.canFlip,false);assert.equal(f.game.statusText.innerText,'配對中');
 f.game.flippedCards=[];f.game.canFlip=true;f.tick(3500);assert.equal(f.c.memoryInterference.count,2);
});
test('pause preserves timers; stop cancels swap, highlights, input lock and stale work',()=>{
 const f=fixture();f.tick(1100);f.session.clock.pause();f.tick(10000);assert.equal(f.game.canFlip,false);f.session.clock.resume();f.tick(1000);assert.equal(f.game.canFlip,true);
 const closed=fixture();closed.tick(1100);closed.c.stop();closed.tick(100000);assert.equal(closed.nodes[0].removed,true);assert.equal(closed.game.interferenceLocked,false);assert.equal(closed.game.canFlip,true);assert.ok(closed.cards.every(c=>!c.classList.contains('memory-wind-selected')));
 const stale=fixture();stale.session.dispose();stale.game.session={};stale.tick(10000);assert.ok(stale.cards.every((c,i)=>c.style.order===String(i)));assert.equal(stale.nodes[0].removed,true);
});
test('reduced motion never locks, moves or covers cards; child has longer warning and swap',()=>{
 const f=fixture({reduced:true});assert.equal(f.game.canFlip,true);f.tick(1100);assert.equal(f.nodes[0].dataset.effect,'quiet');assert.equal(f.game.canFlip,true);assert.ok(f.cards.every((c,i)=>c.style.order===String(i)));f.tick(940);assert.equal(f.nodes[0].hidden,true);
 const child=fixture({mode:'child'});child.tick(1499);assert.equal(child.c.memoryInterference.count,0);child.tick(1);assert.equal(child.c.memoryInterference.swapCards[0].duration,1200);child.tick(1200);assert.equal(child.game.canFlip,true);
});

test('owner-scoped cleanup cannot cancel another game and releases owned animations',()=>{
 const f=fixture();f.tick(1100);f.c.clearMemoryInterference({});assert.ok(f.c.memoryInterference);const other={};f.window.GamePause.animations=[...f.c.memoryInterference.animations,other];f.c.clearMemoryInterference(f.game);assert.equal(f.window.GamePause.animations.length,1);assert.equal(f.window.GamePause.animations[0],other);assert.equal(f.c.memoryInterference,null);assert.equal(f.game.interferenceLocked,false);assert.ok(f.cards.filter(c=>c.frames).every(c=>c.cancelled));
});
