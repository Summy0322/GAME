// sw.js - Service Worker
// 快取名稱（更新版本時記得修改）
const CACHE_NAME = 'game-v1';

// 需要快取的檔案列表（您的遊戲所有核心檔案）
const urlsToCache = [
  '/GAME/',
  '/GAME/index.html',
  '/GAME/style.css',
  '/GAME/css/defense-game.css',
  '/GAME/js/main.js',
  '/GAME/js/core/LoadingManager.js',
  '/GAME/js/core/GameEngine.js',
  '/GAME/js/core/AudioManager.js',
  '/GAME/js/core/SceneManager.js',
  '/GAME/js/core/Typewriter.js',
  '/GAME/js/core/DialogueSystem.js',
  '/GAME/js/data/intro.js',
  '/GAME/js/data/chapter1_teen.js',
  '/GAME/js/data/chapter1_child.js',
  '/GAME/js/minigames/DefenseLevels.js',
  '/GAME/js/minigames/DefenseGameV2.js',

  // 如果有圖片資源（可選）
  '/GAME/assets/images/title2.png',
  '/GAME/assets/images/intro/封面.jpg',
  '/GAME/assets/images/ch1/background.jpg',
  '/GAME/assets/images/characters/阿斗仔.png',
];

// ========== 安裝 Service Worker ==========
self.addEventListener('install', event => {
  console.log('📦 Service Worker 安裝中');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ 快取檔案中...');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('❌ 快取失敗:', err);
      })
  );
});

// ========== 攔截請求並從快取回應 ==========
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 找到快取就直接回傳
        if (response) {
          return response;
        }
        // 沒找到就去網路抓
        return fetch(event.request);
      })
  );
});

// ========== 更新 Service Worker ==========
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker 啟動');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 刪除舊版本快取
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});