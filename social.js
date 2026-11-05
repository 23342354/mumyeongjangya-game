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
function socialRelationEdit(id){
 const r=SOCIAL.links.find(r=>String(r.id)===String(id)&&r.kind==='relation'&&r.status==='accepted');
 if(!r||![String(r.from_id),String(r.to_id)].includes(socialId()))return;
 const from=String(r.from_id)===socialId();
 modal('관계 호칭 수정',`<p>${esc(socialName(socialPeer(r)))}</p><label for="relation-edit-a">나는 상대의</label><input id="relation-edit-a" class="inp" readonly aria-readonly="true" title="상대가 정한 호칭입니다" value="${esc(from?r.role_from:r.role_to)}"><label for="relation-edit-b">상대는 나의</label><input id="relation-edit-b" class="inp" maxlength="20" value="${esc(from?r.role_to:r.role_from)}"><p class="tiny muted">‘상대는 나의’만 수정할 수 있습니다. ‘나는 상대의’는 상대가 정한 호칭입니다.</p><button id="relation-edit-save" class="btn pri" onclick="socialRelationEditSave(${r.id})">저장</button>`);
}
async function socialRelationEditSave(id){
 const b=document.getElementById('relation-edit-b')?.value.trim()||'';
 if(!b||Array.from(b).length>20){toast('호칭을 1~20자로 입력해 주세요.','bad');return;}
 if(!sbOn()||typeof ACCT==='undefined'||!ACCT.id){toast('로그인이 필요합니다.','bad');return;}
 const button=document.getElementById('relation-edit-save');if(!button||button.disabled)return;button.disabled=true;
 try{
  await sbSend('POST','rpc/social_relation_edit',{p_actor:ACCT.id,p_token:ACCT.tok,p_id:id,p_a:null,p_b:b});
  closeModal();await socialReload();renderMain();toast('관계 호칭을 수정했습니다.','good');
 }catch(e){toast('호칭을 저장하지 못했습니다. 입력한 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.','bad');}
 finally{if(button.isConnected)button.disabled=false;}
}
addFriend=function(name){if(!name){go('rel');return;}const rows=SOCIAL.students.filter(p=>p.name===name);if(rows.length!==1){go('rel');toast('학생 목록에서 계정을 확인하고 신청해 주세요.');return;}socialRequest(rows[0].id);};
relPropose=function(name){const rows=SOCIAL.students.filter(p=>p.name===name);if(rows.length===1)socialRequest(rows[0].id,'relation');else go('rel');};
VIEWS.rel=()=>head('사무전 교류','친구 · 관계','상대가 수락하면 양쪽에 함께 표시됩니다')+socialStatus()+`<div class="card pad"><div class="sect-t">받은 신청 · 보낸 신청</div>${SOCIAL.links.filter(r=>r.status==='pending').map(r=>`<div class="spread" style="padding:12px 0"> <div>${socialProfile(socialPeer(r))}<span class="tiny">${r.kind==='friend'?'친구 신청':esc(r.role_from)+' / '+esc(r.role_to)+' 관계 신청'}</span></div><div class="row">${String(r.to_id)===socialId()?socialButton('수락',`socialAction('respond',{id:${r.id},accept:true})`)+socialButton('거절',`socialAction('respond',{id:${r.id},accept:false})`):socialButton('신청 취소',`socialAction('remove',{id:${r.id}})`)}</div></div>`).join('')||'<p class="muted">대기 중인 신청이 없습니다.</p>'}</div><div class="card pad" style="margin-top:14px"><div class="sect-t">친구와 맺은 관계</div>${SOCIAL.links.filter(r=>r.status==='accepted').map(r=>{const from=String(r.from_id)===socialId();return `<div class="spread" style="padding:12px 0"><div>${socialProfile(socialPeer(r))}<div>${r.kind==='friend'?'서로 친구':`나는 상대의 ${esc(from?r.role_from:r.role_to)} · 상대는 나의 ${esc(from?r.role_to:r.role_from)}`}</div></div>${socialButton('해제',`socialRemove(${r.id})`)}</div>`;}).join('')||'<p class="muted">수락한 친구와 관계가 여기에 표시됩니다.</p>'}</div><div class="card pad" style="margin-top:14px"><div class="sect-t">학생 찾기</div>${SOCIAL.students.filter(r=>String(r.id)!==socialId()).map(r=>`<div class="spread" style="padding:10px 0">${socialProfile(r.id)}<div class="row">${['friend','relation'].map(k=>SOCIAL.links.some(l=>l.kind===k&&String(socialPeer(l))===String(r.id)&&['accepted','pending'].includes(l.status))?`<span class="tag">${k==='friend'?'친구':'관계'} · 등록/대기</span>`:socialButton(k==='friend'?'친구 신청':'관계 신청',`socialRequest(${socialArg(r.id)},'${k}')`)).join('')}</div></div>`).join('')}</div>`;
/* 내 정보의 '끊기'도 교류 기록을 지우도록 돌립니다. 그대로 두면 화면에서만
   사라지고 다음 조회 때 되살아납니다. */
relCut=function(i){const r=(S.rel||[])[i];if(r&&r.linkId)socialRemove(r.linkId);};
function socialRemove(id){if(confirm('양쪽 화면에서 이 친구 또는 관계를 해제할까요?'))socialAction('remove',{id});}
// Remove the DM surface, retain stored messages without deleting history.
if(CHATTABS.includes('1:1'))CHATTABS.splice(CHATTABS.indexOf('1:1'),1);
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

