"use strict";

;
/* ===== module: part2.js ===== */
"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장
   법구 · 능력치 · 탑 · 업귀 토벌 · 연무제
   약초밭 · 낚시 · 식당 · 모임 · 중개소
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
 {k:"robe",   n:"법의",  st:"def", e:ic("robe")},
 {k:"cap",    n:"관",    st:"men", e:ic("cap")},
 {k:"charm",  n:"부적",  st:"agi", e:ic("beads")},
 {k:"sutra",  n:"경문",  st:"res", e:ic("scroll")},
];
const GEARWORD={
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

/* ─── 약초밭 · 시트 기반 재배 품종 / 교배 / 날씨 변이 ─── */
const CROPS=[
 {id:"g1", n:"망천연근", e:ic("herb"), t:95, y:"뿌리", s:2, tier:"normal", d:"망천의 물을 빨아들이는 연근."},
 {id:"g2", n:"백옥무", e:ic("herb"), t:95, y:"뿌리", s:2, tier:"normal", d:"속살이 유리처럼 맑은 무."},
 {id:"g3", n:"구름감자", e:ic("herb"), t:95, y:"뿌리", s:2, tier:"normal", d:"가볍게 부풀어 오르는 감자."},
 {id:"g4", n:"죽순", e:ic("herb"), t:95, y:"뿌리", s:2, tier:"normal", d:"사찰 대숲에서 자란 죽순."},
 {id:"g5", n:"야광버섯", e:ic("herb"), t:95, y:"약초", s:2, tier:"normal", d:"어둠 속에 은은히 빛나는 버섯."},
 {id:"g6", n:"청룡부추", e:ic("herb"), t:95, y:"약초", s:2, tier:"normal", d:"푸른 기운이 스미는 부추."},
 {id:"g7", n:"산초잎", e:ic("herb"), t:95, y:"약초", s:2, tier:"normal", d:"코끝을 톡 쏘는 향이 난다."},
 {id:"g8", n:"청경채", e:ic("herb"), t:95, y:"약초", s:2, tier:"normal", d:"옥상 온실의 작고 푸른 잎채소."},
 {id:"g9", n:"매화", e:ic("flower"), t:95, y:"꽃", s:2, tier:"normal", d:"사찰 정원에서 가지마다 맺히는 꽃."},
 {id:"g10", n:"연꽃", e:ic("flower"), t:95, y:"꽃", s:2, tier:"normal", d:"고요한 물에서도 꽃잎을 편다."},
 {id:"g11", n:"홍련꽃", e:ic("flower"), t:95, y:"꽃", s:2, tier:"normal", d:"홍련근에서 이름을 얻은 붉은 꽃 품종."},
 {id:"g12", n:"백련꽃", e:ic("flower"), t:95, y:"꽃", s:2, tier:"normal", d:"흰빛이 오래 머무르는 연꽃 품종."},
 {id:"g13", n:"금강밤", e:ic("pumpkin"), t:95, y:"열매", s:2, tier:"normal", d:"껍질이 무척 단단한 밤."},
 {id:"g14", n:"홍매실", e:ic("pumpkin"), t:95, y:"열매", s:2, tier:"normal", d:"붉은빛이 짙은 온실 매실."},
 {id:"g15", n:"대추", e:ic("pumpkin"), t:95, y:"열매", s:2, tier:"normal", d:"서늘한 바람에서도 익는 대추."},
 {id:"g16", n:"흑설탕호박", e:ic("pumpkin"), t:95, y:"열매", s:2, tier:"normal", d:"달고 진한 향의 호박."},
 {id:"g17", n:"홍련근", e:ic("herb"), t:165, y:"뿌리", s:3, tier:"rare", d:"푸른 연못의 뿌리가 붉게 물들었다.", parents:["g1", "g2"]},
 {id:"g18", n:"법륜죽순", e:ic("herb"), t:165, y:"뿌리", s:3, tier:"rare", d:"마디마다 둥근 무늬가 돋는다.", parents:["g3", "g4"]},
 {id:"g19", n:"혼향버섯", e:ic("herb"), t:165, y:"약초", s:3, tier:"rare", d:"맡는 사람마다 향이 달라진다.", parents:["g5", "g7"]},
 {id:"g20", n:"공명콩", e:ic("herb"), t:165, y:"약초", s:3, tier:"rare", d:"두 알이 서로를 향해 움직인다.", parents:["g6", "g8"]},
 {id:"g21", n:"청화매화", e:ic("flower"), t:165, y:"꽃", s:3, tier:"rare", d:"푸른 불꽃빛 매화. 교배로 태어난 품종.", parents:["g9", "g12"]},
 {id:"g22", n:"연등꽃", e:ic("flower"), t:165, y:"꽃", s:3, tier:"rare", d:"꽃잎 끝에서 작은 연등빛이 돈다.", parents:["g11", "g10"]},
 {id:"g23", n:"귀령밤", e:ic("pumpkin"), t:165, y:"열매", s:3, tier:"rare", d:"푸른 불빛이 잠시 스쳐가는 열매.", parents:["g13", "g15"]},
 {id:"g24", n:"전생대추", e:ic("pumpkin"), t:165, y:"열매", s:3, tier:"rare", d:"어디선가 먹어 본 듯한 달콤한 열매.", parents:["g14", "g16"]},
 {id:"g25", n:"청화연근", e:ic("herb"), t:165, y:"뿌리", s:3, tier:"rare", d:"비를 맞으면 푸른 결을 드러낸다.", from:"g1", weather:0},
 {id:"g26", n:"명야버섯", e:ic("herb"), t:165, y:"약초", s:3, tier:"rare", d:"짙은 안개가 스며든 검은 버섯.", from:"g5", weather:1},
 {id:"g27", n:"망각매실", e:ic("pumpkin"), t:165, y:"열매", s:3, tier:"rare", d:"홍월을 받으면 지난 맛을 잊는다.", from:"g14", weather:2},
 {id:"g28", n:"청혼파", e:ic("herb"), t:165, y:"약초", s:3, tier:"rare", d:"네온 역류에 반응하는 푸른 잎.", from:"g6", weather:4},
 {id:"g29", n:"네온죽순", e:ic("herb"), t:265, y:"뿌리", s:4, tier:"epic", d:"대나무 마디 사이 네온의 빛이 흐른다.", parents:["g17", "g18"]},
 {id:"g30", n:"쌍혼완두", e:ic("herb"), t:265, y:"약초", s:4, tier:"epic", d:"둘이 한 몸처럼 자라는 완두.", parents:["g19", "g20"]},
 {id:"g31", n:"혼향연화", e:ic("flower"), t:265, y:"꽃", s:4, tier:"epic", d:"교배한 꽃잎에서 기억 속 향기가 난다.", parents:["g21", "g22"]},
 {id:"g32", n:"연등밤", e:ic("pumpkin"), t:265, y:"열매", s:4, tier:"epic", d:"연등빛을 품고 익어가는 밤.", parents:["g23", "g24"]},
 {id:"g33", n:"금전버섯", e:ic("herb"), t:265, y:"약초", s:4, tier:"epic", d:"네온 역류가 금속의 광택을 남긴다.", from:"g19", weather:4},
 {id:"g34", n:"혼백연근", e:ic("herb"), t:265, y:"뿌리", s:4, tier:"epic", d:"잿비를 맞아 영혼의 무늬가 깃든 뿌리.", from:"g25", weather:3},
 {id:"g35", n:"불멸대추", e:ic("pumpkin"), t:265, y:"열매", s:4, tier:"epic", d:"홍월이 여러 번 맺히면 잊히지 않는 단맛이 된다.", from:"g24", weather:2},
 {id:"g36", n:"청월연꽃", e:ic("flower"), t:265, y:"꽃", s:4, tier:"epic", d:"바람 없는 밤에 푸른 달처럼 열린다.", from:"g22", weather:5},
 {id:"g37", n:"업결정초", e:ic("herb"), t:390, y:"약초", s:5, tier:"legend", d:"오랜 업의 결정이 자라난 특별한 약초.", parents:["g30", "g33"]},
 {id:"g38", n:"무명연꽃", e:ic("flower"), t:390, y:"꽃", s:5, tier:"legend", d:"이름 없는 밤에도 홀로 피는 꽃.", parents:["g31", "g36"]},
 {id:"g39", n:"삼계연근", e:ic("herb"), t:390, y:"뿌리", s:5, tier:"legend", d:"세 경계의 비를 받은 전설의 연근.", from:"g34", weather:0},
 {id:"g40", n:"영겁의 밤", e:ic("pumpkin"), t:390, y:"열매", s:5, tier:"legend", d:"영겁의 붉은 달빛이 깃든 단단한 밤.", from:"g32", weather:2},
];
/* ─── 낚시 · 확장 도감 ─── */
const FISHES=[
 {n:"검은 숭어",e:ic("fish"),w:19,y:"어물",s:2,p:60,tier:"normal"},
 {n:"등불 해파리",e:ic("jellyfish"),w:11,y:"어물",s:3,p:140,tier:"normal"},
 {n:"파장 갑각류",e:ic("shrimp"),w:9,y:"어물",s:3,p:190,tier:"normal"},
 {n:"심해 가자미",e:ic("goldfish"),w:6,y:"어물",s:4,p:320,tier:"rare"},
 {n:"빛나는 해조",e:ic("herb"),w:4,y:"약초",s:3,p:260,tier:"rare"},
 {n:"이름 없는 것",e:ic("bubble"),w:1,y:"혼백",s:1,p:1400,tier:"legend"},
 {n:"망천장어",e:ic("fish"),w:9,y:"어물",s:4,p:310,tier:"normal"},
 {n:"흑수새우",e:ic("shrimp"),w:7,y:"어물",s:3,p:210,tier:"normal"},
 {n:"청등게",e:ic("shrimp"),w:7,y:"어물",s:3,p:230,tier:"normal"},
 {n:"유령해마",e:ic("fish"),w:6,y:"어물",s:3,p:330,tier:"rare"},
 {n:"홍월 방어",e:ic("fish"),w:5,y:"어물",s:4,p:380,tier:"rare"},
 {n:"네온 해파리",e:ic("jellyfish"),w:4,y:"어물",s:4,p:440,tier:"rare"},
 {n:"서리 지느러미",e:ic("fish"),w:3,y:"어물",s:5,p:520,tier:"epic"},
 {n:"망각 문어",e:ic("fish"),w:3,y:"어물",s:5,p:560,tier:"epic"},
 {n:"영혼 고등어",e:ic("fish"),w:2,y:"어물",s:5,p:700,tier:"epic"},
 {n:"무명 달치",e:ic("goldfish"),w:2,y:"어물",s:6,p:800,tier:"epic"},
 {n:"삼계어",e:ic("fish"),w:1,y:"혼백",s:2,p:1300,tier:"legend"},
 {n:"옥빛 심연어",e:ic("goldfish"),w:1,y:"혼백",s:2,p:1600,tier:"legend"},
];
/* ─── 사무전 만두 식당 : 속재료별 한시 효과 ─── */
/* 텃밭·낚시에서 획득하는 다섯 재료 계통을 그대로 사용합니다.
   동일 레시피 ID(d1~d7)를 유지해 기존 소지품 수량과 섭취 시간이 보존됩니다. */
const DISHES=[
 {id:"d1", n:"백옥무 만두",     e:ic("dumpling"), t:"식사", fill:["뿌리"], mat:{뿌리:3}, buf:[["hpP",.06],["defP",.04]], dur:240, d:"아삭한 무와 뿌리채소를 넣은 든든한 만두. 몸을 단단하게 지탱합니다."},
 {id:"d2", n:"흑설탕호박 만두", e:ic("dumpling"), t:"디저트", fill:["열매"], mat:{열매:4}, buf:[["gold",.10],["loot",.04]], dur:300, d:"달게 익힌 호박 소. 들고 나서면 생각지 못한 작은 복이 따라옵니다."},
 {id:"d3", n:"청룡부추 만두",   e:ic("dumpling"), t:"식사", fill:["약초"], mat:{약초:4}, buf:[["rest",.18],["snGuard",.05]], dur:240, d:"푸릇한 부추와 산채로 속을 채웠습니다. 긴 수행 뒤의 피로를 달래 줍니다."},
 {id:"d4", n:"검은 숭어 만두",  e:ic("dumpling"), t:"식사", fill:["어물"], mat:{어물:4}, buf:[["atkP",.08]], dur:240, d:"망천 바다에서 얻은 어물을 다져 넣었습니다. 대련 전 든든한 한입."},
 {id:"d5", n:"매화과실 만두",   e:ic("dumpling"), t:"디저트", fill:["꽃","열매"], mat:{꽃:3,열매:2}, buf:[["study",.05],["know",.02]], dur:240, d:"과실 소에 매화향을 얹었습니다. 책을 펼치기 전 먹기 좋습니다."},
 {id:"d6", n:"연근산채 만두",   e:ic("dumpling"), t:"식사", fill:["약초","뿌리"], mat:{약초:2,뿌리:2}, buf:[["exp",.06]], dur:240, d:"아삭한 연근과 산채가 어우러집니다. 삼장은 손으로 빚는 시간도 수행이라 합니다."},
 {id:"d7", n:"금강밤대추 만두", e:ic("dumpling"), t:"디저트", fill:["열매","꽃"], mat:{열매:3,꽃:1}, buf:[["crit",.03],["critD",.08]], dur:240, d:"밤과 대추를 으깨 넣은 달콤한 소. 짧은 순간의 집중을 돕습니다."},
 {id:"d8", n:"야광버섯 만두",   e:ic("dumpling"), t:"식사", fill:["약초","뿌리"], mat:{약초:3,뿌리:1}, buf:[["heal",.08],["defP",.03]], dur:270, d:"향긋한 버섯과 뿌리 소. 회복과 방어에 도움이 됩니다."},
 {id:"d9", n:"흑수새우부추 만두",e:ic("dumpling"), t:"식사", fill:["어물","약초"], mat:{어물:3,약초:2}, buf:[["spd",.04],["crit",.02]], dur:240, d:"새우의 탄력과 부추의 향이 살아 있습니다. 움직임이 한결 경쾌해집니다."},
 {id:"d10",n:"죽순나물 만두",   e:ic("dumpling"), t:"식사", fill:["뿌리","약초"], mat:{뿌리:3,약초:1}, buf:[["defP",.05],["snGuard",.04]], dur:300, d:"잘게 썬 죽순을 넣은 담백한 속. 마음과 자세를 가다듬습니다."},
 {id:"d11",n:"연꽃향 만두",     e:ic("dumpling"), t:"디저트", fill:["꽃","열매"], mat:{꽃:4,열매:1}, buf:[["know",.05],["exp",.03]], dur:240, d:"한입 베어 물면 연꽃 향이 은은히 퍼집니다. 배운 것을 오래 기억하게 합니다."},
 {id:"d12",n:"어물연근 만두",   e:ic("dumpling"), t:"식사", fill:["어물","뿌리"], mat:{어물:3,뿌리:2}, buf:[["boss",.06],["atkP",.03]], dur:270, d:"어물과 연근의 씹는 맛. 강한 업귀와 맞설 때 기운을 북돋습니다."},
 {id:"d13",n:"홍매실 만두",     e:ic("dumpling"), t:"디저트", fill:["열매","꽃"], mat:{열매:3,꽃:2}, buf:[["mana",.08],["snGuard",.05]], dur:240, d:"새콤한 매실 소와 꽃잎 향. 흩어지는 파장을 다독입니다."},
 {id:"d14",n:"오색 모둠만두",   e:ic("dumpling"), t:"식사", fill:["약초","뿌리","꽃","열매","어물"], mat:{약초:1,뿌리:1,꽃:1,열매:1,어물:1}, buf:[["gold",.06],["loot",.03]], dur:360, d:"텃밭과 바다에서 얻은 다섯 속재료를 한데 빚었습니다. 복을 부르는 만두."},
 {id:"d15",n:"달빛대추 만두",   e:ic("dumpling"), t:"디저트", fill:["열매","꽃"], mat:{열매:4,꽃:2}, buf:[["exp",.05],["critD",.08]], dur:300, d:"달빛 아래 익힌 대추와 꽃꿀 소. 끝맛이 오래 남습니다."},
];
const OLD_DISH_NAMES={
 "순무 수프":"d1", "잿불 호박 그라탱":"d2", "약초 경단":"d3", "어탕":"d4",
 "별빛 커스터드":"d5", "연화 만두":"d6", "월병":"d7"
};
/* 처음 한 번만 이전 요리 도감을 새 만두로 변경. 만든 수량과 효과 잔여시간은 유지. */
function migrateDumplingKitchen(){
 if(!S||!S.kit) return;
 if(S.kit.dumplingVersion===1)return;
 if(!S.kit.have||typeof S.kit.have!=="object")S.kit.have={};
 const valid=new Set(DISHES.map(d=>d.id));
 const migrated={};
 for(const [id,qty] of Object.entries(S.kit.have)) if(valid.has(id)&&Number(qty)>0)
   migrated[id]=Math.max(0,Math.floor(Number(qty)));
 S.kit.have=migrated;
 ["eat","dess"].forEach(slot=>{ if(S.kit[slot]&&!valid.has(S.kit[slot].id))S.kit[slot]=null; });
 if(S.dex&&Array.isArray(S.dex.dish)){
   const names=new Set(DISHES.map(d=>d.n));
   S.dex.dish=[...new Set(S.dex.dish.map(name=>{
     const id=OLD_DISH_NAMES[name];
     return id?DISHES.find(d=>d.id===id).n:name;
   }).filter(name=>names.has(name)))];
 }
 S.kit.dumplingVersion=1;
}
let DUMPLING_FILL="전체";
/* ─── 모임(동아리) ─── */
const CLUBS=[
 {id:"cl1", n:"등롱회",     e:ic("lantern"), d:"창가에 등롱을 두는 모임. 축제철에 가장 바쁘다.", b:"지식·전리품 +5%"},
 {id:"cl2", n:"야행 순찰대", e:ic("candle"), d:"야간 순찰에 자원하는 학생들의 모임.",          b:"의뢰 륜 +8%"},
 {id:"cl3", n:"필사회",     e:ic("scroll"), d:"서고의 낡은 기록을 베껴 쓰는 모임.",           b:"수업 효율 +6%"},
];
/* ─── 연무제 대진: 교직원 말투는 NPC 설정을 따릅니다. ─── */
const ARENA_ROSTERS=[
 [
  {n:'잿빛 손',role:'업귀 대응 훈련',line:'(잿빛 손들이 연무장 바닥을 짚으며 기어 나온다.)'},
  {n:'쇠사슬 늑대',role:'업귀 대응 훈련',line:'(팽팽해진 사슬 끝에서 낮은 으르렁거림이 울린다.)'},
  {n:'불 붙은 인형',role:'업귀 대응 훈련',line:'(인형의 이음매 사이로 불길이 새어 나온다.)'},
  {n:'업귀 잔해',role:'업귀 대응 훈련',line:'(흩어진 잔해가 다시 하나의 형상을 이룬다.)'},
  {n:'개조 의체 괴한',role:'실전 대응 훈련',line:'“그 자세로 내 공격을 받아낼 수 있겠어?”'},
  {n:'영혼 밀매상',role:'실전 대응 훈련',line:'“이런, 거래할 생각은 없나 보군.”'},
  {n:'마녀의 사역물',role:'사역물 대응 훈련',line:'(기이하게 뒤틀린 형체가 당신의 빈틈을 살핀다.)'},
  {n:'목소리 없는 군중',role:'집단 파장 대응 훈련',line:'(아무 말도 하지 않는 군중이 일제히 고개를 돌린다.)'},
  {n:'종을 삼킨 것',role:'업귀 대응 훈련',line:'(몸속 깊은 곳에서 돌아오지 못한 종소리가 울린다.)'},
  {n:'찢긴 장의 주인',role:'금서고 대응 훈련',line:'(찢어진 책장들이 당신의 앞을 가로막는다.)'},
  {n:'삼장 보건 교사',role:'보건 교사 · 석장 대련',speaker:'삼장',
   line:'“서두르지 마십시오. 힘을 쓰는 일에도 순서가 있습니다. 우선 호흡부터 고르시지요.”',
   win:'“잘하셨습니다. 다만, 이겼다고 해서 몸을 돌보는 일까지 잊으시면 곤란합니다. 잠시 이리 와 보십시오.”',
   lose:'“괜찮습니다. 다친 곳부터 살피겠습니다. 다음에는 무엇을 고쳐야 할지, 함께 짚어 보시지요.”'},
  {n:'강시 경비',role:'경비 · 교내 안전 평가',speaker:'강시',
   line:'“훈련장 확인 끝. 준비됐어? 무기 잘 챙기고. 그럼 시작한다.”',
   win:'“통과. 다친 데는 없어? 있으면 바로 보건실 가.”',lose:'“거기까지. 발밑 확인 안 했지? 다시 준비해 와.”'},
  {n:'여와의 시험 장치',role:'매점 관리인 제작 · 장치 대응 실습',speaker:'여와',
   line:'“저, 저는 직접 싸우는 건 못 해서요⋯⋯. 이 시험 장치를 써도 괜찮을까요? 출력은 분명히 확인했는데⋯⋯.”',
   win:'“와, 정말 멈췄네요⋯⋯! 아, 다치신 데는 없으세요? 그, 작동 기록을 조금만 확인해도 될까요?”',
   lose:'“아앗, 잠시만요! 멈춤 장치가⋯⋯ 여기 있었네요. 죄송해요, 출력부터 다시 확인할게요⋯⋯.”'},
  {n:'양귀비 교사',role:'담임 교사 · 파장 감지 평가',speaker:'양귀비',
   line:'“서두를 것 없단다. 네 파장이 어디서 흔들리는지, 천천히 살펴보렴.”',
   win:'“그래, 이번에는 흐름이 끊기지 않았구나. 그 감각을 기억해 두렴.”',
   lose:'“잠깐 쉬자꾸나. 억지로 밀어붙이면 네가 먼저 지친단다. 숨부터 고르렴.”'},
  {n:'항아 교관',role:'전투 교관 · 근접전 교련',speaker:'항아',
   line:'“허접~♡ 준비 운동은 했지? 좋아, 그럼 어디까지 버티나 보자!”',
   win:'“오, 제법인데? 방금 그 움직임, 실전에서도 잊지 마. 아직 끝난 줄 알고 긴장 풀지는 말고!”',
   lose:'“거기서 눈을 떼면 어떡해? 자, 숨 돌리고. 다음엔 내 발부터 봐.”'}
 ],
 [
  {n:'개조 의체 괴한 · 강화형',role:'심화 실전 대응 훈련',line:'“지난번과 같은 속도라고 생각했다면 늦었어.”'},
  {n:'영혼 밀매상 · 조직 간부',role:'심화 실전 대응 훈련',line:'“소문은 들었지. 값어치를 직접 확인해 볼까.”'},
  {n:'마녀의 사역물 · 상위 개체',role:'상위 사역물 대응 훈련',line:'(다른 방향에서 겹쳐 오는 기척이 퇴로를 좁힌다.)'},
  {n:'목소리 없는 군중 · 집단 파장',role:'집단 파장 대응 훈련',line:'(서로 다른 발걸음이 하나의 박자로 맞물린다.)'},
  {n:'종을 삼킨 것 · 잔향',role:'강화 업귀 대응 훈련',line:'(종소리가 그친 자리에서 또 하나의 울림이 밀려온다.)'},
  {n:'찢긴 장의 주인 · 금서 개방',role:'금서고 심화 대응 훈련',line:'(닫혀 있던 책장이 펼쳐지며 연무장의 공기가 무거워진다.)'},
  {n:'일륜의 그늘',role:'상위 업귀 대응 훈련',line:'(가짜 낮의 그림자가 발치에서부터 길게 번진다.)'},
  {n:'강시 · 정문 수비',role:'경비 · 방어선 돌파 평가',speaker:'강시',
   line:'“여기부터는 못 지나가. 지나가려면, 내가 지키는 선부터 넘어 봐.”',
   win:'“확인. 방어선 돌파. ⋯⋯잘했어. 밖에서도 그만큼 주변을 살펴.”',lose:'“또 정면만 봤네. 출입구는 하나가 아니야. 기억해 둬.”'},
  {n:'삼장 · 석장 대련',role:'보건 교사 · 심화 대련',speaker:'삼장',
   line:'“배운 것을 익히셨다면, 이번에는 흔들리는 순간에도 지켜 보십시오. 무리하실 필요는 없습니다.”',
   win:'“예, 끝까지 자세를 잃지 않으셨군요. 그만큼 쉬는 법도 잘 익혀 두셨기를 바랍니다.”',
   lose:'“아직 끝까지 힘을 주고 계시는군요. 내려놓아야 할 때를 아는 것도 수행입니다.”'},
  {n:'여와의 시험 장치 · 고출력',role:'매점 관리인 제작 · 고출력 장치 실습',speaker:'여와',
   line:'“지난번 기록으로 제어 장치를 보완했어요. 이번에는 출력도 조금⋯⋯ 아, 안전장치는 세 번 확인했어요!”',
   win:'“이 출력에서도 대응하셨네요⋯⋯! 정말 대단하세요. 혹시 불편했던 동작이 있었는지도 알려 주실래요?”',
   lose:'“일단 정지할게요! 장치의 반응 속도를 낮추고⋯⋯ 먼저 괜찮으신지 확인해야겠네요. 죄송해요⋯⋯.”'},
  {n:'양귀비 · 공명 교정',role:'담임 교사 · 심화 공명 평가',speaker:'양귀비',
   line:'“힘이 많이 늘었구나. 이제는 네 힘만 보지 말고, 곁의 파장에도 자리를 내어 주렴.”',
   win:'“그래, 서로에게 맞춰 가는 법을 찾았구나. 지금의 호흡을 잘 기억해 두렴.”',
   lose:'“네가 먼저 전부 감당하려고 하는구나. 잠깐 기다려 주는 것도 나쁘지 않단다.”'},
  {n:'항아 · 가속 교련',role:'전투 교관 · 고속 근접전',speaker:'항아',
   line:'“이번엔 보이는 것만 따라가면 늦어. 멈출 자리까지 생각하고 움직여!”',
   win:'“좋아! 방금은 눈으로 쫓은 게 아니었지? 그 판단, 잊지 마.”',
   lose:'“급하게 꺾으면 네 몸부터 상해. 속도보다 판단이 먼저라고 했지? 다시!”'},
  {n:'강시·양귀비 · 합동 평가',role:'경비·담임 교사 · 협동 대응 평가',speaker:'강시 · 양귀비',
   line:'강시: “나는 앞을 막는다.” 양귀비: “그러니 한 사람만 보고 있으면 곤란하겠지?”',
   win:'강시: “양쪽 확인. 통과.” 양귀비: “눈앞의 움직임만 좇지 않았구나. 잘했단다.”',
   lose:'강시: “뒤쪽, 놓쳤어.” 양귀비: “괜찮단다. 이번에는 주변의 흐름도 함께 살펴보렴.”'},
  {n:'항아·삼장 · 장인·무기 공명',role:'전투 교관·석장 · 페어 합동 교련',speaker:'항아 · 삼장',
   line:'항아: “이번엔 우리 둘이야. 따라올 수 있겠어?” 삼장: “항아 선생님, 학생의 준비부터 확인하시지요.”',
   win:'항아: “이야, 여기까지 뚫네!” 삼장: “두 분의 호흡이 잘 맞았습니다. 이제는 잠시 쉬시지요.”',
   lose:'항아: “내가 움직일 때만 보면 늦지!” 삼장: “서로의 빈틈을 메우는 것이 공명입니다. 다시 살펴보십시오.”'},
  {n:'염라 · 최종 평가',role:'이사장 · 최종 평가',speaker:'염라',
   line:'“홍홍홍 ♬ 여기까지 잘 왔구나. 이번에는 네가 지키려는 것을 보여 다오.”',
   win:'“잘 보았다. 네 곁에 선 이와 함께 고른 길이니, 앞으로도 서로를 놓치지 말거라. 홍홍홍 ♬”',
   lose:'“지금의 결과만으로 너를 정할 생각은 없다. 무엇을 지키려 했는지, 차분히 돌아보거라.”'}
 ]
];
const ARENAFOES=ARENA_ROSTERS[0].map(f=>f.n);
const ARENALINE=ARENA_ROSTERS[0].map(f=>f.line);
function arenaRoster(season=S.arena.season||1){return ARENA_ROSTERS[Number(season)>=2?1:0];}
function arenaEntry(round=S.arena.round,season=S.arena.season||1){const roster=arenaRoster(season);return roster[Math.max(0,Math.min(roster.length-1,Number(round)-1))];}
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
  d("gear",{robe:null,cap:null,charm:null,sutra:null});
  d("bag",[]); d("gid",1);
  /* 이전 저장 기록에 포함된 무기 법구는 부가 법구로 변경하고 바랑에 보관합니다.
     등급·레벨·각인·추가 능력치·고유 ID는 그대로 둡니다. */
  const convertOldWeapon=(it)=>{
    if(!it||it.slot!=="weapon") return;
    const idx=Math.abs(Number(it.id)||0)%SLOTS.length;
    const slot=SLOTS[idx];
    const prefix=PREFIX.find(p=>(it.name||"").startsWith(p+" "))||"무명의";
    const names=GEARWORD[slot.k];
    it.slot=slot.k;
    it.name=`${prefix} ${names[Math.abs(Number(it.id)||0)%names.length]}`;
    if(!it.main) it.main={st:slot.st,v:1};
    it.main.st=slot.st;
  };
  if(S.gear.weapon){
    const oldWeapon=S.gear.weapon;
    convertOldWeapon(oldWeapon);
    if(!S.bag.some(b=>b.id===oldWeapon.id)) S.bag.push(oldWeapon);
  }
  delete S.gear.weapon;
  S.bag.forEach(convertOldWeapon);
  if(S.market&&Array.isArray(S.market.list)) S.market.list.forEach(m=>convertOldWeapon(m?.it));
  if(Array.isArray(S._merch)) S._merch.forEach(m=>convertOldWeapon(m?.it));
  if(S.auc&&Array.isArray(S.auc.lots)) S.auc.lots.forEach(m=>convertOldWeapon(m?.it));
  /* 장인에게는 별도의 무기 설정이 없습니다. 페어인 마무기가 실제 무기입니다. */
  if(S.line==="장인") S.weapon="";
  // 이전 버전에서 착용했던 고레벨 법구는 잃지 않도록 바랑으로 되돌립니다.
  SLOTS.forEach(sl=>{ const it=S.gear[sl.k];
    if(it && (Number(it.lv)||1)>S.lvl){
      if(!S.bag.some(b=>b.id===it.id)) S.bag.push(it);
      S.gear[sl.k]=null;
    }
  });
  d("mat",{가루:120,약초:0,어물:0,열매:0,뿌리:0,꽃:0,혼백:0});
  d("tower",0); d("tower2",0);
  d("wb",{dmg:0,tickets:3,next:300,total:0,week:0,boss:0,rank:0});
  d("arena",{round:1,best:0,cool:0});
  d("farm",{plots:Array.from({length:9},()=>null),skill:1,exp:0,fert:3,order:null,done:0});
  d("fish",{skill:1,exp:0,cool:0,catches:{}});
  if(!S.fish.catches || typeof S.fish.catches!=="object") S.fish.catches={};
  d("kit",{have:{},eat:null,dess:null});
  d("club",null);
  d("market",{list:[],next:0});
  d("meal",null);
  migrateDumplingKitchen();
  if(!S.alloc) S.alloc={atk:0,def:0,agi:0,men:0,res:0};
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
function clubOpt(key){
  if(!S.club) return 0;
  const m={cl1:{know:.05,loot:.05}, cl2:{gold:.08}, cl3:{study:.06}}[S.club.id]||{};
  let v=m[key]||0;
  if(S.club.blessed>0 && (key==="know"||key==="loot")) v+=.05;
  return v;
}
/* mod 확장 */
const _mod=mod;
mod=function(key){ return _mod(key)+gearOpt(key)+clubOpt(key)+mealOpt(key); };
// Keep the two existing save/sync slots, but let either hold any dumpling.
function activeMeals(){
  const found=new Map();
  for(const slot of ['eat','dess']){
    const meal=S.kit?.[slot],dish=meal&&DISHES.find(d=>d.id===meal.id);
    if(!dish||!(meal.left>0))continue;
    const previous=found.get(meal.id);
    if(!previous||meal.left>previous.meal.left)found.set(meal.id,{slot,meal,dish});
  }
  return [...found.values()];
}
function mealOpt(key){
  return activeMeals().reduce((sum,{dish})=>sum+dish.buf.reduce((v,[k,n])=>v+(k===key?n:0),0),0);
}
function mealRuleText(){return '서로 다른 만두는 분류와 관계없이 2종까지 효과가 합산됩니다. 같은 만두는 효과가 중복되지 않고 시간만 연장됩니다(기본 지속시간의 최대 2배). 세 번째 종류는 교체할 효과를 고르며, 선택 전에는 소모하지 않습니다. 물약·탕약 효과도 함께 적용됩니다.';}
function mealEatLabel(id){return activeMeals().some(x=>x.meal.id===id)?'시간 연장':activeMeals().length>=2?'효과 선택':'먹기';}
function mealChips(){
  return activeMeals().map(({meal,dish},i)=>({n:dish.n,left:meal.left,e:dish.e||ic('bento'),c:'var(--gold)',slot:'만두 '+(i+1),
    d:dish.buf.map(([k,v])=>OPTNAME(k)+' +'+Math.round(v*100)+'%').join(' · ')}));
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
power=function(){ return _power()+gearPower(); };

/* ═══════════ 법구 생성 ═══════════ */
function mkGear(lv,gradeHint,fromLoot=false){
  const slot=pick(SLOTS);
  let g=gradeHint!==undefined?gradeHint:(()=> {
    const r=Math.random()*100;
    return r>97?4:r>88?3:r>70?2:r>44?1:0; })();
  g=clamp(g,0,4);
  if(fromLoot&&gradeHint===undefined&&g<4&&Math.random()<lootQualityChance()) g++;
  const G=GRADES[g];
  const base=Math.max(1,Math.round((0.8+lv*.085)*G.m));
  const opts=[];
  const pool=[...OPTS].sort(()=>Math.random()-.5).slice(0,G.opt);
  pool.forEach(o=>opts.push({k:o.k,n:o.n,v:+(rnd(o.v[0]*10,o.v[1]*10)/10*(1+g*.12)).toFixed(1)}));
  return {id:S.gid++, slot:slot.k, name:`${pick(PREFIX)} ${pick(GEARWORD[slot.k])}`,
    grade:g, lv:Math.max(1,Math.min(lv,S.lvl)), enh:0, main:{st:slot.st,v:base}, opts, isNew:true};
}
function gearScore(it){
  let p=it.main.v*900+it.enh*210*GRADES[it.grade].m;
  it.opts.forEach(o=>p+=o.v*95); return Math.round(p);
}
function gearCanEquip(it){ return !!it && SLOTS.some(s=>s.k===it.slot) && (Number(it.lv)||1)<=S.lvl; }
function equip(id){
  const i=S.bag.findIndex(x=>x.id===id); if(i<0) return;
  const it=S.bag[i];
  if(!gearCanEquip(it)){ toast(`Lv ${it.lv}부터 착용할 수 있습니다. 현재 Lv ${S.lvl}입니다.`,"bad"); return; }
  const old=S.gear[it.slot];
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

/* ─── 효과 이름 (법구·요리·수업에서 공용) ─── */
function OPTNAME(k){
  return ({atkP:"공격력",hpP:"생명력",defP:"방어력",crit:"치명타 확률",critD:"치명타 피해",spd:"공격 속도",
    gold:"륜 획득",exp:"경험치",loot:"전리품 획득 확률",quality:"법구 품질 상승 확률",snGuard:"이성 소모 감소",rest:"체력·이성 자연 회복",heal:"치유·보호막 위력",boss:"업귀 피해",mana:"파장 재생",study:"수업 보상",know:"지식 획득"})[k]||k;
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
  if(FISHGAME && FISHGAME.frame) cancelAnimationFrame(FISHGAME.frame);
  FISHGAME={state:"idle",bar:0,dir:1,target:rnd(14,72),frame:null,started:0,spd:75};
  drawFish2();
}
// 실제 클릭 시각과 화면의 막대 위치를 동일한 고해상도 시계로 계산합니다.
function fishBarAt(F,t){
  const phase=((t-F.started)/1000*F.spd)%200;
  return phase<=100?phase:200-phase;
}
function fishFrame(){
  const F=FISHGAME;
  if(!F||F.state!=="run") return;
  const el=document.getElementById("fbar");
  if(!el){ F.state="idle"; return; }
  F.bar=fishBarAt(F,performance.now());
  el.style.left=F.bar+"%";
  F.frame=requestAnimationFrame(fishFrame);
}
function drawFish2(){
  const F=FISHGAME;
  modal(ic("fishing")+" 제7구역 검은 바다",`
    <div class="tiny muted" style="margin-bottom:10px">「던진다」를 누르면 붉은 바늘이 움직입니다. 바늘이 <b style="color:var(--gold)">금빛 구간</b>에 있을 때 「챈다」를 누르면 성공하며, 정중앙에 가까울수록 희귀한 어획물을 얻기 쉽습니다. 버튼을 누르는 순간 판정됩니다.</div>
    <div style="position:relative;height:28px;background:var(--s1);border:1px solid var(--line);border-radius:7px;overflow:hidden">
      <div style="position:absolute;left:${F.target}%;width:16%;top:0;bottom:0;background:rgba(218,173,61,.27);border-left:2px solid var(--gold);border-right:2px solid var(--gold)"></div>
      <div id="fbar" style="position:absolute;left:${F.bar}%;top:0;bottom:0;width:3px;background:var(--red);box-shadow:0 0 8px var(--red)"></div>
    </div>
    <div class="row" style="margin-top:12px">
      ${F.state==="run"?`<button class="btn pri" onpointerdown="fishHook(event)" onclick="fishHook(event)">챈다</button>`
        :`<button class="btn pri" onclick="fishCast()">던진다</button>`}
      <span class="tiny muted">낚시 숙련도 Lv ${S.fish.skill} · 어물 ${S.mat.어물}</span>
      <button class="btn" style="margin-left:auto" onclick="fishQuit()">그만</button>
    </div>
    <div id="fres" style="margin-top:10px"></div>`);
}
function fishQuit(){
  if(FISHGAME){ FISHGAME.state="idle"; if(FISHGAME.frame) cancelAnimationFrame(FISHGAME.frame); }
  closeModal(); renderMain();
}
function fishCast(){
  const F=FISHGAME;
  if(!F||F.state==="run") return;
  F.state="run"; F.bar=0; F.target=rnd(14,72); F.spd=60+Math.random()*22;
  F.started=performance.now();
  drawFish2();
  F.frame=requestAnimationFrame(fishFrame);
}
function fishRoll(perfect,random=Math.random){
  // 금빛 정중앙은 뒤쪽 희귀 어종의 가중치를 높입니다(평소에는 표기된 기본 확률 적용).
  const weights=FISHES.map((f,i)=>f.w*(perfect?1+i*0.75:1));
  const r=random()*weights.reduce((a,b)=>a+b,0);
  let acc=0, got=FISHES[0];
  for(let i=0;i<FISHES.length;i++){
    acc+=weights[i]; if(r<=acc){ got=FISHES[i]; break; }
  }
  return got;
}
function fishHook(){
  const F=FISHGAME;
  if(!F||F.state!=="run") return; // pointerdown 뒤 click 중복 방지
  F.bar=fishBarAt(F,performance.now());
  F.state="idle";
  if(F.frame) cancelAnimationFrame(F.frame);
  const hit=F.bar>=F.target && F.bar<=F.target+16;
  const perfect=hit && Math.abs(F.bar-(F.target+8))<4;
  if(!hit){
    drawFish2();
    document.getElementById("fres").innerHTML=`<div class="tiny" style="color:var(--red)">빈 바늘입니다. 금빛 구간에서 챔질해 보세요.</div>`;
    return;
  }
  const got=fishRoll(perfect);
  S.mat[got.y]+=got.s;
  S.fish.exp+=10;
  S.fish.catches[got.n]=(S.fish.catches[got.n]||0)+1;
  if(S.dex && S.dex.fish) dexAdd("fish",got.n);
  if(typeof ct==="function") ct("fish");
  while(S.fish.exp>=S.fish.skill*90){ S.fish.exp-=S.fish.skill*90; S.fish.skill++; toast(`낚시 숙련도 Lv ${S.fish.skill}`,"good"); }
  gainExp(30); addMark(2);
  if(typeof achCheck==="function") achCheck();
  drawFish2();
  document.getElementById("fres").innerHTML=
    `<div class="card pad" style="padding:9px 12px"><b>${got.e} ${got.n}</b> ${perfect?'<span class="tag g">정중앙</span>':""}
     <div class="tiny" style="color:var(--jade)">${got.y} +${got.s} · 이번 어획 1회 · 경험치 +30</div></div>`;
  renderTop(); save();
}

/* ═══════════ 식당 ═══════════ */
function cook(id){
  const d=DISHES.find(x=>x.id===id);
  if(!d){toast("이전 요리 레시피는 더 이상 사용하지 않습니다.","bad");return;}
  for(const k in d.mat){ if(S.mat[k]<d.mat[k]){ toast(`${k}이(가) 부족합니다.`,"bad"); return; } }
  for(const k in d.mat) S.mat[k]-=d.mat[k];
  S.kit.have[id]=(S.kit.have[id]||0)+1;
  toast(`${d.n}을(를) 만들었습니다.`,"good"); renderMain(); save();
}
function eat(id,replaceSlot,expectedId){
  const d=DISHES.find(x=>x.id===id);
  if(!d){toast('이전 요리 레시피는 더 이상 사용할 수 없습니다.','bad');return;}
  if(!(S.kit.have[id]>0)){toast('보유한 만두가 없습니다.','bad');return;}
  const meals=activeMeals(),same=meals.find(x=>x.meal.id===id);
  if(replaceSlot&&(!['eat','dess'].includes(replaceSlot)||expectedId&&S.kit[replaceSlot]?.id!==expectedId)){
    toast('적용 중인 만두가 바뀌었습니다. 효과를 다시 확인해 주세요.');return;
  }
  if(same){
    if(same.meal.left>=d.dur*2-1){toast('최대 지속시간까지 1분 미만 남아 있어 만두를 소모하지 않았습니다.');return;}
    S.kit.have[id]--;
    same.meal.left=Math.min(d.dur*2,Number(same.meal.left)+d.dur);
    toast(d.n+' · 효과는 그대로, 지속시간을 연장했습니다.','good');
  }else{
    const occupied=new Set(meals.map(x=>x.slot));
    const slot=replaceSlot||['eat','dess'].find(k=>!occupied.has(k));
    if(!slot){
      modal('만두 효과 선택',`<p>서로 다른 만두는 최대 2종까지 함께 적용됩니다. <b>${esc(d.n)}</b>를 먹고 어떤 효과를 교체할지 골라 주세요.</p>
        <div class="tiny muted" style="margin-bottom:12px">아직 만두는 소모하지 않았습니다. 취소하면 현재 효과를 유지합니다.</div>
        <div class="grid g2">${meals.map(x=>`<div class="sub"><b>${esc(x.dish.n)}</b><p class="tiny muted">${hhmm(x.meal.left)} 남음 · ${x.dish.buf.map(([k,v])=>OPTNAME(k)+' +'+Math.round(v*100)+'%').join(' · ')}</p><button class="btn pri sm" onclick="eat('${id}','${x.slot}','${x.meal.id}')">이 효과 대신 먹기</button></div>`).join('')}</div><button class="btn" style="margin-top:12px" onclick="closeModal()">취소</button>`);
      return;
    }
    S.kit.have[id]--;S.kit[slot]={id,left:d.dur};
    if(replaceSlot)closeModal();
    toast(d.n+' · '+d.buf.map(([k,v])=>OPTNAME(k)+' +'+Math.round(v*100)+'%').join(', '),'good');
  }
  renderTop();renderMain();save();
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
  // 만두 효과
  ["eat","dess"].forEach(s=>{ const k=S.kit[s]; if(k){ k.left-=m; if(k.left<=0) S.kit[s]=null; } });
  // 월드 보스 도전권
  S.wb.next-=m;
  if(S.wb.next<=0){ if(S.wb.tickets<3){ S.wb.tickets++; toast("업귀 토벌 도전권이 1장 충전되었습니다."); } S.wb.next=300; }

  // 모임 축복
  if(S.club&&S.club.blessed>0) S.club.blessed=Math.max(0,S.club.blessed-m);
  // 연무제 쿨
  if(S.arena.cool>0) S.arena.cool=Math.max(0,S.arena.cool-m);
  // 중개소 갱신
  S.market.next-=m; if(S.market.next<=0) rollMarket();
};
const _onNewDay=onNewDay;
onNewDay=function(){
  _onNewDay();
  if(S.club){ S.club.att=false; S.club.contrib=0; }
  S.farm.fert+=2;
  rollFarmOrder();
  S.fish.cool=0;
};

/* ═══════════ 내비 재구성 ═══════════ */
NAVDEF.length=0;
NAVDEF.push(
 {id:"plaza", ic:ic("gate"), n:"사무전 광장"},
 {id:"study", ic:ic("book"), n:"수업·수행", sub:[{id:"class",n:"강의실"},{id:"research",n:"수행"},{id:"exam",n:"승급 시험"}]},
 {id:"war",   ic:ic("swords"), n:"의뢰·전투", sub:[{id:"quest",n:"의뢰"},{id:"tower",n:"석탑"},{id:"guard",n:"결계의 탑"},
                                          {id:"wboss",n:"업귀 토벌",bd:"주간"},{id:"arena",n:"연무제"},{id:"duel",n:"대련"}]},
 {id:"gearn", ic:ic("beads"), n:"법구·바랑", sub:[{id:"gear",n:"법구"},{id:"stats",n:"능력치"},{id:"bag",n:"바랑"}]},
 {id:"craft", ic:ic("pot"), n:"공방·생활", sub:[{id:"fishv",n:"낚시"},{id:"farm",n:"약초밭"},{id:"kitchen",n:"만두 식당"}]},
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
  const equipped = where==="on", can=gearCanEquip(it);
  return `<div class="sub" style="border-color:${equipped?G.c:"var(--line)"}">
    <div class="spread"><div>
      <b style="color:${G.c}">${esc(it.name)}${it.enh?` +${it.enh}`:""}</b>
      ${it.isNew?'<span class="tag r">NEW</span>':""}
      <div class="tiny muted">${SLOTS.find(s=>s.k===it.slot).n} · Lv ${it.lv} · ${G.n}${can?"":` · <span style="color:var(--red)">착용 불가 (Lv ${it.lv} 필요)</span>`}</div>
    </div><div style="text-align:right"><div class="tiny muted">전투력</div>
      <b style="color:var(--gold)">${nf(gearScore(it))}</b></div></div>
    <div class="tiny" style="margin:6px 0 8px;color:var(--jade)">${gearLine(it)}</div>
    <div class="row">
      ${equipped
        ? `<button class="btn sm pri" onclick="enhance('${it.slot}')">각인 +${it.enh+1}</button>
           <button class="btn sm" onclick="unequip('${it.slot}')">해제</button>
           <span class="tiny muted" style="margin-left:auto">성공 ${Math.round(enhRate(it)*100)}% · 륜 ${nf(enhCost(it).rin)} · 가루 ${enhCost(it).dust}</span>`
        : `<button class="btn sm pri" ${can?"":"disabled"} onclick="equip(${it.id})">${can?"장착":`Lv ${it.lv} 필요`}</button>
           <button class="btn sm" onclick="sellGear(${it.id})">판매</button>
           <button class="btn sm" onclick="dismantle(${it.id})">분해</button>
           <button class="btn sm ghost" onclick="listMine(${it.id})">중개소에 내놓기</button>`}
    </div></div>`;
}
VIEWS.gear=()=>{
  const best=(slot)=>{
    const cands=S.bag.filter(b=>b.slot===slot && gearCanEquip(b));
    if(!cands.length) return null;
    return cands.reduce((a,b)=>gearScore(b)>gearScore(a)?b:a);
  };
  return head("법의 · 관 · 부적 · 경문",ic("beads")+" 법구", `전투력 <b style="color:var(--gold)">${nf(power())}</b>`)+`
  <div class="gear-slot-scroll" aria-label="법의·관·부적·경문 법구 장비 목록">
  <div class="gear-slot-grid">
    ${SLOTS.map(sl=>{
      const it=S.gear[sl.k]; const b=best(sl.k);
      const up=b&&(!it||gearScore(b)>gearScore(it));
      if(!it) return `<div class="sub gear-slot-card" style="border-style:dashed">
        <div class="tiny muted">${sl.e} ${sl.n}</div>
        <div class="tiny muted">비어 있습니다</div><div></div><div></div>
        <div class="gear-slot-actions">${b?`<button class="btn sm pri" onclick="equip(${b.id})">가장 좋은 것 장착</button>`:`<span class="tiny muted">바랑에도 없습니다</span>`}</div><div></div></div>`;
      return `<div class="sub gear-slot-card" style="border-color:${GRADES[it.grade].c}">
        <div class="spread"><span class="tiny muted">${sl.e} ${sl.n}</span>${gradeTag(it.grade)}</div>
        <b style="color:${GRADES[it.grade].c}">${esc(it.name)}${it.enh?` +${it.enh}`:""}</b>
        <div class="tiny muted">Lv ${it.lv} · 전투력 ${nf(gearScore(it))}</div>
        <div class="tiny" style="color:var(--jade);margin:5px 0 8px">${gearLine(it)}</div>
        <div class="gear-slot-actions">
          <button class="btn sm pri" onclick="enhance('${sl.k}')">각인 +${it.enh+1}</button>
          <button class="btn sm" ${S.sari<3?"disabled":""} onclick="enhance('${sl.k}',true)" title="사리 3을 더 내면 실패하지 않습니다">보호 각인</button>
          <button class="btn sm" onclick="unequip('${sl.k}')">해제</button>
          ${up?`<button class="btn sm" style="color:var(--jade)" onclick="equip(${b.id})">▲ 교체</button>`:""}
        </div>
        <div class="tiny muted" style="margin-top:6px">각인 성공률 ${Math.round(enhRate(it)*100)}% · 륜 ${nf(enhCost(it).rin)} · 부적가루 ${enhCost(it).dust} <span style="color:var(--s7)">· 보호는 사리 3 추가</span></div>
      </div>`;
    }).join("")}
  </div>
  </div>

  <div class="card pad" style="margin-bottom:14px">
    <div class="row">
      <button class="btn sm" onclick="equipBest()">가장 좋은 법구 장착</button>
      <button class="btn sm" onclick="unequipAll()">전체 해제</button>
      <span class="tiny muted" style="margin-left:auto">부적가루 <b style="color:var(--gold)">${nf(S.mat.가루)}</b> · 사리 ${nf(S.sari)} · 각인은 실패해도 단계가 떨어지지 않으며, 법구를 바꾸면 <b>이전 각인의 70%가 새 법구로 옮겨 새겨집니다</b></span>
    </div>
  </div>

  <div class="card pad">
    <div class="spread"><div class="sect-t" style="margin:0">바랑 ${S.bag.length} / ${bagCapacity()}</div>
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
    const cands=S.bag.filter(b=>b.slot===sl.k && gearCanEquip(b)); if(!cands.length) return;
    const b=cands.reduce((a,c)=>gearScore(c)>gearScore(a)?c:a);
    if(!S.gear[sl.k]||gearScore(b)>gearScore(S.gear[sl.k])) equip(b.id);
  });
  toast("가장 좋은 법구를 장착했습니다.","good");
}
function unequipAll(){ SLOTS.forEach(sl=>unequip(sl.k)); }

VIEWS.bag=()=>{
  const matRows=Object.keys(S.mat).map(k=>`<div class="spread tiny" style="padding:3px 0"><span>${k}</span><b>${nf(S.mat[k])}</b></div>`).join("");
  const dishRows=Object.keys(S.kit.have).filter(k=>S.kit.have[k]>0 && DISHES.some(d=>d.id===k)).map(k=>{
    const d=DISHES.find(x=>x.id===k);
    return `<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--s3)">
      <div><b>${d.e} ${d.n}</b> ×${S.kit.have[k]}<div class="tiny muted">${d.t} · ${d.buf.map(([a,b])=>OPTNAME(a)+" +"+Math.round(b*100)+"%").join(", ")} · ${hhmm(d.dur)}</div></div>
      <button class="btn sm pri" onclick="eat('${k}')">먹기</button></div>`}).join("");
  const itemRows=Object.keys(S.inv).filter(k=>S.inv[k]>0).map(k=>{
    const p=SHOP.find(x=>x.id===k);
    return `<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--s3)">
      <div><b>${p.n}</b> ×${S.inv[k]}<div class="tiny muted">${p.d}</div></div>
      <button class="btn sm pri" onclick="useItem('${k}');renderMain()">사용</button></div>`}).join("");
  return head("소지품 · 보관품",ic("bag")+" 바랑", `${S.bag.length} / ${bagCapacity()}칸`)+`
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="sect-t">재료</div>${matRows}
      <hr class="hr">
      <div class="spread tiny"><span>비료</span><b>${S.farm.fert}</b></div>
    </div>
    <div class="card pad">
      <div class="sect-t">만두</div>
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
        <button class="btn sm red" style="margin-left:auto" onclick="resetAlloc()">망각의 차로 초기화 · 연등 5개</button>
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
  // 능력치 초기화와 매점의 망각의 차는 완전히 동일한 구매 경로를 사용합니다.
  // 연등 5개와 하루 구매 한도도 함께 적용됩니다.
  martBuy("m10");
}

function setTend(t){ S.tendency=t; renderMain(); renderNav(); renderTop(); save(); }

/* 수행 단계 상승 시 포인트 */
const _gainExp=gainExp;
gainExp=function(n,exact=false){
  const before=S.lvl; const r=_gainExp(n,exact);
  if(S.lvl>before) S.pts+=(S.lvl-before)*2;
  return r;
};

/* ═══════════════════════════════════════════════════
   화면 — 석탑 · 결계의 탑 · 업귀 토벌 · 연무제
   ═══════════════════════════════════════════════════ */
function towerFoe(n){ return {hp:Math.round(36000*Math.pow(1.07,n)), dps:Math.round(720*Math.pow(1.065,n)), n:n}; }
function guardFoe(n){ return {dps:Math.round(240*Math.pow(1.07,n)), n:n}; }

VIEWS.tower=()=>{
  const fl=(S.tower||0)+1, f=towerFoe(fl), c=C();
  const sec=f.hp/Math.max(1,c.dps);
  const canKill=sec<=60;
  const survive=c.hp/Math.max(1,f.dps*Math.max(0,1-c.def/(c.def+9000)));
  const win=canKill&&survive>=Math.min(60,sec)&&(fl%50!==0||sec<=45);
  return head("끝없이 이어지는, 파트너와 함께 오르는 탑",ic("tower")+" 석탑", `최고 ${S.tower||0}층`)+`
  ${buffStrip()}
  <div class="card pad" style="margin-bottom:14px">
    <div class="spread"><div><b>석탑</b> <span class="tag g">최고 ${S.tower||0}층</span></div>
      <span class="tiny muted">도전 횟수 제한 없음 · 연속 도전 최대 10층</span></div>
    <div class="tiny muted" style="margin:6px 0 10px">석탑 내부에는 명계 전역의 파장을 모으는 감응 장치와 결계의 핵이 있다.
    층마다 봉인된 것이 하나씩 깨어나며, 한 번에 한 층씩 싸운다. 초당 피해가 되는 만큼 오를 수 있고, 오른 층은 줄어들지 않는다(60초 제한).</div>
    <h3 style="margin:4px 0 2px;font-size:18px">${fl}층</h3>
    <div style="font-size:16px;font-weight:600">${towerName(fl)}</div>
    <div class="tiny muted">${Math.round(fl*1.6)}단계 수준 · 체력 ${nf(f.hp)} · 초당 피해 ${nf(f.dps)}</div>
    <div class="tiny" style="color:${win?"var(--jade)":"var(--red)"};margin-top:4px">
      ${win?`약 ${sec.toFixed(1)}초에 제압 예상`:canKill?`쓰러뜨리기 전에 무너집니다 (버티는 시간 약 ${survive.toFixed(1)}초)`:"아직 버겁습니다"}</div>
    <div class="tiny muted" style="margin-top:4px">이 층 보상 <span style="color:var(--gold)">륜 ${nf(500+fl*110)}</span> · 사리 ${fl%5===0?1:0} · 법구 1</div>
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
  for(let k=0;k<(chain?10:1);k++){
    const fl=(S.tower||0)+1, f=towerFoe(fl), c=C();
    const sec=f.hp/Math.max(1,c.dps);
    const mit=Math.max(0,1-c.def/(c.def+9000));
    const survive=c.hp/Math.max(1,f.dps*mit);
    const boss=fl%50===0;
    const win = sec<=60 && survive>=Math.min(60,sec) && (!boss||sec<=45);
    logs.push(`<span class="${win?"s":"h"}">${fl}층 ${towerName(fl)}</span> — 제압 ${sec<=60?sec.toFixed(1)+"초":"실패"} / 버팀 ${survive.toFixed(1)}초 → ${win?"돌파":"패배"}`);
    if(!win) break;
    S.tower=fl; gained++;
    rin+=500+fl*110; if(fl%5===0) sari++; S.mat.가루+=2;
    if(fl%3===0) drops.push(mkGear(Math.round(fl*1.4),undefined,true));
    if(fl%10===0) S.lotus+=3;
    if(!chain) break;
  }
  if(gained){ gainRin(rin); S.sari+=sari; drops.forEach(d=>balanceStoreLoot(d)); gainExp(260*gained); addMark(6*Math.min(5,gained)); }
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
      <span class="tiny muted">도전 횟수 제한 없음 · 연속 도전 최대 10층</span></div>
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
    <div class="tiny muted" style="margin-top:4px">이 층 보상 <span style="color:var(--gold)">륜 ${nf(400+fl*90)}</span></div>
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
  for(let k=0;k<(chain?10:1);k++){
    const fl=(S.tower2||0)+1, f=guardFoe(fl), c=C();
    const mit=Math.max(0,1-c.def/(c.def+9000))*(S.tendency==="수호"?.8:1);
    const sustain=c.hp*c.heal/Math.max(1,f.dps*mit);
    const win=sustain>=30;
    logs.push(`<span class="${win?"s":"h"}">${fl}층</span> — 버틴 시간 ${Math.min(99,sustain).toFixed(1)}초 / 30초 → ${win?"방어 성공":"붕괴"}`);
    if(!win) break;
    S.tower2=fl; gained++; rin+=400+fl*90;
    if(fl%4===0) drops.push(mkGear(Math.round(fl*1.3),undefined,true));
    if(fl%10===0) S.lotus+=3;
    if(!chain) break;
  }
  if(gained){ gainRin(rin); drops.forEach(d=>balanceStoreLoot(d)); gainExp(220*gained); addMark(6*Math.min(5,gained)); }
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
    보상: 토벌하는 순간 도전한 학생 모두에게 연등 20. 다음 주에 참여 연등 10과 피해 상위 1%·10%·50% 추가 보상.</div>
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

function arenaFoe(r,sn){
 const scale=window.PAIR_PLAY?.ready?1.7:1;
 if(sn<=1)return {hp:Math.round(25000*Math.pow(1.30,r)*scale),dps:Math.round(450*Math.pow(1.25,r)*scale)};
 // The next event starts above the first event's champion, rather than resetting
 // to a weak opening opponent. Subsequent rounds and events keep increasing.
 const step=(sn-2)*15+Math.max(0,r-1);
 return {hp:Math.round(25000*Math.pow(1.30,15)*1.15*Math.pow(1.11,step)*scale),
   dps:Math.round(450*Math.pow(1.25,15)*1.12*Math.pow(1.09,step)*scale)};
}
VIEWS.arena=()=>{
  const r=S.arena.round, sn=S.arena.season||1;
  const entry=arenaEntry(r,sn),roster=arenaRoster(sn),foe=entry.n;
  const c=C();
  const opponent=arenaFoe(r,sn),fhp=opponent.hp,fdps=opponent.dps;
  const sec=fhp/Math.max(1,c.dps);
  const mit=Math.max(0,1-c.def/(c.def+9000))*(S.tendency==="수호"?.8:1);
  const sust=c.hp*c.heal/Math.max(1,fdps*mit*1.5);
  const killSust=c.hp*c.heal/Math.max(1,fdps*mit);
  const killOK=sec<=45&&killSust>=sec, holdOK=sust>=Math.min(45,sec);
  return head("사무전 연무장에서 펼치는 단계별 교련",ic("arena")+" 연무제", `제 ${sn}회 · 이번 대회 ${Math.min(15,Math.max(0,r-1))} / 15 · 최고 회전 ${S.arena.best}`)+`
  ${buffStrip()}
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="tiny" style="color:var(--gold)">${r>15?"완주":r+"회전"}</div>
      ${r>15?`<h3 style="margin:4px 0">모든 상대를 꺾었습니다</h3>
        <div class="tiny muted">다음 연무제가 열리기를 기다립니다.</div>
        <button class="btn" style="margin-top:10px" onclick="arenaGo('kill')">다음 연무제 참가</button>`
      :`<h3 style="margin:4px 0 2px;font-size:19px">${foe}</h3>
      <div class="tiny muted">${esc(entry.role)}${sn>1?` · <span style="color:var(--gold)">제 ${sn}회</span>`:""}</div>
      <div class="quote" style="margin:8px 0">${esc(entry.line)}</div>
      <div class="tiny"><b>제압</b> <span style="color:${killOK?"var(--jade)":"var(--red)"}">${killOK?`승산 높음 — 약 ${sec.toFixed(1)}초`:sec<=45?`생존력 부족 — 약 ${killSust.toFixed(1)}초`:`승산 낮음 — 45초 안에 체력의 약 ${Math.min(100,Math.round(c.dps*45/fhp*100))}%`}</span></div>
      <div class="tiny"><b>버티기</b> <span style="color:${holdOK?"var(--jade)":"var(--red)"}">${holdOK?"45초를 버틸 수 있습니다":`약 ${sust.toFixed(1)}초`}</span>
        <span class="muted">모든 성향 도전 가능 · 상대 공격 ×1.5 · 45초를 버티거나 그 전에 쓰러뜨리면 승리</span></div>
      <div class="tiny muted" style="margin-top:4px">보상 · 순위 · 대기시간은 두 방식이 같습니다</div>
      <div class="row" style="margin-top:10px">
        <button class="btn pri" onclick="arenaGo('kill')">제압으로 도전</button>
        <button class="btn" onclick="arenaGo('hold')">버티기로 도전</button></div>`}
    </div>
    <div class="card pad">
      <div class="sect-t">대진표</div>
      <table class="t">
        ${roster.map((opponent,i)=>{
          const n=esc(opponent.n);
          const idx=i+1;
          return `<tr><td style="width:28px">${idx}</td>
            <td>${idx<r?n:idx===r?`<b>${n}</b>`:"???"}</td>
            <td style="text-align:right">${idx<r?'<span class="tag j">승리</span>'
              :idx===r?'<span class="tag g">다음 상대</span>':`<span class="tiny muted">${sn>=2?"심화 교련":"다음 교련"}</span>`}</td></tr>`}).join("")}
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
  if(r>15){S.arena.season=(S.arena.season||1)+1;S.arena.round=1;renderMain();save();return {advanced:true};}
  if(!['kill','hold'].includes(mode))return;
  const entry=arenaEntry(r,S.arena.season||1);
  const c=C();
  const sn=S.arena.season||1;
  const opponent=arenaFoe(r,sn),fhp=opponent.hp,fdps=opponent.dps;
  const sec=fhp/Math.max(1,c.dps);
  const mit=Math.max(0,1-c.def/(c.def+9000))*(S.tendency==="수호"?.8:1);
  const sust=c.hp*c.heal/Math.max(1,fdps*mit*(mode==="hold"?1.5:1));
  const win = mode==="kill" ? (sec<=45 && sust>=Math.min(45,sec)) : (sust>=Math.min(45,sec));
  damageHP(rnd(4,14)); damageSN(rnd(3,10));
  let rew="";
  if(win){
    S.arena.round++; S.arena.best=Math.max(S.arena.best,r);
    const rin=gainRin((700+r*300)*Math.min(sn,3)), ex=gainExp((400+r*180)*Math.min(sn,3));
    S.lotus+=1; addMark(10);
    const drop=mkGear(Math.round(r*4+S.lvl*.4+sn*20),undefined,true); balanceStoreLoot(drop);
    rew=`륜 +${nf(rin)} · 경험치 +${nf(ex)} · 연등 +1 · 법구 「${drop.name}」`;
    if(S.arena.round>15){
      S.arena.season=sn+1; S.arena.round=1;
      S.lotus+=30; S.sari+=10;
      const prize=mkGear(Math.round(S.lvl+sn*24), 4); balanceStoreLoot(prize,true);
      rew+=`<br><b style="color:var(--gold)">${sn}회 연무제 완주 · 연등 +30 · 사리 +10 · 전설 법구 「${prize.name}」</b><br>${sn+1}회 연무제가 열립니다. 첫 상대는 「${esc(arenaEntry(1,sn+1).n)}」입니다. 상대가 한층 강해집니다.`;
    }
  }
  modal(`제${sn}회 연무제 ${r}회전 · ${entry.n}`,`
    <div class="log">
      <span class="turn">${mode==="kill"?"제압 과제 · 45초 제한":"버티기 과제 · 45초"}</span><br>
      내 초당 피해 <b>${nf(c.dps)}</b> · 상대 체력 ${nf(fhp)} → 제압까지 ${sec<=45?sec.toFixed(1)+"초":"45초 안에 불가"}<br>
      내 생명력 <b>${nf(c.hp)}</b> · 상대 초당 피해 ${nf(fdps)} → 버틴 시간 ${Math.min(99,sust).toFixed(1)}초<br>
      <span class="${win?"s":"h"}">■ ${win?"승리":"패배"}</span>
    </div>
    ${win?`<div class="card pad" style="margin-top:12px"><div class="tiny" style="color:var(--jade)">${rew}</div></div>`
      :`<div class="tiny" style="margin-top:10px;color:var(--red)">${esc(entry.n)}에게 막혔습니다. 법구를 각인하거나 성향을 바꿔 다시 도전할 수 있습니다.</div>`}
    ${(win?entry.win:entry.lose)?`<div class="quote" style="margin-top:12px">${esc(win?entry.win:entry.lose)}</div>`:""}
    <div class="row" style="margin-top:12px"><button class="btn pri" onclick="closeModal();renderMain()">확인</button>
      ${win&&S.arena.round<=15?`<button class="btn" onclick="closeModal();arenaGo('${mode}')">다음 상대</button>`:""}</div>`,"wide");
  renderTop(); renderNav(); save();
  return {win,season:sn,round:r,completed:win&&r===15};
}

/* ═══════════════════════════════════════════════════
   화면 — 낚시 · 약초밭 · 식당
   ═══════════════════════════════════════════════════ */
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
    <div class="sect-t">올라오는 것 · 기본 출현 확률</div>
    <div class="grid g3">
      ${FISHES.map(f=>`<div class="sub"><div class="spread"><b>${f.e} ${f.n}</b>
        <span class="tiny muted">기본 출현 ${((f.w/FISHES.reduce((a,x)=>a+x.w,0))*100).toFixed(0)}%</span></div>
        <div class="tiny" style="color:var(--jade);margin-top:4px">${f.y} +${f.s} · 대략 ${nf(f.p)}륜 값</div></div>`).join("")}
    </div>
    <div class="tiny muted" style="margin-top:10px">표시된 확률은 기본 가중치입니다. 정중앙 챔질에 성공하면 희귀 어획물의 확률이 높아집니다. 보유 재료 수량과는 다릅니다.</div>
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
  migrateDumplingKitchen();
  const slot=(s,label)=>{
    const m=S.kit[s];if(!m)return `<div class="tiny muted">${label} 칸이 비어 있습니다.</div>`;
    const d=DISHES.find(x=>x.id===m.id);
    if(!d)return `<div class="tiny muted">${label} 칸이 비어 있습니다.</div>`;
    return `<div class="spread" style="padding:6px 0;gap:10px"><div><span class="tag g">${label}</span> <b>${d.e} ${d.n}</b>
      <div class="tiny muted">${d.buf.map(([a,b])=>OPTNAME(a)+" +"+Math.round(b*100)+"%").join(", ")}</div></div>
      <span class="tiny muted">${hhmm(m.left)}</span></div>`;
  };
  const fills=["전체","뿌리","약초","어물","꽃","열매"];
  const visible=DISHES.filter(d=>DUMPLING_FILL==="전체"||d.fill.includes(DUMPLING_FILL));
  const made=Number(S.ct?.cook)||0;
  return head("삼장 선생님의 만두 주방",ic("dumpling")+" 만두 식당", `재료 · 약초 ${S.mat.약초} · 어물 ${S.mat.어물} · 열매 ${S.mat.열매} · 뿌리 ${S.mat.뿌리} · 꽃 ${S.mat.꽃}`)+`
  <div class="card pad" style="margin-bottom:12px">
    <div class="spread" style="gap:10px"><div><div class="sect-t">오늘은 어떤 속을 빚을까요?</div>
      <div class="tiny muted">속재료에 따라 만두의 효과가 달라집니다. 수확한 작물과 낚아 올린 어물로 다양한 만두를 만들어 보세요.</div></div>
      <span class="tag g">만두 도감 ${S.dex?.dish?.length||0} / ${DISHES.length}</span></div>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:12px">${fills.map(f=>`<button class="btn sm ${DUMPLING_FILL===f?"pri":""}" onclick="DUMPLING_FILL='${f}';renderMain()">${f==='전체'?'모든 속':f+' 속'}</button>`).join("")}</div>
  </div>
  <div class="grid g2" style="margin-bottom:14px">
    <div class="card pad">
      <div class="sect-t">지금 먹은 만두</div>
      ${slot("eat","만두 1")}${slot("dess","만두 2")}
      <div class="tiny muted" style="margin-top:8px">${mealRuleText()}</div>
    </div>
    <div class="card pad">
      <div class="sect-t">삼장 선생님의 만두 수업</div>
      <div class="quote">“만두를 빚는 일도 마음을 가다듬는 수행입니다. 서두르지 마시고, 속이 새지 않도록 차근차근 빚어 보십시오.”</div>
      <div class="tiny muted" style="margin-top:8px">제작한 만두 ${made}개 · 바랑에 남은 만두 ${Object.values(S.kit.have).reduce((a,b)=>a+(Number(b)||0),0)}개</div>
    </div>
  </div>
  <div class="card pad">
    <div class="spread" style="gap:10px"><div class="sect-t">만두 빚기 · ${visible.length}종</div><span class="tiny muted">총 ${DISHES.length}종 · 효과는 속마다 다릅니다</span></div>
    <div class="grid g2">
      ${visible.map(d=>{
        const can=Object.keys(d.mat).every(k=>(S.mat[k]||0)>=d.mat[k]);
        return `<div class="sub">
          <div class="spread"><b>${d.e} ${d.n}</b> <span class="tag ${d.t==="식사"?"j":"v"}">${d.t==="식사"?"든든한 만두":"달콤한 만두"}</span></div>
          <div class="tiny muted" style="margin:4px 0">속재료 · ${d.fill.join(" · ")}</div>
          <div class="tiny" style="color:var(--jade);margin:4px 0">${d.buf.map(([a,b])=>OPTNAME(a)+" +"+Math.round(b*100)+"%").join(", ")} · ${hhmm(d.dur)}</div>
          <div class="tiny muted">${d.d}</div>
          <div class="row" style="margin:7px 0 0">
            ${Object.keys(d.mat).map(k=>`<span class="buffchip" style="${(S.mat[k]||0)>=d.mat[k]?"":"color:var(--red)"}">${k} ${S.mat[k]||0}/${d.mat[k]}</span>`).join("")}
          </div>
          <div class="row" style="margin-top:8px">
            <button class="btn sm ${can?"pri":""}" ${can?"":"disabled"} onclick="cook('${d.id}')">만두 1개 빚기</button>
            <button class="btn sm" ${(S.kit.have[d.id]||0)>0?"":"disabled"} onclick="eat('${d.id}')">먹기 (${S.kit.have[d.id]||0})</button>
          </div></div>`;}).join("")}
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
    ${[["의뢰 완료",S.quests.cleared,15],["탑 돌파",(S.tower||0)+(S.tower2||0),20],["만두 빚기",S.ct?.cook||0,10]]
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
  const c={fert:3000,dust:8000}[k];
  if(S.rin<c){ toast("륜이 부족합니다.","bad"); return; }
  S.rin-=c;
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
};

/* ═══════════ 지도에 새 장소 ═══════════ */
PLACES.push(
 {id:"farmp", n:"약초 온실", e:ic("herb"), x:6,  y:36, view:"farm"},
 {id:"pier",  n:"부두",      e:ic("fishing"), x:34, y:92, view:"fishv"},
 {id:"hall",  n:"학생 식당", e:ic("dumpling"), x:62, y:70, view:"kitchen"},
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


;
/* ===== module: part3.js ===== */
"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 3
   기록실 · 랭킹 · 거처 · 세계관
   경매 · 매점 확장 · 실시간 의뢰 일지
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
 {id:"a28", n:"첫 낚시",       d:"낚시 1회 성공",               c:"fish",   g:1,  p:3},
 {id:"a29", n:"검은 바다의 손",d:"낚시 100회 성공",             c:"fish",   g:100,p:20},
 {id:"a30", n:"만두 빚는 손",   d:"만두 10번 빚기",           c:"cook",   g:10, p:10},
 {id:"a31", n:"삼장의 제자",   d:"만두 100번 빚기",          c:"cook",   g:100,p:30},
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

/* ─── 매점 품목 (확장) ─── */
const MART=[
 {id:"m1", n:"사리 꾸러미",  d:"사리 10개",                    cost:{rin:21100},  give:{sari:10},   lim:3,  per:"day"},
 {id:"m2", n:"연등 주머니",  d:"연등 10개 (하루 1번)",          cost:{rin:105000}, give:{lotus:10},  lim:1,  per:"day"},
 {id:"m3", n:"부적가루 교환",d:"사리 10개를 부적가루 80으로",    cost:{sari:10},    give:{dust:80},   lim:99, per:"day"},
 {id:"m4", n:"보급 상자",    d:"지금 과정보다 3~7단계 높은 법구 1개 (고급 이상)", cost:{rin:26300}, give:{gear:1}, lim:5, per:"day"},
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
  d("ct",{classH:0,mon:0,boss:0,quest:0,harvest:0,fish:0,cook:0,
          wb:0,outing:0,duelWin:0,gradeA:0,gradeS:0,enhMax:0,days:0});
  d("dex",{mon:[],plant:[],fish:[],dish:[],title:[],wards:[]});
  if(!Array.isArray(S.dex.title)) S.dex.title=[];
  // 과정만으로 열린 잘못된 칭호를 재검증합니다.
  syncTitles();
  d("ach",[]);
  d("storyRead",[]);
  d("hall",S.hall);
  d("war",{mine:0,week:0});      // 활동량 집계용으로만 남아 있습니다
  d("home",{stage:0, due:0, auto:true});
  d("auc",{phase:"idle",left:0,next:0,lots:[],hist:[],slot:0});
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
    default:         return C[a.c]||0;
  }
}
function achCheck(){
  syncTitles();
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
  if(S.crest && S.crest.key===key) v+=S.crest.v/100;
  const souv=(S.fest && S.fest.souv)?SOUVENIRS.find(x=>x.id===S.fest.souv):null;
  if(souv && souv.key===key) v+=souv.bonus;
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
function startRun(stage,party,mins){
  if(S.run?.done&&S.run.rewardVersion===2&&!S.run.settled){toast("이전 의뢰의 보상을 먼저 정산해 주세요.","bad");return;}
  if(!questCheck(stage)) return;
  if(S.run&&!S.run.done){ toast("이미 의뢰를 나가 있습니다.","bad"); return; }
  const q=questAt(stage);
  /* 의뢰에 들일 시간은 화면에서 고릅니다. 고르지 않았으면 예전처럼 사건이 정한 시간. */
  const dur=Math.max(5,Math.round(Number(mins)|| (typeof qDur==="function"?qDur().m:q.dur)));
  const eff=(typeof qEffOf==="function")?qEffOf(dur):1;
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
         logs:[], left:dur, total:dur, eff, kills:0, rin:0, exp:0, know:0,
         acc:0, done:false, party:!!party, rewardVersion:2, pending:runEmptyRewards()};
  pushRun(`<b>${stage}단계 ${q.ward.n}로 ${allies.length?allies.map(a=>a.n).join(" · ")+"과 함께 ":""}출발했다.</b>`);
  if(party) S.quests.room=null;
  go("quest");
  toast(`출동했습니다. <b>${hhmm(dur)}</b>짜리 의뢰입니다${eff<1?` · 효율 ${Math.round(eff*100)}%`:""}. 보상은 의뢰 완료·귀환 후 정산할 때 지급되며, 창을 닫아 두어도 시계대로 진행됩니다.`);
}
function runEmptyRewards(){return {rin:0,exp:0,know:0,gear:[],mat:{},ing:{},bmat:{},sari:0,marks:0};}
function runRewards(R=S.run){
  if(!R)return null;
  // Old runs keep rewards already paid. Only future drops enter this pouch.
  if(R.rewardVersion!==2){R.rewardVersion=2;R.pending=runEmptyRewards();}
  return R.pending||(R.pending=runEmptyRewards());
}
function runReward(key,base){
  const n=Math.round(base*(1+mod({rin:'gold',exp:'exp',know:'know'}[key])));
  runRewards()[key]+=n;return n;
}
function runMaterial(group,key,n){const p=runRewards();p[group][key]=(p[group][key]||0)+n;}
function runRewardText(R=S.run){
  const p=R?.pending;if(!p)return '새로 누적된 보상이 없습니다';
  const parts=[`륜 ${nf(p.rin)} · 경험치 ${nf(p.exp)} · 지식 ${nf(p.know)}`];
  if(p.gear.length)parts.push(`법구 ${p.gear.length}점: `+p.gear.map(it=>esc(it.name)).join(', '));
  for(const group of ['mat','ing','bmat'])for(const [k,n] of Object.entries(p[group]||{})){
    const name=group==='ing'?(ING.find(x=>x.k===k)?.n||k):group==='bmat'?(BRAW.find(x=>x.k===k)?.n||k):k==='가루'?'부적가루':k;
    if(n)parts.push(`${esc(name)} ${nf(n)}`);
  }
  if(p.sari)parts.push(`사리 ${p.sari}`);if(p.marks)parts.push(`축제 표식 최대 ${p.marks}`);
  return parts.join(' · ');
}
function runRemaining(R=S.run){
  if(!R)return 0;if(R.done)return Math.max(0,R.left);
  const elapsed=R.lastTick?Math.max(0,(Date.now()-R.lastTick)/60000):0;
  return Math.max(0,R.left-elapsed);
}
function updateRunDisplay(){
  const R=S.run;if(!R)return;
  const left=runRemaining(R),elapsed=Math.max(0,R.total-left);
  const clock=document.getElementById('runclock');if(clock)clock.textContent=R.done?'종료 · 정산 대기':runTimeText(left)+' 남음';
  const pace=document.getElementById('runpace');if(pace)pace.textContent=`전체 ${runTimeText(R.total)} 가운데 ${runTimeText(elapsed)} 지났습니다. 보상은 완료·귀환 후 정산할 때 지급됩니다.`;
  const bar=document.getElementById('runprog');if(bar)bar.style.width=clamp(elapsed/Math.max(1,R.total)*100,0,100)+'%';
  const kills=document.getElementById('runkills');if(kills)kills.textContent=`처치 ${R.kills}체 · 누적 륜 ${nf(R.rin||0)} · 경험치 ${nf(R.exp||0)} · 정산 대기`;
}
function settleRunRewards(R){
  if(!R||!R.done||R.settled||R.rewardVersion!==2)return;
  const p=runRewards(R);
  gainRin(p.rin,true);gainExp(p.exp,true);gainKnow(p.know,true);
  for(const group of ['mat','ing','bmat'])for(const [key,n] of Object.entries(p[group]||{})){S[group]||={};S[group][key]=(S[group][key]||0)+n;}
  p.gear.forEach(it=>balanceStoreLoot(it,true));S.sari+=p.sari||0;S.war.mine=(S.war.mine||0)+(p.war||0);if(p.marks)addMark(p.marks);
  R.settled=true;achCheck();toast('의뢰 보상을 정산했습니다.','good');
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
    /* 획득 시점의 배율로 계산하고 정산 전까지 의뢰 주머니에 보관합니다. */
    const ef=R.eff||1;
    const got=runReward("rin",Math.round((40+R.stage*14)*R.q.rank.mul*ef));
    const exg=runReward("exp",Math.round((60+R.stage*22)*0.6*ef));
    const kng=runReward("know",Math.round((10+R.stage*4)*0.5*ef));
    R.rin+=got; R.exp=(R.exp||0)+exg; R.know=(R.know||0)+kng;
    pushRun(`<span class="d">${esc(foe.n)}을(를) 쓰러뜨렸다.</span> <span class="s">륜 +${nf(got)} · 경험치 +${nf(exg)} · 지식 +${nf(kng)}</span>`);
    if(foe.boss){ ct("boss"); }
    if(Math.random()<(0.14+mod("loot"))){
      const it=mkGear(Math.round(R.stage*1.2+S.lvl*.3),undefined,true); runRewards().gear.push(it);
      pushRun(`<span class="s">${GRADES[it.grade].n} 법구 「${esc(it.name)}」를 주웠다.</span>`);
    }
    if(Math.random()<0.18){ const dd=rnd(1,3)+Math.floor(R.stage/12); runMaterial("mat","가루",dd);
      pushRun(`<span class="s">부서진 부적 조각을 쓸어 담았다. 부적가루 +${dd}</span>`); }
    R.foes=[];
  }
  if([R.me,...R.allies].every(f=>f.hp<=0)) endRun(false);
}
function endRun(ok){
  const R=S.run; if(!R||R.done) return;
  runRewards(R);R.done=true;
  const q=R.q;
  const cleared=ok&&R.left<=0&&R.kills>0; // 관문은 끝까지 버틴 뒤에만 통과
  let hpL=rnd(q.rank.hp[0],q.rank.hp[1]), snL=rnd(q.rank.sn[0],q.rank.sn[1]);
  if(R.pos==="선봉") hpL=Math.round(hpL*1.1);
  if(R.pos==="지원"){ hpL=Math.round(hpL*.8); snL=Math.round(snL*.8); }
  if(S.ward){ hpL=Math.round(hpL*.5); snL=Math.round(snL*.5); S.ward=false; }
  if(!ok){ hpL=Math.round(hpL*1.7); snL=Math.round(snL*1.6); }
  damageHP(hpL); snL=damageSN(snL);
  /* 해결 보너스도 주머니에 합치고 수령 버튼에서만 지급합니다. */
  const ef=R.eff||1;
  const rin=cleared?runReward("rin",Math.round((120+R.stage*48)*ef)):0;
  const ex =cleared?runReward("exp",Math.round((90+R.stage*34)*ef)):0;
  const kn =0;
  R.rin+=rin;R.exp=(R.exp||0)+ex;
  if(cleared){
    questRecordClear(R.stage);
    ct("quest");
    if(q.rank.r==="Ⅳ"&&Math.random()<.3) runRewards().sari++;
    if(q.rank.r==="Ⅴ") runRewards().sari++;
    runRewards().marks+=Math.round(6*q.rank.mul);
    pushNews(`[의뢰] ${S.name} 학생이 사건 ${q.no}(${q.rank.r}등급)을 해결했습니다.`);
  }
  pushRun(`<span class="turn">정산 대기 · 처치 ${R.kills}체 · ${runRewardText(R)} · 체력 −${hpL} · 이성 −${snL}</span>`);
  pushRun(cleared?`<span class="s">■ 의뢰를 해결하고 사무전으로 돌아왔다.</span>`
    :ok?`<span class="turn">■ 의뢰 도중 귀환했다. 모은 몫을 정산할 수 있으며 다음 구간은 열리지 않는다.</span>`
    :`<span class="h">■ 더 버티지 못하고 현장에서 철수했다.</span>`);
  S.quests.log.unshift({no:q.no,t:q.t,win:cleared,time:cal().str});
  if(S.quests.log.length>30) S.quests.log.pop();
  runRewards().war=Math.round(12*q.rank.mul);
  renderTop(); renderNav(); save();
}
function runReturn(){ if(S.run&&!S.run.done) endRun(S.run.kills>0); renderMain(); }
function runClear(){ if(S.run&&!S.run.done)return;settleRunRewards(S.run);S.run=null;renderTop();renderNav();renderMain();save(); }

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
  S.mart={};
};

/* ═══════════════════════════════════════════════════
   화면 — 기록실 · 랭킹 · 기숙사 · 세계관
   ═══════════════════════════════════════════════════ */
let RECTAB="업적", ACHFILTER="전체";
VIEWS.record=()=>{
  const tabs=["업적","칭호 도감","악인 도감","식물 도감","낚시 도감","만두 도감","도감 점수","통계"];
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
  if(RECTAB==="낚시 도감") body=`<div class="tiny muted" style="margin-bottom:10px">발견 ${S.dex.fish.length} / ${FISHES.length}종 · 수치는 <b>보유 수량이 아닌 기본 출현 확률</b>입니다. 획득 횟수는 실제 낚시 기록입니다.</div>
    <div class="grid g4">${FISHES.map(it=>{
      const got=S.dex.fish.includes(it.n), c=(S.fish.catches||{})[it.n]||0;
      return `<div class="sub" style="${got?"":"opacity:.6"}">
        <div class="spread"><b>${got?it.e+" "+it.n:"???"}</b>${got?'<span class="tag g">등록</span>':""}</div>
        <div class="tiny muted" style="margin-top:5px">기본 출현 확률 ${it.w}%</div>
        <div class="tiny" style="color:var(--jade);margin-top:4px">${got?`내가 낚은 횟수 ${c}회`:"아직 낚은 적 없음"}</div>
      </div>`; }).join("")}</div>`;
  if(RECTAB==="만두 도감") body=`<div class="tiny muted" style="margin-bottom:10px">직접 빚어 본 만두의 속재료와 효과가 기록됩니다. ${S.dex.dish.length} / ${DISHES.length}</div>`+dexGrid("만두",DISHES,"dish");
  if(RECTAB==="칭호 도감"){
    body=`<div class="tiny muted" style="margin-bottom:10px">${S.dex.title.length} / ${TITLES.length} · 누르면 학생증의 칭호가 바뀝니다</div>
    <div class="grid g4">${TITLES.map((t,i)=>{
      const got=titleUnlocked(i);
      return `<div class="sub" style="${got?"":"opacity:.42"}">
        <div class="spread"><b>${got?t:"???"}</b>${S.title===t?'<span class="tag g">사용 중</span>':""}</div>
        <div class="tiny muted" style="margin:5px 0 7px">${got?titleHow(i):"조건이 알려지지 않았습니다"}</div>
        ${got?`<button class="btn sm ${S.title===t?"":"pri"}" onclick="setTitle('${t}');renderMain()">${S.title===t?"사용 중":"사용하기"}</button>`:""}</div>`}).join("")}</div>`;
  }
  if(RECTAB==="도감 점수"){
    const rows=[["악인 도감",S.dex.mon.length,MONS.length,6],["식물 도감",S.dex.plant.length,CROPS.length,5],
                ["낚시 도감",S.dex.fish.length,FISHES.length,8],["만두 도감",S.dex.dish.length,DISHES.length,5],
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
      ["수확",nf(C.harvest)+"회"],["낚시",nf(C.fish)+"마리"],["만두 빚기",nf(C.cook)+"번"],
      ["업적 점수",achPts()],["도감 점수",dexScore()],["전투력",nf(power())]];
    body=`<div class="grid g4">${rows.map(([k,v])=>`<div class="card pad" style="padding:11px 13px">
      <div class="tiny muted">${k}</div><div style="font-size:18px;font-weight:600;color:var(--gold)">${v}</div></div>`).join("")}</div>`;
  }

  return head("업적 · 도감 · 통계",ic("scroll")+" 기록실", `업적 ${S.ach.length} / ${ACH.length}`)+`
  <div class="tabs" style="margin-bottom:14px;padding:0 0 0 2px">
    ${tabs.map(t=>`<div class="tab ${RECTAB===t?"on":""}" onclick="RECTAB='${t}';renderMain()">${t}${t==="도감 점수"?` <span class="tag g">${dexScore()}</span>`:""}</div>`).join("")}
  </div>${body}`;
};
function titleUnlocked(i){
  if(!S) return i===0;
  const sub=S.sub||{}, dex=S.dex||{}, ct=S.ct||{}, f=S.fest||{};
  switch(i){
    case 0: return true;
    case 1: return !!(sub.s13 && ((sub.s13.p||0)>0 || (sub.s13.lv||0)>0));
    case 2: return (ct.quest||0)>=50;
    case 3: return Object.values(S.res||{}).reduce((n,v)=>n+(Number(v)||0),0)>=10;
    case 4: return (f.stamps||[]).length>=1;
    case 5: return (dex.wards||[]).length>=6;
    case 6: return typeof stat==="function" && stat("res")>=12;
    case 7: return !!(sub.s14 && (sub.s14.lv||0)>=1);
    case 8: return (f.stamps||[]).length>=5;
    case 9: return (S.tower||0)>=100;
    default: return false;
  }
}
function syncTitles(){
  if(!S || !S.dex) return;
  S.dex.title=TITLES.filter((t,i)=>titleUnlocked(i));
  if(!S.dex.title.includes(S.title)) S.title=TITLES[0];
}
function titleHow(i){
  return ["입학하면 기본 지급","무명 관조 수업 1교시 이상 수강","의뢰 50건 해결",
   "수행 누적 10단계 달성","염라제 부스 1곳 체험","서로 다른 여섯 구역 방문",
   "기본 공명 적성 12 이상","죄업 기록학 과목 Lv 1 달성","염라제 부스 도장 다섯 개","석탑 100층 돌파"][i]||"";
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
      <div class="tiny muted" style="margin-bottom:8px">법구·능력치를 반영한 전투력입니다. 물약·만두 같은 시간제 효과는 순위에서 제외합니다.</div>
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
      <div class="tiny muted" style="margin-top:6px">석탑 또는 결계의 탑 화면에서 각 탑의 「함께 오르기」로 합동방을 열면 팀 기록이 함께 반영됩니다.</div>
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

// District descriptions: world guide and public runner application records.
const WORLD_DISTRICT_NOTES={
  "w1": {
    "life": "사무전 감응망과 치안대 순찰이 겹치는 중심 생활권. 넓은 대로의 복합 빌라에는 상점·병원과 고급 주거지가 층을 나누어 들어선다. 영혼 장신구와 전자 천도 서비스까지 거래되는 부유한 구역이지만, 자금 세탁과 불법 영혼 거래는 고급 상점 뒤에 숨기도 한다.",
    "places": [
      [
        "데슐랭 식당가",
        "예약이 몇 달씩 밀리는 유명 식당들이 모인다. 사찰 음식 정찬부터 손님의 영혼 파장에 맞춰 향과 맛을 조절하는 코스 요리까지, 명계의 사치가 식탁 위에 오른다."
      ],
      [
        "요시미네가",
        "오래전 명계로 이주한 활 마무기 집안. 명문이라는 평판과 신의를 중시하며, 가문으로 들어오는 의뢰도 검토한다. 사무전 밖에도 장인·마무기의 계보와 가문을 통한 의뢰망이 남아 있음을 보여준다."
      ]
    ]
  },
  "w2": {
    "life": "감응 안료 벽화와 홀로그램 전시, 옥상 공연이 밤새 이어지는 예술가의 생활권. 작업실과 카페뿐 아니라 서커스와 동네 가게, 작은 주거지가 함께 있다. 안료·향료·잉크를 위장한 약물 유통도 이 화려한 거리의 그늘이다.",
    "places": [
      [
        "서커스단 아발론",
        "상류층 관객을 겨냥한 수중 공연으로 이름을 알린 서커스단. 공연용 물을 독점하고 주변에 불법 수도료를 걷는 것으로도 알려져 있다. 화려한 무대와 골목의 물 사정이 맞물리는 장소다."
      ],
      [
        "고양이 카페 묘연",
        "심우해가 좋아하는 고양이 카페. 성인이 된 우해와 윤세결은 여기서 걸어서 약 15분 거리에 집을 마련했다. 의뢰를 마친 학생들의 일상과 독립 생활이 이어지는 동네의 기준점이다."
      ],
      [
        "차원",
        "포커와 마작을 즐기러 들르는 장소. 작업실과 공연장이 많은 제2구역에는 판을 벌이며 여가를 보내는 공간도 있다."
      ]
    ]
  },
  "w3": {
    "life": "정식 의체 병원과 인공 장기 제작소, 감응 장비 공방이 모여 있는 기술 구역. 골목 안에서는 비인가 강화와 영혼 수술, 기억 삭제 같은 불법 개조도 거래된다. 무료 통신망에 무심코 접속하면 위치나 의체 기록이 유출될 수 있어, 편리함과 위험이 한 회로를 쓴다.",
    "places": [
      [
        "의체 공방과 전자 결계",
        "사찰과 목조건축 위로 통신 안테나와 금속 프레임이 덧씌워져 있다. 전자 목탁으로 침입을 알리는 방화벽, 금강역사 형상의 보안 프로그램처럼 기술에도 종교의 언어가 남아 있다."
      ],
      [
        "귀인에 관한 소문",
        "이 구역에는 부정과 액을 막아 준다는 ‘귀인’의 이야기가 알음알음 퍼져 있다. 히카와 신쥬의 영매 활동과 함께 전해지는 소문으로, 거리의 평판과 실제 효능은 구분해서 들어야 한다."
      ]
    ]
  },
  "w4": {
    "life": "상공의 인공 광원 일륜과 집광판, 지하 발전 설비가 명계의 전력과 통신망을 떠받친다. 빛이 닿는 지상에는 경비가 삼엄한 주요 시설이 있고, 지하에는 재건 과정에서 버려진 발전 터널과 폐쇄 변전소가 미로처럼 남아 있다.",
    "places": [
      [
        "일륜과 고층 주거지",
        "명계에서 유일하게 가짜 낮을 가진 곳. 발전 시설만 있는 구역은 아니다. 류쉬안과 레이처럼 의뢰로 모은 돈으로 독립해, 일륜의 빛과 가까운 높은 집에서 살림을 꾸린 주민도 있다."
      ],
      [
        "폐발전 터널",
        "지도에 없는 통로와 폐기된 의체, 정체불명의 파장에 대한 보고가 이어진다. 지상 시설의 안전과 지하의 위험을 같은 것으로 생각해서는 안 된다."
      ]
    ]
  },
  "w5": {
    "life": "용병과 의뢰인이 술집·여관·현상금 중개소에서 만나는 거리. 호송과 토벌, 생포와 살해는 서로 다른 값으로 거래된다. 출동 전에 향을 꽂는 불단과 현상수배서가 같은 술집 안에 놓이고, 유명한 사냥꾼도 조직의 보복 표적이 된다.",
    "places": [
      [
        "마장관",
        "포커와 마작을 즐기며 판돈을 거는 장소. 의뢰와 무기 거래 외에 사람들이 시간을 보내고 돈을 잃거나 따는 생활의 한 면이다."
      ],
      [
        "현상금 게시판과 용병 술집",
        "전적과 토벌 기록, 전리품이 벽에 걸린다. 명성은 다음 계약을 부르지만, 유명 용병을 노리는 범죄 조직에게는 표적을 고르는 자료이기도 하다."
      ]
    ]
  },
  "w6": {
    "life": "판잣집과 무허가 증축물, 조직의 경계가 얽힌 구역. 가난한 주민과 범죄자가 같은 골목에서 살지만, 작은 법당·무료 급식소·무허가 진료소를 중심으로 서로의 안부를 아는 공동체도 강하다. 총성과 독경, 집세 독촉과 끼니 걱정이 한 생활권에 공존한다.",
    "places": [
      [
        "딤섬 가게 유운루 留雲樓",
        "하이윤 海云이 운영하는 동네 가게. 찜기를 번쩍 옮길 만큼 정정한 주인은 행패 부리는 손님도 직접 내보낸다. 오즈가 아르바이트를 했고 란위안이 만두를 먹으러 드나들던 곳으로, 외상과 일당, 이웃의 인연이 쌓인다."
      ]
    ]
  },
  "w7": {
    "life": "검은 바다를 따라 부두·수산시장·냉동 창고·조선소가 이어지는 도시의 끝. 항구의 전자 범종이 새벽시장을 열고, 출항 전에는 당집에 향을 꽂거나 전자 연등을 띄운다. 바다로 나가면 통신과 감응망이 급격히 약해지지만, 육지의 시장 골목에는 이웃의 돌봄이 남아 있다.",
    "places": [
      [
        "페이지가의 옛 여관",
        "외지에서 이주해 온 페이지 노부부가 운영하던 항구 근처 여관. 통신이 자주 끊기는 바닷가에서 전언장과 방명록은 손님들의 말과 소문을 남기는 수단이었다. 현재는 비어 있으며 동네 단골이 가끔 들여다본다."
      ],
      [
        "새벽시장의 정어리 샌드위치 가게",
        "주인은 어린 류쉬안에게 음식과 비를 피할 창고를 내주었다. 류쉬안과 레이의 생활 기록에는 정어리 꼬치와 샌드위치, 물건을 들이는 시장 사람들의 분주한 모습이 함께 남아 있다."
      ],
      [
        "항구의 하숙집",
        "명계로 들어오는 배를 타고 온 코우케이 자매가 머물렀던 곳. 집주인과 이웃의 허드렛일을 도우며 하숙비를 충당하고 찬거리와 간식을 나눠 받았다. 항구는 외지인이 도착하는 곳이면서 처음 이웃을 얻는 곳이기도 하다."
      ]
    ]
  }
};
function worldDistrictNotes(id){
  const note=WORLD_DISTRICT_NOTES["w"+id];if(!note)return "";
  return `<details class="world-district-notes" data-disclosure-key="world-district-${id}" style="margin-top:10px"><summary style="cursor:pointer;color:var(--violetL);font-size:12px">거리와 생활 · 주요 장소 ${note.places.length}곳</summary><p class="tiny muted" style="line-height:1.9;margin:8px 0">${esc(note.life)}</p>${note.places.map(([name,text])=>`<div class="sub" style="margin-top:7px"><b class="tiny">${esc(name)}</b><div class="tiny muted" style="line-height:1.9;margin-top:4px">${esc(text)}</div></div>`).join("")}</details>`;
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
    <div class="card pad" style="margin-bottom:12px"><div class="sect-t">일곱 구역을 읽는 법</div><div class="tiny muted" style="line-height:1.9">사무전에서 멀어질수록 영혼 파장 감응망과 긴급 대응은 약해집니다. 경계는 동심원이 아니라 골목·고가도로·성벽·지하철·수로를 따라 뒤틀려 있습니다. 구역 사이의 석문과 전자 패루는 통행자의 파장을 감지합니다. 같은 명계에서도 구역을 건너면 집세와 생업, 치안과 이웃의 풍경이 바뀝니다.</div></div>
    <div class="grid g2">
      ${WARDS.map(w=>`<div class="card pad">
        <div class="spread"><b style="color:${w.c};font-size:15px">${w.n}</b><span class="tag">${w.t}</span></div>
        <div class="tiny muted" style="margin-top:6px;line-height:1.9">${w.d}</div>
        <div class="tiny" style="margin-top:6px;color:${S.dex.wards.includes(w.id)?"var(--jade)":"var(--dim2)"}">
          ${S.dex.wards.includes(w.id)?"방문함":"아직 걸어 보지 않았습니다"}</div>${worldDistrictNotes(w.id)}</div>`).join("")}
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
   화면 — 떠돌이 상인(경매) · 매점
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
  if(g.rin){ const r=g.rin;S.rin+=r; msg.push(`륜 +${nf(r)}`); }
  if(g.dust){ S.mat.가루+=g.dust; msg.push(`부적가루 +${g.dust}`); }
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

/* ═══════════════════════════════════════════════════
   의뢰 화면 — 실시간 일지
   ═══════════════════════════════════════════════════ */
/* 자리를 비운 사이에 얻은 것 — 일지 맨 위에 붙여 둡니다 */
function runAwayHTML(){
  const a=S.run&&S.run.away;
  if(!a||!a.open) return "";
  const mats=Object.entries(a.mats||{}).filter(([k,v])=>v>0);
  const bits=[];
  if(a.kills) bits.push(`처치 <b>${nf(a.kills)}</b>체`);
  if(a.rin)   bits.push(`륜 <b style="color:var(--gold)">+${nf(a.rin)}</b>`);
  if(a.exp)   bits.push(`경험치 <b>+${nf(a.exp)}</b>`);
  if(a.know)  bits.push(`지식 <b>+${nf(a.know)}</b>`);
  if(a.lvlUp) bits.push(`<b style="color:var(--gold)">Lv +${a.lvlUp}</b>`);
  return `<div class="sub" id="runaway" style="margin:10px 0 0;border-color:var(--gold2);background:var(--s1)">
    <div class="spread">
      <div class="tiny" style="color:var(--gold)">자리를 비운 ${hhmm(a.mins)} 동안 얻은 것</div>
      <button class="btn sm ghost" onclick="runAwayClose()">닫기</button></div>
    ${bits.length?`<div class="tiny" style="margin-top:6px">${bits.join(" · ")}</div>`:""}
    ${a.gear&&a.gear.length?`<div class="row" style="gap:5px;flex-wrap:wrap;margin-top:7px">
      ${a.gear.map(g=>`<span class="tag g">${ic("sword",11)} ${esc(g.n)}</span>`).join("")}</div>`:""}
    ${mats.length?`<div class="row" style="gap:5px;flex-wrap:wrap;margin-top:6px">
      ${mats.map(([k,v])=>`<span class="tag">${esc(k)} +${nf(v)}</span>`).join("")}</div>`:""}
    ${!bits.length&&!mats.length&&!(a.gear&&a.gear.length)?'<div class="tiny muted" style="margin-top:6px">아직 손에 들어온 것이 없습니다.</div>':""}
  </div>`;
}
const _quest=VIEWS.quest;
VIEWS.quest=()=>{
  let head1="";
  if(S.run){
    const R=S.run, q=R.q, remaining=runRemaining(R);
    const bar=(f,i)=>`<div class="spread" style="padding:4px 0">
      <div style="width:150px"><span class="tag ${f.pos==="선봉"?"r":f.pos==="지원"?"j":""}">${f.pos||"후열"}</span>
        <b style="color:${f.c}">${esc(f.n)}</b></div>
      <div style="flex:1"><div class="bar hp"><i style="width:${clamp(f.hp/f.max*100,0,100)}%"></i></div></div>
      <span class="tiny muted" style="width:120px;text-align:right">HP ${nf(Math.max(0,f.hp))} / ${nf(f.max)}</span></div>`;
    head1=`<div class="card pad" style="margin-bottom:14px;border-color:var(--gold2)">
      <div class="spread">
        <div><div class="sect-t" style="margin:0">의뢰 일지 <span class="muted">${q.stage}단계 · ${q.ward.n}</span></div>
          <div class="tiny muted" id="runkills">처치 ${R.kills}체 · 누적 륜 ${nf(R.rin||0)} · 경험치 ${nf(R.exp||0)}</div></div>
        <div class="tiny muted" id="runclock">${R.done?"종료됨":runTimeText(remaining)+" 남음"}</div></div>
      <div class="bar" style="margin:8px 0 2px"><i id="runprog" style="width:${clamp((1-remaining/Math.max(1,R.total))*100,0,100)}%"></i></div>
      <div class="tiny muted" id="runpace">${R.done?"":`전체 ${runTimeText(R.total)} 가운데 ${runTimeText(Math.max(0,R.total-remaining))} 지났습니다. 보상은 완료·귀환 후 정산할 때 지급됩니다.`}</div>
      ${R.pending?`<div class="sub tiny" style="margin-top:10px;line-height:1.8"><b>누적 보상 · 정산 대기</b><br>${runRewardText(R)}</div>`:runAwayHTML()}
      <div class="log" id="runlog" style="margin:10px 0;height:clamp(190px,34vh,300px);max-height:none">
        ${R.logs.map(l=>`<div><span class="muted" style="font-size:10.5px">${l.time}</span> ${l.t}</div>`).reverse().join("")}
      </div>
      <div class="tiny muted" style="margin-bottom:6px"><b>새 줄이 맨 위</b>에 적힙니다 · 진행은 5분마다 누적 기록합니다. 보상은 완료·귀환 후 정산할 때 한꺼번에 받습니다.</div>
      ${bar(R.me)}
      ${R.allies.map(a=>bar(a)).join("")}
      <div class="row" style="margin-top:10px">
        ${R.done?`<button class="btn pri" onclick="runClear()">${R.rewardVersion===2&&!R.settled?"보상 정산":"일지 닫기"}</button>`
          :`<button class="btn" onclick="runReturn()">혼자 귀환</button>
            <span class="tiny muted">귀환 후 보상 정산을 누르면 그때까지 모은 몫을 받습니다.</span>`}
        ${!R.done&&R.stage%10===0?'<span class="tiny muted">관문은 도중에 귀환하면 통과로 인정되지 않습니다.</span>':""}
      </div></div>`;
  }
  /* 아래 표시는 「함께 가기」를 끼워 넣을 자리를 알려 줍니다 (진행 중인 일지 바로 다음) */
  return head1+"<!--QSPLIT-->"+_quest();
};
const _runQuest2=runQuest;
runQuest=function(stage,party,mins){
  if(S.run&&!S.run.done){ toast("이미 의뢰를 나가 있습니다.","bad"); return; }
  startRun(stage,party,mins);
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
/* 낚시 카운트와 도감 등록은 낚시 성공 순간(part2)에 한 번만 반영합니다. */
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
arenaGo=function(m){ const result=_arenaGo(m);
  if(result?.win){ S.war.mine=(S.war.mine||0)+25; achCheck(); }return result; };
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
setTitle=function(t){ const i=TITLES.indexOf(t); if(i<0 || !titleUnlocked(i)){ toast("아직 칭호 획득 조건을 달성하지 못했습니다.","bad"); return; } syncTitles(); _setTitle(t); achCheck(); };
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
 {id:"craft", ic:ic("pot"), n:"공방·생활", sub:[{id:"fishv",n:"낚시"},{id:"farm",n:"약초밭"},{id:"kitchen",n:"만두 식당"}]},
 {id:"soc",   ic:ic("candle"), n:"교류",      sub:[{id:"map",n:"지도"},{id:"club",n:"모임"},{id:"rel",n:"인연·관계"},
                                          {id:"outing",n:"구역 나들이"},{id:"fest",n:"염라제",bd:"축제"}]},
 {id:"shopn", ic:ic("store"), n:"상점",      sub:[{id:"market",n:"중개소"},{id:"merchant",n:"떠돌이 상인"},{id:"shop",n:"매점"}]},
 {id:"rec",   ic:ic("scroll"), n:"기록·랭킹", sub:[{id:"world",n:"세계관"},{id:"record",n:"업적·도감"},{id:"rank",n:"랭킹"},
                                          {id:"hallv",n:"거처"}]},
);

const _boot3=boot;
boot=function(){ ensureV3(); _boot3(); ensureV3(); achCheck(); renderNav(); renderMain(); };

/* ═══════════ 실시간 의뢰 전용 시계 ═══════════ */
const RUNPACE = 1/60;         // 호환용 설명: 현실 1초는 의뢰 1초, 배속 없음
function runTimeText(mins){
  let secs=Math.max(0,Math.ceil((Number(mins)||0)*60));
  const hrs=Math.floor(secs/3600); secs-=hrs*3600;
  const mm=Math.floor(secs/60),ss=secs%60;
  return `${hrs?hrs+"시간 ":""}${mm}분 ${String(ss).padStart(2,"0")}초`;
}
const RUNSTEPMIN = 0.5;       // 일지 한 줄 = 의뢰 30초

/* ─ 자리를 비운 사이에 얻은 것 추리기 ─ */
function runPouch(){                     // 지금 가진 재료 전부를 한 장으로
  const o={};
  if(S.mat)  Object.keys(S.mat).forEach(k=>o[k]=Number(S.mat[k])||0);
  if(S.ing)  Object.keys(S.ing).forEach(k=>o[k]=Number(S.ing[k])||0);
  if(S.bmat) Object.keys(S.bmat).forEach(k=>o[k]=Number(S.bmat[k])||0);
  return o;
}
function runSnap(){
  const R=S.run;
  return {rin:R.rin||0, exp:R.exp||0, know:R.know||0, kills:R.kills||0,
          bag:(S.bag||[]).length, pouch:runPouch(), lvl:S.lvl};
}
function runGains(s, mins){
  const R=S.run, now=runPouch(), mats={};
  Object.keys(now).forEach(k=>{ const d=now[k]-(s.pouch[k]||0); if(d>0) mats[k]=d; });
  const got=(S.bag||[]).slice(s.bag).map(it=>({n:it.name, g:it.grade}));
  const prev=(R.away&&R.away.open!==false)?R.away:null;   // 연달아 비웠으면 합쳐서 보여 줍니다
  return {
    open:true, at:Date.now(),
    mins:Math.round((prev?prev.mins:0)+mins),
    kills:(prev?prev.kills:0)+((R.kills||0)-s.kills),
    rin:(prev?prev.rin:0)+((R.rin||0)-s.rin),
    exp:(prev?prev.exp:0)+((R.exp||0)-s.exp),
    know:(prev?prev.know:0)+((R.know||0)-s.know),
    lvlUp:(prev?prev.lvlUp:0)+(S.lvl-s.lvl),
    gear:(prev?prev.gear:[]).concat(got).slice(-8),
    mats:(()=>{ const m=Object.assign({},(prev&&prev.mats)||{});
      Object.keys(mats).forEach(k=>m[k]=(m[k]||0)+mats[k]); return m; })()
  };
}
function runAwayClose(){ if(S.run&&S.run.away) S.run.away.open=false; renderMain(true); save(); }
let RUNTICK = null;
function runRealTick(){
  if(RUNTICK) clearInterval(RUNTICK);
  RUNTICK = setInterval(()=>{
    if(!S || !S.made || !S.run || S.run.done) return;
    const now = Date.now();
    if(!S.run.lastTick) S.run.lastTick = now;
    let m = (now - S.run.lastTick)/60000; // 반드시 실제 경과 밀리초를 의뢰 분으로 변환
    S.run.lastTick = now;
    if(m <= 0) return;
    if(m > S.run.left) m = S.run.left;          // 자리를 비웠어도 의뢰 분량만큼만
    /* 2분 넘게 한꺼번에 흘렀다면 자리를 비웠던 것입니다.
       그 사이에 얻은 것만 따로 적어 두었다가 일지 맨 위에 붙여 둡니다. */
    const awayFor = m > 2 ? m : 0;
    const snap = awayFor ? runSnap() : null;
    S.run.left -= m;
    S.run.acc  += m;
    let guard = 0;
    while(S.run.acc >= RUNSTEPMIN && S.run && !S.run.done && guard++ < 600){ S.run.acc -= RUNSTEPMIN; runStep(); }
    if(snap && S.run) S.run.away = runGains(snap, awayFor);
    if(S.run && !S.run.done && S.run.left <= 0) endRun(true);
  }, 1000);
}
const _bootRun = boot;
/* 창을 닫아 두어도 의뢰는 흐릅니다. 돌아온 순간 비운 시간만큼 한 번에 따라잡습니다. */
boot = function(){ _bootRun(); if(S && S.run && !S.run.done && !S.run.lastTick) S.run.lastTick = Date.now(); runRealTick(); };
const _startRunPace = startRun;
startRun = function(stage, party, mins){ _startRunPace(stage, party, mins);
  if(S.run) S.run.lastTick = Date.now(); runRealTick(); };


;
/* ===== module: part4.js ===== */
"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 4
   연금 공방(조제 · 물약 선반 · 재료 보관함)
   거주지 혜택 재편 — 성장에 따라 1/10에서 최대까지
   ═══════════════════════════════════════════════════ */

/* ─── 조제 재료 · 산지 ─── */
const ING=[
 {k:"먼지",  n:"봉인고 먼지",   w:"사무전 지하 봉인고", e:ic("alcAir")},
 {k:"홍월초",n:"홍월초",        w:"제2구역 뒷골목",     e:ic("hibiscus")},
 {k:"톱니",  n:"의체 톱니",     w:"제3구역 폐공방",     e:ic("gear")},
 {k:"집광편",n:"일륜 집광편",   w:"제4구역 폐터널",     e:ic("lens")},
 {k:"잿불씨",n:"잿불 씨",       w:"제6구역 판자촌",     e:ic("fire")},
 {k:"인광",  n:"해조 인광",     w:"제7구역 검은 바다",  e:ic("sparkles")},
 {k:"먹잉크",n:"먹그림자 잉크", w:"속삭이는 폐허",      e:ic("inkHeart")},
 {k:"종모래",n:"종루의 모래",   w:"석탑 종루",          e:ic("hourglass")},
 {k:"심연정",n:"심연 결정",     w:"심연",               e:ic("crystal")},
];
/* ─── 조제법 ─── */
const POTIONS=[
 {id:"q1", n:"집중의 물약", c:"var(--blue)", dur:120, mana:1512,
  mat:{먼지:18},               buf:[["study",.30]], d:"2시간 수업 효율 +30%"},
 {id:"q2", n:"투지의 물약", c:"var(--red)", dur:120, mana:4026,
  mat:{먼지:12,홍월초:6},       buf:[["atkP",.25]], d:"2시간 공격력 +25%"},
 {id:"q3", n:"수호의 물약", c:"var(--ok)", dur:120, mana:4026,
  mat:{먼지:18,홍월초:6},       buf:[["hpP",.25],["defP",.20]], d:"2시간 생명력 +25%, 방어력 +20%"},
 {id:"q4", n:"안신의 물약", c:"var(--violet)", dur:120, mana:4026,
  mat:{먼지:15,홍월초:9},       buf:[["rest",.25],["heal",.10]], d:"2시간 이성 회복 +25%, 치유·보호막 위력 +10%"},
 {id:"q5", n:"맨드레이크 각성제", c:"var(--gold)", dur:120, mana:6039,
  mat:{먼지:12,뿌리:3,약초:6},  buf:[["exp",.25],["study",.15]], d:"2시간 경험치 +25%, 수업 효율 +15%", farm:true},
 {id:"q6", n:"황금 물약", c:"var(--gold)", dur:120, mana:12000,
  mat:{톱니:12,홍월초:6},       buf:[["gold",.40]], d:"2시간 륜 획득 +40%"},
 {id:"q7", n:"잿불 진정제", c:"var(--gold)", dur:120, mana:8052,
  mat:{집광편:3,잿불씨:6,홍월초:6}, buf:[["hpP",.15],["defP",.25]], d:"2시간 생명력 +15%, 방어력 +25%"},
 {id:"q8", n:"네잎 행운초", c:"var(--jadeD)", dur:120, mana:9400,
  mat:{인광:6,꽃:6},            buf:[["loot",.20],["crit",.03]], d:"2시간 전리품 확률 +20%, 치명타 확률 +3%", farm:true},
 {id:"q9", n:"행운의 물약", c:"var(--pink)", dur:120, mana:16000,
  mat:{종모래:3,심연정:1,인광:4}, buf:[["crit",.08],["critD",.20]], d:"2시간 치명타 확률 +8%, 치명타 피해 +20%", req:5},
];

/* ─── 거주지 혜택 — 낮은 번호일수록 비싸고 강한 특화 효과 ─── */
const HALLMULT={dorm:1, w1:12, w2:8, w3:5, w4:3, w5:2, w6:1.5, w7:1};
const HALLMAX={
 /* 구역 특색은 유지하고, 특화 효과에 HALLMULT를 곱합니다. 수수료 우대는 별도입니다. */
 dorm:{study:.08, know:.06, rest:.06},            // 기숙사 — 강의실·서가가 가깝다
 w1:  {gold:.14, rest:.06, fee:.02},              // 제1구역 — 고급 주거지·식당가
 w2:  {exp:.11, rest:.14, know:.03},              // 제2구역 — 밤새 불 켠 작업실
 w3:  {atkP:.10, crit:.03, critD:.25},            // 제3구역 — 의체와 해커
 w4:  {mana:.14, brew:.10},                       // 제4구역 — 일륜 발전 구역
 w5:  {loot:.12, boss:.10},                       // 제5구역 — 용병과 현상수배
 w6:  {hpP:.14, defP:.08, heal:.08},              // 제6구역 — 바닥의 아래
 w7:  {mana:.08},                                // 제7구역 — 검은 바다
};
Object.entries(HALLMAX).forEach(([id,base])=>{
  Object.keys(base).forEach(k=>{ if(k!=="fee") base[k]*=HALLMULT[id]; });
});
const HALLLABEL={
 dorm:[["수업 효율","study"],["지식 획득","know"],["체력·이성 회복","rest"]],
 w1:  [["륜 획득","gold"],["체력·이성 회복","rest"]],
 w2:  [["경험치","exp"],["체력·이성 회복","rest"],["지식 획득","know"]],
 w3:  [["공격력","atkP"],["치명타 확률","crit"],["치명 피해","critD"]],
 w4:  [["파장 재생","mana"],["양조 효율","brew"]],
 w5:  [["전리품 확률","loot"],["업귀 피해","boss"]],
 w6:  [["생명력","hpP"],["방어력","defP"],["회복력","heal"]],
 w7:  [["파장 재생","mana"]],
};
/* ═══════════ 거처 — 일세와 집 짓기 ═══════════
   · 기숙사 : 일세 없음. 방을 네 단계 꾸며 혜택 100%까지 키웁니다.
   · 구역   : 한 번 납부할 때 24시간 연장. 집을 지으면 구역 효과의 0~120%를 받습니다.
              미계약·미납 중에는 혜택이 멈춥니다(쫓겨나지는 않습니다). */
const HOMESTAGE=[0, 0.25, 0.50, 0.75, 1.00, 1.20];      // 단계별 혜택 배율 — 전부 0에서 시작합니다
const RENT_PERIOD_MINUTES=1440;
const RENT={ dorm:0, w1:1000000, w2:350000, w3:120000, w4:40000, w5:15000, w6:5000, w7:1500 };
const HOMECOST=[
 {rin:12000,  mat:{가루:20,  뿌리:6},            lotus:6,  n:"방 한 칸",   d:"침상과 등롱 하나를 들였다."},
 {rin:40000,  mat:{가루:60,  뿌리:12, 꽃:8},     lotus:8,  n:"부엌",       d:"불을 쓸 수 있게 되었다."},
 {rin:120000, mat:{가루:150, 어물:20, 열매:15},  lotus:10, n:"작업방",     d:"법구를 늘어놓을 자리가 생겼다."},
 {rin:320000, mat:{가루:320, 약초:30, 꽃:20},    lotus:12, n:"안뜰",       d:"작은 마당을 만들어 바람을 들였다."},
 {rin:800000, mat:{가루:700, 혼백:6,  어물:40},  lotus:20, n:"다락과 서가", d:"이제 여기를 집이라 불러도 되겠다."},
];
/* 기숙사도 0 에서 시작합니다. 다만 사무전이 내어 준 방이라 일세가 없고,
   꾸밀 수 있는 단계가 네 칸까지(혜택 100%)입니다. 구역은 다섯 칸(120%)이지만 일세를 냅니다. */
const DORMCOST=[
 {rin:7000,   mat:{가루:12, 뿌리:4},   lotus:4,  n:"침구와 등롱", d:"딱딱한 침상에 요를 깔았다."},
 {rin:24000,  mat:{가루:40, 꽃:6},     lotus:6,  n:"책상",        d:"창 없는 벽에 붙여 두었다."},
 {rin:70000,  mat:{가루:90, 열매:12},  lotus:8,  n:"선반",        d:"법구와 책을 올려 둘 자리."},
 {rin:180000, mat:{가루:200, 약초:20}, lotus:12, n:"창가 자리",   d:"없던 창을 하나 얻었다. 바깥은 여전히 밤이다."},
];
function homeS(){ if(!S.home) S.home={stage:0, due:0, auto:true}; return S.home; }
function isDorm(id){ return (id||S.hall)==="dorm"; }
function homePlan(id){ return isDorm(id) ? DORMCOST : HOMECOST; }
function homeMax(id){ return homePlan(id).length; }      // 기숙사 4칸 · 구역 5칸
function rentOf(id,stage){
  id=id||S.hall;
  if(stage===undefined) stage=id===S.hall?homeS().stage:0;
  return Math.round((RENT[id]||0)*(1+clamp(Number(stage)||0,0,homeMax(id))*0.35));
}
function rentCharge(){
  if(typeof pairRentActive!=="function" || !pairRentActive()) return rentOf();
  const r=pairRow();
  if(!r || !Object.prototype.hasOwnProperty.call(RENT,r.hall)) return null;
  return Math.max(rentOf(),rentOf(r.hall,r.home_stage));
}
function rentMoney(n){ return Math.round(Number(n)||0).toLocaleString("ko-KR"); }
function rentPaidUntil(){
  const shared=typeof pairRentDue==="function" ? pairRentDue() : 0;
  return Math.max(Number(homeS().due)||0, shared);
}
function rentDue(){ return Math.max(0, rentPaidUntil() - nowMin()); }  // 화면은 마지막 틱이 아닌 현재 시각 기준
function rentLate(){ const due=rentPaidUntil(); return !isDorm() && due>0 && S.t>=due; }
function hallGrowth(id){
  if(id!==S.hall) return 0;                      // 살지 않는 곳은 혜택이 없습니다
  if(!isDorm(id) && rentPaidUntil()<=S.t) return 0; // 계약 전·일세 만료 시 비싼 구역의 혜택도 멈춤
  return HOMESTAGE[clamp(homeS().stage, 0, homeMax(id))];
}
function hallFactor(id){ return clamp(hallGrowth(id), 0, 1.2); }
/* part3의 mod 래퍼가 읽는 표를 지금 성장치로 갱신한다 */
function syncHall(){
  const f=hallFactor(S.hall), base=HALLMAX[S.hall]||{};
  HALLS.forEach(h=>{ const o=HALLBONUS[h.id]; if(o) Object.keys(o).forEach(k=>delete o[k]); });
  const o=HALLBONUS[S.hall]||(HALLBONUS[S.hall]={});
  Object.keys(base).forEach(k=>{ if(k!=="fee") o[k]=base[k]*f; });
}
function hallFee(){ return (HALLMAX[S.hall]&&HALLMAX[S.hall].fee||0)*hallFactor(S.hall); }

function hallBenefitText(id){
  const current=hallBenefitsAt(id,hallFactor(id));
  const maximum=hallBenefitsAt(id,HOMESTAGE[homeMax(id)]);
  return `현재 — ${current} / 최대 — ${maximum}`;
}
function hallBenefitsAt(id,factor){
  const base=HALLMAX[id]||{}, pct=v=>Number((v*100).toFixed(1));
  const rows=(HALLLABEL[id]||[]).map(([n,k])=>`${n} +${pct(base[k]*factor)}${k==="crit"?"%p":"%"}`);
  if(base.fee) rows.push(`중개소 수수료 ${pct(base.fee*factor)}%p 낮음`);
  return rows.join(" · ");
}
/* 입학·지도·거처 등에서 쓰는 설명도 같은 수치에서 만듭니다. */
HALLS.forEach(h=>{ h.b=hallBenefitsAt(h.id,HOMESTAGE[homeMax(h.id)])+" (최대 성장 시)"; });

/* ═══════════ 상태 ═══════════ */
function ensureV4(){
  if(S.ing===undefined){ S.ing={}; ING.forEach(i=>S.ing[i.k]=0); S.ing.먼지=60; S.ing.홍월초=8; }
  ING.forEach(i=>{ if(S.ing[i.k]===undefined) S.ing[i.k]=0; });
  if(S.potion===undefined) S.potion={};
  if(S.brewN===undefined) S.brewN=3;
  syncHall();
}
function matHave(k){ return (S.ing&&S.ing[k]!==undefined)?S.ing[k]:(S.mat[k]||0); }
function matTake(k,n){ if(S.ing&&S.ing[k]!==undefined) S.ing[k]-=n; else S.mat[k]-=n; }
function matName(k){ const i=ING.find(x=>x.k===k); return i?i.n:k; }

/* ═══════════ 조제 ═══════════ */
function brewEff(){ return +(1 + mod("brew") + S.course*.06 + S.lvl*.004).toFixed(2); }
function brewMana(p){ return Math.round(p.mana/brewEff()); }
function canBrew(p,n){
  if(p.req&&S.course<p.req) return false;
  if(S.mana < brewMana(p)*n) return false;
  for(const k in p.mat) if(matHave(k) < p.mat[k]*n) return false;
  return true;
}
function brew(id,n){
  const p=POTIONS.find(x=>x.id===id);
  if(p.req&&S.course<p.req){ toast(`${p.req}과정부터 조제할 수 있습니다.`,"bad"); return; }
  if(!canBrew(p,n)){ toast("재료나 파장이 모자랍니다.","bad"); return; }
  S.mana-=brewMana(p)*n;
  for(const k in p.mat) matTake(k,p.mat[k]*n);
  S.potion[id]=(S.potion[id]||0)+n;
  S.war.mine=(S.war.mine||0)+n*2;
  addMark(n*2);
  toast(`<b>${p.n}</b> ${n}병을 조제했습니다.`,"good");
  renderTop(); renderNav(); renderMain(); save();
}
function drink(id){
  const p=POTIONS.find(x=>x.id===id);
  if(!(S.potion[id]>0)){ toast("보유한 물약이 없습니다.","bad"); return; }
  S.potion[id]--;
  const mine=S.buffs.filter(b=>b.pid===p.id);
  if(mine.length) mine.forEach(b=>b.left=Math.min(p.dur*3, b.left+p.dur));
  else p.buf.forEach(([k,v],i)=>S.buffs.push({n:p.n, pid:p.id, key:k, v, left:p.dur, e:ic("testtube"), c:p.c, hide:i>0}));
  toast(`${p.n} · ${p.d}`,"good");
  renderTop(); renderNav(); renderMain(); save();
}
function sellPotion(id){
  const p=POTIONS.find(x=>x.id===id);
  if(!(S.potion[id]>0)) return;
  S.potion[id]--;
  const gross=Math.round(p.mana*1.4+600);
  const feeR=Math.max(0.01, 0.05-hallFee());
  const net=Math.round(gross*(1-feeR));
  gainRin(net);
  toast(`중개소에서 팔았습니다 · 륜 +${nf(net)} <span class="muted">(수수료 ${(feeR*100).toFixed(0)}%)</span>`,"good");
  renderTop(); renderMain(); save();
}

/* ═══════════ 화면 — 연금 공방 ═══════════ */
VIEWS.alche=()=>{
  const eff=brewEff();
  const shelf=POTIONS.filter(p=>S.potion[p.id]>0);
  return head("조제학 실습실",ic("flask")+" 연금 공방", `양조 효율 <b style="color:var(--gold)">×${eff.toFixed(2)}</b>`)+`
  ${buffStrip()}
  <div class="grid g2">
    <div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">조제법</div>
        <span class="seg">${[1,3,5,10].map(n=>`<button class="${S.brewN===n?"on":""}" onclick="S.brewN=${n};renderMain()">${n}병</button>`).join("")}</span></div>
      <div class="tiny muted" style="margin:6px 0 12px;line-height:1.85">
        재료와 파장이 있으면 바로 완성됩니다. 양조 효율 <b>×${eff.toFixed(2)}</b>만큼 파장이 덜 듭니다.
        물약 효과는 마신 뒤 실제 시간으로 흐릅니다. 마신 뒤 시작하는 수업·의뢰부터 적용됩니다
        (이미 진행 중인 수업·의뢰에는 적용되지 않으며, 효과가 남은 시간과 겹치는 만큼 반영됩니다).
      </div>
      ${POTIONS.map(p=>{
        const n=S.brewN, lock=p.req&&S.course<p.req, ok=canBrew(p,n);
        return `<div style="padding:10px 0;border-bottom:1px solid var(--s3);${lock?"opacity:.45":""}">
          <div class="spread">
            <div><span class="dot" style="background:${p.c};margin-right:6px"></span><b>${p.n}</b>
              <span class="tiny muted">효과 2시간 0분</span></div>
            <button class="btn sm ${ok?"pri":""}" ${ok?"":"disabled"} onclick="brew('${p.id}',${n})">${lock?`${p.req}과정부터`:`${n}병 만들기`}</button>
          </div>
          <div class="tiny muted" style="margin:3px 0 6px">${p.d}</div>
          <div class="row">
            <span class="buffchip" style="${S.mana>=brewMana(p)*n?"":"color:var(--red);border-color:var(--redD)"}">파장 ${nf(brewMana(p)*n)}</span>
            ${Object.keys(p.mat).map(k=>{
              const need=p.mat[k]*n, have=matHave(k);
              return `<span class="buffchip" style="${have>=need?"":"color:var(--red);border-color:var(--redD)"}">${matName(k)} ${nf(have)}/${need}</span>`}).join("")}
          </div>
          ${p.farm?`<div class="tiny muted" style="margin-top:4px">약초밭 수확물이 재료로 사용됩니다</div>`:""}
        </div>`}).join("")}
    </div>

    <div>
      <div class="card pad" style="margin-bottom:12px">
        <div class="sect-t">물약 선반</div>
        ${shelf.length?shelf.map(p=>{
          const act=S.buffs.find(b=>b.pid===p.id);
          return `<div class="spread" style="padding:7px 0;border-bottom:1px solid var(--s3)">
            <div><span class="dot" style="background:${p.c};margin-right:6px"></span><b>${p.n}</b>
              <span class="tiny muted">×${S.potion[p.id]}</span>
              ${act?`<span class="tag g" style="margin-left:6px">${hhmm(act.left)}</span>`:""}
              <div class="tiny muted">${p.d}</div></div>
            <div class="row">
              <button class="btn sm pri" onclick="drink('${p.id}')">마시기</button>
              <button class="btn sm" onclick="sellPotion('${p.id}')">중개소에서 팔기</button></div>
          </div>`}).join("")
          :`<div class="tiny muted">조제해 둔 물약이 없습니다.</div>`}
      </div>

      <div class="card pad">
        <div class="spread"><div class="sect-t" style="margin:0">재료 보관함</div>
          <span class="tiny muted">의뢰·나들이·탐사에서 모입니다</span></div>
        <table class="t">
          ${ING.map(i=>`<tr>
            <td>${i.e} ${i.n} <span class="tiny muted" style="margin-left:6px">${i.w}</span></td>
            <td style="text-align:right"><b style="${S.ing[i.k]?"":"color:var(--dim2)"}">${nf(S.ing[i.k]||0)}</b></td></tr>`).join("")}
          <tr><td colspan="2" style="padding-top:8px"><span class="tiny muted">약초밭 · 낚시</span></td></tr>
          ${["약초","열매","뿌리","꽃","어물"].map(k=>`<tr>
            <td>${k} <span class="tiny muted" style="margin-left:6px">${k==="어물"?"제7구역 검은 바다":"약초 온실 뒤뜰"}</span></td>
            <td style="text-align:right"><b style="${S.mat[k]?"":"color:var(--dim2)"}">${nf(S.mat[k]||0)}</b></td></tr>`).join("")}
          <tr><td>부적가루 <span class="tiny muted" style="margin-left:6px">법구 분해</span></td>
            <td style="text-align:right"><b>${nf(S.mat.가루||0)}</b></td></tr>
        </table>
      </div>
    </div>
  </div>`;
};

/* ═══════════ 거처 화면 ═══════════ */
function homeAct(){
  const h=homeS(), dorm=isDorm();
  const plan=homePlan(), top=homeMax();
  const next=plan[h.stage];
  const rent=rentCharge(), late=rentLate(), due=rentPaidUntil();
  const paired=typeof pairRentActive==="function" && pairRentActive();
  const matRow=(m)=>Object.entries(m).map(([k,v])=>{
    const have=(S.mat&&S.mat[k])||0;
    return `<span class="tag ${have>=v?"g":""}">${k} ${nf(have)}/${nf(v)}</span>`;
  }).join(" ");
  const rentCard = dorm ? `<div class="card pad">
    <div class="sect-t">일세 없음</div>
    <div class="tiny muted" style="line-height:1.9">
      사무전이 내어 준 방이라 <b>일세를 내지 않습니다.</b> 대신 꾸밀 수 있는 자리가
      <b>네 칸(혜택 100%)</b>까지입니다. 구역으로 나가면 다섯 칸(120%)까지 넓힐 수 있지만
      하루마다 일세를 내야 합니다.
    </div></div>` : `<div class="card pad">
    <div class="spread"><div class="sect-t" style="margin:0">일세</div>
      <span class="tiny ${late?"":"muted"}" style="${late?"color:var(--red)":""}">
        ${late?"미납 — 혜택이 멈췄습니다":(due?`다음 납부까지 ${hhmm(rentDue())}`:"아직 계약 전")}</span></div>
    <div class="tiny muted" style="margin-bottom:8px">
      24시간마다 <b style="color:var(--gold)">${rent===null?"페어의 거처 확인 중":rentMoney(rent)+" 륜"}</b>.
      숫자가 작은 구역일수록 비싸고, 집 단계마다 기본 일세의 35%가 더해집니다.
      밀려도 쫓겨나지는 않지만, 낼 때까지 거주지 혜택이 붙지 않습니다.</div>
    <div class="row">
      <button class="btn ${late?"pri":""}" onclick="payRent()">${h.rentPending?"납부 결과 다시 확인":due?"하루치 내기":"계약하고 하루치 내기"}
        <span class="tiny muted">${rent===null?"거처 확인":rentMoney(rent)}</span></button>
      <button class="btn sm ${h.auto?"pri":""}" onclick="toggleRentAuto()">
        자동 납부 ${h.auto?"켜짐":"꺼짐"}</button>
    </div>
    <div class="tiny muted" style="margin-top:6px">${paired
      ? `페어 중 한 명만 내면 두 사람 모두 24시간 적용됩니다. 두 사람 중 더 높은 일세를 한 번 냅니다. 내 거처 기준 ${rentMoney(rentOf())} 륜/일.`
      : "자동 납부를 켜 두면 륜이 있을 때 알아서 빠집니다."}</div>
    ${h.rentPending?'<div class="tiny muted" style="margin-top:6px">일세를 처리 중입니다. 연결이 돌아오면 같은 납부 건으로 다시 확인합니다.</div>':""}
  </div>`;
  return rentCard + `
  <div class="card pad" style="margin-top:14px">
    <div class="spread"><div class="sect-t" style="margin:0">${dorm?"방 꾸미기":"집 짓기"}</div>
      <span class="tiny muted">${h.stage} / ${top} 단계</span></div>
    <div class="bar" style="margin:6px 0 10px"><i style="width:${h.stage/top*100}%"></i></div>
    ${plan.map((c,i2)=>`<div class="spread tiny" style="padding:3px 0;${i2<h.stage?"opacity:.55":""}">
      <span>${i2<h.stage?ic("check",11):`<b>${i2+1}</b>`} ${c.n}
        <span class="muted">· ${c.d}</span></span>
      <span class="muted">혜택 ${(HOMESTAGE[i2+1]*100).toFixed(0)}%</span></div>`).join("")}
    ${next?`<div class="card pad" style="background:var(--s1);margin-top:10px">
      <div class="tiny" style="color:var(--gold);margin-bottom:4px">다음 — ${next.n}</div>
      <div class="tiny muted" style="margin-bottom:6px">${next.d}</div>
      <div class="row" style="gap:5px;margin-bottom:8px">
        <span class="tag ${S.rin>=next.rin?"g":""}">륜 ${nf(S.rin)}/${nf(next.rin)}</span>
        ${matRow(next.mat)}</div>
      <div class="tiny muted" style="margin-bottom:8px">완성하면 연등 +${next.lotus}</div>
      <button class="btn pri" onclick="buildHome()">${dorm?"들인다":"짓는다"}</button></div>`
     :`<div class="tiny" style="color:var(--ok);margin-top:10px">${dorm?"방을 다 꾸몄습니다. 혜택이 100%로 붙습니다.":"집을 다 지었습니다. 혜택이 최대(120%)로 붙습니다."}</div>`}
    <div class="tiny muted" style="margin-top:8px">재료는 약초밭·낚시·법구 분해에서 모읍니다.</div>
  </div>`;
}
VIEWS.hallv=()=>{
  syncHall();
  const me=homeOf(S.hall), h=homeS();
  const benefit=id=>hallBenefitsAt(id,hallFactor(id));
  const max=id=>hallBenefitsAt(id,HOMESTAGE[homeMax(id)]);
  const currentHome=`<div class="card pad">
        <div class="spread"><div class="sect-t" style="margin:0">${me.n} <span class="muted">${me.h}</span></div>
          <span class="tag" style="border-color:${me.c};color:${me.c}">
            혜택 ${(hallFactor(S.hall)*100).toFixed(0)}%</span></div>
        <div class="tiny muted" style="margin-bottom:8px">${me.d}</div>
        ${isDorm()?"":`<div class="tiny muted" style="margin-bottom:6px">구역 특화 효과 ${HALLMULT[S.hall]}배 · 기본 일세 ${rentMoney(RENT[S.hall])} 륜</div>`}
        <div class="tiny" style="color:var(--gold)">${benefit(S.hall)||"일세가 밀려 혜택이 멈췄습니다"}</div>
        <div class="tiny muted" style="margin-top:4px">다 키웠을 때 — ${max(S.hall)}</div>
      </div>`;
  return head("지금 사는 곳",ic("castle")+" 거처",
    `${me.n} ${me.h} · ${h.stage} / ${homeMax()} 단계`)+`
  ${typeof pairHousingHTML==="function" ? pairHousingHTML(currentHome) : currentHome}
  <div class="grid g2" style="margin-bottom:14px">
    <div>

      ${homeAct()}
    </div>
    <div class="card pad">
      <div class="sect-t">거주지 고르기</div>
      <div class="tiny muted" style="margin-bottom:10px">숫자가 작은 구역일수록 일세와 특화 효과가 크게 올라갑니다.
        옮기면 <b>꾸며 둔 것은 두고 갑니다</b>(단계 0으로).
        기숙사는 무료이며, 구역은 계약 후 집 단계에 따라 특화 효과의 최대 120%를 받습니다.</div>
      ${HALLS.map(x=>`<div class="sub" style="margin-bottom:8px;${x.id===S.hall?"border-color:"+x.c:""}">
        <div class="spread"><div><b style="color:${x.c}">${x.n}</b>
          <span class="tiny muted">${x.h}</span>
          ${x.id===S.hall?'<span class="tag g" style="margin-left:6px">여기 삽니다</span>':""}</div>
          <span class="tiny muted">${RENT[x.id]?`하루 ${rentMoney(RENT[x.id])} 륜~ · 특화 ${HALLMULT[x.id]}배`:"일세 없음 · 최대 100%"}</span></div>
        <div class="tiny muted" style="margin-top:3px">${max(x.id)}</div>
        ${x.id===S.hall?"":`<button class="btn sm" style="margin-top:6px" onclick="moveHall('${x.id}')">여기로 옮기기</button>`}
      </div>`).join("")}
    </div>
  </div>`;
};
function payRent(){
  if(typeof payPairRent==="function" && sbOn()) return payPairRent(false);
  return payLocalRent(false);
}
function payLocalRent(automatic){
  const h=homeS();
  if(h.rentPending){ if(!automatic) toast("먼저 연결을 복구해 진행 중인 일세 납부를 확인해 주세요.","bad"); return; }
  if(isDorm()){ toast("기숙사는 일세가 없습니다."); return; }
  if(automatic && (!h.auto || !h.due || S.t<h.due)) return;
  const r=rentOf();
  if(S.rin<r){ if(!automatic) toast("륜이 부족합니다.","bad"); return; }
  S.rin-=r;
  const base = (h.due && S.t<h.due) ? h.due : S.t;      // 밀렸으면 지금부터, 아니면 이어서
  h.due = base + RENT_PERIOD_MINUTES;
  if(automatic) pushNews(`[거처] 일세 ${rentMoney(r)} 륜이 자동으로 빠져나갔습니다.`);
  else toast(`일세 ${rentMoney(r)} 륜을 냈습니다. 다음 납부까지 ${hhmm(h.due-S.t)}`,"good");
  syncHall(); renderTop(); renderNav(); renderMain(); save();
  if(typeof syncUp==="function") syncUp(true);
}
function toggleRentAuto(){ const h=homeS(); h.auto=!h.auto; renderMain(); save();
  toast(h.auto?"자동 납부를 켰습니다.":"자동 납부를 껐습니다."); }
function buildHome(){
  const h=homeS();
  const c=homePlan()[h.stage];
  if(!c){ toast(isDorm()?"이미 다 꾸몄습니다.":"이미 다 지었습니다."); return; }
  if(S.rin<c.rin){ toast("륜이 부족합니다.","bad"); return; }
  for(const [k,v] of Object.entries(c.mat))
    if(((S.mat&&S.mat[k])||0) < v){ toast(`${k}이(가) 부족합니다.`,"bad"); return; }
  S.rin-=c.rin;
  Object.entries(c.mat).forEach(([k,v])=>{ S.mat[k]-=v; });
  h.stage++; S.lotus+=c.lotus;
  pushNews(`[거처] ${homeOf(S.hall).n}의 ${isDorm()?"방":"집"}에 「${c.n}」이 생겼습니다.`);
  toast(`「${c.n}」 완성 · 연등 +${c.lotus} · 혜택 ${(HOMESTAGE[h.stage]*100).toFixed(0)}%`,"good");
  if(typeof achCheck==="function") achCheck();
  syncHall(); renderTop(); renderNav(); renderMain(); save();
  if(typeof syncUp==="function") syncUp(true);
}
/* 자동 납부 — 접속 중 또는 다음 접속 시 잔액이 있으면 갱신합니다. */
const _stepRent=step;
step=function(m){
  _stepRent(m);
  if(!S||!S.made) return;
  if(typeof pairRentTick==="function" && pairRentTick()) return;
  if(isDorm()) return;
  const h=homeS();
  if(!h.due) return;
  if(S.t>=h.due && h.auto){
    payLocalRent(true);
  }
};


/* ═══════════ 연결 ═══════════ */
/* 치유·보호막 위력에 물약 효과 반영 */
const _C=C;
C=function(){ const c=_C(); c.heal=+(c.heal+mod("heal")).toFixed(2); return c; };

/* 의뢰 처치 — 가끔 조제 재료 */
const _runStep=runStep;
runStep=function(){
  const before=S.run?S.run.kills:0;
  _runStep();
  if(S.run && S.run.kills>before && Math.random()<0.16){
    const g=ING.filter(x=>!/심연|종루/.test(x.w));
    const it=pick(g), amt=rnd(1,2)+Math.floor(S.run.stage/25);
    runMaterial("ing",it.k,amt);
    pushRun(`<span class="s">${it.e} ${it.n}을(를) 챙겼다. +${amt}</span>`);
  }
};

/* 석탑 — 종루의 모래 */
const _climbTower4=climbTower;
climbTower=function(c){ const b=S.tower||0; _climbTower4(c);
  const g=(S.tower||0)-b; if(g>0) S.ing.종모래=(S.ing.종모래||0)+Math.ceil(g/3); };

/* 중개소 수수료 — 수월당 혜택 */
const _listMine=listMine;
listMine=function(id){
  const i=S.bag.findIndex(x=>x.id===id); if(i<0) return;
  const it=S.bag[i];
  const gross=Math.round(gearScore(it)*1.35+it.lv*120);
  const baseFee=gross<=100000?.05:gross<=1000000?.07:.10;
  const feeR=Math.max(.01, baseFee-hallFee());
  const net=Math.round(gross*(1-feeR));
  S.bag.splice(i,1); gainRin(net);
  toast(`중개소에서 즉시 팔렸습니다 · 륜 +${nf(net)} <span class="muted">(수수료 ${(feeR*100).toFixed(0)}%${hallFee()>0?`, ${homeOf(S.hall).n} 보정`:""})</span>`,"good");
  renderTop(); renderMain(); save();
};

/* 거주지 혜택은 성장치가 바뀔 때마다 갱신 */
const _step4=step;
step=function(m){ if(S&&S.made&&S.ing) syncHall(); _step4(m); };
const _moveHall=moveHall;
moveHall=function(id){ const before=S.hall; _moveHall(id); syncHall();
  if(before!==S.hall && typeof syncUp==="function") syncUp(true); };

/* 내비 · 지도 */
(()=>{ const g=NAVDEF.find(x=>x.id==="craft");
  if(g && !g.sub.some(s=>s.id==="alche")) g.sub.unshift({id:"alche",n:"연금 공방"}); })();
PLACES.push({id:"alchep", n:"연금 공방", e:ic("flask"), x:15, y:65, view:"alche"});

const _boot4=boot;
boot=function(){ _boot4(); ensureV4(); renderNav(); renderMain(); };


;
/* ===== module: part5.js ===== */
"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 5
   건의함 — 구글 시트에 연결하면 모두가 함께 보는 게시판이 됩니다.
   연결 전에는 내 브라우저에만 쌓이는 「혼자 보기」로 동작합니다.
   ═══════════════════════════════════════════════════ */

const BCAT=[
 {k:"건의", c:"var(--gold)", d:"이렇게 바뀌면 좋겠다"},
 {k:"버그", c:"var(--red)", d:"잘못 동작하는 것"},
 {k:"문의", c:"var(--blue)", d:"궁금한 것"},
 {k:"칭찬", c:"var(--ok)", d:"좋았던 것"},
 {k:"기타", c:"var(--dim)", d:"그 밖에"},
];
const BSTATUS={
 "접수":  {c:"var(--dim)", d:"아직 읽지 않았습니다"},
 "확인":  {c:"var(--blue)", d:"운영진이 읽었습니다"},
 "반영":  {c:"var(--ok)", d:"반영되었습니다"},
 "보류":  {c:"var(--gold)", d:"지금은 어렵습니다"},
 "답변":  {c:"var(--violet)", d:"답변이 달렸습니다"},
};

function ensureV5(){
  if(!S.board) S.board={url:"", name:"", local:[], cache:[], liked:[], last:0, state:"idle", err:""};
  // 이전 판본에서 다운로드해 저장된 비공개 운영진 답변도 기기 캐시에서 지웁니다.
  if(Array.isArray(S.board.cache)){
    let scrubbed=false;
    S.board.cache=S.board.cache.map(r=>{
      if(!r || !+r.secret || !r.reply) return r;
      scrubbed=true;
      return {...r,has_reply:true,reply:""};
    });
    if(scrubbed && typeof save==="function") save();
  }
  if(!S.board.liked) S.board.liked=[];
  // 운영진이 config.js에 적어 둔 주소를 그대로 씁니다 (러너는 입력할 필요 없음)
  const CF=window.MMJY_CONFIG||{};
  if(CF.boardUrl && !S.board.urlManual) S.board.url=CF.boardUrl;
  if(!S.board.name) S.board.name=S.name||"";
}
function boardOn(){ return !!(S.board && S.board.url); }
function boardList(){ return boardOn()? (S.board.cache||[]) : (S.board.local||[]); }

/* ─── 비공개 글 작성자용 개인 열람 코드 ───
   공용 캐시/S 에 원문이나 코드를 저장하지 않습니다. 보관은 이 기기의
   계정별 localStorage에만 하며, 서버는 코드의 해시만 검사합니다. */
function boardReceiptStorageKey(){
  const id=(typeof ACCT!=="undefined" && ACCT && ACCT.id) || (S.sb&&S.sb.id) || "local";
  return "mmjy:board-private-receipts:v1:"+String(id);
}
function boardReceiptAll(){
  try{const v=JSON.parse(localStorage.getItem(boardReceiptStorageKey())||"{}");return v&&typeof v==="object"&&!Array.isArray(v)?v:{};}
  catch(_){return {};}
}
function boardReceiptFor(id){return String(boardReceiptAll()[String(id)]||"");}
function boardRememberReceipt(id,receipt){
  if(!/^[a-f0-9]{64}$/.test(String(receipt))) return false;
  try{const v=boardReceiptAll();v[String(id)]=receipt;localStorage.setItem(boardReceiptStorageKey(),JSON.stringify(v));return true;}
  catch(_){return false;}
}
function boardNewReceipt(){
  if(!window.crypto || typeof window.crypto.getRandomValues!=="function")
    throw Error("안전한 열람 코드를 만들 수 없습니다. HTTPS에서 다시 시도해 주세요.");
  const bytes=new Uint8Array(32);window.crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
function boardReadPrivate(id,receipt){
  if(S.board&&S.board.url){
    return boardSend({action:"read_private",id:String(id),receipt}).then(j=>{
      if(!j||!j.ok||typeof j.body!=="string") throw Error(j&&j.error||"열람 코드를 확인할 수 없습니다.");
      return {body:j.body, reply:typeof j.reply==="string"?j.reply:null};
    });
  }
  if(typeof sbSend==="function" && typeof sbOn==="function" && sbOn()){
    return sbSend("POST","rpc/read_my_private_suggestion_full",{p_id:Number(id),p_receipt:receipt}).then(rows=>{
      const item=Array.isArray(rows)?rows[0]:rows;
      if(!item||typeof item.body!=="string") throw Error("열람 코드가 맞지 않거나 이전 방식으로 작성한 글입니다.");
      return {body:item.body, reply:typeof item.reply==="string"?item.reply:null};
    });
  }
  return Promise.reject(Error("건의함이 연결되지 않았습니다."));
}
function boardPrivateArea(id,hasReply){
  const token=boardReceiptFor(id);
  return `<div id="board_private_body" data-post-id="${esc(String(id))}" style="white-space:pre-wrap;line-height:1.9;font-size:14px">${token?"비공개 본문을 확인하는 중…":"비공개 글입니다. 작성자만 열람 코드로 본문을 볼 수 있습니다."}</div>
    ${hasReply?`<div class="card pad" id="board_private_reply_panel" data-post-id="${esc(String(id))}" style="margin-top:14px;border-color:var(--gold2)">
      <div class="sect-t" style="margin:0 0 6px">운영진 답변</div>
      <div id="board_private_reply" style="white-space:pre-wrap;line-height:1.9;font-size:13.5px">${token?"답변을 확인하는 중…":"작성자 인증 후 답변을 볼 수 있습니다."}</div>
    </div>`:""}
    <div id="board_private_unlock" style="margin-top:10px;${token?"display:none":""}">
      <div class="tiny muted" style="margin-bottom:6px">본인이 작성한 글이라면 글을 올릴 때 받은 열람 코드를 입력해 주세요.</div>
      <div class="row" style="gap:8px">
        <input class="inp" id="board_receipt_input" type="text" autocomplete="off" spellcheck="false" placeholder="64자리 개인 열람 코드" maxlength="64" style="flex:1;min-width:180px">
        <button class="btn sm pri" onclick="boardUnlock('${esc(String(id))}')">본문 보기</button>
      </div>
      <div class="tiny muted" style="margin-top:6px">기존 비공개 글은 작성자 확인용 코드가 없어 운영진이 기존 글에 코드를 발급해야 합니다.</div>
    </div>`;
}
function boardPrivateLoad(id,code){
  const body=document.getElementById("board_private_body"), unlock=document.getElementById("board_private_unlock");
  if(!body || body.dataset.postId!==String(id)) return;
  body.textContent="비공개 본문을 확인하는 중…";
  boardReadPrivate(id,code).then(data=>{
    const current=document.getElementById("board_private_body");
    if(!current || current.dataset.postId!==String(id)) return;
    current.textContent=data.body;
    const privateReply=document.getElementById("board_private_reply");
    const panel=document.getElementById("board_private_reply_panel");
    if(privateReply && panel && panel.dataset.postId===String(id))
      privateReply.textContent=data.reply===null
        ? "답변 열람 기능을 업데이트해야 합니다. 서버의 최신 보안 SQL 또는 Apps Script를 적용해 주세요."
        : (data.reply || "아직 답변이 없습니다.");
    const row=document.getElementById("board_private_unlock");if(row)row.style.display="none";
    boardRememberReceipt(id,code);
  }).catch(e=>{
    const current=document.getElementById("board_private_body");if(!current || current.dataset.postId!==String(id))return;
    current.textContent="비공개 글입니다. "+String(e.message||e);
    const privateReply=document.getElementById("board_private_reply");
    if(privateReply)privateReply.textContent="작성자 인증 후 답변을 볼 수 있습니다.";
    const row=document.getElementById("board_private_unlock");if(row)row.style.display="";
  });
}
function boardUnlock(id){
  const input=document.getElementById("board_receipt_input");
  const token=String(input&&input.value||"").trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(token)){toast("64자리 열람 코드를 입력해 주세요.","bad");return;}
  boardPrivateLoad(id,token);
}
function boardPrivateSubmitted(id,receipt){
  boardRememberReceipt(id,receipt);
  modal("비공개 건의글 등록 완료",`
    <div class="tiny" style="line-height:1.8;margin-bottom:12px">내 글의 본문은 이 기기에서 바로 읽을 수 있습니다.
    <b>다른 기기에서 읽으려면 아래 개인 열람 코드가 필요합니다.</b>
    운영진 이외의 다른 러너에게는 본문을 공개하지 않습니다.</div>
    <label class="f">개인 열람 코드</label>
    <input class="inp" id="board_new_receipt" readonly value="${esc(receipt)}" style="width:100%;font-size:12px" onclick="this.select()">
    <div class="row" style="margin-top:12px">
      <button class="btn pri" onclick="boardCopyReceipt()">열람 코드 복사</button>
      <button class="btn" onclick="closeModal()">확인</button>
    </div>
    <div class="tiny muted" style="margin-top:10px">코드를 잃으면 운영진에게 별도 재발급을 요청해야 합니다.</div>`);
}
function boardCopyReceipt(){
  const el=document.getElementById("board_new_receipt");if(!el)return;
  el.select();
  if(navigator.clipboard&&navigator.clipboard.writeText)
    navigator.clipboard.writeText(el.value).then(()=>toast("열람 코드를 복사했어요.","good")).catch(()=>toast("코드를 선택했어요. 직접 복사해 주세요."));
  else toast("코드를 선택했어요. 직접 복사해 주세요.");
}

/* ─── 구글 시트와 주고받기 ─── */
function boardFetch(force){
  if(!boardOn()) return;
  const now=Date.now();
  if(!force && S.board.last && now-S.board.last<20000) return;
  S.board.last=now; S.board.state="loading"; S.board.err="";
  if(VIEW==="board") renderMain();
  fetch(S.board.url+"?action=list&t="+now, {method:"GET"})
    .then(r=>r.json())
    .then(j=>{
      if(!j || !j.ok) throw new Error(j&&j.error||"목록을 받지 못했습니다");
      S.board.cache=(j.rows||[]).map(r=>({
        ...r, has_reply:!!(r.has_reply || (r.reply&&String(r.reply).trim())),
        reply:+r.secret?"":String(r.reply||"")
      })); S.board.state="ok"; S.board.err="";
      if(VIEW==="board") renderMain();
      save();
    })
    .catch(e=>{
      S.board.state="err";
      S.board.err=String(e.message||e);
      if(VIEW==="board") renderMain();
    });
}
function boardSend(payload){
  // Content-Type을 지정하지 않아 브라우저의 사전 확인 요청(preflight)을 피합니다.
  return fetch(S.board.url, {method:"POST", body:JSON.stringify(payload)})
    .then(r=>r.json());
}

/* ─── 글 올리기 ─── */
function boardWrite(){
  const cats=BCAT.map(c=>`<option value="${c.k}">${c.k} — ${c.d}</option>`).join("");
  modal("건의함에 글 올리기", `
    <div class="tiny muted" style="margin-bottom:10px">
      ${boardOn()?"운영진과 다른 학생 모두가 볼 수 있습니다. 비공개로 올리면 작성자와 운영진만 봅니다."
                 :"지금은 <b>혼자 보기</b>입니다. 이 브라우저에만 저장되며 운영진에게 전달되지 않습니다."}
    </div>
    <label class="f">쓰는 사람</label>
    <input class="inp" id="b_name" maxlength="16" value="${esc(S.board.name||S.name||"")}" placeholder="이름 또는 계정">
    <label class="f">분류</label>
    <select class="inp" id="b_cat">${cats}</select>
    <label class="f">제목</label>
    <input class="inp" id="b_title" maxlength="60" placeholder="한 줄로 요약해 주세요">
    <label class="f">내용</label>
    <textarea class="inp" id="b_body" style="min-height:140px" maxlength="1500"
      placeholder="어떤 화면에서, 무엇을 하려다, 어떻게 되었는지 적어 주시면 가장 빠릅니다."></textarea>
    <label class="row" style="margin-top:12px;gap:7px;cursor:pointer">
      <input type="checkbox" id="b_secret"> <span class="tiny">비공개 — 작성자와 운영진만 보기</span></label>
    <div class="row" style="margin-top:14px">
      <button class="btn pri" id="b_go" onclick="boardSubmit()">올리기</button>
      <button class="btn" onclick="closeModal()">취소</button>
    </div>`);
}
function boardSubmit(){
  const name=($("#b_name").value||"").trim()||"이름 없는 차사";
  const cat=$("#b_cat").value, title=($("#b_title").value||"").trim();
  const body=($("#b_body").value||"").trim();
  const secret=$("#b_secret").checked;
  if(!title){ toast("제목을 적어 주세요.","bad"); return; }
  if(!body){ toast("내용을 적어 주세요.","bad"); return; }
  S.board.name=name;
  const row={id:"L"+Date.now(), time:new Date().toISOString(), name, cat, title, body,
             secret:secret?1:0, likes:0, status:"접수", reply:""};
  if(!boardOn()){
    S.board.local.unshift(row);
    closeModal(); renderMain(); save();
    toast("혼자 보기에 저장했습니다. 운영진에게 보내려면 설정에서 건의함을 연결해 주세요.");
    return;
  }
  let receipt="";
  if(secret){try{receipt=boardNewReceipt();}catch(e){toast(String(e.message||e),"bad");return;}}
  const btn=$("#b_go"); if(btn){ btn.disabled=true; btn.textContent="보내는 중…"; }
  boardSend({action:"add", ...row, receipt})
    .then(j=>{
      if(!j||!j.ok) throw new Error(j&&j.error||"보내지 못했습니다");
      if(secret){
        if(!j.id) throw Error("서버에서 글 번호를 받지 못했습니다. 운영진에게 문의해 주세요.");
        boardPrivateSubmitted(j.id,receipt);
      }else{closeModal();toast("건의함에 올렸습니다. 고맙습니다.","good");}
      boardFetch(true);
    })
    .catch(e=>{
      if(btn){ btn.disabled=false; btn.textContent="올리기"; }
      toast("보내지 못했습니다 · "+esc(String(e.message||e)),"bad");
    });
}
function boardLike(id){
  if(S.board.liked.includes(id)){ toast("이미 공감했습니다."); return; }
  S.board.liked.push(id);
  const r=boardList().find(x=>String(x.id)===String(id));
  if(r) r.likes=(+r.likes||0)+1;
  renderMain(); save();
  if(boardOn()) boardSend({action:"like", id}).catch(()=>{});
}
function boardOpen(id){
  const r=boardList().find(x=>String(x.id)===String(id)); if(!r) return;
  const C=BCAT.find(c=>c.k===r.cat)||BCAT[4];
  const st=BSTATUS[r.status]||BSTATUS["접수"];
  modal(esc(r.title), `
    <div class="spread" style="margin-bottom:10px">
      <div class="row">
        <span class="tag" style="border-color:${C.c};color:${C.c}">${esc(r.cat)}</span>
        <span class="tag" style="border-color:${st.c};color:${st.c}">${esc(r.status||"접수")}</span>
        ${+r.secret?'<span class="tag">비공개</span>':""}
      </div>
      <span class="tiny muted">${esc(r.name)} · ${boardDate(r.time)}</span>
    </div>
    ${(+r.secret&&boardOn())?boardPrivateArea(r.id,!!(r.has_reply||r.reply)):`<div style="white-space:pre-wrap;line-height:1.9;font-size:14px">${esc(r.body)}</div>`}
    ${(!(+r.secret&&boardOn())&&r.reply)?`<div class="card pad" style="margin-top:14px;border-color:var(--gold2)">
      <div class="sect-t" style="margin:0 0 6px">운영진 답변</div>
      <div style="white-space:pre-wrap;line-height:1.9;font-size:13.5px">${esc(r.reply)}</div></div>`:""}
    <div class="row" style="margin-top:14px">
      <button class="btn ${S.board.liked.includes(String(r.id))?"":"pri"} sm"
        onclick="boardLike('${esc(String(r.id))}')">공감 ${+r.likes||0}</button>
      <button class="btn" style="margin-left:auto" onclick="closeModal()">닫기</button>
    </div>`);
  if(+r.secret&&boardOn()&&boardReceiptFor(r.id)) boardPrivateLoad(r.id,boardReceiptFor(r.id));
}
function boardDate(t){
  try{ const d=new Date(t);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }catch(e){ return String(t||""); }
}
function boardConnect(){
  modal("건의함 연결", `
    <div class="tiny muted" style="line-height:1.9;margin-bottom:12px">
      구글 시트에 연결하면 모두가 같은 건의함을 보게 됩니다. 글은 시트에 쌓이고,
      운영진이 시트의 <b>상태</b>·<b>답변</b> 칸을 채우면 게임 안에 바로 보입니다.<br>
      연결 주소를 만드는 방법은 함께 드린 안내서 「건의함 연결하기」를 보세요.
    </div>
    <label class="f">연결 주소 (Apps Script 웹 앱 URL)</label>
    <input class="inp" id="b_url" value="${esc(S.board.url||"")}"
      placeholder="https://script.google.com/macros/s/..../exec">
    <div class="tiny muted" style="margin-top:6px">비워 두면 「혼자 보기」로 돌아갑니다.</div>
    <div class="row" style="margin-top:14px">
      <button class="btn pri" onclick="boardSaveURL()">저장하고 확인</button>
      <button class="btn" onclick="closeModal()">취소</button>
    </div>`);
}
function boardSaveURL(){
  const u=($("#b_url").value||"").trim();
  S.board.url=u; S.board.urlManual=true; S.board.cache=[]; S.board.last=0; S.board.state="idle"; S.board.err="";
  save(); closeModal(); renderMain();
  if(u){ toast("연결 주소를 저장했습니다. 목록을 불러옵니다."); boardFetch(true); }
  else toast("혼자 보기로 돌아갑니다.");
}

/* ─── 화면 ─── */
let BFILTER="전체";
VIEWS.board=()=>{
  const B=S.board;
  let rows=[...boardList()];
  if(BFILTER!=="전체") rows=rows.filter(r=>r.cat===BFILTER);
  rows.sort((a,b)=>new Date(b.time)-new Date(a.time));

  const banner = boardOn()
    ? (B.state==="err"
        ? `<div class="card pad" style="margin-bottom:12px;border-color:var(--redD);padding:10px 14px">
             <span class="tag r">연결 실패</span> <span class="tiny">${esc(B.err)}</span>
             <div class="tiny muted" style="margin-top:4px">연결 주소가 맞는지, 웹 앱 접근 권한이 「모든 사용자」인지 확인해 주세요.</div>
             <button class="btn sm" style="margin-top:8px" onclick="boardFetch(true)">다시 시도</button>
             <button class="btn sm" onclick="boardConnect()">연결 고치기</button></div>`
        : `<div class="card pad" style="margin-bottom:12px;padding:9px 14px">
             <span class="tag j">연결됨</span> <span class="tiny muted">모두가 같은 건의함을 봅니다 · 글 ${boardList().length}개
             ${B.state==="loading"?" · 불러오는 중…":""}</span>
             <button class="btn sm ghost" style="float:right" onclick="boardFetch(true)">새로 고침</button></div>`)
    : `<div class="card pad" style="margin-bottom:12px;padding:10px 14px;border-color:var(--gold2)">
         <span class="tag g">혼자 보기</span>
         <span class="tiny muted">아직 연결되지 않아 이 브라우저에만 쌓입니다. 운영진에게 전달되지 않습니다.</span>
         <button class="btn sm pri" style="float:right" onclick="boardConnect()">건의함 연결하기</button></div>`;

  return head("사무전 민원 접수함",ic("mailbox")+" 건의함",
    `${boardOn()?"모두가 함께 보는 게시판":"내 브라우저에만 저장"}`)+`
  ${banner}
  <div class="card pad" style="margin-bottom:12px;padding:10px 14px">
    <div class="tiny muted">통신이 끊긴 구역에서는 가까운 사찰이나 편의점에 설치된 비상 단말을 사용합니다.
    전산망에 기록을 남길 수 없는 사람들은 사무전 외벽에 마련된 접수함에 종이 의뢰서를 넣기도 합니다.</div>
  </div>
  <div class="row" style="margin-bottom:12px">
    <span class="seg">${["전체",...BCAT.map(c=>c.k)].map(k=>
      `<button class="${BFILTER===k?"on":""}" onclick="BFILTER='${k}';renderMain()">${k}</button>`).join("")}</span>
    <button class="btn pri" style="margin-left:auto" onclick="boardWrite()">글 올리기</button>
    <button class="btn sm ghost" onclick="boardConnect()">연결 설정</button>
  </div>
  ${rows.length?`<div class="card pad">
    <table class="t">
      <tr><th style="width:62px">분류</th><th>제목</th><th style="width:110px">쓴 사람</th>
        <th style="width:62px">공감</th><th style="width:70px">상태</th><th style="width:130px">올린 때</th></tr>
      ${rows.map(r=>{
        const C=BCAT.find(c=>c.k===r.cat)||BCAT[4];
        const st=BSTATUS[r.status]||BSTATUS["접수"];
        const hidden=!!+r.secret;
        return `<tr style="cursor:pointer" onclick="boardOpen('${esc(String(r.id))}')">
          <td><span class="tag" style="border-color:${C.c};color:${C.c}">${esc(r.cat)}</span></td>
          <td><b>${esc(r.title)}</b>${hidden?' <span class="tag">비공개</span>':""}
            ${(r.has_reply||r.reply)?' <span class="tiny" style="color:var(--gold)">· 답변 있음</span>':""}</td>
          <td class="tiny muted">${esc(r.name)}</td>
          <td class="tiny" style="color:${(+r.likes)?"var(--gold)":"var(--dim2)"}">${+r.likes||0}</td>
          <td><span class="tag" style="border-color:${st.c};color:${st.c}">${esc(r.status||"접수")}</span></td>
          <td class="tiny muted">${boardDate(r.time)}</td></tr>`}).join("")}
    </table>
  </div>`:`<div class="card pad"><div class="tiny muted" style="padding:14px 2px;text-align:center">
    아직 들어온 글이 없습니다. 첫 글을 올려 주세요.</div></div>`}

  <div class="card pad" style="margin-top:12px">
    <div class="sect-t">상태 표시</div>
    <div class="row">${Object.keys(BSTATUS).map(k=>
      `<span class="buffchip"><span class="dot" style="background:${BSTATUS[k].c}"></span>${k} <span class="muted">${BSTATUS[k].d}</span></span>`).join("")}</div>
  </div>`;
};

/* ─── 연결 ─── */
(()=>{ const g=NAVDEF.find(x=>x.id==="soc");
  if(g && !g.sub.some(s=>s.id==="board")) g.sub.push({id:"board",n:"건의함"}); })();

const _go5=go;
go=function(v){ _go5(v); if(v==="board") boardFetch(false); };

const _openSettings=openSettings;
openSettings=function(){
  _openSettings();
  const r=document.querySelector(".modal .row");
  if(!r) return;
  const box=document.createElement("div");
  box.innerHTML=`<hr class="hr">
    <div class="sect-t">건의함</div>
    <div class="tiny muted">${boardOn()?`연결됨 · <span style="color:var(--jade)">${esc(S.board.url.slice(0,46))}…</span>`
      :"연결되지 않음 — 내 브라우저에만 저장됩니다"}</div>
    <div class="row" style="margin-top:8px">
      <button class="btn" onclick="closeModal();go('board')">건의함 열기</button></div>`;
  const body=document.querySelector(".modal .mbody");
  if(body) body.appendChild(box);
};

const _boot5=boot;
boot=function(){ _boot5(); ensureV5(); renderNav(); renderMain(); };


;
/* ===== module: part6.js ===== */
"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 6
   공유 기록(학생 명부 · 랭킹) · 함께 가기(방)
   Supabase 에 연결했을 때만 동작하며, 연결 전에는 기존 혼자 모드 그대로입니다.
   ═══════════════════════════════════════════════════ */

function ensureV6(){
  if(!S.sb) S.sb={url:"", key:"", id:"", on:false, state:"idle", err:"",
                  roster:[], rosterAt:0, rooms:[], roomsAt:0, myRoom:null, claimed:[], upAt:0};
  if(!S.sb.claimed) S.sb.claimed=[];
  if(S.sb.chatId===undefined) S.sb.chatId=0;
  if(!S.sb.id) S.sb.id = "S"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  // 이전 버전은 NPC 대사를 각자의 저장 기록에만 넣었습니다. 남아 있는 로컬 잔상을 제거합니다.
  // 서버 ID가 있는 NPC 발언은 삭제하지 않으며, 다른 러너의 실제 채팅도 건드리지 않습니다.
  if(Array.isArray(S.msgs)) S.msgs=S.msgs.filter(m=>!(m && m.tab==="전체" && !m.sid && Object.prototype.hasOwnProperty.call(NPC, m.who)));
  // 운영진이 config.js에 적어 둔 값을 그대로 씁니다 (러너는 입력할 필요 없음)
  const CF=window.MMJY_CONFIG||{};
  if(!S.sb.manual){
    if(CF.supabaseUrl) S.sb.url=String(CF.supabaseUrl).replace(/\/+$/,"");
    if(CF.supabaseKey) S.sb.key=String(CF.supabaseKey);
  }
}
function sbOn(){ return !!(S && S.sb && S.sb.url && S.sb.key); }
function sbHead(extra){
  return Object.assign({apikey:S.sb.key, Authorization:"Bearer "+S.sb.key}, extra||{});
}
function sbGet(path){
  return fetch(S.sb.url+"/rest/v1/"+path, {headers:sbHead()})
    .then(async r=>{ const t=await r.text();
      if(!r.ok) throw new Error(t.slice(0,160)||("HTTP "+r.status));
      return t?JSON.parse(t):[]; });
}
function sbSend(method, path, body, prefer){
  return fetch(S.sb.url+"/rest/v1/"+path, {
    method, headers:sbHead({"Content-Type":"application/json", Prefer:prefer||"return=representation"}),
    body: body!==undefined?JSON.stringify(body):undefined
  }).then(async r=>{ const t=await r.text();
    if(!r.ok) throw new Error(t.slice(0,160)||("HTTP "+r.status));
    return t?JSON.parse(t):[]; });
}
function sbErr(e){
  S.sb.state="err"; S.sb.err=String(e&&e.message||e);
  if(["roster","rank","hallv","tower","guard","board","wboss"].includes(VIEW)) renderMain(true);
}

/* ─── 내 기록 올리기 ─── */
function myRecord(){
  const c=C();
  return {
    id:S.sb.id, name:S.name, course:S.course, lvl:S.lvl,
    power:power(), dps:c.dps, hpv:c.hp,
    line:S.line, weapon:S.line==="마무기"?(S.weapon||""):"", hall:S.hall, title:S.title,
    intro:S.intro||"", color:rosterThemeColor(S.color,"#d85bea"), av:S.av, av_img:(S.avImg||"").slice(0,120000),
    tower:S.tower||0, guard:S.tower2||0, arena_best:S.arena.best||0,
    quest:S.quests.cleared||0, dexp:(typeof dexScore==="function"?dexScore():0),
    ach:(S.ach||[]).length, war:S.war.mine||0,
    wb_dmg:(S.wb&&S.wb.dmg)||0,
    /* 페어에게 보여 줄 현황 */
    home_stage:(S.home&&S.home.stage)||0,
    home_due:Number(S.home&&S.home.due)||0,
    home_late:(typeof rentLate==="function") ? !!rentLate() : false,
    run_ward:(S.run&&!S.run.done) ? (S.run.q.ward.n||"") : "",
    run_stage:(S.run&&!S.run.done) ? (S.run.q.stage||0) : 0,
    run_left:(S.run&&!S.run.done) ? Math.max(0,Math.round(S.run.left)) : 0,
    run_kills:(S.run&&!S.run.done) ? (S.run.kills||0) : 0,
    updated_at:new Date().toISOString()
  };
}
function syncUp(force){
  if(!sbOn()) return Promise.resolve();
  const now=Date.now();
  if(!force && S.sb.upAt && now-S.sb.upAt<90000) return Promise.resolve();
  S.sb.upAt=now;
  const record=myRecord();
  return sbSend("POST","students?on_conflict=id", [record], "resolution=merge-duplicates,return=minimal")
    .catch(e=>{
      // Keep publishing existing profile fields until the optional color column is installed.
      if(!/(?:color.*(?:column|schema cache)|(?:column|schema cache).*color)/i.test(String(e?.message||e)))throw e;
      const legacy={...record};delete legacy.color;
      return sbSend("POST","students?on_conflict=id",[legacy],"resolution=merge-duplicates,return=minimal");
    })
    .then(()=>{ S.sb.state="ok"; S.sb.err=""; S.sb.raidPublishState="ok"; S.sb.raidPublishError=""; })
    .catch(e=>{
      S.sb.upAt=0; // 저장 실패를 성공한 동기화로 취급하지 않습니다.
      S.sb.raidPublishState="error";
      S.sb.raidPublishError=String(e&&e.message||e).slice(0,180);
      sbErr(e);
    });
}
/* ─── 명부 불러오기 ─── */
function syncRoster(force){
  if(!sbOn()) return Promise.resolve();
  const now=Date.now();
  if(!force && S.sb.rosterAt && now-S.sb.rosterAt<30000) return Promise.resolve();
  const raid=VIEW==="wboss";
  if(raid){S.sb.raidFetchState="loading";S.sb.raidFetchError="";renderMain(true);}
  return sbGet("students?select=*&order=power.desc&limit=200")
    .then(rows=>{
      S.sb.roster=rows||[];
      S.sb.rosterAt=Date.now();
      S.sb.raidFetchState="ok";S.sb.raidFetchError="";
      S.sb.state="ok"; S.sb.err="";
      if(["roster","rank","hallv","wboss"].includes(VIEW)) renderMain(true);
      save();
    })
    .catch(e=>{
      S.sb.rosterAt=0; // 실패 시 새로 고침을 즉시 다시 시도할 수 있게 합니다.
      S.sb.raidFetchState="error";
      S.sb.raidFetchError=String(e&&e.message||e).slice(0,180);
      sbErr(e);
    });
}
/* ─── 방 목록 ─── */
function syncRooms(force){
  if(!sbOn()) return;
  const now=Date.now();
  if(!force && S.sb.roomsAt && now-S.sb.roomsAt<4000) return;
  S.sb.roomsAt=now;
  sbGet("rooms?select=*,room_members(*)&order=created_at.desc&limit=40")
    .then(rows=>{
      S.sb.rooms=rows||[];
      const mine=(rows||[]).find(r=>(r.room_members||[]).some(m=>m.student_id===S.sb.id) && r.status!=="done");
      S.sb.myRoom=mine?mine.id:null;
      (rows||[]).forEach(r=>{ if(r.status==="done" && r.result) claimRoom(r); });
      S.sb.state="ok"; S.sb.err="";
      if(VIEW==="tower" || VIEW==="guard" || (VIEW==="quest" && S.sb.myRoom && (S.sb.rooms||[]).some(x=>x.id===S.sb.myRoom && x.kind==="quest"))) renderMain(true);
    })
    .catch(sbErr);
}

/* ─── 방 만들기 · 참가 · 나가기 ─── */
const RKIND={tower:{n:"석탑",e:ic("tower")}, guard:{n:"결계의 탑",e:ic("shield")}, quest:{n:"의뢰",e:ic("swords")}};
function roomCreate(kind,stage,note){
  if(!sbOn()){ toast("먼저 공유 기록을 연결해 주세요.","bad"); return; }
  if(S.sb.myRoom){ toast("이미 들어가 있는 방이 있습니다.","bad"); return; }
  // 의뢰에는 이미 별도의 인연·교사 동행 기능이 있습니다. 온라인 합동방은 탑 2종에만 만듭니다.
  if(kind!=="tower" && kind!=="guard") { toast("이 콘텐츠에서는 새 합동방을 만들 수 없습니다.","bad"); return; }
  stage=Number(stage);
  if(!Number.isInteger(stage) || stage<1 || stage>999){ toast("1~999층 중에서 골라 주세요.","bad"); return; }
  sbSend("POST","rooms",[{kind, stage, host_id:S.sb.id, host_name:S.name, note:String(note||"").slice(0,40)}])
    .then(rows=>{
      const r=rows[0];
      return sbSend("POST","room_members",[roomMe(r.id)],"return=minimal").then(()=>r);
    })
    .then(r=>{ S.sb.myRoom=r.id; closeModal(); toast("방을 열었습니다. 다른 학생이 들어오기를 기다립니다.","good");
      syncRooms(true); save(); })
    .catch(e=>{ toast("방을 열지 못했습니다 · "+esc(String(e.message||e)),"bad"); sbErr(e); });
}
function roomMe(roomId){
  const c=C();
  return {room_id:roomId, student_id:S.sb.id, name:S.name, course:S.course,
          power:power(), dps:c.dps, hpv:c.hp};
}
function roomJoin(id){
  if(S.sb.myRoom){ toast("이미 들어가 있는 방이 있습니다.","bad"); return; }
  const room=S.sb.rooms.find(r=>r.id===id);
  if(!room){ toast("방 목록을 새로 고친 뒤 다시 들어가 주세요.","bad"); return; }
  if(room.kind==="quest" && !questCheck(room.stage)) return;
  sbSend("POST","room_members?on_conflict=room_id,student_id",[roomMe(id)],"resolution=merge-duplicates,return=minimal")
    .then(()=>{ S.sb.myRoom=id; toast("방에 들어갔습니다."); syncRooms(true); save(); })
    .catch(e=>{ toast("들어가지 못했습니다 · "+esc(String(e.message||e)),"bad"); });
}
function roomLeave(id){
  sbSend("DELETE",`room_members?room_id=eq.${id}&student_id=eq.${S.sb.id}`,undefined,"return=minimal")
    .then(()=>{ S.sb.myRoom=null; toast("방에서 나왔습니다."); syncRooms(true); save(); })
    .catch(e=>toast("나가지 못했습니다 · "+esc(String(e.message||e)),"bad"));
}
function roomClose(id){
  if(!confirm("방을 닫을까요? 들어온 학생들도 함께 해산합니다.")) return;
  sbSend("DELETE",`rooms?id=eq.${id}`,undefined,"return=minimal")
    .then(()=>{ S.sb.myRoom=null; toast("방을 닫았습니다."); syncRooms(true); save(); })
    .catch(e=>toast("닫지 못했습니다 · "+esc(String(e.message||e)),"bad"));
}

/* ─── 출발 — 참가자 전원의 힘을 합산해 판정 ─── */
function roomDepart(id){
  const r=S.sb.rooms.find(x=>x.id===id); if(!r) return;
  if(r.kind==="quest" && !questCheck(r.stage)) return;
  const ms=r.room_members||[];
  if(!ms.length){ toast("아무도 없습니다.","bad"); return; }
  const dps=ms.reduce((a,m)=>a+(+m.dps||0),0);
  const hp =ms.reduce((a,m)=>a+(+m.hpv||0),0);
  const K=r.kind, st=r.stage;
  let win=false, line="", sec=0, sust=0;
  if(K==="tower"){
    const f=towerFoe(st);
    sec=f.hp/Math.max(1,dps);
    sust=hp/Math.max(1,f.dps*0.55);           // 여럿이 나눠 맞으므로 피해가 분산됩니다
    win = sec<=60 && sust>=Math.min(60,sec);
    line=`합산 초당 피해 ${nf(dps)} · 합산 생명력 ${nf(hp)}\n${st}층 체력 ${nf(f.hp)} → 제압 ${sec<=60?sec.toFixed(1)+"초":"60초 안에 불가"} / 버팀 ${sust.toFixed(1)}초`;
  }else if(K==="guard"){
    const f=guardFoe(st);
    sust=hp/Math.max(1,f.dps*0.55);
    win=sust>=30;
    line=`합산 생명력 ${nf(hp)} · ${st}층 초당 피해 ${nf(f.dps)} → 버틴 시간 ${Math.min(99,sust).toFixed(1)}초 / 30초`;
  }else{
    const q=questAt(st);
    const need=Math.round((70+st*26)*q.foes*1.6);
    sec=need/Math.max(1,dps);
    win=sec<=90;
    line=`합산 초당 피해 ${nf(dps)} · 적 ${q.foes}체 체력 ${nf(need)} → 정리 ${sec.toFixed(1)}초`;
  }
  const res={win, kind:K, stage:st, dps, hp, line,
             members:ms.map(m=>({id:m.student_id, name:m.name, dps:+m.dps||0})),
             at:new Date().toISOString()};
  sbSend("PATCH",`rooms?id=eq.${id}`,{status:"done", result:res},"return=minimal")
    .then(()=>{ toast(win?"돌파했습니다. 참가자 모두에게 기록됩니다.":"막혔습니다.", win?"good":"bad");
      syncRooms(true); })
    .catch(e=>toast("출발하지 못했습니다 · "+esc(String(e.message||e)),"bad"));
}

/* ─── 결과 수령 ─── */
function claimRoom(r){
  if(!r.result) return;
  if(S.sb.claimed.includes(r.id)) return;
  const mine=(r.result.members||[]).some(m=>m.id===S.sb.id);
  if(!mine) return;
  S.sb.claimed.push(r.id);
  const res=r.result, n=(res.members||[]).length||1;
  if(res.win){
    if(res.kind==="tower"){
      if(res.stage>(S.tower||0)) S.tower=res.stage;
      gainRin(Math.round((1200+res.stage*260)*1.5)); S.sari+=res.stage%5===0?1:0;
      S.mat.가루+=4;
    }else if(res.kind==="guard"){
      if(res.stage>(S.tower2||0)) S.tower2=res.stage;
      gainRin(Math.round((700+res.stage*210)*1.5));
    }else{
      questRecordClear(res.stage);
      gainRin(Math.round((120+res.stage*48)*1.6)); ct&&ct("quest");
    }
    const it=mkGear(Math.round(res.stage*1.3+S.lvl*.3),undefined,true); S.bag.push(it);
    gainExp(Math.round(300+res.stage*140));
    S.lotus+=1; S.war.mine=(S.war.mine||0)+30; addMark(10);
    toast(`<b>함께 ${RKIND[res.kind].n} ${res.stage}${res.kind==="quest"?"단계":"층"}</b> 돌파 · ${n}명 · 법구 「${it.name}」`,"good");
    pushNews(`[합동] ${(res.members||[]).map(m=>m.name).join(" · ")}이(가) ${RKIND[res.kind].n} ${res.stage}${res.kind==="quest"?"단계":"층"}을 돌파했습니다.`);
  }else{
    damageHP(rnd(8,20)); damageSN(rnd(5,14));
    toast(`함께 ${RKIND[res.kind].n} ${res.stage}${res.kind==="quest"?"단계":"층"} — 막혔습니다.`,"bad");
  }
  achCheck&&achCheck(); renderTop(); renderNav(); save(); syncUp(true);
}

/* ═══════════ 석탑·결계의 탑 전용 온라인 동행 ═══════════ */
/* 이전 버전의 여러 콘텐츠를 한꺼번에 보이던 페이지를 더 이상 사용하지 않습니다.
   기존에 만들어진 의뢰 서버방은 아래 legacyQuestRoom()에서 참가자에 한해 정리할 수 있습니다. */
function coopRoomCard(r){
  const ms=r.room_members||[];
  const joined=ms.some(m=>m.student_id===S.sb.id), host=r.host_id===S.sb.id;
  const dps=ms.reduce((a,m)=>a+(Number(m.dps)||0),0);
  const hp=ms.reduce((a,m)=>a+(Number(m.hpv)||0),0);
  const unit=r.kind==="quest"?"단계":"층";
  return `<article class="coop-room ${joined?"joined":""}">
    <div class="spread coop-room-top"><div><b>${esc(r.host_name||"방장")}</b>님의 ${Number(r.stage)||1}${unit}
      ${host?'<span class="tag g">내 방</span>':joined?'<span class="tag j">참가 중</span>':""}</div>
      <span class="tag">${ms.length} / 4명</span></div>
    ${r.note?`<div class="tiny muted coop-note">${esc(r.note)}</div>`:""}
    <div class="coop-members">${ms.length?ms.map(m=>`<span class="buffchip" ${m.student_id===S.sb.id?'style="border-color:var(--gold2)"':""}>${esc(m.name||"학생")}</span>`).join(""):"<span class='tiny muted'>참가자를 기다립니다</span>"}</div>
    <div class="tiny muted">합산 초당 피해 <b>${nf(dps)}</b> · 생명력 <b>${nf(hp)}</b></div>
    <div class="row coop-actions">
      ${host?`<button class="btn pri sm" onclick="roomDepart(${Number(r.id)})">출발</button>
               <button class="btn sm ghost" onclick="roomClose(${Number(r.id)})">방 닫기</button>`
       :joined?`<button class="btn sm" onclick="roomLeave(${Number(r.id)})">나가기</button><span class="tiny muted">방장 출발 대기</span>`
       :`<button class="btn pri sm" ${S.sb.myRoom?'disabled title="다른 방에 참가 중입니다"':""} onclick="roomJoin(${Number(r.id)})">참가하기</button>`}
    </div>
  </article>`;
}
function coopRoomPanel(kind){
  if(kind!=="tower" && kind!=="guard") return "";
  const K=RKIND[kind], rooms=(S.sb?.rooms||[]).filter(r=>r.kind===kind && r.status!=="done");
  const records=(S.sb?.rooms||[]).filter(r=>r.kind===kind && r.status==="done" && r.result).slice(0,3);
  const mine=S.sb?.myRoom&&(S.sb.rooms||[]).find(r=>r.id===S.sb.myRoom && r.status!=="done");
  return `<section class="card pad coop-panel" aria-label="${K.n} 같이 가기">
    <div class="coop-panel-head">
      <div><div class="sect-t" style="margin:0">${ic("handshake",16)} 함께 ${K.n} 오르기
        <span class="tag">온라인 동행 · 최대 4명</span></div>
        <div class="tiny muted" style="margin-top:4px">같은 탑에 도전할 러너를 모집합니다. 혼자 도전은 위 버튼을 이용하세요.</div></div>
      ${sbOn()?`<button class="btn sm ghost" onclick="syncRooms(true)">새로 고침</button>`:""}
    </div>
    ${!sbOn()?`<div class="coop-empty"><div class="tiny muted">다른 러너와 함께 오르려면 공유 기록 연결이 필요합니다.</div>
        <button class="btn sm" style="margin-top:9px" onclick="sbConnect()">공유 기록 연결</button></div>`:
      `<div class="coop-start">
         <div class="tiny muted">열린 ${K.n} 방 <b>${rooms.length}개</b> · 참가자 전원의 공격력과 생명력을 합산해 돌파를 판정합니다.</div>
         <button class="btn pri" ${S.sb.myRoom?'disabled':''} onclick="roomMake('${kind}')">${K.n} 방 열기</button>
       </div>
       ${mine&&mine.kind!==kind?`<div class="coop-other tiny">지금 <b>${RKIND[mine.kind]?.n||"다른 콘텐츠"} ${mine.stage}${mine.kind==="quest"?"단계":"층"}</b> 방에 참가 중입니다.
         <button class="btn sm ghost" onclick="go('${mine.kind==='quest'?'quest':mine.kind}')">참가 중인 방으로 이동</button></div>`:""}
       ${S.sb.state==="err"?`<div class="tiny" style="color:var(--red)">연결 확인: ${esc(S.sb.err||"일시적인 연결 오류")}</div>`:""}
       <div class="coop-room-list">${rooms.length?rooms.map(coopRoomCard).join(""):
         `<div class="coop-empty tiny muted">모집 중인 방이 없습니다. 첫 번째 ${K.n} 방을 열어 보세요.</div>`}</div>
       ${records.length?`<details class="coop-history"><summary>최근 ${K.n} 합동 기록 ${records.length}건</summary>
           ${records.map(r=>`<div class="spread tiny"><span>${Number(r.result.stage)||1}층 · ${(r.result.members||[]).map(m=>esc(m.name)).join(" · ")}</span>
             <span class="row" style="align-items:center;gap:6px"><span class="tag ${r.result.win?"j":"r"}">${r.result.win?"돌파":"실패"}</span>
             <button class="btn sm ghost" onclick="coopOpen('${String(r.id).replace(/'/g,"")}')">일지</button></span></div>`).join("")}</details>`:""}`}
  </section>`;
}
function roomMake(kind){
  if(kind!=="tower" && kind!=="guard") { toast("석탑 또는 결계의 탑에서 동행방을 열어 주세요.","bad"); return; }
  const K=RKIND[kind];
  const suggest=kind==="tower"?(S.tower||0)+1:(S.tower2||0)+1;
  modal(`${K.e} ${K.n} 합동 방 열기`, `
    <div class="tiny muted">${K.n}에서 함께 도전할 층을 선택합니다. 상대의 진행 상황과 관계없이 합동 판정 결과가 각각의 기록에 반영됩니다.</div>
    <label class="f">도전할 층</label>
    <input class="inp" id="r_stage" type="number" min="1" max="999" value="${Math.min(suggest,999)}">
    <label class="f">모집 메모 (선택 · 40자)</label>
    <input class="inp" id="r_note" maxlength="40" placeholder="예: 수호 성향 한 분 더!">
    <div class="row" style="margin-top:14px">
      <button class="btn pri" onclick="roomCreate('${kind}', Number(document.getElementById('r_stage').value), document.getElementById('r_note').value)">모집 시작</button>
      <button class="btn" onclick="closeModal()">취소</button></div>`);
}
function legacyQuestRoom(){
  /* 이전 서버 합동 의뢰 방에 이미 참가한 사람만 마무리할 수 있게 남겨 둡니다.
     새 합동 의뢰 방은 생성하지 않습니다. 기존 의뢰의 인연·교사 동행과 겹치기 때문입니다. */
  if(!sbOn() || !S.sb.myRoom) return "";
  const r=(S.sb.rooms||[]).find(x=>x.id===S.sb.myRoom && x.kind==="quest" && x.status!=="done");
  if(!r) return "";
  return `<details class="card pad coop-legacy" style="margin-bottom:12px">
    <summary><b>이전에 참여한 합동 의뢰 방</b> · ${Number(r.stage)||1}단계 <span class="tiny muted">기존 방 마무리</span></summary>
    <div class="tiny muted" style="margin:9px 0">이전 버전에서 만든 온라인 의뢰방입니다. 현재 새 의뢰 동행은 아래 기존 기능을 사용합니다.</div>
    ${coopRoomCard(r)}
  </details>`;
}

/* ═══════════ 화면 — 학생 명부 ═══════════ */
function sbStateChip(){
  if(!sbOn()) return `<span class="tag">연결 안 됨</span>`;
  if(S.sb.state==="err") return `<span class="tag r">연결 실패</span>`;
  return `<span class="tag j">연결됨</span>`;
}
/* 학생 명부는 수락된 페어 두 사람을 한 묶음으로 정렬합니다.
   페어가 먼저 나오고, 페어 없는 학생들은 기존 전투력 순서를 유지합니다.
   계정 ID로만 비교하며 아직 명부에 오르지 않은 상대는 임의로 만들지 않습니다. */
function rosterGroupedByPair(rows){
  const list=Array.isArray(rows)?rows:[];
  const byId=new Map(list.map(r=>[String(r.id),r]));
  const used=new Set(), groups=[];
  const accepted=(typeof SOCIAL!=="undefined" && SOCIAL.ready && Array.isArray(SOCIAL.pairs))?SOCIAL.pairs:[];
  const mine=(typeof pairEnsure==="function")?pairEnsure().mine:null;
  const pairs=[...accepted];
  if(mine && mine.status==="accepted")pairs.push(mine);
  for(const pair of pairs){
    if(!pair || pair.status!=="accepted")continue;
    const a=String(pair.from_id??""),b=String(pair.to_id??"");
    if(!a || !b || a===b || used.has(a) || used.has(b))continue;
    const first=byId.get(a),second=byId.get(b);
    if(!first || !second)continue;
    used.add(a);used.add(b);
    const two=[first,second].sort((x,y)=>list.indexOf(x)-list.indexOf(y));
    groups.push({order:Math.min(list.indexOf(first),list.indexOf(second)),two});
  }
  groups.sort((a,b)=>a.order-b.order);
  return [...groups.flatMap(g=>g.two),...list.filter(r=>!used.has(String(r.id)))];
}
function rosterThemeColor(value,fallback="var(--gold)"){
  return /^#[0-9a-f]{6}$/i.test(String(value||""))?value:fallback;
}
VIEWS.roster=()=>{
  if(!sbOn()) return head("사무전 학생 명부",ic("users")+" 학생 명부","공유 기록이 연결되지 않았습니다")+`
    <div class="card pad" style="border-color:var(--gold2)">
      <div class="tiny muted" style="line-height:1.9">연결하면 같은 커뮤니티의 러너들이 여기에 나타납니다.
      지금은 교류 화면에 보이는 학생들이 모두 NPC입니다.</div>
      <button class="btn pri" style="margin-top:12px" onclick="sbConnect()">공유 기록 연결</button></div>`;
  const rows=S.sb.roster||[];
  const orderedRows=rosterGroupedByPair(rows);
  const ago=t=>{ const d=(Date.now()-new Date(t).getTime())/60000;
    return d<2?"방금":d<60?Math.floor(d)+"분 전":d<1440?Math.floor(d/60)+"시간 전":Math.floor(d/1440)+"일 전"; };
  return head("사무전 학생 명부",ic("users")+" 학생 명부", `${sbStateChip()} · ${rows.length}명`)+`
  <div class="card pad" style="margin-bottom:12px;padding:10px 14px">
    <div class="tiny muted">같은 건의함·명부를 쓰는 러너들입니다. 내 기록은 몇 분마다 자동으로 올라갑니다.</div>
    <button class="btn sm" style="margin-top:8px" onclick="syncRoster(true);syncUp(true)">지금 올리고 새로 고침</button>
  </div>
  ${rows.length?`<div class="roster-viewport"><div class="grid roster-grid">
    ${orderedRows.map(r=>{
      const hall=homeOf(r.hall);
      const me=String(r.id)===String(S.sb.id);
      const avatarColor=rosterThemeColor(me?S.color:r.color,hall?hall.c:"var(--gold)");
      const paired=typeof SOCIAL!=="undefined" && SOCIAL.ready && SOCIAL.pairs.some(p=>p.status==="accepted"&&[String(p.from_id),String(p.to_id)].includes(String(r.id)));
      return `<div class="sub roster-card ${paired?"roster-card-paired":""}" style="${me?"border-color:var(--gold2)":""}">
        <div class="roster-card-top">
          ${r.av_img?`<div class="roster-avatar" style="border-color:${avatarColor}">
            <img src="${r.av_img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>`
            :`<div class="roster-avatar" style="border-color:${avatarColor};display:grid;place-items:center;background:var(--s0)">${ic(r.av||"lantern",22)}</div>`}
          <div class="roster-identity">
            <div class="tiny roster-title" style="color:var(--gold)">${esc(r.title||"")}</div>
            <b class="roster-name">${esc(r.name)}</b> ${me?'<span class="tag g">나</span>':""}
            <div class="tiny muted">${hall?hall.n:""} · ${r.course}과정 · Lv ${r.lvl} · ${esc(r.line||"")}</div>
          </div>
        </div>
        <div class="tiny muted roster-intro">${esc(r.intro||"")}</div>
        <div class="roster-power"><span class="tiny muted">전투력</span><b style="color:var(--gold)">${nf(r.power)}</b></div>
        <div class="tiny muted roster-progress">석탑 ${r.tower}층 · 결계 ${r.guard}층 · 의뢰 ${r.quest}단계 · 업적 ${r.ach}</div>
        <div class="tiny muted" style="color:var(--s6)">${ago(r.updated_at)}</div>
        ${pairBtn(r)}
      </div>`}).join("")}
  </div></div>`:`<div class="card pad"><div class="tiny muted" style="padding:14px 2px;text-align:center">
    아직 올라온 학생이 없습니다. 「지금 올리고 새로 고침」을 눌러 보세요.</div></div>`}`;
};

/* ═══════════ 랭킹 · 거주지 — 진짜 기록으로 ═══════════ */
const _rank=VIEWS.rank;
VIEWS.rank=()=>{
  if(!sbOn() || !(S.sb.roster||[]).length) return _rank();
  const R=[...S.sb.roster];
  const tbl=(title, key, unit, sortFn)=>{
    const rows=[...R].sort(sortFn||((a,b)=>b[key]-a[key])).slice(0,12);
    const myIdx=[...R].sort(sortFn||((a,b)=>b[key]-a[key])).findIndex(x=>x.id===S.sb.id);
    return `<div class="card pad">
      <div class="spread"><div class="sect-t" style="margin:0">${title}</div>
        <span class="tiny muted">내 순위 ${myIdx>=0?myIdx+1:"—"}위 / ${R.length}명</span></div>
      <table class="t">${rows.map((r,i)=>`<tr${r.id===S.sb.id?' style="background:var(--s2)"':""}>
        <td style="width:26px">${i+1}</td>
        <td>${r.id===S.sb.id?`<b style="color:var(--gold)">${esc(r.name)}</b>`:esc(r.name)}
          <span class="tiny muted">${r.course}과정 · Lv ${r.lvl}</span></td>
        <td style="text-align:right">${nf(r[key])}${unit||""}</td></tr>`).join("")}</table></div>`;
  };
  return head("사무전의 기록",ic("medal")+" 랭킹", `${sbStateChip()} · 학생 ${R.length}명`)+`
  <div class="card pad" style="margin-bottom:12px;padding:10px 14px">
    <div class="tiny muted">같은 커뮤니티 러너들의 실제 기록입니다. 물약·만두 같은 시간제 효과는 전투력에 포함되지 않습니다.</div>
    <button class="btn sm" style="margin-top:8px" onclick="syncUp(true);syncRoster(true)">내 기록 올리기</button>
  </div>
  <div class="grid g2" style="margin-bottom:12px">
    ${tbl("전투력 순위","power")}
    ${tbl("석탑 순위","tower","층")}
  </div>
  <div class="grid g3">
    ${tbl("결계의 탑","guard","층")}
    ${tbl("의뢰 단계","quest","단계")}
    ${tbl("도감 점수","dexp")}
  </div>`;
};
/* 거주지 대항전 집계는 없어졌습니다 — 거처는 각자 짓습니다 */

/* ═══════════ 건의함 — Supabase 경로 ═══════════ */
const _boardFetch=boardFetch;
boardFetch=function(force){
  if(S.board && S.board.url) return _boardFetch(force);
  if(!sbOn()) return;
  const now=Date.now();
  if(!force && S.board.last && now-S.board.last<20000) return;
  S.board.last=now; S.board.state="loading";
  sbGet("suggestions_public?select=*&order=created_at.desc&limit=200")
    .then(rows=>{
      S.board.cache=(rows||[]).map(r=>({id:r.id, time:r.created_at, name:r.name, cat:r.cat,
        title:r.title, body:r.body, secret:r.secret?1:0, likes:r.likes, status:r.status,
        has_reply:!!(r.has_reply || (r.reply&&String(r.reply).trim())),
        reply:r.secret?"":String(r.reply||"")}));
      S.board.state="ok"; S.board.err="";
      if(VIEW==="board") renderMain(); save();
    })
    .catch(e=>{ S.board.state="err"; S.board.err=String(e.message||e); if(VIEW==="board") renderMain(); });
};
const _boardOn=boardOn;
boardOn=function(){ return _boardOn() || sbOn(); };
const _boardSubmit=boardSubmit;
boardSubmit=function(){
  if(S.board && S.board.url) return _boardSubmit();
  if(!sbOn()) return _boardSubmit();
  const name=($("#b_name").value||"").trim()||"이름 없는 차사";
  const cat=$("#b_cat").value, title=($("#b_title").value||"").trim();
  const body=($("#b_body").value||"").trim(), secret=$("#b_secret").checked;
  if(!title){ toast("제목을 적어 주세요.","bad"); return; }
  if(!body){ toast("내용을 적어 주세요.","bad"); return; }
  S.board.name=name;
  let receipt="";
  if(secret){try{receipt=boardNewReceipt();}catch(e){toast(String(e.message||e),"bad");return;}}
  const btn=$("#b_go"); if(btn){ btn.disabled=true; btn.textContent="보내는 중…"; }
  sbSend("POST","rpc/submit_private_readable_suggestion",
    {p_name:name,p_cat:cat,p_title:title,p_body:body,p_secret:secret,p_receipt:receipt})
    .then(id=>{
      if(id===undefined||id===null||id==="") throw Error("서버에서 글 번호를 받지 못했습니다.");
      if(secret) boardPrivateSubmitted(id,receipt);
      else{closeModal();toast("건의함에 올렸습니다. 고맙습니다.","good");}
      boardFetch(true);
    })
    .catch(e=>{ if(btn){ btn.disabled=false; btn.textContent="올리기"; }
      toast("보내지 못했습니다 · "+esc(String(e.message||e)),"bad"); });
};
const _boardLike=boardLike;
boardLike=function(id){
  if(S.board && S.board.url) return _boardLike(id);
  if(!sbOn()) return _boardLike(id);
  if(S.board.liked.includes(String(id))){ toast("이미 공감했습니다."); return; }
  S.board.liked.push(String(id));
  const r=(S.board.cache||[]).find(x=>String(x.id)===String(id));
  const nv=(r?+r.likes:0)+1; if(r) r.likes=nv;
  renderMain(); save();
  sbSend("POST","rpc/bump_suggestion_like",{p_id:Number(id)})
    .then(count=>{if(r && Number.isFinite(+count)){r.likes=+count;if(VIEW==="board")renderMain();save();}})
    .catch(()=>{if(r){r.likes=Math.max(0,nv-1);if(VIEW==="board")renderMain();save();}toast("공감을 저장하지 못했습니다. SQL 설치를 확인해 주세요.","bad");});
};

/* ═══════════ 연결 설정 ═══════════ */
function sbConnect(){
  modal("공유 기록 연결", `
    <div class="tiny muted" style="line-height:1.9;margin-bottom:12px">
      Supabase 에 연결하면 <b>학생 명부 · 진짜 랭킹 · 함께 가기 · 건의함</b>이 모두 함께 돌아갑니다.
      주소와 키를 만드는 방법은 함께 드린 안내서 「공유 기록 연결하기」를 보세요.<br>
      <b style="color:var(--red)">키는 웹 페이지에 그대로 실리므로 누구나 볼 수 있습니다.</b>
      서로 믿는 커뮤니티 안에서 쓰는 용도이며, 민감한 내용은 넣지 마세요.
    </div>
    <label class="f">Project URL</label>
    <input class="inp" id="sb_url" value="${esc(S.sb.url||"")}" placeholder="https://xxxxxxxx.supabase.co">
    <label class="f">anon public key</label>
    <textarea class="inp" id="sb_key" style="min-height:70px;font-size:11px" placeholder="eyJhbGciOi...">${esc(S.sb.key||"")}</textarea>
    <label class="f">내 학생 번호 <span class="muted">— 기기를 바꿀 때 이 번호를 그대로 적으면 같은 사람으로 이어집니다</span></label>
    <input class="inp" id="sb_id" value="${esc(S.sb.id||"")}">
    <div class="row" style="margin-top:14px">
      <button class="btn pri" onclick="sbSaveURL()">저장하고 확인</button>
      <button class="btn" onclick="closeModal()">취소</button>
      ${sbOn()?`<button class="btn red" style="margin-left:auto" onclick="sbClear()">연결 끊기</button>`:""}
    </div>`,"wide");
}
function sbSaveURL(){
  const u=($("#sb_url").value||"").trim().replace(/\/+$/,"");
  const k=($("#sb_key").value||"").trim();
  const id=($("#sb_id").value||"").trim();
  if(id) S.sb.id=id;
  S.sb.url=u; S.sb.key=k; S.sb.manual=true; S.sb.state="idle"; S.sb.err=""; S.sb.roster=[]; S.sb.rooms=[];
  S.sb.rosterAt=0; S.sb.roomsAt=0; S.sb.upAt=0;
  save(); closeModal(); renderNav(); renderMain();
  if(u&&k){ toast("연결 정보를 저장했습니다. 기록을 올립니다.");
    syncUp(true).then(()=>{ syncRoster(true); syncRooms(true); }); }
  else toast("연결을 해제했습니다. 혼자 모드로 돌아갑니다.");
}
function sbClear(){
  if(!confirm("연결을 끊을까요? 내 캐릭터 기록은 그대로 남습니다.")) return;
  S.sb.url=""; S.sb.key=""; S.sb.manual=true; S.sb.roster=[]; S.sb.rooms=[]; S.sb.myRoom=null;
  save(); closeModal(); renderNav(); renderMain(); toast("혼자 모드로 돌아갑니다.");
}

/* ═══════════ 주기 작업 ═══════════ */
const _step6=step;
step=function(m){
  _step6(m);
  if(!S||!S.made||!S.sb||!sbOn()) return;
  if(Math.random()<0.02*m) syncUp(false);
  if(VIEW==="tower" || VIEW==="guard" || (VIEW==="quest" && S.sb?.myRoom)) syncRooms(false);
};
const _go6=go;
go=function(v){
  _go6(v);
  if(!sbOn()) return;
  if(v==="roster"||v==="rank"||v==="hallv") { syncUp(false); syncRoster(false); }
  // 공동토벌은 페이지 진입 즉시 실제 러너 피해량을 서버에서 읽습니다.
  if(v==="wboss") syncUp(false).then(()=>syncRoster(true));
  if(v==="hallv") pairFetch(true);
  if(v==="tower" || v==="guard" || (v==="quest" && S.sb?.myRoom)) syncRooms(true);
};
const _openSettings6=openSettings;
openSettings=function(){
  _openSettings6();
  const body=document.querySelector(".modal .mbody");
  if(!body) return;
  const box=document.createElement("div");
  box.innerHTML=`<hr class="hr">
    <div class="sect-t">공유 기록 (Supabase)</div>
    <div class="tiny muted">${sbOn()?`연결됨 · <span style="color:var(--jade)">${esc(S.sb.url)}</span><br>학생 번호 ${esc(S.sb.id)}`
      :"연결되지 않음 — 학생 명부·랭킹·함께 가기가 혼자 모드입니다"}</div>
    <div class="row" style="margin-top:8px">
      ${sbOn()?`<button class="btn" onclick="syncUp(true);syncRoster(true);toast('기록을 올렸습니다.')">지금 올리기</button>`:""}
    </div>`;
  body.appendChild(box);
};

/* ═══════════ 내비 ═══════════ */
(()=>{ /* 탑별 동행은 각 탑 화면에 있고, 공용 동행 탭은 따로 두지 않습니다. */
  const s=NAVDEF.find(x=>x.id==="soc");
  if(s && !s.sub.some(x=>x.id==="roster")) s.sub.unshift({id:"roster",n:"학생 명부"}); })();

const _boot6=boot;
boot=function(){ _boot6(); ensureV6(); renderNav(); renderMain();
  if(sbOn()){ syncUp(true).then(()=>{ syncRoster(true); syncRooms(true); });
              chatPull(true); chatTick(); } };

/* ═══════════ 접속자 · 지금 사무전에 있는 사람 ═══════════
   모브 학생은 없습니다. 공유 기록이 연결됐을 때,
   최근 4분 안에 기록을 올린 러너만 「접속 중」으로 셉니다.
   (각자 90초마다 자기 기록을 올리므로 4분이면 넉넉합니다.) */
const ONLINE_MS = 4*60*1000;
function onlineList(){
  if(!sbOn()) return [];
  const now = Date.now();
  return (S.sb.roster||[]).filter(r=>{
    const t = Date.parse(r.updated_at||"");
    return t && (now - t) < ONLINE_MS;
  });
}
onlineChip = function(){
  if(!sbOn()) return "";
  const n = onlineList().length;
  if(!n) return `<span class="tiny muted">● 접속 확인 중</span>`;
  return `<span style="color:var(--ok)">● 접속 ${n}명</span>`;
};
hereHTML = function(){
  if(!sbOn()) return `<div class="card pad" style="margin-top:14px">
    <div class="sect-t">사무전에 함께 있는 학생</div>
    <div class="tiny muted">공유 기록이 연결되면 지금 접속해 있는 러너가 여기에 보입니다.</div></div>`;
  const list = onlineList().filter(r=>r.id!==S.sb.id);
  if(!list.length) return `<div class="card pad" style="margin-top:14px">
    <div class="sect-t">사무전에 함께 있는 학생</div>
    <div class="tiny muted">지금은 혼자입니다. 다른 러너가 들어오면 여기에 보입니다.</div></div>`;
  return `<div class="card pad" style="margin-top:14px">
    <div class="sect-t">사무전에 함께 있는 학생 ${list.length}명</div>
    <div class="grid g4">
      ${list.slice(0,12).map(r=>{
        const h=homeOf(r.hall);
        return `<div class="spread" style="background:var(--s1);border:1px solid var(--line);border-radius:7px;padding:6px 10px">
          <div><b style="font-size:12.5px">${esc(r.name||"이름 없음")}</b>
          <div class="tiny muted">${h?esc(h.n):"거주지 미정"} · ${r.course||1}과정</div></div>
          ${S.friends.find(f=>f.n===r.name)?'<span class="tag g">인연</span>'
            :`<button class="btn sm ghost" onclick="addFriend('${esc(r.name||"").replace(/'/g,"")}')">동행 신청</button>`}
        </div>`;
      }).join("")}
    </div>
    <div class="tiny muted" style="margin-top:8px">최근 4분 안에 접속한 러너만 보입니다.</div>
  </div>`;
};
/* 명부를 자주 받아 와야 접속자 수가 맞습니다 */
const _stepOnline = step;
step = function(m){ _stepOnline(m); if(sbOn() && Math.random()<0.02) syncRoster(); };

/* 업귀 피해 순위를 실제 러너로 */
wbBoard = function(){
  if(!sbOn() || !(S.sb.roster||[]).length) return S.wb.dmg>0 ? [[S.name, S.wb.dmg, true]] : [];
  return [...S.sb.roster]
    .filter(r=>(r.wb_dmg||0)>0)
    .sort((a,b)=>(b.wb_dmg||0)-(a.wb_dmg||0))
    .slice(0,12)
    .map(r=>[r.name||"이름 없음", r.wb_dmg||0, r.id===S.sb.id]);
};
wbMyRank = function(){
  if(!sbOn() || !(S.sb.roster||[]).length) return S.wb.dmg>0 ? "기록 있음" : "—";
  const sorted=[...S.sb.roster].filter(r=>(r.wb_dmg||0)>0).sort((a,b)=>(b.wb_dmg||0)-(a.wb_dmg||0));
  const i=sorted.findIndex(r=>r.id===S.sb.id);
  return i>=0 ? `${i+1}위 / ${sorted.length}명` : "—";
};

/* ═══════════════════════════════════════════════════
   실시간 채팅 — 전체·RP에만 NPC가 모두에게 공유됩니다.
   전체·이웃·계통은 범위가 같은 사람끼리, 페어·1:1은 두 사람만 봅니다.
   NPC는 Supabase 트리거가 메시지로 기록합니다. 로컬 단독 반응은 금지합니다.
   ═══════════════════════════════════════════════════ */
function pairKey(a,b){ return [String(a||""),String(b||"")].sort().join("|"); }
function chatScope(tab){
  if(tab==="이웃")  return S.hall||"";
  if(tab==="계통")  return S.line||"";
  if(tab==="페어"){ const p=(S.rel||[]).find(r=>r.a==="페어"); return p?pairKey(S.name,p.n):""; }
  if(tab==="1:1")   return S.dmWith ? pairKey(S.sb.id, S.dmWith.id) : "";
  return "";
}
/* 지금 탭에서 보여 줄 글인지 — 채널 범위까지 따집니다 */
chatVisible = function(m){
  if(m.tab!==S.chatTab) return false;
  // 이전 버전의 개인 전용 NPC 대사는 공용 기록과 섞지 않습니다.
  if(!m.sid && Object.prototype.hasOwnProperty.call(NPC, m.who)) return false;
  if(m.local) return true;
  const need=chatScope(S.chatTab);
  if(["이웃","계통","페어","1:1"].includes(S.chatTab)) return (m.scope||"")===need;
  return true;
};

const CHATMS_ON=3000, CHATMS_OFF=15000;
let CHATTICK=null, CHATBUSY=false;
/* 서버에 저장된 메시지를 표시합니다. 본인 글도 예외 없이 가져옵니다.
   과거 판본은 본인 글을 서버에서 재조회할 때 건너뛰어, 기기나 로그인 시점에 따라
   상대 글만 보이는 문제가 있었습니다. 낙관적으로 먼저 그린 전송 글은 서버 행과 병합합니다. */
function chatRows(rows, silent=true, advanceCursor=true){
  let sound=null;
  if(!rows||!rows.length) return 0;
  let added=0, changed=false;
  rows.forEach(r=>{
    if(advanceCursor && Number(r.id)>Number(S.sb.chatId||0)) S.sb.chatId=Number(r.id);
    /* 이전 기록을 지우도록 명시한 이용자의 초기화 시점은 유지합니다. */
    const when=new Date(r.created_at||Date.now()).getTime();
    if(S.chatFrom && when < S.chatFrom) return;
    if(S.msgs.some(m=>String(m.sid)===String(r.id) && m.sid!==undefined && m.sid!==null)) return;
    const own=String(r.from_id)===String(S.sb.id);
    const isNPC=String(r.from_id||"").startsWith("mmjy-npc:");
    const d=new Date(r.created_at||Date.now());
    const h=d.getHours(), mm=String(d.getMinutes()).padStart(2,"0");
    const fields={sid:r.id, tab:r.tab, scope:r.scope||"", who:r.who, body:r.body,
      npc:isNPC, mine:own, c:r.color||"var(--violetL)", title:r.title||"",
      mode:chatModeOf(r.mode), ts:d.getTime(), time:`${h%12===0?12:h%12}:${mm}`, pending:false, failed:false};
    /* 메시지를 보낸 직후 임시 로컬 행과 서버에 확정된 행을 결합합니다.
       같은 대사를 연속해서 보냈을 때도 각 메시지마다 하나씩만 결합됩니다. */
    const optimistic=own ? S.msgs.find(m=>m.mine===true && !m.sid &&
       m.tab===r.tab && String(m.scope||"")===String(r.scope||"") &&
       m.body===r.body && chatModeOf(m.mode)===chatModeOf(r.mode) &&
       Math.abs(Number(m.ts||0)-when)<120000) : null;
    if(optimistic){ Object.assign(optimistic,fields); changed=true; }
    else { S.msgs.push(fields); added++; changed=true;
      if(!own && !silent && typeof incomingSoundKind==="function") sound=incomingSoundKind(r)||sound;
    }
  });
  if(S.msgs.length>400) S.msgs=S.msgs.slice(-400);
  if(sound && typeof notifySound==="function") notifySound(sound);
  if(changed) save();
  return added;
}
function chatPull(first){
  if(!sbOn() || CHATBUSY) return Promise.resolve(0);
  const state=S;
  const silent=!!first || !S.sb.chatId;
  CHATBUSY=true;
  const q = first || !S.sb.chatId
    ? "messages?select=*&order=id.desc&limit=100"
    : "messages?select=*&id=gt."+S.sb.chatId+"&order=id.asc&limit=200";
  return sbGet(q)
    .then(rows=>{ if(S!==state) return 0;
       if(first||!S.sb.chatId) rows=(rows||[]).slice().reverse();
       const n=chatRows(rows,silent); if(n) renderChat(); return n; })
    .catch(()=>0)
    .finally(()=>{ CHATBUSY=false; });
}
/* 공용 새 글 100개만 불러오면 오래된 페어 글이 누락되므로,
   페어 탭에서는 두 사람의 대화 기록을 직접 조회합니다. */
const PAIR_CHAT_HISTORY_MS=60000;
let PAIR_CHAT_HISTORY_KEY="", PAIR_CHAT_HISTORY_AT=0, PAIR_CHAT_HISTORY_BUSY=null;
function pairChatHistory(force){
  if(!sbOn() || !S.sb || !S.sb.id) return Promise.resolve(0);
  const P=typeof pairEnsure==="function" ? pairEnsure() : null;
  const scope=P && P.mine ? pairIdKey(P.mine.from_id,P.mine.to_id) : "";
  if(!scope) return Promise.resolve(0);
  const now=Date.now();
  if(PAIR_CHAT_HISTORY_BUSY && PAIR_CHAT_HISTORY_KEY===scope) return PAIR_CHAT_HISTORY_BUSY;
  if(!force && PAIR_CHAT_HISTORY_KEY===scope && now-PAIR_CHAT_HISTORY_AT<PAIR_CHAT_HISTORY_MS) return Promise.resolve(0);
  PAIR_CHAT_HISTORY_KEY=scope; PAIR_CHAT_HISTORY_AT=now;
  const state=S;
  PAIR_CHAT_HISTORY_BUSY=sbGet("messages?select=*&tab=eq."+encodeURIComponent("페어")+
      "&scope=eq."+encodeURIComponent(scope)+"&order=id.desc&limit=150")
    .then(rows=>{
      if(S!==state) return 0;
      const n=chatRows((rows||[]).slice().reverse(),true,false);
      if(S.chatTab==="페어") renderChat();
      return n;
    }).catch(()=>0)
    .finally(()=>{PAIR_CHAT_HISTORY_BUSY=null;});
  return PAIR_CHAT_HISTORY_BUSY;
}
function chatPush(tab, body, mode, scope){
  if(!sbOn()) return Promise.resolve([]);
  return sbSend("POST","messages",[{
    tab, scope:scope===undefined?chatScope(tab):scope, from_id:S.sb.id, who:S.name,
    body, color:S.color, title:(S.course||1)+"과정", mode:chatModeOf(mode)
  }],"return=representation");
}
function chatTick(){
  if(CHATTICK) clearInterval(CHATTICK);
  const ms = document.hidden ? CHATMS_OFF : CHATMS_ON;
  CHATTICK=setInterval(chatPull, ms);
}
document.addEventListener("visibilitychange",()=>{ chatTick(); if(!document.hidden) chatPull(); });

/* 내가 보낸 말을 서버로 */
const _sendChatSb = sendChat;
sendChat = function(){
  const i=document.getElementById("chatinput");
  const raw=i ? i.value.trim() : "";
  if(!raw) return;
  if(sbOn() && S.chatTab==="1:1" && !S.dmWith){
    toast("먼저 대화할 사람을 고르세요.","bad"); return;
  }
  if(sbOn() && S.chatTab==="페어" && !chatScope("페어")){
    toast("페어 정보를 불러오는 중입니다. 잠시 후 다시 보내 주세요.","bad");
    pairFetch(true); return;
  }
  const tab=S.chatTab, state=S;
  const mine=_sendChatSb();
  if(mine && sbOn()){
    mine.pending=true;
    chatPush(tab,mine.body,mine.mode,mine.scope)
      .then(rows=>{
        if(S!==state) return;
        if(rows&&rows.length){
          chatRows(rows,true,false);
          /* 폴링이 먼저 동일한 서버 글을 받았을 경우에도 임시 행을 남기지 않습니다. */
          const row=rows[0];
          if(mine && !mine.sid){
            const actual=S.msgs.find(m=>String(m.sid)===String(row.id));
            if(actual && actual!==mine){
              const at=S.msgs.indexOf(mine); if(at>=0) S.msgs.splice(at,1);
            }
          }
        }
        if(mine){mine.pending=false;mine.failed=false;}
        renderChat(); save();
      })
      .catch(e=>{
        if(S!==state) return;
        if(mine){mine.pending=false;mine.failed=true;}
        toast("채팅이 서버에 저장되지 않았습니다. 연결 상태를 확인해 주세요.","bad");
        renderChat(); save();
      });
  }
  return mine;
};
/* NPC 발언은 브라우저가 생성하지 않습니다. 서버에 한 번만 기록되어 모두에게 전달됩니다. */
npcChat=function(){ return null; };

/* ─── 1:1 상대 고르기 · 연결 상태 알림 ─── */
function dmPick(id){
  const r=(S.sb.roster||[]).find(x=>x.id===id);
  S.dmWith = r ? {id:r.id, name:r.name} : null;
  S.chatTab="1:1"; renderChat();
}
function chatContextHTML(){
  if(!sbOn()) return `<span style="color:var(--warn)" title="공유 기록을 연결하면 함께 이야기합니다">혼자 보는 중</span>`;
  if(S.chatTab==="1:1"){
    const list=(S.sb.roster||[]).filter(r=>r.id!==S.sb.id);
    return list.length
      ? `<select aria-label="1:1 대화 상대" onchange="dmPick(this.value)">
           <option value="">— 대화할 사람 —</option>
           ${list.map(r=>`<option value="${esc(r.id)}" ${S.dmWith&&S.dmWith.id===r.id?"selected":""}>${esc(r.name||"이름 없음")}</option>`).join("")}
         </select>`
      : `<span class="tiny muted">명부에 다른 러너가 없습니다.</span>`;
  }
  if(S.chatTab==="페어" && !chatScope("페어")) return "페어를 맺으면 둘만의 자리가 열립니다.";
  return "";
}
/* 명부에서 이름을 누르면 1:1 로 */
dmTo = function(n){
  const r=(S.sb.roster||[]).find(x=>x.name===n);
  if(r){ dmPick(r.id); toast(`${n} 학생과의 1:1 창을 열었습니다.`); }
  else { S.chatTab="1:1"; S.dmWith=null; renderChat(); toast("명부에 없는 학생입니다.","bad"); }
};

/* ═══════════════════════════════════════════════════
   페어 — 전생의 하나의 죄업으로 묶인 두 사람

   혼자 적어 두는 기록이 아니라, 신청하면 상대에게 가고
   상대가 수락해야 맺어집니다. 한 사람에게 하나만 맺을 수 있습니다.
   ═══════════════════════════════════════════════════ */
/* 명부 카드에 붙는 페어 단추 */
function pairBtn(r){
  if(!sbOn() || !r || String(r.id)===String(S.sb.id)) return "";
  const P=pairEnsure();
  const paired = P.mine && String(pairOther(P.mine).id)===String(r.id);
  const sent   = (P.sent||[]).some(x=>String(x.to_id)===String(r.id));
  const got    = (P.inbox||[]).some(x=>String(x.from_id)===String(r.id));
  let btn="";
  if(paired)      btn=`<span class="tag g">페어</span>`;
  else if(got)    btn=`<button class="btn sm pri pairbtn" onclick="go('rel')">페어 신청 받음 · 답하기</button>`;
  else if(sent)   btn=`<span class="tiny muted">페어 신청함 · 답을 기다리는 중</span>`;
  else if(P.mine) btn="";
  else            btn=`<button class="btn sm ghost pairbtn" onclick="pairSend('${String(r.id).replace(/'/g,"")}')">페어 신청</button>`;
  return btn?`<div class="row" style="margin-top:7px">${btn}</div>`:"";
}
function pairEnsure(){ if(!S.pair) S.pair={mine:null, inbox:[], sent:[], at:0}; return S.pair; }
function pairIdKey(a,b){ return [String(a||""),String(b||"")].sort().join("|"); }
function pairOther(row){ return String(row.from_id)===String(S.sb.id)
  ? {id:row.to_id, name:row.to_name, nick:row.nick_from}
  : {id:row.from_id, name:row.from_name, nick:row.nick_to}; }

const PAIRMS=20000;
let PAIRBUSY=false;
let PAIRFETCHTASK=null;
function pairFetch(force){
  const P=pairEnsure();
  if(!sbOn()) return Promise.resolve(false);
  if(PAIRBUSY) return PAIRFETCHTASK;
  const now=Date.now();
  if(!force && P.at && now-P.at<PAIRMS) return Promise.resolve(false);
  P.at=now; PAIRBUSY=true;
  const state=S;
  const id=encodeURIComponent(S.sb.id);
  const fields="id,from_id,from_name,to_id,to_name,status,nick_from,nick_to,created_at,updated_at,rent_due";
  PAIRFETCHTASK=sbGet(`pairs?select=${fields}&or=(from_id.eq.${id},to_id.eq.${id})&order=id.desc&limit=60`)
    .then(async rows=>{
      if(S!==state) return false;
      rows=rows||[];
      const before=(P.inbox||[]).length;
      P.mine  = rows.find(r=>r.status==="accepted") || null;
      /* 공동 일세는 두 거처 중 높은 가격입니다. 납부 전 상대 거처를 직접 확인합니다. */
      P.partner=null;
      if(P.mine){
        const other=encodeURIComponent(pairOther(P.mine).id);
        const fields="id,name,hall,home_stage,home_due,home_late,run_ward,run_stage,run_left,run_kills,updated_at";
        const peers=await sbGet(`students?select=${fields}&id=eq.${other}&limit=1`);
        if(S!==state) return false;
        P.partner=(peers||[])[0]||null;
      }
      P.inbox = rows.filter(r=>r.status==="pending" && String(r.to_id)===String(S.sb.id));
      P.sent  = rows.filter(r=>r.status==="pending" && String(r.from_id)===String(S.sb.id));
      if(P.inbox.length>before){
        const n=P.inbox[0];
        toast(`${esc(n.from_name||"누군가")} 님이 페어를 신청했습니다.`,"good");
        pushNews(`[인연] ${n.from_name} 학생이 페어를 신청했습니다.`);
      }
      /* 업데이트 전에 개인이 낸 일세도 남은 기간을 페어에게 나눕니다. */
      if(P.mine && Number(homeS().due)>Number(P.mine.rent_due||0)){
        const r=await sbSend("POST","rpc/pair_rent",{
          p_pair_id:P.mine.id, p_student_id:S.sb.id, p_action:"sync",
          p_personal_due:Number(homeS().due)||0
        });
        if(S!==state) return false;
        if(r && String(r.pair_id)===String(P.mine&&P.mine.id)) P.mine.rent_due=Number(r.due)||0;
      }
      syncHall(); renderTop(); renderNav();
      if(VIEW==="rel" || VIEW==="hallv" || VIEW==="pairhub") renderMain(true);
      save();
      renderChat();
      if(P.mine && S.chatTab==="페어") pairChatHistory();
      return true;
    })
    .catch(()=>false)
    .finally(()=>{ PAIRBUSY=false; PAIRFETCHTASK=null; });
  return PAIRFETCHTASK;
}

/* ─── 페어 공동 일세 — 서버에서 한 번만 결제하고 두 사람이 기간을 공유 ─── */
function pairRentActive(){
  const p=S.pair&&S.pair.mine;
  return !!(sbOn() && p && p.status==="accepted" &&
    [p.from_id,p.to_id].some(id=>String(id)===String(S.sb.id)));
}
function pairRentDue(){ return pairRentActive() ? Number(S.pair.mine.rent_due)||0 : 0; }
let PAIRRENTPROMISE=null, PAIRRENTAT=0;
function pairRentTick(){
  if(!sbOn()) return false;
  const h=homeS(), due=rentPaidUntil();
  if(h.rentPending || (!isDorm() && h.auto && due>0 && S.t>=due)){
    if(!PAIRRENTPROMISE && Date.now()-PAIRRENTAT>=30000) payPairRent(true);
  }
  return true; // 연결된 게임의 자동 납부는 반드시 최신 페어 상태부터 확인합니다.
}
function payPairRent(automatic){
  if(PAIRRENTPROMISE) return PAIRRENTPROMISE;
  PAIRRENTAT=Date.now();
  const state=S, h=homeS();
  PAIRRENTPROMISE=(async()=>{
    let pending=h.rentPending;
    if(!pending){
      if(!await pairFetch(true)){
        if(!automatic) toast("일세 정보를 불러오지 못했습니다. 연결을 확인한 뒤 다시 눌러 주세요.","bad");
        return;
      }
      if(S!==state) return;
      if(!pairRentActive()){ payLocalRent(automatic); return; }
      if(isDorm()){ if(!automatic) toast("기숙사는 일세가 없습니다."); return; }
      const due=rentPaidUntil();
      if(automatic && (!h.auto || !due || S.t<due)) return;
      const cost=rentCharge();
      if(cost===null){ if(!automatic) toast("페어의 거처를 확인하지 못했습니다. 상대가 한 번 접속한 뒤 다시 눌러 주세요.","bad"); return; }
      if(S.rin<cost){ if(!automatic) toast("륜이 부족합니다.","bad"); return; }
      const p=S.pair.mine;
      pending={id:S.sb.id+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2),
        pairId:p.id, studentId:S.sb.id, cost, automatic:!!automatic, periodMinutes:RENT_PERIOD_MINUTES,
        expectedDue:Number(p.rent_due)||0, personalDue:Number(h.due)||0};
      /* 처리 중에는 비용을 먼저 보관합니다. 같은 요청을 재전송해도 다시 차감하지 않습니다. */
      S.rin-=cost; h.rentPending=pending;
      save(); renderTop(); if(VIEW==="hallv") renderMain(true);
    }
    const result=await sbSend("POST","rpc/pair_rent",{
      p_pair_id:pending.pairId, p_student_id:pending.studentId,
      p_action:pending.automatic?"auto":"pay", p_request_id:pending.id,
      p_expected_due:pending.expectedDue, p_personal_due:pending.personalDue
    });
    if(S!==state) return;
    if(!result || String(result.request_id)!==pending.id || typeof result.charged!=="boolean")
      throw new Error("일세 응답을 확인하지 못했습니다.");
    if(!result.charged) S.rin+=pending.cost;
    if(S.pair&&S.pair.mine&&String(S.pair.mine.id)===String(pending.pairId)){
      S.pair.mine.rent_due=Number(result.due)||0;
      if(result.reason==="inactive") S.pair.mine=null;
    }
    delete h.rentPending;
    if(result.charged){
      const period=Number(result.period_minutes)||pending.periodMinutes||7*1440;
      pushNews(`[거처] ${S.name} 학생이 페어 일세 ${rentMoney(pending.cost)} 륜을 ${pending.automatic?"자동으로 ":""}냈습니다. 두 사람에게 함께 적용됩니다.`);
      if(!automatic) toast(`일세 ${rentMoney(pending.cost)} 륜을 냈습니다. 페어 두 사람 모두 ${hhmm(period)} 연장되었습니다.`,"good");
    }else if(!automatic){
      toast(result.reason==="inactive"?"페어가 변경되어 납부를 취소했습니다. 륜은 돌려드렸습니다.":"페어의 납부 내역을 적용했습니다. 추가로 차감하지 않았습니다.","good");
    }
    syncHall(); renderTop(); renderNav(); if(VIEW==="hallv") renderMain(true);
    save(); syncUp(true);
    if(typeof acctPush==="function") acctPush(true);
  })().catch(()=>{
    if(S===state && !automatic) toast(h.rentPending
      ? "납부 결과를 확인 중입니다. 재시도해도 일세를 다시 차감하지 않습니다."
      : "일세를 처리하지 못했습니다. 연결을 확인해 주세요.","bad");
  }).finally(()=>{ PAIRRENTPROMISE=null; });
  return PAIRRENTPROMISE;
}
function pairSend(toId){
  const P=pairEnsure();
  if(!sbOn()){ toast("공유 기록을 연결해야 페어를 맺을 수 있습니다.","bad"); return; }
  if(String(toId)===String(S.sb.id)){ toast("자기 자신과는 맺을 수 없습니다.","bad"); return; }
  if(P.mine){ toast("이미 페어가 있습니다. 하나만 맺을 수 있습니다.","bad"); return; }
  const r=(S.sb.roster||[]).find(x=>x.id===toId);
  if(!r){ toast("명부에서 찾을 수 없습니다.","bad"); return; }
  if(P.sent.some(x=>String(x.to_id)===String(toId))){ toast("이미 신청해 두었습니다. 상대의 답을 기다려 주세요."); return; }
  pairBusyBtn(true);
  sbSend("POST","pairs",[{from_id:S.sb.id, from_name:S.name, to_id:toId, to_name:r.name||"", status:"pending"}],"return=minimal")
    .then(()=>{ toast(`${esc(r.name||"")} 님에게 페어를 신청했습니다. 수락하면 맺어집니다.`,"good");
                return pairFetch(true); })
    .catch(()=>toast("신청을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.","bad"))
    .then(()=>{ pairBusyBtn(false); renderMain(); });
}
function pairBusyBtn(on){ document.querySelectorAll(".pairbtn").forEach(b=>b.disabled=!!on); }
function pairAccept(id){
  const P=pairEnsure();
  if(P.mine){ toast("이미 페어가 있습니다. 먼저 지금 페어를 풀어 주세요.","bad"); return; }
  pairBusyBtn(true);
  /* 상대가 그 사이 다른 사람과 맺었을 수 있으니 한 번 더 확인합니다 */
  const row=(P.inbox||[]).find(x=>x.id===id);
  const other=row?encodeURIComponent(row.from_id):"";
  sbGet(`pairs?select=id,status&or=(from_id.eq.${other},to_id.eq.${other})&status=eq.accepted&limit=1`)
    .then(busy=>{
      if(busy && busy.length){ toast("상대가 이미 다른 사람과 페어를 맺었습니다.","bad"); return pairDecline(id, true); }
      return sbSend("PATCH",`pairs?id=eq.${id}`,{status:"accepted", updated_at:new Date().toISOString()},"return=minimal")
        .then(()=>{ toast("페어를 맺었습니다. 둘만의 자리가 열렸습니다.","good");
                    pushNews(`[인연] ${row?row.from_name:"누군가"} 학생과 페어를 맺었습니다.`);
                    return pairFetch(true); });
    })
    .catch(()=>toast("수락하지 못했습니다. 잠시 뒤 다시 시도해 주세요.","bad"))
    .then(()=>{ pairBusyBtn(false); renderMain(); });
}
function pairDecline(id, quiet){
  pairBusyBtn(true);
  return sbSend("PATCH",`pairs?id=eq.${id}`,{status:"declined", updated_at:new Date().toISOString()},"return=minimal")
    .then(()=>{ if(!quiet) toast("신청을 거절했습니다."); return pairFetch(true); })
    .catch(()=>{ if(!quiet) toast("처리하지 못했습니다.","bad"); })
    .then(()=>{ pairBusyBtn(false); renderMain(); });
}
function pairCancel(id){
  pairBusyBtn(true);
  sbSend("PATCH",`pairs?id=eq.${id}`,{status:"broken", updated_at:new Date().toISOString()},"return=minimal")
    .then(()=>{ toast("신청을 거두었습니다."); return pairFetch(true); })
    .catch(()=>toast("처리하지 못했습니다.","bad"))
    .then(()=>{ pairBusyBtn(false); renderMain(); });
}
function pairBreak(){
  const P=pairEnsure(); if(!P.mine) return;
  const o=pairOther(P.mine);
  if(!confirm(`${o.name} 님과의 페어를 풀까요? ${window.PAIR_PLAY?.ready?'공동 재화는 절반씩, 바랑 물품은 번갈아 분배됩니다. 진행 기록은 유지됩니다.':'둘만의 자리도 닫힙니다.'}`)) return;
  pairBusyBtn(true);
  sbSend("PATCH",`pairs?id=eq.${P.mine.id}`,{status:"broken", updated_at:new Date().toISOString()},"return=minimal")
    .then(()=>{ toast("페어를 풀었습니다."); return pairFetch(true); })
    .catch(()=>toast("처리하지 못했습니다.","bad"))
    .then(()=>{ pairBusyBtn(false); renderMain(); });
}
function pairNick(){
  const P=pairEnsure(); if(!P.mine) return;
  const o=pairOther(P.mine);
  const cur=o.nick||"";
  const v=prompt(`${o.name} 님을 부르는 애칭 (8자까지, 비우면 지움)`, cur);
  if(v===null) return;
  const field = String(P.mine.from_id)===String(S.sb.id) ? "nick_from" : "nick_to";
  const body={}; body[field]=v.trim().slice(0,8); body.updated_at=new Date().toISOString();
  sbSend("PATCH",`pairs?id=eq.${P.mine.id}`,body,"return=minimal")
    .then(()=>pairFetch(true)).then(()=>renderMain())
    .catch(()=>toast("애칭을 바꾸지 못했습니다.","bad"));
}

/* 페어 채팅은 이름이 아니라 계정 아이디로 묶습니다 */
const _chatScopePair=chatScope;
chatScope=function(tab){
  if(tab==="페어"){ const P=pairEnsure(); return P.mine ? pairIdKey(P.mine.from_id, P.mine.to_id) : ""; }
  return _chatScopePair(tab);
};

/* 페어 채팅 탭을 열 때 서버의 두 사람 기록을 다시 확인합니다. */
const _setChatTabPair=setChatTab;
setChatTab=function(tab){
  _setChatTabPair(tab);
  if(tab==="페어"){
    if(pairEnsure().mine) pairChatHistory(true);
    else pairFetch(true).then(()=>pairChatHistory(true));
  }
};

/* 명부·채팅과 함께 주기적으로 받아 옵니다 */
const _stepPair=step;
step=function(m){ _stepPair(m); if(sbOn()) pairFetch(); };
const _bootPair=boot;
boot=function(){ _bootPair(); pairEnsure(); if(sbOn()) pairFetch(true); };

/* ─── 인연·관계 화면에 페어 칸 ─── */
function pairHTML(){
  const P=pairEnsure();
  if(!sbOn()) return `<div class="card pad" style="margin-bottom:14px">
    <div class="sect-t">페어</div>
    <div class="tiny muted">공유 기록을 연결하면 다른 러너에게 페어를 신청할 수 있습니다.</div></div>`;
  const o=P.mine?pairOther(P.mine):null;
  return `<div class="card pad" style="margin-bottom:14px${P.mine?";border-color:var(--gold2)":""}">
    <div class="spread"><div class="sect-t" style="margin:0">페어</div>
      <span class="tiny muted">한 사람에게 하나만</span></div>
    ${o?`<div class="spread" style="margin-top:6px">
        <div><b style="color:var(--gold)">${esc(o.name)}</b>
          ${o.nick?`<span class="tiny muted">· ${esc(o.nick)}이라 부릅니다</span>`:""}
          <div class="tiny muted">전생의 하나의 죄업으로 묶였습니다. 채팅 「페어」 탭이 열려 있습니다.</div></div>
        <div class="row">
          <button class="btn sm ghost pairbtn" onclick="pairNick()">애칭</button>
          <button class="btn sm ghost pairbtn" onclick="pairBreak()">풀기</button></div></div>`
     :`<div class="tiny muted" style="margin-top:4px">아직 페어가 없습니다. 학생 명부에서 신청해 보세요.</div>
        <button class="btn sm" style="margin-top:8px" onclick="go('roster')">학생 명부로</button>`}
    ${(P.inbox||[]).length?`<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)">
      <div class="tiny" style="color:var(--gold);margin-bottom:6px">받은 신청 ${P.inbox.length}</div>
      ${P.inbox.map(r=>`<div class="spread" style="padding:5px 0">
        <span><b>${esc(r.from_name)}</b> <span class="tiny muted">님이 페어를 신청했습니다</span></span>
        <div class="row"><button class="btn sm pri pairbtn" onclick="pairAccept(${r.id})">수락</button>
          <button class="btn sm ghost pairbtn" onclick="pairDecline(${r.id})">거절</button></div></div>`).join("")}
    </div>`:""}
    ${(P.sent||[]).length?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">
      <div class="tiny muted" style="margin-bottom:6px">보낸 신청</div>
      ${P.sent.map(r=>`<div class="spread" style="padding:5px 0">
        <span class="tiny"><b>${esc(r.to_name)}</b> 님의 답을 기다리는 중</span>
        <button class="btn sm ghost pairbtn" onclick="pairCancel(${r.id})">거두기</button></div>`).join("")}
    </div>`:""}
  </div>`;
}
const _relView=VIEWS.rel;
VIEWS.rel=()=>{
  const h=_relView();
  return h.replace('<div class="grid g2">', pairHTML()+'<div class="grid g2">');
};

/* 학생증 등에 쓰는 페어 이름 */
pairName = function(){
  const P=pairEnsure();
  if(!sbOn() || !P.mine) return "";
  const o=pairOther(P.mine);
  return o.nick ? `${o.name} (${o.nick})` : o.name;
};

/* ═══════════════════════════════════════════════════
   페어와 나누는 현황 — 거처와 의뢰
   서로의 명부 기록에서 읽어 옵니다. 페어가 아니면 보이지 않습니다.
   ═══════════════════════════════════════════════════ */
function pairRow(){
  const P=pairEnsure();
  if(!sbOn() || !P.mine) return null;
  const o=pairOther(P.mine);
  const r=P.partner&&String(P.partner.id)===String(o.id)
    ? P.partner : (S.sb.roster||[]).find(x=>String(x.id)===String(o.id));
  return r ? Object.assign({}, r, {_nick:o.nick}) : null;
}
function pairTitle(r){
  return `<b style="color:var(--gold)">${esc(r.name||"")}</b>`
       + (r._nick?` <span class="tiny muted">· ${esc(r._nick)}</span>`:"");
}
function pairSeen(r){
  const d=(Date.now()-new Date(r.updated_at).getTime())/60000;
  return d<5 ? `<span class="tag g">접속 중</span>`
             : `<span class="tiny muted">${d<60?Math.floor(d)+"분 전":d<1440?Math.floor(d/60)+"시간 전":Math.floor(d/1440)+"일 전"}</span>`;
}
/* ─── 거처 현황 ─── */
function pairHomeHTML(){
  const P=pairEnsure();
  if(!sbOn() || !P.mine) return "";
  const sharedPair=SOCIAL.pairs.find(p=>String(p.id)===String(P.mine.id));
  const homeTitle=(sharedPair?.pair_name?.trim()||"페어")+"의 거처";
  const r=pairRow();
  if(!r) return `<div class="card pad" style="margin-bottom:14px">
    <div class="sect-t">${esc(homeTitle)}</div>
    <div class="tiny muted">아직 명부에 올라오지 않았습니다. 상대가 한 번 접속하면 보입니다.</div></div>`;
  const h=homeOf(r.hall), dorm=(r.hall==="dorm");
  const top=dorm?4:5, st=clamp(r.home_stage||0,0,top);
  const fac=HOMESTAGE[st]||0;
  const shared=pairRentDue(), due=Math.max(Number(r.home_due)||0,shared);
  const late=!dorm && (due>0 ? nowMin()>=due : !!r.home_late);
  const sharedPaid=!dorm && shared>nowMin();
  const activeFac=dorm||(!late&&due>nowMin())?fac:0;
  return `<div class="card pad" style="margin-bottom:14px;border-color:var(--gold2)">
    <div class="spread"><div class="sect-t" style="margin:0">${esc(homeTitle)}</div>${pairSeen(r)}</div>
    <div class="spread" style="margin-top:4px">
      <div>${pairTitle(r)} <span class="tiny muted">· ${esc(h.n)} ${esc(h.h)}</span>
        <div class="tiny muted">${dorm?"방 꾸미기":"집 짓기"} ${st} / ${top} 단계
          ${dorm?"· 일세 없음":late?'· <span style="color:var(--red)">일세 미납</span>':sharedPaid?"· 페어 일세 적용 중":due?"· 일세 납부 완료":"· 아직 계약 전"}</div></div>
      <span class="tag" style="border-color:${h.c};color:${h.c}">혜택 ${Math.round(activeFac*100)}%</span></div>
    <div class="bar" style="margin-top:8px"><i style="width:${st/top*100}%"></i></div>
    <div class="tiny muted" style="margin-top:6px">${esc(hallBenefitsAt(r.hall,activeFac))}</div>
    ${dorm?"":`<div class="tiny muted" style="margin-top:4px">구역 특화 효과 ${HALLMULT[r.hall]}배 · 거처 기준 하루 ${rentMoney(rentOf(r.hall,st))} 륜</div>`}
  </div>`;
}

/* ─── 의뢰 현황 ─── */
function pairRunHTML(){
  const P=pairEnsure();
  if(!sbOn() || !P.mine) return "";
  const r=pairRow();
  if(!r) return "";
  const out=(r.run_stage||0)>0;
  return `<div class="card pad" style="margin-bottom:14px;${out?"border-color:var(--gold2)":""}">
    <div class="spread"><div class="sect-t" style="margin:0">페어의 의뢰</div>${pairSeen(r)}</div>
    ${out?`<div class="spread" style="margin-top:4px">
        <div>${pairTitle(r)}
          <div class="tiny muted">${esc(r.run_ward||"")} <b>${r.run_stage}단계</b> 진행 중
            · 처치 ${nf(r.run_kills||0)}체</div></div>
        <div class="tiny muted">${hhmm(r.run_left||0)} 남음</div></div>
       <div class="tiny muted" style="margin-top:6px">페어의 현재 진행 상황입니다. 내 의뢰 동행은 접수대의 기존 동행 기능에서 준비할 수 있습니다.</div>`
      :`<div class="tiny muted" style="margin-top:4px">${pairTitle(r)} 님은 지금 의뢰에 나가 있지 않습니다.</div>`}
  </div>`;
}

/* ─── 콘텐츠별 동행 영역: 석탑 / 결계의 탑 각각 표시 ─── */
const _towerParty=VIEWS.tower;
VIEWS.tower=()=>{
  const h=_towerParty();
  const key='<div class="card pad">\n    <div class="sect-t">탑 기록</div>';
  const i=h.indexOf(key);
  return i>=0?h.slice(0,i)+coopRoomPanel("tower")+h.slice(i):h+coopRoomPanel("tower");
};
const _guardParty=VIEWS.guard;
VIEWS.guard=()=>_guardParty()+coopRoomPanel("guard");

/* 의뢰에는 기존 동행 모집/출정 기능이 있으므로 별도 '같이 가기'를 덧붙이지 않습니다. */
const _questParty=VIEWS.quest;
VIEWS.quest=()=>{
  const h=_questParty();
  const block=pairRunHTML()+legacyQuestRoom();
  const cut=h.indexOf('<!--QSPLIT-->');
  return cut<0?block+h:h.slice(0,cut)+block+h.slice(cut+'<!--QSPLIT-->'.length);
};


;
/* ===== module: part7.js ===== */
"use strict";
/* ═══════════════════════════════════════════════════
   無明長夜 · 사무전 — 확장 7
   로그인 (아이디 + 비밀번호)

   · 캐릭터를 계정에 묶어 서버에 보관합니다. 쿠키를 지우거나
     휴대폰으로 옮겨도 아이디만 알면 이어서 할 수 있습니다.
   · 공유 기록(Supabase)이 연결됐을 때만 동작합니다.
     연결 전에는 예전처럼 이 브라우저에만 저장되는 혼자 모드입니다.

   ※ 열쇠가 페이지에 실려 있는 구조라, 이 로그인은 「이름표에 자물쇠를
      다는 것」에 가깝습니다. 서로 믿는 커뮤니티 안에서 쓰는 용도입니다.
   ═══════════════════════════════════════════════════ */

/* ── 한 번만 도는 기록 초기화 ───────────────────────
   날짜를 바꾸면 러너 전원이 다음 접속 때 한 번 더 비워집니다. */
// 정식 배포 전 초기화 표식. 배포된 모든 테스트 기기의 이전 로그인/세이브를 일회성 폐기합니다.
// 화면 취향(테마/알림음)은 건드리지 않습니다.
const WIPEKEY="mmjy_wipe", WIPEV="2026-11-04-release-reset-v2";
(function(){
  try{
    if(localStorage.getItem(WIPEKEY)!==WIPEV){
      const oldKeys=[];
      for(let i=0;i<localStorage.length;i++) oldKeys.push(localStorage.key(i));
      oldKeys.forEach(key=>{
        if(key===SAVEKEY || key==="mmjy_acct" ||
           /^(mmjy_account_sync_v2_|mmjy_account_recovery_v2_|mmjy_pair_market_pending_)/.test(key)){
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem(WIPEKEY, WIPEV);
    }
  }catch(e){}
})();

/* ── SHA-256 (브라우저 기능이 막힌 곳에서도 돌도록 직접 구현) ── */
const SHA_K=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,
3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,
4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,
2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,
1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,
3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,
1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,
3204031479,3329325298];
function sha256(msg){
  const rr=(x,n)=>(x>>>n)|(x<<(32-n));
  const bytes=new TextEncoder().encode(msg);
  const L=bytes.length, bl=L*8;
  const total=(((L+9)+63)>>6)<<6;
  const b=new Uint8Array(total); b.set(bytes); b[L]=0x80;
  new DataView(b.buffer).setUint32(total-4, bl>>>0, false);
  new DataView(b.buffer).setUint32(total-8, Math.floor(bl/4294967296), false);
  let H=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];
  const w=new Int32Array(64), dv=new DataView(b.buffer);
  for(let i=0;i<total;i+=64){
    for(let t=0;t<16;t++) w[t]=dv.getUint32(i+t*4,false);
    for(let t=16;t<64;t++){
      const s0=rr(w[t-15],7)^rr(w[t-15],18)^(w[t-15]>>>3);
      const s1=rr(w[t-2],17)^rr(w[t-2],19)^(w[t-2]>>>10);
      w[t]=(w[t-16]+s0+w[t-7]+s1)|0;
    }
    let [a,bb,c,d,e,f,g,h]=H;
    for(let t=0;t<64;t++){
      const S1=rr(e,6)^rr(e,11)^rr(e,25), ch=(e&f)^(~e&g);
      const t1=(h+S1+ch+SHA_K[t]+w[t])|0;
      const S0=rr(a,2)^rr(a,13)^rr(a,22), maj=(a&bb)^(a&c)^(bb&c);
      const t2=(S0+maj)|0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=bb; bb=a; a=(t1+t2)|0;
    }
    H=[(H[0]+a)|0,(H[1]+bb)|0,(H[2]+c)|0,(H[3]+d)|0,(H[4]+e)|0,(H[5]+f)|0,(H[6]+g)|0,(H[7]+h)|0];
  }
  return H.map(x=>(x>>>0).toString(16).padStart(8,"0")).join("");
}
function acctHash(id, pw){ return sha256("무명장야|"+String(id).toLowerCase()+"|"+pw); }

/* ── 서버 (S 가 아직 없을 수도 있어 설정을 직접 읽습니다) ── */
function acctCfg(){
  const CF=window.MMJY_CONFIG||{};
  let url=String(CF.supabaseUrl||""), key=String(CF.supabaseKey||"");
  if((!url||!key) && typeof S!=="undefined" && S && S.sb){ url=url||S.sb.url||""; key=key||S.sb.key||""; }
  /* 배포 중 config.js가 덮여도 이 기기의 마지막 공유 설정으로 로그인 복구.
     공개 anon 키와 URL만 사용하며 계정 토큰이나 비밀번호는 이 경로로 노출하지 않음. */
  if(!url||!key){
    try{
      const previous=JSON.parse(localStorage.getItem(SAVEKEY)||"null");
      const sb=previous&&previous.sb;
      if(sb && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(sb.url||""))){
        url=url||String(sb.url||"");
        key=key||String(sb.key||"");
      }
    }catch(_){}
  }
  return {url:url.replace(/\/+$/,""), key};
}
function acctOn(){ const c=acctCfg(); return !!(c.url && c.key); }
async function acctFetch(path, opt){
  const c=acctCfg();
  const o=Object.assign({}, opt||{});
  o.headers=Object.assign({apikey:c.key, Authorization:"Bearer "+c.key}, o.headers||{});
  // Bound the complete request, including the response body. Never retry writes here:
  // an aborted response does not mean the server rolled back the transaction.
  const controller=new AbortController(), external=o.signal;
  const abort=()=>controller.abort();
  if(external){
    if(external.aborted) abort();
    else external.addEventListener('abort',abort,{once:true});
  }
  o.signal=controller.signal;
  const timer=setTimeout(abort,20000);
  try{
    const r=await fetch(c.url+"/rest/v1/"+path,o);
    const t=await r.text();
    if(!r.ok) throw new Error(t.slice(0,180)||("HTTP "+r.status));
    return t?JSON.parse(t):[];
  }finally{
    clearTimeout(timer);
    if(external) external.removeEventListener('abort',abort);
  }
}

/* ── 로그인 상태 ─────────────────────────────────── */
const ACCTKEY="mmjy_acct";
let ACCT={id:"", tok:""};
(function(){ try{ const r=localStorage.getItem(ACCTKEY); if(r) ACCT=JSON.parse(r)||ACCT; }catch(e){} })();
function acctStore(){ try{ localStorage.setItem(ACCTKEY, JSON.stringify(ACCT)); }catch(e){} }
function acctClear(){ ACCT={id:"",tok:""}; try{ localStorage.removeItem(ACCTKEY); }catch(e){} }
function acctIn(){ return !!(ACCT.id && ACCT.tok); }

/* 명부·채팅·방에서 쓰는 식별자를 계정 아이디로 고정합니다 */
if(typeof ensureV6==="function"){
  const _ensureAcct=ensureV6;
  ensureV6=function(){ _ensureAcct(); if(acctIn() && S && S.sb) S.sb.id=ACCT.id; };
}

/* ── 저장본을 서버에 보관 / 되찾기 ───────────────── */
/* 계정 원본 표는 공개하지 않습니다. 보안 RPC가 해시를 확인한 뒤 저장본만 전달합니다. */
function acctRpc(action,args){
  return acctFetch('rpc/mm_account_'+action,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)});
}
let PUSHAT=0, PUSHBUSY=false, PUSHWAIT=Promise.resolve(), PUSHERROR=null;
function acctPush(force){
  if(!acctIn() || !acctOn()) return Promise.resolve(false);
  if(PUSHBUSY) return force?PUSHWAIT.then(()=>acctPush(true)):PUSHWAIT;
  if(typeof S==="undefined" || !S || !S.made) return Promise.resolve(false);
  const now=Date.now();
  if(!force && now-PUSHAT < 5*60*1000) return Promise.resolve(true);
  PUSHAT=now; PUSHBUSY=true; PUSHERROR=null;
  let blob=null;
  try{ blob=JSON.parse(JSON.stringify(S)); }catch(e){ PUSHBUSY=false; return Promise.resolve(false); }
  PUSHWAIT=acctRpc('save',{p_id:ACCT.id,p_token:ACCT.tok,p_save:blob,p_name:S.name||''})
  .then(result=>{
    if(!result || !result.ok) throw new Error('계정 저장을 확인하지 못했습니다.');
    return true;
  }).catch(e=>{
    PUSHERROR=e;
    // A failed upload must not suppress background recovery for five minutes.
    PUSHAT=Date.now()-5*60*1000+30000;
    if(force && typeof VIEW!=="undefined" && VIEW==="market" && typeof toast==="function")
      toast("저장본 동기화 필요 · 중개소 매물 새로 고침을 먼저 눌러 주세요.","bad");
    return false;
  }).finally(()=>{PUSHBUSY=false;});
  return PUSHWAIT;
}
function acctPull(){
  return acctRpc('login',{p_id:ACCT.id,p_token:ACCT.tok})
    .then(row=>row&&row.save||null);
}

