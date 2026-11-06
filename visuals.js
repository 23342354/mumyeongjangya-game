"use strict";

;
/* ===== module: pixel-scenes.js ===== */
/* 無明長夜 · 도트 풍경. 화면 출력만 확장하며 계정/재화/저장은 변경하지 않습니다. */
(function () {
  'use strict';
  const root = 'assets/pixel-scenes/';
  const scenes = {
    shop: {file:'yowa-shop', title:'여와의 작은 매점', desc:'등불 아래, 오늘의 모험을 위한 작은 준비.', alt:'약병과 부적, 월병과 보급 상자가 놓인 여와의 매점 도트 풍경'},
    fishv: {file:'harbor', title:'제7구역 · 검은 바다', desc:'홍등이 비치는 부두, 물결 아래의 기척.', alt:'검은 바다에 홍등과 어선의 불빛이 비치는 도트 낚시 부두'},
    farm: {file:'garden', title:'약초 온실 뒤뜰', desc:'달빛 아래, 작은 씨앗이 자라는 곳.', alt:'온실과 약초, 아홉 개의 밭이 있는 달빛 정원 도트 풍경'},
    kitchen: {file:'kitchen', title:'삼장 선생님의 만두 주방', desc:'따뜻한 김 사이로 오늘의 한 끼를 빚습니다.', alt:'대나무 찜기와 만두, 조리대와 화로가 있는 따뜻한 도트 주방'}
  };
  function status(key) {
    if (key === 'shop') return '륜 ' + nf(S.rin) + ' · 연등 ' + S.lotus;
    if (key === 'fishv') return '낚시 숙련도 Lv ' + S.fish.skill;
    if (key === 'farm') return '수확 가능 ' + S.farm.plots.filter(p => p && p.left <= 0).length + ' / 9칸';
    return '보유 만두 ' + Object.values(S.kit.have || {}).reduce((a,b) => a + (Number(b)||0),0) + '개';
  }
  function figure(key) {
    const c=scenes[key];
    return `<figure class="pixel-landscape"><img src="${root+c.file}.png?v=20261104-simple2" alt="${c.alt}" width="1536" height="1024" decoding="async"><figcaption><div><span class="pixel-location">${c.title}</span><span class="pixel-description">${c.desc}</span></div><span class="pixel-status">${esc(status(key))}</span></figcaption></figure>`;
  }
  // Wrap the final versions of each view, after the existing extensions have loaded.
  Object.keys(scenes).forEach(key => {
    const original=VIEWS[key];
    if (typeof original !== 'function') return;
    VIEWS[key]=function () {
      const html=original.apply(this,arguments);
      // Insert after the complete page header, keeping every existing control intact.
      const template=document.createElement('div');
      template.innerHTML=html;
      const header=template.querySelector('.page-head');
      if (header) {
        header.insertAdjacentHTML('afterend',figure(key));
      }
      return template.innerHTML;
    };
  });
  // Decorative weather stays inside the artwork, below the existing controls.
  function plazaWeather(){
    const kind=['rain','fog','redmoon','ash','neon','calm'][S.weather]||'calm';
    const count={rain:28,fog:3,redmoon:0,ash:18,neon:10,calm:8}[kind];
    const clock=Date.now()/1000;
    const particles=Array.from({length:count},(_,i)=>{
      const duration=kind==='rain'?0.7+(i%5)*0.12:kind==='fog'?24+i*6:kind==='neon'?5+i%4:10+i%7;
      const delay=-((clock+i*1.73)%duration);
      return `<i style="--x:${(i*37+7)%100}%;--y:${(i*23+13)%100}%;--duration:${duration}s;--delay:${delay.toFixed(3)}s"></i>`;
    }).join('');
    return `<div class="plaza-weather plaza-weather-${kind}" style="--phase:-${(clock%12).toFixed(3)}s" aria-hidden="true">${particles}</div>`;
  }
  // The plaza already contains a weather/time overlay and map link: retain them.
  const originalScene=sceneSVG;
  sceneSVG=function () {
    return `<div class="pixel-plaza-art" role="img" aria-label="연등과 달빛이 밝히는 사무전 광장"><img src="${root}plaza.png?v=20261104-simple2" alt="" width="1536" height="1024" decoding="async" onerror="this.style.display='none'">${originalScene()}${plazaWeather()}</div>`;
  };
})();


