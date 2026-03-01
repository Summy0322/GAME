// js/minigames/MemoryGame.js
const MemoryGame = {
    canvas: document.getElementById('gameCanvas'),
    ctx: null,
    gameActive: false,
    onCompleteCallback: null,
    
    start: function(options) {
        console.log('🎮 記憶遊戲開始');
        
        this.ctx = this.canvas.getContext('2d');
        this.gameActive = true;
        this.onCompleteCallback = options.onComplete;
        
        this.init();
        this.gameLoop();
    },
    
    init: function() {
        console.log('初始化記憶遊戲');
        
        // 模擬遊戲過程，3秒後自動完成
        setTimeout(() => {
            this.gameComplete(true);
        }, 3000);
    },
    
    gameLoop: function() {
        if (!this.gameActive) return;
        
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    },
    
    update: function() {
        // 更新遊戲邏輯
    },
    
    draw: function() {
        // 繪製遊戲畫面
        this.ctx.clearRect(0, 0, 1280, 720);
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 0, 1280, 720);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px Arial';
        this.ctx.fillText('記憶小遊戲', 500, 360);
        this.ctx.font = '20px Arial';
        this.ctx.fillText('3秒後自動完成', 540, 400);
    },
    
    gameComplete: function(success) {
        this.gameActive = false;
        
        if (this.onCompleteCallback) {
            this.onCompleteCallback(success);
        }
    }
};

window.MemoryGame = MemoryGame;