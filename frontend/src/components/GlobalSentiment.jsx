import { useState, useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'

// ── colour helpers ────────────────────────────────────────────────────────────
function changePctColor(pct) {
  if (pct === null || pct === undefined) return '#9aa0a6'
  if (pct > 1)  return '#22c55e'
  if (pct > 0)  return '#86efac'
  if (pct > -1) return '#fca5a5'
  return '#ef4444'
}
function changePctBg(pct) {
  if (pct === null || pct === undefined) return 'rgba(154,160,166,0.08)'
  if (pct >= 0) return 'rgba(34,197,94,0.08)'
  return 'rgba(239,68,68,0.08)'
}
function changePctBorder(pct) {
  if (pct === null || pct === undefined) return 'rgba(154,160,166,0.15)'
  if (pct >= 0) return 'rgba(34,197,94,0.2)'
  return 'rgba(239,68,68,0.2)'
}
function scoreColor(s) {
  if (s < 25) return '#ef4444'
  if (s < 45) return '#f97316'
  if (s < 55) return '#fbbf24'
  if (s < 75) return '#84cc16'
  return '#22c55e'
}

// ── ECharts gauge option ──────────────────────────────────────────────────────
function buildGauge(score) {
  return {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      radius: '88%',
      center: ['50%', '70%'],
      axisLine: {
        lineStyle: {
          width: 14,
          color: [
            [0.25, '#ef4444'],
            [0.45, '#f97316'],
            [0.55, '#fbbf24'],
            [0.75, '#84cc16'],
            [1.00, '#22c55e'],
          ],
        },
      },
      pointer: {
        length: '62%',
        width: 4,
        itemStyle: { color: '#e8eaed' },
      },
      axisTick:  { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title:     { show: false },
      detail: {
        valueAnimation: true,
        formatter: '{value}',
        color: scoreColor(score),
        fontSize: 26,
        fontWeight: 700,
        offsetCenter: [0, '18%'],
        fontFamily: 'inherit',
      },
      data: [{ value: score }],
    }],
  }
}

// ── SVG simplified world map ──────────────────────────────────────────────────
// Market pin positions in 800×390 SVG coordinate space (Mercator-ish)
const MARKET_PINS = [
  { region: 'us', sym: '^GSPC',  x: 182, y: 108, label: 'S&P 500',   label_zh: '标普500'   },
  { region: 'uk', sym: '^FTSE',  x: 370, y:  65, label: 'FTSE 100',  label_zh: '富时100'   },
  { region: 'de', sym: '^GDAXI', x: 422, y:  68, label: 'DAX',        label_zh: 'DAX'       },
  { region: 'jp', sym: '^N225',  x: 753, y:  72, label: 'Nikkei 225', label_zh: '日经225'   },
  { region: 'hk', sym: '^HSI',   x: 700, y: 150, label: 'Hang Seng',  label_zh: '恒生指数'  },
  { region: 'cn', sym: '—',      x: 655, y: 108, label: 'Shanghai',   label_zh: '上证指数'  },
]

