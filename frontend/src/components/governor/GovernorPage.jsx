import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import getDeviceId from '../../utils/deviceId'
import { paperHeaders } from '../../utils/paperAuth'
import casesStrings from '../cases/casesStrings'
import governorStrings from './governorStrings'

// "Be the Fed chair": set the US policy rate one quarter at a time through a real episode. The
// server sends only the quarters already played, and reveals the real Fed's rate for a quarter
// after the student has set theirs (routers/governor.py).

const ACCENT = '#0ea5e9', TARGET = '#10b981', HOT = '#ef4444'
const TINT = { inflation_2021: '#0ea5e9', volcker_1979: '#f59e0b', crisis_2007: '#ef4444' }
const MAX_RATE = 20
const STUDY = [['ib', 'ib_6'], ['alevel', 'macro_3'], ['ap_macro', 'ap_4'], ['igcse', 'igcse_7']]

async function api(path, body) {
  const r = await fetch(`/api/governor/${path}`, body
    ? { method: 'POST', headers: paperHeaders(), body: JSON.stringify(body) }
    : { headers: paperHeaders() })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : 'error')
  return d
}

const pct = (v, d = 2) => (v == null ? '—' : `${Number(v).toFixed(d)}%`)
const signedPts = (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`

// Quarters from a to b inclusive, as "2021Q2" labels
function qRange(a, b) {
  const out = []
  let [y, q] = a.split('Q').map(Number)
  const [yb, qb] = b.split('Q').map(Number)
  while (y < yb || (y === yb && q <= qb)) {
    out.push(`${y}Q${q}`)
    q += 1
    if (q > 4) { q = 1; y += 1 }
  }
  return out
}

const CSS = `
.gv { display: grid; gap: 16px; max-width: 1240px; margin: 0 auto; width: 100%; padding: 18px 0 40px; min-width: 0; }
.gv-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 14px; padding: 16px; min-width: 0; }
.gv-muted { color: var(--text-secondary); }
.gv-h { margin: 0; font-size: 11.5px; font-weight: 800; letter-spacing: .4px; text-transform: uppercase; color: var(--text-secondary); }
.gv-num { font-variant-numeric: tabular-nums; }
.gv-btn { border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); border-radius: 9px; padding: 8px 14px; font-size: 13px; font-weight: 650; cursor: pointer; white-space: nowrap; }
.gv-btn:disabled { opacity: .45; cursor: not-allowed; }
.gv-btn.primary { background: linear-gradient(135deg, #0ea5e9, #6366f1); border-color: transparent; color: #fff; }
.gv-btn:focus-visible, .gv-chip:focus-visible, .gv-step:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
.gv-picks { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.gv-pick { display: grid; gap: 10px; align-content: start; }
.gv-years { font-size: 38px; font-weight: 800; line-height: 1; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
.gv-how { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.gv-stats { display: flex; flex-wrap: wrap; gap: 6px; }
.gv-stat { font-size: 12px; padding: 4px 9px; border-radius: 999px; background: var(--bg-tertiary); font-variant-numeric: tabular-nums; }
.gv-game { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
.gv-side { display: grid; gap: 14px; min-width: 0; }
.gv-charts { display: grid; gap: 14px; }
.gv-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--text-secondary); }
.gv-sw { display: inline-block; width: 16px; height: 0; border-top: 2.5px solid; margin-right: 6px; vertical-align: middle; }
.gv-data { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.gv-datum { display: grid; gap: 2px; padding: 9px 10px; border-radius: 10px; background: var(--bg-tertiary); min-width: 0; }
.gv-datum b { font-size: 20px; font-variant-numeric: tabular-nums; }
.gv-rate { font-size: 40px; font-weight: 800; text-align: center; font-variant-numeric: tabular-nums; line-height: 1; }
.gv-step { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); font-size: 20px; font-weight: 700; cursor: pointer; flex: none; }
.gv-chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.gv-chip { border: 1px solid var(--border-primary); background: transparent; color: var(--text-primary); border-radius: 999px; padding: 5px 11px; font-size: 12.5px; font-weight: 650; cursor: pointer; font-variant-numeric: tabular-nums; }
.gv-chip.on { border-color: ${ACCENT}; background: ${ACCENT}1f; color: ${ACCENT}; }
.gv-range { width: 100%; accent-color: ${ACCENT}; }
.gv-ev { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-primary); display: grid; gap: 4px; }
.gv-ev.new { border-color: #f59e0b88; background: #f59e0b12; }
.gv-news { display: grid; gap: 8px; max-height: 520px; overflow-y: auto; }
.gv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.gv-table th { text-align: right; font-weight: 650; color: var(--text-secondary); padding: 6px 8px; border-bottom: 1px solid var(--border-primary); white-space: nowrap; }
.gv-table th:first-child, .gv-table td:first-child { text-align: left; white-space: normal; }
.gv-table td { text-align: right; padding: 7px 8px; border-bottom: 1px solid var(--border-primary); font-variant-numeric: tabular-nums; }
.gv-scroll { overflow-x: auto; }
.gv-topic { display: inline-flex; gap: 6px; align-items: baseline; font-size: 13px; text-decoration: none; color: var(--text-primary); border: 1px solid var(--border-primary); border-radius: 999px; padding: 5px 11px; }
.gv-topic b { color: ${ACCENT}; font-size: 11.5px; }
/* One column: the latest figures and the rate control come before the charts, so a phone needs no scrolling per quarter */
@media (max-width: 980px) {
  .gv-game { grid-template-columns: minmax(0, 1fr); }
  .gv-side { display: contents; }
  .gv-o1 { order: 1; } .gv-o2 { order: 2; } .gv-o3 { order: 3; } .gv-o4 { order: 4; }
  .gv-news { max-height: none; }
}
@media (max-width: 640px) { .gv-how { grid-template-columns: 1fr; } .gv-years { font-size: 32px; } .gv-card { padding: 14px 12px; } }
`

// ── Chart: quarterly lines on a fixed timeline, real history shaded before the start ──

function niceTicks(lo, hi) {
  const span = hi - lo
  const step = [0.5, 1, 2, 2.5, 5, 10].find((s) => span / s <= 5) || 10
  const out = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(2)))
  return out
}

function QChart({ title, labels, series, startIndex, s, height = 170 }) {
  const box = useRef(null)
  const [W, setW] = useState(600)
  const [hover, setHover] = useState(null)
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const n = labels.length
  const vals = series.flatMap((x) => x.values.filter((v) => v != null))
  if (n < 2 || !vals.length) return <div ref={box} style={{ height }} />
  let lo = Math.min(0, ...vals), hi = Math.max(...vals)
  if (hi - lo < 2) hi = lo + 2
  const ticks = niceTicks(lo, hi)
  lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1])
  const P = { l: 34, r: 10, t: 10, b: 22 }
  const x = (i) => P.l + (i / (n - 1)) * (W - P.l - P.r)
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (height - P.t - P.b)
  const path = (values) => {
    let d = '', pen = false
    values.forEach((v, i) => { if (v == null) { pen = false; return } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true })
    return d
  }
  // A year label under each first quarter, thinned out when space is short
  const years = labels.map((q, i) => [q, i]).filter(([q]) => q.endsWith('Q1'))
  const every = (W - P.l - P.r) / Math.max(1, years.length) < 40 ? 2 : 1
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round((((e.clientX - r.left) / r.width) * W - P.l) / (W - P.l - P.r) * (n - 1))
    setHover(i >= 0 && i < n && series.some((sr) => sr.values[i] != null) ? i : null)
  }
  return (
    <div ref={box} style={{ position: 'relative', display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <b style={{ fontSize: 13.5 }}>{title}</b>
        <span className="gv-legend">
          {series.filter((sr) => sr.label).map((sr) => (
            <span key={sr.key}><span className="gv-sw" style={{ borderColor: sr.color, borderTopStyle: sr.dash ? 'dashed' : 'solid' }} />{sr.label}</span>
          ))}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={title}>
        {startIndex > 0 && <rect x={P.l} y={P.t} width={x(startIndex) - P.l} height={height - P.t - P.b} fill="var(--bg-tertiary)" opacity="0.6" />}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--border-primary)" strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={P.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--text-secondary)" className="gv-num">{t}</text>
          </g>
        ))}
        {years.map(([q, i], k) => k % every === 0 && (
          <text key={q} x={x(i)} y={height - 6} fontSize="11" textAnchor="middle" fill="var(--text-secondary)" className="gv-num">{q.slice(0, 4)}</text>
        ))}
        {series.map((sr) => <path key={sr.key} d={path(sr.values)} fill="none" stroke={sr.color} strokeWidth={sr.width || 2.2} strokeDasharray={sr.dash} strokeLinejoin="round" strokeLinecap="round" opacity={sr.opacity || 1} />)}
        {series.filter((sr) => sr.dot).map((sr) => {
          const i = sr.values.reduce((last, v, k) => (v != null ? k : last), -1)
          return i >= 0 && <circle key={`d${sr.key}`} cx={x(i)} cy={y(sr.values[i])} r="4" fill={sr.color} />
        })}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={height - P.b} stroke="var(--text-secondary)" opacity="0.6" />}
      </svg>
      {hover != null && (
        <div style={{ position: 'absolute', top: 26, left: P.l + 6, fontSize: 12, padding: '4px 8px', borderRadius: 7, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', pointerEvents: 'none', display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 'calc(100% - 50px)' }}>
          <b>{s.quarter(labels[hover])}</b>
          {series.map((sr) => sr.values[hover] != null && sr.label && <span key={sr.key} className="gv-num" style={{ color: sr.color }}>{sr.label} {pct(sr.values[hover])}</span>)}
        </div>
      )}
    </div>
  )
}

// ── Scenario picker ───────────────────────────────────────────────────────────

function Picker({ s, list, onPick }) {
  return (
    <div className="gv">
      <div style={{ display: 'grid', gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>🏛 {s.title}</h1>
        <p className="gv-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.65, maxWidth: 820 }}>{s.intro}</p>
      </div>
      <div className="gv-how">
        {s.how.map(([icon, h, t]) => (
          <div key={h} className="gv-card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span aria-hidden="true" style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ display: 'grid', gap: 3 }}><b style={{ fontSize: 14 }}>{h}</b><span className="gv-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{t}</span></span>
          </div>
        ))}
      </div>
      {list === null && <div className="gv-card skeleton" style={{ height: 260 }} />}
      <div className="gv-picks">
        {(list || []).map((sc) => {
          const tint = TINT[sc.id] || ACCENT
          const p = sc.progress
          return (
            <article key={sc.id} className="gv-card gv-pick" style={{ borderTop: `3px solid ${tint}` }}>
              <div className="gv-years" style={{ color: tint }}>{sc.start.slice(0, 4)}–{sc.end.slice(0, 4)}</div>
              <b style={{ fontSize: 16 }}>{sc.title}</b>
              <span className="gv-muted" style={{ fontSize: 12.5 }}>{s.chairWas(sc.chair)}</span>
              <p className="gv-muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{sc.tagline}</p>
              <div className="gv-stats" aria-label={s.atStart}>
                <span className="gv-stat">{s.inflation} {pct(sc.start_pce4, 1)}</span>
                <span className="gv-stat">{s.unemployment} {pct(sc.start_u, 1)}</span>
                <span className="gv-stat">{s.rate} {pct(sc.start_rate, 2)}</span>
              </div>
              {p && <span className="gv-muted" style={{ fontSize: 12.5 }}>{p.finished ? (p.best != null ? s.best(p.best.toFixed(2)) : '') : s.progress(p.decision, sc.n_decisions)}</span>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {p && !p.finished
                  ? <><button className="gv-btn primary" onClick={() => onPick(sc.id, false)}>{s.resume}</button><button className="gv-btn" onClick={() => onPick(sc.id, true)}>{s.replay}</button></>
                  : <button className="gv-btn primary" onClick={() => onPick(sc.id, !!p)}>{p ? s.replay : s.start}</button>}
              </div>
            </article>
          )
        })}
      </div>
      <p className="gv-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6, maxWidth: 900 }}>{s.source}</p>
    </div>
  )
}

// ── Game ──────────────────────────────────────────────────────────────────────

function timeline(run) {
  const hist = run.history
  const labels = [...hist.map((r) => r.q), ...qRange(run.scenario.start, run.scenario.end)]
  const pad = (arr) => [...arr, ...Array(Math.max(0, labels.length - arr.length)).fill(null)]
  const last = hist[hist.length - 1]
  const lead = Array(hist.length - 1).fill(null)
  const real = (k) => pad([...hist.map((r) => r[k]), ...run.played.map((p) => p.real[k])])
  const mine = (k, first) => pad([...lead, first, ...run.played.map((p) => p[k])])
  return {
    labels, start: hist.length,
    infl: { real: real('pce4'), mine: mine('pce4', last.pce4) },
    u: { real: real('u'), mine: mine('u', last.u), natural: pad([...hist.map((r) => r.un), ...run.played.map((p) => p.un)]) },
    rate: { real: real('ff'), mine: pad([...lead, last.ff, ...run.played.filter((p) => p.rate != null).map((p) => p.rate)]) },
  }
}

function Charts({ run, s }) {
  const tl = timeline(run)
  const target = tl.labels.map(() => 2)
  const realStyle = { color: 'var(--text-secondary)', width: 2, dash: '5 4' }
  return (
    <div className="gv-card gv-charts">
      <QChart title={s.chartInfl} labels={tl.labels} startIndex={tl.start} s={s} series={[
        { key: 't', values: target, color: TARGET, width: 1.4, dash: '2 4', label: s.target },
        { key: 'r', values: tl.infl.real, label: s.legendReal, ...realStyle },
        { key: 'm', values: tl.infl.mine, color: ACCENT, width: 2.8, dot: true, label: s.legendYou },
      ]} />
      <QChart title={s.chartU} labels={tl.labels} startIndex={tl.start} s={s} series={[
        { key: 'n', values: tl.u.natural, color: TARGET, width: 1.4, dash: '2 4', label: s.natural },
        { key: 'r', values: tl.u.real, label: s.legendReal, ...realStyle },
        { key: 'm', values: tl.u.mine, color: ACCENT, width: 2.8, dot: true, label: s.legendYou },
      ]} />
      <QChart title={s.chartRate} labels={tl.labels} startIndex={tl.start} s={s} height={150} series={[
        { key: 'r', values: tl.rate.real, label: s.realFed, ...realStyle },
        { key: 'm', values: tl.rate.mine, color: ACCENT, width: 2.8, dot: true, label: s.yourRate },
      ]} />
    </div>
  )
}

function Latest({ run, s }) {
  const p = run.played[run.played.length - 1]
  const h = run.history[run.history.length - 1]
  const cur = p || { q: h.q, pce4: h.pce4, u: h.u, exp: h.exp, un: h.un }
  const real = p?.real
  const item = (label, v, r, help) => (
    <div className="gv-datum" title={help}>
      <span className="gv-muted" style={{ fontSize: 12 }}>{label}</span>
      <b>{pct(v)}</b>
      {r != null && <span className="gv-muted gv-num" style={{ fontSize: 11.5 }}>{s.real} {pct(r)}</span>}
    </div>
  )
  return (
    <div className="gv-card gv-o1" style={{ display: 'grid', gap: 10 }}>
      <h3 className="gv-h">{s.latest(s.quarter(cur.q))}</h3>
      <div className="gv-data">
        {item(s.pce, cur.pce4, real?.pce4, s.pceHelp)}
        {item(s.u, cur.u, real?.u)}
        {item(s.exp, cur.exp, real?.exp, s.expHelp)}
        {item(s.un, cur.un, null)}
      </div>
      {real && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
          <span className="gv-num">{s.youSet(pct(p.rate))}</span>
          <span className="gv-num gv-muted">{s.fedSet(pct(real.ff))}</span>
        </div>
      )}
    </div>
  )
}

function Decision({ run, s, busy, onDecide }) {
  const now = run.now
  const [rate, setRate] = useState(now.rate)
  const [showTaylor, setShowTaylor] = useState(false)
  const base = Math.round(now.rate * 4) / 4
  const set = (v) => setRate(Math.min(MAX_RATE, Math.max(0, Math.round(v * 4) / 4)))
  const delta = rate - base
  const tv = Math.round(now.taylor * 4) / 4
  return (
    <div className="gv-card gv-o2" style={{ display: 'grid', gap: 12, borderColor: `${ACCENT}66` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h3 className="gv-h" style={{ color: ACCENT }}>{s.setRate(s.quarter(now.q))}</h3>
        <span className="gv-muted gv-num" style={{ fontSize: 12 }}>{s.now} {pct(now.rate)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <button className="gv-step" onClick={() => set(rate - 0.25)} aria-label="−0.25" disabled={busy || rate <= 0}>−</button>
        <div style={{ display: 'grid', gap: 4, minWidth: 130 }}>
          <div className="gv-rate">{rate.toFixed(2)}%</div>
          <div className="gv-num" style={{ textAlign: 'center', fontSize: 13, fontWeight: 650, color: delta > 0 ? HOT : delta < 0 ? TARGET : 'var(--text-secondary)' }}>
            {delta === 0 ? s.hold : `${s.change} ${signedPts(delta)}`}
          </div>
        </div>
        <button className="gv-step" onClick={() => set(rate + 0.25)} aria-label="+0.25" disabled={busy || rate >= MAX_RATE}>+</button>
      </div>
      <input className="gv-range" type="range" id="gv-rate" min="0" max={MAX_RATE} step="0.25" value={rate} onChange={(e) => set(Number(e.target.value))} aria-label={s.yourRate} />
      <div className="gv-chips">
        {[-1, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map((d) => (
          <button key={d} className={`gv-chip${Math.abs(delta - d) < 1e-9 ? ' on' : ''}`} onClick={() => set(base + d)} disabled={busy || base + d < 0}>
            {d === 0 ? s.hold : signedPts(d)}
          </button>
        ))}
      </div>
      <button className="gv-btn primary" onClick={() => onDecide(rate)} disabled={busy} style={{ padding: '11px 14px', fontSize: 14 }}>
        {busy ? s.deciding : s.decide}
      </button>
      <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 10, display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 650 }}>📐 {s.taylor}</span>
          <button className="gv-chip" onClick={() => setShowTaylor(!showTaylor)} aria-expanded={showTaylor}>{showTaylor ? s.taylorHide : s.taylorShow}</button>
        </div>
        {showTaylor && <p className="gv-muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>{tv < 0 ? s.taylorNeg(pct(tv)) : s.taylorText(pct(tv))}</p>}
      </div>
    </div>
  )
}

function News({ run, s }) {
  const newest = run.played.length ? run.played[run.played.length - 1].q : null
  return (
    <div className="gv-card gv-o4" style={{ display: 'grid', gap: 10 }}>
      <h3 className="gv-h">📰 {newest ? s.revealed(s.quarter(newest)) : s.history}</h3>
      {newest && !run.events.some((e) => e.new) && <span className="gv-muted" style={{ fontSize: 13 }}>{s.newsEmpty}</span>}
      <div className="gv-news">
        {run.events.map((e, i) => (
          <div key={`${e.q}-${i}`} className={`gv-ev${e.new ? ' new' : ''}`}>
            <span className="gv-muted" style={{ fontSize: 11.5 }}>{s.quarter(e.q)}{e.source && e.source !== '—' ? ` · ${e.source}` : ''}</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Result({ run, s, lang, board, studyHref, labHref, onReplay, onBack }) {
  const r = run.result
  const cs = casesStrings(lang)
  const rows = ['avg_pce4', 'peak_pce4', 'end_pce4', 'avg_u', 'peak_u', 'end_u', 'end_exp', 'avg_rate', 'peak_rate']
  const tone = r.verdict === 'better' ? TARGET : r.verdict === 'worse' ? HOT : ACCENT
  return (
    <div className="gv-side">
      <div className="gv-card gv-o1" style={{ display: 'grid', gap: 10, borderColor: `${tone}88` }}>
        <h3 className="gv-h">{s.resultTitle}</h3>
        <b style={{ fontSize: 20, lineHeight: 1.35, color: tone }}>{s.verdict[r.verdict]}</b>
        <span className="gv-num" style={{ fontSize: 14 }}>{s.missLine(r.me.miss.toFixed(2), r.fed.miss.toFixed(2))}</span>
        <span className="gv-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>{s.missHelp}</span>
        <div className="gv-scroll">
          <table className="gv-table">
            <thead><tr><th>{s.table.metric}</th><th>{s.table.you}</th><th>{s.table.fed}</th></tr></thead>
            <tbody>{rows.map((k) => <tr key={k}><td>{s.table[k]}</td><td style={{ color: ACCENT, fontWeight: 700 }}>{pct(r.me[k])}</td><td>{pct(r.fed[k])}</td></tr>)}</tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="gv-btn primary" onClick={onReplay}>{s.replay}</button>
          <button className="gv-btn" onClick={onBack}>{s.other}</button>
        </div>
      </div>
      <div className="gv-card gv-o4" style={{ display: 'grid', gap: 8 }}>
        <h3 className="gv-h">{s.lessonsTitle}</h3>
        {r.lessons.map((k) => <p key={k} style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65 }}>• {s.lessons[k]}</p>)}
      </div>
      <div className="gv-card gv-o4" style={{ display: 'grid', gap: 8 }}>
        <h3 className="gv-h">{s.epilogue}</h3>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7 }}>{r.epilogue}</p>
      </div>
      <div className="gv-card gv-o4" style={{ display: 'grid', gap: 8 }}>
        <h3 className="gv-h">📘 {s.learnMore}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {STUDY.map(([b, t]) => <Link key={b} className="gv-topic" to={studyHref(b, t)}><b>{cs.boards[b]}</b>{s.studyLink}</Link>)}
          <Link className="gv-topic" to={labHref('phillips')}>📐 {s.diagramLink}</Link>
          <Link className="gv-topic" to={labHref('adas')}>📐 {s.adasLink}</Link>
        </div>
      </div>
      {board && (
        <div className="gv-card gv-o4" style={{ display: 'grid', gap: 8 }}>
          <h3 className="gv-h">🏆 {s.board}</h3>
          {board.rows.length === 0 && <span className="gv-muted" style={{ fontSize: 13 }}>{s.boardEmpty}</span>}
          {board.rows.map((row) => (
            <div key={`${row.rank}-${row.nickname}`} className="gv-num" style={{ display: 'flex', gap: 10, fontSize: 13, fontWeight: row.is_me ? 750 : 400 }}>
              <span style={{ width: 26 }}>{row.rank}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.nickname || s.anon}{row.is_me ? ` (${s.meTag})` : ''}</span>
              <span>{row.miss.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Game({ s, lang, run, busy, err, board, studyHref, labHref, onDecide, onRestart, onBack }) {
  const sc = run.scenario
  return (
    <div className="gv">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="gv-btn" onClick={onBack}>{s.back}</button>
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <b style={{ fontSize: 18 }}>🏛 {sc.title}</b>
          <span className="gv-muted gv-num" style={{ fontSize: 12.5 }}>
            {run.finished ? s.resultTitle : `${s.quarter(run.now.q)} · ${s.decisionN(run.decision + 1, sc.n_decisions)}`}
          </span>
        </div>
        {!run.finished && <button className="gv-btn" onClick={onRestart} disabled={busy} style={{ marginLeft: 'auto' }}>{s.replay}</button>}
      </div>
      {err && <div style={{ color: HOT, fontSize: 13 }}>{err}</div>}
      <div className="gv-game">
        <div className="gv-o3" style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          <Charts run={run} s={s} />
          <p className="gv-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>{s.source}</p>
        </div>
        {run.finished
          ? <Result run={run} s={s} lang={lang} board={board} studyHref={studyHref} labHref={labHref} onReplay={onRestart} onBack={onBack} />
          : (
            <div className="gv-side">
              <Latest run={run} s={s} />
              <Decision key={run.decision} run={run} s={s} busy={busy} onDecide={onDecide} />
              <News run={run} s={s} />
            </div>
          )}
      </div>
    </div>
  )
}

const defaultStudyHref = (board, topic) => `/study/${board}?topic=${topic}`
const defaultLabHref = (d) => `/diagrams?d=${d}`

export default function GovernorPage({ lang, studyHref = defaultStudyHref, labHref = defaultLabHref }) {
  const s = governorStrings(lang)
  const user = useAuthStore((st) => st.user)
  const key = user?.id ?? getDeviceId()
  const [list, setList] = useState(null)
  const [active, setActive] = useState(() => { try { return new URLSearchParams(window.location.search).get('s') } catch { return null } })
  const [run, setRun] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [board, setBoard] = useState(null)

  const loadList = useCallback(() => {
    api(`scenarios?lang=${lang}&device_id=${encodeURIComponent(key)}`).then((d) => setList(d.scenarios)).catch(() => setList([]))
  }, [lang, key])
  useEffect(() => { if (!active) loadList() }, [active, loadList])

  // Keep the scenario in the address so a link opens it
  useEffect(() => {
    const url = active ? `${window.location.pathname}?s=${active}` : window.location.pathname
    window.history.replaceState(window.history.state, '', url)
  }, [active])

  // Open the chosen scenario: resume the saved run, or start one
  useEffect(() => {
    if (!active) return undefined
    let alive = true
    api('state', { device_id: key, scenario: active, lang })
      .then((d) => d.run || api('start', { device_id: key, scenario: active, lang }).then((x) => x.run))
      .then((r) => { if (alive) { setRun(r); setErr('') } })
      .catch((e) => { if (alive) { setErr(e.message); setActive(null) } })
    return () => { alive = false }
  }, [active, key, lang])

  useEffect(() => {
    if (!run?.finished) return undefined
    let alive = true
    api(`leaderboard?scenario=${run.scenario.id}&device_id=${encodeURIComponent(key)}`).then((b) => { if (alive) setBoard(b) }).catch(() => {})
    return () => { alive = false }
  }, [run?.finished, run?.scenario?.id, key])

  const act = async (path, body) => {
    setBusy(true); setErr('')
    try { const d = await api(path, { device_id: key, scenario: active, lang, ...body }); setRun(d.run) }
    catch (e) { setErr(e.message === 'error' ? s.err : e.message) }
    finally { setBusy(false) }
  }

  const pick = (id, fresh) => {
    if (fresh) {
      setRun(null)
      api('start', { device_id: key, scenario: id, lang }).then((d) => { setRun(d.run); setActive(id) }).catch((e) => setErr(e.message))
    } else setActive(id)
  }

  return (
    <div>
      <style>{CSS}</style>
      {!active || !run || run.scenario.id !== active
        ? (active ? <div className="gv"><div className="gv-card skeleton" style={{ height: 420 }} /></div> : <Picker s={s} list={list} onPick={pick} />)
        : <Game s={s} lang={lang} run={run} busy={busy} err={err} board={board} studyHref={studyHref} labHref={labHref}
            onDecide={(rate) => act('decide', { rate })}
            onRestart={() => { setBoard(null); act('start', {}) }}
            onBack={() => { setActive(null); setRun(null); setBoard(null) }} />}
      {!active && err && <div style={{ color: HOT, fontSize: 13, textAlign: 'center' }}>{err}</div>}
    </div>
  )
}
