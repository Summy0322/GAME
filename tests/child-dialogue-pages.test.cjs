const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(mode='child') {
    const nodes=new Map(),window={gameMode:mode};
    const element=()=>({style:{},classList:{add(){},remove(){}},textContent:'',appendChild(node){nodes.set(node.id,node)},remove(){nodes.delete(this.id)},getBoundingClientRect(){return {width:320}}});
    const document={getElementById:id=>nodes.get(id)||null,createElement:element};
    vm.runInNewContext(fs.readFileSync('js/core/Typewriter.js','utf8'),{window,document,console:{log(){}},setInterval,clearInterval});
    const writer=window.Typewriter;
    writer.dialogueBox=element();writer.npcName=element();writer.optionsContainer=element();writer.dialogueText=element();
    Object.defineProperties(writer.dialogueText,{clientHeight:{value:20},clientWidth:{value:320},scrollWidth:{value:320},scrollHeight:{get(){return Math.ceil([...new Intl.Segmenter('zh-Hant',{granularity:'grapheme'}).segment(this.textContent)].length/10)*20}}});
    writer.showCompletionIndicator=()=>{};
    writer.typeText=function(text,done){this.stopTyping(true);this.dialogueText.textContent=text;if(done)done()};
    return {writer,nodes,document};
}
test('pages preserve all wording, punctuation, emoji and IVS without exceeding capacity',()=>{
    const {writer}=fixture();
    const text='阿\u{E0100}斗仔帶你來逛市場。一起看看👨‍👩‍👧‍👦喜歡什麼！再買食材回家。';
    const pages=writer.getDialoguePages(text);
    assert.ok(pages.length>1);assert.equal(pages.join(''),text);
    for(const page of pages){writer.dialogueText.textContent=page;assert.ok(writer.dialogueText.scrollHeight<=20);assert.ok(!/^[\u{E0100}-\u{E01EF}]/u.test(page));}
});
test('adult mode and short child lines retain a single page',()=>{
    assert.equal(fixture('adult').writer.getDialoguePages('長文字'.repeat(50)).length,1);
    assert.equal(fixture().writer.getDialoguePages('你好！').length,1);
});
test('dialogue promise waits for all pages, so choices cannot appear early',async()=>{
    const {writer,nodes}=fixture();let finished=false;
    const text='第一段文字請仔細看。第二段也要看完才選。最後準備開始遊戲吧！';
    const expected=writer.getDialoguePages(text).length;
    const pending=writer.showDialogue('阿斗仔',text).then(()=>finished=true);
    let clicks=0,combined=writer.dialogueText.textContent;
    while(nodes.has('dialogue-next-page')){
        await Promise.resolve();assert.equal(finished,false);
        nodes.get('dialogue-next-page').onclick({stopPropagation(){}});clicks++;
        combined+=writer.dialogueText.textContent;
    }
    await pending;assert.equal(finished,true);assert.equal(clicks,expected-1);assert.equal(combined,text);
});
test('clearing or replacing dialogue removes paging controls and ignores old page clicks',()=>{
    const {writer,nodes}=fixture();let oldFinished=0;
    writer.showDialogue('阿斗仔','長文字'.repeat(20)).then(()=>oldFinished++);
    const stale=nodes.get('dialogue-next-page').onclick;
    writer.clear();assert.equal(nodes.has('dialogue-next-page'),false);
    stale({stopPropagation(){}});assert.equal(nodes.has('dialogue-next-page'),false);
    writer.showDialogue('媽媽','你好');assert.equal(writer.dialogueText.textContent,'你好');assert.equal(oldFinished,0);
});
test('a delayed font load cannot reopen cleared dialogue',async()=>{
    const {writer,document}=fixture();let ready;
    document.fonts={ready:new Promise(resolve=>ready=resolve)};
    writer.showDialogue('阿斗仔','長文字'.repeat(20));writer.clear();ready();await Promise.resolve();
    assert.equal(writer.dialogueBox.style.display,'none');assert.equal(document.getElementById('dialogue-next-page'),null);
});
