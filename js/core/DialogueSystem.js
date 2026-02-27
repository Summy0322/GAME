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
        
        // 顯示對話（打字機效果）
        await this.typewriter.showDialogue(
            line.name || '未知',
            line.text || '...',
            line.characterImage,
            line.voice
        );
        
        // 對話顯示完成後的處理
        if (line.options && line.options.length > 0) {
            console.log('🔘 顯示選項:', line.options);
            
            // 確保選項容器存在
            if (!this.optionsContainer) {
                console.error('❌ optionsContainer 不存在，無法顯示選項');
                return;
            }
            
            const selectedOption = await this.typewriter.showOptions(line.options);
            await this.handleOption(selectedOption);
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
            console.log('🎮 啟動小遊戲:', option.minigame);
            this.startMinigame(option.minigame, option.returnTo);
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
    
    startMinigame: function(minigameName, returnToNodeId) {
        console.log('🎮 啟動小遊戲:', minigameName, '返回節點:', returnToNodeId);
        
        this.returnToNode = returnToNodeId;
        
        // 清除對話框
        if (this.typewriter) {
            this.typewriter.clear();
        }
        
        // 顯示畫布
        if (this.gameCanvas) {
            this.gameCanvas.style.display = 'block';
            this.gameCanvas.classList.add('minigame-active');
        }
        
        // 根據遊戲名稱啟動對應的小遊戲
        const minigameMap = {
            'memory': window.MemoryGame,
            'puzzle': window.PuzzleGame,
            'finding': window.FindingGame
        };
        
        const Minigame = minigameMap[minigameName];
        if (Minigame && Minigame.start) {
            Minigame.start({
                onComplete: (success) => {
                    this.onMinigameComplete(success);
                }
            });
        } else {
            console.error('❌ 找不到小遊戲:', minigameName);
            setTimeout(() => this.onMinigameComplete(true), 2000);
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
        
        // 檢查是否為開場介紹（可以透過章節 ID 判斷）
        if (this.currentChapter && this.currentChapter.id === 'intro') {
            console.log('🎬 開場介紹結束，前往關卡選擇');
            showScene('level-select');
        }
        
        if (this.currentChapter && this.currentChapter.onEnd) {
            this.currentChapter.onEnd();
        }
    }
};

// 確保全域可用
window.DialogueSystem = DialogueSystem;