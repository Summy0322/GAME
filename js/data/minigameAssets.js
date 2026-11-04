// js/data/minigameAssets.js
// 小遊戲資源清單（單一來源，供預載入與記憶牌面對應）

(function () {
    const MEMORY_CARD_URLS = [
        'assets/images/minigames/memory/cards/詹永豐米店.png',
        'assets/images/minigames/memory/cards/其實豆製所.png',
        'assets/images/minigames/memory/cards/彰化北斗肉圓.png',
        'assets/images/minigames/memory/cards/正老店阿美.png',
        'assets/images/minigames/memory/cards/阿在伯炸彈蔥油餅.png',
        'assets/images/minigames/memory/cards/奠安宮楊記炸物.png',
        'assets/images/minigames/memory/cards/碗粿.png'
    ];

    /** 與 MemoryGameV2 卡片符號對應（有圖片的符號） */
    const MEMORY_EMOJI_TO_IMAGE = {
        '🫘': 'assets/images/minigames/memory/cards/詹永豐米店.png',
        '🥛': 'assets/images/minigames/memory/cards/其實豆製所.png',
        '🍮': 'assets/images/minigames/memory/cards/彰化北斗肉圓.png',
        '🧈': 'assets/images/minigames/memory/cards/正老店阿美.png',
        '🥢': 'assets/images/minigames/memory/cards/阿在伯炸彈蔥油餅.png',
        '🍜': 'assets/images/minigames/memory/cards/奠安宮楊記炸物.png',
        '🌱': 'assets/images/minigames/memory/cards/碗粿.png'
    };

    // 各關仍保留原本的圖像組合；完全相同的位元組只存一份。
    function defenseAssetUrl(level, file) {
        const base = 'assets/images/minigames/defense/';
        if (file === 'player.png' || file === 'stone.png') return base + 'shared/' + file;
        if (level === 3 && file === 'projectile.png') return base + 'level1/projectile.png';
        if (level === 3 && file === 'heavy-enemy.png') return base + 'level2/projectile-hit.png';
        return base + `level${level}/` + file;
    }

    function defenseLevelUrls(levelNum) {
        const files = [
            'bg.png',
            'player.png',
            'enemy.png',
            'stone.png',
            'projectile.png',
            'projectile-hit.png',
            'shield.png',
            'aoe-line.png'
        ];
        if (levelNum === 3) files.push('heavy-enemy.png');
        const urls = files.map(file => defenseAssetUrl(levelNum, file));
        // 包括故事版特殊配置引用的跨關素材，不下載整套其他關卡。
        for (const config of Object.values(window.DefenseLevels?.[levelNum] || {})) {
            urls.push(...Object.values(config).filter(value => typeof value === 'string' && value.startsWith('assets/')));
        }
        return [...new Set(urls)];
    }

    window.MinigameAssets = {
        getDefenseAssetUrl: defenseAssetUrl,
        memoryCardImageUrls: MEMORY_CARD_URLS.slice(),
        memoryEmojiToImageUrl: Object.assign({}, MEMORY_EMOJI_TO_IMAGE),

        getMemoryPreloadUrls: function () {
            return MEMORY_CARD_URLS.slice();
        },

        /** 指定關卡時僅載入該小關；省略參數則保留完整清單供工具使用。 */
        getDefensePreloadUrls: function (level) {
            if (level !== undefined) {
                const number = Number(level);
                return Number.isInteger(number) && number >= 1 && number <= 3 ? defenseLevelUrls(number) : [];
            }
            const out = [];
            for (let L = 1; L <= 3; L++) {
                out.push(...defenseLevelUrls(L));
            }
            return [...new Set(out)];
        }
    };
})();
