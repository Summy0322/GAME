const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture() {
    const events = {}, nodes = [], frequencies = [];
    const player = {volume:.7, muted:false};
    class Context {
        state = 'running'; currentTime = 0; destination = {};
        resume() { this.state='running'; return Promise.resolve(); }
        createOscillator() {
            const n = {frequency:{setValueAtTime(v){frequencies.push(v)},exponentialRampToValueAtTime(v){frequencies.push(v)}},connect(){},disconnect(){},start(){},stop(){this.stops=(this.stops||0)+1}};
            nodes.push(n); return n;
        }
        createGain() { return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}; }
    }
    const doc={hidden:false,readyState:'loading',addEventListener(k,fn){(events[k]??=[]).push(fn)},getElementById(){return player}};
    const c={window:{AudioContext:Context,addEventListener(k,fn){events[k]=[fn]}},document:doc,console:{log(){},warn(){}}};
    vm.createContext(c); vm.runInContext(fs.readFileSync('js/core/AudioManager.js','utf8'),c);
    return {audio:c.window.AudioManager,doc,nodes,frequencies,events,player};
}
test('chirp waits for user activation; punctuation and rapid characters do not produce bursts',()=>{
    const {audio,nodes,frequencies}=fixture();
    audio.playDialogueChirp('你'); assert.equal(nodes.length,0);
    audio.unlockDialogueAudio();
    for(const char of [' ','！','，']) audio.playDialogueChirp(char);
    assert.equal(nodes.length,0);
    audio.playDialogueChirp('你'); audio.playDialogueChirp('好');
    assert.equal(nodes.length,1); assert.deepEqual(frequencies,[660,990]);
    audio.chirpContext.currentTime=.08; audio.playDialogueChirp('好'); assert.equal(nodes.length,2);
    nodes[0].onended(); assert.equal(audio.chirpNodes.size,1);
});
test('stop, mute, hidden pages and suspended audio never queue stale chirps',()=>{
    const {audio,nodes,doc,player}=fixture(); audio.unlockDialogueAudio(); audio.playDialogueChirp('你');
    audio.stopDialogueChirp(); assert.equal(audio.chirpNodes.size,0); assert.equal(nodes[0].stops,2);
    audio.setSFXVolume(0); audio.playDialogueChirp('好'); assert.equal(nodes.length,1);
    audio.setSFXVolume(.3); doc.hidden=true; audio.playDialogueChirp('好'); assert.equal(nodes.length,1);
    doc.hidden=false; player.muted=true; audio.sfxPlayer=player; audio.playDialogueChirp('好'); assert.equal(nodes.length,1);
    player.muted=false; audio.chirpContext.state='suspended'; audio.playDialogueChirp('好'); assert.equal(nodes.length,1);
});
test('repeated initialization installs one set of activation and lifecycle handlers',()=>{
    const {audio,events,doc}=fixture(); audio.init(); audio.init();
    assert.equal(events.pointerdown.length,1); assert.equal(events.keydown.length,1);
    events.pointerdown[0](); audio.playDialogueChirp('你');
    doc.hidden=true; events.visibilitychange[0](); assert.equal(audio.chirpNodes.size,0);
});
