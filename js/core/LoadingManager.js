// js/core/LoadingManager.js
const LoadingManager = {
    loadingScreen: null,
    progressText: null,
    
    init: function() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressText = document.getElementById('loading-progress');
        console.log('✅ LoadingManager 初始化');
    },
    
    // 顯示 Loading 並載入資源
    showAndLoad: function(assets, onComplete) {
        // 顯示 Loading 畫面
        this.loadingScreen.style.display = 'flex';
        this.updateProgress(0);
        
        let loadedCount = 0;
        const totalCount = assets.length;
        
        if (totalCount === 0) {
            this.finish(onComplete);
            return;
        }
        
        // 開始載入資源
        assets.forEach(src => {
            // 判斷是圖片還是影片
            if (src.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                this.loadImage(src, () => {
                    loadedCount++;
                    this.updateProgress(Math.floor((loadedCount / totalCount) * 100));
                    
                    if (loadedCount === totalCount) {
                        setTimeout(() => this.finish(onComplete), 300);
                    }
                });
            } else if (src.match(/\.(mp4|webm|ogg)$/i)) {
                this.loadVideo(src, () => {
                    loadedCount++;
                    this.updateProgress(Math.floor((loadedCount / totalCount) * 100));
                    
                    if (loadedCount === totalCount) {
                        setTimeout(() => this.finish(onComplete), 300);
                    }
                });
            } else {
                // 其他資源類型
                loadedCount++;
                this.updateProgress(Math.floor((loadedCount / totalCount) * 100));
                
                if (loadedCount === totalCount) {
                    setTimeout(() => this.finish(onComplete), 300);
                }
            }
        });
    },
    
    loadImage: function(src, callback) {
        const img = new Image();
        img.onload = callback;
        img.onerror = () => {
            console.warn('⚠️ 圖片載入失敗:', src);
            callback(); // 即使失敗也繼續
        };
        img.src = src;
    },
    
    loadVideo: function(src, callback) {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.oncanplaythrough = callback;
        video.onerror = () => {
            console.warn('⚠️ 影片載入失敗:', src);
            callback();
        };
        video.src = src;
        video.load();
    },
    
    updateProgress: function(percent) {
        if (this.progressText) {
            this.progressText.innerText = percent;
        }
    },
    
    finish: function(onComplete) {
        this.loadingScreen.style.display = 'none';
        if (onComplete) onComplete();
    }
};

window.LoadingManager = LoadingManager;