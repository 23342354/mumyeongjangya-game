"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 5
   건의함 — 구글 시트에 연결하면 모두가 함께 보는 게시판이 됩니다.
   연결 전에는 내 브라우저에만 쌓이는 「혼자 보기」로 동작합니다.
   ═══════════════════════════════════════════════════ */

const BCAT=[
 {k:"건의", c:"var(--gold)", d:"이렇게 바뀌면 좋겠다"},
 {k:"버그", c:"var(--red)", d:"잘못 동작하는 것"},
 {k:"문의", c:"var(--blue)", d:"궁금한 것"},
 {k:"칭찬", c:"var(--ok)", d:"좋았던 것"},
 {k:"기타", c:"var(--dim)", d:"그 밖에"},
];
const BSTATUS={
 "접수":  {c:"var(--dim)", d:"아직 읽지 않았습니다"},
 "확인":  {c:"var(--blue)", d:"운영진이 읽었습니다"},
 "반영":  {c:"var(--ok)", d:"반영되었습니다"},
 "보류":  {c:"var(--gold)", d:"지금은 어렵습니다"},
 "답변":  {c:"var(--violet)", d:"답변이 달렸습니다"},
};

function ensureV5(){
  if(!S.board) S.board={url:"", name:"", local:[], cache:[], liked:[], last:0, state:"idle", err:""};
  // 이전 판본에서 다운로드해 저장된 비공개 운영진 답변도 기기 캐시에서 지웁니다.
  if(Array.isArray(S.board.cache)){
    let scrubbed=false;
    S.board.cache=S.board.cache.map(r=>{
      if(!r || !+r.secret || !r.reply) return r;
      scrubbed=true;
      return {...r,has_reply:true,reply:""};
    });
    if(scrubbed && typeof save==="function") save();
  }
  if(!S.board.liked) S.board.liked=[];
  // 운영진이 config.js에 적어 둔 주소를 그대로 씁니다 (러너는 입력할 필요 없음)
  const CF=window.MMJY_CONFIG||{};
  if(CF.boardUrl && !S.board.urlManual) S.board.url=CF.boardUrl;
  if(!S.board.name) S.board.name=S.name||"";
}
function boardOn(){ return !!(S.board && S.board.url); }
function boardList(){ return boardOn()? (S.board.cache||[]) : (S.board.local||[]); }

/* ─── 비공개 글 작성자용 개인 열람 코드 ───
   공용 캐시/S 에 원문이나 코드를 저장하지 않습니다. 보관은 이 기기의
   계정별 localStorage에만 하며, 서버는 코드의 해시만 검사합니다. */
