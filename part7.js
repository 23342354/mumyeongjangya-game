"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 7
   로그인 (아이디 + 비밀번호)

   · 캐릭터를 계정에 묶어 서버에 보관합니다. 쿠키를 지우거나
     휴대폰으로 옮겨도 아이디만 알면 이어서 할 수 있습니다.
   · 공유 기록(Supabase)이 연결됐을 때만 동작합니다.
     연결 전에는 예전처럼 이 브라우저에만 저장되는 혼자 모드입니다.

   ※ 열쇠가 페이지에 실려 있는 구조라, 이 로그인은 「이름표에 자물쇠를
      다는 것」에 가깝습니다. 서로 믿는 커뮤니티 안에서 쓰는 용도입니다.
   ═══════════════════════════════════════════════════ */

/* ── 한 번만 도는 기록 초기화 ───────────────────────
   날짜를 바꾸면 러너 전원이 다음 접속 때 한 번 더 비워집니다. */
const WIPEKEY="mmjy_wipe", WIPEV="2026-11-02";
(function(){
  try{
    if(localStorage.getItem(WIPEKEY)!==WIPEV){
      localStorage.removeItem(SAVEKEY);
      localStorage.removeItem("mmjy_acct");
      localStorage.setItem(WIPEKEY, WIPEV);
    }
  }catch(e){}
})();

/* ── SHA-256 (브라우저 기능이 막힌 곳에서도 돌도록 직접 구현) ── */
const SHA_K=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,
3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,
4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,
2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,
1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,
3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,
1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,
3204031479,3329325298];
function sha256(msg){
  const rr=(x,n)=>(x>>>n)|(x<<(32-n));
  const bytes=new TextEncoder().encode(msg);
  const L=bytes.length, bl=L*8;
  const total=(((L+9)+63)>>6)<<6;
  const b=new Uint8Array(total); b.set(bytes); b[L]=0x80;
  new DataView(b.buffer).setUint32(total-4, bl>>>0, false);
  new DataView(b.buffer).setUint32(total-8, Math.floor(bl/4294967296), false);
  let H=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];
  const w=new Int32Array(64), dv=new DataView(b.buffer);
  for(let i=0;i<total;i+=64){
    for(let t=0;t<16;t++) w[t]=dv.getUint32(i+t*4,false);
    for(let t=16;t<64;t++){
      const s0=rr(w[t-15],7)^rr(w[t-15],18)^(w[t-15]>>>3);
      const s1=rr(w[t-2],17)^rr(w[t-2],19)^(w[t-2]>>>10);
      w[t]=(w[t-16]+s0+w[t-7]+s1)|0;
    }
    let [a,bb,c,d,e,f,g,h]=H;
    for(let t=0;t<64;t++){
      const S1=rr(e,6)^rr(e,11)^rr(e,25), ch=(e&f)^(~e&g);
      const t1=(h+S1+ch+SHA_K[t]+w[t])|0;
      const S0=rr(a,2)^rr(a,13)^rr(a,22), maj=(a&bb)^(a&c)^(bb&c);
      const t2=(S0+maj)|0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=bb; bb=a; a=(t1+t2)|0;
    }
    H=[(H[0]+a)|0,(H[1]+bb)|0,(H[2]+c)|0,(H[3]+d)|0,(H[4]+e)|0,(H[5]+f)|0,(H[6]+g)|0,(H[7]+h)|0];
  }
  return H.map(x=>(x>>>0).toString(16).padStart(8,"0")).join("");
}
function acctHash(id, pw){ return sha256("무명장야|"+String(id).toLowerCase()+"|"+pw); }

/* ── 서버 (S 가 아직 없을 수도 있어 설정을 직접 읽습니다) ── */
function acctCfg(){
  const CF=window.MMJY_CONFIG||{};
  let url=String(CF.supabaseUrl||""), key=String(CF.supabaseKey||"");
  if((!url||!key) && typeof S!=="undefined" && S && S.sb){ url=url||S.sb.url||""; key=key||S.sb.key||""; }
  /* 배포 중 config.js가 덮여도 이 기기의 마지막 공유 설정으로 로그인 복구.
     공개 anon 키와 URL만 사용하며 계정 토큰이나 비밀번호는 이 경로로 노출하지 않음. */
  if(!url||!key){
    try{
      const previous=JSON.parse(localStorage.getItem(SAVEKEY)||"null");
      const sb=previous&&previous.sb;
      if(sb && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(sb.url||""))){
        url=url||String(sb.url||"");
        key=key||String(sb.key||"");
      }
    }catch(_){}
  }
  return {url:url.replace(/\/+$/,""), key};
}
function acctOn(){ const c=acctCfg(); return !!(c.url && c.key); }
function acctFetch(path, opt){
  const c=acctCfg();
  const o=Object.assign({}, opt||{});
  o.headers=Object.assign({apikey:c.key, Authorization:"Bearer "+c.key}, o.headers||{});
  return fetch(c.url+"/rest/v1/"+path, o).then(async r=>{
    const t=await r.text();
    if(!r.ok) throw new Error(t.slice(0,180)||("HTTP "+r.status));
    return t?JSON.parse(t):[];
  });
}

