const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(blocked=false){
 let now=0,id=0;const jobs=new Map(),saved=new Map(),nodes=new Map();
 const node=()=>({style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},textContent:'',setAttribute(){},remove(){},focus(){}});
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

test('endless mode survives beyond 90 active seconds and pauses without consuming survival time',()=>{
 const f=fixture(),c=f.c,clock=f.clock();c.variant='endless';c.lives=3;
 const game={challenge:c,session:{clock},updateStats(){}};let ends=0;c.finish=()=>ends++;
 c.ready(game);f.tick(100000);assert.equal(ends,0);assert.equal(c.elapsed,100000);assert.equal(c.remaining,90000);
 clock.pause();f.tick(50000);assert.equal(c.elapsed,100000);clock.resume();f.tick(1000);assert.equal(c.elapsed,101000);
});

test('endless defense loses at most one life per wave and ends exactly once at zero',()=>{
 const f=fixture(),c=f.c;c.variant='endless';c.lives=3;c.liveClock=f.clock();let ends=0;
 c.finish=()=>{ends++;c.active=false;};
 const attack={};c.loseLife(attack);c.loseLife(attack);assert.equal(c.lives,2);assert.equal(c.penalties,1);
 c.loseLife({});assert.equal(c.lives,1);c.loseLife({});c.loseLife({});assert.equal(c.lives,0);assert.equal(ends,0);
 f.tick(1);assert.equal(ends,1);assert.equal(c.penalties,3);
});

test('leaving an endless game invalidates a pending death callback',()=>{
 const f=fixture(),c=f.c;c.variant='endless';c.lives=1;c.liveClock=f.clock();let ends=0;c.finish=()=>ends++;
 c.loseLife();c.stop();f.tick(1000);assert.equal(ends,0);
});

test('real defense mistake reporting deducts only one life for multiple errors in the same attack',()=>{
 const f=fixture();f.context.DefenseLevels=f.window.DefenseLevels;vm.runInContext(fs.readFileSync('js/minigames/DefenseGameV2.js','utf8'),f.context);
 const c=f.c,g=f.window.DefenseGameV2;c.variant='endless';c.lives=3;c.liveClock=f.clock();
 Object.assign(g,{challenge:c,gameActive:true,mistakes:0,currentAttack:{}});c.kind='defense';c.game=g;
 g.recordMistake();g.recordMistake();assert.equal(g.mistakes,2);assert.equal(c.lives,2);
 g.currentAttack={};g.recordMistake();assert.equal(c.lives,1);
});

test('timed and endless best scores are isolated across both games and ages',()=>{
 const {c}=fixture();
 for(const kind of ['defense','memory'])for(const mode of ['child','adult']){
  c.variant='timed';c.best(kind,mode,100);c.variant='endless';assert.equal(c.best(kind,mode),0);c.best(kind,mode,250);
  c.variant='timed';assert.equal(c.best(kind,mode),100);c.variant='endless';assert.equal(c.best(kind,mode),250);
 }
});

test('endless defense introduces mechanics by waves with bounded reaction and preparation times',()=>{
 for(const mode of ['child','adult']){
  const {c}=fixture();c.kind='defense';c.variant='endless';c.mode=mode;
  const game={levelConfig:{flow:{},bgImage:'fixed'}};
  for(const wave of [1,9,10,11,20,21,29,30,40,1000])for(let i=0;i<30;i++){
   game.waveNumber=wave-1;const attack=c.nextAttack(game);
   if(wave<=10)assert.equal(attack.type,'NORMAL');
   if(wave<=20)assert.ok(!['HEAVY','AOE'].includes(attack.type));
   if(wave>=30&&wave%10===0)assert.equal(attack.type,'AOE');
   assert.ok(attack.wait>=(attack.type==='AOE'?(mode==='child'?3400:2600):(mode==='child'?1250:850)));
   assert.ok(game.levelConfig.flow.prepareTime>=(mode==='child'?140:100));assert.ok(game.levelConfig.flow.successGap>=(mode==='child'?180:120));
   assert.equal(game.levelConfig.bgImage,'fixed');
  }
 }
});

