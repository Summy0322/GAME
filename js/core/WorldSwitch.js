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
            ? '夜間<span>月下老街</span>' : '故事<span>白日老街</span>';
        document.getElementById('world-switch-status').textContent = this.night
            ? '已切換至夜間挑戰，可選擇限時或無限模式。' : '已切換至故事章節。';
    },
    setDirectory(mode) {
        const practice=mode==='practice';
        document.getElementById('directory-challenge-panel').hidden=practice;
        document.getElementById('directory-practice-panel').hidden=!practice;
        document.getElementById('directory-practice-note').hidden=!practice;
        ['challenge','practice'].forEach(name=>{const tab=document.getElementById('directory-'+name+'-tab'),selected=(name==='practice')===practice;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    },
    init() {
        ['challenge','practice'].forEach((name,index)=>{const tab=document.getElementById('directory-'+name+'-tab');tab?.addEventListener('click',()=>this.setDirectory(name));tab?.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'challenge':e.key==='End'?'practice':index?'challenge':'practice';this.setDirectory(next);document.getElementById('directory-'+next+'-tab').focus();});});
        document.querySelectorAll('[data-practice-kind]').forEach(button=>button.addEventListener('click',()=>window.TimedChallenge.startPractice(button.dataset.practiceKind)));
        document.getElementById('world-switch')?.addEventListener('click', () => this.setNight(!this.night));
    }
};
document.addEventListener('DOMContentLoaded', () => window.WorldSwitch.init());
