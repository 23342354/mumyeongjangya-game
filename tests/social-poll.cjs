/* 교류 조회가 서버를 과하게 부르지 않는지 확인합니다.
   확인 항목: 숨은 탭에서 멈추는지, 평소에는 새 글만 이어 받는지,
   최신 글이 앞에 오는 순서와 2000개 상한이 유지되는지,
   쓰기·삭제 뒤에는 전체를 다시 받아 지운 글이 사라지는지.
   운영 서버로는 요청하지 않습니다. 조회 주소만 기록하고 응답을 꾸며 줍니다. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const settle=()=>new Promise(r=>setTimeout(r,0));

/* ── 서버 흉내 ───────────────────────────────────── */
function makeServer(){
  const db={posts:[],students:[{id:'me',name:'나'},{id:'u2',name:'상대'}],links:[],pairs:[]};
  const calls=[];
  let nextId=1;
  const add=body=>{const p={id:nextId++,parent_id:null,author_id:'u2',body,created_at:'2026-11-04T00:00:00Z'};db.posts.push(p);return p;};
  const sbGet=p=>{
    calls.push(p);
    if(p.startsWith('social_links'))return Promise.resolve(db.links.slice());
    if(p.startsWith('students'))return Promise.resolve(db.students.slice());
    if(p.startsWith('pairs'))return Promise.resolve(db.pairs.slice());
    if(p.startsWith('rp_posts')){
      const gt=/id=gt\.(\d+)/.exec(p), limit=Number(/limit=(\d+)/.exec(p)[1]);
      let rows=db.posts.slice();
      if(gt)rows=rows.filter(r=>Number(r.id)>Number(gt[1])).sort((a,b)=>a.id-b.id);
      else rows.sort((a,b)=>b.id-a.id);
      return Promise.resolve(rows.slice(0,limit));
    }
    throw new Error('예상하지 못한 조회: '+p);
  };
  return {db,calls,add,sbGet,
    reads:()=>calls.filter(p=>p.startsWith('rp_posts')),
    fulls:()=>calls.filter(p=>p.startsWith('rp_posts')&&!/id=gt\./.test(p)),
    clear:()=>{calls.length=0;}};
}

/* ── 게임 전역 흉내 ───────────────────────────────
   social.js를 불러올 때 필요한 것만 최소로 세웁니다.
   SOCIAL과 간격 상수는 const라 전역 속성이 아니므로 같은 문맥에서 읽어 옵니다. */
function load(server){
  const listeners=[];
  const doc={visibilityState:'visible',hidden:false,activeElement:null,
    addEventListener:(t,f)=>{if(t==='visibilitychange')listeners.push(f);},
    getElementById:()=>null};
  const timers=[];
  const ctx={
    console,Promise,Set,Map,Math,Date,JSON,Number,String,Array,Object,Error,encodeURIComponent,
    document:doc,
    setInterval:(f,ms)=>{const t={f,ms,dead:false};timers.push(t);return t;},
    clearInterval:t=>{if(t)t.dead=true;},
    localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    S:{made:true,sb:{id:'me',url:'https://x.test',key:'k'},friends:[],rel:[]},
    ACCT:{id:'me',tok:'t'},
    VIEW:'plaza',VIEWS:{},
    NAVDEF:[{id:'plaza',sub:[]},{id:'rec',sub:[{id:'hallv'}]},{id:'soc',sub:[]}],
    CHATTABS:['전체','1:1'],
    sbOn:()=>true,sbGet:server.sbGet,
    sbSend:(m,p)=>{server.calls.push('WRITE '+p);return Promise.resolve([]);},
    ic:()=>'',esc:s=>String(s),head:()=>'',homeOf:()=>({n:''}),fmtChat:s=>String(s),
    faceHTML:()=>'',modal(){},closeModal(){},toast(){},moveHall(){},save(){},
    renderMain(){},renderChat(){},alertBadge(){},
    pairBtn:()=>'',pairSend:()=>{},pairHTML:()=>'',pairHomeHTML:()=>'',
    pairEnsure:()=>({mine:null,partner:null}),pairFetch:()=>Promise.resolve(true),
    go(){},boot(){},
    pollAwake(){return doc.visibilityState!=='hidden';}
  };
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  new vm.Script(read('social.js'),{filename:'social.js'}).runInContext(ctx);
  const peek=expr=>vm.runInContext(expr,ctx);
  return {ctx,peek,
    SOCIAL:peek('SOCIAL'),
    MS_ON:peek('SOCIAL_MS_ON'),MS_OFF:peek('SOCIAL_MS_OFF'),PAGE:peek('SOCIAL_PAGE'),
    fetch:(...a)=>ctx.socialFetch(...a),
    reload:()=>ctx.socialReload(),
    tick:()=>ctx.socialTick(),
    live:()=>timers.filter(t=>!t.dead),
    hide:v=>{doc.visibilityState=v?'hidden':'visible';doc.hidden=!!v;listeners.forEach(f=>f());}};
}

