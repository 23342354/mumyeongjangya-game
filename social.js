/* Shared social records use student IDs; legacy name-only notes stay in the save. */
const SOCIAL={links:[],students:[],pairs:[],posts:[],ready:false,busy:false,at:0,fullAt:0,owner:'',error:''};
let RP_FILTER='all',RP_QUERY='',RP_PAGE=0;
/* 교류 조회 간격 ─ 게시판을 보고 있을 때와 아닐 때, 전체를 다시 받는 주기를 나눕니다.
   전체 조회는 글 2000개를 한 번에 받아오므로, 평소에는 새 글만 이어 받습니다.
   삭제된 글은 전체 조회 때 맞춰지므로 SOCIAL_FULL_MS보다 늦게 사라지지 않습니다. */
const SOCIAL_MS_ON=15000, SOCIAL_MS_OFF=60000, SOCIAL_FULL_MS=300000, SOCIAL_PAGE=500;
const SOCIAL_VIEWS=['rel','pairhub','rpboard','roster'];
const socialViewing=()=>typeof VIEW!=='undefined'&&SOCIAL_VIEWS.includes(VIEW);
const socialMaxId=()=>(SOCIAL.posts||[]).reduce((m,p)=>Math.max(m,Number(p.id)||0),0);
const socialId=()=>String(S.sb?.id||'');
const socialStudent=id=>SOCIAL.students.find(r=>String(r.id)===String(id));
const socialName=id=>socialStudent(id)?.name||id;
const socialArg=v=>esc(JSON.stringify(String(v))).replace(/'/g,'&#39;');
const socialPeer=r=>String(r.from_id)===socialId()?r.to_id:r.from_id;
const socialButton=(label,code)=>`<button class="btn sm" onclick="${code}">${label}</button>`;
/* 전체를 다시 받아야 할 때 씁니다. 글을 쓰거나 지운 직후, 페어 상태를 확인할 때. */
function socialReload(){SOCIAL.fullAt=0;return socialFetch(true);}
async function socialFetch(force=false){
 if(!S?.made||!sbOn()||SOCIAL.busy)return;
 // 숨은 탭에서는 반복 조회를 하지 않습니다. 돌아오면 force로 한 번에 따라잡습니다.
 if(!force&&(!pollAwake()||Date.now()-SOCIAL.at<5000))return;
 const owner=socialId();if(SOCIAL.owner!==owner){SOCIAL.ready=false;SOCIAL.links=[];SOCIAL.posts=[];SOCIAL.students=[];SOCIAL.pairs=[];SOCIAL.owner=owner;SOCIAL.fullAt=0;}
 const full=!SOCIAL.ready||Date.now()-SOCIAL.fullAt>=SOCIAL_FULL_MS;
 SOCIAL.busy=true;SOCIAL.at=Date.now();
 try{
 const id=encodeURIComponent(owner);
 // 신청 목록은 내 것만 걸러 받으므로 가볍습니다. 매번 함께 확인합니다.
 const linkQ=sbGet(`social_links?select=*&or=(from_id.eq.${id},to_id.eq.${id})&order=id.desc`);
 if(full){
  const [links,students,pairs,posts]=await Promise.all([linkQ,sbGet('students?select=*&order=name.asc'),sbGet('pairs?select=id,from_id,to_id,status,pair_name&status=eq.accepted'),sbGet('rp_posts?select=*&order=id.desc&limit=2000')]);
  if(socialId()!==owner)return;
  Object.assign(SOCIAL,{links:links||[],students:students||[],pairs:pairs||[],posts:posts||[],ready:true,error:'',fullAt:Date.now()});
 }else{
  // 평소에는 내가 가진 마지막 글 번호보다 뒤에 올라온 것만 받아 앞에 붙입니다.
  const [links,fresh]=await Promise.all([linkQ,sbGet('rp_posts?select=*&id=gt.'+socialMaxId()+'&order=id.asc&limit='+SOCIAL_PAGE)]);
  if(socialId()!==owner)return;
  SOCIAL.links=links||[];SOCIAL.error='';
  const rows=fresh||[];
  if(rows.length){
   const seen=new Set(SOCIAL.posts.map(p=>String(p.id)));
   // 목록은 최신 글이 앞에 오는 순서를 유지합니다. 받은 건 오래된 순이라 뒤집어 붙입니다.
   SOCIAL.posts=rows.filter(p=>!seen.has(String(p.id))).reverse().concat(SOCIAL.posts);
   if(SOCIAL.posts.length>2000)SOCIAL.posts=SOCIAL.posts.slice(0,2000);
  }
  // 한 번에 받을 수 있는 양을 꽉 채웠다면 빠진 글이 있을 수 있으니 다음에 전체를 받습니다.
  if(rows.length>=SOCIAL_PAGE)SOCIAL.fullAt=0;
 }
 // Derived compatibility cache uses actual profile fields, never random values.
 if(!S.socialLegacy)S.socialLegacy={friends:JSON.parse(JSON.stringify(S.friends||[])),relations:JSON.parse(JSON.stringify(S.rel||[]))};
 S.friends=SOCIAL.links.filter(r=>r.kind==='friend'&&r.status==='accepted').map(r=>{const id=socialPeer(r),p=socialStudent(id);return {id,n:p?.name||id,c:p?.course,lv:p?.lvl,line:p?.line,last:p?.updated_at||'',linkId:r.id};});
 /* 내 정보 화면이 읽는 옛 관계 배열도 교류 기록에서 채웁니다.
    둘이 따로 놀아서, 교류에서는 보이는 관계가 내 정보에서는
    '맺은 관계가 없습니다'로 뜨던 문제를 막습니다. */
 S.rel=SOCIAL.links.filter(r=>r.kind==='relation'&&r.status==='accepted').map(r=>{
  const from=String(r.from_id)===socialId(),id=socialPeer(r),p=socialStudent(id);
  return {n:p?.name||id,a:from?r.role_from:r.role_to,b:from?r.role_to:r.role_from,nick:'',linkId:r.id};
 });
 if(['rel','pairhub','rpboard','roster'].includes(VIEW)){const editor=VIEW==='rpboard'&&['rp-compose','rp-search'].includes(document.activeElement?.id);if(!editor)renderMain(true);}
 }catch(e){SOCIAL.error='교류 정보를 불러오지 못했습니다. 운영 서버의 교류 테이블과 연결을 확인해 주세요.';if(['rel','pairhub','rpboard'].includes(VIEW))renderMain(true);}
 finally{SOCIAL.busy=false;}
}
async function socialAction(action,data){
 if(!sbOn()||typeof ACCT==='undefined'||!ACCT.id){toast('로그인과 공유 기록 연결이 필요합니다.','bad');return false;}
 // 쓰기·삭제 직후에는 전체를 다시 받아야 지운 글과 바뀐 관계가 바로 반영됩니다.
 try{await sbSend('POST','rpc/social_action',{actor:ACCT.id,token:ACCT.tok,action,data});await socialReload();renderMain();return true;}
 catch(e){toast('처리하지 못했습니다. 중복 신청 여부와 연결 상태를 확인해 주세요.','bad');return false;}
}
const socialStatus=()=>SOCIAL.error?`<div class="card pad">${esc(SOCIAL.error)}</div>`:!SOCIAL.ready?'<div class="card pad">교류 정보를 불러오는 중입니다.</div>':'';
function socialProfile(id){const p=socialStudent(id);return `<b>${esc(p?.name||id)}</b><div class="tiny muted">${p?`${esc(homeOf(p.hall)?.n||'')} · ${p.course||1}과정 · Lv ${p.lvl||1} · ${esc(p.line||'')}`:'학생 정보를 확인할 수 없습니다.'}</div>`;}
function socialRequest(id,kind='friend'){
 if(String(id)===socialId())return;
 if(SOCIAL.links.some(r=>r.kind===kind&&String(socialPeer(r))===String(id)&&['pending','accepted'].includes(r.status))){toast('이미 맺은 관계이거나 답변을 기다리는 신청입니다.');return;}
 if(kind==='friend')return socialAction('request',{target:id,kind});
 modal('쌍방 관계 신청',`<p>${esc(socialName(id))}</p><label>나는 상대의</label><input id="social-a" class="inp" maxlength="20" value="친구"><label>상대는 나의</label><input id="social-b" class="inp" maxlength="20" value="친구"><p class="tiny muted">상대가 수락하면 두 사람의 화면에 역할이 서로 반대로 표시됩니다.</p>${socialButton('신청 보내기',`socialRelationSend(${socialArg(id)})`)}`);
}
async function socialRelationSend(id){const a=document.getElementById('social-a').value.trim(),b=document.getElementById('social-b').value.trim();if(!a||!b)return; if(await socialAction('request',{target:id,kind:'relation',a,b}))closeModal();}
addFriend=function(name){if(!name){go('rel');return;}const rows=SOCIAL.students.filter(p=>p.name===name);if(rows.length!==1){go('rel');toast('학생 목록에서 계정을 확인하고 신청해 주세요.');return;}socialRequest(rows[0].id);};
relPropose=function(name){const rows=SOCIAL.students.filter(p=>p.name===name);if(rows.length===1)socialRequest(rows[0].id,'relation');else go('rel');};
VIEWS.rel=()=>head('사무전 교류','친구 · 관계','상대가 수락하면 양쪽에 함께 표시됩니다')+socialStatus()+`<div class="card pad"><div class="sect-t">받은 신청 · 보낸 신청</div>${SOCIAL.links.filter(r=>r.status==='pending').map(r=>`<div class="spread" style="padding:12px 0"> <div>${socialProfile(socialPeer(r))}<span class="tiny">${r.kind==='friend'?'친구 신청':esc(r.role_from)+' / '+esc(r.role_to)+' 관계 신청'}</span></div><div class="row">${String(r.to_id)===socialId()?socialButton('수락',`socialAction('respond',{id:${r.id},accept:true})`)+socialButton('거절',`socialAction('respond',{id:${r.id},accept:false})`):socialButton('신청 취소',`socialAction('remove',{id:${r.id}})`)}</div></div>`).join('')||'<p class="muted">대기 중인 신청이 없습니다.</p>'}</div><div class="card pad" style="margin-top:14px"><div class="sect-t">친구와 맺은 관계</div>${SOCIAL.links.filter(r=>r.status==='accepted').map(r=>{const from=String(r.from_id)===socialId();return `<div class="spread" style="padding:12px 0"><div>${socialProfile(socialPeer(r))}<div>${r.kind==='friend'?'서로 친구':`나는 상대의 ${esc(from?r.role_from:r.role_to)} · 상대는 나의 ${esc(from?r.role_to:r.role_from)}`}</div></div>${socialButton('해제',`socialRemove(${r.id})`)}</div>`;}).join('')||'<p class="muted">수락한 친구와 관계가 여기에 표시됩니다.</p>'}</div><div class="card pad" style="margin-top:14px"><div class="sect-t">학생 찾기</div>${SOCIAL.students.filter(r=>String(r.id)!==socialId()).map(r=>`<div class="spread" style="padding:10px 0">${socialProfile(r.id)}<div class="row">${['friend','relation'].map(k=>SOCIAL.links.some(l=>l.kind===k&&String(socialPeer(l))===String(r.id)&&['accepted','pending'].includes(l.status))?`<span class="tag">${k==='friend'?'친구':'관계'} · 등록/대기</span>`:socialButton(k==='friend'?'친구 신청':'관계 신청',`socialRequest(${socialArg(r.id)},'${k}')`)).join('')}</div></div>`).join('')}</div>`;
/* 내 정보의 '끊기'도 교류 기록을 지우도록 돌립니다. 그대로 두면 화면에서만
   사라지고 다음 조회 때 되살아납니다. */
relCut=function(i){const r=(S.rel||[])[i];if(r&&r.linkId)socialRemove(r.linkId);};
function socialRemove(id){if(confirm('양쪽 화면에서 이 친구 또는 관계를 해제할까요?'))socialAction('remove',{id});}
// Remove the DM surface, retain stored messages without deleting history.
CHATTABS.splice(CHATTABS.indexOf('1:1'),1);
dmTo=function(){go('rpboard');};dmPick=function(){go('rpboard');};
const socialRenderChat=renderChat;renderChat=function(bottom){if(S.chatTab==='1:1')S.chatTab='전체';return socialRenderChat(bottom);};
const socialPairBtn=pairBtn;pairBtn=function(r){if(!SOCIAL.ready)return '';if(SOCIAL.pairs.some(p=>[String(p.from_id),String(p.to_id)].includes(String(r.id))))return '<span class="tag">페어 있음</span>';return socialPairBtn(r).replace(/go\('rel'\)/g,"go('pairhub')");};
const socialPairSend=pairSend;pairSend=async function(id){await socialReload();if(!SOCIAL.ready||SOCIAL.error)return toast('페어 상태를 확인한 후 다시 신청해 주세요.','bad');if(SOCIAL.pairs.some(p=>[String(p.from_id),String(p.to_id)].includes(String(id))))return toast('이미 페어가 있는 학생입니다.');return socialPairSend(id);};
VIEWS.pairhub=()=>{const p=pairEnsure().mine,shared=p&&SOCIAL.pairs.find(r=>String(r.id)===String(p.id));return head('둘만의 자리','페어',shared?.pair_name?esc(shared.pair_name):'페어명과 거처를 함께 관리합니다')+socialStatus()+pairHTML()+(p?`<div class="card pad"><label>페어명 (함께 사용하는 이름)</label><input class="inp" id="pair-shared-name" maxlength="30" value="${esc(shared?.pair_name||'')}">${socialButton('저장',`socialAction('pair_name',{id:${p.id},name:document.getElementById('pair-shared-name').value})`)}<div style="margin-top:12px">${socialButton('페어의 거처로 이동','socialFollowHome()')} ${socialButton('내 거처 관리',"go('hallv')")}</div></div>`:`<div class="card pad">${socialButton('학생 명부',"go('roster')")}</div>`)+pairHomeHTML();};
async function socialFollowHome(){if(!await pairFetch(true)||!pairEnsure().mine)return toast('페어 정보를 확인할 수 없습니다.','bad');const r=pairEnsure().partner;if(!r?.hall)return toast('상대의 거처 정보를 확인할 수 없습니다.','bad');if(r.hall===S.hall)return toast('이미 같은 구역에 살고 있습니다.');moveHall(r.hall);}
const recGroup=NAVDEF.find(g=>g.id==='rec');if(recGroup)recGroup.sub=recGroup.sub.filter(s=>s.id!=='hallv');
NAVDEF.splice(1,0,{id:'pairmenu',ic:ic('users'),n:'페어',sub:[{id:'pairhub',n:'우리 페어'},{id:'hallv',n:'거처'}]});
NAVDEF.find(g=>g.id==='soc').sub.push({id:'rpboard',n:'RP 게시판'});
// Keep eight mobile destinations; pair is reached from the plaza's top tabs.
const plazaGroup=NAVDEF.find(g=>g.id==='plaza');plazaGroup.sub=[{id:'plaza',n:'사무전 광장'},{id:'pairhub',n:'우리 페어'},{id:'hallv',n:'거처'}];
/* 교류 조회 시계 ─ 보고 있는 화면과 탭 상태에 따라 간격을 바꿉니다.
   숨은 탭에서는 시계를 아예 멈추고, 돌아온 순간 한 번 받아 바로 따라잡습니다.
   게시판·명부를 보고 있지 않아도 1분 간격으로 신청과 새 글을 확인합니다. */
let SOCIALTICK=null;
function socialTick(){
 if(SOCIALTICK){clearInterval(SOCIALTICK);SOCIALTICK=null;}
 if(!pollAwake())return;
 SOCIALTICK=setInterval(()=>socialFetch(),socialViewing()?SOCIAL_MS_ON:SOCIAL_MS_OFF);
}
const socialGo=go;go=function(v){socialGo(v);socialTick();if(SOCIAL_VIEWS.includes(v))socialFetch(true);};
const socialBoot=boot;boot=function(){socialBoot();socialTick();socialFetch(true);};
document.addEventListener('visibilitychange',()=>{socialTick();if(pollAwake())socialFetch(true);});
socialTick();
function rpBookmarks(){try{return JSON.parse(localStorage.getItem('rp-bookmarks-'+socialId())||'[]');}catch(e){return [];}}
function rpBookmark(id){let b=rpBookmarks();b=b.includes(id)?b.filter(x=>x!==id):[...b,id];localStorage.setItem('rp-bookmarks-'+socialId(),JSON.stringify(b));renderMain();}
function rpFilter(f){RP_FILTER=f;RP_PAGE=0;renderMain();}
function rpSearch(){RP_QUERY=document.getElementById('rp-search').value.trim();RP_PAGE=0;renderMain();}
async function rpPost(parent=null){const input=document.getElementById(parent?'rp-reply-'+parent:'rp-compose');const body=input?.value.trim();if(!body||body.length>500)return toast('1~500자로 작성해 주세요.');if(await socialAction('post',{body,parent})){if(!parent)document.getElementById('rp-compose').value='';return true;}return false;}
function rpReply(id){modal('이어 쓰기',`<p>${fmtChat(SOCIAL.posts.find(p=>p.id===id)?.body||'')}</p><textarea class="inp" id="rp-reply-${id}" maxlength="500" rows="5" placeholder="대사와 *행동* 또는 (행동)으로 이어 써 주세요"></textarea>${socialButton('댓글 남기기',`rpPost(${id}).then(ok=>{if(ok)closeModal()})`)}`);}
function rpDelete(id){if(confirm('이 글을 삭제할까요? 원글을 삭제하면 댓글도 함께 삭제됩니다.'))socialAction('delete_post',{id});}
VIEWS.rpboard=()=>{
 const marks=rpBookmarks();let roots=SOCIAL.posts.filter(p=>!p.parent_id);
 if(RP_FILTER==='mine')roots=roots.filter(p=>String(p.author_id)===socialId());
 if(RP_FILTER==='bookmark')roots=roots.filter(p=>marks.includes(p.id));
 if(RP_FILTER==='replies')roots=roots.filter(p=>SOCIAL.posts.some(c=>c.parent_id===p.id&&String(c.author_id)===socialId()));
 if(RP_QUERY)roots=roots.filter(p=>(p.body+' '+socialName(p.author_id)).toLowerCase().includes(RP_QUERY.toLowerCase()));
 const pages=Math.max(1,Math.ceil(roots.length/10));RP_PAGE=Math.min(RP_PAGE,pages-1);
 const row=p=>`<div class="spread"><b>${esc(socialName(p.author_id))}</b><span class="tiny muted">${esc(new Date(p.created_at).toLocaleString('ko-KR'))}</span></div><div style="white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0">${fmtChat(p.body)}</div>${String(p.author_id)===socialId()?socialButton('삭제',`rpDelete(${p.id})`):''}`;
 return head('짧게 남기고 이어 쓰는 역극','RP 게시판','메모 500자 · 댓글로 이어 쓰기 · 대사와 *행동* 또는 (행동)')+socialStatus()+`<div class="card pad"><textarea id="rp-compose" class="inp" rows="4" maxlength="500" style="width:100%" placeholder="다른 학생이 댓글로 이어 씁니다. 대사와 *행동* 또는 (행동)을 남겨 주세요."></textarea><div class="row" style="margin-top:10px">${socialButton('남기기','rpPost()')}</div></div><div class="card pad" style="margin:14px 0"><div class="row">${[['all','전체'],['bookmark','북마크'],['mine','내 메모'],['replies','내 댓글']].map(([k,n])=>`<button class="btn sm ${RP_FILTER===k?'pri':''}" onclick="rpFilter('${k}')">${n}</button>`).join('')}</div><div class="row" style="margin-top:10px"><input class="inp" id="rp-search" value="${esc(RP_QUERY)}" placeholder="내용 · 작성자 검색">${socialButton('검색','rpSearch()')}</div></div><div class="spread" style="margin-bottom:12px">${socialButton('이전',"RP_PAGE=Math.max(0,RP_PAGE-1);renderMain()")}${RP_PAGE+1} / ${pages} · ${roots.length}개 ${socialButton('다음',`RP_PAGE=Math.min(${pages-1},RP_PAGE+1);renderMain()`)}</div>${roots.slice(RP_PAGE*10,RP_PAGE*10+10).map(p=>`<article class="card pad" style="margin-bottom:14px">${row(p)}<div class="row">${socialButton(marks.includes(p.id)?'★ 북마크 해제':'☆ 북마크',`rpBookmark(${p.id})`)}${socialButton('이어 쓰기',`rpReply(${p.id})`)}</div><details style="margin-top:12px"><summary>댓글 ${SOCIAL.posts.filter(c=>c.parent_id===p.id).length}개</summary>${SOCIAL.posts.filter(c=>c.parent_id===p.id).reverse().map(c=>`<div class="card pad" style="margin-top:8px">${row(c)}${socialButton('답글',`rpReply(${p.id})`)}</div>`).join('')}</details></article>`).join('')||'<div class="card pad">아직 남겨진 메모가 없습니다.</div>'}`;
};
