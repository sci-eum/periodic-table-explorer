/* 주기율표 탐험실 — 자료 가공, 표 만들기, 미리보기, 상세 서랍 */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ROOM = 298.15;

const CATS = {
  am: { ko: '알칼리 금속', kind: 'metal' },
  ae: { ko: '알칼리 토금속', kind: 'metal' },
  tm: { ko: '전이 금속', kind: 'metal' },
  pt: { ko: '전이후 금속', kind: 'metal' },
  md: { ko: '준금속', kind: 'metalloid' },
  nm: { ko: '비금속', kind: 'nonmetal' },
  hl: { ko: '할로젠', kind: 'nonmetal' },
  ng: { ko: '비활성 기체', kind: 'nonmetal' },
  ln: { ko: '란타넘족', kind: 'metal' },
  an: { ko: '악티늄족', kind: 'metal' },
  uk: { ko: '성질 미확인', kind: 'unknown' },
};
const CAT_ORDER = ['am', 'ae', 'tm', 'pt', 'md', 'nm', 'hl', 'ng', 'ln', 'an', 'uk'];
const KINDS = {
  metal: { ko: '금속', cats: ['am', 'ae', 'tm', 'pt', 'ln', 'an'] },
  metalloid: { ko: '준금속', cats: ['md'] },
  nonmetal: { ko: '비금속', cats: ['nm', 'hl', 'ng'] },
};
const PHASE_KO = { solid: '고체', liquid: '액체', gas: '기체', unknown: '알 수 없음' };
const SHELL_NAMES = 'KLMNOPQ';

/* ---------- 전자 배치 ---------- */
const ORDER = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'];
const CAP = { s: 2, p: 6, d: 10, f: 14 };
const EXCEPTIONS = {
  24: { '3d': 5, '4s': 1 }, 29: { '3d': 10, '4s': 1 },
  41: { '4d': 4, '5s': 1 }, 42: { '4d': 5, '5s': 1 }, 44: { '4d': 7, '5s': 1 }, 45: { '4d': 8, '5s': 1 },
  46: { '4d': 10, '5s': 0 }, 47: { '4d': 10, '5s': 1 },
  57: { '4f': 0, '5d': 1 }, 58: { '4f': 1, '5d': 1 }, 64: { '4f': 7, '5d': 1 },
  78: { '5d': 9, '6s': 1 }, 79: { '5d': 10, '6s': 1 },
  89: { '5f': 0, '6d': 1 }, 90: { '5f': 0, '6d': 2 }, 91: { '5f': 2, '6d': 1 }, 92: { '5f': 3, '6d': 1 },
  93: { '5f': 4, '6d': 1 }, 96: { '5f': 7, '6d': 1 }, 103: { '6d': 0, '7p': 1 },
};
const CORES = [[2, 'He'], [10, 'Ne'], [18, 'Ar'], [36, 'Kr'], [54, 'Xe'], [86, 'Rn']];

function occupancy(z) {
  const occ = {};
  let left = z;
  for (const o of ORDER) {
    if (left <= 0) break;
    const n = Math.min(CAP[o[1]], left);
    occ[o] = n;
    left -= n;
  }
  if (EXCEPTIONS[z]) Object.assign(occ, EXCEPTIONS[z]);
  return occ;
}
const subOrder = (a, b) => (a[0] - b[0]) || ('spdf'.indexOf(a[1]) - 'spdf'.indexOf(b[1]));
function confHTML(occ, core) {
  return Object.keys(occ)
    .map(k => [k, occ[k] - (core ? core[k] || 0 : 0)])
    .filter(([, n]) => n > 0)
    .sort((a, b) => subOrder(a[0], b[0]))
    .map(([k, n]) => `${k}<sup>${n}</sup>`).join(' ');
}

