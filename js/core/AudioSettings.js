// 音量以原本的混音為基準，100% 保留既有音量。
window.AudioSettings = {
    key: 'redbrick.audio.v1',
    values: {master: 1, sfx: 1, music: 1, muted: false, sfxMuted: false, musicMuted: false},
    factor(channel) {
        return this.values.muted || this.values[`${channel}Muted`] ? 0 : this.values.master * this.values[channel];
    },
    set(name, value) {
        if (['muted', 'sfxMuted', 'musicMuted'].includes(name)) this.values[name] = value === true;
        else if (['master', 'sfx', 'music'].includes(name) && Number.isFinite(value))
            this.values[name] = Math.max(0, Math.min(1, value));
        else return;
        try { localStorage.setItem(this.key, JSON.stringify(this.values)); } catch (_) {}
        this.apply();
        this.render();
    },
    apply() {
        window.AudioManager?.applySettings();
        window.GameMusic?.setVolume(0.20 * this.factor('music'));
        const video = document.getElementById('intro-video');
        if (video) { video.volume = this.values.master; video.muted = this.values.muted; }
    },
    render() {
        for (const name of ['master', 'sfx', 'music']) {
            const input = document.getElementById(`audio-${name}`);
            if (!input) continue;
            input.value = Math.round(this.values[name] * 100);
            document.getElementById(`audio-${name}-value`).textContent = `${input.value}%`;
            const locked = name !== 'master' && this.values.muted;
            input.disabled = this.values.muted || (name !== 'master' && this.values[`${name}Muted`]);
            document.getElementById(`audio-${name}-row`).classList.toggle('audio-row-disabled', locked);
            const mute = document.getElementById(`audio-${name}-mute`);
            const muted = this.values[name === 'master' ? 'muted' : `${name}Muted`];
            const label = {master:'整體音量', sfx:'音效與對話音', music:'背景音樂'}[name];
            mute.disabled = locked;
            mute.setAttribute('aria-pressed', String(muted));
            mute.setAttribute('aria-label', `${muted ? '解除' : '開啟'}${label}靜音`);
            mute.title = `${muted ? '解除' : '開啟'}靜音`;
            mute.textContent = muted ? '🔇' : '🔊';
        }
    },
    init() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.key));
            if (saved && typeof saved === 'object') {
                for (const name of ['master', 'sfx', 'music'])
                    if (Number.isFinite(saved[name])) this.values[name] = Math.max(0, Math.min(1, saved[name]));
                this.values.muted = saved.muted === true;
                this.values.sfxMuted = saved.sfxMuted === true;
                this.values.musicMuted = saved.musicMuted === true;
            }
        } catch (_) {}
        const dialog = document.getElementById('audio-settings');
        const open = document.getElementById('settings-open');
        const close = document.getElementById('settings-close');
        open.addEventListener('click', () => { this.render(); dialog.showModal(); close.focus(); });
        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => open.focus());
        for (const name of ['master', 'sfx', 'music']) {
            document.getElementById(`audio-${name}`).addEventListener('input', event => this.set(name, Number(event.target.value) / 100));
            const key = name === 'master' ? 'muted' : `${name}Muted`;
            document.getElementById(`audio-${name}-mute`).addEventListener('click', () => this.set(key, !this.values[key]));
        }
        this.apply();
        this.render();
    }
};
document.addEventListener('DOMContentLoaded', () => window.AudioSettings.init());
