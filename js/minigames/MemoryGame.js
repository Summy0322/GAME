// js/minigames/MemoryGame.js
const MemoryGame = {
    canvas: document.getElementById('gameCanvas'),
    ctx: null,
    gameActive: false,
    onCompleteCallback: null,
    backgroundImage: null,  // 儲存背景圖片
    loaded: false,          // 標記是否載入完成
    
    start: function(options) {
        console.log('🎮 記憶遊戲開始');
        
        this.ctx = this.canvas.getContext('2d');
        this.gameActive = true;
        this.onCompleteCallback = options.onComplete;
        
        // 確保畫布顯示
        this.canvas.style.display = 'block';
        
        // 載入背景圖片
        this.loadBackground(() => {
            this.init();
            this.gameLoop();
        });
    },
    
    // 載入背景圖片
    loadBackground: function(callback) {
        const img = new Image();
        img.onload = () => {
            this.backgroundImage = img;
            this.loaded = true;
            console.log('✅ 背景圖片載入完成');
            if (callback) callback();
        };
        img.onerror = () => {
            console.warn('⚠️ 背景圖片載入失敗，使用預設背景');
            this.loaded = false;
            if (callback) callback();
        };
        img.src = 'assets/images/背景.png';  // 請確認路徑正確
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
        // 清空畫布
        this.ctx.clearRect(0, 0, 1280, 720);
        
        // ===== 繪製背景圖片 =====
        if (this.backgroundImage && this.loaded) {
            // 繪製背景圖片，填滿整個畫布
            this.ctx.drawImage(this.backgroundImage, 0, 0, 1280, 720);
        } else {
            // 如果沒有背景圖片，使用預設顏色
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(0, 0, 1280, 720);
        }
        
        // ===== 繪製遊戲內容（在背景之上）=====
        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px Arial';
        this.ctx.fillText('記憶小遊戲', 500, 360);
        this.ctx.font = '20px Arial';
        this.ctx.fillText('3秒後自動完成', 540, 400);
        
        // 可以加一個半透明遮罩讓文字更清楚
        // this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        // this.ctx.fillRect(0, 0, 1280, 720);
        // 重新繪製文字（在遮罩之上）
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