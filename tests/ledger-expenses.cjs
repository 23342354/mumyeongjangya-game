const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const src=fs.readFileSync('coop.js','utf8');
const c={S:{rin:1000,ledger:[]},Math,Date,Number,String,Array,Object,save(){}};vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('const LEDGER_MAX='),src.indexOf('// Resource-changing clicks are serialized.')),c);
c.ledgerMeasure('craftBMax',()=>c.ledgerMeasure('craftB',()=>{c.S.rin-=100;}));assert.equal(c.S.ledger.length,1);assert.equal(c.S.ledger[0].a,-100,'nested bulk calls record one spend');
c.S.ledger=[{id:'server-1',src:'server',t:Date.now(),a:-100,k:'제작'}];c.ledgerPush(-50,'제작');assert.equal(c.S.ledger.length,2,'local spend never mutates a server receipt');
const merged=c.ledgerMergeEntries([{id:'s1',t:2,a:-70000,k:'입찰'},{id:'s2',t:3,a:70000,k:'환불'}],[{id:'s1',t:2,a:-70000,k:'입찰'}]);assert.equal(merged.length,2,'refresh deduplicates by event ID');
const rebased=c.ledgerRebaseEntries([{id:'same',t:3,a:-120}],[{id:'same',t:1,a:-100}],[{id:'same',t:2,a:-150}]);assert.equal(rebased[0].a,-170,'concurrent ledger merges preserve both spends');
const before=c.S.rin;c.active=()=>true;c.ledgerMeasure('payPairRent',()=>{c.S.rin-=20;});assert.equal(c.S.rin,before-20);assert.equal(c.S.ledger.length,2,'server rent must not gain a second client entry');
console.log('PASS: nested expense counting, immutable server receipts, refresh deduplication, concurrent append rebase and no duplicate server rent');
