"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 6
   공유 기록(학생 명부 · 랭킹 · 숙사 집계) · 함께 가기(방)
   Supabase 에 연결했을 때만 동작하며, 연결 전에는 기존 혼자 모드 그대로입니다.
   ═══════════════════════════════════════════════════ */

function ensureV6(){
  if(!S.sb) S.sb={url:"", key:"", id:"", on:false, state:"idle", err:"",
                  roster:[], rosterAt:0, rooms:[], roomsAt:0, myRoom:null, claimed:[], upAt:0};
  if(!S.sb.claimed) S.sb.claimed=[];
  if(!S.sb.id) S.sb.id = "S"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
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
  if(["roster","rank","hallv","together","board"].includes(VIEW)) renderMain();
}

/* ─── 내 기록 올리기 ─── */
function myRecord(){
  const c=C();
  return {
    id:S.sb.id, name:S.name, course:S.course, lvl:S.lvl,
    power:power(), dps:c.dps, hpv:c.hp,
    line:S.line, weapon:S.weapon||"", hall:S.hall, title:S.title,
    intro:S.intro||"", av:S.av, av_img:(S.avImg||"").slice(0,120000),
    tower:S.tower||0, guard:S.tower2||0, arena_best:S.arena.best||0,
    quest:S.quests.cleared||0, dexp:(typeof dexScore==="function"?dexScore():0),
    ach:(S.ach||[]).length, war:S.war.mine||0,
    wb_dmg:(S.wb&&S.wb.dmg)||0,
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
      if(VIEW==="together") renderMain();
    })
    .catch(sbErr);
}

/* ─── 방 만들기 · 참가 · 나가기 ─── */
const RKIND={tower:{n:"석탑",e:ic("tower")}, guard:{n:"결계의 탑",e:ic("shield")}, quest:{n:"의뢰",e:ic("swords")}};
function roomCreate(kind,stage,note){
  if(!sbOn()){ toast("먼저 공유 기록을 연결해 주세요.","bad"); return; }
  if(S.sb.myRoom){ toast("이미 들어가 있는 방이 있습니다.","bad"); return; }
  sbSend("POST","rooms",[{kind, stage, host_id:S.sb.id, host_name:S.name, note:note||""}])
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
      if(res.stage>S.quests.cleared) S.quests.cleared=res.stage;
      gainRin(Math.round((120+res.stage*48)*1.6)); ct&&ct("quest");
    }
    const it=mkGear(Math.round(res.stage*1.3+S.lvl*.3)); S.bag.push(it);
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

