const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function fixture(mode = 'adult', level = 1) {
    let now = 10000, next = 0;
    const timers = new Map();
    const elements = {
        'defense-wave-progress': {},
        'defense-wait-meter': {hidden:true, querySelector: () => ({style:{},offsetWidth:100})}
    };
    const context = vm.createContext({ window: {}, console: { log() {}, warn() {}, error() {} },
        document: {getElementById: id => elements[id] || null},
        Date: {now: () => now},
        setTimeout(fn, delay = 0) { const id = ++next; timers.set(id,{fn,at:now+delay}); return id; },
        clearTimeout(id) { timers.delete(id); }, clearInterval(id) { timers.delete(id); }
    });
    const read = file => fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(read('js/minigames/DefenseLevels.js'), context);
    context.DefenseLevels = context.window.DefenseLevels;
    vm.runInContext(read('js/minigames/defense/DefenseAttackRunner.js'), context);
    vm.runInContext(read('js/minigames/DefenseGameV2.js'), context);
    const game = context.window.DefenseGameV2;
    Object.assign(game, {gameActive:true, sessionId:1, score:0, mistakes:0, lastSwipeTime:0,
        levelConfig:context.DefenseLevels[level][mode], currentLevel:level,
        state:game.states.IDLE, msg:{}, scoreEl:{}, attackQueue:[]});
    game.spawnEnemy = dir => game.enemies.push({dir});
    game.clearEnemies = () => { game.enemies = []; };
    game.clearProjectiles = game.clearHeavySequence = game.clearHeavyProjectiles = () => {};
    game.clearTrail = game.stopAllEnemiesBounce = () => {};
    game.addScore = points => { game.score += points; };
    game.showWarning = text => { game.warning = text; };
    game.showFinalResult = () => { game.gameActive = false; game.results = (game.results || 0) + 1; };
    game.launchProjectile = (dir, callback) => {
        const attack = game.currentAttack;
        game.queueWaveCallback(() => {
            if (attack.type === 'NORMAL' && attack.dir === dir && !attack.resolved) {
                attack.resolved = true;
                game.finishAttack();
            }
            callback();
        }, 600, attack);
    };
    const tick = duration => {
        const end = now + duration;
        let steps = 0;
        while (true) {
            const first = [...timers.entries()].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at || a[0]-b[0])[0];
            if (!first) break;
            if (++steps > 1000) throw Error('Timer loop');
            now = first[1].at;
            timers.delete(first[0]); first[1].fn();
        }
        now = end;
    };
    const enter = pattern => {
        const attack = {...pattern,resolved:false};
        if (pattern.dirs) attack.dirs = [...pattern.dirs];
        if (pattern.correctDirs) attack.correctDirs = [...pattern.correctDirs];
        if (pattern.wrongDirs) attack.wrongDirs = [...pattern.wrongDirs];
        game.currentAttack = attack;
        game.executeAttack(attack);
        return attack;
    };
    return { game, tick, enter, timers, elements, levels:context.DefenseLevels };
}

test('first sublevel has ten waves, one stone lesson and a mixed final challenge in both modes', () => {
    for (const mode of ['adult','child']) {
        const {game,levels} = fixture(mode);
        const waves = game.levelConfig.attackPatterns.filter(a => a.type !== 'END');
        assert.equal(waves.length, 10);
        assert.equal(waves.filter(a => a.type === 'DECOY').length, 1);
        assert.deepEqual(Array.from(waves.slice(0,4), a => a.type), Array(4).fill('NORMAL'));
        assert.equal(waves[4].type, 'DECOY');
        assert.equal(waves.at(-1).type, 'MULTI_MIXED');
        for (const level of [1,2,3]) {
            for (const attack of levels[level][mode].attackPatterns) {
                if (attack.type === 'DECOY') assert.equal(attack.wait, mode === 'child' ? 1900 : 1400);
            }
        }
        assert.equal(levels[99].adult.flow, undefined);
    }
});

test('stone waiting lasts the configured duration and scores only once', () => {
    for (const mode of ['adult','child']) {
        const env = fixture(mode);
        const pattern = env.game.levelConfig.attackPatterns.find(a => a.type === 'DECOY');
        const attack = env.enter(pattern);
        env.tick(pattern.wait - 1);
        assert.equal(env.game.score, 0);
        assert.equal(env.elements['defense-wait-meter'].hidden, false);
        env.tick(1);
        assert.equal(env.game.score, 50);
        assert.equal(attack.finished, true);
        env.game.finishAttack();
        assert.equal(env.game.score, 50);
        assert.equal(env.elements['defense-wait-meter'].hidden, true);
    }
});

