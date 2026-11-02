"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 5
   건의함 — 구글 시트에 연결하면 모두가 함께 보는 게시판이 됩니다.
   연결 전에는 내 브라우저에만 쌓이는 「혼자 보기」로 동작합니다.
   ═══════════════════════════════════════════════════ */

const BCAT=[
 {k:"건의", c:"#caa548", d:"이렇게 바뀌면 좋겠다"},
 {k:"버그", c:"#d2563f", d:"잘못 동작하는 것"},
 {k:"문의", c:"#6f8fd0", d:"궁금한 것"},
 {k:"칭찬", c:"#5fae7a", d:"좋았던 것"},
 {k:"기타", c:"#9b93ac", d:"그 밖에"},
];
const BSTATUS={
 "접수":  {c:"#9b93ac", d:"아직 읽지 않았습니다"},
 "확인":  {c:"#6f8fd0", d:"운영진이 읽었습니다"},
 "반영":  {c:"#5fae7a", d:"반영되었습니다"},
 "보류":  {c:"#d8a44a", d:"지금은 어렵습니다"},
 "답변":  {c:"#9d7fd0", d:"답변이 달렸습니다"},
};

function ensureV5(){
  if(!S.board) S.board={url:"", name:"", local:[], cache:[], liked:[], last:0, state:"idle", err:""};
  if(!S.board.liked) S.board.liked=[];
  // 운영진이 config.js에 적어 둔 주소를 그대로 씁니다 (러너는 입력할 필요 없음)
  const CF=window.MMJY_CONFIG||{};
  if(CF.boardUrl && !S.board.urlManual) S.board.url=CF.boardUrl;
  if(!S.board.name) S.board.name=S.name||"";
}
function boardOn(){ return !!(S.board && S.board.url); }
function boardList(){ return boardOn()? (S.board.cache||[]) : (S.board.local||[]); }

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
      S.board.cache=j.rows||[]; S.board.state="ok"; S.board.err="";
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
      ${boardOn()?"운영진과 다른 학생 모두가 볼 수 있습니다. 비공개로 올리면 운영진만 봅니다."
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
      <input type="checkbox" id="b_secret"> <span class="tiny">비공개 — 운영진만 보기</span></label>
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
  const btn=$("#b_go"); if(btn){ btn.disabled=true; btn.textContent="보내는 중…"; }
  boardSend({action:"add", ...row})
    .then(j=>{
      if(!j||!j.ok) throw new Error(j&&j.error||"보내지 못했습니다");
      closeModal(); toast("건의함에 올렸습니다. 고맙습니다.","good");
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
    <div style="white-space:pre-wrap;line-height:1.9;font-size:14px">${esc(r.body)}</div>
    ${r.reply?`<div class="card pad" style="margin-top:14px;border-color:var(--gold2)">
      <div class="sect-t" style="margin:0 0 6px">운영진 답변</div>
      <div style="white-space:pre-wrap;line-height:1.9;font-size:13.5px">${esc(r.reply)}</div></div>`:""}
    <div class="row" style="margin-top:14px">
      <button class="btn ${S.board.liked.includes(String(r.id))?"":"pri"} sm"
        onclick="boardLike('${esc(String(r.id))}')">공감 ${+r.likes||0}</button>
      <button class="btn" style="margin-left:auto" onclick="closeModal()">닫기</button>
    </div>`);
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
        ? `<div class="card pad" style="margin-bottom:12px;border-color:#8e2f27;padding:10px 14px">
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

  return head("사무전 민원 접수함","📮 건의함",
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
            ${r.reply?' <span class="tiny" style="color:var(--gold)">· 답변 있음</span>':""}</td>
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
