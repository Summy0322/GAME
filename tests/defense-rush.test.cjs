const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(mode='adult'){
 let now=1000,id=0;const jobs=new Map();
 const element=()=>({style:{},dataset:{},classList:{add(){}},setAttribute(){},appendChild(n){this.child=n;},querySelector(){return this.fill||=element();},remove(){this.removed=true;},getBoundingClientRect(){return{left:10,top:10,width:40,height:40};}});
 const window={},context=vm.createContext({window,document:{createElement:element},performance:{now:()=>now},console,
 setTimeout(fn,ms=0){jobs.set(++id,{fn,at:now+ms});return id;},clearTimeout(id){jobs.delete(id);},requestAnimationFrame(fn){jobs.set(++id,{fn:()=>fn(now),at:now+16});return id;},cancelAnimationFrame(id){jobs.delete(id);}});
 vm.runInContext(fs.readFileSync('js/core/GameClock.js','utf8'),context);vm.runInContext(fs.readFileSync('js/core/DefenseRush.js','utf8'),context);
 const clock=new window.GameClock(),owner={active:true,mode,lives:3,finish(){this.active=false;this.finishes=(this.finishes||0)+1;}};
 const game={scoreTable:{NORMAL:100,HEAVY:150,TIME_OUT_PENALTY:-10},recordMistake(){this.mistakes++;owner.lives--;if(!owner.lives){owner.ending=true;clock.setTimeout(()=>owner.finish(),700);}},clock,sessionId:1,gameActive:true,enemies:[],heavySequence:[],score:0,mistakes:0,states:{MULTI:'MULTI',HEAVY_CHARGING:'CHARGING'},stage:{getBoundingClientRect:()=>({left:0,top:0,width:400,height:200})},captureMaterialSet:()=>({}),setState(state){this.state=state;},spawnEnemy(dir){this.enemies.push({dir,element:element()});},stopEnemyBounce(){},clearHeavySequence(){this.heavySequence=[];},clearHeavyProjectiles(){},showShield(){this.shields=(this.shields||0)+1;},addScore(points){this.score=Math.max(0,this.score+points);},launchProjectile(dir,done){this.shots=(this.shots||0)+1;clock.setTimeout(done,600);},finishAttack(){this.currentAttack.finished=true;this.finished=(this.finished||0)+1;}};
 const rush=owner.rush=new window.DefenseRush(owner);rush.game=game;
 game.spawnHeavySequence=dir=>{game.heavySequence=[{element:element()}];clock.setTimeout(()=>rush.launchHeavy(dir),2000*rush.scale);};
 const tick=duration=>{const end=now+duration;let steps=0;for(;;){const next=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next)break;if(++steps>10000)throw Error('timer loop');now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=end;};
 const begin=plan=>{game.currentAttack={type:'RUSH',rushPlan:plan||window.DefenseRush.planFor(65)};rush.begin(game,game.currentAttack);tick(0);};
 return{rush,owner,game,clock,tick,begin};
}
test('hand-authored rush patterns keep at most two visible threats and avoid same-direction overlap in both ages',()=>{
 for(const mode of ['adult','child']){const {rush:r}=fixture(mode);for(const wave of [65,75,85,95,105])for(const rotation of [0,1,2,3])for(const plan of [r.constructor.planFor(wave,rotation)]){const intervals=plan.map(t=>({dir:t.dir,start:t.at*r.scale,end:t.at*r.scale+(t.kind==='heavy'?2650*r.scale:t.wait*r.scale+650)}));for(const time of intervals.flatMap(i=>[i.start,i.end-.01])){const active=intervals.filter(i=>i.start<=time&&i.end>time);assert.ok(active.length<=2,JSON.stringify(active));assert.equal(new Set(active.map(t=>t.dir)).size,active.length);}}}
});
test('normal answer accepted at the last millisecond cancels its deadline immediately and waits for impact',()=>{
 const f=fixture();f.begin([{at:0,dir:'left',kind:'normal',wait:1000}]);f.tick(999);f.rush.swipe('left');f.rush.swipe('left');assert.equal(f.rush.hits,1);f.tick(1);assert.equal(f.owner.lives,3);f.tick(600);assert.equal(f.rush.targets[0].state,'done');f.tick(900);assert.equal(f.game.finished,1);assert.equal(f.owner.lives,3);
});
test('one timed-out threat costs one life while an independently answered threat remains valid',()=>{
 const f=fixture();f.begin([{at:0,dir:'left',kind:'normal',wait:600},{at:0,dir:'right',kind:'normal',wait:1200}]);f.tick(600);const missed=f.rush.targets[0];f.rush.miss(missed);assert.equal(f.owner.lives,2);f.rush.swipe('right');f.tick(1500);assert.equal(f.owner.lives,2);assert.equal(f.rush.hits,1);assert.equal(f.rush.misses,1);
});
test('heavy charging and a normal target coexist, and a last-millisecond shield blocks only the heavy threat',()=>{
 const f=fixture();f.begin([{at:0,dir:'left',kind:'heavy'},{at:1000,dir:'right',kind:'normal',wait:1400}]);f.tick(1200);f.rush.swipe('right');assert.equal(f.rush.hits,1);f.tick(1449);assert.equal(f.rush.heavy.state,'flying');f.rush.swipe('left');assert.equal(f.rush.hits,2);f.tick(900);assert.equal(f.owner.lives,3);assert.equal(f.game.finished,1);
});
test('early shield expires, real heavy deadline deducts once, and pause freezes spawn and countdown together',()=>{
 const f=fixture();f.begin([{at:0,dir:'left',kind:'heavy'}]);f.tick(100);f.rush.swipe('left');f.clock.pause();f.tick(5000);assert.equal(f.rush.heavy.state,'charging');assert.equal(f.owner.lives,3);f.clock.resume();f.tick(2550);assert.equal(f.rush.misses,1);assert.equal(f.owner.lives,2);f.rush.miss(f.rush.targets[0]);assert.equal(f.owner.lives,2);
});
test('gestures cannot hit targets which spawned after touch-down, and stopping invalidates callbacks',()=>{
 const f=fixture();f.begin([{at:200,dir:'left',kind:'normal',wait:1000}]);const snapshot=f.rush.inputSnapshot();f.tick(200);f.rush.swipe('left',snapshot);assert.equal(f.rush.hits,0);f.rush.swipe('left',f.rush.inputSnapshot());assert.equal(f.rush.hits,1);f.rush.stop();f.tick(4000);assert.equal(f.owner.finishes,undefined);assert.equal(f.owner.lives,3);
});
test('zero lives stops future spawns and produces only one result',()=>{
 const f=fixture();f.owner.lives=1;f.begin([{at:0,dir:'left',kind:'normal',wait:100},{at:150,dir:'right',kind:'normal',wait:100}]);f.tick(1000);assert.equal(f.owner.lives,0);assert.equal(f.rush.targets.length,1);assert.equal(f.owner.finishes,1);assert.equal(f.rush.misses,1);
});

