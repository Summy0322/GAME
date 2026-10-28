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
        if (!player || !this.owner || document.hidden || this.volume === 0) return;
        try {
            const result = player.play();
            result?.then(() => {
                if (this.player !== player || generation !== this.generation) player.pause();
                else if (document.hidden) player.pause();
                else this.needsGesture = false;
            }).catch(error => {
                if (this.player === player && generation === this.generation)
                    this.needsGesture = error.name === 'NotAllowedError';
            });
        } catch (_) { /* 音樂失敗不阻擋遊戲。 */ }
    },
    stop(owner) {
        if (owner && owner !== this.owner) return;
        this.generation++;
        this.owner = null;
        this.needsGesture = false;
        const player = this.player;
        this.player = null;
        if (player) {
            player.onerror = null;
            player.pause();
            player.removeAttribute('src');
            player.load();
        }
    },
    setVolume(value) {
        if (!Number.isFinite(value)) return;
        this.volume = Math.max(0, Math.min(1, value));
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
        document.addEventListener('keydown', retry);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.player?.pause();
            else this.play();
        });
        window.addEventListener('pagehide', () => this.stop());
    }
};
window.GameMusic.init();
