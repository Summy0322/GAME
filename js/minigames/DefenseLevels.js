// js/minigames/DefenseLevels.js
// 防禦遊戲關卡設定（獨立管理，方便編輯）

const DefenseLevels = {
    // ========== 第一關：肉圓滑溜戰（只有一般和多重）==========
    1: {
        // 成人版
        adult: {
            name: '肉圓滑溜戰',
            bgImage: 'assets/images/defense/level1/bg.png',
            playerImage: 'assets/images/defense/level1/player.png',
            enemyImage: 'assets/images/defense/level1/enemy.png',
            projectileImage: 'assets/images/defense/level1/projectile.png',
            projectileHitImage: 'assets/images/defense/level1/projectile_hit.png',
            shieldImage: 'assets/images/defense/level1/shield.png',
            aoeLineImage: 'assets/images/defense/level1/aoe_line.png',
            attackPatterns: [
                // 基礎方向練習
                { type: 'NORMAL', dir: 'up', wait: 3500, next: 500, text: '🥟 上方飛來肉圓！向上滑動丟出碗接住！' },
                { type: 'NORMAL', dir: 'down', wait: 3500, next: 500, text: '🥟 下方飛來肉圓！向下滑動丟出碗接住！' },
                { type: 'NORMAL', dir: 'left', wait: 3500, next: 500, text: '🥟 左方飛來肉圓！向左滑動丟出碗接住！' },
                { type: 'NORMAL', dir: 'right', wait: 3500, next: 500, text: '🥟 右方飛來肉圓！向右滑動丟出碗接住！' },
                // 進階：兩個方向同時
                { type: 'MULTI', dirs: ['up', 'down'], wait: 4000, next: 800, text: '🥟 上下同時飛來肉圓！依序滑動接住！' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 4000, next: 800, text: '🥟 左右同時飛來肉圓！依序滑動接住！' },
                // 更多練習
                { type: 'NORMAL', dir: 'up', wait: 3500, next: 500, text: '🥟 又來一顆上方肉圓！快接住！' },
                { type: 'NORMAL', dir: 'right', wait: 3500, next: 500, text: '🥟 右方肉圓偷襲！向右滑動！' },
                // 三個方向（多重）
                { type: 'MULTI', dirs: ['up', 'left', 'right'], wait: 4500, next: 800, text: '🥟 三顆肉圓同時飛來！依序接住！' },
                { type: 'MULTI', dirs: ['down', 'left', 'right'], wait: 4500, next: 800, text: '🥟 三顆肉圓同時飛來！快滑動！' },
                // 結尾
                { type: 'END', text: '' }
            ]
        },
        // 小朋友版
        child: {
            name: '肉圓滑溜戰',
            bgImage: 'assets/images/defense/level1/bg.png',
            playerImage: 'assets/images/defense/level1/player.png',
            enemyImage: 'assets/images/defense/level1/enemy.png',
            projectileImage: 'assets/images/defense/level1/projectile.png',
            projectileHitImage: 'assets/images/defense/level1/projectile_hit.png',
            shieldImage: 'assets/images/defense/level1/shield.png',
            aoeLineImage: 'assets/images/defense/level1/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 4500, next: 500, text: '🥟 上面有肉圓！往上滑～' },
                { type: 'NORMAL', dir: 'down', wait: 4500, next: 500, text: '🥟 下面有肉圓！往下滑～' },
                { type: 'NORMAL', dir: 'left', wait: 4500, next: 500, text: '🥟 左邊有肉圓！往左滑～' },
                { type: 'NORMAL', dir: 'right', wait: 4500, next: 500, text: '🥟 右邊有肉圓！往右滑～' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, next: 800, text: '🥟 上下都有肉圓！都滑滑看～' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 5000, next: 800, text: '🥟 左右都有肉圓！都滑滑看～' },
                { type: 'NORMAL', dir: 'up', wait: 4500, next: 500, text: '🥟 上面又來一顆！往上滑～' },
                { type: 'NORMAL', dir: 'left', wait: 4500, next: 500, text: '🥟 左邊有肉圓！往左滑～' },
                { type: 'MULTI', dirs: ['up', 'left', 'right'], wait: 5500, next: 800, text: '🥟 三顆肉圓！都滑滑看～' },
                { type: 'END', text: '' }
            ]
        }
    },

    // ========== 第二關：火災防衛戰（一般、多重、重擊）==========
    2: {
        // 成人版
        adult: {
            name: '火災防衛戰',
            bgImage: 'assets/images/defense/level2/bg.png',
            playerImage: 'assets/images/defense/level2/player.png',
            enemyImage: 'assets/images/defense/level2/enemy.png',
            heavyEnemyImage: 'assets/images/defense/level2/enemy.png',
            projectileImage: 'assets/images/defense/level2/projectile.png',
            projectileHitImage: 'assets/images/defense/level2/projectile_hit.png',
            shieldImage: 'assets/images/defense/level2/shield.png',
            aoeLineImage: 'assets/images/defense/level2/aoe_line.png',
            attackPatterns: [
                // 一般攻擊
                { type: 'NORMAL', dir: 'up', wait: 3500, next: 500, text: '🔥 上方掉落火苗！向上滑動發射水球！' },
                { type: 'NORMAL', dir: 'down', wait: 3500, next: 500, text: '🔥 下方掉落火苗！向下滑動發射水球！' },
                { type: 'NORMAL', dir: 'left', wait: 3500, next: 500, text: '🔥 左方掉落火苗！向左滑動發射水球！' },
                { type: 'NORMAL', dir: 'right', wait: 3500, next: 500, text: '🔥 右方掉落火苗！向右滑動發射水球！' },
                // 多重攻擊
                { type: 'MULTI', dirs: ['up', 'down'], wait: 4000, next: 800, text: '🔥 上下同時起火！依序發射水球！' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 4000, next: 800, text: '🔥 左右同時起火！依序滅火！' },
                { type: 'MULTI', dirs: ['up', 'left', 'right'], wait: 4500, next: 800, text: '🔥 三處起火！快發射水球！' },
                // 重擊攻擊
                { type: 'HEAVY', dir: 'up', wait: 5000, next: 1000, text: '🔥🔥 火牆來襲！向上滑動產生水牆！' },
                { type: 'HEAVY', dir: 'down', wait: 5000, next: 1000, text: '🔥🔥 火牆來襲！向下滑動產生水牆！' },
                { type: 'HEAVY', dir: 'left', wait: 5000, next: 1000, text: '🔥🔥 火牆來襲！向左滑動產生水牆！' },
                // 混合
                { type: 'NORMAL', dir: 'right', wait: 3500, next: 500, text: '🔥 右方火苗！快發射水球！' },
                { type: 'HEAVY', dir: 'right', wait: 5000, next: 1000, text: '🔥🔥 右方火牆！向右滑動產生水牆！' },
                { type: 'MULTI', dirs: ['up', 'down', 'left', 'right'], wait: 5000, next: 800, text: '🔥 四處起火！快全部撲滅！' },
                { type: 'HEAVY', dir: 'up', wait: 5000, next: 1000, text: '🔥🔥 最後火牆！向上滑動守住！' },
                // 結尾
                { type: 'END', text: '' }
            ]
        },
        // 小朋友版
        child: {
            name: '火災防衛戰',
            bgImage: 'assets/images/defense/level2/bg.png',
            playerImage: 'assets/images/defense/level2/player.png',
            enemyImage: 'assets/images/defense/level2/enemy.png',
            heavyEnemyImage: 'assets/images/defense/level2/enemy.png',
            projectileImage: 'assets/images/defense/level2/projectile.png',
            projectileHitImage: 'assets/images/defense/level2/projectile_hit.png',
            shieldImage: 'assets/images/defense/level2/shield.png',
            aoeLineImage: 'assets/images/defense/level2/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 4500, next: 500, text: '🔥 上面有火！往上滑～' },
                { type: 'NORMAL', dir: 'down', wait: 4500, next: 500, text: '🔥 下面有火！往下滑～' },
                { type: 'NORMAL', dir: 'left', wait: 4500, next: 500, text: '🔥 左邊有火！往左滑～' },
                { type: 'NORMAL', dir: 'right', wait: 4500, next: 500, text: '🔥 右邊有火！往右滑～' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, next: 800, text: '🔥 上下都有火！都滑滑看～' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 5000, next: 800, text: '🔥 左右都有火！都滑滑看～' },
                { type: 'HEAVY', dir: 'up', wait: 6000, next: 1000, text: '🔥🔥 大火來了！往上滑水牆！' },
                { type: 'HEAVY', dir: 'down', wait: 6000, next: 1000, text: '🔥🔥 大火來了！往下滑水牆！' },
                { type: 'MULTI', dirs: ['up', 'down', 'left'], wait: 5500, next: 800, text: '🔥 好多火！都滑滑看～' },
                { type: 'HEAVY', dir: 'left', wait: 6000, next: 1000, text: '🔥🔥 大火來了！往左滑水牆！' },
                { type: 'HEAVY', dir: 'right', wait: 6000, next: 1000, text: '🔥🔥 大火來了！往右滑水牆！' },
                { type: 'END', text: '' }
            ]
        }
    },

    // ========== 第三關：豆乳研磨戰（全部類型：一般、多重、重擊、AOE）==========
    3: {
        // 成人版
        adult: {
            name: '豆乳研磨戰',
            bgImage: 'assets/images/defense/level3/bg.png',
            playerImage: 'assets/images/defense/level3/player.png',
            enemyImage: 'assets/images/defense/level3/enemy.png',
            heavyEnemyImage: 'assets/images/defense/level3/heavy_enemy.png',
            projectileImage: 'assets/images/defense/level3/projectile.png',
            projectileHitImage: 'assets/images/defense/level3/projectile_hit.png',
            shieldImage: 'assets/images/defense/level3/shield.png',
            aoeLineImage: 'assets/images/defense/level3/aoe_line.png',
            attackPatterns: [
                // 一般攻擊
                { type: 'NORMAL', dir: 'up', wait: 3500, next: 500, text: '🫘 上方跳出黃豆！向上滑動用篩子接住！' },
                { type: 'NORMAL', dir: 'down', wait: 3500, next: 500, text: '🫘 下方跳出黃豆！向下滑動用篩子接住！' },
                { type: 'NORMAL', dir: 'left', wait: 3500, next: 500, text: '🫘 左方跳出黃豆！向左滑動用篩子接住！' },
                { type: 'NORMAL', dir: 'right', wait: 3500, next: 500, text: '🫘 右方跳出黃豆！向右滑動用篩子接住！' },
                // 多重攻擊
                { type: 'MULTI', dirs: ['up', 'down'], wait: 4000, next: 800, text: '🫘 上下同時跳出黃豆！依序滑動篩選！' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 4000, next: 800, text: '🫘 左右同時跳出黃豆！依序滑動篩選！' },
                { type: 'MULTI', dirs: ['up', 'down', 'left'], wait: 4500, next: 800, text: '🫘 三處跳出黃豆！快篩選！' },
                // 重擊攻擊
                { type: 'HEAVY', dir: 'up', wait: 5000, next: 1000, text: '💨 沸騰蒸氣來襲！向上滑動守住純淨！' },
                { type: 'HEAVY', dir: 'down', wait: 5000, next: 1000, text: '💨 沸騰蒸氣來襲！向下滑動守住純淨！' },
                { type: 'HEAVY', dir: 'left', wait: 5000, next: 1000, text: '💨 沸騰蒸氣來襲！向左滑動守住純淨！' },
                { type: 'HEAVY', dir: 'right', wait: 5000, next: 1000, text: '💨 沸騰蒸氣來襲！向右滑動守住純淨！' },
                // AOE 攻擊
                { type: 'AOE', wait: 5500, next: 1200, text: '🔄 石磨轉動！旋轉手機推回豆乳！' },
                // 混合攻擊
                { type: 'NORMAL', dir: 'up', wait: 3500, next: 500, text: '🫘 上方黃豆跳出！接住！' },
                { type: 'HEAVY', dir: 'down', wait: 5000, next: 1000, text: '💨 下方蒸氣！向下滑動守住！' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 4000, next: 800, text: '🫘 左右都有黃豆！都滑滑看～' },
                { type: 'AOE', wait: 5500, next: 1200, text: '🔄 石磨加速轉動！旋轉手機！' },
                { type: 'HEAVY', dir: 'up', wait: 5000, next: 1000, text: '💨 上方蒸氣來襲！向上滑動！' },
                { type: 'MULTI', dirs: ['up', 'down', 'left', 'right'], wait: 5000, next: 800, text: '🫘 四面八方黃豆！全部接住！' },
                { type: 'AOE', wait: 5500, next: 1200, text: '🔄 最後一轉！旋轉手機完成研磨！' },
                // 結尾
                { type: 'END', text: '' }
            ]
        },
        // 小朋友版
        child: {
            name: '豆乳研磨戰',
            bgImage: 'assets/images/defense/level3/bg.png',
            playerImage: 'assets/images/defense/level3/player.png',
            enemyImage: 'assets/images/defense/level3/enemy.png',
            heavyEnemyImage: 'assets/images/defense/level3/heavy_enemy.png',
            projectileImage: 'assets/images/defense/level3/projectile.png',
            projectileHitImage: 'assets/images/defense/level3/projectile_hit.png',
            shieldImage: 'assets/images/defense/level3/shield.png',
            aoeLineImage: 'assets/images/defense/level3/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 4500, next: 500, text: '🫘 上面有黃豆！往上滑接住！' },
                { type: 'NORMAL', dir: 'down', wait: 4500, next: 500, text: '🫘 下面有黃豆！往下滑接住！' },
                { type: 'NORMAL', dir: 'left', wait: 4500, next: 500, text: '🫘 左邊有黃豆！往左滑接住！' },
                { type: 'NORMAL', dir: 'right', wait: 4500, next: 500, text: '🫘 右邊有黃豆！往右滑接住！' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, next: 800, text: '🫘 上下都有黃豆！都滑滑看～' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 5000, next: 800, text: '🫘 左右都有黃豆！都滑滑看～' },
                { type: 'HEAVY', dir: 'up', wait: 6000, next: 1000, text: '💨💨 蒸氣來了！往上滑擋住！' },
                { type: 'HEAVY', dir: 'down', wait: 6000, next: 1000, text: '💨💨 蒸氣來了！往下滑擋住！' },
                { type: 'AOE', wait: 6500, next: 1200, text: '🔄 石磨轉轉轉！轉手機推回去！' },
                { type: 'MULTI', dirs: ['up', 'down', 'left'], wait: 5500, next: 800, text: '🫘 好多黃豆！都接住喔～' },
                { type: 'HEAVY', dir: 'left', wait: 6000, next: 1000, text: '💨💨 蒸氣來了！往左滑擋住！' },
                { type: 'AOE', wait: 6500, next: 1200, text: '🔄 石磨轉轉轉！再轉一次！' },
                { type: 'HEAVY', dir: 'right', wait: 6000, next: 1000, text: '💨💨 蒸氣來了！往右滑擋住！' },
                { type: 'MULTI', dirs: ['left', 'right', 'up'], wait: 5500, next: 800, text: '🫘 很多黃豆！都接住喔～' },
                { type: 'AOE', wait: 6500, next: 1200, text: '🔄 最後一次轉轉！加油！' },
                { type: 'END', text: '' }
            ]
        }
    },

    // ========== 測試關卡 ==========
    99: {
        adult: {
            name: '🧪 測試關卡',
            bgImage: 'assets/images/defense/level2/bg.png',
            playerImage: 'assets/images/defense/level2/player.png',
            enemyImage: 'assets/images/defense/level2/enemy.png',
            projectileImage: 'assets/images/defense/level2/projectile.png',
            projectileHitImage: 'assets/images/defense/level2/projectile_hit.png',
            shieldImage: 'assets/images/defense/level2/shield.png',
            aoeLineImage: 'assets/images/defense/level3/aoe_line.png',
            attackPatterns: [
                { type: 'AOE', wait: 5000, text: '' },
                { type: 'NORMAL', dir: 'up', wait: 3000, text: '' },
                { type: 'HEAVY', dir: 'right', wait: 5000, text: '' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 4000, text: '' },
                { type: 'AOE', wait: 5000, text: '' },
                { type: 'END', text: '' }
            ]
        },
        child: {
            name: '🧪 測試關卡',
            bgImage: 'assets/images/defense/level1/bg.png',
            playerImage: 'assets/images/defense/level1/player.png',
            enemyImage: 'assets/images/defense/level1/enemy.png',
            projectileImage: 'assets/images/defense/level1/projectile.png',
            projectileHitImage: 'assets/images/defense/level1/projectile_hit.png',
            shieldImage: 'assets/images/defense/level1/shield.png',
            aoeLineImage: 'assets/images/defense/level1/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 4000, text: '' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, text: '' },
                { type: 'HEAVY', dir: 'up', wait: 6000, text: '' },
                { type: 'AOE', wait: 6000, text: '' },
                { type: 'END', text: '' }
            ]
        }
    }
};

console.log('✅ DefenseLevels 關卡設定已載入');