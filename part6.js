"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 6
   공유 기록(학생 명부 · 랭킹) · 함께 가기(방)
   Supabase 에 연결했을 때만 동작하며, 연결 전에는 기존 혼자 모드 그대로입니다.
   ═══════════════════════════════════════════════════ */

function ensureV6(){
  if(!S.sb) S.sb={url:"", key:"", id:"", on:false, state:"idle", err:"",
                  roster:[], rosterAt:0, rooms:[], roomsAt:0, myRoom:null, claimed:[], upAt:0};
  if(!S.sb.claimed) S.sb.claimed=[];
  if(S.sb.chatId===undefined) S.sb.chatId=0;
  if(!S.sb.id) S.sb.id = "S"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  // 이전 버전은 NPC 대사를 각자의 저장 기록에만 넣었습니다. 남아 있는 로컬 잔상을 제거합니다.
  // 서버 ID가 있는 NPC 발언은 삭제하지 않으며, 다른 러너의 실제 채팅도 건드리지 않습니다.
  if(Array.isArray(S.msgs)) S.msgs=S.msgs.filter(m=>!(m && m.tab==="전체" && !m.sid && Object.prototype.hasOwnProperty.call(NPC, m.who)));
  // 운영진이 config.js에 적어 둔 값을 그대로 씁니다 (러너는 입력할 필요 없음)
  const CF=window.MMJY_CONFIG||{};
  if(!S.sb.manual){
    if(CF.supabaseUrl) S.sb.url=String(CF.supabaseUrl).replace(/\/+$/,"");
    if(CF.supabaseKey) S.sb.key=String(CF.supabaseKey);
  }
}
function sbOn(){ return !!(S.sb && S.sb.url && S.sb.key); }
function sbHead(extra){
  return Object.assign({apikey:S.sb.key, Authorization:"Bearer "+S.sb.key}, extra||{});
}
function sbGet(path){
  return fetch(S.sb.url+"/rest/v1/"+path, {headers:sbHead()})
    .then(async r=>{ const t=await r.text();
      if(!r.ok) throw new Error(t.slice(0,160)||("HTTP "+r.status));
      return t?JSON.parse(t):[]; });
}
function sbSend(method, path, body, prefer){
  return fetch(S.sb.url+"/rest/v1/"+path, {
    method, headers:sbHead({"Content-Type":"application/json", Prefer:prefer||"return=representation"}),
    body: body!==undefined?JSON.stringify(body):undefined
  }).then(async r=>{ const t=await r.text();
    if(!r.ok) throw new Error(t.slice(0,160)||("HTTP "+r.status));
    return t?JSON.parse(t):[]; });
}
function sbErr(e){
  S.sb.state="err"; S.sb.err=String(e&&e.message||e);
  if(["roster","rank","hallv","tower","guard","board"].includes(VIEW)) renderMain();
}

/* ─── 내 기록 올리기 ─── */
function myRecord(){
  const c=C();
  return {
    id:S.sb.id, name:S.name, course:S.course, lvl:S.lvl,
    power:power(), dps:c.dps, hpv:c.hp,
    line:S.line, weapon:S.line==="마무기"?(S.weapon||""):"", hall:S.hall, title:S.title,
    intro:S.intro||"", av:S.av, av_img:(S.avImg||"").slice(0,120000),
    tower:S.tower||0, guard:S.tower2||0, arena_best:S.arena.best||0,
    quest:S.quests.cleared||0, dexp:(typeof dexScore==="function"?dexScore():0),
    ach:(S.ach||[]).length, war:S.war.mine||0,
    wb_dmg:(S.wb&&S.wb.dmg)||0,
    /* 페어에게 보여 줄 현황 */
    home_stage:(S.home&&S.home.stage)||0,
    home_due:Number(S.home&&S.home.due)||0,
    home_late:(typeof rentLate==="function") ? !!rentLate() : false,
    run_ward:(S.run&&!S.run.done) ? (S.run.q.ward.n||"") : "",
    run_stage:(S.run&&!S.run.done) ? (S.run.q.stage||0) : 0,
    run_left:(S.run&&!S.run.done) ? Math.max(0,Math.round(S.run.left)) : 0,
    run_kills:(S.run&&!S.run.done) ? (S.run.kills||0) : 0,
    updated_at:new Date().toISOString()
  };
}
function syncUp(force){
  if(!sbOn()) return Promise.resolve();
  const now=Date.now();
  if(!force && S.sb.upAt && now-S.sb.upAt<90000) return Promise.resolve();
  S.sb.upAt=now;
  return sbSend("POST","students?on_conflict=id", [myRecord()], "resolution=merge-duplicates,return=minimal")
    .then(()=>{ S.sb.state="ok"; S.sb.err=""; })
    .catch(sbErr);
}
/* ─── 명부 불러오기 ─── */
function syncRoster(force){
  if(!sbOn()) return;
  const now=Date.now();
  if(!force && S.sb.rosterAt && now-S.sb.rosterAt<30000) return;
  S.sb.rosterAt=now;
  sbGet("students?select=*&order=power.desc&limit=200")
    .then(rows=>{ S.sb.roster=rows||[]; S.sb.state="ok"; S.sb.err="";
      if(["roster","rank","hallv"].includes(VIEW)) renderMain(); save(); })
    .catch(sbErr);
}
/* ─── 방 목록 ─── */
function syncRooms(force){
  if(!sbOn()) return;
  const now=Date.now();
  if(!force && S.sb.roomsAt && now-S.sb.roomsAt<4000) return;
  S.sb.roomsAt=now;
  sbGet("rooms?select=*,room_members(*)&order=created_at.desc&limit=40")
    .then(rows=>{
      S.sb.rooms=rows||[];
      const mine=(rows||[]).find(r=>(r.room_members||[]).some(m=>m.student_id===S.sb.id) && r.status!=="done");
      S.sb.myRoom=mine?mine.id:null;
      (rows||[]).forEach(r=>{ if(r.status==="done" && r.result) claimRoom(r); });
      S.sb.state="ok"; S.sb.err="";
      if(VIEW==="tower" || VIEW==="guard" || (VIEW==="quest" && S.sb.myRoom && (S.sb.rooms||[]).some(x=>x.id===S.sb.myRoom && x.kind==="quest"))) renderMain(true);
    })
    .catch(sbErr);
}

/* ─── 방 만들기 · 참가 · 나가기 ─── */
const RKIND={tower:{n:"석탑",e:ic("tower")}, guard:{n:"결계의 탑",e:ic("shield")}, quest:{n:"의뢰",e:ic("swords")}};
function roomCreate(kind,stage,note){
  if(!sbOn()){ toast("먼저 공유 기록을 연결해 주세요.","bad"); return; }
  if(S.sb.myRoom){ toast("이미 들어가 있는 방이 있습니다.","bad"); return; }
  // 의뢰에는 이미 별도의 인연·교사 동행 기능이 있습니다. 온라인 합동방은 탑 2종에만 만듭니다.
  if(kind!=="tower" && kind!=="guard") { toast("이 콘텐츠에서는 새 합동방을 만들 수 없습니다.","bad"); return; }
  stage=Number(stage);
  if(!Number.isInteger(stage) || stage<1 || stage>999){ toast("1~999층 중에서 골라 주세요.","bad"); return; }
  sbSend("POST","rooms",[{kind, stage, host_id:S.sb.id, host_name:S.name, note:String(note||"").slice(0,40)}])
    .then(rows=>{
      const r=rows[0];
      return sbSend("POST","room_members",[roomMe(r.id)],"return=minimal").then(()=>r);
    })
    .then(r=>{ S.sb.myRoom=r.id; closeModal(); toast("방을 열었습니다. 다른 학생이 들어오기를 기다립니다.","good");
      syncRooms(true); save(); })
    .catch(e=>{ toast("방을 열지 못했습니다 · "+esc(String(e.message||e)),"bad"); sbErr(e); });
}
function roomMe(roomId){
  const c=C();
  return {room_id:roomId, student_id:S.sb.id, name:S.name, course:S.course,
          power:power(), dps:c.dps, hpv:c.hp};
}
function roomJoin(id){
  if(S.sb.myRoom){ toast("이미 들어가 있는 방이 있습니다.","bad"); return; }
  const room=S.sb.rooms.find(r=>r.id===id);
  if(!room){ toast("방 목록을 새로 고친 뒤 다시 들어가 주세요.","bad"); return; }
  if(room.kind==="quest" && !questCheck(room.stage)) return;
  sbSend("POST","room_members?on_conflict=room_id,student_id",[roomMe(id)],"resolution=merge-duplicates,return=minimal")
    .then(()=>{ S.sb.myRoom=id; toast("방에 들어갔습니다."); syncRooms(true); save(); })
    .catch(e=>{ toast("들어가지 못했습니다 · "+esc(String(e.message||e)),"bad"); });
}
function roomLeave(id){
  sbSend("DELETE",`room_members?room_id=eq.${id}&student_id=eq.${S.sb.id}`,undefined,"return=minimal")
    .then(()=>{ S.sb.myRoom=null; toast("방에서 나왔습니다."); syncRooms(true); save(); })
    .catch(e=>toast("나가지 못했습니다 · "+esc(String(e.message||e)),"bad"));
}
function roomClose(id){
  if(!confirm("방을 닫을까요? 들어온 학생들도 함께 해산합니다.")) return;
  sbSend("DELETE",`rooms?id=eq.${id}`,undefined,"return=minimal")
    .then(()=>{ S.sb.myRoom=null; toast("방을 닫았습니다."); syncRooms(true); save(); })
    .catch(e=>toast("닫지 못했습니다 · "+esc(String(e.message||e)),"bad"));
}

