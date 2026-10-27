const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

class Element extends EventTarget {
    constructor() { super(); this.style = {}; this.children = []; }
    appendChild(node) { node.parentNode = this; this.children.push(node); }
    remove() { this.parentNode = null; this.removed = true; }
    getAttribute() { return null; }
    getBoundingClientRect() { return { left: 0, top: 0 }; }
}

function fixture(name) {
    const timers = new Map();
    let nextId = 0;
    const window = new EventTarget();
    const document = new EventTarget();
    document.body = new Element();
    document.querySelectorAll = () => [];
    document.getElementById = () => null;
    document.createElement = () => new Element();
    const context = vm.createContext({ window, document, AbortController,
        console: { log() {}, warn() {} },
        setTimeout(fn) { const id = ++nextId; timers.set(id, fn); return id; },
        clearTimeout(id) { timers.delete(id); },
        clearInterval(id) { timers.delete(id); }
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'js/core/MinigameSession.js'), 'utf8'), context);
    if (name) vm.runInContext(fs.readFileSync(path.join(root, `js/minigames/${name}.js`), 'utf8'), context);
    return { window, document, timers, context,
        flush() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } }
    };
}

function prepare(name) {
    const env = fixture(name);
    const game = env.window[name];
    let resizeCalls = 0;
    game.createUI = () => { game.container = new Element(); };
    game.handleResize = () => resizeCalls++;
    game.createDragItems = game.createDropZones = game.showHint = game.createCoins = () => {};
    game.clearDropZonesHighlight = game.clearPaymentAreaHighlight = () => {};
    game.createDragLabel = () => new Element();
    game.startForTest = callback => name === 'InteractSystem'
        ? game.start({ mode: 'matching', items: [], zones: [] }, callback)
        : game.start(1, callback);
    return { ...env, game, resizeCalls: () => resizeCalls };
}

function pointer(type, x = 10, y = 10) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerType: 'mouse', button: 0, clientX: x, clientY: y });
    return event;
}

test('session disposal cancels late work and removes owned overlays exactly once', () => {
    const env = fixture();
    const session = vm.runInContext('new MinigameSession()', env.context);
    let calls = 0;
    session.timeout(() => calls++, 1000);
    session.listen(env.window, 'resize', () => calls++);
    const overlay = session.ownNode(new Element());
    const late = [...env.timers.values()][0];
    session.dispose(); session.dispose(); late();
    env.window.dispatchEvent(new Event('resize'));
    assert.equal(calls, 0);
    assert.equal(env.timers.size, 0);
    assert.equal(overlay.removed, true);
});

test('leaving during asset loading prevents a delayed minigame from reopening', () => {
    let loaded;
    const window = {};
    const context = vm.createContext({ window, document: { getElementById() { return null; } },
        LoadingManager: { showAndLoad(assets, callback) { loaded = callback; } }
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'js/core/GameEngine.js'), 'utf8'), context);
    const engine = window.GameEngine;
    let starts = 0;
    engine.collectMinigameAssets = () => ['image.png'];
    engine._startMinigameImmediately = () => starts++;
    engine.startMinigame('memory', {});
    engine.stopMinigame();
    loaded();
    assert.equal(starts, 0);
    engine.startMinigame('memory', {});
    loaded();
    assert.equal(starts, 1);
});

for (const name of ['InteractSystem', 'PaymentSystem']) {
    test(`${name}: repeated starts keep one resize handler and close cancels it`, () => {
        const env = prepare(name);
        for (let i = 0; i < 20; i++) {
            env.game.startForTest(() => {});
            const before = env.resizeCalls();
            env.window.dispatchEvent(new Event('resize'));
            assert.equal(env.resizeCalls(), before + 1);
        }
        env.game.close(); env.game.close();
        const before = env.resizeCalls();
        env.window.dispatchEvent(new Event('resize'));
        assert.equal(env.resizeCalls(), before);
    });

    test(`${name}: closing mid-drag removes document handlers and restores drag state`, () => {
        const env = prepare(name);
        env.game.startForTest(() => {});
        const element = new Element();
        env.game.makeDraggable(element, { name: 'test' });
        element.dispatchEvent(pointer('pointerdown'));
        assert.equal(typeof env.game.cancelDrag, 'function');
        env.game.close();
        const event = pointer('pointermove', 100, 100);
        env.document.dispatchEvent(event);
        assert.equal(event.defaultPrevented, false);
        assert.equal(env.game.cancelDrag, null);
        assert.equal(env.document.body.style.userSelect || '', '');
    });

    test(`${name}: pointer cancellation removes drag handlers without submitting`, () => {
        const env = prepare(name);
        let results = 0;
        env.game.startForTest(() => results++);
        const element = new Element();
        env.game.makeDraggable(element, { name: 'test' });
        element.dispatchEvent(pointer('pointerdown'));
        env.document.dispatchEvent(pointer('pointercancel'));
        env.document.dispatchEvent(pointer('pointerup'));
        assert.equal(results, 0);
        assert.equal(env.game.cancelDrag, null);
        env.game.close();
    });

    test(`${name}: completion is delivered once and canceled completion cannot affect a new session`, () => {
        const env = prepare(name);
        let results = 0;
        const complete = () => name === 'InteractSystem' ? env.game.completeGame() : env.game.onPaymentComplete();
        env.game.startForTest(() => results++);
        complete(); complete();
        env.flush();
        assert.equal(results, 1);
        env.game.startForTest(() => results++);
        complete();
        env.game.close();
        env.game.startForTest(() => results += 100);
        env.flush();
        assert.equal(results, 1);
        env.game.close();
    });
}

function memoryFixture() {
    const env = fixture('MemoryGameV2');
    const game = env.window.MemoryGameV2;
    const card = () => ({ style: {}, classList: { add() {}, remove() {} } });
    game.prepareCardSymbols = game.setCardContents = game.adjustCardSize = () => {};
    game.updateStats = game.updateStrikes = () => {};
    game.createUI = () => {
        game.container = new Element();
        game.grid = { querySelectorAll: () => [card(), card(), card(), card()] };
        game.statusText = {};
        game.cardSymbols = [1, 2, 3, 4];
    };
    game.calculateGrid = () => ({ cols: 2, rows: 2 });
    return { ...env, game };
}

test('memory: stopped memorization cannot flip cards or start the new session timer', () => {
    const env = memoryFixture();
    let starts = 0;
    env.game.startGameMechanic = () => starts++;
    env.game.start({ needMemorize: true });
    const late = [...env.timers.values()];
    env.game.stop();
    assert.equal(env.timers.size, 0);
    env.game.start({ needMemorize: false });
    late.forEach(fn => fn());
    assert.equal(starts, 0);
    assert.equal(env.game.isMemorizing, false);
    env.flush();
    assert.equal(starts, 1);
    env.game.stop();
});

test('memory: ending the game cancels pending animations and shows one result', () => {
    const env = memoryFixture();
    let results = 0;
    env.game.showResultOverlay = () => results++;
    env.game.start({ needMemorize: true });
    env.game.endGame(false);
    env.game.endGame(false);
    assert.equal(env.timers.size, 0);
    assert.equal(results, 1);
    assert.equal(env.game.canFlip, false);
    env.game.stop();
});

test('memory: every referenced sound exists in the game assets', () => {
    const source = fs.readFileSync(path.join(root, 'js/minigames/MemoryGameV2.js'), 'utf8');
    for (const match of source.matchAll(/['"](assets\/sounds\/[^'"]+)['"]/g)) {
        assert.equal(fs.existsSync(path.join(root, match[1])), true, match[1]);
    }
});
