const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const rel=decodeURIComponent(req.url.split('?')[0]);if(rel.includes('..')){res.writeHead(404).end();return;}try{const f=path.join(root,rel==='/'?'index.html':rel);res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','png':'image/png','webp':'image/webp'})[path.extname(f).slice(1)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1721,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.fulfill({status:200,contentType:r.request().resourceType()==='stylesheet'?'text/css':'application/json',body:r.request().resourceType()==='stylesheet'?'':'[]'}));
 await page.addInitScript(()=>{window.setInterval=()=>0;});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='나';S.t=nowMin();S.dayStamp=cal().day;boot();sbOn=()=>true;SOCIAL.ready=true;SOCIAL.pairs=[{id:2,from_id:'a',to_id:'b',status:'accepted',pair_name:'함께'}];S.sb.roster=[{id:'a',name:'가',color:'#ff1122',hall:'dorm',updated_at:new Date().toISOString()},{id:'b',name:'나',color:'#22aaff',hall:'dorm',updated_at:new Date().toISOString()}];const c=document.createElement('canvas');c.width=1;c.height=1;const img=c.toDataURL('image/png');window.headerTestImage=img;sbGet=async()=>[{...SOCIAL.pairs[0],header:JSON.stringify({v:2,img,tokens:[img,img],fontCSS:''})}];document.querySelector('#main').innerHTML=VIEWS.roster();});
 await page.locator('.roster-card').first().click();await page.locator('.roster-pair-scene-name').waitFor();assert.equal(await page.locator('.roster-pair-scene-name').innerText(),'함께');assert.equal(await page.locator('#modalroot .pair-scene-tokens img').count(),2);assert.equal(await page.locator('#modalroot [onclick*="pairHeadPick"]').count(),0);
 assert.equal(await page.locator('.roster-pair-scene-name').evaluate(el=>el.style.getPropertyValue('--pair-name-b')),'#22aaff');
 await page.evaluate(()=>{closeModal();});await page.locator('.roster-card').first().focus();await page.keyboard.press('Enter');await page.locator('.roster-pair-scene-name').waitFor();
 const safe=await page.evaluate(async()=>{const previous=JSON.stringify(PAIRHEAD);sbGet=async()=>{throw Error('denied');};await rosterPairHeader('a');return {message:document.getElementById('roster-header-preview').textContent,unchanged:previous===JSON.stringify(PAIRHEAD)};});assert.ok(safe.message.includes('불러오지 못했습니다')&&safe.unchanged);assert.deepEqual(errors,[]);console.log('PASS: roster click/keyboard open pair header with tokens/colors; read-only controls; permission error and own header preservation');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
