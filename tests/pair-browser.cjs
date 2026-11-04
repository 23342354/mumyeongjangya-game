const {chromium}=require('playwright'),{PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;
 create table accounts(id text primary key,pw text,save jsonb,name text,seen_at timestamptz default now());
 create table pairs(id bigint primary key,from_id text,to_id text,status text,rent_due double precision default 0);
 create table students(id text primary key);create table messages(id bigint primary key,tab text,scope text);`);
 await db.exec(cp.execFileSync('git',['show','b77fa80:중개소-러너간거래-설치.sql'],{cwd:root,encoding:'utf8'}));
 await db.exec(cp.execFileSync('git',['show','b77fa80:페어-공동플레이-설치.sql'],{cwd:root,encoding:'utf8'}));
 await db.exec(fs.readFileSync(path.join(root,'supabase/pair-sync-performance.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(root,'supabase/clubs.sql'),'utf8'));
 const server=http.createServer((req,res)=>{const rel=decodeURIComponent(req.url.split('?')[0]).slice(1)||'index.html';if(rel.includes('..')){res.writeHead(404);res.end();return;}try{const f=path.join(root,rel);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const context=await browser.newContext();await context.addInitScript(()=>{window.setInterval=()=>1;});
 let hold=null,notify=null,timeout=false,commitCalls=0,dropReplies=0,marketReads=0,blockPairReads=false,dropMarketReplies=0,dropClubReply=false;
 await context.route('**/*',async route=>{
  const request=route.request(),url=request.url();
  if(url.includes('/rpc/runner_club')){const a=request.postDataJSON();try{const out=await db.query('select runner_club($1,$2,$3,$4) as r',[a.p_user,a.p_token,a.p_action,a.p_data||{}]);if(dropClubReply&&a.p_action==='deposit'){dropClubReply=false;return route.abort('failed');}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out.rows[0].r)});}catch(e){return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:e.code,message:e.message})});}}
  if(url.includes('/rpc/market_trade')){
   const a=request.postDataJSON();try{const out=await db.query('select market_trade($1,$2,$3,$4) as r',[a.p_actor,a.p_token,a.p_action,a.p_data||{}]);if(dropMarketReplies>0){dropMarketReplies--;return route.abort('failed');}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out.rows[0].r)});}catch(e){return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({code:e.code,message:e.message})});}
  }
  if(url.includes('/rpc/market_read')){
   marketReads++;const a=request.postDataJSON();
   try{const out=await db.query('select market_read($1,$2) as r',[a.p_actor,a.p_token]);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out.rows[0].r)});}catch(e){return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({code:e.code,message:e.message})});}
  }
  if(url.includes('/rpc/pair_play')){
   const a=request.postDataJSON();if(blockPairReads&&['get','peek'].includes(a.p_action))return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({code:'57014',message:'snapshot refresh timeout'})});if(a.p_action==='commit'){commitCalls++;if(timeout)return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({code:'57014',message:'canceling statement due to statement timeout'})});if(hold){const gate=hold;hold=null;notify();await gate;}}
   try{const out=await db.query(`select pair_play($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) as r`,[a.p_user,a.p_token,a.p_action,a.p_revision||0,a.p_request||'',a.p_save||null,a.p_wallet||null,a.p_progress||null,a.p_xp||0,a.p_meta||{},a.p_effects||{},a.p_loss||{}]);if(a.p_action==='commit'&&dropReplies>0){dropReplies--;return route.abort('failed');}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out.rows[0].r)});}catch(e){return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({code:e.code,message:e.message})});}
  }
  if(url.startsWith('http://127.0.0.1:'))return route.continue();
  return route.fulfill({status:200,contentType:request.resourceType()==='stylesheet'?'text/css':'application/json',body:request.resourceType()==='stylesheet'?'':'[]'});
 });
 let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const seed=await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='Alice';S.t=nowMin();S.dayStamp=cal().day;boot();S.farm.seeds[FARM_NORMALS[0].id]=2;S.potion.q1=2;return JSON.parse(JSON.stringify(S));});
 for(const id of ['alice','bob'])await db.query('insert into accounts(id,pw,save,name) values($1,$2,$3,$1)',[id,'secret',seed]);
 await db.exec(`insert into pairs values(1,'alice','bob','accepted',0);insert into market_listings(seller_id,seller_name,kind,item_key,item_name,quantity,price) values('bob','Bob','material','약초','테스트 약초',1,10);`);
 await page.evaluate(async()=>{MMJY_CONFIG.supabaseUrl='https://pair.test';MMJY_CONFIG.supabaseKey='mock';ACCT={id:'alice',tok:'secret'};S.sb.id='alice';S.sb.url='https://pair.test';S.sb.key='mock';S.pairShared=1;S.pair.mine={id:1,status:'accepted',from_id:'alice',to_id:'bob'};await PAIR_PLAY.refresh();});
 assert.equal(await page.evaluate(()=>PAIR_PLAY.ready),true);
 await page.evaluate(async()=>{await startRun(1,false,10);});
 assert.equal(await page.evaluate(()=>!!S.run&&!S.run.done),true,'real quest is active');
 const hook=async()=>{await page.evaluate(()=>{FISHGAME.spd=1;FISHGAME.target=45;FISHGAME.started=performance.now()-53000;});await page.locator('button[onpointerdown^="fishHook"]').click();};
 const recast=async()=>{await page.evaluate(()=>{if(!window.realFishingNow){window.realFishingNow=Date.now;window.fishingOffset=0;Date.now=()=>window.realFishingNow()+window.fishingOffset;}window.fishingOffset+=11000;fishCast();});};
 // Delay a real PostgreSQL-backed commit while UI actions are entered.
 let release;hold=new Promise(r=>release=r);const entered=new Promise(r=>notify=r);
 await page.evaluate(()=>{S.bio='pending background save';save();window.delayed=acctPush(true);});await entered;
 const readsBefore=marketReads;await page.evaluate(async()=>{await marketFetch(true);});
 assert.ok(marketReads>readsBefore);assert.equal(await page.evaluate(()=>MKT.loaded&&!MKT.error&&MKT.listings[0]?.item_name==='테스트 약초'),true,'market browse finishes while a game commit is still blocked');
 await page.evaluate(()=>{window.lessonJob=startLesson(0);window.studyJob=startStudy('r1');window.farmJob=plant(0,FARM_NORMALS[0].id);openFish();fishCast();});
 assert.equal(await page.evaluate(()=>FISHGAME.state),'run','fishing works while quest save waits');
 assert.equal(await page.locator('#modalroot button').first().evaluate(el=>getComputedStyle(el).pointerEvents),'auto','modal buttons are not globally locked');
 // The exact bug: a successful hook must return to idle while the
 // unrelated server commit is still held, and another cast must be possible.
 await hook();assert.equal(await page.evaluate(()=>FISHGAME.state),'idle','hook resolves before any server response');
 assert.equal(await page.evaluate(()=>PAIR_PLAY.fishingPending),1);
 const preview=await page.evaluate(()=>({name:FISHGAME.catchVisual.name,pending:FISHGAME.catchVisual.pending,fish:S.fish.catches[FISHGAME.catchVisual.name]||0}));
 assert.ok(preview.name,'queued hook immediately chooses its deterministic catch preview');
 assert.equal(preview.pending,true);
 assert.equal(await page.locator('#life-fishing').evaluate(el=>el.classList.contains('is-caught')),true);
 assert.equal(await page.locator('.life-caught-fish').getAttribute('aria-label'),preview.name);
 await page.evaluate(()=>drawFish2());
 assert.equal(await page.locator('.life-caught-fish').getAttribute('aria-label'),preview.name,'redraw preserves the catch while save is blocked');

 await page.evaluate(()=>fishCast());assert.equal(await page.evaluate(()=>FISHGAME.state),'idle','normal ten-second cast cooldown remains');
 await recast();assert.equal(await page.evaluate(()=>FISHGAME.state),'run','second cast does not wait for reward persistence');
 assert.equal(await page.locator('.life-caught-fish').count(),0,'a new cast clears the previous catch');
 assert.equal(await page.locator('.life-swimmer').count(),2);

 await hook();assert.equal(await page.evaluate(()=>PAIR_PLAY.fishingPending),2);
 await recast();assert.equal(await page.evaluate(()=>FISHGAME.state),'run');
 await page.evaluate(()=>{chatRows([{id:777,tab:'전체',scope:'',from_id:'bob',who:'Bob',body:'새 채팅',created_at:new Date().toISOString(),mode:'RP'}]);});
 release();await page.evaluate(async()=>{await Promise.all([window.delayed,window.lessonJob,window.studyJob,window.farmJob]);});
 await page.waitForFunction(()=>PAIR_PLAY.fishingPending===0);
 assert.equal(await page.evaluate(()=>S.balance20.fish),2,'two queued catches are credited once each');
 assert.ok(await page.evaluate(p=>(S.fish.catches[p.name]||0)>p.fish,preview),'the displayed species is awarded by deterministic replay');

 const activities=await page.evaluate(()=>({run:!!S.run&&!S.run.done,lesson:!!S.lesson,study:!!S.study,msg:S.msgs.some(m=>m.sid===777),fish:FISHGAME?.state,farm:!!S.farm.plots[0]}));
 assert.deepEqual(activities,{run:true,lesson:true,study:true,msg:true,fish:'run',farm:true});
 // A positively acknowledged listing remains successful if its subsequent
 // game snapshot refresh times out; its stale inventory must not be applied.
 blockPairReads=true;
 const beforeTradeInventory=await page.evaluate(()=>S.potion.q1);
 const result=await page.evaluate(async()=>await marketCommit('list',{kind:'potion',key:'q1',quantity:1,price:10,name:'테스트 물약'},'등록 완료'));
 assert.equal(result.ok,true);assert.equal(result.refreshPending,true);
 assert.equal(await page.evaluate(()=>S.potion.q1),beforeTradeInventory,'unrefreshed inventory remains untouched');
 assert.equal((await db.query("select count(*)::int as n from market_listings where seller_id='alice'")).rows[0].n,1);
 blockPairReads=false;await page.evaluate(async()=>{PAIR_PLAY.retryAt=0;await PAIR_PLAY.refresh();});
 assert.equal(await page.evaluate(()=>S.potion.q1),beforeTradeInventory-1,'later snapshot applies the trade exactly once');
 dropMarketReplies=1;
 await page.evaluate(async id=>await marketCommit('cancel',{id},'취소 완료'),result.id);
 const afterLostCancel=(await db.query("select count(*)::int as n from market_listings where seller_id='alice' and status='active'")).rows[0].n;
 assert.equal(afterLostCancel,0);
 await page.evaluate(async()=>await marketCommit('list',{kind:'potion',key:'q1',quantity:1,price:10,name:'테스트 물약'},'재등록 완료'));
 assert.equal((await db.query("select count(*)::int as n from market_listings where seller_id='alice' and status='active'")).rows[0].n,1,'previous receipt is resolved before the new trade');
 assert.equal(await page.evaluate(()=>S.potion.q1),beforeTradeInventory-1,'lost cancel response is not replayed twice');
 const listingsBeforeRejected=(await db.query("select count(*)::int as n from market_listings where seller_id='alice'")).rows[0].n;
 await page.evaluate(async()=>await marketCommit('list',{kind:'potion',key:'q1',quantity:999,price:10,name:'거절되어야 할 매물'},'등록 완료'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('mmjy_pair_market_pending_alice')),null,'a definitively rejected fresh trade does not become a future surprise retry');
 assert.equal((await db.query("select count(*)::int as n from market_listings where seller_id='alice'")).rows[0].n,listingsBeforeRejected);
 await page.evaluate(()=>openFish());await recast();
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
 const writesBeforeRead=commitCalls;const walletBeforeRead=await page.evaluate(()=>JSON.stringify({rin:S.rin,bag:S.bag,rev:S.marketRev}));
 await page.evaluate(async()=>{await marketFetch(true);});assert.equal(commitCalls,writesBeforeRead,'market browsing never retries the failed game save');
 assert.equal(await page.evaluate(()=>JSON.stringify({rin:S.rin,bag:S.bag,rev:S.marketRev})),walletBeforeRead,'market read never applies a stale paired inventory');
 assert.equal(await page.evaluate(()=>MKT.loaded&&!MKT.error&&MKT.listings.length>=1),true);
 assert.equal(await page.evaluate(()=>!!document.querySelector('#fbar')&&FISHGAME.state==='run'),true);
 assert.equal(await page.evaluate(()=>S.msgs.some(m=>m.sid===777)),true);
 timeout=false;await page.evaluate(async()=>{PAIR_PLAY.retryAt=0;await acctPush(true);});
 assert.equal(await page.evaluate(()=>S.msgs.some(m=>m.sid===777)),true);
 // Persist a real catch, lose its response, then close/reopen the page.
 // The durable click must recover without awarding that catch a second time.
 dropReplies=1;await hook();
 assert.equal(await page.evaluate(()=>FISHGAME.state),'idle');
 await page.waitForFunction(()=>PAIR_PLAY.fishingPending>0&&PAIR_PLAY.retryAt>Date.now());
 const credited=(await db.query("select (save#>>'{balance20,fish}')::int as n from accounts where id='alice'")).rows[0].n;
 assert.equal(credited,3,'third catch committed despite response loss');
 timeout=true;await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='https://pair.test';MMJY_CONFIG.supabaseKey='mock';ACCT={id:'alice',tok:'secret'};S=JSON.parse(localStorage.getItem(SAVEKEY));window.realFishingNow=Date.now;window.fishingOffset=60000;Date.now=()=>window.realFishingNow()+window.fishingOffset;boot();openFish();});
 await recast();assert.equal(await page.evaluate(()=>FISHGAME.state),'run','cast also works before server reconnection');
 await page.evaluate(async()=>{await PAIR_PLAY.queue;});
 timeout=false;await page.evaluate(async()=>{PAIR_PLAY.retryAt=0;await PAIR_PLAY.refresh();await PAIR_PLAY.flushFishing();});
 await page.waitForFunction(()=>PAIR_PLAY.fishingPending===0);
 assert.equal((await db.query("select (save#>>'{balance20,fish}')::int as n from accounts where id='alice'")).rows[0].n,credited,'reload recovery does not duplicate the catch');
 assert.equal(await page.evaluate(()=>FISHGAME.state),'run','catch recovery never resets the current cast');
 await db.query("update accounts set save=jsonb_set(save,'{balance20,fish}','60'),pair_play_rev=pair_play_rev+1 where id='alice'");
 await page.evaluate(async()=>{await PAIR_PLAY.refresh();});const atLimit=commitCalls;
 await hook();assert.equal(await page.evaluate(()=>FISHGAME.state),'idle');
 assert.equal(await page.evaluate(()=>S.balance20.fish),60);assert.equal(await page.evaluate(()=>PAIR_PLAY.fishingPending),0);
 assert.equal(commitCalls,atLimit,'daily-cap practice needs no reward save');
 // Distinct dumplings share both existing meal slots, including two desserts.
 // Restore the real wall clock after the fishing cooldown time-travel fixture.
 await page.evaluate(()=>{if(window.realFishingNow)Date.now=window.realFishingNow;});
 await page.evaluate(async()=>{S.kit.eat=null;S.kit.dess=null;S.kit.have={...S.kit.have,d11:1,d15:1,d6:1};save();await acctPush(true);await eat('d11');await eat('d15');});
 let sharedMeals=(await db.query("select save->'kit' as kit from accounts where id='bob'")).rows[0].kit;
 assert.equal(sharedMeals.eat.id,'d11');assert.equal(sharedMeals.dess.id,'d15','different desserts both reach the partner');
 await page.evaluate(async()=>{await eat('d6');});assert.equal(await page.evaluate(()=>S.kit.have.d6),1,'opening replacement choice does not consume shared food');
 assert.ok(await page.locator('#modalroot').innerText().then(t=>t.includes('만두 효과 선택')));
 await page.getByRole('button',{name:'이 효과 대신 먹기',exact:true}).first().click();await page.evaluate(async()=>{await PAIR_PLAY.queue;});
 sharedMeals=(await db.query("select save->'kit' as kit from accounts where id='bob'")).rows[0].kit;
 assert.equal(sharedMeals.eat.id,'d6');assert.equal(sharedMeals.dess.id,'d15');assert.equal(sharedMeals.have.d6,0,'only the chosen meal is replaced, once');
 await page.evaluate(async()=>{S.kit.have.d6=2;save();await acctPush(true);await eat('d6');await eat('d6');});
 assert.equal(await page.evaluate(()=>S.kit.have.d6),1,'same food at duration cap is not consumed twice');
 await page.evaluate(async()=>{if(CLUBNET.busy)await new Promise(r=>setTimeout(r,100));await clubAction('create',{name:'페어 창고 검증'});});
 assert.equal(await page.evaluate(()=>!!clubCurrent()),true);
 await page.evaluate(async()=>{await clubTransfer('deposit',{kind:'rin',qty:10});});
 let vault=(await db.query('select vault from runner_clubs')).rows[0].vault;assert.equal(Number(vault.rin),10,'pair gateway deposits real shared currency');
 dropClubReply=true;await page.evaluate(async()=>{await clubTransfer('deposit',{kind:'rin',qty:5});});
 assert.ok(await page.evaluate(()=>!!localStorage.getItem('mmjy-club-transfer-alice')));
 await page.evaluate(async()=>{await clubTransfer('deposit',{kind:'rin',qty:5});});
 vault=(await db.query('select vault from runner_clubs')).rows[0].vault;assert.equal(Number(vault.rin),15,'lost pair transfer reply is replayed once');
 blockPairReads=true;await page.evaluate(async()=>{await clubTransfer('deposit',{kind:'rin',qty:7});});
 assert.equal(await page.evaluate(()=>localStorage.getItem('mmjy-club-transfer-alice')),null,'acknowledged transfer is not retried when wallet refresh fails');
 blockPairReads=false;await page.evaluate(async()=>{PAIR_PLAY.retryAt=0;await PAIR_PLAY.refresh();});
 assert.equal(Number((await db.query('select vault from runner_clubs')).rows[0].vault.rin),22);
 assert.equal(await page.evaluate(()=>S.rin),Number((await db.query('select wallet from pair_play_state where pair_id=1')).rows[0].wallet.rin),'later refresh applies authoritative shared wallet');
 assert.deepEqual(errors,[]);console.log('PASS: real browser + PostgreSQL-backed quest, simultaneous lesson/research/fishing/farm, delayed save, incoming chat, timeout cooldown recovery, five-minute combat checkpoints, immediate hooks, durable fishing outbox, save-independent marketplace reads, trade acknowledgement/recovery and reload deduplication');
 }finally{await browser.close();server.close();await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