async function main(){
  const server=makeServer();
  for(let i=0;i<5;i++)server.add('글 '+i);
  const g=load(server);
  const ids=()=>g.SOCIAL.posts.map(p=>p.id);

  /* ── 1. 전체 조회 한 번으로 시작합니다 ─────────────── */
  await g.fetch(true);
  assert.equal(server.fulls().length,1,'처음에는 전체를 한 번 받아야 합니다');
  assert.deepEqual(ids(),[5,4,3,2,1],'최신 글이 앞에 와야 합니다');
  assert.ok(g.SOCIAL.ready,'전체 조회 뒤에는 준비 상태가 됩니다');

  /* ── 2. 그 뒤에는 새 글만 이어 받습니다 ─────────────── */
  server.clear();
  server.add('새 글 A');server.add('새 글 B');
  g.SOCIAL.at=0;
  await g.fetch();
  assert.equal(server.fulls().length,0,'평소 조회는 전체를 다시 받지 않아야 합니다');
  assert.equal(server.reads().length,1,'새 글 조회는 한 번만 나갑니다');
  assert.ok(/id=gt\.5/.test(server.reads()[0]),'마지막 글 번호 뒤부터 받아야 합니다: '+server.reads()[0]);
  assert.deepEqual(ids(),[7,6,5,4,3,2,1],'새 글이 앞에, 기존 순서는 그대로');

  /* ── 3. 같은 글을 두 번 넣지 않습니다 ───────────────── */
  server.clear();g.SOCIAL.at=0;
  await g.fetch();
  assert.deepEqual(ids(),[7,6,5,4,3,2,1],'새 글이 없으면 목록이 그대로여야 합니다');

  /* ── 4. 숨은 탭에서는 조회하지 않습니다 ─────────────── */
  server.clear();
  g.hide(true);
  assert.equal(g.live().length,0,'숨은 탭에서는 조회 시계가 멈춰야 합니다');
  g.SOCIAL.at=0;
  await g.fetch();
  assert.equal(server.reads().length,0,'숨은 탭에서는 서버를 부르지 않아야 합니다');

  /* ── 5. 돌아오면 바로 따라잡습니다 ─────────────────── */
  server.add('돌아온 뒤 글');
  g.hide(false);
  assert.ok(g.live().length>0,'돌아오면 조회 시계가 다시 돌아야 합니다');
  await settle();await settle();
  assert.ok(ids().includes(8),'돌아온 직후 새 글을 받아야 합니다');

  /* ── 6. 보는 화면에 따라 간격이 달라집니다 ──────────── */
  g.ctx.VIEW='rpboard';g.tick();
  assert.equal(g.live()[0].ms,g.MS_ON,'게시판에서는 짧은 간격이어야 합니다');
  g.ctx.VIEW='plaza';g.tick();
  assert.equal(g.live()[0].ms,g.MS_OFF,'다른 화면에서는 긴 간격이어야 합니다');
  assert.ok(g.MS_OFF>g.MS_ON,'보지 않는 화면의 간격이 더 길어야 합니다');

  /* ── 7. 지운 글은 전체를 다시 받을 때 사라집니다 ─────── */
  server.clear();
  server.db.posts=server.db.posts.filter(p=>p.id!==3);
  g.SOCIAL.at=0;
  await g.fetch();
  assert.ok(ids().includes(3),'평소 조회만으로는 아직 남아 있습니다');
  await g.reload();
  assert.equal(server.fulls().length,1,'다시 받기는 전체 조회여야 합니다');
  assert.ok(!ids().includes(3),'전체를 받으면 지운 글이 사라져야 합니다');

  /* ── 8. 2000개 상한을 넘기지 않습니다 ───────────────── */
  const big=makeServer();
  for(let i=0;i<2000;i++)big.add('글');
  const h=load(big);
  await h.fetch(true);
  assert.equal(h.SOCIAL.posts.length,2000,'전체 조회는 2000개까지입니다');
  for(let i=0;i<30;i++)big.add('더 쓴 글');
  h.SOCIAL.at=0;
  await h.fetch();
  assert.equal(h.SOCIAL.posts.length,2000,'새 글을 이어 붙여도 2000개를 넘지 않아야 합니다');
  assert.equal(h.SOCIAL.posts[0].id,2030,'가장 최신 글이 앞에 남아야 합니다');

  /* ── 9. 한 번에 받을 양을 꽉 채우면 다음에 전체를 받습니다 ─ */
  const flood=makeServer();
  flood.add('첫 글');
  const k=load(flood);
  await k.fetch(true);
  for(let i=0;i<k.PAGE;i++)flood.add('쏟아진 글');
  flood.clear();k.SOCIAL.at=0;
  await k.fetch();
  assert.equal(k.SOCIAL.fullAt,0,'받을 양을 꽉 채우면 다음 조회를 전체로 돌려야 합니다');
  flood.clear();k.SOCIAL.at=0;
  await k.fetch();
  assert.equal(flood.fulls().length,1,'빠진 글이 없도록 전체를 다시 받습니다');

  console.log('PASS: 첫 전체 조회, 새 글만 이어받기, 중복 방지, 숨은 탭 정지와 복귀 추격, 화면별 간격, 삭제 반영, 2000개 상한, 과다 유입 복구');
}

main().catch(e=>{console.error(e);process.exit(1);});
