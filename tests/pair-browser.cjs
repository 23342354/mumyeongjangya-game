const {chromium}=require('playwright'),{PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;
 create table accounts(id text primary key,pw text,save jsonb,name text,seen_at timestamptz default now());
 create table pairs(id bigint primary key,from_id text,to_id text,status text,rent_due double precision default 0);
 create table students(id text primary key);create table messages(id bigint primary key,tab text,scope text);`);
 await db.exec(cp.execFileSync('git',['show','b77fa80:페어-공동플레이-설치.sql'],{cwd:root,encoding:'utf8'}));
 await db.exec(fs.readFileSync(path.join(root,'supabase/pair-sync-performance.sql'),'utf8'));
 const server=http.createServer((req,res)=>{const rel=decodeURIComponent(req.url.split('?')[0]).slice(1)||'index.html';if(rel.includes('..')){res.writeHead(404);res.end();return;}try{const f=path.join(root,rel);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const context=await browser.newContext();await context.addInitScript(()=>{window.setInterval=()=>1;});
 let hold=null,notify=null,timeout=false,commitCalls=0;
 await context.route('**/*',async route=>{
  const request=route.request(),url=request.url();
  if(url.includes('/rpc/pair_play')){
   const a=request.postDataJSON();if(a.p_action==='commit'){commitCalls++;if(timeout)return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({code:'57014',message:'canceling statement due to statement timeout'})});if(hold){const gate=hold;hold=null;notify();await gate;}}
   try{const out=await db.query(`select pair_play($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) as r`,[a.p_user,a.p_token,a.p_action,a.p_revision||0,a.p_request||'',a.p_save||null,a.p_wallet||null,a.p_progress||null,a.p_xp||0,a.p_meta||{},a.p_effects||{},a.p_loss||{}]);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out.rows[0].r)});}catch(e){return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({code:e.code,message:e.message})});}
  }
  if(url.startsWith('http://127.0.0.1:'))return route.continue();
  return route.fulfill({status:200,contentType:request.resourceType()==='stylesheet'?'text/css':'application/json',body:request.resourceType()==='stylesheet'?'':'[]'});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const seed=await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='Alice';S.t=nowMin();S.dayStamp=cal().day;boot();S.farm.seeds[FARM_NORMALS[0].id]=2;return JSON.parse(JSON.stringify(S));});
 for(const id of ['alice','bob'])await db.query('insert into accounts(id,pw,save,name) values($1,$2,$3,$1)',[id,'secret',seed]);
 await db.exec(`insert into pairs values(1,'alice','bob','accepted',0)`);
 await page.evaluate(async()=>{MMJY_CONFIG.supabaseUrl='https://pair.test';MMJY_CONFIG.supabaseKey='mock';ACCT={id:'alice',tok:'secret'};S.sb.id='alice';S.pairShared=1;S.pair.mine={id:1,status:'accepted',from_id:'alice',to_id:'bob'};await PAIR_PLAY.refresh();});
 assert.equal(await page.evaluate(()=>PAIR_PLAY.ready),true);
 await page.evaluate(async()=>{await startRun(1,false,10);});
 assert.equal(await page.evaluate(()=>!!S.run&&!S.run.done),true,'real quest is active');
 // Delay a real PostgreSQL-backed commit while UI actions are entered.
 let release;hold=new Promise(r=>release=r);const entered=new Promise(r=>notify=r);
 await page.evaluate(()=>{S.bio='pending background save';save();window.delayed=acctPush(true);});await entered;
 await page.evaluate(()=>{window.lessonJob=startLesson(0);window.studyJob=startStudy('r1');window.farmJob=plant(0,FARM_NORMALS[0].id);openFish();fishCast();});
 assert.equal(await page.evaluate(()=>FISHGAME.state),'run','fishing works while quest save waits');
 assert.equal(await page.locator('#modalroot button').first().evaluate(el=>getComputedStyle(el).pointerEvents),'auto','modal buttons are not globally locked');
 await page.evaluate(()=>{chatRows([{id:777,tab:'전체',scope:'',from_id:'bob',who:'Bob',body:'새 채팅',created_at:new Date().toISOString(),mode:'RP'}]);});
 release();await page.evaluate(async()=>{await Promise.all([window.delayed,window.lessonJob,window.studyJob,window.farmJob]);});
 const activities=await page.evaluate(()=>({run:!!S.run&&!S.run.done,lesson:!!S.lesson,study:!!S.study,msg:S.msgs.some(m=>m.sid===777),fish:FISHGAME?.state,farm:!!S.farm.plots[0]}));
 assert.deepEqual(activities,{run:true,lesson:true,study:true,msg:true,fish:'run',farm:true});
 // Check the real combat implementation, not just the scheduler fixture.
 const checkpoint=async mins=>{
  const current=(await db.query('select progress from pair_play_state where pair_id=1')).rows[0].progress;
  current.run.lastTick=Date.now()-mins*60000;
  await db.query('update pair_play_state set progress=$1,revision=revision+1 where pair_id=1',[current]);
  await page.evaluate(async()=>{await PAIR_PLAY.refresh();});
 };
 await checkpoint(4);const countAtFour=commitCalls;
 await page.evaluate(async()=>{step(1/60);await PAIR_PLAY.queue;});
 assert.equal(commitCalls,countAtFour,'no quest tick within four minutes');
 await checkpoint(5);
 await page.evaluate(async()=>{step(1/60);await PAIR_PLAY.queue;});
 assert.equal(commitCalls,countAtFour+1,'one combat checkpoint at five minutes');
 assert.equal(await page.evaluate(()=>S.run.logs.some(l=>l.t.includes('의뢰 진행'))),true,'real attack logs summarized');
 // A background statement timeout must leave the modal and received chat intact.
 timeout=true;const before=commitCalls;await page.evaluate(async()=>{S.bio='timeout state';save();await acctPush(true);});assert.equal(commitCalls,before+1);
 assert.equal(await page.evaluate(()=>!!document.querySelector('#fbar')&&FISHGAME.state==='run'),true);
 assert.equal(await page.evaluate(()=>S.msgs.some(m=>m.sid===777)),true);
 timeout=false;await page.evaluate(async()=>{PAIR_PLAY.retryAt=0;await acctPush(true);});
 assert.equal(await page.evaluate(()=>S.msgs.some(m=>m.sid===777)),true);
 assert.deepEqual(errors,[]);console.log('PASS: real browser + PostgreSQL-backed quest, simultaneous lesson/research/fishing/farm, delayed save, incoming chat, timeout cooldown recovery and five-minute combat checkpoints');
 }finally{await browser.close();server.close();await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
