const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const copy=x=>JSON.parse(JSON.stringify(x));
const base={made:true,pair:{mine:{id:9,status:'accepted',from_id:'alice',to_id:'bob'},inbox:[],sent:[],at:0},pairShared:9,pairPersonalRev:1,name:'Alice',bio:'old',rin:100,mana:100,know:1,sari:0,lotus:0,pass:2,wb:{tickets:2,dmg:0,balanceWeek:'2026-11-02'},fest:{marks:0},mat:{},ing:{},bmat:{},ingredients:{},inv:{},potion:{},bag:[],gid:1,balance20:{pendingLoot:[],bossClaims:[]},kit:{have:{}},farm:{seeds:{},fertilizers:{},fert:0,skill:1,exp:0},fish:{skill:1,exp:0,catches:{}},home:{stage:0,auto:true},quests:{cleared:0,gate:0},dex:{},sub:{},res:{},hall:'dorm',course:1,examHist:{},graduated:false,tower:0,tower2:0,arena:{round:1},storyRead:[],sb:{id:'alice'},exp:0,lvl:1,hp:100,sn:100,lastReal:Date.now(),pairRoomClaims:[]};
let server={revision:1,self:copy(base),wallet:null,progress:null,failNext:false};
const wallet={pass:2,wbTickets:2,marks:0,rin:100,mana:100,know:1,sari:0,lotus:0,mat:{},ing:{},bmat:{},ingredients:{},inv:{},potion:{},dishes:{},seeds:{},fertilizers:{},fert:0,bag:[],pendingLoot:[],gid:1};
const progress={life:{farm:{skill:1,exp:0},fish:{skill:1,exp:0,catches:{}}},pairRoomClaims:[],sharedHome:{hall:'dorm',stage:0},wbDmg:0,wbWeek:'2026-11-02',arena:{round:1},course:1,examHist:{},graduated:false,tower:0,tower2:0,quests:{cleared:0,gate:0},run:null,storyRead:[],dex:{},bossClaims:[],rent_due:0};
server.wallet=copy(wallet);server.progress=copy(progress);
const snapshot=()=>({ok:true,revision:server.revision,self:{...copy(server.self),pairPersonalRev:server.revision},wallet:copy(server.wallet),progress:copy(server.progress),pairId:9,peer:{name:'Bob',lvl:1,res:{},base:{},gear:{},hp:100,sn:100},peerId:'bob',meta:{},pair:{status:'accepted',id:9,from_id:'alice',to_id:'bob'},passNext:100,bossNext:50});
let requests=0,backups=[],receipts=new Set(),commits=0;let conflictNext=false,loseResponse=false,onGet=null;const storage=new Map();
const noop=()=>{}, ctx={AbortController,console,JSON,Object,Array,Map,Set,Date,Promise,Math,Error,Number,String,RegExp,Boolean,crypto:{randomUUID:()=> 'test-'+(++requests)+'-unique'},setTimeout:()=>1,clearTimeout:noop,setInterval:noop,document:{addEventListener:noop,body:{classList:{add:noop,remove:noop}},querySelector:()=>null,getElementById:()=>null,createElement:()=>({innerHTML:'',querySelector:()=>null})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},performance:{now:()=>0},accountSyncSetMeta:noop,accountSyncBackup:(s)=>backups.push(s),ACCT:{id:'alice',tok:'password'},acctIn:()=>true,acctOn:()=>true, S:copy(base),STATS:[],VIEWS:{},FISHGAME:null,BG:null,OUTING:null,RUNTICK:null,VIEW:'plaza',RUNSTEPMIN:3, PAIR_PLAY:null};
ctx.window=ctx;
ctx.acctFetch=async(_path,o)=>{
 const q=JSON.parse(o.body);
 if(q.p_action==='get'){if(onGet){const cb=onGet;onGet=null;cb();}return snapshot();}
 if(q.p_action==='commit'){
  if(receipts.has(q.p_request))return {...snapshot(),replayed:true};
  if(conflictNext){conflictNext=false;server.wallet.rin-=7;server.revision++;return {...snapshot(),conflict:true};}
  if(server.failNext){server.failNext=false;throw Error('server offline');}
  if(q.p_revision!==server.revision)return {...snapshot(),conflict:true};
  server.self=copy(q.p_save);server.wallet=copy(q.p_wallet);server.progress=copy(q.p_progress);server.revision++;commits++;receipts.add(q.p_request);if(loseResponse)throw Error('response lost after commit');return snapshot();
 }
 if(q.p_action==='rent')return snapshot();
 throw Error('unknown rpc');
};
for(const k of ['save','acctPush','step','offline','C','maxMana','renderTop','renderNav','renderMain','toast','modal','boot','pairFetch','manaRate','power','effStat','gainExp','finishPeriod','finishResearch','damageHP','damageSN','simBattle','examOpponent','towerFoe','guardFoe','startRun','runRealTick','myRecord','pairRentTick','payPairRent','marketRpc','balanceBossData','closeModal','nowMin','syncUp','claimRoom','coopRoomPanel','pairMergeApply','roomCreate','roomJoin','roomRun','legacyQuestRoom','pairRunHTML','normalizeEffects','tick','drawFish2'])ctx[k]=noop;
ctx.save=()=>{};ctx.acctPush=async()=>true;ctx.maxMana=()=>100;ctx.manaRate=()=>1;ctx.power=()=>10;ctx.effStat=()=>3;ctx.C=()=>({dps:10,atkPow:10,hp:100,def:10,heal:1});ctx.myRecord=()=>({});ctx.marketRpc=async()=>({ok:true});ctx.balanceBossData=()=>({players:[],total:0,week:'2026-11-02'});ctx.nowMin=()=>0;
ctx.runStep=()=>{const r=ctx.S.run;r.kills=(r.kills||0)+1;r.rin=(r.rin||0)+2;r.exp=(r.exp||0)+3;r.know=(r.know||0)+1;r.logs=(r.logs||[]).concat({t:'one combat turn',time:'test'});};
ctx.endRun=()=>{ctx.S.run.done=true;};ctx.runReturn=()=>ctx.endRun();ctx.nf=n=>String(n);ctx.runTimeText=n=>String(Math.round(n));ctx.cal=()=>({str:'test'});
ctx.startLesson=id=>{ctx.S.lesson={id,left:30};ctx.save();};
ctx.startStudy=id=>{ctx.S.study={id,left:20};ctx.save();};
ctx.fishCast=()=>{ctx.FISHGAME={state:'run'};};
ctx.step=m=>{ctx.elapsedTicks=(ctx.elapsedTicks||0)+m;if(ctx.S.lesson)ctx.S.lesson.left-=m;if(ctx.S.study)ctx.S.study.left-=m;};
const bundled=fs.readFileSync(require('path').join(__dirname,'../coop.js'),'utf8');
const script=bundled.split('/* ===== module: pair-play.js ===== */')[1].split('/* ===== module: auction-live.js ===== */')[0];vm.createContext(ctx);vm.runInContext(script,ctx);
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
 // Force a CAS collision after the initial read, without rerunning the action.
 conflictNext=true;ctx.S.rin-=3;ctx.save();
 assert.equal(await ctx.acctPush(true),true);assert.equal(server.wallet.rin,55,'CAS retry preserves both spends');
 onGet=()=>{ctx.S.bio='edited while GET waits';ctx.save();};ctx.PAIR_PLAY.lastServerReadAt=0;
 assert.equal(await ctx.acctPush(true),true); // read-only save must preserve the in-flight input
 assert.equal(ctx.S.bio,'edited while GET waits');
 assert.equal(await ctx.acctPush(true),true);assert.equal(server.self.bio,'edited while GET waits');
 // Both responses are lost even though the first request committed. The next
 // save must settle that receipt and must not repeat the spend.
 loseResponse=true;ctx.S.rin-=4;ctx.save();const prior=commits;
 const fetchBeforeLost=ctx.acctFetch;
 ctx.acctFetch=async(...args)=>{const q=JSON.parse(args[1].body);if(q.p_action==='commit'&&receipts.has(q.p_request))throw Error('response still lost');return fetchBeforeLost(...args);};
 assert.equal(await ctx.acctPush(true),false);assert.equal(commits,prior+1);
 assert.ok(storage.has('mmjy_pair_commit_pending_alice'),'ambiguous receipt survives reload');
 loseResponse=false;ctx.acctFetch=fetchBeforeLost;ctx.PAIR_PLAY.unconfirmed=null; // recover using the persisted receipt
 assert.equal(await ctx.acctPush(true),true);assert.equal(server.wallet.rin,51,'acknowledgement recovery never double spends');
 assert.equal(storage.has('mmjy_pair_commit_pending_alice'),false);
 // repeated backend failure should NOT be reported as a successful save.
 server.failNext=true;const previousFetch=ctx.acctFetch;ctx.acctFetch=async(...args)=>{const q=JSON.parse(args[1].body);if(q.p_action==='commit')throw Error('network lost');return previousFetch(...args)};
 ctx.S.bio='unsaved failure';ctx.save();const failed=await ctx.acctPush(true);
 assert.equal(failed,false,'failed commit reports failure');assert.equal(server.self.bio,'edited while GET waits','server not silently overwritten');assert.ok(backups.some(b=>b.bio==='unsaved failure'),'dirty local snapshot retained for backup');
 ctx.acctFetch=previousFetch;
 assert.equal(await ctx.acctPush(true),true,'pending request recovers after backend returns');
 // Reject unsafe nonnumeric merging atomically: even a numeric change earlier
 // in the delta must not leak into the wallet when a later bag field conflicts.
 const safeBalance=server.wallet.rin;
 ctx.S.rin-=2;ctx.S.inv.gift={name:'mine'};ctx.save();
 server.wallet.inv.gift={name:'partner'};server.revision++;
 assert.equal(await ctx.acctPush(true),false);
 assert.equal(ctx.S.rin,safeBalance,'failed merge applies no partial numeric delta');
 assert.equal(server.wallet.rin,safeBalance);
 assert.ok(backups.some(b=>b.inv.gift?.name==='mine'),'conflicting record has recovery copy');
 // A chat receipt and cursor are local to the live session, not pair wallet deltas.
 const identity=ctx.S;ctx.S.msgs=[{sid:1,body:'new chat'}];ctx.S.sb.chatId=1;
 server.self.msgs=[{sid:0,body:'old chat'}];
 await ctx.PAIR_PLAY.refresh();assert.equal(ctx.S,identity,'pair reads retain state identity');
 assert.equal(ctx.S.msgs[0].body,'new chat','server snapshot never rolls back chat');
 ctx.S.msgs.push({sid:2,body:'incoming while playing'});ctx.save();
 assert.ok(!ctx.PAIR_PLAY.pending.some(op=>op.path[0]==='msgs'),'chat-only updates never queue wallet saves');
 // Hold one commit open, then start two different activities. UI-only fishing
 // remains immediate and paid changes are serialized rather than dropped.
 server.progress.run={left:60,acc:0,done:false,lastTick:Date.now()};await ctx.PAIR_PLAY.refresh();
 let release,entered;const atCommit=new Promise(r=>entered=r);const gate=new Promise(r=>release=r);
 const liveFetch=ctx.acctFetch;let held=true;
 ctx.acctFetch=async(...args)=>{const q=JSON.parse(args[1].body);if(q.p_action==='commit'&&held){held=false;entered();await gate;}return liveFetch(...args);};
 ctx.S.bio='delayed save';ctx.save();const delayed=ctx.acctPush(true);await atCommit;
 const lesson=ctx.startLesson('s1'),study=ctx.startStudy('r1');
 assert.ok(lesson&&typeof lesson.then==='function','lesson click is queued, not discarded');
 assert.ok(study&&typeof study.then==='function','research click is queued, not discarded');
 ctx.fishCast();assert.equal(ctx.FISHGAME.state,'run','fishing animation can start while saving');
 ctx.S.msgs.push({sid:3,body:'arrives during save'});ctx.save();release();
 await Promise.all([delayed,lesson,study]);assert.equal(server.self.lesson.id,'s1');assert.equal(server.self.study.id,'r1');
 assert.equal(ctx.S.msgs.at(-1).body,'arrives during save');assert.equal(ctx.S,identity,'delta replay keeps chat callbacks attached');
 assert.equal(server.self.msgs,undefined,'chat history excluded from wallet payload');assert.equal(server.self.sb.roster,undefined);
 ctx.acctFetch=liveFetch;
 // startTick writes lastReal every second. Personal elapsed time must use the
 // acknowledged personal clock, otherwise both activities stop during a run.
 server.progress.run={left:60,acc:0,done:false,lastTick:Date.now()};await ctx.PAIR_PLAY.refresh();
 ctx.S.lesson.left=1;server.self.lesson.left=1;ctx.PAIR_PLAY.clockBasis=Date.now()-60000;ctx.S.lastReal=Date.now();
 const elapsedBefore=ctx.elapsedTicks||0;ctx.step(1);await ctx.PAIR_PLAY.queue;
 assert.ok(ctx.elapsedTicks-elapsedBefore>.9,'one minute advances despite per-second lastReal update');
 // A PostgreSQL timeout must not trigger an immediate request storm or close
 // the fishing modal, and must preserve its original receipt for recovery.
 let timeoutCalls=0;const goodFetch=ctx.acctFetch;
 ctx.acctFetch=async(...args)=>{const q=JSON.parse(args[1].body);if(q.p_action==='commit'){timeoutCalls++;throw Error(JSON.stringify({code:'57014',message:'canceling statement due to statement timeout'}));}return goodFetch(...args);};
 ctx.S.bio='timeout pending';ctx.save();assert.equal(await ctx.acctPush(true),false);
 assert.equal(timeoutCalls,1,'no immediate retry after statement timeout');assert.ok(ctx.PAIR_PLAY.retryAt>Date.now());
 ctx.step(2);await ctx.PAIR_PLAY.refresh();await ctx.PAIR_PLAY.queue;assert.equal(timeoutCalls,1,'background work respects cooldown');
 assert.equal(ctx.FISHGAME.state,'run','background timeout does not reset fishing');
 server.wallet.rin-=1;server.revision++;
 ctx.PAIR_PLAY.retryAt=0;ctx.acctFetch=goodFetch;assert.equal(await ctx.acctPush(true),true,'same receipt resolves once server recovers');
 // Both partners can reach the same shared-run minute. A rejected tick must
 // recompute from the accepted run clock instead of subtracting that minute twice.
 server.progress.run={left:10,acc:0,done:false,kills:0,logs:[],lastTick:Date.now()-300000};
 server.self.lastReal=Date.now()-300000;server.self.lesson={id:'s1',left:30};
 await ctx.PAIR_PLAY.refresh();let collision=true;const fetchBeforeTick=ctx.acctFetch;
 ctx.acctFetch=async(...args)=>{const q=JSON.parse(args[1].body);if(q.p_action==='commit'&&collision){collision=false;server.progress.run={left:5,acc:2,done:false,kills:1,logs:[],lastTick:Date.now()};server.revision++;return {...snapshot(),conflict:true};}return fetchBeforeTick(...args);};
 ctx.S.lastReal=Date.now();ctx.step(5);await ctx.PAIR_PLAY.queue;
 assert.ok(server.progress.run.left>4.99,'a partner-confirmed run minute is not counted twice');
 assert.ok(server.self.lesson.left>24.99&&server.self.lesson.left<25.01,'personal lesson still advances exactly once');
 ctx.acctFetch=fetchBeforeTick;
 // Five-minute checkpoints have their own clock; personal saves must not
 // reset the next checkpoint or force combat on each unrelated click.
 let clock=Date.now();const RealDate=Date;ctx.Date=class extends RealDate{static now(){return clock;}};
 server.self.lesson=null;server.self.study=null;server.self.book=null;server.self.lastReal=clock;
 server.progress.run={left:10,total:10,acc:0,done:false,kills:0,logs:[],lastTick:clock};
 await ctx.PAIR_PLAY.refresh();const batchCommits=commits;
 clock+=240000;ctx.S.lastReal=clock;ctx.step(4);await ctx.PAIR_PLAY.queue;
 assert.equal(commits,batchCommits,'no passive save within the first four quest minutes');
 clock+=60000;ctx.S.lastReal=clock;ctx.step(1);await ctx.PAIR_PLAY.queue;
 assert.equal(commits,batchCommits+1,'one checkpoint at five minutes');
 assert.equal(server.progress.run.left,5);assert.equal(server.progress.run.kills,1,'original combat turn interval is preserved');
 assert.equal(server.progress.run.logs.length,1,'combat details are condensed into one checkpoint');
 assert.ok(server.progress.run.logs[0].t.includes('의뢰 진행'));
 const runStamp=server.progress.run.lastTick;
 clock+=60000;await ctx.startLesson('s2');
 assert.equal(server.progress.run.lastTick,runStamp,'starting a lesson does not settle a run checkpoint');
 clock+=60000;await ctx.runReturn();
 assert.equal(server.progress.run.left,3,'early return accounts for the pending two minutes');assert.equal(server.progress.run.done,true);
 server.self.lesson=null;server.self.study=null;server.self.lastReal=clock;
 server.progress.run={left:2,total:2,acc:0,done:false,kills:0,logs:[],lastTick:clock};await ctx.PAIR_PLAY.refresh();
 clock+=120000;ctx.S.lastReal=clock;ctx.step(2);await ctx.PAIR_PLAY.queue;
 assert.equal(server.progress.run.done,true,'short runs finish on time instead of waiting for five minutes');
 ctx.Date=RealDate;
 console.log('PASS: personal save, shared wallet save, partner concurrent spend, remote profile reload, CAS retry, in-flight edit, durable lost-response recovery, failed save backup, atomic conflict rejection, chat preservation, queued activities, elapsed clock timeout cooldown and concurrent run clock, five-minute batches, early return and completion');
})().catch(e=>{console.error(e);process.exitCode=1;});
