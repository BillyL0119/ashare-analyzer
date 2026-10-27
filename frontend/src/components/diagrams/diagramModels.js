// Geometry for the diagram lab. Every diagram is drawn in model units (x and y from 0 to 10) and
// built from a small state object (curve shifts, a tax, a price line...). build() returns a scene
// for DiagramSVG plus the facts the explanation needs. Curves are straight lines y = a + b·x unless
// noted; "shifting right by d" keeps the slope and moves the line d units along the x axis.
//
// Labels use "_" for subscripts: 'S_1', 'P_{max}', 'D£_2'. The numbers are model units only: no
// real-world figure is ever drawn on a diagram (case figures are shown beside it, as quoted).

export const LO = 0.25
export const HI = 9.75
const SMALL = 0.12

const at = (L, x) => L[0] + L[1] * x
const xAt = (L, y) => (y - L[0]) / L[1]
const meet = (A, B) => { const x = (A[0] - B[0]) / (B[1] - A[1]); return [x, at(A, x)] }
const shiftX = (L, d) => [L[0] - L[1] * d, L[1]]          // move right by d
const shiftY = (L, d) => [L[0] + d, L[1]]                 // move up by d
const moved = (v) => Math.abs(v || 0) > SMALL
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round = (v, n = 2) => Math.round(v * 10 ** n) / 10 ** n

// Part of y = a + b·x inside the box [lo, hi]²
function seg(L, lo = LO, hi = HI) {
  const [a, b] = L
  if (Math.abs(b) < 1e-9) return a >= lo && a <= hi ? [[lo, a], [hi, a]] : null
  const xa = (lo - a) / b, xb = (hi - a) / b
  const x0 = Math.max(lo, Math.min(xa, xb)), x1 = Math.min(hi, Math.max(xa, xb))
  return x1 - x0 > 0.05 ? [[x0, at(L, x0)], [x1, at(L, x1)]] : null
}
const vseg = (x) => [[x, LO], [x, HI]]

// Polygon clipped to [0, 10]² (Sutherland–Hodgman)
function clipPoly(pts, lo = 0, hi = 10) {
  const edges = [
    [(p) => p[0] >= lo, (p, q) => [lo, p[1] + (q[1] - p[1]) * (lo - p[0]) / (q[0] - p[0])]],
    [(p) => p[0] <= hi, (p, q) => [hi, p[1] + (q[1] - p[1]) * (hi - p[0]) / (q[0] - p[0])]],
    [(p) => p[1] >= lo, (p, q) => [p[0] + (q[0] - p[0]) * (lo - p[1]) / (q[1] - p[1]), lo]],
    [(p) => p[1] <= hi, (p, q) => [p[0] + (q[0] - p[0]) * (hi - p[1]) / (q[1] - p[1]), hi]],
  ]
  let out = pts
  for (const [inside, cut] of edges) {
    const src = out; out = []
    src.forEach((p, i) => {
      const q = src[(i + 1) % src.length]
      if (inside(p)) { out.push(p); if (!inside(q)) out.push(cut(p, q)) } else if (inside(q)) out.push(cut(p, q))
    })
    if (!out.length) return []
  }
  return out
}
const area = (kind, pts, label) => ({ kind, pts: clipPoly(pts), label })
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

// A curve shown before and after a change: the old one faded, the new one draggable
function pair(base, now, isMoved, name, kind, drag) {
  if (!isMoved) return [{ pts: seg(base), label: name, kind, drag }]
  return [{ pts: seg(base), label: `${name}_1`, kind, faded: true }, { pts: seg(now), label: `${name}_2`, kind, drag }]
}

// Horizontal arrow from one parallel line to another, at the first height where both are in view
function shiftArrow(A, B, levels) {
  for (const y of levels) {
    const xa = xAt(A, y), xb = xAt(B, y)
    if (xa > 0.6 && xa < 9.4 && xb > 0.6 && xb < 9.4) return { from: [xa, y], to: [xb, y] }
  }
  return null
}

// ── Supply and demand (also the currency market) ────────────────────────────

const D0 = [9, -0.8]
const S0 = [1, 0.8]

function marketScene(st, n, aria) {
  const dd = moved(st.dD) ? st.dD : 0, ds = moved(st.dS) ? st.dS : 0
  const D = shiftX(D0, dd), S = shiftX(S0, ds)
  const e1 = meet(D0, S0), e2 = meet(D, S)
  const changed = !!(dd || ds)
  const lines = [
    ...pair(D0, D, !!dd, n.D, 'd', { key: 'dD', axis: 'x', min: -3.5, max: 3.5, aria: aria.d }),
    ...pair(S0, S, !!ds, n.S, 's', { key: 'dS', axis: 'x', min: -3.5, max: 3.5, aria: aria.s }),
  ]
  const arrows = []
  if (dd) arrows.push(shiftArrow(D0, D, [2.4, 3.4, 6.6, 7.6]))
  if (ds) arrows.push(shiftArrow(S0, S, [2.4, 3.4, 6.6, 7.6]))
  const areas = []
  if (st.surplus) {
    areas.push(area('cs', [[0, at(D, 0)], [0, e2[1]], [e2[0], e2[1]]], n.cs))
    areas.push(area('ps', [[0, at(S, 0)], [0, e2[1]], [e2[0], e2[1]]], n.ps))
  }
  return {
    lines, areas, arrows: arrows.filter(Boolean),
    points: changed ? [{ at: e1, faded: true }, { at: e2 }] : [{ at: e1 }],
    ticks: {
      x: changed ? [{ v: e1[0], label: `${n.Q}_1` }, { v: e2[0], label: `${n.Q}_2` }] : [{ v: e1[0], label: `${n.Q}_1` }],
      y: changed ? [{ v: e1[1], label: `${n.P}_1` }, { v: e2[1], label: `${n.P}_2` }] : [{ v: e1[1], label: `${n.P}_1` }],
    },
    guides: changed ? [e1, e2] : [e1],
    facts: { dd, ds, dp: e2[1] - e1[1], dq: e2[0] - e1[0] },
  }
}