/* 사용자 모임: 회원/경험치/비공개 채팅은 별도 인증 RPC가 관리합니다. */
function clubSoulColor(row){
 const id=row.user_id||row.from_id||row.sender_id||row.actor_id||row.account_id;
 const roster=S.sb?.roster||[],members=typeof CLUBNET!=='undefined'?CLUBNET.members||[]:[];
 const named=members.filter(m=>m.name===(row.name||row.who));
 const resolved=id||((named.length===1)?named[0].user_id:null);
 const profile=roster.find(r=>String(r.id)===String(resolved));
 const own=resolved&&String(resolved)===String(typeof ACCT!=='undefined'?ACCT.id:S.sb?.id);
 const color=own?S.color:profile?.color||row.color||named[0]?.color;
 return /^#[0-9a-f]{6}$/i.test(String(color||''))?color:'var(--violetL)';
}
function clubSoulName(row){return `<span class="club-soul-name" style="color:${clubSoulColor(row)}">${esc(row.name||row.who||row.user_id||'이름 없음')}</span>`;}
const CLUBNET={owner:'',mine:null,clubs:[],members:[],ready:false,busy:false,error:'',at:0,cursor:0,scope:'',sending:false,directoryAt:0,epoch:0};
const CLUB_PERKS=[{lv:1,key:'know',v:.02,n:'지식 +2%'},{lv:3,key:'loot',v:.03,n:'전리품 +3%'},{lv:5,key:'gold',v:.03,n:'륜 획득 +3%'},{lv:7,key:'study',v:.05,n:'수업 보상 +5%'},{lv:10,key:'know',v:.03,n:'지식 추가 +3%'},{lv:10,key:'loot',v:.02,n:'전리품 추가 +2%'}];
function clubCurrent(){return CLUBNET.owner===String(ACCT?.id||'')&&CLUBNET.ready?CLUBNET.mine:null;}
const clubLegacyOpt=clubOpt;
clubOpt=function(key){if(!CLUBNET.ready||CLUBNET.owner!==String(ACCT?.id||''))return clubLegacyOpt(key);const mine=clubCurrent();return mine?CLUB_PERKS.filter(p=>p.lv<=mine.lv&&p.key===key).reduce((n,p)=>n+p.v,0):0;};
function clubRender(){
 if(VIEW!=='club')return;
 const draft=[...document.querySelectorAll('#main [data-club-draft],#club-name,#club-intro')].map(el=>({id:el.id,el})).filter(x=>x.el).map(({id,el})=>({id,value:el.value,focused:document.activeElement===el,start:el.selectionStart,end:el.selectionEnd}));
 const scroll=window.scrollY;renderMain();window.scrollTo(0,scroll);
 for(const d of draft){const el=document.getElementById(d.id);if(el){el.value=d.value;if(d.focused){el.focus();if(d.start!==null&&d.start!==undefined)el.setSelectionRange(d.start,d.end);}}}
}
function clubErrorMessage(error){
 let message=String(error?.message||error),code='';try{const detail=JSON.parse(message);message=detail.message||message;code=detail.code||'';}catch(_){}
 if(code==='23505')return '이미 사용 중인 모임 이름입니다.';
 if(code==='55P03'||code==='57014')return '서버가 기록을 반영 중입니다. 잠시 후 다시 시도해 주세요.';
 if(message==='CLUB_AUTH')return '로그인 상태를 확인해 주세요.';
 if(message==='Failed to fetch'||error?.name==='AbortError')return '서버 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
 return message.slice(0,150);
}
async function clubRpc(action,data={}){
 if(!acctIn())throw Error('로그인한 뒤 이용해 주세요.');
 return acctFetch('rpc/runner_club',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_user:ACCT.id,p_token:ACCT.tok,p_action:action,p_data:{directory:VIEW==='club',...data}})});
}
function clubApply(r,owner){
 if(String(ACCT.id)!==owner)return;
 const scope=r.mine?'club:'+r.mine.id:'';
 if(CLUBNET.scope!==scope){CLUBNET.cursor=0;Object.assign(CLUBNET,{vault:{rin:0,items:{}},posts:[],logs:[],requests:[]});S.msgs=S.msgs.filter(m=>m.tab!=='모임');}
 Object.assign(CLUBNET,{owner,mine:r.mine,clubs:Array.isArray(r.clubs)?r.clubs:CLUBNET.clubs,members:r.members||[],ready:true,error:'',scope});
 Object.assign(CLUBNET,{version:r.version||1});for(const k of ['vault','posts','logs','requests'])if(r[k]!==undefined)CLUBNET[k]=r[k];
 if(Array.isArray(r.clubs))CLUBNET.directoryAt=Date.now();
 const rows=(r.messages||[]).map(m=>({...m,id:'club:'+m.id,tab:'모임',scope,body:fmtChat(m.body),_clubVerified:true}));
 if(rows.length){CLUBNET.cursor=Math.max(CLUBNET.cursor,...r.messages.map(m=>Number(m.id)));chatRows(rows,true,false);}
 renderTop();clubRender();if(S.chatTab==='모임')renderChat();
}
async function clubRefresh(force=false){
 if(!S?.made||!acctIn()||CLUBNET.busy||document.hidden)return;
 const owner=String(ACCT.id);
 if(CLUBNET.owner!==owner)Object.assign(CLUBNET,{owner,mine:null,clubs:[],members:[],ready:false,error:'',at:0,cursor:0,scope:'',directoryAt:0,vault:{rin:0,items:{}},posts:[],logs:[],requests:[],version:1});
 const interval=S.chatTab==='모임'?5000:VIEW==='club'?15000:60000;
 if(!force&&Date.now()-CLUBNET.at<interval)return;
 CLUBNET.busy=true;CLUBNET.at=Date.now();
 try{const r=await clubRpc('snapshot',{after:CLUBNET.cursor,club:String(clubCurrent()?.id||'')});if(!r?.ok)throw Error('모임 정보를 불러오지 못했습니다.');clubApply(r,owner);}
 catch(e){if(String(ACCT.id)===owner){CLUBNET.error=/PGRST202|404|Could not find.*runner_club/.test(String(e.message))?'모임 서버 설치가 필요합니다. 운영자가 모임 업데이트를 적용한 뒤 다시 시도해 주세요.':'모임 연결을 확인해 주세요. 잠시 후 다시 시도할 수 있습니다.';clubRender();}}
 finally{CLUBNET.busy=false;clubRender();}
}
async function clubAction(action,data={}){
 if(CLUBNET.busy){toast('모임 정보를 반영 중입니다. 잠시 후 다시 눌러 주세요.');return false;}
 const owner=String(ACCT.id);CLUBNET.busy=true;CLUBNET.epoch++;
 try{const r=await clubRpc(action,data);if(!r?.ok)throw Error(r?.message||'모임 작업에 실패했습니다.');clubApply(r,owner);toast(r.message||{create:'모임을 만들었습니다.',join:'모임에 가입했습니다.',leave:'모임을 탈퇴했습니다.',attend:'출석했습니다. 모임 경험치 +10'}[action]||'반영했습니다.','good');return true;}
 catch(e){toast(clubErrorMessage(e),'bad');return false;}
 finally{CLUBNET.busy=false;clubRender();}
}
function clubCreate(){const name=document.getElementById('club-name')?.value.trim(),intro=document.getElementById('club-intro')?.value.trim();if(!name||name.length<2||name.length>20){toast('모임 이름은 2~20자로 입력해 주세요.','bad');return;}clubAction('create',{name,intro});}
function clubLeave(){const mine=clubCurrent();if(mine&&confirm(mine.owner_id===ACCT.id?'탈퇴하면 가장 먼저 가입한 부원에게 모임장이 넘어갑니다. 마지막 부원이면 모임과 모임 채팅이 삭제됩니다. 탈퇴할까요?':'모임을 탈퇴할까요?'))clubAction('leave');}
function clubSimpleView(){
 if(!CLUBNET.error&&(!CLUBNET.ready||Date.now()-CLUBNET.directoryAt>15000))setTimeout(()=>clubRefresh(!CLUBNET.directoryAt),0);
 const mine=clubCurrent(),disabled=CLUBNET.busy?'disabled':'';
 const perks=`<div class="card pad" style="margin-top:14px"><div class="sect-t">레벨별 모임 혜택</div><div class="tiny muted">가입한 부원에게 자동 적용 · 하루 한 번 출석으로 모임 경험치 +10 · 경험치 100마다 레벨 상승 · 최대 Lv 10</div><div class="club-perks">${CLUB_PERKS.map(p=>`<div class="sub ${mine&&mine.lv>=p.lv?'club-perk-active':''}"><b>Lv ${p.lv}</b> · ${p.n}<span class="tiny muted">${mine?(mine.lv>=p.lv?' 적용 중':' 잠김'):''}</span></div>`).join('')}</div></div>`;
 const status=CLUBNET.error?`<div class="card pad" role="status">${esc(CLUBNET.error)} <button class="btn sm" onclick="clubRefresh(true)">다시 연결</button></div>`:!CLUBNET.ready?'<div class="card pad" role="status">모임을 불러오는 중입니다…</div>':'';
 const member=mine?`<div class="card pad"><div class="spread"><h3>${esc(mine.name)} <span class="tag g">Lv ${mine.lv}</span></h3><span class="tiny muted">${CLUBNET.members.length} / 4명</span></div><p class="club-intro">${esc(mine.intro||'자유롭게 모여 함께 성장하는 모임입니다.')}</p><div class="tiny muted">누적 모임 경험치 ${nf(mine.xp)}${mine.lv<10?' · 다음 레벨까지 '+(mine.lv*100-mine.xp):' · 최고 레벨'} · 내 기여도 ${nf(mine.contribution)}</div><div class="bar jd" style="margin-top:8px"><i style="width:${mine.lv>=10?100:mine.xp%100}%"></i></div><div class="row" style="margin-top:12px"><button class="btn pri" ${disabled} ${mine.attended?'disabled':''} onclick="clubAction('attend')">${mine.attended?'오늘 출석 완료':'출석 · 경험치 +10'}</button><button class="btn" onclick="setChatTab('모임');if(document.body.classList.contains('mobile-game')&&!document.body.classList.contains('mobile-chat-open'))toggleMobileChat()">모임 채팅</button><button class="btn sm red" onclick="clubLeave()" ${disabled}>탈퇴</button></div><div class="tiny muted" style="margin-top:8px">출석은 한국 시간 자정에 초기화됩니다. 모임장은 탈퇴 시 가장 오래된 부원에게 자동 승계됩니다.</div></div><div class="card pad" style="margin-top:14px"><div class="sect-t">함께하는 부원</div>${CLUBNET.members.map(m=>`<div class="spread club-member"><b>${esc(m.name)} ${m.user_id===mine.owner_id?'<span class="tag g">모임장</span>':''}</b><span class="tiny muted">기여도 ${nf(m.contribution)}</span></div>`).join('')}</div>`:CLUBNET.ready?`<div class="card pad"><div class="sect-t">새 모임 만들기 · 무료</div><label for="club-name">모임 이름</label><input class="inp" id="club-name" minlength="2" maxlength="20" placeholder="2~20자"><label for="club-intro">소개</label><textarea class="inp" id="club-intro" maxlength="200" rows="3" placeholder="어떤 모임인지 소개해 주세요 · 200자까지"></textarea><button class="btn pri" onclick="clubCreate()" ${disabled}>모임 만들기</button><div class="tiny muted">한 사람당 한 모임 · 누구나 가입 가능 · 최대 4명</div></div>`:'';
 const list=CLUBNET.ready?`<div class="card pad" style="margin-top:14px"><div class="spread"><div class="sect-t">모임 둘러보기</div><button class="btn sm" onclick="clubRefresh(true)" ${disabled}>새로고침</button></div><div class="grid g2">${CLUBNET.clubs.map(c=>`<div class="sub"><h4>${esc(c.name)} · Lv ${c.lv}</h4><p class="tiny muted club-intro">${esc(c.intro||'함께할 부원을 기다립니다.')}</p><div class="spread"><span class="tiny muted">${c.members} / 4명</span>${mine?`<span class="tag">${mine.id===c.id?'내 모임':'가입하려면 현재 모임을 탈퇴해 주세요'}</span>`:`<button class="btn pri sm" ${disabled} ${c.members>=4?'disabled':''} onclick="clubAction('join',{id:${Number(c.id)}})">${c.members>=4?'정원 마감':'가입하기'}</button>`}</div></div>`).join('')||'<div class="tiny muted">아직 모임이 없습니다. 첫 모임을 만들어 보세요.</div>'}</div></div>`:'';
 return head('학생들이 직접 꾸리는 모임',ic('lantern')+' 모임',mine?mine.name+' · Lv '+mine.lv:'만들고, 모이고, 함께 성장하세요')+status+member+perks+list;
};
if(!CHATTABS.includes('모임'))CHATTABS.push('모임');
const clubOldScope=chatScope;chatScope=function(tab){return tab==='모임'?(clubCurrent()?'club:'+clubCurrent().id:''):clubOldScope(tab);};
const clubOldVisible=chatVisible;chatVisible=function(m){if(S.chatTab==='모임')return !!clubCurrent()&&m.tab==='모임'&&m.scope===chatScope('모임');return clubOldVisible(m);};
// Never accept a public messages-table row as a private club message.
const clubOldRows=chatRows;chatRows=function(rows,...args){return clubOldRows((rows||[]).filter(r=>r.tab!=='모임'||r._clubVerified===true),...args);};
const clubOldContext=chatContextHTML;chatContextHTML=function(){if(S.chatTab==='모임')return clubCurrent()?'모임 부원만 볼 수 있는 대화입니다.':CLUBNET.error||'모임에 가입하면 전용 채팅이 열립니다.';return clubOldContext();};
const clubOldRenderChat=renderChat;renderChat=function(){const result=clubOldRenderChat.apply(this,arguments);if(S.chatTab==='모임'){const label=document.getElementById('chatscope');if(label)label.textContent=clubCurrent()?.name||'가입한 모임 없음';}if(S?.made&&acctIn())setTimeout(()=>clubRefresh(),0);return result;};
const clubOldSend=sendChat;sendChat=function(){
 if(S.chatTab!=='모임')return clubOldSend.apply(this,arguments);
 const input=document.getElementById('chatinput'),raw=input?.value.trim(),mine=clubCurrent();
 if(!mine){toast('모임에 먼저 가입해 주세요.','bad');return;}
 if(!raw||CLUBNET.sending)return;
 if(raw.length>1000){toast('모임 메시지는 1000자까지 입력할 수 있습니다.','bad');return;}
 const owner=String(ACCT.id),epoch=CLUBNET.epoch,scope=String(mine.id),key='mmjy-club-message-'+owner;
 let pending;try{pending=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
 if(!pending||pending.body!==raw||pending.club!==scope)pending={body:raw,club:scope,mode:chatModeOf(S.chatMode),request:crypto.randomUUID()};
 try{localStorage.setItem(key,JSON.stringify(pending));}catch(_){}
 CLUBNET.sending=true;
 return clubRpc('message',pending).then(r=>{if(String(ACCT.id)!==owner||CLUBNET.epoch!==epoch)return;if(!r?.ok)throw Error('메시지를 저장하지 못했습니다.');try{localStorage.removeItem(key);}catch(_){}if(input.value.trim()===raw)input.value='';clubApply(r,owner);if(S.chatTab==='모임')renderChat(true);}).catch(()=>toast('모임 메시지가 전송되지 않았습니다. 입력 내용은 남아 있습니다. 다시 보내 주세요.','bad')).finally(()=>{CLUBNET.sending=false;});
};
let CLUBTIMER=null;
function clubPolling(){if(CLUBTIMER)clearInterval(CLUBTIMER);CLUBTIMER=null;if(!document.hidden)CLUBTIMER=setInterval(()=>clubRefresh(),5000);}
clubPolling();
document.addEventListener('visibilitychange',()=>{clubPolling();if(!document.hidden)clubRefresh();});

/* 모임 확장 화면 */
const CLUBUI={tab:'정보·기여',query:'',sort:'level',vaultFilter:'all',logFilter:'all'};
const CLUB_TABS=['정보·기여','부원','모임방','게시판','공용 창고','기록','다른 모임'];
const clubArg=v=>esc(JSON.stringify(v)).replace(/'/g,'&#39;');
const clubOwner=()=>clubCurrent()?.owner_id===ACCT.id;
const clubDate=v=>new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
const clubMode=v=>({open:'누구나 가입',approval:'신청 후 승인',closed:'모집 중지'}[v]||'누구나 가입');
function clubTab(tab){CLUBUI.tab=tab;clubRender();clubRefresh(true);}
function clubChatOpen(){setChatTab('모임');if(document.body.classList.contains('mobile-game')&&!document.body.classList.contains('mobile-chat-open'))toggleMobileChat();}
function clubEdit(){const c=clubCurrent();modal('모임 관리',`<label for="club-edit-intro">모임 소개 · 200자</label><textarea class="inp club-field" id="club-edit-intro" maxlength="200">${esc(c.intro||'')}</textarea><label for="club-edit-notice">공지 · 1000자</label><textarea class="inp club-field" id="club-edit-notice" maxlength="1000" rows="5">${esc(c.notice||'')}</textarea><label for="club-edit-mode">가입 방식</label><select class="inp club-field" id="club-edit-mode">${['open','approval','closed'].map(k=>`<option value="${k}" ${c.join_mode===k?'selected':''}>${clubMode(k)}</option>`).join('')}</select><button class="btn pri" onclick="clubAction('edit',{intro:document.getElementById('club-edit-intro').value,notice:document.getElementById('club-edit-notice').value,join_mode:document.getElementById('club-edit-mode').value}).then(ok=>{if(ok)closeModal()})">저장</button>`);}
function clubRoomEdit(){const c=clubCurrent();modal('모임방 꾸미기',`<label for="club-room-style">분위기</label><select id="club-room-style" class="inp club-field">${[['lantern','등불의 방'],['book','서고의 방'],['moon','달빛의 방']].map(([k,n])=>`<option value="${k}" ${c.room_style===k?'selected':''}>${n}</option>`).join('')}</select><label for="club-room-text">모임방 메모</label><textarea id="club-room-text" class="inp club-field" rows="5" maxlength="1000">${esc(c.room_text||'')}</textarea><button class="btn pri" onclick="clubAction('room_edit',{style:document.getElementById('club-room-style').value,text:document.getElementById('club-room-text').value}).then(ok=>{if(ok)closeModal()})">꾸미기 저장</button>`);}
function clubAsk(action,user){const labels={kick:'이 부원을 내보낼까요?',transfer_lead:'이 부원에게 모임장을 위임할까요?'};if(confirm(labels[action]))clubAction(action,{user});}
function clubPostModal(parent=null){modal(parent?'댓글 남기기':'모임 게시글',`${parent?'':`<label for="club-post-title">제목</label><input id="club-post-title" class="inp club-field" maxlength="60" placeholder="제목 · 60자까지">`}<label for="club-post-body">내용</label><textarea id="club-post-body" class="inp club-field" rows="6" maxlength="2000" placeholder="부원끼리 나눌 이야기를 남겨 주세요. RP 표현도 사용할 수 있습니다."></textarea><button class="btn pri" onclick="clubPostSubmit(${parent===null?'null':Number(parent)})">남기기</button>`);}
async function clubPostSubmit(parent){const body=document.getElementById('club-post-body')?.value.trim(),title=document.getElementById('club-post-title')?.value.trim()||'';if(!body)return toast('내용을 입력해 주세요.','bad');const key='mmjy-club-post-'+ACCT.id,signature=JSON.stringify([clubCurrent()?.id,parent,title,body]);let draft;try{draft=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}if(!draft||draft.signature!==signature)draft={signature,request:crypto.randomUUID()};try{localStorage.setItem(key,JSON.stringify(draft));}catch(_){}if(await clubAction('post',{title,body,parent,request:draft.request})){try{localStorage.removeItem(key);}catch(_){}closeModal();}}
function clubDeletePost(id){if(confirm('이 게시글과 댓글을 삭제할까요?'))clubAction('delete_post',{id});}
async function clubInspect(id){try{const r=await clubRpc('inspect',{id});if(!r.preview)return toast('모임을 찾을 수 없습니다.','bad');const c=r.preview;modal('모임 살펴보기',`<h3>${esc(c.name)} · Lv ${c.lv}</h3><p class="club-intro">${esc(c.intro||'소개가 없습니다.')}</p><p>${c.members} / 4명 · ${clubMode(c.join_mode)}</p><div class="tiny muted">모임 채팅·게시판·창고·활동 기록은 가입한 부원만 열람합니다.</div>`);}catch(_){toast('모임 정보를 불러오지 못했습니다.','bad');}}
function clubDirectory(){let rows=CLUBNET.clubs.filter(c=>(c.name+' '+c.intro).toLowerCase().includes(CLUBUI.query.toLowerCase()));rows=rows.slice().sort(CLUBUI.sort==='members'?(a,b)=>b.members-a.members:CLUBUI.sort==='new'?(a,b)=>new Date(b.created_at)-new Date(a.created_at):CLUBUI.sort==='levels'?(a,b)=>b.level_sum-a.level_sum:(a,b)=>b.xp-a.xp);const mine=clubCurrent();return `<div class="card pad"><div class="spread"><h3>다른 모임</h3><button class="btn sm" onclick="clubRefresh(true)">새로고침</button></div><div class="club-tools"><input class="inp" id="club-search" data-club-draft value="${esc(CLUBUI.query)}" placeholder="이름이나 소개로 찾기" onkeydown="if(event.key==='Enter'){CLUBUI.query=this.value;clubRender()}"><button class="btn sm" onclick="CLUBUI.query=document.getElementById('club-search').value;clubRender()">찾기</button><select class="inp" aria-label="모임 정렬" onchange="CLUBUI.sort=this.value;clubRender()">${[['level','레벨순'],['levels','부원 레벨 합'],['members','부원 수'],['new','새로 생긴 순']].map(([k,n])=>`<option value="${k}" ${CLUBUI.sort===k?'selected':''}>${n}</option>`).join('')}</select></div><div class="tiny muted">${rows.length}개 모임 · 정원은 모임장 포함 4명입니다.</div>${rows.map((c,i)=>`<article class="club-directory-row"><span class="club-rank">${i+1}</span><div><b>${esc(c.name)}</b> <span class="tag">Lv ${c.lv}</span><p class="tiny muted club-intro">${esc(c.intro||'함께할 부원을 기다립니다.')}</p><div class="tiny muted">${c.members} / 4명 · ${clubMode(c.join_mode)} · 모임장 ${clubSoulName({user_id:c.owner_id,name:c.owner_name||c.owner_id,color:c.owner_color})} · 부원 레벨 합 ${nf(c.level_sum||0)}</div></div><div class="row"><button class="btn sm" onclick="clubInspect(${c.id})">살펴보기</button>${mine?mine.id===c.id?'<span class="tag g">내 모임</span>':'':c.applied?`<button class="btn sm" onclick="clubAction('cancel_apply',{id:${c.id}})">신청 취소</button>`:`<button class="btn pri sm" ${c.members>=4||c.join_mode==='closed'||CLUBNET.busy?'disabled':''} onclick="clubAction('join',{id:${c.id}})">${c.members>=4?'정원 마감':c.join_mode==='approval'?'가입 신청':c.join_mode==='closed'?'모집 중지':'가입하기'}</button>`}</div></article>`).join('')||'<div class="club-empty">조건에 맞는 모임이 없습니다.</div>'}</div>`;}
function clubPerksHTML(){const c=clubCurrent();return `<div class="card pad"><div class="sect-t">레벨별 모임 혜택</div><div class="club-perks">${CLUB_PERKS.map(p=>`<div class="sub ${c&&c.lv>=p.lv?'club-perk-active':''}"><b>Lv ${p.lv}</b> · ${p.n}<span class="tiny muted">${c&&c.lv>=p.lv?' 적용 중':''}</span></div>`).join('')}</div><p class="tiny muted">부원에게 자동 적용 · 경험치 100마다 레벨 상승 · 최대 Lv 10</p></div>`;}
function clubInfoHTML(){const c=clubCurrent();return `<div class="grid g2"><section class="card pad"><h3>출석 · 기여</h3><p class="tiny muted">부원마다 한국 시간 자정 기준 하루 한 번 출석할 수 있습니다. 출석은 모임 경험치와 내 기여도를 10씩 올립니다.</p><div class="row"><button class="btn pri" ${c.attended?'disabled':''} onclick="clubAction('attend')">${c.attended?'오늘 출석 완료':'출석 · 경험치 +10'}</button><span class="tiny muted">내 기여도 ${nf(c.contribution)}</span></div><hr class="hr"><b>륜 기부</b><p class="tiny muted">기부한 륜은 모임 금고에 쌓이고, 같은 점수만큼 모임 경험치·개인 기여도가 올라갑니다. 오늘 ${c.donated||0} / 200점</p><div class="row">${[10,50,200].map(n=>`<button class="btn sm" ${(c.donated||0)+n>200?'disabled':''} onclick="clubTransfer('donate',{points:${n}})">${n}점 · ${nf(n*474)}륜</button>`).join('')}</div></section><section class="card pad"><h3>모임 운영</h3><p class="club-intro tiny">${esc(c.intro||'함께할 이야기를 만들어 보세요.')}</p><p class="tiny muted">${clubMode(c.join_mode)} · 모임장 포함 최대 4명<br>모임방 Lv ${c.room_lv||1} · 창고 ${60+((c.room_lv||1)-1)*10}칸</p><div class="row">${clubOwner()?'<button class="btn" onclick="clubEdit()">공지·소개·가입 관리</button>':''}<button class="btn sm red" onclick="clubLeave()">모임 탈퇴</button></div><p class="tiny muted">모임장 탈퇴 시 가장 먼저 가입한 부원이 승계합니다. 마지막 부원은 공용 창고와 금고를 비워야 탈퇴할 수 있습니다.</p></section></div>${clubPerksHTML()}`;}
function clubMembersHTML(){const c=clubCurrent();return `<section class="card pad"><h3>함께하는 부원 · ${CLUBNET.members.length} / 4명</h3>${CLUBNET.members.map(m=>`<div class="club-member"><div class="spread"><div><b>${clubSoulName(m)}</b> ${m.user_id===c.owner_id?'<span class="tag g">모임장</span>':''}<span class="tiny muted">Lv ${m.lvl||1} · ${m.attended?'오늘 출석':'오늘 미출석'}</span></div><span class="tiny muted">기여도 ${nf(m.contribution)}</span></div><div class="spread"><span class="tiny muted">가입 ${clubDate(m.joined_at)} · ${m.user_id===c.owner_id||m.can_withdraw?'창고 출납 가능':'창고 넣기만 가능'}</span>${clubOwner()&&m.user_id!==ACCT.id?`<div class="row"><button class="btn sm" onclick="clubAction('permissions',{user:${clubArg(m.user_id)},allowed:${!m.can_withdraw}})">출납 ${m.can_withdraw?'권한 회수':'권한 부여'}</button><button class="btn sm" onclick="clubAsk('transfer_lead',${clubArg(m.user_id)})">모임장 위임</button><button class="btn sm red" onclick="clubAsk('kick',${clubArg(m.user_id)})">내보내기</button></div>`:''}</div></div>`).join('')}</section>${clubOwner()?`<section class="card pad"><h3>가입 신청</h3>${(CLUBNET.requests||[]).map(r=>`<div class="spread club-member"><b>${clubSoulName(r)}</b><div class="row"><button class="btn pri sm" ${CLUBNET.members.length>=4?'disabled':''} onclick="clubAction('approve',{user:${clubArg(r.user_id)}})">승인</button><button class="btn sm" onclick="clubAction('reject',{user:${clubArg(r.user_id)}})">거절</button></div></div>`).join('')||'<p class="tiny muted">대기 중인 신청이 없습니다.</p>'}</section>`:''}`;}
function clubRoomHTML(){const c=clubCurrent();return `<section class="card pad"><div class="spread"><h3>우리 모임방 · Lv ${c.room_lv||1}</h3>${clubOwner()?'<button class="btn sm" onclick="clubRoomEdit()">모임방 꾸미기</button>':''}</div><div class="club-room club-room-${c.room_style||'lantern'}"><div><b>${esc(c.name)}</b><p>${esc(c.room_text||'등불 아래 모여 쉬어가는 네 사람의 자리.')}</p></div></div><div class="club-seats">${Array.from({length:4},(_,i)=>{const m=CLUBNET.members[i];return `<div class="sub"><b>${m?clubSoulName(m):'빈자리'}</b><div class="tiny muted">${m?(m.attended?'오늘의 등불을 밝혔어요':'오늘의 출석을 기다려요'):'함께할 부원을 기다려요'}</div></div>`;}).join('')}</div><p class="tiny muted">모임방 단계마다 창고가 10칸 늘어납니다. 최대 Lv 5 · 현재 ${60+((c.room_lv||1)-1)*10}칸</p>${clubOwner()?`<button class="btn" ${(c.room_lv||1)>=5?'disabled':''} onclick="if(confirm('모임 금고에서 ${nf((c.room_lv||1)*10000)}륜을 사용해 모임방을 확장할까요?'))clubTransfer('room_upgrade',{})">${c.room_lv>=5?'최고 단계':'모임방 확장 · 금고 '+nf((c.room_lv||1)*10000)+'륜'}</button>`:''}</section>`;}
function clubBoardHTML(){const posts=CLUBNET.posts||[],row=p=>`<div class="spread"><b>${clubSoulName(p)}</b><span class="tiny muted">${clubDate(p.created_at)}</span></div><div class="club-post-body">${fmtChat(p.body)}</div><div class="row">${p.user_id===ACCT.id||clubOwner()?`<button class="btn sm red" onclick="clubDeletePost(${p.id})">삭제</button>`:''}</div>`;return `<section class="card pad"><div class="spread"><h3>모임 게시판</h3><button class="btn pri" onclick="clubPostModal()">글 남기기</button></div><p class="tiny muted">가입한 부원끼리 읽는 게시판 · 최근 게시글·댓글 150개</p>${posts.filter(p=>!p.parent_id).map(p=>`<article class="sub club-post"><h4>${esc(p.title||'모임 이야기')}</h4>${row(p)}<button class="btn sm" onclick="clubPostModal(${p.id})">댓글 남기기</button>${posts.filter(x=>x.parent_id===p.id).slice().reverse().map(x=>`<div class="club-reply">${row(x)}</div>`).join('')}</article>`).join('')||'<div class="club-empty">첫 이야기를 남겨 보세요.</div>'}</section>`;}
function clubLogsHTML(){const rows=(CLUBNET.logs||[]).filter(l=>CLUBUI.logFilter==='all'||(CLUBUI.logFilter==='vault'?['deposit','withdraw','seed_withdraw','donate','room_upgrade'].includes(l.kind):!['deposit','withdraw','seed_withdraw','room_upgrade'].includes(l.kind)));return `<section class="card pad"><div class="spread"><h3>모임 기록</h3><div class="row">${[['all','전체'],['activity','부원 활동'],['vault','창고 출납']].map(([k,n])=>`<button class="btn sm ${CLUBUI.logFilter===k?'pri':''}" onclick="CLUBUI.logFilter='${k}';clubRender()">${n}</button>`).join('')}</div></div><p class="tiny muted">서버에 기록된 최근 활동 100건 · 한국 시간</p><div class="club-log">${rows.map(l=>`<div class="club-log-row"><time>${clubDate(l.created_at)}</time><b>${clubSoulName(l)}</b><span>${esc(l.body)}</span></div>`).join('')||'<div class="club-empty">아직 기록이 없습니다.</div>'}</div></section>`;}
VIEWS.club=function(){
 if(!CLUBNET.ready||CLUBNET.error||CLUBNET.version!==2)return clubSimpleView()+(CLUBNET.ready&&CLUBNET.version!==2?'<div class="card pad">모임 확장 서버 업데이트를 적용하면 새 기능이 열립니다.</div>':'');
 const c=clubCurrent();
 if(!CLUBNET.directoryAt||Date.now()-CLUBNET.directoryAt>15000)setTimeout(()=>clubRefresh(!CLUBNET.directoryAt),0);
 if(!c)return clubSimpleView().replace(/<div class="card pad" style="margin-top:14px"><div class="spread"><div class="sect-t">모임 둘러보기[\s\S]*$/, '')+clubDirectory();
 const body={'정보·기여':clubInfoHTML,'부원':clubMembersHTML,'모임방':clubRoomHTML,'게시판':clubBoardHTML,'공용 창고':clubVaultHTML,'기록':clubLogsHTML,'다른 모임':clubDirectory}[CLUBUI.tab]||clubInfoHTML;
 return head('네 사람이 함께 꾸리는 모임',ic('lantern')+' 모임',`${c.name} · 최대 4명`)+`<section class="card pad club-summary"><div class="spread"><h3>${esc(c.name)} <span class="tag g">Lv ${c.lv}</span></h3><span class="tiny muted">${CLUBNET.members.length} / 4명 · ${clubMode(c.join_mode)}</span></div><div class="bar jd"><i style="width:${c.lv>=10?100:c.xp%100}%"></i></div><p class="tiny muted">누적 경험치 ${nf(c.xp)} · ${c.lv>=10?'최고 레벨':'다음 레벨까지 '+(c.lv*100-c.xp)} · 내 기여도 ${nf(c.contribution)}</p><div class="club-notice"><b>공지</b><p>${esc(c.notice||'부담 없이 모여, 각자의 속도로 함께 나아가요.')}</p></div><div class="row"><button class="btn pri" onclick="clubChatOpen()">모임 채팅</button><span class="tag">${c.attended?'오늘 출석 완료':'오늘 미출석'}</span></div></section><nav class="club-tabs" aria-label="모임 메뉴">${CLUB_TABS.map(t=>`<button class="btn ${CLUBUI.tab===t?'pri':''}" aria-current="${CLUBUI.tab===t?'page':'false'}" onclick="clubTab('${t}')">${t==='부원'?t+' '+CLUBNET.members.length:t}</button>`).join('')}</nav><div class="club-content">${body()}</div>`;
};

const CLUB_KINDS={material:'재료',ingredient:'각인 재료',building:'건축 재료',crop:'개별 재료',potion:'물약',seed:'씨앗',dish:'요리',gear:'법구'};
function clubCatalog(){const rows=[];const add=(kind,key,name,qty,gear)=>{if(qty>0)rows.push({kind,key:String(key),name:name||String(key),qty:Number(qty),gear});};
 for(const [kind,obj] of [['material',S.mat],['building',S.bmat],['crop',S.ingredients]])for(const [key,n] of Object.entries(obj||{}))add(kind,key,key,n);
 for(const [key,n] of Object.entries(S.ing||{}))add('ingredient',key,(typeof ING!=='undefined'?ING.find(x=>x.k===key)?.n:null)||key,n);
 for(const [key,n] of Object.entries(S.potion||{}))add('potion',key,POTIONS.find(x=>x.id===key)?.n||key,n);
 for(const [key,n] of Object.entries(S.farm?.seeds||{}))add('seed',key,CROPS.find(x=>x.id===key)?.n||key,n);
 for(const [key,n] of Object.entries(S.kit?.have||{}))add('dish',key,DISHES.find(x=>x.id===key)?.n||key,n);
 for(const it of S.bag||[])if(!it.bound&&!it.locked&&!it.lock&&SLOTS.some(s=>s.k===it.slot))add('gear',it.id,it.name,1,it);
 return rows;
}
function clubGearDetail(source,key){const it=source==='bag'?(S.bag||[]).find(x=>String(x.id)===String(key)):CLUBNET.vault?.items?.[key]?.gear;if(!it)return;modal(esc(it.name||'법구'),`<p>${SLOTS.find(s=>s.k===it.slot)?.n||'법구'} · Lv ${Number(it.lv)||1} · ${GRADES[it.grade]?.n||'일반'}</p><div class="tiny muted">강화 +${Number(it.enh||it.en||0)} · 점수 ${nf(gearScore(it))}</div>`);}
function clubVaultChoose(side,key){const select=document.getElementById('club-'+side+'-select');if(select){select.value=key;select.focus();}}
function clubVaultMove(side,all=false){const select=document.getElementById('club-'+side+'-select');if(!select?.value)return toast('물품을 선택해 주세요.','bad');const item=side==='deposit'?clubCatalog().find(x=>x.kind+':'+x.key===select.value):CLUBNET.vault?.items?.[select.value];if(!item)return toast('물품 목록을 새로고침해 주세요.','bad');const qty=all?(side==='withdraw'?Math.min(item.qty,item.kind==='seed'?10:99):item.qty):Number(document.getElementById('club-'+side+'-qty')?.value);clubTransfer(side,{kind:item.kind,key:side==='withdraw'?select.value:item.key,name:item.name,qty:item.kind==='gear'?1:qty});}
function clubVaultHTML(){const mine=clubCurrent(),vault=CLUBNET.vault||{rin:0,items:{}},all=Object.entries(vault.items||{}),filter=CLUBUI.vaultFilter;const match=i=>filter==='all'||i.kind===filter||filter==='material'&&['ingredient','building','crop'].includes(i.kind);const stock=all.filter(([,v])=>match(v)),own=clubCatalog().filter(match),slots=60+((mine.room_lv||1)-1)*10;
 const select=(side,rows)=>`<select class="inp club-field" id="club-${side}-select" data-club-draft aria-label="${side==='deposit'?'넣을 물품':'꺼낼 물품'}">${rows.map(([key,i])=>`<option value="${esc(key)}">${esc(i.name)} · ${CLUB_KINDS[i.kind]||i.kind} (${nf(i.qty)})</option>`).join('')}</select><div class="club-tools"><input id="club-${side}-qty" data-club-draft class="inp" type="number" min="1" max="1000000000" step="1" placeholder="수량" aria-label="${side==='deposit'?'넣을 수량':'꺼낼 수량'}"><button class="btn sm" ${!rows.length||side==='withdraw'&&!mine.can_withdraw?'disabled':''} onclick="clubVaultMove('${side}')">${side==='deposit'?'넣기':'꺼내기'}</button><button class="btn sm" ${!rows.length||side==='withdraw'&&!mine.can_withdraw?'disabled':''} onclick="clubVaultMove('${side}',true)">${side==='deposit'?'전부 넣기':'한도만큼 꺼내기'}</button></div>`;
 return `<div class="grid g2"><section class="card pad"><div class="spread"><h3>모임 공용 금고</h3><b>${nf(vault.rin||0)}륜</b></div><p class="tiny muted">부원 누구나 넣을 수 있습니다. 꺼내기는 모임장과 출납 권한이 있는 부원만 가능합니다.</p><div class="club-tools"><input id="club-cash-qty" data-club-draft class="inp" type="number" min="1" step="1" placeholder="륜 수량" aria-label="금고 륜 수량"><button class="btn sm" onclick="clubTransfer('deposit',{kind:'rin',qty:Number(document.getElementById('club-cash-qty').value)})">넣기</button><button class="btn sm" ${mine.can_withdraw?'':'disabled'} onclick="clubTransfer('withdraw',{kind:'rin',qty:Number(document.getElementById('club-cash-qty').value)})">꺼내기</button></div><p class="tiny muted">내 지갑 ${nf(S.rin)}륜${S.pairShared?' · 페어 공동 지갑':''}</p></section><section class="card pad"><h3>창고 안내 · ${all.length} / ${slots}칸</h3><p class="tiny muted">같은 종류의 물품은 수량을 합칩니다. 법구는 한 개마다 한 칸을 사용합니다. 귀속·잠금·착용 법구는 보관할 수 없습니다.<br>물품은 한 번에 99개, 씨앗은 부원당 하루 10개까지 꺼낼 수 있습니다. 모든 이동은 출납 기록에 남습니다.</p></section></div><section class="card pad"><div class="row">${[['all','전체'],['material','재료'],['potion','물약'],['seed','씨앗'],['dish','요리'],['gear','법구']].map(([k,n])=>`<button class="btn sm ${filter===k?'pri':''}" onclick="CLUBUI.vaultFilter='${k}';clubRender()">${n}</button>`).join('')}</div><div class="grid g2" style="margin-top:16px"><div><h3>내 소지품 → 창고</h3>${own.length?select('deposit',own.map(i=>[i.kind+':'+i.key,i])):'<p class="tiny muted">넣을 물품이 없습니다.</p>'}<div class="club-stock">${own.map(i=>`<button class="btn sm" onclick="clubVaultChoose('deposit',${clubArg(i.kind+':'+i.key)})">${esc(i.name)} ${nf(i.qty)}</button>`).join('')}</div></div><div><h3>창고 → 내 소지품</h3>${stock.length?select('withdraw',stock):'<p class="tiny muted">보관된 물품이 없습니다.</p>'}<div class="club-stock">${stock.map(([key,i])=>`<button class="btn sm" onclick="clubVaultChoose('withdraw',${clubArg(key)})">${esc(i.name)} ${nf(i.qty)}</button>`).join('')}</div></div></div></section>${stock.some(([,i])=>i.kind==='gear')?`<section class="card pad"><h3>보관 법구</h3><div class="club-gear-grid">${stock.filter(([,i])=>i.kind==='gear').map(([key,i])=>`<div class="sub"><b>${esc(i.name)}</b><p class="tiny muted">${SLOTS.find(s=>s.k===i.gear?.slot)?.n||'법구'} · Lv ${i.gear?.lv||1} · ${GRADES[i.gear?.grade]?.n||'일반'}</p><div class="row"><button class="btn sm" onclick="clubGearDetail('vault',${clubArg(key)})">자세히</button><button class="btn sm" ${mine.can_withdraw?'':'disabled'} onclick="clubTransfer('withdraw',{kind:'gear',key:${clubArg(key)},qty:1})">꺼내기</button></div></div>`).join('')}</div></section>`:''}`;
}
function clubApplyInventory(inv){if(!inv)return;for(const k of ['rin','mat','ing','bmat','ingredients','potion','bag','gid','marketRev','pairSoloRev'])if(inv[k]!==undefined)S[k]=JSON.parse(JSON.stringify(inv[k]));if(inv.kit?.have)S.kit.have=inv.kit.have;if(inv.farm?.seeds)S.farm.seeds=inv.farm.seeds;save();renderTop();}
async function clubInventoryRpc(action,data){return clubRpc(action,data);}
async function clubTransfer(action,data){
 if(CLUBNET.busy||CLUBNET.transferBusy)return toast('모임 작업을 반영 중입니다. 잠시 후 다시 시도해 주세요.');
 const mine=clubCurrent();if(!mine)return;const owner=String(ACCT.id),key='mmjy-club-transfer-'+owner,payload={...data,club:String(mine.id)};
 if(['deposit','withdraw'].includes(action)&&(!Number.isSafeInteger(payload.qty)||payload.qty<1))return toast('수량을 양의 정수로 입력해 주세요.','bad');
 const signature=JSON.stringify([action,payload]);let pending;try{pending=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
 CLUBNET.transferBusy=true;CLUBNET.busy=true;CLUBNET.epoch++;
 try{
  if(pending&&pending.signature!==signature){const r=await clubInventoryRpc(pending.action,{...pending.payload,request:pending.request});if(!r?.ok)throw Error('이전 출납을 확인하지 못했습니다.');if(String(ACCT.id)!==owner)return;localStorage.removeItem(key);if(r.inventory)clubApplyInventory(r.inventory);clubApply(r,owner);toast('이전 출납 결과를 확인했습니다. 새 작업을 다시 눌러 주세요.');return;}
  if(!pending){pending={signature,action,payload,request:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(pending));}
  const r=await clubInventoryRpc(action,{...payload,request:pending.request});if(!r?.ok)throw Error(r?.message||'출납 결과를 확인하지 못했습니다.');if(String(ACCT.id)!==owner)return;
  localStorage.removeItem(key);if(r.inventory)clubApplyInventory(r.inventory);clubApply(r,owner);toast(r.refreshPending?'출납은 완료되었습니다. 지갑 잔액은 연결 복구 후 갱신됩니다.':r.replayed?'이전에 완료한 출납을 확인했습니다.':'모임 출납을 반영했습니다.','good');
 }catch(e){const code=String(e.message).match(/"code"\s*:\s*"([^"]+)"/)?.[1];if(code&&code!=='40003')try{localStorage.removeItem(key);}catch(_){}toast('출납 확인: '+clubErrorMessage(e),'bad');}
 finally{CLUBNET.transferBusy=false;CLUBNET.busy=false;clubRender();}
}
