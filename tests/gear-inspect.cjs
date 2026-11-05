const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('gameplay.js','utf8');let renders=0;
const c={S:{lvl:70,gear:{robe:null},bag:[],sari:3},GRADES:[{m:1,n:'일반',c:'gray'}],SLOTS:[{k:'robe',n:'법의'}],STATS:[{k:'def',n:'방어'},{k:'atk',n:'공격'}],renderMain:()=>renders++,esc:s=>String(s).replaceAll('<','&lt;'),nf:String,gearCanEquip:i=>i.lv<=c.S.lvl,enhRate:()=>.5,enhCost:()=>({rin:1,dust:1})};vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('function gearScore('),src.indexOf('function gearUpgradeHTML(')),c);
vm.runInContext(src.slice(src.indexOf('const GEAR_INSPECT='),src.indexOf('const GEAR_BROWSE=')),c);
function item(id,enh,opts=[]){let v=Math.max(1,Math.round((.8+60*.085)));for(let k=0;k<enh;k++)v=Math.round(v*1.05+1);return {id,slot:'robe',name:'테스트 <법구>',grade:0,lv:60,statFormulaVersion:2,enh,main:{st:'def',v},opts};}
const equipped=item(1,10,[{k:'hpP',n:'생명력',v:12}]),candidate=item(2,3,[{k:'atkP',n:'공격력',v:10}]);c.S.gear.robe=equipped;c.S.bag=[candidate];
const original=JSON.stringify(c.S);const normal=c.gearComparisonData(candidate,false),zero=c.gearComparisonData(candidate,true);
assert.notEqual(normal.delta,zero.delta);assert.equal(zero.current.enh,0);assert.equal(zero.candidate.enh,0);assert.equal(zero.current.main.v,zero.candidate.main.v);assert.equal(zero.estimated,false);assert.equal(JSON.stringify(c.S),original,'comparison never changes live gear');
c.gearInspect(2);let html=c.gearInspectHTML();assert.ok(html.includes('基本')===false);assert.ok(html.indexOf('기본 옵션')<html.indexOf('gear-option-divider'));assert.ok(html.includes('추가 옵션'));assert.ok(html.includes('테스트 &lt;법구>'));
c.gearInspectToggle('zero',true);c.gearInspectToggle('compare',true);html=c.gearInspectHTML();assert.ok(html.includes('각인 0 기준'));assert.ok(html.includes('같은 부위 법구 비교'));assert.ok(html.includes('생명력'));assert.ok(html.includes('공격력'));assert.ok(html.includes('%p'));
c.S.gear.robe=null;assert.equal(c.gearComparisonData(candidate,true).current,null);assert.ok(c.gearInspectHTML().includes('착용한 법구가 없습니다'));
const legacy={...candidate,statFormulaVersion:undefined};assert.equal(c.gearUnenhanced(legacy).estimated,true);assert.equal(c.gearUnenhanced(item(3,0)).estimated,false);
c.S.bag=[];assert.ok(c.gearInspectHTML().includes('법구 살펴보기'),'deleted/sold selection returns placeholder');assert.ok(renders>=3);
console.log('PASS: both items normalized to +0, unchanged saved gear, base/extra sections, option table and percentage points, empty slot, legacy estimate, stale selection');
