"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장
   법구 · 능력치 · 탑 · 업귀 토벌 · 연무제
   사역귀 · 약초밭 · 낚시 · 식당 · 모임 · 중개소
   ═══════════════════════════════════════════════════ */

/* ─── 등급 · 부위 ─── */
const GRADES=[
 {n:"일반", c:"var(--dim)", m:1.00, opt:0},
 {n:"고급", c:"var(--ok)", m:1.35, opt:1},
 {n:"희귀", c:"var(--blue)", m:1.85, opt:2},
 {n:"영웅", c:"var(--violet)", m:2.50, opt:3},
 {n:"전설", c:"var(--gold)", m:3.40, opt:4},
];
const SLOTS=[
 {k:"weapon", n:"무기",  st:"atk", e:ic("sword")},
 {k:"robe",   n:"법의",  st:"def", e:ic("robe")},
 {k:"cap",    n:"관",    st:"men", e:ic("cap")},
 {k:"charm",  n:"부적",  st:"agi", e:ic("beads")},
 {k:"sutra",  n:"경문",  st:"res", e:ic("scroll")},
];
const GEARWORD={
 weapon:["장검","낫","권총","석장","쌍검","철편","단도","활"],
 robe:["승복","흑단 장삼","기름 먹인 외투","법의","누비옷"],
 cap:["두건","머리띠","면구","관","삿갓"],
 charm:["염주","부적","방울","패","향낭"],
 sutra:["경문","사경첩","주문서","도감","필사본"],
};
const PREFIX=["잿불의","홍월의","무명의","법륜의","연화의","수월의","업연의","심연의","종소리의","폐허의","새벽의","검은 바다의"];
const OPTS=[
 {k:"atkP",  n:"공격력",       v:[2,9]},
 {k:"hpP",   n:"생명력",       v:[3,12]},
 {k:"defP",  n:"방어력",       v:[2,8]},
 {k:"crit",  n:"치명타 확률",   v:[1,5]},
 {k:"critD", n:"치명타 피해",   v:[4,16]},
 {k:"spd",   n:"공격 속도",     v:[2,7]},
 {k:"gold",  n:"륜 획득",       v:[3,11]},
 {k:"exp",   n:"경험치",        v:[3,10]},
 {k:"loot",  n:"전리품 확률",   v:[2,7]},
];

/* ─── 사역귀 ─── */
const PETDEF=[
 {n:"먹그림자 박쥐", e:ic("bat"), g:0, k:"gold",  v:[14,24], d:"골목 천장에 거꾸로 붙어 잔다."},
 {n:"초롱 도마뱀",   e:ic("lizard"), g:0, k:"atkP",  v:[10,20], d:"꼬리 끝에 작은 불이 붙어 있다."},
 {n:"이끼 거북",     e:ic("turtle"), g:0, k:"hpP",   v:[12,22], d:"등딱지에 누가 부적을 붙여 놓았다."},
 {n:"도토리 쥐",     e:ic("mouse"), g:0, k:"defP",  v:[10,20], d:"볼주머니에 뭔가를 늘 숨기고 있다."},
 {n:"연잎 개구리",   e:ic("frog"), g:1, k:"hatch", v:[20,34], d:"울음소리가 목탁과 비슷하다."},
 {n:"등롱 병아리",   e:ic("chick"), g:1, k:"exp",   v:[14,24], d:"어둠 속에서 저 혼자 희미하게 빛난다."},
 {n:"사리 햄스터",   e:ic("hamster"), g:1, k:"mana",  v:[12,22], d:"볼에 작은 사리를 물고 다닌다."},
 {n:"달 토끼",       e:ic("rabbit"), g:2, k:"study", v:[10,18], d:"홍월이 뜬 밤에만 모습을 보인다."},
 {n:"잿빛 까마귀",   e:ic("crow"), g:2, k:"loot",  v:[6,14],  d:"반짝이는 것을 물어 온다. 대개 쓸모없다."},
 {n:"수월 잉어",     e:ic("fish"), g:3, k:"critD", v:[18,34], d:"수면에 비친 달만 따라다닌다."},
 {n:"업연의 구렁이", e:ic("snake"), g:3, k:"atkP",  v:[20,34], d:"허물에 지난 생의 무늬가 남는다."},
 {n:"무명 호랑이",   e:ic("tiger"), g:4, k:"atkP",  v:[30,48], d:"이름을 부르면 돌아보지 않는다."},
];
const DISPATCH=[
 {h:2,  n:"2시간"}, {h:4, n:"4시간"}, {h:8, n:"8시간"}, {h:12, n:"12시간"},
];
const DAREA=["사무전 지하 봉인고","제2구역 뒷골목","제4구역 폐터널","제6구역 판자촌","제7구역 검은 바다","속삭이는 폐허"];
const BONDS=["낯섦","익숙함","친근함","신뢰","공명"];

/* ─── 약초밭 ─── */
const CROPS=[
 {id:"c1", n:"잿불 호박",   e:ic("pumpkin"), t:100, y:"열매", s:2, d:"잿불을 먹고 자란다. 속이 붉다."},
 {id:"c2", n:"맨드레이크",  e:ic("herb"), t:190, y:"뿌리", s:2, d:"뽑을 때 비명이 들린다는 소문."},
 {id:"c3", n:"푸른 별꽃",   e:ic("flower"), t:140, y:"꽃",   s:3, d:"해가 없는 곳에서만 핀다."},
 {id:"c4", n:"연화초",      e:ic("lotus"), t:240, y:"약초", s:3, d:"물 없이도 연못처럼 축축하다."},
 {id:"c5", n:"월하 버섯",   e:ic("mushroom"), t:80,  y:"약초", s:2, d:"밤에만 자란다. 명계엔 늘 밤이다."},
];
/* ─── 낚시 ─── */
const FISHES=[
 {n:"검은 숭어",     e:ic("fish"), w:40, y:"어물", s:2, p:60},
 {n:"등불 해파리",   e:ic("jellyfish"), w:22, y:"어물", s:3, p:140},
 {n:"파장 갑각류",   e:ic("shrimp"), w:18, y:"어물", s:3, p:190},
 {n:"심해 가자미",   e:ic("goldfish"), w:12, y:"어물", s:4, p:320},
 {n:"빛나는 해조",   e:ic("herb"), w:6,  y:"약초", s:3, p:260},
 {n:"이름 없는 것",  e:ic("bubble"), w:2,  y:"혼백", s:1, p:1400},
];
/* ─── 요리 ─── */
const DISHES=[
 {id:"d1", n:"순무 수프",       e:ic("stew"), t:"식사",   mat:{뿌리:3},        buf:[["hpP",.06],["defP",.06]], dur:240, d:"식당 수프의 기본입니다. 의뢰 전에 한 그릇 비우면 든든합니다."},
 {id:"d2", n:"잿불 호박 그라탱", e:ic("pumpkin"), t:"식사",   mat:{열매:4},        buf:[["gold",.12],["loot",.06]], dur:360, d:"속을 파내고 치즈를 얹어 구웠습니다. 축제 때 가장 많이 팔립니다."},
 {id:"d3", n:"약초 경단",       e:ic("dango"), t:"식사",   mat:{약초:4},        buf:[["mana",.10],["rest",.25]], dur:240, d:"삼장이 정서 안정용으로 권하는 음식."},
 {id:"d4", n:"어탕",            e:ic("noodle"), t:"식사",   mat:{어물:4},        buf:[["atkP",.08]],              dur:240, d:"제7구역 새벽 시장에서 배운 조리법."},
 {id:"d5", n:"별빛 커스터드",   e:ic("pudding"), t:"디저트", mat:{꽃:3,열매:2},   buf:[["study",.05],["know",.02]], dur:200, d:"푸른 별꽃의 즙을 넣어 굳힌 디저트."},
 {id:"d6", n:"연화 만두",       e:ic("dumpling"), t:"디저트", mat:{약초:2,뿌리:2}, buf:[["exp",.06]],               dur:240, d:"만두 빚기도 훌륭한 수행이라고 누군가 말했다."},
 {id:"d7", n:"월병",            e:ic("mooncake"), t:"디저트", mat:{열매:2,꽃:2},   buf:[["crit",.03],["critD",.10]], dur:240, d:"강시가 제일 좋아하는 것."},
];
/* ─── 모임(동아리) ─── */
const CLUBS=[
 {id:"cl1", n:"등롱회",     e:ic("lantern"), d:"창가에 등롱을 두는 모임. 축제철에 가장 바쁘다.", b:"지식·전리품 +5%"},
 {id:"cl2", n:"야행 순찰대", e:ic("candle"), d:"야간 순찰에 자원하는 학생들의 모임.",          b:"의뢰 륜 +8%"},
 {id:"cl3", n:"필사회",     e:ic("scroll"), d:"서고의 낡은 기록을 베껴 쓰는 모임.",           b:"수업 효율 +6%"},
];
/* ─── 연무제 대진 ─── */
/* 연무장에 올라오는 상대 — 모브 학생이 아니라 업귀와 교관입니다. */
const ARENAFOES=[
 "잿빛 손","쇠사슬 늑대","불 붙은 인형","업귀 잔해","개조 의체 괴한","영혼 밀매상","마녀의 사역물",
 "목소리 없는 군중","종을 삼킨 것","찢긴 장의 주인","삼장 보건 교사","강시 경비","여와","양귀비 교사","항아 교관"];
const ARENALINE=[
 "\"가볍게 가자. 다치면 삼장 선생님한테 혼나.\"","\"지난번은 운이 좋았을 뿐이야.\"","\"네 파장, 소문대로네.\"",
 "\"……시작하지.\"","\"손속에 정은 없다.\"","\"재밌겠다!\"","\"교본대로 하지 않으면 진다.\"","\"눈을 감지 마.\"",
 "\"이번엔 안 봐줘.\"","\"끝까지 서 있는 쪽이 이기는 거야.\"","\"이그나 교수님이 너를 잘 봐 두라고 하셨어.\"",
 "\"늦게 들어오면 문 잠근다. 그 전에 끝내자.\"","\"아, 저 싸우는 건 잘 못하는데…… 어라?\"",
 "\"거짓말은 금세 티가 난단다.\"","\"허접~♡ 자, 한 바퀴 돌자.\""];
/* ─── 업귀 토벌(월드 보스) ─── */
const WBOSS=[
 {n:"찢긴 장의 주인", e:ic("bookClosed"), d:"금서고의 모든 금서가 한 권으로 엮였다. 읽는 자의 이름을 지운다."},
 {n:"종을 삼킨 것",   e:ic("bell"), d:"석탑의 종소리가 되돌아오지 않는다. 그 안에 무언가 들어앉았다."},
 {n:"일륜의 그늘",    e:ic("moonDark"), d:"제4구역의 가짜 낮이 만들어 낸 그림자. 빛이 짙을수록 커진다."},
];

/* ═══════════ 상태 보강 ═══════════ */
function ensureV2(){
  const d=(k,v)=>{ if(S[k]===undefined) S[k]=v; };
  d("pts",0); d("alloc",{atk:0,def:0,agi:0,men:0,res:0}); d("tendency","파괴");
  d("gear",{weapon:null,robe:null,cap:null,charm:null,sutra:null});
  d("bag",[]); d("gid",1);
  d("mat",{가루:120,약초:0,어물:0,열매:0,뿌리:0,꽃:0,혼백:0});
  d("tower",0); d("tower2",0);
  d("wb",{dmg:0,tickets:3,next:300,total:6160000000,week:0,boss:0,rank:0});
  d("arena",{round:1,best:0,cool:0});
  d("pets",{eggs:2,list:[],hatch:null,prog:0});
  d("farm",{plots:Array.from({length:9},()=>null),skill:1,exp:0,fert:3,order:null,done:0});
  d("fish",{skill:1,exp:0,cool:0});
  d("kit",{have:{},eat:null,dess:null});
  d("club",null);
  d("market",{list:[],next:0});
  d("meal",null);
  if(!S.alloc) S.alloc={atk:0,def:0,agi:0,men:0,res:0};
  if(S.pets.list.length===0 && S.pets.eggs===2){ S.pets.list.push(mkPet(0)); }
  if(!S.farm.order) rollFarmOrder();
  if(!S.market.list.length) rollMarket();
}