test('challenge ignition and endless pacing speed up at later stages and stop at playable floors',()=>{
 for(const mode of ['child','adult']){
  const {c}=fixture();c.mode=mode;c.variant='endless';let previous;
  for(let stage=0;stage<=12;stage++){
   const speed=c.defenseSpeed(stage,0);
   if(previous){assert.ok(speed.ignition<=previous.ignition);assert.ok(speed.gap<=previous.gap);assert.ok(speed.prepareTime<=previous.prepareTime);}
   previous=speed;
  }
  assert.equal(previous.ignition,mode==='child'?140:100);assert.equal(previous.gap,mode==='child'?180:120);
  assert.ok(c.defenseSpeed(4,0).ignition<250);
  c.variant='timed';let last=Infinity;
  for(const elapsed of [0,20000,40000,60000,90000]){const p=c.defenseSpeed(0,elapsed);assert.ok(p.ignition<last);last=p.ignition;}
  assert.equal(last,mode==='child'?220:180);
 }
});

test('actual heavy sequence uses captured challenge ignition interval; story stays at 400ms',()=>{
 for(const scenario of [{variant:'endless',mode:'adult',stage:8,interval:100},{variant:'endless',mode:'child',stage:8,interval:140},{variant:'timed',mode:'adult',elapsed:90000,interval:180},{variant:'timed',mode:'child',elapsed:90000,interval:220},{story:true,interval:400}]){
  const f=fixture(),c=f.c;c.variant=scenario.variant;c.mode=scenario.mode;
  f.context.DefenseLevels=f.window.DefenseLevels;vm.runInContext(fs.readFileSync('js/minigames/DefenseGameV2.js','utf8'),f.context);
  const g=f.window.DefenseGameV2,clock=f.clock(),lit=[];let launched=0;
  f.context.document.createElement=()=>({style:{},dataset:{}});
  Object.assign(g,{challenge:scenario.story?null:c,pauseClock:clock,gameActive:true,state:g.states.HEAVY_CHARGING,
   currentAttack:{heavyIgnitionInterval:scenario.story?100:c.defenseSpeed(scenario.stage||0,scenario.elapsed||0).ignition},
   scaledSizes:{heavySequence:40},scaledPositions:{up:{x:0,y:-200}},stage:{appendChild(){},getBoundingClientRect(){return {width:844,height:390};}},
   levelConfig:{},heavySequence:[],lightIntervals:{},hideShields(){},startHeavyBlockBounce(){lit.push(clock.now());},stopAllHeavyBlocksBounce(){},setState(state){this.state=state;},launchHeavyProjectile(){launched++;}});
  g.spawnHeavySequence('up');const oldIgnition=g.lightIntervals.up;f.tick(scenario.interval-1);assert.equal(lit.length,0);f.tick(1);assert.equal(lit.length,1);
  // 中途修改下一波參數，正在點燃的序列仍維持本波速度。
  g.currentAttack.heavyIgnitionInterval=999;
  clock.pause();f.tick(5000);assert.equal(lit.length,1);clock.resume();f.tick(scenario.interval*4);
  assert.equal(lit.length,5);assert.equal(launched,1);assert.equal(lit[4]-lit[0],scenario.interval*4);
  g.currentAttack.challengeGap=120;
  if(scenario.story)assert.notEqual(g.getCurrentGap(),120);else assert.equal(g.getCurrentGap(),120);
  g.currentAttack={heavyIgnitionInterval:scenario.interval};g.state=g.states.HEAVY_CHARGING;g.spawnHeavySequence('up');
  const nextIgnition=g.lightIntervals.up;oldIgnition.callback();assert.equal(g.lightIntervals.up,nextIgnition);assert.equal(clock.jobs.has(nextIgnition),true);
 }
});

test('endless memory caps card count and progressively shortens memorization with a floor',()=>{
 const {c,window}=fixture(),options=[];c.variant='endless';
 window.MemoryGameV2={start:o=>options.push(o)};window.GamePause={attach(){}};c.decorate=()=>{};
 for(const mode of ['child','adult']){
  c.mode=mode;let previous=Infinity;
  for(const boards of [0,1,2,5,10,100]){c.boards=boards;c.launchMemory();const o=options.at(-1);
   assert.equal(o.lightMode,'none');assert.ok(o.memorizationTime<=previous);previous=o.memorizationTime;
   assert.ok(o.memorizationTime>=(mode==='child'?1600:1200));assert.ok(o.cardCount<=(mode==='child'?10:12));
  }
 }
});