/* ═══════════ 화면 — 함께 가기 ═══════════ */
let TKIND="tower";
VIEWS.together=()=>{
  if(!sbOn()) return head("합동 출발",ic("handshake")+" 함께 가기","공유 기록이 연결되지 않았습니다")+`
    <div class="card pad" style="border-color:var(--gold2)">
      <div class="tiny muted" style="line-height:1.9">
        다른 학생과 함께 탑을 오르려면 모두의 기록이 한곳에 모여야 합니다.
        설정(${ic("gear",13)})의 <b>공유 기록 연결</b>에 주소와 키를 넣어 주세요.
        만드는 방법은 함께 드린 안내서 「공유 기록 연결하기」를 보시면 됩니다.</div>
      <button class="btn pri" style="margin-top:12px" onclick="sbConnect()">공유 기록 연결</button>
    </div>`;

  const rooms=S.sb.rooms.filter(r=>r.status!=="done");
  const done =S.sb.rooms.filter(r=>r.status==="done"&&r.result).slice(0,6);
  const cur  =rooms.find(r=>r.id===S.sb.myRoom);

  const card=(r)=>{
    const ms=r.room_members||[];
    const dps=ms.reduce((a,m)=>a+(+m.dps||0),0), hp=ms.reduce((a,m)=>a+(+m.hpv||0),0);
    const host=r.host_id===S.sb.id, joined=ms.some(m=>m.student_id===S.sb.id);
    const K=RKIND[r.kind]||RKIND.tower;
    return `<div class="sub" style="${joined?"border-color:var(--gold2)":""}">
      <div class="spread"><div><b>${K.e} ${K.n} ${r.stage}${r.kind==="quest"?"단계":"층"}</b>
        ${host?'<span class="tag g">내 방</span>':joined?'<span class="tag j">참가 중</span>':""}</div>
        <span class="tiny muted">${ms.length} / 4명</span></div>
      ${r.note?`<div class="tiny muted" style="margin:4px 0">${esc(r.note)}</div>`:""}
      <div class="row" style="margin:7px 0">
        ${[0,1,2,3].map(i=>{ const m=ms[i];
          return m?`<span class="buffchip" style="${m.student_id===S.sb.id?"border-color:var(--gold2)":""}">
            ${esc(m.name)} <span class="muted">${m.course}과정</span></span>`
          :`<span class="buffchip" style="color:var(--s6)">빈자리</span>`}).join("")}
      </div>
      <div class="tiny" style="color:var(--jade)">합산 초당 피해 ${nf(dps)} · 합산 생명력 ${nf(hp)}</div>
      <div class="row" style="margin-top:8px">
        ${host?`<button class="btn pri sm" onclick="roomDepart(${r.id})">지금 출발</button>
                <button class="btn sm red" onclick="roomClose(${r.id})">방 닫기</button>`
          :joined?`<button class="btn sm" onclick="roomLeave(${r.id})">나가기</button>
                   <span class="tiny muted">방장이 출발하기를 기다립니다</span>`
          :`<button class="btn pri sm" ${S.sb.myRoom?"disabled":""} onclick="roomJoin(${r.id})">들어가기</button>`}
      </div></div>`;
  };

  return head("합동 출발",ic("handshake")+" 함께 가기", `${sbStateChip()} · 열린 방 ${rooms.length}개`)+`
  ${buffStrip()}
  <div class="card pad" style="margin-bottom:12px">
    <div class="spread"><div class="sect-t" style="margin:0">방 만들기</div>
      <button class="btn sm ghost" onclick="syncRooms(true)">새로 고침</button></div>
    <div class="tiny muted" style="margin:6px 0 10px">방을 열면 다른 학생이 들어옵니다. 방장이 「지금 출발」을 누르면
    <b>참가자 전원의 초당 피해와 생명력을 합산해</b> 판정하고, 결과와 보상은 참가자 모두에게 기록됩니다.
    여럿이 나눠 맞으므로 받는 피해가 줄어듭니다.</div>
    <div class="row">
      <span class="seg">${Object.keys(RKIND).map(k=>
        `<button class="${TKIND===k?"on":""}" onclick="TKIND='${k}';renderMain()">${RKIND[k].e} ${RKIND[k].n}</button>`).join("")}</span>
      <button class="btn pri" ${S.sb.myRoom?"disabled":""} onclick="roomMake()">${S.sb.myRoom?"이미 방에 있습니다":"방 열기"}</button>
    </div>
  </div>

  ${S.sb.state==="err"?`<div class="card pad" style="margin-bottom:12px;border-color:var(--redD);padding:10px 14px">
    <span class="tag r">연결 실패</span> <span class="tiny">${esc(S.sb.err)}</span>
    <button class="btn sm" style="margin-left:8px" onclick="sbConnect()">연결 고치기</button></div>`:""}

  ${rooms.length?`<div class="grid g2">${rooms.map(card).join("")}</div>`
    :`<div class="card pad"><div class="tiny muted" style="padding:14px 2px;text-align:center">
       열린 방이 없습니다. 먼저 방을 열어 보세요.</div></div>`}

  ${done.length?`<div class="card pad" style="margin-top:14px">
    <div class="sect-t">최근 합동 기록</div>
    <table class="t">
      ${done.map(r=>`<tr>
        <td style="width:120px">${(RKIND[r.result.kind]||RKIND.tower).e} ${(RKIND[r.result.kind]||RKIND.tower).n} ${r.result.stage}${r.result.kind==="quest"?"단계":"층"}</td>
        <td class="tiny muted">${(r.result.members||[]).map(m=>esc(m.name)).join(" · ")}</td>
        <td style="text-align:right"><span class="tag ${r.result.win?"j":"r"}">${r.result.win?"돌파":"실패"}</span></td></tr>`).join("")}
    </table></div>`:""}`;
};
function roomMake(){
  const k=TKIND, K=RKIND[k];
  const suggest = k==="tower" ? (S.tower||0)+1 : k==="guard" ? (S.tower2||0)+1 : Math.min(200,S.quests.cleared+1);
  modal(`${K.e} ${K.n} 합동 방 열기`, `
    <label class="f">${k==="quest"?"단계":"층"}</label>
    <input class="inp" id="r_stage" type="number" min="1" max="${k==="quest"?200:999}" value="${suggest}">
    <div class="tiny muted" style="margin-top:5px">내 기록은 ${k==="tower"?(S.tower||0)+"층":k==="guard"?(S.tower2||0)+"층":S.quests.cleared+"단계"}입니다.
    혼자서 버거운 곳을 적어 두면 사람이 모입니다.</div>
    <label class="f">한 줄 덧붙이기 (선택 · 40자)</label>
    <input class="inp" id="r_note" maxlength="40" placeholder="예: 수호 성향 한 분만 더">
    <div class="row" style="margin-top:14px">
      <button class="btn pri" onclick="roomCreate('${k}', +document.getElementById('r_stage').value||1, document.getElementById('r_note').value)">방 열기</button>
      <button class="btn" onclick="closeModal()">취소</button></div>`);
}

