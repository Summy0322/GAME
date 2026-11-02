const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(blocked=false){
 let now=0,id=0;const jobs=new Map(),saved=new Map(),nodes=new Map();
 const node=()=>({style:{},classList:{add(){},remove(){},toggle(){}},textContent:'',setAttribute(){},remove(){},focus(){}});
 const document={addEventListener(){},getElementById(key){if(!nodes.has(key))nodes.set(key,node());return nodes.get(key);}};
 const window={},context=vm.createContext({window,document,console:{log(){},warn(){}},performance:{now:()=>now},
 localStorage:{getItem(k){if(blocked)throw Error();return saved.get(k)||null;},setItem(k,v){if(blocked)throw Error();saved.set(k,v);}},
 setTimeout(fn,ms=0){jobs.set(++id,{fn,at:now+ms});return id;},clearTimeout(k){jobs.delete(k);},requestAnimationFrame(){},cancelAnimationFrame(){}});
 for(const file of ['js/core/GameClock.js','js/core/TimedChallenge.js','js/minigames/DefenseLevels.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 const c=window.TimedChallenge;c.active=true;c.kind='memory';c.mode='child';c.remaining=90000;c.score=c.pairs=c.boards=c.penalties=0;
 const tick=ms=>{const end=now+ms;let count=0;while(true){const next=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++count>20000)throw Error('loop');now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=end;};
 return {c,window,context,saved,tick,nodes,clock:()=>new window.GameClock()};
}
test('90 active seconds end once, long pause and the resume countdown do not consume challenge time',()=>{
 const f=fixture(),clock=f.clock(),game={challenge:f.c,session:{clock},updateStats(){}};let finished=0;
 f.c.finish=()=>{finished++;f.c.active=false;};f.c.ready(game);f.tick(12400);assert.equal(f.c.remaining,77600);
 clock.pause();f.tick(60000+3000);assert.equal(f.c.remaining,77600);clock.resume();f.tick(77599);assert.equal(finished,0);f.tick(1);assert.equal(finished,1);f.tick(2000);assert.equal(finished,1);
});
test('completed memory boards award once and exclude the following memorization time',()=>{
 const f=fixture(),clock=f.clock(),game={challenge:f.c,session:{clock},updateStats(){}};let next=0;
 f.c.ready(game);f.tick(1500);f.c.paired();f.c.launchMemory=()=>{next++;};f.c.boardComplete(game);
 assert.equal(f.c.score,30);assert.equal(f.c.pairs,1);assert.equal(f.c.boards,1);assert.equal(next,1);
 const remaining=f.c.remaining;f.tick(10000);assert.equal(f.c.remaining,remaining);
 const second=f.clock();game.session.clock=second;f.c.ready(game);f.tick(1000);assert.equal(f.c.remaining,remaining-1000);
});
test('challenge penalties deduct score without changing the clock or ending the round',()=>{
 const {c}=fixture();c.score=25;c.penalty();assert.equal(c.score,15);assert.equal(c.remaining,90000);assert.equal(c.active,true);
 c.penalty();c.penalty();assert.equal(c.score,0);assert.equal(c.penalties,3);
});
test('best records remain separate by game and age, tolerate corrupt or inaccessible storage',()=>{
 const {c,saved}=fixture();c.best('memory','child',40);c.best('memory','adult',90);c.best('defense','child',100);
 assert.equal(c.best('memory','child',20),40);assert.equal(c.best('memory','adult'),90);assert.equal(c.best('defense','child'),100);assert.equal(c.best('defense','adult'),0);
 saved.set(c.storageKey,'null');assert.equal(c.best('memory','child'),0);saved.set(c.storageKey,'oops');assert.equal(c.best('memory','child',10),10);
 assert.equal(fixture(true).c.best('memory','child',30),30);
});
test('defense continues with valid mixed assets, no END or waiting-only waves, and keeps the session background immutable',()=>{
 const {c,window}=fixture();c.kind='defense';
 for(const mode of ['child','adult'])for(const elapsed of [0,25000,65000]){
  c.mode=mode;c.remaining=90000-elapsed;const game={levelConfig:{bgImage:'fixed-background',playerImage:'new-player',flow:{}}};
  for(let i=0;i<100;i++){const a=c.nextAttack(game);assert.ok(['NORMAL','MULTI','MULTI_MIXED','HEAVY','AOE'].includes(a.type));assert.ok(game.levelConfig.enemyImage);assert.equal(game.levelConfig.bgImage,'fixed-background');assert.equal(game.levelConfig.playerImage,'new-player');}
 }
 for(const level of [1,2,3])assert.ok(window.DefenseLevels[level].child.attackPatterns.length>0);
});
test('actual memory matching clears red lights; third miss penalizes score and the final pair advances the board',()=>{
 const f=fixture();vm.runInContext(fs.readFileSync('js/minigames/MemoryGameV2.js','utf8'),f.context);
 const g=f.window.MemoryGameV2;const node=(symbol)=>({dataset:{symbol},classList:{add(){},remove(){}}});let queued=[];
 Object.assign(g,{challenge:f.c,gameActive:true,gameMode:'time',lightMode:'red',wrongStreak:2,penaltyRedemption:0,redeemedCount:0,matchedPairs:0,totalPairs:1,timeLeft:90,statusText:{style:{}},session:{timeout(fn){queued.push(fn);}},updateStats(){},updateStrikes(){}});
 g.flippedCards=[node('a'),node('b')];f.c.score=20;g.checkMatch();assert.equal(g.wrongStreak,0);assert.equal(f.c.score,10);assert.equal(g.timeLeft,90);
 g.wrongStreak=2;g.flippedCards=[node('a'),node('a')];queued=[];let advanced=0;f.c.boardComplete=()=>advanced++;
 g.checkMatch();assert.equal(g.wrongStreak,0);assert.equal(f.c.score,20);queued.forEach(fn=>fn());assert.equal(advanced,1);
});
test('memory boards grow only to the mobile-friendly cap and preserve run totals through engine restarts',()=>{
 const {c,window}=fixture();const starts=[];
 window.MemoryGameV2={start(options){starts.push(options);}};window.GamePause={attach(){}};c.decorate=()=>{};
 for(const mode of ['child','adult']){
  c.mode=mode;for(const boards of [0,1,2,10]){c.boards=boards;c.launchMemory();const options=starts.at(-1);
   assert.equal(options.cardCount,Math.min(mode==='child'?5:6,(mode==='child'?3:4)+boards)*2);
   assert.equal(options.challenge,c);assert.equal(options.lightMode,'red');assert.equal(options.memorizationTime,2000);
  }
 }
});