/* ─── 출발 — 참가자 전원의 힘을 합산해 판정 ─── */
function roomDepart(id){
  const r=S.sb.rooms.find(x=>x.id===id); if(!r) return;
  if(r.kind==="quest" && !questCheck(r.stage)) return;
  const ms=r.room_members||[];
  if(!ms.length){ toast("아무도 없습니다.","bad"); return; }
  const dps=ms.reduce((a,m)=>a+(+m.dps||0),0);
  const hp =ms.reduce((a,m)=>a+(+m.hpv||0),0);
  const K=r.kind, st=r.stage;
  let win=false, line="", sec=0, sust=0;
  if(K==="tower"){
    const f=towerFoe(st);
    sec=f.hp/Math.max(1,dps);
    sust=hp/Math.max(1,f.dps*0.55);           // 여럿이 나눠 맞으므로 피해가 분산됩니다
    win = sec<=60 && sust>=Math.min(60,sec);
    line=`합산 초당 피해 ${nf(dps)} · 합산 생명력 ${nf(hp)}\n${st}층 체력 ${nf(f.hp)} → 제압 ${sec<=60?sec.toFixed(1)+"초":"60초 안에 불가"} / 버팀 ${sust.toFixed(1)}초`;
  }else if(K==="guard"){
    const f=guardFoe(st);
    sust=hp/Math.max(1,f.dps*0.55);
    win=sust>=30;
    line=`합산 생명력 ${nf(hp)} · ${st}층 초당 피해 ${nf(f.dps)} → 버틴 시간 ${Math.min(99,sust).toFixed(1)}초 / 30초`;
  }else{
    const q=questAt(st);
    const need=Math.round((70+st*26)*q.foes*1.6);
    sec=need/Math.max(1,dps);
    win=sec<=90;
    line=`합산 초당 피해 ${nf(dps)} · 적 ${q.foes}체 체력 ${nf(need)} → 정리 ${sec.toFixed(1)}초`;
  }
  const res={win, kind:K, stage:st, dps, hp, line,
             members:ms.map(m=>({id:m.student_id, name:m.name, dps:+m.dps||0})),
             at:new Date().toISOString()};
  sbSend("PATCH",`rooms?id=eq.${id}`,{status:"done", result:res},"return=minimal")
    .then(()=>{ toast(win?"돌파했습니다. 참가자 모두에게 기록됩니다.":"막혔습니다.", win?"good":"bad");
      syncRooms(true); })
    .catch(e=>toast("출발하지 못했습니다 · "+esc(String(e.message||e)),"bad"));
}

/* ─── 결과 수령 ─── */
function claimRoom(r){
  if(!r.result) return;
  if(S.sb.claimed.includes(r.id)) return;
  const mine=(r.result.members||[]).some(m=>m.id===S.sb.id);
  if(!mine) return;
  S.sb.claimed.push(r.id);
  const res=r.result, n=(res.members||[]).length||1;
  if(res.win){
    if(res.kind==="tower"){
      if(res.stage>(S.tower||0)) S.tower=res.stage;
      gainRin(Math.round((1200+res.stage*260)*1.5)); S.sari+=res.stage%5===0?1:0;
      S.mat.가루+=4;
    }else if(res.kind==="guard"){
      if(res.stage>(S.tower2||0)) S.tower2=res.stage;
      gainRin(Math.round((700+res.stage*210)*1.5));
    }else{
      questRecordClear(res.stage);
      gainRin(Math.round((120+res.stage*48)*1.6)); ct&&ct("quest");
    }
    const it=mkGear(Math.round(res.stage*1.3+S.lvl*.3),undefined,true); S.bag.push(it);
    gainExp(Math.round(300+res.stage*140));
    S.lotus+=1; S.war.mine=(S.war.mine||0)+30; addMark(10);
    toast(`<b>함께 ${RKIND[res.kind].n} ${res.stage}${res.kind==="quest"?"단계":"층"}</b> 돌파 · ${n}명 · 법구 「${it.name}」`,"good");
    pushNews(`[합동] ${(res.members||[]).map(m=>m.name).join(" · ")}이(가) ${RKIND[res.kind].n} ${res.stage}${res.kind==="quest"?"단계":"층"}을 돌파했습니다.`);
  }else{
    damageHP(rnd(8,20)); damageSN(rnd(5,14));
    toast(`함께 ${RKIND[res.kind].n} ${res.stage}${res.kind==="quest"?"단계":"층"} — 막혔습니다.`,"bad");
  }
  achCheck&&achCheck(); renderTop(); renderNav(); save(); syncUp(true);
}

/* ═══════════ 석탑·결계의 탑 전용 온라인 동행 ═══════════ */
/* 이전 버전의 여러 콘텐츠를 한꺼번에 보이던 페이지를 더 이상 사용하지 않습니다.
   기존에 만들어진 의뢰 서버방은 아래 legacyQuestRoom()에서 참가자에 한해 정리할 수 있습니다. */
function coopRoomCard(r){
  const ms=r.room_members||[];
  const joined=ms.some(m=>m.student_id===S.sb.id), host=r.host_id===S.sb.id;
  const dps=ms.reduce((a,m)=>a+(Number(m.dps)||0),0);
  const hp=ms.reduce((a,m)=>a+(Number(m.hpv)||0),0);
  const unit=r.kind==="quest"?"단계":"층";
  return `<article class="coop-room ${joined?"joined":""}">
    <div class="spread coop-room-top"><div><b>${esc(r.host_name||"방장")}</b>님의 ${Number(r.stage)||1}${unit}
      ${host?'<span class="tag g">내 방</span>':joined?'<span class="tag j">참가 중</span>':""}</div>
      <span class="tag">${ms.length} / 4명</span></div>
    ${r.note?`<div class="tiny muted coop-note">${esc(r.note)}</div>`:""}
    <div class="coop-members">${ms.length?ms.map(m=>`<span class="buffchip" ${m.student_id===S.sb.id?'style="border-color:var(--gold2)"':""}>${esc(m.name||"학생")}</span>`).join(""):"<span class='tiny muted'>참가자를 기다립니다</span>"}</div>
    <div class="tiny muted">합산 초당 피해 <b>${nf(dps)}</b> · 생명력 <b>${nf(hp)}</b></div>
    <div class="row coop-actions">
      ${host?`<button class="btn pri sm" onclick="roomDepart(${Number(r.id)})">출발</button>
               <button class="btn sm ghost" onclick="roomClose(${Number(r.id)})">방 닫기</button>`
       :joined?`<button class="btn sm" onclick="roomLeave(${Number(r.id)})">나가기</button><span class="tiny muted">방장 출발 대기</span>`
       :`<button class="btn pri sm" ${S.sb.myRoom?'disabled title="다른 방에 참가 중입니다"':""} onclick="roomJoin(${Number(r.id)})">참가하기</button>`}
    </div>
  </article>`;
}
function coopRoomPanel(kind){
  if(kind!=="tower" && kind!=="guard") return "";
  const K=RKIND[kind], rooms=(S.sb?.rooms||[]).filter(r=>r.kind===kind && r.status!=="done");
  const records=(S.sb?.rooms||[]).filter(r=>r.kind===kind && r.status==="done" && r.result).slice(0,3);
  const mine=S.sb?.myRoom&&(S.sb.rooms||[]).find(r=>r.id===S.sb.myRoom && r.status!=="done");
  return `<section class="card pad coop-panel" aria-label="${K.n} 같이 가기">
    <div class="coop-panel-head">
      <div><div class="sect-t" style="margin:0">${ic("handshake",16)} 함께 ${K.n} 오르기
        <span class="tag">온라인 동행 · 최대 4명</span></div>
        <div class="tiny muted" style="margin-top:4px">같은 탑에 도전할 러너를 모집합니다. 혼자 도전은 위 버튼을 이용하세요.</div></div>
      ${sbOn()?`<button class="btn sm ghost" onclick="syncRooms(true)">새로 고침</button>`:""}
    </div>
    ${!sbOn()?`<div class="coop-empty"><div class="tiny muted">다른 러너와 함께 오르려면 공유 기록 연결이 필요합니다.</div>
        <button class="btn sm" style="margin-top:9px" onclick="sbConnect()">공유 기록 연결</button></div>`:
      `<div class="coop-start">
         <div class="tiny muted">열린 ${K.n} 방 <b>${rooms.length}개</b> · 참가자 전원의 공격력과 생명력을 합산해 돌파를 판정합니다.</div>
         <button class="btn pri" ${S.sb.myRoom?'disabled':''} onclick="roomMake('${kind}')">${K.n} 방 열기</button>
       </div>
       ${mine&&mine.kind!==kind?`<div class="coop-other tiny">지금 <b>${RKIND[mine.kind]?.n||"다른 콘텐츠"} ${mine.stage}${mine.kind==="quest"?"단계":"층"}</b> 방에 참가 중입니다.
         <button class="btn sm ghost" onclick="go('${mine.kind==='quest'?'quest':mine.kind}')">참가 중인 방으로 이동</button></div>`:""}
       ${S.sb.state==="err"?`<div class="tiny" style="color:var(--red)">연결 확인: ${esc(S.sb.err||"일시적인 연결 오류")}</div>`:""}
       <div class="coop-room-list">${rooms.length?rooms.map(coopRoomCard).join(""):
         `<div class="coop-empty tiny muted">모집 중인 방이 없습니다. 첫 번째 ${K.n} 방을 열어 보세요.</div>`}</div>
       ${records.length?`<details class="coop-history"><summary>최근 ${K.n} 합동 기록 ${records.length}건</summary>
           ${records.map(r=>`<div class="spread tiny"><span>${Number(r.result.stage)||1}층 · ${(r.result.members||[]).map(m=>esc(m.name)).join(" · ")}</span>
             <span class="row" style="align-items:center;gap:6px"><span class="tag ${r.result.win?"j":"r"}">${r.result.win?"돌파":"실패"}</span>
             <button class="btn sm ghost" onclick="coopOpen('${String(r.id).replace(/'/g,"")}')">일지</button></span></div>`).join("")}</details>`:""}`}
  </section>`;
}
function roomMake(kind){
  if(kind!=="tower" && kind!=="guard") { toast("석탑 또는 결계의 탑에서 동행방을 열어 주세요.","bad"); return; }
  const K=RKIND[kind];
  const suggest=kind==="tower"?(S.tower||0)+1:(S.tower2||0)+1;
  modal(`${K.e} ${K.n} 합동 방 열기`, `
    <div class="tiny muted">${K.n}에서 함께 도전할 층을 선택합니다. 상대의 진행 상황과 관계없이 합동 판정 결과가 각각의 기록에 반영됩니다.</div>
    <label class="f">도전할 층</label>
    <input class="inp" id="r_stage" type="number" min="1" max="999" value="${Math.min(suggest,999)}">
    <label class="f">모집 메모 (선택 · 40자)</label>
    <input class="inp" id="r_note" maxlength="40" placeholder="예: 수호 성향 한 분 더!">
    <div class="row" style="margin-top:14px">
      <button class="btn pri" onclick="roomCreate('${kind}', Number(document.getElementById('r_stage').value), document.getElementById('r_note').value)">모집 시작</button>
      <button class="btn" onclick="closeModal()">취소</button></div>`);
}
function legacyQuestRoom(){
  /* 이전 서버 합동 의뢰 방에 이미 참가한 사람만 마무리할 수 있게 남겨 둡니다.
     새 합동 의뢰 방은 생성하지 않습니다. 기존 의뢰의 인연·교사 동행과 겹치기 때문입니다. */
  if(!sbOn() || !S.sb.myRoom) return "";
  const r=(S.sb.rooms||[]).find(x=>x.id===S.sb.myRoom && x.kind==="quest" && x.status!=="done");
  if(!r) return "";
  return `<details class="card pad coop-legacy" style="margin-bottom:12px">
    <summary><b>이전에 참여한 합동 의뢰 방</b> · ${Number(r.stage)||1}단계 <span class="tiny muted">기존 방 마무리</span></summary>
    <div class="tiny muted" style="margin:9px 0">이전 버전에서 만든 온라인 의뢰방입니다. 현재 새 의뢰 동행은 아래 기존 기능을 사용합니다.</div>
    ${coopRoomCard(r)}
  </details>`;
}

