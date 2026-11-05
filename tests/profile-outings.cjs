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
 const result=await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증';S.course=5;S.t=nowMin();S.dayStamp=cal().day;boot();Math.random=()=>0;S.pass=3;S.outing={done:{},souv:[],read:[]};startOuting(1);const first=OUTING.scene.id;drawOuting();const same=OUTING.scene.id===first;for(let i=0;i<3;i++){outChoose(1);drawOuting();}const read=S.outing.read.length,ids=[...OUTING.storyIds],options=souvenirsFor(WARDS.find(w=>w.id===1));const chosen=options[0];const before=extraStat('agi');takeSouv(1,0);const after=extraStat('agi'),count=S.outing.souv.length;takeSouv(1,0);const duplicateBlocked=S.outing.souv.length===count;const bonus=outingCollection()[0].bonus;
 S.outing.souv.push({...S.outing.souv[0]});const dedupe=outingCollection().length===1;
 S.outing.souv.push({w:7,n:'닳은 륜 한 닢',e:''});const legacy=outingCollection().some(s=>s.id.startsWith('legacy-')&&s.bonus.stats.res===2);
 S.dex.mon=['a','b','c','d','e','f'];const stat=dexRewardStat9('atk');const quality=mod('quality');const qualityBefore=quality;S.dex.mon=[];const qualityDiff=qualityBefore-mod('quality');
 const data=OUTING_PROFILE_STORIES.map(e=>e.people+' '+e.text).join('');const counts=WARDS.map(w=>OUTING_PROFILE_STORIES.filter(e=>e.w===w.id).length);return {stories:OUTING_PROFILE_STORIES.length,counts,read,same,distinct:new Set(ids).size,options:options.length,gain:after-before,bonus,duplicateBlocked,dedupe,legacy,stat,qualityDiff,excluded:/우건하|지영원|슈란|노란 벽돌|하이윤|마장관/.test(data),view:VIEWS.outing().includes('구역 기념품 수집첩')};});
 assert.equal(result.stories,35);assert.ok(result.counts.every(n=>n===5));assert.equal(result.read,3);assert.ok(result.same);assert.equal(result.distinct,3);assert.equal(result.options,3);assert.equal(result.gain,2);assert.ok(result.duplicateBlocked&&result.dedupe&&result.legacy&&result.view);assert.equal(result.stat,4);assert.ok(Math.abs(result.qualityDiff-.024)<1e-9);assert.equal(result.excluded,false);assert.deepEqual(errors,[]);console.log('PASS: 35 district stories, stable scene choices, new-first distinct trip, story-linked keepsakes, unique permanent effects, legacy bonuses, exclusion rules, stronger retroactive dex and collector UI');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
