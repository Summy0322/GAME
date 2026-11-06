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
        button.onclick=()=>{if(window.GamePause?.owner!==game||game.challenge)return;window.GamePause.end(game);game.start({...options,forceTutorial:true});window.GamePause.attach(game,'defense');};
    },
    cancel(owner){const run=this.run;if(!run||(owner&&run.game!==owner))return;this.run=null;run.controller.abort();run.timers.forEach(id=>run.game.clock.clearTimeout(id));run.game.container.classList?.remove?.('tutorial-active');run.node.remove();},
    begin(game,done,force=false){
        this.cancel();
        if(game.challenge||![1,2,3].includes(game.currentLevel)||(!force&&this.seen(game.currentLevel,game.getGameMode())))return false;
        const node=document.createElement('section');node.className='defense-tutorial';node.setAttribute('aria-label','防守操作教學');
        const controller=new AbortController(),run=this.run={game,node,controller,timers:[],session:game.sessionId,step:game.currentLevel===1?'swipe':game.currentLevel===2?'heavy':'circle'};
        const current=()=>this.run===run&&game.gameActive&&game.sessionId===run.session;
        const later=(fn,ms)=>{const id=game.clock.setTimeout(()=>{if(current())fn();},ms);run.timers.push(id);return id;};
        const hand='<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M18 29V8c0-6 8-6 8 0v16l3-4c3-3 7-1 7 3l2 1c4-1 7 2 6 6l-2 14c-1 6-6 9-13 9-6 0-10-3-13-8L6 31c-3-5 2-9 6-5l6 6" fill="#ffe6bd" stroke="#78563b" stroke-width="2.5"/></svg>';
        node.innerHTML=`<div class="tutorial-banner" role="status"></div><div class="tutorial-arena"><div class="tutorial-player" aria-hidden="true"></div><img class="tutorial-target" alt="練習目標"><div class="tutorial-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="tutorial-ring" aria-hidden="true">↻</div><div class="tutorial-hand">${hand}</div></div><p class="tutorial-hint" role="status"></p><button class="tutorial-start" type="button" hidden>開始遊戲</button><button class="tutorial-skip" type="button">跳過教學</button>`;
        game.container.appendChild(node);
        game.container.classList?.add?.('tutorial-active');
        const arena=node.querySelector('.tutorial-arena'),banner=node.querySelector('.tutorial-banner'),hint=node.querySelector('.tutorial-hint'),target=node.querySelector('.tutorial-target'),start=node.querySelector('.tutorial-start');
        node.querySelector('.tutorial-player').style.backgroundImage=`url('${game.levelConfig.playerImage}')`;
        const finish=()=>{if(!current())return;this.remember(game.currentLevel,game.getGameMode());this.cancel(game);done();};
        const success=()=>{run.step='complete';node.dataset.step='complete';banner.textContent='學會了，準備開始！';hint.textContent='正式遊戲即將開始，教學不計分也不扣命。';start.hidden=false;this.remember(game.currentLevel,game.getGameMode());start.focus();};
        const stone=()=>{run.step='stone';node.dataset.step='stone';banner.textContent='石頭不要滑，停手就能避開';hint.textContent='看到石頭時，不要滑向它。';target.src=game.levelConfig.decoyImage;run.hold=later(success,2200);};
        const show=()=>{
            node.dataset.step=run.step;target.src=game.levelConfig.enemyImage;
            if(run.step==='swipe'){banner.textContent='往目標方向滑一下';hint.textContent='跟著手指，從角色往右滑。';}
            if(run.step==='heavy'){
                banner.textContent='重擊：等五格全亮，再滑向目標';hint.textContent='教學會等你準備好，不用急。';
                [...node.querySelectorAll('.tutorial-lights i')].forEach((light,index)=>later(()=>{light.classList.add('lit');if(index===4){run.ready=true;node.dataset.ready='true';hint.textContent='全亮了！現在往右滑動格擋。';}},400*(index+1)));
            }
            if(run.step==='circle'){banner.textContent='旋轉防守：繞著角色畫圈';hint.textContent='一根手指按住畫一圈，順時針或逆時針都可以。';}
        };
        const listen=(element,type,fn)=>element.addEventListener(type,fn,{signal:controller.signal});
        listen(node,'touchstart',e=>e.stopPropagation());listen(node,'touchmove',e=>e.stopPropagation());listen(node,'touchend',e=>e.stopPropagation());
        listen(node,'pointerdown',e=>e.stopPropagation());
        listen(arena,'pointerdown',e=>{
            if(!current()||window.GamePause?.paused||run.pointer!=null||!e.isPrimary)return;
            arena.setPointerCapture(e.pointerId);const rect=arena.getBoundingClientRect();
            run.pointer=e.pointerId;run.x=e.clientX;run.y=e.clientY;run.center={x:rect.left+rect.width/2,y:rect.top+rect.height/2};run.angle=Math.atan2(e.clientY-run.center.y,e.clientX-run.center.x)*180/Math.PI;run.turn=0;
            if(run.step==='stone'){game.clock.clearTimeout(run.hold);hint.textContent='這是石頭，停手等它離開就好。';}
        });
        listen(arena,'pointermove',e=>{
            if(!current()||window.GamePause?.paused||run.pointer!==e.pointerId||run.step!=='circle')return;
            if(Math.hypot(e.clientX-run.center.x,e.clientY-run.center.y)<24)return;
            const angle=Math.atan2(e.clientY-run.center.y,e.clientX-run.center.x)*180/Math.PI,delta=this.angleDelta(run.angle,angle);run.angle=angle;
            if(Math.abs(delta)<75)run.turn+=delta;
            if(Math.abs(run.turn)>=280)success();
        });
        listen(arena,'pointerup',e=>{
            if(!current()||run.pointer!==e.pointerId)return;run.pointer=null;
            if(window.GamePause?.paused)return;
            if(run.step==='stone'){run.hold=later(success,2200);return;}
            const dx=e.clientX-run.x,dy=e.clientY-run.y;
            if(dx<35||Math.abs(dx)<Math.abs(dy)){if(['swipe','heavy'].includes(run.step))hint.textContent='從角色往右邊的目標滑動，再試一次。';return;}
            if(run.step==='swipe')stone();else if(run.step==='heavy'){if(run.ready)success();else hint.textContent='先等五格全部亮起，再滑動格擋。';}
        });
        listen(arena,'pointercancel',()=>{run.pointer=null;if(run.step==='stone')run.hold=later(success,2200);});
        listen(start,'click',finish);listen(node.querySelector('.tutorial-skip'),'click',finish);show();return true;
    }
};
