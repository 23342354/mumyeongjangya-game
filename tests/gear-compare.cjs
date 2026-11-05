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
 const result=await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.t=nowMin();S.dayStamp=cal().day;boot();S.lvl=50;const base=mkGear(30,2);base.id=1;S.gear[base.slot]=base;const better=JSON.parse(JSON.stringify(base));better.id=2;better.main.v+=10;S.bag=[better];const up=gearUpgradeHTML(better),same=gearUpgradeHTML(base),lower=gearUpgradeHTML({...base,main:{...base.main,v:0}});const card=gearCard(better);const market=marketViewItem({kind:'gear',item_data:better,item_name:'테스트',seller_id:'other',price:10});S.gear[base.slot]=null;const empty=gearUpgradeHTML(better);S.lvl=1;const locked=gearUpgradeHTML(better);return {up,same,lower,card:card.includes('▲ +9,000'),market:market.includes('▲ +9,000'),empty,locked};});
 assert.ok(result.up.includes('▲ +9,000'));assert.equal(result.same,'');assert.equal(result.lower,'');assert.ok(result.card&&result.market);assert.ok(result.empty.includes('▲ +'));assert.ok(result.locked.includes('Lv 30 필요'));assert.deepEqual(errors,[]);console.log('PASS: exact same-slot delta, equal/lower exclusion, empty slot, level warning, bag and market display');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
