/* 無明長夜 · 성장 단계와 어획물 시각화. 게임 판정과 보상은 기존 함수가 담당합니다. */
(function () {
 'use strict';
 const base='assets/pixel-life/';
 function sprite(sheet,index,cols,rows,label,extra='') {
  const x=cols===1?0:(index%cols)/(cols-1)*100;
  const y=rows===1?0:Math.floor(index/cols)/(rows-1)*100;
  return `<span class="life-sprite ${extra}" role="img" aria-label="${esc(label)}" style="background-image:url('${base+sheet}.png?v=20261104-simple2');background-size:${cols*100}% ${rows*100}%;background-position:${x}% ${y}%"></span>`;
 }
 function plant(c,extra='') {
  const n=Number(c.id.slice(1));
  return n<=16?sprite('crops-normal',n-1,4,4,c.n,extra):n<=28?sprite('crops-rare',n-17,4,3,c.n,extra):sprite('crops-mythic',n-29,4,3,c.n,extra);
 }
 function fish(f,extra='') {return sprite('fish',FISHES.indexOf(f),6,3,f.n,extra);}
 function growth(n,label,extra='') {return sprite('growth',n,4,2,label,extra);}
 // Existing seed shops, catalogs, inventory and catch results use the same species data.
 CROPS.forEach(c=>{c.e=plant(c);});
 FISHES.forEach(f=>{f.e=fish(f);});
 function phase(p,c) {
  if(!p)return {key:'empty',name:'빈 땅',tile:0,percent:0};
  if(p.left<=0)return {key:'ready',name:'수확 가능',tile:0,percent:100};
  const total=Math.max(1,Number(p.total)||Number(c?.t)||1);
  const percent=Math.max(0,Math.min(99,Math.round((1-p.left/total)*100)));
  if(percent<20)return {key:'seed',name:'씨앗을 심었어요',tile:1,percent};
  if(percent<65)return {key:'sprout',name:'새싹이 났어요',tile:2,percent};
  return {key:'growing',name:'무럭무럭 자라요',tile:3,percent};
 }
 const originalFarm=VIEWS.farm;
 VIEWS.farm=function () {
  const container=document.createElement('div');container.innerHTML=originalFarm.apply(this,arguments);
  container.querySelectorAll('.farm-plot').forEach((el,i)=>{
   const p=S.farm.plots[i],c=p&&FARM_CROP_BY_ID[p.id],ph=phase(p,c);
   el.classList.add('life-plot','life-'+ph.key);
   el.dataset.phase=ph.key;el.dataset.progress=String(ph.percent);
   el.style.removeProperty('min-height');
   const flags=(p?.watered?`<span class="life-care" title="물 주기 완료">${growth(4,'물 주기 완료')}<span>물 줌</span></span>`:'')+(p?.fert?`<span class="life-care" title="비료 사용 완료">${growth(6,'비료 사용 완료')}<span>비료</span></span>`:'');
   const picture=`<div class="life-plot-picture" aria-label="${esc((c?c.n+' · ':'')+ph.name)}">${growth(ph.tile,ph.name,'life-soil')}${ph.key==='ready'?plant(c,'life-grown')+growth(5,'수확할 수 있어요','life-ready-glint'):''}<div class="life-care-flags">${flags}</div></div>`;
   const badge=`<div class="life-phase"><span>${String(i+1).padStart(2,'0')}</span><b>${ph.name}</b>${p?`<span>${ph.percent}%</span>`:''}</div>`;
   if(!p){
    const button=el.querySelector('button');const buttonHTML=button?button.outerHTML:'';
    el.innerHTML=badge+picture+`<div class="tiny muted life-empty-label">씨앗을 심어 보세요</div>`+buttonHTML;
   }else{
    const name=el.querySelector('.farm-species');
    if(name?.previousElementSibling)name.previousElementSibling.outerHTML=picture;
    el.insertAdjacentHTML('afterbegin',badge);
   }
  });
  const grid=container.querySelector('.life-plot')?.parentElement;
  if(grid){
   grid.classList.add('life-farm-grid');
   grid.insertAdjacentHTML('beforebegin','<div class="life-growth-key tiny muted">씨앗 → 새싹 → 성장 중 → 수확 가능 · 실제 남은 시간에 따라 모습이 바뀝니다.</div>');
  }
  return container.innerHTML;
 };
 function fishingScene() {
  const running=FISHGAME?.state==='run';
  return `<div id="life-fishing" class="life-fishing ${running?'is-running':''}" role="group" aria-label="검은 바다 낚시 풍경">
   <div class="life-water-shade"></div>
   <div class="life-swimmer life-swimmer-a" aria-hidden="true">${fish(FISHES[0])}</div>
   <div class="life-swimmer life-swimmer-b" aria-hidden="true">${fish(FISHES[8])}</div>
   <div class="life-ripple" aria-hidden="true"></div>
   <div class="life-float" id="life-float" style="left:8%" aria-hidden="true"><i></i></div>
   <div class="life-catch-display" id="life-catch-display"></div>
   <div class="life-fishing-caption" id="life-fishing-caption" role="status">${running?'찌가 움직입니다 · 금빛 구간에서 챈다!':'검은 바다에 낚싯대를 던져 보세요'}</div>
  </div>`;
 }
 const originalDraw=drawFish2;
 drawFish2=function () {
  originalDraw.apply(this,arguments);
  const gauge=document.getElementById('fbar')?.parentElement;
  if(gauge){gauge.classList.add('life-fishing-gauge');gauge.insertAdjacentHTML('beforebegin',fishingScene());}
 };
 const originalFrame=fishFrame;
 fishFrame=function () {
  originalFrame.apply(this,arguments);
  const el=document.getElementById('life-float');
  if(el&&FISHGAME?.state==='run')el.style.left=(8+FISHGAME.bar*.84)+'%';
 };
 const originalHook=fishHook;
 fishHook=function () {
  const running=FISHGAME?.state==='run';
  const before={...(S.fish?.catches||{})};
  const result=originalHook.apply(this,arguments);
  if(!running)return result;
  const caught=FISHES.find(f=>(S.fish.catches[f.n]||0)>(before[f.n]||0));
  const stage=document.getElementById('life-fishing');
  const display=document.getElementById('life-catch-display');
  const caption=document.getElementById('life-fishing-caption');
  if(stage&&display&&caption){
   stage.classList.add(caught?'is-caught':'is-missed');
   if(caught){
    display.innerHTML=fish(caught,'life-caught-fish')+growth(5,'어획 성공','life-catch-glint');
    caption.textContent=caught.n+' · 어획 성공!';
   }else caption.textContent='빈 바늘이에요 · 금빛 구간에서 다시 챔질해 보세요';
  }
  return result;
 };
 // Festival games retain their original hit areas, scoring and risk calculations.
 function festival(index,label,extra=''){return sprite('festival',index,4,2,label,extra);}
 const originalScoopDraw=drawFish;
 drawFish=function () {
  originalScoopDraw.apply(this,arguments);
  const first=document.querySelector('#modalroot .fish');
  if(!first)return;
  const pond=first.parentElement;pond.classList.add('life-scoop-pond');
  pond.querySelectorAll('.fish').forEach(el=>{el.innerHTML=festival(0,'축제 금붕어');el.setAttribute('aria-hidden','true');});
  pond.insertAdjacentHTML('beforeend',festival(BG.broke?2:1,BG.broke?'찢어진 뜰채':'온전한 뜰채','life-scoop-net')+`<span class="life-scoop-caption">${BG.broke?'뜰채가 찢어졌어요':BG.done?'이번 판 종료':'달빛 아래 금붕어를 건져 보세요'}</span>`);
  if(BG.tries>0&&!BG.broke)pond.classList.add('life-scoop-splash');
  if(BG.done&&!BG.broke&&BG.mine>=BG.foe)pond.insertAdjacentHTML('beforeend',festival(5,'금붕어 건지기 승리','life-festival-stars'));
 };
 const originalShootDraw=drawShoot;
 drawShoot=function () {
  originalShootDraw.apply(this,arguments);
  const target=document.getElementById('tgt');
  if(!target)return;
  target.classList.add('life-target');
  target.insertAdjacentHTML('beforeend',festival(4,'연등','life-target-lantern life-lantern-left')+festival(4,'연등','life-target-lantern life-lantern-right'));
  target.querySelectorAll('.shot').forEach(el=>el.classList.add('life-pixel-shot'));
  if(BG.over&&BG.me>=BG.foe)target.insertAdjacentHTML('afterend',`<div class="life-festival-win">${festival(5,'승리의 별')}<span>${BG.me>BG.foe?'승리!':'공동 승리!'}</span></div>`);
 };
 const originalShoot=shootAt;
 shootAt=function () {
  const active=BG&&!BG.over&&BG.left>0,before=BG?.me||0;
  const result=originalShoot.apply(this,arguments);
  const target=document.getElementById('tgt');
  if(active&&target){
   target.insertAdjacentHTML('beforeend',`<div class="life-hit-feedback ${BG.me>before?'is-hit':''}" role="status">${BG.me>before?'명중!':'빗나갔어요'}</div>`);
  }
  return result;
 };
})();
