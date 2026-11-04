const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
    const nodes=new Map(),images=[];let timer=0;const timers=new Map();
    const node=()=>({style:{},setAttribute(k,v){this[k]=v;}});
    for(const id of ['challenge-scene','challenge-reroll','challenge-night-background','challenge-scene-status'])nodes.set(id,node());
    const window={},context=vm.createContext({window,document:{addEventListener(){},getElementById:id=>nodes.get(id)},showScene(){},
        Image:class{constructor(){images.push(this);}},setTimeout(fn){timers.set(++timer,fn);return timer;},clearTimeout(id){timers.delete(id);}});
    vm.runInContext(fs.readFileSync('js/core/ChallengeScenes.js','utf8'),context);
    return {c:window.ChallengeScenes,nodes,images,timers};
}
test('defense backgrounds include all three stages and never repeat consecutively',()=>{
    const {c}=fixture();let last;const seen=new Set();
    for(let i=0;i<60;i++){const next=c.pickBackground(()=>(i%3)/3);assert.notEqual(next,last);seen.add(next);last=next;}
    assert.equal(seen.size,3);
});
test('late background completion cannot repaint a closed or newer scene; failed loading releases controls',async()=>{
    const {c,nodes,images}=fixture();c.kind='defense';
    const first=c.loadBackground();c.close();images[0].onload();await first;
    assert.equal(nodes.get('challenge-night-background').style.backgroundImage,undefined);
    const second=c.loadBackground(),third=c.loadBackground();images[2].onload();await third;
    const current=nodes.get('challenge-night-background').style.backgroundImage;
    images[1].onload();await second;assert.equal(nodes.get('challenge-night-background').style.backgroundImage,current);
    c.kind='memory';const failed=c.loadBackground();assert.equal(images[3].src,'assets/images/minigames/memory/background.png');images[3].onerror();await failed;
    assert.equal(nodes.get('challenge-reroll').disabled,false);assert.match(nodes.get('challenge-scene-status').textContent,/失敗/);
});
