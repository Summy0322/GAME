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
        const scene = ['age', 'menu', 'dialogue', 'defense', 'memory', 'quiz', 'cleanup'].includes(requestedScene) ? requestedScene : 'age';
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!doctype html><html style="overflow-x:hidden"><head><title>Layout check</title></head><body style="margin:16px;background:#25303a;color:white;font:16px sans-serif"><p>${width} × ${height} · ${scene.replace(/[^a-z]/g, '')}</p><pre id="results" style="white-space:pre-wrap">Checking…</pre><iframe id="preview" title="遊戲預覽" width="${width}" height="${height}" style="border:1px solid #718096;transform:scale(${Math.min(1, 580 / width)});transform-origin:top left" src="/GAME/?testScene=${encodeURIComponent(scene)}&safe=${url.searchParams.get('safe') === '1' ? '1' : '0'}"></iframe><script>addEventListener('message', e => { if(e.origin === location.origin) document.getElementById('results').textContent=JSON.stringify(e.data); });</script></body></html>`);
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
            const scene = JSON.stringify(['age', 'menu', 'dialogue', 'defense', 'memory', 'quiz', 'cleanup'].includes(requestedScene) ? requestedScene : 'age');
            const safe = url.searchParams.get('safe') === '1';
            html = html.replace('</body>', `<script>
                window.addEventListener('load', () => {
                    ${safe ? "document.documentElement.style.cssText='--safe-left:44px;--safe-right:44px;--safe-bottom:21px'" : ''};
                    const scene = ${scene};
                    if (scene !== 'age') {
                        window.gameMode = 'adult';
                        document.getElementById('age-select-dialog').style.display = 'none';
                        showScene(scene === 'menu' ? 'level-select' : 'game-container');
                    }
                    if (scene === 'dialogue') {
                        DialogueSystem.loadChapter({ id:'layout', background:'assets/images/ch1/background.png', dialogue:[{
                            name:'阿斗仔', character:'阿斗仔', text:'這是一段測試對話，用來確認不同螢幕大小下，角色與對話框的位置維持穩定。較長的內容應該可以在對話框內捲動閱讀，不會超出遊戲舞台。'.repeat(5), characterImage:'assets/images/characters/阿斗仔.png'
                        }] });
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
                    setTimeout(() => {
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