const dir = (v, tol = 0.08) => (v > tol ? 'up' : v < -tol ? 'down' : 'same')

function sdBuild(st, { S }) {
  const sc = marketScene(st, { D: 'D', S: 'S', P: 'P', Q: 'Q', cs: S.cs, ps: S.ps }, { d: S.dragD, s: S.dragS })
  const t = S.d.sd.ex, { dd, ds, dp, dq } = sc.facts
  let text
  if (!dd && !ds) text = [t.none]
  else if (dd && !ds) text = [dd > 0 ? t.dUp : t.dDown]
  else if (ds && !dd) text = [ds > 0 ? t.sUp : t.sDown]
  else text = [t.both(S.moved[dir(dp)], S.moved[dir(dq)])]
  return { panels: [{ axes: { x: S.ax.quantity, y: S.ax.price }, ...sc }], text }
}

export const CURRENCIES = {
  GBP: { sym: '£', quote: 'USD' }, USD: { sym: '$', quote: 'EUR' }, EUR: { sym: '€', quote: 'USD' },
  CNY: { sym: '¥', quote: 'USD' }, JPY: { sym: '¥', quote: 'USD' }, KRW: { sym: '₩', quote: 'USD' },
  OTHER: { sym: '', quote: '' },
}

function forexBuild(st, { S }) {
  const cur = CURRENCIES[st.cur] ? st.cur : 'GBP'
  const sym = CURRENCIES[cur].sym
  const sc = marketScene(st, { D: `D${sym}`, S: `S${sym}`, P: 'ER', Q: 'Q', cs: S.cs, ps: S.ps }, { d: S.dragD, s: S.dragS })
  const t = S.d.forex.ex, { dd, ds, dp } = sc.facts
  let text
  if (!dd && !ds) text = [t.none]
  else {
    if (dd && !ds) text = [dd > 0 ? t.dUp : t.dDown]
    else if (ds && !dd) text = [ds > 0 ? t.sUp : t.sDown]
    else text = [t.both(t.dir[dir(dp)])]
    if (dir(dp) === 'up') text.push(t.appEffects)
    if (dir(dp) === 'down') text.push(t.depEffects)
  }
  const names = S.cur[cur]
  return { panels: [{ axes: { x: names.qty, y: names.price }, ...sc }], text }
}

// ── Price ceiling and floor ─────────────────────────────────────────────────

function controlsBuild(st, { S, board }) {
  const ceiling = st.mode !== 'floor'
  const c = st.c
  const [qe, pe] = meet(D0, S0)
  const qs = xAt(S0, c), qd = xAt(D0, c)
  const binding = ceiling ? c < pe - 0.05 : c > pe + 0.05
  const L = S.d.controls
  const tag = board === 'ap' ? (ceiling ? 'P_c' : 'P_f') : (ceiling ? 'P_{max}' : 'P_{min}')
  const lines = [
    { pts: seg(D0), label: 'D', kind: 'd' },
    { pts: seg(S0), label: 'S', kind: 's' },
    { pts: seg([c, 0]), label: ceiling ? L.ceilingLine[board] : L.floorLine[board], kind: 'ctrl', labelAt: 'right-above',
      drag: { key: 'c', axis: 'y', min: 1.4, max: 8.6, aria: L.dragLine } },
  ]
  const areas = [], brackets = []
  const traded = binding ? Math.min(qs, qd) : qe
  if (binding) {
    const top = at(D0, traded), bot = at(S0, traded)
    areas.push(area('dwl', [[traded, top], [qe, pe], [traded, bot]], S.dwl))
    if (st.surplus) {
      areas.push(area('cs', ceiling ? [[0, c], [0, at(D0, 0)], [traded, top], [traded, c]] : [[0, c], [0, at(D0, 0)], [traded, c]], S.cs))
      areas.push(area('ps', ceiling ? [[0, at(S0, 0)], [0, c], [traded, c]] : [[0, at(S0, 0)], [0, c], [traded, c], [traded, bot]], S.ps))
    }
    brackets.push({ from: [Math.min(qs, qd), ceiling ? c - 0.5 : c + 0.5], to: [Math.max(qs, qd), ceiling ? c - 0.5 : c + 0.5], label: ceiling ? L.shortage : L.surplus })
  } else if (st.surplus) {
    areas.push(area('cs', [[0, at(D0, 0)], [0, pe], [qe, pe]], S.cs))
    areas.push(area('ps', [[0, at(S0, 0)], [0, pe], [qe, pe]], S.ps))
  }
  const xt = binding ? [{ v: qs, label: 'Q_s' }, { v: qe, label: 'Q_e', faded: true }, { v: qd, label: 'Q_d' }] : [{ v: qe, label: 'Q_e' }]
  const guides = binding ? [[qs, c], [qd, c], { at: [qe, pe], faded: true }] : [[qe, pe]]
  const text = binding ? [ceiling ? L.ex.ceilingOn : L.ex.floorOn, ceiling ? L.ex.ceilingMore : L.ex.floorMore] : [ceiling ? L.ex.ceilingOff : L.ex.floorOff]
  return {
    panels: [{
      axes: { x: S.ax.quantity, y: S.ax.price }, lines, areas, brackets,
      points: [{ at: [qe, pe], faded: binding }],
      ticks: { x: xt, y: [{ v: pe, label: 'P_e', faded: binding }, { v: c, label: tag }] },
      guides,
    }],
    text,
  }
}