/* ── 로그인 상태 ─────────────────────────────────── */
const ACCTKEY="mmjy_acct";
let ACCT={id:"", tok:""};
(function(){ try{ const r=localStorage.getItem(ACCTKEY); if(r) ACCT=JSON.parse(r)||ACCT; }catch(e){} })();
function acctStore(){ try{ localStorage.setItem(ACCTKEY, JSON.stringify(ACCT)); }catch(e){} }
function acctClear(){ ACCT={id:"",tok:""}; try{ localStorage.removeItem(ACCTKEY); }catch(e){} }
function acctIn(){ return !!(ACCT.id && ACCT.tok); }

/* 명부·채팅·방에서 쓰는 식별자를 계정 아이디로 고정합니다 */
if(typeof ensureV6==="function"){
  const _ensureAcct=ensureV6;
  ensureV6=function(){ _ensureAcct(); if(acctIn() && S && S.sb) S.sb.id=ACCT.id; };
}

/* ── 저장본을 서버에 보관 / 되찾기 ───────────────── */
/* 계정 원본 표는 공개하지 않습니다. 보안 RPC가 해시를 확인한 뒤 저장본만 전달합니다. */
function acctRpc(action,args){
  return acctFetch('rpc/mm_account_'+action,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)});
}
let PUSHAT=0, PUSHBUSY=false, PUSHWAIT=Promise.resolve(), PUSHERROR=null;
function acctPush(force){
  if(!acctIn() || !acctOn()) return Promise.resolve(false);
  if(PUSHBUSY) return force?PUSHWAIT.then(()=>acctPush(true)):PUSHWAIT;
  if(typeof S==="undefined" || !S || !S.made) return Promise.resolve(false);
  const now=Date.now();
  if(!force && now-PUSHAT < 5*60*1000) return Promise.resolve(true);
  PUSHAT=now; PUSHBUSY=true; PUSHERROR=null;
  let blob=null;
  try{ blob=JSON.parse(JSON.stringify(S)); }catch(e){ PUSHBUSY=false; return Promise.resolve(false); }
  PUSHWAIT=acctRpc('save',{p_id:ACCT.id,p_token:ACCT.tok,p_save:blob,p_name:S.name||''})
  .then(result=>{
    if(!result || !result.ok) throw new Error('계정 저장을 확인하지 못했습니다.');
    return true;
  }).catch(e=>{
    PUSHERROR=e;
    if(force && typeof VIEW!=="undefined" && VIEW==="market" && typeof toast==="function")
      toast("저장본 동기화 필요 · 중개소 매물 새로 고침을 먼저 눌러 주세요.","bad");
    return false;
  }).finally(()=>{PUSHBUSY=false;});
  return PUSHWAIT;
}
function acctPull(){
  return acctRpc('login',{p_id:ACCT.id,p_token:ACCT.tok})
    .then(row=>row&&row.save||null);
}

