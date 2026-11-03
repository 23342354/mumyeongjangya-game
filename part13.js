"use strict";
/* 無明長夜 · 계정 저장 안전장치
 * - 실패한 서버 저장을 성공으로 표시하지 않음
 * - 실패 원문을 설정과 상단 상태로 제공
 * - 재로그인 시 미전송 로컬 기록을 별도 백업하여 무단 덮어쓰기를 방지
 * - 장터 marketRev 불일치는 임의로 자동 병합하지 않음
 */
const ACCOUNT_SYNC_META_PREFIX="mmjy_account_sync_v2_";
const ACCOUNT_SYNC_RECOVERY_PREFIX="mmjy_account_recovery_v2_";
let ACCOUNT_SYNC_SERIAL=0;
let ACCOUNT_SYNC_RUNNING=false;
let ACCOUNT_SYNC_PROMISE=Promise.resolve(false);
let ACCOUNT_SYNC_LAST_SUCCESS=0;
let ACCOUNT_SYNC_LAST_FAILURE=0;
let ACCOUNT_SYNC_NEXT_ATTEMPT=0;
let ACCOUNT_SYNC_LAST_TOAST=0;
let ACCOUNT_SYNC_LAST_ERROR="";
let ACCOUNT_SYNC_BACKUP_NOTICE=false;
function accountSyncKey(prefix){ return prefix+String(ACCT?.id||""); }
function accountSyncRead(prefix){
 try{return JSON.parse(localStorage.getItem(accountSyncKey(prefix))||"null");}catch(e){return null;}
}
function accountSyncWrite(prefix,value){
 try{localStorage.setItem(accountSyncKey(prefix),JSON.stringify(value));return true;}
 catch(e){return false;}
}
function accountSyncMeta(){return accountSyncRead(ACCOUNT_SYNC_META_PREFIX)||{};}
function accountSyncSetMeta(updates){
 if(!acctIn())return;
 const previous=accountSyncMeta();
 accountSyncWrite(ACCOUNT_SYNC_META_PREFIX,Object.assign(previous,updates));
}
function accountSyncMessage(e){
 const raw=String(e?.message||e||"원인 불명");
 try{const obj=JSON.parse(raw);return String(obj?.message||obj?.details||raw).slice(0,240);}
 catch(err){return raw.slice(0,240);}
}
function accountSyncBackup(snapshot,reason,details=""){
 if(!acctIn()||!snapshot?.made||!snapshot?.sb||String(snapshot.sb.id||"")!==String(ACCT.id))return false;
 const previous=accountSyncRead(ACCOUNT_SYNC_RECOVERY_PREFIX);
 // 이미 별도 보관한 기록이 더 최신이라면 이전 기록으로 덮지 않습니다.
 if(previous?.save?.made && Number(previous.save.lastReal||0)>Number(snapshot.lastReal||0))return true;
 const ok=accountSyncWrite(ACCOUNT_SYNC_RECOVERY_PREFIX,{
  at:Date.now(),reason:String(reason||"미전송 기록"),details:String(details||"").slice(0,180),
  save:snapshot
 });
 if(ok)ACCOUNT_SYNC_BACKUP_NOTICE=true;
 return ok;
}
function accountSyncRecovery(){return accountSyncRead(ACCOUNT_SYNC_RECOVERY_PREFIX);}
const _saveAccountSafe13=save;
save=function(...args){
 const result=_saveAccountSafe13.apply(this,args);
 if(typeof acctIn==="function"&&acctIn()&&S?.made){
  ACCOUNT_SYNC_SERIAL++;
  accountSyncSetMeta({pending:true,localAt:Date.now()});
 }
 return result;
};

