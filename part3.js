"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 3
   기록실 · 랭킹 · 거처 · 휴게실 · 세계관
   경매 · 매점 확장 · 사역귀 용품점 · 실시간 의뢰 일지
   ═══════════════════════════════════════════════════ */

/* ─── 몬스터 도감 ─── */
const MONS=[
 {n:"죄업에 잠식된 악인", e:ic("blood"), w:"제1~7구역", d:"죄를 반복해 영혼 표면에 검은 반점이 생긴 자."},
 {n:"폭주한 마무기",      e:ic("sword"), w:"제3구역",   d:"장인의 명령 없이 사람을 공격하는 불법 개조 무기."},
 {n:"영혼 밀매상",        e:ic("chains"), w:"제6구역",   d:"회수되지 않은 영혼을 상자에 담아 옮긴다."},
 {n:"개조 의체 괴한",     e:ic("armPros"), w:"제3구역",   d:"태어났을 때의 모습이 거의 남지 않았다."},
 {n:"마녀의 사역물",      e:ic("spider"), w:"속삭이는 폐허", d:"마법의 인도에 따라 파괴 쪽으로 끌려간다."},
 {n:"업귀 잔해",          e:ic("eye"), w:"폐터널",    d:"인간의 형태와 자아를 잃은 뒤 남은 것."},
 {n:"쇠사슬 늑대",        e:ic("wolf"), w:"결계의 탑",  d:"쇠사슬이 몸의 일부가 되어 버렸다."},
 {n:"불 붙은 인형",       e:ic("doll"), w:"결계의 탑",  d:"누군가의 기억을 태우며 움직인다."},
 {n:"잿빛 손",            e:ic("hand"), w:"지하 봉인고", d:"벽 안쪽에서 손만 자라 나온다."},
 {n:"목소리 없는 군중",   e:ic("users"), w:"제6구역",   d:"이름을 잃은 자들이 떼로 움직인다."},
 {n:"종을 삼킨 것",       e:ic("bell"), w:"석탑",      d:"석탑의 종소리가 되돌아오지 않는다."},
 {n:"일륜의 그늘",        e:ic("moonDark"), w:"제4구역",   d:"가짜 낮이 만들어 낸 그림자."},
 {n:"찢긴 장의 주인",     e:ic("bookClosed"), w:"금서고",    d:"모든 금서가 한 권으로 엮였다."},
 {n:"수면에 비친 것",     e:ic("wave"), w:"제7구역",   d:"심해에서 가끔 감지되는 거대한 파장."},
];

/* ─── 업적 ─── */
const ACH=[
 {id:"a1",  n:"첫 수강",       d:"수업 1회 마치기",            c:"classH", g:1,   p:3},
 {id:"a2",  n:"성실한 학생",   d:"수업 누적 100교시",          c:"classH", g:100, p:10},
 {id:"a3",  n:"서고의 유령",   d:"수업 누적 500교시",          c:"classH", g:500, p:25},
 {id:"a4",  n:"살아있는 경문", d:"수업 누적 1,500교시",        c:"classH", g:1500,p:50},
 {id:"a5",  n:"첫 실전",       d:"악인 1체 처치",              c:"mon",    g:1,   p:3},
 {id:"a6",  n:"골목 청소부",   d:"악인 100체 처치",            c:"mon",    g:100, p:10},
 {id:"a7",  n:"저승차사",      d:"악인 1,000체 처치",          c:"mon",    g:1000,p:25},
 {id:"a8",  n:"전설의 차사",   d:"악인 10,000체 처치",         c:"mon",    g:10000,p:60},
 {id:"a9",  n:"첫 번째 문지기",d:"보스 1회 처치",              c:"boss",   g:1,   p:5},
 {id:"a10", n:"문지기 사냥꾼", d:"보스 5회 처치",              c:"boss",   g:5,   p:15},
 {id:"a11", n:"석탑 탐험가",   d:"석탑 30층 돌파",             c:"towerMax",g:30, p:10},
 {id:"a12", n:"황야를 건넌 자",d:"석탑 50층 돌파",             c:"towerMax",g:50, p:20},
 {id:"a13", n:"종을 울린 자",  d:"석탑 80층 돌파",             c:"towerMax",g:80, p:40},
 {id:"a14", n:"심연의 방랑자", d:"석탑 100층 돌파",            c:"towerMax",g:100,p:60},
 {id:"a15", n:"첨탑의 대마도사",d:"석탑 150층 돌파",           c:"towerMax",g:150,p:120},
 {id:"a16", n:"무너지지 않는 방벽",d:"결계의 탑 100층 돌파",   c:"guardMax",g:100,p:60},
 {id:"a17", n:"버티는 법",     d:"결계의 탑 30층 돌파",        c:"guardMax",g:30, p:15},
 {id:"a18", n:"상급생",        d:"4과정 진급",                 c:"course", g:4,  p:15},
 {id:"a19", n:"졸업반",        d:"7과정 진급",                 c:"course", g:7,  p:30},
 {id:"a20", n:"우등생의 길",   d:"승급 시험에서 A 이상 세 번",  c:"gradeA", g:3,  p:15},
 {id:"a21", n:"교수들의 기대주",d:"승급 시험에서 S를 세 번",    c:"gradeS", g:3,  p:25},
 {id:"a22", n:"사무전의 자랑", d:"승급 시험에서 S를 다섯 번",   c:"gradeS", g:5,  p:40},
 {id:"a23", n:"첫 의뢰",       d:"의뢰 1건 해결",              c:"quest",  g:1,  p:3},
 {id:"a24", n:"현장의 사람",   d:"의뢰 50건 해결",             c:"quest",  g:50, p:20},
 {id:"a25", n:"접수대의 단골", d:"의뢰 200건 해결",            c:"quest",  g:200,p:45},
 {id:"a26", n:"첫 수확",       d:"약초밭 1회 수확",            c:"harvest",g:1,  p:3},
 {id:"a27", n:"온실의 주인",   d:"약초밭 100회 수확",          c:"harvest",g:100,p:20},
 {id:"a28", n:"첫 낚시",       d:"물고기 1마리",               c:"fish",   g:1,  p:3},
 {id:"a29", n:"검은 바다의 손",d:"물고기 100마리",             c:"fish",   g:100,p:20},
 {id:"a30", n:"주방 보조",     d:"요리 10번 만들기",           c:"cook",   g:10, p:10},
 {id:"a31", n:"삼장의 제자",   d:"요리 100번 만들기",          c:"cook",   g:100,p:30},
 {id:"a32", n:"첫 사역귀",     d:"사역귀 1마리",               c:"pet",    g:1,  p:5},
 {id:"a33", n:"사육장의 주인", d:"사역귀 10마리",              c:"pet",    g:10, p:25},
 {id:"a34", n:"파견 감독",     d:"파견 100회 귀환",            c:"dispatch",g:100,p:20},
 {id:"a35", n:"연무제 입상",   d:"연무제 5회전 돌파",          c:"arenaBest",g:5, p:20},
 {id:"a36", n:"연무제 우승",   d:"연무제 15회전 완주",         c:"arenaBest",g:15,p:60},
 {id:"a37", n:"토벌 참여",     d:"업귀 토벌 10회 공격",        c:"wb",     g:10, p:15},
 {id:"a38", n:"구역을 걷다",   d:"구역 나들이 10회",           c:"outing", g:10, p:10},
 {id:"a39", n:"여섯 구역을 걸은 자",d:"서로 다른 6구역 방문",   c:"wards",  g:6,  p:30},
 {id:"a40", n:"귀향제의 손님", d:"염라제 부스 도장 5개",       c:"stamps", g:5,  p:15},
 {id:"a41", n:"각인 장인",     d:"법구 +10 각인",              c:"enhMax", g:10, p:25},
 {id:"a42", n:"전설을 쥐다",   d:"전설 등급 법구 장착",        c:"legend", g:1,  p:40},
 {id:"a43", n:"모임의 기둥",   d:"모임 레벨 10",               c:"clubLv", g:10, p:20},
 {id:"a44", n:"이름을 새긴 자",d:"도감 점수 300",              c:"dexP",   g:300,p:40},
 {id:"a45", n:"밤의 학생",     d:"명계력 30일 보내기",         c:"days",   g:30, p:20},
];

