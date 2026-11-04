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
 await page.evaluate(()=>{MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';S=newState();S.made=true;S.name='검증학생';S.t=nowMin();S.dayStamp=cal().day;boot();document.querySelector('#main').style.minHeight='2000px';document.querySelector('#chatlog').innerHTML=Array.from({length:100},(_,i)=>`<div class="cmsg">${i} · 채팅 높이 검증</div>`).join('');document.querySelector('#chatinput').value='작성 중인 초안';});

 const result=await page.evaluate(()=>{
 const before={rin:S.rin,exp:S.exp,lvl:S.lvl,know:S.know,bag:S.bag.length,mat:JSON.stringify(S.mat),ing:JSON.stringify(S.ing),bmat:JSON.stringify(S.bmat)};
 const q=questAt(1);S.run={stage:1,q,left:50,total:60,kills:0,done:false,me:{n:'검증',hp:10000,max:10000,pos:'후열'},allies:[],foes:[{n:'적',hp:1,max:1}],rin:0,exp:0,know:0,eff:1,pos:'후열',logs:[],rewardVersion:2,pending:runEmptyRewards(),lastTick:Date.now()-10000};
 const random=Math.random,attack=resolveAttack;
 Math.random=()=>.5;resolveAttack=()=>{S.run.foes[0].hp=0;Math.random=()=>.01;};runStep();Math.random=random;resolveAttack=attack;
 const afterKill={rin:S.rin,exp:S.exp,lvl:S.lvl,know:S.know,bag:S.bag.length,mat:JSON.stringify(S.mat),ing:JSON.stringify(S.ing),bmat:JSON.stringify(S.bmat)};
 const pending=JSON.parse(JSON.stringify(S.run.pending));
 const survived=JSON.parse(JSON.stringify(S.run));S.run=survived;
 S.run.left=0;endRun(true);
 const afterEnd={rin:S.rin,exp:S.exp,lvl:S.lvl,know:S.know,bag:S.bag.length,mat:JSON.stringify(S.mat),ing:JSON.stringify(S.ing),bmat:JSON.stringify(S.bmat)};
 const finalPending=JSON.parse(JSON.stringify(S.run.pending));const finished=S.run;
 runClear();const paid={rin:S.rin,know:S.know,bag:S.bag.length,exp:S.exp,lvl:S.lvl,mat:JSON.stringify(S.mat)};
 settleRunRewards(finished);const duplicate={rin:S.rin,know:S.know,bag:S.bag.length,exp:S.exp,lvl:S.lvl,mat:JSON.stringify(S.mat)};
 // Legacy completed logs already paid their rewards.
 S.run={done:true,rin:100,exp:100,know:100};runClear();
 const legacy={rin:S.rin,know:S.know,bag:S.bag.length,exp:S.exp,lvl:S.lvl,mat:JSON.stringify(S.mat)};
 return {before,afterKill,afterEnd,pending,finalPending,paid,duplicate,legacy,cleared:S.run===null};
 });
 assert.deepEqual(result.afterKill,result.before,'no rewards are spendable during combat');assert.deepEqual(result.afterEnd,result.before,'completion waits for settlement');
 assert.ok(result.pending.rin>0&&result.pending.exp>0&&result.pending.know>0);assert.ok(result.pending.gear.length>0);assert.ok(Object.keys(result.pending.mat).length&&Object.keys(result.pending.ing).length&&Object.keys(result.pending.bmat).length);
 assert.equal(result.paid.rin-result.before.rin,result.finalPending.rin);assert.equal(result.paid.know-result.before.know,result.finalPending.know);assert.equal(result.paid.bag-result.before.bag,result.finalPending.gear.length);assert.deepEqual(result.paid,result.duplicate);assert.deepEqual(result.paid,result.legacy);assert.equal(result.cleared,true);
 const totalXp=x=>x.exp+Array.from({length:x.lvl-1},(_,i)=>Math.round(260*Math.pow(1.11,i))).reduce((a,b)=>a+b,0);
 assert.equal(totalXp(result.paid)-totalXp(result.before),result.finalPending.exp,'XP pays the stored amount without a second multiplier');
 const early=await page.evaluate(()=>{
  const before=S.rin;
  // A live old run's prior earnings remain paid; only its new pouch is due.
  S.run={stage:1,q:questAt(1),left:30,total:60,kills:1,done:false,me:{hp:100,max:100},allies:[],foes:[],rin:999,exp:999,know:999,eff:1,pos:'후열',logs:[]};
  runRewards().rin=7;const it=mkGear(10,2);runRewards().gear.push(it);
  S.bag=Array.from({length:bagCapacity()},(_,i)=>({...it,id:i+1000}));
  endRun(false);const pending=S.run.pending,none=S.rin===before;
  runClear();return {none,delta:S.rin-before,bonus:pending.exp,retained:S.balance20.pendingLoot.some(x=>x.id===it.id)};
 });
 assert.equal(early.none,true);assert.equal(early.delta,7);assert.equal(early.bonus,0);assert.equal(early.retained,true);
 assert.deepEqual(errors,[]);console.log('PASS: kill and completion defer currencies/XP/gear/all material groups; save reload retains pouch; settlement pays exactly once; legacy completed run is not paid again');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