;
/* ===== module: pixel-life.js ===== */
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
 // Keep presentation on the current cast so redraws cannot erase a catch.
 window.showFishingCatch=function(caught,{pending=false,missed=false,eventId=''}={}) {
  if(FISHGAME)FISHGAME.catchVisual={name:caught?.n||'',pending,missed,eventId};
  const stage=document.getElementById('life-fishing');
  const display=document.getElementById('life-catch-display');
  const caption=document.getElementById('life-fishing-caption');
  if(!stage||!display||!caption)return;
  stage.classList.remove('is-running','is-caught','is-missed');
  stage.classList.add(caught?'is-caught':'is-missed');
  display.innerHTML=caught?fish(caught,'life-caught-fish')+growth(5,'어획 성공','life-catch-glint'):'';
  caption.textContent=caught?caught.n+' · 어획 성공!'+(pending?' · 보상 저장 대기':''):'빈 바늘이에요 · 금빛 구간에서 다시 챔질해 보세요';
 };
 const originalDraw=drawFish2;
 drawFish2=function () {
  if(FISHGAME?.state==='run')delete FISHGAME.catchVisual;
  originalDraw.apply(this,arguments);
  const gauge=document.getElementById('fbar')?.parentElement;
  if(gauge){gauge.classList.add('life-fishing-gauge');gauge.insertAdjacentHTML('beforebegin',fishingScene());}
  const shown=FISHGAME?.catchVisual;
  if(shown)showFishingCatch(FISHES.find(f=>f.n===shown.name),shown);
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
  showFishingCatch(caught,{missed:!caught});
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


;
/* ===== module: balance20.js ===== */
/* 無明長夜 · 20인/14일 생활형 시즌 밸런스. 기존 계정·소지품 보존. */
(function(){
'use strict';
window.BALANCE20={version:1,players:20,days:14,fishDaily:60,castSeconds:10,bossGoal:250000000,bossStretchGoal:1000000000};
const B=window.BALANCE20;
COURSES.forEach((c,i)=>c.need=[3,5,7,9,12,15,18][i]);
subjectLessonCount=lv=>lv<5?1:lv<12?2:3;
subjectLessonMinutes=d=>d.lv===0?10:20;
const researchCaps={r1:20,r3:20,r4:25,r5:25,r6:20,r7:20,r8:20,r9:16,r10:12,r13:20};
RESEARCH.forEach(r=>{if(researchCaps[r.id])r.max=researchCaps[r.id];});
RESEARCH.find(r=>r.id==='r2').d='파장 한도 +4시간분';RESEARCH.find(r=>r.id==='r2').e='단계마다 파장 저장 한도 +4시간분';
const baseMod=mod;
const CAPS={gold:1,exp:1,know:1,study:1,mana:2,loot:.65,atkP:2,defP:1.2,hpP:2,spd:1.2,heal:1.5,rest:2.5,boss:1.5};
mod=function(key){const v=baseMod(key);return Object.hasOwn(CAPS,key)?clamp(v,0,CAPS[key]):v;};
// District identity remains, while compounding income differences are bounded.
const mult={dorm:1,w1:1.8,w2:1.6,w3:1.5,w4:1.4,w5:1.3,w6:1.2,w7:1};
for(const id of Object.keys(HALLMULT)){
 const old=HALLMULT[id];HALLMULT[id]=mult[id];
 for(const key of Object.keys(HALLMAX[id]))if(key!=='fee')HALLMAX[id][key]=HALLMAX[id][key]/old*mult[id];
}
Object.assign(RENT,{dorm:0,w1:12000,w2:9000,w3:7000,w4:5000,w5:3500,w6:2000,w7:1000});
HOMECOST.forEach((c,i)=>c.rin=[5000,14000,32000,65000,120000][i]);
DORMCOST.forEach((c,i)=>c.rin=[3000,9000,24000,50000][i]);
MART.find(m=>m.id==='m1').cost.rin=6000;
MART.find(m=>m.id==='m2').cost.rin=18000;
MART.find(m=>m.id==='m4').cost.rin=9000;MART.find(m=>m.id==='m4').d='현재 레벨에 장착 가능한 고급 이상 법구 1개';
MART.find(m=>m.id==='m6').give.rin=12000;MART.find(m=>m.id==='m6').d='연등 10개를 륜 1.2만으로 (획득 보너스 미적용)';
farmCrossChance=c=>({rare:.28,epic:.18,legend:.12}[c.tier]||0);
farmMutationChance=c=>({rare:.22,epic:.14,legend:.10}[c.tier]||0);
function dailyKey(){return Math.floor((Date.now()+9*3600000)/86400000);}
function weekInfo(){const d=new Date(Date.now()+9*3600000);const day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day);d.setUTCHours(0,0,0,0);return {key:d.toISOString().slice(0,10),start:d.getTime()-9*3600000};}
window.balanceEnsure=function(){
 if(!S?.made)return;
 if(!S.wb||!S.fish)ensureV2();
 if(!S.balance20)S.balance20={version:0,day:dailyKey(),fish:0,lastCast:0,bossClaims:[]};
 const b=S.balance20;
 if(b.day!==dailyKey()){b.day=dailyKey();b.fish=0;}
 if(!Array.isArray(b.bossClaims))b.bossClaims=[];
 if(!Array.isArray(b.pendingLoot))b.pendingLoot=[];
 if(b.version<1){
  if(S.lesson){const total=subjectLessonMinutes(S.sub[S.lesson.plan[S.lesson.idx]]);if(S.lesson.total>total){S.lesson.left=Math.max(0,S.lesson.left/S.lesson.total*total);S.lesson.total=total;}}
  b.version=1;
 }
 const w=weekInfo();
 if(!b.martWeek||b.martWeek.key!==w.key)b.martWeek={key:w.key,count:b.martWeek?0:Number(S.mart?.m8)||0};
 if(!S.mart)S.mart={};S.mart.m8=b.martWeek.count;
 if(S.examHist?.[7])S.graduated=true;
 S.wb.total=S.wb.dmg||0;
 if(!S.wb.balanceWeek){S.wb.balanceWeek=w.key;}
 else if(S.wb.balanceWeek!==w.key){S.wb.dmg=0;S.wb.balanceWeek=w.key;}
 return b;
};
const oldBoot=boot;boot=function(){balanceEnsure();oldBoot.apply(this,arguments);};
const oldStep=step;
step=function(minutes){
 balanceEnsure();
 const pass=S.pass,passLeft=S.passNext,tickets=S.wb.tickets,ticketLeft=S.wb.next;
 oldStep.apply(this,arguments);
 function charge(count,left,period){const elapsed=Math.max(0,Number(minutes)||0);const due=left-elapsed;if(due>0)return {count,left:due};return {count:Math.max(count,Math.min(3,count+1+Math.floor(-due/period))),left:period-((-due)%period)};}
 const p=charge(pass,passLeft,720),t=charge(tickets,ticketLeft,300);
 S.pass=p.count;S.passNext=p.left;S.wb.tickets=t.count;S.wb.next=t.left;
 // Old random background boss progress did not represent actual participants.
 S.wb.total=S.wb.dmg;
};
window.balanceLessonQueue=function(hours){
 balanceEnsure();if(S.lesson){toast('진행 중인 수업을 마친 뒤 자동 시간표를 시작해 주세요.');return;}
 if(S.examHist[7]){toast('모든 과정을 수료했습니다. 원하는 과목을 자유롭게 골라 주세요.');return;}
 const c=COURSES[S.course-1],subjects=JSON.parse(JSON.stringify(S.sub)),list=[];let minutes=0;
 const limit=hours===8?480:240;
 while(list.length<48){
  const pending=c.subs.filter(id=>subjects[id].lv<c.need+(S.course===7&&id===c.subs[0]?1:0));
  if(!pending.length)break;
  pending.sort((a,b)=>subjects[a].lv-subjects[b].lv);
  const id=pending[0],time=subjectLessonMinutes(subjects[id]);if(minutes+time>limit)break;
  list.push(id);minutes+=time;subjects[id]=subjectNext(subjects[id]);
 }
 if(!list.length){toast('시험 준비를 마쳤습니다. 시험장에서 응시해 주세요.');return;}
 const first=subjectLessonMinutes(S.sub[list[0]]);S.lesson={plan:list,idx:0,left:first,total:first,planIdx:-2};
 toast(`${hhmm(minutes)} 자동 시간표를 시작했습니다. 자리를 비워도 진행됩니다.`,'good');save();renderMain();renderTop();
};
const oldExam=takeExam;
takeExam=function(){
 if(S.examHist[S.course]){toast('이미 합격한 과정입니다. 성적표에서 확인해 주세요.','bad');return;}
 const course=S.course;oldExam.apply(this,arguments);
 if(S.examHist[course]){
  if(S.examHist[course].g==='S'){const it=mkGear(S.lvl,4);balanceStoreLoot(it,true);}
  if(course===7){S.graduated=true;toast('일곱 과정을 모두 수료했습니다. 졸업 후에도 의뢰·도감·교류를 계속 즐길 수 있습니다.','good');}
  save();
 }
};
window.examOpponent=function(){const c=S.course;return mkFighter('과정 평가용 파장체',{atk:c+1,def:Math.ceil(c*1.3),agi:Math.ceil(c*1.3),men:c,res:c},[60,170,300,400,600,850,1100][c-1],'var(--red)');};
const oldFishCast=fishCast;
fishCast=function(){
 const b=balanceEnsure();if(!b)return;
 const left=B.castSeconds*1000-(Date.now()-b.lastCast);
 if(left>0){toast(`${Math.ceil(left/1000)}초 뒤에 다시 던질 수 있습니다.`);return;}
 const was=FISHGAME?.state;oldFishCast.apply(this,arguments);
 if(was!=='run'&&FISHGAME?.state==='run'){b.lastCast=Date.now();save();}
};
const oldFishHook=fishHook;
fishHook=function(){
 const b=balanceEnsure();if(!b||FISHGAME?.state!=='run')return;
 if(b.fish>=B.fishDaily){
  const F=FISHGAME,hit=fishBarAt(F,performance.now())>=F.target&&fishBarAt(F,performance.now())<=F.target+16;
  F.state='idle';if(F.frame)cancelAnimationFrame(F.frame);drawFish2();
  document.getElementById('fres').innerHTML=`<div class="sub tiny">연습 ${hit?'성공':'종료'} · 오늘 어획 보상 ${B.fishDaily}회를 모두 받았습니다. 내일 다시 보상을 받을 수 있습니다.</div>`;return;
 }
 const before=Object.values(S.fish.catches).reduce((a,v)=>a+(Number(v)||0),0);
 oldFishHook.apply(this,arguments);
 const after=Object.values(S.fish.catches).reduce((a,v)=>a+(Number(v)||0),0);
 if(after>before){b.fish++;save();}
 const label=document.getElementById('balance-fish-count');if(label)label.textContent=`오늘 어획 보상 ${b.fish}/${B.fishDaily} · 이후 보상 없는 연습`;
};
const oldDrawFish=drawFish2;
drawFish2=function(){oldDrawFish.apply(this,arguments);const b=balanceEnsure();document.querySelector('#modalroot .mbody')?.insertAdjacentHTML('beforeend',`<div class="tiny muted" id="balance-fish-count" style="margin-top:10px">오늘 어획 보상 ${b.fish}/${B.fishDaily} · 던지기 간격 ${B.castSeconds}초 · 초과 시 연습</div>`);};
// Dps defense already includes mod(defP) in effStat(def): do not multiply twice.
const oldC=C;C=function(){const c=oldC();c.def=Math.round(effStat('def')*98);return c;};
window.balanceStoreLoot=function(it,preserve=false){
 const cap=bagCapacity();
 if(S.bag.length<cap){S.bag.push(it);return true;}
 if(preserve){balanceEnsure().pendingLoot.push(it);toast('바랑이 가득 차 특별 법구 보상을 보관했습니다. 바랑에서 받을 수 있습니다.');return false;}
 const dust=2+Math.max(0,it.grade||0)*2;S.mat.가루+=dust;
 toast(`바랑이 가득 차 새 전리품을 부적 ${dust}개로 받았습니다. 기존 법구는 보존됩니다.`);return false;
};
window.balanceCollectLoot=function(){
 const b=balanceEnsure(),cap=bagCapacity();let count=0;
 while(b.pendingLoot.length&&S.bag.length<cap){S.bag.push(b.pendingLoot.shift());count++;}
 toast(count?`특별 보상 법구 ${count}개를 받았습니다.`:'바랑 공간을 먼저 비워 주세요.');save();renderMain();
};
const oldBag=VIEWS.bag;VIEWS.bag=function(){balanceEnsure();return (S.balance20.pendingLoot.length?`<div class="card pad" style="margin-bottom:12px"><b>보관 중인 특별 법구 ${S.balance20.pendingLoot.length}개</b><button class="btn" onclick="balanceCollectLoot()">바랑으로 받기</button></div>`:'')+oldBag.apply(this,arguments);};
window.balanceBossData=function(){
 balanceEnsure();const w=weekInfo(),mineId=S.sb?.id;
 const rows=(S.sb?.roster||[]).filter(r=>r.id!==mineId&&Date.parse(r.updated_at)>=w.start&&Number(r.wb_dmg)>0);
 rows.push({id:mineId,name:S.name,wb_dmg:S.wb.dmg||0});
 const uniq=new Map();for(const r of rows)uniq.set(r.id,r);
 const players=[...uniq.values()].filter(r=>Number(r.wb_dmg)>0).sort((a,b)=>b.wb_dmg-a.wb_dmg);
 return {players,total:players.reduce((n,r)=>n+Number(r.wb_dmg),0),week:w.key};
};
const oldExchange=exchangeMark;exchangeMark=function(n){if(n!==10&&n!==50)return;return oldExchange.apply(this,arguments);};
const oldMart=martBuy;
martBuy=function(id){
 const b=balanceEnsure(),m=MART.find(x=>x.id===id);if(!m)return;
 if(id==='m8'&&S.wb.tickets>=(window.PAIR_PLAY?.ready?6:3)){toast('도전권이 가득 찼습니다. 먼저 사용해 주세요.');return;}
 if(id==='m9'&&S.res.r11>=10){toast('바랑 확장을 모두 마쳤습니다.');return;}
 if(m.give.gear&&S.bag.length>=bagCapacity()){toast('바랑을 비운 뒤 구매해 주세요.');return;}
 oldMart.apply(this,arguments);
 if(id==='m8'){b.martWeek.count=S.mart.m8;save();}
};
const oldSync=syncUp;let recordPublish=Promise.resolve();
syncUp=function(force){recordPublish=recordPublish.catch(()=>{}).then(()=>oldSync(force));return recordPublish;};
const oldHit=hitBoss;
hitBoss=function(){balanceEnsure();if(S.wb.tickets<1){toast('도전권이 없습니다. 충전 후 다시 도전해 주세요.');return;}oldHit.apply(this,arguments);save();if(typeof syncUp==='function')syncUp(true);};
window.balanceClaimBoss=function(stretch=false){
 const b=balanceEnsure(),d=balanceBossData();
 const key=d.week+(stretch?':stretch':''),goal=stretch?B.bossStretchGoal:B.bossGoal,reward=stretch?10:20;
 if(!(S.wb.dmg>0)||d.total<goal||b.bossClaims.includes(key))return;
 b.bossClaims.push(key);b.bossClaims=b.bossClaims.slice(-16);S.lotus+=reward;
 toast(`주간 공동 목표 달성 · 참여 보상 연등 +${reward}`,'good');save();renderMain();
};
// 새로고침 시 쓰기 -> 읽기 순서를 보장하고, 각각의 실패 상태를 화면에 드러냅니다.
window.raidRefresh=function(){
 if(!sbOn()){toast('공유 기록 서버가 연결되지 않았습니다. 설정을 확인해 주세요.','bad');return Promise.resolve();}
 return Promise.resolve(syncUp(true)).then(()=>syncRoster(true));
};
function balanceBossWave(total,base=B.bossGoal){
 let damage=Math.max(0,Number(total)||0),maxHP=Math.max(1,Math.round(base)),wave=1;
 while(damage>=maxHP&&Number.isFinite(maxHP*1.5)){damage-=maxHP;maxHP=Math.ceil(maxHP*1.5);wave++;}
 return {wave,maxHP,remaining:Math.max(0,maxHP-damage),damage,defeated:wave-1};
}
VIEWS.wboss=function(){
 const d=balanceBossData(),b=S.balance20,c=C(),claimed=b.bossClaims.includes(d.week),stretchClaimed=b.bossClaims.includes(d.week+':stretch');
 const sb=S.sb||{},connected=sbOn(),fetchStatus=sb.raidFetchState||'idle';
 const wave=balanceBossWave(d.total),remaining=wave.remaining,health=Math.max(0,Math.min(100,remaining/wave.maxHP*100));
 const bossStatus=`${wave.wave}차 업귀 · 생존 · 공격 가능 · ${wave.defeated}체 처치`;
 const boss=WBOSS[Math.abs(Math.floor(Date.parse(d.week+'T00:00:00Z')/604800000)+wave.wave-1)%WBOSS.length];
 const hitPlayers=d.players.map((r,i)=>`<div class="spread tiny" style="padding:7px 0;${i?'border-top:1px solid var(--line)':''}"><span>${i+1}. ${esc(r.name||'이름 없음')}</span><b>${nf(r.wb_dmg)}</b></div>`).join('');
 let state='';
 if(!connected) state='<div class="tiny" style="color:var(--gold);margin-top:10px">공유 기록 서버가 연결되지 않았습니다. 현재는 내 공격 기록만 표시됩니다. 설정에서 공유 기록 연결을 확인해 주세요.</div>';
 else if(fetchStatus==='loading') state='<div class="tiny muted" style="margin-top:10px">다른 학생들의 기록을 서버에서 불러오는 중입니다…</div>';
 else if(fetchStatus==='error') state=`<div class="tiny" style="color:var(--red);margin-top:10px">공동 기록을 불러오지 못했습니다. 연결 상태와 Supabase 설정을 확인한 뒤 다시 새로 고쳐 주세요. ${esc(sb.raidFetchError||'')}</div>`;
 else if(fetchStatus==='idle'&&!sb.rosterAt) state='<div class="tiny muted" style="margin-top:10px">공동 기록을 아직 조회하지 않았습니다. 새로 고침을 눌러 실제 참여 기록을 확인해 주세요.</div>';
 else if(!d.players.length) state='<div class="tiny muted" style="margin-top:10px">이번 주에는 아직 공격 기록이 없습니다. 도전권을 사용해 업귀를 공격하면 첫 피해가 기록됩니다.</div>';
 const publishError=connected&&sb.raidPublishState==='error'
  ?`<div class="tiny" style="color:var(--red);margin-top:10px">내 공격 기록을 서버에 저장하지 못했습니다. 다른 학생에게 피해량이 표시되지 않을 수 있습니다. ${esc(sb.raidPublishError||'')}</div>`:'';
 return head('20인 공동 목표 · 매주 월요일 0시(KST) 갱신',ic('oni')+' 업귀 토벌',`실제 참여 ${d.players.length}명`)+
 `<div class="card pad" style="margin-bottom:12px"><div class="row" style="align-items:center;gap:14px"><div style="font-size:34px;line-height:1">${boss.e}</div><div style="flex:1;min-width:0"><div class="tiny" style="color:var(--gold)">이번 주 ${wave.wave}차 업귀 · Ⅴ등급 재해</div><div style="font-weight:700;margin:3px 0">${esc(boss.n)}</div><div class="tiny muted">${esc(boss.d)}</div><div class="tag j" style="margin-top:8px">${bossStatus}</div></div></div></div>`+
 `<div class="card pad"><div class="sect-t">이번 주 공동 토벌</div><div class="tiny muted">실제 공격 피해만 합산됩니다. 내 피해는 즉시 표시되며, 다른 학생 기록은 서버 조회 후 반영됩니다.</div><div class="bar hp" role="progressbar" aria-label="업귀 남은 체력" aria-valuemin="0" aria-valuemax="${wave.maxHP}" aria-valuenow="${remaining}" style="margin:12px 0"><i style="width:${health}%"></i></div><div class="spread tiny"><span>남은 체력 ${nf(remaining)} / ${nf(wave.maxHP)}</span><span>내 피해 ${nf(S.wb.dmg)}</span></div><div class="tiny muted" style="margin-top:5px">공동 누적 피해 ${nf(d.total)} · ${wave.defeated}체 처치 · 현재 적에게 입힌 피해 ${nf(wave.damage)}. 전부 처치하면 다음 업귀가 즉시 등장하며, 체력이 매번 1.5배로 증가합니다. 초과 피해도 다음 적에게 이어집니다.</div>${state}${publishError}<div class="row" style="margin-top:12px"><button class="btn pri" ${S.wb.tickets<1?'disabled':''} onclick="hitBoss()">도전권 ${S.wb.tickets}/${window.PAIR_PLAY?.ready?6:3} · 공격</button><button class="btn" onclick="raidRefresh()">기록 새로 고침</button><button class="btn" ${claimed||d.total<B.bossGoal||!S.wb.dmg?'disabled':''} onclick="balanceClaimBoss()">${claimed?'보상 수령 완료':'공동 달성 연등 20 받기'}</button><button class="btn" ${stretchClaimed||d.total<B.bossStretchGoal||!S.wb.dmg?'disabled':''} onclick="balanceClaimBoss(true)">${stretchClaimed?'추가 목표 수령 완료':'추가 목표 연등 10 받기'}</button></div><div class="tiny muted" style="margin-top:10px">도전권 5시간마다 충전 · ${window.PAIR_PLAY?.ready?'페어 최대 6장':'최대 3장'} · 예상 피해 ${nf(Math.round((typeof pairSoulDamage==='function'?pairSoulDamage(c,30):c.dps*30)*(1+mod('boss'))))}. 추가 공동 목표 ${nf(B.bossStretchGoal)} 피해 달성 시 연등 10을 더 받을 수 있습니다. 주간 기록은 실제 피해량만 계산하며 운영 서버의 최종 집계와 차이가 생길 수 있습니다.</div></div>`+
 `<div class="card pad" style="margin-top:12px"><div class="sect-t">실제 참여 기록</div>${hitPlayers||(!connected?'공유 서버가 연결되면 다른 참가자가 표시됩니다.':fetchStatus==='loading'?'서버 기록을 확인하는 중입니다…':fetchStatus==='error'?'서버 기록 조회에 실패했습니다. 위 오류를 확인해 주세요.':'이번 주 첫 공격을 기다리고 있습니다.')}</div>`;
};
for(const key of ['class','exam','research','fishv','hallv']){
 const original=VIEWS[key];if(!original)continue;
 VIEWS[key]=function(){balanceEnsure();let html=original.apply(this,arguments);
  if(key==='class')html=`<div class="card pad" style="margin-bottom:12px"><b>시험 준비 자동 시간표</b><div class="tiny muted" style="margin:6px 0">부족한 시험 과목을 골고루 듣고 준비가 끝나면 멈춥니다. 수업 속도·보상은 직접 선택과 같습니다.</div><div class="row"><button class="btn" onclick="balanceLessonQueue(4)">최대 4시간</button><button class="btn" onclick="balanceLessonQueue(8)">최대 8시간</button></div></div>`+html;
  if(key==='class')html=html.replace('0→1레벨은 15분 수업 1교시','0→1레벨은 10분 수업 1교시').replace('이후에는 1시간 수업을 2·3·4…교시씩 들어야 레벨이 오릅니다.','이후에는 20분 수업을 레벨에 따라 1~3교시 들으면 레벨이 오릅니다.');
  if(key==='exam'&&S.examHist[7])html=`<div class="card pad" style="margin-bottom:12px"><b>전 과정 수료 완료</b><div class="tiny muted">시험 보상은 과정별 한 번만 지급됩니다. 의뢰·도감·교류는 계속할 수 있습니다.</div></div>`+html.replace('onclick="takeExam()"','disabled onclick="takeExam()"');
  if(key==='research')html='<div class="card pad tiny muted" style="margin-bottom:12px">14일 시즌 · 수업 10/20분, 과목 성장 1~3교시. 재화·경험치·지식·수업 보너스 최대 +100%, 전리품 추가 확률 최대 +65%입니다.</div>'+html;
  if(key==='fishv')html=`<div class="card pad tiny muted" style="margin-bottom:12px">오늘 어획 보상 ${S.balance20.fish}/${B.fishDaily}회 · 던지기 간격 ${B.castSeconds}초 · 초과 시 보상 없는 연습으로 계속할 수 있습니다.</div>`+html;
  return html;
 };
}
})();


