// 一次遊玩的資源範圍：退出或重新開始後，舊事件與延遲工作不再執行。
class MinigameSession {
    constructor() {
        this.controller = new AbortController();
        this.timeouts = new Set();
        this.nodes = new Set();
        this.disposed = false;
    }

    listen(target, type, listener, options = {}) {
        if (this.disposed) return;
        target.addEventListener(type, listener, { ...options, signal: this.controller.signal });
    }

    timeout(callback, delay) {
        if (this.disposed) return null;
        const id = setTimeout(() => {
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

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.controller.abort();
        this.timeouts.forEach(id => clearTimeout(id));
        this.timeouts.clear();
        this.nodes.forEach(node => node.remove());
        this.nodes.clear();
    }
}

window.MinigameSession = MinigameSession;
