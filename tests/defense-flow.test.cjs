const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function fixture(mode = 'adult', level = 1, virtualClock = false, frameMs = 16) {
    let now = 10000, next = 0;
    const timers = new Map();
    const elements = {
        'defense-wave-progress': {},
        'defense-wait-meter': {hidden:true, querySelector: () => ({style:{},offsetWidth:100})}
    };
    const context = vm.createContext({ window: {}, console: { log() {}, warn() {}, error() {} },
        document: {getElementById: id => elements[id] || null,addEventListener(){}},
        Date: {now: () => now},
        setTimeout(fn, delay = 0) { const id = ++next; timers.set(id,{fn,at:now+delay}); return id; },
        clearTimeout(id) { timers.delete(id); }, clearInterval(id) { timers.delete(id); },
        requestAnimationFrame(fn) { const id=++next;timers.set(id,{fn:()=>fn(now),at:now+frameMs});return id; },
        cancelAnimationFrame(id) { timers.delete(id); }
    });
    const read = file => fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(read('js/data/minigameAssets.js'), context);
    vm.runInContext(read('js/minigames/DefenseLevels.js'), context);
    context.DefenseLevels = context.window.DefenseLevels;
    vm.runInContext(read('js/minigames/defense/DefenseAttackRunner.js'), context);
    vm.runInContext(read('js/minigames/DefenseGameV2.js'), context);
    const game = context.window.DefenseGameV2;
    if (virtualClock) {
        vm.runInContext(read('js/core/GameClock.js'),context);
        game.pauseClock = new context.window.GameClock();
    }
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
    const realLaunchProjectile=game.launchProjectile;
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
    return { game, tick, enter, timers, elements, context, realLaunchProjectile, levels:context.DefenseLevels };
}

function challengeFixture(mode='adult',stage=20) {
    const f=fixture(mode,1,true);
    vm.runInContext(fs.readFileSync(path.join(root,'js/core/TimedChallenge.js'),'utf8'),f.context);
    const c=f.context.window.TimedChallenge,g=f.game;
    Object.assign(c,{active:true,kind:'defense',variant:'endless',mode,lives:3,penalties:0,score:0,ending:false,game:g,liveClock:g.clock});
    c.finish=()=>{c.active=false;g.gameActive=false;c.finished=(c.finished||0)+1;};g.challenge=c;
    const speed=c.defenseSpeed(stage,0);
    g.levelConfig={...g.levelConfig,flow:{...g.levelConfig.flow,prepareTime:speed.prepareTime,successGap:speed.gap}};
    return {...f,c,speed};
}

test('accelerated real challenge waves accept rapid and last-millisecond answers without losing lives',()=>{
    for(const mode of ['adult','child'])for(const stage of [0,2,5,20])for(const type of ['NORMAL','MULTI','MULTI_MIXED']){
        const f=challengeFixture(mode,stage),g=f.game,wait=f.speed.minimumWait;
        const dirs=['up','left','down'];
        const attack=f.enter(type==='NORMAL'?{type,dir:'up',wait}:{type,dirs:type==='MULTI'?dirs:[...dirs,'right'],correctDirs:dirs,wrongDirs:['right'],wait});
        // 三個不同方向的有效手勢均可在最後 41ms 內送出；重複方向不重複計分。
        f.tick(wait-(type==='NORMAL'?1:41));
        for(const dir of type==='NORMAL'?['up']:dirs){g.handleSwipe(dir);if(type!=='NORMAL'&&dir!=='down')f.tick(20);}
        f.tick(600+(type==='MULTI_MIXED'?g.levelConfig.flow.avoidHold:0));
        assert.equal(attack.finished,true,`${mode}/${stage}/${type}`);assert.equal(f.c.lives,3);assert.equal(g.mistakes,0);
    }
});

test('stone mistakes deduct once, honest misses still deduct, and stale damage cannot touch a later wave',()=>{
    const f=challengeFixture(),g=f.game;
    const first=f.enter({type:'MULTI_MIXED',dirs:['left','right'],correctDirs:['left'],wrongDirs:['right'],wait:850});
    g.handleSwipe('right');assert.equal(f.c.lives,2);f.tick(850);assert.equal(g.mistakes,2);assert.equal(f.c.lives,2);
    const next=f.enter({type:'NORMAL',dir:'up',wait:850});
    f.c.loseLife(first);g.recordMistake(first);assert.equal(f.c.lives,2);
    g.handleSwipe('up',first,g.sessionId);assert.equal(next.correctHit,undefined);
    f.tick(850);assert.equal(f.c.lives,1);
    f.enter({type:'NORMAL',dir:'left',wait:850});f.tick(851);assert.equal(f.c.lives,0);assert.equal(f.c.finished,undefined);f.tick(699);assert.equal(f.c.finished,1);
});

