// 限時玩法接入前，先確認角色、混合素材與夜色；不寫入劇情成績。
window.ChallengeScenes = {
    backgrounds: [1, 2, 3].map(level => `assets/images/defense/level${level}/bg.png`),
    lastBackground: -1,
    run: 0,
    pickBackground(random = Math.random) {
        const choices = this.backgrounds.map((_, index) => index).filter(index => index !== this.lastBackground);
        const index = choices[Math.floor(random() * choices.length)];
        this.lastBackground = index;
        return this.backgrounds[index];
    },
    open(kind) {
        this.kind = kind;
        this.run++;
        showScene('challenge-scene');
        const scene = document.getElementById('challenge-scene');
        scene.dataset.kind = kind;
        document.getElementById('challenge-scene-title').textContent = `${kind === 'defense' ? '防守' : '記憶'}挑戰 · 場景預覽`;
        document.getElementById('challenge-scene-note').textContent = kind === 'defense'
            ? '混合三關素材，背景每場抽選。限時玩法尚未開放。'
            : '夜色只套用背景，卡片保持原色。限時玩法尚未開放。';
        document.getElementById('challenge-reroll').hidden = kind !== 'defense';
        this.loadBackground();
    },
    async loadBackground() {
        const run = ++this.run;
        const url = this.kind === 'defense' ? this.pickBackground() : 'assets/images/ch2/bg.png';
        const scene = document.getElementById('challenge-scene');
        const reroll = document.getElementById('challenge-reroll');
        scene.setAttribute('aria-busy', 'true');
        reroll.disabled = true;
        const status = document.getElementById('challenge-scene-status');
        status.textContent = '場景載入中…';
        try {
            await new Promise((resolve, reject) => {
                const image = new Image();
                const timer = setTimeout(() => reject(Error('timeout')), 15000);
                image.onload = () => { clearTimeout(timer); resolve(); };
                image.onerror = () => { clearTimeout(timer); reject(Error('image')); };
                image.src = url;
            });
            if (run !== this.run) return;
            document.getElementById('challenge-night-background').style.backgroundImage = `url('${url}')`;
            status.textContent = '';
        } catch (_) {
            if (run === this.run) status.textContent = '背景載入失敗，請返回後重試。';
        } finally {
            if (run === this.run) { scene.setAttribute('aria-busy', 'false'); reroll.disabled = false; }
        }
    },
    close() { this.run++; showScene('level-select'); },
    init() {
        document.querySelectorAll('.challenge-preview').forEach((card, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = '查看場景';
            button.dataset.challengePreview = index === 0 ? 'defense' : 'memory';
            card.appendChild(button);
        });
        document.querySelectorAll('[data-challenge-preview]').forEach(button => button.addEventListener('click', () => this.open(button.dataset.challengePreview)));
        document.getElementById('challenge-preview-back').addEventListener('click', () => this.close());
        document.getElementById('challenge-reroll').addEventListener('click', () => this.loadBackground());
    }
};
document.addEventListener('DOMContentLoaded', () => window.ChallengeScenes.init());
