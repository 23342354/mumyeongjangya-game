const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('coop.js','utf8'),c={CLIENT_KEYS:[],clone:x=>JSON.parse(JSON.stringify(x))};vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('const LOCAL_TRANSIENT='),src.indexOf('function sharedPath(')),c);
const before={marketRev:4,rin:500,sari:9,lesson:{left:30},gear:{robe:{enh:3}}};
const after={marketRev:3,rin:490,sari:9,lesson:{left:20},gear:{robe:{enh:4}}};
const diffs=c.changes(before,after);
assert.ok(!diffs.some(d=>d.path[0]==='marketRev'),'server revision is never replayed as a personal edit');
assert.ok(diffs.some(d=>d.path.join('.')==='rin'));assert.ok(diffs.some(d=>d.path.join('.')==='lesson.left'));assert.ok(diffs.some(d=>d.path.join('.')==='gear.robe.enh'));
console.log('PASS: server market revision excluded while unsaved resources, lesson and gear changes remain recoverable');