/* ── 로그인 화면 ─────────────────────────────────── */
let GATEMODE="login", GATEMSG="";
function gateMsg(t, bad){ GATEMSG = t ? `<div class="tiny" style="margin-top:10px;color:${bad?"var(--red)":"var(--ok)"}">${esc(t)}</div>` : ""; }
function gateShow(mode){
  if(mode) { GATEMODE=mode; GATEMSG=""; }
  const up = GATEMODE==="signup";
  document.body.classList.add("auth-gate");
  $("#topbar").innerHTML=`<div class="tb1"><div class="logo logo-top" title="無明長夜"></div>
    <div><div class="me-name">無明長夜</div><div class="me-sub">사신무기전문학교 명계지부</div></div></div>`;
  $("#navcol").innerHTML=""; $("#chatcol").innerHTML="";
  document.body.classList.remove("mobile-game","mobile-chat-open");
  MOBILE_CHAT_OPEN=false;
  $("#main").innerHTML=`<div class="card pad" style="max-width:420px;margin:0 auto;padding:30px 24px">
    <div class="logo logo-big" title="無明長夜" style="width:190px;height:112px"></div>
    <div class="page-kicker" style="text-align:center">無明長夜</div>
    <h1 class="page" style="font-size:21px;text-align:center;margin-bottom:4px">
      ${up?"처음 오셨군요":"다시 오셨군요"}</h1>
    <div class="tiny muted" style="text-align:center;margin-bottom:18px">
      ${up?"아이디를 정하면 그 이름으로 기록이 남습니다."
         :"아이디로 들어오면 키우던 캐릭터가 따라옵니다."}</div>

    <label class="f">아이디</label>
    <input id="g_id" maxlength="20" autocomplete="username" placeholder="영문·숫자 4~20자"
      style="width:100%" onkeydown="if(event.key==='Enter')$('#g_pw').focus()">
    <label class="f" style="margin-top:10px">비밀번호</label>
    <input id="g_pw" type="password" maxlength="60" placeholder="4자 이상"
      autocomplete="${up?"new-password":"current-password"}" style="width:100%"
      onkeydown="if(event.key==='Enter')${up?"gateSignUp()":"gateLogin()"}">
    ${up?`<label class="f" style="margin-top:10px">비밀번호 확인</label>
    <input id="g_pw2" type="password" maxlength="60" style="width:100%"
      onkeydown="if(event.key==='Enter')gateSignUp()">`:""}
    ${GATEMSG}
    <button class="btn pri" style="width:100%;margin-top:16px" id="g_go"
      onclick="${up?"gateSignUp()":"gateLogin()"}">${up?"가입하고 입학하기":"들어가기"}</button>
    <div class="tiny muted" style="text-align:center;margin-top:12px">
      ${up?`이미 아이디가 있으신가요? <a href="#" onclick="gateShow('login');return false">로그인</a>`
         :`아직 아이디가 없으신가요? <a href="#" onclick="gateShow('signup');return false">가입하기</a>`}
    </div>
    <div class="tiny muted" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">
      비밀번호는 그대로 저장되지 않고 섞어서 보관합니다. 다만 이 사이트는 서로 아는 사람끼리
      쓰는 용도라, 중요한 곳에 쓰는 비밀번호는 넣지 마세요.
    </div>
  </div>`;
  setTimeout(()=>{ const e=$("#g_id"); if(e) e.focus(); },30);
}
function gateBusy(on, label){
  const b=$("#g_go"); if(!b) return;
  b.disabled=!!on; b.textContent = on ? (label||"확인하는 중…")
    : (GATEMODE==="signup"?"가입하고 입학하기":"들어가기");
}
function gateVals(){
  return { id:($("#g_id")?$("#g_id").value:"").trim().toLowerCase(),
           pw:($("#g_pw")?$("#g_pw").value:""),
           pw2:($("#g_pw2")?$("#g_pw2").value:"") };
}
function gateSignUp(){
  const v=gateVals();
  if(!/^[a-z0-9_]{4,20}$/.test(v.id)){ gateMsg("아이디는 영문 소문자·숫자·밑줄 4~20자로 적어 주세요.",1); return gateShow(); }
  if(v.pw.length<4){ gateMsg("비밀번호는 4자 이상으로 적어 주세요.",1); return gateShow(); }
  if(v.pw!==v.pw2){ gateMsg("비밀번호 확인이 다릅니다.",1); return gateShow(); }
  gateBusy(true,"아이디 확인 중…");
  acctRpc('register',{p_id:v.id,p_token:acctHash(v.id,v.pw)})
    .then(()=>{
      ACCT={id:v.id,tok:acctHash(v.id,v.pw)};acctStore();
      try{localStorage.removeItem(SAVEKEY);}catch(e){}
      acctBoot(null);
    })
    .catch(e=>{gateBusy(false);gateMsg(String(e.message||'회원가입에 실패했습니다.').slice(0,160),1);gateShow();});
}
function gateLogin(){
  const v=gateVals();
  if(!v.id || !v.pw){ gateMsg("아이디와 비밀번호를 적어 주세요.",1); return gateShow(); }
  gateBusy(true);
  acctRpc('login',{p_id:v.id,p_token:acctHash(v.id,v.pw)})
    .then(row=>{
      ACCT={id:v.id,tok:acctHash(v.id,v.pw)};acctStore();
      acctBoot(row.save||null);
    })
    .catch(e=>{
      gateBusy(false);
      const reason=String(e?.message||e||'');
      const invalid=/아이디 또는 비밀번호|아이디나 비밀번호|계정이 없|인증이 필요/.test(reason);
      gateMsg(invalid ? '아이디나 비밀번호를 확인해 주세요.'
        : '서버 응답을 받지 못했습니다. 잠시 후 다시 로그인해 주세요. 기존 기록은 초기화하지 않았습니다.',1);
      gateShow();
    });
}
/* 저장본을 자리에 앉히고 게임을 시작합니다 */
const OLDHALL={h1:"dorm",h2:"dorm",h3:"dorm",h4:"dorm"};
function acctBoot(blob){
  if(blob && OLDHALL[blob.hall]) blob.hall=OLDHALL[blob.hall];   // 옛 숙사 → 기숙사
  try{
    if(blob && blob.made){ blob.sb=blob.sb||{}; blob.sb.id=ACCT.id;
      localStorage.setItem(SAVEKEY, JSON.stringify(blob)); }
    else localStorage.removeItem(SAVEKEY);
  }catch(e){}
  initGame();
  if(blob && blob.made) toast(`${esc(blob.name||ACCT.id)} 학생으로 들어왔습니다.`,"good");
}
function acctLogout(){
  if(!confirm("로그아웃할까요? 지금까지의 기록은 계정에 저장됩니다.")) return;
  acctPush(true).then(()=>{
    acctClear();
    try{ localStorage.removeItem(SAVEKEY); }catch(e){}
    location.reload();
  });
}

