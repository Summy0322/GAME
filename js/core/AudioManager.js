// js/core/AudioManager.js
const AudioManager = {
    bgMusic: null,
    sfxPlayer: null,
    chirpContext: null,
    chirpNodes: new Set(),
    chirpLastTime: -Infinity,
    dialogueVolume: 0.30,
    sfxVolume: 0.7,
    bgVolume: 0.5,
    currentSFXVolume: 0.7,
    applySettings: function() {
        const sfx = window.AudioSettings?.factor('sfx') ?? 1;
        const music = window.AudioSettings?.factor('music') ?? 1;
        if (this.bgMusic) this.bgMusic.volume = this.bgVolume * music;
        if (this.sfxPlayer) this.sfxPlayer.volume = this.currentSFXVolume * sfx;
        if (sfx === 0) this.stopDialogueChirp();
    },
    unlockDialogueAudio: function() {
        try {
            const Audio = window.AudioContext || window.webkitAudioContext;
            if (!Audio) return;
            if (!this.chirpContext || this.chirpContext.state === 'closed') this.chirpContext = new Audio();
            if (this.chirpContext.state !== 'running') this.chirpContext.resume().catch(() => {});
        } catch (_) { /* 音訊不可用不影響文字。 */ }
    },
    playDialogueChirp: function(char) {
        const ctx = this.chirpContext;
        if (!/[\p{L}\p{N}]/u.test(char) || document.hidden || !ctx || ctx.state !== 'running' ||
            this.sfxPlayer?.muted || this.dialogueVolume <= 0 || (window.AudioSettings?.factor('sfx') ?? 1) === 0 || ctx.currentTime - this.chirpLastTime < 0.075) return;
        try {
            const now = ctx.currentTime, oscillator = ctx.createOscillator(), gain = ctx.createGain();
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(660, now);
            oscillator.frequency.exponentialRampToValueAtTime(990, now + 0.04);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.18 * this.dialogueVolume * (window.AudioSettings?.factor('sfx') ?? 1), now + 0.004);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
            oscillator.connect(gain); gain.connect(ctx.destination);
            this.chirpNodes.add(oscillator);
            oscillator.onended = () => { this.chirpNodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
            oscillator.start(now); oscillator.stop(now + 0.045);
            this.chirpLastTime = now;
        } catch (_) { /* 不延後補播，避免冒出舊對話音。 */ }
    },
    stopDialogueChirp: function() {
        for (const oscillator of this.chirpNodes) { try { oscillator.stop(); } catch (_) {} }
        this.chirpNodes.clear();
        this.chirpLastTime = -Infinity;
    },
    
    init: function() {
        console.log('🔧 AudioManager 初始化');
        
        // 直接獲取元素，不依賴 DOMContentLoaded
        this._initElements();
        if (!this.dialogueEventsBound) {
            this.dialogueEventsBound = true;
            const unlock = () => this.unlockDialogueAudio();
            document.addEventListener('pointerdown', unlock, {passive:true});
            document.addEventListener('keydown', unlock);
            document.addEventListener('visibilitychange', () => { if (document.hidden) this.stopDialogueChirp(); });
            window.addEventListener('pagehide', () => this.stopDialogueChirp());
        }
    },
    
    _initElements: function() {
        console.log('📋 AudioManager 獲取 DOM 元素');
        
        this.bgMusic = document.getElementById('bg-music');
        this.sfxPlayer = document.getElementById('sfx-player');
        
        console.log('📋 音效元素檢查:', {
            bgMusic: this.bgMusic,
            sfxPlayer: this.sfxPlayer,
            bgMusicExists: !!this.bgMusic,
            sfxPlayerExists: !!this.sfxPlayer
        });
        
        // 如果找不到元素，立即創建
        if (!this.bgMusic) {
            console.warn('⚠️ 找不到 bg-music 元素，立即創建');
            this.bgMusic = document.createElement('audio');
            this.bgMusic.id = 'bg-music';
            this.bgMusic.loop = true;
            document.body.appendChild(this.bgMusic);
            console.log('✅ bg-music 創建完成');
        }
        
        if (!this.sfxPlayer) {
            console.warn('⚠️ 找不到 sfx-player 元素，立即創建');
            this.sfxPlayer = document.createElement('audio');
            this.sfxPlayer.id = 'sfx-player';
            document.body.appendChild(this.sfxPlayer);
            console.log('✅ sfx-player 創建完成');
        }
        
        // 設定預設音量
        if (this.bgMusic) {
            this.bgMusic.volume = this.bgVolume * (window.AudioSettings?.factor('music') ?? 1);
            console.log('✅ bgMusic 音量設定為 0.5');
        }
        
        if (this.sfxPlayer) {
            this.sfxPlayer.volume = this.currentSFXVolume * (window.AudioSettings?.factor('sfx') ?? 1);
            console.log('✅ sfxPlayer 音量設定為 0.7');
        }
        
        console.log('✅ AudioManager 初始化完成', {
            bgMusic: this.bgMusic,
            sfxPlayer: this.sfxPlayer
        });
    },
    
    playBGM: function(src, loop = true) {
        console.log('🎵 播放背景音樂:', src);
        
        if (!this.bgMusic) {
            console.error('❌ bgMusic 未初始化，嘗試重新獲取');
            this._initElements();
            if (!this.bgMusic) {
                console.error('❌ 仍然無法獲取 bgMusic');
                return;
            }
        }
        
        try {
            this.bgMusic.src = src;
            this.bgMusic.loop = loop;
            this.bgMusic.volume = this.bgVolume * (window.AudioSettings?.factor('music') ?? 1);
            
            const playPromise = this.bgMusic.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('⚠️ 背景音樂播放失敗（需要用戶互動）:', error);
                });
            }
        } catch (error) {
            console.error('❌ 播放背景音樂時發生錯誤:', error);
        }
    },
    
    stopBGM: function() {
        console.log('⏹️ 停止背景音樂');
        if (!this.bgMusic) return;
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
    },
    
    playSFX: function(src, volume = 0.7) {
        console.log('🔊 播放音效:', src);

        if (!this.sfxPlayer) {
            console.error('❌ sfxPlayer 未初始化，嘗試重新獲取');
            this._initElements();
            if (!this.sfxPlayer) return;
        }

        // 儲存當前 sfxPlayer 的引用，避免非同步期間被改變
        const player = this.sfxPlayer;

        // --- 關鍵修改：處理播放 Promise ---
        // 先暫停當前的播放（這本身是同步的）
        player.pause();
        
        // 設定新的音效來源
        player.src = src;
        this.currentSFXVolume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : this.sfxVolume));
        this.applySettings();

        // 嘗試播放並處理回傳的 Promise
        const playPromise = player.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    // 播放成功開始
                    // console.log('音效播放成功開始');
                })
                .catch(error => {
                    // 播放失敗（例如被中斷、自動播放政策阻擋等）
                    // 這裡只記錄錯誤，但不讓它顯示在控制台，除非是真正需要關注的錯誤
                    if (error.name !== 'AbortError') {
                        // 如果不是因為中斷導致的錯誤，才記錄下來
                        console.warn('音效播放錯誤:', error);
                    }
                    // 如果是 AbortError，通常是被新的 play() 呼叫中斷，這是預期行為，所以靜默處理
                });
        }
    },
    
    setBGMVolume: function(vol) {
        if (!Number.isFinite(vol)) return;
        this.bgVolume = Math.max(0, Math.min(1, vol));
        this.applySettings();
    },
    
    setSFXVolume: function(vol) {
        if (!Number.isFinite(vol)) return;
        this.dialogueVolume = Math.max(0, Math.min(1, vol));
        if (this.dialogueVolume === 0) this.stopDialogueChirp();
        this.sfxVolume = this.currentSFXVolume = Math.max(0, Math.min(1, vol));
        this.applySettings();
    }
};

// 立即初始化，不等待 DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📌 DOMContentLoaded 時初始化 AudioManager');
        AudioManager.init();
    });
} else {
    console.log('📌 DOM 已載完，立即初始化 AudioManager');
    AudioManager.init();
}

// 確保全域可用
window.AudioManager = AudioManager;
