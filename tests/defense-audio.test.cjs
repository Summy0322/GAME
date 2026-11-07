const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const oscillators=[],gains=[],events={};
 const param=()=>({values:[],setValueAtTime(value){this.values.push(value);},linearRampToValueAtTime(value){this.values.push(value);},exponentialRampToValueAtTime(value){this.values.push(value);}});
 class AudioContext{
  state='running';currentTime=0;destination={};resume(){this.state='running';return Promise.resolve();}
  createGain(){const gain={gain:param(),connect(){},disconnect(){this.disconnected=true;}};gains.push(gain);return gain;}
  createOscillator(){const node={frequency:param(),connect(){},disconnect(){this.disconnected=true;},start(time){this.started=true;this.startTime=time;},stop(time){this.stops=(this.stops||0)+1;this.stopTime=time;}};oscillators.push(node);return node;}
 }
 const document={readyState:'loading',hidden:false,addEventListener(type,fn){events[type]=fn;},getElementById(){return {volume:1};}};
 let factor=1;const window={AudioContext,GamePause:{paused:false},AudioSettings:{factor:()=>factor},addEventListener(type,fn){events[type]=fn;}};
 vm.runInNewContext(fs.readFileSync('js/core/AudioManager.js','utf8'),{window,document,console:{log(){},warn(){}}});
 return {audio:window.AudioManager,window,document,oscillators,gains,events,setFactor(value){factor=value;}};
}
test('defense synthesis waits for activation, distinguishes feedback and increases ordered note pitch',()=>{
 const f=fixture(),a=f.audio;a.playDefenseSound('hit');assert.equal(f.oscillators.length,0);a.unlockDialogueAudio();
 for(let step=0;step<3;step++)a.playDefenseSound('order',step);
 assert.deepEqual(f.oscillators.map(n=>n.frequency.values[0]),[440,554,659]);
 for(const kind of ['hit','block','fail','aoe']){a.chirpContext.currentTime+=.2;a.playDefenseSound(kind);}
 assert.equal(f.oscillators.length,7);assert.equal(f.oscillators[5].type,'sine');
 assert.ok(f.oscillators.every(n=>n.stopTime-n.startTime<.2));
 const voice=f.oscillators[0];voice.onended();assert.equal(voice.disconnected,true);assert.equal(a.defenseNodes.size,6);
});
test('defense volume follows live master/SFX factors, mute clears voices, hidden/paused/suspended audio never queues',()=>{
 const f=fixture(),a=f.audio;a.unlockDialogueAudio();a.playDefenseSound('block');f.setFactor(.2);a.applySettings();assert.ok(Math.abs(a.defenseBus.gain.values.at(-1)-.07)<1e-9);
 f.setFactor(0);a.applySettings();assert.equal(a.defenseNodes.size,0);assert.equal(a.defenseBus.gain.values.at(-1),0);a.playDefenseSound('block');assert.equal(f.oscillators.length,1);
 f.setFactor(1);f.document.hidden=true;a.playDefenseSound('fail');f.document.hidden=false;f.window.GamePause.paused=true;a.playDefenseSound('fail');f.window.GamePause.paused=false;a.chirpContext.state='suspended';a.playDefenseSound('fail');assert.equal(f.oscillators.length,1);
 a.chirpContext.state='running';a.playDefenseSound('block');a.setSFXVolume(0);assert.equal(a.defenseNodes.size,0);
});
test('rapid impacts are combined, voice count is bounded and stopping never replays sounds',()=>{
 const f=fixture(),a=f.audio;a.unlockDialogueAudio();for(let i=0;i<20;i++)a.playDefenseSound('hit');assert.equal(f.oscillators.length,1);
 for(let i=0;i<30;i++)a.playDefenseSound('order',i%3);assert.equal(a.defenseNodes.size,12);
 a.stopDefenseSounds();assert.equal(a.defenseNodes.size,0);assert.ok(f.oscillators.every(n=>n.stopTime===undefined));
 a.chirpContext.state='closed';a.unlockDialogueAudio();assert.equal(a.defenseBus,null);a.playDefenseSound('block');assert.equal(a.defenseNodes.size,1);
});
