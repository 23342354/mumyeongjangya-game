"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 4
   연금 공방(조제 · 물약 선반 · 재료 보관함)
   거주지 혜택 재편 — 성장에 따라 1/10에서 최대까지
   ═══════════════════════════════════════════════════ */

/* ─── 조제 재료 · 산지 ─── */
const ING=[
 {k:"먼지",  n:"봉인고 먼지",   w:"사무전 지하 봉인고", e:ic("alcAir")},
 {k:"홍월초",n:"홍월초",        w:"제2구역 뒷골목",     e:ic("hibiscus")},
 {k:"톱니",  n:"의체 톱니",     w:"제3구역 폐공방",     e:ic("gear")},
 {k:"집광편",n:"일륜 집광편",   w:"제4구역 폐터널",     e:ic("lens")},
 {k:"잿불씨",n:"잿불 씨",       w:"제6구역 판자촌",     e:ic("fire")},
 {k:"인광",  n:"해조 인광",     w:"제7구역 검은 바다",  e:ic("sparkles")},
 {k:"먹잉크",n:"먹그림자 잉크", w:"속삭이는 폐허",      e:ic("inkHeart")},
 {k:"종모래",n:"종루의 모래",   w:"석탑 종루",          e:ic("hourglass")},
 {k:"심연정",n:"심연 결정",     w:"심연",               e:ic("crystal")},
];
const AREA_ING={
 "사무전 지하 봉인고":"먼지", "제2구역 뒷골목":"홍월초", "제3구역 폐공방":"톱니",
 "제4구역 폐터널":"집광편", "제6구역 판자촌":"잿불씨", "제7구역 검은 바다":"인광",
 "속삭이는 폐허":"먹잉크", "석탑 종루":"종모래", "심연":"심연정",
};
DAREA.push("제3구역 폐공방","석탑 종루","심연");

/* ─── 조제법 ─── */
const POTIONS=[
 {id:"q1", n:"집중의 물약", c:"var(--blue)", dur:120, mana:1512,
  mat:{먼지:18},               buf:[["study",.30]], d:"2시간 수업 효율 +30%"},
 {id:"q2", n:"투지의 물약", c:"var(--red)", dur:120, mana:4026,
  mat:{먼지:12,홍월초:6},       buf:[["atkP",.25]], d:"2시간 공격력 +25%"},
 {id:"q3", n:"수호의 물약", c:"var(--ok)", dur:120, mana:4026,
  mat:{먼지:18,홍월초:6},       buf:[["hpP",.25],["defP",.20]], d:"2시간 생명력 +25%, 방어력 +20%"},
 {id:"q4", n:"안신의 물약", c:"var(--violet)", dur:120, mana:4026,
  mat:{먼지:15,홍월초:9},       buf:[["rest",.25],["heal",.10]], d:"2시간 이성 회복 +25%, 치유·보호막 위력 +10%"},
 {id:"q5", n:"맨드레이크 각성제", c:"var(--gold)", dur:120, mana:6039,
  mat:{먼지:12,뿌리:3,약초:6},  buf:[["exp",.25],["study",.15]], d:"2시간 경험치 +25%, 수업 효율 +15%", farm:true},
 {id:"q6", n:"황금 물약", c:"var(--gold)", dur:120, mana:12000,
  mat:{톱니:12,홍월초:6},       buf:[["gold",.40]], d:"2시간 륜 획득 +40%"},
 {id:"q7", n:"잿불 진정제", c:"var(--gold)", dur:120, mana:8052,
  mat:{집광편:3,잿불씨:6,홍월초:6}, buf:[["hpP",.15],["defP",.25]], d:"2시간 생명력 +15%, 방어력 +25%"},
 {id:"q8", n:"네잎 행운초", c:"var(--jadeD)", dur:120, mana:9400,
  mat:{인광:6,꽃:6},            buf:[["loot",.20],["crit",.03]], d:"2시간 전리품 확률 +20%, 치명타 확률 +3%", farm:true},
 {id:"q9", n:"행운의 물약", c:"var(--pink)", dur:120, mana:16000,
  mat:{종모래:3,심연정:1,인광:4}, buf:[["crit",.08],["critD",.20]], d:"2시간 치명타 확률 +8%, 치명타 피해 +20%", req:5},
];