function boardReceiptStorageKey(){
  const id=(typeof ACCT!=="undefined" && ACCT && ACCT.id) || (S.sb&&S.sb.id) || "local";
  return "mmjy:board-private-receipts:v1:"+String(id);
}
function boardReceiptAll(){
  try{const v=JSON.parse(localStorage.getItem(boardReceiptStorageKey())||"{}");return v&&typeof v==="object"&&!Array.isArray(v)?v:{};}
  catch(_){return {};}
}
function boardReceiptFor(id){return String(boardReceiptAll()[String(id)]||"");}
function boardRememberReceipt(id,receipt){
  if(!/^[a-f0-9]{64}$/.test(String(receipt))) return false;
  try{const v=boardReceiptAll();v[String(id)]=receipt;localStorage.setItem(boardReceiptStorageKey(),JSON.stringify(v));return true;}
  catch(_){return false;}
}
function boardNewReceipt(){
  if(!window.crypto || typeof window.crypto.getRandomValues!=="function")
    throw Error("안전한 열람 코드를 만들 수 없습니다. HTTPS에서 다시 시도해 주세요.");
  const bytes=new Uint8Array(32);window.crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
function boardReadPrivate(id,receipt){
  if(S.board&&S.board.url){
    return boardSend({action:"read_private",id:String(id),receipt}).then(j=>{
      if(!j||!j.ok||typeof j.body!=="string") throw Error(j&&j.error||"열람 코드를 확인할 수 없습니다.");
      return {body:j.body, reply:typeof j.reply==="string"?j.reply:null};
    });
  }
  if(typeof sbSend==="function" && typeof sbOn==="function" && sbOn()){
    return sbSend("POST","rpc/read_my_private_suggestion_full",{p_id:Number(id),p_receipt:receipt}).then(rows=>{
      const item=Array.isArray(rows)?rows[0]:rows;
      if(!item||typeof item.body!=="string") throw Error("열람 코드가 맞지 않거나 이전 방식으로 작성한 글입니다.");
      return {body:item.body, reply:typeof item.reply==="string"?item.reply:null};
    });
  }
  return Promise.reject(Error("건의함이 연결되지 않았습니다."));
}
function boardPrivateArea(id,hasReply){
  const token=boardReceiptFor(id);
  return `<div id="board_private_body" data-post-id="${esc(String(id))}" style="white-space:pre-wrap;line-height:1.9;font-size:14px">${token?"비공개 본문을 확인하는 중…":"비공개 글입니다. 작성자만 열람 코드로 본문을 볼 수 있습니다."}</div>
    ${hasReply?`<div class="card pad" id="board_private_reply_panel" data-post-id="${esc(String(id))}" style="margin-top:14px;border-color:var(--gold2)">
      <div class="sect-t" style="margin:0 0 6px">운영진 답변</div>
      <div id="board_private_reply" style="white-space:pre-wrap;line-height:1.9;font-size:13.5px">${token?"답변을 확인하는 중…":"작성자 인증 후 답변을 볼 수 있습니다."}</div>
    </div>`:""}
    <div id="board_private_unlock" style="margin-top:10px;${token?"display:none":""}">
      <div class="tiny muted" style="margin-bottom:6px">본인이 작성한 글이라면 글을 올릴 때 받은 열람 코드를 입력해 주세요.</div>
      <div class="row" style="gap:8px">
        <input class="inp" id="board_receipt_input" type="text" autocomplete="off" spellcheck="false" placeholder="64자리 개인 열람 코드" maxlength="64" style="flex:1;min-width:180px">
        <button class="btn sm pri" onclick="boardUnlock('${esc(String(id))}')">본문 보기</button>
      </div>
      <div class="tiny muted" style="margin-top:6px">기존 비공개 글은 작성자 확인용 코드가 없어 운영진이 기존 글에 코드를 발급해야 합니다.</div>
    </div>`;
}
function boardPrivateLoad(id,code){
  const body=document.getElementById("board_private_body"), unlock=document.getElementById("board_private_unlock");
  if(!body || body.dataset.postId!==String(id)) return;
  body.textContent="비공개 본문을 확인하는 중…";
  boardReadPrivate(id,code).then(data=>{
    const current=document.getElementById("board_private_body");
    if(!current || current.dataset.postId!==String(id)) return;
    current.textContent=data.body;
    const privateReply=document.getElementById("board_private_reply");
    const panel=document.getElementById("board_private_reply_panel");
    if(privateReply && panel && panel.dataset.postId===String(id))
      privateReply.textContent=data.reply===null
        ? "답변 열람 기능을 업데이트해야 합니다. 서버의 최신 보안 SQL 또는 Apps Script를 적용해 주세요."
        : (data.reply || "아직 답변이 없습니다.");
    const row=document.getElementById("board_private_unlock");if(row)row.style.display="none";
    boardRememberReceipt(id,code);
  }).catch(e=>{
    const current=document.getElementById("board_private_body");if(!current || current.dataset.postId!==String(id))return;
    current.textContent="비공개 글입니다. "+String(e.message||e);
    const privateReply=document.getElementById("board_private_reply");
    if(privateReply)privateReply.textContent="작성자 인증 후 답변을 볼 수 있습니다.";
    const row=document.getElementById("board_private_unlock");if(row)row.style.display="";
  });
}
function boardUnlock(id){
  const input=document.getElementById("board_receipt_input");
  const token=String(input&&input.value||"").trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(token)){toast("64자리 열람 코드를 입력해 주세요.","bad");return;}
  boardPrivateLoad(id,token);
}
function boardPrivateSubmitted(id,receipt){
  boardRememberReceipt(id,receipt);
  modal("비공개 건의글 등록 완료",`
    <div class="tiny" style="line-height:1.8;margin-bottom:12px">내 글의 본문은 이 기기에서 바로 읽을 수 있습니다.
    <b>다른 기기에서 읽으려면 아래 개인 열람 코드가 필요합니다.</b>
    운영진 이외의 다른 러너에게는 본문을 공개하지 않습니다.</div>
    <label class="f">개인 열람 코드</label>
    <input class="inp" id="board_new_receipt" readonly value="${esc(receipt)}" style="width:100%;font-size:12px" onclick="this.select()">
    <div class="row" style="margin-top:12px">
      <button class="btn pri" onclick="boardCopyReceipt()">열람 코드 복사</button>
      <button class="btn" onclick="closeModal()">확인</button>
    </div>
    <div class="tiny muted" style="margin-top:10px">코드를 잃으면 운영진에게 별도 재발급을 요청해야 합니다.</div>`);
}
function boardCopyReceipt(){
  const el=document.getElementById("board_new_receipt");if(!el)return;
  el.select();
  if(navigator.clipboard&&navigator.clipboard.writeText)
    navigator.clipboard.writeText(el.value).then(()=>toast("열람 코드를 복사했어요.","good")).catch(()=>toast("코드를 선택했어요. 직접 복사해 주세요."));
  else toast("코드를 선택했어요. 직접 복사해 주세요.");
}

