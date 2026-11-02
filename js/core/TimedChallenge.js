window.TimedChallenge = {
    active: false,
    generation: 0,
    storageKey: 'redbrick.challenge.best.v1',
    best(kind, mode, score) {
        let records = {};
        try { const saved = JSON.parse(localStorage.getItem(this.storageKey)); if (saved && typeof saved === 'object' && !Array.isArray(saved)) records = saved; } catch (_) {}
        const key = `${kind}:${mode}`;
        const old = Number.isFinite(records[key]) && records[key] >= 0 ? records[key] : 0;
        if (score !== undefined && score > old) {
            records[key] = score;
            try { localStorage.setItem(this.storageKey, JSON.stringify(records)); } catch (_) {}
        }
        return Math.max(old, score || 0);
    },
    showInfo(kind) {
        this.stop();
        this.kind = kind;
        this.mode = window.gameMode === 'child' ? 'child' : 'adult';
        showScene('challenge-lobby');
        const memory = kind === 'memory';
        document.getElementById('challenge-lobby-title').textContent = memory ? '記憶挑戰' : '防守挑戰';
        document.getElementById('challenge-lobby-copy').textContent = memory
            ? '90 秒內連續配對。每對 +10 分，完成一盤再 +20 分。配錯亮一盞紅燈，配對成功清除；三盞紅燈扣 10 分後清空。換盤與記憶展示不扣時間。'
            : '90 秒連續防守，滑動處理目標、避開石頭；重擊依提示滑動格擋，旋轉時沿畫面畫圈。沿用各操作分數，失誤會扣分但不會提前結束。背景整場固定，素材隨波次混合。';
        document.getElementById('challenge-lobby-best').textContent = `個人最佳：${this.best(kind, this.mode)} 分`;
    },
    stop() {
        this.generation++;
        this.active = false;
        this.session?.dispose();
        this.session = null;
        this.hud?.remove(); this.hud = null;
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
        if (this.exitConfirmed) { this.exit(); return; }
        this.exitConfirmed = true;
        document.getElementById('game-pause-status').textContent = '要返回挑戰目錄嗎？本次成績不會保存。';
        document.getElementById('game-pause-exit').textContent = '確認返回';
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
        this.score = this.pairs = this.boards = this.penalties = this.successes = 0;
        this.session = new window.MinigameSession();
        const run = this.generation;
        this.background = this.kind === 'defense' ? window.ChallengeScenes.pickBackground() : 'assets/images/ch2/bg.png';
        const assets = this.kind === 'defense'
            ? [...window.MinigameAssets.getDefensePreloadUrls(), 'assets/images/challenge/player.png']
            : [...window.MinigameAssets.getMemoryPreloadUrls(), this.background];
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
        window.MemoryGameV2.start({...common,cardCount:pairs*2,time:90,lightMode:'red',needMemorize:true,memorizationTime:2000});
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
        root.appendChild(this.hud);
        this.updateHUD();
    },
    ready(game) {
        if (!this.active || game.challenge !== this) return;
        if (this.kind === 'defense') this.decorate(game);
        const clock = this.kind === 'defense' ? game.clock : game.session.clock;
        this.game = game;
        this.lastTick = clock.now();
        this.liveClock = clock;
        this.liveTimer = clock.setInterval(() => this.consumeTime(),100);
    },
    consumeTime() {
        if (!this.active || !this.liveClock) return;
        const now = this.liveClock.now();
        this.remaining = Math.max(0,this.remaining-(now-this.lastTick));
        this.lastTick = now;
        if (this.kind === 'defense') this.score = Math.max(0,this.game.score);
        else { this.game.timeLeft = Math.ceil(this.remaining/1000); this.game.updateStats(); }
        this.updateHUD();
        if (this.remaining <= 0) this.finish();
    },
    updateHUD() {
        if (!this.hud) return;
        this.hud.textContent = `${Math.ceil(this.remaining/1000)} 秒　｜　${this.score} 分${this.kind === 'memory' ? `　｜　第 ${this.boards+1} 盤` : ''}`;
        this.hud.classList.toggle('challenge-time-warning',this.remaining<=10000);
    },
    nextAttack(game) {
        const elapsed = 90000-this.remaining;
        const level = 1+Math.floor(Math.random()*3);
        const source = window.DefenseLevels[level][this.mode];
        const allowed = elapsed<20000 ? ['NORMAL','MULTI'] : ['NORMAL','MULTI','MULTI_MIXED','HEAVY','AOE'];
        const pool = source.attackPatterns.filter(a => allowed.includes(a.type));
        const attack = JSON.parse(JSON.stringify(pool[Math.floor(Math.random()*pool.length)]));
        const minimum = this.mode === 'child' ? 2400 : 1700;
        if (attack.wait) attack.wait = Math.max(minimum,attack.wait*(elapsed>60000?.78:elapsed>20000?.9:1));
        for (const key of ['enemyImage','decoyImage','wrongEnemyImage','heavyEnemyImage','projectileImage','projectileHitImage','shieldImage','aoeLineImage']) game.levelConfig[key]=source[key];
        game.levelConfig.flow.targetName=source.flow.targetName;
        // 顯示中的盾牌與旋轉素材也跟隨本波，背景與角色整場固定。
        for (const dir of ['up','down','left','right']) {
            const shield=document.getElementById(`shield-${dir}`),aoe=document.getElementById(`aoe-${dir}`);
            if(shield)shield.style.backgroundImage=`url('${source.shieldImage}')`;
            if(aoe)aoe.style.backgroundImage=`url('${source.aoeLineImage}')`;
        }
        return {...attack,resolved:false};
    },
    paired() { if(this.active){this.pairs++;this.score+=10;this.updateHUD();} },
    penalty() { if(this.active){this.penalties++;this.score=Math.max(0,this.score-10);this.updateHUD();} },
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
        const detail = this.kind==='defense' ? `處理結果：${this.game.mistakes} 次失誤` : `完成 ${this.boards} 盤・配對 ${this.pairs} 對・紅燈懲罰 ${this.penalties} 次`;
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
            const button=document.createElement('button');button.type='button';button.textContent='開始挑戰';
            button.addEventListener('click',()=>this.showInfo(index===0?'defense':'memory'));card.appendChild(button);
            card.querySelector('.challenge-soon')?.remove();
        });
        document.getElementById('challenge-begin').addEventListener('click',()=>this.start());
        document.getElementById('challenge-play-again').addEventListener('click',()=>this.start());
        document.querySelectorAll('[data-challenge-exit]').forEach(b=>b.addEventListener('click',()=>this.exit()));
    }
};
document.addEventListener('DOMContentLoaded',()=>window.TimedChallenge.init());
