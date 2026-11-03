/* Shared social records use student IDs; legacy name-only notes stay in the save. */
const SOCIAL={links:[],students:[],pairs:[],posts:[],ready:false,busy:false,at:0,owner:'',error:''};
let RP_FILTER='all',RP_QUERY='',RP_PAGE=0;
const socialId=()=>String(S.sb?.id||'');
const socialStudent=id=>SOCIAL.students.find(r=>String(r.id)===String(id));
const socialName=id=>socialStudent(id)?.name||id;
const socialArg=v=>esc(JSON.stringify(String(v))).replace(/'/g,'&#39;');
const socialPeer=r=>String(r.from_id)===socialId()?r.to_id:r.from_id;
const socialButton=(label,code)=>`<button class="btn sm" onclick="${code}">${label}</button>`;
async function socialFetch(force=false){
 if(!S?.made||!sbOn()||SOCIAL.busy||!force&&Date.now()-SOCIAL.at<15000)return;
 const owner=socialId();if(SOCIAL.owner!==owner){SOCIAL.ready=false;SOCIAL.links=[];SOCIAL.posts=[];SOCIAL.students=[];SOCIAL.pairs=[];SOCIAL.owner=owner;}
 SOCIAL.busy=true;SOCIAL.at=Date.now();
 try{
 const id=encodeURIComponent(owner);
 const [links,students,pairs,posts]=await Promise.all([sbGet(`social_links?select=*&or=(from_id.eq.${id},to_id.eq.${id})&order=id.desc`),sbGet('students?select=*&order=name.asc'),sbGet('pairs?select=id,from_id,to_id,status,pair_name&status=eq.accepted'),sbGet('rp_posts?select=*&order=id.desc&limit=2000')]);
 if(socialId()!==owner)return;
 Object.assign(SOCIAL,{links:links||[],students:students||[],pairs:pairs||[],posts:posts||[],ready:true,error:''});
 // Derived compatibility cache uses actual profile fields, never random values.
 if(!S.socialLegacy)S.socialLegacy={friends:JSON.parse(JSON.stringify(S.friends||[])),relations:JSON.parse(JSON.stringify(S.rel||[]))};
 S.friends=SOCIAL.links.filter(r=>r.kind==='friend'&&r.status==='accepted').map(r=>{const id=socialPeer(r),p=socialStudent(id);return {id,n:p?.name||id,c:p?.course,lv:p?.lvl,line:p?.line,last:p?.updated_at||'',linkId:r.id};});
 if(['rel','pairhub','rpboard','roster'].includes(VIEW))renderMain(true);
 }catch(e){SOCIAL.error='교류 정보를 불러오지 못했습니다. 교류-업데이트.sql 적용과 연결을 확인해 주세요.';if(['rel','pairhub','rpboard'].includes(VIEW))renderMain(true);}
 finally{SOCIAL.busy=false;}
}
async function socialAction(action,data){
 if(!sbOn()||typeof ACCT==='undefined'||!ACCT.id){toast('로그인과 공유 기록 연결이 필요합니다.','bad');return false;}
 try{await sbSend('POST','rpc/social_action',{actor:ACCT.id,token:ACCT.tok,action,data});await socialFetch(true);renderMain();return true;}
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
function socialRemove(id){if(confirm('양쪽 화면에서 이 친구 또는 관계를 해제할까요?'))socialAction('remove',{id});}
// Remove the DM surface, retain stored messages without deleting history.
CHATTABS.splice(CHATTABS.indexOf('1:1'),1);
dmTo=function(){go('rpboard');};dmPick=function(){go('rpboard');};
const socialRenderChat=renderChat;renderChat=function(bottom){if(S.chatTab==='1:1')S.chatTab='전체';return socialRenderChat(bottom);};
const socialPairBtn=pairBtn;pairBtn=function(r){if(!SOCIAL.ready)return '';if(SOCIAL.pairs.some(p=>[String(p.from_id),String(p.to_id)].includes(String(r.id))))return '<span class="tag">페어 있음</span>';return socialPairBtn(r).replace(/go\('rel'\)/g,"go('pairhub')");};
const socialPairSend=pairSend;pairSend=async function(id){await socialFetch(true);if(!SOCIAL.ready||SOCIAL.error)return toast('페어 상태를 확인한 후 다시 신청해 주세요.','bad');if(SOCIAL.pairs.some(p=>[String(p.from_id),String(p.to_id)].includes(String(id))))return toast('이미 페어가 있는 학생입니다.');return socialPairSend(id);};
VIEWS.pairhub=()=>{const p=pairEnsure().mine,shared=p&&SOCIAL.pairs.find(r=>String(r.id)===String(p.id));return head('둘만의 자리','페어',shared?.pair_name?esc(shared.pair_name):'페어명과 거처를 함께 관리합니다')+socialStatus()+pairHTML()+(p?`<div class="card pad"><label>페어명 (함께 사용하는 이름)</label><input class="inp" id="pair-shared-name" maxlength="30" value="${esc(shared?.pair_name||'')}">${socialButton('저장',`socialAction('pair_name',{id:${p.id},name:document.getElementById('pair-shared-name').value})`)}<div style="margin-top:12px">${socialButton('페어의 거처로 이동','socialFollowHome()')} ${socialButton('내 거처 관리',"go('hallv')")}</div></div>`:`<div class="card pad">${socialButton('학생 명부',"go('roster')")}</div>`)+pairHomeHTML();};
async function socialFollowHome(){if(!await pairFetch(true)||!pairEnsure().mine)return toast('페어 정보를 확인할 수 없습니다.','bad');const r=pairEnsure().partner;if(!r?.hall)return toast('상대의 거처 정보를 확인할 수 없습니다.','bad');if(r.hall===S.hall)return toast('이미 같은 구역에 살고 있습니다.');moveHall(r.hall);}
const recGroup=NAVDEF.find(g=>g.id==='rec');if(recGroup)recGroup.sub=recGroup.sub.filter(s=>s.id!=='hallv');
NAVDEF.splice(1,0,{id:'pairmenu',ic:ic('users'),n:'페어',sub:[{id:'pairhub',n:'우리 페어'},{id:'hallv',n:'거처'}]});
NAVDEF.find(g=>g.id==='soc').sub.push({id:'rpboard',n:'RP 게시판'});
// Keep eight mobile destinations; pair is reached from the plaza's top tabs.
const plazaGroup=NAVDEF.find(g=>g.id==='plaza');plazaGroup.sub=[{id:'plaza',n:'사무전 광장'},{id:'pairhub',n:'우리 페어'},{id:'hallv',n:'거처'}];
const socialGo=go;go=function(v){socialGo(v);if(['rel','pairhub','rpboard','roster'].includes(v))socialFetch(true);};
const socialBoot=boot;boot=function(){socialBoot();socialFetch(true);};
setInterval(()=>socialFetch(),15000);
function rpBookmarks(){try{return JSON.parse(localStorage.getItem('rp-bookmarks-'+socialId())||'[]');}catch(e){return [];}}
function rpBookmark(id){let b=rpBookmarks();b=b.includes(id)?b.filter(x=>x!==id):[...b,id];localStorage.setItem('rp-bookmarks-'+socialId(),JSON.stringify(b));renderMain();}
function rpFilter(f){RP_FILTER=f;RP_PAGE=0;renderMain();}
function rpSearch(){RP_QUERY=document.getElementById('rp-search').value.trim();RP_PAGE=0;renderMain();}
async function rpPost(parent=null){const input=document.getElementById(parent?'rp-reply-'+parent:'rp-compose');const body=input?.value.trim();if(!body||body.length>500)return toast('1~500자로 작성해 주세요.');if(await socialAction('post',{body,parent})){if(!parent)document.getElementById('rp-compose').value='';return true;}return false;}
function rpReply(id){modal('이어 쓰기',`<p>${fmtChat(SOCIAL.posts.find(p=>p.id===id)?.body||'')}</p><textarea class="inp" id="rp-reply-${id}" maxlength="500" rows="5" placeholder="대사와 *행동*으로 이어 써 주세요"></textarea>${socialButton('댓글 남기기',`rpPost(${id}).then(ok=>{if(ok)closeModal()})`)}`);}
function rpDelete(id){if(confirm('이 글을 삭제할까요? 원글을 삭제하면 댓글도 함께 삭제됩니다.'))socialAction('delete_post',{id});}
VIEWS.rpboard=()=>{
 const marks=rpBookmarks();let roots=SOCIAL.posts.filter(p=>!p.parent_id);
 if(RP_FILTER==='mine')roots=roots.filter(p=>String(p.author_id)===socialId());
 if(RP_FILTER==='bookmark')roots=roots.filter(p=>marks.includes(p.id));
 if(RP_FILTER==='replies')roots=roots.filter(p=>SOCIAL.posts.some(c=>c.parent_id===p.id&&String(c.author_id)===socialId()));
 if(RP_QUERY)roots=roots.filter(p=>(p.body+' '+socialName(p.author_id)).toLowerCase().includes(RP_QUERY.toLowerCase()));
 const pages=Math.max(1,Math.ceil(roots.length/10));RP_PAGE=Math.min(RP_PAGE,pages-1);
 const row=p=>`<div class="spread"><b>${esc(socialName(p.author_id))}</b><span class="tiny muted">${esc(new Date(p.created_at).toLocaleString('ko-KR'))}</span></div><div style="white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0">${fmtChat(p.body)}</div>${String(p.author_id)===socialId()?socialButton('삭제',`rpDelete(${p.id})`):''}`;
 return head('짧게 남기고 이어 쓰는 역극','RP 게시판','메모 500자 · 댓글로 이어 쓰기 · 대사와 *행동*')+socialStatus()+`<div class="card pad"><textarea id="rp-compose" class="inp" rows="4" maxlength="500" style="width:100%" placeholder="다른 학생이 댓글로 이어 씁니다. 대사와 *행동*을 남겨 주세요."></textarea><div class="row" style="margin-top:10px">${socialButton('남기기','rpPost()')}</div></div><div class="card pad" style="margin:14px 0"><div class="row">${[['all','전체'],['bookmark','북마크'],['mine','내 메모'],['replies','내 댓글']].map(([k,n])=>`<button class="btn sm ${RP_FILTER===k?'pri':''}" onclick="rpFilter('${k}')">${n}</button>`).join('')}</div><div class="row" style="margin-top:10px"><input class="inp" id="rp-search" value="${esc(RP_QUERY)}" placeholder="내용 · 작성자 검색">${socialButton('검색','rpSearch()')}</div></div><div class="spread" style="margin-bottom:12px">${socialButton('이전',"RP_PAGE=Math.max(0,RP_PAGE-1);renderMain()")}${RP_PAGE+1} / ${pages} · ${roots.length}개 ${socialButton('다음',`RP_PAGE=Math.min(${pages-1},RP_PAGE+1);renderMain()`)}</div>${roots.slice(RP_PAGE*10,RP_PAGE*10+10).map(p=>`<article class="card pad" style="margin-bottom:14px">${row(p)}<div class="row">${socialButton(marks.includes(p.id)?'★ 북마크 해제':'☆ 북마크',`rpBookmark(${p.id})`)}${socialButton('이어 쓰기',`rpReply(${p.id})`)}</div><details style="margin-top:12px"><summary>댓글 ${SOCIAL.posts.filter(c=>c.parent_id===p.id).length}개</summary>${SOCIAL.posts.filter(c=>c.parent_id===p.id).reverse().map(c=>`<div class="card pad" style="margin-top:8px">${row(c)}${socialButton('답글',`rpReply(${p.id})`)}</div>`).join('')}</details></article>`).join('')||'<div class="card pad">아직 남겨진 메모가 없습니다.</div>'}`;
};
