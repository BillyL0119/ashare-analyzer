import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { tileColor } from '../utils/heatmap'
import { useMobile } from '../hooks/useMobile'
import { T } from '../i18n/translations'
import useThemeStore from '../store/themeStore'
import {
  ComposableMap, Geographies, Geography,
  Marker, Graticule, Sphere,
} from 'react-simple-maps'
import worldAtlas from 'world-atlas/countries-110m.json'

// ── Geo data (self-hosted via npm world-atlas) ────────────────────────────────
const GEO_URL = worldAtlas

// Marker label positions [lon, lat] keyed by geo ID string
const MARKER_META = {
  '840': { label: 'S&P',    label_zh: '标普',  coords: [-100, 40] },
  '124': { label: 'TSX',    label_zh: 'TSX',   coords: [  -96, 57] },
  '826': { label: 'FTSE',   label_zh: '富时',  coords: [   -2, 54] },
  '276': { label: 'DAX',    label_zh: 'DAX',   coords: [   10, 52] },
  '250': { label: 'CAC',    label_zh: 'CAC',   coords: [    2, 46] },
  '356': { label: 'SENSEX', label_zh: '感指',  coords: [   79, 22] },
  '156': { label: 'SSE',    label_zh: '上证',  coords: [  104, 35] },
  '410': { label: 'KOSPI',  label_zh: '韩综',  coords: [  128, 37] },
  '392': { label: 'Nikkei', label_zh: '日经',  coords: [  138, 37] },
  '36':  { label: 'ASX',    label_zh: 'ASX',   coords: [  134,-25] },
}

// ── Ticker helpers ────────────────────────────────────────────────────────────
function changePctColor(pct) {
  if (pct === null || pct === undefined) return 'var(--text-secondary)'
  if (pct > 0)  return '#10b981'
  if (pct < 0)  return '#ef4444'
  return 'var(--text-secondary)'
}
function changePctBg(pct) {
  if (pct === null || pct === undefined) return 'rgba(148,163,184,0.06)'
  if (pct > 0) return 'rgba(16,185,129,0.08)'
  if (pct < 0) return 'rgba(239,68,68,0.08)'
  return 'rgba(148,163,184,0.06)'
}
function changePctBorder(pct) {
  if (pct === null || pct === undefined) return 'rgba(148,163,184,0.15)'
  if (pct > 0) return 'rgba(16,185,129,0.2)'
  if (pct < 0) return 'rgba(239,68,68,0.2)'
  return 'rgba(148,163,184,0.15)'
}

// ── Sentiment gauge ───────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s < 25) return '#ef4444'
  if (s < 45) return '#f97316'
  if (s < 55) return '#fbbf24'
  if (s < 75) return '#84cc16'
  return '#22c55e'
}

// Semicircle gauge in plain SVG: soft full-range track, a progress arc in the same five-colour
// scale ending in a knob at the score, and the score itself set large in the middle.
const GAUGE_STOPS = ['#ef4444', '#f97316', '#fbbf24', '#84cc16', '#22c55e']

function SemiGauge({ score, id }) {
  const [shown, setShown] = useState(0)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(score)); return () => cancelAnimationFrame(r) }, [score])
  const W = 160, R = 66, CX = W / 2, CY = 78, SW = 11
  const arc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`
  const len = Math.PI * R
  const v = Math.max(0, Math.min(100, shown))
  const a = Math.PI * (1 - v / 100)                       // 180° at 0, 0° at 100
  const kx = CX + R * Math.cos(a), ky = CY - R * Math.sin(a)
  const ease = 'cubic-bezier(.22,1,.36,1)'
  return (
    <svg viewBox={`0 0 ${W} ${CY + SW / 2 + 2}`} width="100%" style={{ display: 'block', maxWidth: 160, margin: '0 auto', overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id={`g-${id}`} x1={CX - R} y1="0" x2={CX + R} y2="0" gradientUnits="userSpaceOnUse">
          {GAUGE_STOPS.map((c, i) => <stop key={c} offset={`${(i / (GAUGE_STOPS.length - 1)) * 100}%`} stopColor={c} />)}
        </linearGradient>
      </defs>
      <path d={arc} fill="none" stroke={`url(#g-${id})`} strokeOpacity="0.16" strokeWidth={SW} strokeLinecap="round" />
      <path d={arc} fill="none" stroke={`url(#g-${id})`} strokeWidth={SW} strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - v / 100)}
        style={{ transition: `stroke-dashoffset 1.1s ${ease}` }} />
      <circle cx={kx} cy={ky} r={SW / 2 + 2.5} fill="#fff" stroke={scoreColor(score)} strokeWidth="3"
        style={{ transition: `cx 1.1s ${ease}, cy 1.1s ${ease}`, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.35))' }} />
    </svg>
  )
}

