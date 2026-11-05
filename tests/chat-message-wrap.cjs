const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const src=fs.readFileSync('game.js','utf8');
const c={chatModeOf:v=>v==='오너'?'오너':'RP',esc:s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;')};vm.createContext(c);vm.runInContext(src.slice(src.indexOf('function chatMessageHTML('),src.indexOf('let CHATRESIZE=')),c);
const body='긴 대사 '.repeat(500)+'<br><span class="rp-action">(아주 긴 행동 지문)</span> 끝까지 읽기';
const html=c.chatMessageHTML({time:'1:44',who:'아주 긴 <이름>',title:'칭호'.repeat(100),body,failed:true});
assert.ok(html.includes('<div class="cmessage-header">'));assert.ok(html.includes('<div class="cmessage-text">'+body+'</div>'),'body survives intact');assert.ok(html.includes('&lt;이름&gt;'));assert.ok(html.indexOf('cmessage-status')>html.indexOf(body));
const pending=c.chatMessageHTML({body:'원문',pending:true});assert.ok(pending.includes('전송 중'));assert.ok(!pending.includes('failed'));
console.log('PASS: long message and RP body preserved, metadata escaped and separated, send status after body');
