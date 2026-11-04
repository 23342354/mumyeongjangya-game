"use strict";

;
/* ===== module: pair-play.js ===== */
/* 페어 공동 플레이: 단일 서버 지갑 + revision CAS + 재시도 영수증. */
(function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
window.bagCapacity=function(){return PAIR_PLAY.ready?Number(S.pairBagCap||80):40+(S.res.r11||0)*5;};
const PJ=window.PAIR_PLAY={ready:false,busy:false,depth:0,combat:false,personal:false,queue:Promise.resolve(),snapshot:null,error:'',lastPoll:0,lastServerReadAt:0,acc:0,sharedXp:0,loss:{hp:0,sn:0},offlineNeeded:false,baseline:null,pending:[],flushTimer:null,peerCache:null,retryAt:0,failures:0,initQueued:false,tickQueued:false,actions:new Map()};
// Passive requests are intentionally slower than real game actions. The RPC still
// uses server-side revision checks and request receipts for every paid action.
const PAIR_POLL_MS=30000;
const PAIR_PASSIVE_TICK_MIN=2;
const RUN_BATCH_MIN=5;
let fishingHook=null,fishingBox=null,fishingBoxKey='',fishingPump=null,fishingRetry=null;
const fishingClient=crypto.randomUUID?.()||String(Date.now())+'-'+Math.random();let fishingSequence=0;
function pollInterval(){return S?.run&&!S.run.done?RUN_BATCH_MIN*60000:PAIR_POLL_MS;}
const oldSave=save,oldPush=acctPush,oldStep=step,oldOffline=offline,oldC=C,personalMax=maxMana,oldToast=toast,oldModal=modal;
const CLIENT_KEYS=['msgs','chatReset','chatFrom','chatTab','chatMode','chatFilter','dmWith'];
function replaceLocalState(target){
 const keep={};for(const k of CLIENT_KEYS)if(S[k]!==undefined)keep[k]=S[k];
 for(const k of Object.keys(S))if(!(k in target)&&!CLIENT_KEYS.includes(k))delete S[k];
 Object.assign(S,target,keep);
}
function compactSave(state=S){
 const blob=clone(state);delete blob.msgs;
 if(blob.sb)blob.sb={id:blob.sb.id,claimed:blob.sb.claimed||[]};
 if(blob.pair)blob.pair={mine:blob.pair.mine||null};
 return blob;
}
function errorCode(e){if(e?.code)return e.code;try{return JSON.parse(e.message).code;}catch(_){return '';}}
function cooling(){return Date.now()<PJ.retryAt;}
function linked(){return !!(typeof acctIn==='function'&&acctIn()&&S?.pair?.mine?.status==='accepted');}
function active(){return linked()||!!S?.pairShared;}
async function rpc(action,args={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{return await acctFetch('rpc/pair_play',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({p_user:ACCT.id,p_token:ACCT.tok,p_action:action,...args})});}
 catch(e){if(e.name==='AbortError'||e.name==='TypeError'){const err=Error('서버 응답이 지연되어 저장 확인을 다시 시도합니다.');err.code='PAIR_NETWORK_TIMEOUT';throw err;}throw e;}
 finally{clearTimeout(timer);}
}
function wallet(){return {pass:S.pass,wbTickets:S.wb.tickets,marks:S.fest.marks,rin:S.rin,mana:S.mana,know:S.know,sari:S.sari,lotus:S.lotus,mat:S.mat||{},ing:S.ing||{},bmat:S.bmat||{},ingredients:S.ingredients||{},inv:S.inv||{},potion:S.potion||{},dishes:S.kit.have||{},seeds:S.farm.seeds||{},fertilizers:S.farm.fertilizers||{},fert:S.farm.fert||0,bag:S.bag||[],pendingLoot:S.balance20.pendingLoot||[],gid:S.gid};}
function progress(){const q={...S.quests};delete q.room;delete q.pick;delete q.durIdx;const d={...S.dex};delete d.title;delete d.wards;return {life:{farm:{skill:S.farm.skill,exp:S.farm.exp},fish:{skill:S.fish.skill,exp:S.fish.exp,catches:S.fish.catches}},pairRoomClaims:S.pairRoomClaims||[],sharedHome:{hall:S.hall,stage:S.home.stage},wbDmg:S.wb.dmg,wbWeek:S.wb.balanceWeek,arena:S.arena,course:S.course,examHist:S.examHist,graduated:!!S.graduated,tower:S.tower,tower2:S.tower2,quests:q,run:S.run||null,storyRead:S.storyRead||[],dex:d,bossClaims:S.balance20.bossClaims||[],rent_due:PJ.snapshot?.progress?.rent_due||0};}
const personalKeys=['exp','lvl','pts','gear','alloc','sub','res','lesson','study','hp','sn','home','marketRev','lastReal','farm','fish','balance20','buffs','kit','hall','pairBagCap'];
// Save changes made outside the serialized combat/shop buttons before any server refresh.
// Each change is a small path-based delta against the last confirmed server snapshot.
const LOCAL_TRANSIENT=new Set(['sb','pair','pairShared','pairPersonalRev','pairSoloRev','pairBagCap','lastReal','t','passNext','chatFrom',...CLIENT_KEYS]);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function changes(before,after,path=[],out=[]){
 if(path.length===2&&path[0]==='balance20'&&path[1]==='lastCast')return out;
 if(!path.length&&(!before||!after))return out;
 if(isObject(before)&&isObject(after)&&!(path.length===1&&path[0]==='run')){
  for(const k of new Set([...Object.keys(before),...Object.keys(after)])){
   if(!path.length&&LOCAL_TRANSIENT.has(k))continue;
   changes(before[k],after[k],[...path,k],out);
  }
 }else if(!same(before,after))out.push({path,had:before!==undefined,from:before===undefined?null:clone(before),has:after!==undefined,to:after===undefined?null:clone(after)});
 return out;
}
function sharedPath(path){
 const [a,b]=path;
 if(['rin','mana','know','pass','sari','lotus','mat','ing','bmat','ingredients','inv','potion','bag','gid','quests','dex','course','examHist','graduated','tower','tower2','run','storyRead','arena','pairRoomClaims'].includes(a))return true;
 if(a==='hall')return true;
 if(a==='farm')return ['seeds','fertilizers','fert','skill','exp'].includes(b);
 if(a==='fish')return ['skill','exp','catches'].includes(b);
 if(a==='fest')return b==='marks';
 if(a==='kit')return b==='have';
 if(a==='wb')return ['tickets','dmg','balanceWeek'].includes(b);
 if(a==='balance20')return ['pendingLoot','bossClaims'].includes(b);
 if(a==='home')return b==='stage';
 return false;
}
function replayChanges(list){
 const target=clone(S);
 for(const op of list){
  let parent=target;for(const k of op.path.slice(0,-1)){
   if(!isObject(parent[k]))parent[k]={};parent=parent[k];
  }
  const key=op.path[op.path.length-1],current=parent[key];
  const shared=sharedPath(op.path);
  // Numeric shared changes are relative, so a partner's intervening income/spend is preserved.
  if(shared&&op.had&&op.has&&typeof op.from==='number'&&typeof op.to==='number'){
   const next=Number(current||0)+(op.to-op.from);
   if(!Number.isFinite(next)||next<0)throw Error('공동 잔액이 변경되었습니다. 최신 잔액을 확인한 후 다시 시도해 주세요.');
   parent[key]=next;
  }else{
   // Never replace a concurrently edited shared bag, quest list or other nonnumeric value.
   if(!shared&&!same(current,op.had?op.from:undefined)&&!same(current,op.has?op.to:undefined))throw Error('개인 기록이 다른 기기 또는 파트너 활동으로 변경되었습니다. 미저장 기록은 백업에 보관했습니다.');
   if(shared&&!same(current,op.had?op.from:undefined))throw Error('파트너가 공동 기록을 변경했습니다. 미저장 기록을 백업한 뒤 다시 확인해 주세요.');
   if(op.has)parent[key]=clone(op.to);else delete parent[key];
  }
 }
 replaceLocalState(target);
}
function markDirty(){
 if(!PJ.ready||!PJ.baseline||!active())return;
 PJ.pending=changes(PJ.baseline,S);
 if(PJ.pending.length){
  if(typeof accountSyncSetMeta==='function')accountSyncSetMeta({pending:true,localAt:Date.now()});
  if(!PJ.flushTimer)PJ.flushTimer=setTimeout(()=>{PJ.flushTimer=null;if(PJ.pending.length&&PJ.ready&&!PJ.busy)acctPush(true);},3500);
 }else if(typeof accountSyncSetMeta==='function')accountSyncSetMeta({pending:false,error:''});
}
function backupOnFailure(reason,snapshot){
 if(typeof accountSyncBackup==='function')try{accountSyncBackup(clone(snapshot||S),'공동 지갑 미반영 기록',String(reason||''));}catch(_){}
}

function apply(r){
 if(r.solo){if(r.self){Object.assign(S,clone(r.self));delete S.pairShared;delete S.pairPersonalRev;if(S.pair)S.pair.mine=null;PJ.ready=false;PJ.snapshot=null;PJ.peerCache=null;PJ.baseline=null;PJ.pending=[];}return;}
 if(!r.ok){PJ.ready=false;PJ.error=r.message||'공동 기록을 준비하고 있습니다.';return;}
 PJ.snapshot=r;PJ.ready=true;PJ.error='';PJ.failures=0;PJ.retryAt=0;PJ.peerCache=null;PJ.lastServerReadAt=Date.now();PJ.lastPoll=PJ.lastServerReadAt;PJ.clockBasis=Number(r.self?.lastReal)||Date.now();
 const localCast=Number(S.balance20?.lastCast)||0;
 const keep={};for(const k of ['sb',...CLIENT_KEYS])if(S[k]!==undefined)keep[k]=S[k];
 const pairList={inbox:S.pair?.inbox||[],sent:S.pair?.sent||[],partner:S.pair?.partner||null,at:S.pair?.at||0};
 Object.assign(S,clone(r.self),keep);
 if(S.balance20)S.balance20.lastCast=Math.max(localCast,Number(S.balance20.lastCast)||0);
 S.pair={...(S.pair||{}),...pairList,mine:r.pair||null};

 const w=r.wallet,p=r.progress;
 for(const k of ['rin','mana','know','sari','lotus','mat','ing','bmat','ingredients','inv','potion','bag','gid'])S[k]=clone(w[k]);
 S.pass=w.pass;S.passNext=r.passNext;S.wb.tickets=w.wbTickets;S.wb.next=r.bossNext;S.wb.dmg=p.wbDmg||0;S.wb.balanceWeek=p.wbWeek;S.fest.marks=w.marks;S.kit.have=clone(w.dishes);S.farm.seeds=clone(w.seeds);S.farm.fertilizers=clone(w.fertilizers);S.farm.fert=w.fert;
 S.balance20.pendingLoot=clone(w.pendingLoot);S.balance20.bossClaims=clone(p.bossClaims||[]);
 for(const k of ['course','examHist','graduated','tower','tower2','run','storyRead','arena'])if(p[k]!==undefined)S[k]=clone(p[k]);
 if(p.life){Object.assign(S.farm,clone(p.life.farm));Object.assign(S.fish,clone(p.life.fish));}
 normalizeEffects();Object.assign(S.quests,clone(p.quests));Object.assign(S.dex,clone(p.dex));
 S.pairRoomClaims=clone(p.pairRoomClaims||[]);S.pairShared=r.pairId;S.pairPersonalRev=r.self.pairPersonalRev;
 if(S.pair?.mine&&p.rent_due)S.pair.mine.rent_due=p.rent_due;
 if(typeof RUNTICK!=='undefined'&&RUNTICK){clearInterval(RUNTICK);RUNTICK=null;}
 PJ.baseline=clone(S);
}
function normalizeEffects(){
 S.buffs=(S.buffs||[]).filter(b=>!b.pairExpiresAt||b.pairExpiresAt>Date.now());
 for(const b of S.buffs)if(b.pairExpiresAt)b.left=(b.pairExpiresAt-Date.now())/60000;
 for(const k of ['eat','dess'])if(S.kit[k]?.pairExpiresAt){if(S.kit[k].pairExpiresAt<=Date.now())S.kit[k]=null;else S.kit[k].left=(S.kit[k].pairExpiresAt-Date.now())/60000;}
}
function peerView(){
 const p=PJ.snapshot?.peer;if(!p)return null;
 // A view can query the partner's stats dozens of times. Calculating them once
 // per accepted snapshot avoids repeatedly cloning the whole save object.
 if(!PJ.depth&&PJ.peerCache)return PJ.peerCache;
 const own=S;try{
  S={...clone(own),...clone(p),pair:own.pair,sb:own.sb};
  const view={name:p.name||'파트너',power:power(),stats:Object.fromEntries(STATS.map(s=>[s.k,effStat(s.k)])),c:oldC(),rate:manaRate(),cap:personalMax(),level:S.lvl};
  if(!PJ.depth)PJ.peerCache=view;
  return view;
 }finally{S=own;}
}
function metadata(){const p=peerView(),m={};m[ACCT.id]={rate:manaRate(),cap:personalMax()};if(p)m[PJ.snapshot.peerId]={rate:p.rate,cap:p.cap};return m;}
function enqueue(fn){const job=PJ.queue.catch(()=>{}).then(fn);PJ.queue=job.catch(()=>{});return job;}
function sameSnapshot(r){
 const prev=PJ.snapshot;
 if(!PJ.ready||!prev||!r?.ok||r.solo||Number(r.pairId)!==Number(prev.pairId))return false;
 // A passive fetch can change countdowns without changing the shared revision;
 // compare actual shared balances and partner data as well.
 return r.revision===prev.revision
  &&same(r.wallet,prev.wallet)&&same(r.progress,prev.progress)
  &&same(r.self,prev.self)&&same(r.peer,prev.peer)
  &&same(r.pair,prev.pair);
}
// A response may arrive after a profile/input save. Capture changes after the await.
async function read(quiet=false,preserve=true){
 const action=quiet&&Number(PJ.snapshot?.syncVersion)>=2?'peek':'get';
 const r=await rpc(action);
 if(r.busy){const e=Error(r.message||'공동 기록이 사용 중입니다. 잠시 후 저장합니다.');e.code='55P03';throw e;}
 if(action==='get'&&r.ok)PJ.lastAuthoritativeReadAt=Date.now();
 const local=preserve&&PJ.baseline?changes(PJ.baseline,S):[];
 const localState=local.length?clone(S):null;
 if(quiet&&sameSnapshot(r)){
  // Do not rebuild the entire UI or overwrite a locally running animation.
  PJ.lastServerReadAt=Date.now();PJ.lastPoll=PJ.lastServerReadAt;
  PJ.snapshot.passNext=r.passNext;PJ.snapshot.bossNext=r.bossNext;
  S.passNext=r.passNext;S.wb.next=r.bossNext;r.unchanged=true;
 }else apply(r);
 if(local.length&&r.ok&&!r.solo&&!r.unchanged){
  try{replayChanges(local);markDirty();}catch(e){backupOnFailure(e.message,localState);throw e;}
 }
 if(!r.ok){const e=Error(r.message||'공동 기록 연결을 확인해 주세요.');e.waiting=!!r.waiting;throw e;}return r;
}
function receiptKey(){return 'mmjy_pair_commit_pending_'+ACCT.id;}
function rememberCommit(value){
 PJ.unconfirmed=value;
 try{if(value)localStorage.setItem(receiptKey(),JSON.stringify(value));else localStorage.removeItem(receiptKey());}catch(_){}
}
async function sendCommit(args,base,context={}){
 rememberCommit({args,base,context});
 let error;
 for(let attempt=0;attempt<2;attempt++){
  try{
   const r=await rpc('commit',args);
   if(r?.busy){const e=Error(r.message||'공동 기록이 사용 중입니다. 잠시 후 저장합니다.');e.code='55P03';throw e;}
   if(!r||r.ok!==true)throw Error(r?.message||'공동 기록 저장 결과를 확인하지 못했습니다.');
   rememberCommit(null);
   if(Number(r.pairId)!==Number(base.pairShared)){
    backupOnFailure('저장 중 페어 관계가 변경되었습니다.',args.p_save);
    throw Error('저장 중 페어 관계가 변경되었습니다. 보관된 기록을 확인해 주세요.');
   }
   return r;
  }catch(e){
   error=e;
   // PostgREST validation/auth errors are definitive rejections, not lost ACKs.
   const code=errorCode(e);
   if(['57014','55P03','40P01','40001','PAIR_NETWORK_TIMEOUT'].includes(code))throw e;
   if(code&&!['40P01','40001','57014','55P03','53300','57P01','PGRST000','PGRST001','PGRST002'].includes(code)){
    rememberCommit(null);throw e;
   }
  }
 }
 throw error;
}
async function recoverCommit(){
 let pending=PJ.unconfirmed;
 if(!pending){try{pending=JSON.parse(localStorage.getItem(receiptKey())||'null');}catch(_){}}
 if(!pending)return;
 let later=PJ.ready?changes(pending.args.p_save,S):[];
 for(let attempt=0;attempt<2;attempt++){
  const r=await sendCommit(pending.args,pending.base,pending.context);
  apply(r);PJ.pending=[];
  if(r.conflict){
   let context=pending.context||{};
   try{
    if(context.tag==='tick'&&context.before){
     replayChanges(changes(pending.base,context.before));
     context={tag:'tick',before:compactSave()};calculateTick();
    }else if(context.tag==='fishReward'&&context.fishEvents){
     replayChanges(changes(pending.base,context.before));
     context={...context,before:compactSave()};PJ.sharedXp=0;PJ.loss={hp:0,sn:0};PJ.messages=[];PJ.depth++;
     try{tick(Math.min(1440,Math.max(0,(Date.now()-(Number(PJ.clockBasis)||Date.now()))/60000)),false);for(const event of context.fishEvents)replayFish(event);S.lastReal=Date.now();}finally{PJ.depth--;}
    }else replayChanges(changes(pending.base,pending.args.p_save));
    if(later.length)replayChanges(later);
   }
   catch(e){backupOnFailure(e.message,pending.args.p_save);throw e;}
   // Keep the original shared XP, buffs and damage when an unconfirmed
   // action is rebased. A generic profile flush must not discard them.
   pending={base:clone(PJ.baseline),context,args:{...pending.args,
    ...(['tick','fishReward'].includes(context.tag)?{p_xp:PJ.sharedXp,p_loss:PJ.loss}:{}),p_revision:r.revision,
    p_request:crypto.randomUUID?.()||ACCT.id+'-'+Date.now()+'-'+Math.random(),
    p_save:compactSave(),p_wallet:wallet(),p_progress:progress(),p_meta:metadata()}};
   rememberCommit(pending);later=[];continue;
  }
  if(later.length)replayChanges(later);
  oldSave();markDirty();if(!PJ.pending.length)cache();return;
 }
 markDirty();const e=Error('공동 기록 갱신이 몰려 잠시 후 저장을 다시 시도합니다.');e.code='55P03';throw e;
}
function showError(e){
 if(['57014','55P03','40P01','40001','PAIR_NETWORK_TIMEOUT'].includes(errorCode(e))){
  PJ.failures++;PJ.retryAt=Date.now()+Math.min(90000,5000*2**Math.min(4,PJ.failures-1))+Math.floor(Math.random()*1000);
 }
if(PJ.pending.length&&typeof accountSyncSetMeta==='function')accountSyncSetMeta({pending:true,error:String(e?.message||e).slice(0,180)});const message=String(e?.message||e).includes('PGRST202')?'공동 플레이 SQL 설치가 필요합니다.':String(e?.message||e).slice(0,180);PJ.error=message;if(!e.waiting&&(PJ.lastErrorMessage!==message||Date.now()-(PJ.lastErrorAt||0)>60000)){oldToast(message,'bad');PJ.lastErrorAt=Date.now();PJ.lastErrorMessage=message;}renderTop();renderMain(true);}

function rerender(){renderTop();renderNav();renderMain(true);}
async function init(){
 if(!active()||PJ.busy||PJ.initQueued||cooling()||Date.now()-PJ.lastPoll<pollInterval())return;
 PJ.initQueued=true;PJ.lastPoll=Date.now();return enqueue(async()=>{
  PJ.busy=true;try{
   await recoverCommit();
   markDirty();
   let preflightFailed=false;
   if(!S.pairShared){const ok=await oldPush(true);if(ok===false){preflightFailed=!(typeof ACCOUNT_SYNC_LAST_ERROR!=='undefined'&&ACCOUNT_SYNC_LAST_ERROR.includes('PAIR_STALE_SAVE'));backupOnFailure('공동 연결 전 계정 원본 저장 실패');}}
   let didChange=false;
   if(PJ.ready&&PJ.pending.length){
    const saved=await transact('profile',()=>{},false);
    if(!saved)throw Error(PJ.error||'미반영 기록을 서버에 보관하지 못했습니다.');
    // transact() already saved and refreshed the UI.
    didChange=false;
   }else{
    const state=await read(PJ.ready&&!PJ.offlineNeeded);
    didChange=!state.unchanged;
   }
   if(PJ.ready&&PJ.offlineNeeded){PJ.offlineNeeded=false;await transact('offline',()=>oldOffline(),false);didChange=false;}
   if(didChange)cache();
   if(preflightFailed){
    const warning='공동지갑 연결 직전의 개인 저장에 실패했습니다. 원본을 별도 백업했으니 설정에서 확인해 주세요.';
    if(typeof accountSyncSetMeta==='function')accountSyncSetMeta({pending:true,error:warning,errorAt:Date.now()});
    oldToast(warning,'bad');
   }
   if(didChange)rerender();
  }catch(e){showError(e);}finally{PJ.busy=false;PJ.initQueued=false;if(PJ.ready)pumpFishing();}
 });
}
function isGroup(tag){return /^(takeExam|examPractice|climbTower|climbGuard|startRun|runQuest|runReturn|runClear|endRun|hitBoss|arenaGo)$/.test(tag);}
async function transact(tag,fn,queue=true,options={}){
 if(queue)return enqueue(()=>transact(tag,fn,false,options));
 if(cooling()){if(!['tick','profile','offline','fishReward'].includes(tag))oldToast('서버 저장을 다시 연결하고 있습니다. 잠시 후 다시 눌러 주세요.','bad');return false;}
 PJ.busy=true;document.body.classList.add('pair-action-busy');let before=null,dirtyLocal=null,sentState=null,transactionBase=null;
 try{
  await recoverCommit();
  markDirty();
  const unsaved=PJ.pending.slice();if(unsaved.length)dirtyLocal=clone(S);
  // Immediately following an acknowledged server response, we can use that
  // version for a second click without another GET round-trip. If the other
  // player has changed it, the commit CAS rejects the stale revision safely.
  const recent=!!(PJ.ready&&PJ.lastAuthoritativeReadAt&&Date.now()-PJ.lastAuthoritativeReadAt<15000);
  if(!recent)await read(false,true);
  if(!PJ.ready)throw Error(PJ.error||'공동 지갑이 아직 연결되지 않았습니다.');
  transactionBase=clone(PJ.baseline);
  before=clone(S);PJ.rollbackGames={fish:typeof FISHGAME!=='undefined'&&FISHGAME?clone(FISHGAME):null,bg:typeof BG!=='undefined'&&BG?clone(BG):null,outing:typeof OUTING!=='undefined'&&OUTING?clone(OUTING):null};PJ.sharedXp=0;PJ.loss={hp:0,sn:0};PJ.messages=[];PJ.modal=null;
  PJ.depth++;const previousCombat=PJ.combat;PJ.combat=isGroup(tag);PJ.groupAward=isGroup(tag);
  let oldClock;
  if(options.fishBar!==undefined){oldClock=fishBarAt;fishBarAt=()=>options.fishBar;}
  try{
   if(tag!=='tick'&&tag!=='offline'){const elapsed=Math.min(1440,Math.max(0,(Date.now()-(Number(PJ.clockBasis)||Number(S.lastReal)||Date.now()))/60000));if(elapsed>0||tag==='runReturn')tick(elapsed,tag==='runReturn',tag==='runReturn');}
   if(tag==='tick'){const elapsed=Math.min(1440,Math.max(0,(Date.now()-(Number(PJ.clockBasis)||Number(S.lastReal)||Date.now()))/60000));tick(elapsed);}else await fn();
  }finally{if(oldClock)fishBarAt=oldClock;PJ.depth--;PJ.combat=previousCombat;PJ.groupAward=false;}
  S.lastReal=Date.now();
  const effects={};
  if(['useItem','drink','drinkPotion','usePotion','eat'].includes(tag)){
   effects.buffs=(S.buffs||[]).filter(b=>!(before.buffs||[]).some(a=>JSON.stringify(a)===JSON.stringify(b)));
   for(const k of ['eat','dess'])if(JSON.stringify(S.kit[k])!==JSON.stringify(before.kit[k]))effects[k]=S.kit[k];
  }
  const request=(crypto.randomUUID?.()||ACCT.id+'-'+Date.now()+'-'+Math.random());
  const args={p_revision:PJ.snapshot.revision,p_request:request,p_save:compactSave(),p_wallet:wallet(),p_progress:progress(),p_xp:PJ.sharedXp,p_meta:metadata(),p_effects:effects,p_loss:PJ.loss};
  // p_save has already been deep-copied for a stable retry receipt.
  sentState=clone(S);
  let r;
  for(let attempt=0;attempt<2;attempt++){
   r=await sendCommit(args,transactionBase,{tag,before:['tick','fishReward'].includes(tag)?compactSave(before):undefined,fishEvents:options.fishEvents});
   if(!r.conflict)break;
   // Rebase the computed result; do not rerun combat, rewards or random rolls.
   const local=clone(S),delta=changes(transactionBase,local);
   apply(r);PJ.pending=[];
   try{
    if(tag==='tick'){
     replayChanges(changes(transactionBase,before));before=clone(S);calculateTick();
    }else if(tag==='fishReward'){
     replayChanges(changes(transactionBase,before));before=clone(S);PJ.sharedXp=0;PJ.loss={hp:0,sn:0};PJ.messages=[];PJ.depth++;
     try{tick(Math.min(1440,Math.max(0,(Date.now()-(Number(PJ.clockBasis)||Date.now()))/60000)),false);fn();S.lastReal=Date.now();}finally{PJ.depth--;}
    }else replayChanges(delta);
   }catch(e){backupOnFailure(e.message,local);throw e;}
   transactionBase=clone(PJ.baseline);
   sentState=clone(S);
   Object.assign(args,{p_revision:r.revision,p_request:crypto.randomUUID?.()||ACCT.id+'-'+Date.now()+'-'+Math.random(),p_save:compactSave(),p_wallet:wallet(),p_progress:progress(),p_meta:metadata(),p_xp:PJ.sharedXp,p_loss:PJ.loss});
   if(attempt===1){rememberCommit({args:clone(args),base:clone(transactionBase),context:{tag,before:['tick','fishReward'].includes(tag)?compactSave(before):undefined,fishEvents:options.fishEvents}});markDirty();const e=Error('공동 기록 갱신이 몰려 잠시 후 저장을 다시 시도합니다.');e.code='55P03';throw e;}
  }
  const laterChanges=changes(sentState,S);
  apply(r);PJ.pending=[];PJ.acc=0;
  if(laterChanges.length){replayChanges(laterChanges);oldSave();markDirty();}else cache();
  for(const m of PJ.messages)oldToast(...m);rerender();
  if(S.home?.auto&&S.hall!=='dorm'&&PJ.snapshot.progress.rent_due>0&&nowMin()>=PJ.snapshot.progress.rent_due)payPairRent(true);
  return r;
 }catch(e){
  backupOnFailure(e?.message,sentState||dirtyLocal||S);
  // Preserve the exact outstanding state on a network failure. A later retry
  // must settle its receipt before reading or sending any new transaction.
  if(!sentState&&before)replaceLocalState(before);
  if(PJ.unconfirmed){oldSave();markDirty();}
  else if(PJ.baseline){markDirty();oldSave();}
  if(PJ.rollbackGames&&['fishHook','fishScoop','fishStop','outChoose','takeSouv'].includes(tag)){FISHGAME=PJ.rollbackGames.fish;if(FISHGAME)FISHGAME.state='idle';BG=PJ.rollbackGames.bg;OUTING=PJ.rollbackGames.outing;}showError(e);rerender();return false;
 }finally{PJ.busy=false;PJ.messages=null;PJ.modal=null;PJ.depth=0;document.body.classList.remove('pair-action-busy');const status=document.querySelector('.pair-team-status');if(status)status.textContent=PJ.error?'연결 상태 확인':PJ.ready?'공동 지갑 연결됨':'파트너 연결 대기';}
}
toast=function(...args){if(PJ.depth&&PJ.messages){PJ.messages.push(args);return;}return oldToast(...args);};
modal=function(...args){if(PJ.depth){PJ.modal=args;return oldModal(...args);}return oldModal(...args);};
save=function(){if(PJ.depth)return;const result=oldSave.apply(this,arguments);markDirty();return result;};
acctPush=function(force){if(active()){if(PJ.depth)return Promise.resolve(false);if(!PJ.ready){init();return Promise.resolve(false);}markDirty();if(!PJ.pending.length&&!PJ.unconfirmed){
 // No changes to upload: a recently confirmed snapshot is already saved.
 if(!force||Date.now()-PJ.lastServerReadAt<10000)return Promise.resolve(true);
 return enqueue(async()=>{try{const r=await read(true,true);if(!r.unchanged){cache();rerender();}return true;}catch(e){showError(e);return false;}});
 }if(PJ.savePromise)return PJ.savePromise;
 PJ.savePromise=transact('profile',()=>{}).then(r=>!!(r&&r.ok)).finally(()=>{PJ.savePromise=null;});return PJ.savePromise;}return oldPush.apply(this,arguments);};
function cache(){oldSave();if(typeof accountSyncSetMeta==='function')accountSyncSetMeta({pending:!!PJ.pending.length,error:'',lastSuccess:Date.now()});if(typeof ACCOUNT_SYNC_LAST_SUCCESS!=='undefined')ACCOUNT_SYNC_LAST_SUCCESS=Date.now();}
const oldSync=syncUp;syncUp=function(force){if(PJ.depth)return Promise.resolve();return oldSync.apply(this,arguments);};
const xp=gainExp;gainExp=function(n){const result=xp.apply(this,arguments);if(PJ.depth&&!PJ.personal)PJ.sharedXp+=result;return result;};
for(const name of ['finishPeriod','finishResearch']){const f=window[name];window[name]=function(...args){const old=PJ.personal;PJ.personal=true;try{return f.apply(this,args);}finally{PJ.personal=old;}};}
for(const [name,key] of [['damageHP','hp'],['damageSN','sn']]){const f=window[name];window[name]=function(n){const old=S[key],r=f.apply(this,arguments);if(PJ.depth&&PJ.groupAward)PJ.loss[key]+=Math.max(0,old-S[key]);return r;};}
function calculateTick(){
 PJ.sharedXp=0;PJ.loss={hp:0,sn:0};PJ.messages=[];PJ.depth++;
 try{tick(Math.min(1440,Math.max(0,(Date.now()-(Number(PJ.clockBasis)||Date.now()))/60000)));S.lastReal=Date.now();}
 finally{PJ.depth--;}
}
function tick(minutes,advanceRun=true,forceRun=false){
 const absoluteBuffs=clone((S.buffs||[]).filter(b=>b.pairExpiresAt>Date.now())),absoluteMeals={};for(const k of ['eat','dess'])if(S.kit[k]?.pairExpiresAt>Date.now())absoluteMeals[k]=clone(S.kit[k]);
 const tokens={pass:S.pass,tickets:S.wb.tickets,passNext:S.passNext,next:S.wb.next};
 const rate=manaRate,max=maxMana;manaRate=()=>0;maxMana=()=>Number(PJ.snapshot.wallet.mana)+Object.values(PJ.snapshot.meta||{}).reduce((n,v)=>n+Number(v.cap||0),0);
 try{oldStep(minutes);}finally{manaRate=rate;maxMana=max;S.pass=tokens.pass;S.passNext=tokens.passNext;S.wb.tickets=tokens.tickets;S.wb.next=tokens.next;for(const b of absoluteBuffs){S.buffs=S.buffs.filter(x=>!(x.n===b.n&&x.key===b.key));S.buffs.push(b);}Object.assign(S.kit,absoluteMeals);normalizeEffects();}
 if(advanceRun&&S.run&&!S.run.done){
  const elapsed=Math.max(0,(Date.now()-(S.run.lastTick||Date.now()))/60000);
  if(!forceRun&&elapsed<RUN_BATCH_MIN&&elapsed<S.run.left)return;
  const R=S.run,previousLogs=(R.logs||[]).slice(),summaryBefore={kills:R.kills||0,rin:R.rin||0,exp:R.exp||0,know:R.know||0,gear:(S.bag||[]).length+(S.balance20.pendingLoot||[]).length};
  const m=Math.min(R.left,Math.max(0,(Date.now()-(R.lastTick||Date.now()))/60000));
  R.lastTick=Date.now();R.left-=m;R.acc=(R.acc||0)+m;
  const combat=PJ.combat,group=PJ.groupAward;PJ.combat=true;PJ.groupAward=true;
  let guard=0;try{while(S.run&&!S.run.done&&S.run.acc>=RUNSTEPMIN&&guard++<600){S.run.acc-=RUNSTEPMIN;runStep();}if(S.run&&!S.run.done&&S.run.left<=0)endRun(S.run.kills>0);}finally{PJ.combat=combat;PJ.groupAward=group;}
  // Simulate every original combat turn, but retain one concise checkpoint.
  // This changes transmission/display frequency, not combat speed or rewards.
  const ending=R.done?(R.logs||[]).filter(l=>/정산 ·|■/.test(l.t)).slice(-2):[];
  const gear=Math.max(0,(S.bag||[]).length+(S.balance20.pendingLoot||[]).length-summaryBefore.gear);
  const summary={t:`<b>${runTimeText(m)} 의뢰 진행</b> · 처치 ${nf((R.kills||0)-summaryBefore.kills)}체 · 륜 +${nf((R.rin||0)-summaryBefore.rin)} · 경험치 +${nf((R.exp||0)-summaryBefore.exp)} · 지식 +${nf((R.know||0)-summaryBefore.know)}${gear?` · 법구 +${gear}점`:''}`,time:cal().str.replace(/^(오전|오후) /,'')};
  R.logs=[...previousLogs,summary,...ending].slice(-80);
 }
}
function updateRunClock(){
 if(!PJ.ready||!S.run||S.run.done)return;
 const remaining=Math.max(0,S.run.left-Math.max(0,(Date.now()-(S.run.lastTick||Date.now()))/60000));
 const clock=document.getElementById('runclock');if(clock)clock.textContent=runTimeText(remaining)+' 남음';
 const pace=document.getElementById('runpace');if(pace)pace.textContent=`전체 ${runTimeText(S.run.total)} 가운데 ${runTimeText(Math.max(0,S.run.total-remaining))} 지났습니다. 진행과 보상은 5분마다 반영됩니다.`;
 const bar=document.getElementById('runprog');if(bar)bar.style.width=Math.max(0,Math.min(100,(1-remaining/Math.max(1,S.run.total))*100))+'%';
}
function passiveTickThreshold(){
 let until=PAIR_PASSIVE_TICK_MIN;
 if(S.run&&!S.run.done){
  const basis=Number(PJ.clockBasis)||Date.now();
  const due=(Number(S.run.lastTick)||basis)+Math.min(RUN_BATCH_MIN,Math.max(0,Number(S.run.left)||0))*60000;
  until=Math.min(RUN_BATCH_MIN,Math.max(1/60,(due-basis)/60000));
 }
 for(const task of [S.lesson,S.study,S.book]){
  if(task&&Number.isFinite(Number(task.left)))until=Math.min(until,Math.max(1/60,Number(task.left)));
 }
 return Math.max(1/60,until);
}
step=function(minutes){
 if(!active())return oldStep.apply(this,arguments);
 updateRunClock();
 if(PJ.depth)return tick(minutes);
 PJ.acc+=Math.max(0,Number(minutes)||0);
 // Browsers throttle background tabs, so real elapsed wall time is also checked.
 const wallElapsed=PJ.clockBasis?Math.max(0,(Date.now()-PJ.clockBasis)/60000):0;
 if(PJ.ready&&Math.max(PJ.acc,wallElapsed)>=passiveTickThreshold()&&!PJ.busy&&!PJ.tickQueued&&!cooling()){
  PJ.acc=0;PJ.tickQueued=true;transact('tick',()=>{}).finally(()=>{PJ.tickQueued=false;});
 }
 if(!PJ.ready)init();
};
offline=function(){if(active()){PJ.offlineNeeded=true;return;}return oldOffline.apply(this,arguments);};
const oldBoot=boot;boot=function(){oldBoot.apply(this,arguments);if(active())init();};
const oldPairFetch=pairFetch;pairFetch=function(){return Promise.resolve(oldPairFetch.apply(this,arguments)).then(r=>{if(active()&&!PJ.ready)init();return r;});};
maxMana=function(){if(!PJ.ready)return personalMax();const p=peerView();return personalMax()+(p?.cap||0);};
const personalC=oldC;
C=function(){const c=personalC();if(!PJ.combat||!PJ.ready)return c;const p=peerView();if(!p)return c;return {...c,dps:c.dps+p.c.dps,atkPow:c.atkPow+p.c.atkPow,hp:c.hp+p.c.hp,def:Math.round((c.def+p.c.def)/2),heal:(c.heal+p.c.heal)/2};};
function partnerFighter(){const p=peerView();if(!p)return null;const f=mkFighter(p.name,p.stats,Math.round(300+p.stats.def*40+p.stats.men*30));f.crit=p.c.crit;f.critD=p.c.critD;f.bossDamage=0;return f;}
const battle=simBattle;simBattle=function(me,allies,foes,turns,opts){if(PJ.combat&&PJ.ready&&!allies.length){const p=partnerFighter();if(p)allies=[p];}return battle(me,allies,foes,turns,opts);};
const opponent=examOpponent;examOpponent=function(){const f=opponent();if(PJ.ready){f.hp=Math.round(f.hp*1.7);f.max=f.hp;}return f;};
for(const name of ['towerFoe','guardFoe']){const f=window[name];window[name]=function(...args){const result=f.apply(this,args);if(PJ.combat&&PJ.ready){if(result.hp)result.hp=Math.round(result.hp*1.7);result.dps=Math.round(result.dps*1.7);}return result;};}
const start=startRun;startRun=function(stage,party,minutes){
 if(PJ.ready){S.quests.room={stage,pos:S.quests.room?.pos||'후열',party:[{n:PJ.snapshot.peer.name||'파트너',lv:PJ.snapshot.peer.lvl||1}]};party=true;}
 start(stage,party,minutes);if(PJ.ready&&S.run&&!S.run.done){const p=partnerFighter();S.run.allies=p?[p]:[];S.run.pairId=PJ.snapshot.pairId;}
};
const oldRunTimer=runRealTick;runRealTick=function(){if(active()){if(RUNTICK)clearInterval(RUNTICK);RUNTICK=null;return;}return oldRunTimer.apply(this,arguments);};
const oldTop=renderTop;renderTop=function(){oldTop.apply(this,arguments);if(PJ.ready)document.querySelector('#topbar .top-actions')?.insertAdjacentHTML('afterbegin','<span class="pair-wallet-badge tag">페어 공동 지갑</span>');};
const oldRecord=myRecord;myRecord=function(){const r=oldRecord();if(PJ.ready){r.pair_id=PJ.snapshot.pairId;r.pair_name=[S.name,PJ.snapshot.peer.name].sort().join(' · ');}return r;};
const oldRentTick=pairRentTick;pairRentTick=function(){return active()?true:oldRentTick.apply(this,arguments);};
const oldRent=payPairRent;payPairRent=function(automatic){if(!active())return oldRent.apply(this,arguments);return enqueue(async()=>{try{await recoverCommit();markDirty();if(PJ.pending.length){const saved=await transact('profile',()=>{},false);if(!saved)return false;}await read();const r=await rpc('rent',{p_revision:PJ.snapshot.revision,p_request:crypto.randomUUID()});if(r.conflict)throw Error('일세 정산 중 파트너의 공동 잔액이 변경되었습니다. 다시 시도해 주세요.');if(!r?.ok)throw Error(r?.message||'일세 저장 확인 실패');apply(r);cache();rerender();return true;}catch(e){showError(e);return false;}});};
// Fishing input is local. Only confirmed rewards pass through the shared queue.
// Each successful click has a durable ID and a fixed roll for safe replay.
function fishingKey(){return 'mmjy_pair_fishing_v1_'+String(ACCT.id)+'_'+String(S.pairShared||S.pair?.mine?.id||PJ.snapshot?.pairId||'');}
function fishingData(){
 const key=fishingKey();
 if(fishingBoxKey!==key){
  fishingBoxKey=key;fishingBox={lastCast:0,events:[]};
  try{const stored=JSON.parse(localStorage.getItem(key)||'null');if(stored&&Array.isArray(stored.events))fishingBox=stored;}catch(_){}
 }
 PJ.fishingPending=fishingBox.events.length;return fishingBox;
}
function storeFishing(next){
 try{localStorage.setItem(fishingKey(),JSON.stringify(next));fishingBox=next;PJ.fishingPending=next.events.length;return true;}
 catch(_){oldToast('어획 기록을 기기에 보관하지 못했습니다. 저장 공간을 확인해 주세요.','bad');return false;}
}
function fishingStatus(){
 if(!active())return;
 const box=fishingData(),host=document.querySelector('#modalroot .mbody');if(!host)return;
 let label=document.getElementById('pair-fishing-save-status');
 if(!label){host.insertAdjacentHTML('beforeend','<div class="tiny muted" id="pair-fishing-save-status" role="status" style="margin-top:8px"></div>');label=document.getElementById('pair-fishing-save-status');}
 const count=document.getElementById('balance-fish-count');if(count)count.textContent=`오늘 어획 보상 ${S.balance20?.fish||0}/${window.BALANCE20?.fishDaily||60} · 던지기 간격 ${window.BALANCE20?.castSeconds||10}초`;
 if(label)label.textContent=box.events.length?`어획 ${box.events.length}건 저장 대기 · 낚시는 계속할 수 있습니다.`:PJ.ready?'어획 기록 저장 완료':'서버 연결 대기 · 낚시는 계속할 수 있습니다.';
}
function hasFishReceipt(event,state=S){return Number(state.pairFishingReceipts?.[event.client]||0)>=event.seq;}
function replayFish(event){
 if(Number(event.pairId)!==Number(S.pairShared||PJ.snapshot?.pairId))throw Error('이전 페어의 어획 기록을 보관 중입니다. 연결 상태를 확인해 주세요.');
 if(hasFishReceipt(event))return;
 const live=FISHGAME,bar=fishBarAt,draw=drawFish2,get=document.getElementById,random=Math.random;
 const top=renderTop,main=renderMain,nav=renderNav;let seed=event.seed>>>0;
 const sink={innerHTML:'',textContent:''};
 try{
  FISHGAME={...event.game,state:'run',frame:null};fishBarAt=()=>event.bar;drawFish2=()=>{};
  renderTop=renderMain=renderNav=()=>{};
  document.getElementById=function(id){if(id==='fres'||id==='balance-fish-count')return sink;if(id.startsWith('life-'))return null;return get.call(document,id);};
  Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  fishingHook();
  S.pairFishingReceipts={...(S.pairFishingReceipts||{}),[event.client]:event.seq};
 }finally{
  FISHGAME=live;fishBarAt=bar;drawFish2=draw;document.getElementById=get;Math.random=random;
  renderTop=top;renderMain=main;renderNav=nav;
 }
}
function retryFishing(){
 clearTimeout(fishingRetry);
 fishingRetry=setTimeout(()=>{fishingRetry=null;pumpFishing();},Math.max(1000,PJ.retryAt-Date.now()+250));
}
function pumpFishing(){
 if(fishingPump||!active()||!PJ.ready||!fishingHook)return fishingPump;
 const box=fishingData();if(!box.events.length)return;
 if(cooling()){retryFishing();return;}
 const key=fishingKey(),batch=box.events.slice(0,10);
 fishingPump=enqueue(()=>key===fishingKey()?transact('fishReward',()=>{for(const e of batch)replayFish(e);},false,{fishEvents:batch}):false).then(r=>{
  if(key!==fishingKey())return;
  if(r?.ok){
   const current=fishingData();
   if(!storeFishing({...current,events:current.events.filter(e=>!hasFishReceipt(e,r.self||{}))}))return;
  }
 }).catch(e=>showError(e)).finally(()=>{
  fishingPump=null;fishingStatus();if(active()&&fishingData().events.length)retryFishing();
 });
 return fishingPump;
}
function hookFishingNow(){
 const F=FISHGAME;if(!F||F.state!=='run')return;
 const box=fishingData(),bar=fishBarAt(F,performance.now());
 const hit=bar>=F.target&&bar<=F.target+16;
 const reserved=box.events.filter(e=>e.day===S.balance20?.day&&!hasFishReceipt(e)).length;
 const practice=Number(S.balance20?.fish||0)+reserved>=Number(window.BALANCE20?.fishDaily||60);
 if(!hit||practice){
  const originalBar=fishBarAt,count=S.balance20?.fish;
  try{fishBarAt=()=>bar;if(practice&&S.balance20)S.balance20.fish=Number(window.BALANCE20?.fishDaily||60);return fishingHook();}
  finally{fishBarAt=originalBar;if(practice&&S.balance20)S.balance20.fish=count;fishingStatus();}
 }
 const event={client:fishingClient,seq:++fishingSequence,id:crypto.randomUUID?.()||ACCT.id+'-'+Date.now()+'-'+Math.random(),pairId:S.pairShared||S.pair?.mine?.id,day:S.balance20?.day,at:Date.now(),seed:Math.floor(Math.random()*4294967296),bar,game:{...F,frame:null}};
 if(!storeFishing({...box,events:[...box.events,event]}))return;
 F.state='idle';if(F.frame)cancelAnimationFrame(F.frame);F.frame=null;
 drawFish2();const result=document.getElementById('fres');
 if(result)result.innerHTML='<div class="sub tiny">챔질 성공 · 어획 기록을 보관했습니다. 보상은 서버 저장 확인 후 반영됩니다.</div>';
 fishingStatus();pumpFishing();
 return {queued:true,id:event.id};
}
// Resource-changing clicks are serialized. Nested game functions stay synchronous.
const actions=['startLesson','quickLesson','stopLesson','balanceLessonQueue','startStudy','cutStudy','cancelStudy','readBook','takeExam','examPractice','runQuest','startRun','runReturn','runClear','climbTower','climbGuard','hitBoss','arenaGo','balanceClaimBoss','rest','buy','useItem','martBuy','exchangeMark','festivalExchange','openBasket','booth','fishScoop','fishStop','fishCast','fishHook','farmSeedBuy11','farmFertiliserBuy11','farmFertiliserCraft11','farmFertiliserApply11','plant','plantAll','water','waterAll','harvest','harvestAll','deliverOrder','cook','eat','brew','drink','drinkPotion','usePotion','craftB','craftBMax','equip','unequip','equipBest','unequipAll','enhance','sellGear','dismantle','bulkDo','alloc','autoAlloc','resetAlloc','setTend','buildHome','balanceCollectLoot','joinClub','clubAttend','clubDonate','clubBless','startOuting','outChoose','takeSouv','takeFestSouv','chooseSouv','readStory','takeTea','aucBid','buyMerch','buyMisc','saveMe','setHall','moveHall','toggleRentAuto'];
for(const name of actions){const f=window[name];if(typeof f!=='function')continue;if(name==='fishHook')fishingHook=f;window[name]=function(...args){
 if(PJ.depth)return f.apply(this,args);
 const group=/^(takeExam|runQuest|startRun|climbTower|climbGuard)$/.test(name);
 if(!active()){if(group){oldToast('먼저 파트너를 맺어 두 사람이 함께 출발해 주세요.','bad');return;}return f.apply(this,args);}
 if(name==='fishCast'){
  if(!PJ.ready)init();
  const box=fishingData();if(S.balance20)S.balance20.lastCast=Math.max(Number(S.balance20.lastCast)||0,box.lastCast||0);
  const was=FISHGAME?.state,result=f.apply(this,args);
  if(was!=='run'&&FISHGAME?.state==='run')storeFishing({...box,lastCast:Number(S.balance20?.lastCast)||Date.now()});
  fishingStatus();return result;
 }
 if(name==='fishHook'){if(!PJ.ready)init();return hookFishingNow();}
 if(!PJ.ready){if(['runReturn','runClear'].includes(name)&&S.run){const r=f.apply(this,args);oldSave();oldPush(true);return r;}init();oldToast(PJ.error||'공동 지갑을 연결하고 있습니다. 잠시 후 다시 눌러 주세요.');return;}
 const key=name+JSON.stringify(args.map(a=>a&&typeof a==='object'?null:a));
 if(PJ.actions.has(key))return PJ.actions.get(key);
 const job=transact(name,()=>f.apply(this,args),true).finally(()=>PJ.actions.delete(key));PJ.actions.set(key,job);return job;
};}
const drawFishing=drawFish2;drawFish2=function(){const result=drawFishing.apply(this,arguments);fishingStatus();return result;};
PJ.flushFishing=()=>pumpFishing();
for(const n of ['legacyQuestRoom','pairRunHTML']){const f=window[n];if(f)window[n]=function(){return PJ.ready?'':f.apply(this,arguments);};}
const oldMerge=pairMergeApply;pairMergeApply=function(){return PJ.ready?false:oldMerge.apply(this,arguments);};
const oldPanel=coopRoomPanel;coopRoomPanel=function(kind){return active()?'<div class="card pad tiny muted" style="margin-top:12px">페어 자동 동행으로 진행합니다. 별도 합동방 모집 없이 바로 출발할 수 있습니다.</div>':oldPanel.apply(this,arguments);};
for(const n of ['roomCreate','roomJoin','roomRun']){const f=window[n];if(f)window[n]=function(){if(active()){oldToast('페어와 자동으로 동행합니다. 해당 콘텐츠에서 바로 출발해 주세요.');return;}return f.apply(this,arguments);};}
const oldClaimRoom=claimRoom;claimRoom=function(r){
 if(!active())return oldClaimRoom.apply(this,arguments);
 if(!PJ.ready)return;
 return transact('legacyRoom',()=>{if((S.pairRoomClaims||[]).includes(String(r.id)))return;const n=S.sb.claimed.length;oldClaimRoom(r);if(S.sb.claimed.length>n){if(!S.pairRoomClaims)S.pairRoomClaims=[];S.pairRoomClaims.push(String(r.id));}});
};
const oldMarket=marketRpc;
marketRpc=function(action,data){
 // Browsing is independent of game-save recovery, the write queue and inventory.
 if(action==='snapshot'||!active())return oldMarket.apply(this,arguments);
 return enqueue(async()=>{
  if(!PJ.ready){init();throw Error('공동 지갑을 연결한 뒤 거래해 주세요. 매물 목록은 계속 조회할 수 있습니다.');}
  await recoverCommit();markDirty();
  if(PJ.pending.length){
   const saved=await transact('profile',()=>{},false);
   if(!saved)throw Error('미반영 기록을 저장하지 못했습니다. 목록 조회는 가능하며, 거래는 저장 확인 후 다시 시도해 주세요.');
  }
  const key='mmjy_pair_market_pending_'+ACCT.id,signature=JSON.stringify([action,data]);
  let pending;try{pending=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
  if(pending&&pending.signature!==signature){
   const [previousAction,previousData]=JSON.parse(pending.signature);
   const recovered=await oldMarket(previousAction,{...previousData,pp_request:pending.request});
   if(!recovered?.ok)throw Error('이전 거래 결과를 확인하지 못했습니다. 새 거래는 아직 실행하지 않았습니다.');
   try{localStorage.removeItem(key);}catch(_){}pending=null;PJ.lastAuthoritativeReadAt=0;
   try{await read(true,true);cache();}
   catch(e){showError(e);throw Error('이전 거래 완료를 확인했습니다. 잔액 갱신 후 새 거래를 다시 진행해 주세요.');}
  }
  const fresh=!pending;
  if(!pending)pending={signature,request:crypto.randomUUID()};
  localStorage.setItem(key,JSON.stringify(pending));
  let result;
  try{
   result=await oldMarket(action,{...data,pp_request:pending.request});
   if(!result||result.ok!==true)throw Error(result?.message||'거래 결과를 확인하지 못했습니다.');
  }catch(e){
   const code=errorCode(e)||String(e.message).match(/"code"\s*:\s*"([^"]+)"/)?.[1];
   // A fresh request rejected by PostgreSQL is rolled back. Keep receipts only
   // when an earlier response may have been lost or completion is unknown.
   if(fresh&&code&&code!=='40003')try{localStorage.removeItem(key);}catch(_){}
   showError(e);throw e;
  }
  result={...result,save:undefined};
  // An acknowledged trade succeeded even if the subsequent wallet refresh fails.
  try{localStorage.removeItem(key);}catch(_){}PJ.lastAuthoritativeReadAt=0;
  try{await read(true,true);cache();}
  catch(e){result={...result,refreshPending:true};PJ.lastPoll=0;showError(e);}
  return result;
 });
};
const oldBossData=balanceBossData;
balanceBossData=function(){if(!PJ.ready)return oldBossData();const mine=PJ.snapshot.pairId,week=PJ.snapshot.progress.wbWeek,start=Date.parse(week+'T00:00:00+09:00');const map=new Map();
 for(const r of S.sb.roster||[]){if(Date.parse(r.updated_at)<start||!(r.wb_dmg>0)||Number(r.pair_id)===mine)continue;const key=r.pair_id?'p'+r.pair_id:'u'+r.id;const prev=map.get(key);if(!prev||prev.wb_dmg<r.wb_dmg)map.set(key,{...r,name:r.pair_name||r.name});}
 if(S.wb.dmg>0)map.set('p'+mine,{id:ACCT.id,name:[S.name,PJ.snapshot.peer.name].sort().join(' · '),wb_dmg:S.wb.dmg});
 const players=[...map.values()].sort((a,b)=>b.wb_dmg-a.wb_dmg);return {players,total:players.reduce((n,r)=>n+Number(r.wb_dmg),0),week};};
function card(){
 const own=power(),p=PJ.ready?peerView():null;
 return `<section class="pair-team-card"><div class="pair-team-top"><b>두 사람의 공동 여정</b><button class="btn sm" title="공동 기록 새로 고침" aria-label="공동 기록 새로 고침" onclick="PAIR_PLAY.lastPoll=0;PAIR_PLAY.refresh()" style="margin-left:auto">↻</button><span class="pair-team-status ${PJ.error?'pair-sync-error':''}">${PJ.ready?(PJ.busy?'공동 기록 반영 중':PJ.pending.length?'공동 기록 저장 대기':'공동 지갑 연결됨'):linked()?'연결 준비 중':'파트너를 기다리는 중'}</span></div><div class="pair-team-members"><div class="pair-team-person"><b>${esc(S.name)}</b><span class="pair-team-state">내 전투력 ${nf(own)}</span></div><span class="pair-team-link">∞</span><div class="pair-team-person"><b>${esc(p?.name||pairName()||'나의 파트너')}</b><span class="pair-team-state">${p?'파트너 전투력 '+nf(p.power):'페어를 맺으면 함께 출발합니다'}</span></div></div><div class="pair-team-state" style="margin-top:9px">파장·지식·재화·재료·바랑 공동 사용 · 수업·수행·착용 장비는 각자 · 시험·의뢰·탑은 한 사람이 진행하면 함께 반영</div>${PJ.error?`<div class="pair-team-state pair-sync-error">${esc(PJ.error)}</div>`:''}</section>`;
}
PJ.refresh=()=>{PJ.lastPoll=0;return init();};
for(const v of ['plaza','outing','pairhub','class','exam','quest','tower','guard','wboss','arena','bag','stats','hallv']){const f=VIEWS[v];if(!f)continue;VIEWS[v]=function(){const old=PJ.combat;PJ.combat=['tower','guard','wboss','quest','arena'].includes(v)&&PJ.ready;try{let html=f.apply(this,arguments);if(PJ.ready&&v==='quest')html=html.replace('30초에 한 줄. 창을 닫아 두어도 의뢰는 시계대로 흐르고, 돌아오면 그 사이 몫까지 한 번에 따라잡습니다.','진행과 보상은 5분마다 묶어서 반영합니다. 귀환·완료는 바로 정산하며, 접속하지 않은 시간도 다음 갱신 때 합산합니다.');if(PJ.ready)html=html.replace(/통행패 (\d+)\/3/g,'통행패 $1/6').replace(/통행패 <b>(\d+) \/ 3<\/b>/g,'통행패 <b>$1 / 6</b>').replace('12시간마다 한 장씩 발급되며 최대 3장','12시간마다 두 장씩 발급되며 페어 최대 6장');if(v==='wboss'&&PJ.ready)html=html.replace('/3 · 공격','/6 · 공동 공격').replace('최대 3장','페어 최대 6장');const box=document.createElement('div');box.innerHTML=html;const h=box.querySelector('.page-head');if(h){box.prepend(h);h.insertAdjacentHTML('afterend',card());return box.innerHTML;}return card()+html;}finally{PJ.combat=old;}};}
setInterval(()=>{if(active()&&!PJ.busy&&!PJ.depth&&document.visibilityState!=='hidden')init();},10000);
// A sleeping browser tab does not need background polling. Refresh immediately
// when the player returns, and flush any locally queued save on tab switch.
document.addEventListener('visibilitychange',()=>{
 if(!active())return;
 if(document.visibilityState==='visible'){PJ.lastPoll=0;init();}
 else if(PJ.ready&&PJ.pending.length)acctPush(true);
});
})();


