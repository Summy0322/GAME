const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(mode='adult'){
 const window={},owner={mode,active:true,ending:false,finish(){this.finishes=(this.finishes||0)+1;this.active=false;}};
 vm.runInNewContext(fs.readFileSync('js/core/MemoryTactics.js','utf8'),{window,document:{},Math});
 const jobs=[];const game={session:{timeout(fn){jobs.push(fn);}}};const tactics=owner.tactics=new window.MemoryTactics(owner);tactics.game=game;
 return {tactics,owner,game,flush(){jobs.splice(0).forEach(fn=>fn());}};
}
test('tactics advances one turn per completed attempt and never by real time or duplicate callbacks',()=>{
 const {tactics:t,owner,game}=fixture();const initial=t.untilAttack;
 t.paired('🫘');assert.equal(t.turns,0);t.afterAttempt(game);assert.equal(t.turns,1);assert.equal(t.untilAttack,initial-1);
 t.afterAttempt(game);assert.equal(t.turns,1);t.memoryMiss();t.afterAttempt({});assert.equal(t.turns,1);t.afterAttempt(game);assert.equal(t.turns,2);assert.equal(t.errors,1);
 owner.active=false;t.paired('🫘');t.afterAttempt(game);assert.equal(t.turns,2);
});
test('guard, recovery, charge and armor offer deterministic different outcomes',()=>{
 const {tactics:t}=fixture();t.untilAttack=1;t.resolve('🥛');assert.equal(t.health,t.maxHealth);assert.equal(t.shield,0);assert.equal(t.untilAttack,3);
 t.health-=3;t.resolve('🧈');assert.equal(t.health,t.maxHealth-1);
 t.cleared=3;t.newFight();const hp=t.enemy.health;t.resolve('🫘');assert.equal(t.enemy.health,hp-1);
 t.resolve('🍜');assert.equal(t.charge,2);const before=t.enemy.health;t.resolve('🫘');assert.equal(t.enemy.health,before-4);assert.equal(t.charge,0);
});
test('a killing pair wins before the enemy counterattack and cannot win twice',()=>{
 const {tactics:t}=fixture();t.health=1;t.enemy.health=2;t.untilAttack=1;
 const result=t.resolve('🫘');assert.equal(result.won,true);assert.equal(t.health,1);assert.equal(t.cleared,1);assert.equal(t.phase,'reward');
 assert.equal(t.resolve('🫘').ignored,true);assert.equal(t.cleared,1);
});
test('upgrades persist but cannot be stacked without limit, and temporary resources reset between fights',()=>{
 const {tactics:t}=fixture();t.cleared=1;t.phase='reward';t.shield=6;t.charge=4;
 assert.equal(t.takeReward('attack'),true);assert.equal(t.attackBonus,1);assert.equal(t.shield,0);assert.equal(t.charge,0);assert.equal(t.takeReward('attack'),false);
 t.cleared=2;t.phase='reward';t.takeReward('attack');t.cleared=3;t.phase='reward';assert.equal(t.takeReward('attack'),false);assert.equal(t.attackBonus,2);assert.equal(t.takeReward('guard'),true);
 t.health=1;t.cleared=4;t.phase='reward';const max=t.maxHealth;t.takeReward('heal');assert.equal(t.maxHealth,max+2);assert.equal(t.health,5);
});
test('both ages have bounded complete card sets and partial boards refill without resetting the enemy',()=>{
 for(const mode of ['adult','child']){
  const {tactics:t,owner,game}=fixture(mode);assert.equal(t.symbols.length,mode==='child'?5:6);assert.equal(new Set(t.symbols).size,t.symbols.length);
  t.resolve('🫘');const health=t.enemy.health,counter=t.untilAttack;let boards=0;owner.launchMemory=()=>boards++;
  t.boardComplete(game);assert.equal(boards,1);assert.equal(t.enemy.health,health);assert.equal(t.untilAttack,counter);assert.equal(owner.changingBoard,false);
  owner.active=false;t.boardComplete(game);assert.equal(boards,1);
 }
});
test('zero life ends the run after the revealed attack and final victory has a distinct ending',()=>{
 const a=fixture();a.tactics.health=1;a.tactics.untilAttack=1;a.tactics.memoryMiss();a.tactics.afterAttempt(a.game);assert.equal(a.tactics.phase,'lost');assert.equal(a.owner.ending,true);assert.equal(a.owner.finishes,undefined);a.flush();assert.equal(a.owner.finishes,1);
 const b=fixture();b.tactics.cleared=4;b.tactics.newFight();b.tactics.enemy.health=2;b.tactics.paired('🫘');b.tactics.afterAttempt(b.game);assert.equal(b.tactics.cleared,5);assert.equal(b.owner.finishes,undefined);b.flush();assert.equal(b.owner.finishes,1);assert.match(b.tactics.summary(),/守住老街/);
});

test('leaving during final impact feedback invalidates the queued result',()=>{
 const f=fixture();f.tactics.health=1;f.tactics.untilAttack=1;f.tactics.memoryMiss();f.tactics.afterAttempt(f.game);f.owner.active=false;f.owner.tactics=null;f.flush();assert.equal(f.owner.finishes,undefined);
});

test('memory aid reveals only personally flipped cards, never the opening preview, and can be disabled',()=>{
 const window={},document={createElement(){return{setAttribute(){},innerHTML:'',className:''};}};vm.runInNewContext(fs.readFileSync('js/core/MemoryTactics.js','utf8'),{window,document,Math});
 for(const assisted of [true,false]){
  const owner={mode:'adult',active:true,memoryAid:assisted},t=owner.tactics=new window.MemoryTactics(owner);t.game={isMemorizing:true};let hints=0;
  const back={querySelector(){return hints?{}:null;},appendChild(hint){hints++;assert.match(hint.innerHTML,/食物/);}},front={innerHTML:'<img alt="食物">'};
  const card={dataset:{symbol:'🫘'},querySelector(selector){return selector==='.memory-card-back'?back:front;}};
  t.noteSeen(card);assert.equal(hints,0);t.game.isMemorizing=false;t.noteSeen(card);t.noteSeen(card);assert.equal(hints,assisted?1:0);
  owner.active=false;t.noteSeen(card);assert.equal(hints,assisted?1:0);
 }
});
