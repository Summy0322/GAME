const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(saved=null,blocked=false){
    const nodes=new Map(),storage=new Map([['redbrick.play.v1',saved]]);
    const get=id=>{if(!nodes.has(id))nodes.set(id,{id,style:{setProperty(k,v){this[k]=v;}},handlers:{},innerHTML:'章節',addEventListener(k,fn){this.handlers[k]=fn;},setAttribute(k,v){this[k]=v;},focus(){this.focused=true;},getBoundingClientRect(){return this.rect;}});return nodes.get(id);};
    const document={getElementById:get,addEventListener(){}};
    const window={addEventListener(){}};
    const ctx=vm.createContext({window,document,localStorage:{getItem(k){if(blocked)throw Error();return storage.get(k);},setItem(k,v){if(blocked)throw Error();storage.set(k,v);}},console:{log(){},warn(){}}});
    for(const file of ['js/core/GameSettings.js','js/main.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
    window.GameSettings.init();vm.runInContext('loadChapterStatus()',ctx);
    return {ctx,window,get,storage,status:()=>JSON.parse(vm.runInContext('JSON.stringify(chapterStatus)',ctx))};
}
test('ordered play defaults to yes and completing each chapter unlocks exactly the next chapter',()=>{
    const f=fixture();assert.equal(f.window.GameSettings.sequential,true);
    assert.deepEqual(f.status(),{chapter1:'open',chapter2:'locked',chapter3:'locked'});
    assert.equal(f.get('chapter2-btn').disabled,true);
    vm.runInContext("completeChapter('chapter1')",f.ctx);
    assert.deepEqual(f.status(),{chapter1:'completed',chapter2:'open',chapter3:'locked'});
    vm.runInContext("completeChapter('chapter2')",f.ctx);assert.equal(f.status().chapter3,'open');
});
test('free-play toggle persists, preserves completion, relocks only unmet chapters and reset obeys current setting',()=>{
    const f=fixture();f.window.GameSettings.setSequential(false);
    assert.deepEqual(f.status(),{chapter1:'open',chapter2:'open',chapter3:'open'});
    vm.runInContext("completeChapter('chapter3')",f.ctx);
    f.window.GameSettings.setSequential(true);
    assert.deepEqual(f.status(),{chapter1:'open',chapter2:'locked',chapter3:'completed'});
    f.window.GameSettings.setSequential(false);vm.runInContext('resetAllChapters()',f.ctx);
    assert.deepEqual(f.status(),{chapter1:'open',chapter2:'open',chapter3:'open'});
    const again=fixture(f.storage.get('redbrick.play.v1'));assert.equal(again.window.GameSettings.sequential,false);assert.equal(again.status().chapter2,'open');
});
test('invalid or unavailable setting storage falls back to ordered play without breaking controls',()=>{
    for(const raw of ['broken','null','{"sequential":"no"}'])assert.equal(fixture(raw).window.GameSettings.sequential,true);
    const f=fixture(null,true);assert.doesNotThrow(()=>f.window.GameSettings.setSequential(false));assert.equal(f.status().chapter3,'open');
});
test('settings tabs support mouse and keyboard and expose only the selected panel',()=>{
    const f=fixture();assert.equal(f.get('settings-panel-play').hidden,true);
    f.get('settings-tab-play').handlers.click();assert.equal(f.get('settings-panel-sound').hidden,true);assert.equal(f.get('settings-panel-play').hidden,false);
    f.get('settings-tab-play').handlers.keydown({key:'ArrowLeft',preventDefault(){}});
    assert.equal(f.get('settings-tab-sound')['aria-selected'],'true');assert.equal(f.get('settings-tab-sound').focused,true);
});
test('separate yes/no radio controls select explicit values and reflect restored state',()=>{
    const f=fixture();assert.equal(f.get('chapter-order-yes').checked,true);assert.equal(f.get('chapter-order-no').checked,false);
    f.get('chapter-order-no').handlers.change({target:{checked:true}});
    assert.equal(f.window.GameSettings.sequential,false);assert.equal(f.get('chapter-order-no').checked,true);assert.equal(f.get('chapter-order-yes').checked,false);assert.equal(f.status().chapter2,'open');
    f.get('chapter-order-no').handlers.change({target:{checked:true}});assert.equal(f.window.GameSettings.sequential,false);
    f.get('chapter-order-yes').handlers.change({target:{checked:true}});assert.equal(f.get('chapter-order-yes').checked,true);assert.equal(f.status().chapter2,'locked');
    assert.equal(fixture('{"sequential":false}').get('chapter-order-no').checked,true);
});
test('all setting dialogs scale inside the actual 16:9 stage across screen sizes and safe margins',()=>{
    const f=fixture();
    for(const rect of [{left:0,top:0,width:1280,height:720},{left:75,top:0,width:694,height:390},{left:100,top:30,width:568,height:319.5},{left:0,top:330,width:390,height:219.375}]){
        f.get('game-wrapper').rect=rect;
        for(const [id,width,height] of [['audio-settings',660,340],['skip-unlock',460,380],['skip-confirm',460,200]]){
            const dialog=f.get(id);f.window.GameSettings.fit(dialog);const s=Number(dialog.style['--settings-scale']);
            assert.ok(width*s<=rect.width-24+.001);assert.ok(height*s<=rect.height-24+.001);
            assert.equal(parseFloat(dialog.style.left),rect.left+rect.width/2);assert.equal(parseFloat(dialog.style.top),rect.top+rect.height/2);
        }
    }
});
test('both gallery versions contain complete rice-cake descriptions without placeholder dots',()=>{
    const f=fixture();
    for(const mode of ['child','teen']){
        vm.runInContext(fs.readFileSync(`js/data/chapter2_${mode}.js`,'utf8'),f.ctx);
        const card=f.window[`Chapter2_${mode==='child'?'Child':'Teen'}`].cardGallery.find(c=>c.title==='碗粿');
        assert.ok(card.summary.length>10);assert.ok(card.story.length>30);assert.equal(card.story.includes('...'),false);
    }
});
