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
 await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.t=nowMin();S.dayStamp=cal().day;boot();sbOn=()=>true;pairEnsure=()=>({mine:{id:1},inbox:[],sent:[]});SOCIAL.pairs=[{id:1,pair_name:'Wuthering Heights'}];const c=document.createElement('canvas');c.width=10;c.height=10;const img=c.toDataURL('image/png');Object.assign(PAIRHEAD,{img,tokens:[img,img],forId:'1'});document.querySelector('#main').innerHTML=pairHeadHTML();});
 assert.equal(await page.locator('.pair-scene-tokens img').count(),2);assert.equal(await page.locator('.pair-scene-name').innerText(),'Wuthering Heights');assert.ok(!(await page.locator('.pair-scene').innerText()).includes('함께 쓰는 이름'));assert.equal(await page.locator('.pair-scene .tag').count(),0);
 for(const width of [1721,390]){await page.setViewportSize({width,height:900});assert.ok(await page.locator('.pair-scene-name').evaluate(el=>{const p=el.parentElement.getBoundingClientRect(),b=el.getBoundingClientRect();return b.right<=p.right&&b.bottom<=p.bottom&&b.x>=p.x;}));}
 const result=await page.evaluate(async()=>{const img=PAIRHEAD.img;const legacy=pairHeadDecode(img);const restored=pairHeadDecode(pairHeadEncode(img,[img,img]));pairHeadPick();let payload;sbSend=async(m,u,data)=>{payload=data;};PAIRHEADNEW='';await pairHeadSave();await Promise.resolve();return {legacy:legacy.img===img&&legacy.tokens.every(t=>!t),restored:restored.tokens.length===2&&restored.tokens[1]===img,saved:pairHeadDecode(payload.header).tokens[0]===img,bg:pairHeadDecode(payload.header).img===img};});
 assert.deepEqual(result,{legacy:true,restored:true,saved:true,bg:true});assert.deepEqual(errors,[]);console.log('PASS: legacy background, shared token roundtrip/save, two tokens, name-only overlay and desktop/mobile bounds');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