// 게임 기록 저장은 기존 RPC를 사용하며, 400을 무시하거나 장터 보호 검사를 해제하지 않습니다.
acctPush=function(force){
 if(!acctIn()||!acctOn()||!S?.made)return Promise.resolve(false);
 if(ACCOUNT_SYNC_RUNNING){
  return force?ACCOUNT_SYNC_PROMISE.then(ok=>ok&&accountSyncMeta().pending?acctPush(true):ok):ACCOUNT_SYNC_PROMISE;
 }
 const now=Date.now(),state=accountSyncMeta();
 if(!force){
  // 게임 시계·회복치는 save() 호출 없이도 변하므로 1분마다 실제 서버 동기화를 시도합니다.
  if(now<ACCOUNT_SYNC_NEXT_ATTEMPT||now-ACCOUNT_SYNC_LAST_SUCCESS<60000)
   return Promise.resolve(!state.pending && !state.error);
 }
 let blob;
 try{blob=JSON.parse(JSON.stringify(S));}catch(e){return Promise.resolve(false);}
 if(!blob.sb)blob.sb={};
 blob.sb.id=ACCT.id;
 const serial=ACCOUNT_SYNC_SERIAL;
 ACCOUNT_SYNC_RUNNING=true;
 ACCOUNT_SYNC_PROMISE=acctRpc('save',{
  p_id:ACCT.id,p_token:ACCT.tok,p_save:blob,p_name:S.name||''
 }).then(result=>{
  if(!result||result.ok!==true)throw new Error('계정 저장 완료 여부를 확인할 수 없습니다.');
  const at=Date.now();
  ACCOUNT_SYNC_LAST_SUCCESS=at;ACCOUNT_SYNC_LAST_FAILURE=0;
  ACCOUNT_SYNC_LAST_ERROR="";ACCOUNT_SYNC_NEXT_ATTEMPT=0;
  PUSHERROR=null;PUSHAT=at;
  accountSyncSetMeta({pending:ACCOUNT_SYNC_SERIAL!==serial,lastSuccess:at,error:"",errorAt:0});
  return true;
 }).catch(e=>{
  const message=accountSyncMessage(e),at=Date.now();
  ACCOUNT_SYNC_LAST_FAILURE=at;ACCOUNT_SYNC_LAST_ERROR=message;
  ACCOUNT_SYNC_NEXT_ATTEMPT=at+30000;
  PUSHERROR=e;PUSHAT=0;
  accountSyncSetMeta({pending:true,error:message,errorAt:at});
  accountSyncBackup(blob,'서버 저장 실패',message);
  if(at-ACCOUNT_SYNC_LAST_TOAST>120000&&typeof toast==="function"){
   ACCOUNT_SYNC_LAST_TOAST=at;
   const text=message.includes('MARKET_STALE_SAVE')
    ? '중개소 거래 후 저장본 버전이 달라 서버 저장이 거부됐습니다. 설정에서 로컬 기록을 백업해 주세요.'
    : '계정 서버 저장에 실패했습니다. 설정 → 계정 저장 상태에서 오류를 확인하고 기록을 백업해 주세요.';
   toast(text,'bad');
  }
  return false;
 }).finally(()=>{ACCOUNT_SYNC_RUNNING=false;});
 return ACCOUNT_SYNC_PROMISE;
};

const _acctBootSafe13=acctBoot;
acctBoot=function(blob){
 let local=null,shouldWarn=false;
 try{local=JSON.parse(localStorage.getItem(SAVEKEY)||"null");}catch(e){}
 if(acctIn()&&local?.made&&String(local.sb?.id||"")===String(ACCT.id)){
  const meta=accountSyncMeta();
  const serverTime=Number(blob?.lastReal||0);
  const localTime=Number(local.lastReal||0);
  // 이전 서버 저장 실패 표식 또는 서버보다 훨씬 최신인 로컬 기록이 있으면 먼저 따로 보관합니다.
  if(meta.pending||localTime>serverTime+90000){
   accountSyncBackup(local,'재로그인 전에 발견한 로컬 기록',meta.error||'서버 최신 기록과 차이가 있습니다.');
   shouldWarn=true;
  }
 }
 const result=_acctBootSafe13(blob);
 if(acctIn()){
  const meta=accountSyncMeta();
  ACCOUNT_SYNC_LAST_SUCCESS=Number(meta.lastSuccess||0);
  ACCOUNT_SYNC_LAST_ERROR=String(meta.error||"");
  // 재로그인에서 서버 데이터를 불러왔다면 실패 백업은 절대 자동으로 덮어씌우지 않습니다.
  if(shouldWarn){
   ACCOUNT_SYNC_BACKUP_NOTICE=true;
   setTimeout(()=>{
    if(typeof toast==='function')toast('최근 기기 기록을 별도로 보관했습니다. 설정 → 계정 저장 상태에서 백업을 내려받아 주세요.','bad');
   },850);
  }
 }
 return result;
};

