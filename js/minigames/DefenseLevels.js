// js/minigames/DefenseLevels.js
// 防禦遊戲關卡設定（獨立管理，方便編輯）- 手機優化簡短版

const DefenseLevels = {
    // ========== 第一關：肉圓滑溜戰 ==========
    1: {
        adult: {
            name: '肉圓滑溜戰',
            bgImage: 'assets/images/defense/level1/bg.png',
            playerImage: 'assets/images/defense/level1/player.png',
            enemyImage: 'assets/images/defense/level1/enemy.png',
            decoyImage: 'assets/images/defense/level1/stone.png',
            wrongEnemyImage: 'assets/images/defense/level1/stone.png',
            heavyEnemyImage: 'assets/images/defense/level1/enemy.png',
            projectileImage: 'assets/images/defense/level1/projectile.png',
            projectileHitImage: 'assets/images/defense/level1/projectile_hit.png',
            shieldImage: 'assets/images/defense/level1/shield.png',
            aoeLineImage: 'assets/images/defense/level1/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 3500, text: '⬆️ 肉圓' },
                { type: 'NORMAL', dir: 'down', wait: 3500, text: '⬇️ 肉圓' },
                { type: 'NORMAL', dir: 'left', wait: 3500, text: '⬅️ 肉圓' },
                { type: 'NORMAL', dir: 'right', wait: 3500, text: '➡️ 肉圓' },
                { type: 'DECOY', dir: 'up', wait: 2500, text: '🪨 石頭！別滑' },
                { type: 'DECOY', dir: 'right', wait: 2500, text: '🪨 石頭！別滑' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 4000, text: '⬆️⬇️ 肉圓' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 4000, text: '⬅️➡️ 肉圓' },
                { type: 'MULTI_MIXED', dirs: ['left', 'right'], correctDirs: ['left'], wrongDirs: ['right'], wait: 4000, text: '⬅️黃豆｜➡️石頭' },
                { type: 'MULTI_MIXED', dirs: ['up', 'down'], correctDirs: ['down'], wrongDirs: ['up'], wait: 4000, text: '⬆️石頭｜⬇️黃豆' },
                { type: 'NORMAL', dir: 'up', wait: 3500, text: '⬆️ 肉圓' },
                { type: 'NORMAL', dir: 'left', wait: 3500, text: '⬅️ 肉圓' },
                { type: 'MULTI', dirs: ['up', 'left', 'right'], wait: 4500, text: '⬆️⬅️➡️ 肉圓' },
                { type: 'MULTI_MIXED', dirs: ['up', 'down', 'right'], correctDirs: ['up', 'right'], wrongDirs: ['down'], wait: 4500, text: '⬆️➡️黃豆｜⬇️石頭' },
                { type: 'END', text: '' }
            ]
        },
        child: {
            name: '肉圓滑溜戰',
            bgImage: 'assets/images/defense/level1/bg.png',
            playerImage: 'assets/images/defense/level1/player.png',
            enemyImage: 'assets/images/defense/level1/enemy.png',
            decoyImage: 'assets/images/defense/level1/stone.png',
            wrongEnemyImage: 'assets/images/defense/level1/stone.png',
            heavyEnemyImage: 'assets/images/defense/level1/enemy.png',
            projectileImage: 'assets/images/defense/level1/projectile.png',
            projectileHitImage: 'assets/images/defense/level1/projectile_hit.png',
            shieldImage: 'assets/images/defense/level1/shield.png',
            aoeLineImage: 'assets/images/defense/level1/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 4500, text: '⬆️ 肉圓' },
                { type: 'NORMAL', dir: 'down', wait: 4500, text: '⬇️ 肉圓' },
                { type: 'NORMAL', dir: 'left', wait: 4500, text: '⬅️ 肉圓' },
                { type: 'NORMAL', dir: 'right', wait: 4500, text: '➡️ 肉圓' },
                { type: 'DECOY', dir: 'up', wait: 3000, text: '🪨 石頭' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, text: '⬆️⬇️ 肉圓' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 5000, text: '⬅️➡️ 肉圓' },
                { type: 'MULTI_MIXED', dirs: ['left', 'right'], correctDirs: ['left'], wrongDirs: ['right'], wait: 5000, text: '⬅️黃豆｜➡️石頭' },
                { type: 'MULTI', dirs: ['up', 'left', 'right'], wait: 5500, text: '⬆️⬅️➡️ 肉圓' },
                { type: 'END', text: '' }
            ]
        }
    },

    // ========== 第二關：火災防衛戰 ==========
    2: {
        adult: {
            name: '火災防衛戰',
            bgImage: 'assets/images/defense/level2/bg.png',
            playerImage: 'assets/images/defense/level2/player.png',
            enemyImage: 'assets/images/defense/level2/enemy.png',
            decoyImage: 'assets/images/defense/level2/stone.png',
            wrongEnemyImage: 'assets/images/defense/level2/stone.png',
            projectileImage: 'assets/images/defense/level2/projectile.png',
            projectileHitImage: 'assets/images/defense/level2/projectile_hit.png',
            shieldImage: 'assets/images/defense/level2/shield.png',
            aoeLineImage: 'assets/images/defense/level2/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 3500, text: '⬆️ 火' },
                { type: 'NORMAL', dir: 'down', wait: 3500, text: '⬇️ 火' },
                { type: 'NORMAL', dir: 'left', wait: 3500, text: '⬅️ 火' },
                { type: 'NORMAL', dir: 'right', wait: 3500, text: '➡️ 火' },
                { type: 'DECOY', dir: 'down', wait: 2500, text: '🪨 石頭' },
                { type: 'DECOY', dir: 'left', wait: 2500, text: '🪨 石頭' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 4000, text: '⬆️⬇️ 火' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 4000, text: '⬅️➡️ 火' },
                { type: 'MULTI_MIXED', dirs: ['up', 'down', 'left'], correctDirs: ['up', 'left'], wrongDirs: ['down'], wait: 4500, text: '⬆️⬅️火｜⬇️石頭' },
                { type: 'MULTI_MIXED', dirs: ['left', 'right', 'up'], correctDirs: ['right'], wrongDirs: ['left', 'up'], wait: 4500, text: '➡️火｜⬅️⬆️石頭' },
                { type: 'HEAVY', dir: 'up', wait: 5000, text: '🔥🔥 火牆' },
                { type: 'HEAVY', dir: 'down', wait: 5000, text: '🔥🔥 火牆' },
                { type: 'HEAVY', dir: 'left', wait: 5000, text: '🔥🔥 火牆' },
                { type: 'NORMAL', dir: 'right', wait: 3500, text: '➡️ 火' },
                { type: 'HEAVY', dir: 'right', wait: 5000, text: '🔥🔥 火牆' },
                { type: 'MULTI', dirs: ['up', 'down', 'left', 'right'], wait: 5000, text: '⬆️⬇️⬅️➡️ 火' },
                { type: 'MULTI_MIXED', dirs: ['up', 'down', 'left', 'right'], correctDirs: ['up', 'down'], wrongDirs: ['left', 'right'], wait: 5000, text: '⬆️⬇️火｜⬅️➡️石頭' },
                { type: 'HEAVY', dir: 'up', wait: 5000, text: '🔥🔥 火牆' },
                { type: 'END', text: '' }
            ]
        },
        child: {
            name: '火災防衛戰',
            bgImage: 'assets/images/defense/level2/bg.png',
            playerImage: 'assets/images/defense/level2/player.png',
            enemyImage: 'assets/images/defense/level2/enemy.png',
            decoyImage: 'assets/images/defense/level2/stone.png',
            wrongEnemyImage: 'assets/images/defense/level2/stone.png',
            projectileImage: 'assets/images/defense/level2/projectile.png',
            projectileHitImage: 'assets/images/defense/level2/projectile_hit.png',
            shieldImage: 'assets/images/defense/level2/shield.png',
            aoeLineImage: 'assets/images/defense/level2/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 4500, text: '⬆️ 火' },
                { type: 'NORMAL', dir: 'down', wait: 4500, text: '⬇️ 火' },
                { type: 'NORMAL', dir: 'left', wait: 4500, text: '⬅️ 火' },
                { type: 'NORMAL', dir: 'right', wait: 4500, text: '➡️ 火' },
                { type: 'DECOY', dir: 'up', wait: 3000, text: '🪨 石頭' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, text: '⬆️⬇️ 火' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 5000, text: '⬅️➡️ 火' },
                { type: 'MULTI_MIXED', dirs: ['left', 'right'], correctDirs: ['left'], wrongDirs: ['right'], wait: 5000, text: '⬅️火｜➡️石頭' },
                { type: 'HEAVY', dir: 'up', wait: 6000, text: '🔥🔥 大火' },
                { type: 'HEAVY', dir: 'down', wait: 6000, text: '🔥🔥 大火' },
                { type: 'MULTI', dirs: ['up', 'down', 'left'], wait: 5500, text: '⬆️⬇️⬅️ 火' },
                { type: 'END', text: '' }
            ]
        }
    },

    // ========== 第三關：豆乳研磨戰 ==========
    3: {
        adult: {
            name: '豆乳研磨戰',
            bgImage: 'assets/images/defense/level3/bg.png',
            playerImage: 'assets/images/defense/level3/player.png',
            enemyImage: 'assets/images/defense/level3/enemy.png',
            decoyImage: 'assets/images/defense/level3/stone.png',
            wrongEnemyImage: 'assets/images/defense/level3/stone.png',
            heavyEnemyImage: 'assets/images/defense/level3/heavy_enemy.png',
            projectileImage: 'assets/images/defense/level3/projectile.png',
            projectileHitImage: 'assets/images/defense/level3/projectile_hit.png',
            shieldImage: 'assets/images/defense/level3/shield.png',
            aoeLineImage: 'assets/images/defense/level3/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 3500, text: '⬆️ 黃豆' },
                { type: 'NORMAL', dir: 'down', wait: 3500, text: '⬇️ 黃豆' },
                { type: 'NORMAL', dir: 'left', wait: 3500, text: '⬅️ 黃豆' },
                { type: 'NORMAL', dir: 'right', wait: 3500, text: '➡️ 黃豆' },
                { type: 'DECOY', dir: 'up', wait: 2500, text: '🪨 石頭' },
                { type: 'DECOY', dir: 'right', wait: 2500, text: '🪨 石頭' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 4000, text: '⬆️⬇️ 黃豆' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 4000, text: '⬅️➡️ 黃豆' },
                { type: 'MULTI', dirs: ['up', 'down', 'left'], wait: 4500, text: '⬆️⬇️⬅️ 黃豆' },
                { type: 'MULTI_MIXED', dirs: ['up', 'down', 'left', 'right'], correctDirs: ['up', 'left'], wrongDirs: ['down', 'right'], wait: 4800, text: '⬆️⬅️黃豆｜⬇️➡️石頭' },
                { type: 'MULTI_MIXED', dirs: ['up', 'right'], correctDirs: ['right'], wrongDirs: ['up'], wait: 4000, text: '➡️黃豆｜⬆️石頭' },
                { type: 'HEAVY', dir: 'up', wait: 5000, text: '💨 蒸氣' },
                { type: 'HEAVY', dir: 'down', wait: 5000, text: '💨 蒸氣' },
                { type: 'HEAVY', dir: 'left', wait: 5000, text: '💨 蒸氣' },
                { type: 'HEAVY', dir: 'right', wait: 5000, text: '💨 蒸氣' },
                { type: 'AOE', wait: 5500, text: '🔄 旋轉' },
                { type: 'NORMAL', dir: 'up', wait: 3500, text: '⬆️ 黃豆' },
                { type: 'HEAVY', dir: 'down', wait: 5000, text: '💨 蒸氣' },
                { type: 'MULTI_MIXED', dirs: ['left', 'right'], correctDirs: ['right'], wrongDirs: ['left'], wait: 4200, text: '➡️黃豆｜⬅️石頭' },
                { type: 'AOE', wait: 5500, text: '🔄 旋轉' },
                { type: 'HEAVY', dir: 'up', wait: 5000, text: '💨 蒸氣' },
                { type: 'MULTI', dirs: ['up', 'down', 'left', 'right'], wait: 5000, text: '⬆️⬇️⬅️➡️ 黃豆' },
                { type: 'MULTI_MIXED', dirs: ['up', 'down', 'left', 'right'], correctDirs: ['up', 'down', 'left'], wrongDirs: ['right'], wait: 5200, text: '⬆️⬇️⬅️黃豆｜➡️石頭' },
                { type: 'AOE', wait: 5500, text: '🔄 旋轉' },
                { type: 'END', text: '' }
            ]
        },
        child: {
            name: '豆乳研磨戰',
            bgImage: 'assets/images/defense/level3/bg.png',
            playerImage: 'assets/images/defense/level3/player.png',
            enemyImage: 'assets/images/defense/level3/enemy.png',
            decoyImage: 'assets/images/defense/level3/stone.png',
            wrongEnemyImage: 'assets/images/defense/level3/stone.png',
            heavyEnemyImage: 'assets/images/defense/level3/heavy_enemy.png',
            projectileImage: 'assets/images/defense/level3/projectile.png',
            projectileHitImage: 'assets/images/defense/level3/projectile_hit.png',
            shieldImage: 'assets/images/defense/level3/shield.png',
            aoeLineImage: 'assets/images/defense/level3/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 4500, text: '⬆️ 黃豆' },
                { type: 'NORMAL', dir: 'down', wait: 4500, text: '⬇️ 黃豆' },
                { type: 'NORMAL', dir: 'left', wait: 4500, text: '⬅️ 黃豆' },
                { type: 'NORMAL', dir: 'right', wait: 4500, text: '➡️ 黃豆' },
                { type: 'DECOY', dir: 'up', wait: 3000, text: '🪨 石頭' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, text: '⬆️⬇️ 黃豆' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 5000, text: '⬅️➡️ 黃豆' },
                { type: 'MULTI_MIXED', dirs: ['left', 'right'], correctDirs: ['left'], wrongDirs: ['right'], wait: 5000, text: '⬅️黃豆｜➡️石頭' },
                { type: 'HEAVY', dir: 'up', wait: 6000, text: '💨 蒸氣' },
                { type: 'HEAVY', dir: 'down', wait: 6000, text: '💨 蒸氣' },
                { type: 'AOE', wait: 6500, text: '🔄 旋轉' },
                { type: 'MULTI', dirs: ['up', 'down', 'left'], wait: 5500, text: '⬆️⬇️⬅️ 黃豆' },
                { type: 'HEAVY', dir: 'left', wait: 6000, text: '💨 蒸氣' },
                { type: 'AOE', wait: 6500, text: '🔄 旋轉' },
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
            decoyImage: 'assets/images/defense/level1/stone.png',
            wrongEnemyImage: 'assets/images/defense/level1/stone.png',
            projectileImage: 'assets/images/defense/level2/projectile.png',
            projectileHitImage: 'assets/images/defense/level2/projectile_hit.png',
            shieldImage: 'assets/images/defense/level2/shield.png',
            aoeLineImage: 'assets/images/defense/level3/aoe_line.png',
            attackPatterns: [
                { type: 'NORMAL', dir: 'up', wait: 3000, text: '⬆️ 肉圓' },
                { type: 'NORMAL', dir: 'down', wait: 3000, text: '⬇️ 肉圓' },
                { type: 'DECOY', dir: 'up', wait: 2500, text: '🪨 石頭' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 3500, text: '⬆️⬇️ 肉圓' },
                { type: 'MULTI_MIXED', dirs: ['left', 'right'], correctDirs: ['left'], wrongDirs: ['right'], wait: 4000, text: '⬅️黃豆｜➡️石頭' },
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
                { type: 'NORMAL', dir: 'up', wait: 4000, text: '⬆️' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, text: '⬆️⬇️' },
                { type: 'END', text: '' }
            ]
        }
    }
};

console.log('✅ DefenseLevels 關卡設定已載入（手機優化簡短版）');