// ── Indirect tax and subsidy ────────────────────────────────────────────────

const PED_SLOPES = { elastic: 0.42, unit: 0.8, inelastic: 1.7 }

function taxBuild(st, { S }) {
  const subsidy = st.mode === 'subsidy'
  const b = PED_SLOPES[st.el] || 0.8
  const D = [5 + 5 * b, -b]                     // pivots on the untaxed equilibrium (5, 5)
  const t = moved(st.t) ? st.t : 0
  const S2 = shiftY(S0, subsidy ? -t : t)
  const [q1, p1] = meet(D, S0)
  const [q2, p2] = meet(D, S2)
  const p3 = subsidy ? p2 + t : p2 - t           // what producers keep
  const L = S.d.tax
  const lines = [
    { pts: seg(D), label: 'D', kind: 'd' },
    ...(t ? [{ pts: seg(S0), label: 'S_1', kind: 's', faded: true }] : []),
    { pts: seg(S2), label: t ? 'S_2' : 'S', kind: 's', drag: { key: 't', axis: 'y', sign: subsidy ? -1 : 1, min: 0, max: 3.4, aria: L.dragS } },
  ]
  const areas = [], brackets = []
  if (t) {
    if (subsidy) areas.push(area('cost', rect(0, p2, q2, p3), L.govCost))
    else {
      areas.push(area('revC', rect(0, p1, q2, p2), L.consShare))
      areas.push(area('revP', rect(0, p3, q2, p1), L.prodShare))
    }
    areas.push(area('dwl', [[q1, p1], [q2, p2], [q2, p3]], S.dwl))
    const bx = q2 + (subsidy ? 0.35 : -0.35)    // beside Q2, away from the deadweight-loss triangle
    brackets.push({ from: [bx, Math.min(p2, p3)], to: [bx, Math.max(p2, p3)], label: subsidy ? L.perUnitS : L.perUnitT, vertical: true, side: subsidy ? 'right' : 'left' })
  }
  const ex = L.ex
  // Share of the tax (or subsidy) that shows up in the consumer price
  const consShare = S0[1] === 0 ? 0 : b / (b + S0[1])
  const text = !t ? [ex.none] : [subsidy ? ex.subsidy : ex.tax,
    (subsidy ? ex.subInc : ex.taxInc)[consShare > 0.58 ? 'cons' : consShare < 0.42 ? 'prod' : 'even']]
  return {
    panels: [{
      axes: { x: S.ax.quantity, y: S.ax.price }, lines, areas, brackets,
      points: t ? [{ at: [q1, p1], faded: true }, { at: [q2, p2] }] : [{ at: [q1, p1] }],
      ticks: {
        x: t ? [{ v: q1, label: 'Q_1' }, { v: q2, label: 'Q_2' }] : [{ v: q1, label: 'Q_1' }],
        y: t ? [{ v: p1, label: 'P_1' }, { v: p2, label: 'P_2' }, { v: p3, label: 'P_3' }] : [{ v: p1, label: 'P_1' }],
      },
      guides: t ? [[q1, p1], [q2, Math.max(p2, p3)], { at: [q2, Math.min(p2, p3)], v: false }] : [[q1, p1]],
    }],
    text,
    legend: t ? (subsidy ? [['cost', L.govCost], ['dwl', S.dwl]] : [['revC', L.consShare], ['revP', L.prodShare], ['dwl', S.dwl]]) : [],
  }
}

// ── Price elasticity of demand and total revenue ────────────────────────────

