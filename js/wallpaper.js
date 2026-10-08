/* 주기율표 배경화면 — 클릭 없이 스스로 움직여요.
   원소 하나가 차례로 빛나며 오른쪽에 원자 모형과 이야기가 나오고, 표의 보기 방식은 일정 시간마다 바뀌어요.
   주소 뒤 옵션: ?speed=20 (원소 바뀌는 간격, 초) &view=90 (보기 바뀌는 간격, 초)
                &views=category,state,trend,discovery (보여 줄 보기와 순서) &order=seq (원자 번호 순서, 기본은 무작위) */
'use strict';

const TREND_KEYS = ['rad', 'ie', 'eneg'];
const T_LO = 10, T_HI = 6000;
const Y_LO = 1650, Y_HI = 2025;

const VIEWS = {
  category: { ko: '원소 분류', enter: enterCategory },
  state: { ko: '온도와 상태', enter: enterState, tick: tickState },
  trend: { ko: '주기적 성질', enter: enterTrend },
  discovery: { ko: '발견의 역사', enter: enterDiscovery, tick: tickDiscovery },
};

/* ---------- 주소 옵션 ---------- */
const params = new URLSearchParams(location.search);
function numParam(key, lo, hi, def) {
  const raw = params.get(key);
  const n = raw == null || raw.trim() === '' ? NaN : Number(raw);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
}
const viewList = (params.get('views') || '').split(',').map(s => s.trim()).filter(v => VIEWS[v]);
const OPT = {
  speed: numParam('speed', 5, 600, 20),
  view: numParam('view', 20, 3600, 90),
  views: viewList.length ? viewList : Object.keys(VIEWS),
  order: params.get('order') === 'seq' ? 'seq' : 'random',
};

const wp = { view: null, viewIdx: -1, viewStart: 0, spot: null, spotStart: 0, deck: [], trendIdx: -1, lastMile: null };
const CELLS = {};
const now = () => performance.now();
const wt = $('#wt'), spotBox = $('#spot');

/* ---------- 화면 크기 맞추기 ---------- */
function fit() {
  const s = Math.min(innerWidth / 1600, innerHeight / 900);
  $('#stage').style.setProperty('--s', s.toFixed(4));
}

/* ---------- 표 ---------- */
function buildBoard() {
  let html = `<div class="hdr" style="grid-column:1;grid-row:1"></div>`;
  for (let g = 1; g <= 18; g++) html += `<div class="hdr" style="grid-column:${g + 1};grid-row:1">${g}</div>`;
  for (let p = 1; p <= 7; p++) html += `<div class="hdr" style="grid-column:1;grid-row:${p + 1}">${p}</div>`;
  html += `<div class="flabel" style="grid-row:10">란타넘족</div><div class="flabel" style="grid-row:11">악티늄족</div>`;
  html += `<div class="ph" style="grid-column:4;grid-row:7;--cat:var(--c-ln)"><b>57–71</b><span>란타넘족</span></div>`;
  html += `<div class="ph" style="grid-column:4;grid-row:8;--cat:var(--c-an)"><b>89–103</b><span>악티늄족</span></div>`;
  html += `<div class="legend" id="legend"></div>`;
  for (const e of E) {
    html += `<div class="cell" data-z="${e.z}" style="grid-column:${e.col};grid-row:${e.row};--cat:var(--c-${e.cat});--i:${e.z}"><span class="num">${e.z}</span><span class="sym">${e.sym}</span><span class="name">${e.ko}</span></div>`;
  }
  wt.innerHTML = html;
  $$('.cell', wt).forEach(c => { CELLS[c.dataset.z] = c; });
  wt.addEventListener('animationend', ev => {
    if (ev.animationName !== 'born') return;
    ev.target.classList.remove('born');
    ev.target.style.animationDelay = '';
  });
}

function renderViewDots() {
  $('#views').innerHTML = OPT.views.map(v => `<li data-v="${v}"><i></i>${VIEWS[v].ko}</li>`).join('');
}

function setLegend(html) {
  const lg = $('#legend');
  lg.innerHTML = html;
  lg.style.animation = 'none';
  void lg.offsetWidth;
  lg.style.animation = '';
}

/* ---------- 보기 전환 ---------- */
function nextView() {
  wp.viewIdx = (wp.viewIdx + 1) % OPT.views.length;
  wp.view = OPT.views[wp.viewIdx];
  wp.viewStart = now();
  wt.dataset.view = wp.view;
  for (const e of E) {
    const c = CELLS[e.z];
    c.classList.remove('ghost', 'na', 'born');
    c.removeAttribute('data-ph');
  }
  $$('#views li').forEach(li => li.classList.toggle('on', li.dataset.v === wp.view));
  VIEWS[wp.view].enter();
  renderSpotLine();
}

