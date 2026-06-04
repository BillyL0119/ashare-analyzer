import { useState, useEffect, useRef } from 'react'
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
  if (pct === null || pct === undefined) return '#9aa0a6'
  if (pct >  1) return '#00ff88'
  if (pct >= 0) return '#00cc66'
  if (pct > -2) return '#ff6666'
  return '#ff2222'
}

// ── Ticker helpers ────────────────────────────────────────────────────────────
function changePctColor(pct) {
  if (pct === null || pct === undefined) return '#9aa0a6'
  if (pct > 1)  return '#22c55e'
  if (pct > 0)  return '#86efac'
  if (pct > -1) return '#fca5a5'
  return '#ef4444'
}
function changePctBg(pct) {
  if (pct === null || pct === undefined) return 'rgba(154,160,166,0.08)'
  return pct >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'
}
function changePctBorder(pct) {
  if (pct === null || pct === undefined) return 'rgba(154,160,166,0.15)'
  return pct >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
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
      pointer: { length: '62%', width: 4, itemStyle: { color: '#e8eaed' } },
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
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(138,180,248,0.10)',
      borderRadius: 10, padding: '10px 8px 8px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 4, letterSpacing: '0.3px' }}>
        {title}
      </div>
      <ReactECharts option={buildGauge(score)} style={{ height: 118 }} opts={{ renderer: 'svg' }} />
      <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: -4 }}>{label}</div>
      {vix != null && (
        <div style={{ fontSize: 10, color: '#9aa0a6', marginTop: 3 }}>VIX {Number(vix).toFixed(1)}</div>
      )}
    </div>
  )
}

