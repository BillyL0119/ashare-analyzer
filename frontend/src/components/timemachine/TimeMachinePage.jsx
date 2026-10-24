import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useAuthStore from '../../store/authStore'
import getDeviceId from '../../utils/deviceId'
import { paperHeaders } from '../../utils/paperAuth'
import { fmt, money, signed, pct, plColor, UP, DOWN, ACCENT, MUTED, BDR } from '../paper/ui'
import tmStrings from './tmStrings'

// History time machine: replay a real market episode one day at a time with virtual cash. The server
// only ever sends what was known on the current day, so the future cannot be read from the page.

const LOCALE = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' }
const longDate = (d, lang) => new Date(`${d}T12:00:00Z`).toLocaleDateString(LOCALE[lang] || 'en-US',
  { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' })
const shortDate = (d, lang) => new Date(`${d}T12:00:00Z`).toLocaleDateString(LOCALE[lang] || 'en-US',
  { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
const YEAR_TINT = { gfc_2008: '#ef4444', covid_2020: '#8b5cf6', ashare_2015: '#f59e0b', rates_2022: '#0ea5e9' }

async function api(path, body) {
  const r = await fetch(`/api/time-machine/${path}`, body
    ? { method: 'POST', headers: paperHeaders(), body: JSON.stringify(body) }
    : { headers: paperHeaders() })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : 'error')
  return d
}

const CSS = `
.tm { display: grid; gap: 16px; max-width: 1240px; margin: 0 auto; width: 100%; padding-bottom: 40px; }
.tm-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 14px; padding: 16px; min-width: 0; }
.tm-h { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: .2px; }
.tm-muted { color: var(--text-secondary); }
.tm-btn { border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); border-radius: 9px; padding: 8px 14px; font-size: 13px; font-weight: 650; cursor: pointer; white-space: nowrap; }
.tm-btn:disabled { opacity: .45; cursor: not-allowed; }
.tm-btn.primary { background: linear-gradient(135deg, #0ea5e9, #6366f1); border-color: transparent; color: #fff; }
.tm-btn:focus-visible, .tm-row:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
.tm-picks { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.tm-pick { display: grid; gap: 10px; align-content: start; position: relative; overflow: hidden; }
.tm-year { font-size: 44px; font-weight: 800; line-height: 1; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
.tm-how { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.tm-game { display: grid; grid-template-columns: 290px minmax(0, 1fr) 310px; gap: 14px; align-items: start; }
.tm-side { display: grid; gap: 14px; min-width: 0; }
.tm-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 9px; cursor: pointer; border: 1px solid transparent; }
.tm-row:hover { background: var(--bg-tertiary); }
.tm-row.on { border-color: ${ACCENT}88; background: ${ACCENT}14; }
.tm-num { font-variant-numeric: tabular-nums; }
.tm-input { width: 100%; min-width: 0; background: var(--bg-tertiary); border: 1px solid var(--border-primary); color: var(--text-primary); border-radius: 9px; padding: 8px 10px; font-size: 14px; }
.tm-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.tm-news { display: grid; gap: 10px; max-height: 620px; overflow-y: auto; }
.tm-ev { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-primary); display: grid; gap: 4px; }
.tm-ev.new { border-color: #f59e0b88; background: #f59e0b12; }
.tm-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.tm-table th { text-align: left; font-weight: 600; color: var(--text-secondary); padding: 6px 8px; border-bottom: 1px solid var(--border-primary); white-space: nowrap; }
.tm-table td { padding: 7px 8px; border-bottom: 1px solid var(--border-primary); white-space: nowrap; font-variant-numeric: tabular-nums; }
.tm-scroll { overflow-x: auto; }
.tm-bar { height: 6px; border-radius: 3px; background: var(--bg-tertiary); overflow: hidden; }
.tm-big { font-size: 34px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
@media (max-width: 1150px) { .tm-game { grid-template-columns: 280px minmax(0, 1fr); } .tm-news-col { grid-column: 1 / -1; } }
@media (max-width: 760px) {
  .tm-game { grid-template-columns: minmax(0, 1fr); } .tm-how { grid-template-columns: 1fr; } .tm-big { font-size: 28px; } .tm-news { max-height: none; }
  .tm-list { display: flex !important; overflow-x: auto; gap: 6px !important; scrollbar-width: none; }
  .tm-list > h3 { display: none; }
  .tm-list .tm-row { flex: none; width: 150px; border-color: var(--border-primary); }
}
`

// ── Chart ─────────────────────────────────────────────────────────────────────

function LineChart({ series, height = 220, startIndex = 0, markers = [], fmtY, labels, lang }) {
  // Drawn at the container's real width so the axis text is never stretched
  const box = useRef(null)
  const [W, setW] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = height, P = { l: 8, r: 58, t: 12, b: 22 }
  const [hover, setHover] = useState(null)
  const n = Math.max(...series.map((s) => s.values.length))
  const vals = series.flatMap((s) => s.values.filter((v) => v != null))
  if (n < 2 || !vals.length) return <div ref={box} style={{ height }} />
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (hi === lo) { hi += 1; lo -= 1 }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad
  const x = (i) => P.l + (i / (n - 1)) * (W - P.l - P.r)
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b)
  const path = (values) => {
    let d = '', pen = false
    values.forEach((v, i) => { if (v == null) { pen = false; return } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true })
    return d
  }
  const ticks = [hi - pad, (hi + lo) / 2, lo + pad]
  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - box.left) / box.width * W - P.l) / (W - P.l - P.r) * (n - 1))
    setHover(i >= 0 && i < n ? i : null)
  }
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--border-primary)" strokeDasharray="3 4" />
            <text x={W - P.r + 6} y={y(t) + 4} fontSize="11" fill="var(--text-muted)">{fmtY(t)}</text>
          </g>
        ))}
        {startIndex > 0 && startIndex < n && (
          <>
            <rect x={P.l} y={P.t} width={x(startIndex) - P.l} height={H - P.t - P.b} fill="var(--bg-tertiary)" opacity="0.55" />
            <line x1={x(startIndex)} x2={x(startIndex)} y1={P.t} y2={H - P.b} stroke="var(--text-muted)" strokeDasharray="2 3" />
          </>
        )}
        {markers.map((m) => m < n && <circle key={m} cx={x(m)} cy={H - P.b + 7} r="3" fill="#f59e0b" />)}
        {series.map((s) => <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeDasharray={s.dash} strokeLinejoin="round" />)}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--text-muted)" />}
      </svg>
      {hover != null && (
        <div style={{ position: 'absolute', top: 4, left: 8, fontSize: 12, padding: '4px 8px', borderRadius: 7, background: 'var(--bg-primary)', border: `1px solid ${BDR}`, pointerEvents: 'none' }}>
          <b className="tm-num">{labels?.[hover] ? shortDate(labels[hover], lang) : ''}</b>
          {series.map((s) => s.values[hover] != null && <span key={s.key} className="tm-num" style={{ marginLeft: 10, color: s.color }}>{s.label ? `${s.label} ` : ''}{fmtY(s.values[hover])}</span>)}
        </div>
      )}
    </div>
  )
}

