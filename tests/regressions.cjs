const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function main(storage = {}) {
    const context = vm.createContext({
        window: {}, console, localStorage: storage,
        document: { addEventListener() {}, getElementById() { return null; } }
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'js/main.js'), 'utf8'), context);
    return context;
}

test('completed chapters survive a new session and reset reopens all chapters', () => {
    const data = new Map();
    const storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) };
    const first = main(storage);
    vm.runInContext("completeChapter('chapter1')", first);
    const second = main(storage);
    vm.runInContext('loadChapterStatus()', second);
    assert.equal(vm.runInContext('chapterStatus.chapter1', second), 'completed');
    vm.runInContext('resetAllChapters()', second);
    assert.deepEqual(JSON.parse(data.get('chapterStatus')), {
        chapter1: 'open', chapter2: 'open', chapter3: 'open'
    });
});

test('invalid saves and unavailable storage do not stop initialization', () => {
    for (const saved of ['broken JSON', 'null', '[]', '42']) {
        const context = main({ getItem: () => saved });
        assert.doesNotThrow(() => vm.runInContext('loadChapterStatus()', context));
        assert.equal(vm.runInContext('chapterStatus.chapter1', context), 'open');
    }
    const context = main({
        getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); }
    });
    assert.doesNotThrow(() => vm.runInContext("loadChapterStatus(); completeChapter('chapter1')", context));
    assert.equal(vm.runInContext('chapterStatus.chapter1', context), 'completed');
});

test('only known chapters and valid status values are restored', () => {
    const context = main({ getItem: () => '{"chapter1":"completed","chapter2":"bad","extra":"open"}' });
    vm.runInContext("loadChapterStatus(); setChapterStatus('chapter3', 'bad')", context);
    assert.equal(vm.runInContext('JSON.stringify(chapterStatus)', context),
        '{"chapter1":"completed","chapter2":"open","chapter3":"open"}');
});

test('preload list includes scene and option backgrounds and removes duplicates', () => {
    const context = main();
    const result = vm.runInContext(`collectChapterAssets({background:'a.png', dialogue:[
        {background:'b.png', characterImage:'a.png', options:[{background:'c.png'}]}
    ]})`, context);
    assert.deepEqual(Array.from(result), ['a.png', 'b.png', 'c.png']);
});

function loader() {
    const timers = new Map();
    let nextTimer = 0;
    const videos = [];
    const context = vm.createContext({
        window: {}, console,
        setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; },
        clearTimeout(id) { timers.delete(id); },
        document: { createElement() {
            const video = { load() {} }; videos.push(video); return video;
        } }
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'js/core/LoadingManager.js'), 'utf8'), context);
    const manager = context.window.LoadingManager;
    manager.loadingScreen = { style: {} };
    manager.progressText = {};
    return { manager, timers, videos };
}

test('repeated media events cannot finish before the other assets', () => {
    const { manager } = loader();
    const callbacks = {};
    manager.loadVideo = (src, done) => { callbacks[src] = done; };
    manager.loadImage = (src, done) => { callbacks[src] = done; };
    let completed = 0;
    manager.showAndLoad(['intro.mp4', 'image.png', 'image.png'], () => completed++);
    callbacks['intro.mp4'](); callbacks['intro.mp4']();
    assert.equal(completed, 0);
    assert.equal(manager.progressText.innerText, 50);
    callbacks['image.png']();
    assert.equal(completed, 1);
    assert.equal(manager.progressText.innerText, 100);
});

test('timeouts unblock loading and late events do not complete twice', () => {
    const { manager, timers } = loader();
    let late;
    manager.loadImage = (src, done) => { late = done; };
    let completed = 0;
    manager.showAndLoad(['slow.png?version=1'], () => completed++);
    for (const callback of [...timers.values()]) callback();
    late();
    assert.equal(completed, 1);
    assert.equal(manager.loadingScreen.style.display, 'none');
});

test('superseded loading cannot navigate back to a stale scene', () => {
    const { manager } = loader();
    const callbacks = {};
    manager.loadImage = (src, done) => { callbacks[src] = done; };
    let old = 0, current = 0;
    manager.showAndLoad(['old.png'], () => old++);
    manager.showAndLoad(['new.png'], () => current++);
    callbacks['old.png']();
    assert.equal(manager.loadingScreen.style.display, 'flex');
    callbacks['new.png']();
    assert.equal(old, 0);
    assert.equal(current, 1);
});

test('video listeners are detached after the first completion', () => {
    const { manager, videos } = loader();
    let completed = 0;
    manager.loadVideo('intro.mp4', () => completed++);
    const handler = videos[0].oncanplaythrough;
    handler(); handler();
    assert.equal(completed, 1);
    assert.equal(videos[0].oncanplaythrough, null);
    assert.equal(videos[0].onerror, null);
});

