const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(challenge=true){
 const frames=[],timers=[],created=[];let now=0;
 const element=()=>({style:{},parentNode:{},getBoundingClientRect:()=>({left:40,top:40,width:20,height:20}),remove(){this.parentNode=null;this.removed=true;}});
 const window={},context=vm.createContext({window,document:{createElement(){const e=element();created.push(e);return e;}},console:{log(){},warn(){},error(){}}});
 vm.runInContext(fs.readFileSync('js/minigames/DefenseLevels.js','utf8'),context);context.DefenseLevels=window.DefenseLevels;
 vm.runInContext(fs.readFileSync('js/minigames/DefenseGameV2.js','utf8'),context);
 const g=window.DefenseGameV2,enemy={dir:'up',element:element()};
 Object.assign(g,{challenge:challenge?{}:null,sessionId:1,gameActive:true,currentAttack:{finished:false},state:g.states.MULTI,levelConfig:{projectileImage:'water.png',projectileHitImage:'steam.png'},player:element(),stage:{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),appendChild(e){e.parentNode=this;}},enemies:[enemy],projectiles:[],multiProjectiles:[],scaledSizes:{projectile:10},scaledPositions:{up:{x:0,y:-40}},stopEnemyBounce(){},pauseClock:{now:()=>now,requestAnimationFrame(fn){frames.push(fn);},setTimeout(fn){timers.push(fn);}}});
 return {g,context,enemy,created,timers,frame(){now=400;frames.splice(0).forEach(fn=>fn(now));}};
}
test('direct challenge shots retain their fixed projectile and corresponding impact image when configuration is mutated',()=>{
 for(const image of ['water.png','soy-milk.png']){
  const f=fixture();f.g.levelConfig.projectileImage=image;f.g.levelConfig.projectileHitImage='paired-hit.png';f.g.launchProjectile('up');
  f.g.levelConfig.projectileImage='block.png';f.g.levelConfig.projectileHitImage='other-water.png';f.frame();
  assert.match(f.created[0].style.cssText,new RegExp(image.replace('.','\\.')));
  assert.equal(f.enemy.element.style.backgroundImage,"url('paired-hit.png')");
 }
});
test('delayed multi-shot keeps the assets captured at creation rather than reading a later configuration',()=>{
 const f=fixture();f.g.levelConfig.projectileImage='soy-milk.png';const p=f.g.createProjectileAtPlayer('up');
 assert.equal(Object.isFrozen(p.flightAssets),true);f.g.levelConfig={projectileImage:'water.png',projectileHitImage:'block.png'};
 f.g.launchProjectileFromPosition('up',p);f.frame();assert.equal(f.enemy.element.style.backgroundImage,"url('steam.png')");
});
test('a delayed or flying projectile from an expired wave cannot repaint or remove a new wave target',()=>{
 for(const when of ['before-launch','in-flight','after-impact']){
  const f=fixture(),p=f.g.createProjectileAtPlayer('up');let complete=0;
  if(when!=='before-launch')f.g.launchProjectileFromPosition('up',p,()=>complete++);
  if(when==='after-impact')f.frame();
  f.g.currentAttack={finished:false};
  if(when==='before-launch')f.g.launchProjectileFromPosition('up',p,()=>complete++);else f.frame();
  f.timers.forEach(fn=>fn());assert.equal(complete,0);assert.notEqual(f.enemy.element.removed,true);
  if(when!=='after-impact')assert.equal(f.enemy.element.style.backgroundImage,undefined);
 }
});
test('story shots keep their authored hit effect',()=>{
 const f=fixture(false);f.g.launchProjectile('up');f.frame();assert.equal(f.enemy.element.style.backgroundImage,"url('steam.png')");
});
test('heavy flight and its timeout cannot damage or finish a later wave',()=>{
 const f=fixture(),block=f.created[0]||{style:{backgroundImage:"url('water.png')"},getBoundingClientRect:()=>({left:0,top:0,width:10,height:10}),remove(){this.removed=true;}};
 let failures=0,finished=0;Object.assign(f.g,{heavySequence:[{element:block}],heavyProjectiles:[],stopAllHeavyBlocksBounce(){},heavyBlockFailed(){failures++;},finishAttack(){finished++;}});
 f.g.state=f.g.states.HEAVY_FLYING;f.g.launchHeavyProjectile('up');f.g.currentAttack={finished:false};f.g.levelConfig.projectileImage='block.png';
 f.frame();f.timers.forEach(fn=>fn());assert.equal(block.style.backgroundImage,"url('water.png')");assert.equal(failures,0);assert.equal(finished,0);assert.equal(block.removed,true);
});
test('repeated heavy blocks use the wave-specific original artwork and ignore a stale hide callback',()=>{
 const f=fixture(),shields=Object.fromEntries(['up','down','left','right'].map(dir=>[dir,{style:{backgroundImage:"url('shield.png')"}}]));
 f.context.document.getElementById=id=>shields[id.replace('shield-','')];
 f.g.currentAttack.materials=Object.freeze({shieldImage:'water-wave.png'});
 f.g.showShield('up');const stale=f.timers.at(-1);
 assert.equal(shields.up.style.backgroundImage,"url('water-wave.png')");
 f.g.currentAttack={finished:false,materials:Object.freeze({shieldImage:'soy-wave.png'})};
 f.g.showShield('down');stale();assert.equal(shields.down.style.opacity,'0.8');assert.equal(shields.up.style.opacity,'0');
 for(const dir of ['left','up','right']){f.g.showShield(dir);assert.equal(shields[dir].style.backgroundImage,"url('soy-wave.png')");assert.equal(shields[dir].style.opacity,'0.8');}
 f.g.hideShields();f.timers.forEach(fn=>fn());assert.ok(Object.values(shields).every(s=>s.style.opacity==='0'));
});
test('every target owns its original target/projectile/result pairing even if the current wave has different assets',()=>{
 for(const level of [1,2,3])for(const challenge of [true,false]){
  const f=fixture(challenge),source=f.context.window.DefenseLevels[level].adult;
  f.enemy.materials=f.g.captureMaterialSet(source);
  f.g.levelConfig={projectileImage:'unrelated-water.png',projectileHitImage:'unrelated-block.png'};
  f.g.launchProjectile('up');assert.ok(f.created[0].style.cssText.includes(source.projectileImage));f.frame();
  assert.equal(f.enemy.element.style.backgroundImage,`url('${source.projectileHitImage}')`);
 }
});
