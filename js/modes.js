/* 주기율표 탐험실 — 보기 방식(분류·온도·성질·발견·퀴즈)과 시작 */
'use strict';

/* ---------- 보기 전환 ---------- */
let waveTimer = 0;
function moveIndicator() {
  const tab = $('.tab[aria-selected="true"]');
  const ind = $('#tab-ind');
  if (!tab) return;
  ind.style.width = tab.offsetWidth + 'px';
  ind.style.transform = `translateX(${tab.offsetLeft}px)`;
}
function setMode(m) {
  if (state.mode === m) return;
  const prev = state.mode;
  state.mode = m;
  if (prev === 'quiz') leaveQuiz();
  stopHeat();
  stopYearPlay();
  $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.mode === m)));
  moveIndicator();
  $$('.pane').forEach(p => { p.hidden = p.dataset.pane !== m; });
  const t = $('#ptable');
  t.dataset.mode = m;
  t.classList.add('waving');
  clearTimeout(waveTimer);
  waveTimer = setTimeout(() => t.classList.remove('waving'), 1300);
  $('#q').disabled = m === 'quiz';
  if (m === 'state') applyState();
  if (m === 'trend') applyTrend();
  if (m === 'discovery') applyDiscovery(false);
  if (m === 'quiz') { closeDetail(); enterQuiz(); }
  $('#chart-card').hidden = m !== 'trend';
  if (m === 'trend') requestAnimationFrame(drawChart);
  applyDim();
  renderInset(state.hover || state.sel);
}
function initTabs() {
  $$('.tab').forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));
  $('#tabs').addEventListener('keydown', ev => {
    const tabs = $$('.tab');
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const n = tabs[(i + d + tabs.length) % tabs.length];
    n.focus();
    setMode(n.dataset.mode);
  });
}

/* ---------- 분류 범례 ---------- */
function initLegend() {
  const kindBox = $('#kind-chips'), catBox = $('#cat-chips');
  kindBox.innerHTML = Object.entries(KINDS).map(([k, v]) => {
    const n = E.filter(e => v.cats.includes(e.cat)).length;
    const sw = v.cats.slice(0, 4).map(c => `<i style="--c:var(--c-${c})"></i>`).join('');
    return `<button type="button" class="chip kind" data-key="k-${k}" aria-pressed="false"><span class="sw">${sw}</span>${v.ko}<span class="ct">${n}</span></button>`;
  }).join('');
  catBox.innerHTML = CAT_ORDER.map(c => {
    const n = E.filter(e => e.cat === c).length;
    return `<button type="button" class="chip" data-key="${c}" style="--c:var(--c-${c})" aria-pressed="false"><span class="sw"></span>${CATS[c].ko}<span class="ct">${n}</span></button>`;
  }).join('');
  for (const box of [kindBox, catBox]) {
    box.addEventListener('pointerover', ev => {
      const c = ev.target.closest('.chip');
      if (c && state.catHover !== c.dataset.key) { state.catHover = c.dataset.key; applyDim(); }
    });
    box.addEventListener('pointerleave', () => { state.catHover = null; applyDim(); });
    box.addEventListener('click', ev => {
      const c = ev.target.closest('.chip');
      if (!c) return;
      state.catHover = null;
      toggleCatFilter(c.dataset.key);
    });
  }
}

