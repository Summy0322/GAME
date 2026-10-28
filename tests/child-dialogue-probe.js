// 僅供本機預覽：使用真正的章節文字、字型和對話框量測每一頁。
(async () => {
    await document.fonts.load('17px BpmfZihiKai');
    await document.fonts.ready;
    const lines = [], seen = new Set();
    function visit(value) {
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        if ('text' in value && ('name' in value || 'characterImage' in value) && !['narration','naming'].includes(value.type)) {
            let text = value.childText || value.text;
            if (typeof text === 'function') text = text();
            if (typeof text === 'string' && text) lines.push({...value,text});
        }
        for (const child of Object.values(value)) if (typeof child === 'object') visit(child);
    }
    for (const chapter of [window.IntroChapter,window.Chapter1_Child,window.Chapter2_Child,window.Chapter3_Child]) visit(chapter);
    for (const question of QuizQuestions.questions) {
        lines.push({id:'quiz-'+question.id,name:'考考你',text:question.text});
        lines.push({id:'answer-'+question.id,name:'結果',text:'❌ 答錯了！正確答案是：'+QuizQuestions.getCorrectAnswerText(question)+' '+question.explanation});
    }
    const reports=[];
    let example;
    const originalType=Typewriter.typeText;
    Typewriter.typeText=function(text){this.stopTyping(true);this.dialogueText.textContent=text;};
    for (const line of lines) {
        Typewriter.showDialogue(typeof line.name==='function'?line.name():line.name,line.text,line.characterImage);
        await document.fonts.ready;
        await Promise.resolve();
        const element=Typewriter.dialogueText;
        const pages=Typewriter.getDialoguePages(line.text);
        element.textContent=line.text;
        const originallyOverflowed=element.scrollHeight>element.clientHeight+1;
        const fit=pages.every(text=>{element.textContent=text;return element.scrollHeight<=element.clientHeight+1&&element.scrollWidth<=element.clientWidth+1;});
        reports.push({id:line.id||line.name,originallyOverflowed,pages:pages.length,ok:fit&&pages.join('')===line.text});
        if(!example||pages.length>example.pages)example={...line,pages:pages.length};
    }
    Typewriter.stopTyping();
    // 完整走過真正的換頁按鈕，確認 Promise 只在最後一頁完成。
    let completed=false, clickPages=0;
    Typewriter.typeText=function(text,done){this.stopTyping(true);this.dialogueText.textContent=text;done();};
    const pending=Typewriter.showDialogue(example.name,example.text,example.characterImage).then(()=>completed=true);
    await document.fonts.ready;await Promise.resolve();
    let earlyCompletion=false;
    while(document.getElementById('dialogue-next-page')) {
        if(completed)earlyCompletion=true;
        document.getElementById('dialogue-next-page').click();clickPages++;
    }
    await pending;
    Typewriter.typeText=originalType;
    const result={childPagesScan:true,ok:reports.every(r=>r.ok)&&!earlyCompletion&&completed,
        count:reports.length,split:reports.filter(r=>r.pages>1).length,previouslyOverflowed:reports.filter(r=>r.originallyOverflowed).length,
        maxPages:Math.max(...reports.map(r=>r.pages)),clickPages,failures:reports.filter(r=>!r.ok)};
    parent.postMessage(result,location.origin);
    const box=document.createElement('pre');box.id='child-pages-result';box.style.display='none';box.textContent=JSON.stringify(result);document.body.appendChild(box);
    Typewriter.typingSpeed=10;
    Typewriter.showDialogue(example.name,example.text,example.characterImage);
})().catch(error=>parent.postMessage({childPagesScan:true,ok:false,error:error.message},location.origin));
