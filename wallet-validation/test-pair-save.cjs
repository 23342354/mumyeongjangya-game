const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const copy=x=>JSON.parse(JSON.stringify(x));
const base={made:true,pair:{mine:{id:9,status:'accepted',from_id:'alice',to_id:'bob'},inbox:[],sent:[],at:0},pairShared:9,pairPersonalRev:1,name:'Alice',bio:'old',rin:100,mana:100,know:1,sari:0,lotus:0,pass:2,wb:{tickets:2,dmg:0,balanceWeek:'2026-11-02'},fest:{marks:0},mat:{},ing:{},bmat:{},ingredients:{},inv:{},potion:{},bag:[],gid:1,balance20:{pendingLoot:[],bossClaims:[]},kit:{have:{}},farm:{seeds:{},fertilizers:{},fert:0,skill:1,exp:0},fish:{skill:1,exp:0,catches:{}},home:{stage:0,auto:true},quests:{cleared:0,gate:0},dex:{},sub:{},res:{},hall:'dorm',course:1,examHist:{},graduated:false,tower:0,tower2:0,arena:{round:1},storyRead:[],sb:{id:'alice'},exp:0,lvl:1,hp:100,sn:100,lastReal:Date.now(),pairRoomClaims:[]};
let server={revision:1,self:copy(base),wallet:null,progress:null,failNext:false};
const wallet={pass:2,wbTickets:2,marks:0,rin:100,mana:100,know:1,sari:0,lotus:0,mat:{},ing:{},bmat:{},ingredients:{},inv:{},potion:{},dishes:{},seeds:{},fertilizers:{},fert:0,bag:[],pendingLoot:[],gid:1};
const progress={life:{farm:{skill:1,exp:0},fish:{skill:1,exp:0,catches:{}}},pairRoomClaims:[],sharedHome:{hall:'dorm',stage:0},wbDmg:0,wbWeek:'2026-11-02',arena:{round:1},course:1,examHist:{},graduated:false,tower:0,tower2:0,quests:{cleared:0,gate:0},run:null,storyRead:[],dex:{},bossClaims:[],rent_due:0};
server.wallet=copy(wallet);server.progress=copy(progress);
const snapshot=()=>({ok:true,revision:server.revision,self:{...copy(server.self),pairPersonalRev:server.revision},wallet:copy(server.wallet),progress:copy(server.progress),pairId:9,peer:{name:'Bob',lvl:1,res:{},base:{},gear:{},hp:100,sn:100},peerId:'bob',meta:{},pair:{status:'accepted',id:9,from_id:'alice',to_id:'bob'},passNext:100,bossNext:50});
let requests=0,backups=[];
const noop=()=>{}, ctx={console,JSON,Object,Array,Map,Set,Date,Promise,Math,Error,Number,String,RegExp,Boolean,crypto:{randomUUID:()=> 'test-'+(++requests)+'-unique'},setTimeout:()=>1,clearTimeout:noop,setInterval:noop,document:{body:{classList:{add:noop,remove:noop}},querySelector:()=>null,createElement:()=>({innerHTML:'',querySelector:()=>null})},localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},performance:{now:()=>0},accountSyncSetMeta:noop,accountSyncBackup:(s)=>backups.push(s),ACCT:{id:'alice',tok:'password'},acctIn:()=>true,acctOn:()=>true, S:copy(base),STATS:[],VIEWS:{},FISHGAME:null,BG:null,OUTING:null,RUNTICK:null,VIEW:'plaza',RUNSTEPMIN:3, PAIR_PLAY:null};
ctx.window=ctx;
ctx.acctFetch=async(_path,o)=>{
 const q=JSON.parse(o.body);
 if(q.p_action==='get')return snapshot();
 if(q.p_action==='commit'){
  if(server.failNext){server.failNext=false;throw Error('server offline');}
  if(q.p_revision!==server.revision)return {...snapshot(),conflict:true};
  server.self=copy(q.p_save);server.wallet=copy(q.p_wallet);server.progress=copy(q.p_progress);server.revision++;return snapshot();
 }
 if(q.p_action==='rent')return snapshot();
 throw Error('unknown rpc');
};
for(const k of ['save','acctPush','step','offline','C','maxMana','renderTop','renderNav','renderMain','toast','modal','boot','pairFetch','manaRate','power','effStat','gainExp','finishPeriod','finishResearch','damageHP','damageSN','simBattle','examOpponent','towerFoe','guardFoe','startRun','runRealTick','myRecord','pairRentTick','payPairRent','marketRpc','balanceBossData','closeModal','nowMin','syncUp','claimRoom','coopRoomPanel','pairMergeApply','roomCreate','roomJoin','roomRun','legacyQuestRoom','pairRunHTML','normalizeEffects','tick'])ctx[k]=noop;
ctx.save=()=>{};ctx.acctPush=async()=>true;ctx.maxMana=()=>100;ctx.manaRate=()=>1;ctx.power=()=>10;ctx.effStat=()=>3;ctx.C=()=>({dps:10,atkPow:10,hp:100,def:10,heal:1});ctx.myRecord=()=>({});ctx.marketRpc=async()=>({ok:true});ctx.balanceBossData=()=>({players:[],total:0,week:'2026-11-02'});ctx.nowMin=()=>0;
const script=fs.readFileSync('pair-play.js','utf8');vm.createContext(ctx);vm.runInContext(script,ctx);
(async()=>{
 const connected=await ctx.PAIR_PLAY.refresh();assert.equal(ctx.PAIR_PLAY.ready,true,'connected');
 ctx.S.bio='new biography';ctx.save();assert.ok(ctx.PAIR_PLAY.pending.length,'personal change tracked');
 const ok=await ctx.acctPush(true);assert.equal(ok,true);assert.equal(server.self.bio,'new biography','profile persisted before refresh');
 assert.equal(ctx.S.bio,'new biography','UI retains saved profile');
 ctx.S.rin-=20;ctx.save();const ok2=await ctx.acctPush(true);assert.equal(ok2,true);assert.equal(server.wallet.rin,80,'wallet transaction committed');
 server.wallet.rin-=10;server.revision++;
 ctx.S.rin-=5;ctx.save();const ok3=await ctx.acctPush(true);assert.equal(ok3,true);assert.equal(server.wallet.rin,65,'local spend rebased over partner spend');
 server.self.bio='server-edited';server.revision++;
 await ctx.PAIR_PLAY.refresh();assert.equal(ctx.S.bio,'server-edited','newest remote profile not overwritten by stale keep');
 ctx.S.bio='keep me on failure';ctx.save();server.failNext=true;
 // commit has an idempotent retry; the first lost response is retried successfully.
 const retried=await ctx.acctPush(true);assert.equal(retried,true);assert.equal(server.self.bio,'keep me on failure');
 // repeated backend failure should NOT be reported as a successful save.
 server.failNext=true;const previousFetch=ctx.acctFetch;ctx.acctFetch=async(...args)=>{const q=JSON.parse(args[1].body);if(q.p_action==='commit')throw Error('network lost');return previousFetch(...args)};
 ctx.S.bio='unsaved failure';ctx.save();const failed=await ctx.acctPush(true);
 assert.equal(failed,false,'failed commit reports failure');assert.equal(server.self.bio,'keep me on failure','server not silently overwritten');assert.ok(backups.some(b=>b.bio==='unsaved failure'),'dirty local snapshot retained for backup');
 console.log('PASS: personal save, shared wallet save, partner concurrent spend, remote profile reload, retry, failed save backup');
})().catch(e=>{console.error(e);process.exitCode=1;});
