/* 건의함 3건에 대한 동작 검증. 실제 브라우저에서 게임을 띄우고 확인합니다.
   1) 관문을 넘으면 고른 단계가 다음으로 넘어가고, 이미 깬 단계보다 내려가지 않는다
   2) 교류에서 맺은 관계가 내 정보 화면이 읽는 S.rel에도 채워진다
   3) 외출은 걸음마다 보상을 실제로 지급한다 (예전에는 보여 주기만 했습니다)
   운영 서버로는 요청하지 않습니다. 로컬 서버와 모의 응답만 씁니다. */
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png',
 '.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/json'};
const server=http.createServer((q,r)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';
  const f=path.join(root,rel);
  if(rel.includes('..')||!fs.existsSync(f)){r.writeHead(404);r.end();return;}
  r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});
  r.end(fs.readFileSync(f));
});

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 const browser=await chromium.launch({headless:true,
   executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-gpu']});
 const ctx=await browser.newContext({viewport:{width:1200,height:900}});
 await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')
   ? r.continue() : r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 const page=await ctx.newPage();
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'load'});

 const result=await page.evaluate(async()=>{
  MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';
  S=newState();S.made=true;S.name='한나';S.t=nowMin();S.dayStamp=cal().day;boot();
  const out={};

  /* ── 1) 관문 통과 뒤 다음 단계 ─────────────────────── */
  const gateRun=stage=>{
    S.run={stage,q:questAt(stage),left:0,kills:5,done:false,
           me:{hp:100},allies:[],rin:0,exp:0,know:0,eff:1,pos:'선봉',logs:[]};
    endRun(true);
  };
  S.quests.cleared=9;S.quests.gate=0;S.quests.pick=10;
  gateRun(10);
  out.gate={통과:questGate(),열린한도:questOpenLimit(),고른단계:S.quests.pick};

  /* 도중 귀환은 관문을 열지 않습니다 */
  S.quests.cleared=19;S.quests.gate=10;S.quests.pick=20;
  S.run={stage:20,q:questAt(20),left:30,kills:3,done:false,
         me:{hp:100},allies:[],rin:0,exp:0,know:0,eff:1,pos:'선봉',logs:[]};
  endRun(true);
  out.early={통과:questGate()};

  /* ── 3) 외출 보상 ──────────────────────────────── */
  S.pass=3;S.rin=0;S.know=0;S.exp=0;S.lvl=1;
  const passBefore=S.pass;
  startOuting(WARDS[0].id);
  out.outing={통행패차감:passBefore-S.pass};
  let walked=0;
  for(let i=0;i<3&&OUTING&&OUTING.step<3;i++){ drawOuting(); if(OUTING&&OUTING.cs){ outChoose(0); walked++; } }
  out.outing.걸음=walked;
  out.outing.받은총액=S.rin+S.know+S.exp;   // 판정 결과와 무관하게 경험치는 늘 들어옵니다
  out.outing.쌓인표시=OUTING?OUTING.got.rin+OUTING.got.know+OUTING.got.exp:0;
  closeModal();

  /* ── 2) 교류 관계 → 내 정보 ──────────────────────── */
  sbOn=()=>true;S.sb={id:'me',url:'x',key:'y'};
  sbGet=q=>{
    if(q.startsWith('social_links'))return Promise.resolve([
      {id:7,kind:'relation',status:'accepted',from_id:'me',to_id:'u2',role_from:'사형',role_to:'사제'},
      {id:8,kind:'friend',status:'accepted',from_id:'u2',to_id:'me'}]);
    if(q.startsWith('students'))return Promise.resolve([{id:'me',name:'한나'},{id:'u2',name:'유리'}]);
    return Promise.resolve([]);
  };
  await socialFetch(true);
  out.rel={목록:S.rel,친구수:(S.friends||[]).length};
  return out;
 });

 await browser.close();server.close();
 assert.deepEqual(pageErrors,[],'콘솔 오류 없이 돌아야 합니다');

 /* 1) 관문 */
 assert.equal(result.gate.통과,10,'10단계 관문을 넘으면 통과 기록이 10이어야 합니다');
 assert.equal(result.gate.열린한도,20,'다음 구간과 20단계 관문이 열려야 합니다');
 assert.ok(result.gate.고른단계>10,`고른 단계가 다음으로 넘어가야 합니다 (지금 ${result.gate.고른단계})`);
 assert.ok(result.gate.고른단계<=20,'열린 한도를 넘겨 고르면 안 됩니다');
 assert.equal(result.early.통과,10,'도중 귀환은 관문을 열지 않습니다');

 /* 3) 외출 */
 assert.equal(result.outing.통행패차감,1,'외출은 통행패를 한 장 씁니다');
 assert.equal(result.outing.걸음,3,'세 걸음을 걸어야 합니다');
 assert.ok(result.outing.받은총액>0,
   '외출은 걸음마다 보상을 실제로 지급해야 합니다 — 예전에는 보여 주기만 했습니다');
 assert.equal(result.outing.받은총액,result.outing.쌓인표시,
   '마지막에 보여 주는 금액과 실제로 받은 금액이 같아야 합니다');

 /* 2) 관계 */
 assert.equal(result.rel.목록.length,1,'교류에서 맺은 관계가 내 정보에도 있어야 합니다');
 assert.equal(result.rel.목록[0].n,'유리');
 assert.equal(result.rel.목록[0].a,'사형','내가 상대의 무엇인지');
 assert.equal(result.rel.목록[0].b,'사제','상대가 나의 무엇인지');
 assert.ok(result.rel.목록[0].linkId,'끊기가 서버 기록을 지울 수 있도록 링크 번호가 있어야 합니다');
 assert.equal(result.rel.친구수,1,'친구도 함께 채워져야 합니다');

 console.log('PASS: 관문 통과 뒤 단계 전진과 후퇴 방지, 도중 귀환 불인정, 외출 통행패·걸음·실제 보상 지급과 표시 일치, 교류 관계의 내 정보 연동');
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
