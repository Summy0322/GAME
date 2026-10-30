window.GameSettings = {
    sequential: true,
    tab: 'sound',
    setSequential(value) {
        this.sequential = value === true;
        try { localStorage.setItem('redbrick.play.v1', JSON.stringify({sequential:this.sequential})); } catch (_) {}
        window.applyChapterOrder?.();
        this.render();
    },
    render() {
        const yes = document.getElementById('chapter-order-yes');
        const no = document.getElementById('chapter-order-no');
        if (yes) yes.checked = this.sequential;
        if (no) no.checked = !this.sequential;
    },
    selectTab(tab) {
        if (!['sound', 'play'].includes(tab)) return;
        this.tab = tab;
        for (const name of ['sound', 'play']) {
            const button = document.getElementById(`settings-tab-${name}`);
            button.setAttribute('aria-selected', String(name === tab));
            button.tabIndex = name === tab ? 0 : -1;
            document.getElementById(`settings-panel-${name}`).hidden = name !== tab;
        }
    },
    fit(dialog) {
        const stage = document.getElementById('game-wrapper')?.getBoundingClientRect?.();
        if (!stage || !stage.width || !stage.height) return;
        const size = dialog.id === 'audio-settings' ? [660,340] : dialog.id === 'skip-unlock' ? [460,380] : [460,200];
        const scale = Math.min(1, Math.max(1,stage.width-24)/size[0], Math.max(1,stage.height-24)/size[1]);
        dialog.style.left = `${stage.left + stage.width/2}px`;
        dialog.style.top = `${stage.top + stage.height/2}px`;
        dialog.style.setProperty('--settings-scale', String(scale));
    },
    init() {
        try {
            const saved = JSON.parse(localStorage.getItem('redbrick.play.v1'));
            if (typeof saved?.sequential === 'boolean') this.sequential = saved.sequential;
        } catch (_) {}
        document.getElementById('chapter-order-yes').addEventListener('change', event => { if (event.target.checked) this.setSequential(true); });
        document.getElementById('chapter-order-no').addEventListener('change', event => { if (event.target.checked) this.setSequential(false); });
        for (const name of ['sound','play']) {
            const button = document.getElementById(`settings-tab-${name}`);
            button.addEventListener('click', () => this.selectTab(name));
            button.addEventListener('keydown', event => {
                if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === 'Home' ? 'sound' : event.key === 'End' ? 'play' : this.tab === 'sound' ? 'play' : 'sound';
                this.selectTab(next); document.getElementById(`settings-tab-${next}`).focus();
            });
        }
        const fitOpen = () => {
            for (const id of ['audio-settings','skip-unlock','skip-confirm']) {
                const dialog = document.getElementById(id);
                if (dialog?.open) this.fit(dialog);
            }
        };
        window.addEventListener('resize', fitOpen);
        window.visualViewport?.addEventListener('resize', fitOpen);
        if (window.ResizeObserver) {
            this.observer = new window.ResizeObserver(fitOpen);
            this.observer.observe(document.getElementById('game-wrapper'));
        }
        this.selectTab('sound'); this.render();
    }
};
document.addEventListener('DOMContentLoaded', () => window.GameSettings.init());
