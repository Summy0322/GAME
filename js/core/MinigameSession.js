// 一次遊玩的資源範圍：退出或重新開始後，舊事件與延遲工作不再執行。
class MinigameSession {
    constructor() {
        this.controller = new AbortController();
        this.timeouts = new Set();
        this.nodes = new Set();
        this.disposed = false;
        this.clock = window.GameClock ? new window.GameClock() : null;
    }

    listen(target, type, listener, options = {}) {
        if (this.disposed) return;
        target.addEventListener(type, listener, { ...options, signal: this.controller.signal });
    }

    timeout(callback, delay) {
        if (this.disposed) return null;
        const schedule = this.clock ? this.clock.setTimeout.bind(this.clock) : setTimeout;
        const id = schedule(() => {
            this.timeouts.delete(id);
            if (!this.disposed) callback();
        }, delay);
        this.timeouts.add(id);
        return id;
    }

    ownNode(node) {
        if (this.disposed) node.remove();
        else this.nodes.add(node);
        return node;
    }

    interval(callback, delay) {
        const schedule = this.clock ? this.clock.setInterval.bind(this.clock) : setInterval;
        return this.disposed ? null : schedule(() => { if (!this.disposed) callback(); }, delay);
    }

    clearTimer(id) {
        if (this.clock) this.clock.clearTimeout(id);
        else { clearTimeout(id); clearInterval(id); }
        this.timeouts.delete(id);
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.clock?.dispose();
        this.controller.abort();
        this.timeouts.forEach(id => this.clearTimer(id));
        this.timeouts.clear();
        this.nodes.forEach(node => node.remove());
        this.nodes.clear();
    }
}

window.MinigameSession = MinigameSession;