// ── Scenario picker ───────────────────────────────────────────────────────────

function Picker({ s, lang, list, onPick }) {
  return (
    <div className="tm">
      <div style={{ display: 'grid', gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>🕰 {s.title}</h1>
        <p className="tm-muted" style={{ margin: 0, fontSize: 14, maxWidth: 720, lineHeight: 1.6 }}>{s.subtitle}</p>
      </div>
      <div className="tm-how">
        {s.how.map(([h, d], i) => (
          <div key={h} className="tm-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14 }}>
            <span className="tm-num" style={{ flex: 'none', width: 26, height: 26, borderRadius: 13, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, color: '#fff', background: ACCENT }}>{i + 1}</span>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{h}</div><div className="tm-muted" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 2 }}>{d}</div></div>
          </div>
        ))}
      </div>
      <div className="tm-picks">
        {(list || []).map((sc) => {
          const tint = YEAR_TINT[sc.id] || ACCENT
          const pr = sc.progress
          return (
            <div key={sc.id} className="tm-card tm-pick" style={{ borderTop: `3px solid ${tint}` }}>
              <div className="tm-year" style={{ color: tint }}>{sc.start_date.slice(0, 4)}</div>
              <div style={{ fontSize: 17, fontWeight: 750 }}>{sc.title}</div>
              <div className="tm-muted tm-num" style={{ fontSize: 12 }}>{shortDate(sc.start_date, lang)} → {shortDate(sc.end_date, lang)} · {s.days(sc.n_days)}</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{sc.tagline}</p>
              <div className="tm-muted" style={{ fontSize: 12 }}>{s.startCash} <b className="tm-num" style={{ color: 'var(--text-primary)' }}>{money(sc.cash, sc.market, 0)}</b> · {s.instruments(sc.instruments)}</div>
              {pr && !pr.finished && <div className="tm-muted" style={{ fontSize: 12 }}>{s.inProgress(pr.day + 1, sc.n_days)} · <span className="tm-num" style={{ color: plColor(pr.return_pct, sc.market) }}>{pct(pr.return_pct)}</span></div>}
              {pr?.best != null && <div className="tm-muted" style={{ fontSize: 12 }}>{s.yourBest} <b className="tm-num" style={{ color: plColor(pr.best, sc.market) }}>{pct(pr.best)}</b></div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {pr && !pr.finished
                  ? <><button className="tm-btn primary" onClick={() => onPick(sc.id, false)}>{s.resume}</button><button className="tm-btn" onClick={() => onPick(sc.id, true)}>{s.restart}</button></>
                  : <button className="tm-btn primary" onClick={() => onPick(sc.id, true)}>{pr ? s.replay : s.start}</button>}
              </div>
            </div>
          )
        })}
        {!list && [0, 1, 2, 3].map((i) => <div key={i} className="tm-card skeleton" style={{ height: 260 }} />)}
      </div>
      <p className="tm-muted" style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6 }}>{s.disclaimer}</p>
    </div>
  )
}

