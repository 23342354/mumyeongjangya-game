/* 건의함 보내기 — 글은 올라갔는데 번호를 못 받는 경우를 실패로 단정하지 않는지 봅니다.
   구판 함수가 번호를 돌려주지 않거나 응답이 끊기면 서버에는 글이 남습니다. 그때
   "보내지 못했습니다"라고 말하면 같은 글을 또 쓰게 됩니다. */
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/json'};
const server=http.createServer((q,r)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';
  const f=path.join(root,rel);
  if(rel.includes('..')||!fs.existsSync(f)){r.writeHead(404);r.end();return;}
  r.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});
  r.end(fs.readFileSync(f));
});

const fails=[];
const ok=(name,cond,detail)=>{ if(cond) console.log('  통과 ·',name); else { fails.push(name+(detail?` — ${detail}`:'')); console.log('  실패 ·',name,detail||''); } };

(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;
  const b=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-gpu']});
  const c=await b.newContext({viewport:{width:1400,height:900}});
  await c.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')
    ?r.continue()
    :r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  const p=await c.newPage();
  const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'load'});
  await p.evaluate(()=>{
    MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';
    S=newState();S.made=true;S.name='검증학생';S.t=nowMin();S.dayStamp=cal().day;boot();
  });

  /* 서버를 흉내 냅니다. submit 은 무엇을 돌려줄지, status 와 공개 목록에 무엇이 있는지
     경우마다 바꿔 가며 boardDeliver 의 판단만 봅니다. */
  const run=(submitReturns,statusReturns,publicRows)=>p.evaluate(async cfg=>{
    const calls=[];
    window.sbOn=()=>true;
    window.boardAccountCredentials=()=>({p_actor:'runner1',p_token:'tok'});
    window.sbSend=async(m,route)=>{
      calls.push(route);
      if(route==='rpc/submit_account_suggestion_once'){
        if(cfg.submit==='throw') throw new Error('Failed to fetch');
        return cfg.submit;
      }
      if(route==='rpc/account_suggestion_status'){
        if(cfg.status==='throw') throw new Error('404');
        return cfg.status;
      }
      return null;
    };
    window.sbGet=async()=>{ calls.push('suggestions_public'); return cfg.rows; };
    BOARD_PENDING=null; BOARD_SUBMIT_BUSY=false;
    const payload={p_actor:'runner1',p_token:'tok',p_name:'검증학생',p_cat:'건의',
      p_title:'관문 자동 선택',p_body:'본문',p_secret:false};
    try{ return {id:await boardDeliver(payload,false), calls}; }
    catch(e){ return {err:String(e.message||e), calls}; }
  },{submit:submitReturns,status:statusReturns,rows:publicRows});

  const posted=[{id:77,created_at:new Date().toISOString(),name:'검증학생',cat:'건의',title:'관문 자동 선택'}];

  console.log('번호를 제대로 받은 경우');
  let r=await run(41,null,[]);
  ok('번호를 그대로 돌려준다', r.id===41, JSON.stringify(r));
  ok('쓸데없이 더 묻지 않는다', r.calls.length===1, r.calls.join(','));

  console.log('번호를 못 받았지만 요청 기록이 남은 경우');
  r=await run(null,55,[]);
  ok('요청 기록에서 번호를 찾는다', r.id===55, JSON.stringify(r));

  console.log('번호도 요청 기록도 없지만 글은 올라간 경우 — 이번에 고친 것');
  r=await run(null,null,posted);
  ok('공개 목록에서 방금 쓴 글을 찾아낸다', r.id===77, JSON.stringify(r));
  r=await run('throw','throw',posted);
  ok('응답이 끊겨도 목록으로 확인한다', r.id===77, JSON.stringify(r));

  console.log('빈 배열을 돌려주는 경우');
  r=await run([],null,posted);
  ok('빈 배열은 번호가 아니다', r.id===77, JSON.stringify(r));

  console.log('정말 알 수 없는 경우');
  r=await run(null,null,[]);
  ok('번호를 지어내지 않는다', r.id===undefined&&!!r.err, JSON.stringify(r));
  ok('"보내지 못했습니다"라고 단정하지 않는다', !/보내지 못했습니다/.test(r.err||''), r.err);
  ok('목록을 확인하라고 안내한다', /건의함 목록을 확인/.test(r.err||''), r.err);
  ok('다시 눌러도 겹치지 않는다고 알린다', /중복으로 올라가지 않습니다/.test(r.err||''), r.err);
  ok('작성 내용이 남는다고 알린다', /작성 내용은 그대로/.test(r.err||''), r.err);

  console.log('남의 글·오래된 글');
  r=await run(null,null,[{id:9,created_at:new Date().toISOString(),name:'다른학생',cat:'건의',title:'관문 자동 선택'}]);
  ok('이름이 다르면 내 글로 보지 않는다', !r.id, JSON.stringify(r));
  r=await run(null,null,[{id:9,created_at:new Date(Date.now()-3600e3).toISOString(),name:'검증학생',cat:'건의',title:'관문 자동 선택'}]);
  ok('한 시간 전 글은 방금 쓴 글이 아니다', !r.id, JSON.stringify(r));
  r=await run(null,null,[{id:9,created_at:new Date().toISOString(),name:'검증학생',cat:'버그',title:'관문 자동 선택'}]);
  ok('분류가 다르면 다른 글이다', !r.id, JSON.stringify(r));

  console.log('알림 문구');
  const toasts=await p.evaluate(()=>{
    const seen=[]; const real=window.toast;
    window.toast=(m,k)=>seen.push({m:String(m),k:String(k||'')});
    window.boardFetch=()=>{};
    boardSubmitFailed(new Error(BOARD_UNSURE),null);
    boardSubmitFailed(new Error('로그인한 계정을 확인해 주세요.'),null);
    window.toast=real; return seen;
  });
  ok('모를 때는 나쁨 표시를 쓰지 않는다', toasts[0] && toasts[0].k!=='bad', JSON.stringify(toasts[0]));
  ok('진짜 실패는 그대로 나쁨 표시', toasts[1] && toasts[1].k==='bad' && /보내지 못했습니다/.test(toasts[1].m), JSON.stringify(toasts[1]));

  ok('콘솔 오류 없음', errors.length===0, errors.join(' | '));

  await b.close();server.close();
  if(fails.length){ console.error(`\n실패 ${fails.length}건\n- `+fails.join('\n- ')); process.exitCode=1; }
  else console.log(`\n건의함 보내기 — 전부 통과`);
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
