// js/main.js

// 全域變數記錄選擇的年齡模式
let gameMode = null; // 'child' 或 'adult'

// 顯示年齡選擇視窗
function showAgeSelect() {
    return new Promise((resolve) => {
        const ageDialog = document.getElementById('age-select-dialog');
        const childBtn = document.getElementById('age-child');
        const adultBtn = document.getElementById('age-adult');
        
        // 如果找不到元素，直接 resolve（預防錯誤）
        if (!ageDialog || !childBtn || !adultBtn) {
            resolve('adult');
            return;
        }        
        // 顯示視窗
        ageDialog.style.display = 'flex';
        
        // 小朋友版選擇
        childBtn.onclick = () => {
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSFX('assets/sounds/click.mp3');
            }
            window.gameMode = 'child';
            gameMode = 'child';
            ageDialog.style.display = 'none';
            
            // 為 body 加上標記
            document.body.classList.add('child-mode');
            
            console.log('✅ 已設定 gameMode = child');
            resolve('child');
        };

        
        // 一般版選擇
        adultBtn.onclick = () => {
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSFX('assets/sounds/click.mp3');
            }
            window.gameMode = 'adult';
            gameMode = 'adult';
            ageDialog.style.display = 'none';
            
            // 移除小朋友版標記
            document.body.classList.remove('child-mode');
            
            console.log('✅ 已設定 gameMode = adult');
            resolve('adult');
        };
    });
}

// ===== 場景切換函數（全域）=====
function showScene(sceneId) {
    console.log('切換場景到:', sceneId);
    
    if (typeof SceneManager !== 'undefined' && SceneManager.show) {
        SceneManager.show(sceneId);
        return;
    }
    
    const scenes = document.querySelectorAll('.scene');
    scenes.forEach(scene => {
        scene.style.display = 'none';
    });
    
    const target = document.getElementById(sceneId);
    if (target) {
        target.style.display = 'flex';
    } else {
        console.error('找不到場景:', sceneId);
    }
}

// 預載入開場所需的所有資源（影片 + 字型 + 開場介紹圖片）
function preloadIntroAssets(onComplete) {
    console.log('📦 開始預載入開場資源...');
    
    // 收集需要預載入的資源
    const assetsToPreload = [];
    
    // 1. 加入開場影片
    const introVideo = document.getElementById('intro-video');
    if (introVideo && introVideo.src) {
        assetsToPreload.push(introVideo.src);
    } else {
        const videoSrc = introVideo ? introVideo.getAttribute('src') || introVideo.getAttribute('data-src') : null;
        if (videoSrc) assetsToPreload.push(videoSrc);
    }
    
    // 2. 只有當選擇小朋友模式時，才預載入注音字型
    // 這樣可以節省一般模式的載入時間
    if (gameMode === 'child') {
        const fontUrl = './assets/fonts/BpmfZihiKaiStd-Regular.ttf';
        assetsToPreload.push(fontUrl);
        console.log('📦 小朋友模式，加入注音字型預載入');
    }
    
    // 3. 收集 IntroChapter 中的所有圖片資源
    if (typeof IntroChapter !== 'undefined' && IntroChapter) {
        if (IntroChapter.background) {
            assetsToPreload.push(IntroChapter.background);
        }
        
        if (IntroChapter.dialogue && Array.isArray(IntroChapter.dialogue)) {
            IntroChapter.dialogue.forEach(line => {
                if (line.characterImage) {
                    assetsToPreload.push(line.characterImage);
                }
            });
        }
    }
    
    // 4. 加入常見的 UI 圖片
    const commonImages = [
        'assets/images/title2.png',
        'assets/images/intro/封面.jpg'
    ];
    commonImages.forEach(img => {
        if (!assetsToPreload.includes(img)) {
            assetsToPreload.push(img);
        }
    });
    
    // 去重
    const uniqueAssets = [...new Set(assetsToPreload)];
    console.log(`📦 需要預載入 ${uniqueAssets.length} 個資源:`, uniqueAssets);
    
    // 使用 LoadingManager 載入資源
    if (typeof LoadingManager !== 'undefined' && LoadingManager.showAndLoad) {
        LoadingManager.showAndLoad(uniqueAssets, () => {
            console.log('✅ 開場資源預載入完成');
            
            // 額外確保字型已經生效（小朋友模式）
            if (gameMode === 'child') {
                // 強制瀏覽器重新計算樣式，確保字型生效
                setTimeout(() => {
                    document.body.style.opacity = '0.999';
                    setTimeout(() => {
                        document.body.style.opacity = '';
                    }, 50);
                }, 100);
            }
            
            if (onComplete) onComplete();
        });
    } else {
        console.warn('⚠️ LoadingManager 未定義，跳過預載入');
        if (onComplete) onComplete();
    }
}

