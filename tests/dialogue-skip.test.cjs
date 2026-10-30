const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(storage = new Map(), blocked = false) {
    const nodes=new Map(), events={}, timers=new Map();let timer=0;
    const element=()=>({style:{},handlers:{},classList:{add(){},remove(){},contains(){return false;}},
        value:'',open:false,hidden:true,addEventListener(k,fn){this.handlers[k]=fn;},removeEventListener(){},
        setAttribute(k,v){this[k]=v;},focus(){},select(){},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();},
        appendChild(){},remove(){}});
    for(const [,id] of fs.readFileSync('index.html','utf8').matchAll(/id="([^"]+)"/g))nodes.set(id,element());
    const document={getElementById:id=>nodes.get(id)||null,addEventListener(k,fn){events[k]=fn;},removeEventListener(){},createElement:element,head:element(),body:element()};
    const writer={showDialogue:()=>new Promise(()=>{}),showOptions:()=>new Promise(()=>{}),clear(){this.clears=(this.clears||0)+1;}};
    const games=[],window={Typewriter:writer,gameMode:'adult',dispatchEvent(){}};
    const context=vm.createContext({window,document,Typewriter:writer,console:{log(){},warn(){},error(){}},
        localStorage:{getItem(k){if(blocked)throw Error();return storage.get(k);},setItem(k,v){if(blocked)throw Error();storage.set(k,v);}},
        setTimeout(fn){timers.set(++timer,fn);return timer;},clearTimeout(id){timers.delete(id);},setInterval(fn){timers.set(++timer,fn);return timer;},clearInterval(id){timers.delete(id);},
        Image:class{set src(v){this.onload?.();}},CustomEvent:class{},GameEngine:{startMinigame(name,options){games.push({name,options});}}});
    for(const file of ['js/core/DialogueSystem.js','js/core/DialogueSkip.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
    window.DialogueSystem.init();window.DialogueSystem.preloadDialogueBackgrounds=()=>{};window.DialogueSkip.init();
    return {window,document,nodes,writer,games,context,timers,storage,skip:window.DialogueSkip,system:window.DialogueSystem};
}
const click=(nodes,id)=>nodes.get(id).handlers.click({stopPropagation(){}});
function chapter(f,number,mode) {
    f.window.gameMode=mode==='child'?'child':'adult';
    vm.runInContext(fs.readFileSync(`js/data/chapter${number}_${mode}.js`,'utf8'),f.context);
    const c=f.window[`Chapter${number}_${mode==='child'?'Child':'Teen'}`];
    f.system.currentChapter=c;f.system.currentDialogue=c.dialogue;f.system.currentIndex=0;
    return c;
}
function skipNow(f) { f.skip.bindStory(f.system);click(f.nodes,'dialogue-skip');click(f.nodes,'skip-confirm-play'); }
test('skip stays locked by default, wrong password fails, and exact password enables only this visit',()=>{
    const f=fixture();f.skip.bind(()=>{});assert.equal(f.nodes.get('dialogue-skip').hidden,true);
    click(f.nodes,'skip-setting-toggle');assert.equal(f.nodes.get('skip-unlock').open,true);
    const submit=()=>f.nodes.get('skip-unlock-form').handlers.submit({preventDefault(){}});
    f.nodes.get('skip-password').value='wrong';submit();assert.equal(f.skip.enabled,false);assert.ok(f.nodes.get('skip-password-error').textContent);
    f.nodes.get('skip-password').value='skip_dial';submit();assert.equal(f.skip.enabled,true);assert.equal(f.nodes.get('dialogue-skip').hidden,false);
    click(f.nodes,'skip-setting-toggle');assert.equal(f.skip.enabled,false);assert.equal(f.nodes.get('dialogue-skip').hidden,true);
    assert.equal(fixture().skip.enabled,false);
});
test('confirmation supports cancel, ignores stale targets and repeated confirmation starts once',()=>{
    const f=fixture();f.skip.enabled=true;let calls=0;f.skip.bind(()=>calls++);
    click(f.nodes,'dialogue-skip');click(f.nodes,'skip-confirm-later');assert.equal(calls,0);
    click(f.nodes,'dialogue-skip');f.skip.clear();click(f.nodes,'skip-confirm-play');assert.equal(calls,0);
    f.skip.bind(()=>calls++);click(f.nodes,'dialogue-skip');click(f.nodes,'skip-confirm-play');click(f.nodes,'skip-confirm-play');assert.equal(calls,1);
});
test('godmode password persists across reload until manually disabled, without storing the password',()=>{
    const f=fixture();click(f.nodes,'skip-setting-toggle');f.nodes.get('skip-password').value='skip_godmode';
    f.nodes.get('skip-unlock-form').handlers.submit({preventDefault(){}});
    assert.equal(f.skip.enabled,true);assert.equal(f.skip.persistent,true);
    assert.equal(f.storage.get(f.skip.persistKey),'true');assert.equal(f.nodes.get('skip-password').value,'');
    const again=fixture(f.storage);assert.equal(again.skip.enabled,true);assert.equal(again.skip.unlocked,true);
    click(again.nodes,'skip-setting-toggle');assert.equal(again.skip.enabled,false);
    assert.equal(fixture(f.storage).skip.enabled,false);
    click(again.nodes,'skip-setting-toggle');assert.equal(again.skip.enabled,true);
    assert.equal(fixture(f.storage).skip.enabled,false);
});
test('normal password remains temporary and storage failures do not prevent either password from working',()=>{
    for(const password of ['skip_dial','skip_godmode']){
        const f=fixture(new Map(),true);click(f.nodes,'skip-setting-toggle');f.nodes.get('skip-password').value=password;
        assert.doesNotThrow(()=>f.nodes.get('skip-unlock-form').handlers.submit({preventDefault(){}}));assert.equal(f.skip.enabled,true);
    }
    const f=fixture();click(f.nodes,'skip-setting-toggle');f.nodes.get('skip-password').value='skip_dial';
    f.nodes.get('skip-unlock-form').handlers.submit({preventDefault(){}});assert.equal(fixture(f.storage).skip.enabled,false);
});
test('intro skip requires enabled mode, confirms chapter selection and never grants chapter completion',()=>{
    const f=fixture();vm.runInContext(fs.readFileSync('js/data/intro.js','utf8'),f.context);
    const scenes=[];f.context.showScene=id=>scenes.push(id);
    f.system.currentChapter=f.window.IntroChapter;f.system.currentDialogue=f.window.IntroChapter.dialogue;
    let completed=0;f.system.onChapterComplete=()=>completed++;
    f.skip.bindStory(f.system);assert.equal(f.nodes.get('dialogue-skip').hidden,true);
    f.skip.enabled=true;f.skip.render();click(f.nodes,'dialogue-skip');
    assert.equal(f.nodes.get('skip-confirm-play').textContent,'前往選章');
    assert.equal(f.nodes.get('skip-confirm-text').textContent,'要跳過介紹，直接前往章節選擇嗎？');
    click(f.nodes,'skip-confirm-later');assert.equal(scenes.length,0);assert.equal(f.system.currentIndex,0);
    click(f.nodes,'dialogue-skip');click(f.nodes,'skip-confirm-play');
    assert.deepEqual(scenes,['level-select']);assert.equal(completed,0);assert.equal(f.games.length,0);assert.equal(f.skip.context,null);
});
test('all six chapter scripts have valid skip targets including chapter 3 default-name entry; malformed loops stop',()=>{
    for(const mode of ['child','teen'])for(const number of [1,2,3]){
        const f=fixture(),c=chapter(f,number,mode);
        const p=f.skip.plan(f.system);assert.ok(p,`${c.id} target`);
        assert.equal(p.option.action,number===1?'minigame':number===2?'quiz':'collection');
    }
    const f=fixture();f.system.currentDialogue=[{id:'loop',next:'loop'}];assert.equal(f.skip.plan(f.system),null);
});
test('chapter 3 sequential skips play every real shop, charge once and bypass all collection animations in both modes',()=>{
    for(const mode of ['child','teen']){
        const f=fixture(),data=chapter(f,3,mode);f.skip.enabled=true;
        vm.runInContext(fs.readFileSync('js/core/CollectionSystem.js','utf8'),f.context);
        const c=f.window.CollectionSystem,config=data.dialogue.find(line=>line.id==='collection_intro').options[0].collectionConfig;
        c.mapContainer={style:{}};c.overlay={style:{}};
        for(const method of ['updateMoneyDisplay','buildItemsDisplay','buildHotspots','hideShopLoading','hideSimpleLoading','enableClicksAfterLoading'])c[method]=()=>{};
        c.collectImagesToPreload=()=>[];
        let animation=0,ended=0,returned=0;
        c.playCollectionAnimationKeepDialogue=()=>animation++;
        f.system.onChapterComplete=()=>ended++;
        c.open({...config,skipToFirstShop:true},()=>returned++);
        assert.equal(f.games.length,1);assert.equal(c.hotspots[c.currentCollectingIndex].shopId,'herbal');
        for(const [position,id,money] of [[0,'herbal',15],[1,'knife',10],[2,'grocery',6]]){
            assert.equal(c.hotspots[c.currentCollectingIndex].shopId,id);
            assert.equal(f.games[position].name,'interact');assert.equal(ended,0);
            f.games[position].options.onComplete(true);
            assert.equal(data.money,money);assert.equal(data.shopStatus[id],true);
            click(f.nodes,'dialogue-skip');click(f.nodes,'skip-confirm-later');
            assert.equal(f.games.length,position+1);assert.equal(ended,0);
            click(f.nodes,'dialogue-skip');click(f.nodes,'skip-confirm-play');
            assert.equal(c.collectedItems[position],true);
        }
        assert.equal(f.games.length,3);assert.equal(ended,1);assert.equal(returned,1);assert.equal(animation,0);assert.equal(c.isActive,false);
        // 已結束遊戲的舊回呼不會重複扣錢、開啟店家或觸發結尾。
        f.games[2].options.onComplete(true);assert.equal(data.money,6);assert.equal(ended,1);
    }
});
test('chapter 3 skip resumes the next unfinished shop and map returns do not mark an item complete',()=>{
    const f=fixture(),data=chapter(f,3,'child');f.skip.enabled=true;
    vm.runInContext(fs.readFileSync('js/core/CollectionSystem.js','utf8'),f.context);
    const c=f.window.CollectionSystem,config=data.dialogue.find(line=>line.id==='collection_intro').options[0].collectionConfig;
    c.mapContainer={style:{}};c.overlay={style:{}};
    for(const method of ['updateMoneyDisplay','buildItemsDisplay','buildHotspots','hideShopLoading','hideSimpleLoading','enableClicksAfterLoading','showMessage'])c[method]=()=>{};
    c.collectImagesToPreload=()=>[];
    data.markShopComplete('knife');
    c.open({...config,skipToFirstShop:true},()=>{});
    assert.equal(c.hotspots[c.currentCollectingIndex].shopId,'herbal');
    f.games[0].options.onComplete(false);
    assert.equal(data.money,15);assert.equal(data.shopStatus.herbal,false);assert.equal(c.collectedItems[0],false);
    assert.ok(f.skip.context);click(f.nodes,'dialogue-skip');click(f.nodes,'skip-confirm-play');
    assert.equal(c.hotspots[c.currentCollectingIndex].shopId,'herbal');
    f.games[1].options.onComplete(true);click(f.nodes,'dialogue-skip');click(f.nodes,'skip-confirm-play');
    assert.equal(c.hotspots[c.currentCollectingIndex].shopId,'grocery');assert.equal(data.money,10);
});
test('chapter 1 skips story between all three real games and completes only after the ending confirmation',()=>{
    for(const mode of ['child','teen']){
        const f=fixture();chapter(f,1,mode);f.skip.enabled=true;let ended=0;
        f.system.onChapterComplete=()=>ended++;
        for(const level of [1,2,3]){
            skipNow(f);assert.equal(f.games.length,level);assert.equal(f.games.at(-1).name,'defense');assert.equal(f.games.at(-1).options.level,level);
            assert.equal(f.skip.context,null);assert.equal(ended,0);
            f.games.at(-1).options.onComplete(true);
        }
        assert.equal(f.skip.context.ending,true);skipNow(f);assert.equal(ended,1);assert.equal(f.games.length,3);
    }
});
test('chapter 1 failure skip follows continue-story rather than repeatedly retrying the same game',()=>{
    const f=fixture();chapter(f,1,'child');f.skip.enabled=true;
    skipNow(f);f.games[0].options.onComplete(false);skipNow(f);
    assert.equal(f.games.length,2);assert.equal(f.games[1].options.level,2);
});
test('chapter 2 preserves quiz and earned rewards, then enters memory without looping back to quiz',()=>{
    for(const mode of ['child','teen']){
        const f=fixture(),c=chapter(f,2,mode);f.skip.enabled=true;let quiz=0,completedQuiz;
        f.system.startQuiz=(_range,_count,done)=>{quiz++;completedQuiz=done;};
        skipNow(f);assert.equal(quiz,1);assert.equal(f.games.length,0);assert.equal(f.skip.context,null);
        completedQuiz(2);assert.equal(c.quizScore,2);skipNow(f);
        assert.equal(quiz,1);assert.equal(f.games[0].name,'memory');assert.equal(f.games[0].options.penaltyRedemption,2);
        f.games[0].options.onComplete(true);assert.equal(f.skip.plan(f.system).ending,true);
    }
});
test('pending old dialogue completion cannot add story choices after a skip started a game',async()=>{
    const f=fixture();chapter(f,1,'teen');f.skip.enabled=true;
    f.system.currentIndex=f.system.findDialogueIndex('level1_story2');let resolve,choices=0;
    f.writer.showDialogue=()=>new Promise(r=>resolve=r);f.writer.showOptions=()=>{choices++;return new Promise(()=>{});};
    const pending=f.system.showDialogue();skipNow(f);resolve();await pending;
    assert.equal(f.games.length,1);assert.equal(choices,0);
});
test('third chapter shop dialogue skip starts the real drag game once and late text cannot reopen choices',async()=>{
    const f=fixture();chapter(f,3,'teen');f.skip.enabled=true;
    vm.runInContext(fs.readFileSync('js/core/CollectionSystem.js','utf8'),f.context);
    const collection=f.window.CollectionSystem;collection.isActive=true;collection.showDialogueMode=()=>{};collection.hideShopLoading=()=>{};
    let resolve,started=0;f.writer.showDialogue=()=>new Promise(r=>resolve=r);
    const pending=collection.showDialogueWithOptions({name:'店家',text:'介紹',options:[{text:'開始'}]},()=>started++);
    click(f.nodes,'dialogue-skip');click(f.nodes,'skip-confirm-play');resolve();await pending;
    assert.equal(started,1);assert.equal(f.skip.context,null);assert.notEqual(f.nodes.get('options-container').style.display,'flex');
});
test('third chapter result-dialogue skip continues item collection, while map/game/close remove the skip control',async()=>{
    const f=fixture();chapter(f,3,'child');f.skip.enabled=true;
    vm.runInContext(fs.readFileSync('js/core/CollectionSystem.js','utf8'),f.context);
    const c=f.window.CollectionSystem;c.isActive=true;let finish=0,resolve;
    f.writer.showDialogue=()=>new Promise(r=>resolve=r);
    const pending=c.showDialogueSequence([{text:'完成'},{text:'還有一句'}],()=>finish++);
    click(f.nodes,'dialogue-skip');click(f.nodes,'skip-confirm-play');resolve();await pending;
    assert.equal(finish,1);assert.equal(f.skip.context,null);
    f.skip.bind(()=>{});c.showMapMode();assert.equal(f.skip.context,null);
    f.skip.bind(()=>{});c.showGameMode();assert.equal(f.skip.context,null);
    c.hideSimpleLoading=c.hideShopLoading=c.enableClicksAfterLoading=()=>{};
    f.skip.bind(()=>{});c.close();assert.equal(f.skip.context,null);
});
