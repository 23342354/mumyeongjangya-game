const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const rel=decodeURIComponent(req.url.split('?')[0]);if(rel.includes('..')){res.writeHead(404).end();return;}try{const f=path.join(root,rel==='/'?'index.html':rel);res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','png':'image/png','webp':'image/webp'})[path.extname(f).slice(1)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--single-process','--no-zygote','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer']});
try{
 const page=await browser.newPage({viewport:{width:1721,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.fulfill({status:200,contentType:r.request().resourceType()==='stylesheet'?'text/css':'application/json',body:r.request().resourceType()==='stylesheet'?'':'[]'}));
 await page.addInitScript(()=>{window.setInterval=()=>0;});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.t=nowMin();S.dayStamp=cal().day;boot();sbOn=()=>true;pairEnsure=()=>({mine:{id:1}});SOCIAL.pairs=[{id:1,pair_name:'오즈란위'}];pairRow=()=>({name:'란위안',hall:'w6',home_stage:3,updated_at:new Date().toISOString()});pairSharedHome=()=>({hall:'w6',stage:3,mine:true});pairRentDue=()=>0;pairMergeApply=()=>false;S.hall='w6';document.querySelector('#main').innerHTML=VIEWS.hallv();});
 await page.evaluate(()=>{S.home.stage=5;VIEW='hallv';document.activeElement?.blur();renderMain(true);});
 assert.equal(await page.locator('.home-scene-card').count(),1);
 assert.ok(await page.locator('.pair-team-card + .home-scene-card').count());
 assert.equal(await page.locator('.home-scene-art img').getAttribute('src'),'assets/housing/w6-5.webp');
 const before=await page.evaluate(()=>JSON.stringify(S));
 await page.selectOption('#home-scene-stage','2');
 assert.equal(await page.locator('.home-scene-art img').getAttribute('src'),'assets/housing/w6-2.webp');
 assert.equal(await page.evaluate(()=>JSON.stringify(S)),before,'image choice must not mutate gameplay state');
 await page.evaluate(()=>renderMain(true));
 assert.equal(await page.locator('#home-scene-stage').inputValue(),'2');
 await page.evaluate(()=>{S.hall='dorm';document.activeElement?.blur();renderMain(true);});
 assert.equal(await page.locator('#home-scene-stage option').count(),6);
 assert.equal(await page.locator('.home-scene-art img').getAttribute('src'),'assets/housing/dorm-4.webp');
 await page.evaluate(()=>setHomeSceneStage('5'));
 assert.equal(await page.locator('#home-scene-stage').inputValue(),'auto');
 await page.evaluate(()=>{S.hall='w7';document.activeElement?.blur();renderMain(true);});
 assert.equal(await page.locator('#home-scene-stage').inputValue(),'auto');
 await page.evaluate(()=>{S.hall='w6';document.activeElement?.blur();renderMain(true);});
 assert.equal(await page.locator('#home-scene-stage').inputValue(),'2');
 await page.selectOption('#home-scene-stage','auto');
 assert.equal(await page.locator('.home-scene-art img').getAttribute('src'),'assets/housing/w6-5.webp');
 for(const hall of ['dorm','w1','w2','w3','w4','w5','w6','w7']){
  await page.evaluate(hall=>{S.hall=hall;document.activeElement?.blur();renderMain(true);},hall);
  for(let st=0;st<=(hall==='dorm'?4:5);st++){
   await page.selectOption('#home-scene-stage',String(st));
   assert.equal(await page.locator('.home-scene-art img').evaluate(async img=>{await img.decode();return img.naturalWidth>0;}),true);
  }
 }
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:950});
  for(const view of ['pairhub','hallv']){
   await page.evaluate(view=>{VIEW=view;document.activeElement?.blur();renderMain(true);},view);
   assert.equal(await page.locator('.pair-team-card + .home-scene-card').count(),1);
   assert.ok(await page.locator('button[onclick="openUpdateNotices()"]').first().isVisible());
   assert.ok(await page.locator('.home-scene-card').evaluate(el=>{const b=el.getBoundingClientRect();return b.width<=innerWidth&&b.x>=0;}));
  }
  await page.screenshot({path:`/workspace/scratch/248fee2a9e88/housing-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: all 47 housing images, region-only stage selection, persistence, unchanged gameplay state, wallet placement, desktop/mobile and update notice button');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
