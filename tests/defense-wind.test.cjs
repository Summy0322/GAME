const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({wave=41,type='MULTI',variant='endless',reduced=false}={}){
    let now=10000,id=0;const jobs=new Map(),nodes=[];
    const window={GamePause:{paused:false},matchMedia:()=>({matches:reduced})};
    const document={hidden:false,addEventListener(){},getElementById(){return null;},createElement(){const n={attributes:{},setAttribute(k,v){this.attributes[k]=v;},remove(){this.removed=true;}};nodes.push(n);return n;}};
    const context=vm.createContext({window,document,console:{log(){}},performance:{now:()=>now},setTimeout(fn,ms=0){jobs.set(++id,{fn,at:now+ms});return id;},clearTimeout(n){jobs.delete(n);}});
    for(const file of ['js/core/GameClock.js','js/core/TimedChallenge.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
    const c=window.TimedChallenge,clock=new window.GameClock();
    const attack={type,wait:1370,resolved:false,correctDirs:['up','left'],wrongDirs:['right']};
    const game={clock,waveNumber:wave,currentAttack:attack,challenge:c,container:{appendChild(){}},score:500};
    Object.assign(c,{active:true,kind:'defense',variant,game,lives:3,nextWindWave:41});
    const tick=ms=>{const end=now+ms;while(true){const n=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!n)break;now=n[1].at;jobs.delete(n[0]);n[1].fn();}now=end;};
    return {c,game,clock,attack,tick,nodes,window,document,start(){c.onDefenseWaveStarted(game,game.currentAttack);}};
}
test('night leaves are restricted to later endless defense ordinary waves and respect reduced motion',()=>{
    for(const options of [{wave:40},{variant:'timed'},{reduced:true},{type:'HEAVY'},{type:'AOE'}]){const f=fixture(options);f.start();assert.equal(f.nodes.length,0);}
    const f=fixture();f.c.kind='memory';f.start();assert.equal(f.nodes.length,0);
});
test('two non-interactive corner leaves appear at most once per twenty waves, without changing game data',()=>{
    const f=fixture(),before=JSON.stringify(f.attack);f.start();
    assert.equal(f.nodes.length,1);assert.equal(f.nodes[0].attributes['aria-hidden'],'true');assert.equal((f.nodes[0].innerHTML.match(/class="defense-wind-leaf"/g)||[]).length,2);
    assert.equal(f.c.nextWindWave,61);f.start();assert.equal(f.nodes.length,1);
    assert.equal(JSON.stringify(f.attack),before);assert.equal(f.game.score,500);assert.equal(f.c.lives,3);
    f.tick(2200);assert.equal(f.nodes[0].removed,true);assert.equal(f.c.defenseWind,null);
    f.game.waveNumber=60;f.start();assert.equal(f.nodes.length,1);f.game.waveNumber=61;f.start();assert.equal(f.nodes.length,2);
});
test('critical waves immediately clear existing leaves, and a deferred wind can start on the next ordinary wave',()=>{
    const f=fixture({type:'HEAVY'});f.start();assert.equal(f.c.nextWindWave,41);
    f.game.waveNumber=42;f.game.currentAttack={type:'NORMAL'};f.start();assert.equal(f.nodes.length,1);assert.equal(f.c.nextWindWave,62);
    f.game.currentAttack={type:'AOE'};f.start();assert.equal(f.c.defenseWind,null);assert.equal(f.nodes[0].removed,true);
});
test('wind duration follows the game clock through pause, and cleanup invalidates stale callbacks',()=>{
    const f=fixture();f.start();const old=f.c.defenseWind;
    f.tick(500);f.clock.pause();f.tick(10000);assert.notEqual(f.nodes[0].removed,true);
    f.clock.resume();f.tick(1699);assert.notEqual(f.nodes[0].removed,true);f.tick(1);assert.equal(f.nodes[0].removed,true);
    f.game.waveNumber=61;f.start();const current=f.c.defenseWind;old.timer.callback();assert.equal(f.c.defenseWind,current);
    f.c.clearDefenseWind({});assert.equal(f.c.defenseWind,current);
    f.c.stop();assert.equal(f.nodes[1].removed,true);assert.equal(f.c.defenseWind,null);assert.equal(f.clock.jobs.has(current.timer),false);
});
test('hidden, paused, ended or stale waves cannot create a late effect',()=>{
    for(const mutate of [f=>f.document.hidden=true,f=>f.window.GamePause.paused=true,f=>f.c.ending=true,f=>f.attack.finished=true,f=>f.c.active=false]){
        const f=fixture();mutate(f);f.start();assert.equal(f.nodes.length,0);
    }
    const f=fixture();f.c.onDefenseWaveStarted(f.game,{type:'NORMAL'});assert.equal(f.nodes.length,0);
});