// ── Scrolling ticker bar ──────────────────────────────────────────────────────
function TickerBar({ indices, zh }) {
  const scrollRef = useRef(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let x = 0
    const id = setInterval(() => {
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
      style={{ display: 'flex', gap: 8, overflowX: 'hidden', padding: '8px 0 4px', marginTop: 10, userSelect: 'none' }}
    >
      {doubled.map((idx, i) => {
        const pct = idx.change_pct
        return (
          <div key={i} style={{
            flexShrink: 0, minWidth: 110,
            background: changePctBg(pct), border: `1px solid ${changePctBorder(pct)}`,
            borderRadius: 8, padding: '5px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 2, whiteSpace: 'nowrap' }}>
              {zh ? (idx.name_zh || idx.name) : idx.name}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: changePctColor(pct) }}>
              {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(232,234,240,0.5)' }}>
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
  const shimmer = {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(90deg,transparent 0%,rgba(138,180,248,0.06) 50%,transparent 100%)',
    backgroundSize: '200% 100%',
    animation: 'skshimmer 1.6s infinite',
  }
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{
        flex: '1 1 360px', minWidth: 0, height: 290, borderRadius: 8,
        background: 'rgba(138,180,248,0.04)', border: '1px solid rgba(138,180,248,0.07)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={shimmer} />
      </div>
      <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1].map(i => (
          <div key={i} style={{
            height: 148, borderRadius: 10,
            background: 'rgba(138,180,248,0.04)', border: '1px solid rgba(138,180,248,0.07)',
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{ ...shimmer, animationDelay: `${i * 0.2}s` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── World choropleth map ──────────────────────────────────────────────────────
function WorldMap({ indices, lang }) {
  const [tooltip, setTooltip] = useState(null)
  const zh = lang === 'zh'

  // Build geoId → index data map (symbol lookup → geo ID)
  const countryDataMap = {}
  for (const idx of indices) {
    const geoId = SYMBOL_TO_GEO_ID[idx.symbol]
    if (geoId && idx.change_pct !== null && idx.change_pct !== undefined) {
      countryDataMap[geoId] = idx
    }
  }

  return (
    <div
      style={{ position: 'relative', background: '#050d1a', borderRadius: 8, overflow: 'hidden', lineHeight: 0 }}
      onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
    >
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 155, center: [10, 10] }}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Ocean */}
        <Sphere id="rsm-sphere-bg" fill="#0a1628" stroke="#1a2a4a" strokeWidth={0.5} />
        {/* Graticule grid lines */}
        <Graticule stroke="#0f1f3d" strokeWidth={0.4} />

        {/* Country fills — geoId = String(geo.id), no zero-padding */}
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const geoId = String(geo.id)
              const data = countryDataMap[geoId]
              const pct = data?.change_pct ?? null
              const fill = getFillColor(pct)

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#2a3a5c"
                  strokeWidth={0.4}
                  style={{
                    default: { fill, outline: 'none' },
                    hover:   { fill: getHoverColor(pct), outline: 'none', cursor: data ? 'pointer' : 'default' },
                    pressed: { fill, outline: 'none' },
                  }}
                  onMouseEnter={(e) => {
                    if (data) setTooltip({ x: e.clientX, y: e.clientY, data })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })
          }
        </Geographies>

        {/* Country labels — only shown when data available */}
        {Object.entries(MARKER_META).map(([geoId, meta]) => {
          const data = countryDataMap[geoId]
          const pct = data?.change_pct
          if (pct === null || pct === undefined) return null
          const sign = pct >= 0 ? '+' : ''
          const lbl = zh ? meta.label_zh : meta.label
          const color = getLabelColor(pct)
          const text = `${lbl} ${sign}${pct.toFixed(2)}%`
          const w = text.length * 4.6 + 8
          return (
            <Marker key={geoId} coordinates={meta.coords}>
              <rect x={-w / 2} y="-12" width={w} height="12" rx="2"
                fill="rgba(5,10,22,0.84)" stroke={color} strokeWidth="0.4" />
              <text y="-2" textAnchor="middle" fontSize={6.5}
                fill={color} fontWeight="700" fontFamily="'Courier New', monospace">
                {text}
              </text>
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
            <span style={{ fontSize: 8, color: 'rgba(232,234,240,0.4)', fontFamily: 'monospace' }}>
              {label}
            </span>
          </div>
        ))}
        <span style={{ fontSize: 8, color: 'rgba(138,180,248,0.3)', marginLeft: 6 }}>
          BestFriendStock
        </span>
      </div>

      {/* Tooltip */}
      {tooltip && tooltip.data && (() => {
        const pct = tooltip.data.change_pct
        const color = getLabelColor(pct)
        const name = zh
          ? (tooltip.data.name_zh || tooltip.data.name)
          : tooltip.data.name
        const close = tooltip.data.close != null
          ? Number(tooltip.data.close).toLocaleString()
          : '—'
        const pctStr = pct != null
          ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
          : '—'
        return (
          <div style={{
            position: 'fixed',
            left: tooltip.x + 14,
            top: tooltip.y - 72,
            zIndex: 9999,
            background: 'rgba(5,10,22,0.97)',
            border: '1px solid rgba(138,180,248,0.3)',
            borderRadius: 8,
            padding: '8px 14px',
            minWidth: 140,
            pointerEvents: 'none',
            boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e8eaed', marginBottom: 4 }}>
              {name}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(232,234,240,0.6)', marginBottom: 3, fontFamily: 'monospace' }}>
              {close}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: 'monospace' }}>
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
      background: 'rgba(5,13,26,0.85)',
      border: '1px solid rgba(138,180,248,0.11)',
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
      backdropFilter: 'blur(8px)',
    }}>
      {/* ── Header ── */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 16px', cursor: 'pointer',
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
            <span style={{ fontSize: 10, color: '#4a5568' }}>
              {zh ? `更新于 ${updTime}` : `Updated ${updTime}`}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#4a5568', userSelect: 'none' }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div style={{ padding: '12px 16px 14px' }}>
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div style={{ animation: 'fadeIn 0.5s ease both' }}>
              {/* Map 75% + Gauges 25% */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* World map */}
                <div style={{ flex: '1 1 360px', minWidth: 0 }}>
                  <WorldMap indices={indices} lang={lang} />
                </div>

                {/* Sentiment gauges */}
                <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, color: '#4a5568', textAlign: 'center', letterSpacing: '0.3px' }}>
                    {zh ? '情绪指数 (0-100)' : 'Sentiment Index (0-100)'}
                  </div>
                  <GaugeCard
                    title={zh ? '美股情绪' : 'US Sentiment'}
                    score={usScore}
                    labelZh={data?.us_sentiment?.label_zh}
                    labelEn={data?.us_sentiment?.label_en}
                    vix={data?.us_sentiment?.vix}
                    zh={zh}
                  />
                  <GaugeCard
                    title={zh ? 'A股情绪' : 'A-Share'}
                    score={cnScore}
                    labelZh={data?.cn_sentiment?.label_zh}
                    labelEn={data?.cn_sentiment?.label_en}
                    zh={zh}
                  />
                  <div style={{
                    fontSize: 10, lineHeight: 1.6, color: '#4a5568',
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8, border: '1px solid rgba(138,180,248,0.07)',
                  }}>
                    {zh
                      ? '综合RSI、52周高点及涨跌比计算，仅供参考，不构成投资建议。'
                      : 'Composite of RSI, 52w-high & A/D ratio. Not investment advice.'}
                  </div>
                </div>
              </div>

              {/* Ticker bar */}
              <TickerBar indices={indices} zh={zh} />
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes skshimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