function pedBuild(st, { S }) {
  const DL = [10, -1]                           // P = 10 − Q, so |PED| = P / Q
  const q = clamp(st.q, 0.6, 9.4), p = 10 - q
  const step = st.move ? 1.1 * st.move : 0
  const p2 = clamp(p + step, 0.5, 9.5), q2 = 10 - p2
  const L = S.d.ped
  const ped = p / q
  const kind = ped > 1.08 ? 'elastic' : ped < 0.92 ? 'inelastic' : 'unit'
  const areas = [], points = [{ at: [q, p], drag: { key: 'q', axis: 'along', aria: L.dragPoint } }]
  const changed = Math.abs(p2 - p) > 0.05
  if (!changed) areas.push(area('rev', rect(0, 0, q, p), L.tr))
  else {
    const keep = rect(0, 0, Math.min(q, q2), Math.min(p, p2))
    areas.push(area('rev', keep))
    if (p2 > p) { areas.push(area('gain', rect(0, p, q2, p2))); areas.push(area('loss', rect(q2, 0, q, p))) } else { areas.push(area('gain', rect(q, 0, q2, p2))); areas.push(area('loss', rect(0, p2, q, p))) }
    points.push({ at: [q2, p2] })
  }
  const tr1 = p * q, tr2 = p2 * q2
  const text = [L.ex.at(round(ped, ped < 10 ? 2 : 1), L.kind[kind])]
  if (!changed) text.push(L.ex.none)
  else if (Math.abs(tr2 - tr1) < 0.35) text.push(L.ex.flat)
  else if (p2 > p) text.push(tr2 > tr1 ? L.ex.riseUp : L.ex.riseDown)
  else text.push(tr2 > tr1 ? L.ex.cutUp : L.ex.cutDown)
  // TR = P·Q = 10Q − Q², drawn in the lower panel (TR scaled into 0..10 by /2.6)
  const trCurve = []
  for (let x = 0; x <= 10.0001; x += 0.25) trCurve.push([x, (10 * x - x * x) / 2.6])
  return {
    panels: [
      {
        axes: { x: S.ax.quantity, y: S.ax.price }, height: 0.62,
        lines: [{ pts: seg(DL), label: 'D', kind: 'd' }],
        areas, points,
        ticks: { x: changed ? [{ v: q, label: 'Q_1' }, { v: q2, label: 'Q_2' }] : [{ v: q, label: 'Q_1' }], y: changed ? [{ v: p, label: 'P_1' }, { v: p2, label: 'P_2' }] : [{ v: p, label: 'P_1' }] },
        guides: changed ? [[q, p], [q2, p2]] : [[q, p]],
        zones: [{ from: [0.6, 9.4], to: [5, 5], label: L.kind.elastic, side: 'above' }, { from: [5, 5], to: [9.4, 0.6], label: L.kind.inelastic, side: 'above' }],
        mid: { at: [5, 5], label: '|PED| = 1' },
      },
      {
        axes: { x: S.ax.quantity, y: S.ax.tr }, height: 0.38,
        lines: [{ pts: trCurve, label: 'TR', kind: 'tr', labelAt: 'peak' }],
        points: [{ at: [q, (10 * q - q * q) / 2.6] }, ...(changed ? [{ at: [q2, (10 * q2 - q2 * q2) / 2.6], faded: true }] : [])],
        ticks: { x: [], y: [] }, guides: [],
        vlines: [{ x: 5, faded: true }],
      },
    ],
    text,
    legend: changed ? [['gain', L.gained], ['loss', L.lost]] : [['rev', L.tr]],
  }
}

// ── AD–AS ───────────────────────────────────────────────────────────────────

export function adasAdjust(st) {
  // SRAS shift that brings output back to full employment, given the AD and LRAS now in place
  const AD = shiftX(D0, moved(st.dAD) ? st.dAD : 0)
  const yf = 5 + (moved(st.dLRAS) ? st.dLRAS : 0)
  const sr = shiftX(S0, moved(st.dSRAS) ? st.dSRAS : 0)
  const target = at(AD, yf)                     // SRAS must pass through (yf, AD(yf))
  return yf - xAt(sr, target)
}