/* ---------- 원소 목록 ---------- */
const num = s => (s === '' || s == null ? null : +s);
const E = window.ELEMENT_DATA.trim().split('\n').map((line, i) => {
  const f = line.trim().split('|');
  return {
    z: +f[0], sym: f[1], ko: f[2], alt: f[3] || null, en: f[4], massStr: f[5], mass: +f[5], cat: f[6],
    eneg: num(f[7]), mp: num(f[8]), bp: num(f[9]), dens: num(f[10]), year: +f[11], rad: num(f[12]), ie: num(f[13]),
    fact: window.ELEMENT_FACTS.trim().split('\n')[i],
  };
});
const BY = {};
E.forEach(e => {
  BY[e.z] = e;
  Object.assign(e, position(e.z));
  e.block = e.f ? 'f' : (e.group <= 2 || e.z === 2) ? 's' : e.group >= 13 ? 'p' : 'd';
  e.col = e.f ? e.fi + 4 : e.group + 1;
  e.row = e.f ? (e.period === 6 ? 10 : 11) : e.period + 1;
  e.occ = occupancy(e.z);
  const sh = [];
  for (const k in e.occ) sh[+k[0] - 1] = (sh[+k[0] - 1] || 0) + e.occ[k];
  for (let i = 0; i < sh.length; i++) sh[i] = sh[i] || 0;
  while (sh.length && !sh[sh.length - 1]) sh.pop();
  e.shells = sh;
  const core = CORES.filter(c => c[0] < e.z).pop();
  e.confShort = core ? `[${core[1]}] ${confHTML(e.occ, occupancy(core[0]))}` : confHTML(e.occ);
  e.confFull = confHTML(e.occ);
  e.radio = e.z === 43 || e.z === 61 || e.z >= 84;
  e.bracket = e.z === 43 || e.z === 61 || (e.z >= 84 && e.z <= 89) || e.z >= 93;
});

function position(z) {
  if (z <= 2) return { period: 1, group: z === 1 ? 1 : 18 };
  if (z <= 18) {
    const p = z <= 10 ? 2 : 3, o = z - (p === 2 ? 3 : 11);
    return { period: p, group: o < 2 ? o + 1 : o + 11 };
  }
  if (z <= 54) {
    const p = z <= 36 ? 4 : 5;
    return { period: p, group: z - (p === 4 ? 19 : 37) + 1 };
  }
  const p = z <= 86 ? 6 : 7, o = z - (p === 6 ? 55 : 87);
  if (o < 2) return { period: p, group: o + 1 };
  if (o <= 16) return { period: p, group: 3, f: true, fi: o - 2 };
  return { period: p, group: o - 13 };
}

function phaseAt(e, T) {
  if (e.mp == null && e.bp == null) return 'unknown';
  if (e.mp != null && e.mp === e.bp) return T < e.mp ? 'solid' : 'gas';
  if (e.mp != null && T < e.mp) return 'solid';
  if (e.bp != null && T >= e.bp) return 'gas';
  return 'liquid';
}
function valence(e) {
  if (e.f || (e.group >= 3 && e.group <= 12)) return null;
  if (e.group === 18) return 0;
  return e.group <= 2 ? e.group : e.group - 10;
}

/* ---------- 숫자 표시 ---------- */
const minus = s => String(s).replace('-', '−');
function fmtC(K) {
  const c = K - 273.15;
  const s = Math.abs(c) < 100 ? (Math.round(c * 10) / 10).toLocaleString('ko-KR') : Math.round(c).toLocaleString('ko-KR');
  return minus(s === '-0' ? '0' : s) + ' °C';
}
const fmtK = K => (K < 100 ? Math.round(K * 10) / 10 : Math.round(K)).toLocaleString('ko-KR') + ' K';
const massText = e => (e.bracket ? `[${e.massStr}]` : e.massStr);
function densText(e) {
  if (e.dens == null) return null;
  if (phaseAt(e, 273.15) === 'gas') return `${+(e.dens * 1000).toPrecision(3)} g/L <small>(0 °C, 1기압)</small>`;
  return `${e.dens} g/cm³`;
}
const isEst = (e, key) => (e.z === 85 || e.z === 87) || (key === 'bp' && [91, 93, 97, 98, 99].includes(e.z));
const yearText = e => (e.year === 0 ? '고대부터 알려짐' : e.year < 1600 ? `${e.year}년경` : `${e.year}년`);
const posText = e => e.f ? `${e.period}주기 · ${CATS[e.cat].ko}` : `${e.period}주기 · ${e.group}족`;