/* ── 들어오는 길 ─────────────────────────────────── */
/* index.html 의 init() 이 맨 먼저 이 함수를 부릅니다.
   true 를 돌려주면 게임 대신 로그인 화면을 띄웁니다. */
function gateConfigMissing(){
  document.body.classList.add("auth-gate");
  /* 운영 서버에서 설정 파일이 사라졌을 때 로그인 없이 다른 기록을 시작하지 않게 차단합니다. */
  document.querySelector("#topbar").innerHTML=`<div class="tb1"><div class="logo logo-top" title="無明長夜"></div><div><div class="me-name">無明長夜</div><div class="me-sub">사신무기전문학교 명계지부</div></div></div>`;
  document.querySelector("#navcol").innerHTML="";
  document.querySelector("#chatcol").innerHTML="";
  document.querySelector("#main").innerHTML=`<div class="card pad" style="max-width:520px;margin:26px auto;padding:28px 24px">
    <div class="page-kicker">사무전 로그인 연결</div>
    <h2 style="margin:8px 0 14px">서버 설정을 불러오지 못했습니다</h2>
    <p class="muted" style="line-height:1.8">공유 서버 주소나 공개 연결 키가 비어 있습니다. GitHub Pages의 <code>config.js</code>를 운영 설정본으로 복구해 주세요.<br>기존 러너 기록은 삭제되지 않았습니다.</p>
    <div class="tiny muted">운영진: GitHub 저장소의 이전 버전에서 config.js를 복원하거나 Supabase Project URL과 Publishable/anon key를 다시 입력하세요. <b>service_role/secret 키는 올리지 마세요.</b></div>
    <button class="btn pri" style="margin-top:16px" onclick="location.reload()">설정 복구 후 새로고침</button>
  </div>`;
}
function gateIntercept(){
  if(!acctOn()){
    /* 공개 사이트에서는 구성 누락을 조용한 1인 모드로 처리하지 않습니다. */
    if(["ignorance.site","www.ignorance.site"].includes(location.hostname.toLowerCase())){
      gateConfigMissing(); return true;
    }
    return false; // 로컬 오프라인 테스트는 기존처럼 1인 모드 허용
  }
  if(!acctIn()){ gateShow("login"); return true; }
  // 자동 로그인 — 저장해 둔 표식을 서버와 맞춰 봅니다
  acctRpc('login',{p_id:ACCT.id,p_token:ACCT.tok})
    .then(row=>{
      if(!row || !row.id) throw new Error('계정 확인에 실패했습니다.');
      acctBoot(row.save||null);
    })
    .catch(e=>{
      // 예전 구현은 로그인 실패 후 로컬 캐릭터로 입장하여 syncUp()으로
      // 초기화한 학생 명부를 다시 채웠습니다. 서버 확인 실패 시 게임 진입을 금지합니다.
      const reason=String(e?.message||e||'');
      const invalid=/아이디 또는 비밀번호|계정 인증이 필요|로그인이 필요|인증이 필요/.test(reason);
      if(invalid) acctClear();
      GATEMODE='login';
      gateMsg(invalid
        ? '이전 테스트 계정이 초기화되었거나 로그인 정보가 맞지 않습니다. 새 계정으로 가입해 주세요.'
        : '서버 연결을 확인할 수 없습니다. 인터넷 연결과 서버 설정을 확인한 뒤 다시 로그인해 주세요.',true);
      gateShow();
    });
  return true;
}

