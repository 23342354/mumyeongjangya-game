"use strict";
/* 無明長夜 · 떠돌이 상인 / 서버 공용 정시 입찰
 * 매시 00~15분 KST: 세 가지 귀속 법구가 모든 러너에게 공통으로 등장합니다.
 * 입찰, 환불, 낙찰 수령은 Supabase 함수가 원자적으로 처리합니다.
 * 로컬 가상 NPC 입찰/임의 개시/임의 마감 기능은 비활성화합니다. */
const LIVE_AUCTION={data:null,loading:false,busy:false,at:0,error:"",offset:0};
function auctionConnected(){return typeof marketConnected==="function" && marketConnected();}
function auctionRpc(action,lot,expected,request){
  if(!auctionConnected())return Promise.reject(new Error("실제 경매는 계정 로그인 및 Supabase 연결이 필요합니다."));
  return acctFetch("rpc/wandering_auction",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({p_actor:ACCT.id,p_token:ACCT.tok,p_action:action,
      p_lot_id:lot===undefined?null:lot,p_expected:expected===undefined?null:expected,p_request:request||""})});
}
function auctionMessage(e){
  const s=String(e?.message||e||"오류");
  try{const o=JSON.parse(s);return String(o.message||o.details||s).slice(0,180);}
  catch(_){return s.slice(0,180);}
}
function auctionNow(){return Date.now()+LIVE_AUCTION.offset;}
function auctionDeadlineText(iso){
  const secs=Math.max(0,Math.ceil((Date.parse(iso)-auctionNow())/1000));
  const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60),s=secs%60;
  return `${h?h+":":""}${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function auctionClock(){
  if(VIEW!=="merchant")return;
  document.querySelectorAll("[data-auction-until]").forEach(el=>{
    const iso=el.getAttribute("data-auction-until");
    el.textContent=auctionDeadlineText(iso);
  });
  const live=LIVE_AUCTION.data?.live||[];
  if(live.some(l=>Date.parse(l.ends_at)<=auctionNow())&&Date.now()-LIVE_AUCTION.at>3000)
    auctionFetch(true);
}
async function auctionFetch(force=false){
  if(!auctionConnected()){LIVE_AUCTION.data=null;return;}
  if(LIVE_AUCTION.loading||(!force&&Date.now()-LIVE_AUCTION.at<8000))return;
  LIVE_AUCTION.loading=true;
  try{
    const r=await auctionRpc("snapshot");
    if(!r||r.ok!==true)throw new Error("경매 정보 응답을 확인할 수 없습니다.");
    LIVE_AUCTION.offset=Date.parse(r.server_at)-Date.now();
    LIVE_AUCTION.data=r;
    LIVE_AUCTION.error="";
    LIVE_AUCTION.at=Date.now();
    // 다른 러너가 내 최고가를 넘어서면 서버가 보증금을 반환하며 revision이 증가합니다.
    if(Number(r.rev||0)>Number(S?.marketRev||0)&&r.inventory&&typeof marketApplyInventory==="function")
      marketApplyInventory(r.inventory);
    if(VIEW==="merchant")renderMain(true);
    if(VIEW==="plaza"&&typeof plazaActivityRefresh==="function")plazaActivityRefresh();
  }catch(e){
    LIVE_AUCTION.error=auctionMessage(e);LIVE_AUCTION.at=Date.now();
    if(VIEW==="merchant")renderMain(true);
  }finally{LIVE_AUCTION.loading=false;}
}
function auctionRequestId(){
  return typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"
    ?crypto.randomUUID():"b"+Date.now().toString(36)+Math.random().toString(36).slice(2,12);
}
async function auctionCommit(action,lotId,expected){
  if(LIVE_AUCTION.busy)return;
  if(!auctionConnected())return toast("계정에 로그인하고 공용 경매 서버를 연결해 주세요.","bad");
  if(typeof PAIR_PLAY!=="undefined"&&PAIR_PLAY.busy)return toast("페어 공동 기록을 먼저 반영해 주세요.","bad");
  LIVE_AUCTION.busy=true;
  try{
    // 현재 게임 상태를 안전하게 저장한 다음 서버 트랜잭션을 실행합니다.
    if(typeof acctPush==="function"){
      const ok=await acctPush(true);
      if(ok===false)throw new Error("서버에 캐릭터 기록을 저장하지 못했습니다. 저장 상태를 확인해 주세요.");
    }
    const r=await auctionRpc(action,Number(lotId),expected,auctionRequestId());
    if(!r||r.ok!==true)throw new Error("경매 처리 결과를 확인할 수 없습니다.");
    LIVE_AUCTION.at=0;
    // 입찰과 환불, 법구 수령은 서버 잔고를 기준으로 반영합니다.
    if(r.inventory&&Number(r.rev||0)>Number(S?.marketRev||0))marketApplyInventory(r.inventory);
    if(typeof PAIR_PLAY!=="undefined"&&PAIR_PLAY.ready)await PAIR_PLAY.refresh();
    toast(action==="bid"?"공용 경매에 입찰했습니다. 다른 러너가 더 높은 값을 제시하면 륜이 자동 반환됩니다.":"낙찰품을 바랑에 수령했습니다.","good");
    await auctionFetch(true);
    renderTop();renderNav();renderMain(true);
  }catch(e){
    toast("경매 처리 실패 · "+esc(auctionMessage(e)),"bad");
    await auctionFetch(true);
  }finally{LIVE_AUCTION.busy=false;}
}
function auctionPlaceBid(id,expected){
  const lot=LIVE_AUCTION.data?.live?.find(x=>Number(x.id)===Number(id));
  if(!lot)return toast("경매 목록을 새로 고쳐 주세요.","bad");
  if(lot.mine)return toast("이미 최고 입찰자입니다.");
  if(Number(lot.bid_amount)!==Number(expected))return toast("가격이 달라졌습니다. 다시 확인해 주세요.","bad");
  const step=Math.max(500,Math.ceil(Number(lot.bid_amount||0)*.1));
  const price=Number(lot.bid_amount)>0?Number(lot.bid_amount)+step:Number(lot.start_price);
  if(Number(S.rin)<price)return toast("륜이 부족합니다.","bad");
  if(!confirm(`「${lot.item_name}」에 ${nf(price)}륜을 입찰할까요? 최고가인 동안 보증금으로 맡겨집니다.`))return;
  auctionCommit("bid",id,Number(expected));
}
function auctionClaim(id){auctionCommit("claim",id,null);}
function auctionTierName(t){return ({1:"신입생",2:"중급생",3:"상급생"})[Number(t)]||"경매";}
function auctionViewTime(iso){
  const t=Date.parse(iso);return Number.isFinite(t)?new Date(t).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Seoul"}):"";
}
VIEWS.merchant=()=>{
  const d=LIVE_AUCTION.data;
  const headHTML=head("서버 공용 경매 · 매시 정각 개장",ic("luggage")+" 떠돌이 상인","낙찰품 귀속 · <b>륜</b> 입찰");
  if(!auctionConnected())return headHTML+`<div class="card pad"><div class="sect-t">계정 및 경매 서버 연결 필요</div><div class="tiny muted">실제 러너들과 겨루는 공용 경매입니다. 계정에 로그인하고, 운영진이 제공한 Supabase 공용 경매 설치 SQL을 적용해야 이용할 수 있습니다. 개인 가상 입찰은 제공하지 않습니다.</div></div>`;
  if(!d)return headHTML+`<div class="card pad"><b>${LIVE_AUCTION.error?"경매 서버를 확인할 수 없습니다.":"경매 목록을 불러오는 중입니다."}</b>
    <div class="tiny muted" style="margin:9px 0">${LIVE_AUCTION.error?esc(LIVE_AUCTION.error):"매시 00~15분에 실시간 경매가 열립니다."}</div>
    <button class="btn sm pri" onclick="auctionFetch(true)">다시 불러오기</button></div>`;
  const live=Array.isArray(d.live)?d.live:[];
  const pend=Array.isArray(d.pending)?d.pending:[];
  const hist=Array.isArray(d.history)?d.history:[];
  return headHTML+`
   <div class="card pad" style="margin-bottom:13px">
     <div class="spread" style="gap:10px;flex-wrap:wrap"><div><b>매시 00분 ~ 15분</b> <span class="tag g">실제 러너 입찰</span>
       <div class="tiny muted" style="margin-top:5px">모든 러너에게 같은 세 개의 법구가 공개됩니다. 서버 시각 기준으로 마감되며, 끝나기 직전 입찰에는 제한적으로 시간이 연장됩니다.</div></div>
       <button class="btn sm" onclick="auctionFetch(true)">↻ 입찰 현황 갱신</button></div>
     <div class="tiny muted" style="margin-top:8px">보유 륜 <b style="color:var(--gold)">${nf(S.rin)}</b> · 최고가 입찰 시 전액 보관 · 다른 러너가 입찰하면 자동 환불 · 낙찰 뒤 직접 수령</div>
   </div>
   ${LIVE_AUCTION.error?`<div class="tiny" style="color:var(--red);margin-bottom:12px">${esc(LIVE_AUCTION.error)}</div>`:""}
   ${live.length?`<div class="grid g3" style="margin-bottom:14px">${live.map(l=>{
       const item=l.item_data||{},G=GRADES[item.grade]||GRADES[2];
       const mine=l.mine,step=Math.max(500,Math.ceil(Number(l.bid_amount||0)*.1));
       const need=Number(l.bid_amount)>0?Number(l.bid_amount)+step:Number(l.start_price);
       const can=!mine&&Number(S.rin)>=need&&!LIVE_AUCTION.busy;
       return `<article class="card pad auction-lot"><div class="spread"><span class="tag j">${auctionTierName(l.tier)} 경매</span><span class="tiny muted">${Number(l.bid_count||0)}회 입찰</span></div>
        <h3 style="color:${G.c};margin:10px 0 4px">${esc(l.item_name)}</h3>
        <div class="tiny muted">${GRADES[item.grade]?.n||"희귀"} · Lv ${Number(item.lv||1)} · ${SLOTS.find(x=>x.k===item.slot)?.n||"법구"} · 귀속</div>
        <div class="tiny" style="color:var(--jade);margin:8px 0;min-height:42px">${gearLine(item)}</div>
        <div class="spread tiny" style="margin-bottom:5px"><span class="muted">현재 최고가</span><b style="color:var(--gold);font-size:18px">${nf(Number(l.bid_amount)||Number(l.start_price))}륜</b></div>
        <div class="spread tiny"><span class="muted">최고 입찰자</span><span>${mine?"나 (최고가)":esc(l.winner_name||"아직 없음")}</span></div>
        <div class="spread tiny" style="margin:9px 0"><span class="muted">마감까지</span><b style="color:var(--gold)" data-auction-until="${esc(l.ends_at)}">${auctionDeadlineText(l.ends_at)}</b></div>
        <button class="btn ${can?"pri":""}" style="width:100%" ${can?"":"disabled"} onclick="auctionPlaceBid(${Number(l.id)},${Number(l.bid_amount)})">${mine?"현재 최고 입찰자":`입찰 · ${nf(need)}륜`}</button>
        ${!mine&&!can?'<div class="tiny muted" style="margin-top:6px">보유 륜 또는 서버 반영 상태를 확인해 주세요.</div>':""}
       </article>`}).join("")}</div>`:
     `<div class="card pad" style="margin-bottom:14px"><div class="sect-t">지금은 다음 경매를 준비하고 있습니다.</div>
       <div>다음 개장까지 <b style="color:var(--gold)" data-auction-until="${esc(d.next_at)}">${auctionDeadlineText(d.next_at)}</b></div>
       <div class="tiny muted" style="margin-top:7px">다음 개장: ${auctionViewTime(d.next_at)} (한국 시간) · 접속한 모든 러너가 동시에 경쟁합니다.</div></div>`}
   ${pend.length?`<div class="card pad" style="margin-bottom:14px"><div class="sect-t">낙찰품 수령 대기 · ${pend.length}점</div>
     ${pend.map(p=>`<div class="spread auction-pending"><div><b>${esc(p.item_name)}</b>
       <div class="tiny muted">${auctionTierName(p.tier)} · 최종 ${nf(p.bid_amount)}륜</div></div>
       <button class="btn sm pri" ${LIVE_AUCTION.busy?"disabled":""} onclick="auctionClaim(${Number(p.id)})">바랑에 수령</button></div>`).join("")}</div>`:""}
   <div class="card pad"><div class="spread" style="gap:12px"><div class="sect-t" style="margin:0">최근 낙찰 결과</div><span class="tiny muted">서버 공동 기록</span></div>
      ${hist.length?hist.map(p=>`<div class="spread auction-history tiny"><span><b>${esc(p.item_name)}</b>
          <span class="muted"> · ${esc(p.winner_name||"낙찰자 없음")}</span></span>
          <b>${Number(p.bid_amount)>0?nf(p.bid_amount)+"륜":"유찰"}</b></div>`).join(""):
        '<div class="tiny muted" style="margin-top:8px">아직 종료된 경매가 없습니다.</div>'}
   </div>`;
};
// 이전 단독 경매는 플레이어별 가짜 응찰자/임의 마감을 만들었으므로 비활성화합니다.
aucTick=function(){};
aucOpen=function(){toast("공용 경매는 한국 시간 매시 정각에 자동 개장합니다.");};
aucClose=function(){toast("공용 경매는 서버 시각에 따라 자동 마감됩니다.");};
const _auctionGo=go;
go=function(v){_auctionGo(v);if(v==="merchant")auctionFetch(true);};
setInterval(()=>{
  if(!S?.made||!auctionConnected())return;
  if(VIEW==="merchant"){auctionClock();auctionFetch(false);}
  else if(VIEW==="plaza"&&Date.now()-LIVE_AUCTION.at>30000)auctionFetch(false);
},1000);
