const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

test('memory statistics avoid layout-reading innerText and do not rewrite unchanged numbers',()=>{
    const window={},context=vm.createContext({window,console:{log(){}}});
    vm.runInContext(fs.readFileSync('js/minigames/MemoryGameV2.js','utf8'),context);
    const counter=()=>{let value='',writes=0;return {get textContent(){return value;},set textContent(next){value=next;writes++;},get innerText(){throw Error('layout-dependent access');},get writes(){return writes;}};};
    const game=window.MemoryGameV2,matched=counter(),time=counter(),attempts=counter();
    Object.assign(game,{matchedText:matched,timerText:time,attemptsText:attempts,matchedPairs:2,timeLeft:30,attemptsLeft:10});
    for(let n=0;n<10;n++)game.updateStats();
    assert.equal(matched.writes,1);assert.equal(time.writes,1);assert.equal(attempts.writes,1);
    game.timeLeft=29;game.updateStats();assert.equal(time.writes,2);assert.equal(matched.writes,1);assert.equal(attempts.writes,1);
});