/* ---------- 온도와 상태 ---------- */
const T_MAX = 6000;
const tToPos = T => Math.log10(Math.max(1, T)) / Math.log10(T_MAX) * 1000;
const posToT = p => Math.pow(10, p / 1000 * Math.log10(T_MAX));
const PRESETS = [
  [4, '−269 °C', '액체 헬륨'],
  [77.35, '−196 °C', '액체 질소'],
  [273.15, '0 °C', '물이 어는 온도'],
  [ROOM, '25 °C', '실온'],
  [373.15, '100 °C', '물이 끓는 온도'],
  [1811, '1538 °C', '철이 녹는 온도'],
  [5773, '5500 °C', '태양 표면'],
];
let heatRaf = 0, tweenRaf = 0;
function setT(T) {
  state.T = T;
  $('#t-range').value = Math.round(tToPos(T));
  applyState();
}
function applyState() {
  const T = state.T;
  const cnt = { solid: 0, liquid: 0, gas: 0, unknown: 0 };
  for (const e of E) {
    const ph = phaseAt(e, T);
    cnt[ph]++;
    const b = CELL[e.z];
    if (b._ph !== ph) {
      if (b._ph) b.classList.remove('s-' + b._ph);
      b.classList.add('s-' + ph);
      b._ph = ph;
    }
  }
  $('#t-c').textContent = fmtC(T);
  $('#t-k').textContent = fmtK(T);
  $('#t-stats').innerHTML = ['solid', 'liquid', 'gas', 'unknown']
    .map(k => `<span><i class="k-${k}"></i>${PHASE_KO[k]} <b>${cnt[k]}</b></span>`).join('');
  $$('#t-presets .chip').forEach(c => c.setAttribute('aria-pressed', String(Math.abs(+c.dataset.t - T) < 0.6)));
  if (state.mode === 'state' && (state.hover || state.sel)) renderInset(state.hover || state.sel);
}
function tweenT(target) {
  stopHeat();
  cancelAnimationFrame(tweenRaf);
  const from = tToPos(state.T), to = tToPos(target);
  if (REDUCED) return setT(target);
  const t0 = performance.now(), dur = 700;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
    setT(k === 1 ? target : posToT(from + (to - from) * ease));
    if (k < 1) tweenRaf = requestAnimationFrame(step);
  };
  tweenRaf = requestAnimationFrame(step);
}
function setPlayBtn(btn, playing, idle) {
  btn.querySelector('svg').innerHTML = playing
    ? '<path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
    : '<path d="M7 5v14l11-7z" fill="currentColor"/>';
  btn.querySelector('span').textContent = playing ? '멈추기' : idle;
}
function startHeat() {
  cancelAnimationFrame(tweenRaf);
  let p = tToPos(state.T);
  if (p >= 999) p = 0;
  let last = performance.now();
  setPlayBtn($('#t-play'), true, '가열하기');
  const step = now => {
    p = Math.min(1000, p + (now - last) / 10000 * 1000);
    last = now;
    setT(posToT(p));
    if (p < 1000) heatRaf = requestAnimationFrame(step);
    else stopHeat();
  };
  heatRaf = requestAnimationFrame(step);
}
function stopHeat() {
  if (!heatRaf) return;
  cancelAnimationFrame(heatRaf);
  heatRaf = 0;
  setPlayBtn($('#t-play'), false, '가열하기');
}
function initState() {
  const r = $('#t-range');
  r.addEventListener('input', () => { stopHeat(); cancelAnimationFrame(tweenRaf); setT(posToT(+r.value)); });
  $('#t-play').addEventListener('click', () => (heatRaf ? stopHeat() : startHeat()));
  $('#t-presets').innerHTML = PRESETS.map(([t, c, label]) =>
    `<button type="button" class="chip" data-t="${t}" aria-pressed="false">${label}<span class="ct">${c}</span></button>`).join('');
  $('#t-presets').addEventListener('click', ev => {
    const c = ev.target.closest('.chip');
    if (c) tweenT(+c.dataset.t);
  });
  $('#t-scale').innerHTML = [1, 10, 100, 1000, 6000]
    .map(t => `<span style="left:${tToPos(t) / 10}%">${t.toLocaleString('ko-KR')} K</span>`).join('');
  setT(ROOM);
}

