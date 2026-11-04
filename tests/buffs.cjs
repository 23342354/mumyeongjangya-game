/* 효과가 겹치는지, 그리고 겹친 것이 화면에 보이는지 확인합니다.
   건의: "탕약과 물약은 중복 적용이 안 되나요? 나중에 쓴 것만 떠서"
   실제로는 효과가 겹쳤지만 만두 칸이 상단 띠에 표시되지 않아
   겹치지 않는 것처럼 보였습니다. 그래서 합산과 표시를 함께 검사합니다. */
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png',
 '.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/json'};
const server=http.createServer((q,r)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';
  const f=path.join(root,rel);
  if(rel.includes('..')||!fs.existsSync(f)){r.writeHead(404);r.end();return;}
  r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});
  r.end(fs.readFileSync(f));
});

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 const browser=await chromium.launch({headless:true,
   executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-gpu']});
 const ctx=await browser.newContext({viewport:{width:1200,height:900}});
 await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')
   ? r.continue() : r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 const page=await ctx.newPage();
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'load'});

 const r=await page.evaluate(()=>{
  MMJY_CONFIG.supabaseUrl='';MMJY_CONFIG.supabaseKey='';
  S=newState();S.made=true;S.name='한나';S.t=nowMin();S.dayStamp=cal().day;boot();
  const reset=()=>{S.buffs=[];S.kit.eat=null;S.kit.dess=null;S.kit.have={};S.inv={};S.potion={};};
  const out={};

  /* 탕약과 물약은 효과가 더해집니다 */
  reset();S.inv.p4=1;S.potion.q1=1;
  useItem('p4');const one=mod('study');drink('q1');
  out.decoctionPlusPotion={one:+one.toFixed(4),both:+mod('study').toFixed(4)};

  /* 식사·디저트·버프는 서로 다른 자리라 모두 더해집니다 */
  reset();S.kit.have={d6:1,d15:1};S.inv.p3=1;S.potion.q5=1;
  eat('d6');eat('d15');useItem('p3');drink('q5');
  const dish=id=>DISHES.find(x=>x.id===id).buf.find(([k])=>k==='exp')[1];
  out.expStack={
    sum:+mod('exp').toFixed(4),
    expected:+(dish('d6')+dish('d15')+0.05+0.25).toFixed(4)
  };

  /* 그리고 그 넷이 모두 상단 띠에 보여야 합니다 */
  renderTop();
  const top=document.querySelector('#topbar').innerText;
  out.shown={
    식사:top.includes('연근산채 만두'), 디저트:top.includes('달빛대추 만두'),
    버프:top.includes('월병'), 물약:top.includes('맨드레이크 각성제'),
    띠항목수:(typeof mealChips==='function'?mealChips().length:0)+S.buffs.filter(b=>!b.hide).length
  };

  /* 같은 물약을 두 번 마시면 효과가 겹치는 대신 시간이 늘어납니다 */
  reset();S.potion.q5=2;
  drink('q5');const first=mod('exp'),firstLeft=S.buffs.find(b=>b.pid==='q5').left;
  drink('q5');
  out.sameTwice={first:+first.toFixed(4),second:+mod('exp').toFixed(4),
    leftGrew:S.buffs.find(b=>b.pid==='q5').left>firstLeft};

  /* 분류와 무관하게 서로 다른 두 만두를 함께 적용합니다 */
  reset();S.kit.have={d11:1,d15:1};
  eat('d11');eat('d15');
  out.sameSlot={dess:S.kit.dess.id,칸수:activeMeals().length,exp:mealOpt('exp')};
  S.kit.have.d6=1;
  eat('d6');out.third={left:S.kit.have.d6,unchanged:activeMeals().map(x=>x.meal.id),prompt:document.querySelector('#modalroot').innerText.includes('만두 효과 선택')};
  closeModal();out.cancelled=S.kit.have.d6;
  eat('d6','eat','d11');out.replaced={ids:activeMeals().map(x=>x.meal.id),qty:S.kit.have.d6};
  S.kit.have.d6=3;eat('d6');const extended=S.kit.eat.left;eat('d6');
  out.sameFood={left:extended,after:S.kit.eat.left,qty:S.kit.have.d6,exp:mealOpt('exp'),cap:DISHES.find(d=>d.id==='d6').dur*2};
  S.kit.eat.left=0;S.kit.have.d4=1;eat('d4');out.expired={ids:activeMeals().map(x=>x.meal.id),qty:S.kit.have.d4};
  S.kit.eat={id:'d15',left:100};S.kit.dess={id:'d15',left:200};out.legacyDuplicate={count:activeMeals().length,exp:mealOpt('exp')};
  return out;
 });

 await browser.close();server.close();
 assert.deepEqual(pageErrors,[],'콘솔 오류 없이 돌아야 합니다');

 assert.ok(r.decoctionPlusPotion.both>r.decoctionPlusPotion.one,
   `탕약과 물약은 효과가 더해져야 합니다 (${r.decoctionPlusPotion.one} → ${r.decoctionPlusPotion.both})`);
 assert.equal(r.expStack.sum,r.expStack.expected,
   '식사·디저트·버프·물약의 경험치 효과가 모두 더해져야 합니다');

 assert.ok(r.shown.식사,'식사 칸이 상단 띠에 보여야 합니다 — 안 보이면 겹치지 않는 것처럼 느껴집니다');
 assert.ok(r.shown.디저트,'디저트 칸이 상단 띠에 보여야 합니다');
 assert.ok(r.shown.버프,'탕약·식사 버프가 상단 띠에 보여야 합니다');
 assert.ok(r.shown.물약,'물약이 상단 띠에 보여야 합니다');
 assert.equal(r.shown.띠항목수,4,'네 가지가 모두 띠에 올라야 합니다');

 assert.equal(r.sameTwice.first,r.sameTwice.second,'같은 물약을 두 번 마셔도 효과는 겹치지 않습니다');
 assert.ok(r.sameTwice.leftGrew,'대신 남은 시간이 늘어나야 합니다');

 assert.equal(r.sameSlot.dess,'d15');
 assert.equal(r.sameSlot.칸수,2,'같은 디저트 분류도 다른 만두 2종은 함께 적용됩니다');
 assert.equal(r.sameSlot.exp,.19);
 assert.equal(r.third.left,1,'세 번째 종류는 선택 전 소모하지 않습니다');
 assert.deepEqual(r.third.unchanged,['d11','d15']);assert.equal(r.third.prompt,true);assert.equal(r.cancelled,1);
 assert.deepEqual(r.replaced.ids,['d6','d15']);assert.equal(r.replaced.qty,0,'선택한 효과만 교체합니다');
 assert.equal(r.sameFood.left,r.sameFood.cap);assert.equal(r.sameFood.after,r.sameFood.cap);assert.equal(r.sameFood.qty,2,'최대 시간에는 추가 소모하지 않습니다');
 assert.equal(+r.sameFood.exp.toFixed(4),.19,'같은 만두를 반복해도 효과는 한 번만 적용됩니다');
 assert.deepEqual(r.expired.ids,['d4','d15']);assert.equal(r.expired.qty,0);
 assert.equal(r.legacyDuplicate.count,1);assert.equal(r.legacyDuplicate.exp,.13,'중복된 옛 저장 칸도 효과를 두 번 세지 않습니다');

 console.log('PASS: 탕약+물약 합산, 식사·디저트·버프·물약 경험치 합산, 네 가지 모두 상단 띠 표시, 같은 물약은 시간 연장, 다른 만두 2종 합산, 세 번째 선택/취소, 선택 교체, 같은 만두는 시간만 연장, 최대 시간 미소모, 만료 칸 재사용과 중복 저장 방지');
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
