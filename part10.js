/* ═══════════════════════════════════════════════════
   여와의 상점 개편 · 말랑이/영혼 인형 도감
   ═══════════════════════════════════════════════════ */

const YOWA_DUMPLINGS=[
 {n:"여와",img:"assets/yowa-dumplings/01.png"},
 {n:"우건하",img:"assets/yowa-dumplings/02.png"},
 {n:"류쉬안",img:"assets/yowa-dumplings/03.png"},
 {n:"킨",img:"assets/yowa-dumplings/04.png"},
 {n:"르셀리아",img:"assets/yowa-dumplings/05.png"},
 {n:"오즈",img:"assets/yowa-dumplings/06.png"},
 {n:"타다시",img:"assets/yowa-dumplings/07.png"},
 {n:"지영원",img:"assets/yowa-dumplings/08.png"},
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
 {n:"렌야",img:"assets/yowa-dolls/10.png"},
 {n:"오즈",img:"assets/yowa-dolls/11.png"},
 {n:"건하",img:"assets/yowa-dolls/12.png"},
 {n:"작은요우",img:"assets/yowa-dolls/13.png"},
 {n:"킨",img:"assets/yowa-dolls/14.png"},
 {n:"사쿠",img:"assets/yowa-dolls/15.png"},
 {n:"영원",img:"assets/yowa-dolls/16.png"},
 {n:"레이",img:"assets/yowa-dolls/17.png"},
 {n:"류쉬안",img:"assets/yowa-dolls/18.png"},
];
const YOWA_DEX_REWARD_GROUPS={plush:"agi",doll:"res"};
const YOWA_SPECIALS=[
 {id:"aidbox",n:"구급상자",price:20,kind:"hp",amt:20,
  art:'🧰',
  desc:"어떤 상황에서라도 사용할 수 있게 꾸린 구급상자입니다. 사용 즉시 체력을 20 회복합니다."},
 {id:"sedative",n:"안정제",price:20,kind:"sn",amt:10,
  art:'🧪',
  desc:"우유처럼 하얀 액체가 든 병입니다. 사용 즉시 이성을 10 회복합니다."},
 {id:"plush",n:"누군가를 닮은 만두 말랑이",price:30,kind:"plush",
  img:YOWA_DUMPLINGS[0].img,
  desc:"구매 즉시 압축 파일의 이미지 가운데 하나가 무작위로 등장합니다. 발견한 모습은 말랑이 도감에 등록되며, 도감 수집 보너스가 적용됩니다."},
 {id:"doll",n:"누군가의 영혼을 담은 인형",price:300,kind:"doll",
  img:YOWA_DOLLS[10].img,
  desc:"구매 즉시 영혼 인형 이미지 가운데 하나가 무작위로 등장합니다. 발견한 모습은 영혼 인형 도감에 등록되며, 도감 수집 보너스가 적용됩니다."},
];

function ensureV10(){
  if(!S||!S.made) return;
  if(!S.dex) S.dex={mon:[],plant:[],fish:[],dish:[],title:[],wards:[]};
  if(!Array.isArray(S.dex.plush)) S.dex.plush=[];
  if(!Array.isArray(S.dex.doll)) S.dex.doll=[];
  if(!S.yowa) S.yowa={last:null};
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

function yowaCardArt(item){
  if(item.img) return `<img src="${item.img}" alt="${esc(item.n)}" style="width:80px;height:80px;object-fit:contain;image-rendering:auto;filter:drop-shadow(0 4px 10px #0008)">`;
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
  let msg=`${item.n} 구매 완료`;
  if(item.kind==="hp"){
    S.hp=Math.min(100,S.hp+(item.amt||0));
    msg=`${item.n} 사용 · 체력 +${item.amt}`;
    toast(msg,"good");
  }else if(item.kind==="sn"){
    S.sn=Math.min(100,S.sn+(item.amt||0));
    msg=`${item.n} 사용 · 이성 +${item.amt}`;
    toast(msg,"good");
  }else if(item.kind==="plush"){
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
    yowaRevealModal("누군가의 영혼을 담은 인형",got,isNew,"영혼 인형 도감",`영혼 인형 도감 ${(S.dex.doll||[]).length} / ${YOWA_DOLLS.length}`);
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
    <div class="grid g4">${YOWA_SPECIALS.map(yowaSpecialCard).join("")}</div>
  </div>
  <div class="grid g4" style="margin-bottom:14px">
    ${MART.map(m=>{
      const lock=m.req&&S.course<m.req;
      const u=used(m.id), out=m.per!=="ever"&&u>=m.lim;
      const costTxt=Object.keys(m.cost).map(k=>`${({rin:"륜",lotus:"연등",sari:"사리"})[k]} ${nf(m.cost[k])}`).join(" · ");
      return `<div class="sub" style="${lock?"opacity:.45":""}">
        <div class="spread"><b>${m.n}</b>${m.per!=="ever"?`<span class="tiny muted">${u} / ${m.lim}</span>`:""}</div>
        <div class="tiny muted" style="margin:5px 0 8px;min-height:36px">${m.d}</div>
        ${lock?`<div class="tag">${m.req}과정부터</div>`
          :`<button class="btn sm ${out?"":"pri"}" ${out?"disabled":""} onclick="martBuy('${m.id}')">${out?"오늘 끝":`구매 · ${costTxt}`}</button>`}
      </div>`}).join("")}
  </div>
  <div class="card pad">
    <div class="sect-t">소모품 · 탕약</div>
    <div class="grid g4">
      ${SHOP.map(p=>`<div class="sub">
        <div class="spread"><b>${p.n}</b>${p.tag?`<span class="tag">${p.tag}</span>`:""}</div>
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