test('stone hold and final impacts remain paused together at maximum challenge speed',()=>{
    const f=challengeFixture(),g=f.game;
    const a=f.enter({type:'MULTI_MIXED',dirs:['left','right'],correctDirs:['left'],wrongDirs:['right'],wait:850});
    f.tick(849);g.handleSwipe('left');f.tick(600);
    assert.ok(a.avoidTimer);assert.equal(f.elements['defense-wait-meter'].hidden,false);
    g.clock.pause();f.tick(10000);assert.equal(a.finished,undefined);assert.equal(f.c.lives,3);
    g.clock.resume();f.tick(g.levelConfig.flow.avoidHold);assert.equal(a.finished,true);assert.equal(f.c.lives,3);
    assert.equal(f.elements['defense-wait-meter'].hidden,true);
});

test('endless timeout gives feedback before the next wave, and final life cannot advance into another wave',()=>{
 const f=challengeFixture(),g=f.game;g.waveNumber=94;f.c.lives=1;
 const attack=f.enter({type:'MULTI',dirs:['up','left','down'],wait:1370});
 g.handleSwipe('up');f.tick(1370);assert.equal(f.c.lives,0);assert.equal(attack.closing,true);assert.equal(attack.finished,undefined);
 assert.match(f.c.lastLossReason,/漏接 2/);g.handleSwipe('left');assert.equal(attack.swipedDirs.length,1);
 f.tick(349);assert.equal(attack.finished,undefined);f.tick(1);assert.equal(attack.finished,true);
 f.tick(f.speed.gap+1);assert.equal(g.waveNumber,94);assert.equal(f.c.finished,undefined);
 f.tick(700-350-f.speed.gap-1);assert.equal(f.c.finished,1);
});

test('an active correct early shield blocks accelerated heavy attacks exactly once and stale checks are harmless',()=>{
    for(const mode of ['adult','child']){
        const f=challengeFixture(mode),g=f.game;
        f.context.document.createElement=()=>({style:{},remove(){}});
        g.stage={appendChild(){}};g.showShield=()=>{};
        const attack={type:'HEAVY',dir:'up',resolved:false};g.currentAttack=attack;g.state=g.states.HEAVY_CHARGING;
        g.handleSwipe('up');f.tick(100);g.state=g.states.HEAVY_FLYING;g.launchHeavyProjectile('up');
        assert.equal(attack.finished,true);assert.equal(g.score,g.scoreTable.HEAVY);assert.equal(f.c.lives,3);
        g.resolveHeavyBlock('up',attack,g.sessionId);assert.equal(g.score,g.scoreTable.HEAVY);
        const next={type:'HEAVY',dir:'right',resolved:false};g.currentAttack=next;g.state=g.states.HEAVY_FLYING;g.heavyBlockReady=true;
        f.tick(500);assert.equal(next.finished,undefined);assert.equal(f.c.lives,3);
        g.isShieldActive=false;g.shieldEndTime=0;f.tick(399);g.handleSwipe('right');
        assert.equal(next.successful,true);assert.equal(f.c.lives,3);assert.equal(g.score,2*g.scoreTable.HEAVY);
        // 方向錯誤仍是一次真實失誤。
        const wrong={type:'HEAVY',dir:'right',resolved:false};g.currentAttack=wrong;g.state=g.states.HEAVY_FLYING;
        g.resolveHeavyBlock('left',wrong,g.sessionId);assert.equal(f.c.lives,2);
    }
});

test('cross-wave, canceled and multi-touch gestures never become a swipe in the next wave',()=>{
    const f=challengeFixture(),g=f.game,events={};
    vm.runInContext(fs.readFileSync(path.join(root,'js/minigames/defense/DefenseInput.js'),'utf8'),f.context);
    Object.assign(g,f.context.window.DefenseInputMixin);
    g.container={addEventListener(type,fn){(events[type]||=[]).push(fn);}};
    g.stage={getBoundingClientRect:()=>({left:0,top:0})};g.addTrailPoint=()=>{};
    g.initEventListeners();
    const touch=(x,y,id=1)=>({identifier:id,clientX:x,clientY:y});
    const emit=(type,touches,changed=[])=>events[type].forEach(fn=>fn({touches,changedTouches:changed}));
    const first=f.enter({type:'NORMAL',dir:'up',wait:850});emit('touchstart',[touch(50,100)]);
    first.finished=true;const next=f.enter({type:'DECOY',dir:'up',wait:850});emit('touchend',[],[touch(50,20)]);
    assert.equal(g.mistakes,0);assert.equal(next.resolved,false);
    emit('touchstart',[touch(50,100)]);emit('touchcancel',[]);emit('touchend',[],[touch(50,20)]);assert.equal(g.mistakes,0);
    emit('touchstart',[touch(50,100)]);emit('touchstart',[touch(50,100),touch(60,100,2)]);emit('touchend',[],[touch(50,20)]);assert.equal(g.mistakes,0);
    f.tick(850);assert.equal(f.c.lives,3);
    f.enter({type:'NORMAL',dir:'up',wait:850});emit('touchstart',[touch(50,100)]);emit('touchend',[],[touch(50,20)]);f.tick(600);assert.equal(f.c.lives,3);assert.equal(g.score,150);
});