/* ─── 거주지 혜택 — 성장에 따라 1/10에서 최대까지 ─── */
const HALLMAX={
 /* 거주지 혜택 — 효과마다 실제 크기가 달라서, 체감 가치를 맞춰 총량을 비슷하게 잡았습니다.
    (공격력 1% ≒ 초당 피해 1%, 치명타 1%p ≒ 1.1%, 수업 효율 1% ≒ 1.4% 가치 … 로 환산) */
 dorm:{study:.08, know:.06, rest:.06},            // 기숙사 — 강의실·서가가 가깝다
 w1:  {gold:.14, rest:.06, fee:.02},              // 제1구역 — 고급 주거지·식당가
 w2:  {exp:.11, rest:.14, know:.03},              // 제2구역 — 밤새 불 켠 작업실
 w3:  {atkP:.10, crit:.03, critD:.25},            // 제3구역 — 의체와 해커
 w4:  {mana:.14, brew:.10},                       // 제4구역 — 일륜 발전 구역
 w5:  {loot:.12, boss:.10},                       // 제5구역 — 용병과 현상수배
 w6:  {hpP:.14, defP:.08, heal:.08},              // 제6구역 — 바닥의 아래
 w7:  {petOut:.25, mana:.08},                     // 제7구역 — 검은 바다
};
const HALLLABEL={
 dorm:[["수업 효율","study"],["지식 획득","know"],["체력·이성 회복","rest"]],
 w1:  [["륜 획득","gold"],["체력·이성 회복","rest"]],
 w2:  [["경험치","exp"],["체력·이성 회복","rest"],["지식 획득","know"]],
 w3:  [["공격력","atkP"],["치명타 확률","crit"],["치명 피해","critD"]],
 w4:  [["파장 재생","mana"],["양조 효율","brew"]],
 w5:  [["전리품 확률","loot"],["업귀 피해","boss"]],
 w6:  [["생명력","hpP"],["방어력","defP"],["회복력","heal"]],
 w7:  [["사역귀 파견 보상","petOut"],["파장 재생","mana"]],
};
/* ═══════════ 거처 — 월세와 집 짓기 ═══════════
   · 기숙사 : 월세 없음, 집을 지을 수 없음. 대신 혜택이 처음부터 100% 입니다.
   · 구역   : 매주 월세를 냅니다. 집을 넓힐수록 혜택이 10% → 120% 까지 자랍니다.
              월세가 밀리면 혜택이 멈춥니다(쫓겨나지는 않습니다).                      */
const HOMESTAGE=[0, 0.25, 0.50, 0.75, 1.00, 1.20];      // 단계별 혜택 배율 — 전부 0에서 시작합니다
const RENT={ dorm:0, w1:9000, w2:5000, w3:6000, w4:6500, w5:5500, w6:2500, w7:4000 };
const HOMECOST=[
 {rin:12000,  mat:{가루:20,  뿌리:6},            lotus:6,  n:"방 한 칸",   d:"침상과 등롱 하나를 들였다."},
 {rin:40000,  mat:{가루:60,  뿌리:12, 꽃:8},     lotus:8,  n:"부엌",       d:"불을 쓸 수 있게 되었다."},
 {rin:120000, mat:{가루:150, 어물:20, 열매:15},  lotus:10, n:"작업방",     d:"법구를 늘어놓을 자리가 생겼다."},
 {rin:320000, mat:{가루:320, 약초:30, 꽃:20},    lotus:12, n:"안뜰",       d:"사역귀를 풀어 둘 만한 공간."},
 {rin:800000, mat:{가루:700, 혼백:6,  어물:40},  lotus:20, n:"다락과 서가", d:"이제 여기를 집이라 불러도 되겠다."},
];
/* 기숙사도 0 에서 시작합니다. 다만 사무전이 내어 준 방이라 월세가 없고,
   꾸밀 수 있는 단계가 네 칸까지(혜택 100%)입니다. 구역은 다섯 칸(120%)이지만 월세를 냅니다. */
