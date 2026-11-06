const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(level=1,mode='adult',blocked=false){
 let now=0,id=0;const jobs=new Map(),saved=new Map();class Node extends EventTarget{constructor(){super();this.style={};this.dataset={};this.hidden=false;this.children=[];this.classList={add(){}};}setAttribute(){}appendChild(n){this.children.push(n);}remove(){this.removed=true;}focus(){}setPointerCapture(){}getBoundingClientRect(){return{left:0,top:0,width:400,height:200};}set innerHTML(s){this.html=s;this.nodes=new Map();for(const key of ['.tutorial-arena','.tutorial-banner','.tutorial-hint','.tutorial-target','.tutorial-start','.tutorial-skip','.tutorial-player','.tutorial-shield','.tutorial-stone-fill'])this.nodes.set(key,new Node());this.waves=Array.from({length:4},()=>new Node());this.lights=Array.from({length:5},()=>new Node());}querySelector(k){return this.nodes.get(k);}querySelectorAll(key){return key==='.tutorial-wave'?this.waves:this.lights;}}
 const document={createElement:()=>new Node()},window={GamePause:{paused:false}},localStorage={getItem:k=>{if(blocked)throw Error();return saved.get(k);},setItem:(k,v)=>{if(blocked)throw Error();saved.set(k,v);}};
 vm.runInNewContext(fs.readFileSync('js/minigames/defense/DefenseTutorial.js','utf8'),{window,document,localStorage,AbortController,Math});
 const clock={now:()=>now,setTimeout(fn,ms){jobs.set(++id,{fn,at:now+ms});return id;},clearTimeout:id=>jobs.delete(id)},game={gameActive:true,sessionId:1,currentLevel:level,getGameMode:()=>mode,clock,container:new Node(),levelConfig:{playerImage:'player.png',enemyImage:'enemy.png',decoyImage:'stone.png'}};
 let starts=0;const tutorial=window.DefenseTutorial;const begin=(force=false)=>tutorial.begin(game,()=>starts++,force);
 const tick=ms=>{const end=now+ms;for(;;){const j=[...jobs].find(([,j])=>j.at<=end);if(!j)break;now=j[1].at;jobs.delete(j[0]);j[1].fn();}now=end;};
 const event=(type,x=100,y=100)=>{const e=new Event(type);Object.assign(e,{pointerId:1,isPrimary:true,clientX:x,clientY:y});tutorial.run.node.querySelector('.tutorial-arena').dispatchEvent(e);};
 return{tutorial,game,begin,tick,event,saved,window,get starts(){return starts;}};
}
test('story tutorials are per-level/age, skip remembers, challenge is excluded, force replays',()=>{
 const f=fixture();assert.equal(f.begin(),true);f.tutorial.run.node.querySelector('.tutorial-skip').dispatchEvent(new Event('click'));assert.equal(f.starts,1);assert.equal(f.begin(),false);assert.equal(f.tutorial.seen(1,'child'),false);assert.equal(f.tutorial.seen(2,'adult'),false);assert.equal(f.begin(true),true);f.tutorial.cancel();f.game.challenge={};assert.equal(f.begin(true),false);
});
test('first lesson needs a correct swipe then hands off stone; touching the stone restarts the wait',()=>{
 const f=fixture();f.begin();f.event('pointerdown');f.event('pointerup',40);assert.equal(f.tutorial.run.step,'swipe');f.event('pointerdown');f.event('pointerup',170);assert.equal(f.tutorial.run.step,'stone');f.tick(2100);assert.equal(f.starts,0);f.event('pointerdown');f.tick(5000);assert.equal(f.tutorial.run.step,'stone');f.event('pointerup');f.tick(2200);assert.equal(f.tutorial.run.step,'complete');assert.equal(f.starts,0);f.tutorial.run.node.querySelector('.tutorial-start').dispatchEvent(new Event('click'));assert.equal(f.starts,1);
});
test('heavy lesson waits for all lights, permits retry without penalties and only starts after confirmation',()=>{
 const f=fixture(2);f.begin();f.event('pointerdown');f.event('pointerup',170);assert.equal(f.tutorial.run.step,'heavy');f.tick(2000);assert.equal(f.tutorial.run.ready,true);f.event('pointerdown');f.event('pointerup',170);assert.equal(f.tutorial.run.step,'complete');assert.equal(f.starts,0);
});
test('circle lesson requires a circle, handles wraparound, and cancellation invalidates pending work',()=>{
 const f=fixture(3);f.begin();f.event('pointerdown',260,100);for(let deg=20;deg<=300;deg+=20)f.event('pointermove',200+60*Math.cos(deg*Math.PI/180),100+60*Math.sin(deg*Math.PI/180));assert.equal(f.tutorial.run.step,'complete');assert.equal(f.tutorial.angleDelta(179,-179),2);
 const stale=fixture(2);stale.begin();const node=stale.tutorial.run.node;stale.tutorial.cancel(stale.game);stale.tick(10000);assert.equal(stale.starts,0);assert.equal(stale.saved.size,0);assert.equal(node.removed,true);
});
test('blocked storage remains playable and paused pointer input never advances a lesson',()=>{
 const f=fixture(1,'adult',true);f.begin();f.window.GamePause.paused=true;f.event('pointerdown');f.event('pointerup',170);assert.equal(f.tutorial.run.step,'swipe');f.window.GamePause.paused=false;f.tutorial.run.node.querySelector('.tutorial-skip').dispatchEvent(new Event('click'));assert.equal(f.starts,1);
});

test('tutorial visuals use actual heavy/wave assets and stone countdown restarts on interaction',()=>{
 const f=fixture();Object.assign(f.game.levelConfig,{heavyEnemyImage:'heavy.png',aoeLineImage:'wave.png',shieldImage:'shield.png'});f.begin();assert.ok(f.tutorial.run.node.querySelectorAll('.tutorial-lights i').every(n=>n.style.backgroundImage==="url('heavy.png')"));assert.ok(f.tutorial.run.node.querySelectorAll('.tutorial-wave').every(n=>n.style.backgroundImage==="url('wave.png')"));f.event('pointerdown');f.event('pointerup',170);const fill=f.tutorial.run.node.querySelector('.tutorial-stone-fill');assert.match(fill.style.animation,/2200ms/);f.event('pointerdown');assert.equal(fill.style.animation,'none');f.event('pointerup');assert.match(fill.style.animation,/2200ms/);
});
