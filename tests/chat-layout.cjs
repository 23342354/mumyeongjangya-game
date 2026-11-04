const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const rel=decodeURIComponent(req.url.split('?')[0]);if(rel.includes('..')){res.writeHead(404).end();return;}try{const f=path.join(root,rel==='/'?'index.html':rel);res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','png':'image/png','webp':'image/webp'})[path.extname(f).slice(1)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1721,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.fulfill({status:200,contentType:r.request().resourceType()==='stylesheet'?'text/css':'application/json',body:r.request().resourceType()==='stylesheet'?'':'[]'}));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증학생';S.t=nowMin();S.dayStamp=cal().day;boot();document.querySelector('#main').style.minHeight='2000px';document.querySelector('#chatlog').innerHTML=Array.from({length:100},(_,i)=>`<div class="cmsg">${i} · 채팅 높이 검증</div>`).join('');document.querySelector('#chatinput').value='작성 중인 초안';});
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
 const check=async()=>{await settle();const dims=await page.evaluate(()=>{const chat=document.querySelector('#chatcol').getBoundingClientRect(),input=document.querySelector('#chatinput').getBoundingClientRect(),top=document.querySelector('#topbar').getBoundingClientRect(),log=document.querySelector('#chatlog');return {top:chat.top,header:top.bottom,bottom:chat.bottom,input:input.bottom,height:innerHeight,gap:log.scrollHeight-log.clientHeight-log.scrollTop,draft:document.querySelector('#chatinput').value};});assert.ok(dims.top>=dims.header+15,JSON.stringify(dims));assert.ok(dims.bottom<=dims.height-12,JSON.stringify(dims));assert.ok(dims.input<=dims.height-15,JSON.stringify(dims));assert.equal(dims.draft,'작성 중인 초안');return dims;};
 for(const height of [950,700]){
  await page.setViewportSize({width:1721,height});
  await page.evaluate(()=>{const log=document.querySelector('#chatlog');log.scrollTop=log.scrollHeight;});await settle();
  for(const count of [35,2,60,0]){
   await page.evaluate(n=>{document.querySelector('#topbar .tb2').innerHTML=Array.from({length:n},(_,i)=>`<span class="buffchip">물약 효과 ${i} · 2시간 44분</span>`).join('');},count);
   const dims=await check();assert.ok(dims.gap<2,'latest messages remain visible on resize: '+JSON.stringify(dims));
  }
 }
 await page.evaluate(()=>{document.querySelector('#chatlog').scrollTop=120;});await settle();
 await page.evaluate(()=>{document.querySelector('#topbar .tb2').innerHTML='<span class="buffchip">추가 효과</span>'.repeat(35);});await check();
 assert.equal(await page.locator('#chatlog').evaluate(el=>el.scrollTop),120,'reading position is preserved');
 await page.setViewportSize({width:1100,height:800});await settle();assert.equal(await page.locator('#chatcol').evaluate(el=>Math.round(el.getBoundingClientRect().height)),440,'tablet flow retains its own height');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.body.classList.add('mobile-game','mobile-chat-open'));await settle();
 assert.equal(await page.locator('#chatcol').evaluate(el=>getComputedStyle(el).position),'fixed');
 assert.ok(await page.locator('#chatinput').evaluate(el=>el.getBoundingClientRect().bottom<innerHeight),'mobile input remains visible');
 assert.deepEqual(errors,[]);console.log('PASS: wrapped buffs at desktop heights 950/700, visible compose input, latest-message follow, preserved reading position/draft, tablet and mobile layouts');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