/* ─── 구글 시트와 주고받기 ─── */
function boardFetch(force){
  if(!boardOn()) return;
  const now=Date.now();
  if(!force && S.board.last && now-S.board.last<20000) return;
  S.board.last=now; S.board.state="loading"; S.board.err="";
  if(VIEW==="board") renderMain();
  fetch(S.board.url+"?action=list&t="+now, {method:"GET"})
    .then(r=>r.json())
    .then(j=>{
      if(!j || !j.ok) throw new Error(j&&j.error||"목록을 받지 못했습니다");
      S.board.cache=(j.rows||[]).map(r=>({
        ...r, has_reply:!!(r.has_reply || (r.reply&&String(r.reply).trim())),
        reply:+r.secret?"":String(r.reply||"")
      })); S.board.state="ok"; S.board.err="";
      if(VIEW==="board") renderMain();
      save();
    })
    .catch(e=>{
      S.board.state="err";
      S.board.err=String(e.message||e);
      if(VIEW==="board") renderMain();
    });
}
function boardSend(payload){
  // Content-Type을 지정하지 않아 브라우저의 사전 확인 요청(preflight)을 피합니다.
  return fetch(S.board.url, {method:"POST", body:JSON.stringify(payload)})
    .then(r=>r.json());
}

/* ─── 글 올리기 ─── */
function boardWrite(){
  const cats=BCAT.map(c=>`<option value="${c.k}">${c.k} — ${c.d}</option>`).join("");
  modal("건의함에 글 올리기", `
    <div class="tiny muted" style="margin-bottom:10px">
      ${boardOn()?"운영진과 다른 학생 모두가 볼 수 있습니다. 비공개로 올리면 작성자와 운영진만 봅니다."
                 :"지금은 <b>혼자 보기</b>입니다. 이 브라우저에만 저장되며 운영진에게 전달되지 않습니다."}
    </div>
    <label class="f">쓰는 사람</label>
    <input class="inp" id="b_name" maxlength="16" value="${esc(S.board.name||S.name||"")}" placeholder="이름 또는 계정">
    <label class="f">분류</label>
    <select class="inp" id="b_cat">${cats}</select>
    <label class="f">제목</label>
    <input class="inp" id="b_title" maxlength="60" placeholder="한 줄로 요약해 주세요">
    <label class="f">내용</label>
    <textarea class="inp" id="b_body" style="min-height:140px" maxlength="1500"
      placeholder="어떤 화면에서, 무엇을 하려다, 어떻게 되었는지 적어 주시면 가장 빠릅니다."></textarea>
    <label class="row" style="margin-top:12px;gap:7px;cursor:pointer">
      <input type="checkbox" id="b_secret"> <span class="tiny">비공개 — 작성자와 운영진만 보기</span></label>
    <div class="row" style="margin-top:14px">
      <button class="btn pri" id="b_go" onclick="boardSubmit()">올리기</button>
      <button class="btn" onclick="closeModal()">취소</button>
    </div>`);
}
function boardSubmit(){
  const name=($("#b_name").value||"").trim()||"이름 없는 차사";
  const cat=$("#b_cat").value, title=($("#b_title").value||"").trim();
  const body=($("#b_body").value||"").trim();
  const secret=$("#b_secret").checked;
  if(!title){ toast("제목을 적어 주세요.","bad"); return; }
  if(!body){ toast("내용을 적어 주세요.","bad"); return; }
  S.board.name=name;
  const row={id:"L"+Date.now(), time:new Date().toISOString(), name, cat, title, body,
             secret:secret?1:0, likes:0, status:"접수", reply:""};
  if(!boardOn()){
    S.board.local.unshift(row);
    closeModal(); renderMain(); save();
    toast("혼자 보기에 저장했습니다. 운영진에게 보내려면 설정에서 건의함을 연결해 주세요.");
    return;
  }
  let receipt="";
  if(secret){try{receipt=boardNewReceipt();}catch(e){toast(String(e.message||e),"bad");return;}}
  const btn=$("#b_go"); if(btn){ btn.disabled=true; btn.textContent="보내는 중…"; }
  boardSend({action:"add", ...row, receipt})
    .then(j=>{
      if(!j||!j.ok) throw new Error(j&&j.error||"보내지 못했습니다");
      if(secret){
        if(!j.id) throw Error("서버에서 글 번호를 받지 못했습니다. 운영진에게 문의해 주세요.");
        boardPrivateSubmitted(j.id,receipt);
      }else{closeModal();toast("건의함에 올렸습니다. 고맙습니다.","good");}
      boardFetch(true);
    })
    .catch(e=>{
      if(btn){ btn.disabled=false; btn.textContent="올리기"; }
      toast("보내지 못했습니다 · "+esc(String(e.message||e)),"bad");
    });
}
function boardLike(id){
  if(S.board.liked.includes(id)){ toast("이미 공감했습니다."); return; }
  S.board.liked.push(id);
  const r=boardList().find(x=>String(x.id)===String(id));
  if(r) r.likes=(+r.likes||0)+1;
  renderMain(); save();
  if(boardOn()) boardSend({action:"like", id}).catch(()=>{});
}
function boardOpen(id){
  const r=boardList().find(x=>String(x.id)===String(id)); if(!r) return;
  const C=BCAT.find(c=>c.k===r.cat)||BCAT[4];
  const st=BSTATUS[r.status]||BSTATUS["접수"];
  modal(esc(r.title), `
    <div class="spread" style="margin-bottom:10px">
      <div class="row">
        <span class="tag" style="border-color:${C.c};color:${C.c}">${esc(r.cat)}</span>
        <span class="tag" style="border-color:${st.c};color:${st.c}">${esc(r.status||"접수")}</span>
        ${+r.secret?'<span class="tag">비공개</span>':""}
      </div>
      <span class="tiny muted">${esc(r.name)} · ${boardDate(r.time)}</span>
    </div>
    ${(+r.secret&&boardOn())?boardPrivateArea(r.id,!!(r.has_reply||r.reply)):`<div style="white-space:pre-wrap;line-height:1.9;font-size:14px">${esc(r.body)}</div>`}
    ${(!(+r.secret&&boardOn())&&r.reply)?`<div class="card pad" style="margin-top:14px;border-color:var(--gold2)">
      <div class="sect-t" style="margin:0 0 6px">운영진 답변</div>
      <div style="white-space:pre-wrap;line-height:1.9;font-size:13.5px">${esc(r.reply)}</div></div>`:""}
    <div class="row" style="margin-top:14px">
      <button class="btn ${S.board.liked.includes(String(r.id))?"":"pri"} sm"
        onclick="boardLike('${esc(String(r.id))}')">공감 ${+r.likes||0}</button>
      <button class="btn" style="margin-left:auto" onclick="closeModal()">닫기</button>
    </div>`);
  if(+r.secret&&boardOn()&&boardReceiptFor(r.id)) boardPrivateLoad(r.id,boardReceiptFor(r.id));
}
function boardDate(t){
  try{ const d=new Date(t);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }catch(e){ return String(t||""); }
}
function boardConnect(){
  modal("건의함 연결", `
    <div class="tiny muted" style="line-height:1.9;margin-bottom:12px">
      구글 시트에 연결하면 모두가 같은 건의함을 보게 됩니다. 글은 시트에 쌓이고,
      운영진이 시트의 <b>상태</b>·<b>답변</b> 칸을 채우면 게임 안에 바로 보입니다.<br>
      연결 주소를 만드는 방법은 함께 드린 안내서 「건의함 연결하기」를 보세요.
    </div>
    <label class="f">연결 주소 (Apps Script 웹 앱 URL)</label>
    <input class="inp" id="b_url" value="${esc(S.board.url||"")}"
      placeholder="https://script.google.com/macros/s/..../exec">
    <div class="tiny muted" style="margin-top:6px">비워 두면 「혼자 보기」로 돌아갑니다.</div>
    <div class="row" style="margin-top:14px">
      <button class="btn pri" onclick="boardSaveURL()">저장하고 확인</button>
      <button class="btn" onclick="closeModal()">취소</button>
    </div>`);
}
function boardSaveURL(){
  const u=($("#b_url").value||"").trim();
  S.board.url=u; S.board.urlManual=true; S.board.cache=[]; S.board.last=0; S.board.state="idle"; S.board.err="";
  save(); closeModal(); renderMain();
  if(u){ toast("연결 주소를 저장했습니다. 목록을 불러옵니다."); boardFetch(true); }
  else toast("혼자 보기로 돌아갑니다.");
}

