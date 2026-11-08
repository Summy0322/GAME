// 無限防守後期的交錯波；獨立目標時鐘，共用既有波次與生命判定。
window.DefenseRush = class DefenseRush {
    constructor(owner){
        this.owner=owner;this.completed=0;this.hits=0;this.misses=0;this.failures={};
        this.timers=new Set();this.targets=[];this.stopped=false;this.counter=0;
    }
    static planFor(wave,rotation=Math.floor(Math.random()*4)){
        const dirs=['up','right','down','left'],dir=dirs[rotation%4],opposite=dirs[(rotation+2)%4];
        if(wave<75)return [{at:0,dir,kind:'normal',wait:2400},{at:700,dir:opposite,kind:'normal',wait:1600}];
        return Math.floor((wave-75)/10)%2===0
            ? [{at:0,dir,kind:'heavy'},{at:400,dir:opposite,kind:'normal',wait:1700}]
            : [{at:0,dir,kind:'normal',wait:2000},{at:500,dir:opposite,kind:'heavy'}];
    }
    get scale(){return this.owner.mode==='child'?1.3:1;}
    valid(ending=false){return !this.stopped&&this.owner.active&&this.owner.rush===this&&this.game?.gameActive&&this.game.sessionId===this.session&&this.attack===this.game.currentAttack&&!this.attack?.finished&&(ending||!this.owner.ending);}
    later(fn,delay,ending=false){
        const id=this.game.clock.setTimeout(()=>{this.timers.delete(id);if(this.valid(ending))fn();},delay);this.timers.add(id);return id;
    }
    cancel(id){this.game.clock.clearTimeout(id);this.timers.delete(id);}
    clearWork(){
        if(!this.game)return;
        this.timers.forEach(id=>this.game.clock.clearTimeout(id));this.timers.clear();
        if(this.frame!=null)this.game.clock.cancelAnimationFrame(this.frame);this.frame=null;
    }
    stop(){this.stopped=true;this.clearWork();}
    render(message){
        this.owner.updateHUD?.();
        if(!message||!this.owner.hudParts?.feedback)return;
        const node=this.owner.hudParts.feedback,id=++this.owner.feedbackId;
        node.textContent=message;node.hidden=false;
        this.later(()=>{if(this.owner.feedbackId===id)node.hidden=true;},700);
    }
    begin(game,attack){
        this.clearWork();this.game=game;this.attack=attack;this.session=game.sessionId;
        this.targets=[];this.heavy=null;this.segmentClosing=false;this.segmentMisses=0;this.plan=attack.rushPlan;
        game.setState(game.states.MULTI);
        for(const event of this.plan)this.later(()=>this.spawn(event),Math.round(event.at*this.scale));
        this.render();this.animate();
    }
    spawn(event){
        const game=this.game,target={...event,id:++this.counter,state:'waiting',spawnedAt:game.clock.now()};this.targets.push(target);
        if(target.kind==='heavy'){
            this.heavy=target;target.state='charging';this.attack.dir=target.dir;
            game.setState(game.states.HEAVY_CHARGING);game.spawnHeavySequence(target.dir);
        }else{
            game.spawnEnemy(target.dir);target.enemy=game.enemies.find(enemy=>enemy.dir===target.dir);
            target.enemy.element.classList.add('rush-target');target.enemy.element.dataset.dir=target.dir;
            const meter=document.createElement('span');meter.className='rush-target-meter';meter.setAttribute('aria-hidden','true');meter.innerHTML='<i></i>';
            target.enemy.element.appendChild(meter);target.fill=meter.querySelector('i');
            target.due=game.clock.now()+Math.round(target.wait*this.scale);
            target.timer=this.later(()=>this.miss(target),Math.round(target.wait*this.scale));
        }
    }
    launchHeavy(dir){
        const game=this.game,target=this.heavy;if(!this.valid()||!target||target.dir!==dir||target.state!=='charging')return;
        target.state='flying';target.flightStarted=game.clock.now();target.flightTime=Math.round(650*this.scale);target.due=target.flightStarted+target.flightTime;
        game.heavyBlockReady=true;
        target.blocks=game.heavySequence.map(seq=>{const rect=seq.element.getBoundingClientRect(),stage=game.stage.getBoundingClientRect();return {element:seq.element,x:rect.left+rect.width/2-stage.left,y:rect.top+rect.height/2-stage.top};});
        game.heavyProjectiles=target.blocks.map(block=>block.element);game.heavySequence=[];
        target.timer=this.later(()=>this.miss(target),target.flightTime);
        if(game.isShieldActive&&game.shieldDirection===dir&&game.shieldActiveUntil>game.clock.now())this.block(target);
    }
    inputSnapshot(){return Object.fromEntries(this.targets.filter(t=>['waiting','charging','flying'].includes(t.state)).map(t=>[t.dir,t.id]));}
    swipe(dir,snapshot){
        if(!this.valid()||this.segmentClosing)return;
        const game=this.game,target=this.targets.find(t=>t.dir===dir&&['waiting','charging','flying'].includes(t.state));
        if(snapshot&&snapshot[dir]!==target?.id)return;
        if(!target){game.launchProjectile(dir,()=>{});return;}
        if(target.kind==='heavy'){
            const now=game.clock.now();if(game.shieldEndTime>now){this.render('護盾正在恢復，留意其他方向');return;}
            game.showShield(dir);game.isShieldActive=true;game.shieldDirection=dir;game.shieldActiveUntil=now+500;game.shieldEndTime=now+2000;
            const shieldUntil=game.shieldActiveUntil;
            this.later(()=>{if(game.shieldActiveUntil===shieldUntil)game.isShieldActive=false;},500);
            if(target.state==='flying'&&now<=target.due)this.block(target);
            else this.render('太早開盾了，五格全亮時再滑');
            return;
        }
        if(game.clock.now()>target.due){this.miss(target);return;}
        target.state='answered';this.cancel(target.timer);this.hits++;game.addScore(game.scoreTable.NORMAL,dir);this.render();
        game.launchProjectile(dir,()=>{if(!this.valid()||target.state!=='answered')return;target.state='done';this.checkEnd();});
    }
    block(target){
        if(!this.valid()||target!==this.heavy||target.state!=='flying')return;
        target.state='done';this.cancel(target.timer);this.hits++;this.game.addScore(this.game.scoreTable.HEAVY,target.dir);
        this.game.clearHeavySequence();this.game.clearHeavyProjectiles();this.game.heavyBlockReady=false;this.game.isShieldActive=false;
        this.heavy=null;this.game.setState(this.game.states.MULTI);
        window.AudioManager?.playDefenseSound?.('block');this.render();this.checkEnd();
    }
    miss(target){
        if(!this.valid()||!['waiting','charging','flying'].includes(target.state))return;
        target.state='missed';this.cancel(target.timer);this.misses++;this.segmentMisses++;
        const label=target.kind==='heavy'?'重擊漏接':'普通漏接';this.failures[label]=(this.failures[label]||0)+1;
        if(target.kind==='heavy'){
            this.game.clearHeavySequence();this.game.clearHeavyProjectiles();this.game.heavyBlockReady=false;this.game.isShieldActive=false;
            this.heavy=null;this.game.setState(this.game.states.MULTI);
        }else{
            this.game.stopEnemyBounce(target.enemy);target.enemy.element.remove();this.game.enemies=this.game.enemies.filter(enemy=>enemy!==target.enemy);
        }
        if(!this.attack.overlapMistakeRecorded){
            this.attack.overlapMistakeRecorded=true;this.attack.lossReason=label;
            this.game.addScore(this.game.scoreTable.TIME_OUT_PENALTY);
            this.game.recordMistake(this.attack,this.session);
        }
        this.checkEnd();
    }
    animate(){
        if(!this.valid())return;
        const game=this.game,now=game.clock.now();
        for(const target of this.targets){
            if(target.kind==='normal'&&target.state==='waiting'&&target.fill){
                // 所有目標共用時間刻度，後出現的快目標不會因滿條而誤導優先度。
                const milliseconds=Math.max(0,target.due-now),remaining=Math.min(1,milliseconds/(3000*this.scale));
                target.fill.style.transform=`scaleX(${remaining})`;
                target.fill.dataset.urgent=String(milliseconds<650*this.scale);
            }
            if(target.kind==='heavy'&&target.state==='flying'){
                const progress=Math.min(1,(now-target.flightStarted)/target.flightTime),stage=game.stage.getBoundingClientRect();
                for(const block of target.blocks){block.element.style.left=`${block.x+(stage.width/2-block.x)*progress}px`;block.element.style.top=`${block.y+(stage.height/2-block.y)*progress}px`;}
            }
        }
        this.frame=game.clock.requestAnimationFrame(()=>this.animate());
    }
    checkEnd(){
        if(!this.valid()||this.segmentClosing||this.targets.length!==this.plan.length||this.targets.some(t=>!['done','missed'].includes(t.state)))return;
        this.segmentClosing=true;
        this.later(()=>{
            this.clearWork();this.attack.resolved=true;this.attack.successful=this.segmentMisses===0;this.game.finishAttack();
        },550);
    }
};