/* ═══════════ 화면 — 학생 명부 ═══════════ */
function sbStateChip(){
  if(!sbOn()) return `<span class="tag">연결 안 됨</span>`;
  if(S.sb.state==="err") return `<span class="tag r">연결 실패</span>`;
  return `<span class="tag j">연결됨</span>`;
}
VIEWS.roster=()=>{
  if(!sbOn()) return head("사무전 학생 명부",ic("users")+" 학생 명부","공유 기록이 연결되지 않았습니다")+`
    <div class="card pad" style="border-color:var(--gold2)">
      <div class="tiny muted" style="line-height:1.9">연결하면 같은 커뮤니티의 러너들이 여기에 나타납니다.
      지금은 교류 화면에 보이는 학생들이 모두 NPC입니다.</div>
      <button class="btn pri" style="margin-top:12px" onclick="sbConnect()">공유 기록 연결</button></div>`;
  const rows=S.sb.roster||[];
  const ago=t=>{ const d=(Date.now()-new Date(t).getTime())/60000;
    return d<2?"방금":d<60?Math.floor(d)+"분 전":d<1440?Math.floor(d/60)+"시간 전":Math.floor(d/1440)+"일 전"; };
  return head("사무전 학생 명부",ic("users")+" 학생 명부", `${sbStateChip()} · ${rows.length}명`)+`
  <div class="card pad" style="margin-bottom:12px;padding:10px 14px">
    <div class="tiny muted">같은 건의함·명부를 쓰는 러너들입니다. 내 기록은 몇 분마다 자동으로 올라갑니다.</div>
    <button class="btn sm" style="margin-top:8px" onclick="syncRoster(true);syncUp(true)">지금 올리고 새로 고침</button>
  </div>
  ${rows.length?`<div class="grid g3">
    ${rows.map(r=>{
      const hall=HALLS.find(h=>h.id===r.hall);
      const me=r.id===S.sb.id;
      return `<div class="sub" style="${me?"border-color:var(--gold2)":""}">
        <div class="row" style="align-items:flex-start;gap:10px">
          ${r.av_img?`<div style="width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid ${hall?hall.c:"var(--gold)"};flex:none">
            <img src="${r.av_img}" style="width:100%;height:100%;object-fit:cover;display:block"></div>`
            :`<div style="width:44px;height:44px;border-radius:50%;border:2px solid ${hall?hall.c:"var(--gold)"};display:grid;place-items:center;background:var(--s0);flex:none">${ic(r.av||"lantern",22)}</div>`}
          <div style="flex:1;min-width:0">
            <div class="tiny" style="color:var(--gold)">${esc(r.title||"")}</div>
            <b>${esc(r.name)}</b> ${me?'<span class="tag g">나</span>':""}
            <div class="tiny muted">${hall?hall.n:""} · ${r.course}과정 · Lv ${r.lvl} · ${esc(r.line||"")}</div>
          </div>
          <div style="text-align:right"><div class="tiny muted">전투력</div>
            <b style="color:var(--gold)">${nf(r.power)}</b></div>
        </div>
        ${r.intro?`<div class="tiny muted" style="margin-top:6px">${esc(r.intro)}</div>`:""}
        <div class="tiny muted" style="margin-top:6px">석탑 ${r.tower}층 · 결계 ${r.guard}층 · 의뢰 ${r.quest}단계 · 업적 ${r.ach}</div>
        <div class="tiny muted" style="margin-top:3px;color:var(--s6)">${ago(r.updated_at)}</div>
      </div>`}).join("")}
  </div>`:`<div class="card pad"><div class="tiny muted" style="padding:14px 2px;text-align:center">
    아직 올라온 학생이 없습니다. 「지금 올리고 새로 고침」을 눌러 보세요.</div></div>`}`;
};

