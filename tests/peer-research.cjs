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
 const result=await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.t=nowMin();S.dayStamp=cal().day;boot();pairEnsure=()=>({mine:{id:1}});window.PAIR_PLAY.ready=true;window.PAIR_PLAY.snapshot={peer:{name:'란위안',res:{r1:5,r2:0},study:{id:'r1'}}};const one=researchPeerCount(RESEARCH[0]),zero=researchPeerCount(RESEARCH[1]),unknown=researchPeerCount(RESEARCH[2]);const html=VIEWS.research();window.PAIR_PLAY.ready=false;const loading=researchPeerCount(RESEARCH[0]);pairEnsure=()=>({mine:null});return {one,zero,unknown,loading,solo:researchPeerCount(RESEARCH[0]),cards:(html.match(/research-peer-count/g)||[]).length,total:RESEARCH.length};});
 assert.ok(result.one.includes('란위안 · 5 / 20')&&result.one.includes('수행 중'));assert.ok(result.zero.includes('0 / 8'));assert.ok(result.unknown.includes('확인 중'));assert.ok(result.loading.includes('확인 중'));assert.equal(result.solo,'');assert.equal(result.cards,result.total);assert.deepEqual(errors,[]);console.log('PASS: all research cards show actual peer counts, zero, active study, unknown loading and solo state');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
