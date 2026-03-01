// js/main.js

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
    backBtn.style.display = 'none';

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
document.addEventListener('DOMContentLoaded', function() {
    console.log('📌 DOM 載入完成');

    // 初始化 LoadingManager
    if (typeof LoadingManager !== 'undefined' && LoadingManager.init) {
        LoadingManager.init();
    }
    
    // 檢查 AudioManager 是否已初始化
    console.log('🎵 AudioManager 狀態:', {
        exists: !!window.AudioManager,
        bgMusic: AudioManager?.bgMusic,
        sfxPlayer: AudioManager?.sfxPlayer
    });
    
    // 如果 AudioManager 還沒初始化，手動初始化
    if (typeof AudioManager !== 'undefined' && !AudioManager.bgMusic) {
        console.log('🎵 手動初始化 AudioManager');
        AudioManager.init();
    }
    
    // 初始化 SceneManager
    if (typeof SceneManager !== 'undefined' && SceneManager.init) {
        SceneManager.init();
    }
    
    // 初始化 Typewriter
    if (typeof Typewriter !== 'undefined' && Typewriter.init) {
        Typewriter.init();
    }
    
    // 初始化 DialogueSystem
    if (typeof DialogueSystem !== 'undefined' && DialogueSystem.init) {
        DialogueSystem.init();
    }
    
    // 開始遊戲按鈕
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log('👉 點擊開始遊戲');
            
            // 播放點擊音效
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSFX('assets/sounds/click.mp3');
            }
            
            // 預載開場影片和介紹圖片
            const assets = [
                'assets/videos/intro.mp4',
                'assets/images/characters/阿斗仔.png',  // 開場介紹角色
                'assets/images/封面.jpg'          // 開場介紹背景
            ];
            
            LoadingManager.showAndLoad(assets, () => {
                playIntroVideo();
            });
        });
    }
    
    // 離開遊戲按鈕
    const exitBtn = document.getElementById('exitBtn');
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            if (confirm('確定要離開遊戲嗎？')) {
                window.close();
            }
        });
    }
});

// 載入章節
function loadChapter(chapterId) {
    const backBtn = document.querySelector('#game-container .back-btn');
    backBtn.style.display = 'block';

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