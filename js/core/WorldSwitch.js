// 只切換選章目錄的視覺與入口；不更動章節進度或啟動遊戲。
window.WorldSwitch = {
    night: false,
    setNight(night) {
        this.night = !!night;
        const scene = document.getElementById('level-select');
        scene.classList.toggle('night-world', this.night);
        document.getElementById('story-directory').hidden = this.night;
        document.getElementById('challenge-directory').hidden = !this.night;
        const button = document.getElementById('world-switch');
        button.setAttribute('aria-checked', String(this.night));
        button.querySelector('.world-switch-label').innerHTML = this.night
            ? '挑戰<span>月下老街</span>' : '故事<span>白日老街</span>';
        document.getElementById('world-switch-status').textContent = this.night
            ? '已切換至夜間挑戰，挑戰遊戲即將開放。' : '已切換至故事章節。';
    },
    init() {
        document.getElementById('world-switch')?.addEventListener('click', () => this.setNight(!this.night));
    }
};
document.addEventListener('DOMContentLoaded', () => window.WorldSwitch.init());