function adasBuild(st, { S, board }) {
  const L = S.d.adas
  const n = board === 'alevel' ? { pl: 'P', yf: 'Y_f' } : board === 'ib' ? { pl: 'PL', yf: 'Y_p' } : { pl: 'PL', yf: 'Y_F' }
  const dAD = moved(st.dAD) ? st.dAD : 0, dSR = moved(st.dSRAS) ? st.dSRAS : 0, dLR = moved(st.dLRAS) ? st.dLRAS : 0
  const adj = st.adjusted && moved(st.adj) ? st.adj : 0
  const AD = shiftX(D0, dAD), SR = shiftX(S0, dSR), SR3 = shiftX(SR, adj)
  const yf0 = 5, yf = 5 + dLR
  const e1 = meet(D0, S0), e2 = meet(AD, SR), e3 = meet(AD, SR3)
  const lines = [...pair(D0, AD, !!dAD, 'AD', 'd', { key: 'dAD', axis: 'x', min: -3.2, max: 3.2, aria: L.dragAD })]
  // SRAS can have three stages: before, after the shock, after long-run adjustment
  const srStages = [S0]
  if (dSR) srStages.push(SR)
  if (adj) srStages.push(SR3)
  srStages.forEach((Ls, i) => {
    const last = i === srStages.length - 1
    lines.push({ pts: seg(Ls), label: srStages.length > 1 ? `SRAS_${i + 1}` : 'SRAS', kind: 's', faded: !last,
      drag: last ? { key: adj ? 'adj' : 'dSRAS', axis: 'x', min: -3.2, max: 3.2, aria: L.dragSRAS } : undefined })
  })
  if (dLR) lines.push({ pts: vseg(yf0), label: 'LRAS_1', kind: 'lr', faded: true })
  lines.push({ pts: vseg(yf), label: dLR ? 'LRAS_2' : 'LRAS', kind: 'lr', labelAt: 'top', drag: { key: 'dLRAS', axis: 'x', min: -2.5, max: 3, aria: L.dragLRAS } })

  const stages = [e1]
  if (dAD || dSR) stages.push(e2)
  if (adj) stages.push(e3)
  const final = stages[stages.length - 1]
  const xt = stages.map((e, i) => ({ v: e[0], label: stages.length > 1 ? `Y_${i + 1}` : 'Y_1' }))
  xt.push({ v: yf0, label: dLR ? `${n.yf}1` : n.yf, faded: !!dLR })
  if (dLR) xt.push({ v: yf, label: `${n.yf}2` })
  const yt = stages.map((e, i) => ({ v: e[1], label: `${n.pl}_${i + 1}` }))
  const arrows = []
  if (dAD) arrows.push(shiftArrow(D0, AD, [2.2, 3.2, 7.2]))
  if (dSR) arrows.push(shiftArrow(S0, SR, [7.6, 6.6, 2.4]))
  if (adj) arrows.push(shiftArrow(SR, SR3, [7.6, 6.6, 2.4]))
  const gap = final[0] - yf
  const brackets = Math.abs(gap) > 0.2 ? [{ from: [final[0], 0.75], to: [yf, 0.75], label: gap < 0 ? L.gapShort[board] : L.gapShortInf[board], kind: gap < 0 ? 'rec' : 'inf' }] : []

  const ex = L.ex
  const text = []
  const changes = [dAD && 'ad', dSR && 'sr', dLR && 'lr'].filter(Boolean)
  if (!changes.length) text.push(ex.none)
  else if (changes.length === 1 || (dLR && dSR && !dAD && Math.abs(dLR - dSR) < 0.3)) {
    text.push(dLR ? ex.lras : dAD ? (dAD > 0 ? ex.adUp : ex.adDown) : (dSR > 0 ? ex.srasUp : ex.srasDown))
  } else text.push(ex.mixed)
  if (adj) text.push(ex.adjusted)
  if (changes.length) text.push(gap < -0.2 ? ex.gapRec(L.gap[board].rec) : gap > 0.2 ? ex.gapInf(L.gap[board].inf) : ex.atFull)
  return {
    panels: [{
      axes: { x: board === 'alevel' ? S.ax.realOutput : S.ax.realGdp, y: S.ax.pl }, lines, brackets, arrows: arrows.filter(Boolean),
      points: stages.map((e, i) => ({ at: e, faded: i < stages.length - 1, label: stages.length > 1 ? String.fromCharCode(65 + i) : null })),
      ticks: { x: xt, y: yt }, guides: stages,
    }],
    text,
    canAdjust: !!changes.length && Math.abs(gap) > 0.2 && !adj,
  }
}

// ── Phillips curve ──────────────────────────────────────────────────────────

const NRU = 5
const PE0 = 3.4
const srpc = (pe) => (u) => pe + 1.55 * (Math.exp(-0.45 * (u - NRU)) - 1)
function curvePts(f) {
  const out = []
  for (let u = 0.3; u <= 9.71; u += 0.1) { const y = f(u); if (y >= LO && y <= HI) out.push([u, y]) }
  return out
}

function phillipsBuild(st, { S }) {
  const L = S.d.phillips
  const dpe = moved(st.dpe) ? st.dpe : 0
  const u = moved(st.u - NRU) ? st.u : NRU
  const f2 = srpc(PE0 + dpe)
  const A = [NRU, PE0], B = [u, f2(u)]
  const adjusted = st.adjusted && (moved(u - NRU) || dpe)
  const C = [NRU, B[1]]
  const lines = [{ pts: vseg(NRU), label: 'LRPC', kind: 'lr', labelAt: 'top' }]
  const stages = [PE0]
  if (dpe) stages.push(PE0 + dpe)
  if (adjusted && moved(u - NRU)) stages.push(B[1])
  stages.forEach((pe, i) => {
    const last = i === stages.length - 1
    lines.push({ pts: curvePts(srpc(pe)), label: stages.length > 1 ? `SRPC_${i + 1}` : 'SRPC', kind: 's', faded: !last,
      drag: last && !adjusted ? { key: 'dpe', axis: 'y', min: -2.2, max: 3.2, aria: L.dragCurve } : undefined })
  })
  const points = [{ at: A, label: 'A', faded: !!(dpe || moved(u - NRU)) }]
  if (dpe || moved(u - NRU)) points.push({ at: B, label: 'B', faded: adjusted, drag: adjusted ? undefined : { key: 'u', axis: 'x', min: 1.2, max: 9.4, aria: L.dragPoint } })
  else points[0].drag = { key: 'u', axis: 'x', min: 1.2, max: 9.4, aria: L.dragPoint }
  if (adjusted && moved(u - NRU)) points.push({ at: C, label: 'C' })
  const shown = points.map((p) => p.at)
  const ex = L.ex
  const text = []
  if (!dpe && !moved(u - NRU)) text.push(ex.none)
  else if (dpe && moved(u - NRU)) text.push(ex.combined)
  else if (dpe) text.push(dpe > 0 ? ex.shiftUp : ex.shiftDown)
  else text.push(u < NRU ? ex.moveUp : ex.moveDown)
  if (adjusted && moved(u - NRU)) text.push(ex.adjusted)
  return {
    panels: [{
      axes: { x: S.ax.unemployment, y: S.ax.inflation }, lines, points,
      ticks: {
        x: [{ v: NRU, label: 'NRU' }, ...(moved(u - NRU) ? [{ v: u, label: 'U_1' }] : [])],
        y: shown.map((p, i) => ({ v: p[1], label: `π_${i + 1}`, faded: i < shown.length - 1 })),
      },
      guides: shown,
    }],
    text,
    canAdjust: moved(u - NRU) && !adjusted,
  }
}