/* ─── 세계관 이야기 ─── */
const STORY=[
 {ch:1, t:"이름을 잃은 도시", need:1, b:[
  "이 대지에는 세상의 모든 죄가 흘러들어 뿌리를 내리고, 태고의 악이 도시라는 가죽을 뒤집어쓴 채 영원한 밤을 살아가는 곳이 있다.",
  "도시의 본래 이름은 오래전에 시간의 밑바닥으로 가라앉았다. 주민들의 기억은 저마다 다른 이름을 떠올리고, 행정기관의 기록은 서로 모순된 지명을 증언한다.",
  "어쩌면 이 도시에는 처음부터 이름이 없었는지도 모른다. 이름을 잃은 도시는 너무 오랜 세월 죄와 죽음을 품은 나머지, 마침내 본래의 이름보다 더 어울리는 하나의 호칭을 얻었다.",
  "사람들은 그곳을 명계冥界라 부른다."]},
 {ch:2, t:"고개를 들어 나를 보아라", need:1, b:[
  "\"고개를 들어 나를 보아라. 그래, 겁먹을 필요는 없다. 내 얼굴이 무섭게 생겼느냐? 솔직해서 좋구나.\"",
  "\"너는 아주 오래전에 한 번 죽었다. 기억나지 않는 것이 당연하다. 그러나 기억이 사라졌다고 해서, 있었던 일까지 없어지는 것은 아니다.\"",
  "\"너는 전생에 한 사람을 만났다. 그 사람을 몹시 사랑했을 수도 있고, 끝내 용서하지 못할 만큼 미워했을 수도 있다. 어떤 관계였든 너희 사이에는 아직 끝맺지 못한 일이 남아 있다.\"",
  "\"문밖에 그 아이가 기다리고 있을 것이다. 가서 만나 보아라.\""]},
 {ch:3, t:"다만 공명하여", need:2, b:[
  "무기와 장인이 파트너가 되면 두 영혼은 서로의 파장에 영향을 받기 시작한다. 두 영혼이 서로의 파장을 맞추어 하나의 힘을 이루는 현상을 공명共鳴이라 부른다.",
  "공명은 단순한 전투 기술이 아니다. 그것은 두 영혼의 경계를 일시적으로 열어젖히는 일이다.",
  "신뢰나 이해가 없는 상태에서 강제로 영혼을 연결하면 감정과 기억의 경계가 무너진다. 사무전에서는 이를 파장 오염이라고 부른다.",
  "그를 건지려 하지 말라. 그의 업을 네 저울로 재단하지 말라. 다만 공명하여, 그가 헤매는 무명을 함께 관조하라."]},
 {ch:4, t:"오탁악세", need:3, b:[
  "최근 명계의 주민들 사이에서는 출처를 알 수 없는 약물이 하나의 유행처럼 번지고 있다. 정식 명칭도, 최초의 제조자도, 흘러든 경로도 밝혀지지 않았다.",
  "모든 포장에는 제조사와 성분표 대신 작은 법륜 문양과 글자가 새겨져 있다. 劫, 見, 煩, 衆, 命.",
  "\"요즘 다들 한 번쯤 해본다더라.\" \"공명이 조금 잘된대.\" \"별거 아니야. 잠깐 기분만 달라지는 거지.\"",
  "압수된 제품을 분석해도 성분과 효과가 일정하지 않고, 같은 이름으로 팔리는 물건끼리조차 제조 방식이 다르다. 지금으로서는 그저 잠시 번지는 유행 가운데 하나에 불과하다. 적어도 현재까지는 그렇게 여겨지고 있다."]},
 {ch:5, t:"사라진 교사", need:4, b:[
  "불법 약물 관련 사건은 조직원 일부가 체포되고 거점 몇 곳이 폐쇄되며 일단락되었다.",
  "그러나 압수품과 거래 기록을 조사한 결과, 체포된 세력은 전체 유통망의 일부에 불과했으며 이미 명계 여러 구역으로 퍼져 있다는 사실이 확인된다.",
  "약물의 흔적이 남은 위험 구역에서 비정상적인 영혼 파장이 감지되었고, 사무전은 추가 조사에 나선다. 이 과정에서 예상보다 훨씬 위험한 상황이 발생한다.",
  "사무전의 교사 한 명이 실종된다. 임무가 단순히 악인을 쓰러뜨리는 것으로 끝나지 않으며, 하나의 선택이 동료와 주변 사람에게까지 영향을 미친다는 사실을 학생들은 더 분명하게 체감하게 된다."]},
 {ch:6, t:"돌아오는 감각", need:5, b:[
  "여러분은 이전보다 강해졌습니다. 그러나 강해졌다는 것은 더 위험한 일을 감당해야 한다는 뜻이기도 합니다.",
  "수많은 임무와 공명을 반복한 탓인지, 혹은 오랜 시간 페어와 가까이 지낸 영향인지 알 수 없으나, 잊고 있던 과거의 일부가 희미한 감각과 감정의 형태로 떠오르기 시작합니다.",
  "아직 그것이 누구의 기억인지, 어떤 사건과 이어져 있는지는 명확하지 않습니다.",
  "그것을 어떻게 받아들이든, 명계에 머무는 이상 여러분은 다시 자신의 업과 마주하게 됩니다."]},
 {ch:7, t:"무명의 장야 앞에서", need:7, b:[
  "악인을 심판하러 나선 학생이 새로운 악인이 되는 일도 드물지 않다.",
  "정의를 확신한 나머지 타인의 사정을 보지 못하는 자. 파트너를 지키겠다는 집착으로 무고한 사람을 해치는 자. 악인의 영혼을 반복해서 삼키며 강해지는 감각에 취한 무기. 타인의 죄업을 들여다보다 자신만은 다르다고 믿게 된 장인.",
  "칼을 든 자는 언제나 자신이 무엇을 베고 있는지 알아야 한다. 어떤 인연을 끊고 있는지. 그 선택으로 어떤 결과를 새롭게 만들어 내는지.",
  "육신은 멸하여도 업은 멸하지 않는다. 남은 업은 인연을 따라 다시 무명의 장야에 이른다."]},
];

/* ─── 사역귀 간식 ─── */
const SNACKS=[
 {id:"sn1", n:"잿불 사탕",     e:ic("candy"), c:300,  b:2, d:"잿불을 녹여 졸인 작은 사탕입니다."},
 {id:"sn2", n:"이슬 비스킷",   e:ic("cookie"), c:600,  b:3, d:"새벽 이슬을 넣어 구운 바삭한 비스킷입니다."},
 {id:"sn3", n:"안개 젤리",     e:ic("ice"), c:900,  b:3, d:"제7구역의 바다 안개를 굳혀 만든 말랑한 젤리입니다."},
 {id:"sn4", n:"반딧불 씨앗",   e:ic("bean"), c:900,  b:3, d:"어두운 곳에서 은은하게 빛나는 씨앗입니다."},
 {id:"sn5", n:"꿀사과 조각",   e:ic("apple"), c:1200, b:3, d:"제1구역 찻집의 꿀사과를 잘게 썬 것입니다."},
 {id:"sn6", n:"은빛 말린 생선",e:ic("fish"), c:1200, b:3, d:"검은 바다에서 잡아 말린 생선입니다.", mat:"어물"},
 {id:"sn7", n:"텃밭 열매 타르트",e:ic("pie"),c:0,   b:4, d:"텃밭에서 딴 열매를 듬뿍 올려 구운 타르트입니다.", mat:"열매", mc:4, tag:"텃밭 간식"},
 {id:"sn8", n:"약초 경단",     e:ic("dango"), c:0,    b:4, d:"향긋한 약초를 빻아 빚은 쫀득한 경단입니다.", mat:"약초", mc:4, tag:"텃밭 간식"},
];

/* ─── 매점 품목 (확장) ─── */
const MART=[
 {id:"m1", n:"사리 꾸러미",  d:"사리 10개",                    cost:{rin:21100},  give:{sari:10},   lim:3,  per:"day"},
 {id:"m2", n:"연등 주머니",  d:"연등 10개 (하루 1번)",          cost:{rin:105000}, give:{lotus:10},  lim:1,  per:"day"},
 {id:"m3", n:"부적가루 교환",d:"사리 10개를 부적가루 80으로",    cost:{sari:10},    give:{dust:80},   lim:99, per:"day"},
 {id:"m4", n:"보급 상자",    d:"지금 과정보다 3~7단계 높은 법구 1개 (고급 이상)", cost:{rin:26300}, give:{gear:1}, lim:5, per:"day"},
 {id:"m5", n:"업연의 알",    d:"사역귀 알 1개",                 cost:{lotus:25},   give:{egg:1},     lim:9,  per:"day"},
 {id:"m6", n:"륜 주머니",    d:"연등 10개를 륜 10.5만으로",      cost:{lotus:10},   give:{rin:105000},lim:3,  per:"day"},
 {id:"m7", n:"압축 파장병",  d:"파장 4시간 생산분을 즉시 획득",   cost:{lotus:12},   give:{mana:240},  lim:3,  per:"day"},
 {id:"m8", n:"토벌 도전권",  d:"업귀 토벌 도전권 +1 (주 2회)",   cost:{lotus:10},   give:{wb:1},      lim:2,  per:"week"},
 {id:"m9", n:"바랑 확장",    d:"바랑 칸 +5",                    cost:{lotus:20},   give:{bag:5},     lim:99, per:"ever"},
 {id:"m10",n:"망각의 차",    d:"분배한 능력치 포인트를 되돌립니다", cost:{lotus:5},   give:{forget:1},  lim:99, per:"day"},
 {id:"m11",n:"연금 재료 상자",d:"재료 무작위 12개",              cost:{lotus:8},    give:{mats:12},   lim:3,  per:"day"},
 {id:"m12",n:"휘장 원석",    d:"무작위 보석이 박힌 사무전 휘장 1개", cost:{lotus:30}, give:{crest:1},  lim:99, per:"ever", req:3},
];

/* ═══════════ 상태 보강 3 ═══════════ */
function ensureV3(){
  const d=(k,v)=>{ if(S[k]===undefined) S[k]=v; };
  d("ct",{classH:0,mon:0,boss:0,quest:0,harvest:0,fish:0,cook:0,pet:0,dispatch:0,
          wb:0,outing:0,duelWin:0,gradeA:0,gradeS:0,enhMax:0,days:0});
  d("dex",{mon:[],plant:[],fish:[],dish:[],title:[],wards:[]});
  d("ach",[]);
  d("storyRead",[]);
  d("hall",S.hall);
  d("war",{mine:0,week:0});      // 활동량 집계용으로만 남아 있습니다
  d("home",{stage:0, due:0, auto:true});
  d("lounge",{pts:0,stage:0,today:{rin:false,mana:false,mat:false},month:0});
  d("auc",{phase:"idle",left:0,next:0,lots:[],hist:[],slot:0});
  d("mile",0);
  d("snack",{today:0});
  d("mart",{});
  d("crest",null);
  d("run",null);
  if(!S.auc.lots.length && S.auc.phase==="idle") S.auc.next=aucNextIn();
}
function ct(k,v){ if(!S.ct) return; S.ct[k]=(S.ct[k]||0)+(v===undefined?1:v); }
function ctMax(k,v){ if(!S.ct) return; S.ct[k]=Math.max(S.ct[k]||0,v); }
function dexAdd(kind,name){
  if(!S.dex[kind].includes(name)){ S.dex[kind].push(name);
    toast(`도감 등록 · <b>${esc(name)}</b>`,"good"); }
}
function dexScore(){
  return S.dex.mon.length*6 + S.dex.plant.length*5 + S.dex.fish.length*8
       + S.dex.dish.length*5 + S.dex.title.length*4;
}
function achVal(a){
  const C=S.ct;
  switch(a.c){
    case "towerMax": return S.tower||0;
    case "guardMax": return S.tower2||0;
    case "course":   return S.course;
    case "arenaBest":return S.arena.best;
    case "stamps":   return S.fest.stamps.length;
    case "wards":    return S.dex.wards.length;
    case "clubLv":   return S.club?S.club.lv:0;
    case "dexP":     return dexScore();
    case "legend":   return SLOTS.some(s=>S.gear[s.k]&&S.gear[s.k].grade===4)?1:0;
    case "pet":      return S.pets.list.length;
    default:         return C[a.c]||0;
  }
}
function achCheck(){
  ACH.forEach(a=>{
    if(S.ach.includes(a.id)) return;
    if(achVal(a)>=a.g){
      S.ach.push(a.id);
      S.lotus+=Math.round(a.p/5);
      toast(`업적 달성 · <b>${a.n}</b> (+${a.p}점)`,"good");
    }
  });
}
function achPts(){ return ACH.filter(a=>S.ach.includes(a.id)).reduce((s,a)=>s+a.p,0); }