/* ═══════════ 화면 — 학생 명부 ═══════════ */
function sbStateChip(){
  if(!sbOn()) return `<span class="tag">연결 안 됨</span>`;
  if(S.sb.state==="err") return `<span class="tag r">연결 실패</span>`;
  return `<span class="tag j">연결됨</span>`;
}
/* 학생 명부는 수락된 페어 두 사람을 한 묶음으로 정렬합니다.
   페어가 먼저 나오고, 페어 없는 학생들은 기존 전투력 순서를 유지합니다.
   계정 ID로만 비교하며 아직 명부에 오르지 않은 상대는 임의로 만들지 않습니다. */
function rosterGroupedByPair(rows){
  const list=Array.isArray(rows)?rows:[];
  const byId=new Map(list.map(r=>[String(r.id),r]));
  const used=new Set(), groups=[];
  const accepted=(typeof SOCIAL!=="undefined" && SOCIAL.ready && Array.isArray(SOCIAL.pairs))?SOCIAL.pairs:[];
  const mine=(typeof pairEnsure==="function")?pairEnsure().mine:null;
  const pairs=[...accepted];
  if(mine && mine.status==="accepted")pairs.push(mine);
  for(const pair of pairs){
    if(!pair || pair.status!=="accepted")continue;
    const a=String(pair.from_id??""),b=String(pair.to_id??"");
    if(!a || !b || a===b || used.has(a) || used.has(b))continue;
    const first=byId.get(a),second=byId.get(b);
    if(!first || !second)continue;
    used.add(a);used.add(b);
    const two=[first,second].sort((x,y)=>list.indexOf(x)-list.indexOf(y));
    groups.push({order:Math.min(list.indexOf(first),list.indexOf(second)),two});
  }
  groups.sort((a,b)=>a.order-b.order);
  return [...groups.flatMap(g=>g.two),...list.filter(r=>!used.has(String(r.id)))];
}
VIEWS.roster=()=>{
  if(!sbOn()) return head("사무전 학생 명부",ic("users")+" 학생 명부","공유 기록이 연결되지 않았습니다")+`
    <div class="card pad" style="border-color:var(--gold2)">
      <div class="tiny muted" style="line-height:1.9">연결하면 같은 커뮤니티의 러너들이 여기에 나타납니다.
      지금은 교류 화면에 보이는 학생들이 모두 NPC입니다.</div>
      <button class="btn pri" style="margin-top:12px" onclick="sbConnect()">공유 기록 연결</button></div>`;
  const rows=S.sb.roster||[];
  const orderedRows=rosterGroupedByPair(rows);
  const ago=t=>{ const d=(Date.now()-new Date(t).getTime())/60000;
    return d<2?"방금":d<60?Math.floor(d)+"분 전":d<1440?Math.floor(d/60)+"시간 전":Math.floor(d/1440)+"일 전"; };
  return head("사무전 학생 명부",ic("users")+" 학생 명부", `${sbStateChip()} · ${rows.length}명`)+`
  <div class="card pad" style="margin-bottom:12px;padding:10px 14px">
    <div class="tiny muted">같은 건의함·명부를 쓰는 러너들입니다. 내 기록은 몇 분마다 자동으로 올라갑니다.</div>
    <button class="btn sm" style="margin-top:8px" onclick="syncRoster(true);syncUp(true)">지금 올리고 새로 고침</button>
  </div>
  ${rows.length?`<div class="roster-viewport"><div class="grid roster-grid">
    ${orderedRows.map(r=>{
      const hall=homeOf(r.hall);
      const me=r.id===S.sb.id;
      const paired=typeof SOCIAL!=="undefined" && SOCIAL.ready && SOCIAL.pairs.some(p=>p.status==="accepted"&&[String(p.from_id),String(p.to_id)].includes(String(r.id)));
      return `<div class="sub roster-card ${paired?"roster-card-paired":""}" style="${me?"border-color:var(--gold2)":""}">
        <div class="roster-card-top">
          ${r.av_img?`<div class="roster-avatar" style="border-color:${hall?hall.c:"var(--gold)"}">
            <img src="${r.av_img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>`
            :`<div class="roster-avatar" style="border-color:${hall?hall.c:"var(--gold)"};display:grid;place-items:center;background:var(--s0)">${ic(r.av||"lantern",22)}</div>`}
          <div class="roster-identity">
            <div class="tiny roster-title" style="color:var(--gold)">${esc(r.title||"")}</div>
            <b class="roster-name">${esc(r.name)}</b> ${me?'<span class="tag g">나</span>':""}
            <div class="tiny muted">${hall?hall.n:""} · ${r.course}과정 · Lv ${r.lvl} · ${esc(r.line||"")}</div>
          </div>
        </div>
        ${r.intro?`<div class="tiny muted roster-intro">${esc(r.intro)}</div>`:""}
        <div class="roster-power"><span class="tiny muted">전투력</span><b style="color:var(--gold)">${nf(r.power)}</b></div>
        <div class="tiny muted roster-progress">석탑 ${r.tower}층 · 결계 ${r.guard}층 · 의뢰 ${r.quest}단계 · 업적 ${r.ach}</div>
        <div class="tiny muted" style="color:var(--s6)">${ago(r.updated_at)}</div>
        ${pairBtn(r)}
      </div>`}).join("")}
  </div></div>`:`<div class="card pad"><div class="tiny muted" style="padding:14px 2px;text-align:center">
    아직 올라온 학생이 없습니다. 「지금 올리고 새로 고침」을 눌러 보세요.</div></div>`}`;
};

/* ═══════════ 랭킹 · 거주지 — 진짜 기록으로 ═══════════ */
const _rank=VIEWS.rank;
VIEWS.rank=()=>{
  if(!sbOn() || !(S.sb.roster||[]).length) return _rank();
  const R=[...S.sb.roster];
  const tbl=(title, key, unit, sortFn)=>{
    const rows=[...R].sort(sortFn||((a,b)=>b[key]-a[key])).slice(0,12);
    const myIdx=[...R].sort(sortFn||((a,b)=>b[key]-a[key])).findIndex(x=>x.id===S.sb.id);
    return `<div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">${title}</div>
        <span class="tiny muted">내 순위 ${myIdx>=0?myIdx+1:"—"}위 / ${R.length}명</span></div>
      <table class="t">${rows.map((r,i)=>`<tr${r.id===S.sb.id?' style="background:var(--s2)"':""}>
        <td style="width:26px">${i+1}</td>
        <td>${r.id===S.sb.id?`<b style="color:var(--gold)">${esc(r.name)}</b>`:esc(r.name)}
          <span class="tiny muted">${r.course}과정 · Lv ${r.lvl}</span></td>
        <td style="text-align:right">${nf(r[key])}${unit||""}</td></tr>`).join("")}</table></div>`;
  };
  return head("사무전의 기록",ic("medal")+" 랭킹", `${sbStateChip()} · 학생 ${R.length}명`)+`
  <div class="card pad" style="margin-bottom:12px;padding:10px 14px">
    <div class="tiny muted">같은 커뮤니티 러너들의 실제 기록입니다. 물약·만두 같은 시간제 효과는 전투력에 포함되지 않습니다.</div>
    <button class="btn sm" style="margin-top:8px" onclick="syncUp(true);syncRoster(true)">내 기록 올리기</button>
  </div>
  <div class="grid g2" style="margin-bottom:12px">
    ${tbl("전투력 순위","power")}
    ${tbl("석탑 순위","tower","층")}
  </div>
  <div class="grid g3">
    ${tbl("결계의 탑","guard","층")}
    ${tbl("의뢰 단계","quest","단계")}
    ${tbl("도감 점수","dexp")}
  </div>`;
};
/* 거주지 대항전 집계는 없어졌습니다 — 거처는 각자 짓습니다 */

/* ═══════════ 건의함 — Supabase 경로 ═══════════ */
const _boardFetch=boardFetch;
boardFetch=function(force){
  if(S.board && S.board.url) return _boardFetch(force);
  if(!sbOn()) return;
  const now=Date.now();
  if(!force && S.board.last && now-S.board.last<20000) return;
  S.board.last=now; S.board.state="loading";
  sbGet("suggestions_public?select=*&order=created_at.desc&limit=200")
    .then(rows=>{
      S.board.cache=(rows||[]).map(r=>({id:r.id, time:r.created_at, name:r.name, cat:r.cat,
        title:r.title, body:r.body, secret:r.secret?1:0, likes:r.likes, status:r.status,
        has_reply:!!(r.has_reply || (r.reply&&String(r.reply).trim())),
        reply:r.secret?"":String(r.reply||"")}));
      S.board.state="ok"; S.board.err="";
      if(VIEW==="board") renderMain(); save();
    })
    .catch(e=>{ S.board.state="err"; S.board.err=String(e.message||e); if(VIEW==="board") renderMain(); });
};
const _boardOn=boardOn;
boardOn=function(){ return _boardOn() || sbOn(); };
const _boardSubmit=boardSubmit;
boardSubmit=function(){
  if(S.board && S.board.url) return _boardSubmit();
  if(!sbOn()) return _boardSubmit();
  const name=($("#b_name").value||"").trim()||"이름 없는 차사";
  const cat=$("#b_cat").value, title=($("#b_title").value||"").trim();
  const body=($("#b_body").value||"").trim(), secret=$("#b_secret").checked;
  if(!title){ toast("제목을 적어 주세요.","bad"); return; }
  if(!body){ toast("내용을 적어 주세요.","bad"); return; }
  S.board.name=name;
  let receipt="";
  if(secret){try{receipt=boardNewReceipt();}catch(e){toast(String(e.message||e),"bad");return;}}
  const btn=$("#b_go"); if(btn){ btn.disabled=true; btn.textContent="보내는 중…"; }
  sbSend("POST","rpc/submit_private_readable_suggestion",
    {p_name:name,p_cat:cat,p_title:title,p_body:body,p_secret:secret,p_receipt:receipt})
    .then(id=>{
      if(id===undefined||id===null||id==="") throw Error("서버에서 글 번호를 받지 못했습니다.");
      if(secret) boardPrivateSubmitted(id,receipt);
      else{closeModal();toast("건의함에 올렸습니다. 고맙습니다.","good");}
      boardFetch(true);
    })
    .catch(e=>{ if(btn){ btn.disabled=false; btn.textContent="올리기"; }
      toast("보내지 못했습니다 · "+esc(String(e.message||e)),"bad"); });
};
const _boardLike=boardLike;
boardLike=function(id){
  if(S.board && S.board.url) return _boardLike(id);
  if(!sbOn()) return _boardLike(id);
  if(S.board.liked.includes(String(id))){ toast("이미 공감했습니다."); return; }
  S.board.liked.push(String(id));
  const r=(S.board.cache||[]).find(x=>String(x.id)===String(id));
  const nv=(r?+r.likes:0)+1; if(r) r.likes=nv;
  renderMain(); save();
  sbSend("POST","rpc/bump_suggestion_like",{p_id:Number(id)})
    .then(count=>{if(r && Number.isFinite(+count)){r.likes=+count;if(VIEW==="board")renderMain();save();}})
    .catch(()=>{if(r){r.likes=Math.max(0,nv-1);if(VIEW==="board")renderMain();save();}toast("공감을 저장하지 못했습니다. SQL 설치를 확인해 주세요.","bad");});
};

/* ═══════════ 연결 설정 ═══════════ */
function sbConnect(){
  modal("공유 기록 연결", `
    <div class="tiny muted" style="line-height:1.9;margin-bottom:12px">
      Supabase 에 연결하면 <b>학생 명부 · 진짜 랭킹 · 함께 가기 · 건의함</b>이 모두 함께 돌아갑니다.
      주소와 키를 만드는 방법은 함께 드린 안내서 「공유 기록 연결하기」를 보세요.<br>
      <b style="color:var(--red)">키는 웹 페이지에 그대로 실리므로 누구나 볼 수 있습니다.</b>
      서로 믿는 커뮤니티 안에서 쓰는 용도이며, 민감한 내용은 넣지 마세요.
    </div>
    <label class="f">Project URL</label>
    <input class="inp" id="sb_url" value="${esc(S.sb.url||"")}" placeholder="https://xxxxxxxx.supabase.co">
    <label class="f">anon public key</label>
    <textarea class="inp" id="sb_key" style="min-height:70px;font-size:11px" placeholder="eyJhbGciOi...">${esc(S.sb.key||"")}</textarea>
    <label class="f">내 학생 번호 <span class="muted">— 기기를 바꿀 때 이 번호를 그대로 적으면 같은 사람으로 이어집니다</span></label>
    <input class="inp" id="sb_id" value="${esc(S.sb.id||"")}">
    <div class="row" style="margin-top:14px">
      <button class="btn pri" onclick="sbSaveURL()">저장하고 확인</button>
      <button class="btn" onclick="closeModal()">취소</button>
      ${sbOn()?`<button class="btn red" style="margin-left:auto" onclick="sbClear()">연결 끊기</button>`:""}
    </div>`,"wide");
}
function sbSaveURL(){
  const u=($("#sb_url").value||"").trim().replace(/\/+$/,"");
  const k=($("#sb_key").value||"").trim();
  const id=($("#sb_id").value||"").trim();
  if(id) S.sb.id=id;
  S.sb.url=u; S.sb.key=k; S.sb.manual=true; S.sb.state="idle"; S.sb.err=""; S.sb.roster=[]; S.sb.rooms=[];
  S.sb.rosterAt=0; S.sb.roomsAt=0; S.sb.upAt=0;
  save(); closeModal(); renderNav(); renderMain();
  if(u&&k){ toast("연결 정보를 저장했습니다. 기록을 올립니다.");
    syncUp(true).then(()=>{ syncRoster(true); syncRooms(true); }); }
  else toast("연결을 해제했습니다. 혼자 모드로 돌아갑니다.");
}
function sbClear(){
  if(!confirm("연결을 끊을까요? 내 캐릭터 기록은 그대로 남습니다.")) return;
  S.sb.url=""; S.sb.key=""; S.sb.manual=true; S.sb.roster=[]; S.sb.rooms=[]; S.sb.myRoom=null;
  save(); closeModal(); renderNav(); renderMain(); toast("혼자 모드로 돌아갑니다.");
}

/* ═══════════ 주기 작업 ═══════════ */
const _step6=step;
step=function(m){
  _step6(m);
  if(!S||!S.made||!S.sb||!sbOn()) return;
  if(Math.random()<0.02*m) syncUp(false);
  if(VIEW==="tower" || VIEW==="guard" || (VIEW==="quest" && S.sb?.myRoom)) syncRooms(false);
};
const _go6=go;
go=function(v){
  _go6(v);
  if(!sbOn()) return;
  if(v==="roster"||v==="rank"||v==="hallv") { syncUp(false); syncRoster(false); }
  if(v==="hallv") pairFetch(true);
  if(v==="tower" || v==="guard" || (v==="quest" && S.sb?.myRoom)) syncRooms(true);
};
const _openSettings6=openSettings;
openSettings=function(){
  _openSettings6();
  const body=document.querySelector(".modal .mbody");
  if(!body) return;
  const box=document.createElement("div");
  box.innerHTML=`<hr class="hr">
    <div class="sect-t">공유 기록 (Supabase)</div>
    <div class="tiny muted">${sbOn()?`연결됨 · <span style="color:var(--jade)">${esc(S.sb.url)}</span><br>학생 번호 ${esc(S.sb.id)}`
      :"연결되지 않음 — 학생 명부·랭킹·함께 가기가 혼자 모드입니다"}</div>
    <div class="row" style="margin-top:8px">
      <button class="btn" onclick="closeModal();sbConnect()">공유 기록 연결</button>
      ${sbOn()?`<button class="btn" onclick="syncUp(true);syncRoster(true);toast('기록을 올렸습니다.')">지금 올리기</button>`:""}
    </div>`;
  body.appendChild(box);
};

/* ═══════════ 내비 ═══════════ */
(()=>{ /* 탑별 동행은 각 탑 화면에 있고, 공용 동행 탭은 따로 두지 않습니다. */
  const s=NAVDEF.find(x=>x.id==="soc");
  if(s && !s.sub.some(x=>x.id==="roster")) s.sub.unshift({id:"roster",n:"학생 명부"}); })();

const _boot6=boot;
boot=function(){ _boot6(); ensureV6(); renderNav(); renderMain();
  if(sbOn()){ syncUp(true).then(()=>{ syncRoster(true); syncRooms(true); });
              chatPull(true); chatTick(); } };

/* ═══════════ 접속자 · 지금 사무전에 있는 사람 ═══════════
   모브 학생은 없습니다. 공유 기록이 연결됐을 때,
   최근 4분 안에 기록을 올린 러너만 「접속 중」으로 셉니다.
   (각자 90초마다 자기 기록을 올리므로 4분이면 넉넉합니다.) */
const ONLINE_MS = 4*60*1000;
function onlineList(){
  if(!sbOn()) return [];
  const now = Date.now();
  return (S.sb.roster||[]).filter(r=>{
    const t = Date.parse(r.updated_at||"");
    return t && (now - t) < ONLINE_MS;
  });
}
onlineChip = function(){
  if(!sbOn()) return "";
  const n = onlineList().length;
  if(!n) return `<span class="tiny muted">● 접속 확인 중</span>`;
  return `<span style="color:var(--ok)">● 접속 ${n}명</span>`;
};
hereHTML = function(){
  if(!sbOn()) return `<div class="card pad" style="margin-top:14px">
    <div class="sect-t">사무전에 함께 있는 학생</div>
    <div class="tiny muted">공유 기록이 연결되면 지금 접속해 있는 러너가 여기에 보입니다.</div></div>`;
  const list = onlineList().filter(r=>r.id!==S.sb.id);
  if(!list.length) return `<div class="card pad" style="margin-top:14px">
    <div class="sect-t">사무전에 함께 있는 학생</div>
    <div class="tiny muted">지금은 혼자입니다. 다른 러너가 들어오면 여기에 보입니다.</div></div>`;
  return `<div class="card pad" style="margin-top:14px">
    <div class="sect-t">사무전에 함께 있는 학생 ${list.length}명</div>
    <div class="grid g4">
      ${list.slice(0,12).map(r=>{
        const h=homeOf(r.hall);
        return `<div class="spread" style="background:var(--s1);border:1px solid var(--line);border-radius:7px;padding:6px 10px">
          <div><b style="font-size:12.5px">${esc(r.name||"이름 없음")}</b>
          <div class="tiny muted">${h?esc(h.n):"거주지 미정"} · ${r.course||1}과정</div></div>
          ${S.friends.find(f=>f.n===r.name)?'<span class="tag g">인연</span>'
            :`<button class="btn sm ghost" onclick="addFriend('${esc(r.name||"").replace(/'/g,"")}')">동행 신청</button>`}
        </div>`;
      }).join("")}
    </div>
    <div class="tiny muted" style="margin-top:8px">최근 4분 안에 접속한 러너만 보입니다.</div>
  </div>`;
};
/* 명부를 자주 받아 와야 접속자 수가 맞습니다 */
const _stepOnline = step;
step = function(m){ _stepOnline(m); if(sbOn() && Math.random()<0.02) syncRoster(); };

/* 업귀 피해 순위를 실제 러너로 */
wbBoard = function(){
  if(!sbOn() || !(S.sb.roster||[]).length) return S.wb.dmg>0 ? [[S.name, S.wb.dmg, true]] : [];
  return [...S.sb.roster]
    .filter(r=>(r.wb_dmg||0)>0)
    .sort((a,b)=>(b.wb_dmg||0)-(a.wb_dmg||0))
    .slice(0,12)
    .map(r=>[r.name||"이름 없음", r.wb_dmg||0, r.id===S.sb.id]);
};
wbMyRank = function(){
  if(!sbOn() || !(S.sb.roster||[]).length) return S.wb.dmg>0 ? "기록 있음" : "—";
  const sorted=[...S.sb.roster].filter(r=>(r.wb_dmg||0)>0).sort((a,b)=>(b.wb_dmg||0)-(a.wb_dmg||0));
  const i=sorted.findIndex(r=>r.id===S.sb.id);
  return i>=0 ? `${i+1}위 / ${sorted.length}명` : "—";
};

/* ═══════════════════════════════════════════════════
   실시간 채팅 — 전체·RP에만 NPC가 모두에게 공유됩니다.
   전체·이웃·계통은 범위가 같은 사람끼리, 페어·1:1은 두 사람만 봅니다.
   NPC는 Supabase 트리거가 메시지로 기록합니다. 로컬 단독 반응은 금지합니다.
   ═══════════════════════════════════════════════════ */
function pairKey(a,b){ return [String(a||""),String(b||"")].sort().join("|"); }
function chatScope(tab){
  if(tab==="이웃")  return S.hall||"";
  if(tab==="계통")  return S.line||"";
  if(tab==="페어"){ const p=(S.rel||[]).find(r=>r.a==="페어"); return p?pairKey(S.name,p.n):""; }
  if(tab==="1:1")   return S.dmWith ? pairKey(S.sb.id, S.dmWith.id) : "";
  return "";
}
/* 지금 탭에서 보여 줄 글인지 — 채널 범위까지 따집니다 */
chatVisible = function(m){
  if(m.tab!==S.chatTab) return false;
  // 이전 버전의 개인 전용 NPC 대사는 공용 기록과 섞지 않습니다.
  if(!m.sid && Object.prototype.hasOwnProperty.call(NPC, m.who)) return false;
  if(m.local) return true;
  const need=chatScope(S.chatTab);
  if(["이웃","계통","페어","1:1"].includes(S.chatTab)) return (m.scope||"")===need;
  return true;
};

const CHATMS_ON=3000, CHATMS_OFF=15000;
let CHATTICK=null, CHATBUSY=false;
/* 서버에 저장된 메시지를 표시합니다. 본인 글도 예외 없이 가져옵니다.
   과거 판본은 본인 글을 서버에서 재조회할 때 건너뛰어, 기기나 로그인 시점에 따라
   상대 글만 보이는 문제가 있었습니다. 낙관적으로 먼저 그린 전송 글은 서버 행과 병합합니다. */
function chatRows(rows, silent=true, advanceCursor=true){
  let sound=null;
  if(!rows||!rows.length) return 0;
  let added=0, changed=false;
  rows.forEach(r=>{
    if(advanceCursor && Number(r.id)>Number(S.sb.chatId||0)) S.sb.chatId=Number(r.id);
    /* 이전 기록을 지우도록 명시한 이용자의 초기화 시점은 유지합니다. */
    const when=new Date(r.created_at||Date.now()).getTime();
    if(S.chatFrom && when < S.chatFrom) return;
    if(S.msgs.some(m=>String(m.sid)===String(r.id) && m.sid!==undefined && m.sid!==null)) return;
    const own=String(r.from_id)===String(S.sb.id);
    const isNPC=String(r.from_id||"").startsWith("mmjy-npc:");
    const d=new Date(r.created_at||Date.now());
    const h=d.getHours(), mm=String(d.getMinutes()).padStart(2,"0");
    const fields={sid:r.id, tab:r.tab, scope:r.scope||"", who:r.who, body:r.body,
      npc:isNPC, mine:own, c:r.color||"var(--violetL)", title:r.title||"",
      mode:chatModeOf(r.mode), ts:d.getTime(), time:`${h%12===0?12:h%12}:${mm}`, pending:false, failed:false};
    /* 메시지를 보낸 직후 임시 로컬 행과 서버에 확정된 행을 결합합니다.
       같은 대사를 연속해서 보냈을 때도 각 메시지마다 하나씩만 결합됩니다. */
    const optimistic=own ? S.msgs.find(m=>m.mine===true && !m.sid &&
       m.tab===r.tab && String(m.scope||"")===String(r.scope||"") &&
       m.body===r.body && chatModeOf(m.mode)===chatModeOf(r.mode) &&
       Math.abs(Number(m.ts||0)-when)<120000) : null;
    if(optimistic){ Object.assign(optimistic,fields); changed=true; }
    else { S.msgs.push(fields); added++; changed=true;
      if(!own && !silent && typeof incomingSoundKind==="function") sound=incomingSoundKind(r)||sound;
    }
  });
  if(S.msgs.length>400) S.msgs=S.msgs.slice(-400);
  if(sound && typeof notifySound==="function") notifySound(sound);
  if(changed) save();
  return added;
}
function chatPull(first){
  if(!sbOn() || CHATBUSY) return Promise.resolve(0);
  const state=S;
  const silent=!!first || !S.sb.chatId;
  CHATBUSY=true;
  const q = first || !S.sb.chatId
    ? "messages?select=*&order=id.desc&limit=100"
    : "messages?select=*&id=gt."+S.sb.chatId+"&order=id.asc&limit=200";
  return sbGet(q)
    .then(rows=>{ if(S!==state) return 0;
       if(first||!S.sb.chatId) rows=(rows||[]).slice().reverse();
       const n=chatRows(rows,silent); if(n) renderChat(); return n; })
    .catch(()=>0)
    .finally(()=>{ CHATBUSY=false; });
}
/* 공용 새 글 100개만 불러오면 오래된 페어 글이 누락되므로,
   페어 탭에서는 두 사람의 대화 기록을 직접 조회합니다. */
const PAIR_CHAT_HISTORY_MS=60000;
let PAIR_CHAT_HISTORY_KEY="", PAIR_CHAT_HISTORY_AT=0, PAIR_CHAT_HISTORY_BUSY=null;
function pairChatHistory(force){
  if(!sbOn() || !S.sb || !S.sb.id) return Promise.resolve(0);
  const P=typeof pairEnsure==="function" ? pairEnsure() : null;
  const scope=P && P.mine ? pairIdKey(P.mine.from_id,P.mine.to_id) : "";
  if(!scope) return Promise.resolve(0);
  const now=Date.now();
  if(PAIR_CHAT_HISTORY_BUSY && PAIR_CHAT_HISTORY_KEY===scope) return PAIR_CHAT_HISTORY_BUSY;
  if(!force && PAIR_CHAT_HISTORY_KEY===scope && now-PAIR_CHAT_HISTORY_AT<PAIR_CHAT_HISTORY_MS) return Promise.resolve(0);
  PAIR_CHAT_HISTORY_KEY=scope; PAIR_CHAT_HISTORY_AT=now;
  const state=S;
  PAIR_CHAT_HISTORY_BUSY=sbGet("messages?select=*&tab=eq."+encodeURIComponent("페어")+
      "&scope=eq."+encodeURIComponent(scope)+"&order=id.desc&limit=150")
    .then(rows=>{
      if(S!==state) return 0;
      const n=chatRows((rows||[]).slice().reverse(),true,false);
      if(S.chatTab==="페어") renderChat();
      return n;
    }).catch(()=>0)
    .finally(()=>{PAIR_CHAT_HISTORY_BUSY=null;});
  return PAIR_CHAT_HISTORY_BUSY;
}
function chatPush(tab, body, mode, scope){
  if(!sbOn()) return Promise.resolve([]);
  return sbSend("POST","messages",[{
    tab, scope:scope===undefined?chatScope(tab):scope, from_id:S.sb.id, who:S.name,
    body, color:S.color, title:(S.course||1)+"과정", mode:chatModeOf(mode)
  }],"return=representation");
}
function chatTick(){
  if(CHATTICK) clearInterval(CHATTICK);
  const ms = document.hidden ? CHATMS_OFF : CHATMS_ON;
  CHATTICK=setInterval(chatPull, ms);
}
document.addEventListener("visibilitychange",()=>{ chatTick(); if(!document.hidden) chatPull(); });

/* 내가 보낸 말을 서버로 */
const _sendChatSb = sendChat;
sendChat = function(){
  const i=document.getElementById("chatinput");
  const raw=i ? i.value.trim() : "";
  if(!raw) return;
  if(sbOn() && S.chatTab==="1:1" && !S.dmWith){
    toast("먼저 대화할 사람을 고르세요.","bad"); return;
  }
  if(sbOn() && S.chatTab==="페어" && !chatScope("페어")){
    toast("페어 정보를 불러오는 중입니다. 잠시 후 다시 보내 주세요.","bad");
    pairFetch(true); return;
  }
  const tab=S.chatTab, state=S;
  const mine=_sendChatSb();
  if(mine && sbOn()){
    mine.pending=true;
    chatPush(tab,mine.body,mine.mode,mine.scope)
      .then(rows=>{
        if(S!==state) return;
        if(rows&&rows.length){
          chatRows(rows,true,false);
          /* 폴링이 먼저 동일한 서버 글을 받았을 경우에도 임시 행을 남기지 않습니다. */
          const row=rows[0];
          if(mine && !mine.sid){
            const actual=S.msgs.find(m=>String(m.sid)===String(row.id));
            if(actual && actual!==mine){
              const at=S.msgs.indexOf(mine); if(at>=0) S.msgs.splice(at,1);
            }
          }
        }
        if(mine){mine.pending=false;mine.failed=false;}
        renderChat(); save();
      })
      .catch(e=>{
        if(S!==state) return;
        if(mine){mine.pending=false;mine.failed=true;}
        toast("채팅이 서버에 저장되지 않았습니다. 연결 상태를 확인해 주세요.","bad");
        renderChat(); save();
      });
  }
  return mine;
};
/* NPC 발언은 브라우저가 생성하지 않습니다. 서버에 한 번만 기록되어 모두에게 전달됩니다. */
npcChat=function(){ return null; };

/* ─── 1:1 상대 고르기 · 연결 상태 알림 ─── */
function dmPick(id){
  const r=(S.sb.roster||[]).find(x=>x.id===id);
  S.dmWith = r ? {id:r.id, name:r.name} : null;
  S.chatTab="1:1"; renderChat();
}
function chatContextHTML(){
  if(!sbOn()) return `<span style="color:var(--warn)" title="공유 기록을 연결하면 함께 이야기합니다">혼자 보는 중</span>`;
  if(S.chatTab==="1:1"){
    const list=(S.sb.roster||[]).filter(r=>r.id!==S.sb.id);
    return list.length
      ? `<select aria-label="1:1 대화 상대" onchange="dmPick(this.value)">
           <option value="">— 대화할 사람 —</option>
           ${list.map(r=>`<option value="${esc(r.id)}" ${S.dmWith&&S.dmWith.id===r.id?"selected":""}>${esc(r.name||"이름 없음")}</option>`).join("")}
         </select>`
      : `<span class="tiny muted">명부에 다른 러너가 없습니다.</span>`;
  }
  if(S.chatTab==="페어" && !chatScope("페어")) return "페어를 맺으면 둘만의 자리가 열립니다.";
  return "";
}
/* 명부에서 이름을 누르면 1:1 로 */
dmTo = function(n){
  const r=(S.sb.roster||[]).find(x=>x.name===n);
  if(r){ dmPick(r.id); toast(`${n} 학생과의 1:1 창을 열었습니다.`); }
  else { S.chatTab="1:1"; S.dmWith=null; renderChat(); toast("명부에 없는 학생입니다.","bad"); }
};

/* ═══════════════════════════════════════════════════
   페어 — 전생의 하나의 죄업으로 묶인 두 사람

   혼자 적어 두는 기록이 아니라, 신청하면 상대에게 가고
   상대가 수락해야 맺어집니다. 한 사람에게 하나만 맺을 수 있습니다.
   ═══════════════════════════════════════════════════ */
/* 명부 카드에 붙는 페어 단추 */
function pairBtn(r){
  if(!sbOn() || !r || String(r.id)===String(S.sb.id)) return "";
  const P=pairEnsure();
  const paired = P.mine && String(pairOther(P.mine).id)===String(r.id);
  const sent   = (P.sent||[]).some(x=>String(x.to_id)===String(r.id));
  const got    = (P.inbox||[]).some(x=>String(x.from_id)===String(r.id));
  let btn="";
  if(paired)      btn=`<span class="tag g">페어</span>`;
  else if(got)    btn=`<button class="btn sm pri pairbtn" onclick="go('rel')">페어 신청 받음 · 답하기</button>`;
  else if(sent)   btn=`<span class="tiny muted">페어 신청함 · 답을 기다리는 중</span>`;
  else if(P.mine) btn="";
  else            btn=`<button class="btn sm ghost pairbtn" onclick="pairSend('${String(r.id).replace(/'/g,"")}')">페어 신청</button>`;
  return btn?`<div class="row" style="margin-top:7px">${btn}</div>`:"";
}
function pairEnsure(){ if(!S.pair) S.pair={mine:null, inbox:[], sent:[], at:0}; return S.pair; }
function pairIdKey(a,b){ return [String(a||""),String(b||"")].sort().join("|"); }
function pairOther(row){ return String(row.from_id)===String(S.sb.id)
  ? {id:row.to_id, name:row.to_name, nick:row.nick_from}
  : {id:row.from_id, name:row.from_name, nick:row.nick_to}; }

const PAIRMS=20000;
let PAIRBUSY=false;
let PAIRFETCHTASK=null;
function pairFetch(force){
  const P=pairEnsure();
  if(!sbOn()) return Promise.resolve(false);
  if(PAIRBUSY) return PAIRFETCHTASK;
  const now=Date.now();
  if(!force && P.at && now-P.at<PAIRMS) return Promise.resolve(false);
  P.at=now; PAIRBUSY=true;
  const state=S;
  const id=encodeURIComponent(S.sb.id);
  const fields="id,from_id,from_name,to_id,to_name,status,nick_from,nick_to,created_at,updated_at,rent_due";
  PAIRFETCHTASK=sbGet(`pairs?select=${fields}&or=(from_id.eq.${id},to_id.eq.${id})&order=id.desc&limit=60`)
    .then(async rows=>{
      if(S!==state) return false;
      rows=rows||[];
      const before=(P.inbox||[]).length;
      P.mine  = rows.find(r=>r.status==="accepted") || null;
      /* 공동 일세는 두 거처 중 높은 가격입니다. 납부 전 상대 거처를 직접 확인합니다. */
      P.partner=null;
      if(P.mine){
        const other=encodeURIComponent(pairOther(P.mine).id);
        const fields="id,name,hall,home_stage,home_due,home_late,run_ward,run_stage,run_left,run_kills,updated_at";
        const peers=await sbGet(`students?select=${fields}&id=eq.${other}&limit=1`);
        if(S!==state) return false;
        P.partner=(peers||[])[0]||null;
      }
      P.inbox = rows.filter(r=>r.status==="pending" && String(r.to_id)===String(S.sb.id));
      P.sent  = rows.filter(r=>r.status==="pending" && String(r.from_id)===String(S.sb.id));
      if(P.inbox.length>before){
        const n=P.inbox[0];
        toast(`${esc(n.from_name||"누군가")} 님이 페어를 신청했습니다.`,"good");
        pushNews(`[인연] ${n.from_name} 학생이 페어를 신청했습니다.`);
      }
      /* 업데이트 전에 개인이 낸 일세도 남은 기간을 페어에게 나눕니다. */
      if(P.mine && Number(homeS().due)>Number(P.mine.rent_due||0)){
        const r=await sbSend("POST","rpc/pair_rent",{
          p_pair_id:P.mine.id, p_student_id:S.sb.id, p_action:"sync",
          p_personal_due:Number(homeS().due)||0
        });
        if(S!==state) return false;
        if(r && String(r.pair_id)===String(P.mine&&P.mine.id)) P.mine.rent_due=Number(r.due)||0;
      }
      syncHall(); renderTop(); renderNav();
      if(VIEW==="rel" || VIEW==="hallv" || VIEW==="pairhub") renderMain(true);
      save();
      renderChat();
      if(P.mine && S.chatTab==="페어") pairChatHistory();
      return true;
    })
    .catch(()=>false)
    .finally(()=>{ PAIRBUSY=false; PAIRFETCHTASK=null; });
  return PAIRFETCHTASK;
}

/* ─── 페어 공동 일세 — 서버에서 한 번만 결제하고 두 사람이 기간을 공유 ─── */
function pairRentActive(){
  const p=S.pair&&S.pair.mine;
  return !!(sbOn() && p && p.status==="accepted" &&
    [p.from_id,p.to_id].some(id=>String(id)===String(S.sb.id)));
}
function pairRentDue(){ return pairRentActive() ? Number(S.pair.mine.rent_due)||0 : 0; }
let PAIRRENTPROMISE=null, PAIRRENTAT=0;
function pairRentTick(){
  if(!sbOn()) return false;
  const h=homeS(), due=rentPaidUntil();
  if(h.rentPending || (!isDorm() && h.auto && due>0 && S.t>=due)){
    if(!PAIRRENTPROMISE && Date.now()-PAIRRENTAT>=30000) payPairRent(true);
  }
  return true; // 연결된 게임의 자동 납부는 반드시 최신 페어 상태부터 확인합니다.
}
function payPairRent(automatic){
  if(PAIRRENTPROMISE) return PAIRRENTPROMISE;
  PAIRRENTAT=Date.now();
  const state=S, h=homeS();
  PAIRRENTPROMISE=(async()=>{
    let pending=h.rentPending;
    if(!pending){
      if(!await pairFetch(true)){
        if(!automatic) toast("일세 정보를 불러오지 못했습니다. 연결을 확인한 뒤 다시 눌러 주세요.","bad");
        return;
      }
      if(S!==state) return;
      if(!pairRentActive()){ payLocalRent(automatic); return; }
      if(isDorm()){ if(!automatic) toast("기숙사는 일세가 없습니다."); return; }
      const due=rentPaidUntil();
      if(automatic && (!h.auto || !due || S.t<due)) return;
      const cost=rentCharge();
      if(cost===null){ if(!automatic) toast("페어의 거처를 확인하지 못했습니다. 상대가 한 번 접속한 뒤 다시 눌러 주세요.","bad"); return; }
      if(S.rin<cost){ if(!automatic) toast("륜이 부족합니다.","bad"); return; }
      const p=S.pair.mine;
      pending={id:S.sb.id+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2),
        pairId:p.id, studentId:S.sb.id, cost, automatic:!!automatic, periodMinutes:RENT_PERIOD_MINUTES,
        expectedDue:Number(p.rent_due)||0, personalDue:Number(h.due)||0};
      /* 처리 중에는 비용을 먼저 보관합니다. 같은 요청을 재전송해도 다시 차감하지 않습니다. */
      S.rin-=cost; h.rentPending=pending;
      save(); renderTop(); if(VIEW==="hallv") renderMain(true);
    }
    const result=await sbSend("POST","rpc/pair_rent",{
      p_pair_id:pending.pairId, p_student_id:pending.studentId,
      p_action:pending.automatic?"auto":"pay", p_request_id:pending.id,
      p_expected_due:pending.expectedDue, p_personal_due:pending.personalDue
    });
    if(S!==state) return;
    if(!result || String(result.request_id)!==pending.id || typeof result.charged!=="boolean")
      throw new Error("일세 응답을 확인하지 못했습니다.");
    if(!result.charged) S.rin+=pending.cost;
    if(S.pair&&S.pair.mine&&String(S.pair.mine.id)===String(pending.pairId)){
      S.pair.mine.rent_due=Number(result.due)||0;
      if(result.reason==="inactive") S.pair.mine=null;
    }
    delete h.rentPending;
    if(result.charged){
      const period=Number(result.period_minutes)||pending.periodMinutes||7*1440;
      pushNews(`[거처] ${S.name} 학생이 페어 일세 ${rentMoney(pending.cost)} 륜을 ${pending.automatic?"자동으로 ":""}냈습니다. 두 사람에게 함께 적용됩니다.`);
      if(!automatic) toast(`일세 ${rentMoney(pending.cost)} 륜을 냈습니다. 페어 두 사람 모두 ${hhmm(period)} 연장되었습니다.`,"good");
    }else if(!automatic){
      toast(result.reason==="inactive"?"페어가 변경되어 납부를 취소했습니다. 륜은 돌려드렸습니다.":"페어의 납부 내역을 적용했습니다. 추가로 차감하지 않았습니다.","good");
    }
    syncHall(); renderTop(); renderNav(); if(VIEW==="hallv") renderMain(true);
    save(); syncUp(true);
    if(typeof acctPush==="function") acctPush(true);
  })().catch(()=>{
    if(S===state && !automatic) toast(h.rentPending
      ? "납부 결과를 확인 중입니다. 재시도해도 일세를 다시 차감하지 않습니다."
      : "일세를 처리하지 못했습니다. 연결을 확인해 주세요.","bad");
  }).finally(()=>{ PAIRRENTPROMISE=null; });
  return PAIRRENTPROMISE;
}
function pairSend(toId){
  const P=pairEnsure();
  if(!sbOn()){ toast("공유 기록을 연결해야 페어를 맺을 수 있습니다.","bad"); return; }
  if(String(toId)===String(S.sb.id)){ toast("자기 자신과는 맺을 수 없습니다.","bad"); return; }
  if(P.mine){ toast("이미 페어가 있습니다. 하나만 맺을 수 있습니다.","bad"); return; }
  const r=(S.sb.roster||[]).find(x=>x.id===toId);
  if(!r){ toast("명부에서 찾을 수 없습니다.","bad"); return; }
  if(P.sent.some(x=>String(x.to_id)===String(toId))){ toast("이미 신청해 두었습니다. 상대의 답을 기다려 주세요."); return; }
  pairBusyBtn(true);
  sbSend("POST","pairs",[{from_id:S.sb.id, from_name:S.name, to_id:toId, to_name:r.name||"", status:"pending"}],"return=minimal")
    .then(()=>{ toast(`${esc(r.name||"")} 님에게 페어를 신청했습니다. 수락하면 맺어집니다.`,"good");
                return pairFetch(true); })
    .catch(()=>toast("신청을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.","bad"))
    .then(()=>{ pairBusyBtn(false); renderMain(); });
}
function pairBusyBtn(on){ document.querySelectorAll(".pairbtn").forEach(b=>b.disabled=!!on); }
function pairAccept(id){
  const P=pairEnsure();
  if(P.mine){ toast("이미 페어가 있습니다. 먼저 지금 페어를 풀어 주세요.","bad"); return; }
  pairBusyBtn(true);
  /* 상대가 그 사이 다른 사람과 맺었을 수 있으니 한 번 더 확인합니다 */
  const row=(P.inbox||[]).find(x=>x.id===id);
  const other=row?encodeURIComponent(row.from_id):"";
  sbGet(`pairs?select=id,status&or=(from_id.eq.${other},to_id.eq.${other})&status=eq.accepted&limit=1`)
    .then(busy=>{
      if(busy && busy.length){ toast("상대가 이미 다른 사람과 페어를 맺었습니다.","bad"); return pairDecline(id, true); }
      return sbSend("PATCH",`pairs?id=eq.${id}`,{status:"accepted", updated_at:new Date().toISOString()},"return=minimal")
        .then(()=>{ toast("페어를 맺었습니다. 둘만의 자리가 열렸습니다.","good");
                    pushNews(`[인연] ${row?row.from_name:"누군가"} 학생과 페어를 맺었습니다.`);
                    return pairFetch(true); });
    })
    .catch(()=>toast("수락하지 못했습니다. 잠시 뒤 다시 시도해 주세요.","bad"))
    .then(()=>{ pairBusyBtn(false); renderMain(); });
}
function pairDecline(id, quiet){
  pairBusyBtn(true);
  return sbSend("PATCH",`pairs?id=eq.${id}`,{status:"declined", updated_at:new Date().toISOString()},"return=minimal")
    .then(()=>{ if(!quiet) toast("신청을 거절했습니다."); return pairFetch(true); })
    .catch(()=>{ if(!quiet) toast("처리하지 못했습니다.","bad"); })
    .then(()=>{ pairBusyBtn(false); renderMain(); });
}
function pairCancel(id){
  pairBusyBtn(true);
  sbSend("PATCH",`pairs?id=eq.${id}`,{status:"broken", updated_at:new Date().toISOString()},"return=minimal")
    .then(()=>{ toast("신청을 거두었습니다."); return pairFetch(true); })
    .catch(()=>toast("처리하지 못했습니다.","bad"))
    .then(()=>{ pairBusyBtn(false); renderMain(); });
}
function pairBreak(){
  const P=pairEnsure(); if(!P.mine) return;
  const o=pairOther(P.mine);
  if(!confirm(`${o.name} 님과의 페어를 풀까요? 둘만의 자리도 닫힙니다.`)) return;
  pairBusyBtn(true);
  sbSend("PATCH",`pairs?id=eq.${P.mine.id}`,{status:"broken", updated_at:new Date().toISOString()},"return=minimal")
    .then(()=>{ toast("페어를 풀었습니다."); return pairFetch(true); })
    .catch(()=>toast("처리하지 못했습니다.","bad"))
    .then(()=>{ pairBusyBtn(false); renderMain(); });
}
function pairNick(){
  const P=pairEnsure(); if(!P.mine) return;
  const o=pairOther(P.mine);
  const cur=o.nick||"";
  const v=prompt(`${o.name} 님을 부르는 애칭 (8자까지, 비우면 지움)`, cur);
  if(v===null) return;
  const field = String(P.mine.from_id)===String(S.sb.id) ? "nick_from" : "nick_to";
  const body={}; body[field]=v.trim().slice(0,8); body.updated_at=new Date().toISOString();
  sbSend("PATCH",`pairs?id=eq.${P.mine.id}`,body,"return=minimal")
    .then(()=>pairFetch(true)).then(()=>renderMain())
    .catch(()=>toast("애칭을 바꾸지 못했습니다.","bad"));
}

/* 페어 채팅은 이름이 아니라 계정 아이디로 묶습니다 */
const _chatScopePair=chatScope;
chatScope=function(tab){
  if(tab==="페어"){ const P=pairEnsure(); return P.mine ? pairIdKey(P.mine.from_id, P.mine.to_id) : ""; }
  return _chatScopePair(tab);
};

/* 페어 채팅 탭을 열 때 서버의 두 사람 기록을 다시 확인합니다. */
const _setChatTabPair=setChatTab;
setChatTab=function(tab){
  _setChatTabPair(tab);
  if(tab==="페어"){
    if(pairEnsure().mine) pairChatHistory(true);
    else pairFetch(true).then(()=>pairChatHistory(true));
  }
};

/* 명부·채팅과 함께 주기적으로 받아 옵니다 */
const _stepPair=step;
step=function(m){ _stepPair(m); if(sbOn()) pairFetch(); };
const _bootPair=boot;
boot=function(){ _bootPair(); pairEnsure(); if(sbOn()) pairFetch(true); };

/* ─── 인연·관계 화면에 페어 칸 ─── */
function pairHTML(){
  const P=pairEnsure();
  if(!sbOn()) return `<div class="card pad" style="margin-bottom:14px">
    <div class="sect-t">페어</div>
    <div class="tiny muted">공유 기록을 연결하면 다른 러너에게 페어를 신청할 수 있습니다.</div></div>`;
  const o=P.mine?pairOther(P.mine):null;
  return `<div class="card pad" style="margin-bottom:14px${P.mine?";border-color:var(--gold2)":""}">
    <div class="spread"><div class="sect-t" style="margin:0">페어</div>
      <span class="tiny muted">한 사람에게 하나만</span></div>
    ${o?`<div class="spread" style="margin-top:6px">
        <div><b style="color:var(--gold)">${esc(o.name)}</b>
          ${o.nick?`<span class="tiny muted">· ${esc(o.nick)}이라 부릅니다</span>`:""}
          <div class="tiny muted">전생의 하나의 죄업으로 묶였습니다. 채팅 「페어」 탭이 열려 있습니다.</div></div>
        <div class="row">
          <button class="btn sm ghost pairbtn" onclick="pairNick()">애칭</button>
          <button class="btn sm ghost pairbtn" onclick="pairBreak()">풀기</button></div></div>`
     :`<div class="tiny muted" style="margin-top:4px">아직 페어가 없습니다. 학생 명부에서 신청해 보세요.</div>
        <button class="btn sm" style="margin-top:8px" onclick="go('roster')">학생 명부로</button>`}
    ${(P.inbox||[]).length?`<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)">
      <div class="tiny" style="color:var(--gold);margin-bottom:6px">받은 신청 ${P.inbox.length}</div>
      ${P.inbox.map(r=>`<div class="spread" style="padding:5px 0">
        <span><b>${esc(r.from_name)}</b> <span class="tiny muted">님이 페어를 신청했습니다</span></span>
        <div class="row"><button class="btn sm pri pairbtn" onclick="pairAccept(${r.id})">수락</button>
          <button class="btn sm ghost pairbtn" onclick="pairDecline(${r.id})">거절</button></div></div>`).join("")}
    </div>`:""}
    ${(P.sent||[]).length?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">
      <div class="tiny muted" style="margin-bottom:6px">보낸 신청</div>
      ${P.sent.map(r=>`<div class="spread" style="padding:5px 0">
        <span class="tiny"><b>${esc(r.to_name)}</b> 님의 답을 기다리는 중</span>
        <button class="btn sm ghost pairbtn" onclick="pairCancel(${r.id})">거두기</button></div>`).join("")}
    </div>`:""}
  </div>`;
}
const _relView=VIEWS.rel;
VIEWS.rel=()=>{
  const h=_relView();
  return h.replace('<div class="grid g2">', pairHTML()+'<div class="grid g2">');
};

/* 학생증 등에 쓰는 페어 이름 */
pairName = function(){
  const P=pairEnsure();
  if(!sbOn() || !P.mine) return "";
  const o=pairOther(P.mine);
  return o.nick ? `${o.name} (${o.nick})` : o.name;
};

/* ═══════════════════════════════════════════════════
   페어와 나누는 현황 — 거처와 의뢰
   서로의 명부 기록에서 읽어 옵니다. 페어가 아니면 보이지 않습니다.
   ═══════════════════════════════════════════════════ */
function pairRow(){
  const P=pairEnsure();
  if(!sbOn() || !P.mine) return null;
  const o=pairOther(P.mine);
  const r=P.partner&&String(P.partner.id)===String(o.id)
    ? P.partner : (S.sb.roster||[]).find(x=>String(x.id)===String(o.id));
  return r ? Object.assign({}, r, {_nick:o.nick}) : null;
}
function pairTitle(r){
  return `<b style="color:var(--gold)">${esc(r.name||"")}</b>`
       + (r._nick?` <span class="tiny muted">· ${esc(r._nick)}</span>`:"");
}
function pairSeen(r){
  const d=(Date.now()-new Date(r.updated_at).getTime())/60000;
  return d<5 ? `<span class="tag g">접속 중</span>`
             : `<span class="tiny muted">${d<60?Math.floor(d)+"분 전":d<1440?Math.floor(d/60)+"시간 전":Math.floor(d/1440)+"일 전"}</span>`;
}
/* ─── 거처 현황 ─── */
function pairHomeHTML(){
  const P=pairEnsure();
  if(!sbOn() || !P.mine) return "";
  const r=pairRow();
  if(!r) return `<div class="card pad" style="margin-bottom:14px">
    <div class="sect-t">페어의 거처</div>
    <div class="tiny muted">아직 명부에 올라오지 않았습니다. 상대가 한 번 접속하면 보입니다.</div></div>`;
  const h=homeOf(r.hall), dorm=(r.hall==="dorm");
  const top=dorm?4:5, st=clamp(r.home_stage||0,0,top);
  const fac=HOMESTAGE[st]||0;
  const shared=pairRentDue(), due=Math.max(Number(r.home_due)||0,shared);
  const late=!dorm && (due>0 ? nowMin()>=due : !!r.home_late);
  const sharedPaid=!dorm && shared>nowMin();
  const activeFac=dorm||(!late&&due>nowMin())?fac:0;
  return `<div class="card pad" style="margin-bottom:14px;border-color:var(--gold2)">
    <div class="spread"><div class="sect-t" style="margin:0">페어의 거처</div>${pairSeen(r)}</div>
    <div class="spread" style="margin-top:4px">
      <div>${pairTitle(r)} <span class="tiny muted">· ${esc(h.n)} ${esc(h.h)}</span>
        <div class="tiny muted">${dorm?"방 꾸미기":"집 짓기"} ${st} / ${top} 단계
          ${dorm?"· 일세 없음":late?'· <span style="color:var(--red)">일세 미납</span>':sharedPaid?"· 페어 일세 적용 중":due?"· 일세 납부 완료":"· 아직 계약 전"}</div></div>
      <span class="tag" style="border-color:${h.c};color:${h.c}">혜택 ${Math.round(activeFac*100)}%</span></div>
    <div class="bar" style="margin-top:8px"><i style="width:${st/top*100}%"></i></div>
    <div class="tiny muted" style="margin-top:6px">${esc(hallBenefitsAt(r.hall,activeFac))}</div>
    ${dorm?"":`<div class="tiny muted" style="margin-top:4px">구역 특화 효과 ${HALLMULT[r.hall]}배 · 거처 기준 하루 ${rentMoney(rentOf(r.hall,st))} 륜</div>`}
  </div>`;
}

/* ─── 의뢰 현황 ─── */
function pairRunHTML(){
  const P=pairEnsure();
  if(!sbOn() || !P.mine) return "";
  const r=pairRow();
  if(!r) return "";
  const out=(r.run_stage||0)>0;
  return `<div class="card pad" style="margin-bottom:14px;${out?"border-color:var(--gold2)":""}">
    <div class="spread"><div class="sect-t" style="margin:0">페어의 의뢰</div>${pairSeen(r)}</div>
    ${out?`<div class="spread" style="margin-top:4px">
        <div>${pairTitle(r)}
          <div class="tiny muted">${esc(r.run_ward||"")} <b>${r.run_stage}단계</b> 진행 중
            · 처치 ${nf(r.run_kills||0)}체</div></div>
        <div class="tiny muted">${hhmm(r.run_left||0)} 남음</div></div>
       <div class="tiny muted" style="margin-top:6px">페어의 현재 진행 상황입니다. 내 의뢰 동행은 접수대의 기존 동행 기능에서 준비할 수 있습니다.</div>`
      :`<div class="tiny muted" style="margin-top:4px">${pairTitle(r)} 님은 지금 의뢰에 나가 있지 않습니다.</div>`}
  </div>`;
}

/* ─── 콘텐츠별 동행 영역: 석탑 / 결계의 탑 각각 표시 ─── */
const _towerParty=VIEWS.tower;
VIEWS.tower=()=>{
  const h=_towerParty();
  const key='<div class="card pad">\n    <div class="sect-t">탑 기록</div>';
  const i=h.indexOf(key);
  return i>=0?h.slice(0,i)+coopRoomPanel("tower")+h.slice(i):h+coopRoomPanel("tower");
};
const _guardParty=VIEWS.guard;
VIEWS.guard=()=>_guardParty()+coopRoomPanel("guard");

/* 의뢰에는 기존 동행 모집/출정 기능이 있으므로 별도 '같이 가기'를 덧붙이지 않습니다. */
const _questParty=VIEWS.quest;
VIEWS.quest=()=>{
  const h=_questParty();
  const block=pairRunHTML()+legacyQuestRoom();
  const cut=h.indexOf('<!--QSPLIT-->');
  return cut<0?block+h:h.slice(0,cut)+block+h.slice(cut+'<!--QSPLIT-->'.length);
};
