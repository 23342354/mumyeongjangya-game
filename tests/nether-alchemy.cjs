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
 const result=await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.t=nowMin();S.dayStamp=cal().day;boot();S.course=5;S.mana=10000000;ensureV4();for(const p of POTIONS)for(const k in p.mat){if(k in S.ing)S.ing[k]=9999;else S.mat[k]=9999;}for(const p of POTIONS.slice(9))brew(p.id,1);const made=POTIONS.slice(9).every(p=>S.potion[p.id]===1);const count=POTIONS.length;
 S.potion.q2=1;drink('q2');drink('q15');const upgraded=!S.buffs.some(b=>b.pid==='q2')&&S.buffs.filter(b=>b.pid==='q15').length===2;
 S.potion.q15=1;const attack=mod('atkP');drink('q15');const noDouble=mod('atkP')===attack;
 drink('q14');const cooldown=pairSoulPeriod(300),first=pairSoulCount(14),second=pairSoulCount(71);
 drink('q12');S.run={me:{n:'나',hp:50,max:100},allies:[]};const target={hp:200};const old=window._alchemyAttack;const logs=[];const originalD5=d5;d5=n=>n*3;S.run.me.atk=10;S.run.me.agi=10;target.def=1;target.agi=0;resolveAttack(S.run.me,target,logs);d5=originalD5;const healed=S.run.me.hp>50;
 const html=VIEWS.alche();const valid=POTIONS.slice(9).every(p=>Object.keys(p.mat).every(k=>ING.some(i=>i.k===k)||k in S.mat));const invalid=canBrew(POTIONS[0],-1)===false&&canBrew(POTIONS[0],1.5)===false;
 return {made,count,upgraded,noDouble,cooldown,first,second,healed,valid,invalid,sixHours:html.includes('6시간'),names:POTIONS.map(p=>p.n)};});
 assert.ok(result.made&&result.upgraded&&result.noDouble&&result.healed&&result.valid&&result.invalid&&result.sixHours);assert.equal(result.count,17);assert.equal(result.cooldown,276);assert.equal(result.first,0);assert.equal(result.second,2);assert.equal(result.names[0],'정심청로');assert.deepEqual(errors,[]);console.log('PASS: 17 renamed/new recipes, available materials, production, upgrade replacement, no duplicate effect, 8% resonance haste, life absorption and actual duration labels');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
