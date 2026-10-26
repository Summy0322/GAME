// js/core/LoadingManager.js
const LoadingManager = {
    loadingScreen: null,
    progressText: null,
    
    init: function() {
        if (window.Logger) window.Logger.info('🔧 LoadingManager 初始化');
        
        // 獲取元素並檢查是否存在
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressText = document.getElementById('loading-progress');
        
        // ==== 加入安全檢查 ====
        if (!this.loadingScreen) {
            if (window.Logger) window.Logger.error('❌ 找不到 loading-screen 元素！請確認 HTML 中有加入');
            // 如果找不到，建立一個備用的（可選）
            this.createFallbackLoadingScreen();
        } else {
            if (window.Logger) window.Logger.info('✅ 找到 loading-screen');
        }
        
        if (!this.progressText) {
            if (window.Logger) window.Logger.error('❌ 找不到 loading-progress 元素');
        }
    },
    
    // 建立備用 Loading 畫面（如果 HTML 中忘記加）
    createFallbackLoadingScreen: function() {
        const wrapper = document.getElementById('game-wrapper');
        if (!wrapper) return;
        
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-screen';
        loadingDiv.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            display: none;
            justify-content: center;
            align-items: center;
            color: #e67e22;
        `;
        
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="spinner" style="width:50px;height:50px;border:5px solid #333;border-top:5px solid #e67e22;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 15px;"></div>
                <p>資源加載中... <span id="loading-progress">0</span>%</p>
            </div>
            <style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>
        `;
        
        wrapper.appendChild(loadingDiv);
        this.loadingScreen = loadingDiv;
        this.progressText = document.getElementById('loading-progress');
        if (window.Logger) window.Logger.info('✅ 已建立備用 Loading 畫面');
    },
    
    // 每次只保留最新載入工作的完成回呼，避免快速重複操作切回舊場景。
    loadId: 0,
    assetTimeoutMs: 15000,

    showAndLoad: function(assets, onComplete) {
        const loadId = ++this.loadId;
        if (!this.loadingScreen) this.init();
        if (this.loadingScreen) this.loadingScreen.style.display = 'flex';
        this.updateProgress(0);
        const urls = [...new Set(assets.filter(src => typeof src === 'string' && src))];
        let loadedCount = 0;
        if (urls.length === 0) {
            this.updateProgress(100);
            this.finish(onComplete);
            return;
        }
        urls.forEach(src => {
            let settled = false;
            const done = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                if (loadId !== this.loadId) return;
                loadedCount++;
                this.updateProgress(Math.floor(loadedCount / urls.length * 100));
                if (loadedCount === urls.length) this.finish(onComplete);
            };
            const timeout = setTimeout(() => {
                if (window.Logger) window.Logger.warn('資源載入逾時，繼續遊戲:', src);
                done();
            }, this.assetTimeoutMs);
            const path = src.split(/[?#]/)[0];
            try {
                if (/\.(ttf|otf|woff2?)$/i.test(path)) this.loadFont('BpmfZihiKai', src, done);
                else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path)) this.loadImage(src, done);
                else if (/\.(mp4|webm|ogg)$/i.test(path)) this.loadVideo(src, done);
                else done();
            } catch (error) {
                if (window.Logger) window.Logger.warn('資源載入失敗，繼續遊戲:', src, error);
                done();
            }
        });
    },
    
    loadImage: function(src, callback) {
        const img = new Image();
        img.onload = callback;
        img.onerror = () => {
            if (window.Logger) window.Logger.warn('⚠️ 圖片載入失敗:', src);
            callback(); // 即使失敗也繼續
        };
        img.src = src;
    },
    
    loadVideo: function(src, callback) {
        const video = document.createElement('video');
        video.preload = 'auto';
        let completed = false;
        const finish = () => {
            if (completed) return;
            completed = true;
            video.oncanplaythrough = null;
            video.onerror = null;
            callback();
        };
        video.oncanplaythrough = finish;
        video.onerror = () => {
            if (window.Logger) window.Logger.warn('⚠️ 影片載入失敗:', src);
            finish();
        };
        video.src = src;
        video.load();
    },

    // 在 LoadingManager 中加入字型載入方法
    loadFont: function(family, url, callback) {
        // 使用 CSS Font Loading API
        if (document.fonts && document.fonts.load) {
            const font = new FontFace(family, `url(${url})`);
            font.load().then(() => {
                document.fonts.add(font);
                if (window.Logger) window.Logger.info(`✅ 字型載入完成: ${family}`);
                callback();
            }).catch(err => {
                if (window.Logger) window.Logger.warn(`⚠️ 字型載入失敗: ${family}`, err);
                callback(); // 失敗也繼續
            });
        } else {
            // 降級方案：使用預先定義的 link 或 style
            const style = document.createElement('style');
            style.textContent = `
                @font-face {
                    font-family: '${family}';
                    src: url('${url}') format('truetype');
                    font-display: swap;
                }
            `;
            document.head.appendChild(style);
            
            // 等待一段時間假裝載入完成
            setTimeout(callback, 500);
        }
    },
    
    updateProgress: function(percent) {
        if (this.progressText) {
            this.progressText.innerText = percent;
        }
    },
    
    finish: function(onComplete) {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
        if (onComplete) onComplete();
    }
};

window.LoadingManager = LoadingManager;
