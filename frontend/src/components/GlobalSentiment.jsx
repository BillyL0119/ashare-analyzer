import { useState, useEffect, useRef } from 'react'
import { useMobile } from '../hooks/useMobile'
import useThemeStore from '../store/themeStore'
import {
  ComposableMap, Geographies, Geography,
  Marker, Graticule, Sphere,
} from 'react-simple-maps'
import ReactECharts from 'echarts-for-react'

// ── Geo URL (TopoJSON, loaded client-side) ────────────────────────────────────
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ── symbol → ISO 3166-1 numeric string (must match String(geo.id) exactly) ────
// world-atlas stores IDs as integers: Australia=36, US=840, etc. — NO zero-pad
const SYMBOL_TO_GEO_ID = {
  '^GSPC':    '840',  // USA (S&P 500 represents the US)
  '^N225':    '392',  // Japan
  '^FTSE':    '826',  // UK
  '^GDAXI':   '276',  // Germany
  '^FCHI':    '250',  // France
  '^KS11':    '410',  // South Korea
  '^AXJO':    '36',   // Australia — integer 36, NOT '036'
  '^BSESN':   '356',  // India
  '^GSPTSE':  '124',  // Canada
  'sh000001': '156',  // China
}

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

// ── Bloomberg-style colour scale ──────────────────────────────────────────────
function getFillColor(pct) {
  if (pct === null || pct === undefined) return '#1a2035'
  if (pct >  2) return '#00ff88'
  if (pct >  1) return '#00cc66'
  if (pct >  0) return '#009944'
  if (pct > -1) return '#cc3333'
  if (pct > -2) return '#ff4444'
  return '#ff0000'
}
function getHoverColor(pct) {
  if (pct === null || pct === undefined) return '#26304a'
  return pct >= 0 ? '#44ffaa' : '#ff6677'
}
function getLabelColor(pct) {
  if (pct === null || pct === undefined) return 'var(--text-muted)'
  if (pct >  1) return '#00ff88'
  if (pct >= 0) return '#00cc66'
  if (pct > -2) return '#ff6666'
  return '#ff2222'
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

function buildGauge(score) {
  return {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 180, endAngle: 0,
      min: 0, max: 100,
      radius: '88%', center: ['50%', '70%'],
      axisLine: {
        lineStyle: {
          width: 14,
          color: [
            [0.25, '#ef4444'], [0.45, '#f97316'],
            [0.55, '#fbbf24'], [0.75, '#84cc16'], [1.0, '#22c55e'],
          ],
        },
      },
      pointer: { length: '62%', width: 4, itemStyle: { color: 'var(--text-primary)' } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      title: { show: false },
      detail: {
        valueAnimation: true,
        formatter: '{value}',
        color: scoreColor(score),
        fontSize: 24, fontWeight: 700,
        offsetCenter: [0, '18%'], fontFamily: 'inherit',
      },
      data: [{ value: score }],
    }],
  }
}

function GaugeCard({ title, score, labelZh, labelEn, vix, zh }) {
  const label = zh ? labelZh : labelEn
  const color = scoreColor(score)
  return (
    <div className="bfs-card" style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
      borderRadius: 10, padding: '10px 8px 8px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.3px' }}>
        {title}
      </div>
      <ReactECharts option={buildGauge(score)} style={{ height: 118 }} opts={{ renderer: 'svg' }} />
      <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: -4 }}>{label}</div>
      {vix != null && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>VIX {Number(vix).toFixed(1)}</div>
      )}
    </div>
  )
}