/* 거처 그림 — 현재 거주 구역 안에서 표시 단계만 선택합니다. */
function homeSceneKey(){
 let actor='local';try{actor=(typeof ACCT!=='undefined'&&ACCT?.id)||S?.sb?.id||'local';}catch(_){}
 return 'mmjy:home-scene:'+actor+':'+homeSceneHall();
}
function homeSceneHall(){return HALLS.some(h=>h.id===S.hall)?S.hall:'dorm';}
function homeSceneStage(){
 const hall=homeSceneHall(),max=homeMax(hall);
 let choice=null;try{choice=localStorage.getItem(homeSceneKey());}catch(_){}
 return choice!==null&&/^[0-5]$/.test(choice)&&Number(choice)<=max ? Number(choice) : null;
}
function setHomeSceneStage(value){
 const max=homeMax(homeSceneHall());
 if(value!=='auto'&&(!/^[0-5]$/.test(String(value))||Number(value)>max))return;
 try{if(value==='auto')localStorage.removeItem(homeSceneKey());else localStorage.setItem(homeSceneKey(),String(value));}catch(_){toast('그림 선택을 저장하지 못했습니다. 브라우저 저장 설정을 확인해 주세요.','bad');return;}
 const old=document.querySelector('.home-scene-card');
 if(old)old.outerHTML=homeSceneHTML();
 const select=document.querySelector('#home-scene-stage');if(select)select.focus();
}
function homeSceneTokensHTML(){
 const pair=typeof pairEnsure==='function'?pairEnsure().mine:null;
 const header=typeof pairHeadState==='function'?pairHeadState():null;
 if(!pair||!header||String(header.forId)!==String(pair.id))return '';
 return [0,1].map(i=>{const src=pairHeadImage(header.tokens?.[i]);return src?`<span class="home-roamer home-roamer-${i}" aria-hidden="true"><img src="${src}" alt="" draggable="false"></span>`:'';}).join('');
}
function homeSceneHTML(){
 const hall=homeSceneHall(),h=homeOf(hall),choice=homeSceneStage();
 const actual=clamp(Number(homeS().stage)||0,0,homeMax(hall)),stage=choice===null?actual:choice;
 const names=['기본 공간',...homePlan(hall).map(s=>s.n)];
 return `<section class="card home-scene-card" aria-label="거처 이미지">
  <div class="home-scene-heading"><div><b>${esc(h.n)} · ${stage}단계</b><div class="tiny muted">${esc(names[stage])}${choice===null?' · 현재 단계에 맞춤':' · 선택한 그림'}</div></div>
   <label class="home-scene-control" for="home-scene-stage"><span class="tiny">표시할 단계</span><select class="inp" id="home-scene-stage" onchange="setHomeSceneStage(this.value)"><option value="auto" ${choice===null?'selected':''}>현재 단계에 맞춤</option>${names.map((n,i)=>`<option value="${i}" ${choice===i?'selected':''}>${i}단계 · ${esc(n)}</option>`).join('')}</select></label></div>
  <div class="home-scene-art"><div class="home-scene-viewport"><img class="home-scene-background" data-scene="${hall}-${stage}" src="assets/housing/${hall}-${stage}.webp" width="660" height="310" alt="${esc(h.n)} ${stage}단계 · ${esc(names[stage])} 도트 이미지" decoding="async">${homeSceneTokensHTML()}</div></div>
  <p class="tiny muted home-scene-note">살고 있는 구역의 그림만 선택할 수 있습니다. 그림을 바꿔도 실제 거처 단계와 혜택은 그대로입니다.</p>
 </section>`;
}

