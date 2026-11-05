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
 const result=await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.lvl=80;S.t=nowMin();S.dayStamp=cal().day;boot();S.mat.가루=200;S.mat.부적가루=0;talismanExchange(10);const exchanged=[S.mat.가루,S.mat.부적가루];talismanExchange(-1);talismanExchange(1.5);talismanExchange(1000);const invalid=[S.mat.가루,S.mat.부적가루];
 const it=mkGear(60,4);it.enh=7;S.bag.push(it);const before=JSON.stringify({main:it.main,lv:it.lv,grade:it.grade,enh:it.enh,name:it.name,id:it.id});const low=reforgeCost({...it,lv:10,grade:1}).dust,high=reforgeCost(it).dust;
 reforgeLock(it.id,0);const locked=JSON.stringify(it.opts[0]);const cost=reforgeCost(it);S.mat.부적가루=cost.dust+10;S.rin=cost.rin+100;reforgeApply(it.id);const after=JSON.stringify({main:it.main,lv:it.lv,grade:it.grade,enh:it.enh,name:it.name,id:it.id});
 const paid=[S.mat.부적가루,S.rin],kept=JSON.stringify(it.opts[0])===locked,count=it.opts.length,unique=new Set(it.opts.map(o=>o.k)).size;
 const opts=JSON.stringify(it.opts);S.mat.부적가루=0;reforgeApply(it.id);const insufficient=JSON.stringify(it.opts)===opts;
 it.reforgeLocks=it.opts.map((o,i)=>i);const all=JSON.stringify(it);S.mat.부적가루=999999999;reforgeApply(it.id);const allLocked=all===JSON.stringify(it)&&S.mat.부적가루===999999999;
 return {exchanged,invalid,low,high,lockCost:cost.dust,paid,kept,before,after,count,unique,insufficient,allLocked,button:VIEWS.gear().includes('재련'),shop:VIEWS.shop().includes('부적 가루 교환')};});
 assert.deepEqual(result.exchanged,[190,100]);assert.deepEqual(result.invalid,[190,100]);assert.ok(result.high>result.low);assert.ok(result.lockCost>=result.high*2.49);assert.deepEqual(result.paid,[10,100]);assert.equal(result.before,result.after);assert.ok(result.kept&&result.insufficient&&result.allLocked&&result.button&&result.shop);assert.equal(result.count,result.unique);assert.deepEqual(errors,[]);
 console.log('PASS: separate balances, exchange validation, level/grade/lock costs, locked options, unchanged main/grade/enhancement, exact payment, unique options and insufficient/all-locked protection');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
