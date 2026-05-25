// js/core/CollectionSystem.js
// 地圖蒐集系統 - 地圖與對話分開進行，右上角框框始終顯示

const CollectionSystem = {
    // 狀態
    isActive: false,
    isAnimating: false,
    isGameStarting: false,
    collectedItems: [],
    totalItems: 0,
    onCompleteCallback: null,
    currentCollectingIndex: null,
    
    // DOM 元素
    overlay: null,
    mapContainer: null,
    hotspotsContainer: null,
    itemsDisplayContainer: null,
    completeBtn: null,
    backgroundDiv: null,
    dialogueOverlay: null,
    
    // 物品資料
    items: [],
    
    // Loading 相關
    simpleLoading: null,
    shopLoading: null,
    
    // 初始化
    init: function() {
        console.log('🗺️ CollectionSystem 初始化');
        this.createDOM();
        this.initMoneyListener();
    },
    
    // 建立 DOM 結構
    createDOM: function() {
        // 避免重複建立
        if (document.querySelector('.collection-overlay')) {
            const existingOverlay = document.querySelector('.collection-overlay');
            if (existingOverlay && existingOverlay.parentNode) {
                existingOverlay.parentNode.removeChild(existingOverlay);
            }
        }
        
        const gameWrapper = document.getElementById('game-wrapper');
        if (!gameWrapper) {
            console.error('❌ 找不到 #game-wrapper');
            return;
        }
        
        // 主容器
        this.overlay = document.createElement('div');
        this.overlay.className = 'collection-overlay';
        this.overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 3000;
            display: none;
        `;
        
        // 地圖層
        this.mapContainer = document.createElement('div');
        this.mapContainer.className = 'collection-map-container';
        this.mapContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
        `;
        this.mapContainer.innerHTML = `
            <div class="collection-background" style="width: 100%; height: 100%; background-size: cover; background-position: center; background-repeat: no-repeat; position: relative;"></div>
            <div class="collection-hotspots" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
        `;
        
        // 右上角物品框
        this.itemsDisplayContainer = document.createElement('div');
        this.itemsDisplayContainer.className = 'collection-items-bar';
        this.itemsDisplayContainer.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            display: flex;
            gap: 12px;
            z-index: 3050;
        `;

        // ✅ 錢袋顯示區域
        this.moneyDisplay = document.createElement('div');
        this.moneyDisplay.className = 'collection-money-display';
        this.moneyDisplay.style.cssText = `
            position: absolute;
            top: 15px;
            right: 200px;
            background: rgba(0,0,0,0.6);
            border-radius: 30px;
            padding: 8px 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 3050;
            border: 1px solid #ffd700;
        `;
        this.moneyDisplay.innerHTML = `
            <span style="font-size: 20px;">💰</span>
            <span id="collection-money-amount" style="color: #ffd700; font-size: 18px; font-weight: bold;">20</span>
            <span style="color: white; font-size: 14px;">枚</span>
        `;
        
        // 完成按鈕
        this.completeBtn = document.createElement('button');
        this.completeBtn.className = 'collection-complete-btn';
        this.completeBtn.style.cssText = `
            display: none;
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 30px;
            background: linear-gradient(145deg, #e67e22, #d35400);
            color: white;
            border: none;
            border-radius: 30px;
            font-size: 18px;
            cursor: pointer;
            z-index: 3050;
        `;
        this.completeBtn.textContent = '完成蒐集';
        this.completeBtn.onclick = () => this.onComplete();
        
        // 對話層
        this.dialogueOverlay = document.createElement('div');
        this.dialogueOverlay.className = 'collection-dialogue-overlay';
        this.dialogueOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            z-index: 3020;
            display: none;
            justify-content: center;
            align-items: center;
        `;
        
        // 組合 DOM
        this.overlay.appendChild(this.mapContainer);
        this.overlay.appendChild(this.itemsDisplayContainer);
        this.overlay.appendChild(this.moneyDisplay);
        this.overlay.appendChild(this.completeBtn);
        this.overlay.appendChild(this.dialogueOverlay);
        gameWrapper.appendChild(this.overlay);
        
        // 獲取元素引用
        this.backgroundDiv = this.mapContainer.querySelector('.collection-background');
        this.hotspotsContainer = this.mapContainer.querySelector('.collection-hotspots');
        
        console.log('✅ CollectionSystem DOM 建立完成');
    },
    
    // ✅ 獲取當前章節的錢袋數量（支援 Teen 和 Child）
    getCurrentMoney: function() {
        if (window.gameMode === 'child') {
            if (window.Chapter3_Child && typeof window.Chapter3_Child.getMoney === 'function') {
                return window.Chapter3_Child.getMoney();
            }
        } else {
            if (window.Chapter3_Teen && typeof window.Chapter3_Teen.getMoney === 'function') {
                return window.Chapter3_Teen.getMoney();
            }
        }
        return 20;
    },
    
    // ✅ 更新錢袋顯示
    updateMoneyDisplay: function() {
        if (!this.moneyDisplay) return;
        
        const money = this.getCurrentMoney();
        const moneySpan = this.moneyDisplay.querySelector('#collection-money-amount');
        
        if (moneySpan) {
            moneySpan.textContent = money;
            // 銅板不足時變紅色
            if (money < 5) {
                moneySpan.style.color = '#ff6666';
            } else {
                moneySpan.style.color = '#ffd700';
            }
        }
        
        console.log(`💰 錢袋更新: ${money} 枚`);
    },

    // 監聽銅板更新事件
    initMoneyListener: function() {
        window.addEventListener('moneyUpdate', (e) => {
            if (this.isActive) {
                this.updateMoneyDisplay();
            }
        });
    },
    
    // ✅ 收集所有需要預載的圖片
    collectImagesToPreload: function(config) {
        const imagesToPreload = [];
        
        // 1. 地圖背景
        if (config.background) {
            imagesToPreload.push(config.background);
        }
        
        // 2. 物品圖片（彩色和陰影）
        if (config.items) {
            config.items.forEach(item => {
                if (item.colorImage) imagesToPreload.push(item.colorImage);
                if (item.shadowImage) imagesToPreload.push(item.shadowImage);
            });
        }
        
        // 3. 店家對話圖片（dialogue 中的 characterImage）
        if (config.hotspots) {
            config.hotspots.forEach(hotspot => {
                if (hotspot.dialogue && hotspot.dialogue.characterImage) {
                    imagesToPreload.push(hotspot.dialogue.characterImage);
                }
                if (hotspot.successDialogue) {
                    let dialogues = hotspot.successDialogue;
                    if (!Array.isArray(dialogues)) dialogues = [dialogues];
                    dialogues.forEach(d => {
                        if (d.characterImage) imagesToPreload.push(d.characterImage);
                    });
                }
            });
        }
        
        // 去重
        return [...new Set(imagesToPreload)];
    },
    
    // ✅ 顯示簡單的 loading 提示
    showSimpleLoading: function() {
        if (this.simpleLoading) return;
        
        this.simpleLoading = document.createElement('div');
        this.simpleLoading.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: #ffd700;
            padding: 20px 40px;
            border-radius: 16px;
            font-size: 20px;
            z-index: 3100;
            text-align: center;
            border: 2px solid #e67e22;
            font-family: 'LXGW WenKai TC', '標楷體', sans-serif;
        `;
        this.simpleLoading.innerHTML = '🎮 載入中，請稍候...';
        this.overlay.appendChild(this.simpleLoading);
    },
    
    // ✅ 隱藏簡單的 loading 提示
    hideSimpleLoading: function() {
        if (this.simpleLoading) {
            this.simpleLoading.remove();
            this.simpleLoading = null;
        }
    },

    // ✅ 顯示店家 loading（地圖變暗 + 右下角跳動文字）- 不切換畫面
    showShopLoading: function() {
        if (this.shopLoading) return;
        
        // 建立 loading 容器
        this.shopLoading = document.createElement('div');
        this.shopLoading.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 3040;
            display: flex;
            justify-content: flex-end;
            align-items: flex-end;
            pointer-events: none;  /* 讓點擊穿透，但其實 loading 期間不應該有點擊 */
        `;
        
        // 建立跳動文字
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Loading...';
        loadingText.style.cssText = `
            color: #ffd700;
            font-size: 18px;
            font-family: 'LXGW WenKai TC', '標楷體', monospace;
            margin: 20px;
            padding: 8px 16px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 30px;
            border: 1px solid #e67e22;
            animation: loadingJump 0.8s ease-in-out infinite;
            letter-spacing: 2px;
        `;
        
        this.shopLoading.appendChild(loadingText);
        this.overlay.appendChild(this.shopLoading);
        
        // 加入跳動動畫（如果還沒有）
        if (!document.getElementById('loading-jump-style')) {
            const jumpStyle = document.createElement('style');
            jumpStyle.id = 'loading-jump-style';
            jumpStyle.textContent = `
                @keyframes loadingJump {
                    0%, 100% { transform: translateY(0); opacity: 0.7; }
                    50% { transform: translateY(-8px); opacity: 1; }
                }
            `;
            document.head.appendChild(jumpStyle);
        }
    },

    // ✅ 新增：隱藏店家 loading
    hideShopLoading: function() {
        if (this.shopLoading) {
            this.shopLoading.remove();
            this.shopLoading = null;
        }
    },
    
    // 開啟蒐集模式
    open: function(config, onComplete) {
        console.log('🗺️ 開啟蒐集模式:', config);
        
        // 確保 DOM 已建立
        if (!this.mapContainer) {
            console.log('⚠️ DOM 未建立，重新建立');
            this.createDOM();
        }
        
        if (!this.mapContainer) {
            console.error('❌ mapContainer 仍為 null');
            return;
        }
        
        this.items = config.items;
        this.totalItems = this.items.length;
        this.collectedItems = new Array(this.totalItems).fill(false);
        this.onCompleteCallback = onComplete;
        this.isActive = true;

        // 更新錢袋顯示
        this.updateMoneyDisplay();
        
        // 設定地圖背景
        if (this.backgroundDiv) {
            this.backgroundDiv.style.backgroundImage = `url('${config.background}')`;
            this.backgroundDiv.style.backgroundSize = 'cover';
            this.backgroundDiv.style.backgroundPosition = 'center';
        }
        
        // 建立右上角物品框
        this.buildItemsDisplay();
        
        // 建立定位點
        this.buildHotspots(config.hotspots);
        
        // 顯示 overlay（先顯示 loading）
        this.overlay.style.display = 'block';
        
        // ✅ 收集所有需要預載的圖片
        const imagesToPreload = this.collectImagesToPreload(config);
        console.log(`📦 需要預載入 ${imagesToPreload.length} 張圖片`);
        
        if (typeof LoadingManager !== 'undefined' && imagesToPreload.length > 0) {
            // 顯示 loading 提示
            this.showSimpleLoading();
            
            // 使用 LoadingManager 預載入所有圖片
            LoadingManager.showAndLoad(imagesToPreload, () => {
                console.log('✅ 所有圖片預載完成');
                this.hideSimpleLoading();
                this.showMapMode();
                if (config.introDialogue) {
                    this.showIntroDialogue(config.introDialogue);
                }
            });
        } else {
            // 沒有需要預載的圖片，直接顯示
            this.showMapMode();
            if (config.introDialogue) {
                this.showIntroDialogue(config.introDialogue);
            }
        }
        
        // 暫停對話系統點擊
        if (window.DialogueSystem && window.DialogueSystem.gameContainer) {
            this.savedGameClickHandler = window.DialogueSystem.gameContainer.onclick;
            window.DialogueSystem.gameContainer.onclick = null;
        }
    },
    
    // 顯示地圖模式
    showMapMode: function() {
        if (this.mapContainer) {
            this.mapContainer.style.display = 'block';
        }
        if (this.dialogueOverlay) {
            this.dialogueOverlay.style.display = 'none';
        }
        if (this.overlay) {
            this.overlay.style.display = 'block';
        }
        if (this.hotspotsContainer) {
            this.hotspotsContainer.style.pointerEvents = 'auto';
        }
        if (this.itemsDisplayContainer) {
            this.itemsDisplayContainer.style.display = 'flex';
        }
    },
    
    // 顯示對話模式
    showDialogueMode: function() {
        if (this.mapContainer) {
            this.mapContainer.style.display = 'none';
        }
        if (this.dialogueOverlay) {
            this.dialogueOverlay.style.display = 'flex';
        }
        if (this.overlay) {
            this.overlay.style.display = 'block';
        }
        if (this.itemsDisplayContainer) {
            this.itemsDisplayContainer.style.display = 'flex';
        }
    },
    
    // 小遊戲模式
    showGameMode: function() {
        if (this.mapContainer) {
            this.mapContainer.style.display = 'none';
        }
        if (this.dialogueOverlay) {
            this.dialogueOverlay.style.display = 'none';
        }
        if (this.overlay) {
            this.overlay.style.display = 'block';
        }
        if (this.itemsDisplayContainer) {
            this.itemsDisplayContainer.style.display = 'none';
        }
    },
    
    // 建立右上角物品顯示區
    buildItemsDisplay: function() {
        if (!this.itemsDisplayContainer) return;
        
        this.itemsDisplayContainer.innerHTML = '';
        
        this.items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `collection-item-slot item-${index}`;
            itemDiv.style.cssText = `
                width: 50px;
                height: 50px;
                position: relative;
                cursor: default;
            `;
            
            const shadowImg = document.createElement('img');
            shadowImg.src = item.shadowImage;
            shadowImg.style.cssText = `
                width: 50px;
                height: 50px;
                object-fit: contain;
                filter: brightness(0) invert(0.3);
                opacity: 0.7;
                display: block;
            `;
            shadowImg.id = `item-shadow-${index}`;
            
            const colorImg = document.createElement('img');
            colorImg.src = item.colorImage;
            colorImg.style.cssText = `
                width: 50px;
                height: 50px;
                object-fit: contain;
                display: none;
                position: absolute;
                top: 0;
                left: 0;
            `;
            colorImg.id = `item-color-${index}`;
            
            itemDiv.appendChild(shadowImg);
            itemDiv.appendChild(colorImg);
            this.itemsDisplayContainer.appendChild(itemDiv);
        });
    },
    
    // 建立定位點
    buildHotspots: function(hotspots) {
        if (!this.hotspotsContainer) return;
        
        this.hotspotsContainer.innerHTML = '';
        
        hotspots.forEach((hotspot, index) => {
            const hotspotDiv = document.createElement('div');
            hotspotDiv.className = `collection-hotspot hotspot-${index}`;
            hotspotDiv.style.cssText = `
                position: absolute;
                left: ${hotspot.x}%;
                top: ${hotspot.y}%;
                width: 50px;
                height: 50px;
                transform: translate(-50%, -50%);
                cursor: pointer;
                background: rgba(230,126,34,0.7);
                border: 3px solid #e67e22;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                animation: pulse 1.5s infinite;
            `;
            hotspotDiv.innerHTML = '<span style="color: white; font-size: 24px;">📍</span>';
            hotspotDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isAnimating) return;
                if (!this.collectedItems[index]) {
                    this.onHotspotClick(index, hotspot);
                } else {
                    this.showMessage('已經蒐集過了！', '#ffd700');
                }
            });
            this.hotspotsContainer.appendChild(hotspotDiv);
        });
    },
    
    // 點擊定位點
    onHotspotClick: function(itemIndex, hotspot) {
        console.log(`📍 點擊定位點 ${itemIndex + 1}`);
        this.currentCollectingIndex = itemIndex;
        
        // ✅ 改為：顯示 loading 遮罩在地圖上
        this.showShopLoading();
        
        // ✅ 檢查對話是否有選項
        if (hotspot.dialogue && hotspot.dialogue.options && hotspot.dialogue.options.length > 0) {
            this.showDialogueWithOptions(hotspot.dialogue, () => {
                this.startGameThenCollect(itemIndex, hotspot);
            });
        } else if (hotspot.gameConfig) {
            this.showItemDialogue(hotspot.dialogue, () => {
                this.startGameThenCollect(itemIndex, hotspot);
            });
        } else if (hotspot.dialogue) {
            this.showItemDialogue(hotspot.dialogue, () => {
                this.collectItem(itemIndex);
            });
        } else {
            this.collectItem(itemIndex);
        }
    },

    // 顯示有選項的對話（防止重複觸發）
    showDialogueWithOptions: function(dialogue, onStartGame) {
        let gameStarted = false;
        
        if (typeof Typewriter !== 'undefined') {
            // 預載角色圖片（如果需要）
            const showDialogue = () => {
                // ✅ 圖片載入完成後，才切換到對話模式
                this.showDialogueMode();
                this.hideShopLoading();
                
                // ✅ 先切換背景（如果有設定）
                if (dialogue.background && window.DialogueSystem.gameBackground) {
                    window.DialogueSystem.gameBackground.style.backgroundImage = `url('${dialogue.background}')`;
                    window.DialogueSystem.gameBackground.style.backgroundSize = 'cover';
                    window.DialogueSystem.gameBackground.style.backgroundPosition = 'center';
                }
                
                // 顯示對話
                Typewriter.showDialogue(
                    dialogue.name || '老闆',
                    dialogue.text,
                    dialogue.characterImage,
                    null,
                    'left',
                    ''
                );
                
                const startGame = () => {
                    if (gameStarted) return;
                    gameStarted = true;
                    console.log('進入遊戲');
                    if (onStartGame) onStartGame();
                };
                
                // 監聽對話層點擊
                if (this.dialogueOverlay) {
                    const onClick = () => {
                        this.dialogueOverlay.removeEventListener('click', onClick);
                        clearTimeout(timeoutId);
                        startGame();
                    };
                    this.dialogueOverlay.addEventListener('click', onClick);
                    
                    const timeoutId = setTimeout(() => {
                        this.dialogueOverlay.removeEventListener('click', onClick);
                        console.log('超時，強制進入遊戲');
                        startGame();
                    }, 30000);
                } else {
                    setTimeout(() => startGame(), 500);
                }
            };
            
            // 如果有角色圖片，先載入
            if (dialogue.characterImage) {
                const img = new Image();
                img.onload = showDialogue;
                img.onerror = showDialogue;
                img.src = dialogue.characterImage;
            } else {
                showDialogue();
            }
        } else {
            if (onStartGame) onStartGame();
        }
    },

    // 啟動遊戲，完成後蒐集物品
    startGameThenCollect: function(itemIndex, hotspot) {
        console.log(`🎮 啟動遊戲: ${hotspot.shopName}`);
        
        const gameConfig = hotspot.gameConfig;
        
        if (this.isGameStarting) {
            console.log('⚠️ 遊戲正在啟動中，請稍候');
            return;
        }
        
        this.isGameStarting = true;
        
        if (typeof GameEngine !== 'undefined') {
            this.showGameMode();
            
            const gameConfigCopy = JSON.parse(JSON.stringify(gameConfig));
            
            GameEngine.startMinigame('interact', {
                ...gameConfigCopy,
                onComplete: (success) => {
                    console.log(`🎮 遊戲結果回调: ${success ? '成功' : '失敗'}`);
                    this.isGameStarting = false;
                    
                    if (success) {
                        let chapterData = null;
                        if (window.gameMode === 'child') {
                            chapterData = window.Chapter3_Child;
                        } else {
                            chapterData = window.Chapter3_Teen;
                        }
                        
                        let canComplete = false;
                        if (chapterData && chapterData.markShopComplete) {
                            canComplete = chapterData.markShopComplete(hotspot.shopId);
                            console.log(`💰 扣款結果: ${canComplete ? '成功' : '失敗'}`);
                        }
                        
                        if (!canComplete) {
                            this.showMessage('銅板不足！', '#ff6666');
                            this.showMapMode();
                            return;
                        }
                        
                        this.updateMoneyDisplay();
                        this.showDialogueMode();
                        
                        if (hotspot.successDialogue) {
                            // 把 successDialogue 統一轉成陣列處理
                            let dialogues = hotspot.successDialogue;
                            if (!Array.isArray(dialogues)) {
                                dialogues = [dialogues];
                            }
                            
                            // 依序顯示對話
                            this.showDialogueSequence(dialogues, () => {
                                console.log('📖 所有成功對話完成，開始蒐集物品');
                                this.collectItemWithKeepDialogue(itemIndex);
                            });
                        } else {
                            this.collectItemWithKeepDialogue(itemIndex);
                        }
                    } else {
                        this.showMessage('再試一次吧！', '#ff6666');
                        this.showMapMode();
                    }
                }
            });
        } else {
            // 備用方案...
            console.error('❌ GameEngine 未定義');
            this.isGameStarting = false;
            this.collectItem(itemIndex);
        }
    },
    
    // 蒐集物品但保持對話模式
    collectItemWithKeepDialogue: function(itemIndex) {
        if (this.collectedItems[itemIndex]) return;
        
        console.log(`🎁 蒐集物品 ${itemIndex + 1}（保持對話模式）`);
        this.collectedItems[itemIndex] = true;
        this.playCollectionAnimationKeepDialogue(itemIndex);
    },

    // 依序顯示對話（每句都會等玩家點擊）- 使用 DialogueSystem
    showDialogueSequence: async function(dialogues, onComplete) {
        for (let i = 0; i < dialogues.length; i++) {
            const dialogue = dialogues[i];
            
            // ✅ 建立臨時對話行，讓 DialogueSystem 處理
            const tempLine = {
                name: dialogue.name || '阿斗仔',
                text: dialogue.text,
                characterImage: dialogue.characterImage || null,
                background: dialogue.background || null,
                namePosition: 'left'
            };
            
            // 切換背景（DialogueSystem 的方式）
            if (tempLine.background && window.DialogueSystem.gameBackground) {
                window.DialogueSystem.gameBackground.style.backgroundImage = `url('${tempLine.background}')`;
                window.DialogueSystem.gameBackground.style.backgroundSize = 'cover';
                window.DialogueSystem.gameBackground.style.backgroundPosition = 'center';
            }
            
            // 顯示對話
            await window.DialogueSystem.typewriter.showDialogue(
                tempLine.name,
                tempLine.text,
                tempLine.characterImage,
                null,
                tempLine.namePosition,
                ''
            );
            
            // 等待玩家點擊
            await new Promise((resolve) => {
                const onClick = () => {
                    document.removeEventListener('click', onClick);
                    resolve();
                };
                document.addEventListener('click', onClick);
            });
        }
        if (onComplete) onComplete();
    },
    
    // 播放蒐集動畫
    playCollectionAnimationKeepDialogue: function(itemIndex) {
        this.isAnimating = true;
        const item = this.items[itemIndex];
        
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 160px;
            height: 160px;
            background: rgba(0,0,0,0.9);
            border: 3px solid #e67e22;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: popupAppear 0.3s ease-out;
            cursor: pointer;
        `;
        popup.innerHTML = `
            <img src="${item.colorImage}" style="width: 90px; height: 90px; object-fit: contain;">
            <div style="color: #ffd700; margin-top: 8px; font-size: 14px;">獲得 ${item.name}</div>
        `;
        document.body.appendChild(popup);
        
        const onPopupClick = () => {
            const targetSlot = this.itemsDisplayContainer.querySelector(`.item-${itemIndex}`);
            if (!targetSlot) {
                popup.remove();
                this.isAnimating = false;
                this.afterCollectionComplete(itemIndex);
                return;
            }
            
            const targetRect = targetSlot.getBoundingClientRect();
            const startRect = popup.getBoundingClientRect();
            
            const flyingImg = document.createElement('img');
            flyingImg.src = item.colorImage;
            flyingImg.style.cssText = `
                position: fixed;
                top: ${startRect.top}px;
                left: ${startRect.left}px;
                width: ${startRect.width}px;
                height: ${startRect.height}px;
                z-index: 10001;
                transition: all 0.5s ease-in-out;
                object-fit: contain;
            `;
            document.body.appendChild(flyingImg);
            popup.remove();
            
            requestAnimationFrame(() => {
                flyingImg.style.top = `${targetRect.top}px`;
                flyingImg.style.left = `${targetRect.left}px`;
                flyingImg.style.width = '50px';
                flyingImg.style.height = '50px';
            });
            
            setTimeout(() => {
                flyingImg.remove();
                
                const shadowImg = document.getElementById(`item-shadow-${itemIndex}`);
                const colorImg = document.getElementById(`item-color-${itemIndex}`);
                if (shadowImg) shadowImg.style.display = 'none';
                if (colorImg) colorImg.style.display = 'block';
                
                this.isAnimating = false;
                this.checkAllCollected();
                
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSFX('assets/sounds/collect.mp3', 0.5);
                }
                
                this.afterCollectionComplete(itemIndex);
            }, 500);
        };
        
        popup.addEventListener('click', onPopupClick);
    },

    // 蒐集完成後的處理
    afterCollectionComplete: function(itemIndex) {
        console.log(`✅ 蒐集完成，物品 ${itemIndex + 1}，準備繼續對話`);
        
        const hasMoreItems = this.collectedItems.some(collected => collected === false);
        
        if (!hasMoreItems && this.completeBtn) {
            this.completeBtn.style.display = 'block';
        }
        
        this.showMapMode();
        
        if (this.pendingCallback) {
            const callback = this.pendingCallback;
            this.pendingCallback = null;
            callback();
        }
    },
    
    // 檢查是否全部蒐集完畢
    checkAllCollected: function() {
        const allCollected = this.collectedItems.every(collected => collected === true);
        if (allCollected && this.completeBtn) {
            this.completeBtn.style.display = 'block';
        }
    },
    
    // 完成蒐集
    onComplete: function() {
        console.log('✅ 完成蒐集，結束蒐集模式');
        this.playCompletionAnimation();
    },
    
    // 播放完成動畫
    playCompletionAnimation: function() {
        const slots = this.itemsDisplayContainer.querySelectorAll('.collection-item-slot');
        slots.forEach((slot) => {
            slot.style.animation = 'completeFlash 0.5s ease-in-out';
            setTimeout(() => {
                slot.style.opacity = '0';
            }, 500);
        });
        
        setTimeout(() => {
            this.close();
            if (this.onCompleteCallback) {
                this.onCompleteCallback();
            }
        }, 1000);
    },
    
    // 顯示前言劇情（使用 DialogueSystem 的對話機制）
    showIntroDialogue: function(dialogue) {
        if (this.hotspotsContainer) {
            this.hotspotsContainer.style.pointerEvents = 'none';
        }
        
        this.showDialogueMode();
        
        const onComplete = () => {
            this.showMapMode();
            if (this.hotspotsContainer) {
                this.hotspotsContainer.style.pointerEvents = 'auto';
            }
        };
        
        if (window.DialogueSystem && window.DialogueSystem.typewriter) {
            window.DialogueSystem.typewriter.showDialogue(
                dialogue.name || '阿斗仔',
                dialogue.text,
                dialogue.characterImage,
                null,
                'left',
                ''
            ).then(() => {
                // 等待點擊
                const gameContainer = document.getElementById('game-container');
                if (gameContainer) {
                    const onClick = () => {
                        gameContainer.removeEventListener('click', onClick);
                        onComplete();
                    };
                    gameContainer.addEventListener('click', onClick);
                    setTimeout(() => {
                        gameContainer.removeEventListener('click', onClick);
                        onComplete();
                    }, 10000);
                } else {
                    onComplete();
                }
            });
        } else {
            onComplete();
        }
    },
    
    // 顯示物品對話劇情（等待玩家點擊才繼續）
    showItemDialogue: function(dialogue, onComplete) {
        if (typeof Typewriter !== 'undefined') {
            // 預載角色圖片（如果需要）
            const showDialogue = () => {
                // ✅ 圖片載入完成後，才切換到對話模式
                this.showDialogueMode();
                this.hideShopLoading();
                
                // ✅ 先切換背景（如果有設定）
                if (dialogue.background && window.DialogueSystem.gameBackground) {
                    window.DialogueSystem.gameBackground.style.backgroundImage = `url('${dialogue.background}')`;
                    window.DialogueSystem.gameBackground.style.backgroundSize = 'cover';
                    window.DialogueSystem.gameBackground.style.backgroundPosition = 'center';
                }
                
                // 顯示對話
                Typewriter.showDialogue(
                    dialogue.name || '阿斗仔',
                    dialogue.text,
                    dialogue.characterImage,
                    null,
                    'left',
                    ''
                );
                
                // 使用 MutationObserver 監聽對話框是否被隱藏
                const dialogBox = document.getElementById('dialog-box');
                if (dialogBox) {
                    const observer = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                                if (dialogBox.style.display === 'none') {
                                    observer.disconnect();
                                    console.log('對話框已關閉，繼續流程');
                                    if (onComplete) onComplete();
                                }
                            }
                        }
                    });
                    observer.observe(dialogBox, { attributes: true });
                    
                    setTimeout(() => {
                        observer.disconnect();
                        console.log('超時，強制繼續');
                        if (onComplete) onComplete();
                    }, 15000);
                } else {
                    setTimeout(() => {
                        if (onComplete) onComplete();
                    }, 500);
                }
            };
            
            // 如果有角色圖片，先載入
            if (dialogue.characterImage) {
                const img = new Image();
                img.onload = showDialogue;
                img.onerror = showDialogue;
                img.src = dialogue.characterImage;
            } else {
                showDialogue();
            }
        } else {
            if (onComplete) onComplete();
        }
    },
    
    // 顯示訊息
    showMessage: function(msg, color) {
        const msgDiv = document.createElement('div');
        msgDiv.textContent = msg;
        msgDiv.style.cssText = `
            position: fixed;
            bottom: 30%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.7);
            color: ${color};
            padding: 8px 16px;
            border-radius: 30px;
            z-index: 10000;
            animation: fadeOut 1.5s ease-out forwards;
            font-size: 14px;
        `;
        document.body.appendChild(msgDiv);
        setTimeout(() => msgDiv.remove(), 1500);
    },
    
    // 關閉蒐集系統
    close: function() {
        console.log('🗺️ 關閉蒐集模式');
        
        this.isActive = false;
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        
        // 確保 loading 也被隱藏
        this.hideSimpleLoading();
        
        if (window.DialogueSystem && window.DialogueSystem.gameContainer) {
            window.DialogueSystem.gameContainer.onclick = this.savedGameClickHandler;
        }
    }
};

// CSS 動畫
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
        50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
    }
    @keyframes popupAppear {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    @keyframes completeFlash {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); background: #ffd700; }
        100% { transform: scale(1); opacity: 0; }
    }
    @keyframes fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(style);

window.CollectionSystem = CollectionSystem;