test('actual endless memory mismatch loses one life immediately without red-light or time penalty',()=>{
 const f=fixture();vm.runInContext(fs.readFileSync('js/minigames/MemoryGameV2.js','utf8'),f.context);
 const c=f.c,g=f.window.MemoryGameV2;c.variant='endless';c.lives=3;c.liveClock=f.clock();
 const card=symbol=>({dataset:{symbol},classList:{add(){},remove(){}}});let callbacks=[];
 Object.assign(g,{challenge:c,gameActive:true,gameMode:'time',lightMode:'none',wrongStreak:0,matchedPairs:0,totalPairs:2,timeLeft:90,statusText:{style:{}},session:{timeout(fn){callbacks.push(fn);}},updateStats(){},updateStrikes(){}});
 g.flippedCards=[card('a'),card('b')];g.checkMatch();assert.equal(c.lives,2);assert.equal(c.penalties,1);assert.equal(g.wrongStreak,0);assert.equal(g.timeLeft,90);
 callbacks.forEach(fn=>fn());assert.equal(g.flippedCards.length,0);assert.equal(g.canFlip,true);
});

test('challenge lobby retains selected variant, separate best and theme through countdown and results',()=>{
 const f=fixture();f.context.showScene=()=>{};f.window.gameMode='child';
 f.c.showInfo('memory','endless');assert.equal(f.c.endless,true);assert.equal(f.c.mode,'child');
 for(const id of ['game-wrapper','challenge-lobby','challenge-countdown','challenge-results'])assert.equal(f.nodes.get(id).dataset.challengeKind,'memory');
 assert.match(f.nodes.get('challenge-lobby-copy').textContent,/三條命/);
 f.c.showInfo('defense');assert.equal(f.c.endless,false);assert.match(f.nodes.get('challenge-lobby-kicker').textContent,/90/);
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
test('both modes schedule AOE after 25 and 60 seconds with 400 points and the full reaction window',()=>{
 for(const mode of ['child','adult']){
  const {c,window}=fixture();c.kind='defense';c.mode=mode;c.aoeMilestone=0;
  const game={levelConfig:{bgImage:'fixed',flow:{}}};
  for(const [elapsed,expected] of [[24999,false],[25000,true],[26000,false],[60000,true],[61000,false]]){
   c.remaining=90000-elapsed;const attack=c.nextAttack(game);assert.equal(attack.type==='AOE',expected);
   if(expected){assert.equal(attack.points,400);assert.ok(window.DefenseLevels[3][mode].attackPatterns.some(a=>a.type==='AOE'&&a.wait===attack.wait));}
  }
 }
});
test('a new mixed wave cannot change the asset settings captured by an in-flight projectile',()=>{
 const {c}=fixture();c.mode='adult';c.remaining=80000;
 const game={levelConfig:{bgImage:'fixed',flow:{targetName:'old'},projectileHitImage:'old-hit.png',heavyEnemyImage:'old-heavy.png'}};
 const flightConfig=game.levelConfig,flightFlow=game.levelConfig.flow;
 c.nextAttack(game);assert.notEqual(game.levelConfig,flightConfig);assert.notEqual(game.levelConfig.flow,flightFlow);
 assert.equal(flightConfig.projectileHitImage,'old-hit.png');assert.equal(flightConfig.heavyEnemyImage,'old-heavy.png');assert.equal(flightFlow.targetName,'old');
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
test('repositioning the challenge panel preserves card size and resizing scales with the stage',()=>{
 const f=fixture();vm.runInContext(fs.readFileSync('js/minigames/MemoryGameV2.js','utf8'),f.context);
 const g=f.window.MemoryGameV2,cards=[{style:{}},{style:{}}];
 const stage=f.context.document.getElementById('game-wrapper');stage.clientHeight=400;
 Object.assign(g,{challenge:f.c,challengeCardBasis:{width:100,height:80,stageHeight:400},gridCols:4,gridRows:3,grid:{parentElement:{clientHeight:900,clientWidth:900},querySelectorAll:()=>cards}});
 g.adjustCardSize();assert.equal(cards[0].style.width,'100px');assert.equal(cards[0].style.height,'80px');
 stage.clientHeight=200;g.adjustCardSize();assert.equal(cards[0].style.width,'50px');assert.equal(cards[0].style.height,'40px');
});
