/* 無明長夜 · 20인/14일 생활형 시즌 밸런스. 기존 계정·소지품 보존. */
(function(){
'use strict';
window.BALANCE20={version:1,players:20,days:14,fishDaily:60,castSeconds:10,bossGoal:2500000000,bossStretchGoal:15000000000};
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
 const cap=40+(S.res.r11||0)*5;
 if(S.bag.length<cap){S.bag.push(it);return true;}
 if(preserve){balanceEnsure().pendingLoot.push(it);toast('바랑이 가득 차 특별 법구 보상을 보관했습니다. 바랑에서 받을 수 있습니다.');return false;}
 const dust=2+Math.max(0,it.grade||0)*2;S.mat.가루+=dust;
 toast(`바랑이 가득 차 새 전리품을 부적가루 ${dust}개로 받았습니다. 기존 법구는 보존됩니다.`);return false;
};
window.balanceCollectLoot=function(){
 const b=balanceEnsure(),cap=40+(S.res.r11||0)*5;let count=0;
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
 if(id==='m8'&&S.wb.tickets>=3){toast('도전권이 가득 찼습니다. 먼저 사용해 주세요.');return;}
 if(id==='m9'&&S.res.r11>=10){toast('바랑 확장을 모두 마쳤습니다.');return;}
 if(m.give.gear&&S.bag.length>=40+(S.res.r11||0)*5){toast('바랑을 비운 뒤 구매해 주세요.');return;}
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
VIEWS.wboss=function(){
 const d=balanceBossData(),b=S.balance20,c=C(),claimed=b.bossClaims.includes(d.week),stretchClaimed=b.bossClaims.includes(d.week+':stretch');
 return head('20인 공동 목표 · 매주 월요일 0시 갱신',ic('oni')+' 업귀 토벌','실제 참여 '+d.players.length+'명')+`<div class="card pad"><div class="sect-t">이번 주 공동 토벌</div><div class="tiny muted">명부에 동기화된 이번 주 실제 피해량을 합산합니다. 개인 기록은 즉시 반영되고 다른 학생 기록은 새로 고침 시 반영됩니다.</div><div class="bar hp" style="margin:12px 0"><i style="width:${Math.min(100,d.total/B.bossGoal*100)}%"></i></div><div class="spread tiny"><span>${nf(d.total)} / ${nf(B.bossGoal)}</span><span>내 피해 ${nf(S.wb.dmg)}</span></div><div class="row" style="margin-top:12px"><button class="btn pri" ${S.wb.tickets<1?'disabled':''} onclick="hitBoss()">도전권 ${S.wb.tickets}/3 · 공격</button><button class="btn" onclick="syncUp(true).then(()=>syncRoster(true))">기록 새로 고침</button><button class="btn" ${claimed||d.total<B.bossGoal||!S.wb.dmg?'disabled':''} onclick="balanceClaimBoss()">${claimed?'보상 수령 완료':'공동 달성 연등 20 받기'}</button><button class="btn" ${stretchClaimed||d.total<B.bossStretchGoal||!S.wb.dmg?'disabled':''} onclick="balanceClaimBoss(true)">${stretchClaimed?'추가 목표 수령 완료':'추가 목표 연등 10 받기'}</button></div><div class="tiny muted" style="margin-top:10px">도전권 5시간마다 충전 · 최대 3장 · 예상 피해 ${nf(Math.round(c.dps*30*(1+mod('boss'))))}. 추가 공동 목표 ${nf(B.bossStretchGoal)} 피해 달성 시 연등 10을 더 받을 수 있습니다. 공유 기록을 연결하지 않으면 내 피해만 표시됩니다. 운영 서버의 최종 집계와 차이가 생길 수 있습니다.</div></div><div class="card pad" style="margin-top:12px"><div class="sect-t">실제 참여 기록</div>${d.players.map((r,i)=>`<div class="spread tiny"><span>${i+1}. ${esc(r.name||'이름 없음')}</span><b>${nf(r.wb_dmg)}</b></div>`).join('')||'<div class="tiny muted">아직 참여 기록이 없습니다.</div>'}</div>`;
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
