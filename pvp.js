"use strict";
/* 無明長夜 · 1:1 PvP 연무장
 * 유저끼리 방을 만들고, Supabase RPC가 순서·주사위·체력을 판정합니다.
 * 한 라운드 = 선공 공격/후공 방어 또는 회피/후공 반격/선공 방어 또는 회피.
 * 최대 3라운드, 동일 체력이면 무승부입니다.
 */
const PVP={rooms:[],records:[],mine:null,messages:[],loaded:false,busy:false,
  fetching:false,fetchAt:0,openId:null,error:"",chatSending:false};
function pvpAvailable(){return typeof sbOn==='function'&&sbOn()&&typeof acctIn==='function'&&acctIn();}
function pvpRpc(name,args){
  if(!pvpAvailable())return Promise.reject(new Error('PvP는 공유 기록과 계정 로그인이 필요합니다.'));
  return sbSend('POST','rpc/'+name,{p_user:ACCT.id,p_token:ACCT.tok,...(args||{})});
}
function pvpStats(){
  const st={};
  for(const k of ['atk','def','agi','men','res'])st[k]=Math.max(1,Math.min(80,Math.round(effStat(k)||1)));
  return st;
}
function pvpError(err){
  let t=String(err&&err.message||err||'대련 연결 오류');
  if(t.includes('Could not find the function')||t.includes('PGRST202')||t.includes('404'))
    t='Supabase SQL Editor에서 「PvP-대련-설치.sql」을 먼저 실행해 주세요.';
  else if(t.includes('permission denied'))t='PvP SQL 접근 권한을 확인해 주세요.';
  else {try{const o=JSON.parse(t);t=o.message||t;}catch(e){} }
  return t.slice(0,240);
}
function pvpToastError(e){const t=pvpError(e);PVP.error=t;toast(esc(t),'bad');}
function pvpSafeId(id){const n=Number(id);return Number.isSafeInteger(n)&&n>0?n:null;}
function pvpRenderSoft(){
  const chat=document.getElementById('pvp-chat-items');
  const log=document.querySelector('.pvp-log');
  const chatY=chat?chat.scrollTop:0, logY=log?log.scrollTop:0;
  const chatEnd=!!chat&&chat.scrollHeight-chat.clientHeight-chat.scrollTop<30;
  const logEnd=!!log&&log.scrollHeight-log.clientHeight-log.scrollTop<30;
  const input=document.getElementById('pvp-chat-input');
  if(input&&input===document.activeElement)return; // 작성 중에는 입력란을 보존합니다.
  renderMain(true);
  const c2=document.getElementById('pvp-chat-items'), l2=document.querySelector('.pvp-log');
  if(c2)c2.scrollTop=chatEnd?c2.scrollHeight:chatY;
  if(l2)l2.scrollTop=logEnd?l2.scrollHeight:logY;
}
function pvpSync(force){
  if(!pvpAvailable()||PVP.fetching||PVP.busy)return;
  if(!force && Date.now()-PVP.fetchAt<2200)return;
  PVP.fetching=true;PVP.fetchAt=Date.now();
  pvpRpc('pvp_view',{p_room:PVP.openId||null}).then(data=>{
    PVP.error='';PVP.rooms=Array.isArray(data.rooms)?data.rooms:[];
    PVP.records=Array.isArray(data.records)?data.records:[];
    PVP.mine=data.mine||null;PVP.messages=Array.isArray(data.messages)?data.messages:[];
    PVP.loaded=true;
    if(VIEW==='duel')pvpRenderSoft();
  }).catch(e=>{
    PVP.error=pvpError(e);PVP.loaded=true;
    if(VIEW==='duel')pvpRenderSoft();
  }).finally(()=>{PVP.fetching=false;});
}
function pvpExecute(name,args,success){
  if(PVP.busy)return;
  PVP.busy=true;
  pvpRpc(name,args).then(result=>{
    PVP.error='';if(typeof success==='function')success(result);
    return pvpRpc('pvp_view',{p_room:PVP.openId||null});
  }).then(data=>{
    PVP.rooms=data.rooms||[];PVP.records=data.records||[];
    PVP.mine=data.mine||null;PVP.messages=data.messages||[];PVP.loaded=true;
    if(VIEW==='duel')renderMain();
  }).catch(pvpToastError).finally(()=>{
    PVP.busy=false;if(VIEW==='duel')renderMain(true);
  });
}
function pvpCreate(){
  const note=String(document.getElementById('pvp-room-note')?.value||'').trim().slice(0,90);
  pvpExecute('pvp_create',{p_name:S.name,p_stats:pvpStats(),p_note:note},id=>{
    PVP.openId=Number(id);toast('대련방을 열었어요. 다른 학생을 기다립니다.','good');
  });
}
function pvpJoin(id){
  id=pvpSafeId(id);if(!id)return;
  pvpExecute('pvp_join',{p_room:id,p_name:S.name,p_stats:pvpStats()},()=>{
    PVP.openId=id;toast('대련이 시작됐습니다.','good');
  });
}
function pvpOpen(id){
  id=pvpSafeId(id);if(!id)return;
  PVP.openId=id;PVP.mine=null;PVP.messages=[];renderMain();pvpSync(true);
}
function pvpBack(){PVP.openId=null;PVP.mine=null;PVP.messages=[];renderMain();pvpSync(true);}
function pvpAct(move){
  if(!PVP.mine||PVP.mine.status!=='active')return;
  pvpExecute('pvp_act',{p_room:Number(PVP.mine.id),p_move:move},res=>{
    if(res.done)toast('대련 결과가 나왔습니다.','good');
  });
}
function pvpLeave(){
  const r=PVP.mine;if(!r)return;
  const question=r.status==='waiting'?'대련방을 닫을까요?':'기권하면 상대방의 승리로 기록됩니다. 기권할까요?';
  if(!confirm(question))return;
  pvpExecute('pvp_leave',{p_room:Number(r.id)},()=>{
    if(r.status==='waiting')PVP.openId=null;
    toast(r.status==='waiting'?'대련방을 닫았습니다.':'기권했습니다.');
  });
}
function pvpChatSend(){
  const r=PVP.mine,input=document.getElementById('pvp-chat-input');
  if(!r||!input||PVP.chatSending)return;
  const body=input.value.trim();if(!body)return;
  PVP.chatSending=true;
  pvpRpc('pvp_say',{p_room:Number(r.id),p_body:body}).then(()=>{
    if(input.isConnected)input.value='';
    return pvpRpc('pvp_view',{p_room:Number(r.id)});
  }).then(data=>{
    PVP.mine=data.mine||null;PVP.messages=data.messages||[];
    if(VIEW==='duel')renderMain();
    const el=document.getElementById('pvp-chat-items');if(el)el.scrollTop=el.scrollHeight;
  }).catch(pvpToastError).finally(()=>{PVP.chatSending=false;});
}
function pvpChatKey(event){
  if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();pvpChatSend();}
}
function pvpName(r,id){return id===r.host_id?r.host_name:r.guest_name;}
function pvpFighter(r,role){
  const host=role==='host',name=host?r.host_name:r.guest_name||'입장 대기';
  const hp=host?r.host_hp:r.guest_hp;
  const st=host?r.host_stats:r.guest_stats;
  const first=r.first_id===(host?r.host_id:r.guest_id);
  return `<div class="pvp-fighter ${String(ACCT.id)===(host?r.host_id:r.guest_id)?'myself':''}">
    <div class="spread"><div><b>${esc(name)}</b> ${r.first_id?`<span class="tag ${first?'j':''}">${first?'선공':'후공'}</span>`:''}</div>
      <strong style="color:${hp<35?'var(--red)':'var(--jadeD)'}">${hp} / 100</strong></div>
    <div class="bar hp" style="margin:7px 0"><i style="width:${Math.max(0,Math.min(100,hp))}%"></i></div>
    ${st?`<div class="tiny muted">공격 ${st.atk} · 방어 ${st.def} · 민첩 ${st.agi}</div>`:'<div class="tiny muted">상대방 입장 전입니다.</div>'}
  </div>`;
}
function pvpPhase(r){
  if(r.status==='waiting')return {who:null,title:'상대 학생을 기다리고 있습니다.',action:'wait'};
  if(r.status==='done')return {who:null,title:r.winner_id?`${pvpName(r,r.winner_id)} 승리`:'무승부',action:'done'};
  if(r.status==='cancelled')return {who:null,title:'취소된 대련방',action:'done'};
  const first=r.first_id;const second=first===r.host_id?r.guest_id:r.host_id;
  const n=r.step%4,attacker=n<2?first:second;
  const defender=attacker===r.host_id?r.guest_id:r.host_id;
  const attackerName=pvpName(r,attacker);
  if(n%2===0)return {who:attacker,title:`${attackerName}의 공격 차례`,action:'attack'};
  return {who:defender,title:`${attackerName}의 공격! 방어 또는 회피 선택`,action:'react'};
}
function pvpActionPanel(r){
  const p=pvpPhase(r),myturn=String(p.who)===String(ACCT.id);
  if(r.status==='done'||r.status==='cancelled'){
    const name=r.winner_id?pvpName(r,r.winner_id):'무승부';
    return `<div class="pvp-result"><b>${r.winner_id?`${esc(name)} 승리`:'무승부'}</b>
      <div class="tiny muted">${esc(r.finish_reason||'대련이 종료됐습니다.')} · 최종 체력 ${r.host_hp} : ${r.guest_hp}</div></div>`;
  }
  if(r.status==='waiting')return `<div class="pvp-turn-wait">다른 학생이 입장하면 민첩 판정으로 선공을 정합니다.</div>`;
  return `<div class="pvp-turn-box">
    <div class="spread"><b>${esc(p.title)}</b><span class="tag ${myturn?'g':''}">${myturn?'내 차례':'상대 차례'}</span></div>
    ${myturn?`<div class="row" style="margin-top:10px">
      ${p.action==='attack'?`<button class="btn pri" onclick="pvpAct('attack')" ${PVP.busy?'disabled':''}>공격한다</button>`:
        `<button class="btn pri" onclick="pvpAct('defend')" ${PVP.busy?'disabled':''}>방어</button>
         <button class="btn" onclick="pvpAct('dodge')" ${PVP.busy?'disabled':''}>회피</button>`}
    </div>`:`<div class="tiny muted" style="margin-top:7px">상대의 행동을 기다리는 중입니다. 자동으로 갱신돼요.</div>`}
  </div>`;
}
function pvpBattleRoom(r){
  const logs=Array.isArray(r.events)?r.events:[];
  const messages=(PVP.messages||[]).slice().sort((a,b)=>Number(a.id)-Number(b.id));
  return `<div class="card pad" style="margin-bottom:14px">
    <div class="spread"><div class="sect-t" style="margin:0">${ic('swords',16)} 대련방 #${r.id}</div>
      <button class="btn sm ghost" onclick="pvpBack()">목록</button></div>
    <div class="tiny muted" style="margin:8px 0">${r.status==='waiting'?'입장 대기':r.status==='active'?`제 ${r.round_no} / 3 라운드 · ${r.step} / 12 행동 완료`:'대련 종료'} · 임시 체력 100, 실제 체력에 영향 없음</div>
    <div class="pvp-fighters">${pvpFighter(r,'host')}<span class="pvp-vs">VS</span>${pvpFighter(r,'guest')}</div>
    ${pvpActionPanel(r)}
    ${r.status==='waiting'||r.status==='active'?`<div class="row" style="margin-top:10px">
      <button class="btn sm ${r.status==='active'?'red':'ghost'}" onclick="pvpLeave()">${r.status==='waiting'?'방 닫기':'기권하기'}</button>
      <button class="btn sm ghost" onclick="pvpSync(true)">새로고침</button></div>`:''}
  </div>
  <div class="pvp-rooms-grid">
    <section class="card pad"><div class="sect-t">대련 판정 기록</div>
      <div class="pvp-log" role="log" aria-label="대련 기록">
        ${logs.length?logs.map(e=>`<div class="pvp-event ${e.kind==='done'?'final':''}">
          <span class="tiny muted">${e.round?`${e.round}라운드`:'시작'}</span> ${esc(e.text||'')}
        </div>`).join(''):'<div class="tiny muted">대련이 시작되면 판정 결과가 기록됩니다.</div>'}
      </div>
    </section>
    <section class="card pad"><div class="sect-t">${ic('message-circle',16)} 대련방 전용 채팅</div>
      <div class="pvp-chat" id="pvp-chat-items" role="log" aria-label="대련 채팅">
        ${messages.length?messages.map(m=>`<div class="pvp-chat-line ${m.sender_id===ACCT.id?'mine':''}">
          <b>${esc(m.sender_name)}</b><span>${esc(m.body).replace(/\n/g,'<br>')}</span></div>`).join(''):
          '<div class="tiny muted" style="padding:15px 0">방 참가자끼리 자유롭게 대화할 수 있어요.</div>'}
      </div>
      <div class="pvp-chat-compose"><textarea id="pvp-chat-input" maxlength="500" rows="2" class="inp"
        placeholder="대련 중 RP를 나눠 보세요. Enter 전송, Shift+Enter 줄바꿈" onkeydown="pvpChatKey(event)"></textarea>
        <button class="btn pri sm" onclick="pvpChatSend()" ${PVP.chatSending?'disabled':''}>전송</button></div>
    </section>
  </div>`;
}
function pvpView(){
  if(!pvpAvailable())return head('무기 · 법의 · 관 · 부적 · 경문',ic('swords')+' PvP 대련','1:1 턴제 대련')+
    `<div class="card pad"><b>공유 기록 연결과 로그인이 필요합니다.</b><div class="tiny muted" style="margin-top:8px">PvP는 같은 서버를 사용하는 두 계정이 필요해요. config.js에서 Supabase를 연결한 다음 계정으로 로그인해 주세요.</div></div>`;
  if(!PVP.loaded&&!PVP.fetching)pvpSync(true);
  const r=PVP.mine;
  const active=!!(r&&['waiting','active'].includes(r.status));
  const lobby=PVP.rooms.filter(x=>x.status==='waiting');
  const participating=PVP.rooms.some(x=>['waiting','active'].includes(x.status)
    && (x.host_id===ACCT.id||x.guest_id===ACCT.id));
  const intro=head('의뢰 · 전투 / 연무장',ic('swords')+' PvP 대련',`<span class="tag j">최대 3라운드</span>`)+`
    <div class="card pad" style="margin-bottom:14px">
      <div class="sect-t">대련 규칙</div>
      <div class="tiny muted" style="line-height:1.9">
        ① 선공 공격 → 후공 <b>방어 또는 회피</b> → ② 후공 반격 → 선공 <b>방어 또는 회피</b>가 한 라운드입니다.<br>
        최대 <b>3라운드</b>를 진행하고, 3라운드 안에 상대를 쓰러뜨리면 즉시 종료합니다.
        시간이 끝나면 <b>남은 임시 체력이 더 많은 사람 승리</b>, 같으면 무승부입니다.
        캐릭터 능력치는 참가할 때 고정되며, 판정은 서버에서 처리합니다. 실제 체력·이성·재화는 감소하지 않습니다.
      </div>
    </div>`;
  return intro+(PVP.error?`<div class="card pad" style="margin-bottom:12px;border-color:var(--red)">
      <div class="tiny" style="color:var(--red)">${esc(PVP.error)}</div>
      <button class="btn sm" style="margin-top:8px" onclick="pvpSync(true)">다시 연결</button></div>`:'')+
    (r?pvpBattleRoom(r):'')+
    (r&&active?'' : `<div class="card pad" style="margin-bottom:14px">
      <div class="spread"><div class="sect-t" style="margin:0">대련방 만들기</div>
        <button class="btn sm" onclick="pvpSync(true)">방 목록 새로고침</button></div>
      <div class="tiny muted" style="margin:6px 0 10px">방을 열고 한 명이 입장하면 자동으로 대련이 시작돼요. 다른 계정과만 대련할 수 있습니다.</div>
      <div class="pvp-create"><input class="inp" id="pvp-room-note" maxlength="90" placeholder="한마디 (선택)" />
        <button class="btn pri" onclick="pvpCreate()" ${PVP.busy||participating?'disabled':''}>${participating?'참가 중인 대련이 있습니다':'대련방 생성'}</button></div>
    </div>`)+`
    <div class="card pad" style="margin-bottom:14px">
      <div class="spread"><div class="sect-t" style="margin:0">입장 가능한 대련방</div><span class="tiny muted">${lobby.length}개 대기 중</span></div>
      ${lobby.length?lobby.map(x=>`<div class="pvp-lobby-row">
        <span><b>${esc(x.host_name)}</b>의 대련방 <span class="tiny muted">#${x.id}</span>
          ${x.note?`<div class="tiny muted">${esc(x.note)}</div>`:''}</span>
        ${x.host_id===ACCT.id?'<span class="tag j">내 방</span>':`<button class="btn sm pri" ${PVP.busy||participating?'disabled':''} onclick="pvpJoin(${Number(x.id)})">참가</button>`}
      </div>`).join(''):`<div class="tiny muted" style="padding:16px 0">대기 중인 방이 없어요. 먼저 대련방을 만들어 보세요.</div>`}
    </div>`+
    (PVP.records.length?`<div class="card pad"><div class="sect-t">내 최근 대련</div>
      ${PVP.records.map(x=>`<div class="pvp-lobby-row"><span><b>${esc(x.host_name)} vs ${esc(x.guest_name)}</b>
        <div class="tiny muted">${x.winner_id?'승부 결정':x.finish_reason?.includes('무승부')?'무승부':'종료'} · ${esc(x.finish_reason||'')}</div></span>
        <button class="btn sm" onclick="pvpOpen(${Number(x.id)})">기록 보기</button></div>`).join('')}</div>`:'')+
    (r&&!active?`<div class="row" style="margin-top:12px"><button class="btn" onclick="pvpBack()">새 대련 찾기</button></div>`:'');
}
VIEWS.duel=pvpView;
// 기존 실시간 채팅과 분리된, 대련방만의 짧은 폴링. 화면을 떠나면 조회하지 않습니다.
setInterval(()=>{if(typeof VIEW!=='undefined'&&VIEW==='duel'&&pvpAvailable())pvpSync(false);},3000);
