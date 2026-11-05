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
 await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.t=nowMin();S.dayStamp=cal().day;boot();farmEnsure();S.farm.seeds={g1:3,g2:2};S.weather=0;S.farm.plots=Array(9).fill(null);S.farm.plots[1]={id:'g2',left:90};pickCrop(0);});
 assert.ok((await page.locator('#farm-seed-list').innerText()).includes('교배 조건 충족 · 망천연근 × 백옥무 → 홍련근 씨앗'));
 assert.ok((await page.locator('#farm-seed-list').innerText()).includes('변이 조건 충족'));
 assert.equal(await page.evaluate(()=>{S.farm.plots[1]=null;S.farm.plots[4]={id:'g2'};return farmSeedHints(FARM_CROP_BY_ID.g1,0).filter(h=>h.ready&&h.text.includes('교배')).length;}),0,'diagonals do not qualify');
 await page.locator('#farm-seed-search').fill('백옥무');assert.ok(await page.locator('.seed-pick-card').count()>0);
 await page.evaluate(()=>{closeModal();S.buffs=[];S.potion.q3=1;drink('q3');S.inv.p3=1;useItem('p3');renderTop();});
 assert.equal(await page.locator('.top-effect-group').count(),2);
 await page.locator('[aria-controls="effects-potion"]').hover();assert.ok(await page.locator('#effects-potion').isVisible());assert.ok((await page.locator('#effects-potion').innerText()).includes('방어력 +20%'));assert.equal(await page.locator('#effects-potion .top-effect-row').count(),1);
 await page.mouse.move(0,600);await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.body.classList.add('mobile-game','top-open'));
 await page.locator('[aria-controls="effects-potion"]').click();await page.evaluate(()=>renderTop());assert.ok(await page.locator('#effects-potion').isVisible());
 const box=await page.locator('#effects-potion').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);assert.deepEqual(errors,[]);
 console.log('PASS: mutation weather, orthogonal recipes, seed search, grouped effects, multi-effect potion, hover and persistent mobile tap');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