test('two directions accept consecutive swipes and out-of-order or duplicate impacts cannot finish early',()=>{
 const f=fixture(),impacts=[];f.game.launchProjectile=(dir,done)=>impacts.push(done);f.begin([{at:0,dir:'left',kind:'normal',wait:1000},{at:0,dir:'right',kind:'normal',wait:1000}]);
 f.rush.swipe('left');f.rush.swipe('right');assert.equal(f.rush.hits,2);assert.equal(f.game.score,200);impacts[1]();impacts[1]();assert.equal(f.rush.segmentClosing,false);impacts[0]();assert.equal(f.rush.segmentClosing,true);f.tick(900);assert.equal(f.game.finished,1);impacts[0]();assert.equal(f.rush.hits,2);assert.equal(f.owner.lives,3);
});

test('remaining-time meters share one scale so a newer fast target correctly appears more urgent',()=>{
 const f=fixture();f.begin([{at:0,dir:'left',kind:'normal',wait:2400},{at:900,dir:'right',kind:'normal',wait:1100}]);f.tick(912);
 const length=t=>Number(t.fill.style.transform.match(/scaleX\(([^)]+)\)/)[1]);assert.ok(length(f.rush.targets[1])<length(f.rush.targets[0]));
});

test('two misses in one overlap wave deduct one life and one penalty and continue endless play',()=>{const f=fixture();f.game.score=100;f.begin([{at:0,dir:'left',kind:'normal',wait:100},{at:0,dir:'right',kind:'normal',wait:150}]);f.tick(1000);assert.equal(f.owner.lives,2);assert.equal(f.game.mistakes,1);assert.equal(f.game.score,90);assert.equal(f.game.finished,1);assert.equal(f.owner.finishes,undefined);});