test('quiz layout is removed after answering, clearing, or showing story choices', async () => {
    const classes = new Set();
    const container = {
        style: {}, children: [],
        classList: {
            toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
            remove(name) { classes.delete(name); }
        },
        set innerHTML(value) { this.children = []; },
        appendChild(button) { this.children.push(button); }
    };
    const context = vm.createContext({ window: {}, document: {
        createElement() { return { style: {} }; }, getElementById() { return null; }
    } });
    vm.runInContext(fs.readFileSync(path.join(root, 'js/core/Typewriter.js'), 'utf8'), context);
    const writer = context.window.Typewriter;
    writer.optionsContainer = container;
    const choices = ['a', 'b', 'c', 'd'].map(text => ({ text, action: 'quiz_answer' }));
    const answer = writer.showOptions(choices);
    assert.equal(classes.has('quiz-options'), true);
    container.children[3].onclick({ stopPropagation() {} });
    assert.equal(await answer, choices[3]);
    assert.equal(classes.has('quiz-options'), false);
    writer.showOptions(choices);
    writer.showOptions([{text: '繼續故事'}]);
    assert.equal(classes.has('quiz-options'), false);
    writer.showOptions(choices);
    writer.dialogueBox = { style: {} };
    writer.npcName = {};
    writer.dialogueText = {};
    writer.clear();
    assert.equal(classes.has('quiz-options'), false);
});

function writerFixture() {
    const ticks = new Map();
    let next = 0;
    const context = vm.createContext({ window: {}, console: { log() {} },
        document: { getElementById() { return null; } },
        setInterval(fn) { ticks.set(++next, fn); return next; },
        clearInterval(id) { ticks.delete(id); }
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'js/core/Typewriter.js'), 'utf8'), context);
    const writer = context.window.Typewriter;
    const element = () => ({style:{}, classList:{add(){},remove(){}}});
    writer.dialogueBox = element();
    writer.dialogueText = element();
    writer.npcName = element();
    writer.optionsContainer = element();
    writer.showCompletionIndicator = () => {};
    return { writer, ticks };
}

test('cleared or replaced dialogue cannot keep typing or complete an old line', () => {
    const { writer, ticks } = writerFixture();
    let oldComplete = 0;
    writer.typeText('old', () => oldComplete++);
    const late = [...ticks.values()][0];
    late();
    writer.clear();
    assert.equal(ticks.size, 0);
    const before = writer.dialogueText.textContent;
    late();
    assert.equal(writer.dialogueText.textContent, before);
    writer.typeText('new', () => {});
    late();
    assert.equal(writer.dialogueText.textContent, '');
    assert.equal(oldComplete, 0);
});

test('function-valued dialogue names and text are evaluated once and displayed', async () => {
    const { writer, ticks } = writerFixture();
    let names = 0, texts = 0;
    const done = writer.showDialogue(() => { names++; return '阿斗仔'; }, () => { texts++; return '你好'; });
    for (let i = 0; i < 3; i++) for (const tick of [...ticks.values()]) tick();
    await done;
    assert.equal(names, 1);
    assert.equal(texts, 1);
    assert.equal(writer.npcName.innerText, '阿斗仔');
    assert.equal(writer.dialogueText.textContent, '你好');
    assert.equal(ticks.size, 0);
});

function engineFixture() {
    const pending = [];
    const window = {};
    const context = vm.createContext({ window, console: { log() {} },
        document: { getElementById() { return null; } },
        setTimeout(fn) { pending.push(fn); }
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'js/core/GameEngine.js'), 'utf8'), context);
    return { engine: window.GameEngine, window, pending };
}

test('a missing minigame reports failure rather than granting a win', () => {
    const { engine, pending } = engineFixture();
    const results = [];
    engine.startMinigame('missing', { onComplete: result => results.push(result) });
    pending.forEach(fn => fn());
    assert.deepEqual(results, [false]);
});

test('a missing game callback is ignored after exiting', () => {
    const { engine, pending } = engineFixture();
    let callbacks = 0;
    engine.startMinigame('missing', {onComplete() { callbacks++; }});
    engine.stopMinigame();
    pending.forEach(fn => fn());
    assert.equal(callbacks, 0);
});

test('stopped minigames cannot finish a new game and completion is delivered once', () => {
    const { engine, window } = engineFixture();
    const starts = [], results = [];
    window.MemoryGameV2 = { stop() {}, start(options) { starts.push(options); } };
    engine.startMinigame('memory', {onComplete() { results.push('old'); }});
    engine.startMinigame('memory', {onComplete() { results.push('new'); }});
    starts[0].onComplete(true);
    starts[1].onComplete(true);
    starts[1].onComplete(true);
    assert.deepEqual(results, ['new']);
});
