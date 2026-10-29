const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function load(file,extra={}){const window={},context={window,document:{getElementById(){return null}},console:{log(){},warn(){}},clearTimeout(){},...extra};vm.runInNewContext(fs.readFileSync(file,'utf8'),context);return {window,context};}
const card=s=>({dataset:{symbol:s},style:{},classList:{set:new Set(),add(c){this.set.add(c)},remove(c){this.set.delete(c)},contains(c){return this.set.has(c)}}});
function memory(){const {window,context}=load('js/minigames/MemoryGameV2.js');const game=window.MemoryGameV2,jobs=[];
 Object.assign(game,{playerMode:'child',gameMode:'attempts',lightMode:'red',attemptsLeft:20,moves:0,wrongStreak:0,rightStreak:0,matchedPairs:0,totalPairs:5,penaltyRedemption:0,redeemedCount:0,statusText:{style:{}},session:{timeout(fn){jobs.push(fn)}}});
 game.updateStats=game.updateStrikes=()=>{};game.endGame=win=>game.result=win;
 const pair=match=>{game.flippedCards=[card('a'),card(match?'a':'b')];game.checkMatch();while(jobs.length)jobs.shift()();};return {game,pair,jobs,document:context.document};}
test('child red-light penalty remains; quiz reward offsets only the extra penalty',()=>{
 for(const reward of [0,1]){const {game,pair}=memory();game.penaltyRedemption=reward;pair(false);pair(false);pair(false);assert.equal(game.attemptsLeft,reward?17:16);assert.equal(game.redeemedCount,reward);assert.equal(game.wrongStreak,0);}
});
test('last attempt can complete the final pair, but not an unfinished board',()=>{
 for(const [pairs,win]of [[1,true],[2,false]]){const {game,pair}=memory();game.attemptsLeft=1;game.totalPairs=pairs;pair(true);assert.equal(game.result,win);}
});
test('adult timed red-light penalty also respects earned redemption',()=>{
 for(const reward of [0,1]){const {game,pair}=memory();game.playerMode='adult';game.gameMode='time';game.timeLeft=60;game.penaltyRedemption=reward;pair(false);pair(false);pair(false);assert.equal(game.timeLeft,reward?60:55);assert.equal(game.redeemedCount,reward);}
});
test('known-pair hint uses only seen, unmatched, face-down cards without consuming an attempt',()=>{
 const {game}=memory();const a=card('x'),b=card('x'),unseen=card('x');game.gameActive=true;game.canFlip=true;game.flippedCards=[];game.seenCards=new Set([a]);
 game.showKnownPairHint();assert.equal(a.classList.contains('memory-known-hint'),false);assert.equal(unseen.classList.contains('memory-known-hint'),false);
 game.seenCards.add(b);game.showKnownPairHint();assert.equal(a.classList.contains('memory-known-hint'),true);assert.equal(b.classList.contains('memory-known-hint'),true);assert.equal(a.classList.contains('is-flipped'),false);assert.equal(game.attemptsLeft,20);
 game.clearKnownHint();b.classList.add('matched');game.showKnownPairHint();assert.equal(a.classList.contains('memory-known-hint'),false);
});
test('hint skips card selection, memorization, hidden pages and adult mode',()=>{
 const {game,document}=memory();const a=card('x'),b=card('x');game.seenCards=new Set([a,b]);game.gameActive=true;game.canFlip=true;
 for(const selected of [[a],[]]){game.flippedCards=selected;game.isMemorizing=selected.length===0;game.showKnownPairHint();assert.equal(a.classList.contains('memory-known-hint'),false);}
 game.isMemorizing=false;document.hidden=true;game.showKnownPairHint();assert.equal(a.classList.contains('memory-known-hint'),false);
 document.hidden=false;game.playerMode='adult';game.showKnownPairHint();assert.equal(a.classList.contains('memory-known-hint'),false);
});
test('hint schedule waits six seconds and stopping invalidates late callbacks',()=>{
 const {game}=memory(),jobs=[];game.gameActive=true;game.canFlip=true;game.flippedCards=[];game.session={timeout(fn,delay){jobs.push({fn,delay});return jobs.length}};
 let shown=0;game.showKnownPairHint=()=>shown++;game.startKnownHints();assert.equal(jobs[0].delay,6000);assert.equal(shown,0);jobs[0].fn();assert.equal(shown,1);game.stopKnownHints();jobs[1].fn();assert.equal(shown,1);
});
test('both chapters offer story-based retry, and chapter 2 retains actual prior-game rewards',()=>{
 const window={MemoryGameV2:{penaltyRedemption:2}},context={window,console:{log(){}}};
 for(const name of ['chapter1_child','chapter1_teen','chapter2_child','chapter2_teen'])vm.runInNewContext(fs.readFileSync('js/data/'+name+'.js','utf8'),context);
 for(const key of ['Chapter1_Child','Chapter1_Teen'])for(const id of ['level1_fail','level2_fail','level3_fail']){const opts=window[key].dialogue.find(l=>l.id===id).options;assert.equal(opts[0].text,'再挑戰一次');assert.equal(opts[0].action,'minigame');assert.equal(opts[1].text,'繼續故事');}
 for(const key of ['Chapter2_Child','Chapter2_Teen']){const opts=window[key].dialogue.find(l=>l.id==='fail_options').options;assert.equal(opts[0].action,'minigame');assert.equal(opts[0].penaltyRedemption,2);window.MemoryGameV2.penaltyRedemption=0;assert.equal(opts[0].penaltyRedemption,0);window.MemoryGameV2.penaltyRedemption=2;assert.equal(opts[1].text,'繼續故事');}
});
test('touch tolerance and highlighting agree, without changing answer validation',()=>{
 const make=(left,right)=>({getBoundingClientRect:()=>({left,right,top:100,bottom:200}),classList:{add(){this.highlight=true},remove(){this.highlight=false}},getAttribute:()=>left===100?'left':'right'}),zones=[make(100,200),make(220,320)];
 const {window}=load('js/minigames/InteractSystem.js',{document:{querySelectorAll:()=>zones}}),game=window.InteractSystem;game.currentScale=.3;
 assert.equal(game.isPointInDropZone(95,150,'touch'),zones[0]);assert.equal(game.isPointInDropZone(95,150,'mouse'),null);assert.equal(game.isPointInDropZone(210,150,'touch'),null);
 game.highlightDropZones(208,150,'touch');assert.equal(zones[0].classList.highlight,true);assert.equal(zones[1].classList.highlight,false);game.currentMode='matching';assert.equal(game.checkCorrectDrop(zones[0],{},{correctZone:'right'}),false);
});