const DORMCOST=[
 {rin:7000,   mat:{가루:12, 뿌리:4},   lotus:4,  n:"침구와 등롱", d:"딱딱한 침상에 요를 깔았다."},
 {rin:24000,  mat:{가루:40, 꽃:6},     lotus:6,  n:"책상",        d:"창 없는 벽에 붙여 두었다."},
 {rin:70000,  mat:{가루:90, 열매:12},  lotus:8,  n:"선반",        d:"법구와 책을 올려 둘 자리."},
 {rin:180000, mat:{가루:200, 약초:20}, lotus:12, n:"창가 자리",   d:"없던 창을 하나 얻었다. 바깥은 여전히 밤이다."},
];
function homeS(){ if(!S.home) S.home={stage:0, due:0, auto:true}; return S.home; }
function isDorm(id){ return (id||S.hall)==="dorm"; }
function homePlan(id){ return isDorm(id) ? DORMCOST : HOMECOST; }
function homeMax(id){ return homePlan(id).length; }      // 기숙사 4칸 · 구역 5칸
function rentOf(id){ const h=homeS(); return Math.round((RENT[id||S.hall]||0)*(1+h.stage*0.35)); }
function rentDue(){ return Math.max(0, homeS().due - S.t); }      // 남은 명계 분
function rentLate(){ return !isDorm() && homeS().due>0 && S.t>homeS().due; }
function hallGrowth(id){
  if(id!==S.hall) return 0;                      // 살지 않는 곳은 혜택이 없습니다
  if(rentLate()) return 0;                       // 월세가 밀리면 멈춤
  return HOMESTAGE[clamp(homeS().stage, 0, homeMax(id))];
}
function hallFactor(id){ return clamp(hallGrowth(id), 0, 1.2); }
/* part3의 mod 래퍼가 읽는 표를 지금 성장치로 갱신한다 */
function syncHall(){
  const f=hallFactor(S.hall), base=HALLMAX[S.hall]||{};
  HALLS.forEach(h=>{ const o=HALLBONUS[h.id]; if(o) Object.keys(o).forEach(k=>delete o[k]); });
  const o=HALLBONUS[S.hall]||(HALLBONUS[S.hall]={});
  Object.keys(base).forEach(k=>{ if(k!=="fee") o[k]=base[k]*f; });
}
function hallFee(){ return (HALLMAX[S.hall]&&HALLMAX[S.hall].fee||0)*hallFactor(S.hall); }

function hallBenefitText(id){
  const f=hallFactor(id), base=HALLMAX[id]||{};
  const rows=(HALLLABEL[id]||[]).map(([n,k])=>`${n} +${(base[k]*f*100).toFixed(0)}% / +${(base[k]*100).toFixed(0)}%`);
  if(base.fee) rows.push(`중개소 수수료 ${(base.fee*f*100).toFixed(0)}%p 낮음`);
  return rows.join(", ");
}

/* ═══════════ 상태 ═══════════ */
function ensureV4(){
  if(S.ing===undefined){ S.ing={}; ING.forEach(i=>S.ing[i.k]=0); S.ing.먼지=60; S.ing.홍월초=8; }
  ING.forEach(i=>{ if(S.ing[i.k]===undefined) S.ing[i.k]=0; });
  if(S.potion===undefined) S.potion={};
  if(S.brewN===undefined) S.brewN=3;
  syncHall();
}
function matHave(k){ return (S.ing&&S.ing[k]!==undefined)?S.ing[k]:(S.mat[k]||0); }
function matTake(k,n){ if(S.ing&&S.ing[k]!==undefined) S.ing[k]-=n; else S.mat[k]-=n; }
function matName(k){ const i=ING.find(x=>x.k===k); return i?i.n:k; }

