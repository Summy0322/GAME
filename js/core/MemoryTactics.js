// 策略配對：回合由翻兩張牌推進，思考與動畫不消耗回合。
window.MemoryTactics = class MemoryTactics {
    constructor(owner) {
        this.owner=owner;this.maxHealth=owner.mode==='child'?14:12;this.health=this.maxHealth;
        this.shield=0;this.charge=0;this.attackBonus=0;this.guardBonus=0;
        this.cleared=0;this.turns=0;this.pairs=0;this.errors=0;this.pending=null;
        this.fights=[
            {name:'巡街暗影',health:6,plan:[[3,2],[3,2]]},
            {name:'急行暗影',health:9,plan:[[2,3],[2,2]]},
            {name:'蓄勢暗影',health:12,plan:[[2,4],[3,2]]},
            {name:'鐵衣暗影',health:13,armor:1,plan:[[2,3],[2,3]]},
            {name:'長夜守門者',health:16,plan:[[2,4],[3,4],[2,3]]}
        ];
        this.newFight();
    }
    get symbols(){return this.owner.mode==='child'?['🫘','🍮','🥛','🧈','🍜']:['🫘','🍮','🥢','🥛','🧈','🍜'];}
    effect(symbol){
        if(['🫘','🍮','🥢'].includes(symbol))return {kind:'attack',label:`攻擊 ${2+this.attackBonus}`};
        if(symbol==='🥛')return {kind:'guard',label:`護盾 ${2+this.guardBonus}`};
        if(symbol==='🧈')return {kind:'heal',label:'恢復 2'};
        return {kind:'charge',label:'蓄力 2'};
    }
    newFight(){
        const fight=this.fights[this.cleared],child=this.owner.mode==='child',health=child?Math.ceil(fight.health*.85):fight.health;
        this.enemy={...fight,health,maxHealth:health,plan:fight.plan.map(([turns,damage])=>[turns+(child?1:0),Math.max(1,damage-(child?1:0))])};this.phase='battle';
        this.shield=0;this.charge=0;
        this.planStep=0;this.untilAttack=this.enemy.plan[0][0];this.pending=null;
    }
    get intent(){return this.enemy.plan[this.planStep%this.enemy.plan.length];}
    get live(){return this.owner.active&&this.owner.tactics===this&&!this.owner.ending;}
    paired(symbol){if(this.live&&this.phase==='battle'&&!this.pending)this.pending={symbol};}
    memoryMiss(){if(this.live&&this.phase==='battle'&&!this.pending)this.pending={symbol:null};return '配對未成功，仍會推進一步';}
    resolve(symbol){
        if(this.phase!=='battle')return {ignored:true};
        this.turns++;let message;
        if(symbol===null){this.errors++;message='配對未成功';}
        else{
            this.pairs++;const effect=this.effect(symbol);
            if(effect.kind==='attack'){
                const charged=this.charge>0;
                const damage=Math.max(1,2+this.attackBonus+this.charge-(charged?0:(this.enemy.armor||0)));
                this.charge=0;this.enemy.health=Math.max(0,this.enemy.health-damage);message=`命中，造成 ${damage} 傷害`;
            }else if(effect.kind==='guard'){
                this.shield=Math.min(6,this.shield+2+this.guardBonus);message=`護盾提升至 ${this.shield}`;
            }else if(effect.kind==='heal'){
                const heal=Math.min(2,this.maxHealth-this.health);this.health+=heal;message=heal?`恢復 ${heal} 生命`:'生命已滿，這次只推進一步';
            }else{this.charge=Math.min(4,this.charge+2);message='蓄力，下次攻擊提高傷害並穿透護甲';}
        }
        // 擊倒優先結算，避免同一步出現已勝利卻被反擊扣命。
        if(this.enemy.health===0){this.cleared++;this.phase=this.cleared===5?'complete':'reward';return {won:true,message:'擊退暗影！'};}
        this.untilAttack--;
        if(this.untilAttack===0){
            const incoming=this.intent[1],blocked=Math.min(this.shield,incoming),damage=incoming-blocked;
            this.shield-=blocked;this.health=Math.max(0,this.health-damage);
            if(blocked&&this.guardBonus)this.charge=Math.min(4,this.charge+1);
            message+=damage?` · 暗影造成 ${damage} 傷害`:' · 護盾擋住攻擊';
            this.planStep++;this.untilAttack=this.intent[0];
        }
        if(this.health===0)this.phase='lost';
        return {lost:this.health===0,message};
    }
    afterAttempt(game){
        if(!this.live||this.phase!=='battle'||game!==this.game||!this.pending)return false;
        const pending=this.pending;this.pending=null;const previousHealth=this.health,result=this.resolve(pending.symbol);
        this.render(result.message);
        const effect=pending.symbol?this.effect(pending.symbol).kind:null;
        window.AudioManager?.playDefenseSound?.(this.health<previousHealth||!effect?'fail':effect==='attack'?'hit':effect==='guard'?'block':'aoe');
        if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
            const feedback=this.hud?.querySelector(this.health<previousHealth?'[data-tactics-health]':'[data-tactics-enemy]');
            feedback?.animate?.([{opacity:.45},{opacity:1}],{duration:220});
        }
        if(result.lost||this.cleared===this.fights.length){
            this.owner.ending=true;game.canFlip=false;
            game.session.timeout(()=>{if(this.owner.active&&this.owner.tactics===this)this.owner.finish();},350);
            return true;
        }
        if(result.won){this.showReward();return true;}
        return false;
    }
    score(){const attempts=this.pairs+this.errors;return this.cleared*100+Math.round(25*this.health/this.maxHealth)+(attempts?Math.round(25*this.pairs/attempts):0);}
    summary(){return `${this.cleared===5?'守住老街':'旅程結束'} · 擊退 ${this.cleared}／5 位暗影 · 行動 ${this.turns} 步`;}
    feedback(){return [['剩餘生命',`${this.health}／${this.maxHealth}`],['配對準確率',this.turns?`${Math.round(this.pairs/this.turns*100)}%`:'尚未作答']];}
    decorate(game){
        this.game=game;game.container.classList.add('memory-tactics-game');
        const node=document.createElement('div');node.className='tactics-hud';
        node.innerHTML='<div class="tactics-player"><strong data-tactics-health></strong><span data-tactics-resources></span><span data-tactics-stage></span></div><div class="tactics-opponent"><span class="tactics-foe"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 35 9 14Q20-6 31 14l4 21-8-5-7 6-7-6Z" fill="#091928" stroke="#96b8cd"/><ellipse cx="15" cy="18" rx="2" ry="3" fill="#ebd9ae"/><ellipse cx="25" cy="18" rx="2" ry="3" fill="#ebd9ae"/></svg><span data-tactics-enemy></span></span><strong data-tactics-intent></strong></div><p class="tactics-status" role="status"></p>';
        game.container.querySelector('.memory-hud').prepend(node);this.hud=node;this.owner.hud=node;
        game.grid.querySelectorAll('.memory-card[data-symbol]').forEach(card=>{
            const badge=document.createElement('span');badge.className='tactics-effect';badge.textContent=this.effect(card.dataset.symbol).label;
            card.querySelector('.memory-card-front').appendChild(badge);
        });
        this.render('先記住圖案位置與卡片效果');game.adjustCardSize();
    }
    render(message){
        if(!this.hud)return;
        this.hud.querySelector('[data-tactics-health]').textContent=`生命 ${this.health}／${this.maxHealth}`;
        this.hud.querySelector('[data-tactics-resources]').textContent=`護盾 ${this.shield} · 蓄力 ${this.charge}`;
        this.hud.querySelector('[data-tactics-stage]').textContent=`第 ${Math.max(1,Math.min(5,this.cleared+(this.phase==='battle'?1:0)))}／5 場`;
        this.hud.querySelector('[data-tactics-enemy]').textContent=`${this.enemy.name} ${this.enemy.health}／${this.enemy.maxHealth}${this.enemy.armor?' · 護甲 1':''}`;
        this.hud.querySelector('.tactics-foe').style.setProperty('--enemy-health',this.enemy.health/this.enemy.maxHealth);
        this.hud.dataset.danger=String(this.health<=this.maxHealth/3);
        this.hud.querySelector('[data-tactics-intent]').textContent=`再 ${this.untilAttack} 步 → 傷害 ${this.intent[1]}`;
        this.hud.querySelector('.tactics-status').textContent=message;
    }
    ready(game){if(game!==this.game||!this.live)return;game.stopKnownHints();this.render(this.enemy.armor?'護甲會減少一般傷害；先蓄力可穿透護甲':'先攻、架盾或蓄力，由你決定');}
    boardComplete(game){if(!this.live||this.phase!=='battle'||game!==this.game)return;this.newBoard();}
    newBoard(){
        if(!this.live)return;
        this.owner.changingBoard=true;
        try{this.owner.launchMemory();}finally{this.owner.changingBoard=false;}
    }
    takeReward(kind){
        if(this.phase!=='reward')return false;
        if(kind==='attack'){if(this.attackBonus>=2)return false;this.attackBonus++;}
        else if(kind==='guard'){if(this.guardBonus>=2)return false;this.guardBonus++;}
        else if(kind==='heal'){this.maxHealth+=2;this.health=Math.min(this.maxHealth,this.health+4);}
        else return false;
        this.newFight();return true;
    }
    showReward(){
        const game=this.game;game.canFlip=false;game.grid.inert=true;
        const overlay=document.createElement('section');overlay.className='tactics-reward';overlay.setAttribute('aria-label','選擇下一場的能力');
        overlay.innerHTML=`<div><p>擊退第 ${this.cleared} 位暗影</p><h3>下一場，換個打法</h3><div class="tactics-reward-options"><button type="button" data-reward="attack" ${this.attackBonus>=2?'disabled':''}><strong>攻勢</strong><span>${this.attackBonus>=2?'已達上限':'每組攻擊 +1（最多 +2）'}</span></button><button type="button" data-reward="guard" ${this.guardBonus>=2?'disabled':''}><strong>守勢</strong><span>${this.guardBonus>=2?'已達上限':'護盾 +1，擋傷時蓄力 +1'}</span></button><button type="button" data-reward="heal"><strong>補給</strong><span>生命上限 +2，恢復 4 點</span></button></div><p class="tactics-carry-note">生命與升級保留；護盾、蓄力於下一場重置。</p></div>`;
        game.container.appendChild(overlay);game.session.ownNode(overlay);
        let chosen=false;
        overlay.querySelectorAll('[data-reward]').forEach(button=>button.onclick=()=>{
            if(chosen||!this.live||window.GamePause?.paused)return;
            if(this.takeReward(button.dataset.reward)){chosen=true;this.newBoard();}
        });
        overlay.querySelector('button:not(:disabled)').focus();
    }
};
