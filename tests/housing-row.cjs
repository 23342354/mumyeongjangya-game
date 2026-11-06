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
 await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.t=nowMin();S.dayStamp=cal().day;boot();sbOn=()=>true;pairEnsure=()=>({mine:{id:1}});SOCIAL.pairs=[{id:1,pair_name:'오즈란위'}];pairRow=()=>({name:'란위안',hall:'w6',home_stage:3,updated_at:new Date().toISOString()});pairSharedHome=()=>({hall:'w6',stage:3,mine:true});pairRentDue=()=>0;S.hall='w6';document.querySelector('#main').innerHTML=VIEWS.hallv();});
 assert.ok((await page.locator('.pair-housing-row').innerText()).includes('오즈란위의 거처'));
 assert.equal(await page.locator('.pair-housing-row>.card').count(),3);
 await page.evaluate(()=>{VIEW='pairhub';renderNav();});
 assert.equal(await page.locator('#mobile-subnav button.on').innerText(),'오즈란위');
 assert.ok((await page.locator('#navcol').innerText()).includes('오즈란위'));
 assert.equal(await page.evaluate(()=>{SOCIAL.pairs[0].pair_name='';return navItemLabel({id:'pairhub',n:'우리 페어'});}),'우리 페어');
 for(const width of [1721,390]){await page.setViewportSize({width,height:900});const boxes=await page.locator('.pair-housing-row>.card').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();return {y:b.y,h:b.height,x:b.x};}));assert.ok(boxes.every(b=>Math.abs(b.x-boxes[0].x)<1),'three cards share left edge');assert.ok(boxes[1].y>=boxes[0].y+boxes[0].h&&boxes[2].y>=boxes[1].y+boxes[1].h,'three cards stack vertically');}
 console.log('PASS: shared pair name title, three vertically stacked housing cards on desktop and mobile');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