/* ═══════════ 조제 ═══════════ */
function brewEff(){ return +(1 + mod("brew") + S.course*.06 + S.lvl*.004).toFixed(2); }
function brewMana(p){ return Math.round(p.mana/brewEff()); }
function canBrew(p,n){
  if(p.req&&S.course<p.req) return false;
  if(S.mana < brewMana(p)*n) return false;
  for(const k in p.mat) if(matHave(k) < p.mat[k]*n) return false;
  return true;
}
function brew(id,n){
  const p=POTIONS.find(x=>x.id===id);
  if(p.req&&S.course<p.req){ toast(`${p.req}과정부터 조제할 수 있습니다.`,"bad"); return; }
  if(!canBrew(p,n)){ toast("재료나 파장이 모자랍니다.","bad"); return; }
  S.mana-=brewMana(p)*n;
  for(const k in p.mat) matTake(k,p.mat[k]*n);
  S.potion[id]=(S.potion[id]||0)+n;
  S.war.mine=(S.war.mine||0)+n*2;
  addMark(n*2);
  toast(`<b>${p.n}</b> ${n}병을 조제했습니다.`,"good");
  renderTop(); renderNav(); renderMain(); save();
}
function drink(id){
  const p=POTIONS.find(x=>x.id===id);
  if(!(S.potion[id]>0)){ toast("보유한 물약이 없습니다.","bad"); return; }
  S.potion[id]--;
  const mine=S.buffs.filter(b=>b.pid===p.id);
  if(mine.length) mine.forEach(b=>b.left=Math.min(p.dur*3, b.left+p.dur));
  else p.buf.forEach(([k,v],i)=>S.buffs.push({n:p.n, pid:p.id, key:k, v, left:p.dur, e:ic("testtube"), c:p.c, hide:i>0}));
  toast(`${p.n} · ${p.d}`,"good");
  renderTop(); renderNav(); renderMain(); save();
}
function sellPotion(id){
  const p=POTIONS.find(x=>x.id===id);
  if(!(S.potion[id]>0)) return;
  S.potion[id]--;
  const gross=Math.round(p.mana*1.4+600);
  const feeR=Math.max(0.01, 0.05-hallFee());
  const net=Math.round(gross*(1-feeR));
  gainRin(net);
  toast(`중개소에서 팔았습니다 · 륜 +${nf(net)} <span class="muted">(수수료 ${(feeR*100).toFixed(0)}%)</span>`,"good");
  renderTop(); renderMain(); save();
}