/* ═══════════ 파생 능력치 ═══════════ */
function extraStat(k){
  let v=(S.alloc&&S.alloc[k])||0;
  v+=gearStat(k);
  return v;
}
function gearStat(k){
  let v=0;
  SLOTS.forEach(sl=>{ const it=S.gear[sl.k]; if(it&&it.main.st===k) v+=it.main.v; });
  return v;
}
function gearOpt(key){
  let v=0;
  SLOTS.forEach(sl=>{ const it=S.gear[sl.k]; if(!it) return;
    it.opts.forEach(o=>{ if(o.k===key) v+=o.v/100; }); });
  return v;
}
function petOpt(key){
  let v=0;
  S.pets.list.forEach(p=>{ if(p.k===key) v+=p.v/100; });
  return v;
}
function clubOpt(key){
  if(!S.club) return 0;
  const m={cl1:{know:.05,loot:.05}, cl2:{gold:.08}, cl3:{study:.06}}[S.club.id]||{};
  let v=m[key]||0;
  if(S.club.blessed>0 && (key==="know"||key==="loot")) v+=.05;
  return v;
}
/* mod 확장 */
const _mod=mod;
mod=function(key){ return _mod(key)+gearOpt(key)+petOpt(key)+clubOpt(key)+mealOpt(key); };
function mealOpt(key){
  let v=0;
  ["eat","dess"].forEach(s=>{ const m=S.kit&&S.kit[s]; if(!m||m.left<=0) return;
    const d=DISHES.find(x=>x.id===m.id); if(d) d.buf.forEach(([k,val])=>{ if(k===key) v+=val; }); });
  return v;
}
/* effStat 재정의 */
effStat=function(k){
  let v=stat(k)+hallBonus(k)+extraStat(k);
  const hpR=S.hp/100, snR=S.sn/100;
  if(k==="atk"||k==="def"){ if(hpR<=.2) v*=.5; else if(hpR<=.5) v*=.8; }
  if(k==="agi"){ if(snR<=.2) v*=.5; else if(snR<=.5) v*=.8; }
  if(k==="atk") v*=1+mod("atkP");
  if(k==="def") v*=1+mod("defP");
  return Math.max(1,Math.round(v));
};
/* 전투 수치 (탑 · 토벌 · 연무제용 DPS 모델) */
function C(){
  const a=effStat("atk"), df=effStat("def"), ag=effStat("agi"), mn=effStat("men"), rs=effStat("res");
  const dest=S.tendency==="파괴";
  const atkPow = Math.round(a*380*(1+rs*.035)*(dest?1.12:1));
  const spd    = +(1+ag*.020+mod("spd")).toFixed(2);
  const crit   = Math.min(.65, .05+ag*.0045+mod("crit"));
  const critD  = 2+rs*.035+mod("critD");
  const hp     = Math.round((520+df*260+mn*190)*(1+mod("hpP"))*(dest?1:1.18));
  const def    = Math.round(df*98*(1+mod("defP")));
  const heal   = +(1+mn*.04+(dest?0:.4)).toFixed(2);
  const dps    = Math.round(atkPow*spd*(1+crit*(critD-1)));
  return {atkPow,spd,crit,critD,hp,def,heal,dps};
}
function gearPower(){
  let p=0;
  SLOTS.forEach(sl=>{ const it=S.gear[sl.k]; if(!it) return;
    p+=it.main.v*900 + it.enh*210*GRADES[it.grade].m;
    it.opts.forEach(o=>p+=o.v*95); });
  return Math.round(p);
}
const _power=power;
power=function(){ return _power()+gearPower()+Math.round(S.pets.list.length*120)+(S.pts?0:0); };

/* ═══════════ 법구 생성 ═══════════ */
function mkGear(lv,gradeHint,fromLoot=false){
  const slot=pick(SLOTS);
  let g=gradeHint!==undefined?gradeHint:(()=> {
    const r=Math.random()*100*(1+mod("loot"));
    return r>97?4:r>88?3:r>70?2:r>44?1:0; })();
  g=clamp(g,0,4);
  if(fromLoot&&gradeHint===undefined&&g<4&&Math.random()<lootQualityChance()) g++;
  const G=GRADES[g];
  const base=Math.max(1,Math.round((0.8+lv*.085)*G.m));
  const opts=[];
  const pool=[...OPTS].sort(()=>Math.random()-.5).slice(0,G.opt);
  pool.forEach(o=>opts.push({k:o.k,n:o.n,v:+(rnd(o.v[0]*10,o.v[1]*10)/10*(1+g*.12)).toFixed(1)}));
  return {id:S.gid++, slot:slot.k, name:`${pick(PREFIX)} ${pick(GEARWORD[slot.k])}`,
    grade:g, lv:Math.max(1,lv), enh:0, main:{st:slot.st,v:base}, opts, isNew:true};
}
function gearScore(it){
  let p=it.main.v*900+it.enh*210*GRADES[it.grade].m;
  it.opts.forEach(o=>p+=o.v*95); return Math.round(p);
}
function equip(id){
  const i=S.bag.findIndex(x=>x.id===id); if(i<0) return;
  const it=S.bag[i]; const old=S.gear[it.slot];
  if(old && old.enh>it.enh){
    const keep=Math.floor(old.enh*0.7);
    if(keep>it.enh){
      for(let k=it.enh;k<keep;k++) it.main.v=Math.round(it.main.v*1.05+1);
      it.enh=keep;
      toast(`문양을 옮겨 새겼습니다 · 각인 +${old.enh} → <b>+${keep}</b>`);
    }
  }
  S.gear[it.slot]=it; S.bag.splice(i,1);
  if(old) S.bag.push(old);
  it.isNew=false;
  renderTop(); renderNav(); renderMain(); save();
}
function unequip(slot){
  const it=S.gear[slot]; if(!it) return;
  S.gear[slot]=null; S.bag.push(it);
  renderTop(); renderNav(); renderMain(); save();
}
function enhCost(it){ return {rin:Math.round((900+it.lv*140)*Math.pow(1.26,it.enh)*GRADES[it.grade].m), dust:Math.round(3*Math.pow(1.23,it.enh))}; }
function enhRate(it){ return clamp(1-it.enh*0.062+mod("crit")*0+S.res.r12*0.03,0.12,1); }
function enhance(slot, prot){
  const it=S.gear[slot]; if(!it) return;
  const c=enhCost(it);
  if(S.rin<c.rin){ toast("륜이 부족합니다.","bad"); return; }
  if(S.mat.가루<c.dust){ toast("부적가루가 부족합니다.","bad"); return; }
  if(prot){ if(S.sari<3){ toast("사리가 부족합니다. 보호 각인에는 사리 3이 듭니다.","bad"); return; } S.sari-=3; }
  S.rin-=c.rin; S.mat.가루-=c.dust;
  const r=enhRate(it);
  if(Math.random()<r || prot){ it.enh++; it.main.v=Math.round(it.main.v*1.05+1);
    toast(`<b>${it.name} +${it.enh}</b> 각인 성공${prot?" <span class='muted'>(사리로 보호)</span>":""}`,"good"); }
  else toast("각인이 어긋났습니다. 부적가루만 사라집니다.","bad");
  renderTop(); renderNav(); renderMain(); save();
}
function sellGear(id){
  const i=S.bag.findIndex(x=>x.id===id); if(i<0) return;
  const it=S.bag[i]; const v=Math.round(gearScore(it)*0.9+it.lv*20);
  S.bag.splice(i,1); gainRin(v); toast(`륜 +${nf(v)}`); renderTop(); renderMain(); save();
}
function dismantle(id){
  const i=S.bag.findIndex(x=>x.id===id); if(i<0) return;
  const it=S.bag[i]; const d=Math.round(3+it.lv*.45+it.grade*7+it.enh*6);
  S.bag.splice(i,1); S.mat.가루+=d; toast(`부적가루 +${d}`); renderMain(); save();
}
function bulkDo(kind,maxGrade){
  let n=0,gain=0;
  for(let i=S.bag.length-1;i>=0;i--){
    const it=S.bag[i]; if(it.grade>maxGrade) continue;
    if(kind==="sell"){ gain+=Math.round(gearScore(it)*0.9+it.lv*20); }
    else { gain+=Math.round(3+it.lv*.45+it.grade*7+it.enh*6); }
    S.bag.splice(i,1); n++;
  }
  if(!n){ toast("해당하는 법구가 없습니다."); return; }
  if(kind==="sell"){ gainRin(gain); toast(`${n}개 판매 · 륜 +${nf(gain)}`,"good"); }
  else { S.mat.가루+=gain; toast(`${n}개 분해 · 부적가루 +${gain}`,"good"); }
  renderTop(); renderMain(); save();
}

/* ═══════════ 사역귀 ═══════════ */
function mkPet(gi){
  const pool=PETDEF.filter(p=>p.g===gi);
  const d=pick(pool.length?pool:PETDEF);
  return {n:d.n, e:d.e, g:d.g, k:d.k, kn:OPTNAME(d.k), v:+(rnd(d.v[0]*10,d.v[1]*10)/10).toFixed(1),
          d:d.d, lv:1, exp:0, bond:0, out:null, area:pick(DAREA), nick:""};
}
function OPTNAME(k){
  return ({atkP:"공격력",hpP:"생명력",defP:"방어력",crit:"치명타 확률",critD:"치명타 피해",spd:"공격 속도",
    gold:"륜 획득",exp:"경험치",loot:"전리품 획득 확률",quality:"법구 품질 상승 확률",snGuard:"이성 소모 감소",rest:"체력·이성 자연 회복",heal:"치유·보호막 위력",boss:"업귀 피해",mana:"파장 재생",study:"수업 보상",know:"지식 획득",hatch:"부화 효율"})[k]||k;
}
function hatchNeed(){ return 1800+S.pets.list.length*420; }
function startHatch(){
  if(S.pets.eggs<1){ toast("업연의 알이 없습니다.","bad"); return; }
  if(S.pets.hatch){ toast("이미 알을 품고 있습니다.","bad"); return; }
  S.pets.eggs--; S.pets.hatch={need:hatchNeed(),prog:0}; toast("알을 품기 시작했습니다. 활동할수록 진행됩니다.");
  renderMain(); save();
}
function hatchPush(n){
  if(!S.pets.hatch) return;
  S.pets.hatch.prog+=n*(1.3+petOpt("hatch"));
  if(S.pets.hatch.prog>=S.pets.hatch.need) doHatch();
}
function doHatch(){
  S.pets.hatch=null;
  const r=Math.random()*100;
  const gi=r>97?4:r>88?3:r>72?2:r>46?1:0;
  const p=mkPet(gi);
  S.pets.list.push(p);
  toast(`알이 깨어났습니다 — <b>${p.e} ${p.n}</b> (${GRADES[p.g].n})`,"good");
  pushNews(`[사육장] ${S.name} 학생의 알에서 ${p.n}이(가) 깨어났습니다.`);
  save();
}
function hatchNow(){
  const h=S.pets.hatch; if(!h) return;
  const left=Math.max(0,h.need-h.prog);
  const cost=Math.round(left*4);
  if(S.mana<cost){ toast(`파장이 부족합니다. (${nf(cost)} 필요)`,"bad"); return; }
  S.mana-=cost; doHatch(); renderTop(); renderMain();
}
function dispatch(i,h){
  const p=S.pets.list[i]; if(p.out) return;
  p.out={end:S.t+h*60, h};
  toast(`${p.n}을(를) ${p.area}(으)로 ${h}시간 파견했습니다.`); renderMain(); save();
}
function recall(i){
  const p=S.pets.list[i]; if(!p.out) return;
  const done=S.t>=p.out.end;
  if(!done){ p.out=null; toast(`${p.n}이(가) 빈손으로 돌아왔습니다.`); renderMain(); return; }
  const h=p.out.h;
  const rin=gainRin(rnd(200,420)*h), know=gainKnow(rnd(8,22)*h);
  const mats=["약초","열매","뿌리","꽃"]; const mk=pick(mats), mv=rnd(1,2)*h;
  S.mat[mk]+=mv;
  let extra="";
  if(Math.random()<.10*h/4){ S.sari++; extra+=" · 사리 +1"; }
  if(Math.random()<.08*h/4){ S.pets.eggs++; extra+=" · 업연의 알 +1"; }
  p.exp+=h*40; p.bond=Math.min(100,p.bond+h*2);
  while(p.exp>=p.lv*220){ p.exp-=p.lv*220; p.lv++; p.v=+(p.v*1.03+.2).toFixed(1); }
  p.out=null;
  toast(`${p.n} 귀환 · 륜 +${nf(rin)} · ${mk} +${mv} · 지식 +${nf(know)}${extra}`,"good");
  renderTop(); renderNav(); renderMain(); save();
}
function feedPet(i){
  const p=S.pets.list[i];
  const cost=Math.round(9000*(1+p.lv*.2));
  if(S.rin<cost){ toast("륜이 부족합니다.","bad"); return; }
  S.rin-=cost; p.exp+=260; p.bond=Math.min(100,p.bond+6);
  while(p.exp>=p.lv*220){ p.exp-=p.lv*220; p.lv++; p.v=+(p.v*1.03+.2).toFixed(1); }
  toast(`${p.n}에게 먹이를 주었습니다. 유대 +6`); renderTop(); renderMain(); save();
}
function recallAll(){
  let n=0; S.pets.list.forEach((p,i)=>{ if(p.out&&S.t>=p.out.end){ recall(i); n++; } });
  if(!n) toast("돌아올 사역귀가 없습니다.");
}

/* ═══════════ 약초밭 ═══════════ */
function rollFarmOrder(){
  const c=pick(CROPS);
  S.farm.order={id:c.id, need:rnd(3,5), have:0, done:false};
}
function plant(i,cid){
  if(S.farm.plots[i]){ toast("이미 심어져 있습니다.","bad"); return; }
  const c=CROPS.find(x=>x.id===cid);
  S.farm.plots[i]={id:cid, left:c.t, total:c.t, watered:false, fert:false};
  renderMain(); save();
}
function plantAll(cid){
  let n=0; S.farm.plots.forEach((p,i)=>{ if(!p){ plant(i,cid); n++; } });
  toast(n?`${n}칸에 심었습니다.`:"빈 칸이 없습니다.");
}
function water(i){
  const p=S.farm.plots[i]; if(!p||p.watered) return;
  p.watered=true; p.left=Math.round(p.left*.85);
  renderMain(); save();
}
function waterAll(){ S.farm.plots.forEach((p,i)=>{ if(p&&!p.watered) water(i); }); toast("모든 밭에 물을 주었습니다."); }
function fertilize(i){
  const p=S.farm.plots[i]; if(!p||p.fert) return;
  if(S.farm.fert<1){ toast("비료가 없습니다.","bad"); return; }
  S.farm.fert--; p.fert=true; p.left=Math.round(p.left*.7);
  renderMain(); save();
}
function harvest(i){
  const p=S.farm.plots[i]; if(!p||p.left>0) return;
  const c=CROPS.find(x=>x.id===p.id);
  let amt=c.s+(p.fert?1:0)+(Math.random()<.2?1:0);
  const mut=Math.random()<.12;
  if(mut) amt+=2;
  S.mat[c.y]+=amt;
  S.farm.exp+=14; S.farm.plots[i]=null;
  if(S.farm.order && S.farm.order.id===c.id && !S.farm.order.done){
    S.farm.order.have=Math.min(S.farm.order.need,S.farm.order.have+amt);
  }
  while(S.farm.exp>=S.farm.skill*120){ S.farm.exp-=S.farm.skill*120; S.farm.skill++; toast(`원예 숙련도 Lv ${S.farm.skill}`,"good"); }
  gainExp(26); addMark(2);
  if(mut) toast(`${c.n}이(가) 변이했습니다 · ${c.y} +${amt}`,"good");
  renderMain(); renderTop(); save();
}
function harvestAll(){
  let n=0; S.farm.plots.forEach((p,i)=>{ if(p&&p.left<=0){ harvest(i); n++; } });
  toast(n?`${n}칸을 수확했습니다.`:"수확할 것이 없습니다.");
}
function deliverOrder(){
  const o=S.farm.order; const c=CROPS.find(x=>x.id===o.id);
  if(o.have<o.need){ toast("수량이 모자랍니다.","bad"); return; }
  o.done=true;
  S.lotus+=1; gainExp(300); S.farm.fert+=3; gainKnow(80);
  toast(`납품 완료 · 연등 +1 · 비료 +3 · 지식 +80`,"good");
  renderMain(); renderTop(); save();
}

