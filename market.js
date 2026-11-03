"use strict";
/* 無明長夜 · 러너 중개소 / 계정 저장본 기반 서버 거래
 * 서버 RPC가 판매 등록·차감·구매·정산을 한 트랜잭션에서 처리합니다.
 * localStorage는 화면 캐시이며, 거래의 최종 기록은 Supabase입니다. */
const MARKET_TYPES={gear:"법구",potion:"물약",dish:"만두",consumable:"소모품",material:"재료",ingredient:"조제 재료"};
const MKT={listings:[],mine:[],pending:0,loaded:false,loading:false,busy:false,at:0,filter:"전체",tab:"buy",error:""};
function marketConnected(){return typeof acctIn==="function"&&acctIn()&&typeof acctOn==="function"&&acctOn()&&typeof sbOn==="function"&&sbOn();}
function marketRpc(action,data){
  if(!marketConnected())return Promise.reject(new Error("중개소는 로그인과 Supabase 연결이 필요합니다."));
  return acctFetch("rpc/market_trade",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({p_actor:ACCT.id,p_token:ACCT.tok,p_action:action,p_data:data||{}})});
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
    if(Number(result.rev||0)>Number(S.marketRev||0))marketApplyInventory(result.inventory);
    else if(!S.marketInitialized){S.marketRev=Number(result.rev||0);S.marketInitialized=true;save();}
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
    save();
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
    if(typeof acctPush==="function"){
      const ok=await acctPush(true);
      if(ok===false)throw new Error("서버에 내 최신 저장 기록을 올리지 못했습니다. 중개소에서 새로 고침한 뒤 다시 시도해 주세요.");
    }
    const r=await marketRpc(action,data);
    marketApplyInventory(r.save);
    if(action==="list")closeModal();
    toast(success||"거래가 완료되었습니다.","good");
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
  if(item.kind==="gear" && S.bag.length>=40+(S.res?.r11||0)*5)return toast("바랑이 가득 찼습니다.","bad");
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
  const canBuy=Number(S.rin)>=Number(m.price) && (kind!=="gear"||S.bag.length<40+(S.res?.r11||0)*5);
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
      ${MKT.error?`<div class="sub tiny" style="color:var(--red)">연결/SQL 확인: ${esc(MKT.error)}</div>`:""}
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
setInterval(()=>{if(S?.made&&marketConnected()&&!MKT.busy&&!MKT.error)marketFetch(false);},45000);