const HALLBONUS={ dorm:{}, w1:{}, w2:{}, w3:{}, w4:{}, w5:{}, w6:{}, w7:{} };
/* 구역 대항전은 없어졌습니다 — 거주지 혜택은 집을 지어 키웁니다 (part4) */
const _clubOpt=typeof clubOpt==="function"?clubOpt:null;
const _mod3=mod;
mod=function(key){
  let v=_mod3(key);
  const hb=HALLBONUS[S.hall]; if(hb&&hb[key]) v+=hb[key];
  if(S.lounge && S.lounge.stage>0){
    if(key==="rest") v+=S.lounge.stage*.05;
    if(key==="know") v+=S.lounge.stage*.02;
  }
  if(S.crest && S.crest.key===key) v+=S.crest.v/100;
  return v;
};
const _hallBonus=hallBonus;
hallBonus=function(k){ const hb=HALLBONUS[S.hall]; return (hb&&hb[k])||0; };

/* ═══════════ 경매 ═══════════ */
const AUCSLOT=[720,1080,1320]; // 낮 12시 · 저녁 6시 · 밤 10시
function aucNextIn(){
  const m=cal().min;
  for(const s of AUCSLOT){ if(m<s) return s-m; }
  return 1440-m+AUCSLOT[0];
}
function aucOpen(){
  const tiers=[{n:"신입생 경매",lv:Math.max(4,S.lvl-20),g:2},
               {n:"중급 경매",  lv:Math.max(10,S.lvl),   g:3},
               {n:"상급 경매",  lv:S.lvl+14,             g:4}];
  S.auc.lots=[];
  tiers.forEach((t,ti)=>{
    for(let i=0;i<5;i++){
      const it=mkGear(t.lv+rnd(-3,5), t.g); it.isNew=false; it.bound=true;
      S.auc.lots.push({tier:ti, tn:t.n, it,
        bid:Math.round(gearScore(it)*(0.25+ti*0.08)), by:null, npc:"다른 응찰"});
    }
  });
  S.auc.phase="live"; S.auc.left=60;
  toast("떠돌이 상인이 수레를 폈습니다. 한 시간 동안 경매가 열립니다.","good");
  pushNews("[상인] 떠돌이 상인이 도착했습니다. 세 구간의 경매가 한 시간 동안 열립니다.");
}
function aucBid(i){
  const L=S.auc.lots[i];
  const step=Math.max(100,Math.round(L.bid*0.12));
  const need=L.bid+(L.by==="me"?0:step);
  if(L.by==="me"){ toast("이미 최고 입찰자입니다."); return; }
  if(S.rin<need){ toast("륜이 부족합니다.","bad"); return; }
  S.rin-=need;
  // 이전 입찰자에게 돌려줌(내 것이었다면 환불)
  L.bid=need; L.by="me"; L.myPaid=need;
  toast(`입찰 · ${nf(need)}륜을 맡겼습니다. 더 높은 입찰이 나오면 돌려받습니다.`);
  renderTop(); renderMain(); save();
}
function aucTick(m){
  if(S.auc.phase==="live"){
    S.auc.left-=m;
    // NPC 경쟁 입찰
    S.auc.lots.forEach(L=>{
      if(Math.random()<0.02*m){
        const step=Math.max(100,Math.round(L.bid*0.12));
        if(L.by==="me"){ S.rin+=L.myPaid||0; L.myPaid=0;
          toast(`${L.npc}이(가) 「${L.it.name}」에 더 높은 값을 불렀습니다. 맡긴 륜을 돌려받았습니다.`); }
        L.bid+=step; L.by=null; L.npc="다른 응찰";
      }
    });
    if(S.auc.left<=0) aucClose();
  }else{
    S.auc.next-=m;
    if(S.auc.next<=0) aucOpen();
  }
}
function aucClose(){
  let won=0;
  S.auc.hist=[];
  S.auc.lots.forEach(L=>{
    S.auc.hist.push({n:L.it.name, lv:L.it.lv, tn:L.tn, by:L.by==="me"?S.name:L.npc, price:L.bid});
    if(L.by==="me"){ S.bag.push(L.it); won++; }
  });
  S.auc.lots=[]; S.auc.phase="idle"; S.auc.next=aucNextIn();
  if(won) toast(`경매 낙찰 · 법구 ${won}점을 받았습니다. 낙찰품은 귀속되어 중개소에 올릴 수 없습니다.`,"good");
  else toast("경매가 끝났습니다. 상인은 다른 골목으로 떠났습니다.");
  save();
}

/* ═══════════ 실시간 의뢰 일지 ═══════════ */
const RUNFLAVOR=[
 "잠시 숨을 고른다. 파장이 천천히 차오른다.",
 "골목 끝에서 전자 풍경이 낮게 울린다.",
 "벽에 붙은 진언이 문장의 순서를 바꾼다.",
 "어디선가 확성기로 송출되는 독경이 들린다.",
 "낡은 간판이 마지막 글자 하나만 깜빡인다.",
 "지도 애플리케이션은 계속 직진하라고 안내한다.",
 "배달 드론 한 대가 머리 위를 지나간다.",
 "향 냄새가 채 가시기 전에 납땜 연기가 끼어든다.",
];
function startRun(stage,party){
  if(!questCheck(stage)) return;
  if(S.run&&!S.run.done){ toast("이미 의뢰를 나가 있습니다.","bad"); return; }
  const q=questAt(stage);
  const room=party?S.quests.room:null;
  const pos=room?room.pos:"후열";
  const me=meFighter();
  me.max=Math.round((300+effStat("def")*40+effStat("men")*30)*(1+mod("hpP")));
  me.hp=Math.round(me.max*clamp(S.hp/100,.25,1));
  me.pos=pos;
  if(pos==="선봉") me.atk=Math.round(me.atk*1.1);
  const allies=(room?room.party:[]).map(p=>mkFighter(p.n,
    {atk:Math.max(1,Math.round((p.teacher?7:2)+p.lv*.6)), def:Math.max(1,Math.round((p.teacher?6:2)+p.lv*.5)),
     agi:Math.max(1,Math.round((p.teacher?6:2)+p.lv*.5)), men:3,res:3},
    Math.round(1200+p.lv*260), p.teacher?"var(--gold)":"var(--blue)"));
  allies.forEach((a,i)=>{ a.pos=(room.party[i].pos)||"후열"; a.teacher=room.party[i].teacher; a.lv=room.party[i].lv; });
  S.run={stage, q, pos, me, allies, foes:[enemyFor(stage,q.rank.r==="Ⅴ")],
         logs:[], left:q.dur, total:q.dur, kills:0, rin:0, acc:0, done:false, party:!!party};
  pushRun(`<b>${stage}단계 ${q.ward.n}로 ${allies.length?allies.map(a=>a.n).join(" · ")+"과 함께 ":""}출발했다.</b>`);
  if(party) S.quests.room=null;
  go("quest");
  toast(`출동했습니다. <b>${hhmm(q.dur)}</b>짜리 의뢰입니다. 처치할 때마다 륜과 경험치가 바로 들어오고, 창을 닫아 두어도 시계대로 진행됩니다.`);
}
function pushRun(t){
  if(!S.run) return;
  S.run.logs.push({t, time:cal().str.replace(/^(오전|오후) /,"")});
  if(S.run.logs.length>160) S.run.logs.shift();
}
function runStep(){
  const R=S.run; if(!R||R.done) return;
  const live=[R.me,...R.allies].filter(x=>x.hp>0);
  if(!live.length){ endRun(false); return; }
  const r=Math.random();
  if(r<0.14){ pushRun(`<span class="muted">${pick(RUNFLAVOR)}</span>`); return; }
  if(r<0.2 && R.me.hp<R.me.max*.7){
    const heal=Math.round(R.me.max*0.06*(1+mod("heal")));
    R.me.hp=Math.min(R.me.max,R.me.hp+heal);
    pushRun(`<span class="s">상처가 천천히 아문다. 생명력 +${nf(heal)}</span>`); return;
  }
  const foe=R.foes[0];
  if(!foe || foe.hp<=0){
    const boss=Math.random()<.08;
    const md=pick(MONS.filter(m=>!/탑|금서고/.test(m.w))||MONS);
    const nf2=enemyFor(R.stage, boss);
    nf2.n=boss?`【${pick(["무명","잿빛","검은 손","홍월"])}】 ${md.n}`:md.n;
    R.foes=[nf2];
    pushRun(`<span class="muted">모퉁이를 돌자 ${esc(nf2.n)}이(가) 서 있다.</span>`);
    dexAdd("mon", md.n);
    return;
  }
  const log=[];
  const attacker = Math.random()<0.58 ? pick(live) : foe;
  const target   = attacker===foe ? pick(live) : foe;
  resolveAttack(attacker, target, log);
  pushRun(log[0]||"");
  if(foe.hp<=0){
    R.kills++; ct("mon");
    /* 한 체 쓰러뜨릴 때마다 그 자리에서 바로 들어옵니다 — 끝날 때 몰아 주지 않습니다 */
    const got=gainRin(Math.round((40+R.stage*14)*R.q.rank.mul));
    const exg=gainExp(Math.round((60+R.stage*22)*0.6));
    const kng=gainKnow(Math.round((10+R.stage*4)*0.5));
    R.rin+=got; R.exp=(R.exp||0)+exg; R.know=(R.know||0)+kng;
    pushRun(`<span class="d">${esc(foe.n)}을(를) 쓰러뜨렸다.</span> <span class="s">륜 +${nf(got)} · 경험치 +${nf(exg)} · 지식 +${nf(kng)}</span>`);
    if(foe.boss){ ct("boss"); }
    if(Math.random()<(0.14+mod("loot"))){
      const it=mkGear(Math.round(R.stage*1.2+S.lvl*.3),undefined,true); S.bag.push(it);
      pushRun(`<span class="s">${GRADES[it.grade].n} 법구 「${esc(it.name)}」를 주웠다.</span>`);
    }
    if(Math.random()<0.18){ const dd=rnd(1,3)+Math.floor(R.stage/12); S.mat.가루+=dd;
      pushRun(`<span class="s">부서진 부적 조각을 쓸어 담았다. 부적가루 +${dd}</span>`); }
    R.foes=[];
  }
  if(R.me.hp<=0) endRun(false);
}
function endRun(ok){
  const R=S.run; if(!R||R.done) return;
  R.done=true;
  const q=R.q;
  const cleared=ok&&(R.stage%10!==0||R.left<=0); // 관문은 끝까지 버틴 뒤에만 통과
  let hpL=rnd(q.rank.hp[0],q.rank.hp[1]), snL=rnd(q.rank.sn[0],q.rank.sn[1]);
  if(R.pos==="선봉") hpL=Math.round(hpL*1.1);
  if(R.pos==="지원"){ hpL=Math.round(hpL*.8); snL=Math.round(snL*.8); }
  if(S.ward){ hpL=Math.round(hpL*.5); snL=Math.round(snL*.5); S.ward=false; }
  if(!ok){ hpL=Math.round(hpL*1.7); snL=Math.round(snL*1.6); }
  damageHP(hpL); snL=damageSN(snL);
  /* 처치 보상은 그때그때 이미 들어갔습니다. 여기서는 해결 보너스만 더합니다. */
  const rin=cleared?gainRin(Math.round(120+R.stage*48)):0;
  const ex =cleared?gainExp(Math.round(90+R.stage*34)):0;
  const kn =0;
  if(cleared){
    questRecordClear(R.stage);
    ct("quest");
    if(q.rank.r==="Ⅳ"&&Math.random()<.3) S.sari++;
    if(q.rank.r==="Ⅴ") S.sari++;
    addMark(Math.round(6*q.rank.mul));
    pushNews(`[의뢰] ${S.name} 학생이 사건 ${q.no}(${q.rank.r}등급)을 해결했습니다.`);
  }
  pushRun(`<span class="turn">정산 · 처치 ${R.kills}체 · 륜 ${nf(R.rin||0)}${rin?` +해결 ${nf(rin)}`:""} · 경험치 ${nf(R.exp||0)}${ex?` +해결 ${nf(ex)}`:""} · 지식 ${nf(R.know||0)} · 체력 −${hpL} · 이성 −${snL}</span>`);
  pushRun(cleared?`<span class="s">■ 의뢰를 해결하고 사무전으로 돌아왔다.</span>`
    :ok?`<span class="turn">■ 관문 도중 귀환했다. 모은 몫만 정산되며 다음 구간은 열리지 않는다.</span>`
    :`<span class="h">■ 더 버티지 못하고 현장에서 철수했다.</span>`);
  S.quests.log.unshift({no:q.no,t:q.t,win:cleared,time:cal().str});
  if(S.quests.log.length>30) S.quests.log.pop();
  S.war.mine=(S.war.mine||0)+Math.round(12*q.rank.mul);
  achCheck(); renderTop(); renderNav(); save();
}
function runReturn(){ if(S.run&&!S.run.done) endRun(S.run.kills>0); renderMain(); }
function runClear(){ S.run=null; renderMain(); }