/* ═══════════ 낚시 ═══════════ */
let FISHGAME=null;
function openFish(){
  FISHGAME={state:"idle", bar:0, dir:1, target:rnd(25,70)};
  drawFish2();
}
function drawFish2(){
  const F=FISHGAME;
  modal(ic("fishing")+" 제7구역 검은 바다",`
    <div class="tiny muted" style="margin-bottom:10px">전자 범종이 울리는 부두. 찌가 흔들리는 순간 「챈다」를 누릅니다. 금빛 구간에 멈출수록 좋은 것이 올라옵니다.</div>
    <div style="position:relative;height:28px;background:var(--s1);border:1px solid var(--line);border-radius:7px;overflow:hidden">
      <div style="position:absolute;left:${F.target}%;width:16%;top:0;bottom:0;background:rgba(201,45,229,.28);border-left:1px solid var(--gold);border-right:1px solid var(--gold)"></div>
      <div id="fbar" style="position:absolute;left:${F.bar}%;top:0;bottom:0;width:3px;background:var(--red);box-shadow:0 0 8px var(--red)"></div>
    </div>
    <div class="row" style="margin-top:12px">
      ${F.state==="run"?`<button class="btn pri" onclick="fishHook()">챈다</button>`
        :`<button class="btn pri" onclick="fishCast()">던진다</button>`}
      <span class="tiny muted">낚시 숙련도 Lv ${S.fish.skill} · 어물 ${S.mat.어물}</span>
      <button class="btn" style="margin-left:auto" onclick="closeModal();renderMain()">그만</button>
    </div>
    <div id="fres" style="margin-top:10px"></div>`);
}
function fishCast(){
  const F=FISHGAME; F.state="run"; F.bar=0; F.dir=1; F.target=rnd(14,72);
  drawFish2();
  const sp=2.4+Math.random()*1.6;
  F.timer=setInterval(()=>{
    F.bar+=F.dir*sp;
    if(F.bar>=100){ F.bar=100; F.dir=-1; }
    if(F.bar<=0){ F.bar=0; F.dir=1; }
    const el=document.getElementById("fbar"); if(!el){ clearInterval(F.timer); return; }
    el.style.left=F.bar+"%";
  },30);
}
function fishHook(){
  const F=FISHGAME; clearInterval(F.timer); F.state="idle";
  const hit=F.bar>=F.target && F.bar<=F.target+16;
  const perfect=hit && Math.abs(F.bar-(F.target+8))<4;
  if(!hit){
    drawFish2();
    document.getElementById("fres").innerHTML=`<div class="tiny" style="color:var(--red)">빈 바늘입니다. 수면에 파문만 남았습니다.</div>`;
    return;
  }
  let pool=[...FISHES];
  const roll=Math.random()*100*(1+S.fish.skill*.02+(perfect?.6:0));
  let acc=0, got=FISHES[0];
  const tot=FISHES.reduce((a,f)=>a+f.w,0);
  const r=Math.random()*tot*(perfect?.55:1);
  for(const f of FISHES){ acc+=f.w; if(r<=acc){ got=f; break; } }
  S.mat[got.y]+=got.s;
  S.fish.exp+=10;
  while(S.fish.exp>=S.fish.skill*90){ S.fish.exp-=S.fish.skill*90; S.fish.skill++; toast(`낚시 숙련도 Lv ${S.fish.skill}`,"good"); }
  gainExp(30); addMark(2);
  drawFish2();
  document.getElementById("fres").innerHTML=
    `<div class="card pad" style="padding:9px 12px"><b>${got.e} ${got.n}</b> ${perfect?'<span class="tag g">완벽</span>':""}
     <div class="tiny" style="color:var(--jade)">${got.y} +${got.s} · 경험치 +30</div></div>`;
  renderTop(); save();
}

/* ═══════════ 식당 ═══════════ */
function cook(id){
  const d=DISHES.find(x=>x.id===id);
  for(const k in d.mat){ if(S.mat[k]<d.mat[k]){ toast(`${k}이(가) 부족합니다.`,"bad"); return; } }
  for(const k in d.mat) S.mat[k]-=d.mat[k];
  S.kit.have[id]=(S.kit.have[id]||0)+1;
  toast(`${d.n}을(를) 만들었습니다.`,"good"); renderMain(); save();
}
function eat(id){
  const d=DISHES.find(x=>x.id===id);
  if(!(S.kit.have[id]>0)){ toast("보유한 요리가 없습니다.","bad"); return; }
  S.kit.have[id]--;
  const slot=d.t==="식사"?"eat":"dess";
  const cur=S.kit[slot];
  if(cur&&cur.id===id) cur.left=Math.min(d.dur*2,cur.left+d.dur);
  else S.kit[slot]={id, left:d.dur};
  toast(`${d.n} · ${d.buf.map(([k,v])=>OPTNAME(k)+" +"+Math.round(v*100)+"%").join(", ")}`,"good");
  renderTop(); renderMain(); save();
}

/* ═══════════ 모임 ═══════════ */
function joinClub(id){
  const c=CLUBS.find(x=>x.id===id);
  S.club={id, lv:3, exp:0, contrib:0, blessed:0, att:false, members:rnd(18,38), week:0};
  toast(`「${c.n}」에 가입했습니다.`,"good"); renderMain(); save();
}
function clubAttend(){
  if(S.club.att){ toast("오늘은 이미 출석했습니다."); return; }
  S.club.att=true; clubExp(10); toast("출석했습니다. 기여도 +10","good"); renderMain(); save();
}
function clubDonate(n){
  const cost=n*474;
  if(S.rin<cost){ toast("륜이 부족합니다.","bad"); return; }
  if(S.club.contrib+n>200){ toast("오늘 기부 한도(200점)를 넘습니다.","bad"); return; }
  S.rin-=cost; S.club.contrib+=n; clubExp(n);
  toast(`기여도 +${n}`,"good"); renderTop(); renderMain(); save();
}
function clubExp(n){
  S.club.exp+=n*12;
  const need=()=>S.club.lv*2400;
  while(S.club.exp>=need()){ S.club.exp-=need(); S.club.lv++; toast(`모임 레벨 ${S.club.lv}`,"good"); }
}
function clubBless(){
  if(S.club.blessed>0){ toast("이미 축복을 받았습니다."); return; }
  S.club.blessed=240;
  S.buffs.push({n:"모임의 결속", key:"know", v:.05, left:240, e:ic("lantern"), c:"var(--gold)"});
  toast("모임의 결속 · 지식·전리품 +5% (4시간)","good"); renderTop(); renderMain(); save();
}

/* ═══════════ 중개소 ═══════════ */
function rollMarket(){
  const lv=Math.max(5,S.lvl);
  S.market.list=Array.from({length:14},()=>{
    const it=mkGear(rnd(Math.max(1,lv-6),lv+8));
    it.isNew=false;
    return {it, price:Math.round(gearScore(it)*(1.2+Math.random()*1.1)+it.lv*120), seller:"사무전 중개소", left:rnd(600,4000)};
  }).sort((a,b)=>gearScore(b.it)-gearScore(a.it));
  S.market.next=240;
}
function buyMarket(i){
  const m=S.market.list[i];
  if(S.rin<m.price){ toast("륜이 부족합니다.","bad"); return; }
  S.rin-=m.price; m.it.isNew=true; S.bag.push(m.it); S.market.list.splice(i,1);
  toast(`${m.it.name}을(를) 샀습니다.`,"good"); renderTop(); renderMain(); save();
}
function listMine(id){
  const i=S.bag.findIndex(x=>x.id===id); if(i<0) return;
  const it=S.bag[i];
  const gross=Math.round(gearScore(it)*1.35+it.lv*120);
  const feeR=gross<=100000?.05:gross<=1000000?.07:.10;
  const net=Math.round(gross*(1-feeR));
  S.bag.splice(i,1); gainRin(net);
  toast(`중개소에서 즉시 팔렸습니다 · 륜 +${nf(net)} <span class="muted">(수수료 ${Math.round(feeR*100)}%)</span>`,"good");
  renderTop(); renderMain(); save();
}

/* ═══════════ 틱 확장 ═══════════ */
const _step=step;
step=function(m){
  _step(m);
  if(!S||!S.made||!S.farm) return;
  // 작물
  let grew=false;
  S.farm.plots.forEach(p=>{ if(p&&p.left>0){ p.left-=m; if(p.left<=0){ p.left=0; grew=true; } } });
  if(grew) toast("텃밭에 다 자란 작물이 있습니다.");
  // 요리 버프
  ["eat","dess"].forEach(s=>{ const k=S.kit[s]; if(k){ k.left-=m; if(k.left<=0) S.kit[s]=null; } });
  // 월드 보스 도전권
  S.wb.next-=m;
  if(S.wb.next<=0){ if(S.wb.tickets<3){ S.wb.tickets++; toast("업귀 토벌 도전권이 1장 충전되었습니다."); } S.wb.next=300; }
  S.wb.total+=Math.round(m*rnd(900000,2400000)/60);
  // 모임 축복
  if(S.club&&S.club.blessed>0) S.club.blessed=Math.max(0,S.club.blessed-m);
  // 연무제 쿨
  if(S.arena.cool>0) S.arena.cool=Math.max(0,S.arena.cool-m);
  // 중개소 갱신
  S.market.next-=m; if(S.market.next<=0) rollMarket();
  // 부화 진행 (활동량 비례)
  hatchPush(m*1.2);
};
const _onNewDay=onNewDay;
onNewDay=function(){
  _onNewDay();
  if(S.club){ S.club.att=false; S.club.contrib=0; }
  S.farm.fert+=2;
  rollFarmOrder();
  S.fish.cool=0;
};
const _addMark=addMark;
addMark=function(n){ _addMark(n); hatchPush(n*3); };

/* ═══════════ 내비 재구성 ═══════════ */
NAVDEF.length=0;
NAVDEF.push(
 {id:"plaza", ic:ic("gate"), n:"사무전 광장"},
 {id:"study", ic:ic("book"), n:"수업·수행", sub:[{id:"class",n:"강의실"},{id:"research",n:"수행"},{id:"exam",n:"승급 시험"}]},
 {id:"war",   ic:ic("swords"), n:"의뢰·전투", sub:[{id:"quest",n:"의뢰"},{id:"tower",n:"석탑"},{id:"guard",n:"결계의 탑"},
                                          {id:"wboss",n:"업귀 토벌",bd:"주간"},{id:"arena",n:"연무제"},{id:"duel",n:"대련"}]},
 {id:"gearn", ic:ic("sword"), n:"법구·바랑", sub:[{id:"gear",n:"법구"},{id:"stats",n:"능력치"},{id:"bag",n:"바랑"}]},
 {id:"craft", ic:ic("pot"), n:"공방·생활", sub:[{id:"pets",n:"사역귀 사육장"},{id:"fishv",n:"낚시"},{id:"farm",n:"약초밭"},{id:"kitchen",n:"식당"}]},
 {id:"soc",   ic:ic("candle"), n:"교류",      sub:[{id:"map",n:"지도"},{id:"club",n:"모임"},{id:"rel",n:"인연·관계"}]},
 {id:"shopn", ic:ic("store"), n:"상점",      sub:[{id:"market",n:"중개소"},{id:"shop",n:"매점"},{id:"merchant",n:"떠돌이 상인"}]},
 {id:"rec",   ic:ic("scroll"), n:"기록",      sub:[{id:"fest",n:"염라제",bd:"축제"},{id:"outing",n:"구역 나들이"},{id:"record",n:"기록·성적"}]},
);

/* ═══════════════════════════════════════════════════
   화면 — 법구 · 능력치 · 바랑
   ═══════════════════════════════════════════════════ */