function enterCategory() {
  const counts = {};
  E.forEach(e => { counts[e.cat] = (counts[e.cat] || 0) + 1; });
  setLegend(`
    <p class="lg-title">원소 분류<small>화학적 성질이 비슷한 원소끼리 같은 색이에요</small></p>
    <div class="lg-chips">${CAT_ORDER.map(k => `<span class="lg-chip" style="--c:var(--c-${k})"><i></i>${CATS[k].ko} ${counts[k]}</span>`).join('')}</div>
    <p class="lg-text">왼쪽은 금속, 오른쪽 위는 비금속이에요. 그 사이 계단 모양의 경계에 준금속이 있어요.</p>`);
}

/* 온도: 보기 시간 동안 10 K에서 6000 K까지 로그 눈금으로 천천히 올라가요 */
let curT = ROOM;
function enterState() {
  setLegend(`
    <p class="lg-title">온도와 상태<small>1기압에서 온도가 오르면 원소가 녹고 끓어요</small></p>
    <div class="lg-big"><b id="lg-tc">—</b><span id="lg-tk"></span></div>
    <div class="thermo" id="lg-thermo"><i></i></div>
    <div class="lg-chips">
      <span class="lg-chip" style="--c:var(--solid)"><i></i>고체 <b id="lg-n-solid">0</b></span>
      <span class="lg-chip" style="--c:var(--liquid)"><i></i>액체 <b id="lg-n-liquid">0</b></span>
      <span class="lg-chip" style="--c:var(--gas)"><i></i>기체 <b id="lg-n-gas">0</b></span>
    </div>`);
  tickState(0);
}
function tickState(p) {
  const q = Math.min(1, p / 0.9);
  const T = Math.pow(10, Math.log10(T_LO) + (Math.log10(T_HI) - Math.log10(T_LO)) * q);
  curT = T;
  const n = { solid: 0, liquid: 0, gas: 0, unknown: 0 };
  for (const e of E) {
    const ph = phaseAt(e, T);
    n[ph]++;
    const c = CELLS[e.z];
    if (c.dataset.ph !== ph) c.dataset.ph = ph;
  }
  $('#lg-tc').textContent = fmtC(T);
  $('#lg-tk').textContent = fmtK(T);
  $('#lg-thermo').style.setProperty('--p', q.toFixed(4));
  for (const k of ['solid', 'liquid', 'gas']) $(`#lg-n-${k}`).textContent = n[k];
  renderSpotLine();
}

/* 성질: 들어올 때마다 원자 반지름 → 이온화 에너지 → 전기 음성도 순으로 바뀌어요 */
function enterTrend() {
  wp.trendIdx = (wp.trendIdx + 1) % TREND_KEYS.length;
  const P = PROPS[TREND_KEYS[wp.trendIdx]];
  const vals = E.map(P.get).filter(v => v != null);
  const max = P.max || Math.max(...vals);
  for (const e of E) {
    const v = P.get(e), c = CELLS[e.z];
    c.classList.toggle('na', v == null);
    c.style.setProperty('--t', v == null ? 0 : Math.max(0.04, v / max).toFixed(3));
  }
  setLegend(`
    <p class="lg-title">${P.ko}<small>색이 진할수록 값이 커요</small></p>
    <div class="lg-ramp"><span>작음</span><i></i><span>${P.axis(max)} ${P.unit}</span></div>
    <p class="lg-text">${P.desc}</p>`);
}

/* 발견: 보기 시간의 85% 동안 1650년부터 2025년까지 흘러가요 */
function enterDiscovery() {
  setLegend(`
    <p class="lg-title">발견의 역사<small>그해까지 알려진 원소만 나타나요</small></p>
    <div class="lg-big"><b id="lg-year">—</b><span id="lg-count"></span></div>
    <p class="lg-text" id="lg-mile"></p>`);
  wp.lastMile = null;
  for (const e of E) CELLS[e.z]._known = null;
  tickDiscovery(0);
}
function tickDiscovery(p) {
  const Y = Math.round(Y_LO + (Y_HI - Y_LO) * Math.min(1, p / 0.85));
  let n = 0, born = 0;
  for (const e of E) {
    const known = e.year <= Y, c = CELLS[e.z];
    if (known) n++;
    if (c._known === known) continue;
    c.classList.toggle('ghost', !known);
    if (known && c._known === false) {
      c.classList.remove('born');
      void c.offsetWidth;
      c.style.animationDelay = `${born++ * 60}ms`;
      c.classList.add('born');
    }
    c._known = known;
  }
  $('#lg-year').textContent = `${Y}년`;
  $('#lg-count').textContent = `${n}개 원소`;
  const mile = MILESTONES.filter(m => m[0] <= Y).pop();
  if (mile !== wp.lastMile) {
    wp.lastMile = mile;
    $('#lg-mile').innerHTML = `<b>${mile[0] === 1650 ? '고대' : mile[0] + '년'}</b>${mile[1]}`;
  }
  wp.year = Y;
  renderSpotLine();
}

