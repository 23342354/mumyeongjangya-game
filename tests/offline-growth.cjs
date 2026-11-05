const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('game.js','utf8');let time=200000000,advanced=0;
const c={Date:{now:()=>time},S:{lastReal:time-90000},QUIET:false,step:m=>advanced+=m,toast:()=>{},hhmm:String};
vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function offline(){'),source.indexOf('/* ═══════════════════════════════════',source.indexOf('function offline(){'))),c);
c.offline();assert.equal(advanced,1.5,'short absence preserves fractional minutes');
advanced=0;c.S.lastReal=time-48*3600000;c.offline();assert.equal(advanced,1440,'offline simulation capped at 24 hours');
advanced=0;c.S.lastReal=time+60000;c.offline();assert.equal(advanced,0,'future clock never reverses growth');assert.equal(c.QUIET,false);
console.log('PASS: short offline growth, fractional minutes, 24-hour cap and future clock');