/* ─── 화면 ─── */
let BFILTER="전체";
VIEWS.board=()=>{
  const B=S.board;
  let rows=[...boardList()];
  if(BFILTER!=="전체") rows=rows.filter(r=>r.cat===BFILTER);
  rows.sort((a,b)=>new Date(b.time)-new Date(a.time));

  const banner = boardOn()
    ? (B.state==="err"
        ? `<div class="card pad" style="margin-bottom:12px;border-color:var(--redD);padding:10px 14px">
             <span class="tag r">연결 실패</span> <span class="tiny">${esc(B.err)}</span>
             <div class="tiny muted" style="margin-top:4px">연결 주소가 맞는지, 웹 앱 접근 권한이 「모든 사용자」인지 확인해 주세요.</div>
             <button class="btn sm" style="margin-top:8px" onclick="boardFetch(true)">다시 시도</button>
             <button class="btn sm" onclick="boardConnect()">연결 고치기</button></div>`
        : `<div class="card pad" style="margin-bottom:12px;padding:9px 14px">
             <span class="tag j">연결됨</span> <span class="tiny muted">모두가 같은 건의함을 봅니다 · 글 ${boardList().length}개
             ${B.state==="loading"?" · 불러오는 중…":""}</span>
             <button class="btn sm ghost" style="float:right" onclick="boardFetch(true)">새로 고침</button></div>`)
    : `<div class="card pad" style="margin-bottom:12px;padding:10px 14px;border-color:var(--gold2)">
         <span class="tag g">혼자 보기</span>
         <span class="tiny muted">아직 연결되지 않아 이 브라우저에만 쌓입니다. 운영진에게 전달되지 않습니다.</span>
         <button class="btn sm pri" style="float:right" onclick="boardConnect()">건의함 연결하기</button></div>`;

  return head("사무전 민원 접수함",ic("mailbox")+" 건의함",
    `${boardOn()?"모두가 함께 보는 게시판":"내 브라우저에만 저장"}`)+`
  ${banner}
  <div class="card pad" style="margin-bottom:12px;padding:10px 14px">
    <div class="tiny muted">통신이 끊긴 구역에서는 가까운 사찰이나 편의점에 설치된 비상 단말을 사용합니다.
    전산망에 기록을 남길 수 없는 사람들은 사무전 외벽에 마련된 접수함에 종이 의뢰서를 넣기도 합니다.</div>
  </div>
  <div class="row" style="margin-bottom:12px">
    <span class="seg">${["전체",...BCAT.map(c=>c.k)].map(k=>
      `<button class="${BFILTER===k?"on":""}" onclick="BFILTER='${k}';renderMain()">${k}</button>`).join("")}</span>
    <button class="btn pri" style="margin-left:auto" onclick="boardWrite()">글 올리기</button>
    <button class="btn sm ghost" onclick="boardConnect()">연결 설정</button>
  </div>
  ${rows.length?`<div class="card pad">
    <table class="t">
      <tr><th style="width:62px">분류</th><th>제목</th><th style="width:110px">쓴 사람</th>
        <th style="width:62px">공감</th><th style="width:70px">상태</th><th style="width:130px">올린 때</th></tr>
      ${rows.map(r=>{
        const C=BCAT.find(c=>c.k===r.cat)||BCAT[4];
        const st=BSTATUS[r.status]||BSTATUS["접수"];
        const hidden=!!+r.secret;
        return `<tr style="cursor:pointer" onclick="boardOpen('${esc(String(r.id))}')">
          <td><span class="tag" style="border-color:${C.c};color:${C.c}">${esc(r.cat)}</span></td>
          <td><b>${esc(r.title)}</b>${hidden?' <span class="tag">비공개</span>':""}
            ${(r.has_reply||r.reply)?' <span class="tiny" style="color:var(--gold)">· 답변 있음</span>':""}</td>
          <td class="tiny muted">${esc(r.name)}</td>
          <td class="tiny" style="color:${(+r.likes)?"var(--gold)":"var(--dim2)"}">${+r.likes||0}</td>
          <td><span class="tag" style="border-color:${st.c};color:${st.c}">${esc(r.status||"접수")}</span></td>
          <td class="tiny muted">${boardDate(r.time)}</td></tr>`}).join("")}
    </table>
  </div>`:`<div class="card pad"><div class="tiny muted" style="padding:14px 2px;text-align:center">
    아직 들어온 글이 없습니다. 첫 글을 올려 주세요.</div></div>`}

  <div class="card pad" style="margin-top:12px">
    <div class="sect-t">상태 표시</div>
    <div class="row">${Object.keys(BSTATUS).map(k=>
      `<span class="buffchip"><span class="dot" style="background:${BSTATUS[k].c}"></span>${k} <span class="muted">${BSTATUS[k].d}</span></span>`).join("")}</div>
  </div>`;
};

/* ─── 연결 ─── */
(()=>{ const g=NAVDEF.find(x=>x.id==="soc");
  if(g && !g.sub.some(s=>s.id==="board")) g.sub.push({id:"board",n:"건의함"}); })();

const _go5=go;
go=function(v){ _go5(v); if(v==="board") boardFetch(false); };

const _openSettings=openSettings;
openSettings=function(){
  _openSettings();
  const r=document.querySelector(".modal .row");
  if(!r) return;
  const box=document.createElement("div");
  box.innerHTML=`<hr class="hr">
    <div class="sect-t">건의함</div>
    <div class="tiny muted">${boardOn()?`연결됨 · <span style="color:var(--jade)">${esc(S.board.url.slice(0,46))}…</span>`
      :"연결되지 않음 — 내 브라우저에만 저장됩니다"}</div>
    <div class="row" style="margin-top:8px">
      <button class="btn" onclick="closeModal();boardConnect()">건의함 연결</button>
      <button class="btn" onclick="closeModal();go('board')">건의함 열기</button></div>`;
  const body=document.querySelector(".modal .mbody");
  if(body) body.appendChild(box);
};

const _boot5=boot;
boot=function(){ _boot5(); ensureV5(); renderNav(); renderMain(); };