/* ---------- 상태 ---------- */
const state = {
  mode: 'category', sel: null, hover: null,
  T: ROOM, year: 1869, prop: 'rad',
  catFilter: null, catHover: null, searchSet: null,
};
const CELL = {};
const GRID = {};

/* ---------- 표 만들기 ---------- */
function buildTable() {
  const t = $('#ptable');
  let html = `<div class="hdr corner" style="grid-column:1;grid-row:1" aria-hidden="true"></div>`;
  for (let g = 1; g <= 18; g++) html += `<div class="hdr g" data-g="${g}" style="grid-column:${g + 1};grid-row:1">${g}</div>`;
  for (let p = 1; p <= 7; p++) html += `<div class="hdr p" data-p="${p}" style="grid-column:1;grid-row:${p + 1}">${p}</div>`;
  html += `<div class="spacer" style="grid-row:9"></div>`;
  html += `<div class="flabel" data-f="ln" style="grid-row:10">란타넘족</div><div class="flabel" data-f="an" style="grid-row:11">악티늄족</div>`;
  html += `<button type="button" class="ph" data-ph="ln" style="grid-column:4;grid-row:7;--c:var(--c-ln)" aria-label="란타넘족 57번부터 71번, 아래 줄"><b>57–71</b><span>란타넘족</span></button>`;
  html += `<button type="button" class="ph" data-ph="an" style="grid-column:4;grid-row:8;--c:var(--c-an)" aria-label="악티늄족 89번부터 103번, 아래 줄"><b>89–103</b><span>악티늄족</span></button>`;
  html += `<div class="inset" aria-live="polite"><div class="inset-inner" id="inset-inner"></div></div>`;
  for (const e of E) {
    html += `<button type="button" class="el" data-z="${e.z}" data-cat="${e.cat}" data-row="${e.row}" data-col="${e.col}"${e.ko.length >= 5 ? ' data-long' : ''}
      style="grid-column:${e.col};grid-row:${e.row};--c:var(--c-${e.cat});--i:${e.z};--col:${e.col}"
      aria-label="${e.z}번 ${e.ko} ${e.sym}"><span class="matter"></span><span class="gas"></span><span class="bar"></span><span class="num">${e.z}</span><span class="sym">${e.sym}</span><span class="name">${e.ko}</span><span class="val"></span></button>`;
  }
  t.innerHTML = html;
  $$('.el', t).forEach(b => {
    CELL[b.dataset.z] = b;
    GRID[b.dataset.row + ',' + b.dataset.col] = b;
  });

  t.addEventListener('pointerover', ev => {
    const b = ev.target.closest('.el');
    if (b) hoverEl(+b.dataset.z);
  });
  t.addEventListener('pointerleave', () => hoverEl(null));
  t.addEventListener('focusin', ev => {
    const b = ev.target.closest('.el');
    if (b) hoverEl(+b.dataset.z);
  });
  t.addEventListener('focusout', ev => {
    if (!t.contains(ev.relatedTarget)) hoverEl(null);
  });
  t.addEventListener('click', ev => {
    const b = ev.target.closest('.el');
    if (b) return onCellClick(+b.dataset.z);
    const ph = ev.target.closest('.ph');
    if (ph && state.mode !== 'quiz') toggleCatFilter(ph.dataset.ph);
  });
  t.addEventListener('keydown', ev => {
    const b = ev.target.closest('.el');
    if (!b) return;
    const dir = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[ev.key];
    if (!dir) return;
    ev.preventDefault();
    let r = +b.dataset.row, c = +b.dataset.col;
    for (let k = 0; k < 20; k++) {
      r += dir[0]; c += dir[1];
      if (r < 2 || r > 11 || c < 2 || c > 19) return;
      const nb = GRID[r + ',' + c];
      if (nb) return nb.focus();
    }
  });
}

