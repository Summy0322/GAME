window.TimedChallenge = {
    active: false,
    generation: 0,
    storageKey: 'redbrick.challenge.best.v1',
    variant: 'timed',
    practiceKind: null,
    get isPractice(){return !!this.practiceKind;},
    practiceLabel(){return {heavy:'重擊格擋',aoe:'旋轉防守',visible:'順序滑動',memory:'記憶順序'}[this.practiceKind]||'操作練習';},
    startPractice(kind){if(!['heavy','aoe','visible','memory'].includes(kind))return;this.showInfo('defense','endless');this.start({practiceKind:kind,practiceOrder:['visible','memory'].includes(kind)?kind:null});},
    get endless() { return this.variant === 'endless'; },
    bestRecord(kind, mode, score, progress) {
        let records = {};
        try { const saved = JSON.parse(localStorage.getItem(this.storageKey)); if (saved && typeof saved === 'object' && !Array.isArray(saved)) records = saved; } catch (_) {}
        const key = `${this.endless ? 'endless:' : ''}${kind}:${mode}`;
        const saved = records[key];
        const oldScore = typeof saved === 'number' ? saved : saved?.score;
        const old = {score:Number.isFinite(oldScore) && oldScore >= 0 ? oldScore : 0,
            progress:saved && typeof saved === 'object' && !Array.isArray(saved) && Number.isFinite(oldScore) && oldScore>=0 && Number.isSafeInteger(saved.progress) && saved.progress >= 0 ? saved.progress : null};
        const validProgress = Number.isSafeInteger(progress) && progress >= 0 ? progress : null;
        if (Number.isFinite(score) && score >= 0 && (score > old.score || (score === old.score && validProgress !== null && validProgress > (old.progress ?? -1)))) {
            const next = {score,progress:validProgress};
            records[key] = next;
            try { localStorage.setItem(this.storageKey, JSON.stringify(records)); } catch (_) {}
            return next;
        }
        return old;
    },
    best(kind, mode, score, progress) {
        return this.bestRecord(kind,mode,score,progress).score;
    },
    bestLabel(kind, mode, record = this.bestRecord(kind,mode)) {
        const detail = record.progress === null ? (record.score > 0 ? ' · 舊紀錄未記進度' : '')
            : kind === 'defense' ? ` · 第 ${record.progress} 波` : ` · 完成 ${record.progress} 盤`;
        return `個人最佳：${record.score.toLocaleString('zh-TW')} 分${detail}`;
    },
    resetFeedback() {
        this.defenseFeedback={streak:0,best:0,failures:{}};
        this.memoryPairStreak=this.memoryBestStreak=0;
    },
    recordDefenseMistake(attack) {
        if(!this.active||this.kind!=='defense'||!attack||attack.feedbackMistake)return;
        attack.feedbackMistake=true;
        const stats=this.defenseFeedback ||= {streak:0,best:0,failures:{}};
        const reason=attack.lossReason||'';
        let category;
        if(/石頭/.test(reason)||(attack.type==='DECOY'&&!reason))category='打到石頭';
        else if(attack.type==='ORDER')category=/漏接/.test(reason)?'順序漏接':'順序錯誤';
        else if(attack.type==='HEAVY')category='重擊格擋';
        else if(attack.type==='AOE')category='旋轉防守';
        else category=/方向/.test(reason)?'方向錯誤':'目標漏接';
        stats.failures[category]=(stats.failures[category]||0)+1;stats.streak=0;
    },
    defenseWaveFinished(attack) {
        if(!this.active||this.kind!=='defense'||!attack||attack.feedbackFinished)return;
        attack.feedbackFinished=true;
        const stats=this.defenseFeedback ||= {streak:0,best:0,failures:{}};
        if(!attack.feedbackMistake){stats.streak++;stats.best=Math.max(stats.best,stats.streak);}
    },
    feedbackItems() {
        if(this.kind==='defense'){
            const stats=this.defenseFeedback||{best:0,failures:{}};
            const failures=Object.entries(stats.failures).sort((a,b)=>b[1]-a[1]);
            return [['最長連續無失誤',`${stats.best} 波`],['主要失誤',failures.length?failures.slice(0,2).map(([label,count])=>`${label} ${count} 次`).join(' · '):'沒有失誤']];
        }
        const attempts=(this.pairs||0)+(this.memoryErrors||0);
        return [['配對準確率',attempts?`${Math.round((this.pairs||0)/attempts*100)}%`:'尚未完成配對'],['最長連續配對',`${this.memoryBestStreak||0} 對`]];
    },
    lobbyPoints() {
        if(this.kind==='defense')return this.endless
            ? ['三條命，不限時，挑戰最高分與波次。','滑動命中目標；石頭別滑，重擊等全亮。','每十波加速，後段加入旋轉與順序防守。']
            : ['90 秒連續防守，挑戰最高分。','滑動命中目標、避開石頭；重擊等全亮。','後段加入旋轉防守；失誤扣分，繼續挑戰。'];
        return this.endless
            ? ['三條命，不限時，挑戰更多盤。',`配錯累積 ${this.memoryMistakeLimit()} 格扣命；配對消一格，換盤清空。`,'後段有眨眼與換位；換位前會先通知。']
            : ['90 秒連續配對，挑戰最高分。','每對 +10 分，完成一盤再 +20 分。','配錯亮紅燈，三盞扣分；記憶與換盤不扣時間。'];
    },
    showInfo(kind, variant = 'timed') {
        this.stop();
        this.replayPracticeOrder = null;
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
        document.getElementById('challenge-lobby-points').innerHTML=this.lobbyPoints().map(point=>`<li>${point}</li>`).join('');
        document.getElementById('challenge-lobby-best').textContent = this.bestLabel(kind,this.mode);
    },
    stop() {
        this.clearDefenseWind();
        this.clearMemoryInterference();
        this.generation++;
        this.active = false;
        this.practiceOrder = null;
        this.practiceKind = null;
        this.session?.dispose();
        this.session = null;
        this.hud?.remove(); this.hud = null;
        this.hudParts = null;
        this.memoryHudParts = null;
        document.getElementById('game-container')?.classList.remove('timed-challenge');
        document.getElementById('game-wrapper')?.classList.remove('challenge-active');
    },
    exit() {
        const practice=this.isPractice;
        this.stop();
        window.LoadingManager?.cancel();
        window.GameEngine?.stopMinigame();
        showScene('level-select');
        if(practice){window.WorldSwitch?.setNight(true);window.WorldSwitch?.setDirectory('practice');document.getElementById('directory-practice-tab')?.focus();}
    },
    confirmExit() {
        const pause = window.GamePause;
        if (!pause || !['paused','confirm-exit'].includes(pause.phase)) return;
        if (this.exitConfirmed && pause.phase === 'confirm-exit') { this.exit(); return; }
        pause.phase = 'confirm-exit';
        this.exitConfirmed = true;
        document.getElementById('game-pause-status').textContent = this.isPractice?'要離開練習，返回練習選單嗎？':'要返回挑戰目錄嗎？本次成績不會保存。';
        document.getElementById('game-pause-exit').textContent = '確認返回';
        document.getElementById('game-pause-resume').textContent = '取消';
        document.getElementById('game-pause-resume').focus();
    },
    resetExitConfirmation() {
        this.exitConfirmed = false;
        document.getElementById('game-pause-exit').textContent = this.isPractice?'返回練習選單':'返回挑戰目錄';
    },
    requestExit() {
        if (!this.active) return;
        window.GamePause?.pause();
        // 暫停視窗已提供返回入口，讓取消時仍由繼續按鈕恢復。
    },
    start(options = {}) {
        const practiceKind=['heavy','aoe','visible','memory'].includes(options.practiceKind)?options.practiceKind:null;
        const practiceOrder=practiceKind?(['visible','memory'].includes(practiceKind)?practiceKind:null):['visible','memory','stone','memory-stone'].includes(options.practiceOrder)?options.practiceOrder:null;
        this.stop();
        this.practiceOrder = this.replayPracticeOrder = practiceOrder;
        this.practiceKind=practiceKind;
        window.GameEngine.stopMinigame();
        this.active = true;
        document.getElementById('game-wrapper').classList.add('challenge-active');
        this.remaining = 90000;
        this.elapsed = 0;
        this.lives = 3;
        this.ending = false;
        this.damagedAttack = null;
        this.memoryMistakes = this.memoryErrors = 0;
        this.resetFeedback();
        this.lastLossReason = '';
        this.feedbackId = 0;
        this.nextWindWave = 41;
        this.score = this.pairs = this.boards = this.penalties = this.successes = 0;
        this.aoeMilestone = 0;
        this.session = new window.MinigameSession();
        const run = this.generation;
        this.background = this.kind === 'defense' ? window.ChallengeScenes.pickBackground() : 'assets/images/minigames/memory/background.png';
        const assets = this.kind === 'defense'
            ? [...window.MinigameAssets.getDefensePreloadUrls(), 'assets/images/characters/challenge-player.png']
            : [...window.MinigameAssets.getMemoryPreloadUrls(), this.background];
        if (this.endless) assets.push('assets/images/ui/heart.png');
        window.LoadingManager.showAndLoad(assets, () => {
            if (!this.active || run !== this.generation) return;
            showScene('challenge-countdown');
            const owner = {container:document.getElementById('challenge-countdown'),session:this.session};
            window.GamePause.attach(owner, this.kind);
            let count = (this.practiceOrder||this.isPractice) ? 0 : 3;
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
            const config = {...base, bgImage:this.background, playerImage:'assets/images/characters/challenge-player.png', attackPatterns:[],flow:{...base.flow,randomizeAfter:0}};
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
            game.player.innerHTML = '<svg viewBox="48 21 150 229" width="100%" height="100%" aria-label="挑戰角色" role="img"><image href="assets/images/characters/challenge-player.png" width="250" height="250"/></svg>';
        }
        this.hud?.remove();
        this.hud = document.createElement('div');
        this.hud.className = 'challenge-live-hud';
        this.hudParts = null;
        this.memoryHudParts = null;
        if(this.isPractice){
            root.classList.add('defense-endless-game');this.hud.className='practice-live-hud';
            this.hud.innerHTML='<span class="practice-live-label">'+this.practiceLabel()+'</span>';
            root.appendChild(this.hud);return;
        }
        if (this.kind === 'defense') {
            root.classList.add('defense-endless-game');
            this.hud.classList.add('defense-endless-hud');
            const vitality = this.endless ? `<span class="challenge-hearts" role="img">${[0,1,2].map(()=>'<img src="assets/images/ui/heart.png" alt="">').join('')}</span><span class="endless-mark" aria-hidden="true">∞</span>` : '<span class="defense-challenge-time"></span>';
            this.hud.innerHTML = `<div class="endless-score-card"><div class="endless-vitality">${vitality}</div><div class="endless-score-line"><strong class="endless-score-value"></strong><span>分</span></div></div><div class="endless-wave-card"><span class="endless-stage"></span><div class="endless-wave-line"><strong class="endless-wave-value"></strong><span>波</span></div><div class="endless-wave-ticks" aria-hidden="true" ${this.endless?'':'hidden'}>${'<i></i>'.repeat(10)}</div>${this.endless?'<div id="defense-response-meter" class="defense-response-meter" role="progressbar" aria-label="本波作答剩餘時間" hidden><div class="defense-response-fill"></div></div>':''}</div><div class="defense-wave-feedback" role="status" hidden></div>`;
            this.hudParts = {
                hearts:this.hud.querySelector('.challenge-hearts'),
                time:this.hud.querySelector('.defense-challenge-time'),
                score:this.hud.querySelector('.endless-score-value'),
                stage:this.hud.querySelector('.endless-stage'),
                wave:this.hud.querySelector('.endless-wave-value'),
                feedback:this.hud.querySelector('.defense-wave-feedback'),
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
            const vitality = this.endless ? `<span class="challenge-hearts" role="img">${[0,1,2].map(()=>'<img src="assets/images/ui/heart.png" alt="">').join('')}</span><span class="memory-mistake-meter" role="img">${'<i></i>'.repeat(this.memoryMistakeLimit())}</span>` : '<strong class="memory-challenge-time"></strong>';
            this.hud.innerHTML = `<span class="memory-challenge-vitality">${vitality}</span><span class="memory-challenge-score"><strong></strong><small>分</small></span><span class="memory-challenge-board"></span>`;
            this.memoryHudParts = {hearts:this.hud.querySelector('.challenge-hearts'),mistakes:this.hud.querySelector('.memory-mistake-meter'),time:this.hud.querySelector('.memory-challenge-time'),score:this.hud.querySelector('.memory-challenge-score strong'),board:this.hud.querySelector('.memory-challenge-board')};
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
        if (this.kind==='memory' && this.endless) this.setupMemoryInterference(game);
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
        if (!this.hud || this.isPractice) return;
        if (this.kind === 'memory' && this.memoryHudParts) {
            const parts = this.memoryHudParts;
            if (parts.hearts) {
                parts.hearts.setAttribute('aria-label',`剩餘 ${this.lives} 條命`);
                [...parts.hearts.children].forEach((heart,index)=>heart.classList.toggle('heart-lost',index>=this.lives));
            }
            if (parts.mistakes) {
                parts.mistakes.setAttribute('aria-label',`失誤 ${this.memoryMistakes || 0}／${this.memoryMistakeLimit()} 格`);
                [...parts.mistakes.children].forEach((tick,index)=>tick.classList.toggle('is-lit',index<(this.memoryMistakes||0)));
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
            const stageLabel = this.practiceOrder ? '測試 · 不存紀錄' : this.endless ? `階段 ${String(stage).padStart(2,'0')}` : '連續防守';
            if (parts.stage.textContent !== stageLabel) parts.stage.textContent = stageLabel;
            const waveLabel = wave.toLocaleString('zh-TW');
            if (parts.wave.textContent !== waveLabel) parts.wave.textContent = waveLabel;
            parts.ticks.forEach((tick,index)=>tick.classList.toggle('is-lit',index<=(wave-1)%10));
            this.hud.classList.toggle('challenge-time-warning',this.endless ? this.lives===1 : this.remaining<=10000);
            return;
        }
        if (this.endless) {
            const stage = this.kind === 'memory' ? this.boards+1 : Math.floor(Math.max(0,(this.game?.waveNumber || 1)-1)/10)+1;
            this.hud.innerHTML = `<span class="challenge-hearts" role="img" aria-label="剩餘 ${this.lives} 條命">${[0,1,2].map(i=>`<img src="assets/images/ui/heart.png" alt="" class="${i<this.lives?'':'heart-lost'}">`).join('')}</span><span>${this.score} 分 · ${this.kind === 'memory' ? `第 ${stage} 盤` : `階段 ${stage}`}</span>`;
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
        if(this.isPractice)return this.practiceLabel()+' · 不計分、不扣生命';
        if (!this.active || !this.endless) return '';
        return `得分 ${this.score.toLocaleString('zh-TW')} 分　·　${this.kind==='defense'?`第 ${this.game?.waveNumber || 0} 波`:`完成 ${this.boards} 盤`}`;
    },
    nextAttack(game) {
        const elapsed = 90000-this.remaining;
        const wave = (game.waveNumber || 0)+1;
        if (this.active && this.endless && !this.isPractice && this.kind==='defense') window.GameMusic?.setPlaybackRate?.(this.defenseMusicRate(wave),'defense');
        const stage = this.isPractice?0:Math.floor((wave-1)/10);
        const speed = this.defenseSpeed(stage,elapsed);
        const dueAOE = this.practiceKind==='aoe' || (!this.isPractice && !this.practiceOrder && (this.endless ? wave >= 30 && wave%10===0 : elapsed >= [25000,60000][this.aoeMilestone || 0]));
        const level = dueAOE ? 3 : this.practiceKind==='heavy'?2:1+Math.floor(Math.random()*3);
        const source = window.DefenseLevels[level][this.mode];
        const allowed = dueAOE ? ['AOE'] : this.practiceKind==='heavy'?['HEAVY']:this.endless
            ? stage===0 ? ['NORMAL'] : stage===1 ? ['NORMAL','MULTI','MULTI_MIXED'] : ['NORMAL','MULTI','MULTI_MIXED','HEAVY']
            : elapsed<20000 ? ['NORMAL','MULTI'] : ['NORMAL','MULTI','MULTI_MIXED','HEAVY'];
        const pool = source.attackPatterns.filter(a => allowed.includes(a.type));
        const attack = JSON.parse(JSON.stringify(pool[Math.floor(Math.random()*pool.length)]));
        const minimum = this.mode === 'child' ? 2400 : 1700;
        if (dueAOE) { this.aoeMilestone=(this.aoeMilestone||0)+1;attack.points=400; }
        else if (!this.endless && attack.wait) attack.wait = Math.max(minimum,attack.wait*(elapsed>60000?.78:elapsed>20000?.9:1));
        if (this.endless && !this.isPractice) {
            // 僅在新波次調整，旋轉與重擊保留較長的操作時間。
            const floor = attack.type==='AOE' ? (this.mode==='child'?3400:2600) : speed.minimumWait;
            attack.wait = Math.max(floor,Math.round(attack.wait * speed.factor));
            if (['MULTI','MULTI_MIXED'].includes(attack.type)) {
                const targets = (attack.correctDirs || attack.dirs).length;
                attack.wait = Math.max(attack.wait,speed.minimumWait + Math.max(0,targets-1)*(this.mode==='child'?300:260));
            }
            game.levelConfig = {...game.levelConfig,flow:{...game.levelConfig.flow,prepareTime:speed.prepareTime,successGap:speed.gap}};
        }
        // 旋轉錨點保留；特殊波之間穿插普通波，避免每波都增加規則。
        if(this.endless && (this.practiceOrder || (!this.isPractice && !dueAOE && wave>=41 && (wave%10===1 || (wave>=81 && wave%10===6))))) {
            const mode=this.practiceOrder || (wave<61?'visible':wave<81?(wave%20===1?'memory':'visible'):wave<101?(wave%10===1?'stone':'memory'):['memory-stone','visible','memory','stone'][Math.floor((wave-101)/5)%4]);
            const dirs=['up','right','down','left'];
            for(let i=dirs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[dirs[i],dirs[j]]=[dirs[j],dirs[i]];}
            Object.assign(attack,{type:'ORDER',orderMode:mode,dirs:dirs.slice(0,this.practiceOrder||wave>=81?3:2),
                text:{visible:'順序防守 · 依照編號滑動',memory:'記憶順序 · 先記住編號，再依序接住',stone:'順序辨識 · 依序接目標，避開石頭','memory-stone':'記憶辨識 · 記住順序，也要避開石頭'}[mode],
                wait:this.mode==='child'?2600:1900});
            attack.stoneDirs=mode.includes('stone')?[dirs[3]]:[];
            attack.orderPreview=mode.startsWith('memory')?(this.mode==='child'?2200:1600):0;
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
    defenseMusicRate(wave) {
        return 1 + Math.min(8,Math.floor(Math.max(0,wave-1)/10))*.02;
    },
    clearDefenseWind(owner) {
        const wind=this.defenseWind;
        if (!wind || (owner && wind.game!==owner)) return;
        this.defenseWind=null;
        wind.clock.clearTimeout(wind.timer);
        wind.node.remove();
    },
    onDefenseWaveStarted(game, attack) {
        if (this.isPractice || !this.active || !this.endless || this.kind!=='defense' || this.game!==game || game.challenge!==this || this.ending) return;
        if (attack!==game.currentAttack || attack.finished) return;
        // 重擊與旋轉需要完整視線；既有落葉也在這些題型開始前收起。
        if (!['NORMAL','MULTI','MULTI_MIXED'].includes(attack.type) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            this.clearDefenseWind();return;
        }
        if (window.GamePause?.paused || document.hidden || this.defenseWind || game.waveNumber<(this.nextWindWave??41) || !game.container?.appendChild) return;
        const node=document.createElement('div');
        node.className='defense-night-wind';node.setAttribute('aria-hidden','true');
        node.innerHTML='<div class="defense-wind-lane wind-upper-left"><i class="defense-wind-leaf"></i></div><div class="defense-wind-lane wind-lower-right"><i class="defense-wind-leaf"></i></div>';
        game.container.appendChild(node);
        const wind={game,node,clock:game.clock,timer:null};
        this.defenseWind=wind;
        this.nextWindWave=game.waveNumber+20;
        wind.timer=wind.clock.setTimeout(()=>{if(this.defenseWind===wind)this.clearDefenseWind();},2200);
    },
    memoryCloudInterval() {
        const base=this.mode==='child'?6500:4500;
        return Math.max(3000,base-Math.min(1500,this.boards*100))+Math.floor(Math.random()*4000);
    },
    clearMemoryInterference(owner) {
        const effect=this.memoryInterference;
        if (!effect || (owner && effect.game!==owner)) return;
        this.memoryInterference=null;
        effect.timers.forEach(id=>effect.session.clearTimer(id));
        if (window.GamePause?.animations) window.GamePause.animations=window.GamePause.animations.filter(animation=>!effect.animations.includes(animation));
        effect.animations.forEach(animation=>animation.cancel());
        effect.swapCards?.forEach(card=>card.classList.remove('memory-wind-selected'));
        effect.node.remove();effect.notice.remove();
        if (effect.game.session===effect.session) {
            effect.game.interferenceLocked=false;
            if(effect.locked && effect.game.gameActive && !effect.game.isMemorizing)effect.game.canFlip=true;
        }
    },
    setupMemoryInterference(game) {
        if (this.memoryInterference?.session===game.session) return;
        this.clearMemoryInterference();
        if (!this.active || !this.endless || this.kind!=='memory' || this.boards<1 || !game.session?.ownNode || !game.grid?.appendChild) return;
        const session=game.session,run=this.generation;
        const node=document.createElement('div');
        node.className='memory-blink-cover';node.hidden=true;node.dataset.effect='blink';node.setAttribute('aria-hidden','true');
        node.innerHTML='<div class="memory-blink-shutter memory-blink-top"></div><div class="memory-blink-shutter memory-blink-bottom"></div>';
        session.ownNode(node);game.grid.appendChild(node);
        const notice=document.createElement('div');notice.className='memory-swap-notice';notice.hidden=true;
        notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
        notice.innerHTML='<strong>背牌即將換位</strong>';
        notice.style.animationDuration=this.mode==='child'?'1500ms':'1100ms';
        session.ownNode(notice);game.container.appendChild(notice);
        const cards=()=>Array.from(game.grid.querySelectorAll('.memory-card'));
        cards().forEach((card,index)=>card.style.order=String(index));
        const effect=this.memoryInterference={game,session,node,notice,timers:new Set(),animations:[],blinkCount:0,blinkToken:0,blinkBlockedUntil:0,swapCount:0,swapLimit:this.boards>=6?1+Math.floor(Math.random()*2):1,locked:false};
        const current=()=>this.active && this.endless && this.kind==='memory' && game.challenge===this && !this.ending && run===this.generation && this.memoryInterference===effect && game.session===session && !session.disposed && game.gameActive;
        const later=(fn,ms)=>{let id=session.timeout(()=>{effect.timers.delete(id);if(current())fn();},ms);effect.timers.add(id);};
        const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const available=()=>cards().filter(card=>card.style.visibility!=='hidden' && !card.classList.contains('matched'));
        const visible=()=>!document.hidden && !window.GamePause?.paused && !game.isMemorizing;
        const finish=()=>{
            effect.animations.forEach(animation=>animation.cancel());effect.animations=[];
            effect.swapCards?.forEach(card=>card.classList.remove('memory-wind-selected'));effect.swapCards=null;
            notice.hidden=true;
            if(effect.locked){game.interferenceLocked=false;game.canFlip=true;effect.locked=false;}
            effect.blinkBlockedUntil=session.clock.now()+1200;
            if(effect.swapCount<effect.swapLimit)later(warnSwap,swapDelay());
        };
        const swapDelay=()=> {
            const child=this.mode==='child';
            if(this.boards>=6)return (effect.swapCount===0?(child?2400:1800):(child?3200:2200))+Math.floor(Math.random()*(child?1600:1200));
            if(this.boards>=3)return (child?4500:3500)+Math.floor(Math.random()*2000);
            return (child?8000:6000)+Math.floor(Math.random()*(child?6000:5000));
        };
        const blink=()=>{
            // 眨眼完全不改操作旗標，也不等待翻牌或配對判定。
            if(visible() && !effect.locked && session.clock.now()>=effect.blinkBlockedUntil && !reduced()) {
                const token=++effect.blinkToken;
                effect.blinkCount++;node.hidden=false;node.dataset.phase='idle';void node.offsetWidth;node.dataset.phase='closing';
                later(()=>{if(token!==effect.blinkToken)return;node.dataset.phase='opening';later(()=>{if(token===effect.blinkToken)node.hidden=true;},380);},560);
            }
            later(blink,this.memoryCloudInterval());
        };
        const move=()=>{
            if(reduced()){finish();return;}
            const pool=available().filter(card=>!card.classList.contains('is-flipped'));
            if(pool.length<3){finish();return;}
            const a=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
            const others=pool.filter(card=>card.dataset.symbol!==a.dataset.symbol);
            const b=others[Math.floor(Math.random()*others.length)];
            if(!b){finish();return;}
            notice.hidden=true;effect.swapCards=[a,b];
            const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),dx=br.left-ar.left,dy=br.top-ar.top;
            effect.swapCards.forEach(card=>card.classList.add('memory-wind-selected'));
            const duration=this.mode==='child'?1200:1000;
            for(const [card,x,y,arc] of [[a,dx,dy,-18],[b,-dx,-dy,18]]) {
                effect.animations.push(card.animate([{transform:'translate(0,0)',offset:0},{transform:'translate(0,0)',offset:.15},{transform:`translate(${x/2}px,${y/2+arc}px)`,offset:.6},{transform:`translate(${x}px,${y}px)`,offset:1}],{duration,easing:'ease-in-out',fill:'forwards'}));
            }
            later(()=>{const order=a.style.order;a.style.order=b.style.order;b.style.order=order;finish();},duration);
        };
        const fold=()=>{
            if(reduced()){finish();return;}
            notice.hidden=true;
            // 只蓋回玩家尚未組成一對的單張牌，不呼叫配對判定或失誤處理。
            const single=game.flippedCards[0];
            if(single){single.classList.remove('is-flipped');game.flippedCards=[];}
            later(move,single?550:0);
        };
        const warnSwap=()=>{
            if(reduced())return;
            if(!visible() || !game.canFlip || game.flippedCards.length>1){later(warnSwap,250);return;}
            if(available().length<3)return;
            effect.swapCount++;effect.locked=true;game.interferenceLocked=true;game.canFlip=false;
            effect.blinkToken++;node.dataset.phase='idle';
            game.clearKnownHint?.();node.hidden=true;notice.hidden=false;
            later(fold,this.mode==='child'?1500:1100);
        };
        if(!reduced()){later(blink,this.memoryCloudInterval());later(warnSwap,swapDelay());}
    },
    paired() {
        if (!this.active || this.ending) return;
        this.pairs++;this.score+=10;
        this.memoryPairStreak=(this.memoryPairStreak||0)+1;this.memoryBestStreak=Math.max(this.memoryBestStreak||0,this.memoryPairStreak);
        if (this.endless && this.kind==='memory' && this.memoryMistakes>0) {
            this.memoryMistakes--;
            if (this.game?.statusText) this.game.statusText.innerText='配對成功，消除一格失誤';
        }
        this.updateHUD();
    },
    memoryMistakeLimit() { return this.mode==='child'?4:3; },
    memoryMiss() {
        if (!this.active || this.kind!=='memory' || this.ending) return '';
        this.memoryErrors=(this.memoryErrors||0)+1;
        this.memoryPairStreak=0;
        if(!this.endless)return '';
        this.memoryMistakes=(this.memoryMistakes||0)+1;
        let message=`失誤 ${this.memoryMistakes}／${this.memoryMistakeLimit()}`;
        if (this.memoryMistakes>=this.memoryMistakeLimit()) {
            this.memoryMistakes=0;this.lastLossReason='失誤累積達上限';this.loseLife();
            message=`失去一命，還有 ${this.lives} 條命`;
        }
        this.updateHUD();return message;
    },
    penalty() { if(this.active){this.penalties++;this.score=Math.max(0,this.score-10);this.updateHUD();} },
    loseLife(attack) {
        if (!this.active || !this.endless || this.ending || this.isPractice) return;
        if (this.kind === 'defense' && (!attack || attack !== this.game?.currentAttack || attack.finished)) return;
        if (attack && this.damagedAttack === attack) return;
        this.damagedAttack = attack || null;
        this.lives = Math.max(0,this.lives-1);
        this.penalties++;
        if (this.kind==='defense') {
            this.clearDefenseWind();
            this.lastLossReason=attack.lossReason || '本波漏接';
            const feedback=this.hudParts?.feedback;
            if (feedback) {
                const notice=++this.feedbackId,run=this.generation;
                feedback.textContent=`${this.lastLossReason} · 失去一命`;
                feedback.hidden=false;
                this.liveClock.setTimeout(()=>{if(this.active&&run===this.generation&&notice===this.feedbackId)feedback.hidden=true;},700);
            }
        }
        this.updateHUD();
        if (this.lives === 0) {
            this.ending = true;
            // 等當次輸入處理完畢才清理 DOM，避免舊手勢繼續寫入結算畫面。
            const run = this.generation;
            this.liveClock.setTimeout(()=>{if(this.active && this.generation===run)this.finish();},700);
        }
    },
    boardComplete(game) {
        this.consumeTime();
        if (!this.active || this.ending) return;
        this.liveClock.clearInterval(this.liveTimer); this.liveClock=null;
        this.boards++; this.score+=20;
        if (this.endless) this.memoryMistakes=0;
        game.challenge.changingBoard=true;
        this.launchMemory();
        this.changingBoard=false;
    },
    finish() {
        if (!this.active) return;
        const practice=!!this.practiceOrder||this.isPractice;
        const old = this.bestRecord(this.kind,this.mode);
        const score = this.kind==='defense' ? Math.max(0,this.game.score) : this.score;
        const detail = this.endless
            ? `${this.kind==='defense' ? `進入第 ${this.game.waveNumber} 波` : `完成 ${this.boards} 盤・配對 ${this.pairs} 對・配錯 ${this.memoryErrors||0} 次`}・生命耗盡${this.lastLossReason?`：${this.lastLossReason}`:''}`
            : this.kind==='defense' ? `處理結果：${this.game.mistakes} 次失誤` : `完成 ${this.boards} 盤・配對 ${this.pairs} 對・紅燈懲罰 ${this.penalties} 次`;
        const progress=this.kind==='defense'?this.game.waveNumber:this.boards;
        const best = practice ? old : this.bestRecord(this.kind,this.mode,score,progress);
        const feedback=this.feedbackItems();
        const improved=!practice && (score>old.score||(score===old.score&&progress>(old.progress??-1)));
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
        document.getElementById('challenge-final-detail').textContent=(practice?'測試模式，不保存紀錄 · ':'')+detail;
        document.getElementById('challenge-final-feedback').innerHTML=feedback.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
        document.getElementById('challenge-final-best').textContent=`${improved?'新紀錄！　':''}${this.bestLabel(this.kind,this.mode,best)}`;
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
        document.getElementById('challenge-play-again').addEventListener('click',()=>this.start({practiceOrder:this.replayPracticeOrder}));
        document.querySelectorAll('[data-challenge-exit]').forEach(b=>b.addEventListener('click',()=>this.exit()));
    }
};
document.addEventListener('DOMContentLoaded',()=>window.TimedChallenge.init());

// 只由 Console 主動呼叫；不覆寫引擎方法，也不持久化測試設定。
window.GameTest = {
    order(mode = 'visible') {
        if(!['visible','memory','stone','memory-stone'].includes(mode))throw new Error('使用 visible、memory、stone 或 memory-stone');
        const challenge=window.TimedChallenge;
        challenge.showInfo('defense','endless');challenge.start({practiceOrder:mode});
        return `順序測試：${mode}；會連續出同類題，三條命，不保存最佳紀錄。GameTest.stop() 可離開。`;
    },
    stop() {
        if(!window.TimedChallenge.practiceOrder)return false;
        window.TimedChallenge.replayPracticeOrder=null;window.TimedChallenge.exit();return true;
    }
};
