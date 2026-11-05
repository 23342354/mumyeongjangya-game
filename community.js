"use strict";

;
/* ===== module: part8.js ===== */
"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 8

   ① 상단 알림함 (30일 보관 · 갈래별 추리기 · 더 보기)
   ② 페어 동거 — 둘이 맺어지면 더 좋은 집으로 자동으로 함께 들어갑니다
   ③ 친구와 관계를 따로 — 신청도 목록도 각각
   ④ 건축자재 — 의뢰에서 모아 목석 공방에서 합판·석재·철물로 다듬습니다
   ⑤ 합동 전투 일지 — 피해가 들어가는 과정이 보입니다
   ⑥ 의뢰 진행 표시 — 남은 시간이 1초마다 줄어듭니다
   ═══════════════════════════════════════════════════ */

/* ───────────────────────────────────────────────────
   ① 알림함
   ─────────────────────────────────────────────────── */
const ALERTCATS=[
 {k:"all",   n:"전체"},
 {k:"soc",   n:"교류"},
 {k:"run",   n:"의뢰·전투"},
 {k:"home",  n:"거처"},
 {k:"study", n:"수업"},
 {k:"trade", n:"거래"},
 {k:"etc",   n:"기타"},
];
const ALERTKEEP = 30*24*60*60*1000;          // 30일 보관
const ALERTMAX  = 250;
const ALERTVIEW = {soc:"rel", run:"quest", home:"hallv", study:"class", trade:"market", etc:""};
const ALERTRULE = [
 [/^\[(의뢰|합동|석탑|결계|대련|연무|투기|업귀|토벌)/, "run"],
 [/^\[(거처|일세|거주)/,                                "home"],
 [/^\[(인연|페어|교류|게시판|친구|관계)/,                "soc"],
 [/^\[(서가|수업|수행|수석|시험|진급|강의)/,             "study"],
 [/^\[(거래|중개소|경매|상점|매점)/,                     "trade"],
];
function alertCatOf(t){
  const s=String(t||"");
  for(const [re,k] of ALERTRULE) if(re.test(s)) return k;
  return "etc";
}
/* 알림 삭제 기준은 계정 저장본 + 기기별 복구 표식에 함께 보관합니다.
   서버 저장이 잠시 실패해 이전 계정 저장본이 내려와도 삭제한 알림은 복원하지 않습니다. */
const ALERT_CLEAR_PREFIX="mmjy_alert_clear_v1:";
function alertClearKey(){
  const id=(typeof acctIn==="function"&&acctIn()&&typeof ACCT!=="undefined"&&ACCT?.id)
    ? String(ACCT.id) : "local";
  return ALERT_CLEAR_PREFIX+id;
}
function alertClearedAt(){
  let local=0;
  try{local=Number(localStorage.getItem(alertClearKey()))||0;}catch(e){}
  return Math.max(0,Number(S?.alertClearedAt)||0,local);
}
function alertsEnsure(){
  if(!Array.isArray(S.alerts)) S.alerts=[];
  if(typeof S.alertSeen!=="number") S.alertSeen=Date.now();
  const cutoff=alertClearedAt();
  if(cutoff){
    if((Number(S.alertClearedAt)||0)<cutoff) S.alertClearedAt=cutoff;
    // 서버의 오래된 저장본 또는 늦게 도착한 알림 기록에도 삭제 기준을 적용합니다.
    if(S.alerts.some(a=>!(Number(a?.at)>cutoff)))
      S.alerts=S.alerts.filter(a=>Number(a?.at)>cutoff);
  }
  return S.alerts;
}
function alertRememberClear(at){
  S.alertClearedAt=Math.max(alertClearedAt(),at);
  try{localStorage.setItem(alertClearKey(),String(S.alertClearedAt));}catch(e){}
}
function alertPush(cat, text, view){
  if(!S || !S.made) return;
  alertsEnsure();
  const at=Date.now();
  S.alerts.unshift({
    i: at.toString(36)+Math.random().toString(36).slice(2,6),
    c: cat||"etc",
    t: String(text||""),
    at,
    v: view===undefined ? (ALERTVIEW[cat]||"") : (view||"")
  });
  const cut=at-ALERTKEEP;
  if(S.alerts.length>ALERTMAX+40 || S.alerts[S.alerts.length-1].at<cut)
    S.alerts=S.alerts.filter(a=>a.at>=cut).slice(0,ALERTMAX);
  alertBadge();
}
function alertUnread(){
  alertsEnsure();
  const seen=S.alertSeen||0;
  return S.alerts.filter(a=>a.at>seen).length;
}
function alertWhen(ms){
  const d=new Date(ms), now=Date.now(), gap=(now-ms)/60000;
  if(gap<1) return "방금";
  if(gap<60) return Math.floor(gap)+"분 전";
  if(gap<1440) return Math.floor(gap/60)+"시간 전";
  return d.toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
}
/* 상단 종 단추 */
function alertBellHTML(){
  const n=alertUnread();
  return `<button class="btn sm ghost" id="alertbell" onclick="openAlerts()" title="알림"
    style="position:relative">${ic("bell",15)}${n?`<span id="alertdot" style="position:absolute;top:-4px;right:-4px;
    min-width:16px;height:16px;padding:0 4px;border-radius:9px;background:var(--red);color:#fff;
    font-size:10px;line-height:16px;text-align:center;font-weight:700">${n>99?"99+":n}</span>`:""}</button>`;
}
function alertBadge(){
  const b=document.getElementById("alertbell");
  if(!b) return;
  const old=document.getElementById("alertdot");
  if(old) old.remove();
  const n=alertUnread();
  if(n) b.insertAdjacentHTML("beforeend",`<span id="alertdot" style="position:absolute;top:-4px;right:-4px;
    min-width:16px;height:16px;padding:0 4px;border-radius:9px;background:var(--red);color:#fff;
    font-size:10px;line-height:16px;text-align:center;font-weight:700">${n>99?"99+":n}</span>`);
}
const _renderTop8 = renderTop;
renderTop = function(){
  _renderTop8();
  const box=document.querySelector("#topbar .top-actions");
  if(box) box.insertAdjacentHTML("afterbegin", alertBellHTML());
};

let ALERTTAB="all", ALERTSHOW=12;
function alertTab(k){ ALERTTAB=k; ALERTSHOW=12; drawAlerts(); }
function alertMore(){ ALERTSHOW+=20; drawAlerts(); }
function alertGo(id){
  alertsEnsure();
  const a=S.alerts.find(x=>x.i===id);
  closeModal();
  if(a&&a.v&&VIEWS[a.v]) go(a.v);
}
function alertClear(){
  if(!confirm("보관 중인 알림을 모두 지울까요? 소식 기록은 그대로 남습니다.")) return;
  alertsEnsure();
  const at=Date.now();
  alertRememberClear(at);
  S.alerts=[];
  S.alertSeen=at;
  // 아직 응답하지 않은 RP 목록 요청이 과거 답글을 다시 알리지 않도록 합니다.
  if(typeof SOCIAL!=="undefined"&&Array.isArray(SOCIAL.posts))
    S.alertRpMax=SOCIAL.posts.reduce((max,p)=>Math.max(max,Number(p.id)||0),Number(S.alertRpMax)||0);
  save();
  drawAlerts();alertBadge();
  toast("알림함을 비웠습니다. 새로 도착하는 알림은 계속 받을 수 있어요.","good");
  // 즉시 계정 서버로 보냅니다. 페어 연결 중에는 기존 공동 플레이 저장 큐를 이용합니다.
  if(typeof acctIn==="function"&&acctIn()&&typeof acctPush==="function"){
    Promise.resolve(acctPush(true)).then(ok=>{
      if(!ok) toast("기기에서는 지워졌지만 서버 저장에 실패했습니다. 계정 저장 상태에서 재시도해 주세요.","bad");
    }).catch(()=>toast("알림 삭제의 서버 반영을 확인하지 못했습니다. 계정 저장 상태를 확인해 주세요.","bad"));
  }
}
function openAlerts(){ ALERTTAB="all"; ALERTSHOW=12; drawAlerts();
  S.alertSeen=Date.now(); save(); alertBadge(); }
function drawAlerts(){
  alertsEnsure();
  const list=ALERTTAB==="all"?S.alerts:S.alerts.filter(a=>a.c===ALERTTAB);
  const shown=list.slice(0,ALERTSHOW);
  const catName=k=>(ALERTCATS.find(c=>c.k===k)||{n:"기타"}).n;
  const rows=shown.map(a=>`<div class="spread" style="padding:11px 2px;border-bottom:1px solid var(--line);gap:10px;align-items:flex-start">
      <span class="tag" style="flex:none">${esc(catName(a.c))}</span>
      <div style="flex:1;min-width:0">
        <div style="overflow-wrap:anywhere">${esc(a.t)}</div>
        <div class="tiny muted" style="margin-top:3px">${esc(alertWhen(a.at))}</div></div>
      ${a.v&&VIEWS[a.v]?`<button class="btn sm ghost" style="flex:none" onclick="alertGo('${a.i}')">보기</button>`:""}
    </div>`).join("");
  modal("알림", `
    <div class="tiny muted" style="margin-bottom:10px">의뢰·합동·거처·수업·거래·교류 소식이 모입니다. 30일 동안 보관하고, 아래 「더 보기」로 이전 알림을 봅니다.</div>
    <div class="row" style="flex-wrap:wrap;gap:5px;margin-bottom:8px">
      ${ALERTCATS.map(c=>{
        const n=c.k==="all"?S.alerts.length:S.alerts.filter(a=>a.c===c.k).length;
        return `<button class="btn sm ${ALERTTAB===c.k?"pri":"ghost"}" onclick="alertTab('${c.k}')">${c.n}${n?` ${n}`:""}</button>`;
      }).join("")}
    </div>
    <div style="max-height:52vh;overflow:auto">
      ${rows||'<div class="tiny muted" style="padding:26px 2px;text-align:center">받은 알림이 없습니다.</div>'}
    </div>
    ${list.length>ALERTSHOW?`<div style="text-align:center;margin-top:12px">
      <button class="btn sm" onclick="alertMore()">더 보기 <span class="muted">· ${list.length-ALERTSHOW}개 남음</span></button></div>`:""}
    <div class="row" style="margin-top:14px">
      <button class="btn sm ghost" onclick="alertClear()">모두 지우기</button>
      <span class="tiny muted">지워도 광장의 「사무전 소식」 기록은 남습니다.</span>
    </div>`);
}
/* 소식은 모두 알림함으로도 들어옵니다 */
const _pushNews8 = pushNews;
pushNews = function(t){
  _pushNews8(t);
  try{ alertPush(alertCatOf(t), t); }catch(e){}
};
/* 소식을 거치지 않는 것들도 따로 담습니다 */
const _achCheck8 = achCheck;
achCheck = function(){
  const before=(S.ach||[]).length;
  _achCheck8();
  if((S.ach||[]).length>before){
    (S.ach||[]).slice(before).forEach(id=>{
      const a=ACH.find(x=>x.id===id);
      if(a) alertPush("etc", `[달성] 업적 「${a.n}」을 달성했습니다. (+${a.p}점)`, "record");
    });
  }
};
const _finishPeriod8 = finishPeriod;
finishPeriod = function(){
  const L=S.lesson, id=L&&L.plan[L.idx];
  const s=id&&SUBJECTS.find(x=>x.id===id);
  _finishPeriod8();
  if(s) alertPush("study", `[수업] ${s.n} 1교시를 마쳤습니다. 지식과 경험치를 받았습니다.`, "class");
};
const _listMine8 = listMine;
listMine = function(id){
  const it=(S.bag||[]).find(x=>x.id===id);
  const before=S.rin;
  _listMine8(id);
  if(it && S.rin>before)
    alertPush("trade", `[거래] 중개소에서 「${it.name}」이(가) 팔렸습니다 · 륜 +${nf(S.rin-before)}`, "market");
};
/* 받은 친구·관계 신청 — 같은 신청으로 두 번 알리지 않습니다 */
const _socialFetch8 = (typeof socialFetch==="function") ? socialFetch : null;
if(_socialFetch8) socialFetch = async function(force){
  const r=await _socialFetch8(force);
  try{
    if(!Array.isArray(S.alertReq)) S.alertReq=[];
    (SOCIAL.links||[]).filter(l=>l.status==="pending" && String(l.to_id)===socialId())
      .forEach(l=>{
        if(S.alertReq.includes(l.id)) return;
        S.alertReq.push(l.id);
        if(S.alertReq.length>200) S.alertReq=S.alertReq.slice(-200);
        const created=Date.parse(String(l.created_at||""));
        if(Number.isFinite(created)&&created<=alertClearedAt())return;
        alertPush("soc", `[교류] ${socialName(socialPeer(l))} 님이 ${l.kind==="friend"?"친구":"관계"} 신청을 보냈습니다.`, "rel");
      });
  }catch(e){}
  return r;
};

/* ───────────────────────────────────────────────────
   ② 건축자재 — 의뢰에서 모아 목석 공방에서 다듬습니다
   ─────────────────────────────────────────────────── */
const BRAW=[
 {k:"원목", n:"젖은 원목",   e:ic("seedling"), d:"폐가에서 뜯어낸 들보. 아직 물을 머금었다."},
 {k:"석괴", n:"거친 석괴",   e:ic("crystal"),  d:"무너진 담에서 캐낸 덩어리."},
 {k:"고철", n:"녹슨 고철",   e:ic("gear"),     d:"의체와 간판에서 떨어져 나온 쇳조각."},
];
const BMADE=[
 {k:"합판", n:"다진 합판", e:ic("bookClosed"), rin:800,  raw:{원목:4},        d:"물을 빼고 켜서 붙였다. 벽과 바닥이 된다."},
 {k:"석재", n:"다듬은 석재", e:ic("castle"),   rin:1000, raw:{석괴:4},        d:"면을 쳐서 모를 세웠다. 주춧돌이 된다."},
 {k:"철물", n:"벼린 철물", e:ic("chains"),     rin:1500, raw:{고철:3},        d:"녹을 털고 벼렸다. 못과 경첩이 된다."},
];
const BKEYS=[...BRAW,...BMADE].map(x=>x.k);
function bEnsure(){
  if(!S.bmat || typeof S.bmat!=="object") S.bmat={};
  BKEYS.forEach(k=>{ if(typeof S.bmat[k]!=="number") S.bmat[k]=0; });
  return S.bmat;
}
function bHave(k){ return Number(bEnsure()[k])||0; }
function bName(k){ const x=[...BRAW,...BMADE].find(y=>y.k===k); return x?x.n:k; }
function bIcon(k){ const x=[...BRAW,...BMADE].find(y=>y.k===k); return x?x.e:""; }

/* 집 짓기 — 수확물 말고 건축자재로도 올릴 수 있습니다 */
const HOMEALT=[
 {합판:6,  석재:3},
 {합판:14, 석재:8,  철물:4},
 {합판:28, 석재:20, 철물:10},
 {합판:50, 석재:40, 철물:22},
 {합판:90, 석재:70, 철물:45},
];
const DORMALT=[
 {합판:4,  석재:2},
 {합판:10, 석재:5,  철물:2},
 {합판:20, 석재:14, 철물:7},
 {합판:38, 석재:28, 철물:15},
];
function homeAltOf(stage){
  const t=isDorm()?DORMALT:HOMEALT;
  return t[stage]||null;
}
function craftB(k,n){
  const r=BMADE.find(x=>x.k===k); if(!r) return;
  n=Math.max(1,Number(n)||1);
  if(S.rin < r.rin*n){ toast("륜이 부족합니다.","bad"); return; }
  for(const [rk,rv] of Object.entries(r.raw))
    if(bHave(rk) < rv*n){ toast(`${bName(rk)}이(가) 부족합니다.`,"bad"); return; }
  S.rin -= r.rin*n;
  Object.entries(r.raw).forEach(([rk,rv])=>{ S.bmat[rk]=bHave(rk)-rv*n; });
  S.bmat[k]=bHave(k)+n;
  toast(`${r.e} <b>${r.n}</b> ${n}개를 다듬었습니다.`,"good");
  renderTop(); renderMain(); save();
}
function craftBMax(k){
  const r=BMADE.find(x=>x.k===k); if(!r) return;
  let n=Math.floor(S.rin/r.rin);
  for(const [rk,rv] of Object.entries(r.raw)) n=Math.min(n, Math.floor(bHave(rk)/rv));
  if(n<1){ toast("재료나 륜이 모자랍니다.","bad"); return; }
  craftB(k, Math.min(n,99));
}
VIEWS.woodv=()=>{
  const need=homeAltOf(homeS().stage);
  const chip=(k,v)=>`<span class="tag ${bHave(k)>=v?"g":""}">${bIcon(k)} ${bName(k)} ${nf(bHave(k))}/${nf(v)}</span>`;
  return head("켜고 깎고 벼리는 자리", ic("castle")+" 목석 공방",
    "의뢰에서 주워 온 것을 집에 쓸 수 있는 꼴로 다듬습니다")+`
  <div class="grid g2">
    <div>
      <div class="card pad" style="margin-bottom:14px">
        <div class="sect-t">거둬 온 것</div>
        <div class="tiny muted" style="margin-bottom:10px">의뢰에서 적을 쓰러뜨리면 가끔 함께 떨어집니다. 단계가 높을수록 많이 나옵니다.</div>
        ${BRAW.map(x=>`<div class="spread" style="padding:7px 0;border-bottom:1px solid var(--line)">
          <span>${x.e} <b>${x.n}</b> <span class="tiny muted">· ${x.d}</span></span>
          <b style="color:var(--gold)">${nf(bHave(x.k))}</b></div>`).join("")}
      </div>
      <div class="card pad">
        <div class="sect-t">다듬기</div>
        ${BMADE.map(r=>{
          const canOne=S.rin>=r.rin && Object.entries(r.raw).every(([k,v])=>bHave(k)>=v);
          return `<div class="sub" style="margin-bottom:9px">
            <div class="spread"><div><b>${r.e} ${r.n}</b>
              <span class="tiny muted">· ${r.d}</span></div>
              <span class="tiny muted">보유 <b style="color:var(--gold)">${nf(bHave(r.k))}</b></span></div>
            <div class="row" style="gap:5px;margin:7px 0">
              ${Object.entries(r.raw).map(([k,v])=>`<span class="tag ${bHave(k)>=v?"g":""}">${bName(k)} ${v}</span>`).join("")}
              <span class="tag ${S.rin>=r.rin?"g":""}">륜 ${nf(r.rin)}</span></div>
            <div class="row">
              <button class="btn sm ${canOne?"pri":""}" ${canOne?"":"disabled"} onclick="craftB('${r.k}',1)">1개 다듬기</button>
              <button class="btn sm" ${canOne?"":"disabled"} onclick="craftBMax('${r.k}')">할 수 있는 만큼</button></div>
          </div>`;
        }).join("")}
      </div>
    </div>
    <div class="card pad">
      <div class="sect-t">집에 쓰기</div>
      <div class="tiny muted" style="margin-bottom:10px">거처 화면의 ${isDorm()?"방 꾸미기":"집 짓기"}에서
        <b>수확물로 올리기</b>와 <b>건축자재로 올리기</b> 가운데 하나를 고르면 됩니다. 둘 중 아무 쪽이어도 결과는 같습니다.</div>
      ${need?`<div class="sub">
        <div class="tiny" style="color:var(--gold);margin-bottom:6px">다음 단계에 드는 건축자재</div>
        <div class="row" style="gap:5px;flex-wrap:wrap">${Object.entries(need).map(([k,v])=>chip(k,v)).join("")}</div>
      </div>`:`<div class="tiny" style="color:var(--ok)">${isDorm()?"방을 다 꾸몄습니다.":"집을 다 지었습니다."}</div>`}
      <button class="btn" style="margin-top:12px" onclick="go('hallv')">거처로 가기</button>
      <div class="tiny muted" style="margin-top:12px;line-height:1.9">
        원목은 켜서 <b>합판</b>으로, 석괴는 쳐서 <b>석재</b>로, 고철은 벼려 <b>철물</b>로 바뀝니다.
        다듬는 데에는 재료와 륜이 들고, 파장은 쓰지 않습니다.</div>
    </div>
  </div>`;
};

/* 의뢰 처치 — 가끔 건축자재 원자재 */
const _runStep8 = runStep;
runStep = function(){
  const before = S.run ? S.run.kills : 0;
  _runStep8();
  if(S.run && S.run.kills>before && Math.random()<0.7){
    const x=pick(BRAW);
    const amt=rnd(2,4)+Math.floor((S.run.stage||1)/12);
    runMaterial("bmat",x.k,amt);
    pushRun(`<span class="s">${x.e} ${x.n}을(를) 챙겼다. +${amt}</span>`);
  }
};

/* ───────────────────────────────────────────────────
   ③ 페어 동거 — 더 좋은 집으로 자동으로 함께 듭니다
   ─────────────────────────────────────────────────── */
/* 집의 「좋기」 — 구역 특화 배율 × 성장 배율. 성장 0인 집은 아무리 비싼 구역이어도 지지 않습니다. */
function homeWorth(hall, stage){
  const h=(hall in HALLMULT)?hall:"dorm";
  const st=clamp(Number(stage)||0, 0, homeMax(h));
  return (HALLMULT[h]||1) * (HOMESTAGE[st]||0);
}
/* 두 집 가운데 동거할 집을 고릅니다 — 좋은 쪽, 같으면 일세가 비싼 쪽, 그래도 같으면 신청한 쪽 */
function pairSharedHome(){
  const P=(typeof pairEnsure==="function")?pairEnsure():null;
  if(!sbOn() || !P || !P.mine) return null;
  const r=(typeof pairRow==="function")?pairRow():null;
  if(!r || !(r.hall in HALLMULT)) return null;
  const mine={hall:S.hall, stage:homeS().stage, id:String(S.sb.id), name:S.name};
  const yours={hall:r.hall, stage:clamp(Number(r.home_stage)||0,0,homeMax(r.hall)), id:String(r.id), name:r.name||""};
  const wm=homeWorth(mine.hall,mine.stage), wy=homeWorth(yours.hall,yours.stage);
  let win;
  if(wm!==wy) win = wm>wy ? mine : yours;
  else {
    const rm=rentOf(mine.hall,mine.stage), ry=rentOf(yours.hall,yours.stage);
    if(rm!==ry) win = rm>ry ? mine : yours;
    else win = String(P.mine.from_id)===mine.id ? mine : yours;
  }
  return {hall:win.hall, stage:win.stage, ownerId:win.id, ownerName:win.name,
          mine:win.id===mine.id, worth:Math.max(wm,wy)};
}
/* 동거 적용 — 내 쪽이 아니면 상대의 집으로 들어갑니다 */
let PAIRMERGEAT=0;
function pairMergeApply(){
  const sh=pairSharedHome();
  if(!sh){ return false; }
  const h=homeS();
  if(S.hall===sh.hall && h.stage===sh.stage) return false;
  /* 혼자 살던 집은 따로 적어 둡니다 — 페어를 풀면 그대로 돌려드립니다 */
  if(!S.homeSolo) S.homeSolo={hall:S.hall, stage:h.stage};
  const fromHall=S.hall, fromStage=h.stage;
  S.hall=sh.hall;
  h.stage=clamp(sh.stage,0,homeMax(sh.hall));
  syncHall();
  if(Date.now()-PAIRMERGEAT>5000 && !(typeof QUIET!=="undefined"&&QUIET)){
    PAIRMERGEAT=Date.now();
    toast(`페어와 동거했습니다 · ${homeOf(sh.hall).n} ${h.stage}단계 (${esc(sh.ownerName||"페어")} 님의 집)`,"good");
  }
  pushNews(`[거처] ${S.name} 학생이 페어와 ${homeOf(sh.hall).n}에 동거했습니다.`);
  renderTop(); renderNav();
  if(VIEW==="hallv"||VIEW==="pairhub") renderMain(true);
  save();
  if(typeof syncUp==="function" && (fromHall!==S.hall||fromStage!==h.stage)) syncUp(true);
  return true;
}
/* 페어 정보를 받을 때마다 맞춥니다 */
const _pairFetch8 = pairFetch;
pairFetch = function(force){
  const p=_pairFetch8(force);
  return (p && typeof p.then==="function")
    ? p.then(v=>{ try{ pairMergeApply(); }catch(e){} return v; })
    : p;
};
/* 페어를 풀면 혼자 살던 집으로 돌아갑니다 */
const _pairBreak8 = pairBreak;
pairBreak = function(){
  const solo=S.homeSolo;
  const _f=pairFetch;
  _pairBreak8();
  setTimeout(()=>{
    if(S && S.pair && !S.pair.mine && solo && S.homeSolo){
      S.hall=solo.hall; homeS().stage=clamp(solo.stage,0,homeMax(solo.hall));
      S.homeSolo=null; syncHall(); renderTop(); renderNav(); renderMain(true); save();
      if(typeof syncUp==="function") syncUp(true);
      toast(`혼자 살던 ${homeOf(solo.hall).n} ${solo.stage}단계 집으로 돌아왔습니다.`);
    }
  }, 1500);
};
/* 동거 중에는 거처를 혼자 옮길 수 없다는 점을 먼저 알립니다 */
const _moveHall8 = moveHall;
moveHall = function(id){
  const sh=pairSharedHome();
  if(sh){
    const worth=homeWorth(id,0);
    if(worth<=sh.worth){
      toast(`페어와 동거 중입니다. ${homeOf(sh.hall).n} ${sh.stage}단계가 더 좋은 집이라 곧 다시 그리로 동거됩니다. 옮기려면 먼저 페어를 풀어 주세요.`,"bad");
      return;
    }
    if(!confirm(`지금 옮기면 페어도 함께 ${homeOf(id).n}로 들어옵니다. 두 사람 모두 집 단계가 0이 되고 일세도 이곳 기준으로 바뀝니다. 옮기시겠습니까?`)) return;
  }
  _moveHall8(id);
  if(sh) S.homeSolo=null;
};
/* 명부 단추에 페어 상대 이름까지 */
if(typeof pairBtn==="function"){
  const _pairBtn8 = pairBtn;
  pairBtn = function(r){
    if(typeof SOCIAL!=="undefined" && SOCIAL.ready && r){
      const row=SOCIAL.pairs.find(p=>[String(p.from_id),String(p.to_id)].includes(String(r.id)));
      if(row){
        const otherId = String(row.from_id)===String(r.id) ? row.to_id : row.from_id;
        const other = socialName(otherId);
        const nm = row.pair_name ? `「${esc(row.pair_name)}」 ` : "";
        const peer=(S.sb.roster||[]).find(x=>String(x.id)===String(otherId))||(SOCIAL.students||[]).find(x=>String(x.id)===String(otherId));
        const first=rosterThemeColor(String(r.id)===String(S.sb.id)?S.color:r.color);
        const second=rosterThemeColor(String(otherId)===String(S.sb.id)?S.color:peer?.color);
        return `<span class="tag roster-pair-tag" style="--pair-color-a:${first};--pair-color-b:${second}"><span>페어 · ${nm}${esc(other)}</span></span>`;
      }
    }
    return _pairBtn8(r);
  };
}
/* 동거 안내 칸 */
function pairMergeHTML(){
  const P=(typeof pairEnsure==="function")?pairEnsure():null;
  if(!sbOn() || !P || !P.mine) return "";
  const sh=pairSharedHome();
  if(!sh) return `<div class="card pad" style="margin-bottom:14px">
    <div class="sect-t">동거</div>
    <div class="tiny muted">상대가 한 번 접속하면 두 사람의 집 가운데 좋은 쪽으로 자동으로 합칩니다.</div></div>`;
  const h=homeOf(sh.hall);
  return `<div class="card pad" style="margin-bottom:14px;border-color:var(--gold2)">
    <div class="spread"><div class="sect-t" style="margin:0">동거</div>
      <span class="tag" style="border-color:${h.c};color:${h.c}">${esc(h.n)} ${sh.stage}단계</span></div>
    <div class="tiny muted" style="margin-top:4px;line-height:1.9">
      페어는 따로 살지 않습니다. 두 사람의 집 가운데 <b>좋은 쪽</b>으로 자동으로 함께 듭니다.
      지금은 <b>${esc(sh.mine?S.name:(sh.ownerName||"페어"))}</b> 님의 집입니다.
      한쪽이 집을 올리면 두 사람 모두 그 혜택을 받고, 일세도 한 번만 내면 둘 다 적용됩니다.
      페어를 풀면 각자 혼자 살던 집으로 돌아갑니다.</div>
    <div class="row" style="margin-top:10px">
      <button class="btn sm" onclick="go('hallv')">거처 관리</button>
      <button class="btn sm ghost" onclick="go('woodv')">목석 공방</button></div>
  </div>`;
}
/* 거처 따라가기 단추는 없앱니다 */
socialFollowHome = function(){ go("hallv"); };

/* ───────────────────────────────────────────────────
   ④ 거처 화면 — 수확물 / 건축자재 두 길
   ─────────────────────────────────────────────────── */
homeAct = function(){
  const h=homeS(), dorm=isDorm();
  const plan=homePlan(), top=homeMax();
  const next=plan[h.stage], alt=homeAltOf(h.stage);
  const rent=rentCharge(), late=rentLate(), due=rentPaidUntil();
  const paired=typeof pairRentActive==="function" && pairRentActive();
  const matRow=(m)=>Object.entries(m).map(([k,v])=>{
    const have=(S.mat&&S.mat[k])||0;
    return `<span class="tag ${have>=v?"g":""}">${k==="가루"?"부적":k} ${nf(have)}/${nf(v)}</span>`;
  }).join(" ");
  const altRow=(m)=>Object.entries(m).map(([k,v])=>
    `<span class="tag ${bHave(k)>=v?"g":""}">${bName(k)} ${nf(bHave(k))}/${nf(v)}</span>`).join(" ");
  const canMat = next && S.rin>=next.rin && Object.entries(next.mat).every(([k,v])=>((S.mat&&S.mat[k])||0)>=v);
  const canAlt = next && alt && S.rin>=next.rin && Object.entries(alt).every(([k,v])=>bHave(k)>=v);

  const rentCard = dorm ? `<div class="card pad">
    <div class="sect-t">일세 없음</div>
    <div class="tiny muted" style="line-height:1.9">
      사무전이 내어 준 방이라 <b>일세를 내지 않습니다.</b> 대신 꾸밀 수 있는 자리가
      <b>네 칸(혜택 100%)</b>까지입니다. 구역으로 나가면 다섯 칸(120%)까지 넓힐 수 있지만
      하루마다 일세를 내야 합니다.
    </div></div>` : `<div class="card pad">
    <div class="spread"><div class="sect-t" style="margin:0">일세</div>
      <span class="tiny ${late?"":"muted"}" style="${late?"color:var(--red)":""}">
        ${late?"미납 — 혜택이 멈췄습니다":(due?`다음 납부까지 ${hhmm(rentDue())}`:"아직 계약 전")}</span></div>
    <div class="tiny muted" style="margin-bottom:8px">
      24시간마다 <b style="color:var(--gold)">${rent===null?"페어의 거처 확인 중":rentMoney(rent)+" 륜"}</b>.
      숫자가 작은 구역일수록 비싸고, 집 단계마다 기본 일세의 35%가 더해집니다.
      밀려도 쫓겨나지는 않지만, 낼 때까지 거주지 혜택이 붙지 않습니다.</div>
    <div class="row">
      <button class="btn ${late?"pri":""}" onclick="payRent()">${h.rentPending?"납부 결과 다시 확인":due?"하루치 내기":"계약하고 하루치 내기"}
        <span class="tiny muted">${rent===null?"거처 확인":rentMoney(rent)}</span></button>
      <button class="btn sm ${h.auto?"pri":""}" onclick="toggleRentAuto()">
        자동 납부 ${h.auto?"켜짐":"꺼짐"}</button>
    </div>
    <div class="tiny muted" style="margin-top:6px">${paired
      ? `동거 중입니다. 둘 중 한 명만 내면 두 사람 모두 24시간 적용됩니다. 내 거처 기준 ${rentMoney(rentOf())} 륜/일.`
      : "자동 납부를 켜 두면 륜이 있을 때 알아서 빠집니다."}</div>
    ${h.rentPending?'<div class="tiny muted" style="margin-top:6px">일세를 처리 중입니다. 연결이 돌아오면 같은 납부 건으로 다시 확인합니다.</div>':""}
  </div>`;

  return rentCard + `
  <div class="card pad" style="margin-top:14px">
    <div class="spread"><div class="sect-t" style="margin:0">${dorm?"방 꾸미기":"집 짓기"}</div>
      <span class="tiny muted">${h.stage} / ${top} 단계</span></div>
    <div class="bar" style="margin:6px 0 10px"><i style="width:${h.stage/top*100}%"></i></div>
    ${plan.map((c,i2)=>`<div class="spread tiny" style="padding:3px 0;${i2<h.stage?"opacity:.55":""}">
      <span>${i2<h.stage?ic("check",11):`<b>${i2+1}</b>`} ${c.n}
        <span class="muted">· ${c.d}</span></span>
      <span class="muted">혜택 ${(HOMESTAGE[i2+1]*100).toFixed(0)}%</span></div>`).join("")}
    ${next?`<div class="card pad" style="background:var(--s1);margin-top:10px">
      <div class="tiny" style="color:var(--gold);margin-bottom:4px">다음 — ${next.n}</div>
      <div class="tiny muted" style="margin-bottom:8px">${next.d} · 완성하면 연등 +${next.lotus}</div>
      <div class="row" style="gap:5px;margin-bottom:10px">
        <span class="tag ${S.rin>=next.rin?"g":""}">륜 ${nf(S.rin)}/${nf(next.rin)}</span>
        <span class="tiny muted">어느 쪽으로 올려도 륜은 똑같이 듭니다</span></div>
      <div class="grid g2" style="gap:10px">
        <div class="sub">
          <div class="tiny" style="margin-bottom:6px"><b>수확물로 올리기</b>
            <span class="muted">· 약초밭 · 낚시 · 법구 분해</span></div>
          <div class="row" style="gap:5px;flex-wrap:wrap;margin-bottom:8px">${matRow(next.mat)}</div>
          <button class="btn ${canMat?"pri":""}" ${canMat?"":"disabled"} onclick="buildHome('mat')">${dorm?"들인다":"짓는다"}</button>
        </div>
        <div class="sub">
          <div class="tiny" style="margin-bottom:6px"><b>건축자재로 올리기</b>
            <span class="muted">· 의뢰에서 모아 목석 공방에서 다듬기</span></div>
          <div class="row" style="gap:5px;flex-wrap:wrap;margin-bottom:8px">${alt?altRow(alt):'<span class="tiny muted">이 단계는 건축자재로 올릴 수 없습니다.</span>'}</div>
          <div class="row">
            <button class="btn ${canAlt?"pri":""}" ${canAlt?"":"disabled"} onclick="buildHome('alt')">${dorm?"들인다":"짓는다"}</button>
            <button class="btn sm ghost" onclick="go('woodv')">공방</button></div>
        </div>
      </div></div>`
     :`<div class="tiny" style="color:var(--ok);margin-top:10px">${dorm?"방을 다 꾸몄습니다. 혜택이 100%로 붙습니다.":"집을 다 지었습니다. 혜택이 최대(120%)로 붙습니다."}</div>`}
  </div>`;
};
buildHome = function(mode){
  const h=homeS();
  const c=homePlan()[h.stage];
  if(!c){ toast(isDorm()?"이미 다 꾸몄습니다.":"이미 다 지었습니다."); return; }
  if(S.rin<c.rin){ toast("륜이 부족합니다.","bad"); return; }
  const alt=homeAltOf(h.stage);
  const useAlt = mode==="alt";
  if(useAlt){
    if(!alt){ toast("이 단계는 건축자재로 올릴 수 없습니다.","bad"); return; }
    for(const [k,v] of Object.entries(alt))
      if(bHave(k)<v){ toast(`${bName(k)}이(가) 부족합니다.`,"bad"); return; }
  }else{
    for(const [k,v] of Object.entries(c.mat))
      if(((S.mat&&S.mat[k])||0) < v){ toast(`${k==="가루"?"부적":k}이(가) 부족합니다.`,"bad"); return; }
  }
  S.rin-=c.rin;
  if(useAlt) Object.entries(alt).forEach(([k,v])=>{ S.bmat[k]=bHave(k)-v; });
  else Object.entries(c.mat).forEach(([k,v])=>{ S.mat[k]-=v; });
  h.stage++; S.lotus+=c.lotus;
  pushNews(`[거처] ${homeOf(S.hall).n}의 ${isDorm()?"방":"집"}에 「${c.n}」이 생겼습니다.`);
  toast(`<b>${c.n}</b> — ${c.d} <span class="muted">· 연등 +${c.lotus}</span>`,"good");
  syncHall(); renderTop(); renderNav(); renderMain(); save();
  if(typeof syncUp==="function") syncUp(true);
};
/* 거처 현황과 동거 안내를 같은 줄에 표시합니다. */
function pairHousingHTML(currentHome=""){
  const home=typeof pairHomeHTML==="function"?pairHomeHTML():"";
  const living=typeof pairMergeHTML==="function"?pairMergeHTML():"";
  return `<div class="pair-housing-row ${home&&living&&currentHome?'three-cards':''}">${home}${living}${currentHome}</div>`;
}

/* ───────────────────────────────────────────────────
   ⑤ 친구와 관계를 따로
   ─────────────────────────────────────────────────── */
function relCard(kind){
  const title = kind==="friend" ? "친구" : "관계";
  const note  = kind==="friend"
    ? "서로 수락하면 양쪽 명부에 친구로 남습니다. 호칭은 붙지 않습니다."
    : "서로를 어떻게 부를지 정합니다. 수락하면 두 사람 화면에 역할이 서로 반대로 보입니다. 관계 성립 후에도 호칭을 수정할 수 있습니다.";
  const links = SOCIAL.links.filter(r=>r.kind===kind);
  const pend  = links.filter(r=>r.status==="pending");
  const got   = pend.filter(r=>String(r.to_id)===socialId());
  const sent  = pend.filter(r=>String(r.from_id)===socialId());
  const done  = links.filter(r=>r.status==="accepted");
  const line=(r)=>{
    const from=String(r.from_id)===socialId();
    return kind==="friend" ? "서로 친구"
      : `나는 상대의 <b>${esc(from?r.role_from:r.role_to)}</b> · 상대는 나의 <b>${esc(from?r.role_to:r.role_from)}</b>`;
  };
  return `<div class="card pad" style="margin-bottom:14px">
    <div class="spread"><div class="sect-t" style="margin:0">${title}
      <span class="muted">· ${done.length}명</span></div>
      <button class="btn sm ghost" onclick="relPick('${kind}')">${title} 신청하기</button></div>
    <div class="tiny muted" style="margin:2px 0 10px">${note}</div>

    ${got.length?`<div class="sub" style="margin-bottom:9px;border-color:var(--gold2)">
      <div class="tiny" style="color:var(--gold);margin-bottom:4px">받은 ${title} 신청 ${got.length}</div>
      ${got.map(r=>`<div class="spread" style="padding:8px 0">
        <div>${socialProfile(socialPeer(r))}${kind==="relation"
          ?`<div class="tiny">${esc(r.role_from)} / ${esc(r.role_to)}</div>`:""}</div>
        <div class="row">
          <button class="btn sm pri" onclick="socialAction('respond',{id:${r.id},accept:true})">수락</button>
          <button class="btn sm ghost" onclick="socialAction('respond',{id:${r.id},accept:false})">거절</button></div>
      </div>`).join("")}</div>`:""}

    ${sent.length?`<div class="sub" style="margin-bottom:9px">
      <div class="tiny muted" style="margin-bottom:4px">보낸 ${title} 신청 ${sent.length}</div>
      ${sent.map(r=>`<div class="spread" style="padding:8px 0">
        <div>${socialProfile(socialPeer(r))}<div class="tiny muted">답을 기다리는 중</div></div>
        <button class="btn sm ghost" onclick="socialAction('remove',{id:${r.id}})">신청 취소</button></div>`).join("")}</div>`:""}

    ${done.length?done.map(r=>`<div class="spread" style="padding:11px 0;border-top:1px solid var(--line)">
      <div>${socialProfile(socialPeer(r))}<div style="margin-top:3px">${line(r)}</div></div>
      <div class="row">${kind==="relation"?`<button class="btn sm" onclick="socialRelationEdit(${r.id})">호칭 수정</button>`:""}<button class="btn sm ghost" onclick="socialRemove(${r.id})">해제</button></div></div>`).join("")
     :`<div class="tiny muted" style="padding:8px 0">아직 맺은 ${title}가 없습니다.</div>`}
  </div>`;
}
let RELFIND="";
function relFind(){ RELFIND=(document.getElementById("rel-find")||{}).value||""; renderMain(); }
function relPick(kind){
  const title = kind==="friend"?"친구":"관계";
  const rows=SOCIAL.students.filter(r=>String(r.id)!==socialId());
  modal(`${title} 신청하기`, `
    <div class="tiny muted" style="margin-bottom:10px">${kind==="friend"
      ? "상대가 수락하면 두 사람 명부에 친구로 남습니다."
      : "서로를 부르는 호칭을 정해 보냅니다. 상대가 수락해야 맺어집니다."}</div>
    <div style="max-height:52vh;overflow:auto">
    ${rows.map(r=>{
      const has=SOCIAL.links.some(l=>l.kind===kind&&String(socialPeer(l))===String(r.id)&&["accepted","pending"].includes(l.status));
      return `<div class="spread" style="padding:9px 2px;border-bottom:1px solid var(--line)">
        ${socialProfile(r.id)}
        ${has?`<span class="tag">등록 · 대기</span>`
             :`<button class="btn sm pri" onclick="closeModal();socialRequest(${socialArg(r.id)},'${kind}')">${title} 신청</button>`}
      </div>`;
    }).join("")||'<div class="tiny muted">명부에 다른 학생이 없습니다.</div>'}
    </div>`);
}
VIEWS.rel=()=>{
  const q=RELFIND.trim().toLowerCase();
  const rows=SOCIAL.students.filter(r=>String(r.id)!==socialId())
    .filter(r=>!q || String(r.name||"").toLowerCase().includes(q));
  return head("사무전 교류","친구 · 관계","친구와 관계는 따로 신청하고 따로 쌓입니다")
   + socialStatus()
   + (typeof pairHTML==="function" ? pairHTML() : "")
   + relCard("friend")
   + relCard("relation")
   + `<div class="card pad">
      <div class="sect-t">학생 찾기</div>
      <div class="row" style="margin-bottom:10px">
        <input class="inp" id="rel-find" value="${esc(RELFIND)}" placeholder="이름으로 찾기" onkeydown="if(event.key==='Enter')relFind()">
        <button class="btn sm" onclick="relFind()">찾기</button></div>
      ${rows.map(r=>{
        const tag=k=>SOCIAL.links.some(l=>l.kind===k&&String(socialPeer(l))===String(r.id)&&["accepted","pending"].includes(l.status));
        return `<div class="spread" style="padding:10px 0;border-bottom:1px solid var(--line)">
          <div>${socialProfile(r.id)}${typeof pairBtn==="function"?pairBtn(r):""}</div>
          <div class="row">
            ${tag("friend")?'<span class="tag">친구 · 등록/대기</span>'
              :`<button class="btn sm ghost" onclick="socialRequest(${socialArg(r.id)},'friend')">친구 신청</button>`}
            ${tag("relation")?'<span class="tag">관계 · 등록/대기</span>'
              :`<button class="btn sm ghost" onclick="socialRequest(${socialArg(r.id)},'relation')">관계 신청</button>`}
          </div></div>`;
      }).join("")||'<div class="tiny muted" style="padding:10px 0">찾는 학생이 없습니다.</div>'}
    </div>`;
};
/* 페어 화면 — 거처 따라가기 대신 동거 안내 */
VIEWS.pairhub=()=>{
  const p=(typeof pairEnsure==="function")?pairEnsure().mine:null;
  const shared=p&&SOCIAL.pairs.find(r=>String(r.id)===String(p.id));
  return head("둘만의 자리","페어",
      shared&&shared.pair_name?esc(shared.pair_name):"페어명과 동거한 거처를 함께 관리합니다")
    + socialStatus()
    + '<div class="pair-settings-row">'
    + (typeof pairHTML==="function"?pairHTML():"")
    + (p?`<div class="card pad" style="margin-bottom:14px">
        <label>페어명 (함께 사용하는 이름)</label>
        <input class="inp" id="pair-shared-name" maxlength="30" value="${esc((shared&&shared.pair_name)||"")}">
        <button class="btn sm" style="margin-top:8px"
          onclick="socialAction('pair_name',{id:${p.id},name:document.getElementById('pair-shared-name').value})">저장</button>
        <div class="tiny muted" style="margin-top:6px">명부의 상대 카드에도 이 이름이 함께 보입니다.</div>
      </div>`
      :`<div class="card pad" style="margin-bottom:14px">
        <div class="tiny muted" style="margin-bottom:8px">아직 페어가 없습니다. 명부에서 신청해 보세요.</div>
        <button class="btn sm" onclick="go('roster')">학생 명부</button></div>`)
    + '</div>'
    + pairHousingHTML()
    + (typeof pairRunHTML==="function"?pairRunHTML():"");
};

/* ───────────────────────────────────────────────────
   ⑥ 합동 전투 일지 — 피해가 들어가는 과정이 보입니다
   ─────────────────────────────────────────────────── */
const COOPFRAMES=12;            // 일지는 전투 길이를 열두 토막으로 나눠 적습니다
const secTxt=s=>(s<10?(Math.round(s*10)/10).toFixed(1):String(Math.round(s)))+"초";
const COOPFLAVOR=[
 "숨을 맞추고 한꺼번에 달려들었다.",
 "앞선 사람이 시선을 끌고 뒤에서 파고들었다.",
 "결계가 한 번 울리고 다시 닫혔다.",
 "바닥에 고인 물이 파장에 떨린다.",
 "서로의 자리를 바꿔 숨을 돌렸다.",
];
/* 참가자 전원의 힘으로 한 체씩 깎아 가는 기록을 만듭니다.
   승패 판정은 예전과 똑같이 두고, 일지만 과정이 보이도록 토막 냅니다. */
function coopSim(kind, stage, members){
  const dps=members.reduce((a,m)=>a+(+m.dps||0),0);
  const hp =members.reduce((a,m)=>a+(+m.hpv||0),0);
  const names=members.map(m=>m.name).join(" · ");
  const log=[];
  log.push({t:0, s:`${esc(names)} — 합산 초당 피해 ${nf(dps)} · 합산 생명력 ${nf(hp)}`, head:true});

  /* ─ 결계의 탑 — 버티기 ─ */
  if(kind==="guard"){
    const f=guardFoe(stage);
    const sust=hp/Math.max(1,f.dps*0.55);
    const win=sust>=30;
    const end=Math.min(30,sust);
    let left=hp;
    const slowG = end>=1.2;
    for(let i=1;i<=COOPFRAMES;i++){
      const t=end*i/COOPFRAMES;
      left=Math.max(0, Math.round(hp - f.dps*0.55*t));
      log.push({t, s:`${slowG?secTxt(t):(i+"/"+COOPFRAMES)} — 결계가 몰아친다. 남은 생명력 ${nf(left)} / ${nf(hp)}`, hp:left, max:hp});
      if(left<=0) break;
    }
    log.push(win
      ? {t:30, s:`<b>30초를 끝까지 버텼다.</b> 초당 피해 ${nf(f.dps)}를 ${members.length}명이 나눠 받았다.`, end:true, good:true}
      : {t:end, s:`${secTxt(end)} 만에 무너졌다. 30초를 버티지 못했다.`, end:true});
    return {dps, hp, log, win, sec:Math.round(end),
      line:`합산 생명력 ${nf(hp)} · ${stage}층 초당 피해 ${nf(f.dps)} → 버틴 시간 ${secTxt(end)} / 30초`};
  }

  /* ─ 석탑 · 의뢰 — 깎아 내기 ─ */
  let foes, limit, foeDps, win, line;
  if(kind==="tower"){
    const f=towerFoe(stage);
    limit=60; foeDps=f.dps;
    const sec=f.hp/Math.max(1,dps), sust=hp/Math.max(1,f.dps*0.55);
    win = sec<=60 && sust>=Math.min(60,sec);
    line=`합산 초당 피해 ${nf(dps)} · 합산 생명력 ${nf(hp)} · ${stage}층 체력 ${nf(f.hp)} → 제압 ${sec>60?"60초 안에 불가":sec<0.5?"즉시":secTxt(sec)} / 버팀 ${secTxt(sust)}`;
    foes=[{n:`석탑 ${stage}층 수문장`, max:f.hp}];
  }else{
    const q=questAt(stage);
    const need=Math.round((70+stage*26)*q.foes*1.6);
    limit=90; foeDps=Math.round(16+stage*7);
    const sec=need/Math.max(1,dps);
    win = sec<=90;
    line=`합산 초당 피해 ${nf(dps)} · 적 ${stage%10===0?1:q.foes}체 체력 ${nf(need)} → 정리 ${sec<0.5?"즉시":secTxt(sec)}`;
    /* 관문(10의 배수)은 커다란 한 체만 상대합니다 */
    if(stage%10===0){
      foes=[{n:`${q.ward.n}의 업귀 【${q.rank.r}등급】`, max:need, boss:true}];
    }else{
      const each=Math.max(1,Math.round(need/q.foes));
      foes=[];
      for(let i=0;i<q.foes;i++) foes.push({n:`${q.ward.n}의 업귀 ${i+1}`, max:each});
    }
  }
  const total=foes.reduce((a,f)=>a+f.max,0);
  const ttk=total/Math.max(1,dps);
  const shown=Math.min(ttk, limit);                 // 시간 안에 못 끝내면 제한 시간까지만 적습니다
  const frames=Math.max(6, Math.min(16, COOPFRAMES + (foes.length>1?foes.length:0)));
  /* 전투가 순식간에 끝나면 초 대신 토막 번호로 적습니다 — 「0.0초」가 줄줄이 찍히지 않도록 */
  const slow = shown>=1.2;
  let idx=0, intoFoe=0, dealt=0;
  for(let i=1;i<=frames;i++){
    const t=shown*i/frames;
    const mark = slow ? secTxt(t) : `${i}/${frames}`;
    const want=dps*t - dealt;
    if(want<=0) continue;
    dealt+=want;
    let rest=want;
    while(rest>0 && idx<foes.length){
      const f=foes[idx], room=f.max-intoFoe;
      const bite=Math.min(rest, room);
      intoFoe+=bite; rest-=bite;
      if(intoFoe>=f.max){
        log.push({t, s:`${mark} — <b>${esc(f.n)}</b>에 ${nf(Math.round(want))} 피해. 쓰러뜨렸다.`,
                  hp:0, max:f.max, kill:true});
        idx++; intoFoe=0;
      }else{
        const left=Math.round(f.max-intoFoe);
        log.push({t, s:`${mark} — <b>${esc(f.n)}</b>에 ${nf(Math.round(want))} 피해 · 남은 체력 ${nf(left)} / ${nf(f.max)} (${Math.round(left/f.max*100)}%)`,
                  hp:left, max:f.max});
      }
      break;                                        // 한 토막에 한 줄만 적습니다
    }
    if(idx>=foes.length) break;
  }
  const taken=Math.round(foeDps*0.55*shown);
  const howLong = ttk<0.5 ? "숨 한 번 쉬는 사이에" : `${secTxt(ttk)} 만에`;
  if(win) log.push({t:shown, s:`<b>모두 정리하고 ${howLong} 돌파했다.</b> 받은 피해 ${nf(taken)} / ${nf(hp)}`, end:true, good:true});
  else if(ttk>limit) log.push({t:limit, s:`${limit}초가 지났다. 체력을 ${Math.round(Math.min(100,dps*limit/total*100))}%까지 깎았지만 끝내지 못했다.`, end:true});
  else log.push({t:shown, s:`다 쓰러뜨렸지만 받은 피해 ${nf(taken)}를 버티지 못하고 물러났다.`, end:true});
  return {dps, hp, log, win, sec:Math.round(Math.min(ttk,limit)), line};
}
roomDepart = function(id){
  const r=S.sb.rooms.find(x=>x.id===id); if(!r) return;
  if(r.kind==="quest" && !questCheck(r.stage)) return;
  const ms=r.room_members||[];
  if(!ms.length){ toast("아무도 없습니다.","bad"); return; }
  const members=ms.map(m=>({id:m.student_id, name:m.name, dps:+m.dps||0, hpv:+m.hpv||0}));
  const sim=coopSim(r.kind, r.stage, members);
  const res={win:sim.win, kind:r.kind, stage:r.stage, dps:sim.dps, hp:sim.hp,
             line:sim.line,
             log:sim.log.slice(0,80), sec:sim.sec,
             members:members.map(m=>({id:m.id, name:m.name, dps:m.dps})),
             at:new Date().toISOString()};
  sbSend("PATCH",`rooms?id=eq.${id}`,{status:"done", result:res},"return=minimal")
    .then(()=>{ toast(sim.win?"돌파했습니다. 참가자 모두에게 기록됩니다.":"막혔습니다.", sim.win?"good":"bad");
      syncRooms(true); })
    .catch(e=>toast("출발하지 못했습니다 · "+esc(String(e.message||e)),"bad"));
};
/* 일지 되돌려 보기 */
let COOPTIMER=null;
function coopPlay(res, instant){
  if(COOPTIMER){ clearInterval(COOPTIMER); COOPTIMER=null; }
  const K=(typeof RKIND!=="undefined"&&RKIND[res.kind])||{n:"합동",e:""};
  const unit=res.kind==="quest"?"단계":"층";
  const log=res.log||[];
  const body=(n)=>`
    <div class="tiny muted" style="margin-bottom:8px">${esc((res.members||[]).map(m=>m.name).join(" · "))}</div>
    <div class="bar hp" style="margin-bottom:10px"><i id="coopbar" style="width:100%"></i></div>
    <div class="tiny muted" id="cooptarget" style="margin-bottom:8px">&nbsp;</div>
    <div class="log" id="cooplog" style="max-height:44vh;min-height:180px">
      ${log.slice(0,n).map(l=>`<div>${l.s}</div>`).join("")}
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn sm" onclick="coopSkip()">끝까지 보기</button>
      <span class="tiny muted">${K.e} ${K.n} ${res.stage}${unit} · ${res.win?"돌파":"실패"}</span>
    </div>`;
  modal(`${K.e} 함께 ${K.n} ${res.stage}${unit}`, body(instant?log.length:1));
  if(instant){ coopBarTo(log[log.length-1]); return; }
  let i=1;
  COOPTIMER=setInterval(()=>{
    const box=document.getElementById("cooplog");
    if(!box){ clearInterval(COOPTIMER); COOPTIMER=null; return; }
    if(i>=log.length){ clearInterval(COOPTIMER); COOPTIMER=null; return; }
    const l=log[i++];
    box.insertAdjacentHTML("beforeend", `<div>${l.s}</div>`);
    box.scrollTop=box.scrollHeight;
    coopBarTo(l);
  }, 420);
  COOPLAST=res;
}
let COOPLAST=null;
function coopBarTo(l){
  if(!l) return;
  const bar=document.getElementById("coopbar"), tg=document.getElementById("cooptarget");
  if(bar && typeof l.hp==="number" && l.max) bar.style.width=clamp(l.hp/l.max*100,0,100)+"%";
  if(tg && typeof l.hp==="number" && l.max) tg.innerHTML=`남은 체력 <b>${nf(l.hp)}</b> / ${nf(l.max)}`;
}
function coopSkip(){
  if(!COOPLAST) return;
  if(COOPTIMER){ clearInterval(COOPTIMER); COOPTIMER=null; }
  coopPlay(COOPLAST, true);
}
/* 결과를 받을 때 일지를 띄웁니다 */
const _claimRoom8 = claimRoom;
claimRoom = function(r){
  const had = S.sb.claimed.includes(r.id);
  const mine = r.result && (r.result.members||[]).some(m=>m.id===S.sb.id);
  _claimRoom8(r);
  if(!had && mine && r.result && (r.result.log||[]).length && !(typeof QUIET!=="undefined"&&QUIET)){
    COOPLAST=r.result;
    setTimeout(()=>coopPlay(r.result), 250);
  }
};
function coopOpen(id){
  const r=(S.sb.rooms||[]).find(x=>String(x.id)===String(id));
  if(!r||!r.result){ toast("일지를 찾을 수 없습니다."); return; }
  COOPLAST=r.result;
  if((r.result.log||[]).length) coopPlay(r.result, true);
  else toast("이 기록에는 일지가 남아 있지 않습니다. 다음 합동부터 일지가 적힙니다.");
}
/* 예전 공용 ‘같이 가기’ 화면에 덧씌우던 동행 일지 UI는 탑별 동행 분리 이후 제거했습니다.
   일지 확인 기능(coopOpen)은 계속 남기고 석탑·결계의 탑의 기록 카드에서 직접 호출합니다.
   삭제된 공용 동행 화면 함수를 참조하면 이 파일 나머지 전체가 로딩되지 않기 때문에
   호환 래퍼를 유지하지 않습니다. */

/* ───────────────────────────────────────────────────
   ⑦ 의뢰 진행 표시 — 1초마다 남은 시간이 줄어듭니다
   ─────────────────────────────────────────────────── */
let RUNUILOGS=-1;
setInterval(()=>{
  if(!S||!S.made||!S.run||S.run.done) return;
  if(VIEW!=="quest") return;
  const R=S.run;
  const clock=document.getElementById("runclock");
  if(!clock) return;
  if(R.logs.length!==RUNUILOGS){
    RUNUILOGS=R.logs.length;
    renderMain(true);
    return;
  }
  updateRunDisplay();
}, 1000);

/* ───────────────────────────────────────────────────
   길잡이 · 저장 상태
   ─────────────────────────────────────────────────── */
function ensureV8(){
  if(!S.bmat || typeof S.bmat!=="object") S.bmat={};
  BKEYS.forEach(k=>{ if(typeof S.bmat[k]!=="number") S.bmat[k]=0; });
  alertsEnsure();
  if(S.homeSolo===undefined) S.homeSolo=null;
}
(()=>{ const g=NAVDEF.find(x=>x.id==="craft");
  if(g && !g.sub.some(s=>s.id==="woodv")) g.sub.splice(1,0,{id:"woodv",n:"목석 공방"}); })();
if(typeof PLACES!=="undefined") PLACES.push({id:"woodp", n:"목석 공방", e:ic("castle"), x:34, y:11, view:"woodv"});

const _boot8 = boot;
boot = function(){ _boot8(); ensureV8(); renderTop(); renderNav(); renderMain(); };

/* ═══════════════════════════════════════════════════
   확장 8 · 두 번째 묶음
   ① 안내도 중복 메뉴 정리
   ② 페어 헤더 — 둘이 함께 쓰는 머리 그림
   ③ 페어 전용 게시판 — 둘만 보는 기록
   ═══════════════════════════════════════════════════ */

/* ───────── ① 안내도 — 「사무전 광장」 아래와 「페어」에 같은 항목이 두 번 뜨던 것 ───────── */
(()=>{
  for(let i=NAVDEF.length-1;i>=0;i--) if(NAVDEF[i].id==="pairmenu") NAVDEF.splice(i,1);
  const pg=NAVDEF.find(g=>g.id==="plaza");
  if(pg){
    pg.n="광장 · 페어";
    pg.ic=ic("gate");
    pg.sub=[{id:"plaza",n:"사무전 광장"},{id:"pairhub",n:"우리 페어"},
            {id:"pairboard",n:"둘의 기록"},{id:"hallv",n:"거처"}];
  }
  if(typeof MOBILE_GROUP_NAMES!=="undefined") MOBILE_GROUP_NAMES.plaza="광장";
  /* 거처가 기록 묶음에 남아 있으면 그것도 한 번만 */
  const rg=NAVDEF.find(g=>g.id==="rec");
  if(rg&&rg.sub) rg.sub=rg.sub.filter(s=>s.id!=="hallv");
})();

/* ───────── 사람 카드에 쓰는 거리들 ───────── */
function pairMe(){
  return {id:String(S.sb&&S.sb.id||""), name:S.name, line:S.line||"", course:S.course,
          lvl:S.lvl, color:S.color, av:S.av, av_img:S.avImg||"", title:S.title||""};
}
function pairPeer(){
  const P=(typeof pairEnsure==="function")?pairEnsure():null;
  if(!P||!P.mine) return null;
  const o=pairOther(P.mine);
  const r=(S.sb.roster||[]).find(x=>String(x.id)===String(o.id)) ||
          (P.partner&&String(P.partner.id)===String(o.id)?P.partner:null);
  return {id:String(o.id), name:(r&&r.name)||o.name||"", line:(r&&r.line)||"",
          course:(r&&r.course)||1, lvl:(r&&r.lvl)||1, color:(r&&r.color)||"var(--violet)",
          av:(r&&r.av)||"lantern", av_img:(r&&r.av_img)||"", title:(r&&r.title)||"", nick:o.nick||""};
}
function faceHTML(p, size){
  const b=p.color||"var(--violet)";
  if(p.av_img) return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;
    border:2px solid ${b};flex:none;background:var(--s0)">
    <img src="${p.av_img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>`;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;border:2px solid ${b};
    display:grid;place-items:center;background:var(--s0);flex:none">${ic(p.av||"lantern",Math.round(size*0.5))}</div>`;
}
/* 장인이 앞, 마무기가 뒤 */
function pairOrder(){
  const me=pairMe(), you=pairPeer();
  if(!you) return [me];
  const rank=p=>/장인/.test(p.line||"") ? 0 : /무기/.test(p.line||"") ? 1 : 2;
  const a=[me,you];
  a.sort((x,y)=>rank(x)-rank(y));
  return a;
}

/* ───────── ② 페어 헤더 ───────── */
const PAIRHEADW=1500, PAIRHEADH=625, PAIRHEADMAX=420000;   // 글자로 바꿨을 때의 한도
/* 헤더 그림과 글 목록은 저장본에 넣지 않습니다 — 커서 저장이 무거워집니다.
   서버가 원본을 갖고 있으니 켤 때마다 다시 받아 옵니다. */
const PAIRHEAD={img:"", tokens:["",""], fontCSS:"", at:"", loading:false, forId:null};
function pairHeadDecode(raw){
 try{const v=JSON.parse(raw);if(v?.v===2)return {img:pairHeadImage(v.img),tokens:[0,1].map(i=>pairHeadImage(v.tokens?.[i])),fontCSS:typeof v.fontCSS==="string"?v.fontCSS.slice(0,12000):""};}catch{}
 return {img:pairHeadImage(raw),tokens:["",""],fontCSS:""};
}
function pairHeadImage(value){return typeof value==="string"&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)?value:"";}
function pairHeadEncode(img,tokens,fontCSS=pairHeadState().fontCSS||""){return JSON.stringify({v:2,img,tokens,fontCSS});}
const PAIR_FONT_CACHE=new Map();
function pairFontURL(raw){const u=new URL(raw);if(u.protocol!=="https:")throw Error("HTTPS 폰트 주소를 사용해 주세요.");return u.href;}
function pairFontSpec(css){
 if(!css.trim())return null;
 if(css.length>12000)throw Error("폰트 CSS는 12,000자 이내로 넣어 주세요.");
 const imported=css.match(/@import\s+(?:url\(\s*)?["']([^"']+)["']/i);
 if(imported)return {url:pairFontURL(imported[1])};
 const faces=pairFontFaces(css);if(!faces.length)throw Error("@import 또는 @font-face 형식을 확인해 주세요.");
 return {faces};
}
function pairFontFaces(css){
 return [...css.matchAll(/@font-face\s*\{([^}]+)\}/gi)].map(m=>{
  const family=m[1].match(/font-family\s*:\s*([^;]+)/i)?.[1]?.trim().replace(/^["']|["']$/g,'');
  const source=m[1].match(/(?:^|;)\s*src\s*:\s*([^;]+)/i)?.[1];
  const urls=[...(source||'').matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)].map(u=>`url("${pairFontURL(u[1])}")`);
  if(!family||!urls.length)return null;
  const weight=m[1].match(/font-weight\s*:\s*([^;]+)/i)?.[1]?.trim()||'400';
  const style=m[1].match(/font-style\s*:\s*([^;]+)/i)?.[1]?.trim()||'normal';
  const unicodeRange=m[1].match(/unicode-range\s*:\s*([^;]+)/i)?.[1]?.trim();
  return {family,source:urls.join(','),descriptors:{weight,style,...(unicodeRange?{unicodeRange}:{})}};
 }).filter(Boolean);
}
function pairFontLoad(css){
 if(!css.trim())return Promise.resolve('');
 if(PAIR_FONT_CACHE.has(css))return PAIR_FONT_CACHE.get(css);
 const task=(async()=>{const spec=pairFontSpec(css);let faces=spec.faces;
  if(spec.url){const res=await fetch(spec.url);if(!res.ok)throw Error('폰트 CSS를 불러오지 못했습니다.');faces=pairFontFaces(await res.text());}
  if(!faces?.length)throw Error('불러온 CSS에서 폰트를 찾지 못했습니다.');
  // FontFace만 등록하므로 입력한 CSS가 다른 화면의 스타일을 바꾸지 않습니다.
  const loaded=await Promise.all(faces.map(async f=>{const font=new FontFace(f.family,f.source,f.descriptors);await font.load();document.fonts.add(font);return f.family;}));return loaded[0];
 })();PAIR_FONT_CACHE.set(css,task);task.catch(()=>PAIR_FONT_CACHE.delete(css));return task;
}
function pairFontApply(css,selector='.pair-scene-name'){
 pairFontLoad(css).then(family=>{document.querySelectorAll(selector).forEach(el=>{if(el.dataset.fontCss!==css)return;el.style.fontFamily=family?JSON.stringify(family)+', Georgia, serif':'';});}).catch(()=>{});
}
async function pairFontPreview(){
 const css=document.getElementById('phfont').value.trim(),preview=document.getElementById('phfont-preview'),status=document.getElementById('phfont-status');
 preview.dataset.fontCss=css;preview.style.fontFamily='';status.textContent=css?'폰트 불러오는 중…':'기본 폰트';
 try{const family=await pairFontLoad(css);if(preview.dataset.fontCss!==css)return;preview.style.fontFamily=family?JSON.stringify(family)+', serif':'';status.textContent=family?'적용됨 · '+family:'기본 폰트';}catch(e){status.textContent=e.message||'폰트를 불러오지 못했습니다. 주소와 외부 접근 허용 여부를 확인해 주세요.';}
}
function pairHeadState(){ return PAIRHEAD; }
/* 바뀌었을 때만 내려받습니다 — 그림이 커서 20초마다 받으면 느려집니다 */
let PAIRHEADAT=0;
function pairHeadFetch(force){
  const P=pairEnsure();
  if(!sbOn() || !P.mine) return Promise.resolve(false);
  const H=pairHeadState();
  if(!force && Date.now()-PAIRHEADAT<20000) return Promise.resolve(false);
  PAIRHEADAT=Date.now();
  const id=encodeURIComponent(P.mine.id);
  return sbGet(`pairs?select=id,header_at&id=eq.${id}&limit=1`)
    .then(rows=>{
      const row=(rows||[])[0];
      if(!row) return false;
      const at=row.header_at||"";
      if(H.forId===String(P.mine.id) && H.at===at) return false;     // 그대로면 그냥 둡니다
      if(!at){ H.img=""; H.tokens=["",""]; H.fontCSS=""; H.at=""; H.forId=String(P.mine.id);
               if(VIEW==="pairhub") renderMain(true); return true; }
      H.loading=true;
      return sbGet(`pairs?select=id,header,header_at&id=eq.${id}&limit=1`).then(full=>{
        const f=(full||[])[0]||{};
        Object.assign(H,pairHeadDecode(f.header||"")); H.at=f.header_at||""; H.forId=String(P.mine.id); H.loading=false;
        if(VIEW==="pairhub") renderMain(true);
        return true;
      });
    })
    .catch(()=>{ pairHeadState().loading=false; return false; });
}
/* 그림을 1500×1000 안쪽으로 줄여 글자로 바꿉니다 */
function pairHeadShrink(img){
  let w=PAIRHEADW, h=PAIRHEADH;
  for(const q of [0.82,0.72,0.62,0.52]){
    for(const scale of [1,0.8,0.65]){
      const cw=Math.round(w*scale), ch=Math.round(h*scale);
      const c=document.createElement("canvas"); c.width=cw; c.height=ch;
      const g=c.getContext("2d");
      g.imageSmoothingEnabled=true; g.imageSmoothingQuality="high";
      /* 가운데를 기준으로 3:2 로 잘라 채웁니다 */
      const s=Math.max(cw/img.naturalWidth, ch/img.naturalHeight);
      const dw=img.naturalWidth*s, dh=img.naturalHeight*s;
      g.drawImage(img, (cw-dw)/2, (ch-dh)/2, dw, dh);
      let url="";
      try{ url=c.toDataURL("image/jpeg", q); }catch(e){ return ""; }
      if(url.length<=PAIRHEADMAX) return url;
    }
  }
  return "";
}
function pairHeadPick(){
  PAIRHEADNEW=""; PAIRHEADTOKENS=[...(pairHeadState().tokens||["",""])];
  const P=pairEnsure();
  if(!P.mine){ toast("페어가 있어야 헤더를 걸 수 있습니다.","bad"); return; }
  modal("페어 헤더 걸기", `
    <div class="tiny muted" style="line-height:1.9">
      <b>1500 × 625</b>(가로:세로 12:5) 그림이 가장 잘 맞습니다. 다른 비율은 가운데를 기준으로 잘라 씁니다.<br>
      건 그림은 <b>페어 두 사람에게 똑같이</b> 보입니다. 상대가 바꾸면 내 화면도 함께 바뀝니다.<br>
      <b>생성형 AI로 만든 그림, 허락받지 않은 다른 사람의 그림은 사용할 수 없습니다.</b>
      받은 그림이라면 아래에 출처를 남겨 주세요.</div>
    <label class="f" style="margin-top:12px">그림 고르기</label>
    <input type="file" id="phfile" accept="image/*" class="inp">
    <label class="f" style="margin-top:10px">출처 (선택 · 30자)</label>
    <input class="inp" id="phsrc" maxlength="30" value="${esc(S.pairHeadSrc||'')}" placeholder="예: ○○님 커미션">
    <div id="phprev" style="margin-top:12px"></div>
    <div class="tiny muted" style="margin-top:12px">토큰 2개 · 투명 PNG 권장. 왼쪽 아래에 나란히 표시됩니다. 배경을 바꾸지 않고 토큰만 저장할 수도 있습니다.</div>
    <div class="pair-token-fields">${[0,1].map(i=>`<div><label class="f">토큰 ${i+1}</label><input type="file" accept="image/png,image/webp,image/jpeg" class="inp" onchange="pairTokenPick(this,${i})"><div id="phtoken${i}" class="pair-token-preview">${PAIRHEADTOKENS[i]?`<img src="${PAIRHEADTOKENS[i]}" alt="토큰 ${i+1}">`:''}</div><button class="btn sm ghost" onclick="pairTokenRemove(${i})">토큰 지우기</button></div>`).join('')}</div>
    <label class="f" style="margin-top:14px" for="phfont">페어명 폰트 CSS</label>
    <textarea class="inp" id="phfont" rows="5" maxlength="12000" placeholder="@import url('https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap');">${esc(pairHeadState().fontCSS||'')}</textarea>
    <div class="tiny muted">@import 또는 @font-face 전체를 붙여 넣어 주세요. 비우면 기본 폰트로 돌아갑니다. 폰트는 페어명에만 적용됩니다.</div>
    <button class="btn sm" style="margin-top:8px" onclick="pairFontPreview()">폰트 미리보기</button>
    <div id="phfont-preview" class="pair-font-preview">${esc(SOCIAL.pairs.find(p=>String(p.id)===String(P.mine.id))?.pair_name||'페어명 미리보기')}</div><div class="tiny muted" id="phfont-status"></div>
    <div class="row" style="margin-top:12px">
      <button class="btn pri" id="phsave" onclick="pairHeadSave()">저장</button>
      ${pairHeadState().img?'<button class="btn sm red" onclick="pairHeadClear()">지금 헤더 내리기</button>':""}
    </div>`, "wide");
  const f=document.getElementById("phfile");
  f.onchange=e=>{
    const file=e.target.files&&e.target.files[0]; if(!file) return;
    if(file.size>14*1024*1024){ toast("그림이 너무 큽니다. 14MB 이하로 올려 주세요.","bad"); return; }
    const rd=new FileReader();
    rd.onload=()=>{
      const im=new Image();
      im.onload=()=>{
        const url=pairHeadShrink(im);
        if(!url){ toast("그림을 줄이지 못했습니다. 더 작은 그림으로 해 주세요.","bad"); return; }
        PAIRHEADNEW=url;
        document.getElementById("phprev").innerHTML=
          `<img src="${url}" style="width:100%;border-radius:10px;display:block">
           <div class="tiny muted" style="margin-top:5px">보관 크기 약 ${Math.round(url.length/1024)}KB</div>`;
        document.getElementById("phsave").disabled=false;
      };
      im.onerror=()=>toast("그림을 읽지 못했습니다.","bad");
      im.src=rd.result;
    };
    rd.onerror=()=>toast("파일을 읽지 못했습니다.","bad");
    rd.readAsDataURL(file);
  };
}
let PAIRHEADNEW="",PAIRHEADTOKENS=["",""];
function pairTokenRemove(i){PAIRHEADTOKENS[i]="";document.getElementById('phtoken'+i).innerHTML='';}
function pairTokenPick(input,i){
 const file=input.files?.[0];if(!file)return;
 if(file.size>14*1024*1024){toast("토큰은 14MB 이하로 올려 주세요.","bad");return;}
 const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{
  let url='';for(const size of [480,360,240,160]){const scale=Math.min(1,size/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);url=canvas.toDataURL('image/png');if(url.length<180000)break;}
  if(url.length>=180000){toast("더 작은 토큰을 선택해 주세요.","bad");return;}
  PAIRHEADTOKENS[i]=url;document.getElementById('phtoken'+i).innerHTML=`<img src="${url}" alt="토큰 ${i+1}">`;
 };img.onerror=()=>toast("토큰을 읽지 못했습니다.","bad");img.src=reader.result;};reader.readAsDataURL(file);
}
function pairHeadSave(){
  const P=pairEnsure();
  if(!P.mine) return;
  const image=PAIRHEADNEW||pairHeadState().img;
  const tokens=[...PAIRHEADTOKENS];
  const fontCSS=(document.getElementById("phfont")?.value??pairHeadState().fontCSS??"").trim();
  try{pairFontSpec(fontCSS);}catch(e){toast(e.message,"bad");return;}
  const src=(document.getElementById("phsrc")||{}).value||"";
  const at=new Date().toISOString();
  const btn=document.getElementById("phsave"); if(btn) btn.disabled=true;
  sbSend("PATCH",`pairs?id=eq.${P.mine.id}`,{header:pairHeadEncode(image,tokens,fontCSS), header_at:at},"return=minimal")
    .then(()=>{
      const H=pairHeadState();
      H.img=image; H.tokens=tokens; H.fontCSS=fontCSS; H.at=at; H.forId=String(P.mine.id);
      S.pairHeadSrc=src.trim().slice(0,30);
      PAIRHEADNEW="";
      closeModal(); renderMain(true); save();
      toast("헤더를 걸었습니다. 페어 두 사람에게 같이 보입니다.","good");
      pushNews(`[인연] ${S.name} 학생이 페어 헤더를 바꿨습니다.`);
    })
    .catch(()=>{
      if(btn) btn.disabled=false;
      toast("헤더를 걸지 못했습니다. 운영 서버의 페어 게시판 설치 상태를 확인해 주세요.","bad");
    });
}
function pairHeadClear(){
  const P=pairEnsure(); if(!P.mine) return;
  if(!confirm("헤더를 내릴까요? 두 사람 화면에서 모두 사라집니다.")) return;
  sbSend("PATCH",`pairs?id=eq.${P.mine.id}`,{header:pairHeadEncode("",pairHeadState().tokens||["",""]), header_at:new Date().toISOString()},"return=minimal")
    .then(()=>{ const H=pairHeadState(); H.img=""; H.at=""; closeModal(); renderMain(true);
      toast("헤더를 내렸습니다."); })
    .catch(()=>toast("내리지 못했습니다.","bad"));
}
/* 헤더 배경 위에 토큰 두 개와 함께 쓰는 페어명만 표시합니다. */
function pairHeadHTML(){
 const P=pairEnsure();if(!sbOn()||!P.mine)return '';
 const H=pairHeadState(),shared=SOCIAL.pairs.find(r=>String(r.id)===String(P.mine.id));
 const colors=pairOrder().map(p=>rosterThemeColor(p.color));
 const colorA=colors[0]||'var(--gold)',colorB=colors[1]||colorA;
 const fontCSS=H.fontCSS||'';setTimeout(()=>pairFontApply(fontCSS),0);
 return `<div class="card pair-scene-card">
  <div class="pair-scene">
   ${H.img?`<img class="pair-scene-bg" src="${H.img}" alt="페어 헤더">`:'<div class="pair-scene-empty tiny muted">헤더 설정에서 배경과 토큰 2개를 올려 보세요 · 권장 1500 × 625</div>'}
   <div class="pair-scene-shade"></div>
   <div class="pair-scene-tokens">${[0,1].map(i=>H.tokens?.[i]?`<img src="${H.tokens[i]}" alt="페어 토큰 ${i+1}">`:'').join('')}</div>
   <div class="pair-scene-name" data-font-css="${esc(fontCSS)}" style="--pair-name-a:${colorA};--pair-name-b:${colorB}">${esc(shared?.pair_name||'이름 없는 페어')}</div>
  </div>
  <div class="spread pair-scene-tools"><span class="tiny muted">${H.loading?'헤더를 불러오는 중입니다':S.pairHeadSrc?`헤더 출처 — ${esc(S.pairHeadSrc)}`:'배경과 토큰은 두 사람이 함께 씁니다'}</span><div class="row"><button class="btn sm ghost" onclick="pairHeadPick()">헤더·토큰 설정</button><button class="btn sm ghost" onclick="pairHeadFetch(true)">새로 고침</button></div></div>
 </div>`;
}

/* ───────── ③ 페어 전용 게시판 ───────── */
const PAIRBOARD={rows:[], at:0, forId:null, err:"", loaded:false, loading:false};
function pairPostState(){ return PAIRBOARD; }
let PAIRBOARDBUSY=false;
const PAIRPOST_PAGE=300;
/* 서버 기본 300개 제한 때문에 긴 타래의 이전 글이 사라지던 문제를 해결합니다.
   첫 방문/수동 새로고침은 모든 페이지를 읽고, 이후 자동 갱신은 새 글만 읽습니다. */
async function pairPostFetch(force){
  const P=pairEnsure();
  if(!sbOn() || !P.mine) return false;
  const B=pairPostState(), pairId=String(P.mine.id);
  if(PAIRBOARDBUSY) return false;
  if(!force && B.loaded && B.forId===pairId && Date.now()-B.at<12000)return false;
  PAIRBOARDBUSY=true;
  const changed=B.forId!==pairId;
  if(changed){B.rows=[]; B.forId=pairId; B.loaded=false; B.err="";}
  const full=!!force||!B.loaded;
  B.loading=true;
  if(VIEW==="pairboard" && !B.rows.length)renderMain(true);
  const base=`pair_posts?select=*&pair_id=eq.${encodeURIComponent(pairId)}`;
  const initialRows=B.rows.slice();
  const fetched=[];
  let cursor="";
  try{
    if(!full && initialRows.length){
      // 새 글을 오름차순으로 페이지 순회: 새 글이 한 번에 300개를 넘더라도 누락 없음.
      const lastId=initialRows.reduce((a,p)=>!a || Number(p.id)>Number(a)?String(p.id):a,"");
      cursor=lastId;
      while(true){
        const page=await sbGet(`${base}&id=gt.${encodeURIComponent(cursor)}&order=id.asc&limit=${PAIRPOST_PAGE}`);
        if(!Array.isArray(page))throw new Error("페어 게시판 서버 응답이 올바르지 않습니다.");
        fetched.push(...page);
        if(page.length<PAIRPOST_PAGE)break;
        const next=String(page[page.length-1].id);
        if(next===cursor)throw new Error("페어 기록 페이지 이동이 멈췄습니다.");
        cursor=next;
      }
    }else{
      // 예전 글까지 보존한 전체 기록을 최신 페이지부터 차례로 요청합니다.
      while(true){
        const before=cursor?`&id=lt.${encodeURIComponent(cursor)}`:"";
        const page=await sbGet(`${base}${before}&order=id.desc&limit=${PAIRPOST_PAGE}`);
        if(!Array.isArray(page))throw new Error("페어 게시판 서버 응답이 올바르지 않습니다.");
        fetched.push(...page);
        if(page.length<PAIRPOST_PAGE)break;
        const next=String(page[page.length-1].id);
        if(next===cursor)throw new Error("페어 기록 페이지 이동이 멈췄습니다.");
        cursor=next;
      }
    }
    if(String(pairEnsure().mine?.id)!==pairId)return false;
    const keep=full?[]:B.rows;
    const map=new Map();
    for(const row of [...keep,...fetched])map.set(String(row.id),row);
    // 전체 동기화 중 직접 등록된 새로운 글은 보존합니다.
    if(full){
      const latest=fetched.length?Math.max(...fetched.map(r=>Number(r.id))):0;
      for(const row of B.rows){if(Number(row.id)>latest)map.set(String(row.id),row);}
    }
    B.rows=[...map.values()].sort((a,b)=>Number(b.id)-Number(a.id));
    B.loaded=true;B.err="";B.at=Date.now();
    if(VIEW==="pairboard")renderMain(true);
    return true;
  }catch(e){
    B.err="둘의 기록을 모두 불러오지 못했습니다. 연결과 페어 게시판 권한을 확인하고 다시 시도해 주세요.";
    B.loaded=false;
    console.warn("pair_posts fetch failed:",e);
    if(VIEW==="pairboard")renderMain(true);
    return false;
  }finally{
    B.loading=false;PAIRBOARDBUSY=false;
    if(VIEW==="pairboard" && String(pairEnsure().mine?.id)===pairId)renderMain(true);
  }
}
/* 페어 기록 · 마스토돈형 타임라인과 답글 연쇄 */
let PAIRPOSTSUBMIT=false;
document.addEventListener("keydown",e=>{if(VIEW==="pairboard"&&e.target?.id==="pb-write"&&e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();pairPostSend(null);}});
function pairPostFind(id){
  return (pairPostState().rows||[]).find(p=>String(p.id)===String(id));
}
function pairPostMarks(type){
  const key="mm-pair-"+type+"-"+String(S.sb&&S.sb.id||"")+"-"+String(pairEnsure().mine?.id||"");
  try{ return {key, values:JSON.parse(localStorage.getItem(key)||"[]")}; }
  catch(e){return {key,values:[]};}
}
function pairPostToggle(type,id){
  if(type!=="heart" && type!=="bookmark")return;
  const {key,values}=pairPostMarks(type), sid=String(id);
  const next=values.map(String).includes(sid)?values.map(String).filter(x=>x!==sid):[...values.map(String),sid];
  try{localStorage.setItem(key,JSON.stringify(next));}catch(e){toast("기기에 보관할 공간이 부족합니다.","bad");return;}
  // 전체 화면을 새로 그리지 않아 작성 중이던 글을 지우지 않습니다.
  document.querySelectorAll(`.mm-action[data-kind="${type}"][data-post="${sid}"]`).forEach(btn=>{
    btn.classList.toggle("on",next.includes(sid));
    btn.setAttribute("aria-pressed",String(next.includes(sid)));
  });
}
function pairPostIcon(name){
  const paths={
    reply:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.45 0-2.9-.35-4.15-1l-5.3 1 1.1-4.85A8.5 8.5 0 1 1 21 11.5Z"/>',
    quote:'<path d="M4 7h12.5a3.5 3.5 0 0 1 0 7H7"/><path d="m9.5 11.5-3 2.5 3 2.5"/><path d="M20 17H9"/>',
    heart:'<path d="M20.8 9.1c0 4.6-8.8 10.1-8.8 10.1S3.2 13.7 3.2 9.1a4.8 4.8 0 0 1 8.8-2.6 4.8 4.8 0 0 1 8.8 2.6Z"/>',
    bookmark:'<path d="M6 3.5h12v17l-6-4-6 4z"/>',
    more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'
  };
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${paths[name]||""}</svg>`;
}
function pairPostWhen(t){
  const ms=new Date(t).getTime(), gap=Math.max(0,(Date.now()-ms)/60000);
  if(!Number.isFinite(ms))return "기록";
  if(gap<1)return "방금";
  if(gap<60)return Math.floor(gap)+"분 전";
  if(gap<1440)return Math.floor(gap/60)+"시간 전";
  if(gap<43200)return Math.floor(gap/1440)+"일 전";
  return new Date(ms).toLocaleDateString("ko-KR");
}
function pairHandle(p){return "@"+String(p.id||"").replace(/^ACC_/,"").slice(0,14);}
function pairPostReply(id,quote=false){
  const p=pairPostFind(id);if(!p){toast("답할 글을 찾지 못했습니다. 새로 고침 후 다시 시도해 주세요.","bad");return;}
  const youName=String(p.author_name||"상대");
  modal(esc(youName)+" 님에게 답하기",`
    <div class="mm-reply-parent"><div class="mm-context">${esc(youName)} · ${esc(pairPostWhen(p.created_at))}</div>
      <div class="mm-reply-snippet">${fmtChat(p.body)}</div></div>
    <label for="pb-reply-${p.id}" class="tiny muted">답글은 선택한 글에 직접 연결됩니다.</label>
    <textarea class="inp" id="pb-reply-${p.id}" rows="5" maxlength="1000" style="width:100%;margin-top:8px"
      placeholder="대사와 *행동* 또는 (행동)으로 이어 써 주세요"></textarea>
    <div class="spread" style="margin-top:10px">
      <span class="tiny muted">1000자까지 · Ctrl + Enter 등록</span>
      <button class="btn pri" id="pb-submit-${p.id}" onclick="pairPostSend(${p.id})">답글 등록</button>
    </div>`);
  const field=document.getElementById("pb-reply-"+p.id);
  if(field){
    if(quote)field.value="> "+String(p.body||"").replace(/\n/g,"\n> ").slice(0,450)+"\n\n";
    field.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();pairPostSend(p.id);}});
    field.focus(); field.setSelectionRange(field.value.length,field.value.length);
  }
}
async function pairPostSend(parent){
  const P=pairEnsure();if(!P.mine || !sbOn()){toast("공유 기록에 연결되어야 글을 남길 수 있습니다.","bad");return false;}
  if(PAIRPOSTSUBMIT)return false;
  const el=document.getElementById(parent!==null&&parent!==undefined?"pb-reply-"+parent:"pb-write");
  const body=(el&&el.value||"").trim();
  if(!body){toast("쓸 말을 적어 주세요.","bad");el?.focus();return false;}
  if(body.length>1000){toast("1000자까지 쓸 수 있습니다.","bad");return false;}
  if(parent!==null&&parent!==undefined&&!pairPostFind(parent)){
    toast("답할 글이 목록에 없습니다. 새로 고침을 해 주세요.","bad");return false;
  }
  const postPairId=String(P.mine.id), actionButton=document.getElementById(parent!==null&&parent!==undefined?"pb-submit-"+parent:"pb-compose-submit");
  PAIRPOSTSUBMIT=true;if(actionButton)actionButton.disabled=true;
  try{
    // PostgREST returns the actual inserted row. Show it immediately even if refresh is in flight.
    const inserted=await sbSend("POST","pair_posts",[{pair_id:P.mine.id,
      author_id:String(S.sb.id),author_name:S.name,body,
      parent_id:parent!==null&&parent!==undefined?parent:null}],"return=representation");
    if(!Array.isArray(inserted)||!inserted.length)throw new Error("글 등록 응답이 비어 있습니다.");
    if(String(pairEnsure().mine?.id)===postPairId){
      const B=pairPostState();for(const row of inserted){
        if(!B.rows.some(p=>String(p.id)===String(row.id)))B.rows.unshift(row);
      }
      B.at=0;B.forId=postPairId;
      if(el)el.value="";
      if(parent!==null&&parent!==undefined)closeModal();
      if(VIEW==="pairboard")renderMain();
      toast("기록을 남겼습니다.","good");
      // Poll refresh afterward; the new post has already been added to the UI.
      pairPostFetch(true);
    }
    return true;
  }catch(e){
    const detail=String(e&&e.message||"");
    toast(/foreign key|parent_id/.test(detail)?"답할 원글이 삭제되었습니다. 새로 고침해 주세요.":
      "기록 등록에 실패했습니다. 공유 기록 연결과 페어 게시판 SQL을 확인해 주세요.","bad");
    console.warn("pair_posts insert failed:",detail);
    return false;
  }finally{ PAIRPOSTSUBMIT=false; if(actionButton?.isConnected)actionButton.disabled=false; }
}
function pairPostDelete(id){
  const p=pairPostFind(id);
  if(!p||String(p.author_id)!==String(S.sb.id)){toast("자신이 쓴 기록만 삭제할 수 있습니다.","bad");return;}
  if(!confirm("이 글을 지울까요? 이 글에 달린 답글도 함께 사라집니다."))return;
  sbSend("DELETE",`pair_posts?id=eq.${encodeURIComponent(id)}&author_id=eq.${encodeURIComponent(String(S.sb.id))}`,undefined,"return=minimal")
    .then(()=>{closeModal(); const B=pairPostState();B.loaded=false;B.rows=[];return pairPostFetch(true);})
    .then(()=>{if(VIEW==="pairboard")renderMain(true);})
    .catch(()=>toast("지우지 못했습니다.","bad"));
}
async function pairPostCopy(id){
  const p=pairPostFind(id);if(!p)return;
  try{await navigator.clipboard.writeText(String(p.body||""));toast("본문을 복사했습니다.","good");}
  catch(e){
    // Clipboard permissions are unavailable for many self-hosted HTTP deployments.
    modal("본문 복사",`<textarea class="inp" id="pb-copy" style="width:100%" rows="5" readonly>${esc(p.body||"")}</textarea>
      <p class="tiny muted">내용을 선택해 복사해 주세요.</p>`);
    document.getElementById("pb-copy")?.select();
  }
}
function pairPostMore(id){
  const p=pairPostFind(id);if(!p)return;
  const mine=String(p.author_id)===String(S.sb.id);
  modal("기록 메뉴",`<div class="row" style="gap:8px;flex-wrap:wrap">
    <button class="btn" onclick="pairPostCopy(${p.id})">${pairPostIcon("copy")} 본문 복사</button>
    ${mine?`<button class="btn red" onclick="pairPostDelete(${p.id})">기록 삭제</button>`:""}</div>`);
}
function pairPostScroll(id){
  const el=document.getElementById("pair-post-"+String(id));
  if(el){el.scrollIntoView({behavior:"smooth",block:"center"});
    el.classList.add("mm-post-focus");setTimeout(()=>el.classList.remove("mm-post-focus"),1800);}
}
function pairPostRow(p,depth,childrenCount,parent,hearts,marks){
  const sid=String(p.id);
  const me=pairMe(),you=pairPeer();
  const who=String(p.author_id)===String(me.id)?me:
    (you&&String(p.author_id)===String(you.id)?you:{name:p.author_name||"학생",av:"lantern",color:"var(--s5)",id:p.author_id});
  return `<article class="mm-post ${depth?"mm-post-reply":""}" id="pair-post-${p.id}" data-depth="${depth}" data-parent="${esc(p.parent_id||"")}">
      <div class="mm-avatar">${faceHTML(who,44)}</div>
      <div class="mm-post-main">
        <div class="mm-byline"><b>${esc(who.name||"")}</b><span class="mm-handle">${esc(pairHandle(who))}</span>
          <span class="mm-time">· ${esc(pairPostWhen(p.created_at))}</span></div>
        ${parent?`<button class="mm-context mm-context-jump" onclick="pairPostScroll(${Number(parent.id)})" title="답글을 단 원글로 이동">↳ ${esc(parent.author_name||"상대")} 님에게 답글 · 원글 보기</button>`:
          (p.parent_id?`<div class="mm-context">↳ 이전 글에 답글</div>`:"")}
        <div class="mm-message">${fmtChat(p.body)}</div>
        <div class="mm-actions" role="group" aria-label="${esc(who.name||"")} 님의 기록 동작">
          <button class="mm-action" onclick="pairPostReply(${p.id})" title="답글 달기" aria-label="답글 달기">${pairPostIcon("reply")}${childrenCount?`<span>${childrenCount}</span>`:""}</button>
          <button class="mm-action" onclick="pairPostReply(${p.id},true)" title="인용하여 답글 달기" aria-label="인용하여 답글 달기">${pairPostIcon("quote")}</button>
          <button class="mm-action ${hearts?"on":""}" data-kind="heart" data-post="${sid}" aria-pressed="${hearts}"
            onclick="pairPostToggle('heart',${p.id})" title="마음에 들어요 (이 브라우저에만 저장)" aria-label="마음에 들어요">${pairPostIcon("heart")}</button>
          <button class="mm-action ${marks?"on":""}" data-kind="bookmark" data-post="${sid}" aria-pressed="${marks}"
            onclick="pairPostToggle('bookmark',${p.id})" title="북마크 (이 브라우저에만 저장)" aria-label="북마크">${pairPostIcon("bookmark")}</button>
          <button class="mm-action" onclick="pairPostMore(${p.id})" title="더 보기" aria-label="더 보기">${pairPostIcon("more")}</button>
        </div>
      </div>
    </article>`;
}
/* 깊이가 수십·수백 단계가 되어도 모든 답글을 순서대로 보여 줍니다.
   재귀 40단계 제한과 반복되는 전체 배열 검색을 모두 제거합니다. */
function pairPostThreads(rows){
  const byId=new Map(rows.map(r=>[String(r.id),r]));
  const liked=new Set(pairPostMarks("heart").values.map(String));
  const bookmarked=new Set(pairPostMarks("bookmark").values.map(String));
  const children=new Map(),roots=[];
  for(const p of rows){
    const parent=p.parent_id==null?"":String(p.parent_id);
    if(parent && parent!==String(p.id) && byId.has(parent)){
      if(!children.has(parent))children.set(parent,[]);
      children.get(parent).push(p);
    }else roots.push(p);
  }
  for(const arr of children.values())arr.sort((a,b)=>Number(a.id)-Number(b.id));
  roots.sort((a,b)=>Number(b.id)-Number(a.id));
  const visited=new Set(), threads=[];
  const walk=(root)=>{
    const ordered=[], stack=[{p:root,depth:0}];
    while(stack.length){
      const {p,depth}=stack.pop(),sid=String(p.id);
      if(visited.has(sid))continue;
      visited.add(sid);ordered.push({p,depth});
      const kids=children.get(sid)||[];
      for(let i=kids.length-1;i>=0;i--)stack.push({p:kids[i],depth:depth+1});
    }
    if(!ordered.length)return;
    const last=ordered[ordered.length-1].p;
    threads.push(`<div class="mm-thread">
      <div class="mm-thread-guide"><span>타래 ${ordered.length}개 기록</span>
        ${ordered.length>6?`<button class="btn sm ghost" onclick="pairPostScroll(${last.id})">마지막 답글로 이동 ↓</button>`:""}
      </div>
      ${ordered.map(({p,depth})=>pairPostRow(p,depth,(children.get(String(p.id))||[]).length,byId.get(String(p.parent_id)),liked.has(String(p.id)),bookmarked.has(String(p.id)))).join("")}
    </div>`);
  };
  for(const root of roots)walk(root);
  // 삭제되거나 비정상적인 순환 참조로 부모를 찾지 못하는 글도 숨기지 않습니다.
  for(const p of rows)if(!visited.has(String(p.id)))walk(p);
  return threads.join("");
}
VIEWS.pairboard=()=>{
  const P=pairEnsure();
  const head1=head("둘만 보는 자리",ic("memo")+" 둘의 기록","페어 두 사람의 타임라인 · 답글을 계속 이어 쓸 수 있습니다");
  if(!sbOn())return head1+`<div class="card pad">공유 기록 연결 후 이용할 수 있습니다.
    <button class="btn pri" onclick="sbConnect()">공유 기록 연결</button></div>`;
  if(!P.mine)return head1+`<div class="card pad">아직 페어가 없습니다.
    <button class="btn" onclick="go('roster')">학생 명부</button></div>`;
  const B=pairPostState();
  const you=pairPeer();
  return head1
   +(B.err?`<div class="card pad" style="margin-bottom:12px;border-color:var(--redD)">${esc(B.err)}</div>`:"")
   +`<div class="mm-compose">
      <div class="mm-compose-line">${faceHTML(pairMe(),44)}
        <div class="mm-compose-area"><div class="mm-compose-to">${esc((you&&you.name)||"페어")} 님과 나누는 기록</div>
          <textarea class="inp" id="pb-write" rows="3" maxlength="1000" style="width:100%"
            placeholder="무슨 일이 있었나요? 대사와 *행동* 또는 (행동)을 남겨 보세요."></textarea>
          <div class="mm-compose-actions"><span class="tiny muted">1000자까지 · Ctrl + Enter 등록</span>
            <div class="row"><button class="btn sm ghost" onclick="pairPostFetch(true)">새로 고침</button>
              <button class="btn pri" id="pb-compose-submit" onclick="pairPostSend(null)">게시</button></div></div>
        </div>
      </div>
      <p class="mm-privacy">페어 두 사람에게만 표시됩니다. 서버 키로 기록을 조회할 수 있으므로 민감한 정보는 적지 마세요. 하트와 북마크는 이 브라우저에만 보관됩니다.</p>
    </div>`
   +`<section class="mm-timeline" aria-label="둘의 기록 타임라인">
      <div class="mm-board-status tiny muted">${B.loading?"기록을 불러오는 중입니다…":B.loaded?`전체 ${B.rows.length}개 기록 · 오래된 타래까지 표시`:`${B.rows.length}개 기록 · 불러오기 대기`}</div>
      ${B.rows.length?pairPostThreads(B.rows):
        `<div class="mm-empty">${B.loading?"기록을 불러오는 중입니다…":"아직 남겨진 기록이 없습니다."}<div>${B.loading?"잠시 후 전체 타래가 나타납니다.":"첫 번째 이야기를 적어 보세요."}</div></div>`}
    </section>`;
};
/* 페어 화면 — 헤더를 맨 위에, 둘의 기록으로 가는 길 */
const _pairhub8 = VIEWS.pairhub;
VIEWS.pairhub = () => {
  const P=pairEnsure();
  let h=_pairhub8();
  if(!sbOn() || !P.mine) return h;
  const box=document.createElement("div");box.innerHTML=h;
  const row=box.querySelector('.pair-settings-row');
  const record=`<div class="card pad pair-record-card">
    <div class="spread"><div class="sect-t" style="margin:0">둘의 기록</div>
      <button class="btn sm" onclick="go('pairboard')">열기</button></div>
    <div class="tiny muted" style="margin-top:4px">페어 두 사람만 보는 자리입니다. 짧게 남기고 서로 이어 쓸 수 있습니다.</div>
  </div>`;
  if(row){row.insertAdjacentHTML('beforeend',record);row.insertAdjacentHTML('beforebegin',pairHeadHTML());}
  return box.innerHTML;
};

/* 페어 화면·게시판에 들어갈 때 받아 옵니다 */
const _go8 = go;
go = function(v){
  if(v==="pairboard"){
    const id=String(pairEnsure().mine?.id||"");
    if(PAIRBOARD.forId!==id){PAIRBOARD.rows=[];PAIRBOARD.loaded=false;PAIRBOARD.forId=id;PAIRBOARD.err="";}
  }
  _go8(v);
  if(v==="pairhub"){ pairHeadFetch(false); }
  if(v==="pairboard"){ pairHeadFetch(false); pairPostFetch(true); }
};
setInterval(()=>{ if(pollAwake() && VIEW==="pairboard") pairPostFetch(false); }, 12000);
const _boot8b = boot;
boot = function(){ _boot8b(); if(sbOn()) setTimeout(()=>pairHeadFetch(true), 2500); };

/* ═══════════════════════════════════════════════════
   확장 8 · 세 번째 묶음
   ① RP 게시판·둘의 기록 알림과 알림음
   ② 댓글에 단 답글은 그 댓글 아래로 (중첩)
   ═══════════════════════════════════════════════════ */

/* ───────── ① 게시판 알림 ───────── */
/* 소리 파일은 채팅 소리를 같이 쓰되, 켜고 끄는 것은 따로 둡니다 */
if(typeof SOUND_FILES!=="undefined"){
  SOUND_FILES.board=SOUND_FILES.chat;
  if(SOUND_PREF.board===undefined) SOUND_PREF.board=true;
}
if(typeof soundSettingsHTML==="function"){
  soundSettingsHTML=function(){
    const rows=[["pair","페어 채팅"],["board","게시판 · 둘의 기록"],
                ["activity","수업 종료 · 의뢰 완료"],["chat","전체 · 이웃 · 계통 채팅"]];
    return `<div class="sect-t">알림음</div>
      <div class="tiny muted">화면을 한 번 누른 뒤 새 알림부터 재생됩니다. 지난 채팅과 오프라인 수업에는 울리지 않습니다.</div>
      ${rows.map(([k,n])=>`<div class="spread" style="margin-top:10px">
        <label><input type="checkbox" ${SOUND_PREF[k]?"checked":""} onchange="setSoundPreference('${k}',this.checked)"> ${n}</label>
        <button class="btn sm" onclick="notifySound('${k}',true)">미리 듣기</button></div>`).join("")}
      <label class="row" style="margin-top:12px">음량
        <input aria-label="알림음 음량" type="range" min="0" max="1" step="0.05"
          value="${SOUND_PREF.volume}" oninput="setSoundPreference('volume',Number(this.value))"></label>
      <hr class="hr">`;
  };
}
/* 글타래의 뿌리를 찾습니다 */
function rpRootOf(p, all){
  let cur=p, guard=0;
  while(cur && cur.parent_id && cur.parent_id!==cur.id && guard++<30)
    cur=all.find(x=>x.id===cur.parent_id)||null;
  return cur||p;
}
function rpAlertScan(){
  if(typeof SOCIAL==="undefined" || !SOCIAL.ready) return;
  const all=SOCIAL.posts||[];
  const ids=all.map(p=>Number(p.id)||0);
  const max=ids.length?Math.max.apply(null,ids):0;
  if(typeof S.alertRpMax!=="number"){ S.alertRpMax=max; return; }   // 처음 한 번은 조용히 기준만
  if(max<=S.alertRpMax) return;
  const mine=socialId();
  const fresh=all.filter(p=>Number(p.id)>S.alertRpMax && String(p.author_id)!==mine)
                 .sort((a,b)=>a.id-b.id);
  S.alertRpMax=max;
  if(!fresh.length) return;
  fresh.slice(0,5).forEach(p=>{
    const who=socialName(p.author_id);
    if(!p.parent_id){
      alertPush("soc", `[게시판] ${who} 님이 RP 게시판에 새 글을 남겼습니다.`, "rpboard");
      return;
    }
    const parent=all.find(x=>x.id===p.parent_id);
    const root=rpRootOf(p, all);
    if(parent && String(parent.author_id)===mine)
      alertPush("soc", `[게시판] ${who} 님이 내 글에 답글을 남겼습니다.`, "rpboard");
    else if(root && String(root.author_id)===mine)
      alertPush("soc", `[게시판] ${who} 님이 내 글타래에 답글을 남겼습니다.`, "rpboard");
    else if(all.some(x=>x.id!==p.id && String(x.author_id)===mine && rpRootOf(x,all).id===root.id))
      alertPush("soc", `[게시판] ${who} 님이 내가 쓴 글타래에 답글을 남겼습니다.`, "rpboard");
    else
      alertPush("soc", `[게시판] ${who} 님이 답글을 남겼습니다.`, "rpboard");
  });
  if(fresh.length>5)
    alertPush("soc", `[게시판] 그 밖에 새 글과 답글 ${fresh.length-5}개가 더 있습니다.`, "rpboard");
  if(typeof notifySound==="function") notifySound("board");
}
/* 둘의 기록도 같은 방식으로 */
function pairBoardAlertScan(){
  const B=pairPostState(), rows=B.rows||[];
  if(!rows.length){ return; }
  const max=Math.max.apply(null, rows.map(p=>Number(p.id)||0));
  if(typeof S.alertPbMax!=="number"){ S.alertPbMax=max; return; }
  if(max<=S.alertPbMax) return;
  const mine=String(S.sb&&S.sb.id||"");
  const fresh=rows.filter(p=>Number(p.id)>S.alertPbMax && String(p.author_id)!==mine);
  S.alertPbMax=max;
  if(!fresh.length) return;
  const who=fresh[0].author_name||"페어";
  alertPush("soc", fresh.length===1
    ? `[게시판] ${who} 님이 둘의 기록에 글을 남겼습니다.`
    : `[게시판] ${who} 님이 둘의 기록에 글 ${fresh.length}개를 남겼습니다.`, "pairboard");
  if(typeof notifySound==="function") notifySound("board");
}
/* 교류 정보를 받을 때마다 훑습니다 */
const _socialFetchRp = socialFetch;
socialFetch = async function(force){
  const r=await _socialFetchRp(force);
  try{ rpAlertScan(); }catch(e){}
  return r;
};
const _pairPostFetchA = pairPostFetch;
pairPostFetch = function(force){
  const p=_pairPostFetchA(force);
  return (p&&p.then) ? p.then(v=>{ try{ pairBoardAlertScan(); }catch(e){} return v; }) : p;
};
/* 게시판을 보고 있지 않아도 둘의 기록 알림이 오도록 */
setInterval(()=>{ if(pollAwake() && sbOn() && pairEnsure().mine && VIEW!=="pairboard") pairPostFetch(false); }, 45000);

/* ───────── ② RP 게시판: 깊은 들여쓰기 대신 하나의 타임라인 ───────── */
function rpThreadRows(root){
  const byParent=new Map();
  (SOCIAL.posts||[]).forEach(p=>{
    if(p.parent_id===null||p.parent_id===undefined)return;
    const key=String(p.parent_id), rows=byParent.get(key)||[];
    rows.push(p);byParent.set(key,rows);
  });
  byParent.forEach(rows=>rows.sort((a,b)=>Number(a.id)-Number(b.id)));
  const result=[{p:root,depth:0}], seen=new Set([String(root.id)]);
  const visit=(id,depth)=>{
    if(depth>80||result.length>2100)return;
    (byParent.get(String(id))||[]).forEach(child=>{
      if(seen.has(String(child.id)))return;
      seen.add(String(child.id));result.push({p:child,depth});visit(child.id,depth+1);
    });
  };
  visit(root.id,1);return result;
}
/* The direct replies to the root start distinct branches. Descendants remain
   in their own branch; show explicit reply-to parent to handle forks inside it. */
function rpConversationBranches(rows){
  const branches=[];
  for(const item of rows.slice(1)){
    if(item.depth===1||!branches.length)branches.push([]);
    branches[branches.length-1].push(item);
  }
  return branches;
}
function rpCleanExcerpt(value,max=68){
  const oneLine=String(value||'').replace(/<[^>]*>/g,' ').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim();
  return oneLine.length>max?oneLine.slice(0,max).trimEnd()+'…':oneLine;
}
function rpThreadHTML(root,marks){
  const items=rpThreadRows(root);
  const branches=rpConversationBranches(items);
  const people=[...new Set(items.map(x=>String(x.p.author_id)))];
  const peopleText=people.slice(0,4).map(id=>socialName(id)).join(' · ')+(people.length>4?` 외 ${people.length-4}명`:'');
  return `<section class="rp-thread" data-root="${Number(root.id)}">
    <div class="rp-topic"><span class="rp-topic-badge">대화 시작</span>
      <strong>${esc(socialName(root.author_id))} 님의 이야기</strong>
      <span class="rp-participants">참여자 · ${esc(peopleText)}${items.length>1?` · 답글 ${items.length-1}개`:''}</span>
    </div>
    ${rpEntryHTML(root,0,marks,items.length-1,root)}
    ${items.length>1?`<details class="rp-thread-tail" open><summary>답글 ${items.length-1}개 · 대화 흐름 펼치기 / 접기</summary>
      <div class="rp-branches">${branches.map((branch,i)=>{
        const first=branch[0].p;
        const starters=[...new Set(branch.map(x=>String(x.p.author_id)))];
        const startLabel=`${socialName(first.author_id)} → ${socialName(root.author_id)}`;
        return `<section class="rp-branch" aria-label="대화 갈래 ${i+1}">
          <div class="rp-branch-heading"><span class="rp-branch-number">대화 갈래 ${i+1}</span>
            <strong>${esc(startLabel)}</strong><span class="rp-branch-count">답글 ${branch.length}개${starters.length>2?` · 참여 ${starters.length}명`:''}</span></div>
          ${branch.map(item=>rpEntryHTML(item.p,item.depth,marks,0,root)).join('')}
        </section>`;
      }).join('')}</div>
    </details>`:''}
  </section>`;
}
function rpEntryHTML(p,depth,marks,count,rootPost){
  const mine=String(p.author_id)===socialId();
  const who=socialStudent(p.author_id)||{id:p.author_id,name:socialName(p.author_id),av:'lantern',color:'var(--violet)'};
  const parent=p.parent_id?(SOCIAL.posts||[]).find(x=>String(x.id)===String(p.parent_id)):null;
  const starred=marks.includes(Number(p.id));
  const root=depth===0;
  const isStarter=String(p.author_id)===String(rootPost.author_id);
  const parentName=parent?socialName(parent.author_id):'';
  const quote=parent?rpCleanExcerpt(parent.body):'';
  return `<article class="rp-entry ${root?'rp-entry-root':isStarter?'rp-entry-starter':'rp-entry-guest'}" id="rp-post-${Number(p.id)}" data-depth="${depth}" data-parent="${esc(p.parent_id||'')}">
    <div class="rp-avatar">${faceHTML(who,42)}</div>
    <div class="rp-main">
      <div class="rp-byline"><b>${esc(socialName(p.author_id))}</b>
        <span class="rp-handle">${esc(pairHandle(who))}</span>
        <span class="rp-time">· ${esc(pairPostWhen(p.created_at))}</span></div>
      ${parent?`<div class="rp-address" aria-label="${esc(socialName(p.author_id))} 님이 ${esc(parentName)} 님에게 답글">
        <span class="rp-address-label">답글</span><strong>${esc(socialName(p.author_id))}</strong>
        <span class="rp-address-arrow" aria-hidden="true">→</span>
        <button type="button" class="rp-address-recipient" onclick="rpJumpTo(${Number(parent.id)})" title="답글 대상 글로 이동">${esc(parentName)}</button>
      </div><button type="button" class="rp-parent-preview" onclick="rpJumpTo(${Number(parent.id)})" title="답글의 원문 보기">
        <span class="rp-parent-preview-label">↳ 받은 글</span><span class="rp-parent-preview-text">${esc(quote||'(내용 없음)')}</span>
      </button>`:''}
      <div class="rp-body">${fmtChat(p.body)}</div>
      <div class="rp-actions" role="group" aria-label="${esc(socialName(p.author_id))}의 글 동작">
        <button type="button" class="rp-act" title="답글 달기" aria-label="답글 달기" onclick="rpReply(${Number(p.id)})">${pairPostIcon('reply')}${count?`<span>${count}</span>`:''}</button>
        ${root?`<button type="button" class="rp-act" title="북마크" aria-label="북마크" aria-pressed="${starred}" onclick="rpBookmark(${Number(p.id)})">${pairPostIcon('bookmark')}</button>`:''}
        ${mine?`<button type="button" class="rp-act" title="이 글 삭제" aria-label="이 글 삭제" onclick="rpDelete(${Number(p.id)})">${pairPostIcon('more')}</button>`:''}
      </div>
    </div>
  </article>`;
}
/* Reply target buttons scroll to the exact parent, even if the branch was folded. */
function rpJumpTo(id){
  const el=document.getElementById('rp-post-'+Number(id));
  if(!el){toast('원문을 찾을 수 없습니다.');return;}
  const details=el.closest('details');if(details)details.open=true;
  el.scrollIntoView({block:'center',behavior:'smooth'});
  el.classList.remove('rp-focus');void el.offsetWidth;el.classList.add('rp-focus');
  setTimeout(()=>el.classList.remove('rp-focus'),2400);
}
VIEWS.rpboard=()=>{
  const marks=rpBookmarks().map(Number),mine=socialId();
  const ids=new Set((SOCIAL.posts||[]).map(p=>String(p.id)));
  let roots=(SOCIAL.posts||[]).filter(p=>!p.parent_id||!ids.has(String(p.parent_id)));
  if(RP_FILTER==="mine")roots=roots.filter(p=>String(p.author_id)===mine);
  if(RP_FILTER==="bookmark")roots=roots.filter(p=>marks.includes(Number(p.id)));
  if(RP_FILTER==="replies")roots=roots.filter(p=>rpThreadRows(p).slice(1).some(x=>String(x.p.author_id)===mine));
  if(RP_QUERY){
    const query=RP_QUERY.toLowerCase();
    roots=roots.filter(p=>rpThreadRows(p).some(x=>(String(x.p.body||"")+" "+socialName(x.p.author_id)).toLowerCase().includes(query)));
  }
  if(typeof RP_FOCUS_ROOT!=="undefined"&&RP_FOCUS_ROOT&&RP_FILTER==="all"&&!RP_QUERY){
    const index=roots.findIndex(p=>String(p.id)===String(RP_FOCUS_ROOT));
    if(index>=0)RP_PAGE=Math.floor(index/10);
  }
  const pages=Math.max(1,Math.ceil(roots.length/10)); RP_PAGE=Math.max(0,Math.min(RP_PAGE,pages-1));
  const profile=socialStudent(mine)||{id:mine,name:S.name,av:S.av,av_img:S.avImg,color:S.color};
  return head("함께 써 내려가는 이야기","RP 게시판","답글 대상과 대화 갈래를 구분해 한눈에 읽을 수 있습니다")
    +socialStatus()+`<div class="rp-board">
      <div class="rp-compose"><div class="rp-compose-row">${faceHTML(profile,42)}
        <div class="rp-compose-main"><label class="tiny muted" for="rp-compose">새 RP 작성 · 최대 500자</label>
        <textarea id="rp-compose" class="inp" rows="3" maxlength="500" placeholder="대사와 *행동* 또는 (행동)을 남겨 주세요."></textarea>
        <div class="rp-compose-actions"><span class="tiny muted">Ctrl + Enter로 게시</span>
          <button class="btn pri" onclick="rpPost()">게시</button></div></div></div></div>
      <div class="rp-tools"><div class="rp-filter-row">${[["all","전체"],["bookmark","북마크"],["mine","내 글"],["replies","내가 답한 대화"]]
        .map(([k,n])=>`<button class="btn sm ${RP_FILTER===k?"pri":"ghost"}" onclick="rpFilter('${k}')">${n}</button>`).join("")}</div>
        <div class="rp-search-row"><input class="inp" id="rp-search" value="${esc(RP_QUERY)}" placeholder="글·답글·작성자 검색"
          onkeydown="if(event.key==='Enter')rpSearch()"><button class="btn sm" onclick="rpSearch()">검색</button></div></div>
      <div class="rp-pager"><button class="btn sm ghost" onclick="RP_PAGE=Math.max(0,RP_PAGE-1);renderMain()">◀ 이전</button>
        <span class="tiny muted">${RP_PAGE+1} / ${pages} · 대화 ${roots.length}개</span>
        <button class="btn sm ghost" onclick="RP_PAGE=Math.min(${pages-1},RP_PAGE+1);renderMain()">다음 ▶</button></div>
      <div class="rp-feed" aria-label="RP 타임라인">
        ${roots.slice(RP_PAGE*10,RP_PAGE*10+10).map(p=>rpThreadHTML(p,marks)).join("") ||
        '<div class="rp-empty">아직 작성된 글이 없어요. 첫 대화를 시작해 보세요.</div>'}
      </div></div>`;
};
/* 직접 답한 글의 내용과 작성자를 보여 줍니다. */
rpReply=function(id){
  const p=(SOCIAL.posts||[]).find(x=>String(x.id)===String(id));
  if(!p){toast("답할 글을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");return;}
  modal(`${esc(socialName(p.author_id))} 님에게 답하기`, `<div class="mm-reply-parent">
    <div class="tiny muted">${esc(socialName(p.author_id))} · ${esc(pairPostWhen(p.created_at))}</div>
    <div class="mm-reply-snippet">${fmtChat(p.body)}</div></div>
    <textarea class="inp" id="rp-reply-${Number(id)}" maxlength="500" rows="5" style="width:100%"
      placeholder="대사와 *행동* 또는 (행동)으로 이어 써 주세요"></textarea>
    <div class="rp-compose-actions"><span class="tiny muted">이 글에 직접 연결되는 답글입니다.</span>
      <button class="btn pri" onclick="rpPost(${Number(id)}).then(ok=>{if(ok)closeModal()})">답글 게시</button></div>`);
};
const _rpPostUI=rpPost;
rpPost=async function(parent=null){
  const result=await _rpPostUI(parent);
  if(result&&!parent){
    const input=document.getElementById("rp-compose");if(input)input.value="";
  }
  return result;
};
document.addEventListener("keydown",e=>{
  if(!(e.ctrlKey||e.metaKey)||e.key!=="Enter"||VIEW!=="rpboard")return;
  const el=document.activeElement;
  if(!el||el.id!=="rp-compose")return;
  e.preventDefault();rpPost();
});

/* ───────── ③ 서버 저장형 RP 답글 알림 ─────────
   SQL을 실행한 경우: 로그인하지 않았을 때 온 답글도 다음 접속에 복구합니다.
   SQL 미적용 환경에서는 종전의 게시판 새로고침 비교를 안전망으로 사용합니다. */
let RP_ALERT_BACKEND=false, RP_ALERT_BUSY=false, RP_ALERT_ATTEMPT=0;
let RP_FOCUS_ROOT=null, RP_FOCUS_POST=null, RP_FOCUS_TRIES=0;
function rpAlertRemember(postId){
  if(S.alerts&&S.alerts[0])S.alerts[0].rpPostId=Number(postId);
}
function rpAlertHas(postId){
  return Array.isArray(S.alerts)&&S.alerts.some(a=>Number(a.rpPostId)===Number(postId));
}
function rpAlertEmit(p,rootId){
  if(!p||String(p.author_id)===socialId()||rpAlertHas(p.id))return;
  const created=Date.parse(String(p.created_at||""));
  if(Number.isFinite(created)&&created<=alertClearedAt())return;
  const parent=(SOCIAL.posts||[]).find(x=>String(x.id)===String(p.parent_id));
  const msg=`[RP 답글] ${socialName(p.author_id)} 님이 ${parent&&String(parent.author_id)===socialId()?"내 글":"내가 시작한 대화"}에 답글을 남겼습니다.`;
  alertPush("soc",msg,"rpboard");rpAlertRemember(p.id);
  if(S.alerts&&S.alerts[0])S.alerts[0].rpRootId=Number(rootId||p.parent_id);
  if(typeof notifySound==="function")notifySound("board");
}
function rpFallbackScan(){
  if(!SOCIAL.ready||!S?.made||RP_ALERT_BACKEND)return;
  const all=SOCIAL.posts||[];
  const max=all.reduce((m,p)=>Math.max(m,Number(p.id)||0),0);
  if(typeof S.alertRpMax!=="number"){S.alertRpMax=max;save();return;}
  if(max<=S.alertRpMax)return;
  const mine=socialId(), cutoff=S.alertRpMax;
  S.alertRpMax=max;
  all.filter(p=>Number(p.id)>cutoff&&p.parent_id&&String(p.author_id)!==mine)
    .sort((a,b)=>Number(a.id)-Number(b.id))
    .forEach(p=>{
      const parent=all.find(x=>String(x.id)===String(p.parent_id));
      const root=rpRootOf(p,all);
      if((parent&&String(parent.author_id)===mine)||(root&&String(root.author_id)===mine))rpAlertEmit(p,root.id);
    });
  save();
}
rpAlertScan=rpFallbackScan;
async function rpAlertServerSync(){
  if(RP_ALERT_BUSY||!S?.made||!sbOn()||!ACCT?.id||!ACCT?.tok)return;
  RP_ALERT_BUSY=true;
  try{
    const owner=String(ACCT.id);
    if(S.alertRpAccount!==owner){S.alertRpAccount=owner;S.alertRpCursor=0;}
    const since=Number(S.alertRpCursor)||0;
    const rows=await sbSend("POST","rpc/rp_read_alerts",{p_actor:owner,p_token:ACCT.tok,p_after:since});
    if(String(ACCT.id)!==owner)return;
    RP_ALERT_BACKEND=true;
    const found=Array.isArray(rows)?rows:[];
    let added=0;
    for(const r of found){
      if(Number(r.id)>Number(S.alertRpCursor||0))S.alertRpCursor=Number(r.id);
      // 삭제 중에 시작한 서버 조회가 늦게 끝나도 옛 답글을 재등록하지 않습니다.
      const created=Date.parse(String(r.created_at||""));
      if(Number.isFinite(created)&&created<=alertClearedAt())continue;
      if(rpAlertHas(r.post_id))continue;
      const who=socialName(r.actor_id);
      const direct=(SOCIAL.posts||[]).find(x=>String(x.id)===String(r.parent_id));
      const type=direct&&String(direct.author_id)===socialId()?"내 글":"내가 시작한 대화";
      alertPush("soc",`[RP 답글] ${who} 님이 ${type}에 답글을 남겼습니다.`,"rpboard");
      rpAlertRemember(r.post_id);
      if(S.alerts&&S.alerts[0])S.alerts[0].rpRootId=Number(r.root_id||r.parent_id);
      added++;
    }
    if(found.length||added){save();alertBadge();}
    if(added&&typeof notifySound==="function")notifySound("board");
  }catch(e){
    // SQL을 아직 설치하지 않은 사이트는 RP 목록 기반 알림을 계속 사용합니다.
    RP_ALERT_BACKEND=false;
    if(SOCIAL.ready)rpFallbackScan();
  }finally{RP_ALERT_BUSY=false;RP_ALERT_ATTEMPT=Date.now();}
}
/* 게시판 fetch와 별도로 서버를 폴링합니다. 조회 실패가 반복되어도 화면은 멈추지 않습니다. */
setInterval(()=>{if(pollAwake()&&S?.made&&sbOn()&&ACCT?.id)rpAlertServerSync();},15000);
const _bootRpAlert=boot;
boot=function(){
  _bootRpAlert();
  if(sbOn()&&ACCT?.id)setTimeout(rpAlertServerSync,1600);
};
/* 알림에서 "보기"를 누르면 관련 원글이 있는 페이지로 이동합니다. */
const _alertGoRp=alertGo;
alertGo=function(id){
  const a=(S.alerts||[]).find(x=>x.i===id);
  if(!a||a.v!=="rpboard"||!a.rpRootId){_alertGoRp(id);return;}
  RP_FILTER="all";RP_QUERY="";RP_FOCUS_TRIES=0;RP_FOCUS_ROOT=Number(a.rpRootId);RP_FOCUS_POST=Number(a.rpPostId);
  closeModal();go("rpboard");
  setTimeout(rpFocusApply,160);
};
function rpFocusApply(){
  if(VIEW!=="rpboard"||!RP_FOCUS_ROOT)return;
  const root=(SOCIAL.posts||[]).find(x=>String(x.id)===String(RP_FOCUS_ROOT));
  if(!root){if(RP_FOCUS_TRIES++<2){socialFetch(true).then(()=>setTimeout(rpFocusApply,150));}else{RP_FOCUS_ROOT=null;RP_FOCUS_POST=null;toast("원글이 삭제되었거나 조회 범위를 벗어났습니다.");}return;}
  renderMain();
  const target=document.getElementById("rp-post-"+RP_FOCUS_POST)||document.getElementById("rp-post-"+RP_FOCUS_ROOT);
  if(target){target.scrollIntoView({block:"center",behavior:"smooth"});target.classList.add("rp-focus");}
  RP_FOCUS_ROOT=null;RP_FOCUS_POST=null;
}


;
/* ===== module: part9.js ===== */
"use strict";
/* 無明長夜: garden breeding, discovery rewards, private RP visibility. */
const FARM_TIERS={normal:"노멀",rare:"레어",epic:"에픽",legend:"전설"};
const FARM_OLD_IDS={c1:"흑설탕호박",c2:"백옥무",c3:"매화",c4:"연꽃",c5:"야광버섯"};
const FARM_OLD_NAMES=new Set(["잿불 호박","맨드레이크","푸른 별꽃","연화초","월하 버섯"]);
const FARM_CROP_BY_ID=Object.fromEntries(CROPS.map(c=>[c.id,c]));
const FARM_CROP_BY_NAME=Object.fromEntries(CROPS.map(c=>[c.n,c]));
const FARM_NORMALS=CROPS.filter(c=>c.tier==="normal");
function farmGrade(c){ return `<span class="farm-tier farm-tier-${c.tier}">${FARM_TIERS[c.tier]}</span>`; }
function farmCount(c){ return `씨앗 ${S.farm.seeds[c.id]||0}개`; }
function farmAdjacent(i){const r=Math.floor(i/3),col=i%3;return [[r-1,col],[r+1,col],[r,col-1],[r,col+1]].filter(([a,b])=>a>=0&&a<3&&b>=0&&b<3).map(([a,b])=>a*3+b);}
function farmEnsure(){
 if(!S||!S.made)return;
 if(!S.farm) S.farm={plots:Array(9).fill(null),skill:1,exp:0,fert:3,order:null,done:0};
 const f=S.farm;
 if(!Array.isArray(f.plots))f.plots=Array(9).fill(null);
 f.plots=f.plots.slice(0,9);while(f.plots.length<9)f.plots.push(null);
 if(!f.seeds||typeof f.seeds!=="object"||Array.isArray(f.seeds))f.seeds={};
 if(f.catalogVersion!==2){
  f.plots.forEach(p=>{if(!p)return; const old=FARM_OLD_IDS[p.id];if(old)p.id=FARM_CROP_BY_NAME[old].id;
    if(!FARM_CROP_BY_ID[p.id])return; const c=FARM_CROP_BY_ID[p.id]; p.total=Math.max(Number(p.total)||c.t,1);p.left=Math.max(0,Number(p.left)||0);
    p.farmResolved=p.left<=0; p.farmNotified=p.left<=0;
  });
  f.plots=f.plots.map(p=>p&&FARM_CROP_BY_ID[p.id]?p:null);
  if(f.order&&!FARM_CROP_BY_ID[f.order.id])f.order=null;
  if(S.dex?.plant)S.dex.plant=S.dex.plant.filter(n=>!FARM_OLD_NAMES.has(n)&&!!FARM_CROP_BY_NAME[n]);
  f.catalogVersion=2;
 }
 if(!f.order||!FARM_CROP_BY_ID[f.order.id])rollFarmOrder();
}
const _farmRollOrderOld=rollFarmOrder;
rollFarmOrder=function(){
 if(!S.farm)return;
 const c=pick(FARM_NORMALS);
 S.farm.order={id:c.id,need:rnd(3,5),have:0,done:false};
};
function farmPlantCore(i,cid){
 farmEnsure();const c=FARM_CROP_BY_ID[cid]; if(!c||i<0||i>=9||S.farm.plots[i])return false;
 if(!(S.farm.seeds[c.id]>0))return false;
 S.farm.seeds[c.id]--;
 S.farm.plots[i]={id:c.id,left:c.t,total:c.t,watered:false,fert:false,farmResolved:false,farmNotified:false};
 return true;
}
plant=function(i,cid){
 farmEnsure();if(S.farm.plots[i]){toast("이미 심어져 있습니다.","bad");return;}
 if(!farmPlantCore(i,cid)){toast("씨앗이 없습니다. 기본 씨앗은 종묘점에서 구매하고 희귀 씨앗은 교배·변이로 얻어 보세요.","bad");return;}
 renderMain();save();
};
plantAll=function(cid){
 farmEnsure();let count=0;
 for(let i=0;i<S.farm.plots.length;i++)if(farmPlantCore(i,cid))count++;
 toast(count?`${count}칸에 심었습니다.`:"빈 칸이 없거나 씨앗이 부족합니다.",count?"good":"bad");
 renderMain();save();
};
function farmCrossTarget(a,b){
 return CROPS.find(c=>c.parents&&c.parents.includes(a)&&c.parents.includes(b))||null;
}
function farmMutationTarget(id,weather){
 return CROPS.find(c=>c.from===id&&c.weather===weather)||null;
}
function farmCrossChance(c){return {rare:.13,epic:.07,legend:.035}[c.tier]||0;}
function farmMutationChance(c){return {rare:.10,epic:.055,legend:.025}[c.tier]||0;}
function farmAddSeed(c){
 S.farm.seeds[c.id]=(S.farm.seeds[c.id]||0)+1;
 if(typeof alertPush==="function")alertPush("farm",`[텃밭 교배] 「${c.n}」 ${FARM_TIERS[c.tier]} 씨앗 1개를 얻었습니다!`,"farm");
 toast(`교배 성공 · ${c.n} 씨앗 +1`,"good");
}
function farmMature(i){
 const p=S.farm.plots[i];if(!p||p.left>0||p.farmResolved)return;
 p.farmResolved=true;
 // A plot mutates at most once, at the exact moment it matures. Weather is sampled then.
 const variant=farmMutationTarget(p.id,S.weather);
 if(variant&&Math.random()<farmMutationChance(variant)){
  const before=FARM_CROP_BY_ID[p.id];p.id=variant.id;
  if(typeof alertPush==="function")alertPush("farm",`[텃밭 변이] 「${before.n}」이(가) ${WEATHERS[S.weather].n}에 반응해 「${variant.n}」으로 변했습니다.`,"farm");
  toast(`날씨 변이! ${variant.n}`,"good");
 }
 const c=FARM_CROP_BY_ID[p.id];
 for(const j of farmAdjacent(i)){
  const nb=S.farm.plots[j];if(!nb)continue;
  const h=farmCrossTarget(c.id,nb.id);
  if(h&&Math.random()<farmCrossChance(h))farmAddSeed(h);
 }
}
// Farming notifications remain in the personal 30-day alert inbox, including offline advancement.
const _stepGarden9=step;
step=function(mins){
 farmEnsure();
 _stepGarden9(mins);
 if(!S?.made||!S.farm)return;
 let ready=0;
 for(let i=0;i<S.farm.plots.length;i++){
  const p=S.farm.plots[i];if(!p||p.left>0)continue;
  farmMature(i);
  if(!p.farmNotified){p.farmNotified=true;ready++;}
 }
 if(ready&&typeof alertPush==="function"){
  alertPush("farm",`[텃밭 수확] ${ready}칸의 작물이 다 자랐습니다. 약초밭에서 수확하세요.`,"farm");
  alertBadge();save();
 }
};
const _harvestGarden9=harvest;
harvest=function(i){
 farmEnsure();const p=S.farm.plots[i];if(!p||p.left>0)return;
 farmMature(i);
 const c=FARM_CROP_BY_ID[p.id];
 _harvestGarden9(i);
 // Advanced plants retain one seed after harvest so they can be used in later breeding.
 if(c&&c.tier!=="normal"){
  S.farm.seeds[c.id]=(S.farm.seeds[c.id]||0)+1;
  toast(`${c.n} 씨앗 +1 · 다시 심을 수 있습니다.`,"good");save();
 }
};
function farmSeedButton(c,i=null){
 const has=(S.farm.seeds[c.id]||0)>0;
 return `<button class="btn sm ${has?"":"ghost"}" ${has?"":"disabled"} onclick="${i===null?`plantAll('${c.id}')`:`plant(${i},'${c.id}');closeModal()`}">${c.e} ${esc(c.n)} ${`(${S.farm.seeds[c.id]||0})`}</button>`;
}
function farmGuide(c){
 if(c.parents)return c.parents.map(id=>FARM_CROP_BY_ID[id]?.n||id).join(" × ")+" → "+c.n+" 씨앗";
 if(c.from)return (FARM_CROP_BY_ID[c.from]?.n||c.from)+" + "+(WEATHERS[c.weather]?.n||"특정 날씨")+" → "+c.n+" 변이";
 return "일반 씨앗 · 종묘점에서 구매";
}
function farmSeedHints(c,i){
 const neighbors=farmAdjacent(i).map(j=>S.farm.plots[j]?.id).filter(Boolean);
 return CROPS.filter(x=>x.from===c.id||x.parents?.includes(c.id)).map(x=>{
  const mutation=x.from===c.id;
  const other=mutation?null:x.parents.find(id=>id!==c.id)||c.id;
  const ready=mutation?x.weather===S.weather:neighbors.includes(other);
  return {ready,text:mutation?`${ready?'변이 조건 충족':'변이 조건'} · ${WEATHERS[x.weather]?.n} → ${x.n}`:
   `${ready?'교배 조건 충족':'교배'} · ${c.n} × ${FARM_CROP_BY_ID[other]?.n} → ${x.n} 씨앗`};
 });
}
let FARM_PICK_INDEX=0;
function farmSeedList(){
 const input=document.getElementById('farm-seed-search'),root=document.getElementById('farm-seed-list');if(!root)return;
 const query=(input?.value||'').trim();const i=FARM_PICK_INDEX;
 const rows=CROPS.filter(c=>(S.farm.seeds[c.id]||0)>0&&(!query||(c.n+' '+farmGuide(c)).includes(query)))
  .map(c=>({c,hints:farmSeedHints(c,i)})).sort((a,b)=>Number(b.hints.some(h=>h.ready))-Number(a.hints.some(h=>h.ready)));
 root.innerHTML=rows.length?rows.map(({c,hints})=>`<div class="seed-pick-card ${hints.some(h=>h.ready)?'seed-eligible':''}"><div class="spread"><b>${c.e} ${esc(c.n)}</b>${farmGrade(c)}</div>
  <div class="farm-detail">씨앗 ${S.farm.seeds[c.id]}개 · ${hhmm(c.t)} · 수확 ${c.s}개</div>
  <div class="farm-detail">${esc(farmGuide(c))}</div>
  ${hints.map(h=>`<div class="farm-detail ${h.ready?'seed-ready':''}">${esc(h.text)}</div>`).join('')}
  <div class="row seed-pick-actions"><button class="btn sm pri" onclick="plant(${i},'${c.id}');closeModal()">심기</button><button class="btn sm" onclick="plantAll('${c.id}');closeModal()">빈 밭 모두 심기</button></div></div>`).join(''):'<p class="muted">해당하는 보유 씨앗이 없습니다. 일반 씨앗은 종묘점에서 구매할 수 있습니다.</p>';
}
function farmCatalogRows(){
 return CROPS.map(c=>{const has=(S.farm.seeds[c.id]||0)>0;const found=S.dex?.plant?.includes(c.n);
  return `<div class="farm-crop-row"><div>
    <b>${c.e} ${esc(c.n)}</b> · ${farmGrade(c)} ${found?'<span class="tag g">도감 등록</span>':''}
    <div class="farm-detail">${esc(farmGuide(c))} · ${esc(hhmm(c.t))} · 수확 ${c.n} +${c.s}</div>
    <div class="farm-detail">${esc(c.d)}</div></div>
    <div>${farmSeedButton(c)}<div class="farm-detail" style="text-align:right">${farmCount(c)}</div></div></div>`;
 }).join('');
}
VIEWS.farm=()=>{
 farmEnsure();const f=S.farm,o=f.order,oc=o?FARM_CROP_BY_ID[o.id]:null,w=WEATHERS[S.weather];
 const ready=f.plots.filter(p=>p&&p.left<=0).length;
 return head("약초 온실 뒤뜰",ic("herb")+" 약초밭",`원예 Lv ${f.skill} · 도감 ${S.dex?.plant?.length||0}/${CROPS.length}종`)+`
 <div class="card pad" style="margin-bottom:12px">
  <div class="spread"><div class="sect-t">텃밭 3×3</div><span class="tiny muted">${w.i} ${w.n} · 비료 ${f.fert}개</span></div>
  <div class="row" style="margin-bottom:10px"><button class="btn sm" onclick="waterAll()">모두 물 주기</button>
    <button class="btn sm ${ready?'pri':''}" ${ready?'':'disabled'} onclick="harvestAll()">모두 수확 (${ready})</button></div>
  <div class="grid g3" style="gap:7px">${f.plots.map((p,i)=>{
    if(!p)return `<div class="sub farm-plot farm-empty-center" style="border-style:dashed;display:flex;align-items:center;justify-content:center;min-height:154px"><button class="btn sm" onclick="pickCrop(${i})">+ 심기</button></div>`;
    const c=FARM_CROP_BY_ID[p.id];const done=p.left<=0;
    return `<div class="sub farm-plot" style="border-color:${done?'var(--gold2)':'var(--line)'}">
      <div style="text-align:center;font-size:20px">${c.e}</div><div class="farm-species" style="text-align:center">${esc(c.n)}</div>
      <div style="text-align:center">${farmGrade(c)}</div><div class="tiny muted" style="text-align:center">${done?'수확 가능':hhmm(p.left)}</div>
      <div class="bar"><i style="width:${Math.max(0,Math.min(100,100-p.left/p.total*100))}%"></i></div>
      <div class="row" style="justify-content:center;gap:4px">${done?`<button class="btn sm pri" onclick="harvest(${i})">수확</button>`:
       `<button class="btn sm ghost" ${p.watered?'disabled':''} onclick="water(${i})">물</button><button class="btn sm ghost" ${p.fert?'disabled':''} onclick="fertilize(${i})">비료</button>`}</div>
    </div>`;}).join('')}</div>
  <div class="farm-help tiny" style="margin-top:11px">작물을 상하좌우에 붙여 기르면 새로운 씨앗을 발견할 수도 있습니다. 날씨가 바뀌면 품종에 미묘한 변화가 생기기도 합니다. 씨앗 선택창에서 교배 조합과 현재 충족한 변이 조건을 확인하세요.</div>
  <div class="farm-seedbar"><span class="tiny muted">보유 씨앗 일괄 심기 · 교배·변이 포함</span>${CROPS.filter(c=>(f.seeds[c.id]||0)>0).sort((a,b)=>Number(b.tier!=="normal")-Number(a.tier!=="normal")).map(c=>farmSeedButton(c)).join('')||'<span class="tiny muted">보유한 씨앗이 없습니다.</span>'}</div>
 </div>
 <div class="grid g2" style="gap:12px">
   <div class="card pad"><div class="spread"><div class="sect-t">오늘의 주문</div><span class="tiny muted">오늘의 지정 납품</span></div>
    ${oc?`<b>${oc.e} ${esc(oc.n)} ${o.need}개</b><div class="tiny muted">납품 진행 ${o.have}/${o.need} · 연등 1 · 비료 3 · 지식 80 · 경험치 300</div>
     <button class="btn sm ${!o.done&&o.have>=o.need?'pri':''}" style="margin-top:8px" ${o.done||o.have<o.need?'disabled':''} onclick="deliverOrder()">${o.done?'완료':'납품'}</button>`:''}</div>
   <div class="card pad"><div class="sect-t">날씨 · 변이 환경</div><div class="farm-discovery">${WEATHERS.map((v,i)=>`<span class="buffchip" style="${i===S.weather?'border-color:var(--gold2);color:var(--gold)':''}">${v.i} ${v.n}</span>`).join('')}</div>
      <div class="tiny muted">다음 변화까지 ${hhmm(S.wNext)} · ${w.d}</div>
      <div class="tiny muted" style="margin-top:8px">희귀 품종 수확 시 씨앗 하나를 회수합니다. 교배 조합과 변이 날씨는 아래 도감과 씨앗 선택창에서 확인할 수 있습니다.</div></div>
 </div>
 <div class="card pad" style="margin-top:12px"><div class="spread"><div class="sect-t">재배 · 교배 · 변이 도감 (${S.dex?.plant?.length||0}/${CROPS.length})</div><span class="tiny muted">노멀 · 레어 · 에픽 · 전설</span></div>
  <div class="tiny muted" style="margin-bottom:8px">작물을 수확한 후 도감에 등록됩니다. 씨앗만 얻은 품종은 미등록 상태입니다.</div>${farmCatalogRows()}</div>`;
};
pickCrop=function(i){
 farmEnsure();FARM_PICK_INDEX=i;
 modal(`씨앗 심기 · ${i+1}번 밭`, `<p class="tiny muted">빈 밭 ${S.farm.plots.filter(p=>!p).length}칸 · 현재 변이·교배 조건을 충족한 씨앗부터 표시합니다.</p>
 <input id="farm-seed-search" placeholder="씨앗 이름 · 교배 조합 검색" aria-label="씨앗 검색" oninput="farmSeedList()" style="width:100%;margin-bottom:10px">
 <div id="farm-seed-list" class="seed-pick-grid"></div>
 <p class="tiny muted">교배는 상하좌우 이웃 작물이 필요합니다. 다 자라는 순간의 날씨와 이웃으로 확률 판정하며, 조건 충족이 성공을 보장하지는 않습니다. 한 칸에 씨앗 1개를 소비합니다.</p>`);
 farmSeedList();
};
/* Add garden tab to the existing personal alert inbox. */
if(!ALERTCATS.some(x=>x.k==="farm"))ALERTCATS.splice(2,0,{k:"farm",n:"텃밭"});
ALERTVIEW.farm="farm";
ALERTRULE.unshift([/^\[(텃밭|약초밭|교배|변이)/,"farm"]);
/* Each new entry improves the quality chance by 0.2 percentage points. Every five
   species in a particular book grant a permanent +1 to its corresponding stat. */
const DEX_REWARD_GROUPS={mon:"atk",plant:"def",fish:"agi",dish:"men",title:"res"};
function dexTotal9(){return !S?.dex?0:Object.keys(DEX_REWARD_GROUPS).reduce((a,k)=>a+(S.dex[k]?.length||0),0);}
function dexRewardStat9(k){if(!S?.dex)return 0;return Object.entries(DEX_REWARD_GROUPS).reduce((a,[kind,stat])=>a+(stat===k?Math.floor((S.dex[kind]?.length||0)/5):0),0);}
const _extraStatGarden9=extraStat;
extraStat=function(k){return _extraStatGarden9(k)+dexRewardStat9(k);};
const _modGarden9=mod;
mod=function(k){return _modGarden9(k)+(k==="quality"?dexTotal9()*.002:0);};
const _dexAddGarden9=dexAdd;
dexAdd=function(kind,name){
 if(!S?.dex||!S.dex[kind])return;
 const was=S.dex[kind].includes(name),count=S.dex[kind].length;
 _dexAddGarden9(kind,name);
 if(!was&&S.dex[kind].includes(name)){
  const st=DEX_REWARD_GROUPS[kind];const bonus=st&&Math.floor((count+1)/5)>Math.floor(count/5);
  if(bonus){
   toast(`도감 ${kind} ${count+1}종 · ${({atk:'공격',def:'방어',agi:'민첩',men:'정신력',res:'공명'})[st]} 영구 +1`,"good");
   if(typeof alertPush==="function")alertPush("etc",`[도감] 「${name}」 등록으로 영구 능력치 +1을 획득했습니다.`,"record");
  } else toast(`도감 보너스 · 법구 품질 확률 +0.2%p`,"good");
  save();
 }
};
const _viewRecordGarden9=VIEWS.record;
VIEWS.record=()=>{
 let html=_viewRecordGarden9();
 const stats=[['악인','공격','mon'],['식물','방어','plant'],['낚시','민첩','fish'],['요리','정신력','dish'],['칭호','공명','title']];
 const reward=`<div class="card pad" style="margin-bottom:12px"><div class="sect-t">도감 수집 영구 보너스</div>
 <div class="tiny muted">새로운 항목 1개마다 법구 고품질 출현 확률 <b>+0.2%p</b>. 각 도감에서 5종마다 해당 능력치가 영구히 1 증가합니다.</div>
 <div class="farm-discovery">${stats.map(([name,stat,k])=>`<span class="buffchip">${name} ${S.dex[k].length}종 · ${stat} +${Math.floor(S.dex[k].length/5)}</span>`).join('')}</div>
 <b class="tiny" style="color:var(--jade)">현재 도감 법구 품질 보너스 +${(dexTotal9()*.002*100).toFixed(1)}%p</b></div>`;
 return html.replace('<div class="tabs"',reward+'<div class="tabs"');
};
// The opened/closed state belongs only to this reader on this browser, not to shared RP posts.
function rpDisclosureKey9(rootId){
 const who=(typeof ACCT!=="undefined"&&ACCT?.id)?String(ACCT.id):String(socialId()||S?.name||"guest");
 return `samu-rp-visibility-v1:${who}:${rootId}`;
}
function rpDisclosureOpen9(rootId){try{return localStorage.getItem(rpDisclosureKey9(rootId))!=="closed";}catch(e){return true;}}
function rpDisclosureToggle9(event,rootId){
 const el=event.currentTarget;if(!(el instanceof HTMLDetailsElement))return;
 try{localStorage.setItem(rpDisclosureKey9(rootId),el.open?"open":"closed");}catch(e){}
}
const _rpThreadGarden9=rpThreadHTML;
rpThreadHTML=function(root,marks){
 const html=_rpThreadGarden9(root,marks),expanded=rpDisclosureOpen9(root.id);
 return html.replace('<details class="rp-thread-tail" open>',`<details class="rp-thread-tail" ${expanded?'open':''} ontoggle="rpDisclosureToggle9(event,${Number(root.id)})">`);
};
/* Existing garden progress is migrated once, with old crop names removed. */
const _bootGarden9=boot;
boot=function(){farmEnsure();_bootGarden9();farmEnsure();};


;
/* ===== module: part10.js ===== */
/* ═══════════════════════════════════════════════════
   여와의 상점 개편 · 말랑이/영혼 인형 도감
   ═══════════════════════════════════════════════════ */

const YOWA_DUMPLINGS=[
 {n:"여와",img:"assets/yowa-dumplings/01.png"},
 {n:"류쉬안",img:"assets/yowa-dumplings/03.png"},
 {n:"킨",img:"assets/yowa-dumplings/04.png"},
 {n:"르셀리아",img:"assets/yowa-dumplings/05.png"},
 {n:"오즈",img:"assets/yowa-dumplings/06.png"},
 {n:"타다시",img:"assets/yowa-dumplings/07.png"},
 {n:"세결",img:"assets/yowa-dumplings/09.png"},
 {n:"삼장",img:"assets/yowa-dumplings/10.png"},
 {n:"카미오카",img:"assets/yowa-dumplings/11.png"},
 {n:"큰 요우",img:"assets/yowa-dumplings/12.png"},
 {n:"항아",img:"assets/yowa-dumplings/13.png"},
 {n:"작은 요우",img:"assets/yowa-dumplings/14.png"},
 {n:"카논",img:"assets/yowa-dumplings/15.png"},
 {n:"우해",img:"assets/yowa-dumplings/16.png"},
 {n:"사쿠",img:"assets/yowa-dumplings/17.png"},
 {n:"레이",img:"assets/yowa-dumplings/18.png"},
 {n:"란위안",img:"assets/yowa-dumplings/19.png"},
 {n:"신쥬",img:"assets/yowa-dumplings/20.png"},
 {n:"염라",img:"assets/yowa-dumplings/21.png"},
 {n:"양귀비",img:"assets/yowa-dumplings/22.png"},
 {n:"강시",img:"assets/yowa-dumplings/23.png"},
 {n:"렌야",img:"assets/yowa-dumplings/24.png"},
];
const YOWA_DOLLS=[
 {n:"큰요우",img:"assets/yowa-dolls/01.png"},
 {n:"카미오카",img:"assets/yowa-dolls/02.png"},
 {n:"신쥬",img:"assets/yowa-dolls/03.png"},
 {n:"심우해",img:"assets/yowa-dolls/04.png"},
 {n:"이누이",img:"assets/yowa-dolls/05.png"},
 {n:"윤세결",img:"assets/yowa-dolls/06.png"},
 {n:"르셀리아",img:"assets/yowa-dolls/07.png"},
 {n:"카논",img:"assets/yowa-dolls/08.png"},
 {n:"란위안",img:"assets/yowa-dolls/09.png"},
 {n:"오즈",img:"assets/yowa-dolls/11.png"},
 {n:"작은요우",img:"assets/yowa-dolls/13.png"},
 {n:"킨",img:"assets/yowa-dolls/14.png"},
 {n:"사쿠",img:"assets/yowa-dolls/15.png"},
 {n:"레이",img:"assets/yowa-dolls/17.png"},
 {n:"류쉬안",img:"assets/yowa-dolls/18.png"},
 {n:"렌야",img:"assets/yowa-dolls/10.png"},
];
const YOWA_DEX_REWARD_GROUPS={plush:"agi",doll:"res"};
// 체력·이성 회복 아이템은 SHOP(p1/p2)에만 판매합니다.
// 기존 소모품 소지 수량(S.inv.p1/p2)과 구매·사용 동작은 그대로 유지됩니다.
const YOWA_SPECIALS=[
 {id:"plush",n:"누군가를 닮은 만두 말랑이",price:30,kind:"plush",
  img:"assets/pixel-life/mystery-dumpling.png",pixel:true,
  desc:"랜덤 말랑이. 만지면 부드럽고 기분이 좋다. 대나무 찜기의 뚜껑을 열기 전까지 무엇이 들어있을지 모르는 기대감도 충족 시켜준다."},
 {id:"doll",n:"누군가를 닮은 영혼 인형",price:300,kind:"doll",
  img:"assets/pixel-life/wrapped-soul-doll.png",pixel:true,
  desc:"사무전의 재학생을 닮은 것 같다. 재봉선이 투박하며 애정이 느껴진다."},
];

function ensureV10(){
  if(!S||!S.made) return;
  if(!S.dex) S.dex={mon:[],plant:[],fish:[],dish:[],title:[],wards:[]};
  if(!Array.isArray(S.dex.plush)) S.dex.plush=[];
  if(!Array.isArray(S.dex.doll)) S.dex.doll=[];
  if(!S.yowa) S.yowa={last:null};
  // Retain a private migration archive; retired collectibles no longer count or appear.
  const retired=['지영원','영원','우건하','건하'];
  const renyaNames=['야나기 렌야','야나기렌야','렌야'];
  for(const kind of ['plush','doll']){
    // Renya has returned: restore archived discoveries without losing other retirements.
    const archived=S.yowa.retired?.[kind]||[];
    S.dex[kind]=[...new Set(S.dex[kind].map(n=>renyaNames.includes(n)?'렌야':n))];
    if(archived.some(n=>renyaNames.includes(n))){
      if(!S.dex[kind].includes('렌야'))S.dex[kind].push('렌야');
      S.yowa.retired[kind]=archived.filter(n=>!renyaNames.includes(n));
    }
    const removed=S.dex[kind].filter(n=>retired.includes(n));
    if(removed.length){
      if(!S.yowa.retired)S.yowa.retired={};
      S.yowa.retired[kind]=[...new Set([...(S.yowa.retired[kind]||[]),...removed])];
      S.dex[kind]=S.dex[kind].filter(n=>!retired.includes(n));
    }
  }
  if(S.yowa.last&&renyaNames.includes(S.yowa.last.name)){
    S.yowa.last.name='렌야';
    S.yowa.last.img=S.yowa.last.kind==='plush'?'assets/yowa-dumplings/24.png':'assets/yowa-dolls/10.png';
  }
  if(S.yowa.last&&retired.includes(S.yowa.last.name))S.yowa.last=null;
}
function yowaDexTotal(){
  ensureV10();
  return (S.dex.plush?.length||0)+(S.dex.doll?.length||0);
}
function yowaDexRewardStat(k){
  ensureV10();
  return Object.entries(YOWA_DEX_REWARD_GROUPS).reduce((a,[kind,stat])=>a+(stat===k?Math.floor((S.dex[kind]?.length||0)/5):0),0);
}
const _dexScore10=dexScore;
dexScore=function(){ ensureV10(); return _dexScore10()+((S.dex.plush?.length||0)*5)+((S.dex.doll?.length||0)*5); };
const _extraStat10=extraStat;
extraStat=function(k){ return _extraStat10(k)+yowaDexRewardStat(k); };
const _mod10=mod;
mod=function(k){ return _mod10(k)+(k==="quality"?yowaDexTotal()*.002:0); };
const _dexAdd10=dexAdd;
dexAdd=function(kind,name){
  ensureV10();
  if(!(kind in YOWA_DEX_REWARD_GROUPS)) return _dexAdd10(kind,name);
  if(!S.dex[kind]) S.dex[kind]=[];
  const had=S.dex[kind].includes(name),before=S.dex[kind].length;
  if(!had){
    S.dex[kind].push(name);
    toast(`도감 등록 · <b>${esc(name)}</b>`,"good");
    const st=YOWA_DEX_REWARD_GROUPS[kind];
    const bonus=Math.floor((before+1)/5)>Math.floor(before/5);
    if(bonus){
      const stName={atk:'공격',def:'방어',agi:'민첩',men:'정신력',res:'공명'}[st]||st;
      toast(`도감 ${kind==='plush'?'말랑이':'영혼 인형'} ${before+1}종 · ${stName} 영구 +1`,"good");
      if(typeof alertPush==="function") alertPush("etc",`[도감] 「${name}」 등록으로 ${stName} 영구 +1을 획득했습니다.`,"record");
    }else{
      toast("도감 보너스 · 법구 품질 확률 +0.2%p","good");
    }
    if(typeof achCheck==="function") achCheck();
    save();
  }
};

// 매점 일반 상품 도트.
const YOWA_PIXEL_ITEMS={m1:2,m2:3,m3:4,m4:5,m6:6,m7:7,m8:8,m9:9,m10:10,m11:11,m12:12,p1:0,p2:1,p3:15,p4:1,p5:7,p6:7,p7:10,p8:10,p9:13};
function yowaPixelArt(id,name,size=64){
 const cell=YOWA_PIXEL_ITEMS[id];if(cell===undefined)return '';
 return `<span role="img" aria-label="${esc(name)} 도트" style="display:inline-block;flex:none;width:${size}px;height:${size}px;image-rendering:pixelated;background-image:url('assets/pixel-life/shop-items.png?v=20261104-shop1');background-size:400% 400%;background-repeat:no-repeat;background-position:${cell%4*100/3}% ${Math.floor(cell/4)*100/3}%"></span>`;
}
function yowaCardArt(item){
  if(item.id in YOWA_PIXEL_ITEMS)return yowaPixelArt(item.id,item.n,80);
  if(item.img) return `<img src="${item.img}" alt="${esc(item.n)}" style="width:${item.pixel?104:80}px;height:${item.pixel?104:80}px;object-fit:contain;image-rendering:${item.pixel?'pixelated':'auto'};filter:drop-shadow(0 4px 10px #0008)">`;
  return `<div style="font-size:56px;line-height:1">${item.art||'📦'}</div>`;
}
function yowaSpecialCard(item){
  const price=`${nf(item.price)} 륜`;
  return `<div class="sub" style="padding:0;overflow:hidden;display:flex;flex-direction:column">
    <div style="min-height:118px;display:grid;place-items:center;padding:12px 10px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))">${yowaCardArt(item)}</div>
    <div style="background:rgba(173,84,255,.26);padding:9px 10px;font-weight:700;text-align:center">${esc(item.n)}</div>
    <div style="padding:12px 12px 10px;display:flex;flex-direction:column;gap:8px;height:100%">
      <div class="tiny muted" style="line-height:1.8;min-height:92px">${esc(item.desc)}</div>
      <div class="spread" style="margin-top:auto"><b style="color:var(--gold)">${price}</b><button class="btn pri sm" onclick="yowaBuySpecial('${item.id}')">구매</button></div>
    </div></div>`;
}

function yowaBuySpecial(id){
  ensureV10();
  const item=YOWA_SPECIALS.find(x=>x.id===id);
  if(!item) return;
  if(S.rin<item.price){ toast("륜이 부족합니다.","bad"); return; }
  S.rin-=item.price;
  if(item.kind==="plush"){
    const got=pick(YOWA_DUMPLINGS);
    const isNew=!(S.dex.plush||[]).includes(got.n);
    S.yowa.last={kind:"plush",name:got.n,img:got.img,time:Date.now()};
    dexAdd("plush",got.n);
    yowaRevealModal("누군가를 닮은 만두 말랑이",got,isNew,"말랑이 도감",`말랑이 도감 ${(S.dex.plush||[]).length} / ${YOWA_DUMPLINGS.length}`);
  }else if(item.kind==="doll"){
    const got=pick(YOWA_DOLLS);
    const isNew=!(S.dex.doll||[]).includes(got.n);
    S.yowa.last={kind:"doll",name:got.n,img:got.img,time:Date.now()};
    dexAdd("doll",got.n);
    yowaRevealModal("누군가를 닮은 영혼 인형",got,isNew,"영혼 인형 도감",`영혼 인형 도감 ${(S.dex.doll||[]).length} / ${YOWA_DOLLS.length}`);
  }
  renderTop(); renderNav(); renderMain(); save();
}
function yowaRevealModal(title,got,isNew,bookName,progress){
  modal(title,`
    <div style="display:grid;place-items:center;margin-bottom:12px;padding:10px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015));border:1px solid var(--line);border-radius:16px">
      <img src="${got.img}" alt="${esc(got.n)}" style="max-width:min(240px,70vw);max-height:260px;object-fit:contain;border-radius:12px">
    </div>
    <div class="spread" style="align-items:flex-start;gap:12px"><div>
      <div class="sect-t" style="margin:0">${esc(got.n)}</div>
      <div class="tiny muted" style="margin-top:5px">${bookName}에 ${isNew?'<b style="color:var(--jade)">새로 등록</b>':'이미 등록된 모습'}입니다.</div>
      <div class="tiny muted" style="margin-top:4px">${progress}</div></div>
      <span class="tag ${isNew?'g':''}">${isNew?'NEW':'중복'}</span></div>
    <div class="tiny muted" style="margin-top:10px;line-height:1.8">새로운 도감 항목 1개마다 법구 고품질 출현 확률이 +0.2%p 상승합니다. 말랑이는 5종마다 민첩 +1, 영혼 인형은 5종마다 공명 +1의 영구 보너스를 얻습니다.</div>
    <div class="row" style="margin-top:14px"><button class="btn pri" onclick="closeModal()">닫기</button><button class="btn" onclick="RECTAB='${bookName.includes('말랑이')?'말랑이 도감':'영혼 인형 도감'}';closeModal();go('record')">도감 보기</button></div>`);
}

const _shopView10=VIEWS.shop;
VIEWS.shop=()=>{
  ensureV10();
  const used=k=>S.mart[k]||0;
  return head("사무전 1층 · 여와의 매점",ic("store")+" 매점", `보유 륜 ${nf(S.rin)} · 연등 ${S.lotus} · 사리 ${S.sari}`)+`
  <div class="card pad" style="margin-bottom:14px">
    <div class="quote">"아, 안녕하세요⋯⋯. 오늘은 진열대를 조금 새로 꾸며 봤어요. 그, 그러니까⋯⋯ 만두 말랑이랑 영혼 인형은 랜덤으로 나오니까 놀라지 말아 주세요."</div>
    <div class="tiny muted" style="margin-top:8px">말랑이/영혼 인형은 구매 즉시 무작위 이미지가 뜨고 도감에 기록됩니다. 새 항목은 법구 품질 보너스를 올리고, 일정 수집마다 영구 능력치 보너스를 줍니다.</div>
  </div>
  <div class="card pad" style="margin-bottom:14px">
    <div class="spread" style="margin-bottom:8px"><div class="sect-t" style="margin:0">여와의 진열대</div>
      <div class="tiny muted">말랑이 ${S.dex.plush.length}/${YOWA_DUMPLINGS.length} · 영혼 인형 ${S.dex.doll.length}/${YOWA_DOLLS.length}</div></div>
    <div class="grid g2">${YOWA_SPECIALS.map(yowaSpecialCard).join("")}</div>
  </div>
  <div class="grid g4" style="margin-bottom:14px">
    ${MART.map(m=>{
      const lock=m.req&&S.course<m.req;
      const u=used(m.id), out=m.per!=="ever"&&u>=m.lim;
      const costTxt=Object.keys(m.cost).map(k=>`${({rin:"륜",lotus:"연등",sari:"사리"})[k]} ${nf(m.cost[k])}`).join(" · ");
      return `<div class="sub" style="${lock?"opacity:.45":""}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">${yowaPixelArt(m.id,m.n)}<b>${esc(m.n)}</b></div><div class="spread">${m.per!=="ever"?`<span class="tiny muted">${u} / ${m.lim}</span>`:""}</div>
        <div class="tiny muted" style="margin:5px 0 8px;min-height:36px">${m.d}</div>
        ${lock?`<div class="tag">${m.req}과정부터</div>`
          :`<button class="btn sm ${out?"":"pri"}" ${out?"disabled":""} onclick="martBuy('${m.id}')">${out?"오늘 끝":`구매 · ${costTxt}`}</button>`}
      </div>`}).join("")}
  </div>
  <div class="card pad">
    <div class="sect-t">소모품 · 탕약</div>
    <div class="grid g4">
      ${SHOP.map(p=>`<div class="sub">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">${yowaPixelArt(p.id,p.n)}<b>${esc(p.n)}</b></div><div class="spread">${p.tag?`<span class="tag">${p.tag}</span>`:""}</div>
        <div class="tiny muted" style="margin:5px 0 8px">${p.d}</div>
        <div class="spread"><span class="tiny" style="color:var(--gold)">륜 ${nf(p.c)}</span>
          <span class="tiny muted">보유 ${S.inv[p.id]||0}</span></div>
        <div class="row" style="margin-top:8px">
          <button class="btn sm" onclick="buy('${p.id}')">구매</button>
          <button class="btn pri sm" ${(S.inv[p.id]||0)<1?"disabled":""} onclick="useItem('${p.id}')">사용</button></div>
      </div>`).join("")}
    </div>
  </div>`;
};

function yowaDexImageGrid(items,key,label){
  ensureV10();
  return `<div class="grid g4">${items.map(it=>{
    const got=(S.dex[key]||[]).includes(it.n);
    return `<div class="sub" style="${got?'':'opacity:.46'}">
      <div style="aspect-ratio:1/1;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.035);display:grid;place-items:center;overflow:hidden;margin-bottom:8px">
        ${got?`<img src="${it.img}" alt="${esc(it.n)}" style="width:100%;height:100%;object-fit:contain">`:`<div style="font-size:42px;color:var(--dim2)">?</div>`}
      </div>
      <div class="spread"><b>${got?esc(it.n):'???'}</b>${got?'<span class="tag g">등록</span>':''}</div>
      <div class="tiny muted" style="margin-top:4px">${got?`${label} 도감에 기록되었습니다.`:'아직 발견하지 못했습니다.'}</div>
    </div>`;
  }).join("")}</div>`;
}

VIEWS.record=()=>{
  ensureV10();
  const tabs=["업적","칭호 도감","악인 도감","식물 도감","낚시 도감","만두 도감","말랑이 도감","영혼 인형 도감","도감 점수","통계"];
  let body="";

  if(RECTAB==="업적"){
    let list=ACH.map(a=>({a, v:achVal(a), done:S.ach.includes(a.id)}));
    if(ACHFILTER==="달성") list=list.filter(x=>x.done);
    if(ACHFILTER==="미달성") list=list.filter(x=>!x.done);
    body=`<div class="row" style="margin-bottom:10px">
      <span class="seg">${["전체","달성","미달성"].map(f=>`<button class="${ACHFILTER===f?"on":""}" onclick="ACHFILTER='${f}';renderMain()">${f} ${f==="전체"?ACH.length:f==="달성"?S.ach.length:ACH.length-S.ach.length}</button>`).join("")}</span>
      <span class="tiny muted" style="margin-left:auto">업적 점수 <b style="color:var(--gold)">${achPts()}</b></span></div>
    <div class="grid g4">
      ${list.map(({a,v,done})=>`<div class="sub" style="${done?"border-color:var(--gold2)":""}">
        <div class="spread"><div class="row" style="gap:6px">
          <span style="width:16px;height:16px;border-radius:50%;border:1px solid ${done?"var(--gold)":"var(--s5)"};display:grid;place-items:center;font-size:10px;color:var(--gold)">${done?ic("check",11):""}</span>
          <b style="font-size:13px">${a.n}</b></div>
          <span class="tag ${done?"g":""}">+${a.p}</span></div>
        <div class="tiny muted" style="margin:5px 0 4px">${a.d}</div>
        ${done?`<div class="tiny" style="color:var(--jade)">달성</div>`
          :`<div class="bar" style="margin:3px 0"><i style="width:${clamp(v/a.g*100,0,100)}%"></i></div>
            <div class="tiny muted">${nf(v)} / ${nf(a.g)}</div>`}
      </div>`).join("")}</div>`;
  }

  const dexGrid=(items,key)=>`<div class="grid g4">
    ${items.map(it=>{
      const nm=typeof it==="string"?it:it.n;
      const got=S.dex[key].includes(nm);
      return `<div class="sub" style="${got?"":"opacity:.42"}">
        <div class="spread"><b>${typeof it==="string"?"":it.e+" "}${got?nm:"???"}</b>${got?'<span class="tag g">등록</span>':''}</div>
        <div class="tiny muted" style="margin-top:4px">${got?(it.d||it.w||""):"아직 만나지 못했습니다"}</div>
        ${got&&it.w?`<div class="tiny" style="color:var(--jade);margin-top:3px">${it.w}</div>`:""}</div>`;
    }).join("")}</div>`;

  if(RECTAB==="악인 도감") body=`<div class="tiny muted" style="margin-bottom:10px">의뢰와 탑에서 마주친 악인·업귀가 기록됩니다. ${S.dex.mon.length} / ${MONS.length}</div>`+dexGrid(MONS,"mon");
  if(RECTAB==="식물 도감") body=`<div class="tiny muted" style="margin-bottom:10px">약초밭에서 길러 수확한 작물이 기록됩니다. ${S.dex.plant.length} / ${CROPS.length}</div>`+dexGrid(CROPS,"plant");
  if(RECTAB==="낚시 도감") body=`<div class="tiny muted" style="margin-bottom:10px">발견 ${S.dex.fish.length} / ${FISHES.length}종 · 수치는 <b>보유 수량이 아닌 기본 출현 확률</b>입니다. 획득 횟수는 실제 낚시 기록입니다.</div>
    <div class="grid g4">${FISHES.map(it=>{
      const got=S.dex.fish.includes(it.n), c=(S.fish.catches||{})[it.n]||0;
      return `<div class="sub" style="${got?"":"opacity:.6"}">
        <div class="spread"><b>${got?it.e+" "+it.n:"???"}</b>${got?'<span class="tag g">등록</span>':''}</div>
        <div class="tiny muted" style="margin-top:5px">기본 출현 확률 ${it.w}%</div>
        <div class="tiny" style="color:var(--jade);margin-top:4px">${got?`내가 낚은 횟수 ${c}회`:"아직 낚은 적 없음"}</div>
      </div>`; }).join("")}</div>`;
  if(RECTAB==="만두 도감") body=`<div class="tiny muted" style="margin-bottom:10px">직접 빚어 본 만두의 속재료와 효과가 기록됩니다. ${S.dex.dish.length} / ${DISHES.length}</div>`+dexGrid(DISHES,"dish");
  if(RECTAB==="말랑이 도감") body=`<div class="tiny muted" style="margin-bottom:10px">여와의 상점에서 얻은 랜덤 만두 말랑이가 기록됩니다. ${S.dex.plush.length} / ${YOWA_DUMPLINGS.length} · 5종마다 <b>민첩 +1</b></div>`+yowaDexImageGrid(YOWA_DUMPLINGS,"plush","말랑이");
  if(RECTAB==="영혼 인형 도감") body=`<div class="tiny muted" style="margin-bottom:10px">여와의 상점에서 얻은 영혼 인형이 기록됩니다. ${S.dex.doll.length} / ${YOWA_DOLLS.length} · 5종마다 <b>공명 +1</b></div>`+yowaDexImageGrid(YOWA_DOLLS,"doll","영혼 인형");
  if(RECTAB==="칭호 도감"){
    body=`<div class="tiny muted" style="margin-bottom:10px">${S.dex.title.length} / ${TITLES.length} · 누르면 학생증의 칭호가 바뀝니다</div>
    <div class="grid g4">${TITLES.map((t,i)=>{
      const got=titleUnlocked(i);
      return `<div class="sub" style="${got?"":"opacity:.42"}">
        <div class="spread"><b>${got?t:"???"}</b>${S.title===t?'<span class="tag g">사용 중</span>':''}</div>
        <div class="tiny muted" style="margin:5px 0 7px">${got?titleHow(i):"조건이 알려지지 않았습니다"}</div>
        ${got?`<button class="btn sm ${S.title===t?"":"pri"}" onclick="setTitle('${t}');renderMain()">${S.title===t?"사용 중":"사용하기"}</button>`:""}</div>`}).join("")}</div>`;
  }
  if(RECTAB==="도감 점수"){
    const rows=[["악인 도감",S.dex.mon.length,MONS.length,6],["식물 도감",S.dex.plant.length,CROPS.length,5],
                ["낚시 도감",S.dex.fish.length,FISHES.length,8],["만두 도감",S.dex.dish.length,DISHES.length,5],
                ["말랑이 도감",S.dex.plush.length,YOWA_DUMPLINGS.length,5],["영혼 인형 도감",S.dex.doll.length,YOWA_DOLLS.length,5],
                ["칭호 도감",S.dex.title.length,TITLES.length,4]];
    body=`<div class="card pad" style="margin-bottom:12px">
      <div class="spread"><div class="sect-t" style="margin:0">도감 점수</div>
        <div style="font-size:26px;font-weight:600;color:var(--gold)">${dexScore()}</div></div>
      <div class="tiny muted">도감에 등록한 항목마다 점수가 쌓입니다. 점수는 랭킹의 「도감 점수」 부문에 반영됩니다.</div></div>
    <table class="t">${rows.map(([n,a,b,w])=>`<tr><td>${n}</td>
      <td style="width:40%"><div class="bar"><i style="width:${b?Math.min(100,a/b*100):0}%"></i></div></td>
      <td style="text-align:right">${a} / ${b}</td>
      <td style="text-align:right"><b style="color:var(--gold)">${a*w}점</b></td></tr>`).join("")}</table>`;
  }
  if(RECTAB==="통계"){
    const C=S.ct;
    const rows=[["명계에서 보낸 날",cal().day+1+"일"],["수업 교시",nf(C.classH)],["처치한 악인",nf(C.mon)],
      ["처치한 보스",nf(C.boss)],["해결한 의뢰",nf(C.quest)],["석탑 최고",(S.tower||0)+"층"],["결계의 탑 최고",(S.tower2||0)+"층"],
      ["연무제 최고",S.arena.best+"회전"],["업귀 토벌 공격",nf(C.wb)+"회"],["구역 나들이",nf(C.outing)+"회"],
      ["수확",nf(C.harvest)+"회"],["낚시",nf(C.fish)+"마리"],["만두 빚기",nf(C.cook)+"번"],
      ["말랑이 수집",`${S.dex.plush.length}종`],["영혼 인형 수집",`${S.dex.doll.length}종`],
      ["업적 점수",achPts()],["도감 점수",dexScore()],["전투력",nf(power())]];
    body=`<div class="grid g4">${rows.map(([k,v])=>`<div class="card pad" style="padding:11px 13px"><div class="tiny muted">${k}</div><div style="font-size:18px;font-weight:600;color:var(--gold)">${v}</div></div>`).join("")}</div>`;
  }

  const rewardStats=[["악인","공격","mon"],["식물","방어","plant"],["낚시","민첩","fish"],["만두","정신력","dish"],["말랑이","민첩","plush"],["영혼 인형","공명","doll"],["칭호","공명","title"]];
  const reward=`<div class="card pad" style="margin-bottom:12px"><div class="sect-t">도감 수집 영구 보너스</div>
  <div class="tiny muted">새로운 항목 1개마다 법구 고품질 출현 확률 <b>+0.2%p</b>. 각 도감에서 5종마다 해당 능력치가 영구히 1 증가합니다.</div>
  <div class="farm-discovery">${rewardStats.map(([name,stat,k])=>`<span class="buffchip">${name} ${S.dex[k].length}종 · ${stat} +${Math.floor(S.dex[k].length/5)}</span>`).join('')}</div>
  <b class="tiny" style="color:var(--jade)">현재 도감 법구 품질 보너스 +${((["mon","plant","fish","dish","plush","doll","title"].reduce((a,k)=>a+((S.dex[k]||[]).length),0))*.002*100).toFixed(1)}%p</b></div>`;

  return head("업적 · 도감 · 통계",ic("scroll")+" 기록실", `업적 ${S.ach.length} / ${ACH.length}`)+`
  ${reward}
  <div class="tabs" style="margin-bottom:14px;padding:0 0 0 2px">
    ${tabs.map(t=>`<div class="tab ${RECTAB===t?"on":""}" onclick="RECTAB='${t}';renderMain()">${t}${t==="도감 점수"?` <span class="tag g">${dexScore()}</span>`:""}</div>`).join("")}
  </div>${body}`;
};

const _boot10=boot;
boot=function(){ _boot10(); ensureV10(); renderNav(); renderMain(); };


;
/* ===== module: part11.js ===== */
"use strict";
/* 텃밭 개별 재료 · 씨앗/비료 구매 · 난도별 만두 · 브라우저 알림 */
const FARM_SEED_PRICES={g1:40,g2:45,g3:35,g4:45,g5:55,g6:55,g7:40,g8:40,g9:60,g10:65,g11:65,g12:65,g13:55,g14:60,g15:55,g16:70};
const FARM_CATEGORIES=["뿌리","약초","꽃","열매"];
const FERTILIZERS11=[
 {id:"regular",name:"기본 비료",price:70,desc:"남은 성장시간 -30%, 수확량 +1",time:.70,yield:1},
 {id:"rapid",name:"속성 비료",price:160,desc:"남은 성장시간 -55%",time:.45,yield:0},
 {id:"rich",name:"풍성 비료",price:200,desc:"남은 성장시간 -15%, 수확량 +3",time:.85,yield:3},
 {id:"mutation",name:"변이 촉진제",price:320,desc:"성장시간 -15%, 날씨 변이 시도 확률 상승",time:.85,yield:0,mutation:1.8},
 {id:"cross",name:"꽃가루 비료",price:290,desc:"성장시간 -20%, 상하좌우 교배 확률 상승",time:.80,yield:0,cross:1.7}
];
// 원예 개별 재료는 다른 제작 계통의 기존 S.mat와 독립적으로 보관합니다.
function ensureFarmItems11(){
 if(!S||!S.made)return;
 farmEnsure();
 if(!S.ingredients||typeof S.ingredients!=="object"||Array.isArray(S.ingredients))S.ingredients={};
 if(!S.farm.fertilizers||typeof S.farm.fertilizers!=="object")S.farm.fertilizers={};
 if(typeof S.farm.fert==="number"&&S.farm.fert>0){
  S.farm.fertilizers.regular=(S.farm.fertilizers.regular||0)+S.farm.fert;
  S.farm.fert=0;
 }
 S.farm.fertTransferred11=true;
}
function inventory11(name){ensureFarmItems11();return Number(S.ingredients[name])||0;}
function addIngredient11(name,n){
 ensureFarmItems11();if(!name||!Number.isFinite(n)||n<=0)return;
 S.ingredients[name]=(S.ingredients[name]||0)+n;
}
function seedShop11(){
 ensureFarmItems11();
 const rows=FARM_CATEGORIES.map(cat=>`<div class="sect-t" style="margin-top:14px">${cat}</div>
  <div class="grid g4">${FARM_NORMALS.filter(c=>c.y===cat).map(c=>`<div class="sub">
   <div class="spread"><b>${c.e} ${esc(c.n)}</b><span class="tag">보유 ${(S.farm.seeds[c.id]||0)}</span></div>
   <div class="tiny muted" style="margin:6px 0">${esc(c.d)} · 성장 ${hhmm(c.t)}</div>
   <div class="spread"><b style="color:var(--gold)">${nf(FARM_SEED_PRICES[c.id]||60)}륜</b>
    <div class="row" style="gap:4px"><button class="btn sm" onclick="farmSeedBuy11('${c.id}',1)">1개</button><button class="btn sm pri" onclick="farmSeedBuy11('${c.id}',5)">5개</button></div></div></div>`).join('')}</div>`).join('');
 return `<div class="card pad" style="margin-bottom:12px"><div class="spread"><div class="sect-t" style="margin:0">온실 종묘점</div><b style="color:var(--gold)">보유 ${nf(S.rin)}륜</b></div>
 <div class="tiny muted" style="margin-top:6px">일반 품종의 씨앗은 구매 후 심을 수 있습니다. 교배·날씨 변이로만 얻는 희귀 씨앗은 이곳에서 팔지 않습니다.</div>
 ${rows}</div>`;
}
function farmSeedBuy11(id,amount){
 ensureFarmItems11();const c=FARM_NORMALS.find(c=>c.id===id);if(!c)return;
 amount=Math.max(1,Math.min(100,Number(amount)||1));
 const total=(FARM_SEED_PRICES[id]||60)*amount;
 if(S.rin<total){toast("씨앗을 살 륜이 부족합니다.","bad");return;}
 S.rin-=total;S.farm.seeds[id]=(S.farm.seeds[id]||0)+amount;
 toast(`${c.n} 씨앗 ${amount}개 구매 · ${nf(total)}륜`,"good");renderTop();renderMain();save();
}
function fertiliserShop11(){
 ensureFarmItems11();
 return `<div class="card pad" style="margin-bottom:12px"><div class="sect-t">비료 제작 · 구매</div>
 <div class="tiny muted" style="margin-bottom:12px">성장 시간을 줄이거나 수확량, 교배·변이 기회를 보정합니다. 밭 한 칸에는 비료를 한 번만 사용할 수 있습니다.</div>
 <div class="grid g3">${FERTILIZERS11.map(f=>`<div class="sub">
 <div class="spread"><b>${esc(f.name)}</b><span class="tag">보유 ${S.farm.fertilizers[f.id]||0}</span></div>
 <div class="tiny muted" style="margin:6px 0">${esc(f.desc)}</div>
 <div class="spread"><b style="color:var(--gold)">${nf(f.price)}륜</b><button class="btn sm pri" onclick="farmFertiliserBuy11('${f.id}')">구매</button></div></div>`).join('')}</div>
 <div class="sub" style="margin-top:10px"><b>기본 비료 만들기</b><div class="tiny muted">뿌리 계통 부산물 2개 + 약초 계통 부산물 2개 → 기본 비료 1개</div>
 <div class="spread" style="margin-top:8px"><span class="tiny muted">보유 뿌리 ${S.mat.뿌리||0} · 약초 ${S.mat.약초||0}</span>
 <button class="btn sm" onclick="farmFertiliserCraft11()" ${(S.mat.뿌리||0)>=2&&(S.mat.약초||0)>=2?'':'disabled'}>만들기</button></div></div></div>`;
}
function farmFertiliserBuy11(id){
 ensureFarmItems11();const f=FERTILIZERS11.find(f=>f.id===id);if(!f)return;
 if(S.rin<f.price){toast("륜이 부족합니다.","bad");return;}
 S.rin-=f.price;S.farm.fertilizers[id]=(S.farm.fertilizers[id]||0)+1;
 toast(`${f.name} 구매 완료`,"good");renderTop();renderMain();save();
}
function farmFertiliserCraft11(){
 ensureFarmItems11();if((S.mat.뿌리||0)<2||(S.mat.약초||0)<2)return;
 S.mat.뿌리-=2;S.mat.약초-=2;S.farm.fertilizers.regular=(S.farm.fertilizers.regular||0)+1;
 toast("기본 비료 +1","good");renderMain();save();
}
function farmFertiliserChoose11(i){
 ensureFarmItems11();const p=S.farm.plots[i];if(!p||p.fert||p.left<=0)return;
 modal('비료 선택',`<div class="tiny muted" style="margin-bottom:8px">한 밭에는 비료를 한 번만 줄 수 있습니다.</div>
  ${FERTILIZERS11.map(f=>`<div class="spread" style="gap:8px;padding:10px 0;border-bottom:1px solid var(--line)"><div><b>${f.name}</b><div class="tiny muted">${f.desc}</div></div><button class="btn sm" ${S.farm.fertilizers[f.id]>0?'':'disabled'} onclick="farmFertiliserApply11(${i},'${f.id}')">사용 (${S.farm.fertilizers[f.id]||0})</button></div>`).join('')}`);
}
function farmFertiliserApply11(i,id){
 ensureFarmItems11();const p=S.farm.plots[i],f=FERTILIZERS11.find(v=>v.id===id);
 if(!p||!f||p.left<=0||p.fert||!(S.farm.fertilizers[id]>0))return;
 S.farm.fertilizers[id]--;p.fert=true;p.fertType11=id;
 p.left=Math.max(1,Math.round(p.left*f.time));
 closeModal();toast(`${f.name} 사용`,"good");renderMain();save();
}
function fertYield11(p){const type=FERTILIZERS11.find(f=>f.id===p?.fertType11);return type?type.yield||0:0;}
const _crossChance11=farmCrossChance;
farmCrossChance=function(c){const p=typeof FARM_MATURE_I11==='number' ? S.farm.plots[FARM_MATURE_I11]:null;
 return Math.min(1,_crossChance11(c)*(p?.fertType11==='cross'?1.7:1));};
const _mutationChance11=farmMutationChance;
farmMutationChance=function(c){const p=typeof FARM_MATURE_I11==='number' ? S.farm.plots[FARM_MATURE_I11]:null;
 return Math.min(1,_mutationChance11(c)*(p?.fertType11==='mutation'?1.8:1));};
let FARM_MATURE_I11=null;
const _farmMature11=farmMature;
farmMature=function(i){FARM_MATURE_I11=i;try{return _farmMature11(i);}finally{FARM_MATURE_I11=null;}};
const _harvest11=harvest;
harvest=function(i){
 ensureFarmItems11();const p=S.farm.plots[i];if(!p||p.left>0)return;
 const beforeId=p.id, type=p.fertType11;
 // Base harvest gives +1 for any fertilizer. Adjust the generic yield to match the chosen fertilizer.
 const oldTotal=Number(S.mat[FARM_CROP_BY_ID[beforeId]?.y]||0);
 _harvest11(i);
 const c=FARM_CROP_BY_ID[beforeId];if(!c)return;
 const afterTotal=Number(S.mat[c.y]||0);
 const actual=afterTotal-oldTotal;
 const delta=(type==='rich'?2:(type&&type!=='regular'?-1:0));
 const gained=Math.max(1,actual+delta);
 if(delta)S.mat[c.y]=Math.max(0,afterTotal+delta);
 addIngredient11(c.n,gained);
 toast(`${c.n} +${gained} · 개별 재료 보관함`,"good");save();
};
const _fishHook11=fishHook;
fishHook=function(){
 ensureFarmItems11();const before={...S.fish.catches};_fishHook11();
 for(const [name,num] of Object.entries(S.fish.catches)){
  if((Number(num)||0)>(Number(before[name])||0)){
   const f=FISHES.find(x=>x.n===name);if(f)addIngredient11(f.n,f.s);
  }
 }
 save();
};

/* 난도: 일반 재료부터 희귀 품종까지. 각 레시피의 이름과 개수로 차감합니다. */
const DISH_MATERIALS11={
 d1:{"백옥무":3},d2:{"흑설탕호박":4},d3:{"청룡부추":3,"산초잎":1},
 d4:{"검은 숭어":3,"망천연근":1},d5:{"매화":2,"홍매실":2},
 d6:{"망천연근":2,"청경채":2},d7:{"금강밤":2,"대추":2},
 d8:{"야광버섯":2,"청화연근":1},d9:{"흑수새우":2,"청룡부추":2},
 d10:{"법륜죽순":2,"청경채":1},d11:{"혼향연화":2,"대추":1},
 d12:{"심해 가자미":2,"혼백연근":1},d13:{"망각매실":2,"연등꽃":1},
 d14:{"공명콩":1,"홍련근":1,"청화매화":1,"귀령밤":1,"망천장어":1},
 d15:{"불멸대추":2,"청월연꽃":2,"삼계어":1}
};
const DISH_BONUS11={
 d8:{buf:[["heal",.13],["defP",.06]],dur:330},
 d10:{buf:[["defP",.09],["snGuard",.08]],dur:340},
 d11:{buf:[["know",.10],["exp",.06]],dur:330},
 d12:{buf:[["boss",.12],["atkP",.08]],dur:350},
 d13:{buf:[["mana",.14],["snGuard",.09]],dur:350},
 d14:{buf:[["gold",.13],["loot",.075]],dur:420},
 d15:{buf:[["exp",.13],["critD",.15]],dur:480}
};
for(const d of DISHES){
 if(DISH_BONUS11[d.id])Object.assign(d,DISH_BONUS11[d.id]);
 d.mat={...DISH_MATERIALS11[d.id]};
 d.fill=[...new Set(Object.keys(d.mat).map(n=>CROPS.find(c=>c.n===n)?.y||FISHES.find(f=>f.n===n)?.y||"어물"))];
}
const _cook11=cook;
cook=function(id){
 ensureFarmItems11();const d=DISHES.find(x=>x.id===id);if(!d)return;
 if(!Object.entries(d.mat).every(([n,c])=>inventory11(n)>=c)){
  toast("특정 작물 또는 어종의 보유 수량이 부족합니다.","bad");return;
 }
 for(const [n,c]of Object.entries(d.mat))S.ingredients[n]-=c;
 S.kit.have[id]=(S.kit.have[id]||0)+1;
 toast(`${d.n} 제작 · 개별 속재료 사용`,"good");
 if(typeof ct==="function")ct("cook");
 if(typeof dexAdd==="function")dexAdd("dish",d.n);
 if(typeof achCheck==="function")achCheck();
 renderMain();save();
};

// 모든 작물과 어물은 계통별로 검색하고, 사용량은 개별 수량으로 계산합니다.
VIEWS.kitchen=function(){
 ensureFarmItems11();
 const fills=["전체","뿌리","약초","어물","꽃","열매"];
 const visible=DISHES.filter(d=>DUMPLING_FILL==="전체"||d.fill.includes(DUMPLING_FILL));
 const slot=(id,label)=>{
  const m=S.kit[id],d=m&&DISHES.find(x=>x.id===m.id);
  return d?`<div class="spread" style="padding:7px 0"><div><span class="tag g">${label}</span> <b>${d.n}</b><div class="tiny muted">${d.buf.map(([k,v])=>OPTNAME(k)+" +"+Math.round(v*100)+"%").join(' · ')}</div></div><span class="tiny muted">${hhmm(m.left)}</span></div>`:`<div class="tiny muted">${label} 칸이 비어 있습니다.</div>`;
 };
 const items=visible.map(d=>{
  const can=Object.entries(d.mat).every(([n,c])=>inventory11(n)>=c);
  const rare=Object.keys(d.mat).map(n=>CROPS.find(x=>x.n===n)?.tier||FISHES.find(x=>x.n===n)?.tier||"normal");
  const rank=rare.includes('legend')?'전설':rare.includes('epic')?'에픽':rare.includes('rare')?'레어':'노멀';
  return `<div class="sub"><div class="spread"><b>${d.e} ${esc(d.n)}</b><span class="tag">${rank}</span></div>
   <div class="tiny muted" style="margin-top:5px">${d.t==='식사'?'든든한 만두':'달콤한 만두'} · ${d.fill.join(' · ')}</div>
   <div class="tiny" style="margin:6px 0;color:var(--jade)">${d.buf.map(([k,v])=>OPTNAME(k)+" +"+Math.round(v*100)+"%").join(' · ')} · ${hhmm(d.dur)}</div>
   <div class="tiny muted">${esc(d.d)}</div>
   <div class="row" style="gap:5px;flex-wrap:wrap;margin-top:8px">${Object.entries(d.mat).map(([n,c])=>`<span class="buffchip" style="${inventory11(n)>=c?'':'color:var(--red)'}">${esc(n)} ${inventory11(n)}/${c}</span>`).join('')}</div>
   <div class="row" style="margin-top:9px"><button class="btn sm ${can?'pri':''}" ${can?'':'disabled'} onclick="cook('${d.id}')">만두 1개 빚기</button><button class="btn sm" ${(S.kit.have[d.id]||0)>0?'':'disabled'} onclick="eat('${d.id}')">${mealEatLabel(d.id)} (${S.kit.have[d.id]||0})</button></div></div>`;
 }).join('');
 const stock=(["뿌리","약초","꽃","열매","어물"]).map(cat=>{
  const rows=Object.entries(S.ingredients).filter(([name,num])=>num>0&&((CROPS.find(x=>x.n===name)?.y||FISHES.find(x=>x.n===name)?.y)===cat));
  return `<div class="sub"><b>${cat}</b><div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px">${rows.length?rows.map(([n,v])=>`<span class="buffchip">${esc(n)} ×${nf(v)}</span>`).join(''):'<span class="tiny muted">보유 재료 없음</span>'}</div></div>`;
 }).join('');
 return head('삼장 선생님의 만두 주방',ic('dumpling')+' 만두 식당',`만두 ${Object.values(S.kit.have||{}).reduce((a,b)=>a+(Number(b)||0),0)}개 · 도감 ${S.dex?.dish?.length||0}/${DISHES.length}`)+`
 <div class="card pad" style="margin-bottom:12px"><div class="sect-t">개별 속재료로 빚는 만두</div>
 <div class="tiny muted">레어·에픽·전설 작물이나 드문 어종을 요구하는 만두일수록 효과가 강해집니다. 재료는 실제 품종별로 소모합니다.</div>
 <div class="row" style="gap:5px;margin-top:10px;flex-wrap:wrap">${fills.map(f=>`<button class="btn sm ${DUMPLING_FILL===f?'pri':''}" onclick="DUMPLING_FILL='${f}';renderMain()">${f==='전체'?'전체':f}</button>`).join('')}</div></div>
 <div class="grid g2" style="margin-bottom:12px"><div class="card pad"><div class="sect-t">지금 먹은 만두</div>${slot('eat','만두 1')}${slot('dess','만두 2')}<div class="tiny muted" style="margin-top:8px">${mealRuleText()}</div></div>
 <div class="card pad"><div class="sect-t">삼장 선생님의 만두 수업</div><div class="quote">“만두를 빚는 일도 마음을 가다듬는 수행입니다. 서두르지 마시고, 속이 새지 않도록 차근차근 빚어 보십시오.”</div></div></div>
 <div class="card pad"><div class="spread"><div class="sect-t">레시피 · ${visible.length}종</div><span class="tiny muted">총 ${DISHES.length}종</span></div>
 <div class="grid g2">${items}</div></div>
 <div class="card pad" style="margin-top:12px"><div class="sect-t">개별 속재료 보관함</div><div class="grid g3">${stock}</div></div>`;
};
const _bagView11=VIEWS.bag;
VIEWS.bag=function(){
 ensureFarmItems11();let html=_bagView11();
 const totalFert=FERTILIZERS11.reduce((sum,f)=>sum+(S.farm.fertilizers[f.id]||0),0);
 html=html.replace(/<span>비료<\/span><b>\d+<\/b>/,`<span>비료 합계</span><b>${totalFert}</b>`);
 const groups=[...FARM_CATEGORIES,'어물'].map(cat=>{
  const rows=Object.entries(S.ingredients).filter(([n,v])=>v>0&&(CROPS.find(c=>c.n===n)?.y||FISHES.find(f=>f.n===n)?.y)===cat);
  return `<div class="sub"><b>${cat}</b><div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">${rows.length?rows.map(([n,v])=>`<span class="buffchip">${esc(n)} ×${nf(v)}</span>`).join(''):'<span class="tiny muted">비어 있습니다</span>'}</div></div>`;
 }).join('');
 const fert=FERTILIZERS11.map(f=>`<span class="buffchip">${f.name} ${S.farm.fertilizers[f.id]||0}</span>`).join('');
 return html+`<div class="card pad" style="margin-top:12px"><div class="sect-t">씨앗 · 개별 재료 · 비료</div>
 <div class="tiny muted" style="margin-bottom:8px">뿌리·약초·꽃·열매는 기존 제작에 필요한 계통 재료로도 기록됩니다. 아래 개별 재료는 만두에서 정확히 해당 이름으로 소모됩니다.</div>
 <div class="grid g3">${groups}</div><div class="farm-discovery" style="margin-top:12px">${fert}</div></div>`;
};
const _farmView11=VIEWS.farm;
VIEWS.farm=function(){
 ensureFarmItems11();
 let html=_farmView11();
 const totalFert=FERTILIZERS11.reduce((sum,f)=>sum+(S.farm.fertilizers[f.id]||0),0);
 html=html.replace(/비료 \d+개/,`비료 ${totalFert}개`);
 // Keep planting centered, but direct the existing fertilizer buttons into the selection screen.
 html=html.replace(/onclick="fertilize\((\d+)\)"/g,(_,i)=>`onclick="farmFertiliserChoose11(${i})"`);
 html=html.replace(/비료 \$\{f.fert\}개/g,'비료 보관함');
 const inventory=FARM_CATEGORIES.map(cat=>`<div class="sub"><b>${cat}</b><div class="farm-discovery" style="margin-top:7px">${CROPS.filter(c=>c.y===cat&&inventory11(c.n)>0).map(c=>`<span class="buffchip">${esc(c.n)} ×${inventory11(c.n)}</span>`).join('')||'<span class="tiny muted">보유 작물 없음</span>'}</div></div>`).join('');
 const section=`${seedShop11()}${fertiliserShop11()}<div class="card pad" style="margin-bottom:12px"><div class="sect-t">수확한 작물 · 개별 보관함</div><div class="grid g2">${inventory}</div></div>`;
 const insert=html.indexOf('<div class="card pad" style="margin-top:12px"><div class="spread"><div class="sect-t">재배');
 return insert>=0?html.slice(0,insert)+section+html.slice(insert):html+section;
};

/* 브라우저 알림 기능은 아래 Web Push 모듈로 교체합니다. */
const _boot11=boot;
boot=function(){_boot11();ensureFarmItems11();};


;
/* ===== module: part12.js ===== */
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
setInterval(()=>{if(pollAwake()&&S?.made&&PUSH12_ENABLED)push12PullHistory().catch(()=>{});},60000);


;
/* ===== module: market.js ===== */
"use strict";
/* 無明長夜 · 러너 중개소 / 계정 저장본 기반 서버 거래
 * 서버 RPC가 판매 등록·차감·구매·정산을 한 트랜잭션에서 처리합니다.
 * localStorage는 화면 캐시이며, 거래의 최종 기록은 Supabase입니다. */
const MARKET_TYPES={gear:"법구",potion:"물약",dish:"만두",consumable:"소모품",material:"재료",ingredient:"조제 재료"};
const MKT={listings:[],mine:[],pending:0,loaded:false,loading:false,busy:false,at:0,filter:"전체",tab:"buy",error:""};
function marketConnected(){return typeof acctIn==="function"&&acctIn()&&typeof acctOn==="function"&&acctOn()&&typeof sbOn==="function"&&sbOn();}
function marketPaired(){return !!(S?.pairShared||S?.pair?.mine?.status==='accepted');}
async function marketRpc(action,data){
 if(!marketConnected())throw new Error('중개소는 로그인과 Supabase 연결이 필요합니다.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const read=action==='snapshot';
  return await acctFetch(read?'rpc/market_read':'rpc/market_trade',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},
   body:JSON.stringify(read?{p_actor:ACCT.id,p_token:ACCT.tok}:{p_actor:ACCT.id,p_token:ACCT.tok,p_action:action,p_data:data||{}})});
 }catch(e){
  if(action==='snapshot'&&String(e.message).includes('PGRST202'))throw new Error('중개소 읽기 전용 서버 패치를 적용해 주세요. supabase/pair-sync-performance.sql을 다시 실행하면 됩니다.');
  if(e.name==='AbortError')throw new Error('중개소 서버 응답이 지연되고 있습니다. 잠시 후 다시 확인해 주세요.');
  throw e;
 }finally{clearTimeout(timer);}
}
function marketApplyInventory(inv){
  if(!inv||!S)return;
  if(Array.isArray(inv.bag))S.bag=inv.bag;
  if(Number.isFinite(Number(inv.rin)))S.rin=Number(inv.rin);
  if(Number.isFinite(Number(inv.gid)))S.gid=Number(inv.gid);
  if(inv.potion&&typeof inv.potion==="object")S.potion=inv.potion;
  if(inv.inv&&typeof inv.inv==="object")S.inv=inv.inv;
  if(inv.mat&&typeof inv.mat==="object")S.mat=inv.mat;
  if(inv.ing&&typeof inv.ing==="object")S.ing=inv.ing;
  if(inv.kit&&typeof inv.kit==="object")S.kit=Object.assign({},S.kit||{}, {have:inv.kit.have||{}});
  if(Number.isFinite(Number(inv.marketRev)))S.marketRev=Number(inv.marketRev);
  S.marketInitialized=true;
  save();
}
function marketCatalog(){
  const result=[];
  (S.bag||[]).forEach(it=>{
    if(!it || it.bound || !SLOTS.some(s=>s.k===it.slot))return;
    const sl=SLOTS.find(s=>s.k===it.slot);
    result.push({kind:"gear",key:String(it.id),name:String(it.name||"법구"),qty:1,
      info:`${sl.n} · Lv ${it.lv} · ${GRADES[it.grade]?.n||"일반"} · 전투력 ${nf(gearScore(it))}`,suggest:Math.max(100,Math.round(gearScore(it)*1.35+it.lv*120))});
  });
  (typeof POTIONS!=="undefined"?POTIONS:[]).forEach(p=>{
    const q=Number(S.potion?.[p.id]||0);
    if(q>0)result.push({kind:"potion",key:p.id,name:p.n,qty:q,info:p.d,suggest:Math.max(100,Math.round(p.mana*1.4+600))});
  });
  (typeof DISHES!=="undefined"?DISHES:[]).forEach(d=>{
    const q=Number(S.kit?.have?.[d.id]||0);
    if(q>0)result.push({kind:"dish",key:d.id,name:d.n,qty:q,info:d.d,suggest:Math.max(100,1800)});
  });
  (typeof SHOP!=="undefined"?SHOP:[]).forEach(p=>{
    const q=Number(S.inv?.[p.id]||0);
    if(q>0)result.push({kind:"consumable",key:p.id,name:p.n,qty:q,info:p.d||"상점 소모품",suggest:Math.max(100,Math.round(Number(p.c||1000)*.8))});
  });
  for(const [key,qty] of Object.entries(S.mat||{}))if(Number(qty)>0){
    result.push({kind:"material",key,name:key,qty:Number(qty),info:"채집·각인·조리에 사용하는 재료",suggest:Math.max(100,key==="혼백"?5000:500)});
  }
  (typeof ING!=="undefined"?ING:[]).forEach(p=>{
    const q=Number(S.ing?.[p.k]||0);
    if(q>0)result.push({kind:"ingredient",key:p.k,name:p.n,qty:q,info:p.w,suggest:Math.max(100,p.k==="심연정"?4500:600)});
  });
  return result;
}
function marketLocalItem(kind,key){return marketCatalog().find(i=>i.kind===kind&&i.key===String(key));}
async function marketFetch(force=false){
  if(!marketConnected()){MKT.loaded=false;MKT.error="";return;}
  if(MKT.loading||(!force&&Date.now()-MKT.at<12000))return;
  MKT.loading=true;
  try{
    const result=await marketRpc("snapshot");
    const prev=MKT.mine||[];
    MKT.listings=Array.isArray(result.listings)?result.listings:[];
    MKT.mine=Array.isArray(result.mine)?result.mine:[];
    MKT.pending=Number(result.pending||0);
    // 서버에서 거래된 뒤 다른 기기/이전 저장본이 보이면 거래 관련 잔액과 물품만 동기화합니다.
    if(!marketPaired()){
      if(Number(result.rev||0)>Number(S.marketRev||0))marketApplyInventory(result.inventory);
      else if(!S.marketInitialized){S.marketRev=Number(result.rev||0);S.marketInitialized=true;save();}
    }
    const key="mmjy_market_seen_"+ACCT.id;
    let seen=[];try{seen=JSON.parse(localStorage.getItem(key)||"[]");}catch(e){}
    const seenSet=new Set(seen.map(String));
    for(const m of MKT.mine){
      if(m.status!=="sold" || seenSet.has(String(m.id)))continue;
      // 초기 연동 시에도 구매된 매물 정보를 알림함에 남깁니다.
      if(typeof alertPush==="function")alertPush("trade",`[중개소] 「${m.item_name}」 판매 완료 · 판매 대금 정산 대기`,"market");
      seenSet.add(String(m.id));
    }
    try{localStorage.setItem(key,JSON.stringify([...seenSet].slice(-250)));}catch(e){}
    MKT.loaded=true;MKT.error="";MKT.at=Date.now();
    if(!marketPaired())save();
    if(VIEW==="market")renderMain(true);
    renderTop();
  }catch(e){MKT.error=String(e?.message||e).slice(0,220);MKT.at=Date.now();if(VIEW==="market")renderMain(true);}
  finally{MKT.loading=false;}
}
function marketListForm(kind,key){
  if(!marketConnected()){toast("계정에 로그인하고 공유 기록을 연결해 주세요.","bad");return;}
  const it=marketLocalItem(kind,String(key));
  if(!it){toast("이미 사용하거나 판매한 아이템입니다. 바랑을 확인해 주세요.","bad");return;}
  const unit=kind==="gear"?"법구 1개":"원하는 수량";
  modal("제5구역 중개소 · 매물 등록",`
    <div class="market-item-head"><span class="tag j">${MARKET_TYPES[kind]}</span><b>${esc(it.name)}</b></div>
    <div class="tiny muted" style="margin:7px 0 13px">${esc(it.info||"")} · 보유 ${nf(it.qty)}개</div>
    <label class="f">판매 수량 (${unit})</label>
    <input class="inp" type="number" id="mk_qty" min="1" max="${Math.min(it.qty,999)}" value="1" ${kind==="gear"?"disabled":""}>
    <label class="f">판매 총액 (륜)</label>
    <input class="inp" type="number" id="mk_price" min="1" max="1000000000" value="${Math.min(1000000000,Math.max(100,it.suggest||500))}">
    <div class="tiny muted" style="margin-top:9px">판매 등록 즉시 소지품에서 빠집니다. 다른 러너가 구매해야 판매가 완료되며, 완료 후 대금을 정산할 수 있습니다. 판매 전에는 취소할 수 있어요.</div>
    <div class="row" style="margin-top:15px"><button class="btn pri" onclick="marketSubmit('${kind}','${esc(String(key))}')">판매 등록</button><button class="btn" onclick="closeModal()">취소</button></div>`);
}
async function marketCommit(action,data,success){
  if(MKT.busy)return;
  MKT.busy=true;
  try{
    // 다른 기능의 로컬 저장 기록을 서버에 먼저 전송한 뒤 트랜잭션을 수행합니다.
    if(!marketPaired()&&typeof acctPush==="function"){
      const ok=await acctPush(true);
      if(ok===false)throw new Error("서버에 내 최신 저장 기록을 올리지 못했습니다. 중개소에서 새로 고침한 뒤 다시 시도해 주세요.");
    }
    const r=await marketRpc(action,data);
    if(!marketPaired())marketApplyInventory(r.save);
    if(action==="list")closeModal();
    toast((success||"거래가 완료되었습니다.")+(r.refreshPending?" · 잔액·물품 갱신 대기":""),"good");
    MKT.at=0;
    await marketFetch(true);
    renderTop();renderNav();renderMain();
    return r;
  }catch(e){
    const message=String(e?.message||e).replace(/.*?"message"\s*:\s*"([^"]+)".*/,"$1");
    toast("중개소 거래 실패 · "+esc(message).slice(0,170),"bad");
    MKT.at=0;marketFetch(true);
  }finally{MKT.busy=false;}
}
function marketSubmit(kind,key){
  const it=marketLocalItem(kind,String(key));if(!it)return;
  const qty=Number(document.getElementById("mk_qty")?.value||1),price=Number(document.getElementById("mk_price")?.value);
  if(!Number.isSafeInteger(qty)||qty<1||qty>Math.min(999,it.qty)||!Number.isSafeInteger(price)||price<1||price>1000000000){toast("수량과 가격을 확인해 주세요.","bad");return;}
  marketCommit("list",{kind,key:String(key),quantity:qty,price,name:it.name},"아이템을 중개소에 등록했습니다.");
}
function marketBuy(id){
  const item=MKT.listings.find(m=>Number(m.id)===Number(id));
  if(!item)return toast("이미 팔린 매물일 수 있어요. 목록을 새로 불러오세요.","bad");
  if(String(item.seller_id)===String(ACCT.id))return toast("내가 올린 매물은 살 수 없습니다.","bad");
  if(Number(S.rin)<Number(item.price))return toast("륜이 부족합니다.","bad");
  if(item.kind==="gear" && S.bag.length>=bagCapacity())return toast("바랑이 가득 찼습니다.","bad");
  if(!confirm(`「${item.item_name}」 ×${item.quantity} · ${nf(item.price)}륜에 구매할까요?`))return;
  marketCommit("buy",{id:Number(id)},"아이템을 구매했습니다. 바랑에서 확인하세요.");
}
function marketCancel(id){
  if(!confirm("등록한 매물을 취소하고 소지품으로 돌려받을까요?"))return;
  marketCommit("cancel",{id:Number(id)},"매물 등록을 취소하고 아이템을 돌려받았습니다.");
}
function marketWithdraw(){if(MKT.pending<=0)return;marketCommit("withdraw",{},"판매 대금을 륜으로 정산받았습니다.");}
function marketFilter(kind){MKT.filter=kind;renderMain();}
function marketTab(tab){MKT.tab=tab;renderMain();}
function marketViewItem(m,isMine=false){
  const kind=m.kind||"gear",gear=kind==="gear"?m.item_data:null;
  const grade=gear?GRADES[Number(gear.grade||0)]:null;
  const slot=gear?SLOTS.find(s=>s.k===gear.slot):null;
  const own=String(m.seller_id)===String(ACCT.id);
  const options=gear&&gear.main?`<div class="tiny" style="color:var(--jade)">${esc(gearLine(gear))}</div>`:"";
  const canBuy=Number(S.rin)>=Number(m.price) && (kind!=="gear"||S.bag.length<bagCapacity());
  return `<article class="market-offer ${own?"market-mine":""}">
   <div class="spread" style="gap:8px;align-items:flex-start"><div class="row" style="align-items:center;gap:5px;flex-wrap:wrap">
     <span class="tag">${MARKET_TYPES[kind]||"아이템"}</span>${gear?gradeTag(gear.grade):""}${own?'<span class="tag j">내 매물</span>':""}
     ${m.status&&m.status!=="active"?`<span class="tag ${m.status==="sold"?"j":""}">${m.status==="sold"?"판매 완료":"취소됨"}</span>`:""}
    </div><b style="color:var(--gold);white-space:nowrap">${nf(m.price)}륜</b></div>
   <b class="market-name" style="color:${grade?grade.c:"var(--tx)"}">${esc(m.item_name||"이름 없는 물건")}</b>
   <div class="tiny muted">${esc(m.seller_name||m.seller_id||"러너")} · ${nf(m.quantity||1)}개${gear?` · ${esc(slot?.n||"")} Lv ${Number(gear.lv)||1}${gear.enh?` · 각인 +${Number(gear.enh)}`:""}`:""}</div>
   ${options}
   <div class="spread market-actions"><span class="tiny muted">${esc(String(m.created_at||"").slice(0,10))}</span>
     ${m.status&&m.status!=="active"?"":own?`<button class="btn sm" onclick="marketCancel(${Number(m.id)})">등록 취소</button>`:
     `<button class="btn sm ${canBuy?"pri":""}" ${canBuy?"":"disabled"} onclick="marketBuy(${Number(m.id)})">${canBuy?"구매하기":"구매 불가"}</button>`}
   </div></article>`;
}
VIEWS.market=()=>{
  if(!marketConnected())return head("제5구역 중개소",ic("tag")+" 러너 중개소","러너 간 거래")+
   `<div class="card pad"><div class="sect-t">로그인 및 공유 기록 연결이 필요합니다</div><div class="tiny muted">이 중개소에서는 실제 러너가 올린 아이템만 거래합니다. 계정 로그인과 Supabase 중개소 SQL 설치가 필요합니다.</div></div>`;
  if(!MKT.loaded && !MKT.loading && !MKT.error)Promise.resolve().then(()=>marketFetch(true));
  let list=MKT.tab==="mine"?MKT.mine:MKT.listings;
  if(MKT.filter!=="전체")list=list.filter(i=>(MARKET_TYPES[i.kind]||"")===MKT.filter);
  const items=marketCatalog();
  return head("제5구역 · 러너가 올린 매물",ic("tag")+" 중개소",`보유 륜 <b style="color:var(--gold)">${nf(S.rin)}</b>`)+`
    <section class="card pad market-intro">
      <div class="sect-t" style="margin:0">러너 간 직거래 · 등록한 물건만 진열됩니다</div>
      <div class="tiny muted">법구 · 물약 · 만두 · 소모품 · 재료를 등록해 다른 러너에게 판매하세요. 무작위 NPC 매물이나 즉시 판매는 없습니다. 등록 즉시 소지품에서 보관되며, 거래가 끝나면 판매 대금을 받아요.</div>
      <div class="spread market-finance"><span>판매 정산 대기 <b style="color:var(--gold)">${nf(MKT.pending)}륜</b></span>
       <button class="btn sm pri" ${MKT.pending>0&&!MKT.busy?"":"disabled"} onclick="marketWithdraw()">정산 받기</button></div>
    </section>
    <section class="card pad" style="margin:12px 0">
      <div class="spread" style="align-items:center;flex-wrap:wrap;gap:8px"><b>내 물건 내놓기</b><button class="btn sm" onclick="marketFetch(true)">매물 새로 고침</button></div>
      <div class="market-catalog">${items.length?items.map(it=>`<div class="market-catalog-row">
        <div style="min-width:0"><b>${esc(it.name)}</b><div class="tiny muted">${MARKET_TYPES[it.kind]} · 보유 ${nf(it.qty)} · ${esc(it.info||"")}</div></div>
        <button class="btn sm" onclick="marketListForm('${it.kind}','${esc(it.key)}')">내놓기</button>
        </div>`).join(""):'<div class="tiny muted" style="padding:12px">내놓을 수 있는 아이템이 없습니다.</div>'}</div>
    </section>
    <section class="card pad"><div class="spread market-toolbar">
      <span class="seg"><button class="${MKT.tab==="buy"?"on":""}" onclick="marketTab('buy')">전체 매물</button><button class="${MKT.tab==="mine"?"on":""}" onclick="marketTab('mine')">내 판매 기록</button></span>
      <span class="tiny muted">${list.length}건</span></div>
      <div class="market-filters">${["전체",...Object.values(MARKET_TYPES)].map(t=>`<button class="btn sm ${MKT.filter===t?"pri":""}" onclick="marketFilter('${t}')">${t}</button>`).join("")}</div>
      ${MKT.error?`<div class="sub tiny" style="color:var(--red)">목록 조회 오류: ${esc(MKT.error)}</div>`:""}
      ${MKT.loading&&!MKT.loaded?'<p class="tiny muted">거래 기록 불러오는 중…</p>':""}
      <div class="market-offers">${list.length?list.map(m=>marketViewItem(m,true)).join(""):'<div class="tiny muted market-empty">아직 등록된 매물이 없습니다. 첫 번째 매물을 내놓아 보세요.</div>'}</div>
    </section>`;
};
/* 기존 '즉시 판매' 버튼을 실제 중개소 등록창으로 전환합니다. */
listMine=function(id){marketListForm("gear",String(id));};
sellPotion=function(id){marketListForm("potion",String(id));};
rollMarket=function(){ if(S?.market){S.market.list=[];S.market.next=1e9;} };
// 이전 버전에서 저장된 NPC 중개소 목록은 앱 초기화 때 한 번 정리합니다.
if(typeof ensureV2==='function'){
  const _ensureRunnerMarket=ensureV2;
  ensureV2=function(){_ensureRunnerMarket();rollMarket();};
}
buyMarket=function(){toast("임의 NPC 매물은 폐지되었습니다. 러너가 올린 물건을 구매해 주세요.","bad");};
/* 중개소 바깥에서도 판매 완료와 정산 소식이 알림함에 도착합니다. */
setInterval(()=>{if(pollAwake()&&S?.made&&marketConnected()&&!MKT.busy)marketFetch(false);},45000);