// 播放開場影片
function playIntroVideo() {
    console.log('🎬 播放開場影片');
    
    const videoScene = document.getElementById('video-scene');
    const video = document.getElementById('intro-video');
    const skipBtn = document.getElementById('skip-video-btn');
    
    // 切換到影片場景
    showScene('video-scene');
    
    // 確保影片從頭播放
    video.currentTime = 0;
    
    // 嘗試播放影片
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log('⚠️ 影片自動播放失敗，可能需要用戶互動:', error);
            // 如果自動播放失敗，顯示播放按鈕
        });
    }
    
    // 影片結束時，前往開場介紹
    video.onended = () => {
        console.log('📽️ 影片播放結束');
        video.pause();
        showIntro();  // 前往開場介紹
    };
    
    // 跳過按鈕功能
    skipBtn.onclick = () => {
        console.log('⏭️ 跳過影片');
        video.pause();
        video.currentTime = 0;
        showIntro();  // 前往開場介紹
    };
}

// 顯示開場介紹
function showIntro() {
    const backBtn = document.querySelector('#game-container .back-btn');
    if (backBtn) backBtn.style.display = 'none';

    console.log('🎬 播放開場介紹');
    
    if (typeof IntroChapter === 'undefined') {
        console.error('❌ 找不到 IntroChapter 資料');
        showScene('level-select');
        return;
    }
    
    showScene('game-container');
    
    if (typeof DialogueSystem !== 'undefined') {
        DialogueSystem.isIntro = true;
        DialogueSystem.loadChapter(IntroChapter);
    } else {
        console.error('❌ DialogueSystem 未定義');
        showScene('level-select');
    }
}

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📌 DOM 載入完成');

    // 先初始化 LoadingManager
    if (typeof LoadingManager !== 'undefined') {
        LoadingManager.init();
    }
    
    // 初始化系統
    if (typeof AudioManager !== 'undefined') AudioManager.init();
    if (typeof SceneManager !== 'undefined') SceneManager.init();
    if (typeof Typewriter !== 'undefined') Typewriter.init();
    if (typeof DialogueSystem !== 'undefined') DialogueSystem.init();
    
    // 顯示年齡選擇視窗（等待使用者選擇）
    const selectedMode = await showAgeSelect();
    console.log('選擇的模式:', selectedMode);
    
    // 開始遊戲按鈕 - 加入預載入流程
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log('👉 點擊開始遊戲');
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSFX('assets/sounds/click.mp3');
            }
            
            // 先預載入資源，完成後再播放影片
            preloadIntroAssets(() => {
                playIntroVideo();
            });
        });
    }
    
    // 離開遊戲按鈕
    const exitBtn = document.getElementById('exitBtn');
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            // 這裡可以呼叫您之前做的退出確認
            if (typeof showExitConfirm !== 'undefined') {
                showExitConfirm((confirmed) => {
                    if (confirmed) window.close();
                });
            } else {
                if (confirm('確定要離開遊戲嗎？')) window.close();
            }
        });
    }
    
    // 設定返回按鈕
    if (typeof setupBackButton !== 'undefined') {
        setupBackButton();
    }
});