// ── Result ────────────────────────────────────────────────────────────────────

function Result({ s, lang, run, board, onReplay, onBack }) {
  const r = run.result
  const m = run.scenario.market
  const sym = (t) => run.instruments.find((i) => i.symbol === t.symbol)?.name || t.symbol
  return (
    <div className="tm-card" style={{ display: 'grid', gap: 16, borderColor: `${ACCENT}66` }}>
      <h2 className="tm-h" style={{ fontSize: 18 }}>🏁 {s.resultTitle}</h2>
      <div className="tm-stats">
        <div><div className="tm-muted" style={{ fontSize: 12 }}>{s.ret}</div><div className="tm-big" style={{ color: plColor(r.return_pct, m) }}>{pct(r.return_pct)}</div>
          <div className="tm-muted tm-num" style={{ fontSize: 12 }}>{s.maxDd} {pct(r.max_drawdown_pct)}</div></div>
        <div><div className="tm-muted" style={{ fontSize: 12 }}>{s.bench}</div><div className="tm-big" style={{ color: plColor(r.bench_return_pct, m) }}>{pct(r.bench_return_pct)}</div>
          <div className="tm-muted tm-num" style={{ fontSize: 12 }}>{s.maxDd} {pct(r.bench_max_drawdown_pct)}</div></div>
        <div style={{ display: 'grid', gap: 4, alignContent: 'start', fontSize: 12.5 }}>
          <span className="tm-muted">{s.tradesN(r.trades)}</span>
          {r.best && <span>{s.best}: <b>{sym(r.best)}</b> <span className="tm-num" style={{ color: plColor(r.best.pl, m) }}>{signed(r.best.pl, m, 0)}</span></span>}
          {r.worst && r.worst !== r.best && <span>{s.worst}: <b>{sym(r.worst)}</b> <span className="tm-num" style={{ color: plColor(r.worst.pl, m) }}>{signed(r.worst.pl, m, 0)}</span></span>}
          <span className="tm-muted">{s.lowNote(shortDate(r.low_date, lang))}</span>
        </div>
      </div>
      <section style={{ display: 'grid', gap: 6 }}>
        <h3 className="tm-h">{s.lessons}</h3>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 13.5, lineHeight: 1.6 }}>{r.lessons.map((l) => <li key={l}>{l}</li>)}</ul>
      </section>
      <section style={{ display: 'grid', gap: 6 }}>
        <h3 className="tm-h">{s.whatHappened}</h3>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7 }}>{r.epilogue}</p>
      </section>
      {r.exam_points?.length > 0 && (
        <section style={{ display: 'grid', gap: 8 }}>
          <h3 className="tm-h">{s.exam}</h3>
          {r.exam_points.map((p) => (
            <div key={p.exam} style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.55 }}>
              <span style={{ flex: 'none', minWidth: 74, fontWeight: 700, color: ACCENT }}>{p.exam}</span><span>{p.point}</span>
            </div>
          ))}
        </section>
      )}
      {board?.rows?.length > 0 && (
        <section style={{ display: 'grid', gap: 6 }}>
          <h3 className="tm-h">{s.board} <span className="tm-muted" style={{ fontWeight: 400, fontSize: 12 }}>· {s.players(board.players)}</span></h3>
          <div className="tm-scroll"><table className="tm-table"><tbody>
            {board.rows.map((b) => (
              <tr key={b.rank} style={b.is_me ? { background: `${ACCENT}14` } : undefined}>
                <td style={{ width: 30, fontWeight: 800 }}>{b.rank}</td>
                <td>{(b.nickname || s.anon).replace(/^用户#/, lang === 'zh' ? '用户#' : '#')}{b.is_me ? s.me : ''}</td>
                <td style={{ textAlign: 'right', color: plColor(b.return_pct, m), fontWeight: 700 }}>{pct(b.return_pct)}</td>
              </tr>
            ))}
          </tbody></table></div>
        </section>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="tm-btn primary" onClick={onReplay}>{s.replay}</button>
        <button className="tm-btn" onClick={onBack}>{s.back}</button>
      </div>
    </div>
  )
}

// ── Game ──────────────────────────────────────────────────────────────────────

function Game({ s, lang, run, busy, err, onAdvance, onTrade, onRestart, onBack, board }) {
  const sc = run.scenario
  const m = sc.market
  const [sel, setSel] = useState(sc.benchmark)
  const [qty, setQty] = useState('')
  const inst = run.instruments.find((i) => i.symbol === sel) || run.instruments[0]
  const held = run.portfolio.positions.find((p) => p.symbol === inst.symbol)
  const lot = sc.lot || 1
  const maxBuy = inst.price ? Math.floor(run.portfolio.cash / inst.price / lot) * lot : 0
  const day = run.day + 1
  const fresh = run.events.filter((e) => e.new)
  const markers = useMemo(() => run.events.map((e) => run.dates.indexOf(e.date)).filter((i) => i >= 0), [run.events, run.dates])
  const windowDates = run.dates.slice(run.start_index)

  // → moves a day forward (outside text fields)
  const advRef = useRef(onAdvance)
  useEffect(() => { advRef.current = onAdvance }, [onAdvance])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowRight' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return
      e.preventDefault(); advRef.current(e.shiftKey ? 5 : 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const trade = (side) => {
    const n = Math.floor(Number(qty))
    if (!(n > 0)) return
    onTrade(inst.symbol, side, n).then((ok) => { if (ok) setQty('') })
  }

  return (
    <div className="tm">
      <div className="tm-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="tm-btn" onClick={onBack} aria-label={s.back}>← {s.back}</button>
          <div style={{ minWidth: 0, flex: '1 1 260px' }}>
            <div className="tm-muted" style={{ fontSize: 12 }}>🕰 {sc.title}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{longDate(run.date, lang)}</div>
          </div>
          {!run.finished && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="tm-btn primary" disabled={busy} onClick={() => onAdvance(1)}>{s.next} ▶</button>
              <button className="tm-btn" disabled={busy} onClick={() => onAdvance(5)}>{s.week} ⏩</button>
              <button className="tm-btn" disabled={busy} onClick={() => { if (window.confirm(s.toEndConfirm)) onAdvance(9999) }}>{s.toEnd} ⏭</button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="tm-muted tm-num" style={{ fontSize: 12, flex: 'none' }}>{s.day(day, sc.n_days)}</span>
          <div className="tm-bar" style={{ flex: 1 }}><div style={{ width: `${(day / sc.n_days) * 100}%`, height: '100%', background: ACCENT }} /></div>
          {!run.finished && <button className="tm-muted" onClick={() => { if (window.confirm(s.restartConfirm)) onRestart() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>{s.restart}</button>}
        </div>
        {fresh.length > 0 && !run.finished && (
          <div role="status" style={{ display: 'grid', gap: 4, padding: '10px 12px', borderRadius: 10, background: '#f59e0b14', border: '1px solid #f59e0b66' }}>
            {fresh.slice(0, 3).map((e) => <div key={e.text} style={{ fontSize: 13.5, lineHeight: 1.5 }}>📰 <b>{shortDate(e.date, lang)}</b> {e.text}</div>)}
          </div>
        )}
        {err && <div style={{ color: DOWN, fontSize: 13 }}>{err}</div>}
      </div>

      {run.finished && run.result && <Result s={s} lang={lang} run={run} board={board} onReplay={onRestart} onBack={onBack} />}

      <div className="tm-stats">
        {[
          [s.total, money(run.portfolio.value, m, 0), null],
          [s.ret, pct(run.portfolio.return_pct), plColor(run.portfolio.return_pct, m)],
          [s.bench, pct(run.portfolio.bench_return_pct), plColor(run.portfolio.bench_return_pct, m)],
          [s.cash, money(run.portfolio.cash, m, 0), null],
        ].map(([k, v, c]) => (
          <div key={k} className="tm-card" style={{ padding: '12px 14px' }}>
            <div className="tm-muted" style={{ fontSize: 12 }}>{k}</div>
            <div className="tm-num" style={{ fontSize: 20, fontWeight: 800, color: c || undefined }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="tm-game">
        <div className="tm-side">
          <div className="tm-card tm-list" style={{ display: 'grid', gap: 6, padding: 10 }}>
            <h3 className="tm-h" style={{ padding: '4px 6px' }}>{s.market}</h3>
            {run.instruments.map((i) => (
              <div key={i.symbol} role="button" tabIndex={0} className={`tm-row${i.symbol === inst.symbol ? ' on' : ''}`}
                onClick={() => setSel(i.symbol)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(i.symbol) } }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.name}</div>
                  <div className="tm-muted tm-num" style={{ fontSize: 11.5 }}>{i.symbol}{i.kind === 'etf' ? ' · ETF' : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tm-num" style={{ fontSize: 13.5, fontWeight: 650 }}>{i.price != null ? fmt(i.price, 2) : '—'}</div>
                  <div className="tm-num" style={{ fontSize: 11.5, color: i.suspended ? MUTED : plColor(i.change_pct, m) }}>{i.suspended ? s.suspended : pct(i.change_pct)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tm-side">
          <div className="tm-card" style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h3 className="tm-h" style={{ fontSize: 16 }}>{inst.name}</h3>
              <span className="tm-muted tm-num" style={{ fontSize: 12 }}>{inst.symbol}</span>
              <span className="tm-num" style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800 }}>{inst.price != null ? money(inst.price, m) : '—'}</span>
              <span className="tm-num" style={{ fontSize: 13, fontWeight: 700, color: plColor(inst.change_pct, m) }}>{inst.suspended ? s.suspended : pct(inst.change_pct)}</span>
            </div>
            <LineChart lang={lang} labels={run.dates} startIndex={run.start_index} markers={markers} fmtY={(v) => fmt(v, v < 10 ? 2 : 1)}
              series={[{ key: 'p', values: inst.closes, color: plColor((inst.price || 0) - (inst.closes[run.start_index] || 0), m) === MUTED ? ACCENT : plColor((inst.price || 0) - (inst.closes[run.start_index] || 0), m) }]} />
            {!run.finished && (
              <div style={{ display: 'grid', gap: 8, paddingTop: 10, borderTop: `1px solid ${BDR}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label htmlFor="tm-qty" className="tm-muted" style={{ fontSize: 12.5 }}>{s.shares}</label>
                  <input id="tm-qty" className="tm-input tm-num" type="number" min={lot} step={lot} value={qty} onChange={(e) => setQty(e.target.value)} style={{ flex: '1 1 110px', maxWidth: 160 }} />
                  <button className="tm-btn" type="button" onClick={() => setQty(String(maxBuy))} disabled={!maxBuy}>{s.max}</button>
                  <button className="tm-btn" type="button" disabled={busy || inst.suspended || !(Number(qty) > 0)} onClick={() => trade('buy')} style={{ background: UP, borderColor: UP, color: '#fff' }}>{s.buy}</button>
                  <button className="tm-btn" type="button" disabled={busy || inst.suspended || !held || !(Number(qty) > 0)} onClick={() => trade('sell')} style={{ background: DOWN, borderColor: DOWN, color: '#fff' }}>{s.sell}</button>
                </div>
                <div className="tm-muted" style={{ fontSize: 12 }}>
                  {held ? <>{s.holding(held.shares)} · {s.cost} {money(held.cost, m)} · <button onClick={() => setQty(String(held.shares))} style={{ background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', padding: 0, fontSize: 12 }}>{s.sell} {held.shares}</button> · </> : null}
                  {s.fillNote}{lot > 1 ? ` ${s.lotNote(lot)}` : ''}
                </div>
              </div>
            )}
          </div>

          <div className="tm-card" style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 14, fontSize: 12.5, flexWrap: 'wrap' }}>
              <span><span style={{ display: 'inline-block', width: 14, height: 3, background: ACCENT, verticalAlign: 'middle', marginRight: 6 }} />{s.chartYou}</span>
              <span className="tm-muted"><span style={{ display: 'inline-block', width: 14, height: 0, borderTop: '2px dashed var(--text-muted)', verticalAlign: 'middle', marginRight: 6 }} />{s.chartBench}</span>
            </div>
            <LineChart lang={lang} labels={windowDates} height={170} fmtY={(v) => money(v, m, 0)}
              series={[{ key: 'b', values: run.portfolio.bench, color: 'var(--text-muted)', dash: '5 4', width: 1.5, label: s.chartBench }, { key: 'v', values: run.portfolio.values, color: ACCENT, label: s.chartYou }]} />
          </div>

          <div className="tm-card" style={{ display: 'grid', gap: 8 }}>
            <h3 className="tm-h">{s.positions}</h3>
            {run.portfolio.positions.length === 0 ? <div className="tm-muted" style={{ fontSize: 13 }}>{s.noPositions}</div> : (
              <div className="tm-scroll"><table className="tm-table">
                <thead><tr><th>{s.market}</th><th style={{ textAlign: 'right' }}>{s.shares}</th><th style={{ textAlign: 'right' }}>{s.cost}</th><th style={{ textAlign: 'right' }}>{s.price}</th><th style={{ textAlign: 'right' }}>{s.value}</th><th style={{ textAlign: 'right' }}>{s.pl}</th></tr></thead>
                <tbody>{run.portfolio.positions.map((p) => (
                  <tr key={p.symbol} onClick={() => setSel(p.symbol)} style={{ cursor: 'pointer' }}>
                    <td><b>{p.name}</b> <span className="tm-muted">{p.symbol}</span></td>
                    <td style={{ textAlign: 'right' }}>{p.shares}</td><td style={{ textAlign: 'right' }}>{fmt(p.cost)}</td><td style={{ textAlign: 'right' }}>{fmt(p.price)}</td>
                    <td style={{ textAlign: 'right' }}>{money(p.value, m, 0)}</td>
                    <td style={{ textAlign: 'right', color: plColor(p.pl, m) }}>{signed(p.pl, m, 0)} ({pct(p.pl_pct)})</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
            {run.trades.length > 0 && (
              <details>
                <summary className="tm-muted" style={{ cursor: 'pointer', fontSize: 12.5 }}>{s.trades} ({run.trades.length})</summary>
                <div className="tm-scroll"><table className="tm-table"><tbody>{run.trades.map((t, k) => (
                  <tr key={k}><td>{shortDate(t.date, lang)}</td><td style={{ color: t.side === 'buy' ? UP : DOWN, fontWeight: 700 }}>{t.side === 'buy' ? s.buy : s.sell}</td>
                    <td>{run.instruments.find((i) => i.symbol === t.symbol)?.name || t.symbol}</td><td style={{ textAlign: 'right' }}>{t.shares} × {fmt(t.price)}</td>
                    <td style={{ textAlign: 'right', color: t.pl != null ? plColor(t.pl, m) : undefined }}>{t.pl != null ? signed(t.pl, m, 0) : ''}</td></tr>
                ))}</tbody></table></div>
              </details>
            )}
          </div>
        </div>

        <div className="tm-side tm-news-col">
          <div className="tm-card" style={{ display: 'grid', gap: 10 }}>
            <h3 className="tm-h">📰 {s.news}</h3>
            <div className="tm-news">
              {run.notes.map((n) => (
                <div key={`n${n.date}${n.symbol}`} className={`tm-ev${n.new ? ' new' : ''}`}>
                  <div className="tm-muted tm-num" style={{ fontSize: 11.5 }}>{shortDate(n.date, lang)} · {s.notesTitle}</div>
                  <div style={{ fontSize: 13 }}>{s.dividend(run.instruments.find((i) => i.symbol === n.symbol)?.name || n.symbol, n.text, money(n.cash, m), n.shares)}</div>
                </div>
              ))}
              {run.events.length === 0 && <div className="tm-muted" style={{ fontSize: 13 }}>{s.newsEmpty}</div>}
              {run.events.map((e) => (
                <div key={e.date + e.text} className={`tm-ev${e.new ? ' new' : ''}`}>
                  <div className="tm-muted tm-num" style={{ fontSize: 11.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                    {e.new && <span style={{ color: '#fff', background: '#f59e0b', borderRadius: 4, padding: '0 5px', fontWeight: 700 }}>{s.fresh}</span>}
                    {shortDate(e.date, lang)}{e.happened !== e.date ? ` · ${s.happened(shortDate(e.happened, lang))}` : ''}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>{e.text}</div>
                  <div className="tm-muted" style={{ fontSize: 11 }}>{s.source}: {e.source}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="tm-muted" style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6 }}>{s.disclaimer}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TimeMachinePage({ lang }) {
  const s = tmStrings(lang)
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
    try { const d = await api(path, { device_id: key, scenario: active, lang, ...body }); setRun(d.run); return true }
    catch (e) { setErr(e.message || s.err); return false }
    finally { setBusy(false) }
  }

  const pick = (id, fresh) => {
    if (fresh) {
      setRun(null)
      api('start', { device_id: key, scenario: id, lang }).then((d) => { setRun(d.run); setActive(id) }).catch((e) => setErr(e.message))
    } else setActive(id)
  }

  return (
    <div style={{ paddingTop: 18 }}>
      <style>{CSS}</style>
      {!active || !run || run.scenario.id !== active
        ? (active ? <div className="tm"><div className="tm-card skeleton" style={{ height: 420 }} /></div> : <Picker s={s} lang={lang} list={list} onPick={pick} />)
        : <Game key={active} s={s} lang={lang} run={run} busy={busy} err={err} board={board}
            onAdvance={(days) => act('advance', { days })}
            onTrade={(symbol, side, shares) => act('trade', { symbol, side, shares })}
            onRestart={() => { setBoard(null); act('start', {}) }}
            onBack={() => { setActive(null); setRun(null); setBoard(null) }} />}
      {!active && err && <div style={{ color: DOWN, fontSize: 13, textAlign: 'center' }}>{err}</div>}
    </div>
  )
}