function WorldMapSVG({ indices, lang }) {
  const [tip, setTip] = useState(null)
  const zh = lang === 'zh'

  // Build lookup: region→index
  const byRegion = {}
  for (const idx of indices) {
    if (!byRegion[idx.region]) byRegion[idx.region] = idx
  }
  // prefer S&P 500 for 'us', prefer 上证 for 'cn'
  for (const idx of indices) {
    if (idx.symbol === '^GSPC') byRegion['us'] = idx
    if (idx.name_zh === '上证指数' || idx.name === '上证指数') byRegion['cn'] = idx
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox="0 0 800 390"
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ocean */}
        <rect width="800" height="390" fill="#07111f" rx="8" />

        {/* Grid lines */}
        {[78, 156, 234, 312].map(y => (
          <line key={y} x1="0" y1={y} x2="800" y2={y}
            stroke="rgba(138,180,248,0.04)" strokeWidth="1" />
        ))}
        {[160, 320, 480, 640].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="390"
            stroke="rgba(138,180,248,0.04)" strokeWidth="1" />
        ))}

        {/* ── Continent fills ── */}
        <g fill="rgba(22,36,66,0.92)" stroke="rgba(138,180,248,0.18)" strokeWidth="0.8">
          {/* Greenland */}
          <polygon points="248,2 312,2 334,18 312,42 278,46 248,32" />
          {/* North America */}
          <polygon points="55,25 182,14 238,44 268,84 268,148 248,202 220,226 190,218 155,204 122,182 88,156 58,128 44,78" />
          {/* Central America */}
          <polygon points="220,226 248,202 265,222 260,242 235,246 220,232" />
          {/* South America */}
          <polygon points="158,242 238,246 284,266 292,312 272,366 240,390 205,390 172,358 158,295" />
          {/* Iceland */}
          <polygon points="336,22 352,18 360,28 352,38 336,36" />
          {/* British Isles */}
          <polygon points="344,32 362,28 374,38 370,56 352,60 340,48" />
          {/* Europe */}
          <polygon points="360,28 392,18 448,26 464,62 448,94 420,110 384,114 352,100 338,70" />
          {/* Africa */}
          <polygon points="340,112 420,108 475,122 514,160 522,216 508,280 468,334 428,348 385,332 350,290 330,232 334,176" />
          {/* Middle East */}
          <polygon points="458,110 508,110 522,140 520,170 492,180 468,168 452,148" />
          {/* India */}
          <polygon points="504,114 542,106 568,130 570,180 545,222 520,218 503,186" />
          {/* Asia main */}
          <polygon points="438,26 546,14 660,6 736,26 794,62 800,120 780,176 742,210 702,222 652,220 596,232 552,210 510,180 476,154 456,120 445,73" />
          {/* SE Asia peninsula */}
          <polygon points="596,175 622,178 635,202 625,226 605,230 590,210" />
          {/* Japan */}
          <polygon points="733,46 756,40 770,54 770,88 755,100 735,88" />
          {/* Taiwan */}
          <polygon points="724,130 732,126 736,138 728,142" />
          {/* Sri Lanka */}
          <polygon points="558,200 566,196 570,208 562,212" />
          {/* Australia */}
          <polygon points="638,228 732,212 798,252 800,300 782,342 740,358 682,350 638,322 622,280" />
          {/* New Zealand */}
          <polygon points="792,316 804,310 806,340 794,348" />
        </g>

        {/* ── Market pins ── */}
        {MARKET_PINS.map(pin => {
          const idx = byRegion[pin.region]
          const pct = idx?.change_pct ?? null
          const close = idx?.close ?? null
          const dotColor = pct === null ? '#9aa0a6' : pct >= 0 ? '#22c55e' : '#ef4444'
          const glowColor = pct === null ? 'rgba(154,160,166,0.15)'
            : pct >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
          const sign = pct !== null ? (pct >= 0 ? '+' : '') : ''
          const pctStr = pct !== null ? `${sign}${pct.toFixed(2)}%` : '—'

          return (
            <g
              key={pin.region}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTip({ pin, idx, pct, close, pctStr, dotColor })}
              onMouseLeave={() => setTip(null)}
            >
              {/* Glow ring */}
              <circle cx={pin.x} cy={pin.y} r="20" fill={glowColor} />
              {/* Dot */}
              <circle cx={pin.x} cy={pin.y} r="7" fill={dotColor} opacity="0.9" />
              <circle cx={pin.x} cy={pin.y} r="4" fill="#fff" opacity="0.3" />
              {/* Name label */}
              <text x={pin.x} y={pin.y + 22} textAnchor="middle"
                fontSize="8.5" fill="rgba(232,234,240,0.65)" fontFamily="inherit">
                {zh ? pin.label_zh : pin.label}
              </text>
              {/* Pct label */}
              <text x={pin.x} y={pin.y + 33} textAnchor="middle"
                fontSize="8.5" fill={dotColor} fontFamily="monospace" fontWeight="700">
                {pctStr}
              </text>
            </g>
          )
        })}

        {/* ── Tooltip ── */}
        {tip && (() => {
          const tx = Math.min(tip.pin.x + 12, 640)
          const ty = Math.max(tip.pin.y - 52, 4)
          const name = zh ? tip.pin.label_zh : tip.pin.label
          const closeStr = tip.close !== null ? tip.close.toLocaleString() : '—'
          return (
            <g>
              <rect x={tx} y={ty} width={148} height={58} rx="6"
                fill="rgba(8,14,30,0.96)" stroke="rgba(138,180,248,0.28)" strokeWidth="1" />
              <text x={tx + 74} y={ty + 18} textAnchor="middle"
                fontSize="11" fill="#e8eaed" fontWeight="700" fontFamily="inherit">
                {name}
              </text>
              <text x={tx + 74} y={ty + 34} textAnchor="middle"
                fontSize="11" fill="rgba(232,234,240,0.6)" fontFamily="monospace">
                {closeStr}
              </text>
              <text x={tx + 74} y={ty + 50} textAnchor="middle"
                fontSize="12" fill={tip.dotColor} fontWeight="700" fontFamily="monospace">
                {tip.pctStr}
              </text>
            </g>
          )
        })()}

        {/* Legend */}
        <g>
          <circle cx="14" cy="378" r="5" fill="#22c55e" opacity="0.85" />
          <text x="22" y="382" fontSize="9" fill="rgba(232,234,240,0.45)" fontFamily="inherit">
            {zh ? '涨' : 'Up'}
          </text>
          <circle cx="46" cy="378" r="5" fill="#ef4444" opacity="0.85" />
          <text x="54" y="382" fontSize="9" fill="rgba(232,234,240,0.45)" fontFamily="inherit">
            {zh ? '跌' : 'Down'}
          </text>
          <text x="780" y="382" textAnchor="end" fontSize="9"
            fill="rgba(138,180,248,0.3)" fontFamily="inherit">
            BestFriendStock
          </text>
        </g>
      </svg>
    </div>
  )
}