;
/* ===== module: pvp.js ===== */
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
    t='운영 서버의 PvP 기능 설치 상태를 확인해 주세요.';
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
setInterval(()=>{if(pollAwake()&&typeof VIEW!=='undefined'&&VIEW==='duel'&&pvpAvailable())pvpSync(false);},3000);


;
/* ===== module: part13.js ===== */
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


;
/* ===== module: part14.js ===== */
"use strict";
/* ═══════════════════════════════════════════════════════════════════
   無明長夜 · HTML 로그 보존 기능
   RP 게시판 / 둘의 기록 / 페어 채팅
   · 서버의 전체 페이지를 조회하여 파일 생성 (화면의 10/120개 제한과 무관)
   · 오프라인으로 열리는 독립 HTML, 소설형 / 타임라인, 테마 / 화자 필터
   · 코코포리아 로그 편집기 v1.0.0의 [탭][화자][대사] 3-span 구조 호환
   · 페어 로그는 현재 계정과 수락된 페어의 기록만 읽음
   ═══════════════════════════════════════════════════════════════════ */

const LOG14_PAGE_SIZE=300;
let LOG14_BUSY=false;
const log14Esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function log14SafeFilename(value){
  return String(value||"無明長夜-기록").replace(/[\\/:*?"<>|\x00-\x1f]/g,"_").replace(/\s+/g," ").slice(0,90).trim()||"無明長夜-기록";
}
function log14SafeImage(value){
  const s=String(value||"").trim();
  return /^(?:https:\/\/[^\s<>"']+|data:image\/(?:png|jpe?g|gif|webp);base64,[a-z\d+/=]+)$/i.test(s)?s:"";
}
function log14Color(value,seed){
  const s=String(value||"").trim();
  if(/^#[0-9a-f]{6}$/i.test(s))return s;
  const options=["#6BA2E7","#AF83D7","#E08DAB","#55A5A1","#C39C57","#7D9DAE","#9F85DC"];
  let n=0;for(const ch of String(seed||""))n=(n*31+ch.charCodeAt(0))>>>0;
  return options[n%options.length];
}
function log14Markup(raw,sourceIsSafeHTML=false){
  const text=String(raw??"");
  if(!sourceIsSafeHTML){
    return log14Esc(text).replace(/\*\*\*([^*\n]+)\*\*\*/g,"<strong><em>$1</em></strong>")
      .replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g,"<em>$1</em>");
  }
  /* 페어 채팅은 fmtChat()으로 이미 <em> 표시된 본문을 보냅니다.
     HTML을 그대로 복사하지 않고 허용된 서식만 재구성합니다. */
  const doc=new DOMParser().parseFromString(`<div>${text}</div>`,"text/html");
  const allow={EM:"em",I:"em",STRONG:"strong",B:"strong",U:"u",DEL:"del",S:"del",CODE:"code"};
  const write=node=>{
    if(node.nodeType===Node.TEXT_NODE)return log14Esc(node.textContent||"");
    if(node.nodeType!==Node.ELEMENT_NODE)return "";
    if(node.tagName==="BR")return "<br>";
    const inner=Array.from(node.childNodes).map(write).join("");
    const tag=allow[node.tagName];
    return tag?`<${tag}>${inner}</${tag}>`:inner;
  };
  return Array.from(doc.body.firstElementChild?.childNodes||[]).map(write).join("");
}
function log14Avatar(row){
  const p=row||{};return log14SafeImage(p.av_img||p.avImg||p.avatar_url||"");
}
function log14Student(id){
  const sid=String(id??"");
  if(S?.sb && String(S.sb.id)===sid) return {...(socialStudent?.(sid)||{}),...pairMe()};
  const social=(typeof socialStudent==="function"?socialStudent(sid):null);
  const roster=(S?.sb?.roster||[]).find(x=>String(x.id)===sid);
  const partner=(typeof pairPeer==="function"?pairPeer():null);
  return social||roster||(partner&&String(partner.id)===sid?partner:null)||{};
}
function log14Who(id,backup){
  const row=log14Student(id);
  const name=row.name||backup||"이름 없는 학생";
  return {name:String(name),img:log14Avatar(row),color:log14Color(row.color,name)};
}
function log14When(raw){
  if(!raw)return "시각 미상";
  const date=new Date(raw);
  if(!Number.isFinite(date.getTime()))return "시각 미상";
  return date.toLocaleString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});
}
function log14Download(filename,html){
  const blob=new Blob(["\ufeff",html],{type:"text/html;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=log14SafeFilename(filename)+".html";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function log14ReadPages(base,direction="desc"){
  if(!sbOn())throw new Error("Supabase 공유 기록에 연결하지 못했습니다.");
  let cursor="",pages=0;
  const rows=[],seen=new Set();
  while(true){
    const filter=cursor?`&id=${direction==="asc"?"gt":"lt"}.${encodeURIComponent(cursor)}`:"";
    const page=await sbGet(`${base}${filter}&order=id.${direction}&limit=${LOG14_PAGE_SIZE}`);
    if(!Array.isArray(page))throw new Error("서버가 목록을 반환하지 않았습니다.");
    for(const row of page){
      if(row?.id==null)continue;
      const id=String(row.id);
      if(!seen.has(id)){seen.add(id);rows.push(row);}
    }
    if(page.length<LOG14_PAGE_SIZE)break;
    const next=String(page[page.length-1].id);
    if(next===cursor)throw new Error("페이지 조회가 중단되었습니다. 일부 기록만 내보내지 않도록 저장을 취소합니다.");
    cursor=next;
    if(++pages>1000)throw new Error("내보낼 기록이 너무 많아 조회를 중단했습니다. 운영진에게 문의해 주세요.");
  }
  return rows;
}
function log14ThreadOrder(rows,onlyRoot=null){
  const map=new Map(rows.map(r=>[String(r.id),r]));
  const children=new Map(),roots=[];
  for(const row of rows){
    const parent=row.parent_id==null?"":String(row.parent_id);
    if(parent&&parent!==String(row.id)&&map.has(parent)){
      if(!children.has(parent))children.set(parent,[]);
      children.get(parent).push(row);
    }else roots.push(row);
  }
  for(const arr of children.values())arr.sort((a,b)=>Number(a.id)-Number(b.id));
  roots.sort((a,b)=>Number(a.id)-Number(b.id));
  const result=[],visited=new Set();
  function walk(start){
    const stack=[{row:start,depth:0,rootId:String(start.id)}];
    while(stack.length){
      const {row,depth,rootId}=stack.pop();
      if(visited.has(String(row.id)))continue;
      visited.add(String(row.id));
      result.push({row,depth,rootId,parent:map.get(String(row.parent_id))||null});
      const subs=children.get(String(row.id))||[];
      for(let i=subs.length-1;i>=0;i--)stack.push({row:subs[i],depth:depth+1,rootId});
    }
  }
  if(onlyRoot!=null){
    const row=map.get(String(onlyRoot));
    if(!row)throw new Error("선택한 타래를 서버에서 찾지 못했습니다.");
    walk(row);
  }else{
    roots.forEach(walk);
    rows.forEach(row=>{if(!visited.has(String(row.id)))walk(row);});
  }
  return result;
}
function log14ExportRecord(item,kind,mode=""){
  const p=item.row;
  const sourceIsChat=kind==="chat";
  const author=sourceIsChat?log14Who(p.from_id,p.who):log14Who(p.author_id,p.author_name);
  const parent=item.parent;
  const tag=kind==="rp"?"RP 게시판":kind==="pair"?"둘의 기록":(p.mode==="오너"||p.mode==="사담"?"페어 채팅 · 오너":"페어 채팅 · RP");
  const id=String(p.id);
  return {id,rootId:String(item.rootId??p.id),parentId:parent?String(parent.id):"",name:author.name,
    avatar:author.img,color:author.color,tab:tag,when:log14When(p.created_at||p.ts),
    parentName:parent?(kind==="pair"?String(parent.author_name||log14Who(parent.author_id).name):String(log14Who(parent.author_id,parent.author_name).name)):"",
    depth:Math.max(0,Number(item.depth||0)),body:log14Markup(p.body,sourceIsChat),mode};
}
const LOG14_EDITOR_EXPORT_CSS=`:root{--avatar:76px;--font:15px;--lh:1.75}
      *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Pretendard, "Noto Sans KR", system-ui, sans-serif;background:var(--bg);color:var(--text);transition:background .22s ease,color .22s ease}body[data-theme="dark"]{--bg:#263552;--panel:#344462;--text:#F7FAFF;--muted:#C4CEE0;--accent:#9CCFFF;color-scheme:dark}body[data-theme="light"]{--bg:#F7F9FF;--panel:#FFFFFF;--text:#2A405E;--muted:#7B8FA9;--accent:#6EAFE8;color-scheme:light}button,input{font:inherit}.log-header{position:fixed;inset:0 0 auto;z-index:30;height:58px;border-bottom:1px solid color-mix(in srgb,var(--text) 16%,transparent);background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(18px);box-shadow:0 8px 28px rgba(0,0,0,.05)}.header-inner{width:min(100%,1200px);height:100%;margin:auto;padding:0 18px;display:flex;align-items:center;gap:14px}.menu-toggle,.theme-toggle{border:1px solid color-mix(in srgb,var(--text) 17%,transparent);background:color-mix(in srgb,var(--panel) 72%,transparent);color:var(--text);cursor:pointer;transition:.18s}.menu-toggle{width:38px;height:34px;border-radius:8px;display:grid;place-items:center;padding:0}.menu-icon,.menu-icon::before,.menu-icon::after{display:block;width:19px;height:2px;border-radius:9px;background:currentColor;content:"";transition:.2s}.menu-icon{position:relative}.menu-icon::before{position:absolute;top:-6px}.menu-icon::after{position:absolute;top:6px}.drawer-open .menu-icon{background:transparent}.drawer-open .menu-icon::before{top:0;transform:rotate(45deg)}.drawer-open .menu-icon::after{top:0;transform:rotate(-45deg)}.title-block{min-width:0;display:flex;align-items:baseline;gap:11px}.title-block h1{margin:0;padding-left:12px;border-left:5px solid var(--accent);font-size:15px;line-height:1.05;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.count{color:var(--muted);font-size:11px;white-space:nowrap}.theme-toggle{margin-left:auto;border-radius:999px;padding:8px 11px;font-size:12px}.menu-toggle:hover,.theme-toggle:hover{border-color:color-mix(in srgb,var(--accent) 62%,transparent);transform:translateY(-1px)}.drawer-shade{position:fixed;inset:58px 0 0;z-index:24;background:rgba(0,0,0,.34);opacity:0;pointer-events:none;transition:.22s}.drawer{position:fixed;left:0;top:58px;bottom:0;z-index:25;width:min(320px,88vw);padding:24px 20px 40px;background:color-mix(in srgb,var(--bg) 82%,#000 18%);border-right:1px solid color-mix(in srgb,var(--text) 14%,transparent);box-shadow:20px 0 60px rgba(0,0,0,.2);overflow:auto;transform:translateX(-101%);transition:.24s ease;color:var(--text)}.drawer-open .drawer{transform:translateX(0)}.drawer-open .drawer-shade{opacity:1;pointer-events:auto}.drawer h2{margin:14px 0 9px;padding-left:10px;border-left:4px solid var(--accent);font-size:12px;letter-spacing:.08em}.drawer-note{margin:0 0 20px;color:var(--muted);font-size:11px;line-height:1.55}.filter-list{display:grid;gap:3px}.filter-item{display:grid;grid-template-columns:18px 10px 1fr;align-items:center;gap:8px;padding:7px 8px;border-radius:7px;color:color-mix(in srgb,var(--text) 88%,transparent);font-size:12px;cursor:pointer}.filter-item:hover{background:color-mix(in srgb,var(--text) 6%,transparent)}.filter-item input{width:14px;height:14px;accent-color:var(--accent)}.filter-item i{width:7px;height:7px;border-radius:50%;background:var(--dot)}.page{width:min(100%,1120px);margin:auto;padding:90px clamp(18px,5vw,64px) 100px}.log-list{border-top:1px solid color-mix(in srgb,var(--text) 13%,transparent)}.entry{display:grid;grid-template-columns:var(--avatar) minmax(0,1fr);gap:18px;margin:0;padding:15px 0;border-bottom:1px solid color-mix(in srgb,var(--text) 13%,transparent)}.entry[hidden],.system[hidden],.illustration[hidden]{display:none!important}.entry.no-avatar{display:block}.entry.no-avatar .avatar-col{display:none}.avatar-col{display:block;position:relative}.avatar-col::after{content:"";position:absolute;top:calc(var(--avatar) + 8px);bottom:-16px;left:50%;width:1px;background:linear-gradient(color-mix(in srgb,var(--text) 12%,transparent),transparent)}.entry:last-child .avatar-col::after{display:none}.avatar-col img,.avatar-empty{width:var(--avatar);height:var(--avatar);object-fit:cover;border-radius:16px;background:var(--panel);border:1px solid color-mix(in srgb,var(--text) 14%,transparent);box-shadow:none}.hide-image-frame .avatar-col img{background:transparent;border-color:transparent}.avatar-empty{display:grid;place-items:center;color:var(--muted);font-weight:900}.content{position:relative;padding:3px 0 5px;background:transparent;border:0}.meta{min-height:25px;display:flex;align-items:baseline;gap:9px;margin-bottom:8px;padding-bottom:7px;border-bottom:1px dotted color-mix(in srgb,var(--text) 20%,transparent)}.meta b{font-size:12px;letter-spacing:.055em}.meta span{margin-left:auto;padding:2px 8px 3px 10px;font-size:10px;color:var(--muted);border:0;border-left:1px solid color-mix(in srgb,var(--text) 15%,transparent);border-bottom:1px solid color-mix(in srgb,var(--text) 15%,transparent);border-radius:0 0 0 11px;background:color-mix(in srgb,var(--panel) 68%,transparent)}.content.tab-tinted{padding:13px 15px 14px;background:linear-gradient(135deg,var(--tab-bg),color-mix(in srgb,var(--tab-bg) 72%,transparent));border:1px solid var(--tab-border);border-radius:10px}.content.align-center .meta{justify-content:center}.content.align-center .meta span{margin-left:0}.content.align-center .message{text-align:center}.message{font-size:var(--font);line-height:var(--lh);letter-spacing:-.012em;word-break:break-word;text-wrap:pretty}.message-segment+.message-segment{margin-top:4px;padding-top:7px;border-top:1px solid color-mix(in srgb,var(--text) 6%,transparent)}.message-segment.dice-result{position:relative;margin:8px 0;padding:11px 13px 12px;overflow:hidden;border:1px solid color-mix(in srgb,var(--dice-color) 42%,transparent);border-left:4px solid var(--dice-color);border-radius:10px;background:linear-gradient(135deg,color-mix(in srgb,var(--dice-color) 14%,var(--panel)),color-mix(in srgb,var(--dice-color) 5%,transparent));box-shadow:0 8px 22px color-mix(in srgb,var(--dice-color) 7%,transparent)}.dice-badge{display:inline-flex;align-items:center;min-height:21px;margin:0 8px 5px 0;padding:2px 8px;border:1px solid color-mix(in srgb,var(--dice-color) 55%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dice-color) 19%,var(--panel));color:var(--dice-color);font-size:10px;font-weight:900;letter-spacing:.075em;vertical-align:middle}.dice-roll-text{display:block;color:color-mix(in srgb,var(--text) 92%,var(--dice-color) 8%)}.novel .message-segment.dice-result{margin:4px 0;padding:9px 11px 10px}.message img{max-width:100%;border-radius:12px}.message a{color:var(--accent);text-underline-offset:3px}.message strong{font-weight:850;color:color-mix(in srgb,var(--text) 94%,var(--accent) 6%)}.message em{font-style:italic}.message del{color:var(--muted);text-decoration-thickness:1px}.message code{padding:2px 6px;border:1px solid color-mix(in srgb,var(--text) 13%,transparent);border-radius:6px;background:color-mix(in srgb,var(--text) 6%,transparent);font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;font-size:.9em}.segment-content{display:block;min-width:0}.message-segment.format-bold>.segment-content,.message-segment.format-bold>.dice-roll-text{font-weight:800}.message-segment.format-italic>.segment-content,.message-segment.format-italic>.dice-roll-text{font-style:italic}.message-segment.format-bold.format-italic>.segment-content,.message-segment.format-bold.format-italic>.dice-roll-text{font-weight:800;font-style:italic}a{color:var(--accent)}.system{width:min(100%,920px);margin:18px auto;padding:12px 16px;color:var(--muted);line-height:1.65;border-left:4px solid color-mix(in srgb,var(--muted) 78%,transparent);border-top:1px solid color-mix(in srgb,var(--text) 9%,transparent);border-bottom:1px solid color-mix(in srgb,var(--text) 9%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--text) 4%,transparent),transparent)}.system.tab-tinted{background:var(--tab-bg);border-color:var(--tab-border)}.system.align-center{text-align:center;border-left:0}.novel .entry{display:block;padding:0}.novel .content{display:grid;grid-template-columns:minmax(120px,18%) minmax(0,1fr);padding:0;border-bottom:0}.novel .meta{grid-column:1;display:flex;flex-wrap:wrap;justify-content:flex-end;align-content:flex-start;gap:5px;margin:0;padding:9px 14px 9px 0;text-align:right;border-right:1px dotted color-mix(in srgb,var(--text) 28%,transparent);border-bottom:0}.novel .meta span{width:max-content;margin-left:auto;background:transparent}.novel .message{grid-column:2;padding:9px 0 9px 16px}.novel .content.tab-tinted{margin:4px 0;padding:0;border:1px solid var(--tab-border);border-radius:9px;overflow:hidden}.novel .content.align-center{display:block;padding:14px 18px;text-align:center}.novel .content.align-center .meta{justify-content:center;padding:0 0 7px;border:0;text-align:center}.novel .content.align-center .meta span{margin-left:0}.novel .content.align-center .message{padding:0}.novel .message-segment+.message-segment{margin-top:2px;padding-top:4px;border-top:0}.novel .message-segment.dice-result{margin:4px 0;padding:9px 11px 10px;border-top:1px solid color-mix(in srgb,var(--dice-color) 42%,transparent)}.illustration{width:min(100%,1080px);margin:24px auto 30px;padding:0 4px;display:flex}.illustration.align-left{justify-content:flex-start}.illustration.align-center{justify-content:center}.illustration.align-right{justify-content:flex-end}.illustration>div{min-width:40px;max-width:100%}.illustration img{display:block;width:100%;height:auto;border-radius:12px}.empty-filter{display:none;padding:80px 20px;text-align:center;color:var(--muted)}.empty-filter.show{display:block}.footer{padding:0 18px 28px;text-align:center;color:var(--muted);font-size:10px}@media(max-width:700px){.header-inner{padding:0 10px}.title-block h1{padding-left:9px;border-left-width:4px;font-size:13px}.count{display:none}.page{padding:78px 10px 70px}:root{--avatar:58px}.entry{gap:11px}.avatar-col::after{display:none}.meta{flex-wrap:wrap}.meta span{margin-left:0}.novel .content{grid-template-columns:minmax(92px,28%) minmax(0,1fr)}.novel .meta{padding-right:10px}.novel .message{padding-left:11px}.theme-toggle{padding:7px 9px}.drawer{top:58px}}

/* 사무전 고유 데이터 표기. 원본 편집기의 HTML 내보내기 CSS는 위에 그대로 보존합니다. */
.layout-toggle{border:1px solid color-mix(in srgb,var(--text) 17%,transparent);background:color-mix(in srgb,var(--panel) 72%,transparent);color:var(--text);cursor:pointer;transition:.18s;border-radius:999px;padding:8px 11px;font-size:12px;margin-left:auto}
.layout-toggle:hover{border-color:color-mix(in srgb,var(--accent) 62%,transparent);transform:translateY(-1px)}
.layout-toggle+.theme-toggle{margin-left:0}
.log-time{margin:0 0 8px;color:var(--muted);font-size:11px;letter-spacing:.015em}
.log-reply{display:block;margin:0 0 10px;padding:8px 11px;border-left:2px solid color-mix(in srgb,var(--accent) 55%,transparent);background:color-mix(in srgb,var(--accent) 6%,transparent);color:var(--muted);font-size:11px;line-height:1.55}
.log-reply a{color:var(--accent);text-underline-offset:3px}
.log-extra{font-size:10px;font-weight:500;letter-spacing:0;color:var(--muted);margin-left:8px}
.log-search{width:100%;margin:0 0 14px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--text) 20%,transparent);background:var(--panel);color:var(--text);border-radius:8px;font-size:12px}
.log-search:focus{outline:2px solid color-mix(in srgb,var(--accent) 45%,transparent);outline-offset:2px}
.log-search::placeholder{color:var(--muted)}
.ccfolia-import-row{display:none!important}
.entry:target .content{outline:2px solid var(--accent);outline-offset:4px;border-radius:5px}
.log-header button:focus-visible,.drawer input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(max-width:700px){.layout-toggle{font-size:11px;padding:7px 9px}.header-inner{gap:7px}.log-time{font-size:10px}.log-extra{display:none}}
@media print{.log-header,.drawer,.drawer-shade{display:none!important}.page{padding-top:16px}.entry{break-inside:avoid;page-break-inside:avoid}.log-reply a{text-decoration:none}body{color-adjust:exact;print-color-adjust:exact}}

/* 소설형 정렬: 편집기의 novel-mode처럼 아바타 숨김 + 화자/본문 2열 정렬 */
.meta{flex-wrap:wrap}.meta .log-time{flex:0 0 100%;margin:-3px 0 0;line-height:1.45}
.novel .avatar-col{display:none!important}
.novel .entry{display:block;padding:0;min-width:0}
.novel .content{display:grid;grid-template-columns:minmax(120px,18%) minmax(0,1fr);align-items:stretch;min-width:0}
.novel .meta{grid-column:1;grid-row:1;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;gap:4px;margin:0;padding:11px 14px 10px 0;text-align:right;border-right:1px dotted color-mix(in srgb,var(--text) 28%,transparent);border-bottom:0;min-width:0}
.novel .meta b{max-width:100%;overflow-wrap:anywhere}
.novel .meta span{max-width:100%;width:auto;margin:0;white-space:normal;overflow-wrap:anywhere}
.novel .meta .log-time{flex:initial;margin:4px 0 0;max-width:100%;font-size:10px;white-space:normal}
.novel .message{grid-column:2;grid-row:1;min-width:0;margin:0;padding:11px 0 12px 16px;overflow-wrap:anywhere}
@media(max-width:700px){.novel .content{grid-template-columns:minmax(88px,28%) minmax(0,1fr)}.novel .meta{padding:10px 10px 10px 0}.novel .message{padding:10px 0 11px 11px}.novel .meta .log-time{font-size:9px}}
`;
function log14Build(records,title,kind){
  const names=[...new Set(records.map(x=>x.name))];
  const tabs=[...new Set(records.map(x=>x.tab))];
  const safeTitle=log14Esc(title),count=records.length;
  const charMap=new Map(names.map((name,i)=>[name,`author-${i}`]));
  const tabMap=new Map(tabs.map((name,i)=>[name,`tab-${i}`]));
  const entries=records.map(rec=>{
    const label=log14Esc(rec.name),id=log14Esc(rec.id),tab=log14Esc(rec.tab);
    const speakerColor=log14Color(rec.color,rec.name);
    const portrait=rec.avatar
      ?`<img src="${log14Esc(rec.avatar)}" alt="${label}" loading="lazy" decoding="async">`
      :`<div class="avatar-empty" aria-hidden="true">${log14Esc(rec.name.slice(0,1)||"?")}</div>`;
    const reply=rec.parentId?`<div class="log-reply">↳ ${log14Esc(rec.parentName)} 님에게 답글 · <a href="#log-${log14Esc(rec.parentId)}">원글 보기</a></div>`:"";
    const replyImport=rec.parentId?`↳ ${log14Esc(rec.parentName)} 님에게 답글<br>`:"";
    const personId=charMap.get(rec.name),tabId=tabMap.get(rec.tab);
    /* The editor imports a p with three direct span children: tab, speaker, content.
       Keep this row invisible in the exported reader to avoid duplicate content. */
    const importer=`<p class="ccfolia-import-row" style="color:${speakerColor}"><span>[${tab}]</span><span>${label}</span><span>${replyImport}${rec.body}</span></p>`;
    return `<article class="entry" id="log-${id}" data-entry data-char="${log14Esc(personId)}" data-tab="${log14Esc(tabId)}" data-author="${label}">
      <div class="avatar-col">${portrait}</div>
      <div class="content"><div class="meta"><b class="speaker" style="color:${speakerColor}">${label}</b><span>${tab}</span><time class="log-time">${log14Esc(rec.when)}</time></div>
        <div class="message">${reply}<div class="message-segment"><span class="segment-content">${rec.body}</span></div></div>
      </div>${importer}</article>`;
  }).join("\n");
  const charMenu=names.map(n=>`<label class="filter-item"><input type="checkbox" data-filter-char="${log14Esc(charMap.get(n))}" checked><i style="--dot:${log14Color('',n)}"></i><span>${log14Esc(n)}</span></label>`).join('');
  const tabMenu=tabs.map(t=>`<label class="filter-item"><input type="checkbox" data-filter-tab="${log14Esc(tabMap.get(t))}" checked><i style="--dot:#6EAFE8"></i><span>${log14Esc(t)}</span></label>`).join('');
  const exportedAt=log14When(Date.now());
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} · 無明長夜</title>
  <style>${LOG14_EDITOR_EXPORT_CSS}</style></head>
  <body data-theme="light"><header class="log-header"><div class="header-inner">
    <button id="menuToggle" class="menu-toggle" type="button" aria-label="필터 메뉴 열기"><span class="menu-icon"></span></button>
    <div class="title-block"><h1>${safeTitle}</h1><span id="visibleCount" class="count">${count}개 항목</span></div>
    <button id="layoutToggle" class="layout-toggle" type="button">소설형</button>
    <button id="themeToggle" class="theme-toggle" type="button" aria-label="라이트·다크 모드 전환">☾ 다크</button>
  </div></header>
  <div id="drawerShade" class="drawer-shade"></div>
  <aside id="drawer" class="drawer" aria-label="로그 필터">
    <p class="drawer-note">無明長夜 · 사무전 로그<br>대화 ${count.toLocaleString('ko-KR')}개 · ${names.length}명<br>내보낸 시각: ${log14Esc(exportedAt)}<br>메뉴에서 화자와 탭을 골라 읽을 수 있습니다.</p>
    <input class="log-search" type="search" id="logSearch" placeholder="대사·화자 검색" aria-label="대사 검색">
    ${tabs.length?`<h2>탭</h2><div class="filter-list">${tabMenu}</div>`:""}
    <h2>화자</h2><div class="filter-list">${charMenu}</div>
  </aside>
  <main class="page"><section class="log-list">${entries}</section>
    <div id="emptyFilter" class="empty-filter">선택한 조건에 맞는 로그가 없습니다.</div>
  </main><footer class="footer">無明長夜 · 사무전 로그 / ${kind==='pair'||kind==='chat'?'페어끼리 나눈 사적인 대화가 포함되어 있습니다.':'RP 게시판의 공유 대화 기록입니다.'}<br>코코포리아 로그 편집기 v1.0.0의 ‘로그 불러오기’에서 읽을 수 있습니다.</footer>
  <script>
  (()=>{
    const body=document.body,themeBtn=document.getElementById('themeToggle'),layoutBtn=document.getElementById('layoutToggle');
    const menuBtn=document.getElementById('menuToggle'),shade=document.getElementById('drawerShade');
    const count=document.getElementById('visibleCount'),empty=document.getElementById('emptyFilter'),search=document.getElementById('logSearch');
    let saved='';try{saved=localStorage.getItem('samu-export-log-theme')||''}catch(_){}
    const applyTheme=mode=>{body.dataset.theme=mode;themeBtn.textContent=mode==='dark'?'☀ 라이트':'☾ 다크';
      themeBtn.setAttribute('aria-label',mode==='dark'?'라이트 모드로 전환':'다크 모드로 전환');
      try{localStorage.setItem('samu-export-log-theme',mode)}catch(_){}};
    applyTheme(['light','dark'].includes(saved)?saved:body.dataset.theme);
    themeBtn.addEventListener('click',()=>applyTheme(body.dataset.theme==='dark'?'light':'dark'));
    layoutBtn.addEventListener('click',()=>{body.classList.toggle('novel');layoutBtn.textContent=body.classList.contains('novel')?'타임라인':'소설형'});
    const closeDrawer=()=>body.classList.remove('drawer-open');
    menuBtn.addEventListener('click',()=>body.classList.toggle('drawer-open'));
    shade.addEventListener('click',closeDrawer);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
    const entries=[...document.querySelectorAll('[data-entry]')];
    function update(){
      const chars=new Set([...document.querySelectorAll('[data-filter-char]:checked')].map(x=>x.dataset.filterChar));
      const tabs=new Set([...document.querySelectorAll('[data-filter-tab]:checked')].map(x=>x.dataset.filterTab));
      const q=search.value.trim().toLocaleLowerCase();let visible=0;
      for(const el of entries){const charOK=chars.has(el.dataset.char),tabOK=tabs.has(el.dataset.tab);
        const searchOK=!q||(el.textContent||'').toLocaleLowerCase().includes(q);
        el.hidden=!(charOK&&tabOK&&searchOK);if(!el.hidden)visible++;}
      count.textContent=visible.toLocaleString('ko-KR')+'개 항목';empty.classList.toggle('show',visible===0);
    }
    document.querySelectorAll('[data-filter-char],[data-filter-tab]').forEach(x=>x.addEventListener('change',update));
    search.addEventListener('input',update);update();
  })();
  <\/script></body></html>`;
}
async function log14Export(kind,rootId){
  if(LOG14_BUSY){toast("이미 기록을 불러오는 중입니다. 내보내기가 끝난 뒤 다시 시도해 주세요.");return;}
  if(!S?.made||!sbOn()){toast("로그인 및 공유 기록 연결이 필요합니다.","bad");return;}
  const originalId=String(S.sb?.id||"");
  LOG14_BUSY=true;
  try{
    toast("서버에서 오래된 기록까지 불러와 HTML을 만드는 중입니다.","good");
    let records=[],title="",suffix="";
    if(kind==="rp"){
      const rows=await log14ReadPages("rp_posts?select=*");
      const ordered=log14ThreadOrder(rows,rootId);
      records=ordered.map(x=>log14ExportRecord(x,"rp"));
      title=rootId!=null?"RP 게시판 · 개별 타래":"RP 게시판 · 전체 기록";
      suffix=rootId!=null?"-타래-"+String(rootId):"-전체";
    }else if(kind==="pair"){
      const P=pairEnsure(),pair=P?.mine;
      if(!pair){toast("페어를 맺은 학생만 둘의 기록을 내보낼 수 있습니다.","bad");return;}
      const id=String(pair.id);
      const rows=await log14ReadPages(`pair_posts?select=*&pair_id=eq.${encodeURIComponent(id)}`);
      if(String(pairEnsure()?.mine?.id)!==id)throw new Error("페어가 변경되어 내보내기를 중단했습니다.");
      records=log14ThreadOrder(rows).map(x=>log14ExportRecord(x,"pair"));
      title="둘의 기록 · "+(pairPeer()?.name||"페어");suffix="-둘의기록";
    }else if(kind==="chat"){
      const P=pairEnsure(),pair=P?.mine;
      if(!pair){toast("페어를 맺은 학생만 페어 채팅을 내보낼 수 있습니다.","bad");return;}
      const scope=pairIdKey(pair.from_id,pair.to_id);
      const rows=await log14ReadPages(`messages?select=*&tab=eq.${encodeURIComponent("페어")}&scope=eq.${encodeURIComponent(scope)}`,"asc");
      if(String(pairEnsure()?.mine?.id)!==String(pair.id))throw new Error("페어가 변경되어 내보내기를 중단했습니다.");
      records=rows.map(r=>log14ExportRecord({row:r},"chat"));
      title="페어 채팅 · "+(pairPeer()?.name||"페어");suffix="-페어채팅";
    }else{throw new Error("지원하지 않는 내보내기 종류입니다.");}
    if(String(S.sb?.id||"")!==originalId)throw new Error("계정이 변경되어 내보내기를 취소했습니다.");
    if(!records.length){toast("내보낼 서버 기록이 없습니다.");return;}
    const filename=`無明長夜-${log14SafeFilename(S.name||"학생")}${suffix}-${new Date().toISOString().slice(0,10)}`;
    log14Download(filename,log14Build(records,title,kind));
    toast(`HTML 내보내기 완료 · ${records.length.toLocaleString("ko-KR")}개 기록`,"good");
  }catch(e){
    console.warn("HTML 로그 내보내기 실패:",e);
    toast("HTML 내보내기 실패 · "+log14Esc(String(e?.message||e).slice(0,145)),"bad");
  }finally{LOG14_BUSY=false;}
}

/* 버튼은 기존 페이지에 덧붙이기만 합니다. 원래 글쓰기/답글 UI는 변경하지 않습니다. */
const _log14RpThread=rpThreadHTML;
rpThreadHTML=function(root,marks){
  const html=_log14RpThread(root,marks);
  return html.replace(/(<div class="rp-topic">[\s\S]*?)(<\/div>)/,
    `$1<button type="button" class="btn sm ghost" style="margin-left:auto" onclick="log14Export('rp','${String(root.id).replace(/[^0-9]/g,'')}')">이 타래 HTML</button>$2`);
};
const _log14RpView=VIEWS.rpboard;
VIEWS.rpboard=function(){
  const html=_log14RpView();
  return html.replace('<div class="rp-board">',
    `<div class="card pad" style="margin-bottom:12px"><div class="spread"><div><b>RP 로그 보관</b><div class="tiny muted">전체 게시글과 답글을 서버에서 불러와 독립 HTML 파일로 저장합니다.</div></div><button type="button" class="btn pri sm" onclick="log14Export('rp')">전체 HTML 내보내기</button></div></div><div class="rp-board">`);
};
const _log14PairView=VIEWS.pairboard;
VIEWS.pairboard=function(){
  const html=_log14PairView();
  if(!pairEnsure().mine||!sbOn())return html;
  return html.replace('<section class="mm-timeline"',
    `<div class="card pad" style="margin:12px 0"><div class="spread"><div><b>둘의 기록 보관</b><div class="tiny muted">오래된 타래까지 모두 모아 HTML로 다운로드합니다. 파일에는 두 사람의 사적인 대화가 담깁니다.</div></div><button type="button" class="btn pri sm" onclick="log14Export('pair')">HTML 내보내기</button></div></div><section class="mm-timeline"`);
};
const _log14RenderChat=renderChat;
renderChat=function(bottom){
  const result=_log14RenderChat(bottom);
  const host=document.getElementById("chatcontext");
  if(!host)return result;
  const old=host.querySelector("#log14-chat-export");
  if(S?.chatTab!=="페어"||!pairEnsure().mine||!sbOn()){
    if(old)old.remove();
    return result;
  }
  if(!old){
    const btn=document.createElement("button");
    btn.type="button";btn.id="log14-chat-export";btn.className="btn sm ghost";
    btn.textContent="페어 채팅 HTML";btn.title="서버에 저장된 페어 채팅을 전체 HTML로 내보내기";
    btn.style.cssText="margin-left:auto;font-size:11px;white-space:nowrap";
    btn.onclick=()=>log14Export("chat");
    host.appendChild(btn);
  }
  return result;
};


/* Reforging consumes a separate material; the legacy 가루 balance remains talismans. */
function reforgeItem(id){return Object.values(S.gear||{}).find(it=>it&&String(it.id)===String(id))||(S.bag||[]).find(it=>String(it.id)===String(id));}
function reforgeCost(it){
 const locks=(it.reforgeLocks||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<it.opts.length).length;
 const dust=Math.ceil(20*Math.pow(1+Math.max(1,Number(it.lv)||1)/10,1.5)*Math.pow(1.9,Math.max(0,Number(it.grade)||0))*Math.pow(2.5,locks));
 return {dust,rin:dust*8,locks};
}
function reforgeOpen(id){
 const it=reforgeItem(id);if(!it||!it.opts?.length){toast('재련할 추가 옵션이 없습니다.');return;}
 const c=reforgeCost(it),locks=it.reforgeLocks||[],all=c.locks>=it.opts.length;
 modal('재련 · '+it.name,`<div class="tiny muted" style="line-height:1.8">잠그지 않은 추가 옵션의 종류와 수치가 무작위로 바뀝니다. 이전보다 낮아질 수도 있으며 되돌릴 수 없습니다.<br>등급·레벨·각인·기본 능력치는 유지됩니다. 잠금은 장비에 저장되며 해제할 때까지 유지됩니다. 잠금 1개마다 재련 비용이 2.5배가 됩니다.</div>
 <div class="sect-t" style="margin-top:12px">현재 옵션 · 잠금 ${c.locks}개</div>
 ${it.opts.map((o,i)=>`<div class="spread" style="padding:7px 0;gap:8px"><span>${esc(o.n)} +${o.v}% ${locks.includes(i)?'<span class="tag">잠금</span>':''}</span><button class="btn sm" onclick="reforgeLock(${it.id},${i})">${locks.includes(i)?'잠금 해제':'잠금'}</button></div>`).join('')}
 <div class="tiny muted" style="margin-top:12px">보유 부적 가루 ${nf(S.mat.부적가루||0)} · 륜 ${nf(S.rin)}</div>
 <div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn sm" onclick="closeModal()">취소</button><button class="btn pri" ${all||!(S.mat.부적가루>=c.dust)||S.rin<c.rin?'disabled':''} onclick="reforgeApply(${it.id})">${all?'잠금 옵션을 하나 이상 해제하세요':`재련 · 부적 가루 ${nf(c.dust)} · 륜 ${nf(c.rin)}`}</button></div>`);
}
function reforgeLock(id,index){
 const it=reforgeItem(id);if(!it||!Number.isInteger(index)||index<0||index>=it.opts.length)return;
 const locks=new Set(it.reforgeLocks||[]);if(locks.has(index))locks.delete(index);else locks.add(index);it.reforgeLocks=[...locks];save();reforgeOpen(id);
}
function reforgeApply(id){
 const it=reforgeItem(id);if(!it?.opts?.length)return;const c=reforgeCost(it);
 if(c.locks>=it.opts.length)return;
 if(!(S.mat.부적가루>=c.dust)||S.rin<c.rin){toast('부적 가루 또는 륜이 부족합니다.','bad');return;}
 const locked=new Set(it.reforgeLocks||[]),used=new Set(it.opts.filter((o,i)=>locked.has(i)).map(o=>o.k));
 const pool=OPTS.filter(o=>!used.has(o.k));
 const next=it.opts.map((o,i)=>{if(locked.has(i))return {...o};if(!pool.length)return {...o};const at=Math.floor(Math.random()*pool.length),option=pool.splice(at,1)[0];return {k:option.k,n:option.n,v:+(rnd(option.v[0]*10,option.v[1]*10)/10*(1+it.grade*.12)).toFixed(1)};});
 S.mat.부적가루-=c.dust;S.rin-=c.rin;it.opts=next;
 save();renderTop();renderNav();renderMain();reforgeOpen(id);toast('재련했습니다. 새 옵션을 확인해 주세요.','good');
}
function talismanExchange(qty){
 const n=Number(qty);if(!Number.isSafeInteger(n)||n<1||n>1000000)return;
 if(!(S.mat.가루>=n)){toast('부적이 부족합니다.','bad');return;}
 S.mat.가루-=n;S.mat.부적가루=(S.mat.부적가루||0)+n*10;
 save();renderMain();toast(`부적 ${nf(n)}개 → 부적 가루 ${nf(n*10)}개`,'good');
}
const _reforgeShop=VIEWS.shop;
VIEWS.shop=function(){return _reforgeShop.apply(this,arguments)+`<div class="card pad" style="margin-top:14px"><div class="sect-t">부적 가루 교환</div><div class="tiny muted">부적 1개를 부적 가루 10개로 교환합니다. 부적은 각인에, 부적 가루는 재련에 사용합니다. 교환 후 되돌릴 수 없습니다.</div><div class="tiny muted" style="margin-top:6px">보유 부적 ${nf(S.mat.가루||0)} · 부적 가루 ${nf(S.mat.부적가루||0)}</div><div class="row" style="margin-top:10px">${[1,10,100].map(n=>`<button class="btn sm" ${S.mat.가루>=n?'':'disabled'} onclick="talismanExchange(${n})">부적 ${n} → 가루 ${nf(n*10)}</button>`).join('')}<input class="inp" id="talisman-exchange-qty" type="number" min="1" max="1000000" step="1" value="1" aria-label="교환할 부적 수량" style="width:100px"><button class="btn sm" onclick="talismanExchange(document.getElementById('talisman-exchange-qty').value)">수량 교환</button></div></div>`;};
