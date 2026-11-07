const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(blocked=false){
 let now=0,id=0;const jobs=new Map(),saved=new Map(),nodes=new Map();
 const node=()=>({style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},textContent:'',setAttribute(){},remove(){},focus(){}});
 const document={addEventListener(){},getElementById(key){if(!nodes.has(key))nodes.set(key,node());return nodes.get(key);}};
 const window={},context=vm.createContext({window,document,console:{log(){},warn(){}},performance:{now:()=>now},
 localStorage:{getItem(k){if(blocked)throw Error();return saved.get(k)||null;},setItem(k,v){if(blocked)throw Error();saved.set(k,v);}},
 setTimeout(fn,ms=0){jobs.set(++id,{fn,at:now+ms});return id;},clearTimeout(k){jobs.delete(k);},requestAnimationFrame(){},cancelAnimationFrame(){}});
 for(const file of ['js/core/GameClock.js','js/core/TimedChallenge.js','js/data/minigameAssets.js','js/minigames/DefenseLevels.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
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
 f.tick(699);assert.equal(ends,0);f.tick(1);assert.equal(ends,1);assert.equal(c.penalties,3);
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

test('best records preserve legacy scores and bind progress to the same best-scoring run',()=>{
 const {c,saved}=fixture();c.variant='endless';
 saved.set(c.storageKey,JSON.stringify({'endless:defense:adult':1200}));
 assert.equal(c.best('defense','adult'),1200);assert.equal(c.bestRecord('defense','adult').progress,null);
 assert.match(c.bestLabel('defense','adult'),/舊紀錄未記進度/);
 c.bestRecord('defense','adult',1000,150);assert.equal(c.bestRecord('defense','adult').progress,null);
 c.bestRecord('defense','adult',1200,94);assert.equal(c.bestRecord('defense','adult').progress,94);
 c.bestRecord('defense','adult',1200,90);assert.equal(c.bestRecord('defense','adult').progress,94);
 c.bestRecord('defense','adult',1200,96);assert.equal(c.bestRecord('defense','adult').progress,96);
 c.bestRecord('defense','adult',1400,92);assert.equal(c.bestRecord('defense','adult').progress,92);
 assert.match(c.bestLabel('defense','adult'),/1,400 分 · 第 92 波/);
 c.bestRecord('memory','child',300,6);assert.match(c.bestLabel('memory','child'),/完成 6 盤/);
 assert.equal(c.bestRecord('defense','child').score,0);
 const blocked=fixture(true).c;blocked.variant='endless';assert.equal(blocked.bestRecord('defense','adult',20,2).progress,2);
});

test('invalid record progress and corrupt payloads cannot invent a historical wave',()=>{
 const {c,saved}=fixture();c.variant='endless';
 for(const payload of [null,[],{score:'x',progress:94},{score:10,progress:-1},{score:10,progress:2.5}]){
  saved.set(c.storageKey,JSON.stringify({'endless:defense:adult':payload}));
  assert.equal(c.bestRecord('defense','adult').progress,null);
 }
 saved.set(c.storageKey,'broken');assert.equal(c.bestRecord('defense','adult',100,94).progress,94);
});

test('endless memory forgives mistakes, successful pairs recover one mark, and clearing a board resets marks without restoring lives',()=>{
 for(const mode of ['adult','child']){
  const f=fixture(),c=f.c;c.variant='endless';c.mode=mode;c.lives=3;c.memoryMistakes=0;c.liveClock=f.clock();
  const limit=mode==='child'?4:3;
  for(let i=0;i<limit-1;i++)c.memoryMiss();assert.equal(c.lives,3);assert.equal(c.memoryMistakes,limit-1);
  c.paired();assert.equal(c.memoryMistakes,limit-2);assert.equal(c.score,10);
  c.memoryMiss();c.memoryMiss();assert.equal(c.lives,2);assert.equal(c.memoryMistakes,0);
  c.memoryMiss();c.game={challenge:c};c.liveClock=f.clock();c.liveTimer=c.liveClock.setInterval(()=>{},1000);c.consumeTime=()=>{};c.launchMemory=()=>{};
  c.boardComplete(c.game);assert.equal(c.memoryMistakes,0);assert.equal(c.lives,2);assert.equal(c.boards,1);
 }
});

test('wave 94 retains fast single targets while multi-direction deadlines include gesture count',()=>{
 for(const mode of ['adult','child']){
  const {c,context}=fixture();c.variant='endless';c.kind='defense';c.mode=mode;
  const game={waveNumber:93,levelConfig:{flow:{}}};
  // 系統性取樣每個素材層與題型，固定亂數以重現第 94 波。
  for(let level=0;level<3;level++)for(let pick=0;pick<100;pick++){
   vm.runInContext(`{let calls=0;Math.random=()=>calls++===0?${(level+.1)/3}:${pick/100};}`,context);
   const a=c.nextAttack(game),targets=(a.correctDirs||a.dirs||[a.dir]).length;
   const floor=mode==='child'?1250:850;
   if(a.type==='NORMAL')assert.equal(a.wait,floor);
   if(['MULTI','MULTI_MIXED'].includes(a.type))assert.ok(a.wait>=floor+(targets-1)*(mode==='child'?300:260));
   assert.ok(game.levelConfig.flow.successGap<=180);
  }
 }
});

test('endless pause summary uses progress instead of survival time',()=>{
 const {c}=fixture();c.variant='endless';c.score=1234;c.elapsed=200000;c.kind='defense';c.game={waveNumber:94};
 assert.match(c.pauseDetail(),/第 94 波/);assert.doesNotMatch(c.pauseDetail(),/秒|存活/);
 c.kind='memory';c.boards=5;assert.match(c.pauseDetail(),/完成 5 盤/);
});

test('endless defense music rises gently every ten waves and stops at sixteen percent',()=>{
 const {c,window}=fixture();c.variant='endless';c.kind='defense';c.mode='adult';const rates=[];
 window.GameMusic={setPlaybackRate:(rate,owner)=>rates.push({rate,owner})};
 const game={levelConfig:{flow:{}}};
 for(const [wave,rate] of [[1,1],[10,1],[11,1.02],[31,1.06],[81,1.16],[94,1.16],[1000,1.16]]){
  game.waveNumber=wave-1;c.nextAttack(game);assert.ok(Math.abs(rates.at(-1).rate-rate)<1e-9);assert.equal(rates.at(-1).owner,'defense');
 }
 const count=rates.length;c.variant='timed';c.nextAttack(game);assert.equal(rates.length,count);
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

test('actual endless memory mismatch fills the forgiving mistake meter without immediate life or time penalty',()=>{
 const f=fixture();vm.runInContext(fs.readFileSync('js/minigames/MemoryGameV2.js','utf8'),f.context);
 const c=f.c,g=f.window.MemoryGameV2;c.variant='endless';c.lives=3;c.liveClock=f.clock();
 const card=symbol=>({dataset:{symbol},classList:{add(){},remove(){}}});let callbacks=[];
 Object.assign(g,{challenge:c,gameActive:true,gameMode:'time',lightMode:'none',wrongStreak:0,matchedPairs:0,totalPairs:2,timeLeft:90,statusText:{style:{}},session:{timeout(fn){callbacks.push(fn);}},updateStats(){},updateStrikes(){}});
 g.flippedCards=[card('a'),card('b')];g.checkMatch();assert.equal(c.lives,3);assert.equal(c.memoryMistakes,1);assert.equal(c.penalties,0);assert.equal(g.wrongStreak,0);assert.equal(g.timeLeft,90);
 callbacks.forEach(fn=>fn());assert.equal(g.flippedCards.length,0);assert.equal(g.canFlip,true);
});

test('challenge lobby retains selected variant, separate best and theme through countdown and results',()=>{
 const f=fixture();f.context.showScene=()=>{};f.window.gameMode='child';
 f.c.showInfo('memory','endless');assert.equal(f.c.endless,true);assert.equal(f.c.mode,'child');
 for(const id of ['game-wrapper','challenge-lobby','challenge-countdown','challenge-results'])assert.equal(f.nodes.get(id).dataset.challengeKind,'memory');
 assert.match(f.nodes.get('challenge-lobby-points').innerHTML,/三條命/);
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

test('ordered variants unlock gradually, remove relay, keep rotation and stay out of timed mode',()=>{
 for(const mode of ['adult','child']){
  const {c}=fixture();Object.assign(c,{kind:'defense',variant:'endless',mode});const game={levelConfig:{flow:{}}};
  const expected={41:'visible',51:'visible',61:'memory',71:'visible',81:'stone',86:'memory',101:'memory-stone',106:'visible',111:'memory',116:'stone'};
  for(const [wave,variant] of Object.entries(expected)){game.waveNumber=Number(wave)-1;const a=c.nextAttack(game);assert.equal(a.type,'ORDER');assert.equal(a.orderMode,variant);assert.equal(a.wait,mode==='child'?2600:1900);assert.equal(new Set(a.dirs).size,a.dirs.length);assert.equal(a.dirs.length,Number(wave)>=81?3:2);assert.equal(a.stoneDirs.length,variant.includes('stone')?1:0);assert.ok(a.stoneDirs.every(d=>!a.dirs.includes(d)));assert.equal(a.orderPreview,variant.startsWith('memory')?(mode==='child'?2200:1600):0);}
  for(const wave of [40,60,80,100,120]){game.waveNumber=wave-1;assert.equal(c.nextAttack(game).type,'AOE');}
  c.variant='timed';for(let i=0;i<20;i++){game.waveNumber=100;assert.notEqual(c.nextAttack(game).type,'ORDER');}
 }
});
test('console order commands validate before changing state and select the requested practice variant',()=>{
 const f=fixture(),calls=[];f.c.showInfo=(...args)=>calls.push(args);f.c.start=options=>calls.push(options);
 assert.throws(()=>f.window.GameTest.order('typo'));assert.equal(calls.length,0);
 f.window.GameTest.order();assert.equal(calls[1].practiceOrder,'visible');f.window.GameTest.order('memory');assert.equal(calls[3].practiceOrder,'memory');
 assert.equal(f.window.GameTest.stop(),false);f.c.practiceOrder='memory';f.c.exit=()=>calls.push('exit');assert.equal(f.window.GameTest.stop(),true);assert.equal(calls.at(-1),'exit');
});
test('practice starts directly, repeats selected three-target variant, and normal start resets it',()=>{
 const f=fixture();f.context.AbortController=AbortController;vm.runInContext(fs.readFileSync('js/core/MinigameSession.js','utf8'),f.context);f.context.showScene=()=>{};
 f.window.GameEngine={stopMinigame(){}};f.window.ChallengeScenes={pickBackground:()=> 'background.png'};f.window.LoadingManager={showAndLoad(urls,ready){ready();}};f.window.GamePause={attach(){},end(){}};
 let launches=0;f.c.launch=()=>launches++;f.c.kind='defense';f.c.variant='endless';f.c.start({practiceOrder:'memory'});assert.equal(launches,1);assert.equal(f.c.practiceOrder,'memory');assert.equal(f.c.replayPracticeOrder,'memory');
 const game={levelConfig:{flow:{}}};for(const wave of [1,2,30,41,61,100]){game.waveNumber=wave-1;const a=f.c.nextAttack(game);assert.equal(a.type,'ORDER');assert.equal(a.orderMode,'memory');assert.equal(a.dirs.length,3);assert.ok(a.orderPreview>0);}
 f.c.start();assert.equal(f.c.practiceOrder,null);assert.equal(f.c.replayPracticeOrder,null);assert.equal(launches,1);f.tick(3000);assert.equal(launches,2);
});
test('practice results never write best records; normal results still save',()=>{
 for(const practice of [true,false]){const f=fixture();f.context.showScene=()=>{};f.window.GamePause={end(){}};Object.assign(f.c,{kind:'defense',variant:'endless',mode:'adult',practiceOrder:practice?'memory':null,game:{score:999,waveNumber:5,stop(){}}});f.c.finish();assert.equal(f.saved.size,practice?0:1);if(practice)assert.match(f.nodes.get('challenge-final-detail').textContent,/不保存紀錄/);}
});

test('endless AOE wait shortens across actual generated waves in both age modes and respects its floor',()=>{
 for(const mode of ['adult','child']){
  const {c}=fixture();c.kind='defense';c.mode=mode;c.variant='endless';const waits=[];
  for(const wave of [30,40,50,60,100,200]){
   const game={waveNumber:wave-1,levelConfig:{flow:{}}};const attack=c.nextAttack(game);assert.equal(attack.type,'AOE');waits.push(attack.wait);
  }
  assert.ok(waits[0]>waits[1]);assert.ok(waits[1]>waits.at(-1));assert.equal(waits.at(-1),mode==='child'?3400:2600);
  assert.ok(waits.every((n,i)=>i===0||n<=waits[i-1]));
 }
});

test('feedback counts clean waves and only one failure category per failed wave, preserving the longest streak',()=>{
 const {c}=fixture();c.kind='defense';c.resetFeedback();
 for(let i=0;i<3;i++)c.defenseWaveFinished({type:'NORMAL'});
 const stone={type:'ORDER',lossReason:'碰到石頭'};c.recordDefenseMistake(stone);c.recordDefenseMistake(stone);c.defenseWaveFinished(stone);c.defenseWaveFinished(stone);
 for(let i=0;i<2;i++)c.defenseWaveFinished({type:'HEAVY'});
 const heavy={type:'HEAVY',lossReason:'格擋失敗：太早'};c.recordDefenseMistake(heavy);c.defenseWaveFinished(heavy);
 const rows=c.feedbackItems();assert.equal(rows[0][1],'3 波');assert.match(rows[1][1],/打到石頭 1 次/);assert.match(rows[1][1],/重擊格擋 1 次/);assert.equal(c.defenseFeedback.streak,0);
 c.resetFeedback();assert.equal(c.feedbackItems()[0][1],'0 波');assert.equal(c.feedbackItems()[1][1],'沒有失誤');
});
test('memory accuracy includes every failed pair in timed and endless play and streak spans boards',()=>{
 for(const variant of ['timed','endless']){
  const {c}=fixture();c.kind='memory';c.variant=variant;c.lives=3;c.resetFeedback();c.memoryErrors=0;
  assert.equal(c.feedbackItems()[0][1],'尚未完成配對');c.paired();c.paired();c.memoryMiss();c.paired();
  assert.equal(c.memoryErrors,1);assert.equal(c.feedbackItems()[0][1],'75%');assert.equal(c.feedbackItems()[1][1],'2 對');assert.equal(c.memoryPairStreak,1);
  c.resetFeedback();assert.equal(c.memoryBestStreak,0);
 }
});
test('all challenge lobby variants contain exactly three short points without duplicate rule text',()=>{
 const f=fixture();f.context.showScene=()=>{};
 for(const kind of ['defense','memory'])for(const variant of ['timed','endless']){
  f.c.showInfo(kind,variant);const points=f.c.lobbyPoints();assert.equal(points.length,3);assert.ok(points.every(p=>p.length<=34));
  assert.equal((f.nodes.get('challenge-lobby-points').innerHTML.match(/<li>/g)||[]).length,3);
 }
});

test('formal practice keeps its selected real mechanic and authored speed through later waves in both age modes',()=>{
 for(const mode of ['adult','child'])for(const kind of ['heavy','aoe','visible','memory']){
  const {c}=fixture();Object.assign(c,{kind:'defense',mode,variant:'endless',practiceKind:kind,practiceOrder:['visible','memory'].includes(kind)?kind:null});const waits=[];
  for(const wave of [1,30,41,60,81,101,200]){
   const a=c.nextAttack({waveNumber:wave-1,levelConfig:{flow:{}}});assert.equal(a.type,kind==='heavy'?'HEAVY':kind==='aoe'?'AOE':'ORDER');waits.push(a.wait);assert.equal(a.heavyIgnitionInterval,400);
   if(a.type==='ORDER'){assert.equal(a.orderMode,kind);assert.equal(a.dirs.length,3);assert.equal(a.orderPreview>0,kind==='memory');}
  }
  assert.ok(waits.every(wait=>wait===waits[0]));
 }
});
test('actual defense practice score and life hooks preserve zero score and three lives after repeated successes and mistakes',()=>{
 const f=fixture();f.context.DefenseLevels=f.window.DefenseLevels;vm.runInContext(fs.readFileSync('js/minigames/DefenseGameV2.js','utf8'),f.context);const g=f.window.DefenseGameV2,c=f.c;
 Object.assign(c,{kind:'defense',variant:'endless',practiceKind:'heavy',lives:3});Object.assign(g,{challenge:c,score:0,gameActive:true,sessionId:1,currentAttack:{type:'HEAVY',lossReason:'格擋失敗'}});
 for(let i=0;i<5;i++){g.addScore(100);g.addScore(-50);g.recordMistake();}assert.equal(g.score,0);assert.equal(c.lives,3);assert.notEqual(c.ending,true);assert.equal(f.saved.size,0);
});
test('formal practice launches without countdown, derives order mode safely and normal challenge resets practice',()=>{
 const f=fixture();f.context.AbortController=AbortController;vm.runInContext(fs.readFileSync('js/core/MinigameSession.js','utf8'),f.context);f.context.showScene=()=>{};
 f.window.GameEngine={stopMinigame(){}};f.window.ChallengeScenes={pickBackground:()=> 'background.png'};f.window.LoadingManager={showAndLoad(urls,ready){ready();}};f.window.GamePause={attach(){},end(){}};let launches=0;f.c.launch=()=>launches++;
 Object.assign(f.c,{kind:'defense',variant:'endless'});
 f.c.start({practiceKind:'memory'});assert.equal(launches,1);assert.equal(f.c.practiceOrder,'memory');assert.equal(f.c.isPractice,true);
 f.c.start({practiceKind:'heavy',practiceOrder:'memory'});assert.equal(launches,2);assert.equal(f.c.practiceOrder,null);assert.equal(f.c.practiceKind,'heavy');
 f.c.start();assert.equal(f.c.practiceKind,null);assert.equal(f.c.isPractice,false);assert.equal(launches,2);f.tick(3000);assert.equal(launches,3);
});
test('formal heavy and AOE practice never write a best record, even if finish is requested',()=>{
 for(const kind of ['heavy','aoe']){const f=fixture();f.context.showScene=()=>{};f.window.GamePause={end(){}};Object.assign(f.c,{kind:'defense',variant:'endless',practiceKind:kind,game:{score:999,waveNumber:5,stop(){}}});f.c.finish();assert.equal(f.saved.size,0);assert.equal(f.c.active,false);}
});