function hoverEl(z) {
  if (state.hover === z) return;
  state.hover = z;
  $$('.hdr.on, .flabel.on').forEach(h => h.classList.remove('on'));
  if (z && state.mode !== 'quiz') {
    const e = BY[z];
    if (e.f) $(`.flabel[data-f="${e.cat}"]`)?.classList.add('on');
    else $(`.hdr.g[data-g="${e.group}"]`)?.classList.add('on');
    $(`.hdr.p[data-p="${e.period}"]`)?.classList.add('on');
  }
  renderInset(z || state.sel);
  if (state.mode === 'trend' && typeof chartFocus === 'function') chartFocus(z, false);
}

function onCellClick(z) {
  if (state.mode === 'quiz') return quizClick(z);
  openDetail(z);
}

/* ---------- 흐리게 하기(분류 필터, 검색) ---------- */
function catMatch(e, key) {
  if (key.startsWith('k-')) return KINDS[key.slice(2)].cats.includes(e.cat);
  return e.cat === key;
}
function applyDim() {
  let set = null;
  if (state.mode !== 'quiz') {
    const key = state.catHover || state.catFilter;
    if (key) set = new Set(E.filter(e => catMatch(e, key)).map(e => e.z));
    if (state.searchSet) set = set ? new Set([...set].filter(z => state.searchSet.has(z))) : state.searchSet;
  }
  const pulse = state.mode !== 'quiz' && state.searchSet && state.searchSet.size <= 12;
  for (const e of E) {
    const b = CELL[e.z];
    b.classList.toggle('dim', !!set && !set.has(e.z));
    b.classList.toggle('match', !!pulse && state.searchSet.has(e.z));
  }
  $$('.ph').forEach(ph => {
    const has = !set || E.some(e => e.cat === ph.dataset.ph && set.has(e.z));
    ph.classList.toggle('dim', !has);
  });
  const none = state.mode !== 'quiz' && state.searchSet && state.searchSet.size === 0;
  $('#empty').hidden = !none;
  if (none) $('#empty-title').textContent = `‘${$('#q').value.trim()}’에 해당하는 원소가 없어요`;
}
function toggleCatFilter(key) {
  state.catFilter = state.catFilter === key ? null : key;
  $$('#kind-chips .chip, #cat-chips .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.key === state.catFilter)));
  applyDim();
}

/* ---------- 검색 ---------- */
function searchMatches(q) {
  q = q.trim();
  if (!q) return null;
  const ql = q.toLowerCase();
  if (/^\d+$/.test(q)) return new Set(BY[+q] ? [+q] : []);
  const set = new Set();
  for (const e of E) {
    if (e.sym.toLowerCase() === ql || e.ko.includes(q) || (e.alt && e.alt.includes(q)) ||
        e.en.toLowerCase().startsWith(ql) || CATS[e.cat].ko.includes(q)) set.add(e.z);
  }
  return set;
}
function bestMatch(q) {
  const ql = q.trim().toLowerCase();
  const exact = E.find(e => e.sym.toLowerCase() === ql || e.ko === q.trim() || e.alt === q.trim() || String(e.z) === ql);
  return exact ? exact.z : state.searchSet && state.searchSet.size ? [...state.searchSet][0] : null;
}
function initSearch() {
  const q = $('#q');
  q.addEventListener('input', () => {
    state.searchSet = searchMatches(q.value);
    applyDim();
  });
  q.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && !ev.isComposing) {
      const z = bestMatch(q.value);
      if (z) openDetail(z);
    } else if (ev.key === 'Escape') {
      q.value = '';
      state.searchSet = null;
      applyDim();
      q.blur();
    }
  });
}