function gradeTag(g){ return `<span class="tag" style="border-color:${GRADES[g].c};color:${GRADES[g].c}">${GRADES[g].n}</span>`; }
function gearLine(it){
  const st=STATS.find(s=>s.k===it.main.st).n;
  return `${st} +${it.main.v}${it.opts.length?" · "+it.opts.map(o=>`${o.n} +${o.v}%`).join(" · "):""}`;
}
function gearCard(it,where){
  const G=GRADES[it.grade];
  const equipped = where==="on";
  return `<div class="sub" style="border-color:${equipped?G.c:"var(--line)"}">
    <div class="spread"><div>
      <b style="color:${G.c}">${esc(it.name)}${it.enh?` +${it.enh}`:""}</b>
      ${it.isNew?'<span class="tag r">NEW</span>':""}
      <div class="tiny muted">${SLOTS.find(s=>s.k===it.slot).n} · Lv ${it.lv} · ${G.n}</div>
    </div><div style="text-align:right"><div class="tiny muted">전투력</div>
      <b style="color:var(--gold)">${nf(gearScore(it))}</b></div></div>
    <div class="tiny" style="margin:6px 0 8px;color:var(--jade)">${gearLine(it)}</div>
    <div class="row">
      ${equipped
        ? `<button class="btn sm pri" onclick="enhance('${it.slot}')">각인 +${it.enh+1}</button>
           <button class="btn sm" onclick="unequip('${it.slot}')">해제</button>
           <span class="tiny muted" style="margin-left:auto">성공 ${Math.round(enhRate(it)*100)}% · 륜 ${nf(enhCost(it).rin)} · 가루 ${enhCost(it).dust}</span>`
        : `<button class="btn sm pri" onclick="equip(${it.id})">장착</button>
           <button class="btn sm" onclick="sellGear(${it.id})">판매</button>
           <button class="btn sm" onclick="dismantle(${it.id})">분해</button>
           <button class="btn sm ghost" onclick="listMine(${it.id})">중개소에 내놓기</button>`}
    </div></div>`;
}
VIEWS.gear=()=>{
  const best=(slot)=>{
    const cands=S.bag.filter(b=>b.slot===slot);
    if(!cands.length) return null;
    return cands.reduce((a,b)=>gearScore(b)>gearScore(a)?b:a);
  };
  return head("무기 · 법의 · 관 · 부적 · 경문",ic("sword")+" 법구", `전투력 <b style="color:var(--gold)">${nf(power())}</b>`)+`
  <div class="grid g3" style="margin-bottom:14px">
    ${SLOTS.map(sl=>{
      const it=S.gear[sl.k]; const b=best(sl.k);
      const up=b&&(!it||gearScore(b)>gearScore(it));
      if(!it) return `<div class="sub" style="border-style:dashed">
        <div class="tiny muted">${sl.e} ${sl.n}</div>
        <div class="tiny muted" style="margin:6px 0">비어 있습니다</div>
        ${b?`<button class="btn sm pri" onclick="equip(${b.id})">가장 좋은 것 장착</button>`:`<span class="tiny muted">바랑에도 없습니다</span>`}</div>`;
      return `<div class="sub" style="border-color:${GRADES[it.grade].c}">
        <div class="spread"><span class="tiny muted">${sl.e} ${sl.n}</span>${gradeTag(it.grade)}</div>
        <b style="color:${GRADES[it.grade].c}">${esc(it.name)}${it.enh?` +${it.enh}`:""}</b>
        <div class="tiny muted">Lv ${it.lv} · 전투력 ${nf(gearScore(it))}</div>
        <div class="tiny" style="color:var(--jade);margin:5px 0 8px">${gearLine(it)}</div>
        <div class="row">
          <button class="btn sm pri" onclick="enhance('${sl.k}')">각인 +${it.enh+1}</button>
          <button class="btn sm" ${S.sari<3?"disabled":""} onclick="enhance('${sl.k}',true)" title="사리 3을 더 내면 실패하지 않습니다">보호 각인</button>
          <button class="btn sm" onclick="unequip('${sl.k}')">해제</button>
          ${up?`<button class="btn sm" style="margin-left:auto;color:var(--jade)" onclick="equip(${b.id})">▲ 교체</button>`:""}
        </div>
        <div class="tiny muted" style="margin-top:6px">각인 성공률 ${Math.round(enhRate(it)*100)}% · 륜 ${nf(enhCost(it).rin)} · 부적가루 ${enhCost(it).dust} <span style="color:var(--s7)">· 보호는 사리 3 추가</span></div>
      </div>`;
    }).join("")}
  </div>

  <div class="card pad" style="margin-bottom:14px">
    <div class="row">
      <button class="btn sm" onclick="equipBest()">가장 좋은 법구 장착</button>
      <button class="btn sm" onclick="unequipAll()">전체 해제</button>
      <span class="tiny muted" style="margin-left:auto">부적가루 <b style="color:var(--gold)">${nf(S.mat.가루)}</b> · 사리 ${nf(S.sari)} · 각인은 실패해도 단계가 떨어지지 않으며, 법구를 바꾸면 <b>이전 각인의 70%가 새 법구로 옮겨 새겨집니다</b></span>
    </div>
  </div>

  <div class="card pad">
    <div class="spread"><div class="sect-t" style="margin:0">바랑 ${S.bag.length} / ${40+S.res.r11*5}</div>
      <div class="row">
        <span class="tiny muted">일괄</span>
        ${[0,1,2,3].map(g=>`<button class="btn sm" onclick="bulkDo('sell',${g})">${GRADES[g].n} 이하 판매</button>`).join("")}
      </div></div>
    <div class="row" style="margin:8px 0">
      ${[0,1,2,3].map(g=>`<button class="btn sm" onclick="bulkDo('dis',${g})">${GRADES[g].n} 이하 분해</button>`).join("")}
    </div>
    <hr class="hr">
    ${S.bag.length?`<div class="grid g3">${[...S.bag].sort((a,b)=>gearScore(b)-gearScore(a)).slice(0,24).map(it=>gearCard(it)).join("")}</div>`
      :`<div class="tiny muted">바랑이 비어 있습니다. 의뢰와 탑에서 법구가 나옵니다.</div>`}
  </div>`;
};
function equipBest(){
  SLOTS.forEach(sl=>{
    const cands=S.bag.filter(b=>b.slot===sl.k); if(!cands.length) return;
    const b=cands.reduce((a,c)=>gearScore(c)>gearScore(a)?c:a);
    if(!S.gear[sl.k]||gearScore(b)>gearScore(S.gear[sl.k])) equip(b.id);
  });
  toast("가장 좋은 법구를 장착했습니다.","good");
}
function unequipAll(){ SLOTS.forEach(sl=>unequip(sl.k)); }

VIEWS.bag=()=>{
  const matRows=Object.keys(S.mat).map(k=>`<div class="spread tiny" style="padding:3px 0"><span>${k}</span><b>${nf(S.mat[k])}</b></div>`).join("");
  const dishRows=Object.keys(S.kit.have).filter(k=>S.kit.have[k]>0).map(k=>{
    const d=DISHES.find(x=>x.id===k);
    return `<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--s3)">
      <div><b>${d.e} ${d.n}</b> ×${S.kit.have[k]}<div class="tiny muted">${d.t} · ${d.buf.map(([a,b])=>OPTNAME(a)+" +"+Math.round(b*100)+"%").join(", ")} · ${hhmm(d.dur)}</div></div>
      <button class="btn sm pri" onclick="eat('${k}')">먹기</button></div>`}).join("");
  const itemRows=Object.keys(S.inv).filter(k=>S.inv[k]>0).map(k=>{
    const p=SHOP.find(x=>x.id===k);
    return `<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--s3)">
      <div><b>${p.n}</b> ×${S.inv[k]}<div class="tiny muted">${p.d}</div></div>
      <button class="btn sm pri" onclick="useItem('${k}');renderMain()">사용</button></div>`}).join("");
  return head("소지품 · 보관품",ic("bag")+" 바랑", `${S.bag.length} / ${40+S.res.r11*5}칸`)+`
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="sect-t">재료</div>${matRows}
      <hr class="hr">
      <div class="spread tiny"><span>업연의 알</span><b>${S.pets.eggs}</b></div>
      <div class="spread tiny"><span>비료</span><b>${S.farm.fert}</b></div>
    </div>
    <div class="card pad">
      <div class="sect-t">요리</div>
      ${dishRows||'<div class="tiny muted">만들어 둔 요리가 없습니다.</div>'}
      <hr class="hr">
      <div class="sect-t">소모품</div>
      ${itemRows||'<div class="tiny muted">비어 있습니다.</div>'}
    </div>
  </div>
  <div class="card pad">
    <div class="sect-t">법구 ${S.bag.length}개</div>
    ${S.bag.length?`<div class="grid g3">${[...S.bag].sort((a,b)=>gearScore(b)-gearScore(a)).map(it=>gearCard(it)).join("")}</div>`
      :'<div class="tiny muted">비어 있습니다.</div>'}
  </div>`;
};

VIEWS.stats=()=>{
  const c=C();
  const row=(s)=>{
    const base=stat(s.k), hall=hallBonus(s.k), al=S.alloc[s.k], ge=gearStat(s.k);
    return `<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--s3)">
      <div><b>${s.n}</b> <span class="tiny muted">${s.d}</span>
        <div class="tiny muted">기본 ${base} · 분배 <span style="color:var(--jade)">+${al}</span> · 거주지 +${hall} · 법구 <span style="color:var(--gold)">+${ge}</span></div></div>
      <div class="row">
        <b style="width:36px;text-align:right;color:var(--gold);font-size:16px">${effStat(s.k)}</b>
        <button class="btn sm" ${S.pts<1?"disabled":""} onclick="alloc('${s.k}',1)">+1</button>
        <button class="btn sm" ${S.pts<10?"disabled":""} onclick="alloc('${s.k}',10)">+10</button>
      </div></div>`;
  };
  return head("능력치 · 성향 · 전투 능력",ic("chart")+" 능력치", `전투력 <b style="color:var(--gold)">${nf(power())}</b>`)+`
  <div class="card pad" style="margin-bottom:14px">${combatStyleHTML()}</div>
  <div class="grid g2">
    <div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">능력치</div>
        <span class="tiny">남은 포인트 <b style="color:${S.pts?"var(--gold)":"var(--dim)"}">${S.pts}</b></span></div>
      ${STATS.map(row).join("")}
      <div class="row" style="margin-top:10px">
        <button class="btn sm" onclick="autoAlloc('균형')">균형 분배</button>
        <button class="btn sm" onclick="autoAlloc('공격')">공격형</button>
        <button class="btn sm" onclick="autoAlloc('생존')">생존형</button>
        <button class="btn sm" onclick="autoAlloc('공명')">공명형</button>
        <button class="btn sm red" style="margin-left:auto" onclick="resetAlloc()">망각의 차로 초기화 · 륜 ${nf(2000*S.course)}</button>
      </div>
      <div class="tiny muted" style="margin-top:6px">수행 단계가 오를 때마다 2포인트를 받습니다. 과목으로 오른 능력치와는 따로 쌓입니다.</div>
      <hr class="hr">
      <div class="sect-t">성향</div>
      <div class="row">
        <span class="seg">
          <button class="${S.tendency==="파괴"?"on":""}" onclick="setTend('파괴')">파괴</button>
          <button class="${S.tendency==="수호"?"on":""}" onclick="setTend('수호')">수호</button></span>
        <span class="tiny muted">언제든 변경 가능</span>
      </div>
      <div class="tiny muted" style="margin-top:6px">
        ${S.tendency==="파괴"?"파괴 — 공격력 +12%. 뒤에서 주문을 쏟아붓는 쪽. 승급 시험의 처치 과제에 유리합니다."
          :"수호 — 생명력 +18%, 치유·보호막 위력 ×1.4. 결계의 탑처럼 버티는 과제에 유리합니다."}</div>
    </div>

    <div class="card pad">
      <div class="sect-t">전투 능력</div>
      <table class="t">
        <tr><td>초당 피해</td><td style="text-align:right"><b style="color:var(--gold)">${nf(c.dps)}</b></td></tr>
        <tr><td>공격력</td><td style="text-align:right">${nf(c.atkPow)}</td></tr>
        <tr><td>공격 속도</td><td style="text-align:right">${c.spd.toFixed(2)}/초</td></tr>
        <tr><td>치명타</td><td style="text-align:right">${(c.crit*100).toFixed(1)}% · ×${c.critD.toFixed(2)}</td></tr>
        <tr><td>생명력 · 방어력</td><td style="text-align:right">${nf(c.hp)} · ${nf(c.def)}</td></tr>
        <tr><td>치유·보호막 위력</td><td style="text-align:right">×${c.heal.toFixed(2)}</td></tr>
        <tr><td>사역귀 동행</td><td style="text-align:right">${S.pets.list.length?S.pets.list[0].e+" "+S.pets.list[0].n:"없음"}</td></tr>
      </table>
      <div class="tiny muted" style="margin-top:8px">초당 피해는 석탑·결계의 탑·업귀 토벌·연무제에서 쓰입니다.
      의뢰·대련·승급 시험은 <b>공격 D5 + 5</b>에 치명타·업귀 피해 효과를 적용합니다.</div>
      <hr class="hr">
      <div class="sect-t">적용 중인 효과</div>
      ${["atkP","hpP","defP","crit","critD","spd","boss","gold","exp","know","loot","quality","snGuard","rest","heal","study","mana"].map(k=>{
        const v=mod(k); if(Math.abs(v)<0.001) return "";
        return `<div class="spread tiny" style="padding:2px 0"><span>${OPTNAME(k)}</span>
          <b style="color:${v>0?"var(--jade)":"var(--red)"}">${v>0?"+":""}${(v*100).toFixed(1)}${["crit","critD","quality","loot"].includes(k)?"%p":"%"}</b></div>`}).join("")}
      <div class="tiny muted" style="margin-top:8px">품질 상승·이성 소모 감소는 각각 최대 60%까지 적용됩니다. 현재 품질 상승 ${(lootQualityChance()*100).toFixed(1)}%, 이성 소모 감소 ${(clamp(mod("snGuard"),0,.60)*100).toFixed(1)}%.</div>
    </div>
  </div>`;
};
function alloc(k,n){
  n=Math.min(n,S.pts); if(n<1) return;
  S.alloc[k]+=n; S.pts-=n; renderMain(); renderNav(); renderTop(); save();
}
function autoAlloc(kind){
  if(S.pts<1){ toast("남은 포인트가 없습니다."); return; }
  const w={균형:{atk:1,def:1,agi:1,men:1,res:1},공격:{atk:5,agi:2,res:2,def:1,men:0},
           생존:{def:5,men:3,atk:1,agi:1,res:0},공명:{res:5,men:2,atk:2,agi:1,def:0}}[kind];
  const tot=Object.values(w).reduce((a,b)=>a+b,0);
  const p=S.pts;
  STATS.forEach(s=>{ const n=Math.floor(p*w[s.k]/tot); S.alloc[s.k]+=n; S.pts-=n; });
  while(S.pts>0){ S.alloc.atk++; S.pts--; }
  toast(`${kind} 프리셋으로 분배했습니다.`,"good"); renderMain(); renderNav(); renderTop(); save();
}
function resetAlloc(){
  const cost=2000*S.course;
  if(S.rin<cost){ toast("륜이 부족합니다.","bad"); return; }
  S.rin-=cost;
  STATS.forEach(s=>{ S.pts+=S.alloc[s.k]; S.alloc[s.k]=0; });
  toast("망각의 차를 마셨습니다. 분배한 포인트가 돌아왔습니다.","good");
  renderMain(); renderNav(); renderTop(); save();
}
function setTend(t){ S.tendency=t; renderMain(); renderNav(); renderTop(); save(); }