/* ── 주기적으로 계정에 보관 ──────────────────────── */
if(typeof step==="function"){
  const _stepAcct=step;
  step=function(m){ _stepAcct(m); if(acctIn()) acctPush(); };
}
window.addEventListener("beforeunload", ()=>{ try{ acctPush(true); }catch(e){} });
document.addEventListener("visibilitychange", ()=>{ if(document.hidden && acctIn()) acctPush(true); });

/* ── 설정 창에 계정 칸 ───────────────────────────── */
if(typeof openSettings==="function"){
  const _setAcct=openSettings;
  openSettings=function(){
    _setAcct();
    if(!acctOn()) return;
    const box=document.querySelector(".modal .pad, .modal");
    if(!box) return;
    const d=document.createElement("div");
    d.innerHTML = acctIn()
      ? `<hr class="hr"><div class="sect-t">계정</div>
         <div class="tiny muted">아이디 <b style="color:var(--gold)">${esc(ACCT.id)}</b> 로 들어와 있습니다.
           다른 기기에서도 같은 아이디로 들어오면 이 캐릭터가 따라옵니다.</div>
         <div class="row" style="margin-top:8px">
           <button class="btn sm" onclick="acctPush(true).then(ok=>toast(ok?'계정 서버 저장 완료':'서버 저장 실패 · 기록 복사로 따로 백업해 주세요.',ok?'good':'bad'))">지금 저장</button>
           <button class="btn sm" onclick="closeModal();acctLogout()">로그아웃</button></div>`
      : `<hr class="hr"><div class="sect-t">계정</div>
         <div class="tiny muted">로그인하지 않고 이 브라우저에만 저장하는 중입니다.</div>`;
    box.appendChild(d);
  };
}

