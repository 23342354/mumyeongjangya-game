const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const src=fs.readFileSync('gameplay.js','utf8');
const noop=()=>{},c={Math:Object.assign(Object.create(Math),{random:()=>.999}),S:{gear:{robe:{name:'법구',enh:10,main:{v:100}}},rin:1000,mat:{가루:100},sari:9,war:{}},enhCost:()=>({rin:100,dust:5}),enhRate:()=>.1,toast:noop,renderTop:noop,renderNav:noop,renderMain:noop,save:noop,ctMax:noop,achCheck:noop};vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('function enhance(slot, prot){'),src.indexOf('function sellGear(')),c);
vm.runInContext(src.slice(src.indexOf('const _enhance=enhance;'),src.indexOf('const _setTitle=setTitle;')),c);
for(let i=0;i<3;i++)c.enhance('robe',true);
assert.equal(c.S.gear.robe.enh,13,'three protected attempts succeed even on the worst random roll');assert.equal(c.S.sari,0);assert.equal(c.S.rin,700);assert.equal(c.S.mat.가루,85);
c.enhance('robe',true);assert.equal(c.S.gear.robe.enh,13);assert.equal(c.S.rin,700,'insufficient sari consumes no other materials');
c.enhance('robe');assert.equal(c.S.gear.robe.enh,13,'ordinary attempt can still fail');assert.equal(c.S.rin,600);assert.equal(c.S.mat.가루,80);
console.log('PASS: protected flag survives achievement wrapper, three guaranteed successes, exact costs, insufficient sari and ordinary failure');