/* 수행 단계 상승 시 포인트 */
const _gainExp=gainExp;
gainExp=function(n){
  const before=S.lvl; const r=_gainExp(n);
  if(S.lvl>before) S.pts+=(S.lvl-before)*2;
  return r;
};

/* ═══════════════════════════════════════════════════
   화면 — 석탑 · 결계의 탑 · 업귀 토벌 · 연무제
   ═══════════════════════════════════════════════════ */
function towerFoe(n){ return {hp:Math.round(42000*Math.pow(1.078,n)), dps:Math.round(900*Math.pow(1.075,n)), n:n}; }
function guardFoe(n){ return {dps:Math.round(1500*Math.pow(1.085,n)), n:n}; }

VIEWS.tower=()=>{
  const fl=(S.tower||0)+1, f=towerFoe(fl), c=C();
  const sec=f.hp/Math.max(1,c.dps);
  const canKill=sec<=60;
  const survive=c.hp/Math.max(1,f.dps*Math.max(0,1-c.def/(c.def+9000)));
  const win=canKill&&survive>=Math.min(60,sec);
  return head("끝없이 이어지는, 혼자 오르는 탑",ic("tower")+" 석탑", `최고 ${S.tower||0}층`)+`
  ${buffStrip()}
  <div class="card pad" style="margin-bottom:14px">
    <div class="spread"><div><b>석탑</b> <span class="tag g">최고 ${S.tower||0}층</span></div>
      <span class="tiny muted">도전 횟수 제한 없음</span></div>
    <div class="tiny muted" style="margin:6px 0 10px">석탑 내부에는 명계 전역의 파장을 모으는 감응 장치와 결계의 핵이 있다.
    층마다 봉인된 것이 하나씩 깨어나며, 한 번에 한 층씩 싸운다. 초당 피해가 되는 만큼 오를 수 있고, 오른 층은 줄어들지 않는다(60초 제한).</div>
    <h3 style="margin:4px 0 2px;font-size:18px">${fl}층</h3>
    <div style="font-size:16px;font-weight:600">${towerName(fl)}</div>
    <div class="tiny muted">${Math.round(fl*1.6)}단계 수준 · 체력 ${nf(f.hp)} · 초당 피해 ${nf(f.dps)}</div>
    <div class="tiny" style="color:${win?"var(--jade)":"var(--red)"};margin-top:4px">
      ${win?`약 ${sec.toFixed(1)}초에 제압 예상`:canKill?`쓰러뜨리기 전에 무너집니다 (버티는 시간 약 ${survive.toFixed(1)}초)`:"아직 버겁습니다"}</div>
    <div class="tiny muted" style="margin-top:4px">이 층 보상 <span style="color:var(--gold)">륜 ${nf(1200+fl*260)}</span> · 사리 ${fl%5===0?1:0} · 법구 1</div>
    <div class="spread" style="margin-top:12px">
      <span class="tiny muted">150층 돌파 시 칭호 「첨탑의 대마도사」 · 연등 30 · 상급 법구 상자</span>
      <div class="row">
        <button class="btn" onclick="climbTower(true)">패배할 때까지 연속 도전</button>
        <button class="btn pri" onclick="climbTower(false)">${fl}층 도전</button></div>
    </div>
  </div>
  <div class="card pad">
    <div class="sect-t">탑 기록</div>
    <table class="t">
      <tr><td>석탑</td><td>끝없이 오르는 탑</td><td style="text-align:right"><b style="color:var(--gold)">${S.tower||0}층</b></td></tr>
      <tr><td>결계의 탑</td><td>쓰러지지 않고 버티는 탑</td><td style="text-align:right"><b style="color:var(--gold)">${S.tower2||0}층</b></td></tr>
    </table>
    <div class="tiny muted" style="margin-top:8px">10층마다 연등 3, 50층마다 칭호와 추가 보상. 시련의 층(50층마다)은 탑의 문지기가 지켜 갑자기 어려워지고, 넘은 뒤 몇 층은 다시 쉬워집니다.</div>
  </div>`;
};
function towerName(n){
  const a=["봉인된 마녀의 도구","압수된 개조 무기","회수된 악인의 영혼","잔류 파장 덩어리","폭주한 마무기","업귀 잔해"];
  if(n%50===0) return `【문지기】 ${pick(["종을 지키는 것","첫 번째 봉인"])} ${n/50}`;
  return `${a[n%a.length]} ${["X","X+","XX","XX+"][Math.floor(n/30)%4]}`;
}
function climbTower(chain){
  let gained=0, logs=[], rin=0, sari=0, drops=[];
  for(let k=0;k<(chain?80:1);k++){
    const fl=(S.tower||0)+1, f=towerFoe(fl), c=C();
    const sec=f.hp/Math.max(1,c.dps);
    const mit=Math.max(0,1-c.def/(c.def+9000));
    const survive=c.hp/Math.max(1,f.dps*mit);
    const boss=fl%50===0;
    const win = sec<=60 && survive>=Math.min(60,sec) && (!boss||sec<=45);
    logs.push(`<span class="${win?"s":"h"}">${fl}층 ${towerName(fl)}</span> — 제압 ${sec<=60?sec.toFixed(1)+"초":"실패"} / 버팀 ${survive.toFixed(1)}초 → ${win?"돌파":"패배"}`);
    if(!win) break;
    S.tower=fl; gained++;
    rin+=1200+fl*260; if(fl%5===0) sari++; S.mat.가루+=2;
    if(fl%3===0) drops.push(mkGear(Math.round(fl*1.4),undefined,true));
    if(fl%10===0) S.lotus+=3;
    if(!chain) break;
  }
  if(gained){ gainRin(rin); S.sari+=sari; drops.forEach(d=>S.bag.push(d)); gainExp(260*gained); addMark(6*Math.min(5,gained)); }
  damageHP(rnd(4,14)); damageSN(rnd(3,10));
  modal("석탑",`
    <div class="log">${logs.join("<br>")}</div>
    <div class="card pad" style="margin-top:12px">
      <div class="tiny" style="color:${gained?"var(--jade)":"var(--red)"}">
        ${gained?`${gained}개 층 돌파 · 최고 ${S.tower}층 · 륜 +${nf(rin)}${sari?` · 사리 +${sari}`:""}${drops.length?` · 법구 ${drops.length}개`:""}`
          :"한 층도 오르지 못했습니다. 법구를 각인하거나 능력치를 분배해 보세요."}</div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn pri" onclick="closeModal();renderMain()">확인</button>
      ${gained?`<button class="btn" onclick="closeModal();climbTower(true)">이어서 도전</button>`:""}</div>`,"wide");
  renderTop(); renderNav(); save();
}

VIEWS.guard=()=>{
  const fl=(S.tower2||0)+1, f=guardFoe(fl), c=C();
  const mit=Math.max(0,1-c.def/(c.def+9000))*(S.tendency==="수호"?.8:1);
  const sustain=c.hp*c.heal/Math.max(1,f.dps*mit);
  const win=sustain>=30;
  return head("쓰러뜨리지 않고 버티는 탑",ic("shield")+" 결계의 탑", `최고 ${S.tower2||0}층`)+`
  ${buffStrip()}
  <div class="card pad" style="margin-bottom:14px">
    <div class="spread"><div><b>결계의 탑</b> <span class="tag g">최고 ${S.tower2||0}층</span></div>
      <span class="tiny muted">도전 횟수 제한 없음</span></div>
    <div class="tiny muted" style="margin:6px 0 10px">끝없이 몰려오는 업귀 떼에서 30초 동안 결계를 지키면 한 층을 오른다.
    적을 쓰러뜨릴 수 없으므로 화력보다 생명력·방어력·치유·보호막이 중요하다. 성향과 관계없이 기록은 하나이며, 오른 층은 줄어들지 않는다.</div>
    <div class="card pad" style="background:var(--s1);margin-bottom:10px">
      <b>수호자의 가호 ${S.tendency==="수호"?'<span class="tag g">적용</span>':'<span class="tag">미적용</span>'}</b>
      <div class="tiny muted">수호 성향은 받는 공격 20% 감소 · 치유·보호막 위력 ×1.4. 법구와 주문을 바꾸지 않고 그대로 도전할 수 있습니다.</div>
    </div>
    <h3 style="margin:4px 0 2px;font-size:18px">${fl}층</h3>
    <div style="font-size:16px;font-weight:600">${pick(["쇠사슬 늑대 무리","불 붙은 인형 떼","잿빛 손들","목소리 없는 군중"])} ${["X","X+","XX"][Math.floor(fl/25)%3]}</div>
    <div class="tiny muted">${Math.round(fl*1.4)}단계 수준 · 30초 버티기 · 적 초당 피해 ${nf(f.dps)}</div>
    <div class="tiny" style="color:${win?"var(--jade)":"var(--red)"};margin-top:4px">
      ${win?`30초를 버틸 수 있습니다 (예상 ${Math.min(99,sustain).toFixed(1)}초)`:`아직 버겁습니다 — 약 ${sustain.toFixed(1)}초`}</div>
    <div class="tiny muted" style="margin-top:4px">이 층 보상 <span style="color:var(--gold)">륜 ${nf(700+fl*210)}</span></div>
    <div class="spread" style="margin-top:12px">
      <span class="tiny muted">100층 돌파 시 칭호 「무너지지 않는 방벽」 · 연등 30</span>
      <div class="row">
        <button class="btn" onclick="climbGuard(true)">버티지 못할 때까지 연속 도전</button>
        <button class="btn pri" onclick="climbGuard(false)">${fl}층 도전</button></div>
    </div>
  </div>`;
};
function climbGuard(chain){
  let gained=0, logs=[], rin=0, drops=[];
  for(let k=0;k<(chain?80:1);k++){
    const fl=(S.tower2||0)+1, f=guardFoe(fl), c=C();
    const mit=Math.max(0,1-c.def/(c.def+9000))*(S.tendency==="수호"?.8:1);
    const sustain=c.hp*c.heal/Math.max(1,f.dps*mit);
    const win=sustain>=30;
    logs.push(`<span class="${win?"s":"h"}">${fl}층</span> — 버틴 시간 ${Math.min(99,sustain).toFixed(1)}초 / 30초 → ${win?"방어 성공":"붕괴"}`);
    if(!win) break;
    S.tower2=fl; gained++; rin+=700+fl*210;
    if(fl%4===0) drops.push(mkGear(Math.round(fl*1.3),undefined,true));
    if(fl%10===0) S.lotus+=3;
    if(!chain) break;
  }
  if(gained){ gainRin(rin); drops.forEach(d=>S.bag.push(d)); gainExp(220*gained); addMark(6*Math.min(5,gained)); }
  damageHP(rnd(5,16));
  modal("결계의 탑",`<div class="log">${logs.join("<br>")}</div>
    <div class="card pad" style="margin-top:12px"><div class="tiny" style="color:${gained?"var(--jade)":"var(--red)"}">
      ${gained?`${gained}개 층 돌파 · 최고 ${S.tower2}층 · 륜 +${nf(rin)}${drops.length?` · 법구 ${drops.length}개`:""}`
        :"결계가 먼저 무너졌습니다. 방어·정신력을 올리거나 수호 성향으로 바꿔 보세요."}</div></div>
    <div class="row" style="margin-top:12px"><button class="btn pri" onclick="closeModal();renderMain()">확인</button>
      ${gained?`<button class="btn" onclick="closeModal();climbGuard(true)">이어서 도전</button>`:""}</div>`,"wide");
  renderTop(); renderNav(); save();
}

