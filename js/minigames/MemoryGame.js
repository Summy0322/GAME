// js/minigames/MemoryGame.js
const MemoryGame = {
    canvas: document.getElementById('gameCanvas'),
    ctx: null,
    gameActive: false,
    onCompleteCallback: null,  // 儲存回調函數
    
    start: function(options) {
        console.log('記憶遊戲開始');
        
        this.ctx = this.canvas.getContext('2d');
        this.gameActive = true;
        this.onCompleteCallback = options.onComplete;  // 儲存回調
        
        this.init();
        this.gameLoop();
    },
    
    init: function() {
        // 初始化遊戲邏輯
        console.log('初始化記憶遊戲');
        
        // 範例：3秒後自動完成
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
        // 更新遊戲狀態
    },
    
    draw: function() {
        // 繪製遊戲畫面
        this.ctx.clearRect(0, 0, 1280, 720);
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 0, 1280, 720);
        
        // 繪製遊戲元素
        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px Arial';
        this.ctx.fillText('記憶小遊戲', 500, 360);
        this.ctx.font = '20px Arial';
        this.ctx.fillText('3秒後自動完成', 540, 400);
    },
    
    gameComplete: function(success) {
        this.gameActive = false;
        
        // 呼叫回調函數
        if (this.onCompleteCallback) {
            this.onCompleteCallback(success);
        }
    }
};