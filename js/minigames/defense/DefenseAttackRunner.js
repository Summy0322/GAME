// js/minigames/defense/DefenseAttackRunner.js
// 攻擊序列與結束流程（由 DefenseGameV2 合併）

window.DefenseAttackRunnerMixin = {
    buildAttackQueue: function(random = Math.random) {
        const queue = this.levelConfig.attackPatterns.map(attack => {
            const copy = {...attack, resolved:false};
            for (const key of ['dirs', 'correctDirs', 'wrongDirs']) {
                if (attack[key]) copy[key] = [...attack[key]];
            }
            return copy;
        });
        const fixedCount = this.levelConfig.flow?.randomizeAfter;
        if (!Number.isInteger(fixedCount) || fixedCount < 0) return queue;

        // 後續小關已學會基本操作，在最多四波的區段內混排；不跨教學／旋轉錨點。
        const windowSize = this.levelConfig.flow.shuffleWindow;
        const category = attack => JSON.stringify([
            attack.type, attack.dirs?.length, attack.correctDirs?.length,
            attack.wrongDirs?.length, attack.wait, attack.phase, attack.keepAuthored,
            attack.type === 'HEAVY' ? (['up','down'].includes(attack.dir) ? 'vertical' : 'horizontal') : null
        ]);
        for (let start = fixedCount; start < queue.length; ) {
            if (queue[start].keepAuthored) { start++; continue; }
            let end = start + 1;
            while (end < queue.length && !queue[end].keepAuthored &&
                (windowSize ? end - start < windowSize : category(queue[end]) === category(queue[start]))) end++;
            for (let i = end - 1; i > start; i--) {
                const j = start + Math.floor(random() * (i - start + 1));
                [queue[i], queue[j]] = [queue[j], queue[i]];
            }
            start = end;
        }

        const directions = ['up', 'right', 'down', 'left'];
        const arrows = {up:'⬆️', right:'➡️', down:'⬇️', left:'⬅️'};
        const counts = Object.fromEntries(directions.map(dir => [dir, 0]));
        const targets = attack => attack.correctDirs || attack.dirs || (['NORMAL','HEAVY'].includes(attack.type) ? [attack.dir] : []);
        const obstacles = attack => attack.wrongDirs || (attack.type === 'DECOY' ? [attack.dir] : []);
        const layout = attack => JSON.stringify([
            [...targets(attack)].sort(), [...obstacles(attack)].sort()
        ]);
        for (let index = 0; index < queue.length; index++) {
            let attack = queue[index];
            if (index >= fixedCount && !attack.keepAuthored &&
                ['NORMAL','DECOY','MULTI','MULTI_MIXED','HEAVY'].includes(attack.type)) {
                // 用整體旋轉保留對向／相鄰關係，不因隨機化增加操作負擔。
                const rotations = attack.type === 'HEAVY' ? [0,2] : [0,1,2,3];
                let candidates = rotations.map(rotation => {
                    const rotated = {...attack};
                    const rotate = dir => directions[(directions.indexOf(dir) + rotation) % 4];
                    if (attack.dir) rotated.dir = rotate(attack.dir);
                    for (const key of ['dirs', 'correctDirs', 'wrongDirs']) {
                        if (attack[key]) rotated[key] = attack[key].map(rotate);
                    }
                    return rotated;
                });
                const different = candidates.filter(candidate => layout(candidate) !== (index > 0 ? layout(queue[index - 1]) : null));
                if (different.length) candidates = different;
                const cost = candidate => {
                    const next = {...counts};
                    targets(candidate).forEach(dir => next[dir]++);
                    const values = Object.values(next);
                    return (Math.max(...values) - Math.min(...values)) * 100 + values.reduce((sum, n) => sum + n*n, 0);
                };
                const best = Math.min(...candidates.map(cost));
                candidates = candidates.filter(candidate => cost(candidate) === best);
                attack = candidates[Math.floor(random() * candidates.length)];
                const targetName = this.levelConfig.flow.targetName;
                const icons = dirs => dirs.map(dir => arrows[dir]).join('');
                if (attack.type === 'MULTI_MIXED') {
                    attack.text = `${icons(attack.correctDirs)}${targetName}｜${icons(attack.wrongDirs)}石頭`;
                } else if (attack.type === 'MULTI') {
                    attack.text = `${icons(attack.dirs)} ${targetName}`;
                } else if (attack.type === 'NORMAL') {
                    attack.text = `${arrows[attack.dir]} ${targetName}`;
                } else if (attack.type === 'DECOY') {
                    attack.text = `${arrows[attack.dir]} 🪨 石頭！別滑`;
                } else {
                    attack.text = `${arrows[attack.dir]} ${attack.text}`;
                }
                queue[index] = attack;
            }
            targets(attack).forEach(dir => counts[dir]++);
        }
        return queue;
    },

    queueWaveCallback: function(callback, delay, attack = null) {
        const session = this.sessionId;
        const timer = this.clock.setTimeout(() => {
            if (!this.gameActive || session !== this.sessionId) return;
            if (attack && (attack !== this.currentAttack || attack.finished)) return;
            callback();
        }, delay);
        this.timers.push(timer);
        return timer;
    },

    showAvoidanceProgress: function(duration) {
        const meter = document.getElementById('defense-wait-meter');
        if (!meter) return;
        meter.hidden = !duration;
        const bar = meter.querySelector('.defense-wait-fill');
        if (bar) {
            bar.style.animation = 'none';
            if (duration) {
                void bar.offsetWidth;
                bar.style.animation = `defense-wait ${duration}ms linear forwards`;
            }
        }
    },

    updateWaveProgress: function() {
        const label = document.getElementById('defense-wave-progress');
        if (label) {
            const phase = this.currentAttack?.phase;
            label.textContent = `第 ${this.waveNumber}／${this.totalWaves} 波${phase ? ' · ' + phase : ''}`;
        }
    },

    // 只適用於有 flow 設定的第一章關卡；以實際命中回呼完成回合。
    handleFlowSwipe: function(dir) {
        const attack = this.currentAttack;
        if (!attack || attack.resolved || attack.finished) return;
        const mixed = attack.type === 'MULTI_MIXED';
        const correctDirs = mixed ? attack.correctDirs : attack.dirs;
        const wrongDirs = mixed ? attack.wrongDirsList : [];
        if (!correctDirs.includes(dir) && !wrongDirs.includes(dir)) {
            this.showWarning('這個方向沒有目標，再看一下！');
            return;
        }
        if (attack.swipedDirs.includes(dir)) {
            this.showWarning('這個方向已經處理過了！');
            return;
        }
        if (attack.avoidTimer) {
            this.clock.clearTimeout(attack.avoidTimer);
            attack.avoidTimer = null;
            this.showAvoidanceProgress(0);
        }
        attack.swipedDirs.push(dir);
        if (correctDirs.includes(dir)) {
            attack.hits++;
            this.addScore(mixed ? this.scoreTable.MIXED_CORRECT : this.scoreTable.MULTI, dir);
        } else {
            this.mistakes++;
            this.updateScoreDisplay();
            this.addScore(this.scoreTable.MIXED_WRONG, dir);
            this.showWarning('那是石頭！不要滑向它！');
        }
        attack.pendingShots = (attack.pendingShots || 0) + 1;
        this.launchProjectile(dir, () => {
            if (!this.gameActive || attack !== this.currentAttack || attack.finished) return;
            attack.pendingShots--;
            this.checkFlowCompletion(attack);
        });
        this.checkFlowCompletion(attack);
    },

    checkFlowCompletion: function(attack) {
        if (attack !== this.currentAttack || attack.resolved || attack.finished) return;
        const mixed = attack.type === 'MULTI_MIXED';
        const correctDirs = mixed ? attack.correctDirs : attack.dirs;
        if (!correctDirs.every(dir => attack.swipedDirs.includes(dir))) return;
        // 全部正確方向已在時限內作答，保留飛行／命中動畫，不再判作逾時。
        if (attack.multiTimeout) {
            this.clock.clearTimeout(attack.multiTimeout);
            attack.multiTimeout = null;
        }
        if (attack.pendingShots > 0 || attack.avoidTimer) return;
        if (!mixed) {
            attack.resolved = true;
            attack.successful = true;
            this.msg.innerText = '✅ 全部命中！';
            this.finishAttack();
            return;
        }
        // 已誤打的石頭沒有剩餘避讓時間；仍先等全部正確目標及命中動畫完成。
        const remainingStones = attack.wrongDirsList.filter(dir => !attack.swipedDirs.includes(dir));
        if (remainingStones.length === 0) {
            this.resolveFlowMixed(attack);
            return;
        }
        const hold = this.levelConfig.flow.avoidHold;
        this.msg.innerText = `${this.levelConfig.flow.targetName}都處理好了，留意石頭！`;
        this.showAvoidanceProgress(hold);
        attack.avoidTimer = this.queueWaveCallback(() => this.resolveFlowMixed(attack), hold, attack);
    },

    resolveFlowMixed: function(attack) {
        if (!this.gameActive || attack !== this.currentAttack || attack.resolved || attack.finished) return;
        const missing = attack.correctDirs.filter(dir => !attack.swipedDirs.includes(dir));
        const avoided = attack.wrongDirsList.filter(dir => !attack.swipedDirs.includes(dir));
        attack.resolved = true;
        attack.successful = missing.length === 0 && avoided.length === attack.wrongDirsList.length;
        if (avoided.length) this.addScore(avoided.length * this.scoreTable.MIXED_AVOID);
        if (missing.length) {
            this.addScore(-missing.length * Math.abs(this.scoreTable.TIME_OUT_PENALTY));
            this.missAttack(`還有${this.levelConfig.flow.targetName}尚未處理！`);
        } else {
            this.msg.innerText = attack.successful ? '✅ 成功避開石頭！' : '本波結束，記得避開石頭！';
        }
        this.finishAttack();
    },

    startAttackSequence: function () {
        if (!this.gameActive) return;
        this.attackQueue = this.buildAttackQueue();
        this.totalWaves = this.attackQueue.filter(attack => attack.type !== 'END').length;
        this.waveNumber = 0;
        this.processNextAttack();
    },

    processNextAttack: function () {
        console.log('processNextAttack 被呼叫, 當前狀態:', this.state);

        if (!this.gameActive) return;
        if (this.attackQueue.length === 0) {
            if (this.attackQueue.length === 0 && this.state !== this.states.RESULT) {
                this.setState(this.states.RESULT);
                this.showFinalResult();
            }
            return;
        }

        if (this.state !== this.states.IDLE) {
            console.log(`狀態不是 IDLE (${this.state})，等待...`);
            const session = this.sessionId;
            this.clock.setTimeout(() => {
                if (session !== this.sessionId) return;
                this.processNextAttack();
            }, 100);
            return;
        }

        const attack = this.attackQueue.shift();
        this.currentAttack = attack;
        if (attack.type !== 'END') this.waveNumber++;
        this.updateWaveProgress();

        this.setState(this.states.PREPARING);
        this.msg.innerText = attack.text;

        const prepareTime = this.levelConfig.flow?.prepareTime ?? Math.max(300, Math.min(800, this.getCurrentGap() / 2));

        const session = this.sessionId;
        this.clock.setTimeout(() => {
            if (!this.gameActive || session !== this.sessionId || attack !== this.currentAttack || attack.finished) return;
            this.executeAttack(attack);
        }, prepareTime);
    },

    executeAttack: function (attack) {
        if (!this.gameActive || attack !== this.currentAttack || attack.finished) return;
        console.log('executeAttack 開始，類型:', attack.type);

        const currentSession = this.sessionId;

        this.clearAllTimers();

        this.clearHeavySequence();
        this.clearHeavyProjectiles();
        this.clearEnemies();
        this.clearProjectiles();
        this.showAvoidanceProgress(0);

        switch (attack.type) {
            case 'END':
                console.log('遊戲結束，準備結算');
                this.setState(this.states.RESULT);
                this.clock.setTimeout(() => {
                    if (!this.gameActive || this.sessionId !== currentSession) return;
                    this.showFinalResult();
                }, 500);
                break;

            case 'NORMAL':
                this.setState(this.states.NORMAL);
                this.spawnEnemy(attack.dir);

                const normalTimer = this.clock.setTimeout(() => {
                    if (!this.gameActive || this.sessionId !== currentSession || this.currentAttack !== attack || attack.finished) return;
                    if (this.levelConfig.flow && attack.correctHit) return;
                    if (this.state === this.states.NORMAL && this.currentAttack && !this.currentAttack.resolved) {
                        console.log(`⏰ NORMAL 攻擊超時！方向: ${attack.dir}`);

                        this.addScore(this.scoreTable.TIME_OUT_PENALTY);
                        console.log(`❌ 未接住敵人，扣 ${Math.abs(this.scoreTable.TIME_OUT_PENALTY)} 分`);

                        this.missAttack('時間到！未接住敵人');
                        this.finishAttack();
                    }
                }, attack.wait);
                this.timers.push(normalTimer);
                this.currentAttack.timer = normalTimer;
                break;

            case 'MULTI':
                this.setState(this.states.MULTI);
                this.currentAttack.hits = 0;
                this.currentAttack.swipedDirs = [];
                this.currentAttack.totalDirs = attack.dirs.length;
                attack.dirs.forEach((dir) => this.spawnEnemy(dir));

                this.currentAttack.multiTimeout = this.clock.setTimeout(() => {
                    if (!this.gameActive || this.sessionId !== currentSession || this.currentAttack !== attack || attack.finished) return;
                    if (this.state === this.states.MULTI && this.currentAttack && !this.currentAttack.resolved) {
                        const notSwiped = this.currentAttack.dirs.filter(
                            (d) => !this.currentAttack.swipedDirs.includes(d)
                        );
                        console.log(`⏰ 超時！未滑動方向: ${notSwiped.join(', ')}`);

                        const remainingCount = notSwiped.length;
                        if (remainingCount > 0) {
                            const penalty = remainingCount * Math.abs(this.scoreTable.TIME_OUT_PENALTY);
                            this.addScore(-penalty);
                            console.log(`❌ 剩餘 ${remainingCount} 個敵人未處理，扣 ${penalty} 分`);
                        }

                        this.missAttack(`未完成所有方向！遺漏: ${notSwiped.join(', ')}`);
                        this.finishAttack();
                    }
                }, attack.wait);
                this.timers.push(this.currentAttack.multiTimeout);
                break;

            case 'HEAVY':
                this.setState(this.states.HEAVY_CHARGING);
                this.spawnHeavySequence(attack.dir);
                break;

            case 'AOE':
                this.setState(this.states.AOE_ACTIVE);
                this.startAOE(attack.wait);
                break;

            case 'DECOY':
                this.setState(this.states.DECOY);
                this.spawnEnemy(attack.dir, true, false);
                this.showAvoidanceProgress(attack.wait);

                this.currentAttack.decoyTimeout = this.clock.setTimeout(() => {
                    if (!this.gameActive || this.sessionId !== currentSession || this.currentAttack !== attack || attack.finished) return;
                    if (this.state === this.states.DECOY && this.currentAttack && !this.currentAttack.resolved) {
                        console.log('✅ DECOY 成功！沒有滑動石頭');
                        this.currentAttack.resolved = true;
                        this.currentAttack.successful = true;
                        this.msg.innerText = '✅ 成功避開石頭！';
                        this.addScore(this.scoreTable.DECOY_SUCCESS);
                        this.finishAttack();
                    }
                }, attack.wait);
                this.timers.push(this.currentAttack.decoyTimeout);
                break;

            case 'MULTI_MIXED':
                this.setState(this.states.MULTI_MIXED);
                this.currentAttack.hits = 0;
                this.currentAttack.swipedDirs = [];
                this.currentAttack.correctDirs = attack.correctDirs || [];
                this.currentAttack.wrongDirsList = attack.wrongDirs || [];
                this.currentAttack.totalDirs = attack.dirs.length;

                this.currentAttack.wrongHandled = [];

                attack.dirs.forEach((dir) => {
                    const isWrong = this.currentAttack.wrongDirsList.includes(dir);
                    this.spawnEnemy(dir, false, isWrong);
                });

                this.currentAttack.multiTimeout = this.clock.setTimeout(() => {
                    if (!this.gameActive || this.sessionId !== currentSession || this.currentAttack !== attack || attack.finished) return;
                    if (this.levelConfig.flow) {
                        this.resolveFlowMixed(attack);
                        return;
                    }
                    if (this.state === this.states.MULTI_MIXED && this.currentAttack && !this.currentAttack.resolved) {
                        const notSwipedCorrect = this.currentAttack.correctDirs.filter(
                            (d) => !this.currentAttack.swipedDirs.includes(d)
                        );

                        const notSwipedWrong = this.currentAttack.wrongDirsList.filter(
                            (d) => !this.currentAttack.swipedDirs.includes(d)
                        );

                        console.log(`⏰ 超時！未滑到的正確方向: ${notSwipedCorrect.join(', ')}`);
                        console.log(`✅ 成功閃避的錯誤方向: ${notSwipedWrong.join(', ')}`);

                        if (notSwipedWrong.length > 0) {
                            const bonusScore = notSwipedWrong.length * this.scoreTable.MIXED_AVOID;
                            this.addScore(bonusScore);
                            console.log(`✨ 成功閃避 ${notSwipedWrong.length} 個石頭，獲得 ${bonusScore} 分！`);
                        }

                        if (notSwipedCorrect.length > 0) {
                            const penalty = notSwipedCorrect.length * Math.abs(this.scoreTable.TIME_OUT_PENALTY);
                            this.addScore(-penalty);
                            console.log(`❌ 剩餘 ${notSwipedCorrect.length} 個敵人未處理，扣 ${penalty} 分`);
                            this.missAttack(`未完成所有正確方向！遺漏: ${notSwipedCorrect.join(', ')}`);
                        }

                        this.clearEnemies();

                        this.currentAttack.resolved = true;
                        this.finishAttack();
                    }
                }, attack.wait);
                this.timers.push(this.currentAttack.multiTimeout);
                break;

            default:
                console.error('未知攻擊類型:', attack.type);
                this.finishAttack();
        }
    },

    setAttackTimer: function (wait, attack) {
        if (!wait || wait <= 0) {
            console.warn('無效的等待時間:', wait);
            return;
        }

        console.log(`設定攻擊計時器，等待 ${wait}ms`);
        const timer = this.clock.setTimeout(() => {
            if (
                (this.state === this.states.NORMAL || this.state === this.states.MULTI) &&
                this.currentAttack &&
                !this.currentAttack.resolved
            ) {
                console.log(`計時器觸發：${attack.type} 攻擊時間到`);
                this.missAttack('時間到！');
                this.finishAttack();
            }
        }, wait);
        this.timers.push(timer);
        if (this.currentAttack) this.currentAttack.timer = timer;
    },

    finishAttack: function () {
        const attack = this.currentAttack;
        if (!this.gameActive || !attack || attack.finished) return;
        const successful = attack.successful || (attack.type === 'NORMAL' && attack.resolved && attack.correctHit);
        attack.finished = true;
        this.showAvoidanceProgress(0);
        this.clearAllTimers();
        console.log('✅ 攻擊結束, 當前狀態:', this.state);

        this.heavyBlockReady = false;
        if (this.heavyBlockTimeout) {
            this.clock.clearTimeout(this.heavyBlockTimeout);
            this.heavyBlockTimeout = null;
        }

        this.isShieldActive = false;
        this.shieldEndTime = 0;

        if (this.currentAttack && this.currentAttack.multiTimeout) {
            this.clock.clearTimeout(this.currentAttack.multiTimeout);
            this.currentAttack.multiTimeout = null;
        }

        this.clearTrail();

        this.stopAllEnemiesBounce();

        if (this.aoeTimers) {
            this.aoeTimers.forEach((t) => {
                if (t) this.clock.clearTimeout(t);
                if (t) this.clock.clearInterval(t);
            });
            this.aoeTimers = [];
        }
        if (this.currentAttack && this.currentAttack.timer) {
            this.clock.clearTimeout(this.currentAttack.timer);
            this.currentAttack.timer = null;
        }

        this.clearEnemies();
        this.clearProjectiles();
        this.clearHeavySequence();
        this.clearHeavyProjectiles();

        ['up', 'down', 'left', 'right'].forEach((dir) => {
            if (this.lightIntervals[dir]) {
                this.clock.clearInterval(this.lightIntervals[dir]);
                this.lightIntervals[dir] = null;
            }
        });

        this.aoeLines.forEach((dir) => {
            const line = document.getElementById(`aoe-${dir}`);
            if (line) {
                line.style.opacity = '0';
                line.style.transform = 'translate(0,0)';
                line.style.display = 'none';
                line.style.pointerEvents = 'none';
            }
        });

        this.setState(this.states.IDLE);

        const gap = successful && this.levelConfig.flow ? this.levelConfig.flow.successGap : this.getCurrentGap();
        console.log(`⏱️ 下一攻擊將在 ${gap}ms 後開始`);

        const session = this.sessionId;
        this.clock.setTimeout(() => {
            if (session !== this.sessionId) return;
            this.processNextAttack();
        }, gap);
    }
};
