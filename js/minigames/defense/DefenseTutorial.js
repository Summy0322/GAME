// 故事防守教學：獨立練習層，不建立攻擊、分數或失誤。
window.DefenseTutorial = {
    key(level,mode){return `redbrick.defense.tutorial.v1.${mode}.${level}`;},
    seen(level,mode){try{return !!localStorage.getItem(this.key(level,mode));}catch(_){return false;}},
    remember(level,mode){try{localStorage.setItem(this.key(level,mode),'done');}catch(_){}},
    angleDelta(before,after){return ((after-before+540)%360)-180;},
    registerReplay(game,options){
        let button=document.getElementById('defense-replay-tutorial');
        if(!button){const actions=document.querySelector('.game-pause-actions');if(!actions)return;button=document.createElement('button');button.id='defense-replay-tutorial';button.type='button';button.textContent='重開並看教學';actions.appendChild(button);}
        button.hidden=!!game.challenge;
        button.onclick=()=>{if(window.GamePause?.owner!==game||window.GamePause.phase!=='paused'||game.challenge)return;window.GamePause.end(game);game.start({...options,forceTutorial:true});window.GamePause.attach(game,'defense');};
    },
    cancel(owner){const run=this.run;if(!run||(owner&&run.game!==owner))return;this.run=null;run.controller.abort();run.timers.forEach(id=>run.game.clock.clearTimeout(id));run.game.container.classList?.remove?.('tutorial-active');run.node.remove();},
    begin(game,done,force=false){
        this.cancel();
        if(game.challenge||![1,2,3].includes(game.currentLevel)||(!force&&this.seen(game.currentLevel,game.getGameMode())))return false;
        const node=document.createElement('section');node.className='defense-tutorial';node.setAttribute('aria-label','防守操作教學');
        const controller=new AbortController(),run=this.run={game,node,controller,timers:[],session:game.sessionId,step:game.currentLevel===1?'swipe':game.currentLevel===2?'heavy':'circle'};
        node.dataset.lesson=run.step;
        const current=()=>this.run===run&&game.gameActive&&game.sessionId===run.session;
        const later=(fn,ms)=>{const id=game.clock.setTimeout(()=>{if(current())fn();},ms);run.timers.push(id);return id;};
        const hand='<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M18 29V8c0-6 8-6 8 0v16l3-4c3-3 7-1 7 3l2 1c4-1 7 2 6 6l-2 14c-1 6-6 9-13 9-6 0-10-3-13-8L6 31c-3-5 2-9 6-5l6 6" fill="#ffe6bd" stroke="#78563b" stroke-width="2.5"/></svg>';
        node.innerHTML=`<div class="tutorial-banner" role="status"></div><div class="tutorial-arena"><div class="tutorial-player" aria-hidden="true"></div><img class="tutorial-target" alt="練習目標"><div class="tutorial-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="tutorial-shield" aria-hidden="true"></div><div class="tutorial-wave wave-up"></div><div class="tutorial-wave wave-down"></div><div class="tutorial-wave wave-left"></div><div class="tutorial-wave wave-right"></div><div class="tutorial-ring" aria-hidden="true">↻</div><div class="tutorial-hand">${hand}</div></div><div class="tutorial-stone-meter" role="progressbar" aria-label="等待石頭離開" aria-valuemin="0" aria-valuemax="100"><i class="tutorial-stone-fill"></i></div><p class="tutorial-hint" role="status"></p><button class="tutorial-start" type="button" hidden>開始遊戲</button><button class="tutorial-skip" type="button">跳過教學</button>`;
        game.container.appendChild(node);
        game.container.classList?.add?.('tutorial-active');
        const arena=node.querySelector('.tutorial-arena'),banner=node.querySelector('.tutorial-banner'),hint=node.querySelector('.tutorial-hint'),target=node.querySelector('.tutorial-target'),start=node.querySelector('.tutorial-start');
        node.querySelector('.tutorial-player').style.backgroundImage=`url('${game.levelConfig.playerImage}')`;
        node.querySelector('.tutorial-shield').style.backgroundImage=`url('${game.levelConfig.shieldImage}')`;
        node.querySelectorAll('.tutorial-lights i').forEach(light=>light.style.backgroundImage=`url('${game.levelConfig.heavyEnemyImage||game.levelConfig.enemyImage}')`);
        node.querySelectorAll('.tutorial-wave').forEach(wave=>{wave.style.backgroundImage=`url('${game.levelConfig.aoeLineImage}')`;wave.setAttribute('aria-hidden','true');});
        const fill=node.querySelector('.tutorial-stone-fill');
        const waitStone=()=>{fill.style.animation='none';void fill.offsetWidth;fill.style.animation='tutorial-stone-countdown 2200ms linear forwards';run.hold=later(success,2200);};
        const finish=()=>{if(!current())return;this.remember(game.currentLevel,game.getGameMode());this.cancel(game);done();};
        const success=()=>{node.dataset.timing='';run.step='complete';node.dataset.step='complete';banner.textContent='學會了，準備開始！';hint.textContent='正式遊戲即將開始，教學不計分也不扣命。';start.hidden=false;this.remember(game.currentLevel,game.getGameMode());start.focus();};
        const stone=()=>{run.step='stone';node.dataset.step='stone';banner.textContent='石頭不要滑，停手就能避開';hint.textContent='等倒計條走完，石頭就會離開。';target.src=game.levelConfig.decoyImage;waitStone();};
        // 練習也使用正式素材；動畫與步驟都由可暫停的遊戲時鐘收尾。
        const shoot=(dx,dy,hit,after)=>{
            const projectile=document.createElement('div'),rect=arena.getBoundingClientRect();
            const horizontal=Math.abs(dx)>=Math.abs(dy),x=horizontal?Math.sign(dx)*rect.width*.28:0,y=horizontal?0:Math.sign(dy)*rect.height*.4;
            projectile.className='tutorial-projectile';projectile.style.backgroundImage=`url('${game.levelConfig.projectileImage}')`;
            projectile.style.setProperty('--shot-x',`${x}px`);projectile.style.setProperty('--shot-y',`${y}px`);arena.appendChild(projectile);
            later(()=>{projectile.remove();if(hit){target.src=game.levelConfig.projectileHitImage||game.levelConfig.enemyImage;}},280);
            if(after)later(after,620);
        };
        const shield=()=>{node.dataset.blocking='true';game.clock.clearTimeout(run.blockTimer);run.blockTimer=later(()=>{node.dataset.blocking='false';},500);};
        const show=()=>{
            node.dataset.step=run.step;target.src=game.levelConfig.enemyImage;
            if(run.step==='swipe'){banner.textContent='往目標方向滑一下';hint.textContent='跟著手指，從角色往右滑。';}
            if(run.step==='heavy'){
                banner.textContent='重擊：等五格全亮，再滑向目標';hint.textContent='教學會等你準備好，不用急。';
                const ignite=()=>{
                    if(run.step!=='heavy')return;
                    run.ready=false;run.late=false;node.dataset.ready='false';hint.textContent='等五格全亮再往右滑；太早出手，護盾會先消失。';
                    const lights=[...node.querySelectorAll('.tutorial-lights i')];lights.forEach(light=>light.classList.remove?.('lit'));
                    lights.forEach((light,index)=>later(()=>{if(run.step!=='heavy')return;light.classList.add('lit');if(index===4){run.ready=true;node.dataset.ready='true';hint.textContent='現在往右滑動格擋！';}},400*(index+1)));
                    later(()=>{if(run.step!=='heavy')return;run.ready=false;run.late=true;hint.textContent='攻擊已經通過，等下一輪五格全亮再出手。';},2700);
                    later(ignite,3400);
                };ignite();
            }
            if(run.step==='circle'){
                banner.textContent='旋轉防守：畫圈推開四面攻擊';hint.textContent='四面攻擊往中央靠近時，按住繞角色畫圈。';run.waveProgress=0;run.lastTurn=-Infinity;
                const moveWaves=()=>{if(run.step!=='circle')return;const now=game.clock.now?.()||0;run.waveProgress=Math.max(0,Math.min(.68,run.waveProgress+(now-run.lastTurn<250?-.055:.018)));const r=arena.getBoundingClientRect();node.querySelectorAll('.tutorial-wave').forEach((wave,index)=>{const distance=run.waveProgress*(index<2?r.height:r.width)/2;wave.style.transform=index<2?`translateY(${index===0?distance:-distance}px)`:`translateY(-50%) translateX(${index===2?distance:-distance}px)`;});later(moveWaves,100);};moveWaves();
            }
        };
        const listen=(element,type,fn)=>element.addEventListener(type,fn,{signal:controller.signal});
        listen(node,'touchstart',e=>e.stopPropagation());listen(node,'touchmove',e=>e.stopPropagation());listen(node,'touchend',e=>e.stopPropagation());
        listen(node,'pointerdown',e=>e.stopPropagation());
        listen(arena,'pointerdown',e=>{
            if(!current()||window.GamePause?.paused||run.pointer!=null||!e.isPrimary)return;
            arena.setPointerCapture(e.pointerId);const rect=arena.getBoundingClientRect();
            run.pointer=e.pointerId;run.x=e.clientX;run.y=e.clientY;run.center={x:rect.left+rect.width/2,y:rect.top+rect.height/2};run.angle=Math.atan2(e.clientY-run.center.y,e.clientX-run.center.x)*180/Math.PI;run.turn=0;
            if(run.step==='stone'){game.clock.clearTimeout(run.hold);fill.style.animation='none';hint.textContent='這是石頭，停手等它離開就好。';}
        });
        listen(arena,'pointermove',e=>{
            if(!current()||window.GamePause?.paused||run.pointer!==e.pointerId||run.step!=='circle')return;
            if(Math.hypot(e.clientX-run.center.x,e.clientY-run.center.y)<24)return;
            const angle=Math.atan2(e.clientY-run.center.y,e.clientX-run.center.x)*180/Math.PI,delta=this.angleDelta(run.angle,angle);run.angle=angle;
            if(Math.abs(delta)<75){run.turn+=delta;if(Math.abs(delta)>2)run.lastTurn=game.clock.now?.()||0;}
            if(Math.abs(run.turn)>=280)success();
        });
        listen(arena,'pointerup',e=>{
            if(!current()||run.pointer!==e.pointerId)return;run.pointer=null;
            if(window.GamePause?.paused)return;
            const dx=e.clientX-run.x,dy=e.clientY-run.y;
            const isSwipe=Math.hypot(dx,dy)>=35,right=dx>=35&&Math.abs(dx)>=Math.abs(dy);
            if(run.step==='stone'){
                if(isSwipe){shoot(dx,dy,false);hint.textContent='滑動會射出攻擊，但石頭不能打；這次停手，等倒計條走完。';}
                waitStone();return;
            }
            if(!isSwipe||!['swipe','heavy'].includes(run.step))return;
            if(run.step==='swipe'){
                if(right){run.step='swipe-feedback';hint.textContent='命中！滑動就會射出攻擊。';shoot(dx,dy,true,stone);}
                else{shoot(dx,dy,false);hint.textContent='已射出攻擊！目標在右邊，往右滑再試一次。';}
            }else{
                shield();
                if(right&&run.ready)success();
                else{node.dataset.timing='wrong';game.clock.clearTimeout(run.feedbackTimer);run.feedbackTimer=later(()=>{node.dataset.timing='';},650);hint.textContent=!right?'方向不對：目標在右邊，往右滑動格擋。':run.late?'太晚了！攻擊已通過，等下一輪五格全亮再滑。':'太早了！護盾只能維持一下，等五格全亮再滑。';}
            }
        });
        listen(arena,'pointercancel',()=>{run.pointer=null;if(run.step==='stone')waitStone();});
        listen(start,'click',finish);listen(node.querySelector('.tutorial-skip'),'click',finish);show();return true;
    }
};
