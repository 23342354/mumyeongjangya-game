/* 용돈 기입장이 륜의 드나듦을 정확히 적는지 확인합니다.
   확인 항목: 지출 금액과 항목 이름, 수입이 섞인 행동에서 지출만 가려내기,
   같은 항목 합치기와 부호가 다를 때 나누기, 줄 수 상한, 변화 없을 때 적지 않기.
   coop.js에서 기입장 기록 부분만 떼어 돌리므로 게임 전체나 서버가 필요 없습니다. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'coop.js'),'utf8');

/* 기록 부분만 잘라 냅니다. 주석 표지가 바뀌면 여기서 바로 드러납니다. */
const HEAD='/* ── 용돈 기입장 · 기록 ─';
const TAIL='// Resource-changing clicks are serialized.';
assert.ok(source.includes(HEAD),'기입장 기록 구간의 시작 표지를 찾지 못했습니다');
assert.ok(source.includes(TAIL),'기입장 기록 구간의 끝 표지를 찾지 못했습니다');
const slice=source.slice(source.indexOf(HEAD),source.indexOf(TAIL));

function load(rin=10000){
  const ctx={Math,Date,Number,String,Array,Object,console,S:{rin,ledger:[]}};
  ctx.globalThis=ctx;vm.createContext(ctx);
  vm.runInContext(slice,ctx);
  const peek=e=>vm.runInContext(e,ctx);
  return {ctx,S:ctx.S,LEDGER:peek('LEDGER'),MAX:peek('LEDGER_MAX'),
    push:(...a)=>ctx.ledgerPush(...a),
    measure:(n,f)=>ctx.ledgerMeasure(n,f),
    label:peek('ledgerLabel'),   // const 화살표 함수라 전역 속성이 아닙니다
    rows:()=>ctx.S.ledger};
}

/* ── 1. 쓴 돈이 항목 이름과 함께 적힙니다 ─────────────── */
{
  const g=load(10000);
  g.measure('buy',()=>{g.S.rin-=300;});
  assert.equal(g.rows().length,1,'지출 한 줄이 적혀야 합니다');
  assert.equal(g.rows()[0].a,-300,'쓴 금액이 음수로 적혀야 합니다');
  assert.equal(g.rows()[0].k,'상점','buy는 상점으로 적혀야 합니다');
}

/* ── 2. 수입이 섞인 행동에서도 지출을 정확히 가려냅니다 ── */
{
  const g=load(10000);
  // 1000을 쓰고 200을 돌려받는 행동. 돌려받은 200은 gainRin 쪽에서 따로 적히므로
  // 기입장의 지출 줄은 돌려받기 전의 1000이어야 합니다.
  g.measure('martBuy',()=>{g.S.rin-=1000;g.LEDGER.income+=200;g.S.rin+=200;});
  assert.equal(g.rows()[0].a,-1000,'돌려받은 금액을 빼지 않은 실제 지출이어야 합니다');
  assert.equal(g.rows()[0].k,'잡화점');
  assert.equal(g.S.rin,9200,'잔고 자체는 그대로 계산되어야 합니다');
}

/* ── 3. gainRin을 거치지 않고 들어온 돈은 수입으로 적힙니다 ─ */
{
  const g=load(10000);
  g.measure('balanceClaimBoss',()=>{g.S.rin+=500;});
  assert.equal(g.rows()[0].a,500,'순수입은 양수로 적혀야 합니다');
  assert.equal(g.rows()[0].k,'결계 보상');
}

/* ── 4. 잔고가 그대로면 아무것도 적지 않습니다 ─────────── */
{
  const g=load(10000);
  g.measure('equip',()=>{});
  assert.equal(g.rows().length,0,'륜이 움직이지 않은 행동은 적지 않습니다');
}

/* ── 5. 같은 항목이 잇따르면 한 줄로 합칩니다 ──────────── */
{
  const g=load(10000);
  g.measure('buy',()=>{g.S.rin-=100;});
  g.measure('buy',()=>{g.S.rin-=250;});
  assert.equal(g.rows().length,1,'같은 항목은 한 줄로 합쳐져야 합니다');
  assert.equal(g.rows()[0].a,-350,'합친 금액이 더해져야 합니다');
}

/* ── 6. 시간이 벌어지면 따로 적습니다 ─────────────────── */
{
  const g=load(10000);
  g.measure('buy',()=>{g.S.rin-=100;});
  g.rows()[0].t-=11*60*1000;            // 11분 전으로 밀기 (합치는 창은 10분)
  g.measure('buy',()=>{g.S.rin-=100;});
  assert.equal(g.rows().length,2,'10분이 지난 뒤의 지출은 새 줄이어야 합니다');
}

/* ── 7. 부호가 다르면 합치지 않습니다 ─────────────────── */
{
  const g=load(10000);
  g.push(-100,'상점');
  g.push(300,'상점');
  assert.equal(g.rows().length,2,'지출과 수입은 같은 항목이라도 나뉘어야 합니다');
  assert.equal(g.rows()[0].a,300,'최신 줄이 앞에 와야 합니다');
}

/* ── 8. 다른 항목은 따로 적습니다 ─────────────────────── */
{
  const g=load(10000);
  g.measure('buy',()=>{g.S.rin-=100;});
  g.measure('enhance',()=>{g.S.rin-=100;});
  assert.deepEqual(g.rows().map(r=>r.k),['법구 강화','상점'],'항목별로 나뉘고 최신이 앞');
}

/* ── 9. 줄 수 상한을 넘지 않습니다 ────────────────────── */
{
  const g=load(1000000);
  for(let i=0;i<g.MAX+25;i++)g.push(-(i+1),'항목'+i);
  assert.equal(g.rows().length,g.MAX,`${g.MAX}줄을 넘지 않아야 합니다`);
  assert.equal(g.rows()[0].k,'항목'+(g.MAX+24),'가장 최근 줄이 남아야 합니다');
}

/* ── 10. 모르는 행동 이름은 그대로 보여 줍니다 ─────────── */
{
  const g=load();
  assert.equal(g.label('buy'),'상점');
  assert.equal(g.label('someNewAction'),'someNewAction','매핑이 없으면 이름을 그대로 적습니다');
}

/* ── 11. 행동이 실패해도 그때까지의 지출은 남습니다 ────── */
{
  const g=load(10000);
  assert.throws(()=>g.measure('buy',()=>{g.S.rin-=400;throw new Error('중간에 실패');}));
  assert.equal(g.rows()[0].a,-400,'예외가 나도 이미 빠진 금액은 적혀야 합니다');
  assert.equal(g.LEDGER.label,'','실패 뒤에도 항목 이름이 남아 있으면 안 됩니다');
}

console.log('PASS: 지출 기록, 수입 섞인 행동 분리, 순수입, 무변동 제외, 같은 항목 합치기와 시간/부호 분리, 항목 분리, 줄 수 상한, 이름 매핑, 예외 중 기록 보존');
