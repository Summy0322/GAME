window.TimedChallenge = {
    active: false,
    generation: 0,
    storageKey: 'redbrick.challenge.best.v1',
    variant: 'timed',
    get endless() { return this.variant === 'endless'; },
    best(kind, mode, score) {
        let records = {};
        try { const saved = JSON.parse(localStorage.getItem(this.storageKey)); if (saved && typeof saved === 'object' && !Array.isArray(saved)) records = saved; } catch (_) {}
        const key = `${this.endless ? 'endless:' : ''}${kind}:${mode}`;
        const old = Number.isFinite(records[key]) && records[key] >= 0 ? records[key] : 0;
        if (score !== undefined && score > old) {
            records[key] = score;
            try { localStorage.setItem(this.storageKey, JSON.stringify(records)); } catch (_) {}
        }
        return Math.max(old, score || 0);
    },
    showInfo(kind, variant = 'timed') {
        this.stop();
        this.kind = kind;
        this.variant = variant === 'endless' ? 'endless' : 'timed';
        this.mode = window.gameMode === 'child' ? 'child' : 'adult';
        for (const id of ['game-wrapper','challenge-lobby','challenge-countdown','challenge-results']) {
            document.getElementById(id).dataset.challengeKind = kind;
        }
        showScene('challenge-lobby');
        const memory = kind === 'memory';
        document.getElementById('challenge-lobby-kicker').textContent = this.endless ? '三條命・無限模式' : '90 秒・限時挑戰';
        document.getElementById('challenge-lobby-title').textContent = `${memory ? '記憶' : '防守'}挑戰${this.endless ? '・無限模式' : ''}`;
        document.getElementById('challenge-lobby-copy').textContent = this.endless
            ? (memory
                ? '三條命，不限時間、不補命。配對錯誤扣一條命，不再計紅燈；每對 +10 分，完成一盤再 +20 分。卡片逐盤增加至上限，開場記憶時間逐漸縮短。生命歸零時結算。'
                : '三條命，不限時間、不補命。漏接、方向錯誤、打到石頭或格擋失敗扣一條命，同一波最多扣一條。每 10 波加速，逐步加入石頭、重擊與旋轉；反應時限、重擊點燃與波次間隔都逐階縮短至下限。生命歸零時結算。')
            : memory
            ? '90 秒內連續配對。每對 +10 分，完成一盤再 +20 分。配錯亮一盞紅燈，配對成功清除；三盞紅燈扣 10 分後清空。換盤與記憶展示不扣時間。'
            : '90 秒連續防守，滑動處理目標、避開石頭；重擊逐格點燃速度會隨時間加快，依提示滑動格擋。約第 25、60 秒後各有一次旋轉，沿畫面畫圈，成功 +400 分。失誤會扣分但不會提前結束，背景整場固定。';
        document.getElementById('challenge-lobby-best').textContent = `個人最佳：${this.best(kind, this.mode)} 分`;
    },
    stop() {
        this.generation++;
        this.active = false;
        this.session?.dispose();
        this.session = null;
        this.hud?.remove(); this.hud = null;
        this.hudParts = null;
        this.memoryHudParts = null;
        document.getElementById('game-container')?.classList.remove('timed-challenge');
        document.getElementById('game-wrapper')?.classList.remove('challenge-active');
    },
    exit() {
        this.stop();
        window.LoadingManager?.cancel();
        window.GameEngine?.stopMinigame();
        showScene('level-select');
    },
    confirmExit() {
        const pause = window.GamePause;
        if (!pause || !['paused','confirm-exit'].includes(pause.phase)) return;
        if (this.exitConfirmed && pause.phase === 'confirm-exit') { this.exit(); return; }
        pause.phase = 'confirm-exit';
        this.exitConfirmed = true;
        document.getElementById('game-pause-status').textContent = '要返回挑戰目錄嗎？本次成績不會保存。';
        document.getElementById('game-pause-exit').textContent = '確認返回';
        document.getElementById('game-pause-resume').textContent = '取消';
        document.getElementById('game-pause-resume').focus();
    },
    resetExitConfirmation() {
        this.exitConfirmed = false;
        document.getElementById('game-pause-exit').textContent = '返回挑戰目錄';
    },
    requestExit() {
        if (!this.active) return;
        window.GamePause?.pause();
        // 暫停視窗已提供返回入口，讓取消時仍由繼續按鈕恢復。
    },
    start() {
        this.stop();
        window.GameEngine.stopMinigame();
        this.active = true;
        document.getElementById('game-wrapper').classList.add('challenge-active');
        this.remaining = 90000;
        this.elapsed = 0;
        this.lives = 3;
        this.ending = false;
        this.damagedAttack = null;
        this.score = this.pairs = this.boards = this.penalties = this.successes = 0;
        this.aoeMilestone = 0;
        this.session = new window.MinigameSession();
        const run = this.generation;
        this.background = this.kind === 'defense' ? window.ChallengeScenes.pickBackground() : 'assets/images/ch2/bg.png';
        const assets = this.kind === 'defense'
            ? [...window.MinigameAssets.getDefensePreloadUrls(), 'assets/images/challenge/player.png']
            : [...window.MinigameAssets.getMemoryPreloadUrls(), this.background];
        if (this.endless) assets.push('assets/images/heart.png');
        window.LoadingManager.showAndLoad(assets, () => {
            if (!this.active || run !== this.generation) return;
            showScene('challenge-countdown');
            const owner = {container:document.getElementById('challenge-countdown'),session:this.session};
            window.GamePause.attach(owner, this.kind);
            let count = 3;
            const tick = () => {
                if (!this.active || run !== this.generation) return;
                document.getElementById('challenge-countdown-number').textContent = count;
                if (count-- > 0) this.session.timeout(tick,1000);
                else { window.GamePause.end(owner); this.launch(); }
            };
            tick();
        }, {required:true,onCancel:() => {if (run === this.generation) this.exit();}});
    },
    launch() {
        if (!this.active) return;
        showScene('game-container');
        document.getElementById('game-container').classList.add('timed-challenge');
        document.querySelector('#game-container .back-btn').style.display = 'none';
        const common = {challenge:this,gameMode:this.mode,onComplete:() => {}};
        if (this.kind === 'defense') {
            const base = window.DefenseLevels[1][this.mode];
            const config = {...base, bgImage:this.background, playerImage:'assets/images/challenge/player.png', attackPatterns:[],flow:{...base.flow,randomizeAfter:0}};
            window.GameEngine._startMinigameImmediately('defense',{...common,level:1,challengeConfig:config});
        } else {
            this.launchMemory(common);
        }
    },
    launchMemory(common = {challenge:this,gameMode:this.mode,onComplete:() => {}}) {
        const pairs = Math.min(this.mode === 'child' ? 5 : 6, (this.mode === 'child' ? 3 : 4) + this.boards);
        const memorizationTime = this.endless ? Math.max(this.mode === 'child' ? 1600 : 1200, 3000-this.boards*200) : 2000;
        window.MemoryGameV2.start({...common,cardCount:pairs*2,time:90,lightMode:this.endless ? 'none' : 'red',needMemorize:true,memorizationTime});
        window.GamePause.attach(window.MemoryGameV2,'memory');
        this.decorate(window.MemoryGameV2);
    },
    decorate(game) {
        if (!this.active) return;
        const root = game.container;
        root.classList.add('night-challenge-game');
        if (this.kind === 'memory') { game.timeLeft=Math.ceil(this.remaining/1000);game.updateStats(); }
        const stage = this.kind === 'defense' ? game.stage : root.querySelector('.memory-stage');
        stage.classList.add('challenge-play-stage');
        stage.style.backgroundImage = 'none';
        const background = document.createElement('div');
        background.className = 'challenge-play-background';
        background.style.backgroundImage = `url('${this.background}')`;
        stage.prepend(background);
        if (this.kind === 'defense') {
            game.player.style.background = 'none';
            game.player.innerHTML = '<svg viewBox="48 21 150 229" width="100%" height="100%" aria-label="挑戰角色" role="img"><image href="assets/images/challenge/player.png" width="250" height="250"/></svg>';
        }
        this.hud?.remove();
        this.hud = document.createElement('div');
        this.hud.className = 'challenge-live-hud';
        this.hudParts = null;
        this.memoryHudParts = null;
        if (this.kind === 'defense') {
            root.classList.add('defense-endless-game');
            this.hud.classList.add('defense-endless-hud');
            const vitality = this.endless ? `<span class="challenge-hearts" role="img">${[0,1,2].map(()=>'<img src="assets/images/heart.png" alt="">').join('')}</span><span class="endless-mark" aria-hidden="true">∞</span>` : '<span class="defense-challenge-time"></span>';
            this.hud.innerHTML = `<div class="endless-score-card"><div class="endless-vitality">${vitality}</div><div class="endless-score-line"><strong class="endless-score-value"></strong><span>分</span></div></div><div class="endless-wave-card"><span class="endless-stage"></span><div class="endless-wave-line"><strong class="endless-wave-value"></strong><span>波</span></div><div class="endless-wave-ticks" aria-hidden="true" ${this.endless?'':'hidden'}>${'<i></i>'.repeat(10)}</div></div>`;
            this.hudParts = {
                hearts:this.hud.querySelector('.challenge-hearts'),
                time:this.hud.querySelector('.defense-challenge-time'),
                score:this.hud.querySelector('.endless-score-value'),
                stage:this.hud.querySelector('.endless-stage'),
                wave:this.hud.querySelector('.endless-wave-value'),
                ticks:[...this.hud.querySelectorAll('.endless-wave-ticks i')]
            };
            const meter = root.querySelector('#defense-wait-meter');
            if (meter) {
                meter.querySelector('span').textContent = '避開石頭';
                this.hud.querySelector('.endless-wave-card').appendChild(meter);
            }
        }
        if (this.kind === 'memory') {
            this.hud.classList.add('memory-challenge-hud');
            const vitality = this.endless ? `<span class="challenge-hearts" role="img">${[0,1,2].map(()=>'<img src="assets/images/heart.png" alt="">').join('')}</span>` : '<strong class="memory-challenge-time"></strong>';
            this.hud.innerHTML = `<span class="memory-challenge-vitality">${vitality}</span><span class="memory-challenge-score"><strong></strong><small>分</small></span><span class="memory-challenge-board"></span>`;
            this.memoryHudParts = {hearts:this.hud.querySelector('.challenge-hearts'),time:this.hud.querySelector('.memory-challenge-time'),score:this.hud.querySelector('.memory-challenge-score strong'),board:this.hud.querySelector('.memory-challenge-board')};
            root.querySelector('.memory-hud').prepend(this.hud);
            // 先按完整資訊欄計算卡片，再記下基準；不在翻牌期間重新量測版面。
            game.challengeCardBasis = null;
            game.adjustCardSize();
            const card = game.grid.querySelector('.memory-card');
            if (card) game.challengeCardBasis = {width:parseFloat(card.style.width),height:parseFloat(card.style.height),stageHeight:document.getElementById('game-wrapper').clientHeight};
        } else root.appendChild(this.hud);
        this.updateHUD();
    },
    ready(game) {
        if (!this.active || game.challenge !== this) return;
        this.game = game;
        if (this.kind === 'defense') this.decorate(game);
        const clock = this.kind === 'defense' ? game.clock : game.session.clock;
        this.lastTick = clock.now();
        this.liveClock = clock;
        this.liveTimer = clock.setInterval(() => this.consumeTime(),100);
    },
    consumeTime() {
        if (!this.active || !this.liveClock) return;
        const now = this.liveClock.now();
        const delta = now-this.lastTick;
        this.elapsed = (this.elapsed || 0) + delta;
        if (!this.endless) this.remaining = Math.max(0,this.remaining-delta);
        this.lastTick = now;
        if (this.kind === 'defense') this.score = Math.max(0,this.game.score);
        else { this.game.timeLeft = Math.ceil(this.remaining/1000); this.game.updateStats(); }
        this.updateHUD();
        if (!this.endless && this.remaining <= 0) this.finish();
    },
    updateHUD() {
        if (!this.hud) return;
        if (this.kind === 'memory' && this.memoryHudParts) {
            const parts = this.memoryHudParts;
            if (parts.hearts) {
                parts.hearts.setAttribute('aria-label',`剩餘 ${this.lives} 條命`);
                [...parts.hearts.children].forEach((heart,index)=>heart.classList.toggle('heart-lost',index>=this.lives));
            }
            for (const [node,value] of [[parts.time,`${Math.ceil(this.remaining/1000)} 秒`],[parts.score,this.displayScore(this.score)],[parts.board,`第 ${this.boards+1} 盤`]]) {
                if (node && node.textContent !== value) node.textContent = value;
            }
            parts.score.title = `${this.score.toLocaleString('zh-TW')} 分`;
            this.hud.classList.toggle('challenge-time-warning',this.endless ? this.lives===1 : this.remaining<=10000);
            return;
        }
        if (this.kind === 'defense' && this.hudParts) {
            const wave = Math.max(1,this.game?.waveNumber || 1);
            const stage = Math.floor((wave-1)/10)+1;
            const parts = this.hudParts;
            if (parts.hearts) {
                parts.hearts.setAttribute('aria-label',`剩餘 ${this.lives} 條命`);
                [...parts.hearts.children].forEach((heart,index)=>heart.classList.toggle('heart-lost',index>=this.lives));
            }
            if (parts.time) {
                const text = `${Math.ceil(this.remaining/1000)} 秒`;
                if (parts.time.textContent !== text) parts.time.textContent = text;
            }
            const score = Math.max(0,this.score);
            const scoreLabel = this.displayScore(score);
            if (parts.score.textContent !== scoreLabel) parts.score.textContent = scoreLabel;
            parts.score.setAttribute('aria-label',`得分 ${score} 分`);
            parts.score.title = `${score.toLocaleString('zh-TW')} 分`;
            const stageLabel = this.endless ? `階段 ${String(stage).padStart(2,'0')}` : '連續防守';
            if (parts.stage.textContent !== stageLabel) parts.stage.textContent = stageLabel;
            const waveLabel = wave.toLocaleString('zh-TW');
            if (parts.wave.textContent !== waveLabel) parts.wave.textContent = waveLabel;
            parts.ticks.forEach((tick,index)=>tick.classList.toggle('is-lit',index<=(wave-1)%10));
            this.hud.classList.toggle('challenge-time-warning',this.endless ? this.lives===1 : this.remaining<=10000);
            return;
        }
        if (this.endless) {
            const stage = this.kind === 'memory' ? this.boards+1 : Math.floor(Math.max(0,(this.game?.waveNumber || 1)-1)/10)+1;
            this.hud.innerHTML = `<span class="challenge-hearts" role="img" aria-label="剩餘 ${this.lives} 條命">${[0,1,2].map(i=>`<img src="assets/images/heart.png" alt="" class="${i<this.lives?'':'heart-lost'}">`).join('')}</span><span>${this.score} 分 · ${Math.floor((this.elapsed || 0)/1000)} 秒 · ${this.kind === 'memory' ? `第 ${stage} 盤` : `階段 ${stage}`}</span>`;
            this.hud.classList.toggle('challenge-time-warning',this.lives===1);
            return;
        }
        this.hud.textContent = `${Math.ceil(this.remaining/1000)} 秒　｜　${this.score} 分${this.kind === 'memory' ? `　｜　第 ${this.boards+1} 盤` : ''}`;
        this.hud.classList.toggle('challenge-time-warning',this.remaining<=10000);
    },
    displayScore(score) {
        return score>=1e8 ? `${(score/1e8).toFixed(1)}億` : score>=1e5 ? `${(score/1e4).toFixed(1)}萬` : score.toLocaleString('zh-TW');
    },
    pauseDetail() {
        if (!this.active || !this.endless || this.kind !== 'defense') return '';
        const seconds = Math.floor((this.elapsed || 0)/1000);
        return `存活 ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}　·　得分 ${this.score.toLocaleString('zh-TW')} 分`;
    },
    nextAttack(game) {
        const elapsed = 90000-this.remaining;
        const wave = (game.waveNumber || 0)+1;
        const stage = Math.floor((wave-1)/10);
        const speed = this.defenseSpeed(stage,elapsed);
        const dueAOE = this.endless ? wave >= 30 && wave%10===0 : elapsed >= [25000,60000][this.aoeMilestone || 0];
        const level = dueAOE ? 3 : 1+Math.floor(Math.random()*3);
        const source = window.DefenseLevels[level][this.mode];
        const allowed = dueAOE ? ['AOE'] : this.endless
            ? stage===0 ? ['NORMAL'] : stage===1 ? ['NORMAL','MULTI','MULTI_MIXED'] : ['NORMAL','MULTI','MULTI_MIXED','HEAVY']
            : elapsed<20000 ? ['NORMAL','MULTI'] : ['NORMAL','MULTI','MULTI_MIXED','HEAVY'];
        const pool = source.attackPatterns.filter(a => allowed.includes(a.type));
        const attack = JSON.parse(JSON.stringify(pool[Math.floor(Math.random()*pool.length)]));
        const minimum = this.mode === 'child' ? 2400 : 1700;
        if (dueAOE) { this.aoeMilestone=(this.aoeMilestone||0)+1;attack.points=400; }
        else if (!this.endless && attack.wait) attack.wait = Math.max(minimum,attack.wait*(elapsed>60000?.78:elapsed>20000?.9:1));
        if (this.endless) {
            // 僅在新波次調整，旋轉與重擊保留較長的操作時間。
            const floor = attack.type==='AOE' ? (this.mode==='child'?3400:2600) : speed.minimumWait;
            attack.wait = Math.max(floor,Math.round(attack.wait * speed.factor));
            game.levelConfig = {...game.levelConfig,flow:{...game.levelConfig.flow,prepareTime:speed.prepareTime,successGap:speed.gap}};
        }
        // 每波建立獨立材質設定，舊投射物／命中特效不會讀到下一波的圖片。
        const assets = {};
        for (const key of ['enemyImage','decoyImage','wrongEnemyImage','heavyEnemyImage','projectileImage','projectileHitImage','shieldImage','aoeLineImage']) assets[key]=source[key];
        game.levelConfig={...game.levelConfig,...assets,flow:{...game.levelConfig.flow,targetName:source.flow.targetName}};
        // 顯示中的盾牌與旋轉素材也跟隨本波，背景與角色整場固定。
        for (const dir of ['up','down','left','right']) {
            const aoe=document.getElementById(`aoe-${dir}`);
            if(aoe)aoe.style.backgroundImage=`url('${source.aoeLineImage}')`;
        }
        return {...attack,resolved:false,heavyIgnitionInterval:speed.ignition,
            ...(this.endless ? {challengeGap:speed.gap} : {}),materials:Object.freeze({...assets})};
    },
    defenseSpeed(stage, elapsed) {
        const child = this.mode === 'child';
        if (!this.endless) {
            const progress = Math.min(1,Math.max(0,elapsed)/90000);
            return {ignition:Math.round(400-(child?180:220)*progress)};
        }
        // 每十波乘上倍率，直到各項速度下限；成功與失誤後都使用本波節奏。
        const factor = Math.pow(child ? .85 : .8,Math.max(0,stage));
        return {
            factor,
            ignition:Math.max(child?140:100,Math.round(400*factor)),
            minimumWait:child?1250:850,
            prepareTime:Math.max(child?140:100,Math.round((child?400:300)*factor)),
            gap:Math.max(child?180:120,Math.round((child?500:380)*factor))
        };
    },
    paired() { if(this.active){this.pairs++;this.score+=10;this.updateHUD();} },
    penalty() { if(this.active){this.penalties++;this.score=Math.max(0,this.score-10);this.updateHUD();} },
    loseLife(attack) {
        if (!this.active || !this.endless || this.ending) return;
        if (this.kind === 'defense' && (!attack || attack !== this.game?.currentAttack || attack.finished)) return;
        if (attack && this.damagedAttack === attack) return;
        this.damagedAttack = attack || null;
        this.lives = Math.max(0,this.lives-1);
        this.penalties++;
        this.updateHUD();
        if (this.lives === 0) {
            this.ending = true;
            // 等當次輸入處理完畢才清理 DOM，避免舊手勢繼續寫入結算畫面。
            const run = this.generation;
            this.liveClock.setTimeout(()=>{if(this.active && this.generation===run)this.finish();},0);
        }
    },
    boardComplete(game) {
        this.consumeTime();
        if (!this.active) return;
        this.liveClock.clearInterval(this.liveTimer); this.liveClock=null;
        this.boards++; this.score+=20;
        game.challenge.changingBoard=true;
        this.launchMemory();
        this.changingBoard=false;
    },
    finish() {
        if (!this.active) return;
        const old = this.best(this.kind,this.mode);
        const score = this.kind==='defense' ? Math.max(0,this.game.score) : this.score;
        const detail = this.endless
            ? `存活 ${Math.floor((this.elapsed || 0)/1000)} 秒・${this.kind==='defense' ? `進入第 ${this.game.waveNumber} 波` : `完成 ${this.boards} 盤・配對 ${this.pairs} 對`}・生命耗盡`
            : this.kind==='defense' ? `處理結果：${this.game.mistakes} 次失誤` : `完成 ${this.boards} 盤・配對 ${this.pairs} 對・紅燈懲罰 ${this.penalties} 次`;
        const best = this.best(this.kind,this.mode,score);
        this.game.gameActive=false;
        this.game.challenge = null;
        this.game.stop({keepMusic:true});
        const musicOwner=this.kind;
        this.stop();
        window.GamePause.end();
        // 先移開關卡畫面；保留音樂播放器淡出，下一場啟動時才清理。
        window.GameMusic?.fadeOut(musicOwner);
        showScene('challenge-results');
        document.getElementById('challenge-final-score').textContent=`${score} 分`;
        document.getElementById('challenge-final-detail').textContent=detail;
        document.getElementById('challenge-final-best').textContent=`${score>old?'新紀錄！　':''}個人最佳：${best} 分`;
        document.getElementById('challenge-play-again').focus();
    },
    init() {
        document.querySelectorAll('.challenge-preview').forEach((card,index)=>{
            card.dataset.challengeKind=index===0?'defense':'memory';
            const button=document.createElement('button');button.type='button';button.textContent='限時挑戰';
            button.addEventListener('click',()=>this.showInfo(index===0?'defense':'memory'));card.appendChild(button);
            const endless=document.createElement('button');endless.type='button';endless.textContent='無限模式';
            endless.addEventListener('click',()=>this.showInfo(index===0?'defense':'memory','endless'));card.appendChild(endless);
            card.querySelector('.challenge-soon')?.remove();
        });
        document.getElementById('challenge-begin').addEventListener('click',()=>this.start());
        document.getElementById('challenge-play-again').addEventListener('click',()=>this.start());
        document.querySelectorAll('[data-challenge-exit]').forEach(b=>b.addEventListener('click',()=>this.exit()));
    }
};
document.addEventListener('DOMContentLoaded',()=>window.TimedChallenge.init());
