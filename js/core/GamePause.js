window.GamePause = {
    owner: null,
    paused: false,
    generation: 0,
    animations: [],
    extraRoots: [],
    attach(owner, kind) {
        this.end();
        if (!['defense', 'memory'].includes(kind)) return;
        this.owner = owner;
        this.kind = kind;
        this.clock = owner.pauseClock || owner.session?.clock || null;
        this.root = owner.container || document.getElementById('game-container');
        const button = document.getElementById('game-pause-button');
        if (button) { button.hidden = false; button.dataset.game = kind; }
        if (document.hidden || this.portrait()) this.pause();
    },
    portrait() { return window.matchMedia?.('(orientation: portrait)').matches === true; },
    pause() {
        if (!this.owner) return;
        this.cancelCountdown();
        if (!this.paused) {
            this.paused = true;
            this.clock?.pause();
            this.owner.cancelDrag?.();
            if (this.kind === 'defense') {
                this.owner.lastTrailX = this.owner.lastTrailY = null;
                this.owner.touchStart = {x:0,y:0};
            }
            this.wasInert = !!this.root?.inert;
            if (this.root) this.root.inert = true;
            this.extraRoots = [...(this.owner.session?.nodes || [])].filter(node=>!this.root?.contains?.(node)).map(node=>({node, visibility:node.style.visibility, inert:node.inert}));
            this.extraRoots.forEach(({node})=>{node.style.visibility='hidden';node.inert=true;});
            this.animations = [this.root,...this.extraRoots.map(entry=>entry.node)].flatMap(root=>root?.getAnimations?.({subtree:true}) || []).filter(animation=>animation.playState==='running');
            this.animations.forEach(animation=>animation.pause());
            window.GameMusic?.player?.pause();
            window.AudioManager?.stopDialogueChirp();
            window.AudioManager?.sfxPlayer?.pause();
        }
        document.getElementById('game-pause-button').hidden = true;
        document.getElementById('game-pause-overlay').hidden = false;
        document.getElementById('game-pause-status').textContent = '遊戲已暫停';
        const resume = document.getElementById('game-pause-resume');
        resume.disabled = false;
        resume.focus();
        window.DialogueSkip?.render();
    },
    cancelCountdown() {
        if (this.countdownTimer != null) clearTimeout(this.countdownTimer);
        this.countdownTimer = null;
        const overlay = document.getElementById('game-pause-overlay');
        if (overlay) delete overlay.dataset.countdown;
    },
    continueGame() {
        if (!this.owner || !this.paused || this.countdownTimer != null) return;
        if (document.hidden || this.portrait()) {
            document.getElementById('game-pause-status').textContent = '請將畫面橫放後再繼續';
            return;
        }
        const generation = this.generation;
        document.getElementById('game-pause-overlay').dataset.countdown = 'true';
        let remaining = 3;
        const status = document.getElementById('game-pause-status');
        document.getElementById('game-pause-resume').disabled = true;
        const tick = () => {
            if (generation !== this.generation || !this.owner || !this.paused) return;
            if (document.hidden || this.portrait()) { this.pause(); return; }
            if (remaining === 0) { this.countdownTimer = null; this.resume(); return; }
            status.textContent = `${remaining--} 秒後繼續`;
            this.countdownTimer = setTimeout(tick,1000);
        };
        tick();
    },
    resume() {
        if (!this.owner || !this.paused) return;
        this.cancelCountdown();
        if (this.root) this.root.inert = this.wasInert;
        this.restoreExtras();
        this.animations.forEach(animation=>{try{animation.play();}catch(_){}});
        this.animations = [];
        this.paused = false;
        this.clock?.resume();
        document.getElementById('game-pause-overlay').hidden = true;
        document.getElementById('game-pause-button').hidden = false;
        document.getElementById('game-pause-button').focus();
        window.GameMusic?.play();
        window.DialogueSkip?.render();
    },
    end(owner) {
        if (owner && owner !== this.owner) return;
        this.generation++;
        this.cancelCountdown();
        if (this.paused && this.root) this.root.inert = this.wasInert;
        this.restoreExtras();
        this.animations.forEach(animation=>{try{animation.play();}catch(_){}});
        this.animations = [];
        this.paused = false;
        this.owner = this.root = this.clock = null;
        for (const id of ['game-pause-overlay','game-pause-button']) {
            const node = document.getElementById(id);
            if (node) node.hidden = true;
        }
    },
    restoreExtras() {
        this.extraRoots.forEach(({node,visibility,inert})=>{node.style.visibility=visibility;node.inert=inert;});
        this.extraRoots=[];
    },
    exit() {
        if (!this.owner) return;
        window.LoadingManager?.cancel();
        window.CollectionSystem?.close();
        window.GameEngine?.stopMinigame();
        window.DialogueSystem?.endDialogue(true);
        this.end();
        if (typeof showScene === 'function') showScene('level-select');
    },
    init() {
        document.getElementById('game-pause-button').addEventListener('click',event=>{event.stopPropagation();this.pause();});
        document.getElementById('game-pause-resume').addEventListener('click',()=>this.continueGame());
        document.getElementById('game-pause-exit').addEventListener('click',()=>this.exit());
        document.getElementById('game-pause-overlay').addEventListener('click',event=>event.stopPropagation());
        const automatic = () => { if (this.owner && (document.hidden || this.portrait())) this.pause(); };
        document.addEventListener('visibilitychange',automatic);
        window.addEventListener('resize',automatic);
        window.addEventListener('pagehide',automatic);
        for (const type of ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','click','keydown']) {
            document.addEventListener(type,event=>{
                if (!this.paused || document.getElementById('game-pause-overlay').contains(event.target)) return;
                event.preventDefault();event.stopImmediatePropagation();
            },{capture:true,passive:false});
        }
    }
};
document.addEventListener('DOMContentLoaded',()=>window.GamePause.init());