// ── Tariff (small open economy) ─────────────────────────────────────────────

const TD = [9.5, -0.85]
const TS = [0.8, 0.85]
const PW = 2.6

function tariffBuild(st, { S }) {
  const L = S.d.tariff
  const t = Math.max(0, st.t || 0)
  const [qe, pe] = meet(TD, TS)
  const pt = Math.min(PW + t, pe), prohibitive = PW + t >= pe - 0.02
  const q1 = xAt(TS, PW), q4 = xAt(TD, PW), q2 = xAt(TS, pt), q3 = xAt(TD, pt)
  const lines = [
    { pts: seg(TD), label: 'D_{dom}', kind: 'd' },
    { pts: seg(TS), label: 'S_{dom}', kind: 's' },
    { pts: seg([PW, 0]), label: 'S_w', kind: 'world', labelAt: 'right-above' },
  ]
  const areas = [], brackets = []
  if (t > 0.05) {
    lines.push({ pts: seg([PW + t, 0]), label: 'S_w + t', kind: 'ctrl', labelAt: 'right-above', drag: { key: 't', axis: 'y', min: 0, max: 3.6, aria: L.dragLine } })
    areas.push(area('ps', [[0, PW], [q1, PW], [q2, pt], [0, pt]], 'a'))
    areas.push(area('dwl', [[q1, PW], [q2, PW], [q2, pt]], 'b'))
    if (!prohibitive) areas.push(area('rev', rect(q2, PW, q3, pt), 'c'))
    areas.push(area('dwl', [[q3, PW], [q4, PW], [q3, pt]], 'd'))
    // both import brackets sit under the world price, where no curve runs
    if (q3 - q2 > 1.2) brackets.push({ from: [q2, PW - 1.4], to: [q3, PW - 1.4], label: L.importsTariff })
  } else {
    lines[2].drag = undefined
    lines.push({ pts: seg([PW + 0.001, 0]), label: '', kind: 'hit', drag: { key: 't', axis: 'y', min: 0, max: 3.6, aria: L.dragLine } })
  }
  brackets.push({ from: [q1, PW - 0.55], to: [q4, PW - 0.55], label: L.importsFree })
  const text = t <= 0.05 ? [L.ex.none] : prohibitive ? [L.ex.prohibitive] : st.removed ? [L.ex.removed] : [L.ex.imposed, L.ex.areas]
  const xt = t > 0.05 ? [{ v: q1, label: 'Q_1' }, { v: q2, label: 'Q_2' }, { v: q3, label: 'Q_3' }, { v: q4, label: 'Q_4' }] : [{ v: q1, label: 'Q_1' }, { v: q4, label: 'Q_4' }]
  return {
    panels: [{
      axes: { x: S.ax.quantity, y: S.ax.price }, lines, areas, brackets,
      points: prohibitive ? [{ at: [qe, pe] }] : [],
      ticks: { x: xt, y: [{ v: PW, label: 'P_w' }, ...(t > 0.05 ? [{ v: pt, label: prohibitive ? 'P_e' : 'P_w + t' }] : [])] },
      guides: t > 0.05 ? [[q1, PW], [q2, pt], [q3, pt], [q4, PW]] : [[q1, PW], [q4, PW]],
    }],
    text,
    legend: t > 0.05 && !prohibitive ? [['ps', L.legend.a], ['dwl', L.legend.b], ['rev', L.legend.c], ['dwl', L.legend.d]] : [],
  }
}

// ── Externalities ───────────────────────────────────────────────────────────

const EXT = {
  // which curve the externality moves, and which way
  neg_production: { side: 'cost', sign: 1 },
  pos_production: { side: 'cost', sign: -1 },
  neg_consumption: { side: 'benefit', sign: -1 },
  pos_consumption: { side: 'benefit', sign: 1 },
}

