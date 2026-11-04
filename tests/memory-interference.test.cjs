const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({boards=1,mode='adult',reduced=false,variant='endless',random=0,blinkDelay}={}){
 let now=10000,id=0;const jobs=new Map(),nodes=[];
 const node=()=>({hidden:true,dataset:{},style:{},offsetWidth:10,setAttribute(){},remove(){this.removed=true;}});
 const window={matchMedia:()=>({matches:reduced}),GamePause:{paused:false}},document={hidden:false,createElement(){const n=node();nodes.push(n);return n;},addEventListener(){},getElementById(){return null;}};
 const context=vm.createContext({window,document,AbortController,console:{log(){},warn(){}},performance:{now:()=>now},setTimeout(fn,ms=0){jobs.set(++id,{fn,at:now+ms});return id;},clearTimeout(n){jobs.delete(n);}});
 vm.runInContext(`Math.random=()=>${random}`,context);
 for(const file of ['js/core/GameClock.js','js/core/MinigameSession.js','js/core/TimedChallenge.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 const c=window.TimedChallenge,session=new window.MinigameSession();
 const cards=['a','a','b','b','c','c'].map((symbol,index)=>{const classes=new Set();return {dataset:{symbol,index},style:{},classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)},getBoundingClientRect:()=>({left:index*50,top:0}),animate(frames,options){this.frames=frames;this.duration=options.duration;return {cancel:()=>{this.cancelled=true;}};}};});
 const game={challenge:c,session,gameActive:true,canFlip:true,isMemorizing:false,flippedCards:[],container:{appendChild(){}},statusText:{innerText:'開始配對！'},grid:{appendChild(){},getAnimations:()=>[],querySelectorAll:()=>cards}};
 Object.assign(c,{active:true,kind:'memory',variant,boards,mode,game,lives:3,memoryMistakes:1,score:50});
 const tick=ms=>{const end=now+ms;let count=0;while(true){const next=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++count>10000)throw Error('loop');now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=end;};
 if(blinkDelay)c.memoryCloudInterval=()=>blinkDelay; c.setupMemoryInterference(game);return {c,game,session,tick,window,document,nodes,cards};
}
test('only endless board two onward; no opening lock, warning or immediate interference',()=>{
 for(const options of [{boards:0},{boards:8,variant:'timed'}])assert.equal(fixture(options).nodes.length,0);
 const f=fixture();f.c.setupMemoryInterference(f.game);assert.equal(f.nodes.length,2);assert.equal(f.game.canFlip,true);assert.equal(f.game.statusText.innerText,'開始配對！');assert.equal(f.c.memoryInterference.notice.hidden,true);f.tick(1000);assert.equal(f.c.memoryInterference.blinkCount,0);assert.equal(f.c.memoryInterference.swapCount,0);
});
test('unannounced blinks recur during single flips and pair resolution without changing input or penalties',()=>{
 const f=fixture();const single=f.cards[0];single.classList.add('is-flipped');f.game.flippedCards=[single];f.tick(4400);assert.equal(f.c.memoryInterference.blinkCount,1);assert.equal(f.nodes[0].hidden,false);assert.equal(f.game.canFlip,true);assert.notEqual(f.game.interferenceLocked,true);assert.equal(f.game.statusText.innerText,'開始配對！');assert.equal(f.game.flippedCards[0],single);
 f.tick(560);assert.equal(f.nodes[0].dataset.phase,'opening');f.tick(380);assert.equal(f.nodes[0].hidden,true);
 f.game.canFlip=false;f.game.flippedCards.push(f.cards[1]);f.tick(4400);assert.equal(f.c.memoryInterference.blinkCount,2);assert.equal(f.game.canFlip,false);assert.equal(f.game.flippedCards.length,2);assert.equal(f.c.lives,3);assert.equal(f.c.memoryMistakes,1);assert.equal(f.c.score,50);
});
test('central warning precedes forced single fold, full flip-back delay, then tracked swap',()=>{
 const f=fixture();f.cards[0].classList.add('matched');f.cards[1].style.visibility='hidden';const single=f.cards[2];single.classList.add('is-flipped');f.game.flippedCards=[single];const symbols=f.cards.map(c=>c.dataset.symbol);
 f.tick(6000);assert.equal(f.c.memoryInterference.notice.hidden,false);assert.equal(f.game.canFlip,false);assert.equal(f.game.interferenceLocked,true);assert.equal(f.game.flippedCards[0],single);assert.equal(single.classList.contains('is-flipped'),true);
 f.tick(1100);assert.equal(single.classList.contains('is-flipped'),false);assert.equal(f.game.flippedCards.length,0);assert.equal(f.c.memoryInterference.swapCards,undefined);f.tick(549);assert.equal(f.c.memoryInterference.swapCards,undefined);f.tick(1);
 const selected=f.c.memoryInterference.swapCards;assert.equal(selected.length,2);assert.notEqual(selected[0].dataset.symbol,selected[1].dataset.symbol);assert.ok(selected.every(c=>!f.cards.slice(0,2).includes(c)));assert.ok(selected.every(c=>c.frames.length===4&&c.duration===1000));assert.equal(f.c.memoryInterference.notice.hidden,true);
 f.tick(1000);assert.equal(f.game.canFlip,true);assert.equal(f.game.interferenceLocked,false);assert.deepEqual(f.cards.map(c=>c.dataset.symbol),symbols);assert.equal(f.cards.filter((c,i)=>c.style.order!==String(i)).length,2);assert.equal(f.c.lives,3);assert.equal(f.c.memoryMistakes,1);assert.equal(f.c.score,50);
});
test('two-card resolution waits safely, then single-card interruption does not create a mismatch',()=>{
 const f=fixture();f.game.flippedCards=[f.cards[0],f.cards[1]];f.game.canFlip=false;f.tick(9000);assert.equal(f.c.memoryInterference.swapCount,0);assert.equal(f.c.memoryInterference.notice.hidden,true);assert.equal(f.game.flippedCards.length,2);
 f.game.flippedCards=[];f.game.canFlip=true;f.tick(250);assert.equal(f.c.memoryInterference.swapCount,1);f.tick(2100);assert.equal(f.game.canFlip,true);assert.equal(f.c.memoryMistakes,1);
});
test('swap scheduling is random, early boards cap at one, late boards choose one or two',()=>{
 const first=fixture(),late=fixture({boards:6,random:.99}),one=fixture({boards:6,random:0});assert.equal(first.c.memoryInterference.swapLimit,1);assert.equal(late.c.memoryInterference.swapLimit,2);assert.equal(one.c.memoryInterference.swapLimit,1);
 first.tick(6000);assert.equal(first.c.memoryInterference.swapCount,1);late.tick(1799);assert.equal(late.c.memoryInterference.swapCount,0);late.tick(1200);assert.equal(late.c.memoryInterference.swapCount,1);late.tick(60000);assert.equal(late.c.memoryInterference.swapCount,2);first.tick(60000);assert.equal(first.c.memoryInterference.swapCount,1);assert.ok(first.c.memoryInterference.blinkCount>3);
});
test('pause preserves warning, fold and movement; cleanup cancels animation, notice and later work',()=>{
 const f=fixture();f.tick(6000);f.session.clock.pause();f.tick(10000);assert.equal(f.c.memoryInterference.notice.hidden,false);assert.equal(f.c.memoryInterference.swapCards,undefined);f.session.clock.resume();f.tick(1100);assert.equal(f.c.memoryInterference.swapCards.length,2);
 f.c.clearMemoryInterference({});assert.ok(f.c.memoryInterference);const other={};f.window.GamePause.animations=[...f.c.memoryInterference.animations,other];f.c.stop();f.tick(100000);assert.equal(f.window.GamePause.animations.length,1);assert.equal(f.window.GamePause.animations[0],other);assert.equal(f.game.interferenceLocked,false);assert.equal(f.game.canFlip,true);assert.ok(f.nodes.every(n=>n.removed));assert.ok(f.cards.every(c=>!c.classList.contains('memory-wind-selected')));
 const stale=fixture();stale.session.dispose();stale.game.session={};stale.tick(20000);assert.ok(stale.cards.every((c,i)=>c.style.order===String(i)));assert.ok(stale.nodes.every(n=>n.removed));
});
test('reduced motion skips both effects; child warning and movement allow more time',()=>{
 const f=fixture({reduced:true});f.tick(60000);assert.equal(f.c.memoryInterference.blinkCount,0);assert.equal(f.c.memoryInterference.swapCount,0);assert.equal(f.game.canFlip,true);assert.ok(f.cards.every((c,i)=>c.style.order===String(i)));
 const child=fixture({mode:'child'});child.tick(8000);assert.equal(child.c.memoryInterference.notice.hidden,false);child.tick(1499);assert.equal(child.c.memoryInterference.swapCards,undefined);child.tick(1);assert.equal(child.c.memoryInterference.swapCards[0].duration,1200);child.tick(1200);assert.equal(child.game.canFlip,true);
});
test('last remaining pair is never swapped; hidden or memorizing board waits',()=>{
 const f=fixture();f.cards.slice(0,4).forEach(c=>c.classList.add('matched'));f.tick(60000);assert.equal(f.c.memoryInterference.swapCount,0);assert.equal(f.game.canFlip,true);
 for(const prop of ['hidden','memorizing']){const x=fixture();if(prop==='hidden')x.document.hidden=true;else x.game.isMemorizing=true;x.tick(10000);assert.equal(x.c.memoryInterference.swapCount,0);assert.equal(x.c.memoryInterference.blinkCount,0);x.document.hidden=false;x.game.isMemorizing=false;x.tick(250);assert.equal(x.c.memoryInterference.swapCount,1);}
});
test('later boards swap early with age-aware jitter; second swap also stays near the opening',()=>{
 for(const [mode,random,delay] of [['adult',0,1800],['adult',.99,2988],['child',0,2400],['child',.99,3984]]) {
  const f=fixture({boards:6,mode,random});f.tick(delay-1);assert.equal(f.c.memoryInterference.swapCount,0);f.tick(1);assert.equal(f.c.memoryInterference.swapCount,1);assert.equal(f.c.memoryInterference.notice.style.animationDuration,mode==='child'?'1500ms':'1100ms');assert.equal(f.c.memoryInterference.notice.innerHTML,'<strong>背牌即將換位</strong>');
  if(random===.99){f.tick(12000-delay);assert.equal(f.c.memoryInterference.swapCount,2);}
 }
 const middle=fixture({boards:3});middle.tick(3499);assert.equal(middle.c.memoryInterference.swapCount,0);middle.tick(1);assert.equal(middle.c.memoryInterference.swapCount,1);
});
test('swap cancels an active blink and its stale callbacks, with a clear grace period after movement',()=>{
 const f=fixture({blinkDelay:5900});f.tick(5900);assert.equal(f.nodes[0].hidden,false);assert.equal(f.nodes[0].dataset.phase,'closing');f.tick(100);assert.equal(f.c.memoryInterference.notice.hidden,false);assert.equal(f.nodes[0].hidden,true);assert.equal(f.nodes[0].dataset.phase,'idle');
 f.tick(940);assert.equal(f.nodes[0].hidden,true);assert.equal(f.nodes[0].dataset.phase,'idle');f.tick(1160);assert.equal(f.game.canFlip,true);assert.equal(f.nodes[0].hidden,true);assert.equal(f.c.memoryInterference.blinkBlockedUntil,f.session.clock.now()+1200);
 const late=fixture({boards:6,random:.99,blinkDelay:700});late.tick(2988);const count=late.c.memoryInterference.blinkCount;late.tick(2100);assert.equal(late.game.canFlip,true);assert.equal(late.c.memoryInterference.blinkCount,count);late.tick(1199);assert.equal(late.c.memoryInterference.blinkCount,count);
});