import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { tileColor } from '../utils/heatmap'
import { T } from '../i18n/translations'
import useThemeStore from '../store/themeStore'
import {
  ComposableMap, Geographies, Geography,
  Marker, Graticule, Sphere,
} from 'react-simple-maps'
import worldAtlas from 'world-atlas/countries-110m.json'
import { CN_INDEX_EN } from './globalSentimentColors'

// The home panel's world map, in its own file so the map library and the country shapes (~60 KB gzip) load after
// the first paint instead of with the app (GlobalSentiment.jsx imports this lazily).

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

export default function WorldMap({ indices, lang }) {
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
  const graticuleColor = css('--map-graticule', isLight ? '#d6e1f1' : '#132b52')
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
    const color = tileColor(main.change_pct, 'us', isLight)
    const W = 220, H = 40 + list.length * 46
    const left = tip.x + 16 + W > window.innerWidth - 8 ? tip.x - W - 16 : tip.x + 16
    const top = Math.max(8, tip.y + 16 + H > window.innerHeight - 8 ? tip.y - H - 16 : tip.y + 16)
    return createPortal(
      <div role="tooltip" style={{
        position: 'fixed', left, top, zIndex: 9999, width: W, boxSizing: 'border-box',
        background: 'rgba(10,15,27,0.96)', border: `1px solid ${color}`, borderRadius: 8,
        padding: '9px 12px', pointerEvents: 'none', lineHeight: 1.3,
        boxShadow: '0 6px 24px rgba(0,0,0,0.55)',
      }}>
        {list.map((idx, i) => (
          <div key={idx.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: i ? 7 : 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{indexName(idx)}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontVariantNumeric: 'tabular-nums' }}>
                {idx.close != null ? Number(idx.close).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
              </div>
            </div>
            <div style={{ fontSize: i ? 13 : 16, fontWeight: 600, color: idx.change_pct >= 0 ? '#4cc38a' : '#e5484d', fontVariantNumeric: 'tabular-nums' }}>
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
              const fill = list ? tileColor(pct, 'us', isLight) : landEmpty
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
          const color = tileColor(list[0].change_pct, 'us', isLight)
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
        {[-3, -2, -1, 0, 1, 2, 3].map((v) => <span key={v} style={{ width: 14, height: 7, borderRadius: 2, background: tileColor(v, 'us', isLight) }} />)}
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>+3%</span>
      </div>
      <div style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 9, color: 'var(--text-muted)', pointerEvents: 'none', lineHeight: 1 }}>
        {t.gsHover}
      </div>
      {tipEl}
    </div>
  )
}