VIEWS.wboss=()=>{
  const b=WBOSS[S.wb.boss%WBOSS.length];
  const goal=122900000000;
  const p=clamp(S.wb.total/goal*100,0,100);
  const c=C();
  const mine=Math.round(c.dps*30*(1+mod("boss")||0));
  const board=wbBoard();   /* 모브 없음 — 연결되면 실제 러너, 아니면 나 혼자 */
  return head("종소리가 멎기 전에",ic("oni")+" 업귀 토벌", `이번 주 · ${6-(cal().day%7)}일 남음`)+`
  ${buffStrip()}
  <div class="card pad" style="margin-bottom:14px">
    <div class="row" style="align-items:flex-start">
      <div style="font-size:40px">${b.e}</div>
      <div style="flex:1">
        <div class="tiny" style="color:var(--gold)">이번 주 업귀 · Ⅴ등급 재해</div>
        <h3 style="margin:2px 0 4px;font-size:19px">${b.n}</h3>
        <div class="tiny muted">${b.d}</div>
      </div></div>
    <div class="bar hp" style="margin:12px 0 4px"><i style="width:${p}%"></i></div>
    <div class="spread tiny muted"><span>${nf(S.wb.total)} / ${nf(goal)}</span><span>참여 886명</span></div>
    <hr class="hr">
    <div class="spread">
      <div><b>도전권 ${S.wb.tickets} / 3</b> <span class="tiny muted">· 다음 충전 ${hhmm(S.wb.next)}</span>
        <div class="tiny muted">한 번 도전하면 30초 동안 공격합니다. 예상 피해 <b style="color:var(--gold)">${nf(mine)}</b></div></div>
      <button class="btn pri" ${S.wb.tickets<1?"disabled":""} onclick="hitBoss()">30초 공격</button>
    </div>
    <div class="tiny muted" style="margin-top:8px">이번 주 내 피해 <b style="color:var(--gold)">${nf(S.wb.dmg)}</b> (${3-S.wb.tickets}회).
    보상: 토벌하는 순간 도전한 학생 모두에게 연등 20과 업연의 알. 다음 주에 참여 연등 10과 피해 상위 1%·10%·50% 추가 보상.</div>
  </div>
  <div class="card pad">
    <div class="spread"><div class="sect-t" style="margin:0">업귀 피해 순위</div>
      <span class="tiny muted">내 순위 ${wbMyRank()}</span></div>
    <div class="tiny muted" style="margin-bottom:6px">이번 주(월요일 KST 0시~) 업귀에 입힌 피해 합계입니다. 같은 기록이면 먼저 달성한 학생이 앞섭니다.</div>
    <table class="t">
      ${board.map((r,i)=>`<tr${r[2]?' style="background:var(--s2)"':""}><td style="width:30px">${i+1}</td>
        <td>${r[2]?`<b style="color:var(--gold)">${esc(r[0])}</b>`:esc(r[0])}</td>
        <td style="text-align:right">${nf(r[1])}</td></tr>`).join("")}
      ${board.length?"":`<tr><td colspan="3" class="tiny muted" style="text-align:center">아직 업귀에 입힌 피해가 없습니다</td></tr>`}
    </table>
    ${sbOn&&sbOn()?"":`<div class="tiny muted" style="margin-top:6px">공유 기록을 연결하면 다른 러너의 피해량과 함께 줄을 섭니다.</div>`}
  </div>`;
};
function hitBoss(){
  if(S.wb.tickets<1) return;
  S.wb.tickets--;
  const c=C();
  const dmg=Math.round(c.dps*30*(1+mod("boss"))*(0.92+Math.random()*0.18));
  S.wb.dmg+=dmg; S.wb.total+=dmg;
  const rin=gainRin(Math.round(dmg/3000)+400), ex=gainExp(600);
  addMark(10);
  if(Math.random()<.35) S.pets.eggs++;
  modal("업귀 토벌",`
    <div style="text-align:center;padding:8px 0">
      <div class="tiny muted">30초 동안 입힌 피해</div>
      <div style="font-size:34px;font-weight:600;color:var(--gold)">${nf(dmg)}</div></div>
    <div class="card pad"><div class="tiny" style="color:var(--jade)">
      륜 +${nf(rin)} · 경험치 +${nf(ex)} · 이번 주 누적 ${nf(S.wb.dmg)}</div></div>
    <div class="row" style="margin-top:12px">
      <button class="btn pri" onclick="closeModal();renderMain()">확인</button>
      ${S.wb.tickets>0?`<button class="btn" onclick="closeModal();hitBoss()">한 번 더 (${S.wb.tickets})</button>`:""}</div>`);
  renderTop(); renderNav(); save();
}

VIEWS.arena=()=>{
  const r=S.arena.round, sn=S.arena.season||1;
  const foe=ARENAFOES[Math.min(r,15)-1]||"???";
  const c=C();
  const fhp=Math.round(30000*Math.pow(1.45,r)*Math.pow(2.6,sn-1)), fdps=Math.round(800*Math.pow(1.38,r)*Math.pow(2.2,sn-1));
  const sec=fhp/Math.max(1,c.dps);
  const mit=Math.max(0,1-c.def/(c.def+9000))*(S.tendency==="수호"?.8:1);
  const sust=c.hp*c.heal/Math.max(1,fdps*mit*1.5);
  const killOK=sec<=45, holdOK=sust>=45;
  return head("라이벌과 차례로 겨루는",ic("arena")+" 연무제", `제 ${sn}회 · 최고 기록 ${S.arena.best} / 15`)+`
  ${buffStrip()}
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="tiny" style="color:var(--gold)">${r>15?"완주":r+"회전"}</div>
      ${r>15?`<h3 style="margin:4px 0">모든 상대를 꺾었습니다</h3>
        <div class="tiny muted">다음 연무제가 열리기를 기다립니다.</div>
        <button class="btn" style="margin-top:10px" onclick="S.arena.season=(S.arena.season||1)+1;S.arena.round=1;renderMain()">다음 연무제 참가</button>`
      :`<h3 style="margin:4px 0 2px;font-size:19px">${foe}</h3>
      <div class="tiny muted">${r<=11?"졸업생 · 조교":"사무전 교직원"} · ${Math.round(r*6.5*sn)}단계 수준${sn>1?` · <span style="color:var(--gold)">제 ${sn}회</span>`:""}</div>
      <div class="quote" style="margin:8px 0">${ARENALINE[Math.min(r,15)-1]}</div>
      <div class="tiny"><b>처치</b> <span style="color:${killOK?"var(--jade)":"var(--red)"}">${killOK?`승산 높음 — 약 ${sec.toFixed(1)}초`:`승산 낮음 — 45초 안에 체력의 약 ${Math.round(c.dps*45/fhp*100)}%`}</span></div>
      <div class="tiny"><b>버티기</b> <span style="color:${holdOK?"var(--jade)":"var(--red)"}">${holdOK?"45초를 버틸 수 있습니다":`약 ${sust.toFixed(1)}초`}</span>
        <span class="muted">수호·축복 성향 전용 · 상대 공격 ×1.5 · 45초를 버티거나 그 전에 쓰러뜨리면 승리</span></div>
      <div class="tiny muted" style="margin-top:4px">보상 · 순위 · 대기시간은 두 방식이 같습니다</div>
      <div class="row" style="margin-top:10px">
        <button class="btn pri" onclick="arenaGo('kill')">처치로 도전</button>
        <button class="btn" onclick="arenaGo('hold')">버티기로 도전</button></div>`}
    </div>
    <div class="card pad">
      <div class="sect-t">대진표</div>
      <table class="t">
        ${ARENAFOES.map((n,i)=>{
          const idx=i+1;
          return `<tr><td style="width:28px">${idx}</td>
            <td>${idx<r?n:idx===r?`<b>${n}</b>`:"???"}</td>
            <td style="text-align:right">${idx<r?'<span class="tag j">승리</span>'
              :idx===r?'<span class="tag g">다음 상대</span>':`<span class="tiny muted">${Math.round(idx*6.5)}단계</span>`}</td></tr>`}).join("")}
      </table>
    </div>
  </div>
  <div class="card pad">
    <div class="sect-t">결투 준비</div>
    <div class="row"><span class="tiny muted">성향</span>
      <span class="seg"><button class="${S.tendency==="파괴"?"on":""}" onclick="setTend('파괴')">파괴</button>
        <button class="${S.tendency==="수호"?"on":""}" onclick="setTend('수호')">수호</button></span>
      <span class="tiny muted">· 바꾼 뒤 위의 승산이 다시 계산됩니다</span>
      <button class="btn sm" style="margin-left:auto" onclick="go('gear')">법구 보기</button>
      <button class="btn sm" onclick="go('stats')">능력치 보기</button></div>
  </div>`;
};
function arenaGo(mode){
  const r=S.arena.round;
  const c=C();
  const sn=S.arena.season||1;
  const fhp=Math.round(30000*Math.pow(1.45,r)*Math.pow(2.6,sn-1)), fdps=Math.round(800*Math.pow(1.38,r)*Math.pow(2.2,sn-1));
  const sec=fhp/Math.max(1,c.dps);
  const mit=Math.max(0,1-c.def/(c.def+9000))*(S.tendency==="수호"?.8:1);
  const sust=c.hp*c.heal/Math.max(1,fdps*mit*(mode==="hold"?1.5:1));
  const win = mode==="kill" ? (sec<=45 && sust>=Math.min(45,sec)) : (sust>=45 || sec<=45);
  damageHP(rnd(4,14)); damageSN(rnd(3,10));
  let rew="";
  if(win){
    S.arena.round++; S.arena.best=Math.max(S.arena.best,r);
    const rin=gainRin((900+r*520)*sn), ex=gainExp((500+r*240)*sn);
    S.lotus+=1; addMark(10);
    const drop=mkGear(Math.round(r*4+S.lvl*.4+sn*20),undefined,true); S.bag.push(drop);
    rew=`륜 +${nf(rin)} · 경험치 +${nf(ex)} · 연등 +1 · 법구 「${drop.name}」`;
    if(S.arena.round>15){
      S.arena.season=sn+1; S.arena.round=1;
      S.lotus+=30; S.sari+=10;
      const prize=mkGear(Math.round(S.lvl+sn*24), 4); S.bag.push(prize);
      rew+=`<br><b style="color:var(--gold)">${sn}회 연무제 완주 · 연등 +30 · 사리 +10 · 전설 법구 「${prize.name}」</b><br>${sn+1}회 연무제가 열립니다. 상대가 한층 강해집니다.`;
    }
  }
  modal(`연무제 ${r}회전 · ${ARENAFOES[r-1]}`,`
    <div class="log">
      <span class="turn">${mode==="kill"?"처치 과제 · 45초 제한":"버티기 과제 · 45초"}</span><br>
      내 초당 피해 <b>${nf(c.dps)}</b> · 상대 체력 ${nf(fhp)} → 제압까지 ${sec<=45?sec.toFixed(1)+"초":"45초 안에 불가"}<br>
      내 생명력 <b>${nf(c.hp)}</b> · 상대 초당 피해 ${nf(fdps)} → 버틴 시간 ${Math.min(99,sust).toFixed(1)}초<br>
      <span class="${win?"s":"h"}">■ ${win?"승리":"패배"}</span>
    </div>
    ${win?`<div class="card pad" style="margin-top:12px"><div class="tiny" style="color:var(--jade)">${rew}</div></div>`
      :`<div class="tiny" style="margin-top:10px;color:var(--red)">${ARENAFOES[r-1]}에게 막혔습니다. 법구를 각인하거나 성향을 바꿔 다시 도전할 수 있습니다.</div>`}
    <div class="row" style="margin-top:12px"><button class="btn pri" onclick="closeModal();renderMain()">확인</button>
      ${win&&S.arena.round<=15?`<button class="btn" onclick="closeModal();arenaGo('${mode}')">다음 상대</button>`:""}</div>`,"wide");
  renderTop(); renderNav(); save();
}

/* ═══════════════════════════════════════════════════
   화면 — 사역귀 · 낚시 · 약초밭 · 식당
   ═══════════════════════════════════════════════════ */
VIEWS.pets=()=>{
  const h=S.pets.hatch;
  const out=S.pets.list.filter(p=>p.out).length;
  const ready=S.pets.list.filter(p=>p.out&&S.t>=p.out.end).length;
  return head("사무전 지하 사육장",ic("egg")+" 사역귀 사육장", `보유 ${S.pets.list.length}마리 · 알 ${S.pets.eggs}개`)+`
  ${buffStrip()}
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="sect-t">부화기</div>
      <div class="tiny muted" style="margin-bottom:8px">보관 중인 알 ${S.pets.eggs}개. 업귀 토벌·의뢰·파견·매점에서 얻습니다.
      알을 품으면 활동할수록(수업·의뢰·수행·조제 등) 진행도가 오르고, 다 차면 파장 없이 깨어납니다.</div>
      ${h?`
        <div class="spread"><b>품고 있는 알</b><span class="tiny muted">${Math.floor(h.prog)} / ${h.need} (${Math.round(h.prog/h.need*100)}%)</span></div>
        <div class="bar" style="margin:5px 0 8px"><i style="width:${clamp(h.prog/h.need*100,0,100)}%"></i></div>
        <div class="tiny muted">부화 효율 ×${(1.3+petOpt("hatch")).toFixed(2)} · 활동으로 얻는 기여도 × 부화 효율만큼 오릅니다</div>
        <div class="row" style="margin-top:9px">
          <button class="btn pri sm" onclick="hatchNow()">파장으로 바로 깨우기 · ${nf(Math.round(Math.max(0,h.need-h.prog)*4))}</button>
          <button class="btn sm" onclick="S.pets.hatch=null;S.pets.eggs++;renderMain()">품기 취소</button></div>`
      :`<button class="btn pri" ${S.pets.eggs<1?"disabled":""} onclick="startHatch()">알 품기</button>`}
      <hr class="hr">
      <div class="tiny muted">부화 효율 <b style="color:var(--gold)">×${(1.3+petOpt("hatch")).toFixed(2)}</b> · 사역귀를 가지고 있을수록 다음 알이 더 많은 기여도를 요구합니다.</div>
    </div>
    <div class="card pad">
      <div class="sect-t">파견</div>
      <div class="tiny muted" style="margin-bottom:8px">동행하지 않는 사역귀를 정해진 시간 동안 내보내면 재료·륜·사리, 가끔 알을 물어 옵니다.</div>
      <div class="row">${DISPATCH.map(d=>`<button class="btn sm" onclick="dispatchAll(${d.h})">${d.n} 전체 파견</button>`).join("")}</div>
      <div class="row" style="margin-top:9px">
        <button class="btn pri sm" ${ready?"":"disabled"} onclick="recallAll()">돌아온 사역귀 모두 귀환 ${ready?`(${ready})`:""}</button>
        <span class="tiny muted">파견 중 ${out}마리</span></div>
      <hr class="hr">
      <div class="sect-t">사역귀 효과</div>
      <ul class="tiny muted" style="margin:0;padding-left:16px;line-height:1.8">
        <li><b>보유 효과</b> · 가지고 있는 모든 사역귀의 능력 보너스가 동행·파견 여부와 관계없이 항상 적용됩니다.</li>
        <li><b>동행 효과</b> · 목록 맨 위의 사역귀가 전투에 함께 나갑니다.</li>
        <li><b>파견</b> · 파견 중에는 경험치와 유대가 함께 오릅니다.</li>
      </ul>
    </div>
  </div>
  <div class="grid g4">
    ${S.pets.list.map((p,i)=>{
      const G=GRADES[p.g];
      const done=p.out&&S.t>=p.out.end;
      return `<div class="sub" style="border-color:${p.out?"var(--s4)":G.c}">
        <div class="spread"><div><b>${p.e} ${esc(p.nick||p.n)}</b> <span class="tiny" style="color:var(--gold)">Lv ${p.lv}</span></div>
          ${gradeTag(p.g)}</div>
        <div class="tiny muted">${p.d}</div>
        <div class="tiny" style="color:var(--jade);margin:5px 0 3px">${p.kn} +${p.v}%</div>
        <div class="tiny muted">${p.exp} / ${p.lv*220}</div>
        <div class="bar" style="margin:3px 0 6px"><i style="width:${clamp(p.exp/(p.lv*220)*100,0,100)}%"></i></div>
        <div class="spread tiny muted"><span>유대 <span style="color:var(--gold)">${BONDS[Math.min(4,Math.floor(p.bond/21))]}</span></span><span>${p.bond} / 100</span></div>
        <div class="bar jd" style="margin:3px 0 8px"><i style="width:${p.bond}%"></i></div>
        ${p.out?`<div class="tiny muted">파견 중 · ${p.area}<br>${done?'<span style="color:var(--jade)">돌아올 준비가 되었습니다</span>':`${hhmm(p.out.end-S.t)} 남음`}</div>
          <button class="btn sm ${done?"pri":""}" style="margin-top:6px" onclick="recall(${i})">${done?"귀환":"불러들이기"}</button>`
        :`<select class="inp" style="font-size:11.5px;padding:4px 7px" onchange="S.pets.list[${i}].area=this.value;save()">
            ${DAREA.map(a=>`<option ${p.area===a?"selected":""}>${a}</option>`).join("")}</select>
          <div class="row" style="margin-top:6px">
            ${DISPATCH.map(d=>`<button class="btn sm" onclick="dispatch(${i},${d.h})">${d.h}h</button>`).join("")}</div>
          <div class="row" style="margin-top:6px">
            <button class="btn sm ghost" onclick="feedPet(${i})">먹이 ${nf(Math.round(9000*(1+p.lv*.2)))}</button>
            <button class="btn sm ghost" onclick="namePet(${i})">이름 짓기</button>
            ${i>0?`<button class="btn sm ghost" onclick="leadPet(${i})">동행</button>`:'<span class="tag g">동행 중</span>'}</div>`}
      </div>`}).join("")||'<div class="tiny muted">사역귀가 없습니다. 알을 품어 보세요.</div>'}
  </div>`;
};
function dispatchAll(h){ let n=0; S.pets.list.forEach((p,i)=>{ if(!p.out&&i>0){ dispatch(i,h); n++; } });
  toast(n?`${n}마리를 ${h}시간 파견했습니다.`:"파견할 사역귀가 없습니다 (동행 중인 1마리는 제외)."); }
