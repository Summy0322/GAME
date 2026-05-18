// js/core/GameEngine.js
// 專門處理小遊戲和 Loading 的引擎

const GameEngine = {
    // 目前執行中的小遊戲
    currentMinigame: null,
    
    // 收集小遊戲需要的資源
    collectMinigameAssets: function(minigameName, options) {
        if (window.MinigameAssets) {
            if (minigameName === 'memory') {
                return [...new Set(MinigameAssets.getMemoryPreloadUrls())];
            }
            if (minigameName === 'defense') {
                const urls = MinigameAssets.getDefensePreloadUrls();
                if (window.Logger) window.Logger.info(`📦 防禦遊戲預載入 ${urls.length} 張圖片`);
                return [...new Set(urls)];
            }
        }

        return [];
    },
    
    // 啟動小遊戲
    startMinigame: function(minigameName, options) {
        if (window.Logger) window.Logger.info('🎮 GameEngine 啟動小遊戲:', minigameName);
        
        // ✅ 收集需要的資源
        const assets = this.collectMinigameAssets(minigameName, options);
        
        if (assets.length > 0 && typeof LoadingManager !== 'undefined') {
            // 顯示 Loading 並預載入資源
            if (window.Logger) window.Logger.info(`📦 預載入 ${assets.length} 個小遊戲資源`);
            LoadingManager.showAndLoad(assets, () => {
                this._startMinigameImmediately(minigameName, options);
            });
        } else {
            // 沒有資源需要預載入，直接開始
            this._startMinigameImmediately(minigameName, options);
        }
    },
    
    _startMinigameImmediately: function(minigameName, options) {
        if (window.MemoryGameV2 && typeof MemoryGameV2.stop === 'function') {
            MemoryGameV2.stop();
        }
        if (window.DefenseGameV2 && typeof DefenseGameV2.stop === 'function') {
            DefenseGameV2.stop();
        }

        const gameMode =
            typeof window !== 'undefined' && window.gameMode
                ? window.gameMode
                : 'adult';

        // 顯示畫布
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.display = 'block';
            canvas.style.zIndex = '10';
            canvas.classList.add('minigame-active');
        }
        
        // 小遊戲映射表
        const minigameMap = {
            'finding': window.FindingGame,
            'puzzle': window.PuzzleGame,
            'defense': window.DefenseGameV2,
            'memory': window.MemoryGameV2,
        };
        
        const Minigame = minigameMap[minigameName];
        if (Minigame && Minigame.start) {
            this.currentMinigame = minigameName;
            Minigame.start({
                ...options,
                gameMode:
                    options && (options.gameMode === 'child' || options.gameMode === 'adult')
                        ? options.gameMode
                        : gameMode,
                onComplete: (success) => {
                    // 小遊戲結束後隱藏畫布
                    if (canvas) {
                        canvas.style.display = 'none';
                        canvas.classList.remove('minigame-active');
                    }
                    this.currentMinigame = null;
                    
                    // 執行完成回調
                    if (options && options.onComplete) {
                        options.onComplete(success);
                    }
                },
                level: options.level || 1
            });
        } else {
            if (window.Logger) window.Logger.error('❌ 找不到小遊戲:', minigameName);
            setTimeout(() => {
                if (canvas) {
                    canvas.style.display = 'none';
                    canvas.classList.remove('minigame-active');
                }
                if (options && options.onComplete) {
                    options.onComplete(true);
                }
            }, 500);
        }
    },
    
    // 簡單的 Loading 功能（如果需要）
    showLoading: function(message = '載入中...') {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        canvas.style.display = 'block';
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 1280, 720);
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 1280, 720);
        
        ctx.fillStyle = '#e67e22';
        ctx.font = '36px Arial';
        ctx.fillText(message, 500, 360);
    },
    
    hideLoading: function() {
        const canvas = document.getElementById('gameCanvas');
        if (canvas && !this.currentMinigame) {
            canvas.style.display = 'none';
        }
    },

    // 在 GameEngine.js 中加入動態載入功能
    loadMinigameCSS: function() {
        // 檢查是否已載入
        if (document.querySelector('link[href="css/minigame.css"]')) {
            return;
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/minigame.css';
        document.head.appendChild(link);
    }
};

// 確保全域可用
window.GameEngine = GameEngine;