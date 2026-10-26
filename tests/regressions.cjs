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