test('ending AOE cancels its real interval handles and old collision or completion callbacks cannot damage the next AOE',()=>{
    const f=challengeFixture(),g=f.game;
    const lines={};for(const d of ['up','down','left','right'])lines['aoe-'+d]={style:{},getBoundingClientRect:()=>({bottom:-1000,top:1000,left:1000,right:-1000})};
    const original=f.context.document.getElementById;
    f.context.document.getElementById=id=>lines[id]||original(id);
    g.stage={clientWidth:844,clientHeight:390,getBoundingClientRect:()=>({left:0,top:0,width:844,height:390})};
    g.player={getBoundingClientRect:()=>({left:350,top:120,width:140,height:140})};
    g.currentAttack={type:'AOE',resolved:false};g.state=g.states.AOE_ACTIVE;g.startAOE(2600);f.tick(50);
    assert.equal(g.aoeTimers.length,2);
    const old=g.aoeTimers.map(t=>({job:t.id,callback:t.id.callback}));
    g.finishAttack();assert.ok(old.every(t=>!g.clock.jobs.has(t.job)));
    const next={type:'AOE',resolved:false};g.currentAttack=next;g.state=g.states.AOE_ACTIVE;
    old.forEach(t=>t.callback());assert.equal(next.finished,undefined);assert.equal(f.c.lives,3);
});

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
test('paused real defense waves preserve stone hold and pending impact time in both modes and all sublevels',()=>{
    for(const mode of ['adult','child'])for(const level of [1,2,3]){
        const env=fixture(mode,level,true),game=env.game;
        const pattern=game.levelConfig.attackPatterns.find(a=>a.type==='DECOY');
        const stone=env.enter(pattern);env.tick(400);game.pauseClock.pause();env.tick(20000);
        assert.equal(game.score,0);assert.equal(stone.finished,undefined);
        game.pauseClock.resume();env.tick(pattern.wait-401);assert.equal(game.score,0);env.tick(1);assert.equal(game.score,50);
        game.pauseClock.dispose();
        const mixed=fixture(mode,level,true),g=mixed.game;
        const attack=mixed.enter({type:'MULTI_MIXED',dirs:['left','right'],correctDirs:['left'],wrongDirs:['right'],wait:4000});
        g.handleSwipe('left');mixed.tick(300);g.pauseClock.pause();mixed.tick(20000);assert.equal(attack.pendingShots,1);
        g.pauseClock.resume();mixed.tick(300);assert.equal(attack.pendingShots,0);assert.equal(attack.finished,undefined);
        const hold=g.levelConfig.flow.avoidHold;mixed.tick(hold-1);assert.equal(attack.finished,undefined);mixed.tick(1);assert.equal(attack.finished,true);assert.equal(g.score,100);
        g.pauseClock.dispose();
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

test('a stone hit first cancels its hold but leaves time to finish all real targets in every level and mode', () => {
    for (const mode of ['adult','child']) for (const level of [1,2,3]) {
        const env = fixture(mode, level);
        const attack = env.enter({type:'MULTI_MIXED',dirs:['up','left','right'],correctDirs:['up','left'],wrongDirs:['right'],wait:4000});
        env.game.handleSwipe('right');env.tick(600);
        assert.equal(attack.finished,undefined,'stone alone must not end the wave');
        assert.ok(attack.multiTimeout,'remaining targets retain their deadline');
        env.game.handleSwipe('up');env.tick(600);
        assert.equal(attack.finished,undefined,'second target still needs an answer');
        env.game.handleSwipe('left');env.tick(599);
        assert.equal(attack.finished,undefined,'wait for the final impact');
        env.tick(1);
        assert.equal(attack.finished,true,'no stone hold after the final impact');
        assert.equal(env.elements['defense-wait-meter'].hidden,true);
        assert.equal(env.game.score,2*env.game.scoreTable.MIXED_CORRECT+env.game.scoreTable.MIXED_WRONG);
        assert.equal(env.game.mistakes,1);
        const score=env.game.score;env.tick(5000);assert.equal(env.game.score,score);
    }
});

test('a stone hit during the hold ends after its impact without starting another hold',()=>{
    const env=fixture('child');
    const attack=env.enter({type:'MULTI_MIXED',dirs:['left','right'],correctDirs:['left'],wrongDirs:['right'],wait:4000});
    env.game.handleSwipe('left');env.tick(600);
    assert.ok(attack.avoidTimer);
    env.game.handleSwipe('right');env.tick(599);assert.equal(attack.finished,undefined);
    env.tick(1);assert.equal(attack.finished,true);assert.equal(env.game.score,20);
});

test('untouched stones still require avoidance, even after a different stone was hit',()=>{
    const env=fixture();
    const attack=env.enter({type:'MULTI_MIXED',dirs:['up','left','right'],correctDirs:['up'],wrongDirs:['left','right'],wait:4000});
    env.game.handleSwipe('left');env.tick(600);env.game.handleSwipe('up');env.tick(600);
    assert.equal(attack.finished,undefined);assert.ok(attack.avoidTimer);
    env.tick(env.game.levelConfig.flow.avoidHold);assert.equal(attack.finished,true);
    assert.equal(env.game.score,env.game.scoreTable.MIXED_CORRECT+env.game.scoreTable.MIXED_WRONG+env.game.scoreTable.MIXED_AVOID);
});

test('hitting a stone never grants extra time or excuses a missed real target',()=>{
    const env=fixture();
    const attack=env.enter({type:'MULTI_MIXED',dirs:['left','right'],correctDirs:['left'],wrongDirs:['right'],wait:4000});
    env.game.handleSwipe('right');env.tick(3999);assert.equal(attack.finished,undefined);
    env.tick(1);assert.equal(attack.finished,true);assert.equal(env.game.mistakes,2);
    assert.equal(env.game.score,env.game.scoreTable.MIXED_WRONG-Math.abs(env.game.scoreTable.TIME_OUT_PENALTY));
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

function seededRandom(seed) {
    return () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}

test('randomized practice preserves teaching, difficulty, geometry, balanced directions and matching cues', () => {
    const ring = ['up','right','down','left'];
    const arrows = {up:'⬆️',right:'➡️',down:'⬇️',left:'⬅️'};
    const plain = value => JSON.parse(JSON.stringify(value));
    for (const mode of ['adult','child']) {
        const {game} = fixture(mode);
        const templates = game.levelConfig.attackPatterns;
        const before = JSON.stringify(templates);
        for (let seed = 1; seed <= 256; seed++) {
            const queue = game.buildAttackQueue(seededRandom(seed));
            assert.deepEqual(plain(queue.slice(0,5)), plain(templates.slice(0,5).map(a => ({...a,resolved:false}))));
            assert.equal(queue.length, 11);
            assert.equal(queue.at(-1).type, 'END');
            const counts = Object.fromEntries(ring.map(d => [d,1]));
            for (let i = 5; i < 10; i++) {
                const attack = queue[i], source = templates[i];
                assert.equal(attack.type, source.type);
                assert.equal(attack.wait, source.wait);
                assert.equal(attack.phase, source.phase);
                assert.equal(new Set(attack.dirs).size, source.dirs.length);
                assert.ok(attack.dirs.every(d => ring.includes(d)));
                const rotation = (ring.indexOf(attack.dirs[0]) - ring.indexOf(source.dirs[0]) + 4) % 4;
                for (const key of ['dirs','correctDirs','wrongDirs']) {
                    if (source[key]) assert.deepEqual(Array.from(attack[key]), Array.from(source[key], d => ring[(ring.indexOf(d)+rotation)%4]));
                }
                const correct = attack.correctDirs || attack.dirs;
                const wrong = attack.wrongDirs || [];
                assert.ok(correct.every(d => !wrong.includes(d)));
                if (attack.type === 'MULTI_MIXED') {
                    assert.equal(correct.length + wrong.length, attack.dirs.length);
                    assert.equal(attack.text, correct.map(d=>arrows[d]).join('')+'肉圓｜'+wrong.map(d=>arrows[d]).join('')+'石頭');
                } else {
                    assert.equal(attack.text, correct.map(d=>arrows[d]).join('')+' 肉圓');
                }
                correct.forEach(d => counts[d]++);
            }
            assert.ok(Math.max(...Object.values(counts))-Math.min(...Object.values(counts)) <= 1);
            assert.notDeepEqual([...queue[5].dirs].sort(), [...queue[6].dirs].sort());
        }
        assert.equal(JSON.stringify(templates), before);
    }
});

test('different random streams produce varied layouts while identical seeds reproduce a layout', () => {
    const {game} = fixture();
    const variants = new Set();
    for (let seed=1; seed<=64; seed++) variants.add(JSON.stringify(game.buildAttackQueue(seededRandom(seed))));
    assert.ok(variants.size >= 8);
    assert.equal(JSON.stringify(game.buildAttackQueue(seededRandom(42))), JSON.stringify(game.buildAttackQueue(seededRandom(42))));
});

test('test levels retain their authored directions and cues', () => {
    for (const level of [99]) {
        for (const mode of ['adult','child']) {
            const {game} = fixture(mode,level);
            const expected = game.levelConfig.attackPatterns.map(a => ({...a,resolved:false}));
            assert.equal(JSON.stringify(game.buildAttackQueue(seededRandom(7))), JSON.stringify(expected));
        }
    }
});


test('later levels mix learned mechanics from wave one without crossing teaching anchors', () => {
    const ring=['up','right','down','left'];
    const arrows={up:'⬆️',right:'➡️',down:'⬇️',left:'⬅️'};
    const plain=v=>JSON.parse(JSON.stringify(v));
    const signature=a=>JSON.stringify([a.type,a.wait,a.phase,a.keepAuthored,a.dirs?.length,a.correctDirs?.length,a.wrongDirs?.length,a.type==='HEAVY'?['up','down'].includes(a.dir):null]);
    for(const level of [2,3]) for(const mode of ['adult','child']) {
        const {game}=fixture(mode,level), templates=game.levelConfig.attackPatterns;
        const before=JSON.stringify(templates), orders=new Set(), openings=new Set();
        assert.equal(game.levelConfig.flow.randomizeAfter,0);
        assert.equal(templates.find(a=>a.type==='HEAVY').keepAuthored,level===2?true:undefined);
        for(let seed=1;seed<=256;seed++) {
            const queue=game.buildAttackQueue(seededRandom(seed));
            assert.equal(queue.length,templates.length);
            orders.add(queue.map(signature).join('|'));
            openings.add(queue[0].dir);
            for(let start=0;start<templates.length;) {
                if(templates[start].keepAuthored) {
                    assert.deepEqual(plain(queue[start]),plain({...templates[start],resolved:false}));
                    start++;continue;
                }
                let end=start+1;
                while(end<templates.length&&!templates[end].keepAuthored&&end-start<4)end++;
                assert.deepEqual(queue.slice(start,end).map(signature).sort(),templates.slice(start,end).map(signature).sort());
                for(const attack of queue.slice(start,end)) {
                    const possible=templates.slice(start,end).filter(a=>signature(a)===signature(attack));
                    assert.ok(possible.some(source=> {
                        return (attack.type==='HEAVY'?[0,2]:[0,1,2,3]).some(rotation=> {
                            const rotate=d=>ring[(ring.indexOf(d)+rotation)%4];
                            if(source.dir&&attack.dir!==rotate(source.dir))return false;
                            return ['dirs','correctDirs','wrongDirs'].every(key=>!source[key]||JSON.stringify(Array.from(attack[key]))===JSON.stringify(Array.from(source[key],rotate)));
                        });
                    }));
                    const target=game.levelConfig.flow.targetName;
                    const icons=dirs=>dirs.map(d=>arrows[d]).join('');
                    if(attack.type==='NORMAL')assert.equal(attack.text,arrows[attack.dir]+' '+target);
                    if(attack.type==='DECOY')assert.equal(attack.text,arrows[attack.dir]+' 🪨 石頭！別滑');
                    if(attack.type==='HEAVY')assert.ok(possible.some(a=>attack.text===arrows[attack.dir]+' '+a.text));
                    if(attack.type==='MULTI')assert.equal(attack.text,icons(attack.dirs)+' '+target);
                    if(attack.type==='MULTI_MIXED') {
                        assert.equal(attack.text,icons(attack.correctDirs)+target+'｜'+icons(attack.wrongDirs)+'石頭');
                        assert.ok(attack.correctDirs.every(d=>!attack.wrongDirs.includes(d)));
                    }
                }
                start=end;
            }
        }
        assert.ok(orders.size>=8,level+' '+mode+' varies type order');
        assert.equal(openings.size,4,level+' '+mode+' varies opening direction');
        assert.equal(JSON.stringify(templates),before);
    }
});

function specialFixture(){
 const f=fixture('adult',1,true),g=f.game;
 const element=()=>({style:{},children:[],setAttribute(){},appendChild(n){this.children.push(n);},remove(){this.removed=true;}});
 f.context.document.createElement=element;g.container=element();g.processNextAttack=()=>{g.next=(g.next||0)+1;};
 g.spawnEnemy=(dir,decoy,wrong)=>g.enemies.push({dir,isWrong:wrong,element:element()});
 g.challenge={endless:true,loseLife(){g.lost=(g.lost||0)+1;}};
 return f;
}
test('ordered defense has full per-target deadlines and stops timeout immediately on a last-millisecond hit',()=>{
 const f=specialFixture(),g=f.game,a=f.enter({type:'ORDER',dirs:['up','left','down'],wait:1900});
 assert.deepEqual(g.enemies.map(e=>e.element.children[0].textContent),['1','2','3']);assert.equal(g.score,0);
 for(const dir of a.dirs){f.tick(1899);g.handleSwipe(dir);}f.tick(600);
 assert.equal(a.finished,true);assert.equal(a.successful,true);assert.equal(g.score,150);assert.equal(g.lost,undefined);assert.equal(g.specialCue,null);
});
test('memory preview accepts input but keeps the automatic hide time when untouched; numbers stay hidden between answers',()=>{
 const f=specialFixture(),g=f.game,a=f.enter({type:'ORDER',dirs:['up','left','down'],orderPreview:1600,wait:1900});
 assert.equal(g.state,g.states.MULTI);assert.equal(g.score,0);f.tick(1599);assert.equal(a.orderPhase,'preview');assert.equal(g.lost,undefined);f.tick(1);assert.equal(a.orderPhase,'playing');assert.ok(a.orderBadges.every(b=>b.hidden));
 const original=g.enemies.slice();f.tick(1899);g.handleSwipe('up');assert.equal(a.specialStep,1);assert.ok(a.orderBadges.every(b=>b.hidden));assert.deepEqual(g.enemies,original);assert.equal(g.lost,undefined);
 f.tick(1899);g.handleSwipe('left');g.handleSwipe('down');f.tick(600);assert.equal(a.successful,true);assert.equal(g.lost,undefined);
});
test('stone targets have no numbers; hitting a stone costs one life and closes this wave only once',()=>{
 const f=specialFixture(),g=f.game,a=f.enter({type:'ORDER',dirs:['up','left','down'],stoneDirs:['right'],wait:1900});
 assert.equal(g.enemies.length,4);assert.equal(g.enemies.find(e=>e.dir==='right').isWrong,true);assert.equal(g.enemies.find(e=>e.dir==='right').element.children.length,0);assert.equal(a.orderBadges.length,3);
 g.handleSwipe('right');g.handleSwipe('right');g.handleSwipe('up');assert.equal(g.lost,1);assert.equal(a.resolved,true);f.tick(650);assert.equal(a.finished,true);f.tick(3000);assert.equal(g.lost,1);
});
test('memory and stone rules combine without revealing numbers or penalizing correct play',()=>{
 const f=specialFixture(),g=f.game,a=f.enter({type:'ORDER',dirs:['up','left'],stoneDirs:['right'],orderPreview:1600,wait:1900});f.tick(1600);
 g.handleSwipe('up');assert.ok(a.orderBadges.every(b=>b.hidden));g.handleSwipe('left');f.tick(600);assert.equal(a.successful,true);assert.equal(g.lost,undefined);assert.equal(g.score,100);
});
test('ordered timeout deducts once and old hit or preview callbacks cannot alter a newer attack',()=>{
 const f=specialFixture(),g=f.game,a=f.enter({type:'ORDER',dirs:['up','left'],wait:1900});f.tick(1900);assert.equal(g.lost,1);g.handleSwipe('up');f.tick(350);assert.equal(a.finished,true);assert.equal(g.lost,1);
 for(const preview of [0,1600]){const stale=specialFixture(),old=stale.enter({type:'ORDER',dirs:['up','left'],wait:1900,orderPreview:preview});if(!preview)stale.game.handleSwipe('up');stale.game.currentAttack={type:'NORMAL',finished:false,resolved:false};stale.tick(10000);assert.equal(old.specialStep,preview?0:1);assert.equal(stale.game.lost,undefined);}
});
test('memory preview and each next answer timer pause, while input advances immediately',()=>{
 const f=specialFixture(),g=f.game,a=f.enter({type:'ORDER',dirs:['up','left'],wait:1900,orderPreview:1600});f.tick(1500);g.pauseClock.pause();f.tick(10000);assert.equal(a.orderPhase,'preview');g.pauseClock.resume();f.tick(100);assert.equal(a.orderPhase,'playing');g.touchGesture={attack:a};g.handleSwipe('up');assert.equal(a.specialStep,1);assert.equal(g.touchGesture,null);f.tick(1800);g.pauseClock.pause();f.tick(10000);assert.equal(g.lost,undefined);g.pauseClock.resume();f.tick(99);g.handleSwipe('left');f.tick(600);assert.equal(a.successful,true);assert.equal(g.lost,undefined);
});
test('all ordered variants accept three consecutive swipes before any projectile completes',()=>{
 for(const preview of [0,1600])for(const stones of [[],['right']]){const f=specialFixture(),g=f.game,a=f.enter({type:'ORDER',dirs:['up','left','down'],stoneDirs:stones,orderPreview:preview,wait:1900});f.tick(preview);for(const dir of a.dirs)g.handleSwipe(dir);assert.equal(a.specialStep,3);assert.equal(a.pendingShots,3);assert.equal(a.finished,undefined);assert.equal(g.score,150);assert.equal(g.lost,undefined);f.tick(600);assert.equal(a.successful,true);assert.equal(a.finished,true);assert.equal(g.lost,undefined);}
});
test('out-of-order or duplicate hit callbacks cannot end a wave before every pending impact',()=>{
 const f=specialFixture(),g=f.game,hits=[];g.launchProjectile=(dir,done)=>hits.push(done);const a=f.enter({type:'ORDER',dirs:['up','left','down'],wait:1900});g.handleSwipe('up');assert.equal(g.lost,undefined);g.handleSwipe('left');g.handleSwipe('down');hits[2]();hits[2]();assert.equal(a.pendingShots,2);assert.equal(a.finished,undefined);hits[0]();assert.equal(a.finished,undefined);hits[1]();assert.equal(a.finished,true);assert.equal(a.pendingShots,0);assert.equal(g.score,150);
});
test('wrong order or empty direction deducts once and closes the wave without retry lock',()=>{for(const dir of ['left','right']){const f=specialFixture(),g=f.game,a=f.enter({type:'ORDER',dirs:['up','left','down'],wait:1900});g.handleSwipe(dir);g.handleSwipe('up');g.handleSwipe(dir);assert.equal(g.lost,1);assert.equal(a.resolved,true);f.tick(650);assert.equal(a.finished,true);assert.equal(g.lost,1);assert.equal(g.specialCue,null);}});

function aoeMotionFixture(frameMs=16,wait=5500){
 const f=fixture('adult',3,true,frameMs),g=f.game;
 for(const dir of ['up','down','left','right'])f.elements['aoe-'+dir]={style:{},getBoundingClientRect:()=>({bottom:-1000,top:1000,left:1000,right:-1000})};
 g.stage={clientWidth:844,clientHeight:390,getBoundingClientRect:()=>({left:0,top:0,width:844,height:390})};
 g.player={getBoundingClientRect:()=>({left:350,top:120,width:140,height:140})};
 g.currentAttack={type:'AOE',resolved:false};g.state=g.states.AOE_ACTIVE;g.startAOE(wait);f.tick(50);
 return f;
}
test('AOE circles oppose inward pressure; stopping never catches up or banks a long outward stall',()=>{
 const f=aoeMotionFixture(),g=f.game;f.tick(1000);const before=g.aoePressure;let angle=0;
 g.handleRotate({detail:{angle}});
 for(let i=0;i<20;i++){f.tick(50);angle+=18;g.handleRotate({detail:{angle}});}
 const held=g.aoePressure;assert.ok(held>0.04&&held<before+.04,'a steady circle maintains a contest, rather than clearing the wave to the edge');
 f.tick(100);assert.equal(g.aoePushProgress,0);const stopped=g.aoePressure;
 f.tick(100);const first=g.aoePressure-stopped;f.tick(100);const second=g.aoePressure-stopped-first;
 assert.ok(first>0&&first<.025);assert.ok(Math.abs(first-second)<.004,'stopping resumes the same inward speed without time catch-up');
 const resume=g.aoePressure;g.handleRotate({detail:{angle:angle+20}});f.tick(16);assert.ok(Math.abs(g.aoePressure-resume)<.004,'resuming does not jump back to the edge');
});
test('AOE input cannot bank unlimited push or gain credit from angle jumps; paused motion remains frozen',()=>{
 const f=aoeMotionFixture(),g=f.game;g.handleRotate({detail:{angle:0}});g.handleRotate({detail:{angle:170}});assert.equal(g.aoePushProgress,0);
 for(let i=0;i<100;i++)g.handleRotate({detail:{angle:170+20*i}});
 assert.ok(g.aoePushProgress<=120/5500);g.clock.pause();const pressure=g.aoePressure,push=g.aoePushProgress;f.tick(1000);assert.equal(g.aoePressure,pressure);assert.equal(g.aoePushProgress,push);g.clock.resume();f.tick(100);assert.equal(g.aoePushProgress,0);
});
test('AOE motion is consistent across frame rates and rotation event sampling',()=>{
 const values=[];
 for(const frame of [8,16,33])for(const degrees of [1,5,20]){
  const f=aoeMotionFixture(frame),g=f.game;f.tick(1000);g.handleRotate({detail:{angle:0}});
  for(let angle=degrees;angle<=360;angle+=degrees){f.tick(degrees/360*1000);g.handleRotate({detail:{angle}});}
  f.tick(150);values.push(g.aoePressure);
 }
 assert.ok(Math.max(...values)-Math.min(...values)<.015,JSON.stringify(values));
});

test('AOE inward movement is 15 percent quicker and shortened challenge waits increase actual motion',()=>{
 const pressures=[];
 for(const wait of [6500,5500,4696,3520,3400,2816,2600]){
  const f=aoeMotionFixture(16,wait);f.tick(400);const pressure=f.game.aoePressure;
  assert.ok(Math.abs(pressure-1.15*400/wait)<.00001);pressures.push({wait,pressure});
 }
 assert.ok(pressures.find(x=>x.wait===2600).pressure>pressures.find(x=>x.wait===3520).pressure);
 assert.ok(pressures.find(x=>x.wait===3400).pressure>pressures.find(x=>x.wait===4696).pressure);
});

test('wrong ordered swipes fire exactly once toward an out-of-order target, empty direction or stone and wait for impact feedback',()=>{
 for(const kind of ['target','empty','stone']){
  const f=specialFixture(),g=f.game,shots=[];g.launchProjectile=(dir,done)=>shots.push({dir,done});
  const a=f.enter({type:'ORDER',dirs:['up','left'],stoneDirs:kind==='stone'?['right']:[],wait:1900});const dir=kind==='target'?'left':'right';
  g.handleSwipe(dir);g.handleSwipe('up');g.handleSwipe(dir);
  assert.equal(shots.length,1);assert.equal(shots[0].dir,dir);assert.equal(g.lost,1);assert.equal(a.specialStep,0);assert.equal(a.resolved,true);assert.notEqual(a.successful,true);
  f.tick(400);shots[0].done();assert.notEqual(a.finished,true);assert.equal(g.lost,1);
  g.clock.pause();f.tick(5000);assert.notEqual(a.finished,true);g.clock.resume();f.tick(250);assert.equal(a.finished,true);assert.equal(g.lost,1);
  const score=g.score;shots[0].done();assert.equal(g.score,score);assert.notEqual(a.successful,true);
 }
});

test('real wrong-order projectile reaches its target and shows impact before the failed wave is cleared',()=>{
 const f=specialFixture(),g=f.game;g.launchProjectile=f.realLaunchProjectile;
 const rect=()=>({left:0,top:0,width:400,height:200});g.player={getBoundingClientRect:()=>({left:180,top:80,width:40,height:40})};
 g.stage={getBoundingClientRect:rect,appendChild(n){n.parentNode=this;}};g.scaledSizes={projectile:20};g.scaledPositions={left:{x:-170,y:0}};g.stopEnemyBounce=()=>{};
 const a=f.enter({type:'ORDER',dirs:['up','left'],wait:1900}),enemy=g.enemies.find(e=>e.dir==='left');g.handleSwipe('left');
 assert.equal(g.projectiles.length,1);assert.equal(g.projectiles[0].className,'defense-projectile');assert.equal(g.lost,1);
 f.tick(416);assert.match(enemy.element.style.backgroundImage,/projectile-hit/);assert.notEqual(a.finished,true);
 f.tick(234);assert.equal(a.finished,true);assert.equal(g.lost,1);assert.equal(g.score,0);
});

test('memory order accepts the first swipe during preview and cancels its old timer without restarting later steps',()=>{
 for(const stones of [[],['right']]){
  const f=specialFixture(),g=f.game,a=f.enter({type:'ORDER',dirs:['up','left','down'],stoneDirs:stones,orderPreview:1600,wait:1900});f.tick(200);
  g.handleSwipe('up');assert.equal(a.orderPhase,'playing');assert.equal(a.specialStep,1);assert.ok(a.orderBadges.every(b=>b.hidden));assert.equal(g.score,50);assert.equal(g.lost,undefined);
  f.tick(1400);assert.equal(a.specialStep,1);g.handleSwipe('left');g.handleSwipe('down');f.tick(600);assert.equal(a.successful,true);assert.equal(g.score,150);assert.equal(g.lost,undefined);
 }
});
test('wrong first swipe during memory preview still fires and deducts only once',()=>{
 const f=specialFixture(),g=f.game,shots=[];g.launchProjectile=dir=>shots.push(dir);const a=f.enter({type:'ORDER',dirs:['up','left'],orderPreview:1600,wait:1900});
 g.handleSwipe('left');assert.deepEqual(shots,['left']);assert.equal(g.lost,1);assert.equal(a.specialStep,0);assert.ok(a.orderBadges.every(b=>b.hidden));g.handleSwipe('up');assert.equal(shots.length,1);f.tick(1600);assert.equal(a.finished,true);assert.equal(g.lost,1);
});
test('real touch gestures work both during memory preview and across automatic number hiding',()=>{
 for(const crossBoundary of [false,true]){
  const f=specialFixture(),g=f.game,events={};vm.runInContext(fs.readFileSync(path.join(root,'js/minigames/defense/DefenseInput.js'),'utf8'),f.context);Object.assign(g,f.context.window.DefenseInputMixin);
  g.container.addEventListener=(type,fn)=>(events[type]||=[]).push(fn);g.stage={getBoundingClientRect:()=>({left:0,top:0,width:400,height:200})};g.addTrailPoint=()=>{};g.initEventListeners();
  const emit=(type,touches,changedTouches=[])=>events[type].forEach(fn=>fn({touches,changedTouches}));const touch=(x,y)=>({identifier:1,clientX:x,clientY:y});
  const a=f.enter({type:'ORDER',dirs:['up','left'],orderPreview:1600,wait:1900});f.tick(crossBoundary?1500:200);emit('touchstart',[touch(200,100)]);f.tick(200);emit('touchend',[],[touch(200,40)]);
  assert.equal(a.specialStep,1);assert.equal(g.score,50);assert.equal(g.lost,undefined);assert.ok(a.orderBadges.every(b=>b.hidden));
 }
});
