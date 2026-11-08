// 三段手工編排的連續戰場；每個威脅有自己的時鐘與一次性判定。
window.DefenseRush = class DefenseRush {
    constructor(owner){
        this.owner=owner;this.completed=0;this.hits=0;this.misses=0;this.failures={};
        this.timers=new Set();this.targets=[];this.stopped=false;this.counter=0;
        this.plans=[
            [{at:0,dir:'left',kind:'normal',wait:2400},{at:900,dir:'right',kind:'normal',wait:1100},{at:3200,dir:'down',kind:'heavy'},{at:4200,dir:'up',kind:'normal',wait:1500},{at:6500,dir:'down',kind:'normal',wait:1900},{at:7400,dir:'left',kind:'normal',wait:1400}],
            [{at:0,dir:'left',kind:'heavy'},{at:1100,dir:'right',kind:'normal',wait:1100},{at:3100,dir:'left',kind:'normal',wait:1300},{at:3400,dir:'up',kind:'normal',wait:2200},{at:6400,dir:'right',kind:'heavy'},{at:7600,dir:'down',kind:'normal',wait:1200}],
            [{at:0,dir:'up',kind:'normal',wait:1700},{at:500,dir:'right',kind:'heavy'},{at:3500,dir:'left',kind:'normal',wait:1500},{at:3900,dir:'down',kind:'heavy'},{at:7000,dir:'left',kind:'normal',wait:1500},{at:7200,dir:'right',kind:'normal',wait:1200}]
        ];
        this.total=this.plans.reduce((sum,plan)=>sum+plan.length,0);
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
    nextAttack(game){return {type:'RUSH',text:'連續防守',resolved:false,heavyIgnitionInterval:Math.round(400*this.scale),challengeGap:850,materials:game.captureMaterialSet()};}
    decorate(game){
        this.game=game;game.container.classList.add('defense-endless-game','defense-rush-game');
        const hud=document.createElement('div');hud.className='rush-hud';
        hud.innerHTML='<div><strong data-rush-lives></strong><span data-rush-stage></span></div><div><strong data-rush-hits></strong><span data-rush-feedback role="status"></span></div>';
        game.container.appendChild(hud);this.hud=hud;this.owner.hud=hud;this.render('先看各方向的剩餘時間');
    }
    render(message){
        if(!this.hud)return;
        this.hud.querySelector('[data-rush-lives]').textContent=`生命 ${this.owner.lives}`;
        this.hud.querySelector('[data-rush-stage]').textContent=`第 ${Math.min(3,this.completed+1)}／3 段`;
        this.hud.querySelector('[data-rush-hits]').textContent=`接住 ${this.hits}／${this.total}`;
        if(message)this.hud.querySelector('[data-rush-feedback]').textContent=message;
    }
    begin(game,attack){
        this.clearWork();this.game=game;this.attack=attack;this.session=game.sessionId;
        this.targets=[];this.heavy=null;this.segmentClosing=false;this.segmentMisses=0;
        game.setState(game.states.MULTI);
        for(const event of this.plans[this.completed])this.later(()=>this.spawn(event),Math.round(event.at*this.scale));
        this.render(['看懂先後','先接再擋','交錯收尾'][this.completed]);this.animate();
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
        target.state='answered';this.cancel(target.timer);this.hits++;game.addScore(50,dir);this.render('接住普通目標');
        game.launchProjectile(dir,()=>{if(!this.valid()||target.state!=='answered')return;target.state='done';this.checkEnd();});
    }
    block(target){
        if(!this.valid()||target!==this.heavy||target.state!=='flying')return;
        target.state='done';this.cancel(target.timer);this.hits++;this.game.addScore(100,target.dir);
        this.game.clearHeavySequence();this.game.clearHeavyProjectiles();this.game.heavyBlockReady=false;this.game.isShieldActive=false;
        this.heavy=null;this.game.setState(this.game.states.MULTI);
        window.AudioManager?.playDefenseSound?.('block');this.render('格擋成功，繼續留意其他方向');this.checkEnd();
    }
    miss(target){
        if(!this.valid()||!['waiting','charging','flying'].includes(target.state))return;
        target.state='missed';this.cancel(target.timer);this.misses++;this.segmentMisses++;this.game.mistakes++;
        const label=target.kind==='heavy'?'重擊漏接':'普通漏接';this.failures[label]=(this.failures[label]||0)+1;
        if(target.kind==='heavy'){
            this.game.clearHeavySequence();this.game.clearHeavyProjectiles();this.game.heavyBlockReady=false;this.game.isShieldActive=false;
            this.heavy=null;this.game.setState(this.game.states.MULTI);
        }else{
            this.game.stopEnemyBounce(target.enemy);target.enemy.element.remove();this.game.enemies=this.game.enemies.filter(enemy=>enemy!==target.enemy);
        }
        this.owner.lives=Math.max(0,this.owner.lives-1);this.game.addScore(-25);window.AudioManager?.playDefenseSound?.('fail');this.render(label+' · 失去一命');
        if(this.owner.lives===0){this.endRun();return;}this.checkEnd();
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
        if(!this.valid()||this.segmentClosing||this.targets.length!==this.plans[this.completed].length||this.targets.some(t=>!['done','missed'].includes(t.state)))return;
        this.segmentClosing=true;
        this.later(()=>{
            this.completed++;this.render('本段完成');
            if(this.completed===this.plans.length){this.endRun();return;}
            this.clearWork();this.attack.resolved=true;this.attack.successful=true;this.attack.feedbackMistake=this.segmentMisses>0;this.game.finishAttack();
        },550);
    }
    endRun(){
        if(this.owner.ending)return;this.owner.ending=true;
        this.later(()=>this.owner.finish(),350,true);
    }
    summary(){return `${this.completed===3?'守住街口':'防守結束'} · 完成 ${this.completed}／3 段 · 接住 ${this.hits}／${this.total}`;}
    feedback(){return [['剩餘生命',`${this.owner.lives}／3`],['主要漏接',Object.entries(this.failures).map(([label,count])=>`${label} ${count} 次`).join(' · ')||'沒有漏接']];}
};
