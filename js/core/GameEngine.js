// js/core/GameEngine.js
// 專門處理小遊戲和 Loading 的引擎

const GameEngine = {
    // 目前執行中的小遊戲
    currentMinigame: null,
    
    // 啟動小遊戲
    startMinigame: function(minigameName, options) {
        console.log('🎮 GameEngine 啟動小遊戲:', minigameName);
        
        // 顯示畫布
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.display = 'block';
            canvas.style.zIndex = '10';
            canvas.classList.add('minigame-active');
        }
        
        // 小遊戲映射表
        const minigameMap = {
            'memory': window.MemoryGame,
            'finding': window.FindingGame,
            'puzzle': window.PuzzleGame
        };
        
        const Minigame = minigameMap[minigameName];
        if (Minigame && Minigame.start) {
            this.currentMinigame = minigameName;
            Minigame.start({
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
                }
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