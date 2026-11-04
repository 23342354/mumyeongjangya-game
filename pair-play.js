/* 페어 공동 플레이: 단일 서버 지갑 + revision CAS + 재시도 영수증. */
(function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
window.bagCapacity=function(){return PAIR_PLAY.ready?Number(S.pairBagCap||80):40+(S.res.r11||0)*5;};
const PJ=window.PAIR_PLAY={ready:false,busy:false,depth:0,combat:false,personal:false,queue:Promise.resolve(),snapshot:null,error:'',lastPoll:0,lastServerReadAt:0,acc:0,sharedXp:0,loss:{hp:0,sn:0},offlineNeeded:false,baseline:null,pending:[],flushTimer:null,peerCache:null};
// Passive requests are intentionally slower than real game actions. The RPC still
// uses server-side revision checks and request receipts for every paid action.
const PAIR_POLL_MS=30000;
const PAIR_PASSIVE_TICK_MIN=2;
const oldSave=save,oldPush=acctPush,oldStep=step,oldOffline=offline,oldC=C,personalMax=maxMana,oldToast=toast,oldModal=modal;
function linked(){return !!(typeof acctIn==='function'&&acctIn()&&S?.pair?.mine?.status==='accepted');}
function active(){return linked()||!!S?.pairShared;}
function rpc(action,args={}){return acctFetch('rpc/pair_play',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_user:ACCT.id,p_token:ACCT.tok,p_action:action,...args})});}
function wallet(){return {pass:S.pass,wbTickets:S.wb.tickets,marks:S.fest.marks,rin:S.rin,mana:S.mana,know:S.know,sari:S.sari,lotus:S.lotus,mat:S.mat||{},ing:S.ing||{},bmat:S.bmat||{},ingredients:S.ingredients||{},inv:S.inv||{},potion:S.potion||{},dishes:S.kit.have||{},seeds:S.farm.seeds||{},fertilizers:S.farm.fertilizers||{},fert:S.farm.fert||0,bag:S.bag||[],pendingLoot:S.balance20.pendingLoot||[],gid:S.gid};}
function progress(){const q={...S.quests};delete q.room;delete q.pick;delete q.durIdx;const d={...S.dex};delete d.title;delete d.wards;return {life:{farm:{skill:S.farm.skill,exp:S.farm.exp},fish:{skill:S.fish.skill,exp:S.fish.exp,catches:S.fish.catches}},pairRoomClaims:S.pairRoomClaims||[],sharedHome:{hall:S.hall,stage:S.home.stage},wbDmg:S.wb.dmg,wbWeek:S.wb.balanceWeek,arena:S.arena,course:S.course,examHist:S.examHist,graduated:!!S.graduated,tower:S.tower,tower2:S.tower2,quests:q,run:S.run||null,storyRead:S.storyRead||[],dex:d,bossClaims:S.balance20.bossClaims||[],rent_due:PJ.snapshot?.progress?.rent_due||0};}
const personalKeys=['exp','lvl','pts','gear','alloc','sub','res','lesson','study','hp','sn','home','marketRev','lastReal','farm','fish','balance20','buffs','kit','hall','pairBagCap'];
// Save changes made outside the serialized combat/shop buttons before any server refresh.
// Each change is a small path-based delta against the last confirmed server snapshot.
const LOCAL_TRANSIENT=new Set(['sb','pair','pairShared','pairPersonalRev','pairSoloRev','pairBagCap','lastReal','t','passNext','chatFrom']);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function changes(before,after,path=[],out=[]){
 if(!path.length&&(!before||!after))return out;
 if(isObject(before)&&isObject(after)){
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
 for(const op of list){
  let parent=S;for(const k of op.path.slice(0,-1)){
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
   if(shared&&!same(current,op.from)&&op.had)throw Error('파트너가 공동 기록을 변경했습니다. 미저장 기록을 백업한 뒤 다시 확인해 주세요.');
   if(op.has)parent[key]=clone(op.to);else delete parent[key];
  }
 }
}
function markDirty(){
 if(!PJ.ready||!PJ.baseline||!active())return;
 PJ.pending=changes(PJ.baseline,S);
 if(PJ.pending.length){
  if(typeof accountSyncSetMeta==='function')accountSyncSetMeta({pending:true,localAt:Date.now()});
  clearTimeout(PJ.flushTimer);
  PJ.flushTimer=setTimeout(()=>{if(PJ.pending.length&&PJ.ready&&!PJ.busy)acctPush(true);},3500);
 }else if(typeof accountSyncSetMeta==='function')accountSyncSetMeta({pending:false,error:''});
}
function backupOnFailure(reason,snapshot){
 if(typeof accountSyncBackup==='function')try{accountSyncBackup(clone(snapshot||S),'공동 지갑 미반영 기록',String(reason||''));}catch(_){}
}

function apply(r){
 if(r.solo){if(r.self){Object.assign(S,clone(r.self));delete S.pairShared;delete S.pairPersonalRev;if(S.pair)S.pair.mine=null;PJ.ready=false;PJ.snapshot=null;PJ.peerCache=null;PJ.baseline=null;PJ.pending=[];}return;}
 if(!r.ok){PJ.ready=false;PJ.error=r.message||'공동 기록을 준비하고 있습니다.';return;}
 PJ.snapshot=r;PJ.ready=true;PJ.error='';PJ.peerCache=null;PJ.lastServerReadAt=Date.now();PJ.lastPoll=PJ.lastServerReadAt;PJ.clockBasis=Number(r.self?.lastReal)||Date.now();
 const keep={};for(const k of ['sb','chatTab','chatMode','chatFilter'])if(S[k]!==undefined)keep[k]=S[k];
 const pairList={inbox:S.pair?.inbox||[],sent:S.pair?.sent||[],partner:S.pair?.partner||null,at:S.pair?.at||0};
 Object.assign(S,clone(r.self),keep);
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
async function read(quiet=false){
 const r=await rpc('get');
 if(quiet&&sameSnapshot(r)){
  // Do not rebuild the entire UI or overwrite a locally running animation.
  PJ.lastServerReadAt=Date.now();PJ.lastPoll=PJ.lastServerReadAt;
  PJ.snapshot.passNext=r.passNext;PJ.snapshot.bossNext=r.bossNext;
  S.passNext=r.passNext;S.wb.next=r.bossNext;r.unchanged=true;
 }else apply(r);
 if(!r.ok){const e=Error(r.message||'공동 기록 연결을 확인해 주세요.');e.waiting=!!r.waiting;throw e;}return r;
}
function showError(e){if(PJ.pending.length&&typeof accountSyncSetMeta==='function')accountSyncSetMeta({pending:true,error:String(e?.message||e).slice(0,180)});const message=String(e?.message||e).includes('PGRST202')?'공동 플레이 SQL 설치가 필요합니다.':String(e?.message||e).slice(0,180);PJ.error=message;if(!e.waiting&&(PJ.lastErrorMessage!==message||Date.now()-(PJ.lastErrorAt||0)>60000)){oldToast(message,'bad');PJ.lastErrorAt=Date.now();PJ.lastErrorMessage=message;}renderTop();renderMain(true);}

function rerender(){renderTop();renderNav();renderMain(true);}
async function init(){
 if(!active()||PJ.busy||Date.now()-PJ.lastPoll<PAIR_POLL_MS)return;
 PJ.lastPoll=Date.now();return enqueue(async()=>{
  PJ.busy=true;try{
   let preflightFailed=false;
   if(!S.pairShared){const ok=await oldPush(true);if(ok===false){preflightFailed=true;backupOnFailure('공동 연결 전 계정 원본 저장 실패');}}
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
  }catch(e){showError(e);}finally{PJ.busy=false;}
 });
}
function isGroup(tag){return /^(takeExam|examPractice|climbTower|climbGuard|startRun|runQuest|runReturn|runClear|endRun|hitBoss|arenaGo)$/.test(tag);}
async function transact(tag,fn,queue=true,options={}){
 if(queue)return enqueue(()=>transact(tag,fn,false,options));
 PJ.busy=true;document.body.classList.add('pair-action-busy');let before=null,dirtyLocal=null,hadRead=false,sentState=null;
 try{
  const unsaved=PJ.pending.slice();if(unsaved.length)dirtyLocal=clone(S);
  // Immediately following an acknowledged server response, we can use that
  // version for a second click without another GET round-trip. If the other
  // player has changed it, the commit CAS rejects the stale revision safely.
  const recent=!!(PJ.ready&&!unsaved.length&&PJ.lastServerReadAt&&Date.now()-PJ.lastServerReadAt<2000);
  if(!recent)await read();
  hadRead=true;if(!PJ.ready)throw Error(PJ.error||'공동 지갑이 아직 연결되지 않았습니다.');
  if(unsaved.length)replayChanges(unsaved);
  before=clone(S);PJ.rollbackGames={fish:typeof FISHGAME!=='undefined'&&FISHGAME?clone(FISHGAME):null,bg:typeof BG!=='undefined'&&BG?clone(BG):null,outing:typeof OUTING!=='undefined'&&OUTING?clone(OUTING):null};PJ.sharedXp=0;PJ.loss={hp:0,sn:0};PJ.messages=[];PJ.modal=null;
  PJ.depth++;const previousCombat=PJ.combat;PJ.combat=isGroup(tag);PJ.groupAward=isGroup(tag);
  let oldClock;
  if(options.fishBar!==undefined){oldClock=fishBarAt;fishBarAt=()=>options.fishBar;}
  try{
   if(tag!=='tick'&&tag!=='offline'){const elapsed=Math.min(1440,Math.max(0,(Date.now()-(Number(S.lastReal)||Date.now()))/60000));if(elapsed>0)tick(elapsed);}
   if(tag==='tick'){const elapsed=Math.min(1440,Math.max(0,(Date.now()-(Number(S.lastReal)||Date.now()))/60000));tick(elapsed);}else await fn();
  }finally{if(oldClock)fishBarAt=oldClock;PJ.depth--;PJ.combat=previousCombat;PJ.groupAward=false;}
  S.lastReal=Date.now();
  const effects={};
  if(['useItem','drink','drinkPotion','usePotion','eat'].includes(tag)){
   effects.buffs=(S.buffs||[]).filter(b=>!(before.buffs||[]).some(a=>JSON.stringify(a)===JSON.stringify(b)));
   for(const k of ['eat','dess'])if(JSON.stringify(S.kit[k])!==JSON.stringify(before.kit[k]))effects[k]=S.kit[k];
  }
  const request=(crypto.randomUUID?.()||ACCT.id+'-'+Date.now()+'-'+Math.random());
  const args={p_revision:PJ.snapshot.revision,p_request:request,p_save:clone(S),p_wallet:wallet(),p_progress:progress(),p_xp:PJ.sharedXp,p_meta:metadata(),p_effects:effects,p_loss:PJ.loss};
  // p_save has already been deep-copied for a stable retry receipt.
  sentState=args.p_save;
  let r;try{r=await rpc('commit',args);}catch(e){
   // Same receipt id: a lost response can never repeat the transaction.
   try{r=await rpc('commit',args);}catch(_){throw e;}
  }
  if(r.conflict){Object.assign(S,before);apply(r);throw Error('파트너가 먼저 공동 기록을 갱신했습니다. 최신 상태를 불러왔으니 다시 눌러 주세요.');}
  if(!r||r.ok!==true)throw Error(r?.message||'공동 기록 저장 결과를 확인하지 못했습니다.');
  const laterChanges=changes(sentState,S);
  apply(r);PJ.pending=[];PJ.acc=0;
  if(laterChanges.length){replayChanges(laterChanges);oldSave();markDirty();}else cache();
  for(const m of PJ.messages)oldToast(...m);rerender();
  if(S.home?.auto&&S.hall!=='dorm'&&PJ.snapshot.progress.rent_due>0&&nowMin()>=PJ.snapshot.progress.rent_due)payPairRent(true);
  return r;
 }catch(e){backupOnFailure(e?.message,dirtyLocal||sentState||S);if(before&&!String(e.message).includes('파트너가 먼저')){Object.assign(S,before);try{await read();}catch(_){}}
  if(hadRead&&dirtyLocal&&PJ.pending.length){try{replayChanges(PJ.pending);oldSave();}catch(_){/* unsafe array conflict: protected recovery copy is kept */}}
  if(PJ.rollbackGames){FISHGAME=PJ.rollbackGames.fish;if(FISHGAME)FISHGAME.state='idle';BG=PJ.rollbackGames.bg;OUTING=PJ.rollbackGames.outing;}closeModal();showError(e);rerender();return false;
 }finally{PJ.busy=false;PJ.messages=null;PJ.modal=null;PJ.depth=0;document.body.classList.remove('pair-action-busy');const status=document.querySelector('.pair-team-status');if(status)status.textContent=PJ.error?'연결 상태 확인':PJ.ready?'공동 지갑 연결됨':'파트너 연결 대기';}
}
toast=function(...args){if(PJ.depth&&PJ.messages){PJ.messages.push(args);return;}return oldToast(...args);};
modal=function(...args){if(PJ.depth){PJ.modal=args;return oldModal(...args);}return oldModal(...args);};
save=function(){if(PJ.depth)return;const result=oldSave.apply(this,arguments);markDirty();return result;};
acctPush=function(force){if(active()){if(PJ.depth)return Promise.resolve(false);if(!PJ.ready){init();return Promise.resolve(false);}markDirty();if(!PJ.pending.length){
 // No changes to upload: a recently confirmed snapshot is already saved.
 if(!force||Date.now()-PJ.lastServerReadAt<10000)return Promise.resolve(true);
 return enqueue(async()=>{try{const r=await read(true);if(!r.unchanged){cache();rerender();}return true;}catch(e){showError(e);return false;}});
 }return transact('profile',()=>{}).then(r=>!!(r&&r.ok));}return oldPush.apply(this,arguments);};
function cache(){oldSave();if(typeof accountSyncSetMeta==='function')accountSyncSetMeta({pending:false,error:'',lastSuccess:Date.now()});if(typeof ACCOUNT_SYNC_LAST_SUCCESS!=='undefined')ACCOUNT_SYNC_LAST_SUCCESS=Date.now();}
const oldSync=syncUp;syncUp=function(force){if(PJ.depth)return Promise.resolve();return oldSync.apply(this,arguments);};
const xp=gainExp;gainExp=function(n){const result=xp.apply(this,arguments);if(PJ.depth&&!PJ.personal)PJ.sharedXp+=result;return result;};
for(const name of ['finishPeriod','finishResearch']){const f=window[name];window[name]=function(...args){const old=PJ.personal;PJ.personal=true;try{return f.apply(this,args);}finally{PJ.personal=old;}};}
for(const [name,key] of [['damageHP','hp'],['damageSN','sn']]){const f=window[name];window[name]=function(n){const old=S[key],r=f.apply(this,arguments);if(PJ.depth&&PJ.groupAward)PJ.loss[key]+=Math.max(0,old-S[key]);return r;};}
function tick(minutes){
 const absoluteBuffs=clone((S.buffs||[]).filter(b=>b.pairExpiresAt>Date.now())),absoluteMeals={};for(const k of ['eat','dess'])if(S.kit[k]?.pairExpiresAt>Date.now())absoluteMeals[k]=clone(S.kit[k]);
 const tokens={pass:S.pass,tickets:S.wb.tickets,passNext:S.passNext,next:S.wb.next};
 const rate=manaRate,max=maxMana;manaRate=()=>0;maxMana=()=>Number(PJ.snapshot.wallet.mana)+Object.values(PJ.snapshot.meta||{}).reduce((n,v)=>n+Number(v.cap||0),0);
 try{oldStep(minutes);}finally{manaRate=rate;maxMana=max;S.pass=tokens.pass;S.passNext=tokens.passNext;S.wb.tickets=tokens.tickets;S.wb.next=tokens.next;for(const b of absoluteBuffs){S.buffs=S.buffs.filter(x=>!(x.n===b.n&&x.key===b.key));S.buffs.push(b);}Object.assign(S.kit,absoluteMeals);normalizeEffects();}
 if(S.run&&!S.run.done){
  const R=S.run,m=Math.min(R.left,Math.max(0,(Date.now()-(R.lastTick||Date.now()))/60000));
  R.lastTick=Date.now();R.left-=m;R.acc=(R.acc||0)+m;
  const combat=PJ.combat,group=PJ.groupAward;PJ.combat=true;PJ.groupAward=true;
  let guard=0;try{while(S.run&&!S.run.done&&S.run.acc>=RUNSTEPMIN&&guard++<600){S.run.acc-=RUNSTEPMIN;runStep();}if(S.run&&!S.run.done&&S.run.left<=0)endRun(S.run.kills>0);}finally{PJ.combat=combat;PJ.groupAward=group;}
 }
}
function passiveTickThreshold(){
 // Keep urgent gameplay deadlines fast; idle characters need no write every 30s.
 if(S.run&&!S.run.done)return .5;
 let until=PAIR_PASSIVE_TICK_MIN;
 for(const task of [S.lesson,S.study,S.book]){
  if(task&&Number.isFinite(Number(task.left)))until=Math.min(until,Math.max(.1,Number(task.left)));
 }
 return Math.max(.1,until);
}
step=function(minutes){
 if(!active())return oldStep.apply(this,arguments);
 if(PJ.depth)return tick(minutes);
 PJ.acc+=Math.max(0,Number(minutes)||0);
 // Browsers throttle background tabs, so real elapsed wall time is also checked.
 const wallElapsed=PJ.clockBasis?Math.max(0,(Date.now()-PJ.clockBasis)/60000):0;
 if(PJ.ready&&Math.max(PJ.acc,wallElapsed)>=passiveTickThreshold()&&!PJ.busy){
  PJ.acc=0;transact('tick',()=>{});
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
const oldRent=payPairRent;payPairRent=function(automatic){if(!active())return oldRent.apply(this,arguments);return enqueue(async()=>{try{if(PJ.pending.length){const saved=await transact('profile',()=>{},false);if(!saved)return false;}await read();const r=await rpc('rent',{p_revision:PJ.snapshot.revision,p_request:crypto.randomUUID()});if(r.conflict)throw Error('일세 정산 중 파트너의 공동 잔액이 변경되었습니다. 다시 시도해 주세요.');if(!r?.ok)throw Error(r?.message||'일세 저장 확인 실패');apply(r);cache();rerender();return true;}catch(e){showError(e);return false;}});};
// Resource-changing clicks are serialized. Nested game functions stay synchronous.
const actions=['startLesson','quickLesson','stopLesson','balanceLessonQueue','startStudy','cutStudy','cancelStudy','readBook','takeExam','examPractice','runQuest','startRun','runReturn','runClear','climbTower','climbGuard','hitBoss','arenaGo','balanceClaimBoss','rest','buy','useItem','martBuy','exchangeMark','festivalExchange','openBasket','booth','fishScoop','fishStop','fishCast','fishHook','farmSeedBuy11','farmFertiliserBuy11','farmFertiliserCraft11','farmFertiliserApply11','plant','plantAll','water','waterAll','harvest','harvestAll','deliverOrder','cook','eat','brew','drink','drinkPotion','usePotion','craftB','craftBMax','equip','unequip','equipBest','unequipAll','enhance','sellGear','dismantle','bulkDo','alloc','autoAlloc','resetAlloc','setTend','buildHome','balanceCollectLoot','joinClub','clubAttend','clubDonate','clubBless','startOuting','outChoose','takeSouv','takeFestSouv','chooseSouv','readStory','takeTea','aucBid','buyMerch','buyMisc','saveMe','setHall','moveHall','toggleRentAuto'];
for(const name of actions){const f=window[name];if(typeof f!=='function')continue;window[name]=function(...args){
 if(PJ.depth)return f.apply(this,args);
 if(PJ.busy&&active()){oldToast('공동 기록을 반영하고 있습니다. 잠시만 기다려 주세요.');return;}
 const group=/^(takeExam|runQuest|startRun|climbTower|climbGuard)$/.test(name);
 if(!active()){if(group){oldToast('먼저 파트너를 맺어 두 사람이 함께 출발해 주세요.','bad');return;}return f.apply(this,args);}
 if(!PJ.ready){if(['runReturn','runClear'].includes(name)&&S.run){const r=f.apply(this,args);oldSave();oldPush(true);return r;}init();oldToast(PJ.error||'공동 지갑을 연결하고 있습니다. 잠시 후 다시 눌러 주세요.');return;}
 const opt={};if(name==='fishHook'&&FISHGAME?.state==='run'){opt.fishBar=fishBarAt(FISHGAME,performance.now());if(FISHGAME.frame)cancelAnimationFrame(FISHGAME.frame);}
 return transact(name,()=>f.apply(this,args),true,opt);
};}
for(const n of ['legacyQuestRoom','pairRunHTML']){const f=window[n];if(f)window[n]=function(){return PJ.ready?'':f.apply(this,arguments);};}
const oldMerge=pairMergeApply;pairMergeApply=function(){return PJ.ready?false:oldMerge.apply(this,arguments);};
const oldPanel=coopRoomPanel;coopRoomPanel=function(kind){return active()?'<div class="card pad tiny muted" style="margin-top:12px">페어 자동 동행으로 진행합니다. 별도 합동방 모집 없이 바로 출발할 수 있습니다.</div>':oldPanel.apply(this,arguments);};
for(const n of ['roomCreate','roomJoin','roomRun']){const f=window[n];if(f)window[n]=function(){if(active()){oldToast('페어와 자동으로 동행합니다. 해당 콘텐츠에서 바로 출발해 주세요.');return;}return f.apply(this,arguments);};}
const oldClaimRoom=claimRoom;claimRoom=function(r){
 if(!active())return oldClaimRoom.apply(this,arguments);
 if(!PJ.ready)return;
 return transact('legacyRoom',()=>{if((S.pairRoomClaims||[]).includes(String(r.id)))return;const n=S.sb.claimed.length;oldClaimRoom(r);if(S.sb.claimed.length>n){if(!S.pairRoomClaims)S.pairRoomClaims=[];S.pairRoomClaims.push(String(r.id));}});
};
const oldMarket=marketRpc;marketRpc=function(action,data){if(!active())return oldMarket.apply(this,arguments);return enqueue(async()=>{if(PJ.pending.length){const saved=await transact('profile',()=>{},false);if(!saved)throw Error('공동 기록을 저장하지 못해 중개소 조회를 중단했습니다.');}const key='mmjy_pair_market_pending_'+ACCT.id,signature=JSON.stringify([action,data]);let pending;try{pending=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}if(action!=='snapshot'){if(!pending||pending.signature!==signature)pending={signature,request:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(pending));data={...data,pp_request:pending.request};}try{const r=await oldMarket(action,data);if(action!=='snapshot')localStorage.removeItem(key);await read();oldSave();return r;}catch(e){showError(e);throw e;}});};
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
for(const v of ['plaza','outing','pairhub','class','exam','quest','tower','guard','wboss','arena','bag','stats','hallv']){const f=VIEWS[v];if(!f)continue;VIEWS[v]=function(){const old=PJ.combat;PJ.combat=['tower','guard','wboss','quest','arena'].includes(v)&&PJ.ready;try{let html=f.apply(this,arguments);if(PJ.ready)html=html.replace(/통행패 (\d+)\/3/g,'통행패 $1/6').replace(/통행패 <b>(\d+) \/ 3<\/b>/g,'통행패 <b>$1 / 6</b>').replace('12시간마다 한 장씩 발급되며 최대 3장','12시간마다 두 장씩 발급되며 페어 최대 6장');if(v==='wboss'&&PJ.ready)html=html.replace('/3 · 공격','/6 · 공동 공격').replace('최대 3장','페어 최대 6장');const box=document.createElement('div');box.innerHTML=html;const h=box.querySelector('.page-head');if(h){box.prepend(h);h.insertAdjacentHTML('afterend',card());return box.innerHTML;}return card()+html;}finally{PJ.combat=old;}};}
setInterval(()=>{if(active()&&!PJ.busy&&!PJ.depth&&document.visibilityState!=='hidden')init();},10000);
// A sleeping browser tab does not need background polling. Refresh immediately
// when the player returns, and flush any locally queued save on tab switch.
document.addEventListener('visibilitychange',()=>{
 if(!active())return;
 if(document.visibilityState==='visible'){PJ.lastPoll=0;init();}
 else if(PJ.ready&&PJ.pending.length)acctPush(true);
});
})();
