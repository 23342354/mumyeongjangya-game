"use strict";
/* 無明長夜 · 종료한 브라우저에서도 수신하는 Web Push / 서비스 워커. */
const PUSH12_CATEGORIES=[['soc','페어·RP·인연'],['farm','텃밭'],['trade','중개소'],['run','의뢰·전투'],['study','수업'],['home','거처']];
const PUSH12_VIEWS=new Set(['plaza','pairhub','rpboard','rel','market','farm','class','quest','hallv','record','research']);
const PUSH12_DEFAULT={soc:true,farm:true,trade:true,run:true,study:true,home:true,etc:false};
let PUSH12_REG=null,PUSH12_ENABLED=false,PUSH12_BUSY=false,PUSH12_ERROR='',PUSH12_SERVER_READY=false;
let PUSH12_PREFERENCES={...PUSH12_DEFAULT};
let PUSH12_PUBLIC_KEY='';
let PUSH12_LAST_PULL=0;
function push12Account(){return (typeof acctIn==='function'&&acctIn()&&typeof ACCT==='object')?String(ACCT.id):'';}
function push12Key(){return 'mmjy-web-push-v1:'+push12Account();}
function push12ReadPrefs(){
 PUSH12_PREFERENCES={...PUSH12_DEFAULT};
 try{Object.assign(PUSH12_PREFERENCES,JSON.parse(localStorage.getItem(push12Key())||'{}'));}catch(e){}
}
function push12StorePrefs(){try{localStorage.setItem(push12Key(),JSON.stringify(PUSH12_PREFERENCES));}catch(e){}}
function push12Supported(){return !!(window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);}
function push12Config(){const cfg=typeof acctCfg==='function'?acctCfg():{url:'',key:''};return cfg;}
function push12Url(){const c=push12Config();return c.url?c.url.replace(/\/+$/,'')+'/functions/v1/samu-push':'';}
async function push12Request(action,opts={}){
 const cfg=push12Config();if(!cfg.url||!cfg.key)throw new Error('Supabase 계정 연결이 필요합니다.');
 const payload={action,...opts};
 if(action!=='public-key'){
  if(!push12Account()||!ACCT.tok)throw new Error('로그인 후 알림을 켜 주세요.');
  payload.actor=push12Account();payload.token=ACCT.tok;
 }
 let res;
 try{res=await fetch(push12Url(),{
  method:'POST',headers:{'content-type':'application/json',apikey:cfg.key},
  body:JSON.stringify(payload),cache:'no-store',
 });}catch(e){
  throw new Error('푸시 서버 호출 차단 · Supabase samu-push의 Verify JWT를 끄고 OPTIONS/CORS 응답을 확인해 주세요.');
 }
 let out={};try{out=await res.json();}catch(e){}
 if(!res.ok||out.ok===false)throw new Error(String(out.error||('알림 서버 응답 '+res.status)).slice(0,180));
 return out;
}
function push12DecodeKey(base64url){
 const raw=atob(base64url.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-base64url.length%4)%4));
 return Uint8Array.from(raw,ch=>ch.charCodeAt(0));
}
async function push12RegisterWorker(){
 if(!push12Supported())throw new Error('이 브라우저에서는 Web Push를 사용할 수 없습니다. HTTPS 연결을 확인해 주세요.');
 PUSH12_REG=await navigator.serviceWorker.register('notification-worker.js?v=20261103-webpush1',{scope:'./'});
 return PUSH12_REG;
}
async function push12Enable(){
 if(PUSH12_BUSY)return;
 if(!push12Supported()){toast('HTTPS·Service Worker·Push API를 지원하는 브라우저가 필요합니다.','bad');return;}
 if(!push12Account()){toast('사무전 계정으로 로그인해야 푸시 알림을 받을 수 있어요.','bad');return;}
 PUSH12_BUSY=true;PUSH12_ERROR='';
 try{
  // iPhone의 알림 권한 요청은 버튼 클릭이 직접 발생한 시점에 수행해야 합니다.
  const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
  if(permission!=='granted')throw new Error('알림 권한이 차단됐습니다. 사이트 권한에서 허용으로 변경해 주세요.');
  const key=await push12Request('public-key');
  if(!key.publicKey||!key.ready)throw new Error('운영진의 VAPID 서버 설정이 아직 완료되지 않았습니다.');
  PUSH12_PUBLIC_KEY=key.publicKey;
  const reg=await push12RegisterWorker();
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:push12DecodeKey(PUSH12_PUBLIC_KEY)});
  push12ReadPrefs();
  await push12Request('subscribe',{subscription:sub.toJSON(),categories:PUSH12_PREFERENCES});
  PUSH12_ENABLED=true;PUSH12_SERVER_READY=true;
  toast('사이트를 닫아도 받는 푸시 알림을 켰습니다.','good');
  push12PullHistory(true).catch(()=>{});
 }catch(e){
  PUSH12_ERROR=String(e.message||e);
  toast('Web Push 설정 실패 · '+PUSH12_ERROR,'bad');
 }finally{PUSH12_BUSY=false;drawAlerts();}
}
async function push12Disable(closeModalAfter=false){
 if(PUSH12_BUSY)return;
 PUSH12_BUSY=true;
 try{
  const reg=PUSH12_REG||await navigator.serviceWorker.getRegistration('./');
  const sub=await reg?.pushManager?.getSubscription();
  if(sub){
   const endpoint=sub.endpoint;
   await sub.unsubscribe(); // 먼저 브라우저 구독을 끊어 다른 계정의 소식이 이 기기에 도착하지 않게 합니다.
   try{await push12Request('unsubscribe',{endpoint});}catch(e){console.warn('구독 해제 서버 동기화 지연',e);}
  }
  PUSH12_ENABLED=false;
  toast('이 기기의 푸시 알림을 껐습니다.','good');
 }catch(e){PUSH12_ERROR=String(e.message||e);toast('구독 해제 실패 · '+PUSH12_ERROR,'bad');}
 finally{PUSH12_BUSY=false;if(!closeModalAfter)drawAlerts();}
}
async function push12Test(){
 if(!PUSH12_ENABLED){toast('먼저 푸시 알림을 켜 주세요.','bad');return;}
 try{
  const reg=PUSH12_REG||await navigator.serviceWorker.getRegistration('./');
  const sub=await reg?.pushManager?.getSubscription();
  if(!sub)throw new Error('브라우저 구독이 없습니다.');
  await push12Request('test',{endpoint:sub.endpoint});
  toast('시험 푸시를 서버에서 전송했어. 기기 알림을 확인해 주세요.','good');
 }catch(e){toast('시험 알림 실패 · '+String(e.message||e),'bad');}
}
async function push12SetCategory(k,on){
 if(!(k in PUSH12_DEFAULT))return;
 PUSH12_PREFERENCES[k]=!!on;push12StorePrefs();
 if(PUSH12_ENABLED){
  try{
   const reg=PUSH12_REG||await navigator.serviceWorker.getRegistration('./');
   const sub=await reg?.pushManager?.getSubscription();
   if(sub)await push12Request('subscribe',{subscription:sub.toJSON(),categories:PUSH12_PREFERENCES});
  }catch(e){toast('알림 항목 변경을 서버에 저장하지 못했습니다.','bad');}
 }
}
function push12Status(){
 if(!window.isSecureContext)return 'HTTPS 연결이 필요합니다.';
 if(!push12Supported())return '이 브라우저에서 Web Push를 지원하지 않습니다. iPhone은 홈 화면에 추가한 뒤 실행해 주세요.';
 if(Notification.permission==='denied')return '브라우저 알림이 차단되어 있습니다. 주소창의 사이트 권한을 변경해 주세요.';
 if(!push12Account())return '계정으로 로그인하면 이 기기에 알림을 연결할 수 있어요.';
 if(PUSH12_ENABLED)return '이 기기에서 Web Push 구독 중 · 사이트를 닫아도 서버 소식이 도착할 수 있어요.';
 return PUSH12_ERROR||'버튼을 눌러 이 기기의 Web Push를 켜 주세요.';
}
async function push12Probe(){
 if(!push12Supported()||!push12Account())return;
 push12ReadPrefs();
 try{
  const reg=await push12RegisterWorker();
  const sub=await reg.pushManager.getSubscription();
  PUSH12_ENABLED=!!sub && Notification.permission==='granted';
  if(PUSH12_ENABLED){
   // 다른 계정에서 같은 브라우저를 썼다면 현재 로그인 계정으로 수신자를 갱신합니다.
   PUSH12_ENABLED=false;
   await push12Request('subscribe',{subscription:sub.toJSON(),categories:PUSH12_PREFERENCES});
   PUSH12_ENABLED=true;PUSH12_SERVER_READY=true;
   await push12PullHistory();
  }
 }catch(e){PUSH12_ENABLED=false;PUSH12_ERROR=String(e.message||e);}
}
async function push12PullHistory(force=false){
 if(!push12Account()||!PUSH12_ENABLED||!S?.made)return;
 if(!force&&Date.now()-PUSH12_LAST_PULL<60000)return;
 PUSH12_LAST_PULL=Date.now();
 try{
  const data=await push12Request('history');
  if(!Array.isArray(data.events))return;
  alertsEnsure();
  const known=new Set(S.alerts.map(a=>a.i));
  let changed=false;
  for(const r of [...data.events].reverse()){
   const id='serverpush-'+r.id;
   const created=Date.parse(String(r.created_at||''));
   // 서버 기록은 알림함 삭제 이후에도 전송 로그로 남아 있을 수 있습니다.
   // 매번 현재 삭제 시점을 확인하여, 조회와 삭제가 겹쳐도 예전 알림이 부활하지 않게 합니다.
   if(!Number.isFinite(created)||created<=alertClearedAt()||known.has(id))continue;
   const category=String(r.category||'etc');
   S.alerts.unshift({i:id,c:category,t:'['+String(r.title||'소식')+'] '+String(r.body||''),
     at:created,v:PUSH12_VIEWS.has(r.destination)?r.destination:''});
   known.add(id);
   changed=true;
  }
  if(changed){S.alerts.sort((a,b)=>b.at-a.at);S.alerts=S.alerts.slice(0,250);alertBadge();save();}
 }catch(e){/* 서버가 잠시 꺼져 있어도 기존 알림함은 유지합니다. */}
}
const _drawAlerts12=drawAlerts;
drawAlerts=function(){
 _drawAlerts12();
 const body=document.querySelector('.modal .mbody');if(!body)return;
 const box=document.createElement('div');box.className='card pad';box.style.marginBottom='12px';
 box.innerHTML=`<div class="spread"><b>사이트를 닫아도 받는 알림 · Web Push</b>
   <span class="tag ${PUSH12_ENABLED?'g':''}">${PUSH12_ENABLED?'구독 중':'미구독'}</span></div>
   <div class="tiny muted" style="line-height:1.75;margin:8px 0">${esc(push12Status())}</div>
   <div class="row" style="gap:7px;flex-wrap:wrap">
    <button class="btn sm ${PUSH12_ENABLED?'':'pri'}" onclick="push12Enable()" ${PUSH12_BUSY?'disabled':''}>푸시 알림 켜기</button>
    <button class="btn sm" onclick="push12Disable()" ${PUSH12_BUSY||!PUSH12_ENABLED?'disabled':''}>이 기기에서 끄기</button>
    <button class="btn sm ghost" onclick="push12Test()" ${!PUSH12_ENABLED?'disabled':''}>서버 시험 발송</button>
   </div>
   <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px">
    ${PUSH12_CATEGORIES.map(([key,name])=>`<label class="tiny"><input type="checkbox" ${PUSH12_PREFERENCES[key]?'checked':''} onchange="push12SetCategory('${key}',this.checked)"> ${name}</label>`).join('')}
   </div>
   <div class="tiny muted" style="line-height:1.7;margin-top:9px">페어·1:1 채팅, RP 답글, 인연 신청, 중개소 판매, 텃밭 수확 시점을 서버에서 감지합니다. 텃밭은 마지막으로 계정에 동기화한 심기·비료 기록을 기준으로 합니다. 운영진이 SQL·Edge Function·Webhook을 설치해야 실제로 도착합니다.</div>`;
 body.prepend(box);
};
/* 브라우저가 열린 채로 백그라운드에 있을 때 발생하는 로컬 완료 알림은 유지. */
const _alertPush12=alertPush;
alertPush=function(cat,t,view){
 _alertPush12(cat,t,view);
 if(!document.hidden||!push12Supported()||Notification.permission!=='granted'||!PUSH12_ENABLED)return;
 if(!['study','run','home'].includes(cat))return;
 const reg=PUSH12_REG;
 if(reg)reg.showNotification('無明長夜 · '+(ALERTCATS.find(x=>x.k===cat)?.n||'알림'),{
  body:String(t||'').replace(/<[^>]*>/g,'').slice(0,140),icon:'favicon-180.png',
  tag:'mmjy-local-'+cat, data:{url:'./?pushView='+encodeURIComponent(PUSH12_VIEWS.has(view)?view:'plaza')}
 }).catch(()=>{});
};
/* 알림을 눌러 이미 열린 사이트로 돌아오는 경우의 탭 이동. */
function push12OpenView(view){
 if(!PUSH12_VIEWS.has(view)||!S?.made)return;
 if(typeof go==='function')go(view);
}
if('serviceWorker' in navigator){navigator.serviceWorker.addEventListener('message',event=>{
 if(event.data?.type==='mmjy-push-open')push12OpenView(event.data.view);
});}
function push12HandleQuery(){
 try{const url=new URL(location.href);const view=url.searchParams.get('pushView');
  if(!view||!S?.made)return;
  if(PUSH12_VIEWS.has(view))push12OpenView(view);
  url.searchParams.delete('pushView');history.replaceState(null,'',url.toString());
 }catch(e){}
}
/* 토양 데이터는 브라우저를 닫기 전에 계정 저장본으로 동기화합니다. */
const _farmPlantCore12=farmPlantCore;
farmPlantCore=function(i,id){
 const ok=_farmPlantCore12(i,id);
 if(ok&&S.farm?.plots?.[i])S.farm.plots[i].pushPlantedAt=String(Date.now())+'-'+Math.random().toString(36).slice(2,8);
 return ok;
};
function push12FarmSave(){if(typeof acctPush==='function'&&typeof acctIn==='function'&&acctIn())acctPush(true).catch(()=>{});}
for(const name of ['plant','plantAll','harvest','farmSeedBuy11','farmFertiliserApply11']){
 if(typeof window[name]==='function'){
  const original=window[name];window[name]=function(...args){const result=original.apply(this,args);push12FarmSave();return result;};
 }
}
/* 수업·연구·의뢰를 시작하거나 취소할 때도 서버에 최신 종료 시각을 알려 줍니다. */
for(const [name,field] of [['startLesson','lesson'],['quickLesson','lesson'],['startStudy','study'],['startRun','run']]){
 if(typeof window[name]==='function'){
  const original=window[name];window[name]=function(...args){
   const previous=S?.[field];
   const result=original.apply(this,args);
   if(S?.[field] && S[field]!==previous && typeof S[field]==='object')S[field].pushStartedAt=String(Date.now())+'-'+Math.random().toString(36).slice(2,8);
   save();push12FarmSave();return result;
  };
 }
}
if(typeof finishPeriod==='function'){
 const _finishPeriodPush12=finishPeriod;
 finishPeriod=function(...args){
  const old=S?.lesson,idx=old?.idx;
  const result=_finishPeriodPush12.apply(this,args);
  if(S?.lesson===old && S.lesson.idx!==idx){
   S.lesson.pushStartedAt=String(Date.now())+'-'+Math.random().toString(36).slice(2,8);
   save();push12FarmSave();
  }else if(!S?.lesson){push12FarmSave();}
  return result;
 };
}
for(const name of ['stopLesson','finishResearch','cancelStudy','cutStudy','runReturn','runClear']){
 if(typeof window[name]==='function'){
  const original=window[name];window[name]=function(...args){const result=original.apply(this,args);save();push12FarmSave();return result;};
 }
}
/* 로그아웃 전에 브라우저의 이전 계정 푸시를 해제합니다. */
if(typeof acctLogout==='function'){
 const _acctLogout12=acctLogout;
 acctLogout=async function(){await push12Disable(true);_acctLogout12();};
}
const _boot12=boot;
boot=function(){
 _boot12();
 push12HandleQuery();
 push12Probe().catch(()=>{});
};
setInterval(()=>{if(S?.made&&PUSH12_ENABLED)push12PullHistory().catch(()=>{});},60000);
