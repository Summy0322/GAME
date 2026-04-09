// js/data/chapter1_child.js
window.Chapter1_Child = {
    id: 'chapter1_child',
    background: 'assets/images/ch1/background.jpg',
    
    dialogue: [
        // ========== 開場 ==========
        {
            id: 'start',
            name: '阿斗仔',
            text: '小朋友，歡迎來到紅磚市場！這裡藏著好多以前的故事，也有好多有趣的小任務。準備好了嗎？',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '準備好了！出發！',
                    action: 'goto',
                    target: 'intro_level1'
                }
            ]
        },
        
        // ========== 第一關：最早的市場 ==========
        {
            id: 'intro_level1',
            name: '阿斗仔',
            text: '你知道嗎？這裡以前還沒有紅磚房子喔！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_reply1'
        },
        {
            id: 'kid_reply1',
            name: '小朋友',
            text: '真的嗎？那以前是什麼樣子？',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'level1_story1'
        },
        {
            id: 'level1_story1',
            name: '阿斗仔',
            text: '以前這裡是熱鬧的牛墟，旁邊還有一個簡單的臨時市場。大家會來賣牛、賣農具，清早的時候特別熱鬧。',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_reply2'
        },
        {
            id: 'kid_reply2',
            name: '小朋友',
            text: '感覺好像很好玩！',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'level1_story2'
        },
        {
            id: 'level1_story2',
            name: '阿斗仔',
            text: '對呀！你看，市場阿桑正在蒸肉圓呢。可是肉圓太滑了，一不小心就四處飛出去啦！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_reply3'
        },
        {
            id: 'kid_reply3',
            name: '小朋友',
            text: '哇！那怎麼辦？',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'level1_challenge'
        },
        {
            id: 'level1_challenge',
            name: '阿斗仔',
            text: '現在就要請你來幫忙！快拿碗或盤子，把飛出去的肉圓接住，幫阿桑保住今天的早餐吧！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '好！我來幫忙接肉圓！',
                    action: 'minigame',
                    minigame: 'defense',
                    level: 1,
                    returnTo: 'level1_complete'
                }
            ]
        },
        {
            id: 'level1_complete',
            name: '阿斗仔',
            text: '哇！你好厲害！肉圓都接住了！阿桑說謝謝你～',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_happy'
        },
        {
            id: 'kid_happy',
            name: '小朋友',
            text: '耶！我接到好多肉圓！',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'level1_transition'
        },
        {
            id: 'level1_transition',
            name: '阿斗仔',
            text: '太好了！繼續下一關吧！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'intro_level2'
        },
        
        // ========== 第二關：火災與重建 ==========
        {
            id: 'intro_level2',
            name: '阿斗仔',
            text: '接下來要帶你去看看市場經歷的大事件喔！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_ask_fire'
        },
        {
            id: 'kid_ask_fire',
            name: '小朋友',
            text: '阿斗仔，後來這裡怎麼變成紅磚市場的呢？',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'level2_story1'
        },
        {
            id: 'level2_story1',
            name: '阿斗仔',
            text: '因為人越來越多，大家就一起蓋了一座真正的紅磚市場。本來這裡很熱鬧，可是後來發生了一場大火。',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_scared'
        },
        {
            id: 'kid_scared',
            name: '小朋友',
            text: '大火？那不是很可怕嗎？',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'level2_story2'
        },
        {
            id: 'level2_story2',
            name: '阿斗仔',
            text: '是啊，市場裡有些地方被燒黑了，還留下燒焦的痕跡。可是別怕，這一關你不是來看火災的，你是來幫忙守護市場的！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_help'
        },
        {
            id: 'kid_help',
            name: '小朋友',
            text: '我要怎麼幫忙？',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'level2_challenge'
        },
        {
            id: 'level2_challenge',
            name: '阿斗仔',
            text: '火團一直掉下來了！你要用水球和水牆把火團擋住，不讓它繼續破壞市場！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '好！我要把火通通擋下來！',
                    action: 'minigame',
                    minigame: 'defense',
                    level: 2,
                    returnTo: 'level2_complete'
                }
            ]
        },
        {
            id: 'level2_complete',
            name: '阿斗仔',
            text: '太棒了！你成功守住市場了！這樣我們就有機會把它重新修好！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_proud'
        },
        {
            id: 'kid_proud',
            name: '小朋友',
            text: '耶！我保護了市場！',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'level2_transition'
        },
        {
            id: 'level2_transition',
            name: '阿斗仔',
            text: '你好棒！我們來看最後一關吧！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'intro_level3'
        },
        
        // ========== 第三關：現在的樣子 ==========
        {
            id: 'intro_level3',
            name: '阿斗仔',
            text: '現在的紅磚市場，雖然沒有以前那麼熱鬧，可是它還是好好站在這裡。',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_question'
        },
        {
            id: 'kid_question',
            name: '小朋友',
            text: '所以它像一個會說故事的地方嗎？',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'level3_story1'
        },
        {
            id: 'level3_story1',
            name: '阿斗仔',
            text: '沒錯！每一塊紅磚，都在告訴我們以前的故事。這裡不只是市場，也是北斗很重要的記憶喔！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_understand'
        },
        {
            id: 'kid_understand',
            name: '小朋友',
            text: '我知道了，這裡是裝滿回憶的紅磚市場！',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'level3_challenge'
        },
        {
            id: 'level3_challenge',
            name: '阿斗仔',
            text: '最後一關！豆乳快要完成了，但是黃豆一直亂跳！快來幫我用篩子接住黃豆，做出好喝的豆乳！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            options: [
                {
                    text: '沒問題！交給我！',
                    action: 'minigame',
                    minigame: 'defense',
                    level: 3,
                    returnTo: 'level3_complete'
                }
            ]
        },
        {
            id: 'level3_complete',
            name: '阿斗仔',
            text: '🎉 太厲害了！你完成了所有任務！豆乳也做好了！',
            characterImage: 'assets/images/characters/阿斗仔.png',
            next: 'kid_celebrate'
        },
        {
            id: 'kid_celebrate',
            name: '小朋友',
            text: '哇～我成功了！謝謝阿斗仔帶我認識紅磚市場！',
            characterImage: 'assets/images/characters/non_character.png',
            next: 'ending'
        },
        
        // ========== 結束 ==========
        {
            id: 'ending',
            name: '阿斗仔',
            text: '紅磚市場的大門永遠為你打開喔！下次再來聽更多故事吧！拜拜～',
            characterImage: 'assets/images/characters/阿斗仔.png'
        }
    ]
};

console.log('✅ Chapter1_Child 小朋友版已載入');