/* ---------- 주기적 성질 ---------- */
const PROPS = {
  rad: {
    ko: '원자 반지름', unit: 'pm', get: e => e.rad,
    cell: v => String(Math.round(v)), full: v => `${Math.round(v)} pm`, axis: v => v,
    mark: e => e.group === 1 && e.z > 1,
    desc: '원자핵에서 가장 바깥 전자까지의 거리예요. 같은 족에서는 아래로 갈수록 전자 껍질이 늘어 커지고, 같은 주기에서는 오른쪽으로 갈수록 유효 핵전하가 커져 작아져요.',
  },
  ie: {
    ko: '이온화 에너지', unit: 'kJ/mol', get: e => e.ie,
    cell: v => Math.round(v).toLocaleString('ko-KR'), full: v => `${Math.round(v).toLocaleString('ko-KR')} kJ/mol`, axis: v => v.toLocaleString('ko-KR'),
    mark: e => e.group === 18,
    desc: '기체 상태의 원자에서 전자 1개를 떼어 내는 데 필요한 에너지예요. 같은 주기에서는 오른쪽으로 갈수록 대체로 커져 18족에서 가장 크고, 같은 족에서는 아래로 갈수록 작아져요.',
  },
  eneg: {
    ko: '전기 음성도', unit: '', get: e => e.eneg, max: 4,
    cell: v => v.toFixed(2), full: v => v.toFixed(2), axis: v => v.toFixed(1),
    mark: e => e.group === 17 && e.eneg != null,
    desc: '공유 결합한 원자가 공유 전자쌍을 끌어당기는 정도예요(폴링 값). 주기율표의 오른쪽 위로 갈수록 커지고, 플루오린(3.98)이 가장 커요. 18족은 대부분 값이 없어요.',
  },
  mp: {
    ko: '녹는점', unit: 'K', get: e => e.mp,
    cell: v => minus(Math.round(v - 273.15)) + '°', full: (v, e) => `${fmtC(v)} (${fmtK(v)})${e && e.mp === e.bp ? ' · 승화' : ''}`, axis: v => v.toLocaleString('ko-KR'),
    mark: e => e.z === 6 || e.z === 74 || e.z === 80,
    desc: '1기압에서 고체가 액체로 변하는 온도예요. 칸에는 °C로, 그래프에는 절대 온도(K)로 나타냈어요. 금속 중에서는 텅스텐이 가장 높고, 탄소는 녹지 않고 승화해요.',
  },
  dens: {
    ko: '밀도', unit: 'g/cm³', get: e => e.dens,
    cell: v => (v < 0.02 ? '기체' : v < 10 ? v.toFixed(2) : v.toFixed(1)), full: v => (v < 0.02 ? `${+(v * 1000).toPrecision(3)} g/L` : `${v} g/cm³`), axis: v => v,
    mark: e => e.z === 76 || e.z === 3,
    desc: '1 cm³당 질량이에요. 주기율표 가운데 아래쪽의 오스뮴과 이리듐이 가장 무겁고, 리튬은 물에 뜰 만큼 가벼워요. 기체 원소는 값이 매우 작아요.',
  },
};
const PERIODS = [[1, 2], [3, 10], [11, 18], [19, 36], [37, 54], [55, 86], [87, 118]];