/* ═══════════ 틱 3 ═══════════ */
const _step3=step;
step=function(m){
  _step3(m);
  if(!S||!S.made||!S.auc) return;
  aucTick(m);
  // 일수 집계
  ctMax("days", cal().day+1);
  if(Math.random()<0.02*m) achCheck();
};
const _onNewDay3=onNewDay;
onNewDay=function(){
  _onNewDay3();
  S.snack.today=0; S.mart={};
  S.lounge.today={rin:false,mana:false,mat:false};
};

/* ═══════════════════════════════════════════════════
   화면 — 기록실 · 랭킹 · 기숙사 · 휴게실 · 세계관
   ═══════════════════════════════════════════════════ */
let RECTAB="업적", ACHFILTER="전체";
VIEWS.record=()=>{
  const tabs=["업적","칭호 도감","악인 도감","식물 도감","낚시 도감","요리 도감","도감 점수","통계"];
  let body="";

  if(RECTAB==="업적"){
    let list=ACH.map(a=>({a, v:achVal(a), done:S.ach.includes(a.id)}));
    if(ACHFILTER==="달성") list=list.filter(x=>x.done);
    if(ACHFILTER==="미달성") list=list.filter(x=>!x.done);
    body=`<div class="row" style="margin-bottom:10px">
      <span class="seg">${["전체","달성","미달성"].map(f=>`<button class="${ACHFILTER===f?"on":""}" onclick="ACHFILTER='${f}';renderMain()">${f} ${f==="전체"?ACH.length:f==="달성"?S.ach.length:ACH.length-S.ach.length}</button>`).join("")}</span>
      <span class="tiny muted" style="margin-left:auto">업적 점수 <b style="color:var(--gold)">${achPts()}</b></span></div>
    <div class="grid g4">
      ${list.map(({a,v,done})=>`<div class="sub" style="${done?"border-color:var(--gold2)":""}">
        <div class="spread"><div class="row" style="gap:6px">
          <span style="width:16px;height:16px;border-radius:50%;border:1px solid ${done?"var(--gold)":"var(--s5)"};display:grid;place-items:center;font-size:10px;color:var(--gold)">${done?ic("check",11):""}</span>
          <b style="font-size:13px">${a.n}</b></div>
          <span class="tag ${done?"g":""}">+${a.p}</span></div>
        <div class="tiny muted" style="margin:5px 0 4px">${a.d}</div>
        ${done?`<div class="tiny" style="color:var(--jade)">달성</div>`
          :`<div class="bar" style="margin:3px 0"><i style="width:${clamp(v/a.g*100,0,100)}%"></i></div>
            <div class="tiny muted">${nf(v)} / ${nf(a.g)}</div>`}
      </div>`).join("")}</div>`;
  }

  const dexGrid=(kind,items,key)=>`<div class="grid g4">
    ${items.map(it=>{
      const nm=typeof it==="string"?it:it.n;
      const got=S.dex[key].includes(nm);
      return `<div class="sub" style="${got?"":"opacity:.42"}">
        <div class="spread"><b>${typeof it==="string"?"":it.e+" "}${got?nm:"???"}</b>${got?'<span class="tag g">등록</span>':""}</div>
        <div class="tiny muted" style="margin-top:4px">${got?(it.d||it.w||""):"아직 만나지 못했습니다"}</div>
        ${got&&it.w?`<div class="tiny" style="color:var(--jade);margin-top:3px">${it.w}</div>`:""}</div>`}).join("")}</div>`;

  if(RECTAB==="악인 도감") body=`<div class="tiny muted" style="margin-bottom:10px">의뢰와 탑에서 마주친 악인·업귀가 기록됩니다. ${S.dex.mon.length} / ${MONS.length}</div>`+dexGrid("악인",MONS,"mon");
  if(RECTAB==="식물 도감") body=`<div class="tiny muted" style="margin-bottom:10px">약초밭에서 길러 수확한 작물이 기록됩니다. ${S.dex.plant.length} / ${CROPS.length}</div>`+dexGrid("식물",CROPS,"plant");
  if(RECTAB==="낚시 도감") body=`<div class="tiny muted" style="margin-bottom:10px">검은 바다에서 올라온 것들입니다. ${S.dex.fish.length} / ${FISHES.length}</div>`+dexGrid("낚시",FISHES,"fish");
  if(RECTAB==="요리 도감") body=`<div class="tiny muted" style="margin-bottom:10px">직접 만들어 본 요리가 기록됩니다. ${S.dex.dish.length} / ${DISHES.length}</div>`+dexGrid("요리",DISHES,"dish");
  if(RECTAB==="칭호 도감"){
    body=`<div class="tiny muted" style="margin-bottom:10px">${S.dex.title.length} / ${TITLES.length} · 누르면 학생증의 칭호가 바뀝니다</div>
    <div class="grid g4">${TITLES.map((t,i)=>{
      const got=S.dex.title.includes(t)||i<=S.course+1;
      return `<div class="sub" style="${got?"":"opacity:.42"}">
        <div class="spread"><b>${got?t:"???"}</b>${S.title===t?'<span class="tag g">사용 중</span>':""}</div>
        <div class="tiny muted" style="margin:5px 0 7px">${got?titleHow(i):"조건이 알려지지 않았습니다"}</div>
        ${got?`<button class="btn sm ${S.title===t?"":"pri"}" onclick="setTitle('${t}');renderMain()">${S.title===t?"사용 중":"사용하기"}</button>`:""}</div>`}).join("")}</div>`;
  }
  if(RECTAB==="도감 점수"){
    const rows=[["악인 도감",S.dex.mon.length,MONS.length,6],["식물 도감",S.dex.plant.length,CROPS.length,5],
                ["낚시 도감",S.dex.fish.length,FISHES.length,8],["요리 도감",S.dex.dish.length,DISHES.length,5],
                ["칭호 도감",S.dex.title.length,TITLES.length,4]];
    body=`<div class="card pad" style="margin-bottom:12px">
      <div class="spread"><div class="sect-t" style="margin:0">도감 점수</div>
        <div style="font-size:26px;font-weight:600;color:var(--gold)">${dexScore()}</div></div>
      <div class="tiny muted">도감에 등록한 항목마다 점수가 쌓입니다. 점수는 랭킹의 「도감 점수」 부문에 반영됩니다.</div></div>
    <table class="t">${rows.map(([n,a,b,w])=>`<tr><td>${n}</td>
      <td style="width:40%"><div class="bar"><i style="width:${a/b*100}%"></i></div></td>
      <td style="text-align:right">${a} / ${b}</td>
      <td style="text-align:right"><b style="color:var(--gold)">${a*w}점</b></td></tr>`).join("")}</table>`;
  }
  if(RECTAB==="통계"){
    const C=S.ct;
    const rows=[["명계에서 보낸 날",cal().day+1+"일"],["수업 교시",nf(C.classH)],["처치한 악인",nf(C.mon)],
      ["처치한 보스",nf(C.boss)],["해결한 의뢰",nf(C.quest)],["석탑 최고",(S.tower||0)+"층"],["결계의 탑 최고",(S.tower2||0)+"층"],
      ["연무제 최고",S.arena.best+"회전"],["업귀 토벌 공격",nf(C.wb)+"회"],["구역 나들이",nf(C.outing)+"회"],
      ["수확",nf(C.harvest)+"회"],["낚시",nf(C.fish)+"마리"],["요리",nf(C.cook)+"번"],["사역귀",S.pets.list.length+"마리"],
      ["파견 귀환",nf(C.dispatch)+"회"],["업적 점수",achPts()],["도감 점수",dexScore()],["전투력",nf(power())]];
    body=`<div class="grid g4">${rows.map(([k,v])=>`<div class="card pad" style="padding:11px 13px">
      <div class="tiny muted">${k}</div><div style="font-size:18px;font-weight:600;color:var(--gold)">${v}</div></div>`).join("")}</div>`;
  }

  return head("업적 · 도감 · 통계",ic("scroll")+" 기록실", `업적 ${S.ach.length} / ${ACH.length}`)+`
  <div class="tabs" style="margin-bottom:14px;padding:0 0 0 2px">
    ${tabs.map(t=>`<div class="tab ${RECTAB===t?"on":""}" onclick="RECTAB='${t}';renderMain()">${t}${t==="도감 점수"?` <span class="tag g">${dexScore()}</span>`:""}</div>`).join("")}
  </div>${body}`;
};
function titleHow(i){
  return ["입학한 모든 학생에게 주어집니다","무명 관조 수업을 들으면 주어집니다","의뢰를 50건 해결하면 주어집니다",
   "수행 단계가 오를 때마다 가까워집니다","염라제에 참여하면 주어집니다","서로 다른 여섯 구역을 걸으면 주어집니다",
   "공명 적성이 일정 이상이면 주어집니다","죄업 기록학을 수료하면 주어집니다","염라제 부스 도장 다섯 개","석탑 100층 돌파"][i]||"";
}

