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
let PUSHAT=0, PUSHBUSY=false;
function acctPush(force){
  if(!acctIn() || !acctOn() || PUSHBUSY) return Promise.resolve();
  if(typeof S==="undefined" || !S || !S.made) return Promise.resolve();
  const now=Date.now();
  if(!force && now-PUSHAT < 5*60*1000) return Promise.resolve();
  PUSHAT=now; PUSHBUSY=true;
  let blob=null;
  try{ blob=JSON.parse(JSON.stringify(S)); }catch(e){ PUSHBUSY=false; return Promise.resolve(); }
  return acctFetch("accounts?id=eq."+encodeURIComponent(ACCT.id),
      {method:"PATCH", headers:{"Content-Type":"application/json", Prefer:"return=minimal"},
       body:JSON.stringify({save:blob, name:S.name||"", seen_at:new Date().toISOString()})})
    .catch(()=>{})
    .then(()=>{ PUSHBUSY=false; });
}
function acctPull(){
  return acctFetch("accounts?id=eq."+encodeURIComponent(ACCT.id)+"&select=save")
    .then(rows=>(rows && rows[0] && rows[0].save) ? rows[0].save : null);
}

/* ── 로그인 화면 ─────────────────────────────────── */
let GATEMODE="login", GATEMSG="";
function gateMsg(t, bad){ GATEMSG = t ? `<div class="tiny" style="margin-top:10px;color:${bad?"var(--red)":"var(--ok)"}">${esc(t)}</div>` : ""; }
function gateShow(mode){
  if(mode) { GATEMODE=mode; GATEMSG=""; }
  const up = GATEMODE==="signup";
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
  acctFetch("accounts?id=eq."+encodeURIComponent(v.id)+"&select=id")
    .then(rows=>{
      if(rows && rows.length){ gateBusy(false); gateMsg("이미 쓰고 있는 아이디입니다.",1); gateShow(); return; }
      return acctFetch("accounts", {method:"POST",
        headers:{"Content-Type":"application/json", Prefer:"return=minimal"},
        body:JSON.stringify([{id:v.id, pw:acctHash(v.id,v.pw), name:"", save:null}])})
        .then(()=>{
          ACCT={id:v.id, tok:acctHash(v.id,v.pw)}; acctStore();
          try{ localStorage.removeItem(SAVEKEY); }catch(e){}
          acctBoot(null);
        });
    })
    .catch(e=>{ gateBusy(false); gateMsg("서버에 닿지 못했습니다. 잠시 뒤 다시 시도해 주세요.",1); gateShow(); });
}
function gateLogin(){
  const v=gateVals();
  if(!v.id || !v.pw){ gateMsg("아이디와 비밀번호를 적어 주세요.",1); return gateShow(); }
  gateBusy(true);
  acctFetch("accounts?id=eq."+encodeURIComponent(v.id)+"&select=id,pw,save")
    .then(rows=>{
      const row = rows && rows[0];
      if(!row){ gateBusy(false); gateMsg("그런 아이디가 없습니다.",1); return gateShow(); }
      if(row.pw !== acctHash(v.id, v.pw)){ gateBusy(false); gateMsg("비밀번호가 맞지 않습니다.",1); return gateShow(); }
      ACCT={id:v.id, tok:acctHash(v.id,v.pw)}; acctStore();
      acctBoot(row.save||null);
    })
    .catch(()=>{ gateBusy(false); gateMsg("서버에 닿지 못했습니다. 잠시 뒤 다시 시도해 주세요.",1); gateShow(); });
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
function gateIntercept(){
  if(!acctOn()) return false;                    // 공유 기록 없으면 예전처럼 혼자 모드
  if(!acctIn()){ gateShow("login"); return true; }
  // 자동 로그인 — 저장해 둔 표식을 서버와 맞춰 봅니다
  acctFetch("accounts?id=eq."+encodeURIComponent(ACCT.id)+"&select=id,pw,save")
    .then(rows=>{
      const row=rows && rows[0];
      if(!row || row.pw!==ACCT.tok){ acctClear(); gateShow("login"); return; }
      acctBoot(row.save||null);
    })
    .catch(()=>{                                  // 서버에 못 닿으면 이 기기 기록으로라도
      initGame();
      toast("서버에 닿지 못해 이 기기에 남은 기록으로 시작합니다.","bad");
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
           <button class="btn sm" onclick="acctPush(true);toast('계정에 저장했습니다.','good')">지금 저장</button>
           <button class="btn sm" onclick="closeModal();acctLogout()">로그아웃</button></div>`
      : `<hr class="hr"><div class="sect-t">계정</div>
         <div class="tiny muted">로그인하지 않고 이 브라우저에만 저장하는 중입니다.</div>`;
    box.appendChild(d);
  };
}
