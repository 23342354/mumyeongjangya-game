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
const LOG14_EDITOR_EXPORT_CSS=`:root{--avatar:76px;--font:15px;--lh:1.75}
      *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Pretendard, "Noto Sans KR", system-ui, sans-serif;background:var(--bg);color:var(--text);transition:background .22s ease,color .22s ease}body[data-theme="dark"]{--bg:#263552;--panel:#344462;--text:#F7FAFF;--muted:#C4CEE0;--accent:#9CCFFF;color-scheme:dark}body[data-theme="light"]{--bg:#F7F9FF;--panel:#FFFFFF;--text:#2A405E;--muted:#7B8FA9;--accent:#6EAFE8;color-scheme:light}button,input{font:inherit}.log-header{position:fixed;inset:0 0 auto;z-index:30;height:58px;border-bottom:1px solid color-mix(in srgb,var(--text) 16%,transparent);background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(18px);box-shadow:0 8px 28px rgba(0,0,0,.05)}.header-inner{width:min(100%,1200px);height:100%;margin:auto;padding:0 18px;display:flex;align-items:center;gap:14px}.menu-toggle,.theme-toggle{border:1px solid color-mix(in srgb,var(--text) 17%,transparent);background:color-mix(in srgb,var(--panel) 72%,transparent);color:var(--text);cursor:pointer;transition:.18s}.menu-toggle{width:38px;height:34px;border-radius:8px;display:grid;place-items:center;padding:0}.menu-icon,.menu-icon::before,.menu-icon::after{display:block;width:19px;height:2px;border-radius:9px;background:currentColor;content:"";transition:.2s}.menu-icon{position:relative}.menu-icon::before{position:absolute;top:-6px}.menu-icon::after{position:absolute;top:6px}.drawer-open .menu-icon{background:transparent}.drawer-open .menu-icon::before{top:0;transform:rotate(45deg)}.drawer-open .menu-icon::after{top:0;transform:rotate(-45deg)}.title-block{min-width:0;display:flex;align-items:baseline;gap:11px}.title-block h1{margin:0;padding-left:12px;border-left:5px solid var(--accent);font-size:15px;line-height:1.05;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.count{color:var(--muted);font-size:11px;white-space:nowrap}.theme-toggle{margin-left:auto;border-radius:999px;padding:8px 11px;font-size:12px}.menu-toggle:hover,.theme-toggle:hover{border-color:color-mix(in srgb,var(--accent) 62%,transparent);transform:translateY(-1px)}.drawer-shade{position:fixed;inset:58px 0 0;z-index:24;background:rgba(0,0,0,.34);opacity:0;pointer-events:none;transition:.22s}.drawer{position:fixed;left:0;top:58px;bottom:0;z-index:25;width:min(320px,88vw);padding:24px 20px 40px;background:color-mix(in srgb,var(--bg) 82%,#000 18%);border-right:1px solid color-mix(in srgb,var(--text) 14%,transparent);box-shadow:20px 0 60px rgba(0,0,0,.2);overflow:auto;transform:translateX(-101%);transition:.24s ease;color:var(--text)}.drawer-open .drawer{transform:translateX(0)}.drawer-open .drawer-shade{opacity:1;pointer-events:auto}.drawer h2{margin:14px 0 9px;padding-left:10px;border-left:4px solid var(--accent);font-size:12px;letter-spacing:.08em}.drawer-note{margin:0 0 20px;color:var(--muted);font-size:11px;line-height:1.55}.filter-list{display:grid;gap:3px}.filter-item{display:grid;grid-template-columns:18px 10px 1fr;align-items:center;gap:8px;padding:7px 8px;border-radius:7px;color:color-mix(in srgb,var(--text) 88%,transparent);font-size:12px;cursor:pointer}.filter-item:hover{background:color-mix(in srgb,var(--text) 6%,transparent)}.filter-item input{width:14px;height:14px;accent-color:var(--accent)}.filter-item i{width:7px;height:7px;border-radius:50%;background:var(--dot)}.page{width:min(100%,1120px);margin:auto;padding:90px clamp(18px,5vw,64px) 100px}.log-list{border-top:1px solid color-mix(in srgb,var(--text) 13%,transparent)}.entry{display:grid;grid-template-columns:var(--avatar) minmax(0,1fr);gap:18px;margin:0;padding:15px 0;border-bottom:1px solid color-mix(in srgb,var(--text) 13%,transparent)}.entry[hidden],.system[hidden],.illustration[hidden]{display:none!important}.entry.no-avatar{display:block}.entry.no-avatar .avatar-col{display:none}.avatar-col{display:block;position:relative}.avatar-col::after{content:"";position:absolute;top:calc(var(--avatar) + 8px);bottom:-16px;left:50%;width:1px;background:linear-gradient(color-mix(in srgb,var(--text) 12%,transparent),transparent)}.entry:last-child .avatar-col::after{display:none}.avatar-col img,.avatar-empty{width:var(--avatar);height:var(--avatar);object-fit:cover;border-radius:16px;background:var(--panel);border:1px solid color-mix(in srgb,var(--text) 14%,transparent);box-shadow:none}.hide-image-frame .avatar-col img{background:transparent;border-color:transparent}.avatar-empty{display:grid;place-items:center;color:var(--muted);font-weight:900}.content{position:relative;padding:3px 0 5px;background:transparent;border:0}.meta{min-height:25px;display:flex;align-items:baseline;gap:9px;margin-bottom:8px;padding-bottom:7px;border-bottom:1px dotted color-mix(in srgb,var(--text) 20%,transparent)}.meta b{font-size:12px;letter-spacing:.055em}.meta span{margin-left:auto;padding:2px 8px 3px 10px;font-size:10px;color:var(--muted);border:0;border-left:1px solid color-mix(in srgb,var(--text) 15%,transparent);border-bottom:1px solid color-mix(in srgb,var(--text) 15%,transparent);border-radius:0 0 0 11px;background:color-mix(in srgb,var(--panel) 68%,transparent)}.content.tab-tinted{padding:13px 15px 14px;background:linear-gradient(135deg,var(--tab-bg),color-mix(in srgb,var(--tab-bg) 72%,transparent));border:1px solid var(--tab-border);border-radius:10px}.content.align-center .meta{justify-content:center}.content.align-center .meta span{margin-left:0}.content.align-center .message{text-align:center}.message{font-size:var(--font);line-height:var(--lh);letter-spacing:-.012em;word-break:break-word;text-wrap:pretty}.message-segment+.message-segment{margin-top:4px;padding-top:7px;border-top:1px solid color-mix(in srgb,var(--text) 6%,transparent)}.message-segment.dice-result{position:relative;margin:8px 0;padding:11px 13px 12px;overflow:hidden;border:1px solid color-mix(in srgb,var(--dice-color) 42%,transparent);border-left:4px solid var(--dice-color);border-radius:10px;background:linear-gradient(135deg,color-mix(in srgb,var(--dice-color) 14%,var(--panel)),color-mix(in srgb,var(--dice-color) 5%,transparent));box-shadow:0 8px 22px color-mix(in srgb,var(--dice-color) 7%,transparent)}.dice-badge{display:inline-flex;align-items:center;min-height:21px;margin:0 8px 5px 0;padding:2px 8px;border:1px solid color-mix(in srgb,var(--dice-color) 55%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dice-color) 19%,var(--panel));color:var(--dice-color);font-size:10px;font-weight:900;letter-spacing:.075em;vertical-align:middle}.dice-roll-text{display:block;color:color-mix(in srgb,var(--text) 92%,var(--dice-color) 8%)}.novel .message-segment.dice-result{margin:4px 0;padding:9px 11px 10px}.message img{max-width:100%;border-radius:12px}.message a{color:var(--accent);text-underline-offset:3px}.message strong{font-weight:850;color:color-mix(in srgb,var(--text) 94%,var(--accent) 6%)}.message em{font-style:italic}.message del{color:var(--muted);text-decoration-thickness:1px}.message code{padding:2px 6px;border:1px solid color-mix(in srgb,var(--text) 13%,transparent);border-radius:6px;background:color-mix(in srgb,var(--text) 6%,transparent);font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;font-size:.9em}.segment-content{display:block;min-width:0}.message-segment.format-bold>.segment-content,.message-segment.format-bold>.dice-roll-text{font-weight:800}.message-segment.format-italic>.segment-content,.message-segment.format-italic>.dice-roll-text{font-style:italic}.message-segment.format-bold.format-italic>.segment-content,.message-segment.format-bold.format-italic>.dice-roll-text{font-weight:800;font-style:italic}a{color:var(--accent)}.system{width:min(100%,920px);margin:18px auto;padding:12px 16px;color:var(--muted);line-height:1.65;border-left:4px solid color-mix(in srgb,var(--muted) 78%,transparent);border-top:1px solid color-mix(in srgb,var(--text) 9%,transparent);border-bottom:1px solid color-mix(in srgb,var(--text) 9%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--text) 4%,transparent),transparent)}.system.tab-tinted{background:var(--tab-bg);border-color:var(--tab-border)}.system.align-center{text-align:center;border-left:0}.novel .entry{display:block;padding:0}.novel .content{display:grid;grid-template-columns:minmax(120px,18%) minmax(0,1fr);padding:0;border-bottom:0}.novel .meta{grid-column:1;display:flex;flex-wrap:wrap;justify-content:flex-end;align-content:flex-start;gap:5px;margin:0;padding:9px 14px 9px 0;text-align:right;border-right:1px dotted color-mix(in srgb,var(--text) 28%,transparent);border-bottom:0}.novel .meta span{width:max-content;margin-left:auto;background:transparent}.novel .message{grid-column:2;padding:9px 0 9px 16px}.novel .content.tab-tinted{margin:4px 0;padding:0;border:1px solid var(--tab-border);border-radius:9px;overflow:hidden}.novel .content.align-center{display:block;padding:14px 18px;text-align:center}.novel .content.align-center .meta{justify-content:center;padding:0 0 7px;border:0;text-align:center}.novel .content.align-center .meta span{margin-left:0}.novel .content.align-center .message{padding:0}.novel .message-segment+.message-segment{margin-top:2px;padding-top:4px;border-top:0}.novel .message-segment.dice-result{margin:4px 0;padding:9px 11px 10px;border-top:1px solid color-mix(in srgb,var(--dice-color) 42%,transparent)}.illustration{width:min(100%,1080px);margin:24px auto 30px;padding:0 4px;display:flex}.illustration.align-left{justify-content:flex-start}.illustration.align-center{justify-content:center}.illustration.align-right{justify-content:flex-end}.illustration>div{min-width:40px;max-width:100%}.illustration img{display:block;width:100%;height:auto;border-radius:12px}.empty-filter{display:none;padding:80px 20px;text-align:center;color:var(--muted)}.empty-filter.show{display:block}.footer{padding:0 18px 28px;text-align:center;color:var(--muted);font-size:10px}@media(max-width:700px){.header-inner{padding:0 10px}.title-block h1{padding-left:9px;border-left-width:4px;font-size:13px}.count{display:none}.page{padding:78px 10px 70px}:root{--avatar:58px}.entry{gap:11px}.avatar-col::after{display:none}.meta{flex-wrap:wrap}.meta span{margin-left:0}.novel .content{grid-template-columns:minmax(92px,28%) minmax(0,1fr)}.novel .meta{padding-right:10px}.novel .message{padding-left:11px}.theme-toggle{padding:7px 9px}.drawer{top:58px}}

/* 사무전 고유 데이터 표기. 원본 편집기의 HTML 내보내기 CSS는 위에 그대로 보존합니다. */
.layout-toggle{border:1px solid color-mix(in srgb,var(--text) 17%,transparent);background:color-mix(in srgb,var(--panel) 72%,transparent);color:var(--text);cursor:pointer;transition:.18s;border-radius:999px;padding:8px 11px;font-size:12px;margin-left:auto}
.layout-toggle:hover{border-color:color-mix(in srgb,var(--accent) 62%,transparent);transform:translateY(-1px)}
.layout-toggle+.theme-toggle{margin-left:0}
.log-time{margin:0 0 8px;color:var(--muted);font-size:11px;letter-spacing:.015em}
.log-reply{display:block;margin:0 0 10px;padding:8px 11px;border-left:2px solid color-mix(in srgb,var(--accent) 55%,transparent);background:color-mix(in srgb,var(--accent) 6%,transparent);color:var(--muted);font-size:11px;line-height:1.55}
.log-reply a{color:var(--accent);text-underline-offset:3px}
.log-extra{font-size:10px;font-weight:500;letter-spacing:0;color:var(--muted);margin-left:8px}
.log-search{width:100%;margin:0 0 14px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--text) 20%,transparent);background:var(--panel);color:var(--text);border-radius:8px;font-size:12px}
.log-search:focus{outline:2px solid color-mix(in srgb,var(--accent) 45%,transparent);outline-offset:2px}
.log-search::placeholder{color:var(--muted)}
.ccfolia-import-row{display:none!important}
.entry:target .content{outline:2px solid var(--accent);outline-offset:4px;border-radius:5px}
.log-header button:focus-visible,.drawer input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(max-width:700px){.layout-toggle{font-size:11px;padding:7px 9px}.header-inner{gap:7px}.log-time{font-size:10px}.log-extra{display:none}}
@media print{.log-header,.drawer,.drawer-shade{display:none!important}.page{padding-top:16px}.entry{break-inside:avoid;page-break-inside:avoid}.log-reply a{text-decoration:none}body{color-adjust:exact;print-color-adjust:exact}}
`;
function log14Build(records,title,kind){
  const names=[...new Set(records.map(x=>x.name))];
  const tabs=[...new Set(records.map(x=>x.tab))];
  const safeTitle=log14Esc(title),count=records.length;
  const charMap=new Map(names.map((name,i)=>[name,`author-${i}`]));
  const tabMap=new Map(tabs.map((name,i)=>[name,`tab-${i}`]));
  const entries=records.map(rec=>{
    const label=log14Esc(rec.name),id=log14Esc(rec.id),tab=log14Esc(rec.tab);
    const speakerColor=log14Color(rec.color,rec.name);
    const portrait=rec.avatar
      ?`<img src="${log14Esc(rec.avatar)}" alt="${label}" loading="lazy" decoding="async">`
      :`<div class="avatar-empty" aria-hidden="true">${log14Esc(rec.name.slice(0,1)||"?")}</div>`;
    const reply=rec.parentId?`<div class="log-reply">↳ ${log14Esc(rec.parentName)} 님에게 답글 · <a href="#log-${log14Esc(rec.parentId)}">원글 보기</a></div>`:"";
    const replyImport=rec.parentId?`↳ ${log14Esc(rec.parentName)} 님에게 답글<br>`:"";
    const personId=charMap.get(rec.name),tabId=tabMap.get(rec.tab);
    /* The editor imports a p with three direct span children: tab, speaker, content.
       Keep this row invisible in the exported reader to avoid duplicate content. */
    const importer=`<p class="ccfolia-import-row" style="color:${speakerColor}"><span>[${tab}]</span><span>${label}</span><span>${replyImport}${rec.body}</span></p>`;
    return `<article class="entry" id="log-${id}" data-entry data-char="${log14Esc(personId)}" data-tab="${log14Esc(tabId)}" data-author="${label}">
      <div class="avatar-col">${portrait}</div>
      <div class="content"><div class="meta"><b class="speaker" style="color:${speakerColor}">${label}</b><span>${tab}</span></div>
        <div class="log-time">${log14Esc(rec.when)}</div>
        <div class="message">${reply}<div class="message-segment"><span class="segment-content">${rec.body}</span></div></div>
      </div>${importer}</article>`;
  }).join("\n");
  const charMenu=names.map(n=>`<label class="filter-item"><input type="checkbox" data-filter-char="${log14Esc(charMap.get(n))}" checked><i style="--dot:${log14Color('',n)}"></i><span>${log14Esc(n)}</span></label>`).join('');
  const tabMenu=tabs.map(t=>`<label class="filter-item"><input type="checkbox" data-filter-tab="${log14Esc(tabMap.get(t))}" checked><i style="--dot:#6EAFE8"></i><span>${log14Esc(t)}</span></label>`).join('');
  const exportedAt=log14When(Date.now());
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} · 無明長夜</title>
  <style>${LOG14_EDITOR_EXPORT_CSS}</style></head>
  <body data-theme="light"><header class="log-header"><div class="header-inner">
    <button id="menuToggle" class="menu-toggle" type="button" aria-label="필터 메뉴 열기"><span class="menu-icon"></span></button>
    <div class="title-block"><h1>${safeTitle}</h1><span id="visibleCount" class="count">${count}개 항목</span></div>
    <button id="layoutToggle" class="layout-toggle" type="button">소설형</button>
    <button id="themeToggle" class="theme-toggle" type="button" aria-label="라이트·다크 모드 전환">☾ 다크</button>
  </div></header>
  <div id="drawerShade" class="drawer-shade"></div>
  <aside id="drawer" class="drawer" aria-label="로그 필터">
    <p class="drawer-note">無明長夜 · 사무전 로그<br>대화 ${count.toLocaleString('ko-KR')}개 · ${names.length}명<br>내보낸 시각: ${log14Esc(exportedAt)}<br>메뉴에서 화자와 탭을 골라 읽을 수 있습니다.</p>
    <input class="log-search" type="search" id="logSearch" placeholder="대사·화자 검색" aria-label="대사 검색">
    ${tabs.length?`<h2>탭</h2><div class="filter-list">${tabMenu}</div>`:""}
    <h2>화자</h2><div class="filter-list">${charMenu}</div>
  </aside>
  <main class="page"><section class="log-list">${entries}</section>
    <div id="emptyFilter" class="empty-filter">선택한 조건에 맞는 로그가 없습니다.</div>
  </main><footer class="footer">無明長夜 · 사무전 로그 / ${kind==='pair'||kind==='chat'?'페어끼리 나눈 사적인 대화가 포함되어 있습니다.':'RP 게시판의 공유 대화 기록입니다.'}<br>코코포리아 로그 편집기 v1.0.0의 ‘로그 불러오기’에서 읽을 수 있습니다.</footer>
  <script>
  (()=>{
    const body=document.body,themeBtn=document.getElementById('themeToggle'),layoutBtn=document.getElementById('layoutToggle');
    const menuBtn=document.getElementById('menuToggle'),shade=document.getElementById('drawerShade');
    const count=document.getElementById('visibleCount'),empty=document.getElementById('emptyFilter'),search=document.getElementById('logSearch');
    let saved='';try{saved=localStorage.getItem('samu-export-log-theme')||''}catch(_){}
    const applyTheme=mode=>{body.dataset.theme=mode;themeBtn.textContent=mode==='dark'?'☀ 라이트':'☾ 다크';
      themeBtn.setAttribute('aria-label',mode==='dark'?'라이트 모드로 전환':'다크 모드로 전환');
      try{localStorage.setItem('samu-export-log-theme',mode)}catch(_){}};
    applyTheme(['light','dark'].includes(saved)?saved:body.dataset.theme);
    themeBtn.addEventListener('click',()=>applyTheme(body.dataset.theme==='dark'?'light':'dark'));
    layoutBtn.addEventListener('click',()=>{body.classList.toggle('novel');layoutBtn.textContent=body.classList.contains('novel')?'타임라인':'소설형'});
    const closeDrawer=()=>body.classList.remove('drawer-open');
    menuBtn.addEventListener('click',()=>body.classList.toggle('drawer-open'));
    shade.addEventListener('click',closeDrawer);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
    const entries=[...document.querySelectorAll('[data-entry]')];
    function update(){
      const chars=new Set([...document.querySelectorAll('[data-filter-char]:checked')].map(x=>x.dataset.filterChar));
      const tabs=new Set([...document.querySelectorAll('[data-filter-tab]:checked')].map(x=>x.dataset.filterTab));
      const q=search.value.trim().toLocaleLowerCase();let visible=0;
      for(const el of entries){const charOK=chars.has(el.dataset.char),tabOK=tabs.has(el.dataset.tab);
        const searchOK=!q||(el.textContent||'').toLocaleLowerCase().includes(q);
        el.hidden=!(charOK&&tabOK&&searchOK);if(!el.hidden)visible++;}
      count.textContent=visible.toLocaleString('ko-KR')+'개 항목';empty.classList.toggle('show',visible===0);
    }
    document.querySelectorAll('[data-filter-char],[data-filter-tab]').forEach(x=>x.addEventListener('change',update));
    search.addEventListener('input',update);update();
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