VIEWS.rank=()=>{
  /* 모브 학생은 없습니다. 공유 기록을 연결하기 전에는 내 기록만 보입니다. */
  const my=power();
  const myRank="—";
  return head("사무전의 기록",ic("medal")+" 랭킹", `공유 기록을 연결하면 다른 러너의 기록이 함께 보입니다`)+`
  <div class="grid g2">
    <div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">전투력 순위</div>
        <span class="tiny muted">내 순위 ${myRank}위</span></div>
      <div class="tiny muted" style="margin-bottom:8px">법구·능력치를 반영한 전투력입니다. 물약·요리 같은 시간제 효과는 순위에서 제외합니다.</div>
      <table class="t">
        <tr style="background:var(--s2)"><td style="width:26px">—</td>
          <td><b style="color:var(--gold)">${esc(S.name)}</b> <span class="tiny muted">${S.course}과정 · Lv ${S.lvl}</span></td>
          <td style="text-align:right"><b>${nf(my)}</b></td></tr>
      </table>
      <div class="tiny muted" style="margin-top:6px">공유 기록을 연결하면 다른 러너와 함께 줄을 섭니다.</div>
    </div>
    <div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">이번 주 석탑 팀 순위</div>
        <span class="tiny muted">내 기록 ${S.tower||0}층</span></div>
      <div class="tiny muted" style="margin-bottom:8px">이번 주(월요일 KST 0시~) 등록된 팀이 오른 가장 높은 층입니다.</div>
      <table class="t">
        <tr style="background:var(--s2)"><td style="width:26px">—</td>
          <td><b style="color:var(--gold)">${esc(S.name)}</b></td>
          <td style="text-align:right"><b>${S.tower||0}층</b></td></tr>
      </table>
      <div class="tiny muted" style="margin-top:6px">의뢰 화면의 「함께 가기」로 다른 러너와 오르면 그 기록이 함께 올라갑니다.</div>
    </div>
  </div>
  <div class="grid g3" style="margin-top:14px">
    <div class="card pad"><div class="sect-t">과목 수석</div>
      ${SUBJECTS.map(s=>({s,lv:S.sub[s.id].lv})).sort((a,b)=>b.lv-a.lv).slice(0,5)
        .map(({s,lv})=>`<div class="spread tiny" style="padding:3px 0"><span>${s.n}</span><b>Lv ${lv}</b></div>`).join("")}
      <div class="tiny muted" style="margin-top:6px">내 과목 중 가장 높은 다섯 과목입니다.</div></div>
    <div class="card pad"><div class="sect-t">도감 점수</div>
      <div style="font-size:24px;font-weight:600;color:var(--gold)">${dexScore()}</div>
      <div class="tiny muted">내 순위 ${Math.max(1,900-dexScore()*3)}위 · 상위 ${clamp(100-dexScore()/8,1,99).toFixed(0)}%</div>
      <button class="btn sm" style="margin-top:8px" onclick="RECTAB='도감 점수';go('record')">도감 보기</button></div>
    <div class="card pad"><div class="sect-t">낚시 기록</div>
      <div class="tiny muted">숙련도 Lv ${S.fish.skill} · ${nf(S.ct.fish)}마리</div>
      <div class="tiny muted" style="margin-top:4px">가장 귀한 것 · ${S.dex.fish.includes("이름 없는 것")?"<b style='color:var(--gold)'>이름 없는 것</b>":S.dex.fish.length?S.dex.fish[S.dex.fish.length-1]:"아직 없음"}</div>
      <button class="btn sm" style="margin-top:8px" onclick="go('fishv')">부두로</button></div>
  </div>`;
};

/* 거처 화면은 part4 에서 만듭니다 */

function moveHall(id){
  if(S.hall===id) return;
  const built=(S.home&&S.home.stage)||0;
  const msg = id==="dorm"
    ? (built?`기숙사로 들어가면 지금까지 지은 집 ${built}단계를 두고 갑니다. 옮길까요?`
            :"기숙사로 들어갈까요? 일세는 없지만 혜택 천장이 100%입니다.")
    : (built?`옮기면 지금까지 지은 집 ${built}단계를 두고 가고, 새 집을 처음부터 짓게 됩니다. 옮길까요?`
            :"이 구역으로 옮길까요? 하루마다 일세를 내야 합니다.");
  if(!confirm(msg)) return;
  S.hall=id;
  if(S.home){ S.home.stage=0; S.home.due=0; }   // 집은 두고 갑니다
  renderTop(); renderNav(); renderMain(); save();
  toast(`${homeOf(id).n}으로 옮겼습니다.`,"good");
}

VIEWS.lounge=()=>{
  const L=S.lounge;
  const stages=[{n:"1. 화분 정리",p:5800},{n:"2. 유리 지붕 수리",p:14500},{n:"3. 달빛 약초 심기",p:26100},{n:"4. 온실 완성",p:37700}];
  const cur=stages[Math.min(3,L.stage)];
  const me=homeOf(S.hall);
  return head(`${me.n} · 뒤집힌 응접실`,ic("sofa")+" 휴게실", `복원 ${L.stage} / 4단계`)+`
  <div class="card pad" style="margin-bottom:14px;padding:10px 14px">
    <div class="quote">창밖이 오늘은 눈 덮인 산이다. 어제는 바다였다.</div>
  </div>
  <div class="grid g2">
    <div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">${ic("herb",15)} 창가 온실 가꾸기</div>
        <span class="tiny muted">이번 달 남은 기간 ${30-(cal().day%30)}일</span></div>
      <div class="tiny muted">햇빛이 들지 않는 창가를 작은 온실로 꾸밉니다. 달빛 약초가 자라면 휴게실에 은은한 향이 감돕니다.</div>
      <div class="spread" style="margin:10px 0 4px"><b>복원 점수 ${nf(L.pts)} / ${nf(cur.p)}</b>
        <span class="tiny muted">기준 인원 290명 · 이번 달 참여 ${70+(cal().day*7)%40}명</span></div>
      <div class="bar" style="margin-bottom:10px"><i style="width:${clamp(L.pts/cur.p*100,0,100)}%"></i></div>
      ${stages.map((s,i)=>`<div class="spread" style="padding:5px 0;border-bottom:1px solid var(--s3)">
        <span class="${L.stage>i?"":"muted"}">${L.stage>i?ic("check")+" ":""}${s.n}</span>
        <span class="tiny muted">${nf(s.p)}점</span></div>`).join("")}
      <div class="tiny" style="color:var(--jade);margin-top:8px">단계마다 체력·이성 회복 +5%, 지식 획득 +2% — 현재 적용 ${L.stage>0?`회복 +${L.stage*5}% · 지식 +${L.stage*2}%`:"없음"}</div>
    </div>
    <div>
      <div class="card pad" style="margin-bottom:12px">
        <div class="sect-t">오늘의 납부 <span class="muted">종류마다 하루 한 번 · 한 번에 10점</span></div>
        ${[["rin","륜 납부","륜 4,740"],["mana","파장 납부","파장 1시간분"],["mat","재료 납부","재료 아무거나 4"]]
          .map(([k,n,c])=>`<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--s3)">
          <div><b>${n}</b><div class="tiny muted">${c}</div></div>
          <button class="btn sm ${L.today[k]?"":"pri"}" ${L.today[k]?"disabled":""} onclick="donateLounge('${k}')">${L.today[k]?"오늘 완료":"납부"}</button></div>`).join("")}
        <div class="tiny muted" style="margin-top:8px">달이 바뀌면 30점 이상 납부한 학생에게 완료한 단계마다 연등 5개가 우편으로 전달됩니다. 휴게실 복원은 집 짓기와 별개로, 같은 거주지 학생들이 함께 올립니다.</div>
      </div>
      <div class="card pad">
        <div class="sect-t">이번 달 복원에 힘을 보탠 학생</div>
        ${["이브","코멧","위사 누","포토스","머그 포르투넬","로베르 테넌"].map((n,i)=>
          `<div class="spread tiny" style="padding:3px 0"><span>${i+1} ${n}</span><span class="muted">30점</span></div>`).join("")}
        <div class="spread tiny" style="padding:3px 0;background:var(--s2)"><span><b style="color:var(--gold)">${esc(S.name)}</b></span>
          <span class="muted">${L.month||0}점</span></div>
      </div>
    </div>
  </div>`;
};
function donateLounge(k){
  const L=S.lounge;
  if(L.today[k]) return;
  if(k==="rin"){ if(S.rin<4740){ toast("륜이 부족합니다.","bad"); return; } S.rin-=4740; }
  if(k==="mana"){ const c=Math.round(manaRate()*60); if(S.mana<c){ toast("파장이 부족합니다.","bad"); return; } S.mana-=c; }
  if(k==="mat"){ const key=Object.keys(S.mat).find(x=>S.mat[x]>=4); if(!key){ toast("재료가 부족합니다.","bad"); return; } S.mat[key]-=4; }
  L.today[k]=true; L.pts+=10; L.month=(L.month||0)+10;
  const stages=[5800,14500,26100,37700];
  while(L.stage<4 && L.pts>=stages[L.stage]){ L.stage++; toast(`휴게실 복원 ${L.stage}단계 완료`,"good"); }
  toast("복원 점수 +10","good"); renderTop(); renderMain(); save();
}

