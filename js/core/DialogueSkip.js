// 僅跳過劇情；仍經原有入口啟動遊戲並接收真實遊玩結果。
window.DialogueSkip = {
    unlocked: false,
    enabled: false,
    persistent: false,
    persistKey: 'redbrick.skip.enabled.v1',
    savePersistence() {
        try { localStorage.setItem(this.persistKey, this.persistent && this.enabled ? 'true' : 'false'); } catch (_) {}
    },
    context: null,
    pending: null,
    bind(callback, ending = false, message = null, confirmLabel = null) {
        this.clear();
        this.context = {callback, ending, message, confirmLabel};
        this.render();
    },
    clear() {
        this.context = null;
        this.pending = null;
        const dialog = document.getElementById('skip-confirm');
        if (dialog?.open) dialog.close();
        this.render();
    },
    render() {
        const button = document.getElementById('dialogue-skip');
        if (button) button.hidden = !this.enabled || !this.context;
        const toggle = document.getElementById('skip-setting-toggle');
        if (toggle) {
            toggle.textContent = this.enabled ? '已開啟' : this.unlocked ? '開啟' : '密碼解鎖';
            toggle.setAttribute('aria-pressed', String(this.enabled));
        }
    },
    // 沿故事原有的 next / goto 尋找下一個遊戲，避開失敗後的重試分支。
    plan(system) {
        const data = system.currentDialogue, seen = new Set();
        let index = system.currentIndex, background = null;
        while (index >= 0 && index < data.length && !seen.has(index)) {
            seen.add(index);
            const line = data[index];
            if (line.type === 'naming' && !/^chapter3_/.test(system.currentChapter?.id || '')) return null;
            if (line.background) background = line.background;
            const options = line.options || [];
            let option;
            if (/fail/.test(line.id || '')) option = options.find(o => o.action === 'goto');
            else {
                // 問答結果之後進入配對，不重複問答；之前仍保留問答遊戲。
                option = line.id === 'quiz_result_menu'
                    ? options.find(o => o.action === 'minigame')
                    : options.find(o => o.action === 'quiz') || options.find(o => ['minigame', 'collection'].includes(o.action));
            }
            if (option && ['quiz', 'minigame', 'collection'].includes(option.action))
                return {index, option, background};
            option ||= options.find(o => o.action === 'goto');
            const next = option?.target || line.next;
            if (next) {
                index = system.findDialogueIndex(next);
                if (index < 0) return null;
            } else if (options.length) return null;
            else index++;
        }
        return index >= data.length ? {ending: true} : null;
    },
    bindStory(system) {
        const intro = system.currentChapter?.id === 'intro';
        if (!intro && !/^chapter[123]_(child|teen)$/.test(system.currentChapter?.id || '')) { this.clear(); return; }
        const target = this.plan(system);
        if (!target) { this.clear(); return; }
        const run = system.dialogueRun;
        this.bind(() => {
            if (run !== system.dialogueRun) return;
            system.dialogueRun++;
            system.typewriter?.clear();
            system.clearNamingDialog();
            if (system.narrationTimer) clearTimeout(system.narrationTimer);
            system.narrationTimer = null;
            if (system.narrationContainer) system.narrationContainer.style.display = 'none';
            if (system.gameContainer) system.gameContainer.onclick = null;
            window.GallerySystem?.close();
            if (target.ending) { system.endDialogue(false); return; }
            system.currentIndex = target.index;
            if (target.background && system.gameBackground)
                system.gameBackground.style.backgroundImage = `url('${target.background}')`;
            system.handleOption(target.option.action === 'collection'
                ? {...target.option, skipToFirstShop: true} : target.option);
        }, target.ending, intro ? '要跳過介紹，直接前往章節選擇嗎？' : null, intro ? '前往選章' : null);
    },
    init() {
        try {
            if (localStorage.getItem(this.persistKey) === 'true') this.unlocked = this.enabled = this.persistent = true;
        } catch (_) {}
        const button = document.getElementById('dialogue-skip');
        const dialog = document.getElementById('skip-confirm');
        button.addEventListener('click', event => {
            event.stopPropagation();
            if (!this.enabled || !this.context) return;
            this.pending = this.context;
            document.getElementById('skip-confirm-text').textContent = this.context.message || (this.context.ending
                ? '要跳過剩餘對話，完成本章嗎？' : '要跳過對話，直接進行小遊戲嗎？');
            document.getElementById('skip-confirm-play').textContent = this.context.confirmLabel || (this.context.ending ? '完成本章' : '直接遊玩');
            dialog.showModal();
            window.GameSettings?.fit(dialog);
            document.getElementById('skip-confirm-later').focus();
        });
        // 原生 dialog 阻擋背景點擊；內部事件也不傳遞至劇情。
        for (const id of ['skip-confirm', 'skip-unlock'])
            document.getElementById(id).addEventListener('click', event => event.stopPropagation());
        document.getElementById('skip-confirm-later').addEventListener('click', () => { this.pending = null; dialog.close(); button.focus(); });
        dialog.addEventListener('cancel', () => { this.pending = null; });
        document.getElementById('skip-confirm-play').addEventListener('click', () => {
            const target = this.pending;
            if (!this.enabled || !target || target !== this.context) { dialog.close(); return; }
            this.clear();
            target.callback();
        });
        const unlock = document.getElementById('skip-unlock'), input = document.getElementById('skip-password');
        document.getElementById('skip-setting-toggle').addEventListener('click', () => {
            if (this.unlocked) {
                this.enabled = !this.enabled;
                if (!this.enabled) this.persistent = false;
                this.savePersistence();
                this.render(); return;
            }
            input.value = '';
            document.getElementById('skip-password-error').textContent = '';
            unlock.showModal(); window.GameSettings?.fit(unlock); input.focus();
        });
        document.getElementById('skip-unlock-cancel').addEventListener('click', () => unlock.close());
        document.getElementById('skip-unlock-form').addEventListener('submit', event => {
            event.preventDefault();
            if (!['skip_dial', 'skip_godmode'].includes(input.value)) {
                document.getElementById('skip-password-error').textContent = '密碼不正確，請再試一次。';
                input.select(); return;
            }
            this.unlocked = this.enabled = true;
            this.persistent = input.value === 'skip_godmode';
            this.savePersistence();
            input.value = ''; unlock.close(); this.render();
        });
        unlock.addEventListener('close', () => { input.value = ''; document.getElementById('skip-setting-toggle').focus(); });
        this.render();
    }
};
document.addEventListener('DOMContentLoaded', () => window.DialogueSkip.init());