/* ── 로그인 화면 ─────────────────────────────────── */
let GATEMODE="login", GATEMSG="";
function gateMsg(t, bad){ GATEMSG = t ? `<div class="tiny" style="margin-top:10px;color:${bad?"var(--red)":"var(--ok)"}">${esc(t)}</div>` : ""; }
function gateShow(mode){
  if(mode) { GATEMODE=mode; GATEMSG=""; }
  const up = GATEMODE==="signup";
  document.body.classList.add("auth-gate");
  $("#topbar").innerHTML=`<div class="tb1"><div class="logo logo-top" title="無明長夜"></div>
    <div><div class="me-name">無明長夜</div><div class="me-sub">사신무기전문학교 명계지부</div></div></div>`;
  $("#navcol").innerHTML=""; $("#chatcol").innerHTML="";
  document.body.classList.remove("mobile-game","mobile-chat-open");
  MOBILE_CHAT_OPEN=false;
  $("#main").innerHTML=`<div class="card pad" style="max-width:420px;margin:0 auto;padding:30px 24px">
    <div class="logo logo-big" title="無明長夜" style="width:190px;height:112px"></div>
    <div class="page-kicker" style="text-align:center">無明長夜</div>
    <h1 class="page" style="font-size:21px;text-align:center;margin-bottom:4px">
      ${up?"처음 오셨군요":"다시 오셨군요"}</h1>
    <div class="tiny muted" style="text-align:center;margin-bottom:18px">
      ${up?"아이디를 정하면 그 이름으로 기록이 남습니다."
         :"아이디로 들어오면 키우던 캐릭터가 따라옵니다."}</div>

    <label class="f">아이디</label>
    <input id="g_id" maxlength="20" autocomplete="username" placeholder="영문·숫자 4~20자"
      style="width:100%" onkeydown="if(event.key==='Enter')$('#g_pw').focus()">
    <label class="f" style="margin-top:10px">비밀번호</label>
    <input id="g_pw" type="password" maxlength="60" placeholder="4자 이상"
      autocomplete="${up?"new-password":"current-password"}" style="width:100%"
      onkeydown="if(event.key==='Enter')${up?"gateSignUp()":"gateLogin()"}">
    ${up?`<label class="f" style="margin-top:10px">비밀번호 확인</label>
    <input id="g_pw2" type="password" maxlength="60" style="width:100%"
      onkeydown="if(event.key==='Enter')gateSignUp()">`:""}
    ${GATEMSG}
    <button class="btn pri" style="width:100%;margin-top:16px" id="g_go"
      onclick="${up?"gateSignUp()":"gateLogin()"}">${up?"가입하고 입학하기":"들어가기"}</button>
    <div class="tiny muted" style="text-align:center;margin-top:12px">
      ${up?`이미 아이디가 있으신가요? <a href="#" onclick="gateShow('login');return false">로그인</a>`
         :`아직 아이디가 없으신가요? <a href="#" onclick="gateShow('signup');return false">가입하기</a>`}
    </div>
    <div class="tiny muted" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">
      비밀번호는 그대로 저장되지 않고 섞어서 보관합니다. 다만 이 사이트는 서로 아는 사람끼리
      쓰는 용도라, 중요한 곳에 쓰는 비밀번호는 넣지 마세요.
    </div>
  </div>`;
  setTimeout(()=>{ const e=$("#g_id"); if(e) e.focus(); },30);
}
function gateBusy(on, label){
  const b=$("#g_go"); if(!b) return;
  b.disabled=!!on; b.textContent = on ? (label||"확인하는 중…")
    : (GATEMODE==="signup"?"가입하고 입학하기":"들어가기");
}
function gateVals(){
  return { id:($("#g_id")?$("#g_id").value:"").trim().toLowerCase(),
           pw:($("#g_pw")?$("#g_pw").value:""),
           pw2:($("#g_pw2")?$("#g_pw2").value:"") };
}
function gateSignUp(){
  const v=gateVals();
  if(!/^[a-z0-9_]{4,20}$/.test(v.id)){ gateMsg("아이디는 영문 소문자·숫자·밑줄 4~20자로 적어 주세요.",1); return gateShow(); }
  if(v.pw.length<4){ gateMsg("비밀번호는 4자 이상으로 적어 주세요.",1); return gateShow(); }
  if(v.pw!==v.pw2){ gateMsg("비밀번호 확인이 다릅니다.",1); return gateShow(); }
  gateBusy(true,"아이디 확인 중…");
  acctRpc('register',{p_id:v.id,p_token:acctHash(v.id,v.pw)})
    .then(()=>{
      ACCT={id:v.id,tok:acctHash(v.id,v.pw)};acctStore();
      try{localStorage.removeItem(SAVEKEY);}catch(e){}
      acctBoot(null);
    })
    .catch(e=>{gateBusy(false);gateMsg(String(e.message||'회원가입에 실패했습니다.').slice(0,160),1);gateShow();});
}
function gateLogin(){
  const v=gateVals();
  if(!v.id || !v.pw){ gateMsg("아이디와 비밀번호를 적어 주세요.",1); return gateShow(); }
  gateBusy(true);
  acctRpc('login',{p_id:v.id,p_token:acctHash(v.id,v.pw)})
    .then(row=>{
      ACCT={id:v.id,tok:acctHash(v.id,v.pw)};acctStore();
      acctBoot(row.save||null);
    })
    .catch(e=>{gateBusy(false);gateMsg('아이디나 비밀번호를 확인해 주세요.',1);gateShow();});
}
/* 저장본을 자리에 앉히고 게임을 시작합니다 */
const OLDHALL={h1:"dorm",h2:"dorm",h3:"dorm",h4:"dorm"};
function acctBoot(blob){
  if(blob && OLDHALL[blob.hall]) blob.hall=OLDHALL[blob.hall];   // 옛 숙사 → 기숙사
  try{
    if(blob && blob.made){ blob.sb=blob.sb||{}; blob.sb.id=ACCT.id;
      localStorage.setItem(SAVEKEY, JSON.stringify(blob)); }
    else localStorage.removeItem(SAVEKEY);
  }catch(e){}
  initGame();
  if(blob && blob.made) toast(`${esc(blob.name||ACCT.id)} 학생으로 들어왔습니다.`,"good");
}
function acctLogout(){
  if(!confirm("로그아웃할까요? 지금까지의 기록은 계정에 저장됩니다.")) return;
  acctPush(true).then(()=>{
    acctClear();
    try{ localStorage.removeItem(SAVEKEY); }catch(e){}
    location.reload();
  });
}