/* ═══════════ 랭킹 · 숙사 — 진짜 기록으로 ═══════════ */
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
    <div class="tiny muted">같은 커뮤니티 러너들의 실제 기록입니다. 물약·요리 같은 시간제 효과는 전투력에 포함되지 않습니다.</div>
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
const _hallv=VIEWS.hallv;
VIEWS.hallv=()=>{
  let h=_hallv();
  if(!sbOn() || !(S.sb.roster||[]).length) return h;
  const R=S.sb.roster;
  const by={}; HALLS.forEach(x=>by[x.id]={n:0,sum:0});
  R.forEach(r=>{ if(by[r.hall]){ by[r.hall].n++; by[r.hall].sum+=(+r.war||0); } });
  const rows=HALLS.map(x=>({...x, cnt:by[x.id].n,
    avg: by[x.id].n?Math.round(by[x.id].sum/Math.max(5,by[x.id].n)):0})).sort((a,b)=>b.avg-a.avg);
  const top=Math.max(1,rows[0].avg);
  const real=`<div class="card pad" style="margin-bottom:14px;border-color:var(--gold2)">
    <div class="spread"><div class="sect-t" style="margin:0">실제 대항전 집계</div>
      <span class="tiny muted">${sbStateChip()} · 학생 ${R.length}명</span></div>
    <div class="tiny muted" style="margin:4px 0 8px">명부에 올라온 러너들의 이번 주 점수를 숙사별 평균으로 셉니다(최소 5명으로 나눕니다).</div>
    ${rows.map((h2,i)=>`<div style="margin:8px 0">
      <div class="spread tiny"><span>${i+1} <b style="color:${h2.c}">${h2.n}</b>
        ${h2.id===S.hall?'<span class="tag g">내 숙사</span>':""}</span>
        <span class="muted">${h2.cnt}명 · <b>${nf(h2.avg)}</b></span></div>
      <div class="bar" style="margin-top:3px"><i style="width:${h2.avg/top*100}%;background:linear-gradient(90deg,${h2.c}66,${h2.c})"></i></div></div>`).join("")}
  </div>`;
  return h.replace('<div class="grid g2" style="margin-bottom:14px">', real+'<div class="grid g2" style="margin-bottom:14px">');
};

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
        title:r.title, body:r.body, secret:r.secret?1:0, likes:r.likes, status:r.status, reply:r.reply}));
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
  const btn=$("#b_go"); if(btn){ btn.disabled=true; btn.textContent="보내는 중…"; }
  sbSend("POST","suggestions",[{name, cat, title, body, secret, status:"접수"}],"return=minimal")
    .then(()=>{ closeModal(); toast("건의함에 올렸습니다. 고맙습니다.","good"); boardFetch(true); })
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
  sbSend("PATCH",`suggestions?id=eq.${id}`,{likes:nv},"return=minimal").catch(()=>{});
};

/* ═══════════ 연결 설정 ═══════════ */
function sbConnect(){
  modal("공유 기록 연결", `
    <div class="tiny muted" style="line-height:1.9;margin-bottom:12px">
      Supabase 에 연결하면 <b>학생 명부 · 진짜 랭킹 · 숙사 대항전 집계 · 함께 가기 · 건의함</b>이 모두 함께 돌아갑니다.
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
  if(VIEW==="together") syncRooms(false);
};
const _go6=go;
go=function(v){
  _go6(v);
  if(!sbOn()) return;
  if(v==="roster"||v==="rank"||v==="hallv") { syncUp(false); syncRoster(false); }
  if(v==="together") syncRooms(true);
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
(()=>{ const g=NAVDEF.find(x=>x.id==="war");
  if(g && !g.sub.some(s=>s.id==="together")) g.sub.splice(1,0,{id:"together",n:"함께 가기",bd:"합동"});
  const s=NAVDEF.find(x=>x.id==="soc");
  if(s && !s.sub.some(x=>x.id==="roster")) s.sub.unshift({id:"roster",n:"학생 명부"}); })();

const _boot6=boot;
boot=function(){ _boot6(); ensureV6(); renderNav(); renderMain();
  if(sbOn()){ syncUp(true).then(()=>{ syncRoster(true); syncRooms(true); }); } };

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
        const h=HALLS.find(x=>x.id===r.hall);
        return `<div class="spread" style="background:var(--s1);border:1px solid var(--line);border-radius:7px;padding:6px 10px">
          <div><b style="font-size:12.5px">${esc(r.name||"이름 없음")}</b>
          <div class="tiny muted">${h?esc(h.n):"숙사 미정"} · ${r.course||1}과정</div></div>
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
