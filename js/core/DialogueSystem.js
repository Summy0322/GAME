// js/core/DialogueSystem.js
const DialogueSystem = {
    currentDialogue: [],
    currentIndex: 0,
    currentChapter: null,
    returnToNode: null,
    
    // 儲存 DOM 元素
    dialogBox: null,
    npcName: null,
    dialogueText: null,
    optionsContainer: null,
    characterImage: null,
    gameContainer: null,
    gameCanvas: null,
    gameBackground: null,
    
    init: function() {
        console.log('🔧 DialogueSystem 初始化');
        
        // 獲取所有需要的 DOM 元素
        this.dialogBox = document.getElementById('dialog-box');
        this.npcName = document.getElementById('npc-name');
        this.dialogueText = document.getElementById('dialogue-text');
        this.optionsContainer = document.getElementById('options-container');
        this.characterImage = document.getElementById('character-image');
        this.gameContainer = document.getElementById('game-container');
        this.gameCanvas = document.getElementById('gameCanvas');
        this.gameBackground = document.getElementById('game-background');
        
        // 檢查是否成功獲取
        console.log('📋 DOM 元素檢查:', {
            dialogBox: !!this.dialogBox,
            npcName: !!this.npcName,
            dialogueText: !!this.dialogueText,
            optionsContainer: !!this.optionsContainer,
            characterImage: !!this.characterImage,
            gameContainer: !!this.gameContainer,
            gameCanvas: !!this.gameCanvas,
            gameBackground: !!this.gameBackground
        });
        
        // 如果缺少必要元素，顯示錯誤
        if (!this.optionsContainer) {
            console.error('❌ 找不到 options-container 元素！');
        }
        
        if (!this.dialogBox) {
            console.error('❌ 找不到 dialog-box 元素！');
        }
        
        // 設定 Typewriter
        this.typewriter = Typewriter;
    },
    
    loadChapter: function(chapterData) {
        console.log('📖 載入章節:', chapterData);
        
        if (!chapterData) {
            console.error('❌ 章節資料為空');
            return;
        }
        
        if (!chapterData.dialogue) {
            console.error('❌ 章節資料缺少 dialogue 屬性:', chapterData);
            return;
        }
        
        this.currentChapter = chapterData;
        this.currentDialogue = chapterData.dialogue;
        this.currentIndex = 0;
        this.returnToNode = null;
        
        console.log('✅ 已載入對話數量:', this.currentDialogue.length);
        
        // 設定背景音樂
        if (chapterData.bgm && AudioManager) {
            AudioManager.playBGM(chapterData.bgm);
        }
        
        // 設定背景圖片
        if (chapterData.background && this.gameBackground) {
            this.gameBackground.style.backgroundImage = `url('${chapterData.background}')`;
            this.gameBackground.style.backgroundSize = 'cover';
            this.gameBackground.style.backgroundPosition = 'center';
        }
        
        this.showDialogue();
    },
    
    showDialogue: async function() {
        console.log('💬 顯示對話，索引:', this.currentIndex, '總長度:', this.currentDialogue.length);
        
        // 檢查對話陣列
        if (!this.currentDialogue || this.currentDialogue.length === 0) {
            console.error('❌ currentDialogue 為空');
            return;
        }
        
        if (this.currentIndex >= this.currentDialogue.length) {
            this.endDialogue();
            return;
        }
        
        const line = this.currentDialogue[this.currentIndex];
        console.log('📝 當前對話行:', line);

        // ✅ 新增：如果對話有指定背景，就更換背景
        if (line.background && this.gameBackground) {
            this.gameBackground.style.backgroundImage = `url('${line.background}')`;
            this.gameBackground.style.backgroundSize = 'cover';
            this.gameBackground.style.backgroundPosition = 'center';
        }
        
        if (!line) {
            console.error('❌ 對話行為空');
            this.currentIndex++;
            this.showDialogue();
            return;
        }
        
        // 清除舊的點擊事件
        if (this.gameContainer) {
            this.gameContainer.onclick = null;
        }
        
        // 確保選項容器存在且清空
        if (this.optionsContainer) {
            this.optionsContainer.innerHTML = '';
            this.optionsContainer.style.display = 'none';
        }
        
        // ===== 修正：直接檢查全域變數，並提供備用方案 =====
        // 直接檢查 window.gameMode
        let currentMode = window.gameMode;
        console.log('當前 window.gameMode:', currentMode);
        
        // 如果還是 undefined，試試看從 localStorage 或 document.body class 判斷
        if (currentMode === undefined || currentMode === null) {
            if (document.body.classList.contains('child-mode')) {
                currentMode = 'child';
                console.log('從 body class 判斷為 child');
            } else {
                currentMode = 'adult';
                console.log('預設為 adult');
            }
        }
        
        let displayText = line.text || '...';
        
        // 直接設定字型
        if (currentMode === 'child') {
            console.log('👶 小朋友模式，直接強制設定字型');
            
            // 如果有 childText 就用
            if (line.childText) {
                displayText = line.childText;
            }
            
            // ===== 暴力設定所有相關元素的字型 =====
            const elements = [
                this.dialogueText,
                this.dialogBox,
                this.npcName,
                document.getElementById('dialogue-text'),
                document.getElementById('npc-name'),
                document.getElementById('dialog-box')
            ];
            
            elements.forEach(el => {
                if (el) {
                    el.style.fontFamily = 'BpmfZihiKai, 標楷體, 微軟正黑體, sans-serif';
                    if (el === this.dialogueText || el === document.getElementById('dialogue-text')) {
                        el.style.lineHeight = '1.8';
                    }
                }
            });
            
            console.log('✅ 已設定字型');
        }
        
        // 顯示對話
        await this.typewriter.showDialogue(
            line.name || '未知',
            displayText,
            line.characterImage,
            line.voice,
            line.namePosition || 'left',
            currentMode === 'child' ? 'child-mode-text' : ''  // 傳入 class
        );
        
        // 對話顯示完成後的處理
        if (line.gallery && line.gallery.length > 0) {
            console.log('🖼️ 發現相簿資料，開啟圖文展示');
            
            // 暫停點擊換頁
            if (this.gameContainer) {
                this.gameContainer.onclick = null;
            }
            
            // 開啟相簿
            if (typeof GallerySystem !== 'undefined') {
                GallerySystem.open(line.gallery, 0);
                
                // 監聽相簿關閉事件（需要修改 GallerySystem，或使用輪詢檢查）
                const checkGalleryClosed = setInterval(() => {
                    if (!GallerySystem.isActive) {
                        clearInterval(checkGalleryClosed);
                        // 相簿關閉後，繼續原本的流程
                        this.continueAfterGallery(line);
                    }
                }, 200);
            } else {
                console.warn('⚠️ GallerySystem 未載入，跳過相簿');
                this.continueAfterGallery(line);
            }
        }else if (line.options && line.options.length > 0) {
            console.log('🔘 顯示選項:', line.options);
            
            
            if (!this.optionsContainer) {
                console.error('❌ optionsContainer 不存在，無法顯示選項');
                return;
            }
            
            // ✅ 等待玩家選擇選項
            const selectedOption = await this.typewriter.showOptions(line.options);
            // ✅ 檢查選項是否帶有 gallery
            if (selectedOption.gallery && selectedOption.gallery.length > 0) {
                console.log('🖼️ 選項帶有相簿，先開啟圖文展示');
                
                // 暫停點擊換頁
                if (this.gameContainer) {
                    this.gameContainer.onclick = null;
                }
                
                // 開啟相簿
                if (typeof GallerySystem !== 'undefined') {
                    GallerySystem.open(selectedOption.gallery, 0);
                    
                    // 等待相簿關閉後才執行選項的 action
                    const checkGalleryClosed = setInterval(() => {
                        if (!GallerySystem.isActive) {
                            clearInterval(checkGalleryClosed);
                            console.log('🖼️ 相簿已關閉，繼續執行選項動作');
                            this.handleOption(selectedOption);
                        }
                    }, 200);
                } else {
                    console.warn('⚠️ GallerySystem 未載入');
                    this.handleOption(selectedOption);
                }
            } else {
                // 沒有相簿，直接執行選項動作
                await this.handleOption(selectedOption);
            }
        } else if (line.next) {
            console.log('⏩ 點擊畫面前往:', line.next);
            if (this.gameContainer) {
                this.gameContainer.onclick = () => {
                    this.goToNode(line.next);
                };
            }
        } else {
            console.log('⏩ 點擊畫面到下一句');
            if (this.gameContainer) {
                this.gameContainer.onclick = () => {
                    this.currentIndex++;
                    this.showDialogue();
                };
            }
        }
    },
    
    handleOption: async function(option) {
        console.log('🎯 處理選項:', option);
        
        // 清空選項
        if (this.optionsContainer) {
            this.optionsContainer.innerHTML = '';
            this.optionsContainer.style.display = 'none';
        }
        
        // 根據 action 類型處理
        if (option.action === 'minigame') {
            console.log('🎮 啟動小遊戲:', option.minigame, '關卡:', option.level);
            // ✅ 準備額外選項（過濾掉 action, minigame, returnTo 等）
            const { action, minigame, returnTo, ...extraOptions } = option;
            
            // 傳入 level 和額外選項
            this.startMinigame(option.minigame, option.returnTo, option.level, extraOptions);
        } 
        else if (option.action === 'goto') {
            console.log('➡️ 跳轉到節點:', option.target);
            this.goToNode(option.target);
        }
        else if (option.action === 'condition') {
            console.log('❓ 條件分支:', option.condition);
            // 這裡可以加入條件判斷邏輯
            this.goToNode(option.falseTarget || option.target);
        }
        else if (option.next) {
            console.log('➡️ 使用 next 跳轉:', option.next);
            this.goToNode(option.next);
        } else {
            console.log('➡️ 預設：下一句對話');
            this.currentIndex++;
            this.showDialogue();
        }
    },

    // ✅ 在這裡添加 continueAfterGallery 方法
    continueAfterGallery: function(line) {
        console.log('🖼️ 相簿已關閉，繼續對話流程');
        
        // 檢查原本的對話行後續處理
        if (line.options && line.options.length > 0) {
            console.log('🔘 顯示選項:', line.options);
            
            if (!this.optionsContainer) {
                console.error('❌ optionsContainer 不存在，無法顯示選項');
                return;
            }
            
            // 注意：這裡需要用 async/await，但 continueAfterGallery 不是 async
            // 解決方案：使用 Promise 或直接呼叫 typewriter.showOptions
            this.typewriter.showOptions(line.options).then(async (selectedOption) => {
                await this.handleOption(selectedOption);
            });
        } else if (line.next) {
            console.log('⏩ 點擊畫面前往:', line.next);
            if (this.gameContainer) {
                this.gameContainer.onclick = () => {
                    this.goToNode(line.next);
                };
            }
        } else {
            console.log('⏩ 點擊畫面到下一句');
            if (this.gameContainer) {
                this.gameContainer.onclick = () => {
                    this.currentIndex++;
                    this.showDialogue();
                };
            }
        }
    },
    
    goToNode: function(nodeId) {
        console.log('🎯 前往節點:', nodeId);
        
        const targetIndex = this.findDialogueIndex(nodeId);
        if (targetIndex !== -1) {
            this.currentIndex = targetIndex;
            this.showDialogue();
        } else {
            console.error('❌ 找不到對話節點:', nodeId);
            this.currentIndex++;
            this.showDialogue();
        }
    },
    
    findDialogueIndex: function(nodeId) {
        return this.currentDialogue.findIndex(d => d.id === nodeId);
    },
    
    startMinigame: function(minigameName, returnToNodeId, level, extraOptions = {}) {
        console.log('🎮 DialogueSystem 請求啟動小遊戲:', minigameName, '關卡:', level);
        
        this.returnToNode = returnToNodeId;
        
        // 清除對話框
        if (this.typewriter) {
            this.typewriter.clear();
        }
        
        // 交給 GameEngine 處理，並傳遞 level
        if (typeof GameEngine !== 'undefined') {
            GameEngine.startMinigame(minigameName, {
                level: level,  // ← 加入這行！
                ...extraOptions,  // ✅ 傳入額外選項（如 cols, rows, time, memorizationTime 等）
                onComplete: (success) => {
                    this.onMinigameComplete(success);
                }
            });
        } else {
            console.error('❌ GameEngine 未定義');
            // 備用方案
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                canvas.style.display = 'block';
                setTimeout(() => {
                    canvas.style.display = 'none';
                    this.onMinigameComplete(true);
                }, 2000);
            }
        }
    },

    onMinigameComplete: function(success) {
        console.log('🏁 小遊戲完成，結果:', success ? '成功' : '失敗');
        
        // 隱藏畫布
        if (this.gameCanvas) {
            this.gameCanvas.style.display = 'none';
            this.gameCanvas.classList.remove('minigame-active');
        }
        
        // 決定要返回哪個節點
        if (this.returnToNode) {
            let nextNodeId;
            if (success) {
                nextNodeId = this.returnToNode + '_success';
            } else {
                nextNodeId = this.returnToNode + '_fail';
            }
            
            const targetIndex = this.findDialogueIndex(nextNodeId);
            if (targetIndex !== -1) {
                this.currentIndex = targetIndex;
            } else {
                const baseIndex = this.findDialogueIndex(this.returnToNode);
                if (baseIndex !== -1) {
                    this.currentIndex = baseIndex;
                } else {
                    this.currentIndex++;
                }
            }
        } else {
            this.currentIndex++;
        }
        
        // 繼續對話
        this.showDialogue();
    },
    
    endDialogue: function() {
        console.log('🔚 對話結束');
        
        if (this.typewriter) {
            this.typewriter.clear();
        }
        
        if (this.gameContainer) {
            this.gameContainer.onclick = null;
        }
        
        if (this.dialogBox) {
            this.dialogBox.style.display = 'none';
        }
        if (this.optionsContainer) {
            this.optionsContainer.style.display = 'none';
        }
        
        // 檢查是否為開場介紹
        if (this.currentChapter && this.currentChapter.id === 'intro') {
            console.log('🎬 開場介紹結束，前往關卡選擇');
            if (typeof showScene !== 'undefined') {
                showScene('level-select');
            }
        }
        
        // ✅ 新增：如果是一般章節結束，觸發完成回調
        if (this.currentChapter && (this.currentChapter.id === 'chapter1_child' || this.currentChapter.id === 'chapter1_teen' || 
            this.currentChapter.id === 'chapter2_child' || this.currentChapter.id === 'chapter2_teen' ||
            this.currentChapter.id === 'chapter3_child' || this.currentChapter.id === 'chapter3_teen')) {
            
            console.log('🎬 章節結束，觸發完成回調');
            
            // 觸發完成回調
            if (this.onChapterComplete) {
                this.onChapterComplete();
                this.onChapterComplete = null;
            }
            
            // 返回關卡選擇
            if (typeof showScene !== 'undefined') {
                showScene('level-select');
            }
        }
        
        if (this.currentChapter && this.currentChapter.onEnd) {
            this.currentChapter.onEnd();
        }
    }
};

// 確保全域可用
window.DialogueSystem = DialogueSystem;