/* ── 들어오는 길 ─────────────────────────────────── */
/* index.html 의 init() 이 맨 먼저 이 함수를 부릅니다.
   true 를 돌려주면 게임 대신 로그인 화면을 띄웁니다. */
function gateConfigMissing(){
  document.body.classList.add("auth-gate");
  /* 운영 서버에서 설정 파일이 사라졌을 때 로그인 없이 다른 기록을 시작하지 않게 차단합니다. */
  document.querySelector("#topbar").innerHTML=`<div class="tb1"><div class="logo logo-top" title="無明長夜"></div><div><div class="me-name">無明長夜</div><div class="me-sub">사신무기전문학교 명계지부</div></div></div>`;
  document.querySelector("#navcol").innerHTML="";
  document.querySelector("#chatcol").innerHTML="";
  document.querySelector("#main").innerHTML=`<div class="card pad" style="max-width:520px;margin:26px auto;padding:28px 24px">
    <div class="page-kicker">사무전 로그인 연결</div>
    <h2 style="margin:8px 0 14px">서버 설정을 불러오지 못했습니다</h2>
    <p class="muted" style="line-height:1.8">공유 서버 주소나 공개 연결 키가 비어 있습니다. GitHub Pages의 <code>config.js</code>를 운영 설정본으로 복구해 주세요.<br>기존 러너 기록은 삭제되지 않았습니다.</p>
    <div class="tiny muted">운영진: GitHub 저장소의 이전 버전에서 config.js를 복원하거나 Supabase Project URL과 Publishable/anon key를 다시 입력하세요. <b>service_role/secret 키는 올리지 마세요.</b></div>
    <button class="btn pri" style="margin-top:16px" onclick="location.reload()">설정 복구 후 새로고침</button>
  </div>`;
}
function gateIntercept(){
  if(!acctOn()){
    /* 공개 사이트에서는 구성 누락을 조용한 1인 모드로 처리하지 않습니다. */
    if(["ignorance.site","www.ignorance.site"].includes(location.hostname.toLowerCase())){
      gateConfigMissing(); return true;
    }
    return false; // 로컬 오프라인 테스트는 기존처럼 1인 모드 허용
  }
  if(!acctIn()){ gateShow("login"); return true; }
  // 자동 로그인 — 저장해 둔 표식을 서버와 맞춰 봅니다
  acctRpc('login',{p_id:ACCT.id,p_token:ACCT.tok})
    .then(row=>{acctBoot(row.save||null);})
    .catch(()=>{
      // 네트워크 오류가 나면 기존처럼 이 기기의 마지막 로컬 기록으로 입장할 수 있습니다.
      // 서버 거래는 복구 전까지 비활성화됩니다.
      initGame();
      toast('서버 로그인 연결이 끊겨 이 기기 기록으로 시작했습니다. 중개소 이용 전 연결을 확인해 주세요.', 'bad');
    });
  return true;
}

/* ── 주기적으로 계정에 보관 ──────────────────────── */
if(typeof step==="function"){
  const _stepAcct=step;
  step=function(m){ _stepAcct(m); if(acctIn()) acctPush(); };
}
window.addEventListener("beforeunload", ()=>{ try{ acctPush(true); }catch(e){} });
document.addEventListener("visibilitychange", ()=>{ if(document.hidden && acctIn()) acctPush(true); });

/* ── 설정 창에 계정 칸 ───────────────────────────── */
if(typeof openSettings==="function"){
  const _setAcct=openSettings;
  openSettings=function(){
    _setAcct();
    if(!acctOn()) return;
    const box=document.querySelector(".modal .pad, .modal");
    if(!box) return;
    const d=document.createElement("div");
    d.innerHTML = acctIn()
      ? `<hr class="hr"><div class="sect-t">계정</div>
         <div class="tiny muted">아이디 <b style="color:var(--gold)">${esc(ACCT.id)}</b> 로 들어와 있습니다.
           다른 기기에서도 같은 아이디로 들어오면 이 캐릭터가 따라옵니다.</div>
         <div class="row" style="margin-top:8px">
           <button class="btn sm" onclick="acctPush(true).then(ok=>toast(ok?'계정 서버 저장 완료':'서버 저장 실패 · 기록 복사로 따로 백업해 주세요.',ok?'good':'bad'))">지금 저장</button>
           <button class="btn sm" onclick="closeModal();acctLogout()">로그아웃</button></div>`
      : `<hr class="hr"><div class="sect-t">계정</div>
         <div class="tiny muted">로그인하지 않고 이 브라우저에만 저장하는 중입니다.</div>`;
    box.appendChild(d);
  };
}
