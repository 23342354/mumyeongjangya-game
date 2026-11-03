"use strict";
/* ═══════════════════════════════════════════════════════════════════
   無明長夜 · HTML 로그 보존 기능
   RP 게시판 / 둘의 기록 / 페어 채팅
   · 서버의 전체 페이지를 조회하여 파일 생성 (화면의 10/120개 제한과 무관)
   · 오프라인으로 열리는 독립 HTML, 소설형 / 타임라인, 테마 / 화자 필터
   · 코코포리아 로그 편집기 v1.0.0의 [탭][화자][대사] 3-span 구조 호환
   · 페어 로그는 현재 계정과 수락된 페어의 기록만 읽음
   ═══════════════════════════════════════════════════════════════════ */

const LOG14_PAGE_SIZE=300;
let LOG14_BUSY=false;
const log14Esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function log14SafeFilename(value){
  return String(value||"無明長夜-기록").replace(/[\\/:*?"<>|\x00-\x1f]/g,"_").replace(/\s+/g," ").slice(0,90).trim()||"無明長夜-기록";
}
function log14SafeImage(value){
  const s=String(value||"").trim();
  return /^(?:https:\/\/[^\s<>"']+|data:image\/(?:png|jpe?g|gif|webp);base64,[a-z\d+/=]+)$/i.test(s)?s:"";
}
function log14Color(value,seed){
  const s=String(value||"").trim();
  if(/^#[0-9a-f]{6}$/i.test(s))return s;
  const options=["#6BA2E7","#AF83D7","#E08DAB","#55A5A1","#C39C57","#7D9DAE","#9F85DC"];
  let n=0;for(const ch of String(seed||""))n=(n*31+ch.charCodeAt(0))>>>0;
  return options[n%options.length];
}
function log14Markup(raw,sourceIsSafeHTML=false){
  const text=String(raw??"");
  if(!sourceIsSafeHTML){
    return log14Esc(text).replace(/\*\*\*([^*\n]+)\*\*\*/g,"<strong><em>$1</em></strong>")
      .replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g,"<em>$1</em>");
  }
  /* 페어 채팅은 fmtChat()으로 이미 <em> 표시된 본문을 보냅니다.
     HTML을 그대로 복사하지 않고 허용된 서식만 재구성합니다. */
  const doc=new DOMParser().parseFromString(`<div>${text}</div>`,"text/html");
  const allow={EM:"em",I:"em",STRONG:"strong",B:"strong",U:"u",DEL:"del",S:"del",CODE:"code"};
  const write=node=>{
    if(node.nodeType===Node.TEXT_NODE)return log14Esc(node.textContent||"");
    if(node.nodeType!==Node.ELEMENT_NODE)return "";
    if(node.tagName==="BR")return "<br>";
    const inner=Array.from(node.childNodes).map(write).join("");
    const tag=allow[node.tagName];
    return tag?`<${tag}>${inner}</${tag}>`:inner;
  };
  return Array.from(doc.body.firstElementChild?.childNodes||[]).map(write).join("");
}
function log14Avatar(row){
  const p=row||{};return log14SafeImage(p.av_img||p.avImg||p.avatar_url||"");
}
function log14Student(id){
  const sid=String(id??"");
  if(S?.sb && String(S.sb.id)===sid) return {...(socialStudent?.(sid)||{}),...pairMe()};
  const social=(typeof socialStudent==="function"?socialStudent(sid):null);
  const roster=(S?.sb?.roster||[]).find(x=>String(x.id)===sid);
  const partner=(typeof pairPeer==="function"?pairPeer():null);
  return social||roster||(partner&&String(partner.id)===sid?partner:null)||{};
}
function log14Who(id,backup){
  const row=log14Student(id);
  const name=row.name||backup||"이름 없는 학생";
  return {name:String(name),img:log14Avatar(row),color:log14Color(row.color,name)};
}
function log14When(raw){
  if(!raw)return "시각 미상";
  const date=new Date(raw);
  if(!Number.isFinite(date.getTime()))return "시각 미상";
  return date.toLocaleString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});
}
function log14Download(filename,html){
  const blob=new Blob(["\ufeff",html],{type:"text/html;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=log14SafeFilename(filename)+".html";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function log14ReadPages(base,direction="desc"){
  if(!sbOn())throw new Error("Supabase 공유 기록에 연결하지 못했습니다.");
  let cursor="",pages=0;
  const rows=[],seen=new Set();
  while(true){
    const filter=cursor?`&id=${direction==="asc"?"gt":"lt"}.${encodeURIComponent(cursor)}`:"";
    const page=await sbGet(`${base}${filter}&order=id.${direction}&limit=${LOG14_PAGE_SIZE}`);
    if(!Array.isArray(page))throw new Error("서버가 목록을 반환하지 않았습니다.");
    for(const row of page){
      if(row?.id==null)continue;
      const id=String(row.id);
      if(!seen.has(id)){seen.add(id);rows.push(row);}
    }
    if(page.length<LOG14_PAGE_SIZE)break;
    const next=String(page[page.length-1].id);
    if(next===cursor)throw new Error("페이지 조회가 중단되었습니다. 일부 기록만 내보내지 않도록 저장을 취소합니다.");
    cursor=next;
    if(++pages>1000)throw new Error("내보낼 기록이 너무 많아 조회를 중단했습니다. 운영진에게 문의해 주세요.");
  }
  return rows;
}
function log14ThreadOrder(rows,onlyRoot=null){
  const map=new Map(rows.map(r=>[String(r.id),r]));
  const children=new Map(),roots=[];
  for(const row of rows){
    const parent=row.parent_id==null?"":String(row.parent_id);
    if(parent&&parent!==String(row.id)&&map.has(parent)){
      if(!children.has(parent))children.set(parent,[]);
      children.get(parent).push(row);
    }else roots.push(row);
  }
  for(const arr of children.values())arr.sort((a,b)=>Number(a.id)-Number(b.id));
  roots.sort((a,b)=>Number(a.id)-Number(b.id));
  const result=[],visited=new Set();
  function walk(start){
    const stack=[{row:start,depth:0,rootId:String(start.id)}];
    while(stack.length){
      const {row,depth,rootId}=stack.pop();
      if(visited.has(String(row.id)))continue;
      visited.add(String(row.id));
      result.push({row,depth,rootId,parent:map.get(String(row.parent_id))||null});
      const subs=children.get(String(row.id))||[];
      for(let i=subs.length-1;i>=0;i--)stack.push({row:subs[i],depth:depth+1,rootId});
    }
  }
  if(onlyRoot!=null){
    const row=map.get(String(onlyRoot));
    if(!row)throw new Error("선택한 타래를 서버에서 찾지 못했습니다.");
    walk(row);
  }else{
    roots.forEach(walk);
    rows.forEach(row=>{if(!visited.has(String(row.id)))walk(row);});
  }
  return result;
}
function log14ExportRecord(item,kind,mode=""){
  const p=item.row;
  const sourceIsChat=kind==="chat";
  const author=sourceIsChat?log14Who(p.from_id,p.who):log14Who(p.author_id,p.author_name);
  const parent=item.parent;
  const tag=kind==="rp"?"RP 게시판":kind==="pair"?"둘의 기록":(p.mode==="오너"||p.mode==="사담"?"페어 채팅 · 오너":"페어 채팅 · RP");
  const id=String(p.id);
  return {id,rootId:String(item.rootId??p.id),parentId:parent?String(parent.id):"",name:author.name,
    avatar:author.img,color:author.color,tab:tag,when:log14When(p.created_at||p.ts),
    parentName:parent?(kind==="pair"?String(parent.author_name||log14Who(parent.author_id).name):String(log14Who(parent.author_id,parent.author_name).name)):"",
    depth:Math.max(0,Number(item.depth||0)),body:log14Markup(p.body,sourceIsChat),mode};
}
function log14Build(records,title,kind){
  const names=[...new Set(records.map(x=>x.name))];
  const safeTitle=log14Esc(title),count=records.length;
  const madeAt=log14When(Date.now());
  const entries=records.map(rec=>{
    const label=log14Esc(rec.name),id=log14Esc(rec.id),tab=log14Esc(rec.tab);
    const avatar=rec.avatar?`<img src="${log14Esc(rec.avatar)}" alt="" class="log-avatar" loading="lazy">`
      :`<div class="log-avatar log-initial" aria-hidden="true">${log14Esc(rec.name.slice(0,1)||"?")}</div>`;
    const relation=rec.parentId?`<small class="log-reply">↳ ${log14Esc(rec.parentName)} 님에게 답글 · <a href="#log-${log14Esc(rec.parentId)}">원글 보기</a></small>`:"";
    return `<article class="log-entry" id="log-${id}" data-author="${label}" data-root="${log14Esc(rec.rootId)}" data-search="${log14Esc((rec.name+" "+rec.tab+" "+rec.when+" "+rec.body.replace(/<[^>]*>/g," ")).toLowerCase())}">
      <div class="log-portrait">${avatar}</div>
      <div class="log-main">
        <div class="log-time">${log14Esc(rec.when)}${rec.parentId?` · 타래 답글`:""}${kind==="chat"?` · ${log14Esc(rec.tab.replace("페어 채팅 · ",""))}`:""}</div>
        <p class="log-line"><span class="log-source-tab">[${tab}]</span><span class="log-speaker" style="color:${rec.color}">${label}</span><span class="log-body">${relation}${rec.body}</span></p>
      </div>
    </article>`;
  }).join("\n");
  /* 이 HTML은 브라우저 자체로 열 수 있고, 각 p.log-line에는 코코포리아 로그
     편집기의 파서가 읽는 탭/화자/본문의 3개 직접 span 자식만 둡니다. */
  return `<!doctype html>
<html lang="ko" data-theme="light" data-layout="timeline">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle} · 無明長夜</title>
<style>
:root{color-scheme:light;--bg:#f5f8fe;--panel:#fff;--text:#283d5c;--muted:#778ca5;--line:#dbe6f4;--accent:#6aaee7;--hint:#eff6ff;--avatar:62px}
html[data-theme="dark"]{color-scheme:dark;--bg:#101725;--panel:#19253a;--text:#eef3fc;--muted:#a3b3c9;--line:#354763;--accent:#a3cfff;--hint:#202f49}
*{box-sizing:border-box}[hidden]{display:none!important}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;color:var(--text);background:radial-gradient(circle at 0 0,rgba(128,172,248,.14),transparent 30%),var(--bg);font:15px/1.85 Pretendard,"Noto Sans KR","Malgun Gothic",system-ui,sans-serif}
.page{width:min(100%,1000px);margin:auto;padding:38px clamp(14px,4vw,54px) 92px}.document-head{padding:0 0 20px;border-bottom:1px solid var(--line)}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.17em;color:var(--accent)}h1{font-size:27px;line-height:1.3;letter-spacing:-.04em;margin:9px 0 10px}.intro{color:var(--muted);font-size:12px;line-height:1.7;margin:0}.summary{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px;color:var(--muted);font-size:12px}.summary strong{color:var(--text)}
.tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:18px 0;position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}.tools input,.tools select,.tools button{font:inherit;font-size:12px;color:var(--text);border:1px solid var(--line);background:var(--panel);padding:8px 10px;border-radius:9px;min-height:34px}.tools input{flex:1;min-width:120px}.tools button{cursor:pointer}.tools button:hover{border-color:var(--accent)}.tools select{max-width:160px}.counter{font-size:11px;color:var(--muted);margin-left:auto;white-space:nowrap}
.log-list{max-width:900px;margin:16px auto 0}.log-entry{display:grid;grid-template-columns:var(--avatar) minmax(0,1fr);gap:17px;padding:20px 0;border-bottom:1px solid var(--line);scroll-margin-top:78px}.log-entry:first-child{border-top:1px solid var(--line)}.log-entry:target{background:var(--hint);outline:9px solid var(--hint);border-radius:2px}.log-portrait{width:var(--avatar)}.log-avatar{display:block;width:var(--avatar);height:var(--avatar);border:1px solid var(--line);border-radius:13px;object-fit:cover;background:var(--panel)}.log-initial{display:grid;place-items:center;font-size:26px;font-weight:800;color:var(--accent)}.log-main{min-width:0}.log-time{color:var(--muted);font-size:11px;margin:0 0 2px}.log-line{display:flex;flex-wrap:wrap;column-gap:12px;row-gap:3px;align-items:baseline;margin:0;padding:0;min-width:0}.log-source-tab{display:none}.log-speaker{font-size:14px;font-weight:800;letter-spacing:.01em}.log-body{flex:0 0 100%;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;padding-top:8px;border-top:1px dotted var(--line)}.log-reply{display:block;color:var(--muted);font-size:11px;line-height:1.5;margin-bottom:6px}.log-reply a{color:var(--accent);text-decoration:none}.log-body em{font-style:italic}.log-body a{color:var(--accent)}.log-body strong{font-weight:800}
html[data-layout="novel"] .log-entry{display:block;padding:0}html[data-layout="novel"] .log-portrait{display:none}html[data-layout="novel"] .log-time{padding:12px 0 2px;font-size:10px}html[data-layout="novel"] .log-line{display:grid;grid-template-columns:minmax(105px,18%) minmax(0,1fr);gap:0;align-items:start}html[data-layout="novel"] .log-speaker{text-align:right;border-right:1px dotted var(--line);padding:7px 15px 10px 0}html[data-layout="novel"] .log-body{border:0;grid-column:2;padding:7px 0 10px 16px;flex:auto}
.footer{margin-top:42px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(max-width:640px){:root{--avatar:44px}.page{padding-top:24px}.log-entry{gap:10px;padding:15px 0}.tools{gap:6px}.tools input{order:3;flex-basis:100%}.tools select{max-width:120px}.log-speaker{font-size:13px}.log-body{font-size:14px}html[data-layout="novel"] .log-line{grid-template-columns:minmax(80px,27%) minmax(0,1fr)}}
@media print{.page{width:100%;padding:0}.tools{display:none}.log-entry{break-inside:avoid;page-break-inside:avoid}.log-list{max-width:none}html{scroll-behavior:auto}}
</style></head>
<body><main class="page"><header class="document-head"><div class="eyebrow">無明長夜 · 사신무기전문학교</div><h1>${safeTitle}</h1><p class="intro">사무전 대화 기록을 독립 HTML로 보관했습니다. 이 파일은 인터넷 연결 없이도 본문을 읽을 수 있습니다. 외부 주소를 사용하는 프로필 이미지는 접속 환경에 따라 보이지 않을 수 있습니다.</p><div class="summary"><small>대사 <strong>${count.toLocaleString("ko-KR")}</strong>개</small><small>화자 <strong>${names.length}</strong>명</small><small>저장 <strong>${log14Esc(madeAt)}</strong></small></div></header>
<nav class="tools" aria-label="로그 탐색"><button type="button" id="themeBtn">☾ 다크</button><button type="button" id="layoutBtn">소설형 보기</button><select id="whoFilter" aria-label="화자 필터"><option value="">모든 화자</option>${names.map(n=>`<option value="${log14Esc(n)}">${log14Esc(n)}</option>`).join("")}</select><input id="search" type="search" placeholder="대사·화자 검색" aria-label="대사 검색"><span class="counter" id="count">${count.toLocaleString("ko-KR")}개</span></nav>
<section class="log-list" id="logList" aria-label="저장된 대화 기록">${entries}</section><footer class="footer">無明長夜 · 개인 백업용 HTML / ${kind==="pair"||kind==="chat"?"페어끼리 나눈 사적인 대화가 포함되어 있습니다. 파일 공유에 주의해 주세요.":"RP 게시판의 공유 대화 기록입니다."}<br>‘코코포리아 로그 편집기 v1.0.0’의 로그 불러오기에서도 [탭] · 화자 · 본문 형식으로 읽을 수 있습니다.</footer></main>
<script>
(function(){
const root=document.documentElement,items=Array.from(document.querySelectorAll('.log-entry'));
const search=document.getElementById('search'),who=document.getElementById('whoFilter'),counter=document.getElementById('count');
function filter(){const q=search.value.trim().toLocaleLowerCase();let n=0;
 for(const entry of items){const show=(!who.value||entry.dataset.author===who.value)&&(!q||(entry.textContent||'').toLocaleLowerCase().includes(q));entry.hidden=!show; if(show)n++;}
 counter.textContent=n.toLocaleString('ko-KR')+'개';}
search.addEventListener('input',filter);who.addEventListener('change',filter);
document.getElementById('themeBtn').addEventListener('click',function(){const dark=root.dataset.theme!=='dark';root.dataset.theme=dark?'dark':'light';this.textContent=dark?'☀ 라이트':'☾ 다크';});
document.getElementById('layoutBtn').addEventListener('click',function(){const novel=root.dataset.layout!=='novel';root.dataset.layout=novel?'novel':'timeline';this.textContent=novel?'타임라인 보기':'소설형 보기';});
})();
<\/script></body></html>`;
}
async function log14Export(kind,rootId){
  if(LOG14_BUSY){toast("이미 기록을 불러오는 중입니다. 내보내기가 끝난 뒤 다시 시도해 주세요.");return;}
  if(!S?.made||!sbOn()){toast("로그인 및 공유 기록 연결이 필요합니다.","bad");return;}
  const originalId=String(S.sb?.id||"");
  LOG14_BUSY=true;
  try{
    toast("서버에서 오래된 기록까지 불러와 HTML을 만드는 중입니다.","good");
    let records=[],title="",suffix="";
    if(kind==="rp"){
      const rows=await log14ReadPages("rp_posts?select=*");
      const ordered=log14ThreadOrder(rows,rootId);
      records=ordered.map(x=>log14ExportRecord(x,"rp"));
      title=rootId!=null?"RP 게시판 · 개별 타래":"RP 게시판 · 전체 기록";
      suffix=rootId!=null?"-타래-"+String(rootId):"-전체";
    }else if(kind==="pair"){
      const P=pairEnsure(),pair=P?.mine;
      if(!pair){toast("페어를 맺은 학생만 둘의 기록을 내보낼 수 있습니다.","bad");return;}
      const id=String(pair.id);
      const rows=await log14ReadPages(`pair_posts?select=*&pair_id=eq.${encodeURIComponent(id)}`);
      if(String(pairEnsure()?.mine?.id)!==id)throw new Error("페어가 변경되어 내보내기를 중단했습니다.");
      records=log14ThreadOrder(rows).map(x=>log14ExportRecord(x,"pair"));
      title="둘의 기록 · "+(pairPeer()?.name||"페어");suffix="-둘의기록";
    }else if(kind==="chat"){
      const P=pairEnsure(),pair=P?.mine;
      if(!pair){toast("페어를 맺은 학생만 페어 채팅을 내보낼 수 있습니다.","bad");return;}
      const scope=pairIdKey(pair.from_id,pair.to_id);
      const rows=await log14ReadPages(`messages?select=*&tab=eq.${encodeURIComponent("페어")}&scope=eq.${encodeURIComponent(scope)}`,"asc");
      if(String(pairEnsure()?.mine?.id)!==String(pair.id))throw new Error("페어가 변경되어 내보내기를 중단했습니다.");
      records=rows.map(r=>log14ExportRecord({row:r},"chat"));
      title="페어 채팅 · "+(pairPeer()?.name||"페어");suffix="-페어채팅";
    }else{throw new Error("지원하지 않는 내보내기 종류입니다.");}
    if(String(S.sb?.id||"")!==originalId)throw new Error("계정이 변경되어 내보내기를 취소했습니다.");
    if(!records.length){toast("내보낼 서버 기록이 없습니다.");return;}
    const filename=`無明長夜-${log14SafeFilename(S.name||"학생")}${suffix}-${new Date().toISOString().slice(0,10)}`;
    log14Download(filename,log14Build(records,title,kind));
    toast(`HTML 내보내기 완료 · ${records.length.toLocaleString("ko-KR")}개 기록`,"good");
  }catch(e){
    console.warn("HTML 로그 내보내기 실패:",e);
    toast("HTML 내보내기 실패 · "+log14Esc(String(e?.message||e).slice(0,145)),"bad");
  }finally{LOG14_BUSY=false;}
}

/* 버튼은 기존 페이지에 덧붙이기만 합니다. 원래 글쓰기/답글 UI는 변경하지 않습니다. */
const _log14RpThread=rpThreadHTML;
rpThreadHTML=function(root,marks){
  const html=_log14RpThread(root,marks);
  return html.replace(/(<div class="rp-topic">[\s\S]*?)(<\/div>)/,
    `$1<button type="button" class="btn sm ghost" style="margin-left:auto" onclick="log14Export('rp','${String(root.id).replace(/[^0-9]/g,'')}')">이 타래 HTML</button>$2`);
};
const _log14RpView=VIEWS.rpboard;
VIEWS.rpboard=function(){
  const html=_log14RpView();
  return html.replace('<div class="rp-board">',
    `<div class="card pad" style="margin-bottom:12px"><div class="spread"><div><b>RP 로그 보관</b><div class="tiny muted">전체 게시글과 답글을 서버에서 불러와 독립 HTML 파일로 저장합니다.</div></div><button type="button" class="btn pri sm" onclick="log14Export('rp')">전체 HTML 내보내기</button></div></div><div class="rp-board">`);
};
const _log14PairView=VIEWS.pairboard;
VIEWS.pairboard=function(){
  const html=_log14PairView();
  if(!pairEnsure().mine||!sbOn())return html;
  return html.replace('<section class="mm-timeline"',
    `<div class="card pad" style="margin:12px 0"><div class="spread"><div><b>둘의 기록 보관</b><div class="tiny muted">오래된 타래까지 모두 모아 HTML로 다운로드합니다. 파일에는 두 사람의 사적인 대화가 담깁니다.</div></div><button type="button" class="btn pri sm" onclick="log14Export('pair')">HTML 내보내기</button></div></div><section class="mm-timeline"`);
};
const _log14RenderChat=renderChat;
renderChat=function(bottom){
  const result=_log14RenderChat(bottom);
  const host=document.getElementById("chatcontext");
  if(!host)return result;
  const old=host.querySelector("#log14-chat-export");
  if(S?.chatTab!=="페어"||!pairEnsure().mine||!sbOn()){
    if(old)old.remove();
    return result;
  }
  if(!old){
    const btn=document.createElement("button");
    btn.type="button";btn.id="log14-chat-export";btn.className="btn sm ghost";
    btn.textContent="페어 채팅 HTML";btn.title="서버에 저장된 페어 채팅을 전체 HTML로 내보내기";
    btn.style.cssText="margin-left:auto;font-size:11px;white-space:nowrap";
    btn.onclick=()=>log14Export("chat");
    host.appendChild(btn);
  }
  return result;
};