VIEWS.world=()=>{
  const tabs=["이야기","세계","거주지"];
  return head("명계 · 사신무기전문학교 명계지부",ic("book")+" 세계관", `${S.course}과정`)+`
  <div class="tabs" style="margin-bottom:14px;padding:0 0 0 2px">
    ${tabs.map(t=>`<div class="tab ${(S.wTab||"이야기")===t?"on":""}" onclick="S.wTab='${t}';renderMain()">${t}</div>`).join("")}
  </div>
  ${(S.wTab||"이야기")==="이야기"?STORY.map(s=>{
    const open=S.course>=s.need;
    return `<div class="card pad" style="margin-bottom:12px;position:relative;${open?"":"opacity:.5"}">
      <div style="position:absolute;right:16px;top:8px;font-size:34px;color:var(--s3);font-weight:600">${["Ⅰ","Ⅱ","Ⅲ","Ⅳ","Ⅴ","Ⅵ","Ⅶ"][s.ch-1]}</div>
      <h3 style="margin:0 0 8px;font-size:17px">${s.ch}장. ${s.t}</h3>
      ${open?s.b.map(p=>`<p class="tiny" style="margin:0 0 8px;line-height:1.95;color:var(--violetL);max-width:760px">${p}</p>`).join("")
        :`<div class="tiny muted">${s.need}과정이 되면 열립니다.</div>`}
      ${open?`<div class="spread" style="margin-top:8px"><span class="tiny muted">학기 이야기 · ${s.ch} / 7</span>
        <button class="btn sm" onclick="readStory(${s.ch})">${S.storyRead.includes(s.ch)?"다시 읽기":"읽음 표시"}</button></div>`:""}
    </div>`}).join("")
  :(S.wTab||"이야기")==="세계"?`
    <div class="grid g2">
      ${WARDS.map(w=>`<div class="card pad">
        <div class="spread"><b style="color:${w.c};font-size:15px">${w.n}</b><span class="tag">${w.t}</span></div>
        <div class="tiny muted" style="margin-top:6px;line-height:1.9">${w.d}</div>
        <div class="tiny" style="margin-top:6px;color:${S.dex.wards.includes(w.id)?"var(--jade)":"var(--dim2)"}">
          ${S.dex.wards.includes(w.id)?"방문함":"아직 걸어 보지 않았습니다"}</div></div>`).join("")}
    </div>
    <div class="card pad" style="margin-top:12px">
      <div class="sect-t">재화 · 륜輪</div>
      <div class="tiny muted" style="line-height:1.95">사무전에서 쓰는 전용 재화. 이름 그대로 바퀴를 뜻하는 륜輪에서 유래했다.
      실물 륜은 손바닥 안에 들어오는 동화로, 중앙에는 사무전의 문장과 법륜을 본뜬 문양이 양각으로 새겨져 있다.
      "돈은 손에 쥐어 봐야 번 맛이 난다"는 염라의 오래된 지론 탓에 학생들에게 지급되는 기본 보수만큼은 아직도 실물 륜을 쓴다.
      명계에서 굳이 실물 화폐를 쓰는 사람은 대체로 둘로 나뉜다는 우스갯소리가 있다 — 저승차사와 범죄자.</div>
    </div>`
  :`<div class="grid g2">
      ${HALLS.map(h=>`<div class="card pad" style="${S.hall===h.id?"border-color:"+h.c:""}">
        <div class="spread"><b style="color:${h.c};font-size:15px">${h.n} <span class="tiny muted">${h.h}</span></b>
          ${S.hall===h.id?'<span class="tag g">여기 삽니다</span>':""}</div>
        <div class="tiny muted" style="margin:6px 0">${h.d}</div>
        <div class="tiny" style="color:var(--jade)">${typeof hallBenefitText==="function"?hallBenefitText(h.id):h.b}</div></div>`).join("")}
    </div>
    <div class="card pad" style="margin-top:12px">
      <div class="sect-t">교직원</div>
      <div class="grid g3">
        ${Object.values(NPC).map(n=>`<div class="sub"><div class="spread"><b style="color:${n.c}">${n.n} <span class="tiny muted">${n.h}</span></b>
          <span class="tag">${n.role}</span></div>
          <div class="quote" style="margin-top:6px">${n.line[0]}</div></div>`).join("")}
      </div>
    </div>`}`;
};
function readStory(ch){
  if(!S.storyRead.includes(ch)){ S.storyRead.push(ch); gainExp(500); S.lotus+=2;
    toast("이야기를 기록했습니다 · 연등 +2","good"); }
  renderMain(); renderTop(); save();
}

/* ═══════════════════════════════════════════════════
   화면 — 떠돌이 상인(경매) · 매점 · 사역귀 용품점
   ═══════════════════════════════════════════════════ */
VIEWS.merchant=()=>{
  const A=S.auc;
  if(A.phase!=="live"){
    return head("하루 세 번 · 낮 12시 · 저녁 6시 · 밤 10시",ic("luggage")+" 떠돌이 상인",
      `입찰한 륜은 맡겨 두며, 더 높은 입찰이 나오면 돌려받습니다`)+`
    <div class="card pad" style="margin-bottom:14px;padding:10px 14px">
      <span class="tag g">귀속</span> <span class="tiny muted">떠돌이 상인 법구는 낙찰한 학생에게 귀속됩니다. 중개소에 올릴 수 없으며, 판매·분해·각인은 가능합니다.</span>
    </div>
    <div class="card pad" style="margin-bottom:14px">
      <div class="tiny muted">상인은 지금 다른 골목을 돌고 있습니다. 다음 방문은 <b style="color:var(--gold)">${hhmm(A.next)}</b> 뒤,
      1시간 동안 신입생·중급·상급 구간마다 귀한 법구 다섯 점씩 경매에 붙입니다.</div>
      <button class="btn sm" style="margin-top:10px" onclick="aucOpen();renderMain()">수레를 불러 세운다 <span class="tiny">(바로 열기)</span></button>
    </div>
    ${A.hist.length?`<div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">지난 경매 결과</div>
        <span class="tiny muted">${cal().date} 마감</span></div>
      ${["신입생 경매","중급 경매","상급 경매"].map(tn=>{
        const rows=A.hist.filter(h=>h.tn===tn);
        if(!rows.length) return "";
        return `<div style="margin-top:8px"><div class="tiny muted">${tn}</div>
          ${rows.map(h=>`<div class="spread tiny" style="padding:3px 0">
            <span><b style="color:var(--gold)">${esc(h.n)}</b> <span class="muted">Lv ${h.lv} · ${esc(h.by)}</span></span>
            <span>${nf(h.price)} 륜</span></div>`).join("")}</div>`}).join("")}
    </div>`:""}`;
  }
  return head("골목 끝에 선 수레",ic("luggage")+" 떠돌이 상인", `경매 마감까지 <b style="color:var(--gold)">${hhmm(A.left)}</b>`)+`
  <div class="card pad" style="margin-bottom:14px;padding:10px 14px">
    <span class="tag g">귀속</span> <span class="tiny muted">낙찰품은 귀속되어 중개소에 올릴 수 없습니다. 판매·분해·각인은 가능합니다. 더 높은 입찰이 나오면 맡긴 륜을 바로 돌려받습니다.</span>
    <span class="tiny muted" style="float:right">보유 륜 <b style="color:var(--gold)">${nf(S.rin)}</b></span>
  </div>
  ${["신입생 경매","중급 경매","상급 경매"].map((tn,ti)=>`
    <div class="card pad" style="margin-bottom:12px">
      <div class="spread"><div class="sect-t" style="margin:0">${tn}</div>
        <span class="tiny muted">다섯 점</span></div>
      <table class="t">
        ${A.lots.map((L,i)=>({L,i})).filter(x=>x.L.tier===ti).map(({L,i})=>{
          const G=GRADES[L.it.grade];
          const step=Math.max(100,Math.round(L.bid*0.12));
          const mine=L.by==="me";
          return `<tr>
            <td><b style="color:${G.c}">${esc(L.it.name)}</b>
              <div class="tiny muted">${SLOTS.find(s=>s.k===L.it.slot).n} Lv ${L.it.lv} · ${G.n}</div></td>
            <td class="tiny" style="color:var(--jade)">${gearLine(L.it)}</td>
            <td class="tiny ${mine?"":"muted"}" style="${mine?"color:var(--gold)":""}">${mine?"내 입찰":L.npc}</td>
            <td style="text-align:right"><b>${nf(L.bid)}</b></td>
            <td style="text-align:right"><button class="btn sm ${mine?"":"pri"}" ${mine?"disabled":""} onclick="aucBid(${i})">
              ${mine?"최고가":`${nf(L.bid+step)}에 입찰`}</button></td></tr>`}).join("")}
      </table>
    </div>`).join("")}
  <div class="row"><button class="btn" onclick="aucClose();renderMain()">지금 마감하고 낙찰 받기</button></div>`;
};

