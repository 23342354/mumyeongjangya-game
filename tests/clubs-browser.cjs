const {chromium}=require('playwright'),{PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let rel=decodeURIComponent(req.url.split('?')[0]);if(rel.includes('..'))return res.writeHead(404).end();try{const f=path.join(root,rel==='/'?'index.html':rel);res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','png':'image/png','webp':'image/webp'})[path.extname(f).slice(1)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
(async()=>{const db=new PGlite();await db.exec(`create role anon;create role authenticated;create table accounts(id text primary key,pw text,name text,save jsonb);insert into accounts values('alice','secret','Alice','{}'),('bob','secret','Bob','{}'),('eve','secret','Eve','{}');`);await db.exec(fs.readFileSync(path.join(root,'supabase/clubs.sql'),'utf8'));
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});let drop=false;const errors=[];
try{
 const pages={};for(const user of ['alice','bob','eve']){
  const context=await browser.newContext({viewport:{width:1440,height:950}});await context.addInitScript(()=>{window.setInterval=()=>1;});
  await context.route('**/*',async route=>{const url=route.request().url();if(url.includes('/rpc/runner_club')){const a=route.request().postDataJSON();try{const r=(await db.query('select runner_club($1,$2,$3,$4) as r',[a.p_user,a.p_token,a.p_action,a.p_data])).rows[0].r;if(drop&&a.p_action==='message'){drop=false;return route.abort('failed');}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(r)});}catch(e){return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message,code:e.code})});}}
   if(url.startsWith('http://127.0.0.1:'))return route.continue();return route.fulfill({status:200,contentType:route.request().resourceType()==='stylesheet'?'text/css':'application/json',body:route.request().resourceType()==='stylesheet'?'':'[]'});
  });
  const page=await context.newPage();pages[user]=page;page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async user=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name=user;S.t=nowMin();S.dayStamp=cal().day;boot();MMJY_CONFIG.supabaseUrl='https://club.test';MMJY_CONFIG.supabaseKey='mock';ACCT={id:user,tok:'secret'};S.sb.id=user;S.sb.url='https://club.test';S.sb.key='mock';await clubRefresh(true);VIEW='club';renderMain(true);},user);
 }
 const {alice,bob,eve}=pages;
 await alice.locator('#club-name').fill('달빛 네 사람');await alice.locator('#club-intro').fill('함께하는 모임 <b>태그 그대로</b>');await alice.evaluate(()=>clubRefresh(true));assert.equal(await alice.locator('#club-name').inputValue(),'달빛 네 사람','refresh preserves a new-club draft');await alice.getByRole('button',{name:'모임 만들기',exact:true}).click();await alice.waitForFunction(()=>!!clubCurrent());
 assert.equal(await alice.locator('#main').locator('b').filter({hasText:'태그 그대로'}).count(),0,'intro is escaped');
 await bob.evaluate(()=>clubRefresh(true));await bob.getByRole('button',{name:'가입하기',exact:true}).click();await bob.waitForFunction(()=>!!clubCurrent());
 assert.equal(await bob.evaluate(()=>CLUBNET.members.length),2);
 await db.exec('update runner_clubs set xp=690');await alice.evaluate(async()=>{await clubAction('attend');});
 assert.equal(await alice.evaluate(()=>clubCurrent().lv),8);assert.equal(await alice.evaluate(()=>clubOpt('study')),.05);assert.ok(await alice.evaluate(()=>mod('study')>=.05),'level benefit reaches actual reward modifier');assert.equal(await alice.evaluate(()=>clubOpt('know')),.02);
 await alice.evaluate(()=>setChatTab('모임'));drop=true;await alice.locator('#chatinput').fill('부원만 보는 대화 <img src=x onerror=alert(1)>');await alice.locator('#chatinput').press('Enter');await alice.waitForFunction(()=>!CLUBNET.sending);
 assert.match(await alice.locator('#chatinput').inputValue(),/부원만/,'failed send preserves draft');
 await alice.locator('#chatinput').press('Enter');await alice.waitForFunction(()=>!CLUBNET.sending&&document.querySelector('#chatinput').value==='');
 assert.equal((await db.query('select count(*)::int as n from runner_club_messages')).rows[0].n,1,'lost reply retry sends once');
 assert.equal(await alice.locator('#chatlog img').count(),0,'message HTML is escaped');
 await bob.evaluate(async()=>{setChatTab('모임');await clubRefresh(true);});assert.match(await bob.locator('#chatlog').innerText(),/부원만 보는 대화/);
 await eve.evaluate(async()=>{setChatTab('모임');await clubRefresh(true);});assert.doesNotMatch(await eve.locator('#chatlog').innerText(),/부원만/);assert.equal(await eve.evaluate(()=>clubOpt('study')),0);
 await bob.evaluate(()=>chatRows([{id:123,tab:'모임',scope:chatScope('모임'),body:'공용 채팅 위조',from_id:'eve',who:'Eve'}],true,false));assert.doesNotMatch(await bob.locator('#chatlog').innerText(),/위조/);
 await alice.evaluate(()=>clubAction('leave'));assert.equal(await alice.evaluate(()=>clubCurrent()),null);assert.doesNotMatch(await alice.locator('#chatlog').innerText(),/부원만/);
 await bob.evaluate(()=>clubRefresh(true));assert.equal(await bob.evaluate(()=>clubCurrent().owner_id),'bob');
 await bob.setViewportSize({width:390,height:844});await bob.evaluate(()=>{VIEW='club';renderMain(true);});assert.ok(await bob.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile club layout fits');
 assert.deepEqual(errors,[]);console.log('PASS: real SQL-backed create/join, 4-person UI, level benefits, private chat, lost-response retry, escaped content, nonmember/public-row exclusion, leave/revocation, leader transfer and mobile layout');
}finally{await browser.close();await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