// ── Scrolling ticker bar ──────────────────────────────────────────────────────
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
              {zh ? (idx.name_zh || idx.name) : idx.name}
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
function WorldMap({ indices, lang }) {
  const [tooltip, setTooltip] = useState(null)
  const hideTimer = useRef(null)
  const zh = lang === 'zh'
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'
  const oceanColor    = getComputedStyle(document.documentElement).getPropertyValue('--map-ocean').trim() || (isLight ? '#c8ddf0' : 'var(--bg-tertiary)')
  const sphereStroke  = isLight ? 'var(--map-border)' : '#1a2a4a'
  const graticuleColor = getComputedStyle(document.documentElement).getPropertyValue('--map-graticule').trim() || (isLight ? '#d8e8f4' : '#0f1f3d')
  const landEmpty     = getComputedStyle(document.documentElement).getPropertyValue('--map-land').trim() || (isLight ? '#d8e4ee' : '#1a2035')
  const landBorder    = getComputedStyle(document.documentElement).getPropertyValue('--map-border').trim() || (isLight ? '#8aa8c8' : '#2a3a5c')

  const countryDataMap = {}
  for (const idx of indices) {
    const geoId = SYMBOL_TO_GEO_ID[idx.symbol]
    if (geoId && idx.change_pct !== null && idx.change_pct !== undefined) {
      countryDataMap[geoId] = idx
    }
  }

  // Small delay prevents flicker when mouse moves between geo fill and dot marker
  const showTip = (x, y, data) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setTooltip({ x, y, data })
  }
  const hideTip = () => {
    hideTimer.current = setTimeout(() => setTooltip(null), 60)
  }

  return (
    <div
      style={{ position: 'relative', background: oceanColor, borderRadius: 8, overflow: 'hidden', lineHeight: 0, height: '100%' }}
      onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
    >
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 140, center: [10, 10] }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <Sphere id="rsm-sphere-bg" fill={oceanColor} stroke={sphereStroke} strokeWidth={0.5} />
        <Graticule stroke={graticuleColor} strokeWidth={0.4} />

        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const geoId = String(geo.id)
              const data  = countryDataMap[geoId]
              const pct   = data?.change_pct ?? null
              const fill  = pct !== null ? getFillColor(pct) : landEmpty
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke={landBorder}
                  strokeWidth={0.4}
                  style={{
                    default: { fill, outline: 'none' },
                    hover:   { fill: getHoverColor(pct), outline: 'none', cursor: data ? 'pointer' : 'default' },
                    pressed: { fill, outline: 'none' },
                  }}
                  onMouseEnter={(e) => { if (data) showTip(e.clientX, e.clientY, data) }}
                  onMouseLeave={hideTip}
                />
              )
            })
          }
        </Geographies>

        {/* Glowing dot markers — replace old overlapping text labels.
            Hover the country fill or the dot to see the tooltip. */}
        {Object.entries(MARKER_META).map(([geoId, meta]) => {
          const data = countryDataMap[geoId]
          const pct  = data?.change_pct
          if (pct === null || pct === undefined) return null
          const color = getLabelColor(pct)
          return (
            <Marker key={geoId} coordinates={meta.coords}>
              {/* Soft glow halo — pulses */}
              <circle r={7} fill={color} opacity={0.18} style={{ pointerEvents: 'none' }}>
                <animate attributeName="r" values="5;9;5" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.25;0.06;0.25" dur="2.4s" repeatCount="indefinite" />
              </circle>
              {/* Core dot — interactive */}
              <circle
                r={4}
                fill={color}
                opacity={0.92}
                style={{ cursor: 'pointer', filter: `drop-shadow(0 0 3px ${color})` }}
                onMouseEnter={(e) => showTip(e.clientX, e.clientY, data)}
                onMouseLeave={hideTip}
              />
            </Marker>
          )
        })}
      </ComposableMap>

      {/* Colour legend */}
      <div style={{
        position: 'absolute', bottom: 6, left: 10,
        display: 'flex', alignItems: 'center', gap: 6,
        pointerEvents: 'none',
      }}>
        {[
          { color: '#00ff88', label: '>2%' },
          { color: '#009944', label: '0%' },
          { color: '#cc3333', label: '<0%' },
          { color: '#ff0000', label: '<-2%' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{label}</span>
          </div>
        ))}
        <span style={{ fontSize: 8, color: 'rgba(138,180,248,0.3)', marginLeft: 6 }}>BestFriendStock</span>
      </div>

      {/* Hover instruction hint */}
      <div style={{
        position: 'absolute', bottom: 6, right: 10,
        fontSize: 8, color: 'rgba(138,180,248,0.25)',
        pointerEvents: 'none', fontFamily: 'monospace',
      }}>
        {zh ? '悬停查看详情' : 'Hover for details'}
      </div>

      {/* Tooltip — follows mouse, shows on country or dot hover */}
      {tooltip?.data && (() => {
        const pct    = tooltip.data.change_pct
        const color  = getLabelColor(pct)
        const name   = zh ? (tooltip.data.name_zh || tooltip.data.name) : tooltip.data.name
        const close  = tooltip.data.close != null ? Number(tooltip.data.close).toLocaleString() : '—'
        const pctStr = pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'
        // find the short label for this index
        const symbol = tooltip.data.symbol
        const geoId  = SYMBOL_TO_GEO_ID[symbol] || ''
        const meta   = MARKER_META[geoId]
        const shortLabel = meta ? (zh ? meta.label_zh : meta.label) : ''

        return (
          <div style={{
            position: 'fixed',
            left: tooltip.x + 16,
            top: tooltip.y - 80,
            zIndex: 9999,
            background: 'rgba(5,10,22,0.97)',
            border: `1px solid ${color}44`,
            borderRadius: 10,
            padding: '10px 16px',
            minWidth: 160,
            pointerEvents: 'none',
            boxShadow: `0 4px 28px rgba(0,0,0,0.7), 0 0 0 1px ${color}22`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
                boxShadow: `0 0 6px ${color}` }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</span>
              {shortLabel && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{shortLabel}</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(232,234,240,0.5)', marginBottom: 4, fontFamily: 'monospace' }}>
              {close}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'monospace', letterSpacing: '0.5px' }}>
              {pctStr}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function GlobalSentiment({ lang }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
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
      height: 'calc(100vh - 112px)',
      minHeight: 420,
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
          padding: '6px 14px', cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid rgba(138,180,248,0.07)',
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
            {zh ? '全球市场情绪' : 'Global Market Sentiment'}
          </span>
          {updTime && !loading && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {zh ? `更新于 ${updTime}` : `Updated ${updTime}`}
            </span>
          )}
        </div>
        <span className={`bfs-chevron${collapsed ? '' : ' is-open'}`} style={{ fontSize: 11, color: 'var(--text-muted)', userSelect: 'none' }}>
          ▼
        </span>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div style={{ padding: '4px 14px 6px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div style={{ animation: 'fadeIn 0.5s ease both', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Map + Gauges */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14, alignItems: 'stretch', flex: 1, minHeight: 0, flexWrap: 'nowrap' }}>
                {/* World map */}
                <div style={{ flex: isMobile ? 'none' : '1 1 0', height: isMobile ? 250 : undefined, minWidth: 0, overflow: 'hidden' }}>
                  <WorldMap indices={indices} lang={lang} />
                </div>

                {/* Sentiment gauges */}
                <div style={{ flex: isMobile ? 'none' : '0 0 192px', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 8, overflowY: isMobile ? 'visible' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  {!isMobile && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.3px' }}>
                      {zh ? '情绪指数 (0-100)' : 'Sentiment Index (0-100)'}
                    </div>
                  )}
                  <div style={{ flex: isMobile ? '1 1 45%' : 'none' }}>
                    <GaugeCard
                      title={zh ? '美股情绪' : 'US Sentiment'}
                      score={usScore}
                      labelZh={data?.us_sentiment?.label_zh}
                      labelEn={data?.us_sentiment?.label_en}
                      vix={data?.us_sentiment?.vix}
                      zh={zh}
                    />
                  </div>
                  <div style={{ flex: isMobile ? '1 1 45%' : 'none' }}>
                    <GaugeCard
                      title={zh ? 'A股情绪' : 'A-Share'}
                      score={cnScore}
                      labelZh={data?.cn_sentiment?.label_zh}
                      labelEn={data?.cn_sentiment?.label_en}
                      zh={zh}
                    />
                  </div>
                  {!isMobile && (
                    <div style={{
                      fontSize: 10, lineHeight: 1.6, color: 'var(--text-muted)',
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8, border: '1px solid rgba(138,180,248,0.07)',
                    }}>
                      {zh
                        ? '综合RSI、52周高点及涨跌比计算，仅供参考，不构成投资建议。'
                        : 'Composite of RSI, 52w-high & A/D ratio. Not investment advice.'}
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