VIEWS.shop=()=>{
  const used=k=>S.mart[k]||0;
  return head("사무전 1층 · 여와의 매점",ic("store")+" 매점", `보유 륜 ${nf(S.rin)} · 연등 ${S.lotus} · 사리 ${S.sari}`)+`
  <div class="card pad" style="margin-bottom:14px">
    <div class="quote">"앗, 죄송해요! 방금 건 못 본 걸로… 아, 치료용품은 삼장 선생님이 직접 만드신 거예요. 그건 확실해요."</div>
    <div class="tiny muted" style="margin-top:8px">일부 물건은 하루 구매 횟수가 정해져 있으며 한국 시간 0시에 초기화됩니다. 토벌 도전권은 한 주에 2번까지 살 수 있습니다.</div>
  </div>
  <div class="grid g4" style="margin-bottom:14px">
    ${MART.map(m=>{
      const lock=m.req&&S.course<m.req;
      const u=used(m.id), out=m.per!=="ever"&&u>=m.lim;
      const costTxt=Object.keys(m.cost).map(k=>`${({rin:"륜",lotus:"연등",sari:"사리"})[k]} ${nf(m.cost[k])}`).join(" · ");
      return `<div class="sub" style="${lock?"opacity:.45":""}">
        <div class="spread"><b>${m.n}</b>${m.per!=="ever"?`<span class="tiny muted">${u} / ${m.lim}</span>`:""}</div>
        <div class="tiny muted" style="margin:5px 0 8px;min-height:36px">${m.d}</div>
        ${lock?`<div class="tag">${m.req}과정부터</div>`
          :`<button class="btn sm ${out?"":"pri"}" ${out?"disabled":""} onclick="martBuy('${m.id}')">${out?"오늘 끝":`구매 · ${costTxt}`}</button>`}
      </div>`}).join("")}
  </div>
  <div class="card pad">
    <div class="sect-t">소모품 · 탕약</div>
    <div class="grid g4">
      ${SHOP.map(p=>`<div class="sub">
        <div class="spread"><b>${p.n}</b>${p.tag?`<span class="tag">${p.tag}</span>`:""}</div>
        <div class="tiny muted" style="margin:5px 0 8px">${p.d}</div>
        <div class="spread"><span class="tiny" style="color:var(--gold)">륜 ${nf(p.c)}</span>
          <span class="tiny muted">보유 ${S.inv[p.id]||0}</span></div>
        <div class="row" style="margin-top:8px">
          <button class="btn sm" onclick="buy('${p.id}')">구매</button>
          <button class="btn pri sm" ${(S.inv[p.id]||0)<1?"disabled":""} onclick="useItem('${p.id}')">사용</button></div>
      </div>`).join("")}
    </div>
  </div>`;
};
function martBuy(id){
  const m=MART.find(x=>x.id===id);
  if(m.req&&S.course<m.req){ toast(`${m.req}과정부터 살 수 있습니다.`,"bad"); return; }
  const u=S.mart[id]||0;
  if(m.per!=="ever"&&u>=m.lim){ toast("구매 한도에 도달했습니다.","bad"); return; }
  for(const k in m.cost){
    const have={rin:S.rin,lotus:S.lotus,sari:S.sari}[k];
    if(have<m.cost[k]){ toast(`${({rin:"륜",lotus:"연등",sari:"사리"})[k]}이(가) 부족합니다.`,"bad"); return; }
  }
  for(const k in m.cost){ if(k==="rin")S.rin-=m.cost[k]; if(k==="lotus")S.lotus-=m.cost[k]; if(k==="sari")S.sari-=m.cost[k]; }
  S.mart[id]=u+1;
  const g=m.give; let msg=[];
  if(g.sari){ S.sari+=g.sari; msg.push(`사리 +${g.sari}`); }
  if(g.lotus){ S.lotus+=g.lotus; msg.push(`연등 +${g.lotus}`); }
  if(g.rin){ const r=gainRin(g.rin); msg.push(`륜 +${nf(r)}`); }
  if(g.dust){ S.mat.가루+=g.dust; msg.push(`부적가루 +${g.dust}`); }
  if(g.egg){ S.pets.eggs+=g.egg; msg.push(`업연의 알 +${g.egg}`); }
  if(g.mana){ S.mana=Math.min(maxMana()*3, S.mana+manaRate()*g.mana); msg.push(`파장 +${nf(Math.round(manaRate()*g.mana))}`); }
  if(g.wb){ S.wb.tickets+=g.wb; msg.push(`토벌 도전권 +${g.wb}`); }
  if(g.bag){ S.res.r11=Math.min(10,S.res.r11+1); msg.push("바랑 칸 +5"); }
  if(g.forget){ STATS.forEach(s=>{ S.pts+=S.alloc[s.k]; S.alloc[s.k]=0; }); msg.push("분배 포인트 환원"); }
  if(g.mats){ for(let i=0;i<g.mats;i++){ const k=pick(["약초","어물","열매","뿌리","꽃"]); S.mat[k]++; } msg.push("재료 12개"); }
  if(g.gear){ const it=mkGear(S.lvl+rnd(3,7), rnd(1,3)); S.bag.push(it); msg.push(`${GRADES[it.grade].n} 법구 「${it.name}」`); }
  if(g.crest){ const o=pick(OPTS); S.crest={n:`${pick(PREFIX)} 휘장`, key:o.k, v:+(rnd(30,90)/10).toFixed(1)};
    msg.push(`휘장 · ${o.n} +${S.crest.v}%`); }
  toast(msg.join(" · "),"good");
  achCheck(); renderTop(); renderNav(); renderMain(); save();
}

VIEWS.petshop=()=>{
  const lv=p=>p.lv;
  const maxed=S.pets.list.filter(p=>p.lv>=20).length;
  return head("제3구역 골목 끝",ic("basket")+" 사역귀 용품점", `보유 륜 ${nf(S.rin)} · 마일리지 ${S.mile}`)+`
  <div class="card pad" style="margin-bottom:14px">
    <div class="tiny muted">종이학 우체국 옆에 자리한 사역귀 먹이 상점입니다. 주인 할머니가 사역귀마다 좋아하는 것이 다르다고 귀띔합니다.</div>
  </div>
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">마일리지 상점</div>
        <span class="tiny muted">마일리지 <b style="color:var(--gold)">${S.mile}</b></span></div>
      <div class="tiny muted" style="margin-bottom:8px">최대 레벨(20)인 사역귀가 다시 깨어나면 마일리지가 쌓입니다(일반 2 · 고급 5 · 희귀 10 · 영웅 20 · 전설 50). 구매한 알은 바로 깨어납니다.</div>
      <div class="row">
        ${[["희귀 이상 알",28,2],["영웅 이상 알",58,3],["전설 알",100,4]].map(([n,c,g])=>
          `<button class="btn sm ${S.mile>=c?"pri":""}" ${S.mile>=c?"":"disabled"} onclick="mileBuy(${c},${g})">${n} ${c}</button>`).join("")}
      </div>
      <div class="tiny muted" style="margin-top:8px">최대 레벨 사역귀 ${maxed}마리 · <button class="btn sm ghost" onclick="releasePet()">최대 레벨 사역귀 돌려보내기</button></div>
    </div>
    <div class="card pad">
      <div class="sect-t">영양 먹이</div>
      <div class="tiny muted">사역귀의 레벨을 1 올리는 먹이는 「사역귀 사육장」의 카드에서 바로 줄 수 있습니다.</div>
      <button class="btn sm" style="margin-top:9px" onclick="go('pets')">사육장으로 이동</button>
      <hr class="hr">
      <div class="sect-t">오늘 준 간식 ${S.snack.today} / 2</div>
      <div class="tiny muted">간식은 교감할 때 쓰는 소모품입니다. 하루 2번까지 줄 수 있습니다.</div>
    </div>
  </div>
  <div class="card pad">
    <div class="sect-t">간식</div>
    <div class="grid g4">
      ${SNACKS.map(s=>{
        const matOK=!s.mat||S.mat[s.mat]>=(s.mc||1);
        const canBuy=(s.c?S.rin>=s.c:true)&&matOK&&S.snack.today<2&&S.pets.list.length;
        return `<div class="sub">
          <div class="spread"><b>${s.e} ${s.n}</b>${s.tag?`<span class="tag j">${s.tag}</span>`:""}</div>
          <div class="tiny muted" style="margin:5px 0 4px">${s.d}</div>
          <div class="tiny" style="color:var(--jade)">유대 +${s.b}</div>
          <div class="tiny muted">${s.c?`륜 ${nf(s.c)}`:""}${s.mat?`${s.c?" · ":""}${s.mat} ${s.mc||1}`:""}</div>
          <button class="btn sm ${canBuy?"pri":""}" ${canBuy?"":"disabled"} style="margin-top:7px" onclick="giveSnack('${s.id}')">주기</button>
        </div>`}).join("")}
    </div>
  </div>`;
};
function mileBuy(c,g){
  if(S.mile<c){ toast("마일리지가 부족합니다.","bad"); return; }
  S.mile-=c;
  const p=mkPet(g); S.pets.list.push(p); ct("pet");
  toast(`<b>${p.e} ${p.n}</b> (${GRADES[p.g].n})이(가) 깨어났습니다.`,"good");
  achCheck(); renderMain(); save();
}
function releasePet(){
  const i=S.pets.list.findIndex(p=>p.lv>=20);
  if(i<0){ toast("최대 레벨인 사역귀가 없습니다.","bad"); return; }
  const p=S.pets.list[i];
  if(!confirm(`${p.nick||p.n}을(를) 돌려보낼까요? 마일리지를 받습니다.`)) return;
  S.mile+=[2,5,10,20,50][p.g];
  S.pets.list.splice(i,1);
  toast(`${p.n}이(가) 떠났습니다 · 마일리지 +${[2,5,10,20,50][p.g]}`,"good");
  renderMain(); save();
}
function giveSnack(id){
  const s=SNACKS.find(x=>x.id===id);
  if(S.snack.today>=2){ toast("오늘은 두 번 다 주었습니다.","bad"); return; }
  if(!S.pets.list.length){ toast("사역귀가 없습니다.","bad"); return; }
  if(s.c&&S.rin<s.c){ toast("륜이 부족합니다.","bad"); return; }
  if(s.mat&&S.mat[s.mat]<(s.mc||1)){ toast(`${s.mat}이(가) 부족합니다.`,"bad"); return; }
  if(s.c) S.rin-=s.c;
  if(s.mat) S.mat[s.mat]-=(s.mc||1);
  S.snack.today++;
  const p=S.pets.list[0];
  p.bond=Math.min(100,p.bond+s.b);
  toast(`${p.nick||p.n}에게 ${s.n}을(를) 주었습니다 · 유대 +${s.b}`,"good");
  renderTop(); renderMain(); save();
}

/* ═══════════════════════════════════════════════════
   의뢰 화면 — 실시간 일지
   ═══════════════════════════════════════════════════ */
