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
   <div class="row" style="margin-top:9px"><button class="btn sm ${can?'pri':''}" ${can?'':'disabled'} onclick="cook('${d.id}')">만두 1개 빚기</button><button class="btn sm" ${(S.kit.have[d.id]||0)>0?'':'disabled'} onclick="eat('${d.id}')">먹기 (${S.kit.have[d.id]||0})</button></div></div>`;
 }).join('');
 const stock=(["뿌리","약초","꽃","열매","어물"]).map(cat=>{
  const rows=Object.entries(S.ingredients).filter(([name,num])=>num>0&&((CROPS.find(x=>x.n===name)?.y||FISHES.find(x=>x.n===name)?.y)===cat));
  return `<div class="sub"><b>${cat}</b><div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px">${rows.length?rows.map(([n,v])=>`<span class="buffchip">${esc(n)} ×${nf(v)}</span>`).join(''):'<span class="tiny muted">보유 재료 없음</span>'}</div></div>`;
 }).join('');
 return head('삼장 선생님의 만두 주방',ic('dumpling')+' 만두 식당',`만두 ${Object.values(S.kit.have||{}).reduce((a,b)=>a+(Number(b)||0),0)}개 · 도감 ${S.dex?.dish?.length||0}/${DISHES.length}`)+`
 <div class="card pad" style="margin-bottom:12px"><div class="sect-t">개별 속재료로 빚는 만두</div>
 <div class="tiny muted">레어·에픽·전설 작물이나 드문 어종을 요구하는 만두일수록 효과가 강해집니다. 재료는 실제 품종별로 소모합니다.</div>
 <div class="row" style="gap:5px;margin-top:10px;flex-wrap:wrap">${fills.map(f=>`<button class="btn sm ${DUMPLING_FILL===f?'pri':''}" onclick="DUMPLING_FILL='${f}';renderMain()">${f==='전체'?'전체':f}</button>`).join('')}</div></div>
 <div class="grid g2" style="margin-bottom:12px"><div class="card pad"><div class="sect-t">지금 먹은 만두</div>${slot('eat','든든한 만두')}${slot('dess','달콤한 만두')}</div>
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

/* 브라우저 알림은 보안 컨텍스트(HTTPS 또는 localhost)에서만 가능.
   탭이 열린 동안 배경 새 소식에 한하여 표시. */
let BROWSER_NOTIFY11=false;
try{BROWSER_NOTIFY11=localStorage.getItem('samu-notify-browser-v1')==='yes';}catch(e){}
function browserNotifyStatus11(){
 const url=String((window.MMJY_CONFIG||{}).supabaseUrl||'');
 if(url&&url.startsWith('http://'))return 'Supabase 연결 주소가 HTTP입니다. config.js에서 HTTPS 연결 주소를 사용하세요.';
 if(!window.isSecureContext)return 'HTTPS 보안 연결이 아니어서 브라우저 알림을 사용할 수 없습니다.';
 if(!('Notification' in window))return '이 브라우저는 데스크톱 알림을 지원하지 않습니다.';
 return Notification.permission==='granted'?'브라우저 알림 사용 가능':Notification.permission==='denied'?'브라우저에서 알림 권한이 차단되어 있습니다. 사이트 권한에서 변경해 주세요.':'알림 권한을 요청할 수 있습니다.';
}
async function browserNotifyEnable11(){
 if(!window.isSecureContext){toast('HTTPS 주소로 접속해야 브라우저 알림을 켤 수 있습니다.','bad');return;}
 if(!('Notification' in window)){toast('지원하지 않는 브라우저입니다.','bad');return;}
 const permission=await Notification.requestPermission();
 BROWSER_NOTIFY11=permission==='granted';
 try{localStorage.setItem('samu-notify-browser-v1',BROWSER_NOTIFY11?'yes':'no');}catch(e){}
 toast(BROWSER_NOTIFY11?'브라우저 알림을 켰습니다.':'알림 권한이 허용되지 않았습니다.',BROWSER_NOTIFY11?'good':'bad');
 drawAlerts();
}
function browserNotifyDisable11(){BROWSER_NOTIFY11=false;try{localStorage.setItem('samu-notify-browser-v1','no');}catch(e){}drawAlerts();}
const _alertPush11=alertPush;
alertPush=function(cat,t,view){
 _alertPush11(cat,t,view);
 if(!BROWSER_NOTIFY11||!document.hidden||!window.isSecureContext||!('Notification' in window)||Notification.permission!=='granted')return;
 try{
  const n=new Notification('無明長夜 · '+(ALERTCATS.find(c=>c.k===cat)?.n||'소식'),{body:String(t).slice(0,160),icon:'favicon.png',tag:'samu-'+(cat||'etc')});
  n.onclick=()=>{window.focus();try{n.close();}catch(e){} if(view&&VIEWS[view])go(view);};
 }catch(e){}
};
const _drawAlerts11=drawAlerts;
drawAlerts=function(){
 _drawAlerts11();
 const target=document.querySelector('.modal .mbody');
 if(!target)return;
 const div=document.createElement('div');div.className='sub';div.style.marginTop='12px';
 div.innerHTML=`<div class="spread"><div><b>브라우저 알림</b><div class="tiny muted">${browserNotifyStatus11()}<br>사이트 탭이 열려 있을 때 배경에서 들어오는 새 소식을 알려 줍니다.</div></div>
 <button class="btn sm ${BROWSER_NOTIFY11?'':'pri'}" onclick="${BROWSER_NOTIFY11?'browserNotifyDisable11()':'browserNotifyEnable11()'}">${BROWSER_NOTIFY11?'끄기':'알림 허용'}</button></div>`;
 target.appendChild(div);
};
const _boot11=boot;
boot=function(){_boot11();ensureFarmItems11();};
