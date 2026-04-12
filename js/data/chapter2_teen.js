// js/data/chapter2_teen.js
const chapter2Data = {
    id: 'chapter2_teen',
    background: 'assets/images/ch2/background.jpg',
    
    // ✅ 定義卡片圖庫資料（6張卡片）
    cardGallery: [
        {
            id: "card1",
            thumb: "assets/images/memory/紅豆餅.png",
            fullImage: "assets/images/memory/紅豆餅.png",
            title: "紅豆餅",
            summary: "這是一張記憶卡牌，圖案是美味的紅豆餅。",
            story: "紅豆餅是台灣傳統小吃，外皮酥脆，內餡香甜。\n\n在北斗紅磚市場，有一家老字號的紅豆餅攤，已經傳承了三代，是許多在地人童年的味道。"
        },
        {
            id: "card2",
            thumb: "assets/images/memory/珍珠奶茶.png",
            fullImage: "assets/images/memory/珍珠奶茶.png",
            title: "珍珠奶茶",
            summary: "這是一張記憶卡牌，圖案是珍珠奶茶。",
            story: "珍珠奶茶是台灣最具代表性的飲料之一。\n\nQ彈的珍珠搭配香濃的奶茶，是許多遊客來台灣必喝的美食。"
        },
        {
            id: "card3",
            thumb: "assets/images/memory/蚵仔煎.png",
            fullImage: "assets/images/memory/蚵仔煎.png",
            title: "蚵仔煎",
            summary: "這是一張記憶卡牌，圖案是蚵仔煎。",
            story: "蚵仔煎是台灣夜市經典小吃。\n\n新鮮的蚵仔搭配蛋和青菜，淋上特製醬料，香氣四溢。"
        },
        {
            id: "card4",
            thumb: "assets/images/memory/刈包.png",
            fullImage: "assets/images/memory/刈包.png",
            title: "刈包",
            summary: "這是一張記憶卡牌，圖案是刈包。",
            story: "刈包又稱「虎咬豬」，是台灣傳統小吃。\n\n滷得入味的五花肉，配上酸菜、花生粉和香菜，夾在軟嫩的麵皮中，口感豐富。"
        },
        {
            id: "card5",
            thumb: "assets/images/memory/擔仔麵.png",
            fullImage: "assets/images/memory/擔仔麵.png",
            title: "擔仔麵",
            summary: "這是一張記憶卡牌，圖案是擔仔麵。",
            story: "擔仔麵發源於台南，是台灣經典麵食。\n\n肉燥香氣撲鼻，湯頭鮮美，搭配油麵和鮮蝦，簡單卻美味。"
        },
        {
            id: "card6",
            thumb: "assets/images/memory/芋圓.png",
            fullImage: "assets/images/memory/芋圓.png",
            title: "芋圓",
            summary: "這是一張記憶卡牌，圖案是芋圓。",
            story: "芋圓是九份著名的甜點。\n\n手工製作的芋圓口感Q彈，搭配紅豆湯或刨冰，是夏日消暑聖品。"
        }
    ],
    
    dialogue: [
        // ========== 開場 ==========
        {
            id: 'start',
            name: '阿斗仔',
            text: '歡迎來到第二章！這裡有個考驗記憶的小遊戲，準備好了嗎？',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '準備好了！',
                    action: 'goto',
                    target: 'memory_game_intro'
                },
                {
                    text: '先看看介紹',
                    action: 'goto',
                    target: 'show_gallery_intro'
                }
            ]
        },
        
        // ========== 圖文展示介紹（測試用） ==========
        {
            id: 'show_gallery_intro',
            name: '阿斗仔',
            text: '我先讓你看一下這次遊戲會出現的卡片圖案！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            gallery: null,  // 會在執行時動態填入
            next: 'after_gallery'
        },
        
        {
            id: 'after_gallery',
            name: '阿斗仔',
            text: '怎麼樣？這些圖案都很可愛吧！準備好要開始挑戰了嗎？',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '開始挑戰！',
                    action: 'goto',
                    target: 'memory_game_intro'
                },
                {
                    text: '再讓我看一次',
                    action: 'goto',
                    target: 'show_gallery_intro'
                }
            ]
        },
        
        // ========== 記憶遊戲介紹 ==========
        {
            id: 'memory_game_intro',
            name: '阿斗仔',
            text: '來玩記憶遊戲吧！記住卡片的位置，把相同的圖案配對起來。',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '開始挑戰',
                    action: 'minigame',
                    minigame: 'memory',
                    cardCount: 14,
                    time: 60,
                    memorizationTime: 3000,
                    returnTo: 'after_game'
                },
                {
                    text: '先看卡片圖案',
                    action: 'goto',
                    target: 'show_gallery_before_game'
                }
            ]
        },
        
        // ========== 遊戲前再看一次圖庫 ==========
        {
            id: 'show_gallery_before_game',
            name: '阿斗仔',
            text: '這些是遊戲中會出現的圖案，記熟一點比較容易過關喔！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '查看卡片圖案',
                    action: 'goto',
                    target: 'memory_game_intro',
                    gallery: null  // 會在執行時動態填入
                },
                {
                    text: '直接開始遊戲',
                    action: 'goto',
                    target: 'memory_game_intro'
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
            gallery: null,
            next: 'ending'
        },
        
        {
            id: 'after_game_fail',
            name: '阿斗仔',
            text: '沒關係，再試一次看看！要不要先複習一下卡片圖案？',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '複習卡片圖案',
                    action: 'goto',
                    target: 'show_gallery_fail',
                    gallery: null
                },
                {
                    text: '再玩一次',
                    action: 'goto',
                    target: 'memory_game_intro'
                },
                {
                    text: '先離開',
                    action: 'goto',
                    target: 'ending'
                }
            ]
        },
        
        {
            id: 'show_gallery_fail',
            name: '阿斗仔',
            text: '把這些圖案記熟，下次就能輕鬆過關囉！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            gallery: null,
            next: 'memory_game_intro'
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
chapter2Data.dialogue.forEach(line => {
    if (line.gallery === null) {
        line.gallery = chapter2Data.cardGallery;
    }
    if (line.options) {
        line.options.forEach(opt => {
            if (opt.gallery === null) {
                opt.gallery = chapter2Data.cardGallery;
            }
        });
    }
});

// ✅ 同時設定兩個變數名稱，確保 main.js 能找到
window.Chapter2_Teen = chapter2Data;
window.Chapter2 = chapter2Data;

console.log('✅ Chapter2 青少年版已載入（記憶遊戲測試版 + 圖文展示測試）');
console.log('📦 cardGallery 共有', chapter2Data.cardGallery.length, '張卡片');