const _quest=VIEWS.quest;
VIEWS.quest=()=>{
  let head1="";
  if(S.run){
    const R=S.run, q=R.q;
    const bar=(f,i)=>`<div class="spread" style="padding:4px 0">
      <div style="width:150px"><span class="tag ${f.pos==="선봉"?"r":f.pos==="지원"?"j":""}">${f.pos||"후열"}</span>
        <b style="color:${f.c}">${esc(f.n)}</b></div>
      <div style="flex:1"><div class="bar hp"><i style="width:${clamp(f.hp/f.max*100,0,100)}%"></i></div></div>
      <span class="tiny muted" style="width:120px;text-align:right">HP ${nf(Math.max(0,f.hp))} / ${nf(f.max)}</span></div>`;
    head1=`<div class="card pad" style="margin-bottom:14px;border-color:var(--gold2)">
      <div class="spread">
        <div><div class="sect-t" style="margin:0">의뢰 일지 <span class="muted">${q.stage}단계 · ${q.ward.n}</span></div>
          <div class="tiny muted" id="runkills">처치 ${R.kills}체 · 받은 륜 ${nf(R.rin||0)} · 경험치 ${nf(R.exp||0)}</div></div>
        <div class="tiny muted" id="runclock">${R.done?"종료됨":hhmm(R.left)+" 남음"}</div></div>
      <div class="bar" style="margin:8px 0 2px"><i id="runprog" style="width:${clamp((1-R.left/Math.max(1,R.total))*100,0,100)}%"></i></div>
      <div class="tiny muted" id="runpace">${R.done?"":`전체 ${hhmm(R.total)} 가운데 ${hhmm(Math.max(0,R.total-R.left))} 지났습니다. 시계와 같은 속도로 흐릅니다.`}</div>
      <div class="log" id="runlog" style="margin:10px 0;max-height:250px">
        ${R.logs.map(l=>`<div><span class="muted" style="font-size:10.5px">${l.time}</span> ${l.t}</div>`).join("")}
      </div>
      <div class="tiny muted" style="margin-bottom:6px">일지는 <b>30초에 한 줄</b>씩 적힙니다. 창을 닫아 두어도 의뢰는 시계대로 흐르고, 돌아오면 그 사이 몫까지 한 번에 따라잡습니다.</div>
      ${bar(R.me)}
      ${R.allies.map(a=>bar(a)).join("")}
      ${R.foes.filter(f=>f.hp>0).map(f=>`<div class="spread" style="padding:4px 0">
        <div style="width:150px"><span class="tag r">적</span> <b style="color:${f.c}">${esc(f.n)}</b></div>
        <div style="flex:1"><div class="bar hp"><i style="width:${clamp(f.hp/f.max*100,0,100)}%"></i></div></div>
        <span class="tiny muted" style="width:120px;text-align:right">HP ${nf(Math.max(0,f.hp))} / ${nf(f.max)}</span></div>`).join("")}
      <div class="row" style="margin-top:10px">
        ${R.done?`<button class="btn pri" onclick="runClear()">일지 닫기</button>`
          :`<button class="btn" onclick="runReturn()">혼자 귀환</button>
            <span class="tiny muted">지금 돌아가면 그때까지 모은 몫만 정산됩니다.</span>`}
        ${!R.done&&R.stage%10===0?'<span class="tiny muted">관문은 도중에 귀환하면 통과로 인정되지 않습니다.</span>':""}
      </div></div>`;
  }
  /* 아래 표시는 「함께 가기」를 끼워 넣을 자리를 알려 줍니다 (진행 중인 일지 바로 다음) */
  return head1+"<!--QSPLIT-->"+_quest();
};
const _runQuest2=runQuest;
runQuest=function(stage,party){
  if(S.run&&!S.run.done){ toast("이미 의뢰를 나가 있습니다.","bad"); return; }
  startRun(stage,party);
};

/* ═══════════════════════════════════════════════════
   카운터 연결 · 내비 · 부팅
   ═══════════════════════════════════════════════════ */
const _finishPeriod=finishPeriod;
finishPeriod=function(){ ct("classH"); S.war.mine=(S.war.mine||0)+6; _finishPeriod(); achCheck(); };
const _harvest=harvest;
harvest=function(i){ const p=S.farm.plots[i];
  if(p&&p.left<=0){ const c=CROPS.find(x=>x.id===p.id); dexAdd("plant",c.n); ct("harvest"); }
  _harvest(i); achCheck(); };
const _cook=cook;
cook=function(id){ const before=S.kit.have[id]||0; _cook(id);
  if((S.kit.have[id]||0)>before){ ct("cook"); dexAdd("dish",DISHES.find(d=>d.id===id).n); achCheck(); } };
const _fishHook=fishHook;
fishHook=function(){ const before=S.ct.fish; _fishHook();
  const el=document.getElementById("fres");
  if(el&&el.innerHTML.includes("card")){ ct("fish");
    const m=el.textContent.match(/^\s*(\S+)\s/); const nm=(el.querySelector("b")||{}).textContent||"";
    const f=FISHES.find(x=>nm.includes(x.n)); if(f) dexAdd("fish",f.n);
    achCheck(); } };
const _recall=recall;
recall=function(i){ const had=S.pets.list[i]&&S.pets.list[i].out&&S.t>=S.pets.list[i].out.end;
  _recall(i); if(had){ ct("dispatch"); S.war.mine=(S.war.mine||0)+4; achCheck(); } };
const _doHatch=doHatch;
doHatch=function(){ _doHatch(); ct("pet"); achCheck(); };
const _climbTower=climbTower;
climbTower=function(c){ const b=S.tower||0; _climbTower(c);
  if((S.tower||0)>b){ ct("boss",Math.floor(((S.tower||0)-b)/50)); S.war.mine=(S.war.mine||0)+((S.tower||0)-b)*8;
    dexAdd("mon",pick(MONS).n); achCheck(); } };
const _climbGuard=climbGuard;
climbGuard=function(c){ const b=S.tower2||0; _climbGuard(c);
  if((S.tower2||0)>b){ S.war.mine=(S.war.mine||0)+((S.tower2||0)-b)*6;
    dexAdd("mon",pick(["쇠사슬 늑대","불 붙은 인형","잿빛 손","목소리 없는 군중"])); achCheck(); } };
const _hitBoss=hitBoss;
hitBoss=function(){ _hitBoss(); ct("wb"); S.war.mine=(S.war.mine||0)+30;
  dexAdd("mon",WBOSS[S.wb.boss%WBOSS.length].n); achCheck(); };
const _arenaGo=arenaGo;
arenaGo=function(m){ const b=S.arena.round; _arenaGo(m);
  if(S.arena.round>b){ S.war.mine=(S.war.mine||0)+25; achCheck(); } };
const _takeExam=takeExam;
takeExam=function(){ const before=S.course; _takeExam();
  const rec=S.examHist[before];
  if(rec){ if(rec.g==="S"){ ct("gradeS"); ct("gradeA"); } else if(rec.g==="A") ct("gradeA");
    S.war.mine=(S.war.mine||0)+120; }
  achCheck(); };
const _startOuting=startOuting;
startOuting=function(w){ _startOuting(w); ct("outing");
  if(!S.dex.wards.includes(w)) S.dex.wards.push(w); achCheck(); };
const _enhance=enhance;
enhance=function(slot){ _enhance(slot); const it=S.gear[slot];
  if(it) ctMax("enhMax",it.enh); S.war.mine=(S.war.mine||0)+3; achCheck(); };
const _setTitle=setTitle;
setTitle=function(t){ if(!S.dex.title.includes(t)) S.dex.title.push(t); _setTitle(t); achCheck(); };
const _finishResearch=finishResearch;
finishResearch=function(){ _finishResearch(); S.war.mine=(S.war.mine||0)+40; achCheck(); };

/* 내비 재구성 */
NAVDEF.length=0;
NAVDEF.push(
 {id:"plaza", ic:ic("gate"), n:"사무전 광장"},
 {id:"study", ic:ic("book"), n:"수업·수행", sub:[{id:"class",n:"강의실"},{id:"research",n:"수행"},{id:"exam",n:"승급 시험"}]},
 {id:"war",   ic:ic("swords"), n:"의뢰·전투", sub:[{id:"quest",n:"의뢰"},{id:"tower",n:"석탑"},{id:"guard",n:"결계의 탑"},
                                          {id:"wboss",n:"업귀 토벌",bd:"주간"},{id:"arena",n:"연무제"},{id:"duel",n:"대련"}]},
 {id:"gearn", ic:ic("sword"), n:"법구·바랑", sub:[{id:"gear",n:"법구"},{id:"stats",n:"능력치"},{id:"bag",n:"바랑"}]},
 {id:"craft", ic:ic("pot"), n:"공방·생활", sub:[{id:"pets",n:"사역귀 사육장"},{id:"fishv",n:"낚시"},{id:"farm",n:"약초밭"},{id:"kitchen",n:"식당"}]},
 {id:"soc",   ic:ic("candle"), n:"교류",      sub:[{id:"map",n:"지도"},{id:"club",n:"모임"},{id:"rel",n:"인연·관계"},
                                          {id:"outing",n:"구역 나들이"},{id:"fest",n:"염라제",bd:"축제"}]},
 {id:"shopn", ic:ic("store"), n:"상점",      sub:[{id:"market",n:"중개소"},{id:"merchant",n:"떠돌이 상인"},{id:"shop",n:"매점"},{id:"petshop",n:"사역귀 용품점"}]},
 {id:"rec",   ic:ic("scroll"), n:"기록·랭킹", sub:[{id:"world",n:"세계관"},{id:"record",n:"업적·도감"},{id:"rank",n:"랭킹"},
                                          {id:"hallv",n:"거처"},{id:"lounge",n:"휴게실"}]},
);
PLACES.push({id:"loungep", n:"휴게실", e:ic("sofa"), x:96, y:66, view:"lounge"});

const _boot3=boot;
boot=function(){ ensureV3(); _boot3(); ensureV3(); achCheck(); renderNav(); renderMain(); };

/* ═══════════ 실시간 의뢰 전용 시계 ═══════════ */
const RUNPACE = 1/60;         // 현실 1초 = 의뢰 1초. 「50분」이라 적힌 의뢰는 정말 50분 걸립니다.
const RUNSTEPMIN = 0.5;       // 일지 한 줄 = 의뢰 30초
let RUNTICK = null;
function runRealTick(){
  if(RUNTICK) clearInterval(RUNTICK);
  RUNTICK = setInterval(()=>{
    if(!S || !S.made || !S.run || S.run.done) return;
    const now = Date.now();
    if(!S.run.lastTick) S.run.lastTick = now;
    let m = (now - S.run.lastTick)/1000 * RUNPACE;
    S.run.lastTick = now;
    if(m <= 0) return;
    if(m > S.run.left) m = S.run.left;          // 자리를 비웠어도 의뢰 분량만큼만
    S.run.left -= m;
    S.run.acc  += m;
    let guard = 0;
    while(S.run.acc >= RUNSTEPMIN && S.run && !S.run.done && guard++ < 600){ S.run.acc -= RUNSTEPMIN; runStep(); }
    if(S.run && !S.run.done && S.run.left <= 0) endRun(true);
  }, 1000);
}
const _bootRun = boot;
/* 창을 닫아 두어도 의뢰는 흐릅니다. 돌아온 순간 비운 시간만큼 한 번에 따라잡습니다. */
boot = function(){ _bootRun(); if(S && S.run && !S.run.done && !S.run.lastTick) S.run.lastTick = Date.now(); runRealTick(); };
const _startRunPace = startRun;
startRun = function(stage, party){ _startRunPace(stage, party);
  if(S.run) S.run.lastTick = Date.now(); runRealTick(); };