/* 각 토큰이 매번 새 목적지·속도·휴식 시간을 고릅니다. */
const HOME_ROAMERS=new WeakMap();
const HOME_ROAM_MOTION=matchMedia('(prefers-reduced-motion: reduce)');
function homeRoamStop(el){const state=HOME_ROAMERS.get(el);HOME_ROAMERS.delete(el);if(state)state.animation?.cancel();}
function homeRoamNext(el,state){
 if(!el.isConnected||HOME_ROAMERS.get(el)!==state||HOME_ROAM_MOTION.matches){homeRoamStop(el);return;}
 let target=3+Math.random()*75;
 if(Math.abs(target-state.x)<8)target=state.x<40?Math.min(78,state.x+12+Math.random()*25):Math.max(3,state.x-12-Math.random()*25);
 const pause=2500+Math.random()*4500;
 const speed=2.5+Math.random()*2.5;
 const travel=Math.max(3000,Math.abs(target-state.x)/speed*1000);
 const total=pause+travel;
 const anim=el.animate([{left:state.x+'%',offset:0},{left:state.x+'%',offset:pause/total,easing:'ease-in-out'},{left:target+'%',offset:1}],{duration:total,fill:'forwards'});
 state.animation=anim;
 if(document.hidden)anim.pause();
 anim.finished.then(()=>{if(HOME_ROAMERS.get(el)!==state)return;state.x=target;el.style.left=target+'%';anim.cancel();homeRoamNext(el,state);}).catch(()=>{});
}
function homeRoamStart(el){
 if(HOME_ROAMERS.has(el)||HOME_ROAM_MOTION.matches||!el.isConnected)return;
 const state={x:3+Math.random()*75,animation:null};el.style.left=state.x+'%';HOME_ROAMERS.set(el,state);homeRoamNext(el,state);
}
function homeRoamVisit(node,action){if(node.nodeType!==1)return;if(node.matches('.home-roamer'))action(node);node.querySelectorAll('.home-roamer').forEach(action);}
const HOME_ROAM_OBSERVER=new MutationObserver(changes=>{for(const change of changes){change.removedNodes.forEach(n=>homeRoamVisit(n,homeRoamStop));change.addedNodes.forEach(n=>homeRoamVisit(n,homeRoamStart));}});
HOME_ROAM_OBSERVER.observe(document.getElementById('main'),{childList:true,subtree:true});
HOME_ROAM_MOTION.addEventListener('change',()=>document.querySelectorAll('.home-roamer').forEach(el=>{homeRoamStop(el);if(!HOME_ROAM_MOTION.matches)homeRoamStart(el);}));
document.addEventListener('visibilitychange',()=>document.querySelectorAll('.home-roamer').forEach(el=>{const a=HOME_ROAMERS.get(el)?.animation;if(a){if(document.hidden)a.pause();else a.play();}}));
