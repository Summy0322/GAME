const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function load(file,extra={}){const window={},context={window,document:{getElementById(){return null}},console:{log(){},warn(){}},...extra};vm.runInNewContext(fs.readFileSync(file,'utf8'),context);return {window,context};}
function memory(mode){const {window}=load('js/minigames/MemoryGameV2.js');const game=window.MemoryGameV2,jobs=[];
 Object.assign(game,{playerMode:mode,gameMode:'attempts',lightMode:'red',attemptsLeft:20,moves:0,wrongStreak:0,rightStreak:0,matchedPairs:0,totalPairs:5,statusText:{style:{}},session:{timeout(fn){jobs.push(fn)}}});
 game.updateStats=game.updateStrikes=game.triggerAttemptsPenaltyEffect=()=>{};game.endGame=win=>game.result=win;
 const pair=match=>{const card=s=>({dataset:{symbol:s},classList:{add(){},remove(){}}});game.flippedCards=[card('a'),card(match?'a':'b')];game.checkMatch();while(jobs.length)jobs.shift()();};return {game,pair};}
test('three child mistakes cost three ordinary attempts; adult extra penalty remains',()=>{
 for(const [mode,left]of [['child',17],['adult',16]]){const {game,pair}=memory(mode);pair(false);pair(false);pair(false);assert.equal(game.attemptsLeft,left);}
});
test('last available attempt can complete the final pair, but not an unfinished board',()=>{
 for(const [pairs,win]of [[1,true],[2,false]]){const {game,pair}=memory('child');game.attemptsLeft=1;game.totalPairs=pairs;pair(true);assert.equal(game.result,win);}
});
test('child quiz rewards still protect mistakes and are used only up to the earned allowance',()=>{
 const {game,pair}=memory('child');game.penaltyRedemption=2;game.redeemedCount=0;
 pair(false);pair(false);assert.equal(game.attemptsLeft,20);assert.equal(game.redeemedCount,2);
 pair(false);assert.equal(game.attemptsLeft,19);assert.equal(game.redeemedCount,2);
});
test('retry preserves level, mode and options without completing the story; stale retries cannot restart',()=>{
 const {window}=load('js/core/GameEngine.js'),engine=window.GameEngine,starts=[],results=[];
 window.MemoryGameV2={stop(){},start(options){starts.push(options)}};
 engine.collectMinigameAssets=()=>[];
 engine.startMinigame('memory',{level:2,gameMode:'child',cardCount:10,penaltyRedemption:2,onComplete:r=>results.push(r)});
 const old=starts[0];old.onRetry();assert.equal(starts.length,2);assert.equal(results.length,0);
 for(const key of ['level','gameMode','cardCount','penaltyRedemption'])assert.equal(starts[1][key],old[key]);
 old.onRetry();old.onComplete(false);assert.equal(starts.length,2);assert.equal(results.length,0);
 starts[1].onComplete(true);starts[1].onComplete(true);assert.deepEqual(results,[true]);
 engine.stopMinigame();starts[1].onRetry();assert.equal(starts.length,2);
});
function drops(){const make=(left,right)=>({getBoundingClientRect:()=>({left,right,top:100,bottom:200}),classList:{add(){this.highlight=true},remove(){this.highlight=false}},getAttribute:()=>left===100?'left':'right'});
 const zones=[make(100,200),make(220,320)],document={querySelectorAll:()=>zones};const {window}=load('js/minigames/InteractSystem.js',{document});const game=window.InteractSystem;game.currentScale=.3;return {game,zones};}
test('touch drop tolerance uses the closest zone, while mouse and ambiguous gaps remain strict',()=>{
 const {game,zones}=drops();assert.equal(game.isPointInDropZone(95,150,'touch'),zones[0]);assert.equal(game.isPointInDropZone(95,150,'mouse'),null);
 assert.equal(game.isPointInDropZone(208,150,'touch'),zones[0]);assert.equal(game.isPointInDropZone(210,150,'touch'),null);
 assert.equal(game.isPointInDropZone(50,150,'touch'),null);assert.equal(game.isPointInDropZone(221,150,'touch'),zones[1]);
 game.highlightDropZones(208,150,'touch');assert.equal(zones[0].classList.highlight,true);assert.equal(zones[1].classList.highlight,false);
 game.currentMode='matching';assert.equal(game.checkCorrectDrop(zones[0],{}, {correctZone:'right'}),false);
});
test('choosing retry disables old memory result controls without returning to story',()=>{
 const nodes=new Map();const document={getElementById:id=>nodes.get(id),createElement:()=>({style:{},set innerHTML(value){nodes.set('memory-result-btn',{});if(value.includes('memory-retry-btn'))nodes.set('memory-retry-btn',{})}})};
 const {window}=load('js/minigames/MemoryGameV2.js',{document}),game=window.MemoryGameV2;let retries=0,completed=0;
 game.container={getBoundingClientRect:()=>({width:844,height:390}),appendChild(){}};game.gameMode='attempts';game.attemptsLeft=0;
 game.onRetryCallback=()=>retries++;game.onCompleteCallback=()=>completed++;game.stop=()=>{game.container=null};
 game.showResultOverlay(false);const retry=nodes.get('memory-retry-btn').onclick,back=nodes.get('memory-result-btn').onclick;
 retry();retry();back();assert.equal(retries,1);assert.equal(completed,0);
});
