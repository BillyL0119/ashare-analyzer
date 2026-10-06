import { useEffect, useId, useState } from 'react'
import { useT } from './i18n'
import { changeColor } from './helpers'

export function Pill({ value, market = 'cn', width }) {
  const c = changeColor(value, market)
  const text = value == null ? '--' : `${value > 0 ? '+' : ''}${Number(value).toFixed(2)}%`
  return (
    <span className="m-pill m-num" style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)`, ...(width ? { width, minWidth: 0 } : {}) }}>
      {text}
    </span>
  )
}

export function Section({ title, action, onAction, children }) {
  return (
    <section>
      <div className="m-sec"><span>{title}</span>{action && <button onClick={onAction}>{action}</button>}</div>
      {children}
    </section>
  )
}

export function Skeleton({ h = 14, w = '100%', r = 10, style }) {
  return <div className="m-skel" style={{ height: h, width: w, borderRadius: r, ...style }} aria-hidden="true" />
}
export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="m-card flush" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="m-row" key={i}>
          <div className="m-grow" style={{ display: 'grid', gap: 8 }}><Skeleton w={90 + (i * 23) % 50} h={13} /><Skeleton w={54} h={9} /></div>
          <Skeleton w={68} h={26} r={13} />
        </div>
      ))}
    </div>
  )
}

export function ErrorBox({ onRetry }) {
  const t = useT()
  return (
    <div className="m-card m-empty">
      <div style={{ marginBottom: 12 }}>{t('加载失败')}</div>
      <button className="m-pill" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff' }} onClick={onRetry}>{t('重试')}</button>
    </div>
  )
}

export function Segment({ value, onChange, options, full }) {
  return (
    <div className={'m-seg' + (full ? ' full' : '')} role="group">
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => { navigator.vibrate?.(8); onChange(o.value) }}>{o.label}</button>
      ))}
    </div>
  )
}

export function Sparkline({ values, color, width = 64, height = 32 }) {
  const id = useId()
  if (!values || values.length < 2) return <span style={{ width, height, display: 'inline-block' }} />
  const lo = Math.min(...values), hi = Math.max(...values), span = Math.max(hi - lo, 1e-9), pad = 3
  const pts = values.map((v, i) => [pad + ((width - 2 * pad) * i) / (values.length - 1), pad + (height - 2 * pad) * (1 - (v - lo) / span)])
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${pad},${height} ${line} ${width - pad},${height}`
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ flex: 'none' }}>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.3" fill={color} />
    </svg>
  )
}

const GAUGE_COLORS = ['#EF5350', '#F28B3C', '#E8C54A', '#8FCB5A', '#2FB86A']
function gaugeTint(s) { return s < 30 ? GAUGE_COLORS[0] : s < 45 ? GAUGE_COLORS[1] : s < 55 ? GAUGE_COLORS[2] : s < 70 ? GAUGE_COLORS[3] : GAUGE_COLORS[4] }

/** Fear/greed half dial: the gradient is fixed to the arc, the score only reveals more of it. */
export function Gauge({ title, score = 0, label }) {
  const id = useId()
  const [shown, setShown] = useState(0)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, score)))); return () => cancelAnimationFrame(r) }, [score])
  const R = 52, cx = 64, cy = 64, len = Math.PI * R
  const d = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`
  return (
    <div className="m-tile" style={{ textAlign: 'center', padding: '12px 8px' }} role="img" aria-label={`${title}: ${Math.round(score)}, ${label}`}>
      <div className="m-label" style={{ fontSize: 12 }}>{title}</div>
      <svg viewBox="0 0 128 76" style={{ width: '100%', maxWidth: 150, display: 'block', margin: '4px auto 0' }}>
        <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1={cx - R} x2={cx + R} y1="0" y2="0">
          {GAUGE_COLORS.map((c, i) => <stop key={c} offset={i / 4} stopColor={c} />)}
        </linearGradient></defs>
        <path d={d} fill="none" stroke="var(--surface)" strokeWidth="10" strokeLinecap="round" />
        <path d={d} fill="none" stroke={`url(#${id})`} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - shown / 100)} style={{ transition: 'stroke-dashoffset .9s ease-out' }} />
        <text x={cx} y={cy - 4} textAnchor="middle" className="m-num" style={{ fontSize: 28, fontWeight: 800, fill: 'var(--text)' }}>{Math.round(score)}</text>
      </svg>
      <div style={{ color: gaugeTint(score), fontWeight: 800, fontSize: 13 }}>{label}</div>
    </div>
  )
}
