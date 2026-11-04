const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../visuals.js'),'utf8');
const start=source.indexOf('VIEWS.wboss=function(){'),end=source.indexOf('\nfor(const key',start);
const state={wb:{dmg:0,tickets:3},balance20:{bossClaims:[]},sb:{raidFetchState:'ready',rosterAt:1}};
const data={week:'2026-11-02',total:0,players:[]};
const ctx={Date,Math,Number,String,VIEWS:{},S:state,B:{bossGoal:100,bossStretchGoal:400},WBOSS:[{n:'test boss',e:'',d:'test'}],balanceBossData:()=>data,C:()=>({dps:1}),sbOn:()=>true,esc:String,nf:String,mod:()=>0,ic:()=>'',head:()=>'',window:{PAIR_PLAY:{ready:false}}};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
const snapshot=JSON.stringify(state);
for(const [damage,hp,status]of [[0,100,'생존'],[40,60,'생존'],[100,0,'추가 토벌 가능'],[500,0,'계속 공격 가능']]){
 data.total=damage;const html=ctx.VIEWS.wboss();
 assert.ok(html.includes(`aria-valuenow="${hp}"`));assert.ok(html.includes(`width:${hp}%`));
 assert.ok(html.includes(`남은 체력 ${hp} / 100`));assert.ok(html.includes(`공동 누적 피해 ${damage}`));assert.ok(html.includes(status));
 assert.ok(!/disabled[^>]*onclick="hitBoss\(\)"/.test(html),'display must not prevent an available attack');
}
assert.equal(JSON.stringify(state),snapshot,'rendering never resets damage, tickets or reward claims');
console.log('PASS: full health at zero damage, decreasing HP, goal/overkill labels and unchanged attack/reward state');
