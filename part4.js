"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 4
   연금 공방(조제 · 물약 선반 · 재료 보관함)
   숙사 혜택 재편 — 성장에 따라 1/10에서 최대까지
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

/* ─── 숙사 혜택 — 성장에 따라 1/10에서 최대까지 ─── */
const HALLMAX={
 h1:{atkP:.12, hpP:.05},                         // 무명당 — 창 없는 동
 h2:{know:.15, study:.05},                       // 법륜당 — 수행실·독경
 h3:{petOut:.25, mana:.10},                      // 연화당 — 안뜰 연못
 h4:{gold:.15, loot:.10, fee:.02},               // 수월당 — 수면에 비친 달
};
const HALLLABEL={
 h1:[["공격력","atkP"],["생명력","hpP"]],
 h2:[["지식 획득","know"],["수업 효율","study"]],
 h3:[["사역귀 파견 보상","petOut"],["파장 재생","mana"]],
 h4:[["륜 획득","gold"],["전리품 확률","loot"]],
};
function hallGrowth(id){
  if(id===S.hall) return clamp((S.war.mine||0)/6000, 0, 1);
  return clamp(0.45+((id.charCodeAt(1)*37)%50)/100, 0, 1);
}
function hallFactor(id){ return 0.1 + 0.9*hallGrowth(id); }
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

/* ═══════════ 숙사 화면 재작성 ═══════════ */
VIEWS.hallv=()=>{
  syncHall();
  const w=warScores(), me=HALLS.find(h=>h.id===S.hall);
  const top=w[0].sc;
  const benefit=(id)=>{
    const f=hallFactor(id), base=HALLMAX[id];
    const rows=HALLLABEL[id].map(([n,k])=>`${n} +${(base[k]*f*100).toFixed(0)}% / +${(base[k]*100).toFixed(0)}%`);
    if(base.fee) rows.push(`중개소 판매 수수료 구간마다 ${(base.fee*f*100).toFixed(0)}%p 낮음 (첫 구간 ${(5-base.fee*f*100).toFixed(0)}% · 기본 5%)`);
    return rows.join(", ");
  };
  return head("네 숙사의 한 주",ic("castle")+" 숙사", `${me.n} ${me.h}`)+`
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">숙사 대항전</div>
        <span class="tiny muted">${6-(cal().day%7)}일 ${23-cal().h}시간 남음</span></div>
      ${w.map((h,i)=>`<div style="margin:8px 0">
        <div class="spread tiny"><span>${i+1} <b style="color:${h.c}">${h.n}</b> ${h.me?'<span class="tag g">내 숙사</span>':""}</span>
          <span class="muted">활동 ${180+(h.sc%95)}명 · <b>${nf(h.sc)}</b></span></div>
        <div class="bar" style="margin-top:3px"><i style="width:${h.sc/top*100}%;background:linear-gradient(90deg,${h.c}66,${h.c})"></i></div></div>`).join("")}
      <div class="card pad" style="background:var(--s1);margin-top:10px">
        <div class="tiny muted" style="line-height:1.85">
        <b>대항전 규칙</b><br>
        · <b>인원 보정</b> — 숙사 점수는 이번 주 100점 이상 활동한 학생의 <b>평균</b>입니다. 인원이 많은 숙사가 유리하지 않습니다.<br>
        · 모든 숙사가 같은 점수·같은 활동이면 어느 숙사든 같은 점수를 받습니다 (숙사 특기 배점 없음).<br>
        · <b>보상</b> — 숙사 순위 보상(연등, 그 숙사 학생 모두) 1위 18 · 2위 15 · 3위 12 · 4위 10<br>
        · 개인 점수 보상(연등, 순위와 별개) 2,000점 이상 +5 · 6,000점 이상 +10 · 1만점 이상 +15<br>
        내 이번 주 점수 <b style="color:var(--gold)">${nf(S.war.mine||0)}</b>${(S.war.mine||0)>=2000?' · <span style="color:var(--jade)">개인 보상 구간 달성</span>':""}.
        수업 시간, 처치, 보스, 시험, 연무제, 조제, 파견, 수행, 각인, 과제가 모두 점수가 됩니다.</div>
      </div>
    </div>
    <div class="card pad">
      <div class="sect-t">숙사 성장</div>
      <div class="tiny muted" style="margin-bottom:10px">대항전 점수가 쌓일수록 숙사 혜택이 <b>1/10에서 최대 값까지</b> 커집니다. 혜택은 <b>현재 / 최대</b>로 표시합니다.</div>
      ${HALLS.map(h=>{
        const g=hallGrowth(h.id)*100;
        return `<div style="margin-bottom:12px">
          <div class="spread"><b style="color:${h.c}">${h.n} <span class="tiny muted">${h.h}</span></b>
            ${h.id===S.hall?'<span class="tag g">내 숙사</span>':""}</div>
          <div class="tiny" style="color:var(--jade);margin:3px 0">${benefit(h.id)}</div>
          <div class="spread tiny muted"><span>숙사 성장</span><span>${g.toFixed(0)}%</span></div>
          <div class="bar jd" style="margin-top:3px"><i style="width:${g}%"></i></div></div>`}).join("")}
      <hr class="hr">
      <div class="row"><span class="tiny muted">숙사 옮기기</span>
        ${HALLS.map(h=>`<button class="btn sm ${S.hall===h.id?"pri":""}" onclick="moveHall('${h.id}')">${h.n}</button>`).join("")}</div>
    </div>
  </div>
  <div class="card pad">
    <div class="sect-t">숙사 공헌도 순위 <span class="muted">이번 주 대항전 개인 점수</span></div>
    <table class="t">
      ${[["유스탄",4614],["시엘 발루아",3846],["하얀",3477],["위사 누",3120],["코멧",2884]]
        .map((r,i)=>`<tr><td style="width:26px">${i+1}</td><td>${r[0]} ${i===0?'<span class="tag">거울 뒤편의 주인</span>':""}</td>
        <td style="text-align:right">${nf(r[1])}</td></tr>`).join("")}
      <tr style="background:var(--s2)"><td>—</td><td><b style="color:var(--gold)">${esc(S.name)}</b></td>
        <td style="text-align:right"><b>${nf(S.war.mine||0)}</b></td></tr>
    </table>
  </div>`;
};

/* ═══════════ 연결 ═══════════ */
/* 치유·보호막 위력에 물약 효과 반영 */
const _C=C;
C=function(){ const c=_C(); c.heal=+(c.heal+mod("heal")).toFixed(2); return c; };

/* 파견 — 지역에 맞는 조제 재료와 숙사 보너스 */
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
    toast(`${matName(key)} +${amt}${add>0?` · 숙사 보정 륜 +${nf(add)}`:""}`,"good");
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
  toast(`중개소에서 즉시 팔렸습니다 · 륜 +${nf(net)} <span class="muted">(수수료 ${(feeR*100).toFixed(0)}%${hallFee()>0?`, ${HALLS.find(h=>h.id===S.hall).n} 보정`:""})</span>`,"good");
  renderTop(); renderMain(); save();
};

/* 숙사 혜택은 성장치가 바뀔 때마다 갱신 */
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
