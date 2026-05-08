// js/data/chapter2_child.js
const chapter2ChildData = {
    id: 'chapter2_child',
    background: 'assets/images/ch2/background.png',
    
    // ✅ 定義卡片圖庫資料（6張卡片）
    cardGallery: [
            {
                id: "card1",
                thumb: "assets/images/memory/詹永豐米店.png",
                fullImage: "assets/images/memory/詹永豐米店.png",
                title: "詹永豐米店",
                summary: "大榕樹下，有一家會親自試吃米飯的老米店。",
                story: "在大榕樹旁，有一家很老的米店，已經傳到第三代了。以前店裡有很大的碾米機，工作時會有很多灰塵，是長輩辛苦工作的地方。現在雖然沒有機器了，但老闆還是會自己試吃每一種米，確定米飯吃起來很Q、放冷也好吃才會賣。店裡還有一個小小的模型，把以前的米店樣子留下來。"
            },
            {
                id: "card2",
                thumb: "assets/images/memory/其實豆製所.png",
                fullImage: "assets/images/memory/其實豆製所.png",
                title: "其實豆製所",
                summary: "在紅磚市場裡，用台灣黃豆做豆漿的店。",
                story: "紅磚市場裡有一家豆製所，會用台灣種的黃豆做出香香的豆漿、豆腐和豆花。這家店曾經休息過，後來又重新開張，讓市場變得更熱鬧，也讓大家重新認識豆子的味道。"
            },
            {
                id: "card3",
                thumb: "assets/images/memory/彰化北斗肉圓.png",
                fullImage: "assets/images/memory/彰化北斗肉圓.png",
                title: "彰化北斗肉圓",
                summary: "這裡的肉圓是三角形，而且吃起來很Q。",
                story: "一般的肉圓是圓形的，但這裡的肉圓是用手捏成三角形。做的時候會先蒸，再拿去炸，外皮會變得有點透明，吃起來很有彈性，很特別。"
            },
            {
                id: "card4",
                thumb: "assets/images/memory/正老店阿美.png",
                fullImage: "assets/images/memory/正老店阿美.png",
                title: "正老店阿美",
                summary: "一碗加了高麗菜和軟軟豬皮的古早味飯。",
                story: "這家店已經開了很久，很多人從小就吃這碗飯。高麗菜會先炒過，再慢慢煮到很入味，米飯會吸滿湯汁。上面還會放一片軟軟的豬皮、肉燥和鴨蛋，每一口都有不同的味道。"
            },
            {
                id: "card5",
                thumb: "assets/images/memory/阿在伯炸彈蔥油餅.png",
                fullImage: "assets/images/memory/阿在伯炸彈蔥油餅.png",
                title: "阿在伯炸彈蔥油餅",
                summary: "放進油鍋後會膨起來的蔥油餅。",
                story: "把麵團放進熱油裡後，餅會慢慢鼓起來，變得像氣球一樣大。外面炸得有點脆，裡面還有很多蔥，聞起來很香。"
            },
            {
                id: "card6",
                thumb: "assets/images/memory/奠安宮楊記炸物.png",
                fullImage: "assets/images/memory/奠安宮楊記炸物.png",
                title: "奠安宮楊記炸物",
                summary: "外面酥酥、裡面軟軟的炸豆腐。",
                story: "白色的豆腐放進油鍋後，外面會變成金黃色，吃起來脆脆的，但裡面還是軟軟又熱熱的，一口咬下去有兩種不同的感覺。"
            },
            {
                id: "card7",
                thumb: "assets/images/memory/碗粿.png",
                fullImage: "assets/images/memory/碗粿.png",
                title: "碗粿",
                summary: "...",
                story: "..."
            }
        ],
    
    dialogue: [
        // ========== 開場 ==========
        {
            id: 'start',
            type: 'narration',
            text: '你剛認識紅磚市場的故事。\n 阿斗仔說：「現在，我們\n來看看這裡的食物吧！」\n跟著他走進市場，\n開始新的冒險。',
            speed: 60,                   // 可選：打字速度（毫秒/字），預設 50
            next: 'show_options'
        },
        {
            id: 'show_options',
            name: '阿斗仔',
            text: '選擇一個開場',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '市場的味道',
                    action: 'goto',
                    target: 'intro'
                },
                {
                    text: '市場的人情',
                    action: 'goto',
                    target: 'intro'
                }
            ]
        },
        
        // ========== 圖文展示介紹 ==========
        {
            id: 'intro',
            name: '阿斗仔',
            text: '準備好了嗎?',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '先看看介紹',
                    action: 'goto',
                    target: 'show_gallery_intro',
                    gallery: null
                }
            ]
        },
        {
            id: 'show_gallery_intro',
            name: '阿斗仔',
            text: '這些圖案都記住了嗎？在開始遊戲之前，先來回答幾個問題吧！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '好的，來回答問題！',
                    action: 'goto',
                    target: 'quiz_start'
                },
                {
                    text: '再看一次',
                    action: 'goto',
                    target: 'show_gallery_intro',
                    gallery: null,
                }
            ]
        },
        
        // ========== 問答測驗（答對1題以上才能玩遊戲）==========
        {
            id: 'quiz_start',
            name: '阿斗仔',
            text: '來考考你剛剛看到的卡片內容！答對一題以上才能玩遊戲喔！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '開始測驗',
                    action: 'quiz',
                    questionRange: { start: 1, end: 8 },
                    questionCount: 2,  // 隨機抽 2 題
                    // ✅ 根據答對題數（0、1、2）跳轉到不同節點
                    scoreTargets: {
                        0: 'quiz_failed',      // 答對 0 題 → 無法玩遊戲
                        1: 'quiz_passed',      // 答對 1 題 → 可以玩遊戲（普通）
                        2: 'quiz_perfect'      // 答對 2 題 → 可以玩遊戲（獎勵）
                    }
                }
            ]
        },
        
        // ❌ 答對 0 題：失敗，無法玩遊戲
        {
            id: 'quiz_failed',
            name: '阿斗仔',
            text: '哎呀！你沒有通過測驗，這樣不能玩遊戲喔！再回去複習一下卡片內容吧！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '回去複習卡片',
                    action: 'goto',
                    target: 'show_gallery_intro',
                    gallery: null
                }
            ]
        },
        
        // ✅ 答對 1 題：可以玩遊戲（普通難度）
        {
            id: 'quiz_passed',
            name: '阿斗仔',
            text: '恭喜你通過測驗！來挑戰記憶遊戲吧！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '開始挑戰',
                    action: 'minigame',
                    minigame: 'memory',
                    cardCount: 10,
                    gameMode: 'attempts',
                    lightMode: 'red',
                    needMemorize: false,
                    totalAttempts: 15,
                    returnTo: 'after_game_success'
                }
            ]
        },
        
        // 🌟 答對 2 題（滿分）：可以玩遊戲（獎勵難度）
        {
            id: 'quiz_perfect',
            name: '阿斗仔',
            text: '太厲害了！你全部答對了！給你一個獎勵，遊戲會比較簡單喔！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '開始挑戰',
                    action: 'minigame',
                    minigame: 'memory',
                    cardCount: 10,
                    gameMode: 'attempts',
                    lightMode: 'red',
                    needMemorize: false,
                    totalAttempts: 30,  // 更多次數
                    returnTo: 'after_game_success'
                }
            ]
        },
        
        // ========== 遊戲完成後 ==========
        {
            id: 'after_game_success',
            name: '阿斗仔',
            text: '太厲害了！你的記憶力真好！🎉 要不要看看你剛剛記住了哪些圖案？',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '看看卡片圖案',
                    action: 'goto',
                    target: 'show_gallery_success',
                    gallery: null
                },
                {
                    text: '繼續前進',
                    action: 'goto',
                    target: 'ending'
                }
            ]
        },
        
        {
            id: 'show_gallery_success',
            name: '阿斗仔',
            text: '這些就是剛剛出現過的卡片圖案，你都記住了嗎？',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'ending'
        },
        
        // ========== 結束 ==========
        {
            id: 'ending',
            name: '阿斗仔',
            text: '第二章完成了！繼續往下探索吧～',
            characterImage: 'assets/images/characters/阿斗仔.png'
        }
    ]
};

// ✅ 在載入後動態填入 gallery 資料（避免引用錯誤）
chapter2ChildData.dialogue.forEach(line => {
    if (line.gallery === null) {
        line.gallery = chapter2ChildData.cardGallery;
    }
    if (line.options) {
        line.options.forEach(opt => {
            if (opt.gallery === null) {
                opt.gallery = chapter2ChildData.cardGallery;
            }
        });
    }
});

// ✅ 設定變數名稱，確保 main.js 能找到
window.Chapter2_Child = chapter2ChildData;

console.log('✅ Chapter2 兒童版已載入（記憶遊戲測試版 + 圖文展示測試）');
console.log('📦 cardGallery 共有', chapter2ChildData.cardGallery.length, '張卡片');