/* ═══════════ 화면 — 연금 공방 ═══════════ */
VIEWS.alche=()=>{
  const eff=brewEff();
  const shelf=POTIONS.filter(p=>S.potion[p.id]>0);
  return head("조제학 실습실",ic("flask")+" 연금 공방", `양조 효율 <b style="color:var(--gold)">×${eff.toFixed(2)}</b>`)+`
  ${buffStrip()}
  <div class="grid g2">
    <div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">조제법</div>
        <span class="seg">${[1,3,5,10].map(n=>`<button class="${S.brewN===n?"on":""}" onclick="S.brewN=${n};renderMain()">${n}병</button>`).join("")}</span></div>
      <div class="tiny muted" style="margin:6px 0 12px;line-height:1.85">
        재료와 파장이 있으면 바로 완성됩니다. 양조 효율 <b>×${eff.toFixed(2)}</b>만큼 파장이 덜 듭니다.
        물약 효과는 마신 뒤 실제 시간으로 흐릅니다. 마신 뒤 시작하는 수업·의뢰부터 적용됩니다
        (이미 진행 중인 수업·의뢰에는 적용되지 않으며, 효과가 남은 시간과 겹치는 만큼 반영됩니다).
      </div>
      ${POTIONS.map(p=>{
        const n=S.brewN, lock=p.req&&S.course<p.req, ok=canBrew(p,n);
        return `<div style="padding:10px 0;border-bottom:1px solid var(--s3);${lock?"opacity:.45":""}">
          <div class="spread">
            <div><span class="dot" style="background:${p.c};margin-right:6px"></span><b>${p.n}</b>
              <span class="tiny muted">효과 2시간 0분</span></div>
            <button class="btn sm ${ok?"pri":""}" ${ok?"":"disabled"} onclick="brew('${p.id}',${n})">${lock?`${p.req}과정부터`:`${n}병 만들기`}</button>
          </div>
          <div class="tiny muted" style="margin:3px 0 6px">${p.d}</div>
          <div class="row">
            <span class="buffchip" style="${S.mana>=brewMana(p)*n?"":"color:var(--red);border-color:var(--redD)"}">파장 ${nf(brewMana(p)*n)}</span>
            ${Object.keys(p.mat).map(k=>{
              const need=p.mat[k]*n, have=matHave(k);
              return `<span class="buffchip" style="${have>=need?"":"color:var(--red);border-color:var(--redD)"}">${matName(k)} ${nf(have)}/${need}</span>`}).join("")}
          </div>
          ${p.farm?`<div class="tiny muted" style="margin-top:4px">약초밭 수확물이 재료로 사용됩니다</div>`:""}
        </div>`}).join("")}
    </div>

    <div>
      <div class="card pad" style="margin-bottom:12px">
        <div class="sect-t">물약 선반</div>
        ${shelf.length?shelf.map(p=>{
          const act=S.buffs.find(b=>b.pid===p.id);
          return `<div class="spread" style="padding:7px 0;border-bottom:1px solid var(--s3)">
            <div><span class="dot" style="background:${p.c};margin-right:6px"></span><b>${p.n}</b>
              <span class="tiny muted">×${S.potion[p.id]}</span>
              ${act?`<span class="tag g" style="margin-left:6px">${hhmm(act.left)}</span>`:""}
              <div class="tiny muted">${p.d}</div></div>
            <div class="row">
              <button class="btn sm pri" onclick="drink('${p.id}')">마시기</button>
              <button class="btn sm" onclick="sellPotion('${p.id}')">중개소에서 팔기</button></div>
          </div>`}).join("")
          :`<div class="tiny muted">조제해 둔 물약이 없습니다.</div>`}
      </div>

      <div class="card pad">
        <div class="spread"><div class="sect-t" style="margin:0">재료 보관함</div>
          <span class="tiny muted">사역귀 파견·의뢰·나들이에서 모입니다</span></div>
        <table class="t">
          ${ING.map(i=>`<tr>
            <td>${i.e} ${i.n} <span class="tiny muted" style="margin-left:6px">${i.w}</span></td>
            <td style="text-align:right"><b style="${S.ing[i.k]?"":"color:var(--dim2)"}">${nf(S.ing[i.k]||0)}</b></td></tr>`).join("")}
          <tr><td colspan="2" style="padding-top:8px"><span class="tiny muted">약초밭 · 낚시</span></td></tr>
          ${["약초","열매","뿌리","꽃","어물"].map(k=>`<tr>
            <td>${k} <span class="tiny muted" style="margin-left:6px">${k==="어물"?"제7구역 검은 바다":"약초 온실 뒤뜰"}</span></td>
            <td style="text-align:right"><b style="${S.mat[k]?"":"color:var(--dim2)"}">${nf(S.mat[k]||0)}</b></td></tr>`).join("")}
          <tr><td>부적가루 <span class="tiny muted" style="margin-left:6px">법구 분해</span></td>
            <td style="text-align:right"><b>${nf(S.mat.가루||0)}</b></td></tr>
        </table>
        <div class="tiny muted" style="margin-top:8px">사역귀를 파견한 <b>지역에 따라</b> 돌아올 때 가져오는 재료가 다릅니다.</div>
        <button class="btn sm" style="margin-top:8px" onclick="go('pets')">사육장으로</button>
      </div>
    </div>
  </div>`;
};