function leadPet(i){ const p=S.pets.list.splice(i,1)[0]; S.pets.list.unshift(p); toast(`${p.n}이(가) 동행합니다.`); renderMain(); save(); }
function namePet(i){
  const p=S.pets.list[i];
  modal("이름 짓기",`<label class="f">${p.e} ${p.n}에게 붙일 이름</label>
    <input class="inp" id="pn2" maxlength="10" value="${esc(p.nick||"")}" placeholder="${p.n}">
    <div class="row" style="margin-top:12px">
      <button class="btn pri" onclick="S.pets.list[${i}].nick=document.getElementById('pn2').value.trim();closeModal();renderMain();save()">짓기</button>
      <button class="btn" onclick="closeModal()">취소</button></div>`);
}

VIEWS.fishv=()=>{
  return head("제7구역 · 검은 바다",ic("fishing")+" 낚시", `숙련도 Lv ${S.fish.skill}`)+`
  <div class="card pad" style="margin-bottom:14px">
    <div class="tiny muted">명계에는 아침이 없지만 제7구역에는 새벽 시장이 있다. 정해진 시간이 되면 항구의 전자 범종이 울리고,
    먼바다에서 돌아온 어선들이 하나둘 부두에 닿는다. 검은 바닷물 위로 네온사인과 홍등이 길게 찢어져 흔들린다.</div>
    <div class="row" style="margin-top:12px">
      <button class="btn pri" onclick="openFish()">낚싯대를 던진다</button>
      <span class="tiny muted">숙련도 ${S.fish.exp} / ${S.fish.skill*90} · 어물 ${S.mat.어물} · 약초 ${S.mat.약초}</span>
    </div>
  </div>
  <div class="card pad">
    <div class="sect-t">올라오는 것</div>
    <div class="grid g3">
      ${FISHES.map(f=>`<div class="sub"><div class="spread"><b>${f.e} ${f.n}</b>
        <span class="tiny muted">${(f.w/FISHES.reduce((a,x)=>a+x.w,0)*100).toFixed(0)}%</span></div>
        <div class="tiny" style="color:var(--jade);margin-top:4px">${f.y} +${f.s} · 대략 ${nf(f.p)}륜 값</div></div>`).join("")}
    </div>
    <div class="tiny muted" style="margin-top:10px">오래된 어부들은 심해에서 정체를 알 수 없는 파장이 감지되는 날에는 출항하지 않는다. 이유를 물으면 대부분 비슷한 대답을 한다 — "바다는 죽은 것까지 품고 있으니까."</div>
  </div>`;
};

VIEWS.farm=()=>{
  const o=S.farm.order, oc=o?CROPS.find(c=>c.id===o.id):null;
  const w=WEATHERS[S.weather];
  const ready=S.farm.plots.filter(p=>p&&p.left<=0).length;
  return head("약초 온실 뒤뜰",ic("herb")+" 약초밭", `원예 숙련도 Lv ${S.farm.skill}`)+`
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">텃밭</div>
        <span class="tiny muted">지금 ${w.i} ${w.n} · 비료 ${S.farm.fert}개</span></div>
      <div class="row" style="margin-bottom:8px">
        <button class="btn sm" onclick="waterAll()">모두 물 주기</button>
        <button class="btn sm ${ready?"pri":""}" ${ready?"":"disabled"} onclick="harvestAll()">모두 수확 ${ready?`(${ready})`:""}</button>
      </div>
      <div class="grid g3" style="gap:7px">
        ${S.farm.plots.map((p,i)=>{
          if(!p) return `<div class="sub" style="border-style:dashed;min-height:86px;display:grid;place-items:center;padding:6px">
            <button class="btn sm ghost" onclick="pickCrop(${i})">+ 심기</button></div>`;
          const c=CROPS.find(x=>x.id===p.id);
          const done=p.left<=0;
          return `<div class="sub" style="padding:8px;border-color:${done?"var(--gold2)":"var(--line)"}">
            <div style="font-size:18px;text-align:center">${done?c.e:ic("seedling")}</div>
            <div class="tiny" style="text-align:center"><b>${c.n}</b></div>
            <div class="tiny muted" style="text-align:center">${done?"다 자랐습니다":hhmm(p.left)}</div>
            <div class="bar" style="margin:4px 0"><i style="width:${(100-p.left/p.total*100).toFixed(0)}%"></i></div>
            <div class="row" style="justify-content:center;gap:4px">
              ${done?`<button class="btn sm pri" onclick="harvest(${i})">수확</button>`
                :`<button class="btn sm ghost" ${p.watered?"disabled":""} onclick="water(${i})">물</button>
                  <button class="btn sm ghost" ${p.fert?"disabled":""} onclick="fertilize(${i})">비료</button>`}
            </div></div>`}).join("")}
      </div>
      <div class="row" style="margin-top:9px">
        <span class="tiny muted">한 종류로 모두 심기</span>
        ${CROPS.map(c=>`<button class="btn sm ghost" title="${c.n}" onclick="plantAll('${c.id}')">${c.e} ${c.n}</button>`).join("")}
      </div>
      <div class="tiny muted" style="margin-top:8px">물을 주면 남은 시간 −15%, 비료는 −30%에 수확량 +1. 다 자라는 순간의 날씨에 따라 드물게 변이해 수확량이 늘어납니다.</div>
    </div>

    <div>
      <div class="card pad" style="margin-bottom:12px">
        <div class="spread"><div class="sect-t" style="margin:0">오늘의 주문</div>
          <span class="tiny muted">내일 자정에 바뀜</span></div>
        ${o?`<div class="spread" style="margin-top:4px">
          <div><b>${oc.e} ${oc.n} ${o.need}개</b> <span class="tag">텃밭</span>
            <div class="tiny muted">보유 ${o.have} / ${o.need} · 보상: 연등 1 · 비료 3 · 지식 80 · 경험치 300</div></div>
          <button class="btn ${o.done?"":"pri"} sm" ${o.done||o.have<o.need?"disabled":""} onclick="deliverOrder()">${o.done?"납품 완료":"납품"}</button></div>`:""}
      </div>
      <div class="card pad" style="margin-bottom:12px">
        <div class="sect-t">날씨 · 하늘 예보</div>
        <div class="row">${WEATHERS.map((x,i)=>`<span class="buffchip" style="${i===S.weather?"border-color:var(--gold2);color:var(--gold)":""}">${x.i} ${x.n}</span>`).join("")}</div>
        <div class="tiny muted" style="margin-top:8px">다음 변화까지 ${hhmm(S.wNext)} · 지금 효과 ${w.d}</div>
      </div>
      <div class="card pad">
        <div class="sect-t">심을 수 있는 것</div>
        ${CROPS.map(c=>`<div class="spread" style="padding:5px 0;border-bottom:1px solid var(--s3)">
          <div><b>${c.e} ${c.n}</b> <span class="tiny muted">${hhmm(c.t)} · ${c.y} ${c.s}개</span>
            <div class="tiny muted">${c.d}</div></div></div>`).join("")}
      </div>
    </div>
  </div>`;
};
function pickCrop(i){
  modal("무엇을 심을까요",`<div class="grid" style="gap:8px">
    ${CROPS.map(c=>`<button class="btn" style="text-align:left" onclick="plant(${i},'${c.id}');closeModal()">
      ${c.e} <b>${c.n}</b> <span class="tiny muted">· ${hhmm(c.t)} · ${c.y} ${c.s}개 · ${c.d}</span></button>`).join("")}
  </div>`);
}

VIEWS.kitchen=()=>{
  const slot=(s,label)=>{
    const m=S.kit[s]; if(!m) return `<div class="tiny muted">${label} 칸이 비어 있습니다.</div>`;
    const d=DISHES.find(x=>x.id===m.id);
    return `<div class="spread" style="padding:4px 0"><div><span class="tag g">${label}</span> <b>${d.e} ${d.n}</b>
      <div class="tiny muted">${d.buf.map(([a,b])=>OPTNAME(a)+" +"+Math.round(b*100)+"%").join(", ")}</div></div>
      <span class="tiny muted">${hhmm(m.left)}</span></div>`;
  };
  return head("학생 식당 주방",ic("stew")+" 식당", `재료 · 약초 ${S.mat.약초} · 어물 ${S.mat.어물} · 열매 ${S.mat.열매} · 뿌리 ${S.mat.뿌리} · 꽃 ${S.mat.꽃}`)+`
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="sect-t">지금 먹은 요리</div>
      ${slot("eat","식사")}${slot("dess","디저트")}
      <div class="tiny muted" style="margin-top:8px">같은 요리를 다시 먹으면 효과 시간이 이어지고(최대 2배), 같은 칸의 다른 요리를 먹으면 효과가 바뀝니다.
      식사와 디저트는 한 칸씩 따로 적용되며 물약과도 겹칩니다.</div>
    </div>
    <div class="card pad">
      <div class="sect-t">세라핀 루 교수의 텃밭 과제</div>
      <div class="quote">"이번 주에는 텃밭에서 기른 재료로 요리를 세 번 만들어 오세요. 직접 기른 재료로 만든 것이 가장 잘 듣는답니다."</div>
      <div class="tiny muted" style="margin-top:8px">만든 요리 ${Object.values(S.kit.have).reduce((a,b)=>a+b,0)}개 · 보상은 주간 정산에 포함됩니다.</div>
    </div>
  </div>
  <div class="card pad">
    <div class="sect-t">주방 레시피 ${DISHES.length}종</div>
    <div class="grid g2">
      ${DISHES.map(d=>{
        const can=Object.keys(d.mat).every(k=>S.mat[k]>=d.mat[k]);
        return `<div class="sub">
          <div class="spread"><b>${d.e} ${d.n}</b> <span class="tag ${d.t==="식사"?"j":"v"}">${d.t}</span></div>
          <div class="tiny" style="color:var(--jade);margin:4px 0">${d.buf.map(([a,b])=>OPTNAME(a)+" +"+Math.round(b*100)+"%").join(", ")} · ${hhmm(d.dur)}</div>
          <div class="tiny muted">${d.d}</div>
          <div class="row" style="margin:7px 0 0">
            ${Object.keys(d.mat).map(k=>`<span class="buffchip" style="${S.mat[k]>=d.mat[k]?"":"color:var(--red)"}">${k} ${S.mat[k]}/${d.mat[k]}</span>`).join("")}
          </div>
          <div class="row" style="margin-top:8px">
            <button class="btn sm ${can?"pri":""}" ${can?"":"disabled"} onclick="cook('${d.id}')">1개 만들기</button>
            <button class="btn sm" ${S.kit.have[d.id]>0?"":"disabled"} onclick="eat('${d.id}')">먹기 (${S.kit.have[d.id]||0})</button>
          </div></div>`}).join("")}
    </div>
  </div>`;
};

/* ═══════════════════════════════════════════════════
   화면 — 모임 · 중개소 · 떠돌이 상인
   ═══════════════════════════════════════════════════ */