function accountSyncStatusText(){
 if(!acctIn())return '계정 로그인 전';
 if(ACCOUNT_SYNC_RUNNING)return '서버 저장 중';
 const meta=accountSyncMeta();
 if(meta.error)return '서버 저장 실패';
 if(meta.pending)return '서버 반영 대기';
 return meta.lastSuccess?'서버 저장 완료':'서버 저장 확인 전';
}
function accountSyncTime(ms){
 if(!ms)return '기록 없음';
 try{return new Date(Number(ms)).toLocaleString('ko-KR');}catch(e){return '기록 없음';}
}
function accountSyncDownloadRecovery(){
 const r=accountSyncRecovery();
 if(!r?.save){toast('별도로 보관된 복구 기록이 없습니다. 현재 기록은 설정의 기록 복사로 백업할 수 있어요.','bad');return;}
 try{
  const data=JSON.stringify(r.save,null,2);
  const blob=new Blob([data],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='무명장야-로컬복구-'+String(ACCT.id).replace(/[^a-z0-9_]/g,'')+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('로컬 복구 기록을 다운로드했습니다. 서버에 자동 덮어쓰지는 않습니다.','good');
 }catch(e){toast('다운로드에 실패했습니다. 현재 기록은 기록 복사로 백업해 주세요.','bad');}
}
function accountSyncSaveNow(){
 acctPush(true).then(ok=>{
  toast(ok?'계정 서버 저장 완료':'서버 저장 실패 · 오류를 확인하고 로컬 기록을 백업해 주세요.',ok?'good':'bad');
  openSettings();
 });
}
function accountSyncBackupNow(){
 if(!acctIn()||!S?.made)return;
 const blob=JSON.parse(JSON.stringify(S));blob.sb=blob.sb||{};blob.sb.id=ACCT.id;
 const ok=accountSyncBackup(blob,'운영진/러너 수동 백업');
 if(ok){accountSyncDownloadRecovery();}else{toast('별도 저장 공간이 부족할 수 있어요. 설정 → 기록 복사를 사용해 주세요.','bad');}
}
const _openSettingsAccountSafe13=openSettings;
openSettings=function(){
 _openSettingsAccountSafe13();
 if(!acctIn()||!acctOn())return;
 const target=document.querySelector('.modal .mbody, .modal');
 if(!target)return;
 const meta=accountSyncMeta(),r=accountSyncRecovery();
 const box=document.createElement('div');box.className='card pad';box.style.marginTop='12px';
 box.innerHTML=`<div class="sect-t">계정 서버 저장 상태</div>
  <div class="tiny" style="color:${meta.error?'var(--red)':meta.pending?'var(--gold)':'var(--jade)'}"><b>${esc(accountSyncStatusText())}</b></div>
  <div class="tiny muted" style="margin-top:5px">마지막 서버 저장 성공: ${esc(accountSyncTime(meta.lastSuccess))}</div>
  ${meta.error?`<div class="tiny" style="margin-top:8px;color:var(--red);white-space:pre-wrap;overflow-wrap:anywhere">${esc(meta.error)}</div>`:''}
  ${r?.save?`<div class="tiny muted" style="margin-top:8px">별도로 보관한 로컬 기록이 있습니다 (${esc(accountSyncTime(r.at))}). 로그인 시 서버 기록으로 덮어쓰지 않도록 보관한 백업이며, 자동 복원하지 않습니다.</div>`:''}
  <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px">
   <button class="btn sm pri" onclick="accountSyncSaveNow()">서버 저장 재시도</button>
   <button class="btn sm" onclick="accountSyncBackupNow()">현재 기록 백업 다운로드</button>
   ${r?.save?'<button class="btn sm" onclick="accountSyncDownloadRecovery()">이전 로컬 기록 다운로드</button>':''}
  </div>
  <div class="tiny muted" style="margin-top:8px">중개소 거래 기록과 충돌할 경우 원본 보호를 위해 자동 병합하지 않습니다. MARKET_STALE_SAVE 오류가 뜨면 보관된 기록을 운영진에게 확인받아 주세요.</div>`;
 target.appendChild(box);
};

// 기존 상단바 기능은 유지하면서 서버 저장 실패만 상단에 표시합니다.
const _renderTopAccountSafe13=renderTop;
renderTop=function(...args){
 const result=_renderTopAccountSafe13.apply(this,args);
 if(!acctIn()||!S?.made)return result;
 const meta=accountSyncMeta();
 if(!meta.error)return result;
 const top=document.querySelector('#topbar .tb1');
 if(!top)return result;
 const chip=document.createElement('button');
 chip.className='btn sm red';chip.type='button';chip.style.cssText='font-size:10px;padding:5px 7px;white-space:nowrap;';
 chip.textContent='서버 저장 실패';chip.title='설정에서 계정 저장 상태와 로컬 백업을 확인할 수 있습니다.';
 chip.onclick=()=>openSettings();
 top.appendChild(chip);
 return result;
};
