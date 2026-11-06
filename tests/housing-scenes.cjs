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
 assert.ok(await page.locator('.pair-team-card + .housing-overview .home-scene-card').count());
 assert.equal(await page.locator('.home-scene-background').getAttribute('data-scene'),'w6-5');
 const before=await page.evaluate(()=>JSON.stringify(S));
 await page.selectOption('#home-scene-stage','2');
 assert.equal(await page.locator('.home-scene-background').getAttribute('data-scene'),'w6-2');
 assert.equal(await page.evaluate(()=>JSON.stringify(S)),before,'image choice must not mutate gameplay state');
 await page.evaluate(()=>renderMain(true));
 assert.equal(await page.locator('#home-scene-stage').inputValue(),'2');
 await page.evaluate(()=>{S.hall='dorm';document.activeElement?.blur();renderMain(true);});
 assert.equal(await page.locator('#home-scene-stage option').count(),6);
 assert.equal(await page.locator('.home-scene-background').getAttribute('data-scene'),'dorm-4');
 await page.evaluate(()=>setHomeSceneStage('5'));
 assert.equal(await page.locator('#home-scene-stage').inputValue(),'auto');
 await page.evaluate(()=>{S.hall='w7';document.activeElement?.blur();renderMain(true);});
 assert.equal(await page.locator('#home-scene-stage').inputValue(),'auto');
 await page.evaluate(()=>{S.hall='w6';document.activeElement?.blur();renderMain(true);});
 assert.equal(await page.locator('#home-scene-stage').inputValue(),'2');
 await page.selectOption('#home-scene-stage','auto');
 assert.equal(await page.locator('.home-scene-background').getAttribute('data-scene'),'w6-5');
 for(const hall of ['dorm','w1','w2','w3','w4','w5','w6','w7']){
  await page.evaluate(hall=>{S.hall=hall;document.activeElement?.blur();renderMain(true);},hall);
  for(let st=0;st<=(hall==='dorm'?4:5);st++){
   await page.selectOption('#home-scene-stage',String(st));
   assert.equal(await page.locator('.home-scene-background').evaluate(async img=>{await img.decode();return img.naturalWidth>=200;}),true);
  }
 }
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:950});
  for(const view of ['pairhub','hallv']){
   await page.evaluate(view=>{VIEW=view;document.activeElement?.blur();renderMain(true);},view);
   assert.equal(await page.locator('.pair-team-card + .housing-overview .home-scene-card').count(),1);
   assert.ok(await page.locator('button[onclick="openUpdateNotices()"]').first().isVisible());
   assert.ok(await page.locator('.home-scene-background').evaluate(el=>el.getBoundingClientRect().width>250&&el.getBoundingClientRect().width<=370));
   const layout=await page.locator('.housing-overview').evaluate(el=>{const a=el.querySelector('.home-scene-card').getBoundingClientRect(),b=el.querySelector('.pair-housing-row').getBoundingClientRect(),cards=[...el.querySelectorAll('.pair-housing-row>.card')].map(c=>c.getBoundingClientRect());return {side:b.x>a.x,below:b.y>=a.bottom,cards:cards.every((c,i)=>i===0||c.y>=cards[i-1].bottom)};});
   assert.ok(width>700?layout.side:layout.below);assert.ok(layout.cards);
   assert.ok(await page.locator('.home-scene-art').evaluate(el=>{const art=el.getBoundingClientRect(),view=el.querySelector('.home-scene-viewport').getBoundingClientRect(),img=el.querySelector('.home-scene-background'),b=img.getBoundingClientRect(),css=getComputedStyle(img);return Math.abs(art.height-view.height)<1&&Math.abs(art.height-b.height)<1&&Math.abs(art.width-b.width)<1&&css.objectFit==='cover'&&css.imageRendering==='auto';}),'art fills viewport without empty bands or forced blocky scaling');
   assert.equal(await page.locator('.pair-housing-row>.card').count(),2);
   assert.equal(await page.locator('.pair-housing-row .sect-t').filter({hasText:'동거'}).count(),0);
   if(width>700)assert.ok(await page.locator('.housing-overview').evaluate(el=>{const image=el.querySelector('.home-scene-card').getBoundingClientRect(),row=el.querySelector('.pair-housing-row').getBoundingClientRect(),cards=[...el.querySelectorAll('.pair-housing-row>.card')].map(c=>c.getBoundingClientRect());return Math.abs(image.height-row.height)<2&&Math.abs(cards[0].height-cards[1].height)<2;}));
   assert.ok(await page.locator('.home-scene-card').evaluate(el=>{const b=el.getBoundingClientRect();return b.width<=innerWidth&&b.x>=0;}));
  }
  await page.screenshot({path:`/workspace/scratch/248fee2a9e88/housing-${width}.png`,fullPage:true});
 }
 await page.evaluate(()=>{const h=pairHeadState();h.forId='1';h.tokens=['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jgUAAAAAASUVORK5CYII=','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jgUAAAAAASUVORK5CYII='];document.activeElement?.blur();renderMain(true);});
 assert.equal(await page.locator('.home-roamer').count(),2);
 const still=await page.locator('.home-roamer-0').evaluate(el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=0;const first=el.getBoundingClientRect().x;a.currentTime=2000;return Math.abs(el.getBoundingClientRect().x-first)<1;});assert.ok(still,'token pauses');
 for(const width of [1440,390]){await page.setViewportSize({width,height:950});for(const time of [0,10000,21000,33000,47000])assert.ok(await page.locator('.home-scene-viewport').evaluate((el,t)=>{const b=el.getBoundingClientRect();return [...el.querySelectorAll('.home-roamer')].every(token=>{const anim=token.getAnimations()[0];anim.pause();anim.currentTime=t;const r=token.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1;});},time));}
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.home-roamer-0').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.evaluate(()=>{pairHeadState().forId='another-pair';document.activeElement?.blur();renderMain(true);});assert.equal(await page.locator('.home-roamer').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS: all 47 housing images, region-only stage selection, persistence, unchanged gameplay state, wallet placement, desktop/mobile and update notice button');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