// What each part of the index measures (0 = fear, 100 = greed)
const PART_LABEL = {
  rsi:      { zh: 'RSI', en: 'RSI', tipZh: '14日相对强弱指数', tipEn: '14-day relative strength index' },
  range52w: { zh: '52周位置', en: '52-wk', tipZh: '指数距一年高点的距离', tipEn: 'How close the index is to its 52-week high' },
  vix:      { zh: 'VIX', en: 'VIX', tipZh: '波动率指数，越低越贪婪', tipEn: 'Volatility index: lower means greedier' },
  breadth:  { zh: '涨跌家数', en: 'Breadth', tipZh: '上涨股票占比', tipEn: 'Share of stocks that rose' },
}

function GaugeCard({ title, score, labelZh, labelEn, vix, zh, parts, id }) {
  const label = zh ? labelZh : labelEn
  const color = scoreColor(score)
  return (
    <div className="bfs-card" style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
      borderRadius: 14, padding: '12px 10px 10px', textAlign: 'center', fontFamily: 'var(--sans)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ position: 'relative', marginTop: 6 }}>
        <SemiGauge score={score} id={id} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: -2, lineHeight: 1 }}>
          <div className="serif-num" style={{ fontSize: 36, color: 'var(--text-primary)' }}>
            {Math.round(score)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <span style={{
          display: 'inline-block', padding: '3px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, letterSpacing: '.01em',
          color, background: `color-mix(in srgb, ${color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
        }}>{label}</span>
      </div>
      {parts?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${parts.length}, minmax(0, 1fr))`, marginTop: 10,
          borderTop: '1px solid var(--border-primary)', paddingTop: 8 }}>
          {parts.map((p, i) => {
            const l = PART_LABEL[p.key] || { zh: p.key, en: p.key }
            const raw = p.key === 'vix' && (p.value ?? vix) != null ? Number(p.value ?? vix).toFixed(1) : null
            return (
              <div key={p.key} title={zh ? l.tipZh : l.tipEn}
                style={{ borderLeft: i ? '1px solid var(--border-primary)' : 'none', padding: '0 4px', minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {zh ? l.zh : l.en}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: scoreColor(p.score), fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(p.score)}
                </div>
                {raw && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{raw}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Scrolling ticker bar ──────────────────────────────────────────────────────
// The backend names A-share indices in Chinese; other languages get the usual English names
const CN_INDEX_EN = {
  '上证指数': 'SSE Composite', '深证成指': 'SZSE Component', '创业板指': 'ChiNext',
  '沪深300': 'CSI 300', '科创50': 'STAR 50', '恒生指数': 'Hang Seng', '上证50': 'SSE 50', '中证500': 'CSI 500',
}

function TickerBar({ indices, zh }) {
  const scrollRef = useRef(null)
  const pausedRef = useRef(false)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let x = 0
    const id = setInterval(() => {
      if (pausedRef.current) return
      x += 0.4
      if (x >= el.scrollWidth / 2) x = 0
      el.scrollLeft = x
    }, 24)
    return () => clearInterval(id)
  }, [indices])

  const doubled = [...indices, ...indices]
  return (
    <div
      ref={scrollRef}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
      style={{ display: 'flex', gap: 8, overflowX: 'hidden', padding: '4px 0 2px', marginTop: 6, userSelect: 'none' }}
    >
      {doubled.map((idx, i) => {
        const pct = idx.change_pct
        return (
          <div key={i} style={{
            flexShrink: 0, minWidth: 100,
            background: changePctBg(pct), border: `1px solid ${changePctBorder(pct)}`,
            borderRadius: 8, padding: '4px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap' }}>
              {zh ? (idx.name_zh || idx.name) : (CN_INDEX_EN[idx.name] || idx.name)}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: changePctColor(pct) }}>
              {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {idx.close != null ? Number(idx.close).toLocaleString() : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  const isMobile = useMobile()
  return (
    <div className="skeleton-appear" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      {/* Map + gauges row */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14, flex: 1, minHeight: 0 }}>
        {/* Map placeholder */}
        <div className="skeleton" style={{
          flex: isMobile ? 'none' : '1 1 0',
          height: isMobile ? 200 : '100%', minHeight: isMobile ? 200 : 240,
          borderRadius: 8,
        }} />
        {/* Gauge cards */}
        <div style={{ flex: isMobile ? 'none' : '0 0 192px', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 8 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 10px', borderRadius: 10, border: '1px solid rgba(138,180,248,0.08)' }}>
              <div className="skeleton" style={{ height: 10, width: '60%', margin: '0 auto' }} />
              {/* Gauge arc placeholder */}
              <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 10, width: '50%', margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Ticker bar placeholders */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, overflow: 'hidden' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ flexShrink: 0, width: 100, borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(138,180,248,0.07)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ height: 9, width: '70%' }} />
            <div className="skeleton" style={{ height: 13, width: '55%' }} />
            <div className="skeleton" style={{ height: 9, width: '45%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── World choropleth map ──────────────────────────────────────────────────────
// Country -> its indices (US and China have three each). The first one colours the country.
const COUNTRY_INDICES = {
  '840': ['^GSPC', '^IXIC', '^DJI'],
  '156': ['sh000001', 'sz399001', 'sz399006'],
  '392': ['^N225'], '826': ['^FTSE'], '276': ['^GDAXI'], '250': ['^FCHI'], '410': ['^KS11'],
  '36': ['^AXJO'], '356': ['^BSESN'], '124': ['^GSPTSE'],
  'HK': ['^HSI'],          // Hong Kong is not a separate shape in the 110m atlas: dot only
}
const HK_MARKER = { label: 'HSI', label_zh: '恒指', coords: [114.17, 22.3] }

function WorldMap({ indices, lang }) {
  const [tip, setTip] = useState(null)        // { geoId, x, y, pinned }
  const hideTimer = useRef(null)
  const wrapRef = useRef(null)
  const t = T[lang] || T.en
  const zh = lang === 'zh'
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'
  const css = (v, fb) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb
  const oceanColor     = css('--map-ocean', isLight ? '#c8ddf0' : 'var(--bg-tertiary)')
  const sphereStroke   = isLight ? 'var(--map-border)' : '#1a2a4a'
  const graticuleColor = css('--map-graticule', isLight ? '#d8e8f4' : '#0f1f3d')
  const landEmpty      = css('--map-land', isLight ? '#d8e4ee' : '#1a2035')
  const landBorder     = css('--map-border', isLight ? '#8aa8c8' : '#2a3a5c')

  const bySymbol = {}
  for (const idx of indices) if (idx.change_pct !== null && idx.change_pct !== undefined) bySymbol[idx.symbol] = idx
  const countryData = {}
  for (const [geoId, syms] of Object.entries(COUNTRY_INDICES)) {
    const list = syms.map((s) => bySymbol[s]).filter(Boolean)
    if (list.length) countryData[geoId] = list
  }
  const markers = { ...MARKER_META, HK: HK_MARKER }

  const indexName = (idx) => (zh ? (idx.name_zh || idx.name) : (CN_INDEX_EN[idx.name] || idx.name))
  const pctStr = (p) => (p == null ? '—' : `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`)

  // Tooltip lives in a portal on <body>: an ancestor with backdrop-filter / transform made the old
  // position:fixed tooltip measure from that ancestor, so it appeared far from the cursor.
  const show = (geoId, e, pinned = false) => {
    if (!countryData[geoId]) return
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setTip((cur) => (cur?.pinned && !pinned ? cur : { geoId, x: e.clientX, y: e.clientY, pinned }))
  }
  const move = (geoId, e) => setTip((cur) => (cur && !cur.pinned && cur.geoId === geoId ? { ...cur, x: e.clientX, y: e.clientY } : cur))
  const hide = () => { hideTimer.current = setTimeout(() => setTip((cur) => (cur?.pinned ? cur : null)), 80) }
  const toggle = (geoId, e) => {
    e.stopPropagation()
    setTip((cur) => (cur?.pinned && cur.geoId === geoId ? null : countryData[geoId] ? { geoId, x: e.clientX, y: e.clientY, pinned: true } : null))
  }
  const focusShow = (geoId, e) => {
    const r = e.currentTarget.getBoundingClientRect()
    show(geoId, { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })
  }

  // Tap / click outside closes a pinned tooltip; scrolling closes any tooltip (its position is stale)
  useEffect(() => {
    if (!tip) return
    const close = () => setTip(null)
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) close() }
    document.addEventListener('pointerdown', onDoc)
    // Page scroll only (no capture): the ticker below auto-scrolls and would close the tooltip at once
    window.addEventListener('scroll', close, { passive: true })
    return () => { document.removeEventListener('pointerdown', onDoc); window.removeEventListener('scroll', close) }
  }, [tip])

  const shapeProps = (geoId) => countryData[geoId] ? {
    onMouseEnter: (e) => show(geoId, e),
    onMouseMove: (e) => move(geoId, e),
    onMouseLeave: hide,
    onClick: (e) => toggle(geoId, e),
    onFocus: (e) => focusShow(geoId, e),
    onBlur: () => setTip(null),
    tabIndex: 0,
    role: 'button',
    'aria-label': countryData[geoId].map((i) => `${indexName(i)} ${pctStr(i.change_pct)}`).join(', '),
  } : { tabIndex: -1 }      // react-simple-maps makes every country tabbable by default

  const tipEl = tip && countryData[tip.geoId] && (() => {
    const list = countryData[tip.geoId]
    const main = list[0]
    const color = tileColor(main.change_pct, 'us')
    const W = 220, H = 40 + list.length * 46
    const left = tip.x + 16 + W > window.innerWidth - 8 ? tip.x - W - 16 : tip.x + 16
    const top = Math.max(8, tip.y + 16 + H > window.innerHeight - 8 ? tip.y - H - 16 : tip.y + 16)
    return createPortal(
      <div role="tooltip" style={{
        position: 'fixed', left, top, zIndex: 9999, width: W, boxSizing: 'border-box',
        background: 'rgba(6,15,30,0.96)', border: `1px solid ${color}`, borderRadius: 8,
        padding: '9px 12px', pointerEvents: 'none', lineHeight: 1.3,
        boxShadow: '0 6px 24px rgba(0,0,0,0.55)',
      }}>
        {list.map((idx, i) => (
          <div key={idx.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: i ? 7 : 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{indexName(idx)}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontVariantNumeric: 'tabular-nums' }}>
                {idx.close != null ? Number(idx.close).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
              </div>
            </div>
            <div style={{ fontSize: i ? 13 : 16, fontWeight: 800, color: idx.change_pct >= 0 ? '#34d399' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
              {pctStr(idx.change_pct)}
            </div>
          </div>
        ))}
      </div>,
      document.body,
    )
  })()

  return (
    <div ref={wrapRef} style={{ position: 'relative', background: oceanColor, borderRadius: 8, overflow: 'hidden', lineHeight: 0,
      flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 18 }}
      onClick={() => setTip((cur) => (cur?.pinned ? null : cur))}>
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ rotate: [-10, 0, 0], scale: 130, center: [0, 10] }}
        width={800}
        height={420}
        style={{ width: '100%', height: 'auto', display: 'block', marginTop: -10 }}
      >
        <Sphere id="rsm-sphere-bg" fill={oceanColor} stroke={sphereStroke} strokeWidth={0.5} />
        <Graticule stroke={graticuleColor} strokeWidth={0.4} />

        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const geoId = String(geo.id)
              const list = countryData[geoId]
              const pct = list ? list[0].change_pct : null
              const fill = list ? tileColor(pct, 'us') : landEmpty
              const active = tip?.geoId === geoId
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke={active ? '#fff' : landBorder}
                  strokeWidth={active ? 1.2 : 0.4}
                  style={{
                    default: { fill, outline: 'none' },
                    hover:   { fill, outline: 'none', cursor: list ? 'pointer' : 'default', filter: list ? 'brightness(1.25)' : 'none' },
                    pressed: { fill, outline: 'none' },
                  }}
                  {...shapeProps(geoId)}
                />
              )
            })
          }
        </Geographies>

        {/* Pulsing dots: easy targets for small markets (Europe, Korea, Hong Kong) */}
        {Object.entries(markers).map(([geoId, meta]) => {
          const list = countryData[geoId]
          if (!list) return null
          const color = tileColor(list[0].change_pct, 'us')
          return (
            <Marker key={geoId} coordinates={meta.coords}>
              <circle r={7} fill={color} opacity={0.2} style={{ pointerEvents: 'none' }}>
                <animate attributeName="r" values="5;9;5" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.28;0.06;0.28" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle r={9} fill="transparent" style={{ cursor: 'pointer' }} {...shapeProps(geoId)} />
              <circle r={tip?.geoId === geoId ? 5 : 4} fill={color} stroke="#fff" strokeWidth={tip?.geoId === geoId ? 1.2 : 0.6}
                style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 3px ${color})` }} />
            </Marker>
          )
        })}
      </ComposableMap>

      {/* Colour scale (same as the market heatmap) */}
      <div style={{ position: 'absolute', bottom: 6, left: 10, display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'none', lineHeight: 1 }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>-3%</span>
        {[-3, -2, -1, 0, 1, 2, 3].map((v) => <span key={v} style={{ width: 14, height: 7, borderRadius: 2, background: tileColor(v, 'us') }} />)}
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>+3%</span>
      </div>
      <div style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 9, color: 'var(--text-muted)', pointerEvents: 'none', lineHeight: 1 }}>
        {t.gsHover}
      </div>
      {tipEl}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function GlobalSentiment({ lang }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const t = T[lang] || T.en
  const zh = lang === 'zh'
  const isMobile = useMobile()

  useEffect(() => {
    fetch('/api/market/sentiment')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const usScore = data?.us_sentiment?.score ?? 50
  const cnScore = data?.cn_sentiment?.score ?? 50
  const indices = data?.indices ?? []
  const updTime = data?.updated_at?.slice(11, 16) ?? ''

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
      borderRadius: 12,
      marginBottom: 10,
      height: 'calc(100vh - 130px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backdropFilter: 'blur(8px)',
    }}>
      {/* ── Header ── */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 14px', cursor: 'pointer', flexShrink: 0, height: 36,
          borderBottom: collapsed ? 'none' : '1px solid var(--border-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: loading ? '#fbbf24' : '#22c55e',
            boxShadow: `0 0 6px ${loading ? '#fbbf24' : '#22c55e'}`,
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(90deg,#8ab4f8,#c084fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {t.gsTitle}
          </span>
          {updTime && !loading && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {t.gsUpdated(updTime)}
            </span>
          )}
        </div>
        <span className={`bfs-chevron${collapsed ? '' : ' is-open'}`} style={{ fontSize: 11, color: 'var(--text-muted)', userSelect: 'none' }}>
          ▼
        </span>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div style={{ padding: '0 8px 4px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div style={{ animation: 'fadeIn 0.5s ease both', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              {/* Map + Gauges */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, flex: 1, minHeight: 0, alignItems: 'stretch' }}>
                {/* World map */}
                <div style={{ flex: isMobile ? 'none' : '1 1 0', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <WorldMap indices={indices} lang={lang} />
                </div>

                {/* Sentiment gauges */}
                <div style={{ flex: isMobile ? 'none' : '0 0 192px', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 8, overflowY: isMobile ? 'visible' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  {!isMobile && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.3px' }}>
                      {t.gsSentIndex}
                    </div>
                  )}
                  <div style={{ flex: isMobile ? '1 1 45%' : 'none' }}>
                    <GaugeCard
                      title={t.gsUSSent}
                      score={usScore}
                      labelZh={data?.us_sentiment?.label_zh}
                      labelEn={data?.us_sentiment?.label_en}
                      vix={data?.us_sentiment?.vix}
                      parts={data?.us_sentiment?.components}
                      zh={zh}
                      id="us"
                    />
                  </div>
                  <div style={{ flex: isMobile ? '1 1 45%' : 'none' }}>
                    <GaugeCard
                      title={t.gsCNSent}
                      score={cnScore}
                      labelZh={data?.cn_sentiment?.label_zh}
                      labelEn={data?.cn_sentiment?.label_en}
                      parts={data?.cn_sentiment?.components}
                      zh={zh}
                      id="cn"
                    />
                  </div>
                  {!isMobile && (
                    <div style={{
                      fontSize: 10, lineHeight: 1.6, color: 'var(--text-muted)',
                      padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 8, border: '1px solid var(--border-primary)',
                    }}>
                      {zh
                        ? '0 = 极度恐慌，100 = 极度贪婪。由 RSI、距 52 周高点、VIX 和涨跌家数合成，仅供学习。'
                        : '0 = extreme fear, 100 = extreme greed. Built from RSI, distance to the 52-week high, VIX and market breadth. For learning only.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Ticker bar */}
              <div style={{ flexShrink: 0 }}>
                <TickerBar indices={indices} zh={zh} />
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
