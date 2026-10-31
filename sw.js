// 首頁只預存程式；圖片與字型在實際使用後快取，音樂／影片按需載入。
const CACHE_NAME = 'game-v56';
const urlsToCache = [
  "/GAME/",
  "/GAME/index.html",
  "/GAME/style.css",
  "/GAME/css/defense-game.css",
  "/GAME/css/memory-game.css",
  "/GAME/css/interact-system.css",
  "/GAME/css/viewport.css",
  "/GAME/css/dialogue-layout.css",
  "/GAME/css/audio-settings.css",
  "/GAME/css/dialogue-skip.css",
  "/GAME/css/game-settings.css",
  "/GAME/css/game-pause.css",
  "/GAME/js/core/Logger.js",
  "/GAME/js/core/ErrorReporter.js",
  "/GAME/js/data/minigameAssets.js",
  "/GAME/js/core/LoadingManager.js",
  "/GAME/js/core/MinigameSession.js",
  "/GAME/js/core/GameClock.js",
  "/GAME/js/core/GamePause.js",
  "/GAME/js/core/GameEngine.js",
  "/GAME/js/core/AudioManager.js",
  "/GAME/js/core/GameMusic.js",
  "/GAME/js/core/AudioSettings.js",
  "/GAME/js/core/GameSettings.js",
  "/GAME/js/core/SceneManager.js",
  "/GAME/js/core/Typewriter.js",
  "/GAME/js/core/DialogueSystem.js",
  "/GAME/js/core/DialogueSkip.js",
  "/GAME/js/data/intro.js",
  "/GAME/js/data/chapter1_teen.js",
  "/GAME/js/data/chapter2_teen.js",
  "/GAME/js/data/chapter3_teen.js",
  "/GAME/js/data/chapter1_child.js",
  "/GAME/js/data/chapter2_child.js",
  "/GAME/js/data/chapter3_child.js",
  "/GAME/js/data/quizQuestions.js",
  "/GAME/js/minigames/DefenseLevels.js",
  "/GAME/js/minigames/defense/DefenseTrailRender.js",
  "/GAME/js/minigames/defense/DefenseInput.js",
  "/GAME/js/minigames/defense/DefenseAttackRunner.js",
  "/GAME/js/minigames/DefenseGameV2.js",
  "/GAME/js/minigames/MemoryGameV2.js",
  "/GAME/js/minigames/InteractSystem.js",
  "/GAME/js/minigames/PaymentSystem.js",
  "/GAME/js/core/GallerySystem.js",
  "/GAME/js/core/CollectionSystem.js",
  "/GAME/js/main.js"
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
    caches.open(CACHE_NAME).then(cache => cache.match(event.request))
      .then(response => {
        // 找到快取就直接回傳
        if (response) {
          return response;
        }
        // 沒找到就去網路抓
        return fetch(event.request).then(response => {
          const url = new URL(event.request.url);
          if (event.request.method === 'GET' && url.origin === self.location.origin &&
              ['image', 'font'].includes(event.request.destination) && response.ok && response.status === 200) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {}));
          }
          return response;
        });
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
          if (cacheName.startsWith('game-') && cacheName !== CACHE_NAME) {
            console.log('🗑️ 刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

