// 每場遊戲獨立的虛擬時間；暫停不消耗剩餘延遲，也不補跑背景工作。
class GameClock {
    constructor() { this.jobs=new Set(); this.paused=false; this.disposed=false; this.offset=0; }
    realNow() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
    now() { return (this.paused ? this.pausedAt : this.realNow())-this.offset; }
    schedule(callback,delay,kind) {
        if(this.disposed)return null;
        const job={callback,kind,delay:Math.max(kind==='interval'?1:0,Number(delay)||0)};
        job.due=this.now()+job.delay; this.jobs.add(job);
        if(!this.paused)this.arm(job);
        return job;
    }
    arm(job) {
        if(this.paused||this.disposed||!this.jobs.has(job))return;
        const token=job.token={};
        const run=()=>{
            if(job.token!==token)return;
            job.native=null;
            if(this.paused||this.disposed||!this.jobs.has(job))return;
            if(job.kind!=='interval')this.jobs.delete(job); else job.due=this.now()+job.delay;
            job.callback(job.kind==='frame'?this.now():undefined);
            if(job.kind==='interval')this.arm(job);
        };
        job.native=job.kind==='frame'?requestAnimationFrame(run):setTimeout(run,Math.max(0,job.due-this.now()));
    }
    setTimeout(callback,delay){return this.schedule(callback,delay,'timeout');}
    setInterval(callback,delay){return this.schedule(callback,delay,'interval');}
    requestAnimationFrame(callback){return this.schedule(callback,0,'frame');}
    disarm(job){job.token=null;if(job.native!=null){if(job.kind==='frame')cancelAnimationFrame(job.native);else clearTimeout(job.native);job.native=null;}}
    clearTimeout(job){if(this.jobs.has(job)){this.disarm(job);this.jobs.delete(job);}}
    clearInterval(job){this.clearTimeout(job);}
    cancelAnimationFrame(job){this.clearTimeout(job);}
    pause(){if(this.paused||this.disposed)return;this.pausedAt=this.realNow();this.paused=true;for(const job of this.jobs)this.disarm(job);}
    resume(){if(!this.paused||this.disposed)return;this.offset+=this.realNow()-this.pausedAt;this.paused=false;for(const job of this.jobs)this.arm(job);}
    dispose(){if(this.disposed)return;this.disposed=true;for(const job of this.jobs)this.disarm(job);this.jobs.clear();}
}
window.GameClock=GameClock;
