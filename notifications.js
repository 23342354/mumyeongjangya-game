/* Attached notification tracks. Preferences are local to this browser. */
const SOUND_FILES={pair:'sounds/pair.mp3',activity:'sounds/activity.mp3',chat:'sounds/chat.mp3'};
let SOUND_PREF={pair:true,activity:true,chat:true,volume:0.6};
try{Object.assign(SOUND_PREF,JSON.parse(localStorage.getItem('samujeon-sounds')||'{}'));}catch(e){}
let SOUND_READY=false,SOUND_LAST=0,SOUND_ACTIVE=null;
document.addEventListener('pointerdown',()=>{SOUND_READY=true;},{passive:true});
document.addEventListener('keydown',()=>{SOUND_READY=true;});
function notifySound(kind,test=false){
 if(!SOUND_FILES[kind]||(!test&&(!SOUND_READY||!SOUND_PREF[kind]||typeof QUIET!=='undefined'&&QUIET)))return;
 if(!test&&Date.now()-SOUND_LAST<1500)return;
 SOUND_LAST=Date.now();
 if(SOUND_ACTIVE){SOUND_ACTIVE.pause();SOUND_ACTIVE=null;}
 const a=new Audio(SOUND_FILES[kind]);a.volume=Math.max(0,Math.min(1,Number(SOUND_PREF.volume)||0));SOUND_ACTIVE=a;
 a.play().catch(()=>{if(test)toast('소리를 재생하지 못했습니다. 브라우저 소리 권한을 확인해 주세요.');});
}
function incomingSoundKind(r){
 if(r.tab==='페어'&&r.scope===chatScope('페어')&&r.scope)return 'pair';
 if(r.tab==='전체')return 'chat';
 if(['이웃','계통'].includes(r.tab)&&r.scope===chatScope(r.tab))return 'chat';
 return null;
}
function setSoundPreference(key,value){SOUND_PREF[key]=value;try{localStorage.setItem('samujeon-sounds',JSON.stringify(SOUND_PREF));}catch(e){}}
function soundSettingsHTML(){return `<div class="sect-t">알림음</div><div class="tiny muted">화면을 한 번 누른 뒤 새 알림부터 재생됩니다. 지난 채팅과 오프라인 수업에는 울리지 않습니다.</div>${[['pair','페어 채팅'],['activity','수업 종료 · 의뢰 완료'],['chat','전체 · 이웃 · 계통 채팅']].map(([k,n])=>`<div class="spread" style="margin-top:10px"><label><input type="checkbox" ${SOUND_PREF[k]?'checked':''} onchange="setSoundPreference('${k}',this.checked)"> ${n}</label><button class="btn sm" onclick="notifySound('${k}',true)">미리 듣기</button></div>`).join('')}<label class="row" style="margin-top:12px">음량 <input aria-label="알림음 음량" type="range" min="0" max="1" step="0.05" value="${SOUND_PREF.volume}" oninput="setSoundPreference('volume',Number(this.value))"></label><hr class="hr">`;}