function externalityBuild(st, { S, board }) {
  const L = S.d.externality
  const mode = EXT[st.mode] ? st.mode : 'neg_production'
  const { side, sign } = EXT[mode]
  const e = clamp(st.e, 0.3, 3.6)
  const MPB = D0, MPC = S0
  const social = side === 'cost' ? shiftY(MPC, sign * e) : shiftY(MPB, sign * e)
  const MSB = side === 'benefit' ? social : MPB, MSC = side === 'cost' ? social : MPC
  const m = meet(MPB, MPC), o = meet(MSB, MSC)
  const n = board === 'ib' ? { qm: 'Q_m', qo: 'Q_{opt}', pm: 'P_m', po: 'P_{opt}' } : { qm: 'Q_m', qo: 'Q*', pm: 'P_m', po: 'P*' }
  // The welfare-loss triangle: between MSC and MSB, from the market quantity to the optimum
  const tri = [[o[0], o[1]], [m[0], at(MSB, m[0])], [m[0], at(MSC, m[0])]]
  const drag = { key: 'e', axis: 'y', sign, min: 0.3, max: 3.6, aria: L.dragSocial }
  const lines = side === 'cost'
    ? [{ pts: seg(MPB), label: 'MPB = MSB', kind: 'd' }, { pts: seg(MPC), label: 'MPC', kind: 's' }, { pts: seg(MSC), label: 'MSC', kind: 'social', drag }]
    : [{ pts: seg(MPB), label: 'MPB', kind: 'd' }, { pts: seg(MSB), label: 'MSB', kind: 'social', drag }, { pts: seg(MPC), label: 'MPC = MSC', kind: 's' }]
  return {
    panels: [{
      axes: { x: S.ax.quantity, y: S.ax.costsBenefits }, lines,
      areas: [area('dwl', tri, null)],
      points: [{ at: m }, { at: o }],
      ticks: { x: [{ v: m[0], label: n.qm }, { v: o[0], label: n.qo }], y: [{ v: m[1], label: n.pm }, { v: o[1], label: n.po }] },
      guides: [m, o],
    }],
    text: [L.ex[mode], L.policy[mode]],
    legend: [['dwl', S.welfareLoss]],
  }
}

// ── Registry ────────────────────────────────────────────────────────────────

export const GROUPS = [
  ['micro', ['sd', 'ped', 'controls', 'tax', 'externality']],
  ['macro', ['adas', 'phillips']],
  ['intl', ['forex', 'tariff']],
]

// Study-centre topics per board (routers/study.py curricula) where each diagram is examined
export const TOPICS = {
  sd: { ib: ['ib_2'], alevel: ['micro_2'], ap_micro: ['ap_micro_2'], igcse: ['igcse_3'] },
  ped: { ib: ['ib_2'], alevel: ['micro_2'], ap_micro: ['ap_micro_2'], igcse: ['igcse_3'] },
  controls: { ib: ['ib_3'], alevel: ['micro_4'], ap_micro: ['ap_micro_2'], igcse: ['igcse_4'] },
  tax: { ib: ['ib_3'], alevel: ['micro_4'], ap_micro: ['ap_micro_2'], igcse: ['igcse_4'] },
  externality: { ib: ['ib_3'], alevel: ['micro_3'], ap_micro: ['ap_micro_6'], igcse: ['igcse_4'] },
  adas: { ib: ['ib_5'], alevel: ['macro_2'], ap_macro: ['ap_3'] },
  phillips: { ib: ['ib_5'], alevel: ['macro_1'], ap_macro: ['ap_5'] },
  forex: { ib: ['ib_8'], alevel: ['macro_4'], ap_macro: ['ap_6'], igcse: ['igcse_8'] },
  tariff: { ib: ['ib_7'], alevel: ['macro_4'], ap_micro: ['ap_micro_2'], igcse: ['igcse_8'] },
}

