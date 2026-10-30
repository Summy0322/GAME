// 僅由小遊戲生命週期呼叫；載入腳本與一般對話都不會播放。
window.GameMusic = {
    tracks: {
        ready: 'assets/music/ready-for-adventure.mp3',
        han: 'assets/music/restaurant-han.mp3',
        town: 'assets/music/small-town-great-journey.mp3',
        walk: 'assets/music/walk-little-adventure.mp3'
    },
    player: null,
    owner: null,
    generation: 0,
    volume: 0.20,
    needsGesture: false,
    fading: new Map(),
    start(owner, level = 1) {
        this.stop();
        const key = owner === 'defense' ? (Number(level) === 3 ? 'han' : Number(level) === 1 || Number(level) === 2 ? 'ready' : null)
            : owner === 'memory' || owner === 'quiz' ? 'town' : owner === 'interact' ? 'walk' : null;
        if (!key) return;
        this.owner = owner;
        const player = document.createElement('audio');
        this.player = player;
        player.loop = true;
        player.preload = 'auto';
        player.volume = this.volume;
        player.src = this.tracks[key];
        player.onerror = () => { if (this.player === player) this.stop(owner); };
        if (!document.hidden) this.play();
    },
    play() {
        const player = this.player, generation = this.generation;
        if (!player || !this.owner || document.hidden || window.GamePause?.paused || this.volume === 0) return;
        try {
            const result = player.play();
            result?.then(() => {
                if ((this.player !== player || generation !== this.generation) && !this.fading.has(player)) player.pause();
                else if (document.hidden || window.GamePause?.paused) player.pause();
                else this.needsGesture = false;
            }).catch(error => {
                if (this.player === player && generation === this.generation)
                    this.needsGesture = error.name === 'NotAllowedError';
            });
        } catch (error) {
            if (this.player === player && generation === this.generation)
                this.needsGesture = error.name === 'NotAllowedError';
        }
    },
    stop(owner) {
        if (!owner) {
            for (const [player, fade] of this.fading) {
                clearTimeout(fade.timer);
                this.disposePlayer(player);
            }
            this.fading.clear();
        }
        if (owner && owner !== this.owner) return;
        this.generation++;
        this.owner = null;
        this.needsGesture = false;
        const player = this.player;
        this.player = null;
        this.disposePlayer(player);
    },
    disposePlayer(player) {
        if (player) {
            player.onerror = null;
            player.pause();
            player.removeAttribute('src');
            player.load();
        }
    },
    fadeOut(owner, duration = 800) {
        if (owner !== this.owner || !this.player) return;
        const player = this.player;
        this.player = null;
        this.owner = null;
        this.needsGesture = false;
        this.generation++;
        player.onerror = null;
        if (document.hidden || this.volume === 0 || !Number.isFinite(duration) || duration <= 0) {
            this.disposePlayer(player);
            return;
        }
        const fade = {timer:null, started:performance.now(), volume:player.volume};
        this.fading.set(player, fade);
        const step = () => {
            if (this.fading.get(player) !== fade) return;
            const progress = Math.min(1, (performance.now() - fade.started) / duration);
            player.volume = fade.volume * (1 - progress);
            if (progress >= 1 || document.hidden || this.volume === 0) {
                this.fading.delete(player);
                this.disposePlayer(player);
            } else fade.timer = setTimeout(step, 25);
        };
        step();
    },
    setVolume(value) {
        if (!Number.isFinite(value)) return;
        this.volume = Math.max(0, Math.min(1, value));
        if (this.volume === 0) {
            for (const [player, fade] of this.fading) {
                clearTimeout(fade.timer);
                this.disposePlayer(player);
            }
            this.fading.clear();
        }
        if (this.player) {
            this.player.volume = this.volume;
            if (this.volume === 0) this.player.pause();
            else this.play();
        }
    },
    init() {
        if (this.bound) return;
        this.bound = true;
        const retry = () => { if (this.needsGesture) this.play(); };
        document.addEventListener('pointerdown', retry, {passive:true});
        // 手機的有效啟動手勢可能在放開手指／click 時才成立。
        document.addEventListener('touchend', retry, {passive:true});
        document.addEventListener('click', retry);
        document.addEventListener('keydown', retry);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.player?.pause();
                for (const [player, fade] of this.fading) {
                    clearTimeout(fade.timer);
                    this.disposePlayer(player);
                }
                this.fading.clear();
            }
            else this.play();
        });
        window.addEventListener('pagehide', () => {
            if (window.GamePause?.owner) this.player?.pause();
            else this.stop();
        });
    }
};
window.GameMusic.init();
