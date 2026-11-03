"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 8

   ① 상단 알림함 (30일 보관 · 갈래별 추리기 · 더 보기)
   ② 페어 합사 — 둘이 맺어지면 더 좋은 집으로 자동으로 함께 들어갑니다
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
function alertsEnsure(){
  if(!Array.isArray(S.alerts)) S.alerts=[];
  if(typeof S.alertSeen!=="number") S.alertSeen=Date.now();
  return S.alerts;
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
  S.alerts=[]; save(); drawAlerts(); alertBadge();
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
    S.bmat[x.k]=bHave(x.k)+amt;
    pushRun(`<span class="s">${x.e} ${x.n}을(를) 챙겼다. +${amt}</span>`);
  }
};

/* ───────────────────────────────────────────────────
   ③ 페어 합사 — 더 좋은 집으로 자동으로 함께 듭니다
   ─────────────────────────────────────────────────── */
/* 집의 「좋기」 — 구역 특화 배율 × 성장 배율. 성장 0인 집은 아무리 비싼 구역이어도 지지 않습니다. */
function homeWorth(hall, stage){
  const h=(hall in HALLMULT)?hall:"dorm";
  const st=clamp(Number(stage)||0, 0, homeMax(h));
  return (HALLMULT[h]||1) * (HOMESTAGE[st]||0);
}
/* 두 집 가운데 합사할 집을 고릅니다 — 좋은 쪽, 같으면 일세가 비싼 쪽, 그래도 같으면 신청한 쪽 */
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
/* 합사 적용 — 내 쪽이 아니면 상대의 집으로 들어갑니다 */
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
    toast(`페어와 합사했습니다 · ${homeOf(sh.hall).n} ${h.stage}단계 (${esc(sh.ownerName||"페어")} 님의 집)`,"good");
  }
  pushNews(`[거처] ${S.name} 학생이 페어와 ${homeOf(sh.hall).n}에 합사했습니다.`);
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
/* 합사 중에는 거처를 혼자 옮길 수 없다는 점을 먼저 알립니다 */
const _moveHall8 = moveHall;
moveHall = function(id){
  const sh=pairSharedHome();
  if(sh){
    const worth=homeWorth(id,0);
    if(worth<=sh.worth){
      toast(`페어와 합사 중입니다. ${homeOf(sh.hall).n} ${sh.stage}단계가 더 좋은 집이라 곧 다시 그리로 합사됩니다. 옮기려면 먼저 페어를 풀어 주세요.`,"bad");
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
        return `<span class="tag g">페어 · ${nm}${esc(other)}</span>`;
      }
    }
    return _pairBtn8(r);
  };
}
/* 합사 안내 칸 */
function pairMergeHTML(){
  const P=(typeof pairEnsure==="function")?pairEnsure():null;
  if(!sbOn() || !P || !P.mine) return "";
  const sh=pairSharedHome();
  if(!sh) return `<div class="card pad" style="margin-bottom:14px">
    <div class="sect-t">합사</div>
    <div class="tiny muted">상대가 한 번 접속하면 두 사람의 집 가운데 좋은 쪽으로 자동으로 합칩니다.</div></div>`;
  const h=homeOf(sh.hall);
  return `<div class="card pad" style="margin-bottom:14px;border-color:var(--gold2)">
    <div class="spread"><div class="sect-t" style="margin:0">합사</div>
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
    return `<span class="tag ${have>=v?"g":""}">${k} ${nf(have)}/${nf(v)}</span>`;
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
      ? `합사 중입니다. 둘 중 한 명만 내면 두 사람 모두 24시간 적용됩니다. 내 거처 기준 ${rentMoney(rentOf())} 륜/일.`
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
      if(((S.mat&&S.mat[k])||0) < v){ toast(`${k}이(가) 부족합니다.`,"bad"); return; }
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
/* 거처 화면 맨 위에 합사 칸 */
const _hallv8 = VIEWS.hallv;
VIEWS.hallv = () => {
  const merge = (typeof pairMergeHTML==="function") ? pairMergeHTML() : "";
  const h=_hallv8();
  if(!merge) return h;
  const i=h.indexOf('<div class="grid g2"');
  return i<0 ? merge+h : h.slice(0,i)+merge+h.slice(i);
};

/* ───────────────────────────────────────────────────
   ⑤ 친구와 관계를 따로
   ─────────────────────────────────────────────────── */
function relCard(kind){
  const title = kind==="friend" ? "친구" : "관계";
  const note  = kind==="friend"
    ? "서로 수락하면 양쪽 명부에 친구로 남습니다. 호칭은 붙지 않습니다."
    : "서로를 어떻게 부를지 정합니다. 수락하면 두 사람 화면에 역할이 서로 반대로 보입니다.";
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
      <button class="btn sm ghost" onclick="socialRemove(${r.id})">해제</button></div>`).join("")
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
/* 페어 화면 — 거처 따라가기 대신 합사 안내 */
VIEWS.pairhub=()=>{
  const p=(typeof pairEnsure==="function")?pairEnsure().mine:null;
  const shared=p&&SOCIAL.pairs.find(r=>String(r.id)===String(p.id));
  return head("둘만의 자리","페어",
      shared&&shared.pair_name?esc(shared.pair_name):"페어명과 합사한 거처를 함께 관리합니다")
    + socialStatus()
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
    + (typeof pairMergeHTML==="function"?pairMergeHTML():"")
    + (typeof pairHomeHTML==="function"?pairHomeHTML():"")
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
/* 최근 합동 기록에 「일지」 단추 */
const _togetherBody8 = togetherBody;
togetherBody = function(){
  let h=_togetherBody8();
  const done=(S.sb.rooms||[]).filter(r=>r.status==="done"&&r.result).slice(0,6);
  done.forEach(r=>{
    const tag=`<span class="tag ${r.result.win?"j":"r"}">${r.result.win?"돌파":"실패"}</span>`;
    const once=`<td style="text-align:right">${tag}</td>`;
    const next=`<td style="text-align:right">${tag}
      <button class="btn sm ghost" style="margin-left:6px" onclick="coopOpen('${String(r.id).replace(/'/g,"")}')">일지</button></td>`;
    const at=h.indexOf(once);
    if(at>=0) h=h.slice(0,at)+next+h.slice(at+once.length);
  });
  return h.replace("여럿이 나눠 맞으므로 받는 피해가 줄어듭니다.",
    "여럿이 나눠 맞으므로 받는 피해가 줄어듭니다. 출발하면 <b>피해가 들어가는 일지</b>가 참가자 모두에게 펼쳐집니다.");
};

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
  clock.textContent=hhmm(R.left)+" 남음";
  const bar=document.getElementById("runprog");
  if(bar) bar.style.width=clamp((1-R.left/Math.max(1,R.total))*100,0,100)+"%";
  const pace=document.getElementById("runpace");
  if(pace) pace.textContent=`전체 ${hhmm(R.total)} 가운데 ${hhmm(Math.max(0,R.total-R.left))} 지났습니다. 시계와 같은 속도로 흐릅니다.`;
  const kills=document.getElementById("runkills");
  if(kills) kills.textContent=`처치 ${R.kills}체 · 받은 륜 ${nf(R.rin||0)} · 경험치 ${nf(R.exp||0)}`;
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
if(typeof PLACES!=="undefined") PLACES.push({id:"woodp", n:"목석 공방", e:ic("castle"), x:30, y:72, view:"woodv"});

const _boot8 = boot;
boot = function(){ _boot8(); ensureV8(); renderTop(); renderNav(); renderMain(); };
