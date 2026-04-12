// js/minigames/MemoryGameV2.js
// 記憶卡牌遊戲 - 支援動態牌組數量

const MemoryGameV2 = {
    // 遊戲狀態
    gameActive: false,
    onCompleteCallback: null,
    
    // DOM 元素
    container: null,
    grid: null,
    statusText: null,
    timerText: null,
    movesText: null,
    matchedText: null,
    
    // 遊戲數據
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 0,
    moves: 0,
    timeLeft: 0,
    timer: null,
    canFlip: false,
    isMemorizing: false,
    wrongStreak: 0,           // 連續失敗次數 (紅燈)
    rightStreak: 0,           // 連續成功次數 (綠燈)
    strikeLights: [],         // 燈光 DOM 元素

    
    // 設定
    cardSymbols: [],
    gridCols: 4,
    gridRows: 4,
    memorizationTime: 3000,
    gameTime: 60,
    
    // 初始化
    init: function() {
        console.log('🔧 MemoryGameV2 初始化');
    },
    
    // 根據卡片數量自動計算最佳網格（確保不超出畫面，左右浪費最少）
    calculateGrid: function(cardCount) {
        const totalCards = cardCount;
        
        // 獲取螢幕/容器的寬高比
        const getContainerAspectRatio = () => {
            const wrapper = document.getElementById('game-wrapper');
            if (wrapper) {
                const rect = wrapper.getBoundingClientRect();
                return rect.width / rect.height;
            }
            return window.innerWidth / window.innerHeight;
        };
        
        const containerRatio = getContainerAspectRatio();
        const cardRatio = 5 / 4;  // 卡片寬高比 1.25
        
        let bestCols = 4;
        let bestRows = 3;
        let bestScore = Infinity;
        
        // 嘗試各種行數（2-5 行）
        for (let rows = 2; rows <= 5; rows++) {
            const cols = Math.ceil(totalCards / rows);
            
            // 列數限制 2-8
            if (cols >= 2 && cols <= 8) {
                const totalSlots = cols * rows;
                const waste = totalSlots - totalCards;
                
                // 計算這個網格所需的寬高比
                // 假設卡片寬度為 w，高度為 h = w * 4/5
                // 網格總寬度 = cols * w + (cols-1) * gap
                // 網格總高度 = rows * h + (rows-1) * gap
                // 忽略 gap 簡化計算：所需比例 ≈ (cols * w) / (rows * h) = (cols * 5) / (rows * 4)
                const requiredRatio = (cols * 5) / (rows * 4);
                
                // 計算與容器比例的差異（差異越小，左右浪費越少）
                const ratioDiff = Math.abs(requiredRatio - containerRatio);
                
                // 浪費懲罰（每浪費一格 +5 分）
                const wastePenalty = waste * 5;
                
                // 行數偏好（3-4 行最好）
                const rowBonus = (rows === 3 || rows === 4) ? -2 : (rows === 2 ? 1 : 2);
                
                // 列數不能太多（超過 6 列有小懲罰）
                const colPenalty = cols > 6 ? (cols - 6) * 2 : 0;
                
                const score = ratioDiff * 10 + wastePenalty + rowBonus + colPenalty;
                
                console.log(`嘗試 ${cols}x${rows}: 浪費=${waste}, 所需比例=${requiredRatio.toFixed(3)}, 容器比例=${containerRatio.toFixed(3)}, 差異=${ratioDiff.toFixed(3)}, 總分=${score.toFixed(1)}`);
                
                if (score < bestScore) {
                    bestScore = score;
                    bestCols = cols;
                    bestRows = rows;
                }
            }
        }
        
        console.log(`📐 卡片數量 ${totalCards} → ${bestCols} 列 x ${bestRows} 行 (容器比例 ${containerRatio.toFixed(3)})`);
        
        return { cols: bestCols, rows: bestRows };
    },
    
    // 開始遊戲
    start: function(options) {
        console.log('🎮 記憶遊戲開始', options);
        
        this.gameActive = true;
        this.onCompleteCallback = options.onComplete;
        
        // ✅ 優先使用 cols/rows，如果沒傳就用 cardCount 自動計算
        if (options.cols && options.rows) {
            // 傳統模式：直接指定列數和行數
            this.gridCols = options.cols;
            this.gridRows = options.rows;
            this.totalPairs = (this.gridCols * this.gridRows) / 2;
            
            console.log(`📊 使用指定網格: ${this.gridCols}x${this.gridRows}, ${this.totalPairs} 對`);
        } else {
            // 新模式：根據卡片數量自動計算
            let cardCount = options.cardCount || 12;
            
            // 確保卡片數量是偶數
            if (cardCount % 2 !== 0) {
                cardCount++;
                console.log(`📊 卡片數量調整為偶數: ${cardCount}`);
            }
            
            // 自動計算網格
            const grid = this.calculateGrid(cardCount);
            this.gridCols = grid.cols;
            this.gridRows = grid.rows;
            this.totalPairs = cardCount / 2;
            
            console.log(`📊 自動計算網格: ${this.gridCols}x${this.gridRows}, ${this.totalPairs} 對`);
        }
        
        // 遊戲時間
        if (options.time) {
            this.gameTime = options.time;
        } else {
            // 根據卡片數量動態調整（每對 5 秒，最少 30 秒，最多 90 秒）
            this.gameTime = Math.min(90, Math.max(30, this.totalPairs * 5));
        }
        
        // 記憶時間
        if (options.memorizationTime) {
            this.memorizationTime = options.memorizationTime;
        } else {
            // 根據卡片數量動態調整（每對 0.5 秒，最少 2 秒，最多 6 秒）
            this.memorizationTime = Math.min(6000, Math.max(2000, this.totalPairs * 500));
        }
        
        console.log(`📊 記憶遊戲設定: ${this.gridCols}x${this.gridRows}, ${this.totalPairs} 對, ${this.gameTime}秒, 記憶時間 ${this.memorizationTime}ms`);
        
        // 準備卡片內容
        this.prepareCardSymbols();
        
        // 建立 UI
        this.createUI();
        
        // 重置遊戲狀態
        this.resetGame();

        // ✅ 新增：儲存 resize 事件的處理函數
        this.handleResize = () => {
            if (this.gameActive && this.grid) {
                this.adjustCardSize();
            }
        };
        window.addEventListener('resize', this.handleResize);
        
        // 開始動畫和遊戲流程
        this.startGameSequence();
    },

    prepareCardSymbols: function() {
        // ✅ 有圖片的符號（優先使用）
        const hasImageSymbols = ['🫘', '🥛', '🍮', '🧈', '🥢', '🍜'];
        
        // ✅ 沒有圖片的符號（備用）
        const noImageSymbols = [
            '🌱', '💚', '⭐', '🌟', '✨', '⚡', '🔥', '💧', '🌿', '🌸',
            '🍎', '🍊', '🍋', '🍉', '🍒', '🥝', '🥥', '🍄',
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'
        ];
        
        const neededSymbols = this.totalPairs;  // 需要多少種符號
        
        let selectedSymbols = [];
        
        // 1️⃣ 如果需要數量 <= 有圖片的數量 → 從有圖片的符號中隨機挑選
        if (neededSymbols <= hasImageSymbols.length) {
            // 複製一份有圖片的符號陣列
            const shuffledHasImage = [...hasImageSymbols];
            this.shuffleArray(shuffledHasImage);
            
            // 隨機取 neededSymbols 個
            for (let i = 0; i < neededSymbols; i++) {
                selectedSymbols.push(shuffledHasImage[i]);
            }
        } 
        // 2️⃣ 如果需要數量 > 有圖片的數量 → 全部有圖片的都用，不足的從無圖片中隨機挑
        else {
            // 先把所有有圖片的符號加入
            selectedSymbols.push(...hasImageSymbols);
            
            // 計算還需要多少個
            const needMore = neededSymbols - hasImageSymbols.length;
            
            // 複製一份沒有圖片的符號陣列
            const shuffledNoImage = [...noImageSymbols];
            this.shuffleArray(shuffledNoImage);
            
            // 隨機取 needMore 個（不重複）
            for (let i = 0; i < needMore; i++) {
                selectedSymbols.push(shuffledNoImage[i]);
            }
        }
        
        // 3️⃣ 建立卡片組（每種符號兩張，然後洗牌）
        this.cardSymbols = [...selectedSymbols, ...selectedSymbols];
        this.shuffleArray(this.cardSymbols);
        
        console.log(`🎴 準備了 ${this.cardSymbols.length} 張卡片，需要 ${neededSymbols} 種符號`);
        console.log(`  使用的符號: ${selectedSymbols.join(', ')}`);
        console.log(`  有圖片的: ${selectedSymbols.filter(s => hasImageSymbols.includes(s)).length} 種`);
        console.log(`  無圖片的: ${selectedSymbols.filter(s => !hasImageSymbols.includes(s)).length} 種`);
    },
    
    // 洗牌
    shuffleArray: function(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    },
    
    // 建立 UI
    createUI: function() {
        if (this.container) this.container.remove();
        
        this.container = document.createElement('div');
        this.container.className = 'memory-game-container';
        
        // 計算實際需要顯示的卡片數量（可能比 cardCount 多，因為網格是矩形的）
        const actualCardCount = this.gridCols * this.gridRows;
        
        // 在 createUI 方法中，修改 memory-top-bar 的 HTML
        this.container.innerHTML = `
            <div class="memory-stage">
                <div class="memory-panel">
                    <div class="memory-hud">
                        <div class="memory-top-bar">
                            <!-- 左側：配對資訊 -->
                            <div class="memory-info">
                                <div class="memory-info-item">📊 <span id="memory-matched">0</span>/${this.totalPairs}</div>
                            </div>
                            
                            <!-- 中間：計時器 + 紅綠燈（重點醒目區） -->
                            <div class="memory-center-area">
                                <div class="memory-timer-large">
                                    <span class="memory-timer-label">⏱️</span>
                                    <span id="memory-timer">${this.gameTime}</span>
                                    <span class="memory-timer-label">秒</span>
                                </div>
                                
                                <!-- 警告燈區域 -->
                                <div class="memory-strikes" id="memory-strikes">
                                    <div class="strike-light"></div>
                                    <div class="strike-light"></div>
                                    <div class="strike-light"></div>
                                </div>
                            </div>
                            
                            <!-- 右側：狀態文字 -->
                            <div class="memory-status" id="memory-status">準備好了嗎？</div>
                        </div>
                    </div>
                    
                    <div class="memory-grid-area">
                        <div class="memory-grid" data-cols="${this.gridCols}" id="memory-grid"></div>
                    </div>
                    
                    <div class="memory-hint">點擊卡片翻面 · 記住相同圖案的位置</div>
                </div>
            </div>
        `;
        
        // 附加到 #game-wrapper
        const gameWrapper = document.getElementById('game-wrapper');
        if (gameWrapper) {
            gameWrapper.appendChild(this.container);
            console.log('✅ 記憶遊戲容器已附加到 #game-wrapper');
        } else {
            document.body.appendChild(this.container);
            console.warn('⚠️ #game-wrapper 不存在，附加到 body');
        }
        
        this.grid = document.getElementById('memory-grid');
        this.statusText = document.getElementById('memory-status');
        this.matchedText = document.getElementById('memory-matched');
        this.movesText = document.getElementById('memory-moves');
        this.timerText = document.getElementById('memory-timer');

        // ✅ 獲取警告燈元素
        const strikeContainer = document.getElementById('memory-strikes');
        if (strikeContainer) {
            this.strikeLights = Array.from(strikeContainer.querySelectorAll('.strike-light'));
        }
        
        this.createEmptyGrid();
        this.setCardContents();
        
        // 如果實際卡片數量比需要的多，隱藏多餘的卡片
        const actualCardCount_ = this.gridCols * this.gridRows;
        if (actualCardCount_ > this.cardSymbols.length) {
            const cards = this.grid.querySelectorAll('.memory-card');
            for (let i = this.cardSymbols.length; i < actualCardCount_; i++) {
                if (cards[i]) {
                    cards[i].style.visibility = 'hidden';
                    cards[i].style.pointerEvents = 'none';
                }
            }
        }
    },
    
    // 建立空白盤面（支援不規則的最後一行）
    createEmptyGrid: function() {
        if (!this.grid) return;
        this.grid.innerHTML = '';
        
        // 計算實際需要的行數和每行卡片數
        const totalCardsNeeded = this.cardSymbols.length;  // 實際需要顯示的卡片數
        const totalGridSlots = this.gridCols * this.gridRows;  // 網格總格子數
        
        // 建立所有格子
        for (let i = 0; i < totalGridSlots; i++) {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.innerHTML = `
                <div class="memory-card-inner">
                    <div class="memory-card-face memory-card-back"></div>
                    <div class="memory-card-face memory-card-front"></div>
                </div>
            `;
            card.dataset.index = i;
            card.onclick = () => this.handleCardClick(card);
            this.grid.appendChild(card);
        }
    },

    // 設定卡片內容（只設定實際需要的卡片，其他隱藏）
    setCardContents: function() {
        if (!this.grid) return;
        const cards = this.grid.querySelectorAll('.memory-card');
        const totalCardsNeeded = this.cardSymbols.length;
        
        // ✅ 有圖片的符號對應表
        const imageMap = {
            '🫘': 'assets/images/memory/紅豆餅.png',
            '🥛': 'assets/images/memory/珍珠奶茶.png',
            '🍮': 'assets/images/memory/蚵仔煎.png',
            '🧈': 'assets/images/memory/刈包.png',
            '🥢': 'assets/images/memory/擔仔麵.png',
            '🍜': 'assets/images/memory/芋圓.png'
        };
        
        for (let i = 0; i < cards.length; i++) {
            if (i < totalCardsNeeded) {
                const symbol = this.cardSymbols[i];
                cards[i].dataset.symbol = symbol;
                const frontDiv = cards[i].querySelector('.memory-card-front');
                
                const imageUrl = imageMap[symbol];
                if (imageUrl) {
                    // 有圖片 → 顯示圖片
                    frontDiv.innerHTML = `<img src="${imageUrl}" alt="card" style="max-width:70%; max-height:70%; object-fit:contain;">`;
                } else {
                    // 沒圖片 → 顯示 emoji
                    frontDiv.innerHTML = symbol;
                    frontDiv.style.fontSize = 'clamp(20px, 4vh, 36px)';
                }
                
                cards[i].style.display = '';
                cards[i].style.visibility = '';
                cards[i].style.pointerEvents = '';
            } else {
                cards[i].style.visibility = 'hidden';
                cards[i].style.pointerEvents = 'none';
                const frontDiv = cards[i].querySelector('.memory-card-front');
                frontDiv.innerHTML = '';
            }
        }
        
        console.log(`📊 設定卡片內容: ${totalCardsNeeded} 張卡片`);
    },

    // 更新警告燈顯示（紅燈和綠燈不會同時顯示）
    updateStrikes: function() {
        if (!this.strikeLights.length) return;
        
        const isGreenLightEnabled = this.totalPairs >= 7;
        
        // 優先顯示紅燈（有失敗計數時）
        if (this.wrongStreak > 0) {
            for (let i = 0; i < this.strikeLights.length; i++) {
                if (i < this.wrongStreak) {
                    this.strikeLights[i].className = 'strike-light red active';
                } else {
                    this.strikeLights[i].className = 'strike-light';
                }
            }
        } 
        // 沒有紅燈時，顯示綠燈（僅當綠燈系統啟用且有成功計數）
        else if (isGreenLightEnabled && this.rightStreak > 0) {
            for (let i = 0; i < this.strikeLights.length; i++) {
                if (i < this.rightStreak) {
                    this.strikeLights[i].className = 'strike-light green active';
                } else {
                    this.strikeLights[i].className = 'strike-light';
                }
            }
        } 
        // 全滅（灰燈）
        else {
            for (let i = 0; i < this.strikeLights.length; i++) {
                this.strikeLights[i].className = 'strike-light';
            }
        }
    },

    // 觸發扣秒特效
    triggerTimePenaltyEffect: function() {
        // 計時器文字特效
        const timerEl = document.getElementById('memory-timer');
        if (timerEl) {
            timerEl.classList.add('penalty-flash');
            setTimeout(() => {
                timerEl.classList.remove('penalty-flash');
            }, 500);
        }
        
        // 面板閃爍紅光
        const panel = this.container.querySelector('.memory-panel');
        if (panel) {
            panel.classList.add('penalty-panel-flash');
            setTimeout(() => {
                panel.classList.remove('penalty-panel-flash');
            }, 300);
        }
        
        // ✅ 顯示扣秒提示 - 改加到 body 或 game-wrapper，避免影響佈局
        const penaltyText = document.createElement('div');
        penaltyText.textContent = '-5秒';
        penaltyText.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff3333;
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 15px #ff0000;
            z-index: 10000;
            animation: penaltyFloat 0.8s ease-out forwards;
            pointer-events: none;
            white-space: nowrap;
        `;
        document.body.appendChild(penaltyText);
        setTimeout(() => penaltyText.remove(), 800);
    },

    // 觸發加分特效（綠燈）
    triggerTimeBonusEffect: function() {
        // 計時器文字特效
        const timerEl = document.getElementById('memory-timer');
        if (timerEl) {
            timerEl.classList.add('bonus-flash');
            setTimeout(() => {
                timerEl.classList.remove('bonus-flash');
            }, 500);
        }
        
        // 面板閃爍綠光
        const panel = this.container.querySelector('.memory-panel');
        if (panel) {
            panel.classList.add('bonus-panel-flash');
            setTimeout(() => {
                panel.classList.remove('bonus-panel-flash');
            }, 300);
        }
        
        // ✅ 顯示加分提示 - 改加到 body 或 game-wrapper，避免影響佈局
        const bonusText = document.createElement('div');
        bonusText.textContent = '+5秒';
        bonusText.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #00ff88;
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 15px #00ff88;
            z-index: 10000;
            animation: bonusFloat 0.8s ease-out forwards;
            pointer-events: none;
            white-space: nowrap;
        `;
        document.body.appendChild(bonusText);
        setTimeout(() => bonusText.remove(), 800);
    },
    
    // 重置遊戲
    resetGame: function() {
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.canFlip = false;
        this.isMemorizing = false;
        
        // ✅ 重置燈光計數
        this.wrongStreak = 0;
        this.rightStreak = 0;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        this.updateStats();
        this.updateStrikes();  // ✅ 更新燈光顯示
        
        if (this.grid) {
            const cards = this.grid.querySelectorAll('.memory-card');
            cards.forEach(card => {
                card.classList.remove('is-flipped', 'matched', 'is-visible');
                card.style.visibility = '';
                card.style.pointerEvents = '';
            });
            
            // 重新隱藏多餘的卡片
            const actualCount = this.gridCols * this.gridRows;
            if (actualCount > this.cardSymbols.length) {
                const cards_ = this.grid.querySelectorAll('.memory-card');
                for (let i = this.cardSymbols.length; i < actualCount; i++) {
                    if (cards_[i]) {
                        cards_[i].style.visibility = 'hidden';
                        cards_[i].style.pointerEvents = 'none';
                    }
                }
            }
        }
    },
    
    // 更新統計
    updateStats: function() {
        if (this.matchedText) this.matchedText.innerText = this.matchedPairs;
        if (this.movesText) this.movesText.innerText = this.moves;
        if (this.timerText) this.timerText.innerText = this.timeLeft;
    },
    
    // 調整卡片大小（以高度為基準，確保所有卡片在畫面內）
    adjustCardSize: function() {
        if (!this.grid) return;
        
        const gridArea = this.grid.parentElement;
        if (!gridArea) return;
        
        // 獲取可用高度和寬度
        const availableHeight = gridArea.clientHeight;
        const availableWidth = gridArea.clientWidth;
        const rows = this.gridRows;
        const cols = this.gridCols;
        
        // 獲取 gap 值（從 CSS 讀取，預設 10px）
        const gap = 10;
        
        // 根據行數計算每張卡片的高度
        let cardHeight = (availableHeight - (gap * (rows - 1))) / rows;
        let cardWidth = cardHeight * 5 / 4;  // 5:4 比例，寬 = 高 * 1.25
        
        // 計算總寬度
        const totalWidth = (cardWidth * cols) + (gap * (cols - 1));
        
        // 如果總寬度超出可用寬度，以寬度為基準重新計算
        if (totalWidth > availableWidth) {
            cardWidth = (availableWidth - (gap * (cols - 1))) / cols;
            cardHeight = cardWidth * 4 / 5;  // 高 = 寬 * 0.8
        }
        
        // 確保卡片不小於最小尺寸（避免無法點擊）
        const minCardWidth = 40;
        const minCardHeight = 32;
        if (cardWidth < minCardWidth) cardWidth = minCardWidth;
        if (cardHeight < minCardHeight) cardHeight = minCardHeight;
        
        // 設定卡片大小
        const cards = this.grid.querySelectorAll('.memory-card');
        cards.forEach(card => {
            card.style.width = `${cardWidth}px`;
            card.style.height = `${cardHeight}px`;
        });
        
        // 設定網格容器置中
        this.grid.style.justifyContent = 'center';
        
        console.log(`📐 卡片調整: ${cols}x${rows}, 卡片 ${cardWidth.toFixed(1)}x${cardHeight.toFixed(1)}px, 可用區域 ${availableWidth}x${availableHeight}px`);
    },

    // 開始遊戲流程
    startGameSequence: function() {
        if (!this.gameActive) return;
        
        this.resetGame();
        
        // 重新洗牌
        this.prepareCardSymbols();
        this.setCardContents();

        // ✅ 新增：調整卡片大小（以高度為基準）
        this.adjustCardSize();

        const cards = this.grid.querySelectorAll('.memory-card');
        // 只顯示有內容的卡片
        const visibleCards = Array.from(cards).filter(card => card.style.visibility !== 'hidden');
        
        // 彈出動畫
        this.statusText.innerText = "預備...";
        visibleCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('is-visible');
            }, index * 50);
        });
        
        // 彈出完成後翻到正面（記憶階段）
        setTimeout(() => {
            this.statusText.innerText = "記住它們！";
            this.isMemorizing = true;
            visibleCards.forEach(card => {
                card.classList.add('is-flipped');
            });
        }, 1000);
        
        // 記憶時間到，翻回背面，開始遊戲
        setTimeout(() => {
            visibleCards.forEach(card => {
                card.classList.remove('is-flipped');
            });
            this.isMemorizing = false;
            this.canFlip = true;
            this.statusText.innerText = "開始配對！";
            this.startTimer();
        }, 1000 + this.memorizationTime);
    },
    
    // 開始計時
    startTimer: function() {
        this.timeLeft = this.gameTime;
        this.updateStats();
        
        this.timer = setInterval(() => {
            if (!this.gameActive) return;
            
            this.timeLeft--;
            this.updateStats();
            
            if (this.timeLeft <= 0) {
                this.endGame(false);
            }
        }, 1000);
    },
    
    // 處理卡片點擊
    handleCardClick: function(card) {
        if (!this.canFlip || this.isMemorizing) return;
        if (card.classList.contains('is-flipped')) return;
        if (card.classList.contains('matched')) return;
        if (this.flippedCards.length >= 2) return;
        if (card.style.visibility === 'hidden') return;
        
        card.classList.add('is-flipped');
        this.flippedCards.push(card);
        
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSFX('assets/sounds/click.mp3', 0.2);
        }
        
        if (this.flippedCards.length === 2) {
            this.checkMatch();
        }
    },
    
    // 檢查配對
    checkMatch: function() {
        this.canFlip = false;
        this.moves++;
        this.updateStats();
        
        const [card1, card2] = this.flippedCards;
        const isMatch = (card1.dataset.symbol === card2.dataset.symbol);
        
        // 判斷是否啟用綠燈系統（卡片數 ≥ 14 張，即 totalPairs ≥ 7）
        const isGreenLightEnabled = this.totalPairs >= 7;
        
        if (isMatch) {
            // ✅ 配對成功：紅燈歸零
            this.wrongStreak = 0;
            
            if (isGreenLightEnabled) {
                // 綠燈系統啟用：綠燈+1
                this.rightStreak++;
                this.updateStrikes();
                
                // 連續成功 2 次，加 5 秒
                if (this.rightStreak >= 2) {
                    this.timeLeft += 5;
                    this.updateStats();
                    this.triggerTimeBonusEffect();
                    this.rightStreak = 0;
                    this.updateStrikes();
                    
                    this.statusText.innerText = "✨ 連擊成功！時間+5秒 ✨";
                    this.statusText.style.color = '#00ff88';
                    setTimeout(() => {
                        if (this.statusText) this.statusText.style.color = '#ffd700';
                    }, 1500);
                }
            } else {
                // ✅ 綠燈系統不啟用：只更新燈光（確保紅燈被清除）
                this.updateStrikes();
            }
            
            this.matchedPairs++;
            this.updateStats();
            
            setTimeout(() => {
                card1.classList.add('matched');
                card2.classList.add('matched');
                this.flippedCards = [];
                this.canFlip = true;
                
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSFX('assets/sounds/success.mp3', 0.3);
                }
                
                if (this.matchedPairs === this.totalPairs) {
                    this.endGame(true);
                }
            }, 500);
        } else {
            // ✅ 配對失敗：綠燈歸零，紅燈+1
            this.rightStreak = 0;
            this.wrongStreak++;
            this.updateStrikes();
            
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSFX('assets/sounds/error.mp3', 0.3);
            }
            
            // 連續失敗 3 次，扣 5 秒（紅燈懲罰）
            if (this.wrongStreak >= 3) {
                this.timeLeft = Math.max(0, this.timeLeft - 5);
                this.updateStats();
                this.triggerTimePenaltyEffect();
                this.wrongStreak = 0;
                this.updateStrikes();
                
                this.statusText.innerText = "⚠️ 連續失誤！時間-5秒 ⚠️";
                this.statusText.style.color = '#ff6666';
                setTimeout(() => {
                    if (this.statusText) this.statusText.style.color = '#ffd700';
                }, 1500);
            }
            
            setTimeout(() => {
                card1.classList.remove('is-flipped');
                card2.classList.remove('is-flipped');
                this.flippedCards = [];
                this.canFlip = true;
            }, 800);
        }
    },
    
    // 顯示結算畫面
    showResultOverlay: function(isWin) {
        // ✅ 計算縮放比例（根據遊戲容器大小）
        const containerRect = this.container.getBoundingClientRect();
        const scale = Math.min(containerRect.width / 1920, containerRect.height / 1080);
        
        // 根據縮放比例計算字體大小
        const resultTextFontSize = Math.max(28, Math.min(48, 48 * scale));
        const resultScoreFontSize = Math.max(18, Math.min(32, 32 * scale));
        const resultMistakesFontSize = Math.max(14, Math.min(24, 24 * scale));
        const resultBtnFontSize = Math.max(14, Math.min(24, 24 * scale));
        const resultBtnPadding = Math.max(10, Math.min(20, 20 * scale));
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            z-index: 200;
            border-radius: 20px;
        `;
        
        const resultText = isWin ? '🎉 通關成功！ 🎉' : '💥 遊戲失敗 💥';
        const resultColor = isWin ? '#ffd700' : '#ff6666';
        
        overlay.innerHTML = `
            <div style="font-size: ${resultTextFontSize}px; font-weight: bold; color: ${resultColor}; margin-bottom: ${20 * scale}px; text-align: center;">${resultText}</div>
            <div style="font-size: ${resultScoreFontSize}px; color: #ffd700; margin-bottom: ${15 * scale}px; text-align: center;">配對: ${this.matchedPairs} / ${this.totalPairs}</div>
            <div style="font-size: ${resultMistakesFontSize}px; color: #ffaa00; margin-bottom: ${30 * scale}px; text-align: center;">步數: ${this.moves}</div>
            <button id="memory-result-btn" style="padding: ${resultBtnPadding}px ${resultBtnPadding * 2}px; font-size: ${resultBtnFontSize}px; background: linear-gradient(145deg, #e67e22, #d35400); color: white; border: none; border-radius: ${10 * scale}px; cursor: pointer; font-weight: bold;">繼續</button>
        `;
        
        this.container.appendChild(overlay);
        
        const resultBtn = document.getElementById('memory-result-btn');
        resultBtn.onclick = () => {
            overlay.remove();
            if (this.container) {
                this.container.remove();
                this.container = null;
            }
            if (this.onCompleteCallback) {
                this.onCompleteCallback(isWin);
            }
        };
        
        if (typeof AudioManager !== 'undefined') {
            if (isWin) {
                AudioManager.playSFX('assets/sounds/win.mp3', 0.5);
            } else {
                AudioManager.playSFX('assets/sounds/fail.mp3', 0.5);
            }
        }
    },

    // 結束遊戲
    endGame: function(isWin) {
        this.gameActive = false;
        this.canFlip = false;
        
        // ✅ 新增：清理 resize 監聽
        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
            this.handleResize = null;
        }
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        this.showResultOverlay(isWin);
    },
};

window.MemoryGameV2 = MemoryGameV2;