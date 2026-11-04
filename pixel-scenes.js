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
  // The plaza already contains a weather/time overlay and map link: retain them.
  const originalScene=sceneSVG;
  sceneSVG=function () {
    return `<div class="pixel-plaza-art" role="img" aria-label="연등과 달빛이 밝히는 사무전 광장"><img src="${root}plaza.png?v=20261104-simple2" alt="" width="1536" height="1024" decoding="async" onerror="this.style.display='none'">${originalScene()}</div>`;
  };
})();
