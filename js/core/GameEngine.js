// js/core/GameEngine.js
// 專門處理小遊戲和 Loading 的引擎

const GameEngine = {
    // 目前執行中的小遊戲
    currentMinigame: null,
    
    // 收集小遊戲需要的資源
    collectMinigameAssets: function(minigameName, options) {
        const assets = [];
        
        // 記憶遊戲：收集卡片圖片
        if (minigameName === 'memory') {
            const cardImages = [
                'assets/images/memory/詹永豐米店.png',
                'assets/images/memory/其實豆製所.png',
                'assets/images/memory/彰化北斗肉圓.png',
                'assets/images/memory/正老店阿美.png',
                'assets/images/memory/阿在伯炸彈蔥油餅.png',
                'assets/images/memory/奠安宮楊記炸物.png',
                'assets/images/memory/碗粿.png'
            ];
            assets.push(...cardImages);
        }
        
        // 防禦遊戲：收集防禦遊戲的圖片
        if (minigameName === 'defense') {
            const level = options.level || 1;
            
            // ✅ 根據關卡編號收集對應的圖片
            const levelAssets = [
                // Level 1 圖片
                `assets/images/defense/level1/bg.png`,
                `assets/images/defense/level1/player.png`,
                `assets/images/defense/level1/enemy.png`,
                `assets/images/defense/level1/stone.png`,
                `assets/images/defense/level1/projectile.png`,
                `assets/images/defense/level1/projectile_hit.png`,
                `assets/images/defense/level1/shield.png`,
                `assets/images/defense/level1/aoe_line.png`,
                
                // Level 2 圖片
                `assets/images/defense/level2/bg.png`,
                `assets/images/defense/level2/player.png`,
                `assets/images/defense/level2/enemy.png`,
                `assets/images/defense/level2/stone.png`,
                `assets/images/defense/level2/projectile.png`,
                `assets/images/defense/level2/projectile_hit.png`,
                `assets/images/defense/level2/shield.png`,
                `assets/images/defense/level2/aoe_line.png`,
                `assets/images/defense/level2/heavy_enemy.png`,
                
                // Level 3 圖片
                `assets/images/defense/level3/bg.png`,
                `assets/images/defense/level3/player.png`,
                `assets/images/defense/level3/enemy.png`,
                `assets/images/defense/level3/stone.png`,
                `assets/images/defense/level3/projectile.png`,
                `assets/images/defense/level3/projectile_hit.png`,
                `assets/images/defense/level3/shield.png`,
                `assets/images/defense/level3/aoe_line.png`,
                `assets/images/defense/level3/heavy_enemy.png`
            ];
            
            // ✅ 全部加入（Layer 會根據實際需要載入，不影響效能）
            assets.push(...levelAssets);
            
            console.log(`📦 防禦遊戲預載入 ${levelAssets.length} 張圖片`);
        }
        
        // 去重
        return [...new Set(assets)];
    },
    
    // 啟動小遊戲
    startMinigame: function(minigameName, options) {
        console.log('🎮 GameEngine 啟動小遊戲:', minigameName);
        
        // ✅ 收集需要的資源
        const assets = this.collectMinigameAssets(minigameName, options);
        
        if (assets.length > 0 && typeof LoadingManager !== 'undefined') {
            // 顯示 Loading 並預載入資源
            console.log(`📦 預載入 ${assets.length} 個小遊戲資源`);
            LoadingManager.showAndLoad(assets, () => {
                this._startMinigameImmediately(minigameName, options);
            });
        } else {
            // 沒有資源需要預載入，直接開始
            this._startMinigameImmediately(minigameName, options);
        }
    },
    
    _startMinigameImmediately: function(minigameName, options) {
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
            console.error('❌ 找不到小遊戲:', minigameName);
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