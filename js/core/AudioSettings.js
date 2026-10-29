// 音量以原本的混音為基準，100% 保留既有音量。
window.AudioSettings = {
    key: 'redbrick.audio.v1',
    values: {master: 1, sfx: 1, music: 1, muted: false},
    factor(channel) {
        return this.values.muted ? 0 : this.values.master * this.values[channel];
    },
    set(name, value) {
        if (name === 'muted') this.values.muted = value === true;
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
        }
        const mute = document.getElementById('audio-mute');
        if (mute) {
            mute.setAttribute('aria-pressed', String(this.values.muted));
            mute.textContent = this.values.muted ? '解除靜音' : '全部靜音';
        }
    },
    init() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.key));
            if (saved && typeof saved === 'object') {
                for (const name of ['master', 'sfx', 'music'])
                    if (Number.isFinite(saved[name])) this.values[name] = Math.max(0, Math.min(1, saved[name]));
                this.values.muted = saved.muted === true;
            }
        } catch (_) {}
        const dialog = document.getElementById('audio-settings');
        const open = document.getElementById('settings-open');
        const close = document.getElementById('settings-close');
        open.addEventListener('click', () => { this.render(); dialog.showModal(); close.focus(); });
        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => open.focus());
        document.getElementById('audio-mute').addEventListener('click', () => this.set('muted', !this.values.muted));
        for (const name of ['master', 'sfx', 'music'])
            document.getElementById(`audio-${name}`).addEventListener('input', event => this.set(name, Number(event.target.value) / 100));
        this.apply();
        this.render();
    }
};
document.addEventListener('DOMContentLoaded', () => window.AudioSettings.init());
