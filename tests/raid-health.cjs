const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../visuals.js'),'utf8');
const start=source.indexOf('function balanceBossWave('),end=source.indexOf('\nfor(const key',start);
const state={wb:{dmg:0,tickets:3},balance20:{bossClaims:[]},sb:{raidFetchState:'ready',rosterAt:1}};
const data={week:'2026-11-02',total:0,players:[]};
const ctx={Date,Math,Number,String,VIEWS:{},S:state,B:{bossGoal:100,bossStretchGoal:400},WBOSS:[{n:'test boss',e:'',d:'test'}],balanceBossData:()=>data,C:()=>({dps:1}),sbOn:()=>true,esc:String,nf:String,mod:()=>0,ic:()=>'',head:()=>'',window:{PAIR_PLAY:{ready:false}}};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
const snapshot=JSON.stringify(state);
for(const [damage,hp,max,wave]of [[0,100,100,1],[40,60,100,1],[100,150,150,2],[250,225,225,3],[500,313,338,4]]){
 data.total=damage;const html=ctx.VIEWS.wboss();
 assert.ok(html.includes(`aria-valuenow="${hp}"`));assert.ok(html.includes(`width:${hp/max*100}%`));
 assert.ok(html.includes(`남은 체력 ${hp} / ${max}`));assert.ok(html.includes(`공동 누적 피해 ${damage}`));assert.ok(html.includes(`${wave}차 업귀`));
 assert.ok(!/disabled[^>]*onclick="hitBoss\(\)"/.test(html),'display must not prevent an available attack');
}
assert.equal(JSON.stringify(state),snapshot,'rendering never resets damage, tickets or reward claims');
assert.equal(ctx.balanceBossWave(10000,100).remaining>0,true,'multi-kill damage always advances to a living enemy');
assert.equal(ctx.balanceBossWave(0,100).wave,1,'fresh weekly damage starts at wave one');
console.log('PASS: endless waves, 1.5x HP scaling, exact kill refill, overkill carry, multi-kill and unchanged ticket/reward state');