/* ═══════════ 거처 화면 ═══════════ */
function homeAct(){
  const h=homeS(), dorm=isDorm();
  const plan=homePlan(), top=homeMax();
  const next=plan[h.stage];
  const rent=rentOf(), late=rentLate();
  const matRow=(m)=>Object.entries(m).map(([k,v])=>{
    const have=(S.mat&&S.mat[k])||0;
    return `<span class="tag ${have>=v?"g":""}">${k} ${nf(have)}/${nf(v)}</span>`;
  }).join(" ");
  const rentCard = dorm ? `<div class="card pad">
    <div class="sect-t">월세 없음</div>
    <div class="tiny muted" style="line-height:1.9">
      사무전이 내어 준 방이라 <b>월세를 내지 않습니다.</b> 대신 꾸밀 수 있는 자리가
      <b>네 칸(혜택 100%)</b>까지입니다. 구역으로 나가면 다섯 칸(120%)까지 넓힐 수 있지만
      이레마다 월세를 내야 합니다.
    </div></div>` : `<div class="card pad">
    <div class="spread"><div class="sect-t" style="margin:0">월세</div>
      <span class="tiny ${late?"":"muted"}" style="${late?"color:var(--red)":""}">
        ${late?"미납 — 혜택이 멈췄습니다":(h.due?`다음 납부까지 ${hhmm(rentDue())}`:"아직 계약 전")}</span></div>
    <div class="tiny muted" style="margin-bottom:8px">
      이레마다 <b style="color:var(--gold)">${nf(rent)} 륜</b>. 집이 넓어질수록 오릅니다.
      밀려도 쫓겨나지는 않지만, 낼 때까지 거주지 혜택이 붙지 않습니다.</div>
    <div class="row">
      <button class="btn ${late?"pri":""}" onclick="payRent()">${h.due?"이레치 내기":"계약하고 첫 달 내기"}
        <span class="tiny muted">${nf(rent)}</span></button>
      <button class="btn sm ${h.auto?"pri":""}" onclick="toggleRentAuto()">
        자동 납부 ${h.auto?"켜짐":"꺼짐"}</button>
    </div>
    <div class="tiny muted" style="margin-top:6px">자동 납부를 켜 두면 륜이 있을 때 알아서 빠집니다.</div>
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
      <div class="tiny muted" style="margin-bottom:6px">${next.d}</div>
      <div class="row" style="gap:5px;margin-bottom:8px">
        <span class="tag ${S.rin>=next.rin?"g":""}">륜 ${nf(S.rin)}/${nf(next.rin)}</span>
        ${matRow(next.mat)}</div>
      <div class="tiny muted" style="margin-bottom:8px">완성하면 연등 +${next.lotus}</div>
      <button class="btn pri" onclick="buildHome()">${dorm?"들인다":"짓는다"}</button></div>`
     :`<div class="tiny" style="color:var(--ok);margin-top:10px">${dorm?"방을 다 꾸몄습니다. 혜택이 100%로 붙습니다.":"집을 다 지었습니다. 혜택이 최대(120%)로 붙습니다."}</div>`}
    <div class="tiny muted" style="margin-top:8px">재료는 약초밭·낚시·법구 분해에서 모읍니다.</div>
  </div>`;
}
VIEWS.hallv=()=>{
  syncHall();
  const me=homeOf(S.hall), h=homeS();
  const benefit=(id)=>{
    const f=hallFactor(id), base=HALLMAX[id];
    const rows=HALLLABEL[id].map(([n,k])=>`${n} +${(base[k]*f*100).toFixed(0)}%`);
    if(base.fee) rows.push(`중개소 수수료 ${(base.fee*f*100).toFixed(1)}%p 낮음`);
    return rows.join(" · ");
  };
  const max=(id)=>{
    const base=HALLMAX[id];
    const rows=HALLLABEL[id].map(([n,k])=>`${n} +${(base[k]*100).toFixed(0)}%`);
    if(base.fee) rows.push(`수수료 ${(base.fee*100).toFixed(0)}%p`);
    return rows.join(" · ");
  };
  return head("지금 사는 곳",ic("castle")+" 거처",
    `${me.n} ${me.h} · ${h.stage} / ${homeMax()} 단계`)+`
  <div class="grid g2" style="margin-bottom:14px">
    <div>
      <div class="card pad">
        <div class="spread"><div class="sect-t" style="margin:0">${me.n} <span class="muted">${me.h}</span></div>
          <span class="tag" style="border-color:${me.c};color:${me.c}">
            혜택 ${(hallFactor(S.hall)*100).toFixed(0)}%</span></div>
        <div class="tiny muted" style="margin-bottom:8px">${me.d}</div>
        <div class="tiny" style="color:var(--gold)">${benefit(S.hall)||"월세가 밀려 혜택이 멈췄습니다"}</div>
        <div class="tiny muted" style="margin-top:4px">다 키웠을 때 — ${max(S.hall)}</div>
      </div>
      ${homeAct()}
    </div>
    <div class="card pad">
      <div class="sect-t">거주지 고르기</div>
      <div class="tiny muted" style="margin-bottom:10px">옮기면 <b>꾸며 둔 것은 두고 갑니다</b>(단계 0으로).
        기숙사는 월세가 없는 대신 천장이 100%, 구역은 월세를 내는 대신 120%까지 갑니다.</div>
      ${HALLS.map(x=>`<div class="sub" style="margin-bottom:8px;${x.id===S.hall?"border-color:"+x.c:""}">
        <div class="spread"><div><b style="color:${x.c}">${x.n}</b>
          <span class="tiny muted">${x.h}</span>
          ${x.id===S.hall?'<span class="tag g" style="margin-left:6px">여기 삽니다</span>':""}</div>
          <span class="tiny muted">${RENT[x.id]?`이레 ${nf(RENT[x.id])} 륜~ · 최대 120%`:"월세 없음 · 최대 100%"}</span></div>
        <div class="tiny muted" style="margin-top:3px">${max(x.id)}</div>
        ${x.id===S.hall?"":`<button class="btn sm" style="margin-top:6px" onclick="moveHall('${x.id}')">여기로 옮기기</button>`}
      </div>`).join("")}
    </div>
  </div>`;
};
function payRent(){
  const h=homeS();
  if(isDorm()){ toast("기숙사는 월세가 없습니다."); return; }
  const r=rentOf();
  if(S.rin<r){ toast("륜이 부족합니다.","bad"); return; }
  S.rin-=r;
  const base = (h.due && S.t<h.due) ? h.due : S.t;      // 밀렸으면 지금부터, 아니면 이어서
  h.due = base + 7*1440;
  toast(`월세 ${nf(r)} 륜을 냈습니다. 다음 납부까지 ${hhmm(h.due-S.t)}`,"good");
  syncHall(); renderTop(); renderMain(); save();
}
function toggleRentAuto(){ const h=homeS(); h.auto=!h.auto; renderMain(); save();
  toast(h.auto?"자동 납부를 켰습니다.":"자동 납부를 껐습니다."); }
function buildHome(){
  const h=homeS();
  const c=homePlan()[h.stage];
  if(!c){ toast(isDorm()?"이미 다 꾸몄습니다.":"이미 다 지었습니다."); return; }
  if(S.rin<c.rin){ toast("륜이 부족합니다.","bad"); return; }
  for(const [k,v] of Object.entries(c.mat))
    if(((S.mat&&S.mat[k])||0) < v){ toast(`${k}이(가) 부족합니다.`,"bad"); return; }
  S.rin-=c.rin;
  Object.entries(c.mat).forEach(([k,v])=>{ S.mat[k]-=v; });
  h.stage++; S.lotus+=c.lotus;
  pushNews(`[거처] ${homeOf(S.hall).n}의 ${isDorm()?"방":"집"}에 「${c.n}」이 생겼습니다.`);
  toast(`「${c.n}」 완성 · 연등 +${c.lotus} · 혜택 ${(HOMESTAGE[h.stage]*100).toFixed(0)}%`,"good");
  if(typeof achCheck==="function") achCheck();
  syncHall(); renderTop(); renderMain(); save();
}
/* 자동 납부 — 창을 닫아 두어도 륜이 있으면 알아서 빠집니다 */
const _stepRent=step;
step=function(m){
  _stepRent(m);
  if(!S||!S.made||isDorm()) return;
  const h=homeS();
  if(!h.due) return;
  if(S.t>h.due && h.auto){
    const r=rentOf();
    if(S.rin>=r){ S.rin-=r; h.due+=7*1440;
      if(S.t>h.due) h.due=S.t+7*1440;
      pushNews(`[거처] 월세 ${nf(r)} 륜이 자동으로 빠져나갔습니다.`); syncHall(); }
  }
};


/* ═══════════ 연결 ═══════════ */
/* 치유·보호막 위력에 물약 효과 반영 */
const _C=C;
C=function(){ const c=_C(); c.heal=+(c.heal+mod("heal")).toFixed(2); return c; };

/* 파견 — 지역에 맞는 조제 재료와 거주지 보너스 */
const _recall4=recall;
recall=function(i){
  const p=S.pets.list[i];
  const done=p&&p.out&&S.t>=p.out.end;
  const h=done?p.out.h:0, area=p?p.area:null;
  const before=S.rin;
  _recall4(i);
  if(!done) return;
  const bonus=mod("petOut");
  const add=Math.round((S.rin-before)*bonus);
  if(add>0) S.rin+=add;
  const key=AREA_ING[area];
  if(key){
    const amt=Math.max(1, Math.round((rnd(2,4)*h/4)*(1+bonus)));
    S.ing[key]=(S.ing[key]||0)+amt;
    toast(`${matName(key)} +${amt}${add>0?` · 거주지 보정 륜 +${nf(add)}`:""}`,"good");
  }
  renderTop(); renderNav(); renderMain(); save();
};

/* 의뢰 처치 — 가끔 조제 재료 */
const _runStep=runStep;
runStep=function(){
  const before=S.run?S.run.kills:0;
  _runStep();
  if(S.run && S.run.kills>before && Math.random()<0.16){
    const g=ING.filter(x=>!/심연|종루/.test(x.w));
    const it=pick(g), amt=rnd(1,2)+Math.floor(S.run.stage/25);
    S.ing[it.k]=(S.ing[it.k]||0)+amt;
    pushRun(`<span class="s">${it.e} ${it.n}을(를) 챙겼다. +${amt}</span>`);
  }
};

/* 석탑 — 종루의 모래 */
const _climbTower4=climbTower;
climbTower=function(c){ const b=S.tower||0; _climbTower4(c);
  const g=(S.tower||0)-b; if(g>0) S.ing.종모래=(S.ing.종모래||0)+Math.ceil(g/3); };

/* 중개소 수수료 — 수월당 혜택 */
const _listMine=listMine;
listMine=function(id){
  const i=S.bag.findIndex(x=>x.id===id); if(i<0) return;
  const it=S.bag[i];
  const gross=Math.round(gearScore(it)*1.35+it.lv*120);
  const baseFee=gross<=100000?.05:gross<=1000000?.07:.10;
  const feeR=Math.max(.01, baseFee-hallFee());
  const net=Math.round(gross*(1-feeR));
  S.bag.splice(i,1); gainRin(net);
  toast(`중개소에서 즉시 팔렸습니다 · 륜 +${nf(net)} <span class="muted">(수수료 ${(feeR*100).toFixed(0)}%${hallFee()>0?`, ${homeOf(S.hall).n} 보정`:""})</span>`,"good");
  renderTop(); renderMain(); save();
};

/* 거주지 혜택은 성장치가 바뀔 때마다 갱신 */
const _step4=step;
step=function(m){ if(S&&S.made&&S.ing) syncHall(); _step4(m); };
const _moveHall=moveHall;
moveHall=function(id){ _moveHall(id); syncHall(); };

/* 내비 · 지도 */
(()=>{ const g=NAVDEF.find(x=>x.id==="craft");
  if(g && !g.sub.some(s=>s.id==="alche")) g.sub.unshift({id:"alche",n:"연금 공방"}); })();
PLACES.push({id:"alchep", n:"연금 공방", e:ic("flask"), x:18, y:64, view:"alche"});

const _boot4=boot;
boot=function(){ _boot4(); ensureV4(); renderNav(); renderMain(); };
