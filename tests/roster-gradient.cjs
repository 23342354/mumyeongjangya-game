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
 await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.t=nowMin();S.dayStamp=cal().day;boot();sbOn=()=>true;SOCIAL.ready=true;SOCIAL.pairs=[{id:1,from_id:'a',to_id:'b',status:'accepted',pair_name:'琉璃'}];S.sb.id='a';S.color='#ff1122';S.sb.roster=Array.from({length:8},(_,i)=>({id:i===0?'a':i===1?'b':String(i),name:'학생'+i,color:i===1?'#22aaff':'#abcdef',intro:i%2?'긴 소개문 '.repeat(9):'',hall:'dorm',course:3,lvl:40,power:100,tower:20,guard:10,quest:40,ach:3,updated_at:new Date().toISOString()}));document.querySelector('#main').innerHTML=VIEWS.roster();});
 const tag=page.locator('.roster-pair-tag').first();assert.ok((await tag.innerText()).includes('琉璃'));assert.equal(await tag.evaluate(el=>el.style.getPropertyValue('--pair-color-a')),'#ff1122');assert.equal(await tag.evaluate(el=>el.style.getPropertyValue('--pair-color-b')),'#22aaff');
 for(const width of [1721,800,390]){await page.setViewportSize({width,height:900});const dims=await page.locator('.roster-card').evaluateAll(els=>els.map(el=>({height:el.getBoundingClientRect().height,overflow:el.scrollWidth>el.clientWidth+1})));assert.ok(dims.every(d=>Math.abs(d.height-dims[0].height)<1&&!d.overflow),'equal size without horizontal overflow');}
 assert.deepEqual(errors,[]);console.log('PASS: equal roster card heights, responsive width, shared pair label and both theme colors');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
