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
 await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.t=nowMin();S.dayStamp=cal().day;boot();sbOn=()=>true;pairEnsure=()=>({mine:{id:1},inbox:[],sent:[]});SOCIAL.pairs=[{id:1,pair_name:'함께 이름'}];pairOther=()=>({name:'란위안'});pairHeadHTML=()=>'';pairHousingHTML=()=>'';pairRunHTML=()=>'';document.querySelector('#main').innerHTML=VIEWS.pairhub();});
 assert.equal(await page.locator('.pair-settings-row>.card').count(),3);
 const texts=await page.locator('.pair-settings-row>.card').allTextContents();assert.ok(texts[0].includes('한 사람에게 하나만'));assert.ok(texts[1].includes('페어명 (함께 사용하는 이름)'));assert.ok(texts[2].includes('둘의 기록'));
 assert.equal(await page.locator('#pair-shared-name').inputValue(),'함께 이름');assert.ok((await page.locator('#pair-shared-name').locator('..').innerHTML()).includes("socialAction('pair_name'"));
 for(const width of [1721,390]){await page.setViewportSize({width,height:900});const boxes=await page.locator('.pair-settings-row>.card').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();return {y:b.y,h:b.height,x:b.x};}));assert.ok(boxes.every(b=>Math.abs(b.y-boxes[0].y)<1&&Math.abs(b.h-boxes[0].h)<1));assert.ok(boxes[2].x>boxes[1].x);}
 assert.deepEqual(errors,[]);console.log('PASS: pair/name/records order, same row and height, saved name and save handler retained');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
