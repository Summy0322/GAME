// js/minigames/DefenseGameV2.js
// 防禦遊戲 V2 - 支援年齡模式雙版本

const DefenseGameV2 = {
    // ========== 狀態定義 ==========
    states: {
        IDLE: 'IDLE',
        PREPARING: 'PREPARING',
        NORMAL: 'NORMAL',
        MULTI: 'MULTI',
        HEAVY_CHARGING: 'HEAVY_CHARGING',
        HEAVY_FLYING: 'HEAVY_FLYING',
        AOE_ACTIVE: 'AOE_ACTIVE',
        RESULT: 'RESULT'
    },
    
    state: 'IDLE',
    
    // 遊戲狀態
    gameActive: false,
    onCompleteCallback: null,
    
    // DOM 元素
    container: null,
    stage: null,
    player: null,
    
    // 關卡設定（從外部檔案載入）
    levels: window.DefenseLevels || {},
    
    // 遊戲數據
    combo: 0,
    score: 0,
    maxScore: 0,
    mistakes: 0,
    currentAttack: null,
    attackQueue: [],
    
    // 物件追蹤
    enemies: [],
    projectiles: [],
    multiProjectiles: [],
    heavySequence: [],
    heavyProjectiles: [],
    
    // 觸控相關
    touchStart: { x: 0, y: 0 },
    lastSwipeTime: 0,
    
    // 旋轉相關
    rotationAccumulator: { totalAngle: 0, lastAngle: 0 },
    
    // 計時器
    timers: [],
    aoeTimers: [],  // AOE 專用計時器
    lightIntervals: { up: null, down: null, left: null, right: null },
    
    // AOE 相關
    aoeLines: ['up', 'down', 'left', 'right'],
    
    // 螢幕縮放比例
    scale: 1,
    
    // 固定座標
    basePositions: {
        up: { x: 0, y: -430 },
        down: { x: 0, y: 430 },
        left: { x: -465, y: 0 },
        right: { x: 465, y: 0 }
    },
    
    // 尺寸設定
    baseSizes: {
        player: 250,
        enemy: 150,
        projectile: 80,
        heavySequence: 80,
        heavyHorizontal: { width: 800, height: 100 },
        heavyVertical: { width: 100, height: 800 },
        aoeLine: { 
            horizontal: 135,    // 上下線條的高度
            vertical: 135       // 左右線條的寬度（旋轉後）
        },
        shieldHorizontal: { width: 632, height: 175 },
        shieldVertical: { width: 175, height: 632 }
    },
    
    // 分數權重
    scoreWeights: {
        NORMAL: 100,
        MULTI: 50,
        HEAVY: 150,
        AOE: 200
    },
    
    // ========== 軌跡特效屬性 ==========
    trailPoints: [],           // 儲存軌跡點
    trailCanvas: null,         // 軌跡畫布
    trailCtx: null,            // 軌跡畫布上下文
    trailInterval: null,       // 軌跡更新循環
    lastTrailX: null,          // 上一個軌跡點 X
    lastTrailY: null,          // 上一個軌跡點 Y
    trailMinDistance: 12,      // 最小距離（像素），每隔這段距離產生一個點
    
    // 獲取當前年齡模式
    getGameMode: function() {
        // 優先使用 window.gameMode，再來是全域 gameMode
        return window.gameMode || gameMode || 'adult';
    },
    
    // 根據模式取得關卡設定
    getLevelConfig: function(level) {
        const mode = this.getGameMode();
        const levelData = this.levels[level];
        
        if (!levelData) {
            console.error('找不到關卡:', level);
            return this.levels[1];
        }
        
        // 根據模式選擇對應的設定
        if (mode === 'child') {
            return levelData.child || levelData;
        } else {
            return levelData.adult || levelData;
        }
    },
    
    // ========== 輔助函數 ==========
    setState: function(newState) {
        console.log(`🧠 狀態切換: ${this.state} → ${newState}`);
        this.state = newState;
    },
    
    clearAllTimers: function() {
        this.timers.forEach(t => {
            if (t) clearTimeout(t);
        });
        this.timers = [];
        
        ['up', 'down', 'left', 'right'].forEach(dir => {
            if (this.lightIntervals[dir]) {
                clearInterval(this.lightIntervals[dir]);
                this.lightIntervals[dir] = null;
            }
        });
    },
    
    getScaledValue: function(baseValue) {
        return baseValue * this.scale;
    },
    
    getScaledPos: function(basePos) {
        return {
            x: basePos.x * this.scale,
            y: basePos.y * this.scale
        };
    },
    
    // ========== 初始化 ==========
    start: function(options) {
        const mode = this.getGameMode();
        console.log(`🎮 防禦遊戲 V2 開始，關卡: ${options.level || 1}，模式: ${mode === 'child' ? '小朋友版' : '一般版'}`);
        
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        this.scale = Math.min(containerWidth / 1920, containerHeight / 1080);
        
        this.gameActive = true;
        this.onCompleteCallback = options.onComplete;
        this.currentLevel = options.level || 1;
        
        this.shieldCooldown = { up: false, down: false, left: false, right: false };
        
        // 使用新的方法載入關卡設定
        this.levelConfig = this.getLevelConfig(this.currentLevel);
        
        this.combo = 0;
        this.score = 0;
        this.mistakes = 0;
        this.maxScore = this.calculateMaxScore();
        
        this.createUI();
        this.initEventListeners();
        this.initTrailCanvas();  // ✅ 初始化軌跡畫布
        
        // ✅ 啟動軌跡更新循環（每 16ms 更新一次，約 60fps）
        if (this.trailInterval) clearInterval(this.trailInterval);
        this.trailInterval = setInterval(() => {
            this.updateTrail();
        }, 16);
        
        this.setState(this.states.IDLE);
        setTimeout(() => this.startAttackSequence(), 1000);
    },
    
    calculateMaxScore: function() {
        if (!this.levelConfig || !this.levelConfig.attackPatterns) return 0;
        const patterns = this.levelConfig.attackPatterns;
        let max = 0;
        for (const attack of patterns) {
            if (attack.type === 'NORMAL') {
                max += this.scoreWeights.NORMAL;
            } else if (attack.type === 'MULTI') {
                max += this.scoreWeights.MULTI * attack.dirs.length;
            } else if (attack.type === 'HEAVY') {
                max += this.scoreWeights.HEAVY;
            } else if (attack.type === 'AOE') {
                max += this.scoreWeights.AOE;
            }
        }
        return max;
    },
    
    // 原有的 loadLevel 方法改為直接使用 levelConfig
    loadLevel: function(level) {
        // 此方法已整合到 start 中，保留以維持相容性
        this.levelConfig = this.getLevelConfig(level);
        if (!this.levelConfig) {
            console.error('找不到關卡設定:', level);
            this.levelConfig = this.getLevelConfig(1);
        }
    },
    
    createUI: function() {
        const cfg = this.levelConfig;
        const gameCanvas = document.getElementById('gameCanvas');
        
        // 修正：確保有有效的父元素
        let parentElement = gameCanvas?.parentElement;
        if (!parentElement) {
            parentElement = document.getElementById('game-wrapper');
            if (!parentElement) {
                parentElement = document.body;
            }
            console.warn('⚠️ gameCanvas.parentElement 不存在，改用:', parentElement.id || 'body');
        }
        
        const playerSize = this.getScaledValue(this.baseSizes.player);
        const enemySize = this.getScaledValue(this.baseSizes.enemy);
        const projSize = this.getScaledValue(this.baseSizes.projectile);
        const seqSize = this.getScaledValue(this.baseSizes.heavySequence);
        
        const posUp = this.getScaledPos(this.basePositions.up);
        const posDown = this.getScaledPos(this.basePositions.down);
        const posLeft = this.getScaledPos(this.basePositions.left);
        const posRight = this.getScaledPos(this.basePositions.right);
        
        const shieldHor = {
            width: this.getScaledValue(this.baseSizes.shieldHorizontal.width),
            height: this.getScaledValue(this.baseSizes.shieldHorizontal.height)
        };
        const shieldVer = {
            width: this.getScaledValue(this.baseSizes.shieldVertical.width),
            height: this.getScaledValue(this.baseSizes.shieldVertical.height)
        };
        
        // 計算 AOE 尺寸
        const aoeHeight = this.getScaledValue(this.baseSizes.aoeLine.horizontal);  // 上下線條高度
        const aoeWidth = this.getScaledValue(this.baseSizes.aoeLine.vertical);     // 左右線條寬度
        
        const msgFontSize = Math.max(16, Math.min(28, 28 * this.scale));
        const comboFontSize = Math.max(14, Math.min(24, 24 * this.scale));
        const hintFontSize = Math.max(10, Math.min(14, 14 * this.scale));
        const resultTextFontSize = Math.max(28, Math.min(48, 48 * this.scale));
        const resultScoreFontSize = Math.max(18, Math.min(32, 32 * this.scale));
        const resultMistakesFontSize = Math.max(14, Math.min(24, 24 * this.scale));
        const resultBtnFontSize = Math.max(14, Math.min(24, 24 * this.scale));
        
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 1000; background: #000; overflow: hidden;
        `;
        
        this.container.innerHTML = `
            <div id="defense-stage" style="width:100%; height:100%; background:url('${cfg.bgImage}') center/cover; position:relative;">
                <div id="defense-player" style="position:absolute; top:50%; left:50%; width:${playerSize}px; height:${playerSize}px; transform:translate(-50%,-50%); background:url('${cfg.playerImage}') center/contain no-repeat;"></div>
                
                <div id="shield-up" style="position:absolute; left:50%; top:calc(50% - ${-posUp.y}px); width:${shieldHor.width}px; height:${shieldHor.height}px; transform:translate(-50%,-50%); background:url('${cfg.shieldImage}') center/cover; opacity:0; transition:opacity 0.2s;"></div>
                <div id="shield-down" style="position:absolute; left:50%; bottom:calc(50% - ${posDown.y}px); width:${shieldHor.width}px; height:${shieldHor.height}px; transform:translate(-50%,-50%); background:url('${cfg.shieldImage}') center/cover; opacity:0; transition:opacity 0.2s;"></div>
                <div id="shield-left" style="position:absolute; left:calc(50% - 150px); top:50%; width:${shieldHor.width}px; height:${shieldHor.height}px; transform: translate(-50%,-50%) rotate(90deg); background:url('${cfg.shieldImage}') center/cover; opacity:0; transition:opacity 0.2s;"></div>
                <div id="shield-right" style="position:absolute; left:calc(50% + 150px); top:50%; width:${shieldHor.width}px; height:${shieldHor.height}px; transform: translate(-50%,-50%) rotate(-90deg); background:url('${cfg.shieldImage}') center/cover; opacity:0; transition:opacity 0.2s;"></div>
                
                <div id="aoe-up" style="position:absolute; top:0; left:0; width:100%; height:${aoeHeight}px; background:url('${cfg.aoeLineImage}') center/cover; opacity:0; transform:translateY(0);"></div>
                <div id="aoe-down" style="position:absolute; bottom:0; left:0; width:100%; height:${aoeHeight}px; background:url('${cfg.aoeLineImage}') center/cover; opacity:0; transform:translateY(0);"></div>
                <div id="aoe-left" style="position:absolute; top:50%; left:0; width:100%; height:${aoeWidth}px; transform:translateY(-50%) rotate(90deg); transform-origin:center; background:url('${cfg.aoeLineImage}') center/cover no-repeat; opacity:0;"></div>
                <div id="aoe-right" style="position:absolute; top:50%; right:0; width:100%; height:${aoeWidth}px; transform:translateY(-50%) rotate(-90deg); transform-origin:center; background:url('${cfg.aoeLineImage}') center/cover no-repeat; opacity:0;"></div>
                
                <!-- ✅ 軌跡畫布 -->
                <canvas id="trail-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:15;"></canvas>
                
                <div id="result-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:none; justify-content:center; align-items:center; flex-direction:column; z-index:200; pointer-events:auto;">
                    <div id="result-text" style="font-size:${resultTextFontSize}px; font-weight:bold; text-align:center; margin-bottom:20px;">結果</div>
                    <div id="result-score" style="font-size:${resultScoreFontSize}px; color:#ffd700; margin-bottom:15px;"></div>
                    <div id="result-mistakes" style="font-size:${resultMistakesFontSize}px; color:#ffaa00; margin-bottom:30px;"></div>
                    <button id="result-btn" style="padding:15px 40px; font-size:${resultBtnFontSize}px; background:#e67e22; color:white; border:none; border-radius:10px; cursor:pointer; pointer-events:auto;">繼續</button>
                </div>
            </div>
            <div style="position:absolute; top:2%; left:2%; z-index:110;">
                <div id="defense-msg" style="font-size:${msgFontSize}px; font-weight:bold; color:#ffd700; background:rgba(0,0,0,0.5); display:inline-block; padding:5px 20px; border-radius:30px;">${cfg.name}</div>
            </div>
            <div style="position:absolute; top:2%; right:2%; z-index:110;">
                <div id="defense-combo" style="font-size:${comboFontSize}px; font-weight:bold; color:#00ffaa; background:rgba(0,0,0,0.5); display:inline-block; padding:5px 15px; border-radius:30px;">分數: 0</div>
            </div>
            <div style="position:absolute; bottom:3%; left:0; width:100%; text-align:center; color:#888; font-size:${hintFontSize}px; background:rgba(0,0,0,0.4); padding:5px;">滑動方向發射投射物 · AOE模式需旋轉</div>
        `;
        
        // 修正：確保附加到正確的容器
        if (parentElement) {
            parentElement.appendChild(this.container);
            console.log('✅ 遊戲容器已附加到:', parentElement.id || 'body');
        } else {
            document.body.appendChild(this.container);
            console.log('✅ 遊戲容器已附加到 body');
        }
        
        this.stage = document.getElementById('defense-stage');
        this.player = document.getElementById('defense-player');
        this.msg = document.getElementById('defense-msg');
        this.scoreEl = document.getElementById('defense-combo');
        this.resultOverlay = document.getElementById('result-overlay');
        this.resultText = document.getElementById('result-text');
        this.resultScore = document.getElementById('result-score');
        this.resultMistakes = document.getElementById('result-mistakes');
        this.resultBtn = document.getElementById('result-btn');
        
        const finishGame = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeResultAndComplete();
        };
        this.resultBtn.addEventListener('click', finishGame);
        this.resultBtn.addEventListener('touchstart', finishGame, { passive: false });
        
        this.scaledSizes = { enemy: enemySize, projectile: projSize, heavySequence: seqSize };
        this.scaledPositions = { up: posUp, down: posDown, left: posLeft, right: posRight };
        
        if (gameCanvas) gameCanvas.style.display = 'none';
        this.updateScoreDisplay();
        
        console.log('✅ 遊戲 UI 創建完成，stage 父元素:', this.stage?.parentElement?.id);
    },

    // ========== 軌跡特效方法 ==========
    
    // 初始化軌跡畫布
    initTrailCanvas: function() {
        this.trailCanvas = document.getElementById('trail-canvas');
        if (!this.trailCanvas) return;
        
        this.trailCanvas.width = this.stage.clientWidth;
        this.trailCanvas.height = this.stage.clientHeight;
        this.trailCtx = this.trailCanvas.getContext('2d');
        this.trailPoints = [];
        
        // 設置畫布樣式
        this.trailCanvas.style.width = '100%';
        this.trailCanvas.style.height = '100%';
    },
    
    // 新增軌跡點
    addTrailPoint: function(x, y) {
        if (!this.trailCtx) return;
        
        this.trailPoints.push({
            x: x,
            y: y,
            life: 1.0,        // 生命值，從 1 開始慢慢減少
            createdAt: Date.now()
        });
        
        // 限制軌跡點數量，避免太多
        if (this.trailPoints.length > 100) {
            this.trailPoints.shift();
        }
        
        this.drawTrail();
    },
    
    // 繪製所有軌跡（線條風格）
    drawTrail: function() {
        if (!this.trailCtx || this.trailPoints.length < 2) return;
        
        // 清空畫布
        this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
        
        // 繪製軌跡線條
        for (let i = 0; i < this.trailPoints.length - 1; i++) {
            const p1 = this.trailPoints[i];
            const p2 = this.trailPoints[i + 1];
            
            // 根據生命值計算透明度（越舊的點越透明）
            const alpha = p1.life * 0.7;
            
            this.trailCtx.beginPath();
            this.trailCtx.moveTo(p1.x, p1.y);
            this.trailCtx.lineTo(p2.x, p2.y);
            this.trailCtx.lineWidth = 12;  // 粗細 12px
            this.trailCtx.lineCap = 'round';
            this.trailCtx.lineJoin = 'round';
            this.trailCtx.strokeStyle = `rgba(192, 248, 250, ${alpha})`;  // 淡藍色半透明
            this.trailCtx.stroke();
            
            // 內層更亮的效果
            this.trailCtx.beginPath();
            this.trailCtx.moveTo(p1.x, p1.y);
            this.trailCtx.lineTo(p2.x, p2.y);
            this.trailCtx.lineWidth = 5;
            this.trailCtx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            this.trailCtx.stroke();
        }
    },
    
    // 更新軌跡（每幀減少生命值，0.3秒後消失）
    updateTrail: function() {
        if (!this.trailCtx) return;
        
        const now = Date.now();
        const duration = 100; // 0.3 秒
        
        let changed = false;
        for (let i = this.trailPoints.length - 1; i >= 0; i--) {
            const point = this.trailPoints[i];
            const elapsed = now - point.createdAt;
            
            if (elapsed >= duration) {
                this.trailPoints.splice(i, 1);
                changed = true;
            } else {
                // 根據時間計算生命值（線性衰減）
                point.life = 1 - (elapsed / duration);
            }
        }
        
        if (changed) {
            this.drawTrail();
        }
    },
    
    // 清除所有軌跡
    clearTrail: function() {
        if (this.trailCtx) {
            this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
        }
        this.trailPoints = [];
        this.lastTrailX = null;
        this.lastTrailY = null;
    },
    
    initEventListeners: function() {
        // ✅ touchstart 記錄起始點
        this.container.addEventListener('touchstart', (e) => {
            this.touchStart.x = e.touches[0].clientX;
            this.touchStart.y = e.touches[0].clientY;
            
            // 重置軌跡距離計數
            const rect = this.stage.getBoundingClientRect();
            this.lastTrailX = e.touches[0].clientX - rect.left;
            this.lastTrailY = e.touches[0].clientY - rect.top;
            
            // 立即添加起始點
            this.addTrailPoint(this.lastTrailX, this.lastTrailY);
        });
        
        // ✅ touchmove 記錄軌跡點
        this.container.addEventListener('touchmove', (e) => {
            if (!this.gameActive) return;
            
            const rect = this.stage.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            
            // 檢查距離，避免太密集
            if (this.lastTrailX !== null && this.lastTrailY !== null) {
                const dx = x - this.lastTrailX;
                const dy = y - this.lastTrailY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance >= this.trailMinDistance) {
                    // 在兩點之間插值，確保軌跡連續
                    const steps = Math.ceil(distance / this.trailMinDistance);
                    for (let i = 1; i <= steps; i++) {
                        const t = i / steps;
                        const ix = this.lastTrailX + dx * t;
                        const iy = this.lastTrailY + dy * t;
                        this.addTrailPoint(ix, iy);
                    }
                    this.lastTrailX = x;
                    this.lastTrailY = y;
                }
            } else {
                this.addTrailPoint(x, y);
                this.lastTrailX = x;
                this.lastTrailY = y;
            }
        });
        
        // ✅ touchend 重置
        this.container.addEventListener('touchend', (e) => {
            this.lastTrailX = null;
            this.lastTrailY = null;
        });
        
        this.container.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 0) return;
            const dx = e.changedTouches[0].clientX - this.touchStart.x;
            const dy = e.changedTouches[0].clientY - this.touchStart.y;
            let swipe = null;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > 30) swipe = dx > 0 ? 'right' : 'left';
            } else {
                if (Math.abs(dy) > 30) swipe = dy > 0 ? 'down' : 'up';
            }
            if (swipe && this.gameActive) this.handleSwipe(swipe);
        });
        
        if (window.ZingTouch) {
            const region = new ZingTouch.Region(this.container);
            region.bind(this.container, 'rotate', (e) => this.handleRotate(e));
        }
    },
    
    // ========== 攻擊序列 ==========
    startAttackSequence: function() {
        if (!this.gameActive) return;
        this.attackQueue = [...this.levelConfig.attackPatterns];
        this.processNextAttack();
    },
    
    processNextAttack: function() {
        console.log('processNextAttack 被呼叫, 當前狀態:', this.state);
        
        if (!this.gameActive || this.attackQueue.length === 0) {
            if (this.attackQueue.length === 0 && this.state !== this.states.RESULT) {
                this.setState(this.states.RESULT);
                this.showFinalResult();
            }
            return;
        }
        
        if (this.state !== this.states.IDLE) {
            console.log(`狀態不是 IDLE (${this.state})，等待...`);
            setTimeout(() => this.processNextAttack(), 100);
            return;
        }
        
        const attack = this.attackQueue.shift();
        this.currentAttack = attack;
        
        this.setState(this.states.PREPARING);
        this.msg.innerText = attack.text;
        
        setTimeout(() => {
            this.executeAttack(attack);
        }, 500);
    },
    
    executeAttack: function(attack) {
        console.log('executeAttack 開始，類型:', attack.type);
        
        // ✅ 清除所有舊的 timer（關鍵！防止舊 timer 殺掉新攻擊）
        this.clearAllTimers();
        
        // 清理殘留物件
        this.clearHeavySequence();
        this.clearHeavyProjectiles();
        this.clearEnemies();
        this.clearProjectiles();
        
        switch (attack.type) {
            case 'END':
                console.log('遊戲結束，準備結算');
                this.setState(this.states.RESULT);
                setTimeout(() => {
                    this.showFinalResult();
                }, 500);
                break;
                
            case 'NORMAL':
                this.setState(this.states.NORMAL);
                this.spawnEnemy(attack.dir);
                this.setAttackTimer(attack.wait, attack);
                break;
                
            case 'MULTI':
                this.setState(this.states.MULTI);
                this.currentAttack.hitDirs = [];
                this.currentAttack.hits = 0;
                this.currentAttack.swipedDirs = [];
                this.currentAttack.launchedDirs = [];
                this.currentAttack.pendingProjectiles = [];
                this.currentAttack.wrongDirs = [];
                attack.dirs.forEach(dir => this.spawnEnemy(dir));
                this.setAttackTimer(attack.wait, attack);
                
                // ✅ 新增：設定多重攻擊超時計時器（2秒）
                this.currentAttack.multiTimeout = setTimeout(() => {
                    if (this.state === this.states.MULTI && this.currentAttack && !this.currentAttack.resolved) {
                        console.log('⏰ 多重攻擊超時，清除未發射的投射物');
                        // 清除所有待發射的投射物
                        if (this.currentAttack.pendingProjectiles) {
                            this.currentAttack.pendingProjectiles.forEach(item => {
                                if (item.element && item.element.parentNode) {
                                    item.element.remove();
                                }
                            });
                            this.currentAttack.pendingProjectiles = [];
                        }
                        // 清除已滑動但未發射的紀錄
                        this.currentAttack.swipedDirs = [];
                        // 觸發失敗
                        this.missAttack('未完成所有方向！');
                        this.finishAttack();
                    }
                }, 2000); // 2秒超時
                this.timers.push(this.currentAttack.multiTimeout);
                break;
                
            case 'HEAVY':
                this.setState(this.states.HEAVY_CHARGING);
                this.spawnHeavySequence(attack.dir);
                // 重擊不需要 setAttackTimer，由點亮完成後觸發
                break;
                
            case 'AOE':
                this.setState(this.states.AOE_ACTIVE);
                this.startAOE(attack.wait);
                break;
                
            default:
                console.error('未知攻擊類型:', attack.type);
                this.finishAttack();
        }
    },
    
    setAttackTimer: function(wait, attack) {
        if (!wait || wait <= 0) {
            console.warn('無效的等待時間:', wait);
            return;
        }
        
        console.log(`設定攻擊計時器，等待 ${wait}ms`);
        const timer = setTimeout(() => {
            // 只有當攻擊還沒完成時才觸發 miss
            if ((this.state === this.states.NORMAL || this.state === this.states.MULTI) && 
                this.currentAttack && !this.currentAttack.resolved) {
                console.log(`計時器觸發：${attack.type} 攻擊時間到`);
                this.missAttack('時間到！');
                this.finishAttack();
            }
        }, wait);
        this.timers.push(timer);
        if (this.currentAttack) this.currentAttack.timer = timer;
    },
    
    // ========== 攻擊結束 ==========
    finishAttack: function() {
        console.log('✅ 攻擊結束, 當前狀態:', this.state);
        
        // ✅ 清除多重攻擊的超時計時器
        if (this.currentAttack && this.currentAttack.multiTimeout) {
            clearTimeout(this.currentAttack.multiTimeout);
            this.currentAttack.multiTimeout = null;
        }
        
        // ✅ 清除軌跡
        this.clearTrail();
        
        // ✅ 停止所有敵人的跳動動畫
        this.stopAllEnemiesBounce();

        // ✅ 清除 AOE 專用計時器
        if (this.aoeTimers) {
            this.aoeTimers.forEach(t => {
                if (t) clearTimeout(t);
                if (t) clearInterval(t);
            });
            this.aoeTimers = [];
        }
        // ✅ 清除當前攻擊的 timer（關鍵！防止殘留 timer）
        if (this.currentAttack && this.currentAttack.timer) {
            clearTimeout(this.currentAttack.timer);
            this.currentAttack.timer = null;
        }
        
        // 清除所有殘留
        this.clearEnemies();
        this.clearProjectiles();
        this.clearHeavySequence();
        this.clearHeavyProjectiles();
        
        // 清除點亮間隔
        ['up', 'down', 'left', 'right'].forEach(dir => {
            if (this.lightIntervals[dir]) {
                clearInterval(this.lightIntervals[dir]);
                this.lightIntervals[dir] = null;
            }
        });
        
        // 清除 AOE 線條
        this.aoeLines.forEach(dir => {
            const line = document.getElementById(`aoe-${dir}`);
            if (line) {
                line.style.opacity = '0';
                line.style.transform = 'translate(0,0)';
            }
        });
        
        this.setState(this.states.IDLE);
        
        setTimeout(() => {
            this.processNextAttack();
        }, 500);
    },
    
    // ========== 普通/多重攻擊 ==========
    spawnEnemy: function(dir) {
        const cfg = this.levelConfig;
        const pos = this.scaledPositions[dir];
        const size = this.scaledSizes.enemy;
        const enemy = document.createElement('div');
        enemy.style.cssText = `
            position: absolute; width: ${size}px; height: ${size}px; transform: translate(-50%, -50%);
            background: url('${cfg.enemyImage}') center/contain no-repeat;
            left: calc(50% + ${pos.x}px); top: calc(50% + ${pos.y}px);
            z-index: 100;
        `;
        this.stage.appendChild(enemy);
        
        // ✅ 儲存敵人資訊，加入動畫控制
        const enemyObj = { 
            element: enemy, 
            dir: dir,
            animationId: null,
            isAnimating: true
        };
        
        // ✅ 啟動跳動動畫
        this.startEnemyBounce(enemyObj);
        
        this.enemies.push(enemyObj);
    },

    // ✅ 新增：敵人跳動動畫
    startEnemyBounce: function(enemyObj) {
        if (!enemyObj.isAnimating) return;
        
        let step = 0;
        // 跳動模式: 跳...跳跳...跳...跳跳
        // 使用 setInterval 控制節奏
        const bouncePattern = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0]; // 1=跳, 0=停
        let patternIndex = 0;
        
        const bounceInterval = setInterval(() => {
            if (!enemyObj.isAnimating || !enemyObj.element || !enemyObj.element.parentNode) {
                clearInterval(bounceInterval);
                return;
            }
            
            if (bouncePattern[patternIndex] === 1) {
                // 執行一次跳動
                let bounceStep = 0;
                const maxStep = 10;
                const bounceHeight = 20; // 跳動高度（像素）
                
                const animateBounce = () => {
                    if (!enemyObj.isAnimating || !enemyObj.element) {
                        return;
                    }
                    if (bounceStep < maxStep) {
                        const progress = bounceStep / maxStep;
                        const offsetY = Math.sin(progress * Math.PI) * bounceHeight;
                        enemyObj.element.style.transform = `translate(-50%, calc(-50% - ${offsetY}px))`;
                        bounceStep++;
                        requestAnimationFrame(animateBounce);
                    } else {
                        // 恢復原位
                        enemyObj.element.style.transform = `translate(-50%, -50%)`;
                    }
                };
                animateBounce();
            }
            
            patternIndex = (patternIndex + 1) % bouncePattern.length;
        }, 300); // 每 300ms 檢查一次節奏
        
        enemyObj.animationId = bounceInterval;
    },

    // ✅ 新增：停止敵人跳動動畫
    stopEnemyBounce: function(enemyObj) {
        if (enemyObj) {
            enemyObj.isAnimating = false;
            if (enemyObj.animationId) {
                clearInterval(enemyObj.animationId);
                enemyObj.animationId = null;
            }
            // 恢復原始位置
            if (enemyObj.element) {
                enemyObj.element.style.transform = `translate(-50%, -50%)`;
            }
        }
    },

    // ✅ 重擊方塊跳動動畫（修改為有限次數）
    startHeavyBlockBounce: function(seqObj) {
        if (seqObj.isAnimating) return;
        seqObj.isAnimating = true;
        
        let bounceStep = 0;
        const maxStep = 30;  // 跳動次數（來回15次）
        const bounceHeight = 15;
        
        const animateBounce = () => {
            if (!seqObj.element || !seqObj.element.parentNode || !seqObj.isAnimating) {
                return;
            }
            
            // 使用正弦波來回跳動
            const offsetY = Math.sin(bounceStep * 0.4) * bounceHeight;
            seqObj.element.style.transform = `translate(-50%, calc(-50% - ${offsetY}px))`;
            bounceStep++;
            
            if (bounceStep < maxStep) {
                requestAnimationFrame(animateBounce);
            } else {
                // 動畫結束，回到原位並標記為停止
                seqObj.element.style.transform = `translate(-50%, -50%)`;
                seqObj.isAnimating = false;
            }
        };
        
        requestAnimationFrame(animateBounce);
    },

    // ✅ 停止所有重擊方塊的跳動動畫
    stopAllHeavyBlocksBounce: function() {
        this.heavySequence.forEach(seqObj => {
            seqObj.isAnimating = false;
            if (seqObj.element) {
                seqObj.element.style.transform = `translate(-50%, -50%)`;
            }
        });
    },

    // ✅ 新增：停止所有敵人跳動
    stopAllEnemiesBounce: function() {
        this.enemies.forEach(enemy => {
            this.stopEnemyBounce(enemy);
        });
    },
    
    handleSwipe: function(dir) {
        if (!this.gameActive) return;
        
        if (this.state === this.states.AOE_ACTIVE) {
            console.log('AOE 模式，忽略滑動');
            return;
        }
        
        if (Date.now() - this.lastSwipeTime < 200) return;
        this.lastSwipeTime = Date.now();
        
        console.log('處理滑動，當前狀態:', this.state, '方向:', dir);
        
        switch (this.state) {
            case this.states.NORMAL:
                // 檢查是否已經處理過這個攻擊
                if (this.currentAttack && !this.currentAttack.resolved) {
                    // 標記為已處理，防止二次滑動
                    this.currentAttack.resolved = true;
                    
                    if (this.currentAttack.dir === dir) {
                        this.addScore(this.currentAttack.points || this.scoreWeights.NORMAL);
                        this.launchProjectile(dir, () => {
                            this.finishAttack();
                        });
                    } else {
                        this.wrongDirection();
                        this.launchProjectile(dir, () => {
                            this.finishAttack();
                        });
                    }
                } else {
                    console.log('NORMAL 攻擊已處理過，忽略滑動');
                    this.showWarning('已經射擊過了！');
                }
                break;
                
            case this.states.MULTI:
                // 檢查是否已經處理過這個攻擊
                if (this.currentAttack && !this.currentAttack.resolved) {
                    // 檢查這個方向是否已經滑動過
                    if (!this.currentAttack.swipedDirs) this.currentAttack.swipedDirs = [];
                    
                    if (!this.currentAttack.swipedDirs.includes(dir)) {
                        // 記錄已滑動的方向
                        this.currentAttack.swipedDirs.push(dir);
                        
                        // 判斷方向是否正確
                        const isCorrect = this.currentAttack.dirs.includes(dir);
                        
                        // 無論正確與否，都創建投射物
                        const projectile = this.createProjectileAtPlayer(dir);
                        
                        if (!this.currentAttack.pendingProjectiles) this.currentAttack.pendingProjectiles = [];
                        this.currentAttack.pendingProjectiles.push({
                            dir: dir,
                            element: projectile,
                            isCorrect: isCorrect
                        });
                        
                        if (isCorrect) {
                            this.currentAttack.hits++;
                            console.log(`多重攻擊：${dir} 方向正確，已準備投射物 (${this.currentAttack.hits}/${this.currentAttack.dirs.length})`);
                        } else {
                            console.log(`多重攻擊：${dir} 方向錯誤，但仍會產生投射物`);
                        }
                    } else {
                        console.log('該方向已滑動過');
                        this.showWarning('該方向已滑動過');
                        return;  // 重要：防止重複滑動
                    }
                    
                    // 檢查是否已經滑完所有需要滑動的方向
                    const totalRequired = this.currentAttack.dirs.length;
                    const swipedCount = this.currentAttack.swipedDirs.length;
                    
                    if (swipedCount >= totalRequired) {
                        // 標記為已處理，防止二次滑動
                        this.currentAttack.resolved = true;

                        // ✅ 清除超時計時器
                        if (this.currentAttack.multiTimeout) {
                            clearTimeout(this.currentAttack.multiTimeout);
                            this.currentAttack.multiTimeout = null;
                        }

                        // ✅ 停止所有敵人的跳動動畫（因為馬上要發射了）
                        this.stopAllEnemiesBounce();
                        
                        console.log('所有方向已滑動完畢，立即發射所有投射物！');
                        
                        // 計算分數：只計算正確方向的分數
                        const scoreGain = this.currentAttack.hits * (this.currentAttack.points || this.scoreWeights.MULTI);
                        if (scoreGain > 0) {
                            this.addScore(scoreGain);
                            console.log(`獲得 ${scoreGain} 分（正確方向: ${this.currentAttack.hits} 個）`);
                        }
                        
                        // 發射所有已創建的投射物
                        if (this.currentAttack.pendingProjectiles && this.currentAttack.pendingProjectiles.length > 0) {
                            let completedCount = 0;
                            const total = this.currentAttack.pendingProjectiles.length;
                            
                            this.currentAttack.pendingProjectiles.forEach(item => {
                                this.launchProjectileFromPosition(item.dir, item.element, () => {
                                    completedCount++;
                                    if (completedCount === total) {
                                        if (this.currentAttack.timer) {
                                            clearTimeout(this.currentAttack.timer);
                                            this.currentAttack.timer = null;
                                        }
                                        this.finishAttack();
                                    }
                                });
                            });
                        } else {
                            if (this.currentAttack.timer) {
                                clearTimeout(this.currentAttack.timer);
                                this.currentAttack.timer = null;
                            }
                            this.finishAttack();
                        }
                        
                        this.currentAttack.pendingProjectiles = [];
                    }
                } else {
                    console.log('MULTI 攻擊已處理過，忽略滑動');
                    this.showWarning('已經射擊過了！');
                }
                break;
                
            case this.states.HEAVY_FLYING:
                // 檢查防護罩冷卻
                if (this.shieldCooldown && this.shieldCooldown[dir]) {
                    console.log('防護罩冷卻中');
                    this.showWarning('防護罩冷卻中');
                    return;
                }
                
                this.showShield(dir);
                
                this.shieldCooldown[dir] = true;
                setTimeout(() => { this.shieldCooldown[dir] = false; }, 1500);
                
                if (this.currentAttack && this.currentAttack.dir === dir) {
                    this.addScore(this.currentAttack.points || this.scoreWeights.HEAVY);
                    console.log('✨ 完美格擋！');
                    // 清除飛行中的方塊
                    this.heavyProjectiles.forEach(p => p?.remove());
                    this.heavyProjectiles = [];
                    this.finishAttack();
                } else {
                    this.wrongDirection();
                    console.log('❌ 方向錯誤');
                }
                break;
                
            default:
                console.log('當前狀態無法處理滑動:', this.state);
        }
    },
    
    wrongDirection: function() {
        this.mistakes++;
        this.updateScoreDisplay();
        this.showWarning('方向錯誤 -1');
        
        const warning = document.createElement('div');
        warning.textContent = '❌ 方向錯誤';
        warning.style.cssText = 'position:absolute; top:30%; left:50%; transform:translate(-50%,-50%); color:#ff6666; font-size:24px; z-index:150; text-shadow:0 0 5px #000;';
        this.stage.appendChild(warning);
        setTimeout(() => warning.remove(), 500);
    },
    
    missAttack: function(reason) {
        console.log('missAttack:', reason);
        this.mistakes++;
        this.updateScoreDisplay();
        this.showWarning(reason);
    },
    
    addScore: function(points) {
        this.score += points;
        this.updateScoreDisplay();
        const scorePop = document.createElement('div');
        scorePop.textContent = `+${points}`;
        scorePop.style.cssText = 'position:absolute; top:30%; left:50%; transform:translate(-50%,-50%); color:#00ffaa; font-size:28px; font-weight:bold; z-index:150; text-shadow:0 0 5px #000;';
        this.stage.appendChild(scorePop);
        setTimeout(() => scorePop.remove(), 500);
    },
    
    updateScoreDisplay: function() {
        this.scoreEl.innerText = `分數: ${this.score}`;
    },
    
    showFinalResult: function() {
        this.gameActive = false;
        this.clearAllTimers();
        
        const successRate = this.maxScore > 0 ? (this.score / this.maxScore) * 100 : 100;
        const isSuccess = successRate >= 60;
        
        if (this.resultOverlay) {
            this.resultOverlay.style.display = 'flex';
            if (isSuccess) {
                this.resultText.textContent = '🎉 通關成功！ 🎉';
                this.resultText.style.color = '#ffd700';
            } else {
                this.resultText.textContent = '💥 遊戲失敗 💥';
                this.resultText.style.color = '#ff6666';
            }
            this.resultScore.textContent = `總分: ${this.score} / ${this.maxScore}`;
            this.resultMistakes.textContent = `錯誤次數: ${this.mistakes}`;
        } else {
            this.closeResultAndComplete();
        }
    },
    
    launchProjectile: function(dir, onComplete) {
        const cfg = this.levelConfig;
        const target = this.scaledPositions[dir];
        const size = this.scaledSizes.projectile;
        
        // 計算起始位置（玩家邊緣）
        const playerRect = this.player.getBoundingClientRect();
        const stageRect = this.stage.getBoundingClientRect();
        const playerCenterX = playerRect.left + playerRect.width / 2 - stageRect.left;
        const playerCenterY = playerRect.top + playerRect.height / 2 - stageRect.top;
        const playerRadiusX = playerRect.width / 2;
        const playerRadiusY = playerRect.height / 2;
        
        let startX, startY;
        switch(dir) {
            case 'up':
                startX = playerCenterX;
                startY = playerCenterY - playerRadiusY;
                break;
            case 'down':
                startX = playerCenterX;
                startY = playerCenterY + playerRadiusY;
                break;
            case 'left':
                startX = playerCenterX - playerRadiusX;
                startY = playerCenterY;
                break;
            case 'right':
                startX = playerCenterX + playerRadiusX;
                startY = playerCenterY;
                break;
        }
        
        // 找到對應方向的敵人
        const targetEnemy = this.enemies.find(e => e.dir === dir);
        
        const proj = document.createElement('div');
        proj.className = 'defense-projectile';
        proj.style.cssText = `
            position: absolute; width: ${size}px; height: ${size}px;
            background: url('${cfg.projectileImage}') center/contain no-repeat;
            left: ${startX - size/2}px; top: ${startY - size/2}px;
            filter: drop-shadow(0 0 5px #00ffaa);
            z-index: 20;  /* ✅ 統一為 20 */
        `;
        this.stage.appendChild(proj);
        
        const endX = target.x + (stageRect.width / 2);
        const endY = target.y + (stageRect.height / 2);
        const startTime = performance.now();
        const duration = 400;
        
        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const easeOut = 1 - Math.pow(1 - t, 2);
            
            const x = startX + (endX - startX) * easeOut;
            const y = startY + (endY - startY) * easeOut;
            proj.style.left = `${x - size/2}px`;
            proj.style.top = `${y - size/2}px`;
            
            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // 投射物到達目標，移除投射物
                if (proj.parentNode) proj.remove();
                
                // 敵人變成 hit 圖片
                if (targetEnemy && targetEnemy.element) {
                    // ✅ 停止敵人的跳動動畫
                    this.stopEnemyBounce(targetEnemy);

                    targetEnemy.element.style.backgroundImage = `url('${cfg.projectileHitImage}')`;
                    targetEnemy.element.style.backgroundSize = 'contain';
                    targetEnemy.element.style.backgroundRepeat = 'no-repeat';
                    targetEnemy.element.style.backgroundPosition = 'center';
                    // 0.2 秒後移除敵人
                    setTimeout(() => {
                        if (targetEnemy.element && targetEnemy.element.parentNode) {
                            targetEnemy.element.remove();
                        }
                        const idx = this.enemies.findIndex(e => e.dir === dir);
                        if (idx !== -1) this.enemies.splice(idx, 1);
                        if (onComplete) onComplete();
                    }, 200);
                } else {
                    if (onComplete) onComplete();
                }
            }
        };
        
        requestAnimationFrame(animate);
        this.projectiles.push(proj);
    },

    // 新增：在玩家位置創建投射物（不發射）
    createProjectileAtPlayer: function(dir) {
        const cfg = this.levelConfig;
        const size = this.scaledSizes.projectile;
        
        // 獲取玩家實際尺寸
        const playerRect = this.player.getBoundingClientRect();
        const stageRect = this.stage.getBoundingClientRect();
        
        // 玩家相對於 stage 的中心位置（像素）
        const playerCenterX = playerRect.left + playerRect.width / 2 - stageRect.left;
        const playerCenterY = playerRect.top + playerRect.height / 2 - stageRect.top;
        
        // 玩家半徑
        const playerRadiusX = playerRect.width / 2;
        const playerRadiusY = playerRect.height / 2;
        
        // 計算投射物位置（像素，相對於 stage 左上角）
        let leftPx, topPx;
        
        switch(dir) {
            case 'up':
                leftPx = playerCenterX - size / 2;
                topPx = playerCenterY - playerRadiusY - size / 2;
                break;
            case 'down':
                leftPx = playerCenterX - size / 2;
                topPx = playerCenterY + playerRadiusY - size / 2;
                break;
            case 'left':
                leftPx = playerCenterX - playerRadiusX - size / 2;
                topPx = playerCenterY - size / 2;
                break;
            case 'right':
                leftPx = playerCenterX + playerRadiusX - size / 2;
                topPx = playerCenterY - size / 2;
                break;
        }
        
        const proj = document.createElement('div');
        proj.className = 'defense-projectile';
        proj.style.cssText = `
            position: absolute; width: ${size}px; height: ${size}px;
            background: url('${cfg.projectileImage}') center/contain no-repeat;
            left: ${leftPx}px; top: ${topPx}px;
            opacity: 1;
            z-index: 20;  /* ✅ 統一為 20（原本是 35） */
            transition: opacity 0.2s ease;
        `;
        this.stage.appendChild(proj);
        this.multiProjectiles.push(proj);
        
        return proj;
    },

    // 新增：從指定位置發射投射物到目標方向
    launchProjectileFromPosition: function(dir, projectile, onComplete) {
        const cfg = this.levelConfig;
        const target = this.scaledPositions[dir];
        
        // 找到對應方向的敵人
        const targetEnemy = this.enemies.find(e => e.dir === dir);
        
        // 獲取投射物當前位置
        const rect = projectile.getBoundingClientRect();
        const stageRect = this.stage.getBoundingClientRect();
        
        const startX = rect.left + rect.width/2 - stageRect.left;
        const startY = rect.top + rect.height/2 - stageRect.top;
        const endX = target.x + (stageRect.width / 2);
        const endY = target.y + (stageRect.height / 2);
        
        const startTime = performance.now();
        const duration = 400;
        
        projectile.style.filter = 'drop-shadow(0 0 8px #00ffaa)';
        projectile.style.zIndex = '20';  /* ✅ 統一為 20（原本是 999） */
        
        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const easeOut = 1 - Math.pow(1 - t, 2);
            
            const x = startX + (endX - startX) * easeOut;
            const y = startY + (endY - startY) * easeOut;
            projectile.style.left = `${x - (this.scaledSizes.projectile / 2)}px`;
            projectile.style.top = `${y - (this.scaledSizes.projectile / 2)}px`;
            
            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // 投射物到達目標，移除投射物
                if (projectile.parentNode) projectile.remove();
                const idx = this.multiProjectiles.indexOf(projectile);
                if (idx !== -1) this.multiProjectiles.splice(idx, 1);
                
                // 敵人變成 hit 圖片
                if (targetEnemy && targetEnemy.element) {
                    // ✅ 停止敵人的跳動動畫
                    this.stopEnemyBounce(targetEnemy);

                    targetEnemy.element.style.backgroundImage = `url('${cfg.projectileHitImage}')`;
                    targetEnemy.element.style.backgroundSize = 'contain';
                    targetEnemy.element.style.backgroundRepeat = 'no-repeat';
                    targetEnemy.element.style.backgroundPosition = 'center';
                    // 0.2 秒後移除敵人
                    setTimeout(() => {
                        if (targetEnemy.element && targetEnemy.element.parentNode) {
                            targetEnemy.element.remove();
                        }
                        const enemyIdx = this.enemies.findIndex(e => e.dir === dir);
                        if (enemyIdx !== -1) this.enemies.splice(enemyIdx, 1);
                        if (onComplete) onComplete();
                    }, 200);
                } else {
                    if (onComplete) onComplete();
                }
            }
        };
        
        requestAnimationFrame(animate);
        this.projectiles.push(projectile);
    },
    
    // ========== 重擊 ==========
    spawnHeavySequence: function(dir) {
        if (this.lightIntervals[dir]) {
            clearInterval(this.lightIntervals[dir]);
            this.lightIntervals[dir] = null;
        }
        this.heavySequence.forEach(s => { if (s && s.parentNode) s.remove(); });
        this.heavySequence = [];
        this.heavyProjectiles = [];

        console.log('spawnHeavySequence 被呼叫，方向:', dir);
        
        const cfg = this.levelConfig;
        const size = this.scaledSizes.heavySequence;
        const count = 5;
        const targetPos = this.scaledPositions[dir];
        const positions = [];
        
        // 獲取舞台實際尺寸（用於計算相對位置）
        const stageRect = this.stage.getBoundingClientRect();
        const stageWidth = stageRect.width;
        const stageHeight = stageRect.height;
        
        // 基準尺寸（設計稿 1920x1080）
        const BASE_WIDTH = 1920;
        const BASE_HEIGHT = 1080;
        
        // 計算相對於設計稿的比例
        const widthRatio = stageWidth / BASE_WIDTH;
        const heightRatio = stageHeight / BASE_HEIGHT;
        
        if (dir === 'up') {
            // 上方：水平排列，Y 固定在目標位置
            const y = targetPos.y;
            // 使用寬度比例計算範圍（設計稿中範圍是 -180 到 180，共 360px）
            const range = 720 * widthRatio;
            const startX = -range / 2;
            const endX = range / 2;
            for (let i = 0; i < count; i++) {
                const t = i / (count - 1);
                const x = startX + (endX - startX) * t;
                positions.push({ x, y });
                console.log(`上方方塊 ${i}: x=${x}, y=${y}, range=${range}`);
            }
        } 
        else if (dir === 'down') {
            // 下方：水平排列，Y 固定在目標位置
            const y = targetPos.y;
            const range = 720 * widthRatio;
            const startX = -range / 2;
            const endX = range / 2;
            for (let i = 0; i < count; i++) {
                const t = i / (count - 1);
                const x = startX + (endX - startX) * t;
                positions.push({ x, y });
                console.log(`下方方塊 ${i}: x=${x}, y=${y}, range=${range}`);
            }
        }
        else if (dir === 'left') {
            // 左方：垂直排列，X 固定在目標位置
            const x = targetPos.x;
            // 使用高度比例計算範圍（設計稿中範圍是 -150 到 150，共 300px）
            const range = 600 * heightRatio;
            const startY = -range / 2;
            const endY = range / 2;
            for (let i = 0; i < count; i++) {
                const t = i / (count - 1);
                const y = startY + (endY - startY) * t;
                positions.push({ x, y });
                console.log(`左方方塊 ${i}: x=${x}, y=${y}, range=${range}`);
            }
        }
        else if (dir === 'right') {
            // 右方：垂直排列，X 固定在目標位置
            const x = targetPos.x;
            const range = 600 * heightRatio;
            const startY = -range / 2;
            const endY = range / 2;
            for (let i = 0; i < count; i++) {
                const t = i / (count - 1);
                const y = startY + (endY - startY) * t;
                positions.push({ x, y });
                console.log(`右方方塊 ${i}: x=${x}, y=${y}, range=${range}`);
            }
        }
        
        // 創建序列物件
        positions.forEach((pos, index) => {
            const seq = document.createElement('div');
            
            // ✅ 判斷是否有專屬的重擊圖片，沒有就用一般敵人圖片
            const enemyImage = cfg.heavyEnemyImage || cfg.enemyImage;
            
            seq.style.cssText = `
                position: absolute; width: ${size}px; height: ${size}px; transform: translate(-50%, -50%);
                background: url('${enemyImage}') center/contain no-repeat;
                left: calc(50% + ${pos.x}px); top: calc(50% + ${pos.y}px);
                transition: all 0.1s ease;
                opacity: 0.3;
                z-index: 25;
            `;
            seq.dataset.index = index;
            this.stage.appendChild(seq);
            
            // ✅ 儲存方塊資訊，準備加入跳動動畫
            const seqObj = {
                element: seq,
                index: index,
                animationId: null,
                isAnimating: false
            };
            this.heavySequence.push(seqObj);
        });
        
        // 依序點亮
        let idx = 0;
        console.log(`開始點亮 ${dir} 方向的重擊，共 ${this.heavySequence.length} 個方塊`);
        
        this.lightIntervals[dir] = setInterval(() => {
            if (!this.gameActive || this.state !== this.states.HEAVY_CHARGING) {
                if (this.lightIntervals[dir]) {
                    clearInterval(this.lightIntervals[dir]);
                    this.lightIntervals[dir] = null;
                }
                return;
            }
            if (idx < this.heavySequence.length) {
                console.log(`點亮 ${dir} 方向方塊 ${idx + 1}/${this.heavySequence.length}`);
                
                const currentSeq = this.heavySequence[idx];
                currentSeq.element.style.opacity = '1';
                currentSeq.element.style.filter = 'drop-shadow(0 0 15px #ff6600)';
                currentSeq.element.style.transform = 'translate(-50%, -50%) scale(1.1)';
                
                // ✅ 點亮後啟動跳動動畫
                this.startHeavyBlockBounce(currentSeq);
                
                idx++;
                
                if (idx === this.heavySequence.length) {
                    if (this.lightIntervals[dir]) {
                        clearInterval(this.lightIntervals[dir]);
                        this.lightIntervals[dir] = null;
                    }
                    console.log(`最後一個點亮，觸發 ${dir} 方向衝向玩家`);
                    
                    // ✅ 最後一個點亮後，停止所有方塊的跳動動畫
                    this.stopAllHeavyBlocksBounce();
                    
                    if (this.state === this.states.HEAVY_CHARGING) {
                        this.setState(this.states.HEAVY_FLYING);
                        this.launchHeavyProjectile(dir);
                    }
                }
            }
        }, 400);
    },
    
    launchHeavyProjectile: function(dir) {
        console.log('launchHeavyProjectile 執行，方向:', dir);

        // ✅ 先停止所有跳動動畫
        this.stopAllHeavyBlocksBounce();
        
        // ✅ 從 heavySequence 中取出實際的 DOM 元素
        const blocks = [];
        this.heavySequence.forEach(seqObj => {
            if (seqObj.element) {
                blocks.push(seqObj.element);
            }
        });
        
        if (blocks.length === 0) {
            console.log('沒有方塊可飛');
            this.finishAttack();
            return;
        }
        
        console.log('開始飛行，方塊數量:', blocks.length);
        this.heavySequence = [];
        
        let completedCount = 0;
        const totalBlocks = blocks.length;
        
        blocks.forEach((block, idx) => {
            const rect = block.getBoundingClientRect();
            const stageRect = this.stage.getBoundingClientRect();
            
            const startX = rect.left + rect.width/2 - (stageRect.left + stageRect.width/2);
            const startY = rect.top + rect.height/2 - (stageRect.top + stageRect.height/2);
            
            const endX = 0;
            const endY = 0;
            
            block.style.transition = 'none';
            block.style.position = 'absolute';
            block.style.zIndex = '35';
            this.heavyProjectiles.push(block);
            
            const startTime = performance.now();
            const duration = 400;
            
            const animate = (now) => {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / duration);
                
                const x = startX + (endX - startX) * t;
                const y = startY + (endY - startY) * t;
                block.style.left = `calc(50% + ${x}px)`;
                block.style.top = `calc(50% + ${y}px)`;
                block.style.opacity = `${1 - t * 0.5}`;
                
                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    block.remove();
                    const index = this.heavyProjectiles.indexOf(block);
                    if (index !== -1) this.heavyProjectiles.splice(index, 1);
                    completedCount++;
                    
                    if (completedCount === totalBlocks) {
                        console.log('所有方塊飛行完成');
                        if (this.state === this.states.HEAVY_FLYING && !this.currentAttack?.resolved) {
                            this.missAttack('未及時格擋');
                            this.finishAttack();
                        }
                    }
                }
            };
            requestAnimationFrame(animate);
        });
    },
    
    // ========== AOE ==========
    startAOE: function(wait) {
        console.log('startAOE 開始，等待時間:', wait);
        
        if (!wait || wait <= 0) {
            console.error('AOE 等待時間無效:', wait);
            this.finishAttack();
            return;
        }

        // ✅ 儲存 AOE 時間資訊（供 handleRotate 使用）
        this.aoeStartTime = Date.now();
        this.aoeDuration = wait;
        
        // 重置回推進度
        this.aoePushProgress = 0;
        
        const aoeUp = document.getElementById('aoe-up');
        const aoeDown = document.getElementById('aoe-down');
        const aoeLeft = document.getElementById('aoe-left');
        const aoeRight = document.getElementById('aoe-right');
        
        const stageHeight = this.stage.clientHeight;
        const stageWidth = this.stage.clientWidth;
        const aoeHeight = this.getScaledValue(this.baseSizes.aoeLine.horizontal);
        const aoeWidth = this.getScaledValue(this.baseSizes.aoeLine.vertical);
        
        // 計算最大移動距離
        const maxUpMove = stageHeight / 2 - aoeHeight / 2;
        const maxDownMove = stageHeight / 2 - aoeHeight / 2;
        const maxLeftMove = stageWidth / 2;
        const maxRightMove = stageWidth / 2;
        
        // 重置線條位置（從邊緣開始）
        if (aoeUp) {
            aoeUp.style.transform = `translateY(0)`;
            aoeUp.style.opacity = '0.7';
        }
        if (aoeDown) {
            aoeDown.style.transform = `translateY(0)`;
            aoeDown.style.opacity = '0.7';
        }
        if (aoeLeft) {
            aoeLeft.style.transform = `translateX(-${stageWidth / 2}px) translateY(-50%) rotate(90deg)`;
            aoeLeft.style.opacity = '0.7';
        }
        if (aoeRight) {
            aoeRight.style.transform = `translateX(${stageWidth / 2}px) translateY(-50%) rotate(-90deg)`;
            aoeRight.style.opacity = '0.7';
        }
        
        let finished = false;
        let animationId = null;
        const startTime = Date.now();
        const duration = wait;
        
        const success = () => {
            if (finished) return;
            finished = true;
            if (animationId) cancelAnimationFrame(animationId);
            console.log('✨ AOE 防禦成功！');
            if (this.state === this.states.AOE_ACTIVE) {
                this.addScore(this.scoreWeights.AOE);
                this.finishAttack();
            }
        };
        
        const fail = () => {
            if (finished) return;
            finished = true;
            if (animationId) cancelAnimationFrame(animationId);
            console.log('💥 AOE 攻擊命中！');
            if (this.state === this.states.AOE_ACTIVE) {
                this.mistakes++;
                this.updateScoreDisplay();
                this.showWarning('AOE 攻擊命中！');
                this.finishAttack();
            }
        };
        
        // 初始化平滑進度
    let smoothProgress = 0;

    const animate = () => {
        if (finished || this.state !== this.states.AOE_ACTIVE) {
            return;
        }
        
        const elapsed = Date.now() - startTime;
        const actualProgress = Math.min(1, elapsed / duration);
        
        // 檢測是否放手
        const now = Date.now();
        const timeSinceLastRotate = now - (this.lastRotateTime || 0);
        const isRotating = timeSinceLastRotate < 300;
        
        let targetProgress;
        
        if (isRotating) {
            // 旋轉中：使用延遲後的進度
            const pushDelay = (this.aoePushProgress || 0) * 200;
            const adjustedElapsed = Math.max(0, elapsed - pushDelay);
            targetProgress = Math.min(1, adjustedElapsed / duration);
            // 更新平滑進度為當前目標
            smoothProgress = targetProgress;
        } else {
            // 放手後：平滑追趕實際進度
            const catchUpSpeed = 0.015; // 每次增加 1.5%
            if (smoothProgress < actualProgress) {
                smoothProgress = Math.min(actualProgress, smoothProgress + catchUpSpeed);
            } else {
                smoothProgress = actualProgress;
            }
            targetProgress = smoothProgress;
        }
        
        // 使用 easeOutQuad
        const easeProgress = 1 - Math.pow(1 - targetProgress, 2);
        
        const upMove = maxUpMove * easeProgress;
        const downMove = -maxDownMove * easeProgress;
        const leftMove = -maxLeftMove + (maxLeftMove * easeProgress);
        const rightMove = maxRightMove - (maxRightMove * easeProgress);
        
        if (aoeUp) aoeUp.style.transform = `translateY(${upMove}px)`;
        if (aoeDown) aoeDown.style.transform = `translateY(${downMove}px)`;
        if (aoeLeft) aoeLeft.style.transform = `translateX(${leftMove}px) translateY(-50%) rotate(90deg)`;
        if (aoeRight) aoeRight.style.transform = `translateX(${rightMove}px) translateY(-50%) rotate(-90deg)`;
        
        animationId = requestAnimationFrame(animate);
    };
        
        // 啟動動畫
        animationId = requestAnimationFrame(animate);
        
        // 碰撞檢測
        const collisionCheck = setInterval(() => {
            if (finished || this.state !== this.states.AOE_ACTIVE) {
                clearInterval(collisionCheck);
                return;
            }
            
            const playerRect = this.player.getBoundingClientRect();
            const stageRect = this.stage.getBoundingClientRect();
            
            const playerCenterX = playerRect.left + playerRect.width / 2 - stageRect.left;
            const playerCenterY = playerRect.top + playerRect.height / 2 - stageRect.top;
            
            const playerLeft = playerCenterX - 60;
            const playerRight = playerCenterX + 60;
            const playerTop = playerCenterY - 60;
            const playerBottom = playerCenterY + 60;
            
            let collided = false;
            
            if (aoeUp) {
                const upRect = aoeUp.getBoundingClientRect();
                const upBottom = upRect.bottom - stageRect.top;
                if (upBottom >= playerTop) collided = true;
            }
            
            if (aoeDown) {
                const downRect = aoeDown.getBoundingClientRect();
                const downTop = downRect.top - stageRect.top;
                if (downTop <= playerBottom) collided = true;
            }
            
            if (aoeLeft) {
                const leftRect = aoeLeft.getBoundingClientRect();
                const leftRight = leftRect.right - stageRect.left;
                if (leftRight >= playerLeft) collided = true;
            }
            
            if (aoeRight) {
                const rightRect = aoeRight.getBoundingClientRect();
                const rightLeft = rightRect.left - stageRect.left;
                if (rightLeft <= playerRight) collided = true;
            }
            
            if (collided) {
                clearInterval(collisionCheck);
                cancelAnimationFrame(animationId);
                fail();
            }
        }, 16);
        
        // 成功計時器
        const successTimer = setTimeout(() => {
            if (!finished && this.state === this.states.AOE_ACTIVE) {
                clearInterval(collisionCheck);
                success();
            }
        }, duration);
        
        this.aoeTimers.push({ type: 'interval', id: collisionCheck });
        this.aoeTimers.push({ type: 'timeout', id: successTimer });
        this.currentAnimationId = animationId;
    },

    handleRotate: function(e) {
        if (this.state !== this.states.AOE_ACTIVE) return;
        
        // ✅ 記錄最後旋轉時間
        this.lastRotateTime = Date.now();
        
        let angle = 0;
        if (e.detail) {
            angle = e.detail.angle || 0;
        } else if (e.angle) {
            angle = e.angle;
        }
        
        if (this.rotationAccumulator.lastAngle === undefined) {
            this.rotationAccumulator.lastAngle = angle;
            return;
        }
        
        let delta = angle - this.rotationAccumulator.lastAngle;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        
        this.rotationAccumulator.lastAngle = angle;
        
        if (Math.abs(delta) > 2) {
            this.rotationAccumulator.totalAngle = (this.rotationAccumulator.totalAngle || 0) + Math.abs(delta);
            
            if (this.rotationAccumulator.totalAngle >= 20) {
                this.rotationAccumulator.totalAngle = 0;
                
                // 計算當前時間進度
                let timeProgress = 0;
                if (this.aoeStartTime) {
                    const elapsed = Date.now() - this.aoeStartTime;
                    timeProgress = Math.min(1, elapsed / this.aoeDuration);
                }
                
                // 根據時間進度動態調整回推量
                let pushAmount = 0.17 - (timeProgress * 0.1);
                pushAmount = Math.max(0.07, Math.min(0.17, pushAmount));
                
                this.aoePushProgress = (this.aoePushProgress || 0) + pushAmount;
                
                console.log('🔄 旋轉回推！', {
                    時間進度: (timeProgress * 100).toFixed(0) + '%',
                    回推量: pushAmount.toFixed(3),
                    總回推: this.aoePushProgress.toFixed(3)
                });
                
                // 視覺回饋
                const aoeLines = ['aoe-up', 'aoe-down', 'aoe-left', 'aoe-right'];
                aoeLines.forEach(id => {
                    const line = document.getElementById(id);
                    if (line) {
                        line.style.filter = 'drop-shadow(0 0 10px #ffaa00)';
                        setTimeout(() => {
                            if (line) line.style.filter = '';
                        }, 150);
                    }
                });
            }
        }
    },
    
    // ========== 輔助函數 ==========
    showShield: function(dir) {
        const shield = document.getElementById(`shield-${dir}`);
        if (shield) {
            shield.style.opacity = '0.8';
            setTimeout(() => { shield.style.opacity = '0'; }, 500);
        }
    },
    
    showWarning: function(text) {
        this.msg.style.color = '#ff6666';
        setTimeout(() => { this.msg.style.color = '#ffd700'; }, 500);
    },
    
    closeResultAndComplete: function() {
        // ✅ 清理軌跡更新循環
        if (this.trailInterval) {
            clearInterval(this.trailInterval);
            this.trailInterval = null;
        }
        
        if (this.container) this.container.remove();
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) gameCanvas.style.display = 'none';
        if (this.onCompleteCallback) this.onCompleteCallback(true);
    },
    
    // 關卡設定（從外部檔案載入）
    levels: DefenseLevels,

    // 清理函數
    clearEnemies: function() { 
        // ✅ 先停止所有敵人的跳動動畫
        this.enemies.forEach(e => {
            if (e.animationId) clearInterval(e.animationId);
        });
        this.enemies.forEach(e => e.element?.remove()); 
        this.enemies = []; 
    },
    removeEnemyByDir: function(dir) { 
        const idx = this.enemies.findIndex(e => e.dir === dir); 
        if (idx !== -1) { 
            this.enemies[idx].element?.remove(); 
            this.enemies.splice(idx, 1); 
        } 
    },
    clearProjectiles: function() { this.projectiles.forEach(p => p?.remove()); this.projectiles = []; },
    clearHeavySequence: function() { 
        // ✅ 先停止所有重擊方塊的跳動動畫
        this.stopAllHeavyBlocksBounce();
        
        this.heavySequence.forEach(s => { 
            if (s && s.element && s.element.parentNode) s.element.remove(); 
        });
        this.heavySequence = []; 
    },   
    clearHeavyProjectiles: function() { 
        this.heavyProjectiles.forEach(p => { if (p && p.parentNode) p.remove(); });
        this.heavyProjectiles = []; 
    },
    // 清理函數
    clearAll: function() { 
        this.clearTrail();  // ✅ 清除軌跡
        
        this.clearEnemies(); 
        this.clearProjectiles(); 
        this.clearHeavySequence(); 
        this.clearHeavyProjectiles();
        
        // 清理多重攻擊的投射物
        if (this.multiProjectiles) {
            this.multiProjectiles.forEach(p => {
                if (p && p.parentNode) p.remove();
            });
            this.multiProjectiles = [];
        }
        
        // 清理當前攻擊的計時器
        if (this.currentAttack && this.currentAttack.timer) {
            clearTimeout(this.currentAttack.timer);
            this.currentAttack.timer = null;
        }
        
        // 清理點亮間隔
        if (this.currentLightInterval) {
            clearInterval(this.currentLightInterval);
            this.currentLightInterval = null;
        }
        
        // 清理各方向的點亮間隔
        if (this.lightIntervals) {
            ['up', 'down', 'left', 'right'].forEach(dir => {
                if (this.lightIntervals[dir]) {
                    clearInterval(this.lightIntervals[dir]);
                    this.lightIntervals[dir] = null;
                }
            });
        }
        
        this.isLaunching = false;
        this.isProcessing = false;
    }
};

window.DefenseGameV2 = DefenseGameV2;