// 載入章節
function loadChapter(chapterId) {
    const backBtn = document.querySelector('#game-container .back-btn');
    if (backBtn) backBtn.style.display = 'block';

    console.log('📖 載入章節:', chapterId);
    
    if (typeof AudioManager !== 'undefined') {
        AudioManager.playSFX('assets/sounds/click.mp3');
    }
    
    const chapterMap = {
        'chapter1': window.Chapter1,
        'chapter2': window.Chapter2,
        'chapter3': window.Chapter3
    };
    
    const chapterData = chapterMap[chapterId];
    
    if (chapterData) {
        console.log('✅ 找到章節資料');

        // 收集該章節需要的所有資源
        const assets = collectChapterAssets(chapterData);
        
        LoadingManager.showAndLoad(assets, () => {
            showScene('game-container');
            
            if (typeof DialogueSystem !== 'undefined') {
                DialogueSystem.isIntro = false;
                DialogueSystem.loadChapter(chapterData);
            }
        });
    } else {
        console.error('❌ 找不到章節資料:', chapterId);
        alert('章節資料載入失敗，請檢查 console');
    }
}

// 收集章節需要的所有圖片資源
function collectChapterAssets(chapterData) {
    const assets = [];
    
    // 加入背景圖
    if (chapterData.background) {
        assets.push(chapterData.background);
    }
    
    // 遍歷所有對話，收集角色圖片
    if (chapterData.dialogue) {
        chapterData.dialogue.forEach(line => {
            if (line.characterImage) {
                assets.push(line.characterImage);
            }
        });
    }
    
    // 去重
    return [...new Set(assets)];
}

// 顯示退出確認彈窗
function showExitConfirm(callback) {
    const dialog = document.getElementById('exit-confirm-dialog');
    const yesBtn = document.getElementById('exit-confirm-yes');
    const noBtn = document.getElementById('exit-confirm-no');
    
    // 顯示彈窗
    if (!dialog || !yesBtn || !noBtn) {
        if (callback) callback(confirm('確定要離開嗎？'));
        return;
    }
    
    // 暫停遊戲背景互動（可選）
    dialog.style.display = 'flex';
    document.getElementById('game-container').style.pointerEvents = 'none';
    
    // 清除舊的事件監聽器（避免重複綁定）
    yesBtn.replaceWith(yesBtn.cloneNode(true));
    noBtn.replaceWith(noBtn.cloneNode(true));
    
    // 重新獲取按鈕
    const newYesBtn = document.getElementById('exit-confirm-yes');
    const newNoBtn = document.getElementById('exit-confirm-no');
    
    // 確認按鈕
    newYesBtn.onclick = () => {
        // 播放點擊音效
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSFX('assets/sounds/click.mp3');
        }
        
        // 隱藏彈窗
        dialog.style.display = 'none';
        document.getElementById('game-container').style.pointerEvents = 'auto';
        
        // 執行回調（退出邏輯）
        if (callback) callback(true);
    };
    
    // 取消按鈕
    newNoBtn.onclick = () => {
        // 播放點擊音效
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSFX('assets/sounds/click.mp3');
        }
        
        // 隱藏彈窗
        dialog.style.display = 'none';
        document.getElementById('game-container').style.pointerEvents = 'auto';
        
        // 執行回調（不退出）
        if (callback) callback(false);
    };
}

// 修改返回按鈕的事件
function setupBackButton() {
    const backBtn = document.querySelector('#game-container .back-btn');
    if (backBtn) {
        // 移除原有 onclick
        backBtn.removeAttribute('onclick');
        
        // 綁定新事件
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // 播放點擊音效
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSFX('assets/sounds/click.mp3');
            }
            
            // 顯示確認彈窗
            showExitConfirm((confirmed) => {
                if (confirmed) {
                    console.log('確認退出，返回關卡選擇');
                    
                    // 停止背景音樂
                    if (typeof AudioManager !== 'undefined') {
                        AudioManager.stopBGM();
                    }
                    
                    // 清除對話系統
                    if (typeof DialogueSystem !== 'undefined') {
                        DialogueSystem.endDialogue();
                    }
                    
                    // 返回關卡選擇
                    showScene('level-select');
                } else {
                    console.log('取消退出，繼續遊戲');
                }
            });
        });
    }
}