// js/core/Typewriter.js
const Typewriter = {
    // 顯示打字機效果的對話框
    dialogueBox: null,
    dialogueText: null,
    npcName: null,
    optionsContainer: null,
    typingSpeed: 40, // 每個字元的延遲時間（毫秒）
    
    // 初始化
    init: function() {
        this.dialogueBox = document.getElementById('dialog-box');
        this.npcName = document.getElementById('npc-name');
        this.dialogueText = document.getElementById('dialogue-text');
        this.optionsContainer = document.getElementById('options-container');
        
        // 預設隱藏
        if (this.dialogueBox) this.dialogueBox.style.display = 'none';
        if (this.optionsContainer) this.optionsContainer.style.display = 'none';
    },
    
    // 顯示對話（打字機效果）
    showDialogue: function(name, text, characterImage = null, voice = null, namePosition = 'left') {
        return new Promise((resolve) => {
            console.log('📢 Typewriter 顯示對話:', { name, namePosition });
            
            // 顯示對話框
            this.dialogueBox.style.display = 'block';
            
            // ==== 設定角色名稱和位置 ====
            if (this.npcName) {
                this.npcName.innerText = name || '';
                this.npcName.style.display = 'block';  // 確保顯示
                this.npcName.style.opacity = '1';      // 確保不透明
                
                // 移除所有位置 class
                this.npcName.classList.remove('position-left', 'position-center', 'position-right');
                
                // 根據參數加入對應的位置 class
                switch(namePosition) {
                    case 'center':
                        this.npcName.classList.add('position-center');
                        break;
                    case 'right':
                        this.npcName.classList.add('position-right');
                        break;
                    case 'left':
                    default:
                        this.npcName.classList.add('position-left');
                        break;
                }
                
                console.log('✅ 角色名稱已設定:', {
                    name: this.npcName.innerText,
                    position: namePosition,
                    classList: this.npcName.className
                });
            } else {
                console.error('❌ this.npcName 為 null');
            }
            
            // ==== 角色圖片顯示 ====
            const charImg = document.getElementById('character-image');
            const charContainer = document.getElementById('character-container');
            
            if (charImg && charContainer) {
                if (characterImage) {
                    charImg.src = characterImage;
                    charImg.onload = () => {
                        console.log('角色圖片載入完成');
                    };
                    charImg.style.display = 'block';
                    charContainer.style.display = 'flex';
                } else {
                    charImg.style.display = 'none';
                    charContainer.style.display = 'none';
                }
            }
            
            // 播放語音
            if (voice && typeof AudioManager !== 'undefined') {
                AudioManager.playSFX(voice, 0.5);
            }
            
            // 開始打字效果
            this.typeText(text, resolve);
        });
    },
    
    // 打字機效果核心函數
    typeText: function(fullText, onComplete) {
        // 清空原有文字
        this.dialogueText.innerText = '';
        
        let currentText = '';
        let charIndex = 0;
        
        // 處理換行
        const lines = fullText.split('\n');
        const totalChars = fullText.length;
        
        // 創建打字間隔
        const typingInterval = setInterval(() => {
            if (charIndex < totalChars) {
                // 逐字添加
                currentText = fullText.substring(0, charIndex + 1);
                
                // 根據換行符號調整顯示
                let displayText = '';
                let currentPos = 0;
                
                for (let line of lines) {
                    if (currentPos + line.length <= currentText.length) {
                        // 這行完整顯示
                        displayText += line + '\n';
                        currentPos += line.length;
                    } else {
                        // 顯示部分行
                        const remainingChars = currentText.length - currentPos;
                        displayText += line.substring(0, remainingChars);
                        currentPos += line.length;
                        break;
                    }
                }
                
                this.dialogueText.innerText = displayText;
                
                // 播放打字音效（每兩個字元播放一次）
                if (charIndex % 3 === 0) {
                    if (typeof AudioManager !== 'undefined') {
                        AudioManager.playSFX('assets/sounds/sfx-blipmale.wav', 0.1);
                    } else {
                        console.log('打字音效（AudioManager 未定義）');
                    }
                }
                
                charIndex++;
            } else {
                // 打字完成
                clearInterval(typingInterval);
                
                // 顯示完成標誌（三角形）
                this.showCompletionIndicator();
                
                // 回呼完成
                if (onComplete) onComplete();
            }
        }, this.typingSpeed);
    },
    
    // 顯示完成標誌
    showCompletionIndicator: function() {
        // 在對話框右下角顯示三角形
        const indicator = document.createElement('div');
        indicator.id = 'typing-complete-indicator';
        indicator.style.cssText = `
            position: absolute;
            bottom: 10px;
            right: 20px;
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 15px solid #ffd700;
            transform: rotate(180deg);
            animation: pulse 1s infinite;
        `;
        
        // 加入動畫
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 0.5; }
                50% { opacity: 1; }
                100% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
        
        // 移除舊的指示器
        const oldIndicator = document.getElementById('typing-complete-indicator');
        if (oldIndicator) oldIndicator.remove();
        
        this.dialogueBox.appendChild(indicator);
    },
    
    // 顯示選項
    showOptions: function(options) {
        return new Promise((resolve) => {
            this.optionsContainer.innerHTML = '';
            this.optionsContainer.style.display = 'flex';
            
            options.forEach((opt, index) => {
                const btn = document.createElement('button');
                btn.innerText = opt.text;
                
                // 添加動畫效果
                btn.style.animation = `fadeIn 0.3s ease ${index * 0.1}s forwards`;
                btn.style.opacity = '0';
                
                btn.onclick = (e) => {
                    e.stopPropagation();
                    
                    // 播放點擊音效
                    AudioManager.playSFX('assets/sounds/click.mp3');
                    
                    // 清除選項
                    this.optionsContainer.innerHTML = '';
                    this.optionsContainer.style.display = 'none';
                    
                    // 移除完成指示器
                    const indicator = document.getElementById('typing-complete-indicator');
                    if (indicator) indicator.remove();
                    
                    // 回傳選擇的選項
                    resolve(opt);
                };
                
                this.optionsContainer.appendChild(btn);
            });
            
            // 加入動畫樣式
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        });
    },
    
    // 清除對話框
    clear: function() {
        this.dialogueBox.style.display = 'none';
        this.npcName.innerText = '';
        this.dialogueText.innerText = '';
        this.optionsContainer.innerHTML = '';
        this.optionsContainer.style.display = 'none';
        
        const indicator = document.getElementById('typing-complete-indicator');
        if (indicator) indicator.remove();
        
        const charImg = document.getElementById('character-image');
        if (charImg) charImg.style.display = 'none';
    }
};