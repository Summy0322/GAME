const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture(saved = null, blocked = false) {
    const nodes = new Map(), storage = new Map([['redbrick.audio.v1', saved]]), events = {};
    const document = {readyState:'loading', hidden:false, addEventListener(k, fn){events[k]=fn;},
        getElementById(id){
            if(!nodes.has(id)) nodes.set(id,{value:'',volume:1, classList:{toggle(k,v){this[k]=v;}}, handlers:{}, addEventListener(k,fn){this.handlers[k]=fn;},setAttribute(k,v){this[k]=v;},focus(){this.focused=true;},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();},pause(){},play(){return Promise.resolve();}});
            return nodes.get(id);
        }};
    const window = {addEventListener(){}};
    const ctx = vm.createContext({window, document, console:{log(){},warn(){},error(){}}, localStorage:{getItem(k){if(blocked)throw Error();return storage.get(k);},setItem(k,v){if(blocked)throw Error();storage.set(k,v);}}});
    vm.runInContext(fs.readFileSync('js/core/AudioManager.js','utf8'),ctx);
    window.AudioManager.init();
    window.GameMusic = {setVolume(v){this.volume=v;}};
    vm.runInContext(fs.readFileSync('js/core/AudioSettings.js','utf8'),ctx);
    events.DOMContentLoaded();
    return {settings:window.AudioSettings, audio:window.AudioManager, music:window.GameMusic, nodes, storage};
}
test('master and channel mix apply to current sounds and subsequent sounds without resetting',()=>{
    const {settings:s,audio:a,music:m,nodes}=fixture();
    s.set('master',.5);s.set('sfx',.4);s.set('music',.6);
    assert.ok(Math.abs(m.volume-.06)<1e-9);
    a.playSFX('click',.7);assert.ok(Math.abs(a.sfxPlayer.volume-.14)<1e-9);
    a.playBGM('music');assert.equal(a.bgMusic.volume,.15);
    assert.equal(nodes.get('intro-video').volume,.5);
    s.set('muted',true);assert.equal(a.sfxPlayer.volume,0);assert.equal(m.volume,0);assert.equal(nodes.get('intro-video').muted,true);
    a.playSFX('next');assert.equal(a.sfxPlayer.volume,0);
    s.set('muted',false);assert.ok(Math.abs(a.sfxPlayer.volume-.14)<1e-9);
    assert.equal(s.values.sfx,.4);assert.equal(s.factor('sfx'),.2);
});
test('saved settings restore; malformed data and blocked storage remain usable',()=>{
    const first=fixture();first.settings.set('music',.3);first.settings.set('muted',true);
    const again=fixture(first.storage.get('redbrick.audio.v1'));
    assert.equal(again.settings.values.music,.3);assert.equal(again.music.volume,0);
    for(const raw of ['broken','null','{"master":-2,"sfx":5,"music":"bad"}']){
        const {settings:s}=fixture(raw);assert.ok(s.values.master>=0);assert.ok(s.values.sfx<=1);assert.equal(s.values.music,1);
    }
    const {settings:s}=fixture(null,true);assert.doesNotThrow(()=>s.set('master',.2));assert.equal(s.values.master,.2);
});
test('dialog opens, sliders update immediately, mute announces state and close restores focus',()=>{
    const {nodes,settings:s}=fixture();
    nodes.get('settings-open').handlers.click();assert.equal(nodes.get('audio-settings').open,true);
    nodes.get('audio-sfx').handlers.input({target:{value:'25'}});assert.equal(s.values.sfx,.25);assert.equal(nodes.get('audio-sfx-value').textContent,'25%');
    nodes.get('audio-master-mute').handlers.click();assert.equal(nodes.get('audio-master-mute')['aria-pressed'],'true');
    nodes.get('settings-close').handlers.click();assert.equal(nodes.get('audio-settings').open,false);assert.equal(nodes.get('settings-open').focused,true);
});
test('channel mute is independent and master mute locks both child rows while preserving their settings',()=>{
    const {nodes,settings:s,audio:a,music:m,storage}=fixture();
    s.set('sfx',.4);s.set('music',.6);
    nodes.get('audio-sfx-mute').handlers.click();
    assert.equal(a.sfxPlayer.volume,0);assert.equal(m.volume,.12);
    assert.equal(nodes.get('audio-sfx').disabled,true);
    assert.equal(nodes.get('audio-sfx-mute').disabled,false);
    assert.equal(nodes.get('audio-music').disabled,false);
    s.set('muted',true);
    for(const name of ['sfx','music']) {
        assert.equal(nodes.get(`audio-${name}`).disabled,true);
        assert.equal(nodes.get(`audio-${name}-mute`).disabled,true);
        assert.equal(nodes.get(`audio-${name}-row`).classList['audio-row-disabled'],true);
    }
    assert.equal(nodes.get('audio-master').disabled,true);
    assert.equal(nodes.get('audio-master-mute').disabled,false);
    s.set('muted',false);
    assert.equal(nodes.get('audio-master').disabled,false);
    assert.equal(s.values.sfx,.4);assert.equal(s.values.music,.6);
    assert.equal(s.values.sfxMuted,true);assert.equal(a.sfxPlayer.volume,0);assert.equal(m.volume,.12);
    assert.equal(nodes.get('audio-music').disabled,false);
    assert.equal(nodes.get('audio-sfx').disabled,true);
    const restored=fixture(storage.get(s.key));assert.equal(restored.settings.values.sfxMuted,true);
    nodes.get('audio-sfx-mute').handlers.click();assert.ok(Math.abs(a.sfxPlayer.volume-.28)<1e-9);
    assert.equal(nodes.get('audio-sfx').disabled,false);
    nodes.get('audio-music-mute').handlers.click();assert.equal(m.volume,0);assert.ok(a.sfxPlayer.volume>0);
    assert.equal(nodes.get('audio-music').disabled,true);
    assert.equal(nodes.get('audio-music-mute').disabled,false);
    nodes.get('audio-music-mute').handlers.click();
    assert.equal(nodes.get('audio-music').disabled,false);assert.equal(s.values.music,.6);
});