test('mixed waves wait for impacts plus the avoidance window, not the original deadline', () => {
    for (const mode of ['adult','child']) {
        const env = fixture(mode);
        const attack = env.enter({type:'MULTI_MIXED',dirs:['left','right'],correctDirs:['left'],wrongDirs:['right'],wait:4000});
        env.game.handleSwipe('left');
        env.tick(599);
        assert.equal(attack.finished, undefined);
        env.tick(1);
        assert.equal(attack.multiTimeout, null);
        const hold = env.game.levelConfig.flow.avoidHold;
        env.tick(hold-1);
        assert.equal(attack.finished, undefined);
        env.tick(1);
        assert.equal(attack.finished, true);
        assert.equal(env.game.score, 100);
        assert.ok(600 + hold < 4000);
        env.tick(5000);
        assert.equal(env.game.score, 100);
    }
});

test('hitting a stone during the avoidance window still penalizes and removes its avoidance bonus', () => {
    const env = fixture();
    const attack = env.enter({type:'MULTI_MIXED',dirs:['left','right'],correctDirs:['left'],wrongDirs:['right'],wait:4000});
    env.game.handleSwipe('left'); env.tick(700);
    env.game.handleSwipe('right'); env.tick(1200);
    assert.equal(attack.finished, true);
    assert.equal(env.game.score, 20);
    assert.equal(env.game.mistakes, 1);
});

test('missing a correct direction preserves the full deadline and timeout penalty', () => {
    const env = fixture();
    const attack = env.enter({type:'MULTI_MIXED',dirs:['up','left','right'],correctDirs:['up','left'],wrongDirs:['right'],wait:4000});
    env.game.handleSwipe('up'); env.tick(3999);
    assert.equal(attack.finished, undefined);
    env.tick(1);
    assert.equal(attack.finished, true);
    assert.equal(env.game.score, 90);
    assert.equal(env.game.mistakes, 1);
});

test('last-moment normal input can finish its animation without a false timeout', () => {
    const env = fixture();
    const attack = env.enter({type:'NORMAL',dir:'up',wait:3500});
    env.tick(3499); env.game.handleSwipe('up'); env.tick(600);
    assert.equal(attack.finished, true);
    assert.equal(env.game.score, 100);
    assert.equal(env.game.mistakes, 0);
});

test('empty or repeated directions do not complete or score a mixed wave', () => {
    const env = fixture();
    const attack = env.enter({type:'MULTI_MIXED',dirs:['up','left','right'],correctDirs:['up','left'],wrongDirs:['right'],wait:4000});
    env.game.handleSwipe('down'); env.tick(250);
    env.game.handleSwipe('up'); env.tick(250);
    env.game.handleSwipe('up'); env.tick(1000);
    assert.equal(env.game.score, 50);
    assert.equal(attack.finished, undefined);
    assert.equal(attack.swipedDirs.length, 1);
});

test('stopping during avoidance prevents late rewards or progress changes', () => {
    const env = fixture();
    env.enter({type:'MULTI_MIXED',dirs:['left','right'],correctDirs:['left'],wrongDirs:['right'],wait:4000});
    env.game.handleSwipe('left'); env.tick(600);
    env.game.stop(); env.tick(5000);
    assert.equal(env.game.score, 50);
    assert.equal(env.game.results, undefined);
});

test('both first-sublevel modes reach the final result once with the correct maximum score and progress', () => {
    for (const mode of ['adult','child']) {
        const env = fixture(mode);
        const expected = env.game.calculateMaxScore();
        env.game.startAttackSequence();
        for (let wave=0; wave<10; wave++) {
            env.tick(env.game.levelConfig.flow.prepareTime);
            const attack = env.game.currentAttack;
            if (attack.type === 'DECOY') env.tick(attack.wait);
            else {
                const dirs = attack.type === 'NORMAL' ? [attack.dir] : attack.correctDirs || attack.dirs;
                for (const dir of dirs) { env.game.handleSwipe(dir); env.tick(250); }
                env.tick(600 + (attack.type === 'MULTI_MIXED' ? env.game.levelConfig.flow.avoidHold : 0));
            }
            assert.equal(attack.finished, true, `${mode} wave ${wave+1}`);
            // Some animation time has already advanced into the gap; tick only until the next prepare state.
            if (env.game.state === env.game.states.IDLE) env.tick(env.game.levelConfig.flow.successGap);
        }
        env.tick(2000);
        assert.equal(env.game.results, 1);
        assert.equal(env.game.waveNumber, 10);
        assert.equal(env.game.totalWaves, 10);
        assert.equal(env.game.score, expected);
        assert.match(env.elements['defense-wave-progress'].textContent, /10／10/);
    }
});

test('mixed completion works with the real configurations of all three defense sublevels', () => {
    for (const level of [1,2,3]) {
        for (const mode of ['adult','child']) {
            const env = fixture(mode,level);
            const pattern = env.game.levelConfig.attackPatterns.find(a => a.type === 'MULTI_MIXED');
            const attack = env.enter(pattern);
            for (const dir of pattern.correctDirs) {
                env.game.handleSwipe(dir);
                env.tick(250);
            }
            env.tick(600 + env.game.levelConfig.flow.avoidHold);
            assert.equal(attack.finished, true, `level ${level} ${mode}`);
            assert.equal(env.game.score, pattern.correctDirs.length*50 + pattern.wrongDirs.length*50);
            assert.equal(env.game.mistakes, 0);
        }
    }
});
