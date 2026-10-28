const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker() {
    const events = {}, stored = new Map(), downloads = [], installs = [];
    const cache = {
        match: async r => stored.get(r.url),
        put: async (r, response) => stored.set(r.url, response),
        addAll: async urls => installs.push(...urls)
    };
    const context = {URL,console:{log(){}},self:{location:{origin:'https://example.test'},addEventListener:(name, fn)=>events[name]=fn},
        caches:{open:async()=>cache},fetch:async request=>{
            downloads.push(request.url);return {ok:true,status:200,clone(){return this}};
        }};
    vm.runInNewContext(fs.readFileSync('sw.js','utf8'),context);
    return {events,downloads,installs,stored};
}

test('installation caches existing application files without downloading media or fonts',async()=>{
    const w=worker();let pending;w.events.install({waitUntil:p=>pending=p});await pending;
    assert.ok(w.installs.length>20);
    for(const url of w.installs){
        assert.ok(!url.includes('/assets/'),url);
        assert.ok(fs.existsSync(url==='/GAME/'?'index.html':url.replace('/GAME/','')),url);
    }
});

test('visited images are cached on demand and reused; audio is not cached',async()=>{
    const w=worker();
    async function request(destination,url){
        const jobs=[];let response;
        w.events.fetch({request:{method:'GET',destination,url},respondWith:p=>response=p,waitUntil:p=>jobs.push(p)});
        await response;await Promise.all(jobs);
    }
    const image='https://example.test/GAME/assets/images/shared/market-background.webp';
    assert.equal(w.downloads.length,0);
    await request('image',image);await request('image',image);
    assert.equal(w.downloads.length,1);assert.ok(w.stored.has(image));
    const audio='https://example.test/GAME/assets/music/ready-for-adventure.mp3';
    await request('audio',audio);assert.equal(w.stored.has(audio),false);
});

test('each defense preload contains only the selected level',()=>{
    const window={};vm.runInNewContext(fs.readFileSync('js/data/minigameAssets.js','utf8'),{window});
    for(const level of [1,2,3]){
        const urls=window.MinigameAssets.getDefensePreloadUrls(level);
        assert.ok(urls.length>=8);assert.ok(urls.every(url=>url.includes('/level'+level+'/')));
        assert.ok(urls.every(url=>fs.existsSync(url)));
    }
});