function initTrend() {
  const seg = $('#prop-seg');
  seg.innerHTML = Object.entries(PROPS).map(([k, p]) => `<button type="button" data-p="${k}" aria-pressed="${k === state.prop}">${p.ko}</button>`).join('');
  seg.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b || b.dataset.p === state.prop) return;
    state.prop = b.dataset.p;
    applyTrend();
    drawChart();
  });
}
function applyTrend() {
  const P = PROPS[state.prop];
  const vals = E.map(P.get).filter(v => v != null);
  const max = P.max || Math.max(...vals);
  for (const e of E) {
    const b = CELL[e.z], v = P.get(e);
    b.classList.toggle('na', v == null);
    b.style.setProperty('--t', v == null ? 0 : Math.max(0.04, v / max).toFixed(3));
    b.querySelector('.val').textContent = v == null ? '—' : P.cell(v);
  }
  $$('#prop-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === state.prop)));
  $('#prop-desc').textContent = P.desc;
  $('#h-min').textContent = state.prop === 'mp' ? '낮음' : '0';
  $('#h-max').textContent = state.prop === 'mp' ? '높음' : `${P.axis(P.max || Math.max(...vals))} ${P.unit}`.trim();
  $('#chart-title').textContent = `원자 번호에 따른 ${P.ko}${P.unit ? ` (${P.unit})` : ''}`;
  if (state.hover || state.sel) renderInset(state.hover || state.sel);
}
function niceStep(max, count) {
  const raw = max / count, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

let CH = null;
function drawChart() {
  const host = $('#chart');
  if (!host || $('#chart-card').hidden) return;
  const W = Math.round(host.clientWidth);
  if (W < 50) return;
  const H = W < 600 ? 230 : 280;
  const P = PROPS[state.prop];
  const m = { l: 50, r: 14, t: 30, b: 34 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b, u = iw / 118;
  const vals = E.map(P.get).filter(v => v != null);
  const vmax = P.max || Math.max(...vals);
  const step = niceStep(vmax, 4), top = Math.ceil(vmax / step - 1e-9) * step;
  const X = z => m.l + (z - 0.5) * u;
  const Y = v => m.t + ih - (v / top) * ih;

  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="원자 번호에 따른 ${P.ko} 그래프">`;
  PERIODS.forEach(([a, b], i) => {
    if (i % 2 === 0) s += `<rect class="ch-band" x="${(X(a) - u / 2).toFixed(1)}" y="${m.t}" width="${((b - a + 1) * u).toFixed(1)}" height="${ih}" rx="4"/>`;
    s += `<text class="ch-per" x="${((X(a) + X(b)) / 2).toFixed(1)}" y="${m.t - 10}">${i + 1}</text>`;
  });
  s += `<text class="ch-axis" x="${m.l - 8}" y="${m.t - 10}" text-anchor="end">주기</text>`;
  for (let v = 0; v <= top + 1e-9; v += step) {
    const y = Y(v).toFixed(1);
    s += `<line class="ch-grid" x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/><text class="ch-axis" x="${m.l - 8}" y="${y}" text-anchor="end" dominant-baseline="central">${P.axis(+v.toFixed(6))}</text>`;
  }
  [1, 20, 40, 60, 80, 100, 118].forEach(z => {
    s += `<text class="ch-axis" x="${X(z).toFixed(1)}" y="${H - m.b + 18}" text-anchor="middle">${z}</text>`;
  });
  s += `<text class="ch-axis" x="${W - m.r}" y="${H - 2}" text-anchor="end">원자 번호 →</text>`;

  let line = '', area = '', len = 0, seg = [];
  const flush = () => {
    if (seg.length > 1) {
      const pts = seg.map(([z, v]) => [X(z), Y(v)]);
      line += 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
      area += `M${pts[0][0].toFixed(1)},${Y(0)}L` + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + `L${pts[pts.length - 1][0].toFixed(1)},${Y(0)}Z`;
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    seg = [];
  };
  for (const e of E) {
    const v = P.get(e);
    if (v == null) flush(); else seg.push([e.z, v]);
  }
  flush();
  s += `<path class="ch-area" d="${area}"/><path class="ch-line" d="${line}" style="--len:${Math.ceil(len)}"/>`;
  for (const e of E) {
    const v = P.get(e);
    if (v == null) continue;
    if (P.mark(e)) {
      s += `<circle class="ch-mark" cx="${X(e.z).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4.5"/><text class="ch-lab" x="${X(e.z).toFixed(1)}" y="${(Y(v) - 10).toFixed(1)}">${e.sym}</text>`;
    } else {
      s += `<circle class="ch-pt" cx="${X(e.z).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="1.6"/>`;
    }
  }
  s += `<g class="ch-hover" id="ch-hover"><line class="ch-cross" id="ch-x" y1="${m.t}" y2="${m.t + ih}"/><circle class="ch-dot" id="ch-d" r="5.5"/></g>`;
  s += `<rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" id="ch-hit"/></svg><div class="tip" id="tip"></div>`;
  host.innerHTML = s;
  CH = { X, Y, W, P };

  const hit = $('#ch-hit');
  const pick = ev => {
    const rect = host.getBoundingClientRect();
    let z = Math.round((ev.clientX - rect.left - m.l) / u + 0.5);
    z = Math.max(1, Math.min(118, z));
    for (let d = 0; d < 6; d++) {
      if (BY[z + d] && P.get(BY[z + d]) != null) return z + d;
      if (BY[z - d] && P.get(BY[z - d]) != null) return z - d;
    }
    return null;
  };
  hit.addEventListener('pointermove', ev => chartFocus(pick(ev), true));
  hit.addEventListener('pointerleave', () => chartFocus(null, true));
  hit.addEventListener('click', ev => { const z = pick(ev); if (z) openDetail(z); });
}
let linkedZ = null;
function chartFocus(z, fromChart) {
  if (!CH) return;
  const g = $('#ch-hover'), tip = $('#tip');
  if (!g) return;
  if (fromChart) {
    if (linkedZ) CELL[linkedZ].classList.remove('linked');
    linkedZ = z;
    if (z) CELL[z].classList.add('linked');
    renderInset(z || state.sel);
  }
  const e = z && BY[z], v = e && CH.P.get(e);
  if (v == null) {
    g.classList.remove('on');
    tip.classList.remove('on');
    return;
  }
  const x = CH.X(z), y = CH.Y(v);
  $('#ch-x').setAttribute('x1', x); $('#ch-x').setAttribute('x2', x);
  $('#ch-d').setAttribute('cx', x); $('#ch-d').setAttribute('cy', y);
  g.classList.add('on');
  tip.innerHTML = `<b>${e.z} ${e.sym}</b> <span>${e.ko}</span><br>${CH.P.full(v, e)}`;
  const left = Math.max(80, Math.min(CH.W - 80, x));
  tip.style.transform = `translate(${left}px, ${y - 14}px) translate(-50%, -100%)`;
  tip.classList.add('on');
}

/* ---------- 발견의 역사 ---------- */
const MILESTONES = [
  [1650, '금, 은, 구리, 철, 납, 주석, 수은, 황, 탄소 등은 고대부터 알려져 있었어요.'],
  [1669, '브란트가 인을 발견했어요. 발견한 사람이 기록된 첫 원소예요.'],
  [1789, '라부아지에가 33가지 ‘원소’ 목록을 발표했어요.'],
  [1807, '데이비가 전기 분해로 포타슘과 소듐을 분리했어요.'],
  [1860, '분젠과 키르히호프가 불꽃의 스펙트럼을 분석해 세슘을 발견했어요.'],
  [1869, '멘델레예프가 주기율표를 발표하고, 아직 발견되지 않은 원소의 자리를 비워 두었어요.'],
  [1894, '레일리와 램지가 아르곤을 발견하며 18족(비활성 기체)이 채워지기 시작했어요.'],
  [1898, '퀴리 부부가 폴로늄과 라듐을 발견했어요.'],
  [1913, '모즐리가 원자 번호의 의미를 밝혀 주기율표의 순서를 바로잡았어요.'],
  [1937, '첫 인공 원소 테크네튬이 만들어졌어요.'],
  [1940, '우라늄보다 무거운 첫 원소 넵투늄이 만들어졌어요.'],
  [1952, '수소 폭탄 실험 잔해에서 아인슈타이늄과 페르뮴이 발견됐어요.'],
  [2010, '테네신이 합성되어 7주기의 118칸이 모두 채워졌어요.'],
];
let yearRaf = 0, lastMile = null;
function applyDiscovery(animate) {
  const Y = state.year;
  let n = 0, born = 0;
  for (const e of E) {
    const known = e.year <= Y;
    if (known) n++;
    const b = CELL[e.z];
    b.classList.toggle('ghost', !known);
    if (animate && known && b._known === false && !REDUCED) {
      b.classList.remove('born');
      void b.offsetWidth;
      b.style.animationDelay = `${born++ * 40}ms`;
      b.classList.add('born');
      setTimeout(() => { b.classList.remove('born'); b.style.animationDelay = ''; }, 900 + born * 40);
    }
    b._known = known;
  }
  $('#y-val').textContent = Y;
  $('#y-count').textContent = n;
  $('#y-range').value = Y;
  const mile = MILESTONES.filter(m => m[0] <= Y).pop();
  if (mile !== lastMile) {
    lastMile = mile;
    const el = $('#y-mile');
    el.innerHTML = `<b>${mile[0] === 1650 ? '고대' : mile[0] + '년'}</b>${mile[1]}`;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
  $$('#y-ticks .mile').forEach(t => t.classList.toggle('on', +t.dataset.y <= Y));
  if (state.mode === 'discovery' && (state.hover || state.sel)) renderInset(state.hover || state.sel);
}
function startYearPlay() {
  let y = state.year >= 2025 ? 1650 : state.year;
  if (y === 1650) { state.year = 1650; applyDiscovery(false); }
  let last = performance.now();
  setPlayBtn($('#y-play'), true, '재생');
  const step = now => {
    y = Math.min(2025, y + (now - last) / 1000 * 30);
    last = now;
    if (Math.floor(y) !== state.year) { state.year = Math.floor(y); applyDiscovery(true); }
    if (y < 2025) yearRaf = requestAnimationFrame(step);
    else stopYearPlay();
  };
  yearRaf = requestAnimationFrame(step);
}
function stopYearPlay() {
  if (!yearRaf) return;
  cancelAnimationFrame(yearRaf);
  yearRaf = 0;
  setPlayBtn($('#y-play'), false, '재생');
}
function initDiscovery() {
  const r = $('#y-range');
  r.addEventListener('input', () => { stopYearPlay(); state.year = +r.value; applyDiscovery(true); });
  $('#y-play').addEventListener('click', () => (yearRaf ? stopYearPlay() : startYearPlay()));
  const pct = y => ((y - 1650) / (2025 - 1650)) * 100;
  $('#y-ticks').innerHTML =
    MILESTONES.slice(1).map(m => `<span class="mile" data-y="${m[0]}" style="left:${pct(m[0])}%"></span>`).join('') +
    [1700, 1800, 1900, 2000].map(y => `<span style="left:${pct(y)}%;top:8px">${y}</span>`).join('');
  for (const e of E) CELL[e.z]._known = e.year <= state.year;
  applyDiscovery(false);
}

/* ---------- 위치 퀴즈 ---------- */
const quiz = { range: 20, n: 10, list: [], i: 0, score: 0, tries: 0, hinted: false, revealed: new Set(), results: [], done: false, lock: false };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bestKey = () => `ptable-quiz-best-${quiz.range}`;
function readBest() { try { return +(localStorage.getItem(bestKey()) || 0); } catch { return 0; } }
function saveBest(v) { try { localStorage.setItem(bestKey(), String(v)); } catch { /* 저장 불가 환경 */ } }

function quizStart() {
  const pool = shuffle(E.filter(e => e.z <= quiz.range).map(e => e.z));
  quiz.list = pool.slice(0, quiz.n).map(z => ({ z, type: Math.random() < 0.3 ? 'num' : 'name' }));
  Object.assign(quiz, { i: 0, score: 0, tries: 0, hinted: false, results: [], done: false, lock: false });
  quiz.revealed.clear();
  applyQuiz();
  renderQuiz();
}
function enterQuiz() { quizStart(); }
function leaveQuiz() {
  for (const e of E) CELL[e.z].classList.remove('qh', 'qx', 'hint', 'shake', 'burst', 'flip');
  for (const e of E) CELL[e.z].setAttribute('aria-label', `${e.z}번 ${e.ko} ${e.sym}`);
}
function applyQuiz() {
  for (const e of E) {
    const b = CELL[e.z];
    const out = e.z > quiz.range, shown = quiz.revealed.has(e.z);
    b.classList.toggle('qx', out);
    b.classList.toggle('qh', !out && !shown);
    b.classList.remove('hint');
    b.setAttribute('aria-label', shown ? `${e.z}번 ${e.ko} ${e.sym}` : `가려진 칸, ${e.f ? e.period + '주기 ' + CATS[e.cat].ko : e.period + '주기 ' + e.group + '족'}`);
  }
}
function quizPrompt(q) {
  const e = BY[q.z];
  return q.type === 'num'
    ? `원자 번호 <span class="q-key"><b>${e.z}</b>번</span> 원소는 어디에 있을까요?`
    : `<span class="q-key"><b>${e.sym}</b>${e.ko}</span>은(는) 어디에 있을까요?`;
}
function renderQuiz(fb = '', tone = '') {
  const box = $('#quiz');
  const ranges = [[20, '1–20번'], [36, '1–36번'], [118, '전체']];
  const rangeSeg = `<div class="seg" role="group" aria-label="문제 범위">${ranges.map(([r, l]) => `<button type="button" data-range="${r}" aria-pressed="${quiz.range === r}">${l}</button>`).join('')}</div>`;
  const dots = `<div class="q-dots" aria-hidden="true">${quiz.list.map((_, i) => `<i class="${quiz.results[i] === true ? 'ok' : quiz.results[i] === false ? 'miss' : i === quiz.i && !quiz.done ? 'now' : ''}"></i>`).join('')}</div>`;
  if (quiz.done) {
    const best = readBest();
    const isBest = quiz.score > best;
    if (isBest) saveBest(quiz.score);
    box.innerHTML = `
      <div class="q-result">
        <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" style="fill:var(--primary-soft)"/><path class="star" style="fill:var(--primary);transform-origin:32px 32px" d="M32 13l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L32 41.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z"/></svg>
        <div>
          <p class="q-step">퀴즈 완료 · ${quiz.range === 118 ? '전체 원소' : `1–${quiz.range}번 원소`}</p>
          <p class="q-prompt">${quiz.n}문제 중 ${quiz.score}문제를 한 번에 맞혔어요!</p>
          <p class="q-fb">${isBest ? '새 최고 기록이에요.' : `최고 기록 ${Math.max(best, quiz.score)}문제`} · 채워진 칸을 눌러 원소를 확인해 보세요.</p>
          ${dots}
        </div>
      </div>
      <div class="q-side">${rangeSeg}<div class="q-actions"><button class="btn primary" type="button" data-q="restart">다시 도전하기</button></div></div>`;
    return;
  }
  const q = quiz.list[quiz.i];
  box.innerHTML = `
    <div>
      <p class="q-step">문제 ${quiz.i + 1} / ${quiz.n} · ${quiz.range === 118 ? '전체 원소' : `1–${quiz.range}번 원소`}</p>
      <p class="q-prompt">${quizPrompt(q)}</p>
      <p class="q-fb ${tone}">${fb || '주기율표에서 알맞은 칸을 눌러 보세요.'}</p>
      ${dots}
    </div>
    <div class="q-side">
      <p class="q-score" style="margin:0"><b>${quiz.score}</b>점</p>
      ${rangeSeg}
      <div class="q-actions">
        <button class="btn sm" type="button" data-q="hint">힌트 보기</button>
        <button class="btn sm" type="button" data-q="restart">처음부터</button>
      </div>
    </div>`;
}
function flipReveal(b, show) {
  b.classList.remove('flip');
  void b.offsetWidth;
  b.classList.add('flip');
  setTimeout(() => b.classList.toggle('qh', !show), REDUCED ? 0 : 180);
  setTimeout(() => b.classList.remove('flip'), 400);
}
function quizClick(z) {
  if (quiz.done) return openDetailFromQuiz(z);
  if (quiz.lock) return;
  const q = quiz.list[quiz.i];
  const e = BY[z], b = CELL[z];
  if (quiz.revealed.has(z) && z !== q.z) return renderQuiz(`${e.ko}(${e.sym})는 이미 찾은 칸이에요.`, '');
  if (z === q.z) {
    const first = quiz.tries === 0 && !quiz.hinted;
    if (first) quiz.score++;
    quiz.results[quiz.i] = first;
    quiz.revealed.add(z);
    quiz.lock = true;
    b.classList.remove('hint');
    flipReveal(b, true);
    setTimeout(() => { b.classList.add('burst'); setTimeout(() => b.classList.remove('burst'), 900); }, 200);
    b.setAttribute('aria-label', `${e.z}번 ${e.ko} ${e.sym}`);
    renderQuiz(`정답이에요! ${e.ko}(${e.sym})는 ${posText(e)}에 있어요.`, 'good');
    setTimeout(() => {
      quiz.lock = false;
      quiz.i++;
      quiz.tries = 0;
      quiz.hinted = false;
      if (quiz.i >= quiz.n) quiz.done = true;
      renderQuiz();
    }, 1300);
    return;
  }
  quiz.tries++;
  b.classList.remove('shake');
  void b.offsetWidth;
  b.classList.add('shake');
  flipReveal(b, true);
  setTimeout(() => { if (!quiz.revealed.has(z)) flipReveal(b, false); b.classList.remove('shake'); }, 1000);
  if (quiz.tries >= 2) {
    CELL[q.z].classList.add('hint');
    renderQuiz(`그 칸은 ${e.ko}(${e.sym})예요. 반짝이는 칸이 정답이에요. 눌러서 확인해 보세요.`, 'bad');
  } else {
    renderQuiz(`아쉬워요. 그 칸은 ${e.ko}(${e.sym})예요. 다시 찾아보세요!`, 'bad');
  }
}
function openDetailFromQuiz(z) {
  if (quiz.revealed.has(z)) openDetail(z);
}
function initQuiz() {
  $('#quiz').addEventListener('click', ev => {
    const r = ev.target.closest('[data-range]');
    if (r) { quiz.range = +r.dataset.range; return quizStart(); }
    const a = ev.target.closest('[data-q]');
    if (!a) return;
    if (a.dataset.q === 'restart') quizStart();
    if (a.dataset.q === 'hint' && !quiz.done) {
      quiz.hinted = true;
      const e = BY[quiz.list[quiz.i].z];
      renderQuiz(`힌트: ${posText(e)}에 있어요.`, '');
    }
  });
}

/* ---------- 시작 ---------- */
function initKeys() {
  document.addEventListener('keydown', ev => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName) && document.activeElement.type !== 'range';
    if (ev.key === '/' && !typing && state.mode !== 'quiz') {
      ev.preventDefault();
      $('#q').focus();
    } else if (ev.key === 'Escape' && !typing) {
      if ($('#drawer').classList.contains('open')) closeDetail();
      else if (state.catFilter) toggleCatFilter(state.catFilter);
    }
  });
}
function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.race([
    document.fonts.load('700 16px "Tamheom Sans"').catch(() => {}),
    new Promise(r => setTimeout(r, 1500)),
  ]);
}
function start() {
  buildTable();
  initLegend();
  initState();
  initTrend();
  initDiscovery();
  initQuiz();
  initTabs();
  initSearch();
  initDrawer();
  initKeys();
  renderInset(null);
  moveIndicator();
  let rz = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => { moveIndicator(); if (state.mode === 'trend') drawChart(); });
  });
  fontsReady().then(() => {
    const t = $('#ptable');
    t.classList.remove('loading');
    moveIndicator();
    if (!REDUCED) {
      t.classList.add('intro');
      setTimeout(() => t.classList.remove('intro'), 1700);
    }
  });
}
start();