// Starting state, the shocks a student can pick, and the presets the case library links to
// (the preset ids are the ones services/econ_diagrams.py lets the model choose).
export const DIAGRAMS = {
  sd: {
    build: sdBuild, base: { dD: 0, dS: 0, surplus: false },
    shocks: [['incomes', { dD: 1.6 }], ['substitute', { dD: 1.3 }], ['complement', { dD: -1.4 }], ['scare', { dD: -1.8 }],
      ['opec', { dS: -1.6 }], ['harvest', { dS: -1.8 }], ['costs', { dS: -1.2 }], ['tech', { dS: 1.6 }], ['reserves', { dS: 1.2 }]],
    presets: { demand_increase: { dD: 1.6 }, demand_decrease: { dD: -1.6 }, supply_increase: { dS: 1.6 }, supply_decrease: { dS: -1.6 } },
    toggles: ['surplus'],
  },
  ped: {
    build: pedBuild, base: { q: 5, move: 0 },
    shocks: [['petrol', { q: 7.2, move: 1 }], ['brand', { q: 2.6, move: 1 }], ['fares', { q: 2.6, move: -1 }], ['crop', { q: 7.2, move: -1 }]],
    presets: { ped_inelastic: { q: 7.2, move: 1 }, ped_elastic: { q: 2.6, move: 1 } },
  },
  controls: {
    build: controlsBuild, base: { mode: 'ceiling', c: 3.4, surplus: false },
    shocks: [['rent', { mode: 'ceiling', c: 3.2 }], ['energy', { mode: 'ceiling', c: 3.9 }], ['alcohol', { mode: 'floor', c: 6.4 }], ['farm', { mode: 'floor', c: 7.0 }]],
    presets: { price_ceiling: { mode: 'ceiling', c: 3.4 }, price_floor: { mode: 'floor', c: 6.6 } },
    modes: ['ceiling', 'floor'], modeDefaults: { ceiling: { c: 3.4 }, floor: { c: 6.6 } }, toggles: ['surplus'],
  },
  tax: {
    build: taxBuild, base: { mode: 'tax', t: 1.6, el: 'unit' },
    shocks: [['sugar', { mode: 'tax', t: 1.6, el: 'unit' }], ['fuel', { mode: 'tax', t: 1.8, el: 'inelastic' }], ['substitutes', { mode: 'tax', t: 1.6, el: 'elastic' }],
      ['solar', { mode: 'subsidy', t: 1.6, el: 'unit' }], ['staple', { mode: 'subsidy', t: 1.4, el: 'inelastic' }]],
    presets: { indirect_tax: { mode: 'tax', t: 1.6 }, subsidy: { mode: 'subsidy', t: 1.6 } },
    modes: ['tax', 'subsidy'], elastic: ['elastic', 'unit', 'inelastic'],
  },
  externality: {
    build: externalityBuild, base: { mode: 'neg_production', e: 2 },
    shocks: [['factory', { mode: 'neg_production', e: 2.2 }], ['flights', { mode: 'neg_production', e: 1.5 }], ['vaccines', { mode: 'pos_consumption', e: 2.2 }],
      ['education', { mode: 'pos_consumption', e: 1.6 }], ['smoking', { mode: 'neg_consumption', e: 2 }], ['training', { mode: 'pos_production', e: 1.8 }]],
    presets: { neg_production: { mode: 'neg_production', e: 2 }, pos_consumption: { mode: 'pos_consumption', e: 2 },
      neg_consumption: { mode: 'neg_consumption', e: 2 }, pos_production: { mode: 'pos_production', e: 2 } },
    modes: ['neg_production', 'pos_consumption', 'neg_consumption', 'pos_production'],
  },
  adas: {
    build: adasBuild, base: { dAD: 0, dSRAS: 0, dLRAS: 0, adj: 0, adjusted: false },
    shocks: [['rates_up', { dAD: -1.5 }], ['rates_down', { dAD: 1.5 }], ['spending', { dAD: 1.5 }], ['confidence', { dAD: -1.8 }], ['exports', { dAD: 1.2 }],
      ['opec', { dSRAS: -1.5 }], ['wages', { dSRAS: -1.1 }], ['energy_down', { dSRAS: 1.3 }], ['productivity', { dLRAS: 1.2, dSRAS: 1.2 }]],
    presets: { ad_increase: { dAD: 1.5 }, ad_decrease: { dAD: -1.5 }, sras_decrease: { dSRAS: -1.5 }, sras_increase: { dSRAS: 1.5 }, lras_increase: { dLRAS: 1.2, dSRAS: 1.2 } },
  },
  phillips: {
    build: phillipsBuild, base: { u: NRU, dpe: 0, adjusted: false },
    shocks: [['ad_up', { u: 3.6 }], ['ad_down', { u: 6.8 }], ['oil', { dpe: 1.8, u: 5.9 }], ['expect_up', { dpe: 1.8 }], ['credible', { dpe: -1.5 }]],
    presets: { phillips_move_up: { u: 3.6 }, phillips_move_down: { u: 6.8 }, phillips_shift_up: { dpe: 1.8 }, phillips_shift_down: { dpe: -1.5 } },
  },
  forex: {
    build: forexBuild, base: { dD: 0, dS: 0, cur: 'GBP' },
    shocks: [['rates', { dD: 1.5 }], ['exports', { dD: 1.3 }], ['tourists', { dD: 1.0 }], ['spec', { dD: -1.3 }], ['imports', { dS: 1.4 }], ['capital', { dS: 1.6 }]],
    presets: { fx_demand_increase: { dD: 1.5 }, fx_demand_decrease: { dD: -1.5 }, fx_supply_increase: { dS: 1.5 }, fx_supply_decrease: { dS: -1.5 } },
  },
  tariff: {
    build: tariffBuild, base: { t: 1.6, removed: false },
    shocks: [['steel', { t: 1.6 }], ['small', { t: 0.8 }], ['prohibitive', { t: 3.0 }], ['removed', { t: 1.6, removed: true }]],
    presets: { tariff_imposed: { t: 1.6 }, tariff_removed: { t: 1.6, removed: true } },
  },
}

export const DIAGRAM_IDS = Object.keys(DIAGRAMS)

// Which diagram a preset belongs to
export const PRESET_DIAGRAM = Object.fromEntries(
  Object.entries(DIAGRAMS).flatMap(([id, d]) => Object.keys(d.presets).map((p) => [p, id])))

// A drag moves state[key]: along x or y in model units (sign flips it), clamped; 'along' follows P = 10 − Q
export function applyDrag(spec, start, m, m0) {
  if (spec.axis === 'along') return { [spec.key]: clamp((m[0] - m[1] + 10) / 2, 0.6, 9.4), move: 0 }
  const delta = spec.axis === 'x' ? m[0] - m0[0] : m[1] - m0[1]
  const v = (start[spec.key] ?? 0) + delta * (spec.sign || 1)
  return { [spec.key]: clamp(v, spec.min ?? -10, spec.max ?? 10) }
}

export function nudge(spec, state, step) {
  if (spec.axis === 'along') return { [spec.key]: clamp((state[spec.key] ?? 5) + step * 0.25, 0.6, 9.4), move: 0 }
  const v = (state[spec.key] ?? 0) + step * 0.2 * (spec.sign || 1)
  return { [spec.key]: clamp(v, spec.min ?? -10, spec.max ?? 10) }
}
