// js/minigames/defense/DefenseInput.js
// 觸控 / 滑動 / ZingTouch 旋轉（由 DefenseGameV2 合併）

window.DefenseInputMixin = {
    initEventListeners: function () {
        this.container.addEventListener('touchstart', (e) => {
            this.touchGesture = null;
            if (!this.gameActive || window.GamePause?.paused || e.touches.length !== 1) return;
            const touch = e.touches[0];
            if (this.currentAttack && !this.currentAttack.finished && this.state !== this.states.PREPARING) {
                this.touchGesture = {id:touch.identifier,attack:this.currentAttack,session:this.sessionId,x:touch.clientX,y:touch.clientY,rushTargets:this.challenge?.rush?.inputSnapshot()};
            }
            this.touchStart.x = e.touches[0].clientX;
            this.touchStart.y = e.touches[0].clientY;

            const rect = this.stage.getBoundingClientRect();
            if(this.state===this.states.AOE_ACTIVE)this.rotationAccumulator.lastAngle=Math.atan2(touch.clientY-rect.top-rect.height/2,touch.clientX-rect.left-rect.width/2)*180/Math.PI;
            this.lastTrailX = e.touches[0].clientX - rect.left;
            this.lastTrailY = e.touches[0].clientY - rect.top;

            this.addTrailPoint(this.lastTrailX, this.lastTrailY);
        });

        this.container.addEventListener('touchmove', (e) => {
            if (!this.gameActive || window.GamePause?.paused || e.touches.length !== 1) return;

            const rect = this.stage.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            // 與第三小關教學一致：單指繞角色畫圈；原雙指旋轉仍可使用。
            if(this.state===this.states.AOE_ACTIVE && Math.hypot(x-rect.width/2,y-rect.height/2)>24)this.handleRotate({detail:{angle:Math.atan2(y-rect.height/2,x-rect.width/2)*180/Math.PI}});

            if (this.lastTrailX !== null && this.lastTrailY !== null) {
                const dx = x - this.lastTrailX;
                const dy = y - this.lastTrailY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance >= this.trailMinDistance) {
                    const steps = Math.ceil(distance / this.trailMinDistance);
                    for (let i = 1; i <= steps; i++) {
                        const t = i / steps;
                        const ix = this.lastTrailX + dx * t;
                        const iy = this.lastTrailY + dy * t;
                        this.addTrailPoint(ix, iy);
                    }
                    this.lastTrailX = x;
                    this.lastTrailY = y;
                }
            } else {
                this.addTrailPoint(x, y);
                this.lastTrailX = x;
                this.lastTrailY = y;
            }
        });

        this.container.addEventListener('touchend', (e) => {
            this.lastTrailX = null;
            this.lastTrailY = null;
        });

        this.container.addEventListener('touchend', (e) => {
            const gesture = this.touchGesture;
            this.touchGesture = null;
            if (!gesture || window.GamePause?.paused || e.touches.length !== 0) return;
            const touch = [...e.changedTouches].find(t=>t.identifier===gesture.id);
            if (!touch) return;
            const dx = touch.clientX - gesture.x;
            const dy = touch.clientY - gesture.y;
            let swipe = null;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > 30) swipe = dx > 0 ? 'right' : 'left';
            } else {
                if (Math.abs(dy) > 30) swipe = dy > 0 ? 'down' : 'up';
            }
            if (swipe && this.gameActive) this.handleSwipe(swipe,gesture.attack,gesture.session,gesture.rushTargets);
        });
        this.container.addEventListener('touchcancel', () => {
            this.touchGesture = null;
            this.lastTrailX = this.lastTrailY = null;
        });

        if (window.ZingTouch) {
            this.zingRegion = new ZingTouch.Region(this.container);
            this.zingRegion.bind(this.container, 'rotate', (e) => this.handleRotate(e));
        }
    }
};
