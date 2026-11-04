/* 접은 상단 — 작은 화면에서 머리글이 본문을 밀어내지 않는지 확인합니다.
   머리글이 다시 자라거나, 다른 파일이 끼워 넣는 자리(.tb1 / .top-actions)가
   사라지거나, 펼침이 동작하지 않으면 여기서 걸립니다. */
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

/* 접은 머리글이 차지해도 되는 최대 높이. 한 줄 + 여백 기준입니다.
   자원칩·막대·날짜줄이 다시 접힌 상태로 새어 나오면 이 값을 넘깁니다. */
const COLLAPSED_MAX=76;
/* 펼쳤을 때는 네 덩어리가 모두 보여야 하므로 이보다는 큽니다. */
const EXPANDED_MIN=180;

(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;
  const b=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-gpu']});
  const c=await b.newContext({viewport:{width:430,height:860},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await c.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')
    ?r.continue()
    :r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  const p=await c.newPage();
  const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'load'});
  await p.evaluate(()=>{
    MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';
    S=newState();S.made=true;S.name='검증학생';S.rin=24380;S.lvl=14;S.course=2;
    S.t=nowMin();S.dayStamp=cal().day;boot();
  });

  const read=()=>p.evaluate(()=>{
    // 부모가 숨어도 자식의 computed display 는 none 이 아니므로, 실제 상자로 셉니다.
    const vis=s=>[...document.querySelectorAll(s)].filter(e=>e.getClientRects().length>0);
    const t=document.getElementById('topbar');
    return {
      open:document.body.classList.contains('top-open'),
      h:Math.round(t.getBoundingClientRect().height),
      actions:vis('.top-actions .btn').length,
      mini:vis('.tb-mini').length,
      pips:vis('.tb-pip').length,
      res:vis('.res-wrap').length,
      vitals:vis('.mobile-vitals').length,
      tb2:vis('.tb2').length,
      // 다른 파일이 끼워 넣는 자리입니다 — 사라지면 알림과 페어 지갑이 갈 곳을 잃습니다.
      tb1:!!document.querySelector('#topbar .tb1'),
      slot:!!document.querySelector('#topbar .top-actions'),
      subnavTop:getComputedStyle(document.getElementById('mobile-subnav')).top
    };
  });

  console.log('접은 상태');
  let s=await read();
  ok('머리글이 한 줄로 접혀 있다', s.h>0&&s.h<=COLLAPSED_MAX, `${s.h}px (최대 ${COLLAPSED_MAX})`);
  ok('요약 손잡이가 보인다', s.mini===1);
  ok('체력·정신력·경험치 막대 셋이 보인다', s.pips===3, `${s.pips}개`);
  ok('자원칩·막대 상세·날짜줄은 접혀 있다', s.res===0&&s.vitals===0&&s.tb2===0, `res ${s.res} / vitals ${s.vitals} / tb2 ${s.tb2}`);
  ok('동작 단추는 알림·내 정보만 남는다', s.actions===2, `${s.actions}개`);
  ok('세부 메뉴가 머리글 아래에 붙는다', s.subnavTop!=='0px'&&s.subnavTop!=='auto', s.subnavTop);
  ok('.tb1 자리가 남아 있다', s.tb1);
  ok('.top-actions 자리가 남아 있다', s.slot);

  console.log('펼친 상태');
  await p.evaluate(()=>toggleTop());
  s=await read();
  ok('펼쳐진다', s.open&&s.h>=EXPANDED_MIN, `${s.h}px (최소 ${EXPANDED_MIN})`);
  ok('자원칩·막대 상세·날짜줄이 모두 나온다', s.res===1&&s.vitals===1&&s.tb2===1, `res ${s.res} / vitals ${s.vitals} / tb2 ${s.tb2}`);
  ok('동작 단추 네 개가 모두 나온다', s.actions===4, `${s.actions}개`);
  ok('요약 손잡이는 접는 손잡이만 남는다', s.mini===1&&s.pips===0, `pips ${s.pips}`);

  console.log('다시 접기');
  await p.evaluate(()=>toggleTop());
  s=await read();
  ok('되돌아온다', !s.open&&s.h<=COLLAPSED_MAX, `${s.h}px`);

  console.log('넓은 화면 — 머리글');
  await p.setViewportSize({width:1500,height:950});
  await p.evaluate(()=>renderTop());
  s=await read();
  ok('넓은 화면에는 요약 손잡이가 없다', s.mini===0);
  ok('넓은 화면은 자원칩·날짜줄을 그대로 보여 준다', s.res===1&&s.tb2===1, `res ${s.res} / tb2 ${s.tb2}`);
  ok('넓은 화면 동작 단추는 네 개 그대로', s.actions===4, `${s.actions}개`);

  /* 넓은 화면 재구성 — 양옆은 틀 없이, 카드는 본문에만. 대화 칸은 접힙니다. */
  const desk=()=>p.evaluate(()=>{
    const el=s=>document.querySelector(s);
    const box=s=>{const e=el(s);if(!e)return null;const b=e.getBoundingClientRect();return {w:Math.round(b.width),r:Math.round(b.right)};};
    const bg=s=>{const e=el(s);return e?getComputedStyle(e).backgroundColor:'-';};
    const none=v=>v==='rgba(0, 0, 0, 0)'||v==='transparent';
    return {
      main:box('#main'), chat:box('#chatcol'), fold:box('.chat-fold'),
      railFlat:none(bg('#chatcol'))&&none(bg('#navcol>.card'))&&none(bg('#chatcol>.card')),
      // 본문 카드는 틀을 유지해야 합니다 — 그래야 내용이 내용으로 읽힙니다.
      cardKept:!none(getComputedStyle(el('#main .card')).backgroundImage==='none'
        ?bg('#main .card'):'keep'),
      title:parseFloat(getComputedStyle(el('#main h1.page')).fontSize),
      off:document.body.classList.contains('chat-off'),
      vw:innerWidth
    };
  });

  console.log('넓은 화면 — 세 칸');
  await p.evaluate(()=>{try{localStorage.setItem('mmjy.chatFold','0')}catch(e){};applyChatFold();VIEW='plaza';renderMain(true);});
  let d=await desk();
  ok('양옆은 틀 없이 바탕에 얹힌다', d.railFlat);
  ok('본문 카드는 틀을 유지한다', d.cardKept);
  ok('머리글 제목이 커졌다', d.title>=28, `${d.title}px`);
  const openMain=d.main.w;
  ok('대화 칸이 펼쳐져 있다', !d.off&&d.chat.w>200, `${d.chat.w}px`);
  ok('오른쪽 끝이 화면 안에 있다', d.chat.r<=d.vw, `${d.chat.r} / ${d.vw}`);

  console.log('넓은 화면 — 대화 접기');
  await p.evaluate(()=>toggleChat());
  d=await desk();
  ok('접으면 세로 손잡이만 남는다', d.off&&d.chat.w<=40&&d.fold.w<=40, `chat ${d.chat.w} / fold ${d.fold?.w}`);
  ok('본문이 그만큼 넓어진다', d.main.w>openMain+200, `${openMain} → ${d.main.w}`);
  ok('접어도 손잡이가 화면 안에 있다', d.fold.r<=d.vw, `${d.fold.r} / ${d.vw}`);
  await p.evaluate(()=>toggleChat());
  d=await desk();
  ok('다시 펴진다', !d.off&&d.main.w===openMain, `${d.main.w}`);

  ok('콘솔 오류 없음', errors.length===0, errors.join(' | '));

  await b.close();server.close();
  if(fails.length){ console.error(`\n실패 ${fails.length}건\n- `+fails.join('\n- ')); process.exitCode=1; }
  else console.log(`\n접은 상단 — 전부 통과`);
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