/* ---------- 미리보기 창 ---------- */
const ATOM_ILL = `<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ill-bg" cx="60" cy="60" r="56"/>
  <g class="logo-spin" style="transform-origin:60px 60px;animation-duration:7s"><ellipse class="ill-ring" cx="60" cy="60" rx="40" ry="15"/><circle class="ill-e" cx="100" cy="60" r="5"/></g>
  <g class="logo-spin" style="transform-origin:60px 60px;animation-duration:9s;animation-direction:reverse"><ellipse class="ill-ring" cx="60" cy="60" rx="40" ry="15" transform="rotate(60 60 60)"/><circle class="ill-e" cx="80" cy="25.4" r="5"/></g>
  <circle class="ill-nuc" cx="60" cy="60" r="11"/><circle cx="56" cy="57" r="2" style="fill:var(--on-primary)"/><circle cx="64" cy="57" r="2" style="fill:var(--on-primary)"/>
  <path d="M56 63q4 3 8 0" style="stroke:var(--on-primary)" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

function insetModeLine(e) {
  switch (state.mode) {
    case 'state': {
      const ph = phaseAt(e, state.T);
      const mp = e.mp == null ? '자료 없음' : fmtC(e.mp);
      if (e.mp != null && e.mp === e.bp) return `${fmtC(state.T)}에서 <b>${PHASE_KO[ph]}</b> · 승화점 ${mp}`;
      return `${fmtC(state.T)}에서 <b>${PHASE_KO[ph]}</b> · 녹는점 ${e.z === 2 ? '없음' : mp} · 끓는점 ${e.bp == null ? '자료 없음' : fmtC(e.bp)}`;
    }
    case 'trend': {
      const P = PROPS[state.prop], v = P.get(e);
      return `${P.ko} <b>${v == null ? '자료 없음' : P.full(v, e)}</b>`;
    }
    case 'discovery':
      return e.year <= state.year ? `<b>${yearText(e)}</b>${e.year ? ' 발견' : ''}` : `아직 발견 전 · <b>${yearText(e)}</b>에 발견돼요`;
    default:
      return `실온에서 <b>${PHASE_KO[phaseAt(e, ROOM)]}</b> · 원자가 전자 ${valence(e) ?? '—'}${valence(e) == null ? '' : '개'}`;
  }
}
function renderInset(z) {
  const box = $('#inset-inner');
  if (!box) return;
  if (state.mode === 'quiz') {
    box.style.removeProperty('--c');
    box.innerHTML = `<div class="ins-empty">${ATOM_ILL}<div class="ins-body"><p class="ins-name">칸이 모두 가려졌어요</p><p class="ins-line">위쪽의 족 번호와 왼쪽의 주기 번호를 단서로 원소의 자리를 찾아보세요.</p></div></div>`;
    return;
  }
  if (!z) {
    box.style.removeProperty('--c');
    box.innerHTML = `<div class="ins-empty">${ATOM_ILL}<div class="ins-body"><p class="ins-name">궁금한 원소에 마우스를 올려 보세요</p><p class="ins-line">누르면 원자 모형과 자세한 성질이 열려요. 키보드 화살표로도 움직일 수 있어요.</p></div></div>`;
    return;
  }
  const e = BY[z];
  box.style.setProperty('--c', `var(--c-${e.cat})`);
  box.innerHTML = `
    <div class="ins-tile swap"><span class="ins-num">${e.z}</span><span class="ins-sym">${e.sym}</span><span class="ins-mass">${massText(e)}</span></div>
    <div class="ins-body swap">
      <span class="ins-cat"><i></i>${CATS[e.cat].ko} · ${posText(e)}</span>
      <p class="ins-name">${e.ko}<small>${e.en}</small></p>
      <p class="ins-line">${e.confShort}</p>
      <p class="ins-line">${insetModeLine(e)}</p>
    </div>`;
}

/* ---------- 상세 서랍 ---------- */
function bohrSVG(e) {
  const sh = e.shells, n = sh.length;
  const radii = sh.map((_, i) => (n === 1 ? 54 : 36 + i * (82 / (n - 1))));
  const step = Math.min(45, 1500 / e.z);
  let k = 0;
  let s = `<svg class="bohr" viewBox="-130 -130 260 260" role="img" aria-label="${e.ko}의 보어 원자 모형, 전자 껍질 ${sh.join(', ')}">
    <defs><radialGradient id="nucg" cx="38%" cy="35%" r="70%"><stop offset="0" style="stop-color:color-mix(in oklab,var(--c) 35%,#fff)"/><stop offset="1" style="stop-color:var(--c)"/></radialGradient></defs>`;
  radii.forEach(r => { s += `<circle class="ring" r="${r.toFixed(1)}"/>`; });
  sh.forEach((cnt, i) => {
    const r = radii[i];
    const er = Math.min(4.4, (2 * Math.PI * r / cnt) * 0.3);
    const dur = (7 + i * 4.5).toFixed(1);
    s += `<g class="orbit${i % 2 ? ' rev' : ''}" style="--dur:${dur}s"><circle r="${r.toFixed(1)}" fill="none" stroke="none"/>`;
    for (let j = 0; j < cnt; j++) {
      const a = (j / cnt) * Math.PI * 2 - Math.PI / 2;
      s += `<circle class="e" cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="${er.toFixed(2)}" style="animation-delay:${Math.round(k++ * step)}ms"/>`;
    }
    s += `</g>`;
    const la = Math.PI / 5;
    s += `<text class="shl" x="${(Math.cos(la) * r + 4).toFixed(1)}" y="${(Math.sin(la) * r + 4).toFixed(1)}">${SHELL_NAMES[i]}</text>`;
  });
  s += `<circle class="nuc" r="${e.z > 20 ? 21 : 17}" fill="url(#nucg)"/><text class="nuc-t">+${e.z}</text></svg>`;
  return s;
}

function kv(label, value, wide) {
  return `<div class="kv${wide ? ' wide' : ''}"><dt>${label}</dt><dd>${value ?? '<small>자료 없음</small>'}</dd></div>`;
}
function detailHTML(e) {
  const cat = CATS[e.cat];
  const val = valence(e);
  const neutrons = Math.round(e.mass) - e.z;
  const outerIdx = e.shells.length - 1;
  const fam = e.f ? E.filter(x => x.cat === e.cat) : E.filter(x => !x.f && x.group === e.group);
  const prev = BY[e.z - 1], next = BY[e.z + 1];
  const est = key => (isEst(e, key) ? ' <small>(추정)</small>' : '');
  let melt, boil;
  if (e.mp != null && e.mp === e.bp) {
    melt = kv('승화점 (1기압)', `${fmtC(e.mp)} <small>${fmtK(e.mp)}</small>`);
    boil = kv('녹는점', '<small>1기압에서는 녹지 않고 승화</small>');
  } else {
    melt = kv('녹는점', e.z === 2 ? '<small>1기압에서는 얼지 않음</small>' : e.mp == null ? null : `${fmtC(e.mp)} <small>${fmtK(e.mp)}</small>${est('mp')}`);
    boil = kv('끓는점', e.bp == null ? null : `${fmtC(e.bp)} <small>${fmtK(e.bp)}</small>${est('bp')}`);
  }
  return `
    <div class="d-head">
      <div class="d-tile"><span class="d-num">${e.z}</span><span class="d-sym">${e.sym}</span><span class="d-mass">${massText(e)}</span></div>
      <div class="d-titles">
        <div class="badges"><span class="badge"><i></i>${cat.ko}</span>${e.radio ? '<span class="badge radio"><i></i>방사성</span>' : ''}</div>
        <h2 id="d-title">${e.ko}${e.alt ? ` <small>(${e.alt})</small>` : ''}</h2>
        <p class="d-en">${e.en} · ${posText(e)} · ${e.block} 블록</p>
      </div>
      <button class="icon-btn" type="button" data-act="close" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>

    <section class="d-atom">
      <div class="d-atom-head"><p class="d-label">보어 원자 모형</p>
        <button class="btn sm" type="button" data-act="replay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>전자 다시 채우기</button>
      </div>
      <div class="bohr-box">${bohrSVG(e)}</div>
      <div class="shells">${e.shells.map((c, i) => `<span class="${i === outerIdx ? 'outer' : ''}">${SHELL_NAMES[i]} <b>${c}</b></span>`).join('')}</div>
    </section>

    <p class="d-fact"><span class="d-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>알고 있나요?</span>${e.fact}</p>

    <dl class="d-grid">
      ${kv('전자 배치', `${e.confShort}${e.z > 2 ? `<span class="conf-full">${e.confFull}</span>` : ''}`, true)}
      ${kv('원자량', `${massText(e)}${e.bracket ? ' <small>질량수</small>' : ''}`)}
      ${kv('양성자 · 중성자', `${e.z} · ${neutrons} <small>(근삿값)</small>`)}
      ${kv('원자가 전자', val == null ? '<small>전이 원소는 따로 정하지 않아요</small>' : `${val}개${e.group === 18 ? ' <small>(18족은 0)</small>' : ''}`)}
      ${kv('가장 바깥 껍질 전자', `${e.shells[outerIdx]}개 <small>(${SHELL_NAMES[outerIdx]} 껍질)</small>`)}
      ${kv('실온(25 °C) 상태', e.mp == null && e.bp == null ? null : PHASE_KO[phaseAt(e, ROOM)])}
      ${kv('밀도', densText(e))}
      ${melt}
      ${boil}
      ${kv('전기 음성도', e.eneg == null ? null : e.eneg.toFixed(2))}
      ${kv('이온화 에너지', e.ie == null ? null : `${e.ie.toLocaleString('ko-KR')} <small>kJ/mol</small>`)}
      ${kv('원자 반지름', e.rad == null ? null : `${e.rad} <small>pm</small>`)}
      ${kv('발견', yearText(e))}
    </dl>

    <section>
      <p class="d-label" style="margin-bottom:8px">${e.f ? `같은 계열 (${cat.ko})` : `같은 족 (${e.group}족)`}</p>
      <div class="fam">${fam.map(x => `<button type="button" data-go="${x.z}" class="${x.z === e.z ? 'me' : ''}" style="--c:var(--c-${x.cat})" aria-label="${x.z}번 ${x.ko}"><b>${x.sym}</b><span>${x.z}</span></button>`).join('')}</div>
    </section>

    <nav class="d-nav" aria-label="이전 다음 원소">
      <button class="btn" type="button" data-go="${prev ? prev.z : ''}" ${prev ? '' : 'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg><span><small>이전</small>${prev ? `${prev.z} ${prev.ko}` : '—'}</span></button>
      <button class="btn next" type="button" data-go="${next ? next.z : ''}" ${next ? '' : 'disabled'}><span><small>다음</small>${next ? `${next.z} ${next.ko}` : '—'}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg></button>
    </nav>`;
}

let lastFocus = null;
function openDetail(z) {
  const e = BY[z];
  const drawer = $('#drawer'), body = $('#drawer-body');
  if (!drawer.classList.contains('open')) lastFocus = document.activeElement;
  if (state.sel) CELL[state.sel]?.classList.remove('sel');
  state.sel = z;
  CELL[z].classList.add('sel');
  body.style.setProperty('--c', `var(--c-${e.cat})`);
  body.innerHTML = detailHTML(e);
  body.scrollTop = 0;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  $('#scrim').classList.add('on');
  $('[data-act="close"]', body).focus({ preventScroll: true });
}
function closeDetail() {
  const drawer = $('#drawer');
  if (!drawer.classList.contains('open')) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  $('#scrim').classList.remove('on');
  if (state.sel) CELL[state.sel]?.classList.remove('sel');
  state.sel = null;
  renderInset(state.hover);
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
function initDrawer() {
  const body = $('#drawer-body');
  body.addEventListener('click', ev => {
    const act = ev.target.closest('[data-act]');
    if (act?.dataset.act === 'close') return closeDetail();
    if (act?.dataset.act === 'replay') {
      $('.bohr-box', body).innerHTML = bohrSVG(BY[state.sel]);
      return;
    }
    const go = ev.target.closest('[data-go]');
    if (go && go.dataset.go) openDetail(+go.dataset.go);
  });
  $('#scrim').addEventListener('click', closeDetail);
  $('#drawer').addEventListener('keydown', ev => {
    if (!state.sel) return;
    if (ev.key === 'ArrowRight' && BY[state.sel + 1]) openDetail(state.sel + 1);
    if (ev.key === 'ArrowLeft' && BY[state.sel - 1]) openDetail(state.sel - 1);
  });
}