VIEWS.club=()=>{
  if(!S.club) return head("학생들이 꾸리는 모임",ic("lantern")+" 모임","가입한 모임이 없습니다")+`
    <div class="grid g3">${CLUBS.map(c=>`<div class="sub">
      <h4>${c.e} ${c.n}</h4>
      <div class="tiny muted" style="margin:5px 0 8px;min-height:40px">${c.d}</div>
      <div class="tiny" style="color:var(--jade)">모임 혜택 · ${c.b}</div>
      <button class="btn pri sm" style="margin-top:9px" onclick="joinClub('${c.id}')">가입하기</button></div>`).join("")}</div>`;
  const c=CLUBS.find(x=>x.id===S.club.id), K=S.club;
  const need=K.lv*2400;
  return head("학생들이 꾸리는 모임",ic("lantern")+" 모임", `${c.n} · Lv ${K.lv}`)+`
  <div class="card pad" style="margin-bottom:14px">
    <div class="row" style="align-items:flex-start">
      <div style="font-size:34px">${c.e}</div>
      <div style="flex:1">
        <div class="spread"><b style="font-size:16px">${c.n}</b>
          <span class="tiny muted">${K.members} / 40명 · 누구나 가입</span></div>
        <div class="bar" style="margin:6px 0 4px"><i style="width:${clamp(K.exp/need*100,0,100)}%"></i></div>
        <div class="tiny muted">${nf(K.exp)} / ${nf(need)} → Lv ${K.lv+1} · 부원 모두 ${c.b}</div>
      </div></div>
    <div class="card pad" style="background:var(--s1);margin-top:10px">
      <div class="tiny muted"><b>공지</b> · 부원 여러분의 모든 활동은 자유롭습니다. 부담 갖지 말고 하고 싶은 것만 하며, 자신의 속도로 나아가도록 합시다 :&gt;</div>
    </div>
  </div>
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="sect-t">기여하기</div>
      <div class="tiny muted" style="margin-bottom:8px">기여도가 곧 모임 경험치입니다. 하루 한 번 출석(+10), 륜 기부(하루 200점까지). 한도는 매일 자정에 초기화됩니다.</div>
      <div class="row">
        <button class="btn sm ${K.att?"":"pri"}" ${K.att?"disabled":""} onclick="clubAttend()">${K.att?"오늘 출석함":"출석하기 +10"}</button>
        <span class="tiny muted">오늘 기부 ${K.contrib} / 200</span>
      </div>
      <div class="row" style="margin-top:8px">
        ${[10,50,200].map(n=>`<button class="btn sm" onclick="clubDonate(${n})">${n}점 · ${nf(n*474)}륜</button>`).join("")}
      </div>
    </div>
    <div class="card pad">
      <div class="sect-t">모임의 의식 <span class="muted">KST 자정 초기화</span></div>
      <div class="tiny muted" style="margin-bottom:8px">하루 한 번, 부원이 모여 등롱에 불을 올립니다. 이루어진 날에는 「축복 받기」를 눌러
      <b>모임의 결속</b>(4시간 동안 지식·전리품 +5%)을 받을 수 있습니다.</div>
      <div class="row">
        <button class="btn pri sm" ${K.blessed>0?"disabled":""} onclick="clubBless()">${K.blessed>0?`축복 중 · ${hhmm(K.blessed)}`:"축복 받기"}</button>
        <span class="tiny muted">오늘 봉헌 ${18+(cal().day*3)%11}명</span></div>
    </div>
  </div>
  <div class="card pad">
    <div class="spread"><div class="sect-t" style="margin:0">주간 모임 과제</div><span class="tiny muted">${6-(cal().day%7)}일 남음</span></div>
    <div class="tiny muted" style="margin-bottom:8px">부원들이 이번 주에 한 일을 합쳐 셉니다. 목표를 채우면 그 과제 목표의 1/5 이상 보탠 부원이 각자 연등 6개를 받습니다.</div>
    ${[["의뢰 완료",S.quests.cleared,15],["탑 돌파",(S.tower||0)+(S.tower2||0),20],["요리 만들기",Object.values(S.kit.have).reduce((a,b)=>a+b,0),10]]
      .map(([n,v,g])=>`<div style="margin-bottom:8px"><div class="spread tiny"><span>${n}</span><span class="muted">${Math.min(v,g)} / ${g}회</span></div>
        <div class="bar jd" style="margin-top:3px"><i style="width:${clamp(v/g*100,0,100)}%"></i></div></div>`).join("")}
    <button class="btn sm red" style="margin-top:6px" onclick="if(confirm('모임을 탈퇴할까요?')){S.club=null;renderMain();save()}">탈퇴</button>
  </div>`;
};

let MKFILTER="전체";
VIEWS.market=()=>{
  let list=S.market.list.map((m,i)=>({...m,i}));
  if(MKFILTER!=="전체") list=list.filter(m=>SLOTS.find(s=>s.k===m.it.slot).n===MKFILTER);
  return head("제5구역 중개소",ic("tag")+" 중개소", `수수료 5~15% · ${hhmm(S.market.next)} 뒤 매물 갱신`)+`
  <div class="card pad" style="margin-bottom:12px;padding:10px 14px">
    <div class="tiny muted">판매 수수료: 5%(10만까지) · 7%(100만까지) · 10%(그 이상). 벽면에는 현상수배범의 얼굴과 용병들의 전적이 빼곡하게 떠 있고,
    테이블 하나에서는 술값을 흥정하면서 바로 옆 테이블에서는 법구값을 흥정한다.</div>
  </div>
  <div class="row" style="margin-bottom:10px">
    <span class="tiny muted">부위</span>
    <span class="seg">${["전체",...SLOTS.map(s=>s.n)].map(n=>`<button class="${MKFILTER===n?"on":""}" onclick="MKFILTER='${n}';renderMain()">${n}</button>`).join("")}</span>
    <span class="tiny muted" style="margin-left:auto">보유 륜 <b style="color:var(--gold)">${nf(S.rin)}</b></span>
    <button class="btn sm" onclick="rollMarket();renderMain()">매물 새로 보기</button>
  </div>
  <div class="card pad" style="margin-bottom:14px">
    <table class="t">
      <tr><th>법구</th><th>능력</th><th>판매자</th><th style="text-align:right">가격</th><th></th></tr>
      ${list.map(m=>{
        const it=m.it, G=GRADES[it.grade];
        const cur=S.gear[it.slot];
        const up=!cur||gearScore(it)>gearScore(cur);
        return `<tr>
          <td><b style="color:${G.c}">${esc(it.name)}${it.enh?` +${it.enh}`:""}</b>
            <div class="tiny muted">${SLOTS.find(s=>s.k===it.slot).n} Lv ${it.lv} · ${G.n}${up?' <span style="color:var(--jade)">▲ 전투력 상승</span>':""}</div></td>
          <td class="tiny" style="color:var(--jade)">${gearLine(it)}</td>
          <td class="tiny muted">${m.seller}</td>
          <td style="text-align:right"><b>${nf(m.price)}</b></td>
          <td style="text-align:right"><button class="btn sm ${S.rin>=m.price?"pri":""}" ${S.rin>=m.price?"":"disabled"} onclick="buyMarket(${m.i})">사기</button></td>
        </tr>`}).join("")||`<tr><td colspan="5" class="tiny muted">해당하는 매물이 없습니다.</td></tr>`}
    </table>
  </div>
  <div class="card pad">
    <div class="sect-t">내 법구 내놓기 <span class="muted">즉시 거래 · 수수료 차감</span></div>
    ${S.bag.length?`<table class="t">
      ${[...S.bag].sort((a,b)=>gearScore(b)-gearScore(a)).slice(0,16).map(it=>{
        const gross=Math.round(gearScore(it)*1.35+it.lv*120);
        const feeR=gross<=100000?.05:gross<=1000000?.07:.10;
        return `<tr><td><b style="color:${GRADES[it.grade].c}">${esc(it.name)}${it.enh?` +${it.enh}`:""}</b>
          <div class="tiny muted">${SLOTS.find(s=>s.k===it.slot).n} Lv ${it.lv}</div></td>
          <td class="tiny" style="color:var(--jade)">${gearLine(it)}</td>
          <td style="text-align:right" class="tiny muted">수수료 ${Math.round(feeR*100)}%</td>
          <td style="text-align:right"><b>${nf(Math.round(gross*(1-feeR)))}</b></td>
          <td style="text-align:right"><button class="btn sm" onclick="listMine(${it.id})">내놓기</button></td></tr>`}).join("")}
    </table>`:'<div class="tiny muted">바랑에 법구가 없습니다.</div>'}
  </div>`;
};

VIEWS.merchant=()=>{
  const day=cal().day;
  const stock=[0,1,2,3].map(i=>{
    const g=(day*7+i*13)%100>80?3:(day*5+i*7)%100>50?2:1;
    const it=mkGear(Math.max(3,S.lvl+rnd(-3,6)),g); it.isNew=false;
    return {it, price:Math.round(gearScore(it)*1.05+300)};
  });
  if(!S._merch||S._merchDay!==day){ S._merch=stock; S._merchDay=day; }
  return head("골목 끝에 선 수레",ic("luggage")+" 떠돌이 상인", `오늘의 물건 · 자정에 바뀜`)+`
  <div class="card pad" style="margin-bottom:14px">
    <div class="quote">"오늘은 이것뿐이야. 내일은 다른 골목에 있을 거고, 그 골목이 내일도 거기 있을지는 나도 몰라."</div>
  </div>
  <div class="grid g4" style="margin-bottom:14px">
    ${S._merch.map((m,i)=>{
      const it=m.it, G=GRADES[it.grade];
      return `<div class="sub" style="border-color:${G.c}">
        <div class="spread"><span class="tiny muted">${SLOTS.find(s=>s.k===it.slot).e} ${SLOTS.find(s=>s.k===it.slot).n}</span>${gradeTag(it.grade)}</div>
        <b style="color:${G.c}">${esc(it.name)}</b>
        <div class="tiny muted">Lv ${it.lv} · 전투력 ${nf(gearScore(it))}</div>
        <div class="tiny" style="color:var(--jade);margin:5px 0 8px">${gearLine(it)}</div>
        <button class="btn pri sm" ${S.rin>=m.price?"":"disabled"} onclick="buyMerch(${i})">${nf(m.price)}륜에 사기</button>
      </div>`}).join("")}
  </div>
  <div class="card pad">
    <div class="sect-t">잡화</div>
    <div class="grid g3">
      <div class="sub"><b>업연의 알</b><div class="tiny muted">사역귀가 되는 알. 품는 데 시간이 걸립니다.</div>
        <button class="btn sm pri" style="margin-top:8px" onclick="buyMisc('egg')">12,000륜</button></div>
      <div class="sub"><b>비료 5개</b><div class="tiny muted">약초밭 작물의 성장 시간을 30% 줄입니다.</div>
        <button class="btn sm pri" style="margin-top:8px" onclick="buyMisc('fert')">3,000륜</button></div>
      <div class="sub"><b>부적가루 40</b><div class="tiny muted">법구 각인에 쓰입니다.</div>
        <button class="btn sm pri" style="margin-top:8px" onclick="buyMisc('dust')">8,000륜</button></div>
    </div>
  </div>`;
};
function buyMerch(i){
  const m=S._merch[i];
  if(S.rin<m.price){ toast("륜이 부족합니다.","bad"); return; }
  S.rin-=m.price; m.it.isNew=true; S.bag.push(m.it); S._merch.splice(i,1);
  toast(`${m.it.name}을(를) 샀습니다.`,"good"); renderTop(); renderMain(); save();
}
function buyMisc(k){
  const c={egg:12000,fert:3000,dust:8000}[k];
  if(S.rin<c){ toast("륜이 부족합니다.","bad"); return; }
  S.rin-=c;
  if(k==="egg"){ S.pets.eggs++; toast("업연의 알 +1","good"); }
  if(k==="fert"){ S.farm.fert+=5; toast("비료 +5","good"); }
  if(k==="dust"){ S.mat.가루+=40; toast("부적가루 +40","good"); }
  renderTop(); renderMain(); save();
}

/* ═══════════ 의뢰·시험 보상에 법구 추가 ═══════════ */
const _runQuest=runQuest;
runQuest=function(stage,party){
  _runQuest(stage,party);
  const last=S.quests.log[0];
  if(last && last.win && Math.random()<(0.45+mod("loot"))){
    const it=mkGear(Math.round(stage*1.2+S.lvl*.3),undefined,true); S.bag.push(it);
    toast(`전리품 · <b style="color:${GRADES[it.grade].c}">${it.name}</b>`,"good");
  }
  if(Math.random()<.12) S.pets.eggs++;
};

/* ═══════════ 지도에 새 장소 ═══════════ */
PLACES.push(
 {id:"farmp", n:"약초 온실", e:ic("herb"), x:6,  y:36, view:"farm"},
 {id:"pier",  n:"부두",      e:ic("fishing"), x:34, y:92, view:"fishv"},
 {id:"pen",   n:"사육장",    e:ic("egg"), x:92, y:48, view:"pets"},
 {id:"hall",  n:"학생 식당", e:ic("stew"), x:62, y:70, view:"kitchen"},
);

/* 광장 바로가기 보강 */
const _plaza=VIEWS.plaza;
VIEWS.plaza=()=>{
  let h=_plaza();
  h=h.replace('<button class="btn sm" onclick="go(\'outing\')">구역 나들이</button>',
    `<button class="btn sm" onclick="go('outing')">구역 나들이</button>
     <button class="btn sm" onclick="go('tower')">석탑</button>
     <button class="btn sm" onclick="go('wboss')">업귀 토벌</button>
     <button class="btn sm" onclick="go('gear')">법구</button>`);
  return h;
};

/* ═══════════ 부팅 ═══════════ */
const _boot=boot;
boot=function(){ ensureV2(); _boot(); };

/* 업귀 피해 순위 — 모브 없이, 연결되면 실제 러너로 채웁니다(part6). */
function wbBoard(){ return S.wb.dmg>0 ? [[S.name, S.wb.dmg, true]] : []; }
function wbMyRank(){ return S.wb.dmg>0 ? "기록 있음" : "—"; }