;
/* ===== module: auction-live.js ===== */
"use strict";
/* 無明長夜 · 떠돌이 상인 / 서버 공용 정시 입찰
 * 매시 00~15분 KST: 세 가지 귀속 법구가 모든 러너에게 공통으로 등장합니다.
 * 입찰, 환불, 낙찰 수령은 Supabase 함수가 원자적으로 처리합니다.
 * 로컬 가상 NPC 입찰/임의 개시/임의 마감 기능은 비활성화합니다. */
const LIVE_AUCTION={data:null,loading:false,busy:false,at:0,error:"",offset:0};
function auctionConnected(){return typeof marketConnected==="function" && marketConnected();}
function auctionRpc(action,lot,expected,request){
  if(!auctionConnected())return Promise.reject(new Error("실제 경매는 계정 로그인 및 Supabase 연결이 필요합니다."));
  return acctFetch("rpc/wandering_auction",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({p_actor:ACCT.id,p_token:ACCT.tok,p_action:action,
      p_lot_id:lot===undefined?null:lot,p_expected:expected===undefined?null:expected,p_request:request||""})});
}
function auctionMessage(e){
  const s=String(e?.message||e||"오류");
  try{const o=JSON.parse(s);return String(o.message||o.details||s).slice(0,180);}
  catch(_){return s.slice(0,180);}
}
function auctionNow(){return Date.now()+LIVE_AUCTION.offset;}
function auctionDeadlineText(iso){
  const secs=Math.max(0,Math.ceil((Date.parse(iso)-auctionNow())/1000));
  const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60),s=secs%60;
  return `${h?h+":":""}${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function auctionClock(){
  if(VIEW!=="merchant")return;
  document.querySelectorAll("[data-auction-until]").forEach(el=>{
    const iso=el.getAttribute("data-auction-until");
    el.textContent=auctionDeadlineText(iso);
  });
  const live=LIVE_AUCTION.data?.live||[];
  if(live.some(l=>Date.parse(l.ends_at)<=auctionNow())&&Date.now()-LIVE_AUCTION.at>3000)
    auctionFetch(true);
}
async function auctionFetch(force=false){
  if(!auctionConnected()){LIVE_AUCTION.data=null;return;}
  if(LIVE_AUCTION.loading||(!force&&Date.now()-LIVE_AUCTION.at<8000))return;
  LIVE_AUCTION.loading=true;
  try{
    const r=await auctionRpc("snapshot");
    if(!r||r.ok!==true)throw new Error("경매 정보 응답을 확인할 수 없습니다.");
    LIVE_AUCTION.offset=Date.parse(r.server_at)-Date.now();
    LIVE_AUCTION.data=r;
    LIVE_AUCTION.error="";
    LIVE_AUCTION.at=Date.now();
    // 다른 러너가 내 최고가를 넘어서면 서버가 보증금을 반환하며 revision이 증가합니다.
    if(Number(r.rev||0)>Number(S?.marketRev||0)&&r.inventory&&typeof marketApplyInventory==="function")
      marketApplyInventory(r.inventory);
    if(VIEW==="merchant")renderMain(true);
    if(VIEW==="plaza"&&typeof plazaActivityRefresh==="function")plazaActivityRefresh();
  }catch(e){
    LIVE_AUCTION.error=auctionMessage(e);LIVE_AUCTION.at=Date.now();
    if(VIEW==="merchant")renderMain(true);
  }finally{LIVE_AUCTION.loading=false;}
}
function auctionRequestId(){
  return typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"
    ?crypto.randomUUID():"b"+Date.now().toString(36)+Math.random().toString(36).slice(2,12);
}
async function auctionCommit(action,lotId,expected){
  if(LIVE_AUCTION.busy)return;
  if(!auctionConnected())return toast("계정에 로그인하고 공용 경매 서버를 연결해 주세요.","bad");
  if(typeof PAIR_PLAY!=="undefined"&&PAIR_PLAY.busy)return toast("페어 공동 기록을 먼저 반영해 주세요.","bad");
  LIVE_AUCTION.busy=true;
  try{
    // 현재 게임 상태를 안전하게 저장한 다음 서버 트랜잭션을 실행합니다.
    if(typeof acctPush==="function"){
      const ok=await acctPush(true);
      if(ok===false)throw new Error("서버에 캐릭터 기록을 저장하지 못했습니다. 저장 상태를 확인해 주세요.");
    }
    const r=await auctionRpc(action,Number(lotId),expected,auctionRequestId());
    if(!r||r.ok!==true)throw new Error("경매 처리 결과를 확인할 수 없습니다.");
    LIVE_AUCTION.at=0;
    // 입찰과 환불, 법구 수령은 서버 잔고를 기준으로 반영합니다.
    if(r.inventory&&Number(r.rev||0)>Number(S?.marketRev||0))marketApplyInventory(r.inventory);
    if(typeof PAIR_PLAY!=="undefined"&&PAIR_PLAY.ready)await PAIR_PLAY.refresh();
    toast(action==="bid"?"공용 경매에 입찰했습니다. 다른 러너가 더 높은 값을 제시하면 륜이 자동 반환됩니다.":"낙찰품을 바랑에 수령했습니다.","good");
    await auctionFetch(true);
    renderTop();renderNav();renderMain(true);
  }catch(e){
    toast("경매 처리 실패 · "+esc(auctionMessage(e)),"bad");
    await auctionFetch(true);
  }finally{LIVE_AUCTION.busy=false;}
}
function auctionPlaceBid(id,expected){
  const lot=LIVE_AUCTION.data?.live?.find(x=>Number(x.id)===Number(id));
  if(!lot)return toast("경매 목록을 새로 고쳐 주세요.","bad");
  if(lot.mine)return toast("이미 최고 입찰자입니다.");
  if(Number(lot.bid_amount)!==Number(expected))return toast("가격이 달라졌습니다. 다시 확인해 주세요.","bad");
  const step=Math.max(500,Math.ceil(Number(lot.bid_amount||0)*.1));
  const price=Number(lot.bid_amount)>0?Number(lot.bid_amount)+step:Number(lot.start_price);
  if(Number(S.rin)<price)return toast("륜이 부족합니다.","bad");
  if(!confirm(`「${lot.item_name}」에 ${nf(price)}륜을 입찰할까요? 최고가인 동안 보증금으로 맡겨집니다.`))return;
  auctionCommit("bid",id,Number(expected));
}
function auctionClaim(id){auctionCommit("claim",id,null);}
function auctionTierName(t){return ({1:"신입생",2:"중급생",3:"상급생"})[Number(t)]||"경매";}
function auctionViewTime(iso){
  const t=Date.parse(iso);return Number.isFinite(t)?new Date(t).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Seoul"}):"";
}
VIEWS.merchant=()=>{
  const d=LIVE_AUCTION.data;
  const headHTML=head("서버 공용 경매 · 매시 정각 개장",ic("luggage")+" 떠돌이 상인","낙찰품 귀속 · <b>륜</b> 입찰");
  if(!auctionConnected())return headHTML+`<div class="card pad"><div class="sect-t">계정 및 경매 서버 연결 필요</div><div class="tiny muted">실제 러너들과 겨루는 공용 경매입니다. 계정에 로그인하고, 운영진이 제공한 Supabase 공용 경매 설치 SQL을 적용해야 이용할 수 있습니다. 개인 가상 입찰은 제공하지 않습니다.</div></div>`;
  if(!d)return headHTML+`<div class="card pad"><b>${LIVE_AUCTION.error?"경매 서버를 확인할 수 없습니다.":"경매 목록을 불러오는 중입니다."}</b>
    <div class="tiny muted" style="margin:9px 0">${LIVE_AUCTION.error?esc(LIVE_AUCTION.error):"매시 00~15분에 실시간 경매가 열립니다."}</div>
    <button class="btn sm pri" onclick="auctionFetch(true)">다시 불러오기</button></div>`;
  const live=Array.isArray(d.live)?d.live:[];
  const pend=Array.isArray(d.pending)?d.pending:[];
  const hist=Array.isArray(d.history)?d.history:[];
  return headHTML+`
   <div class="card pad" style="margin-bottom:13px">
     <div class="spread" style="gap:10px;flex-wrap:wrap"><div><b>매시 00분 ~ 15분</b> <span class="tag g">실제 러너 입찰</span>
       <div class="tiny muted" style="margin-top:5px">모든 러너에게 같은 세 개의 법구가 공개됩니다. 서버 시각 기준으로 마감되며, 끝나기 직전 입찰에는 제한적으로 시간이 연장됩니다.</div></div>
       <button class="btn sm" onclick="auctionFetch(true)">↻ 입찰 현황 갱신</button></div>
     <div class="tiny muted" style="margin-top:8px">보유 륜 <b style="color:var(--gold)">${nf(S.rin)}</b> · 최고가 입찰 시 전액 보관 · 다른 러너가 입찰하면 자동 환불 · 낙찰 뒤 직접 수령</div>
   </div>
   ${LIVE_AUCTION.error?`<div class="tiny" style="color:var(--red);margin-bottom:12px">${esc(LIVE_AUCTION.error)}</div>`:""}
   ${live.length?`<div class="grid g3" style="margin-bottom:14px">${live.map(l=>{
       const item=l.item_data||{},G=GRADES[item.grade]||GRADES[2];
       const mine=l.mine,step=Math.max(500,Math.ceil(Number(l.bid_amount||0)*.1));
       const need=Number(l.bid_amount)>0?Number(l.bid_amount)+step:Number(l.start_price);
       const can=!mine&&Number(S.rin)>=need&&!LIVE_AUCTION.busy;
       return `<article class="card pad auction-lot"><div class="spread"><span class="tag j">${auctionTierName(l.tier)} 경매</span><span class="tiny muted">${Number(l.bid_count||0)}회 입찰</span></div>
        <h3 style="color:${G.c};margin:10px 0 4px">${esc(l.item_name)}</h3>
        <div class="tiny muted">${GRADES[item.grade]?.n||"희귀"} · Lv ${Number(item.lv||1)} · ${SLOTS.find(x=>x.k===item.slot)?.n||"법구"} · 귀속</div>
        <div class="tiny" style="color:var(--jade);margin:8px 0;min-height:42px">${gearLine(item)}</div>
        <div class="spread tiny" style="margin-bottom:5px"><span class="muted">현재 최고가</span><b style="color:var(--gold);font-size:18px">${nf(Number(l.bid_amount)||Number(l.start_price))}륜</b></div>
        <div class="spread tiny"><span class="muted">최고 입찰자</span><span>${mine?"나 (최고가)":esc(l.winner_name||"아직 없음")}</span></div>
        <div class="spread tiny" style="margin:9px 0"><span class="muted">마감까지</span><b style="color:var(--gold)" data-auction-until="${esc(l.ends_at)}">${auctionDeadlineText(l.ends_at)}</b></div>
        <button class="btn ${can?"pri":""}" style="width:100%" ${can?"":"disabled"} onclick="auctionPlaceBid(${Number(l.id)},${Number(l.bid_amount)})">${mine?"현재 최고 입찰자":`입찰 · ${nf(need)}륜`}</button>
        ${!mine&&!can?'<div class="tiny muted" style="margin-top:6px">보유 륜 또는 서버 반영 상태를 확인해 주세요.</div>':""}
       </article>`}).join("")}</div>`:
     `<div class="card pad" style="margin-bottom:14px"><div class="sect-t">지금은 다음 경매를 준비하고 있습니다.</div>
       <div>다음 개장까지 <b style="color:var(--gold)" data-auction-until="${esc(d.next_at)}">${auctionDeadlineText(d.next_at)}</b></div>
       <div class="tiny muted" style="margin-top:7px">다음 개장: ${auctionViewTime(d.next_at)} (한국 시간) · 접속한 모든 러너가 동시에 경쟁합니다.</div></div>`}
   ${pend.length?`<div class="card pad" style="margin-bottom:14px"><div class="sect-t">낙찰품 수령 대기 · ${pend.length}점</div>
     ${pend.map(p=>`<div class="spread auction-pending"><div><b>${esc(p.item_name)}</b>
       <div class="tiny muted">${auctionTierName(p.tier)} · 최종 ${nf(p.bid_amount)}륜</div></div>
       <button class="btn sm pri" ${LIVE_AUCTION.busy?"disabled":""} onclick="auctionClaim(${Number(p.id)})">바랑에 수령</button></div>`).join("")}</div>`:""}
   <div class="card pad"><div class="spread" style="gap:12px"><div class="sect-t" style="margin:0">최근 낙찰 결과</div><span class="tiny muted">서버 공동 기록</span></div>
      ${hist.length?hist.map(p=>`<div class="spread auction-history tiny"><span><b>${esc(p.item_name)}</b>
          <span class="muted"> · ${esc(p.winner_name||"낙찰자 없음")}</span></span>
          <b>${Number(p.bid_amount)>0?nf(p.bid_amount)+"륜":"유찰"}</b></div>`).join(""):
        '<div class="tiny muted" style="margin-top:8px">아직 종료된 경매가 없습니다.</div>'}
   </div>`;
};
// 이전 단독 경매는 플레이어별 가짜 응찰자/임의 마감을 만들었으므로 비활성화합니다.
aucTick=function(){};
aucOpen=function(){toast("공용 경매는 한국 시간 매시 정각에 자동 개장합니다.");};
aucClose=function(){toast("공용 경매는 서버 시각에 따라 자동 마감됩니다.");};
const _auctionGo=go;
go=function(v){_auctionGo(v);if(v==="merchant")auctionFetch(true);};
setInterval(()=>{
  if(!S?.made||!auctionConnected())return;
  if(VIEW==="merchant"){auctionClock();auctionFetch(false);}
  else if(VIEW==="plaza"&&Date.now()-LIVE_AUCTION.at>30000)auctionFetch(false);
},1000);

