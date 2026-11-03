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
 // 미발견 교배식·변이식은 화면에 공개하지 않습니다.
 if(c.tier==="normal")return "일반 씨앗 · 종묘점에서 구매";
 if(S.dex?.plant?.includes(c.n))return c.parents?"교배로 발견한 희귀 품종":c.from?"날씨 변이로 발견한 희귀 품종":"발견한 희귀 품종";
 return "획득 방법 미발견 · 교배 또는 변이 연구";
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
  <div class="farm-help tiny" style="margin-top:11px">작물을 상하좌우에 붙여 기르면 새로운 씨앗을 발견할 수도 있습니다. 날씨가 바뀌면 품종에 미묘한 변화가 생기기도 합니다. 조합과 확률은 공개되지 않습니다.</div>
  <div class="farm-seedbar"><span class="tiny muted">보유 씨앗 일괄 심기</span>${FARM_NORMALS.map(c=>farmSeedButton(c)).join('')}</div>
 </div>
 <div class="grid g2" style="gap:12px">
   <div class="card pad"><div class="spread"><div class="sect-t">오늘의 주문</div><span class="tiny muted">오늘의 지정 납품</span></div>
    ${oc?`<b>${oc.e} ${esc(oc.n)} ${o.need}개</b><div class="tiny muted">납품 진행 ${o.have}/${o.need} · 연등 1 · 비료 3 · 지식 80 · 경험치 300</div>
     <button class="btn sm ${!o.done&&o.have>=o.need?'pri':''}" style="margin-top:8px" ${o.done||o.have<o.need?'disabled':''} onclick="deliverOrder()">${o.done?'완료':'납품'}</button>`:''}</div>
   <div class="card pad"><div class="sect-t">날씨 · 변이 환경</div><div class="farm-discovery">${WEATHERS.map((v,i)=>`<span class="buffchip" style="${i===S.weather?'border-color:var(--gold2);color:var(--gold)':''}">${v.i} ${v.n}</span>`).join('')}</div>
      <div class="tiny muted">다음 변화까지 ${hhmm(S.wNext)} · ${w.d}</div>
      <div class="tiny muted" style="margin-top:8px">희귀 품종 수확 시 씨앗 하나를 회수합니다. 새로운 조합과 날씨 조건은 실험을 통해 발견해 보세요.</div></div>
 </div>
 <div class="card pad" style="margin-top:12px"><div class="spread"><div class="sect-t">재배 · 교배 · 변이 도감 (${S.dex?.plant?.length||0}/${CROPS.length})</div><span class="tiny muted">노멀 · 레어 · 에픽 · 전설</span></div>
  <div class="tiny muted" style="margin-bottom:8px">작물을 수확한 후 도감에 등록됩니다. 씨앗만 얻은 품종은 미등록 상태입니다.</div>${farmCatalogRows()}</div>`;
};
pickCrop=function(i){
 farmEnsure();modal(`무엇을 심을까요? · ${i+1}번 밭`, `<div class="tiny muted" style="margin-bottom:10px">모든 씨앗은 심을 때 1개 소비합니다. 일반 씨앗은 종묘점에서 구매할 수 있습니다.</div>
  <div style="max-height:55vh;overflow:auto">${CROPS.map(c=>`<div class="farm-crop-row"><div><b>${c.e} ${esc(c.n)}</b> · ${farmGrade(c)}
  <div class="farm-detail">${esc(farmGuide(c))}</div></div>${farmSeedButton(c,i)}</div>`).join('')}</div>`);
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
