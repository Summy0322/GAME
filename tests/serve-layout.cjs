// Local-only layout review server. No changes are injected into the production files.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.ttf':'font/ttf' };
http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/preview') {
        const width = Math.max(280, Math.min(2560, Number(url.searchParams.get('w')) || 844));
        const height = Math.max(200, Math.min(1600, Number(url.searchParams.get('h')) || 390));
        const requestedScene = url.searchParams.get('scene');
        const scene = ['age', 'menu', 'dialogue', 'defense', 'memory', 'quiz', 'cleanup', 'memorycleanup', 'defensepace'].includes(requestedScene) ? requestedScene : 'age';
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!doctype html><html style="overflow-x:hidden"><head><title>Layout check</title></head><body style="margin:16px;background:#25303a;color:white;font:16px sans-serif"><p>${width} × ${height} · ${scene.replace(/[^a-z]/g, '')}</p><pre id="results" style="white-space:pre-wrap">Checking…</pre><iframe id="preview" title="遊戲預覽" width="${width}" height="${height}" style="border:1px solid #718096;transform:scale(${Math.min(1, 580 / width)});transform-origin:top left" src="/GAME/?testScene=${encodeURIComponent(scene)}&safe=${url.searchParams.get('safe') === '1' ? '1' : '0'}&child=${url.searchParams.get('child') === '1' ? '1' : '0'}"></iframe><script>addEventListener('message', e => { if(e.origin === location.origin && e.source === document.getElementById('preview').contentWindow && e.data && ['ratioOK','cleanupOK','memoryCleanupOK','pacingOK'].some(key => typeof e.data[key] === 'boolean')) document.getElementById('results').textContent=JSON.stringify(e.data); });</script></body></html>`);
        return;
    }
    let name;
    try { name = decodeURIComponent(url.pathname).replace(/^\/GAME\/?/, ''); }
    catch { res.writeHead(400).end(); return; }
    if (!name || name.endsWith('/')) name += 'index.html';
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, bytes) => {
        if (err) { res.writeHead(404).end(); return; }
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        if (name === 'index.html' && url.searchParams.has('testScene')) {
            let html = bytes.toString().replace(/<script src="https:[^"]+"><\/script>/g, '');
            html = html.replace("if ('serviceWorker' in navigator)", 'if (false)');
            const requestedScene = url.searchParams.get('testScene');
            const scene = JSON.stringify(['age', 'menu', 'dialogue', 'defense', 'memory', 'quiz', 'cleanup', 'memorycleanup', 'defensepace'].includes(requestedScene) ? requestedScene : 'age');
            const safe = url.searchParams.get('safe') === '1';
            const mode = url.searchParams.get('child') === '1' ? 'child' : 'adult';
            if (url.searchParams.get('layout') === 'before') html = html.replace('<link rel="stylesheet" href="css/dialogue-layout.css">', '');
            const sample = url.searchParams.get('sample') === 'long' ? 'long' : 'short';
            const actor = ['mom','herbal_owner','knife_smith'].includes(url.searchParams.get('actor')) ? url.searchParams.get('actor') : '阿斗仔';
            const actorName = {mom:'媽媽',herbal_owner:'中藥行老闆',knife_smith:'刀行師傅','阿斗仔':'阿斗仔'}[actor];
            html = html.replace('</body>', `<script>
                window.addEventListener('load', async () => {
                    ${safe ? "document.documentElement.style.cssText='--safe-left:44px;--safe-right:44px;--safe-bottom:21px'" : ''};
                    const scene = ${scene};
                    if (scene !== 'age') {
                        window.gameMode = ${JSON.stringify(mode)};
                        document.body.classList.toggle('child-mode', window.gameMode === 'child');
                        document.getElementById('age-select-dialog').style.display = 'none';
                        showScene(scene === 'menu' ? 'level-select' : 'game-container');
                    }
                    if (scene === 'dialogue') {
                        DialogueSystem.loadChapter({ id:'layout', background:'assets/images/ch1/background.png', dialogue:[{
                            name:${JSON.stringify(actorName)}, text:${JSON.stringify(sample === 'long' ? '紅磚市場不只有好吃的肉圓，還有許多陪伴大家長大的老店。待會我們一起去找找香料、認識做料理會用到的食材，再把買好的東西帶回家。慢慢看、慢慢選，準備好了再出發吧！' : '歡迎來到北斗紅磚市場！今天讓我們一起逛老街、找美食，認識這裡的人與故事，看看會有什麼新發現吧！')}, characterImage:${JSON.stringify('assets/images/characters/'+actor+'.png')}
                        }] });
                    }
                    if (scene === 'dialogue') {
                        Typewriter.stopTyping();
                        document.getElementById('dialogue-text').textContent = ${JSON.stringify(sample === 'long' ? '紅磚市場不只有好吃的肉圓，還有許多陪伴大家長大的老店。待會我們一起去找找香料、認識做料理會用到的食材，再把買好的東西帶回家。慢慢看、慢慢選，準備好了再出發吧！' : '歡迎來到北斗紅磚市場！我是阿斗仔，今天就讓我陪你一起逛老街、找美食，認識這裡的人與故事吧！')};
                    }
                    if (scene === 'defensepace') {
                        const game = DefenseGameV2;
                        game.start({level:1,gameMode:window.gameMode,onComplete(){}});
                        const started = performance.now();
                        const samples = new Map();
                        let lastInput = 0;
                        while (performance.now()-started < 60000 && game.gameActive) {
                            const attack = game.currentAttack;
                            if (attack && attack.type !== 'END' && game.state !== game.states.PREPARING) {
                                if (!samples.has(attack)) samples.set(attack, {type:attack.type,directions:attack.dirs || (attack.dir ? [attack.dir] : []),correctDirs:attack.correctDirs || [],wrongDirs:attack.wrongDirs || [],start:performance.now(),end:null});
                                const sample = samples.get(attack);
                                if (attack.finished && sample.end === null) sample.end = performance.now();
                                if (!attack.finished && performance.now()-lastInput >= 250) {
                                    let dir = null;
                                    if (attack.type === 'NORMAL' && !attack.correctHit) dir = attack.dir;
                                    if (attack.type === 'MULTI') dir = attack.dirs.find(d => !attack.swipedDirs.includes(d));
                                    if (attack.type === 'MULTI_MIXED') dir = attack.correctDirs.find(d => !attack.swipedDirs.includes(d));
                                    if (dir) { game.handleSwipe(dir); lastInput = performance.now(); }
                                }
                            }
                            await new Promise(resolve => setTimeout(resolve, 20));
                        }
                        const reports = [...samples.values()].map(s => ({type:s.type,directions:s.directions,correctDirs:s.correctDirs,wrongDirs:s.wrongDirs,ms:Math.round((s.end||performance.now())-s.start)}));
                        const pacingOK = !game.gameActive && game.waveNumber === 10 && game.score === game.maxScore && samples.size === 10;
                        parent.postMessage({pacingOK,mode:window.gameMode,waves:game.waveNumber,score:game.score,maxScore:game.maxScore,reports}, location.origin);
                        return;
                    }
                    if (scene === 'memorycleanup') {
                        let cleanupOK = true, oldCompletions = 0;
                        for (let i=0; i<20; i++) {
                            MemoryGameV2.start({cardCount:4,needMemorize:true,onComplete(){oldCompletions++;}});
                            const session = MemoryGameV2.session;
                            MemoryGameV2.stop();
                            cleanupOK = cleanupOK && session.disposed && session.timeouts.size === 0;
                        }
                        MemoryGameV2.start({cardCount:4,needMemorize:false,onComplete(){}});
                        await new Promise(resolve => setTimeout(resolve, 1200));
                        cleanupOK = cleanupOK && !MemoryGameV2.isMemorizing && MemoryGameV2.canFlip && MemoryGameV2.statusText.innerText === '開始配對！' && oldCompletions === 0;
                        parent.postMessage({memoryCleanupOK:cleanupOK,cycles:20}, location.origin);
                        return;
                    }
                    if (scene === 'cleanup') {
                        const config = { mode:'matching', title:'互動清理測試', hint:'拖曳物品至購物籃', items:[{id:'star',name:'八角',correctZone:'basket',image:'assets/images/ch3/game/star_anise.png'}], zones:[{id:'basket',name:'購物籃'}] };
                        let cleanupOK = true;
                        for (let i=0; i<20; i++) {
                            InteractSystem.start(config, () => {});
                            const interaction = InteractSystem.session;
                            InteractSystem.close();
                            PaymentSystem.start(1, () => {});
                            const payment = PaymentSystem.session;
                            PaymentSystem.close();
                            cleanupOK = cleanupOK && interaction.disposed && payment.disposed && interaction.timeouts.size === 0 && payment.timeouts.size === 0;
                        }
                        InteractSystem.start(config, () => {});
                        const scope = InteractSystem.session;
                        const item = document.querySelector('.interact-drag-item');
                        if (item) {
                            item.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,cancelable:true,pointerType:'mouse',button:0,clientX:100,clientY:100}));
                            cleanupOK = cleanupOK && typeof InteractSystem.cancelDrag === 'function';
                        } else cleanupOK = false;
                        InteractSystem.close();
                        const move = new PointerEvent('pointermove', {cancelable:true,clientX:200,clientY:200});
                        document.dispatchEvent(move);
                        cleanupOK = cleanupOK && !move.defaultPrevented && scope.disposed && !InteractSystem.cancelDrag && !document.querySelector('.interact-drag-label');
                        parent.postMessage({cleanupOK,cycles:20}, location.origin);
                        return;
                    }
                    if (scene === 'quiz') {
                        Typewriter.typingSpeed = 0;
                        DialogueSystem.currentQuizQuestions = QuizQuestions.questions;
                        DialogueSystem.currentQuizIndex = 0;
                        DialogueSystem.showQuizQuestion();
                    }
                    if (scene === 'defense') { DefenseGameV2.start({level:1,onComplete(){}}); }
                    if (scene === 'memory') { MemoryGameV2.start({level:1,onComplete(){}}); }
                    setTimeout(async () => {
                        await document.fonts.ready;
                        if (${url.searchParams.get('scan') === '1'} && scene === 'quiz') {
                            Typewriter.stopTyping();
                            const reports = [];
                            for (const question of QuizQuestions.questions) {
                                document.getElementById('dialogue-text').textContent = question.text;
                                Typewriter.showOptions(question.options.map(opt => ({...opt,action:'quiz_answer'})));
                                const options = document.getElementById('options-container');
                                const buttons = [...options.querySelectorAll('button')];
                                const dialog = document.getElementById('dialog-box');
                                const ok = buttons.length === 4 && options.scrollHeight <= options.clientHeight + 1 &&
                                    options.getBoundingClientRect().bottom <= dialog.getBoundingClientRect().top &&
                                    buttons.every(b => b.scrollHeight <= b.clientHeight + 1 && b.scrollWidth <= b.clientWidth + 1) &&
                                    document.getElementById('dialogue-text').scrollHeight <= document.getElementById('dialogue-text').clientHeight + 1;
                                reports.push({id:question.id,ok});
                            }
                            parent.postMessage({layoutScan:true,ok:reports.every(r=>r.ok),count:reports.length,failures:reports.filter(r=>!r.ok)},location.origin);
                            return;
                        }
                        const wrapper = document.getElementById('game-wrapper').getBoundingClientRect();
                        const selectors = scene === 'age' ? ['#age-child','#age-adult'] : scene === 'menu' ? ['#chapter1-btn','#chapter2-btn','#chapter3-btn','.reset-progress-btn'] : scene === 'dialogue' ? ['#dialog-box','#character-image'] : scene === 'defense' ? ['#defense-stage','#defense-player'] : scene === 'memory' ? ['.memory-panel','#memory-grid'] : scene === 'quiz' ? ['#options-container', '#options-container button:nth-child(1)', '#options-container button:nth-child(2)', '#options-container button:nth-child(3)', '#options-container button:nth-child(4)'] : [];
                        const contained = selectors.every(selector => {
                            const r = document.querySelector(selector).getBoundingClientRect();
                            return r.width > 0 && r.height > 0 && r.left >= wrapper.left - 1 && r.right <= wrapper.right + 1 && r.top >= wrapper.top - 1 && r.bottom <= wrapper.bottom + 1;
                        });
                        const s = getComputedStyle(document.body);
                        const left = parseFloat(s.paddingLeft), right = parseFloat(s.paddingRight), top = parseFloat(s.paddingTop), bottom = parseFloat(s.paddingBottom);
                        const ratioOK = Math.abs(wrapper.width / wrapper.height - 16/9) < .005;
                        const centered = Math.abs(wrapper.left - (left + (innerWidth-left-right-wrapper.width)/2)) < 1 && Math.abs(wrapper.top - (top + (innerHeight-top-bottom-wrapper.height)/2)) < 1;
                        const fits = wrapper.left >= left-1 && wrapper.right <= innerWidth-right+1 && wrapper.top >= top-1 && wrapper.bottom <= innerHeight-bottom+1;
                        const options = document.getElementById('options-container');
                        const buttons = [...options.querySelectorAll('button')];
                        const quizVisible = scene !== 'quiz' || (buttons.length === 4 && options.scrollHeight <= options.clientHeight + 1 && options.scrollWidth <= options.clientWidth + 1 && new Set(buttons.map(b => Math.round(b.getBoundingClientRect().top))).size === 2 && buttons.every(b => b.scrollHeight <= b.clientHeight + 1 && b.scrollWidth <= b.clientWidth + 1) && options.getBoundingClientRect().bottom <= document.getElementById('dialog-box').getBoundingClientRect().top);
                        parent.postMessage({ratioOK,centered,fits,contained,quizVisible,stage:[Math.round(wrapper.width),Math.round(wrapper.height)],scene}, location.origin);
                    }, 750);
                });
            </script></body>`);
            res.end(html);
        } else res.end(bytes);
    });
}).listen(4173, '127.0.0.1', () => console.log('Layout review: http://127.0.0.1:4173/preview?w=844&h=390&scene=age'));
