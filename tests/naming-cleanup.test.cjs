const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(mode){
    const nodes=new Map();
    const element=()=>({style:{},classList:{add(){},remove(){}},value:'',appendChild(node){nodes.set(node.id,node)},remove(){nodes.delete(this.id);nodes.delete('player-name-input');nodes.delete('naming-confirm-btn')},
        set innerHTML(value){this.html=value;if(value.includes('player-name-input')){nodes.set('player-name-input',element());nodes.set('naming-confirm-btn',element())}}});
    for(const id of ['game-container','dialog-box','dialogue-text','npc-name','options-container','character-image'])nodes.set(id,element());
    const writer={showDialogue:()=>new Promise(()=>{}),clear(){}};
    const window={gameMode:mode},document={getElementById:id=>nodes.get(id)||null,createElement:element};
    vm.runInNewContext(fs.readFileSync('js/core/DialogueSystem.js','utf8'),{window,document,Typewriter:writer,console:{log(){},warn(){}}});
    const game=window.DialogueSystem;game.init();game.preloadDialogueBackgrounds=()=>{};
    const names=[],chapter={id:'chapter3_'+mode,setPlayerName:name=>names.push(name),dialogue:[{id:'name',type:'naming',title:'你的名字',next:'after'},{id:'after',name:'媽媽',text:'你好'}]};
    return {game,nodes,chapter,names};
}
test('leaving chapter 3 before confirming removes the dialog and disables stale controls in both modes',()=>{
    for(const mode of ['child','adult']){
        const {game,nodes,chapter,names}=fixture(mode);game.loadChapter(chapter);
        assert.ok(nodes.has('naming-container'));
        const button=nodes.get('naming-confirm-btn'),input=nodes.get('player-name-input'),stale=button.onclick;
        input.value='舊姓名';game.endDialogue(true);
        assert.equal(nodes.has('naming-container'),false);assert.equal(button.onclick,null);assert.equal(input.onkeypress,null);
        game.loadChapter({id:'chapter1_'+mode,dialogue:[{id:'first',name:'阿斗仔',text:'第一章'}]});
        stale();assert.equal(nodes.has('naming-container'),false);assert.equal(names.length,0);assert.equal(game.currentIndex,0);
    }
});
test('direct chapter replacement also cleans an unconfirmed naming dialog',()=>{
    const {game,nodes,chapter}=fixture('child');game.loadChapter(chapter);
    game.loadChapter({id:'chapter2_child',dialogue:[{id:'start',name:'阿斗仔',text:'第二章'}]});
    assert.equal(nodes.has('naming-container'),false);
});
test('returning to chapter 3 creates fresh controls and confirmation advances only once',()=>{
    const {game,nodes,chapter,names}=fixture('child');game.loadChapter(chapter);
    const old=nodes.get('naming-confirm-btn');game.endDialogue(true);game.loadChapter(chapter);
    assert.notEqual(nodes.get('naming-confirm-btn'),old);
    nodes.get('player-name-input').value='小旅人';const confirm=nodes.get('naming-confirm-btn').onclick;
    confirm();confirm();assert.deepEqual(names,['小旅人']);assert.equal(game.currentIndex,1);assert.equal(nodes.has('naming-container'),false);
});