/* ---------- 스포트라이트 ---------- */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function drawZ() {
  if (OPT.order === 'seq') return wp.spot ? (wp.spot % E.length) + 1 : 1;
  if (!wp.deck.length) {
    wp.deck = shuffle(E.map(e => e.z));
    if (wp.deck[wp.deck.length - 1] === wp.spot) wp.deck.unshift(wp.deck.pop());
  }
  return wp.deck.pop();
}

function spotLine(e) {
  switch (wp.view) {
    case 'state': {
      const ph = phaseAt(e, curT);
      return ['지금 온도에서', ph === 'unknown' ? '자료 없음' : `<b>${PHASE_KO[ph]}</b> <small>(${fmtC(curT)})</small>`];
    }
    case 'trend': {
      const P = PROPS[TREND_KEYS[wp.trendIdx]], v = P.get(e);
      return [P.ko, v == null ? '자료 없음' : `<b>${P.full(v, e)}</b>`];
    }
    case 'discovery':
      return ['발견', e.year <= (wp.year ?? Y_HI) ? `<b>${yearText(e)}</b>` : `아직 발견 전 · <b>${yearText(e)}</b>`];
    default:
      return ['실온(25 °C) 상태', e.mp == null && e.bp == null ? '자료 없음' : `<b>${PHASE_KO[phaseAt(e, ROOM)]}</b>`];
  }
}
function renderSpotLine() {
  const dd = $('#sp-mode');
  if (!dd || !wp.spot) return;
  const [label, value] = spotLine(BY[wp.spot]);
  const html = `<dt>${label}</dt><dd>${value}</dd>`;
  if (dd.innerHTML !== html) dd.innerHTML = html;
}

function spotHTML(e) {
  const outer = e.shells.length - 1;
  return `
    <div class="sp-top"><span>지금 빛나는 원소</span><span class="sp-bar"><i style="--dur:${OPT.speed}s"></i></span></div>
    <div class="sp-head">
      <div class="sp-tile"><span class="n">${e.z}</span><span class="s">${e.sym}</span><span class="m">${massText(e)}</span></div>
      <div class="sp-titles">
        <span class="sp-badge"><i></i>${CATS[e.cat].ko}</span>
        <p class="sp-name">${e.ko}${e.alt ? `<small>${e.alt}</small>` : ''}</p>
        <p class="sp-en">${e.en} · ${posText(e)}</p>
      </div>
    </div>
    <div class="sp-atom">${bohrSVG(e)}<div class="shells">${e.shells.map((c, i) => `<span class="${i === outer ? 'outer' : ''}">${SHELL_NAMES[i]} ${c}</span>`).join('')}</div></div>
    <p class="sp-fact"><b>알고 있나요?</b>${e.fact}</p>
    <dl class="sp-kv">
      <div><dt>전자 배치</dt><dd>${e.confShort}</dd></div>
      <div id="sp-mode"></div>
      <div><dt>원자량</dt><dd>${massText(e)}</dd></div>
    </dl>`;
}

let swapTimer = 0;
function nextSpot() {
  const z = drawZ();
  const prev = wp.spot;
  wp.spot = z;
  wp.spotStart = now();
  if (prev) CELLS[prev].classList.remove('lit');
  CELLS[z].classList.add('lit');
  const e = BY[z];
  const show = () => {
    spotBox.classList.remove('out');
    spotBox.style.setProperty('--c', `var(--c-${e.cat})`);
    spotBox.innerHTML = spotHTML(e);
    renderSpotLine();
  };
  clearTimeout(swapTimer);
  if (prev) {
    spotBox.classList.add('out');
    swapTimer = setTimeout(show, 450);
  } else show();
}

/* ---------- 시계 ---------- */
function tick() {
  const t = now();
  if (t - wp.viewStart >= OPT.view * 1000) nextView();
  const v = VIEWS[wp.view];
  if (v.tick) v.tick(Math.min(1, (t - wp.viewStart) / (OPT.view * 1000)));
  if (t - wp.spotStart >= OPT.speed * 1000) nextSpot();
}

function start() {
  fit();
  addEventListener('resize', fit);
  buildBoard();
  renderViewDots();
  nextView();
  nextSpot();
  setInterval(tick, 250);
}
start();