// ── Gauge card ────────────────────────────────────────────────────────────────
function GaugeCard({ title, score, labelZh, labelEn, vix, zh }) {
  const label = zh ? labelZh : labelEn
  const color = scoreColor(score)
  return (
    <div style={{
      flex: 1, minWidth: 120,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(138,180,248,0.10)',
      borderRadius: 10,
      padding: '10px 8px 8px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 4, letterSpacing: '0.3px' }}>
        {title}
      </div>
      <ReactECharts
        option={buildGauge(score)}
        style={{ height: 130 }}
        opts={{ renderer: 'svg' }}
      />
      <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: -6 }}>
        {label}
      </div>
      {vix !== null && vix !== undefined && (
        <div style={{ fontSize: 10, color: '#9aa0a6', marginTop: 3 }}>
          VIX {Number(vix).toFixed(1)}
        </div>
      )}
    </div>
  )
}

// ── Ticker bar ────────────────────────────────────────────────────────────────
function TickerBar({ indices, zh }) {
  const scrollRef = useRef(null)
  // Auto-scroll left
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let x = 0
    const step = () => {
      x += 0.4
      if (x >= el.scrollWidth / 2) x = 0
      el.scrollLeft = x
    }
    const id = setInterval(step, 24)
    return () => clearInterval(id)
  }, [indices])

  const doubled = [...indices, ...indices]  // duplicate for seamless loop

  return (
    <div
      ref={scrollRef}
      style={{
        display: 'flex', gap: 8, overflowX: 'hidden',
        padding: '8px 0 4px', marginTop: 10,
        userSelect: 'none',
      }}
      onMouseEnter={() => scrollRef.current && (scrollRef.current._paused = true)}
      onMouseLeave={() => scrollRef.current && (scrollRef.current._paused = false)}
    >
      {doubled.map((idx, i) => {
        const pct = idx.change_pct
        return (
          <div
            key={i}
            style={{
              flexShrink: 0, minWidth: 110,
              background: changePctBg(pct),
              border: `1px solid ${changePctBorder(pct)}`,
              borderRadius: 8, padding: '5px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 2, whiteSpace: 'nowrap' }}>
              {zh ? (idx.name_zh || idx.name) : idx.name}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: changePctColor(pct) }}>
              {pct !== null && pct !== undefined
                ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
                : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(232,234,240,0.5)' }}>
              {idx.close !== null && idx.close !== undefined
                ? Number(idx.close).toLocaleString()
                : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function GlobalSentiment({ lang }) {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const zh = lang === 'zh'

  useEffect(() => {
    fetch('/api/market/sentiment')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const usScore  = data?.us_sentiment?.score  ?? 50
  const cnScore  = data?.cn_sentiment?.score  ?? 50
  const indices  = data?.indices ?? []
  const updTime  = data?.updated_at?.slice(11, 16) ?? ''

  return (
    <div style={{
      background: 'rgba(8,14,26,0.75)',
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
          {/* Live dot */}
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
            {zh ? '全球市场情绪地图' : 'Global Market Sentiment'}
          </span>
          {updTime && !loading && (
            <span style={{ fontSize: 10, color: '#4a5568' }}>
              {zh ? `更新于 ${updTime}` : `Updated ${updTime}`}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#4a5568', userSelect: 'none' }}>
          {collapsed ? '▼ 展开' : '▲ 收起'}
        </span>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div style={{ padding: '12px 16px 14px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: '#9aa0a6', fontSize: 13 }}>
              {zh ? '加载全球市场数据...' : 'Loading global market data...'}
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6 }}>
                {zh ? '首次加载约需15秒' : 'First load takes ~15s'}
              </div>
            </div>
          ) : (
            <>
              {/* Map + Gauges row */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {/* World Map */}
                <div style={{ flex: '1 1 360px', minWidth: 0 }}>
                  <WorldMapSVG indices={indices} lang={lang} />
                </div>

                {/* Gauge column */}
                <div style={{ flex: '0 0 256px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, color: '#4a5568', textAlign: 'center', letterSpacing: '0.3px' }}>
                    {zh ? '市场情绪指数 (0-100)' : 'Sentiment Index (0-100)'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
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
                  </div>

                  {/* Sentiment description */}
                  <div style={{
                    fontSize: 11, lineHeight: 1.6, color: '#4a5568',
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8, border: '1px solid rgba(138,180,248,0.07)',
                    marginTop: 2,
                  }}>
                    {zh
                      ? '综合RSI、52周高点距离、VIX波动率及涨跌比计算，仅供参考，不构成投资建议。'
                      : 'Composite of RSI, 52w-high proximity, VIX & advance/decline ratio. For reference only, not investment advice.'}
                  </div>
                </div>
              </div>

              {/* Ticker bar */}
              <TickerBar indices={indices} zh={zh} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
