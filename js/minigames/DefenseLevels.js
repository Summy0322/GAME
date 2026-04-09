// js/minigames/DefenseLevels.js
// 防禦遊戲關卡設定（獨立管理，方便編輯）

const DefenseLevels = {
    // ========== 第一關：肉圓滑溜戰（基礎練習 + 簡單陷阱）==========
    1: {
        // 成人版
        adult: {
            name: '肉圓滑溜戰',
            bgImage: 'assets/images/defense/level1/bg.png',
            playerImage: 'assets/images/defense/level1/player.png',
            // 一般敵人（肉圓）
            enemyImage: 'assets/images/defense/level1/enemy.png',
            // 石頭陷阱圖片（誤導用）
            decoyImage: 'assets/images/defense/level1/stone.png',
            // 錯誤方向石頭圖片
            wrongEnemyImage: 'assets/images/defense/level1/stone.png',
            // 重擊敵人圖片（共用一般敵人）
            heavyEnemyImage: 'assets/images/defense/level1/enemy.png',
            projectileImage: 'assets/images/defense/level1/projectile.png',
            projectileHitImage: 'assets/images/defense/level1/projectile_hit.png',
            shieldImage: 'assets/images/defense/level1/shield.png',
            aoeLineImage: 'assets/images/defense/level1/aoe_line.png',
            attackPatterns: [
                // ===== 基礎方向練習 =====
                { type: 'NORMAL', dir: 'up', wait: 3500, text: '🥟 上方飛來肉圓！向上滑動丟出碗接住！' },
                { type: 'NORMAL', dir: 'down', wait: 3500, text: '🥟 下方飛來肉圓！向下滑動丟出碗接住！' },
                { type: 'NORMAL', dir: 'left', wait: 3500, text: '🥟 左方飛來肉圓！向左滑動丟出碗接住！' },
                { type: 'NORMAL', dir: 'right', wait: 3500, text: '🥟 右方飛來肉圓！向右滑動丟出碗接住！' },
                
                // ===== 簡單陷阱（誤導）=====
                { type: 'DECOY', dir: 'up', wait: 2500, text: '🪨 小心！石頭混進來了！千萬別滑動！' },
                { type: 'DECOY', dir: 'right', wait: 2500, text: '🪨 右邊有石頭！不要滑！' },
                
                // ===== 兩個方向多重攻擊 =====
                { type: 'MULTI', dirs: ['up', 'down'], wait: 4000, text: '🥟 上下同時飛來肉圓！都接住！' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 4000, text: '🥟 左右同時飛來肉圓！都接住！' },
                
                // ===== 混合攻擊（黃豆 + 石頭）=====
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['left', 'right'],
                    correctDirs: ['left'],
                    wrongDirs: ['right'],
                    wait: 4000,
                    text: '🫘 左邊黃豆（接）｜ 右邊石頭（別動）'
                },
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['up', 'down'],
                    correctDirs: ['down'],
                    wrongDirs: ['up'],
                    wait: 4000,
                    text: '🪨 上面是石頭！｜ 🫘 下面黃豆快接！'
                },
                
                // ===== 更多練習 =====
                { type: 'NORMAL', dir: 'up', wait: 3500, text: '🥟 又來一顆上方肉圓！快接住！' },
                { type: 'NORMAL', dir: 'left', wait: 3500, text: '🥟 左方肉圓偷襲！向左滑動！' },
                
                // ===== 三個方向多重攻擊 =====
                { type: 'MULTI', dirs: ['up', 'left', 'right'], wait: 4500, text: '🥟 三顆肉圓同時飛來！依序接住！' },
                
                // ===== 三個方向混合攻擊 =====
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['up', 'down', 'right'],
                    correctDirs: ['up', 'right'],
                    wrongDirs: ['down'],
                    wait: 4500,
                    text: '🫘 上、右是黃豆（接）｜ ⬇️ 下面是石頭（別動）'
                },
                
                // 結尾
                { type: 'END', text: '' }
            ]
        },
        // 小朋友版（等待時間較長）
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
                { type: 'NORMAL', dir: 'up', wait: 4500, text: '🥟 上面有肉圓！往上滑～' },
                { type: 'NORMAL', dir: 'down', wait: 4500, text: '🥟 下面有肉圓！往下滑～' },
                { type: 'NORMAL', dir: 'left', wait: 4500, text: '🥟 左邊有肉圓！往左滑～' },
                { type: 'NORMAL', dir: 'right', wait: 4500, text: '🥟 右邊有肉圓！往右滑～' },
                { type: 'DECOY', dir: 'up', wait: 3000, text: '🪨 上面是石頭！不要滑～' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, text: '🥟 上下都有肉圓！都滑滑看～' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 5000, text: '🥟 左右都有肉圓！都滑滑看～' },
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['left', 'right'],
                    correctDirs: ['left'],
                    wrongDirs: ['right'],
                    wait: 5000,
                    text: '🫘 左邊黃豆（接）｜ 右邊石頭（別動）'
                },
                { type: 'MULTI', dirs: ['up', 'left', 'right'], wait: 5500, text: '🥟 三顆肉圓！都滑滑看～' },
                { type: 'END', text: '' }
            ]
        }
    },

    // ========== 第二關：火災防衛戰（加入重擊、更多混合攻擊）==========
    2: {
        // 成人版
        adult: {
            name: '火災防衛戰',
            bgImage: 'assets/images/defense/level2/bg.png',
            playerImage: 'assets/images/defense/level2/player.png',
            // 一般敵人（火苗）
            enemyImage: 'assets/images/defense/level2/enemy.png',
            // 石頭陷阱（誤導用）
            decoyImage: 'assets/images/defense/level2/stone.png',
            // 錯誤方向石頭
            wrongEnemyImage: 'assets/images/defense/level2/stone.png',
            projectileImage: 'assets/images/defense/level2/projectile.png',
            projectileHitImage: 'assets/images/defense/level2/projectile_hit.png',
            shieldImage: 'assets/images/defense/level2/shield.png',
            aoeLineImage: 'assets/images/defense/level2/aoe_line.png',
            attackPatterns: [
                // ===== 一般攻擊 =====
                { type: 'NORMAL', dir: 'up', wait: 3500, text: '🔥 上方掉落火苗！向上滑動發射水球！' },
                { type: 'NORMAL', dir: 'down', wait: 3500, text: '🔥 下方掉落火苗！向下滑動發射水球！' },
                { type: 'NORMAL', dir: 'left', wait: 3500, text: '🔥 左方掉落火苗！向左滑動發射水球！' },
                { type: 'NORMAL', dir: 'right', wait: 3500, text: '🔥 右方掉落火苗！向右滑動發射水球！' },
                
                // ===== 陷阱 =====
                { type: 'DECOY', dir: 'down', wait: 2500, text: '🪨 下面是石頭！不要滑！' },
                { type: 'DECOY', dir: 'left', wait: 2500, text: '🪨 左邊是石頭！不要滑！' },
                
                // ===== 多重攻擊 =====
                { type: 'MULTI', dirs: ['up', 'down'], wait: 4000, text: '🔥 上下同時起火！依序發射水球！' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 4000, text: '🔥 左右同時起火！依序滅火！' },
                
                // ===== 混合攻擊 =====
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['up', 'down', 'left'],
                    correctDirs: ['up', 'left'],
                    wrongDirs: ['down'],
                    wait: 4500,
                    text: '🔥 上、左是火苗（接）｜ ⬇️ 下面是石頭（別動）'
                },
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['left', 'right', 'up'],
                    correctDirs: ['right'],
                    wrongDirs: ['left', 'up'],
                    wait: 4500,
                    text: '🪨 左、上是石頭！｜ 🔥 右邊火苗快滅火！'
                },
                
                // ===== 重擊攻擊 =====
                { type: 'HEAVY', dir: 'up', wait: 5000, text: '🔥🔥 火牆來襲！向上滑動產生水牆！' },
                { type: 'HEAVY', dir: 'down', wait: 5000, text: '🔥🔥 火牆來襲！向下滑動產生水牆！' },
                { type: 'HEAVY', dir: 'left', wait: 5000, text: '🔥🔥 火牆來襲！向左滑動產生水牆！' },
                
                // ===== 更多混合 =====
                { type: 'NORMAL', dir: 'right', wait: 3500, text: '🔥 右方火苗！快發射水球！' },
                { type: 'HEAVY', dir: 'right', wait: 5000, text: '🔥🔥 右方火牆！向右滑動產生水牆！' },
                
                // ===== 四個方向多重攻擊 =====
                { type: 'MULTI', dirs: ['up', 'down', 'left', 'right'], wait: 5000, text: '🔥 四處起火！快全部撲滅！' },
                
                // ===== 四個方向混合攻擊 =====
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['up', 'down', 'left', 'right'],
                    correctDirs: ['up', 'down'],
                    wrongDirs: ['left', 'right'],
                    wait: 5000,
                    text: '🔥 上、下是火苗（接）｜ 🪨 左、右是石頭（別動）'
                },
                
                { type: 'HEAVY', dir: 'up', wait: 5000, text: '🔥🔥 最後火牆！向上滑動守住！' },
                { type: 'END', text: '' }
            ]
        },
        // 小朋友版
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
                { type: 'NORMAL', dir: 'up', wait: 4500, text: '🔥 上面有火！往上滑～' },
                { type: 'NORMAL', dir: 'down', wait: 4500, text: '🔥 下面有火！往下滑～' },
                { type: 'NORMAL', dir: 'left', wait: 4500, text: '🔥 左邊有火！往左滑～' },
                { type: 'NORMAL', dir: 'right', wait: 4500, text: '🔥 右邊有火！往右滑～' },
                { type: 'DECOY', dir: 'up', wait: 3000, text: '🪨 上面是石頭！不要滑～' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, text: '🔥 上下都有火！都滑滑看～' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 5000, text: '🔥 左右都有火！都滑滑看～' },
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['left', 'right'],
                    correctDirs: ['left'],
                    wrongDirs: ['right'],
                    wait: 5000,
                    text: '🔥 左邊火苗（接）｜ 🪨 右邊石頭（別動）'
                },
                { type: 'HEAVY', dir: 'up', wait: 6000, text: '🔥🔥 大火來了！往上滑水牆！' },
                { type: 'HEAVY', dir: 'down', wait: 6000, text: '🔥🔥 大火來了！往下滑水牆！' },
                { type: 'MULTI', dirs: ['up', 'down', 'left'], wait: 5500, text: '🔥 好多火！都滑滑看～' },
                { type: 'END', text: '' }
            ]
        }
    },

    // ========== 第三關：豆乳研磨戰（全部類型：一般、多重、重擊、AOE、混合）==========
    3: {
        // 成人版
        adult: {
            name: '豆乳研磨戰',
            bgImage: 'assets/images/defense/level3/bg.png',
            playerImage: 'assets/images/defense/level3/player.png',
            // 一般敵人（黃豆）
            enemyImage: 'assets/images/defense/level3/enemy.png',
            // 石頭陷阱
            decoyImage: 'assets/images/defense/level3/stone.png',
            // 錯誤方向石頭
            wrongEnemyImage: 'assets/images/defense/level3/stone.png',
            // 重擊敵人圖片（蒸氣）
            heavyEnemyImage: 'assets/images/defense/level3/heavy_enemy.png',
            projectileImage: 'assets/images/defense/level3/projectile.png',
            projectileHitImage: 'assets/images/defense/level3/projectile_hit.png',
            shieldImage: 'assets/images/defense/level3/shield.png',
            aoeLineImage: 'assets/images/defense/level3/aoe_line.png',
            attackPatterns: [
                // ===== 一般攻擊 =====
                { type: 'NORMAL', dir: 'up', wait: 3500, text: '🫘 上方跳出黃豆！向上滑動用篩子接住！' },
                { type: 'NORMAL', dir: 'down', wait: 3500, text: '🫘 下方跳出黃豆！向下滑動用篩子接住！' },
                { type: 'NORMAL', dir: 'left', wait: 3500, text: '🫘 左方跳出黃豆！向左滑動用篩子接住！' },
                { type: 'NORMAL', dir: 'right', wait: 3500, text: '🫘 右方跳出黃豆！向右滑動用篩子接住！' },
                
                // ===== 陷阱 =====
                { type: 'DECOY', dir: 'up', wait: 2500, text: '🪨 上面是石頭！不要滑！' },
                { type: 'DECOY', dir: 'right', wait: 2500, text: '🪨 右邊是石頭！不要滑！' },
                
                // ===== 多重攻擊 =====
                { type: 'MULTI', dirs: ['up', 'down'], wait: 4000, text: '🫘 上下同時跳出黃豆！依序滑動篩選！' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 4000, text: '🫘 左右同時跳出黃豆！依序滑動篩選！' },
                { type: 'MULTI', dirs: ['up', 'down', 'left'], wait: 4500, text: '🫘 三處跳出黃豆！快篩選！' },
                
                // ===== 混合攻擊 =====
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['up', 'down', 'left', 'right'],
                    correctDirs: ['up', 'left'],
                    wrongDirs: ['down', 'right'],
                    wait: 4800,
                    text: '🫘 上、左是黃豆（接）｜ 🪨 下、右是石頭（別動）'
                },
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['up', 'right'],
                    correctDirs: ['right'],
                    wrongDirs: ['up'],
                    wait: 4000,
                    text: '🪨 上面是石頭！｜ 🫘 右邊黃豆快接！'
                },
                
                // ===== 重擊攻擊 =====
                { type: 'HEAVY', dir: 'up', wait: 5000, text: '💨 沸騰蒸氣來襲！向上滑動守住純淨！' },
                { type: 'HEAVY', dir: 'down', wait: 5000, text: '💨 沸騰蒸氣來襲！向下滑動守住純淨！' },
                { type: 'HEAVY', dir: 'left', wait: 5000, text: '💨 沸騰蒸氣來襲！向左滑動守住純淨！' },
                { type: 'HEAVY', dir: 'right', wait: 5000, text: '💨 沸騰蒸氣來襲！向右滑動守住純淨！' },
                
                // ===== AOE 攻擊 =====
                { type: 'AOE', wait: 5500, text: '🔄 石磨轉動！旋轉手機推回豆乳！' },
                
                // ===== 混合攻擊 + 重擊交替 =====
                { type: 'NORMAL', dir: 'up', wait: 3500, text: '🫘 上方黃豆跳出！接住！' },
                { type: 'HEAVY', dir: 'down', wait: 5000, text: '💨 下方蒸氣！向下滑動守住！' },
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['left', 'right'],
                    correctDirs: ['right'],
                    wrongDirs: ['left'],
                    wait: 4200,
                    text: '🪨 左邊石頭！｜ 🫘 右邊黃豆快接！'
                },
                { type: 'AOE', wait: 5500, text: '🔄 石磨加速轉動！旋轉手機！' },
                { type: 'HEAVY', dir: 'up', wait: 5000, text: '💨 上方蒸氣來襲！向上滑動！' },
                
                // ===== 四個方向多重攻擊 =====
                { type: 'MULTI', dirs: ['up', 'down', 'left', 'right'], wait: 5000, text: '🫘 四面八方黃豆！全部接住！' },
                
                // ===== 最終混合挑戰 =====
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['up', 'down', 'left', 'right'],
                    correctDirs: ['up', 'down', 'left'],
                    wrongDirs: ['right'],
                    wait: 5200,
                    text: '🫘 上、下、左是黃豆！｜ 🪨 右邊是石頭別動！'
                },
                
                { type: 'AOE', wait: 5500, text: '🔄 最後一轉！旋轉手機完成研磨！' },
                { type: 'END', text: '' }
            ]
        },
        // 小朋友版
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
                { type: 'NORMAL', dir: 'up', wait: 4500, text: '🫘 上面有黃豆！往上滑接住！' },
                { type: 'NORMAL', dir: 'down', wait: 4500, text: '🫘 下面有黃豆！往下滑接住！' },
                { type: 'NORMAL', dir: 'left', wait: 4500, text: '🫘 左邊有黃豆！往左滑接住！' },
                { type: 'NORMAL', dir: 'right', wait: 4500, text: '🫘 右邊有黃豆！往右滑接住！' },
                { type: 'DECOY', dir: 'up', wait: 3000, text: '🪨 上面是石頭！不要滑～' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 5000, text: '🫘 上下都有黃豆！都滑滑看～' },
                { type: 'MULTI', dirs: ['left', 'right'], wait: 5000, text: '🫘 左右都有黃豆！都滑滑看～' },
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['left', 'right'],
                    correctDirs: ['left'],
                    wrongDirs: ['right'],
                    wait: 5000,
                    text: '🫘 左邊黃豆（接）｜ 🪨 右邊石頭（別動）'
                },
                { type: 'HEAVY', dir: 'up', wait: 6000, text: '💨💨 蒸氣來了！往上滑擋住！' },
                { type: 'HEAVY', dir: 'down', wait: 6000, text: '💨💨 蒸氣來了！往下滑擋住！' },
                { type: 'AOE', wait: 6500, text: '🔄 石磨轉轉轉！轉手機推回去！' },
                { type: 'MULTI', dirs: ['up', 'down', 'left'], wait: 5500, text: '🫘 好多黃豆！都接住喔～' },
                { type: 'HEAVY', dir: 'left', wait: 6000, text: '💨💨 蒸氣來了！往左滑擋住！' },
                { type: 'AOE', wait: 6500, text: '🔄 石磨轉轉轉！再轉一次！' },
                { type: 'END', text: '' }
            ]
        }
    },

    // ========== 測試關卡（保留）==========
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
                { type: 'NORMAL', dir: 'up', wait: 3000, text: '🥟 上方肉圓！接住！' },
                { type: 'NORMAL', dir: 'down', wait: 3000, text: '🥟 下方肉圓！接住！' },
                { type: 'DECOY', dir: 'up', wait: 2500, text: '🪨 小心！石頭混進來了！千萬別滑動！' },
                { type: 'MULTI', dirs: ['up', 'down'], wait: 3500, text: '🥟 上下都有肉圓！都接住！' },
                { 
                    type: 'MULTI_MIXED', 
                    dirs: ['left', 'right'],
                    correctDirs: ['left'],
                    wrongDirs: ['right'],
                    wait: 4000, 
                    text: '🫘 左邊黃豆（接）｜ 右邊石頭（別動）' 
                },
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
                { type: 'END', text: '' }
            ]
        }
    }
};

console.log('✅ DefenseLevels 關卡設定已載入');