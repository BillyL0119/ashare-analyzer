import { useState, useEffect } from 'react'
import StockDetailPage from './StockDetailPage'

const REFRESH_INTERVAL = 60000
const UP   = '#ef5350'
const DOWN = '#26a69a'
const BG   = 'rgba(255,255,255,0.03)'
const BDR  = 'rgba(138,180,248,0.10)'

function IndexCard({ label, data }) {
  if (!data) return (
    <div style={{ flex: 1, background: BG, border: `1px solid ${BDR}`, borderRadius: 12, padding: '16px 20px', minWidth: 140 }}>
      <div style={{ color: '#4a5568', fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ color: '#4a5568', fontSize: 22 }}>--</div>
    </div>
  )
  const up    = data.change_pct >= 0
  const color = up ? UP : DOWN
  return (
    <div style={{ flex: 1, background: BG, border: `1px solid ${up ? 'rgba(239,83,80,0.22)' : 'rgba(38,166,154,0.22)'}`, borderRadius: 12, padding: '16px 20px', minWidth: 140 }}>
      <div style={{ color: '#9aa0a6', fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>{data.value.toFixed(2)}</div>
      <div style={{ color, fontSize: 13, marginTop: 4 }}>
        {up ? '+' : ''}{data.change.toFixed(2)}&nbsp;({up ? '+' : ''}{(data.change_pct * 100).toFixed(2)}%)
      </div>
    </div>
  )
}

function ADBar({ advance, decline, flat, totalVolume, lang }) {
  const total  = advance + decline + flat || 1
  const advPct = (advance / total * 100).toFixed(1)
  const decPct = (decline / total * 100).toFixed(1)
  const fltPct = (flat    / total * 100).toFixed(1)
  return (
    <div style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 12, padding: '14px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
        <span style={{ color: UP,   fontWeight: 600 }}>↑ {advance} ({advPct}%)</span>
        <span style={{ color: '#9aa0a6' }}>{lang === 'zh' ? '成交' : 'Vol'} {totalVolume}</span>
        <span style={{ color: DOWN, fontWeight: 600 }}>↓ {decline} ({decPct}%)</span>
      </div>
      <div style={{ height: 12, borderRadius: 6, overflow: 'hidden', background: '#1a2233', display: 'flex' }}>
        <div style={{ width: `${advPct}%`, background: UP,   transition: 'width 0.6s' }} />
        <div style={{ width: `${fltPct}%`, background: '#4a5568' }} />
        <div style={{ flex: 1,             background: DOWN }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#4a5568' }}>
        {lang === 'zh' ? '平盘' : 'Flat'} {flat}
      </div>
    </div>
  )
}

// ── Sector heatmap tile ──────────────────────────────────────────────────────

function heatColor(pct) {
  // pct in roughly [-3, +3]; map to red/green with intensity
  const clamped = Math.max(-4, Math.min(4, pct))
  if (clamped >= 0) {
    const t = clamped / 4
    // white → red
    const r = 255
    const g = Math.round(255 * (1 - t) * 0.8)
    const b = Math.round(255 * (1 - t) * 0.8)
    return { bg: `rgba(${r},${g},${b},${0.08 + t * 0.22})`, color: UP }
  } else {
    const t = -clamped / 4
    // white → green
    const r = Math.round(255 * (1 - t) * 0.8)
    const g = 200
    const b = Math.round(200 * (1 - t) * 0.85)
    return { bg: `rgba(${r},${g},${b},${0.08 + t * 0.22})`, color: DOWN }
  }
}

function SectorHeatTile({ sector, lang, onSectorClick }) {
  const [hover, setHover] = useState(false)
  const { bg, color } = heatColor(sector.change_pct)
  const up = sector.change_pct >= 0

  return (
    <div
      onClick={() => onSectorClick(sector)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: bg,
        border: `1px solid ${up ? 'rgba(239,83,80,0.2)' : 'rgba(38,166,154,0.2)'}`,
        borderRadius: 10,
        padding: '12px 10px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      <div style={{ color: '#e8eaed', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
        {sector.name}
      </div>
      <div style={{ color, fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>
        {up ? '+' : ''}{sector.change_pct.toFixed(2)}%
      </div>
      {sector.leader && (
        <div style={{ color: '#9aa0a6', fontSize: 10, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sector.leader}
        </div>
      )}

      {/* Hover tooltip: would show all stocks but we only have leader info from API */}
      {hover && sector.leader && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
          background: '#1a2233', border: `1px solid ${BDR}`, borderRadius: 8,
          padding: '8px 12px', zIndex: 100, whiteSpace: 'nowrap', pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 12, color: '#8ab4f8', marginBottom: 2 }}>
            {lang === 'zh' ? '龙头股' : 'Leader'}
          </div>
          <div style={{ fontSize: 12, color: '#e8eaed' }}>
            {sector.leader_code} {sector.leader}
          </div>
          <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
            {lang === 'zh' ? '点击查看板块相似走势' : 'Click to see sector trends'}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MarketOverview({ lang, onStockSelect }) {
  const [data,         setData]         = useState(null)
  const [sectors,      setSectors]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [lastUpdate,   setLastUpdate]   = useState(null)
  const [detailSymbol, setDetailSymbol] = useState(null)
  const [detailName,   setDetailName]   = useState(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/market/overview')
      if (res.ok) { setData(await res.json()); setLastUpdate(new Date()) }
    } catch (e) { console.error('market overview:', e) }
    finally { setLoading(false) }
  }

  const fetchSectors = async () => {
    try {
      const res = await fetch('/api/market/sectors')
      if (res.ok) setSectors(await res.json())
    } catch (e) { console.error('sectors:', e) }
  }

  useEffect(() => {
    fetchData()
    fetchSectors()
    const t = setInterval(() => { fetchData(); fetchSectors() }, REFRESH_INTERVAL)
    return () => clearInterval(t)
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: '#9aa0a6', fontSize: 14 }}>
      {lang === 'zh' ? '加载市场数据...' : 'Loading market data...'}
    </div>
  )

  const handleSectorClick = (sector) => {
    // Load leader stock into detail page
    if (sector.leader_code) {
      setDetailSymbol(sector.leader_code)
      setDetailName(sector.leader)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 16, fontWeight: 600, background: 'linear-gradient(90deg,#8ab4f8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {lang === 'zh' ? 'A股市场概览' : 'A-Share Market Overview'}
        </div>
        <div style={{ fontSize: 11, color: '#4a5568' }}>
          {data?.date} {data?.time}
          {lastUpdate && ` · ${lastUpdate.toLocaleTimeString()}`}
        </div>
      </div>

      {/* Index cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <IndexCard label={lang === 'zh' ? '上证指数' : 'Shanghai'} data={data?.shanghai_index} />
        <IndexCard label={lang === 'zh' ? '深证成指' : 'Shenzhen'} data={data?.shenzhen_index} />
        <IndexCard label={lang === 'zh' ? '创业板指' : 'ChiNext'}  data={data?.chinext_index}  />
      </div>

      {/* Advance / decline bar */}
      {data && (
        <ADBar
          advance={data.advance_count} decline={data.decline_count}
          flat={data.flat_count} totalVolume={data.total_volume} lang={lang}
        />
      )}

      {/* Northbound */}
      {data?.northbound_flow && data.northbound_flow !== 'N/A' && (
        <div style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#9aa0a6', fontSize: 13 }}>{lang === 'zh' ? '北向资金' : 'Northbound Flow'}</span>
          <span style={{ color: data.northbound_flow.startsWith('+') ? UP : DOWN, fontSize: 17, fontWeight: 700 }}>
            {data.northbound_flow}
          </span>
        </div>
      )}

      {/* ── Sector Heatmap (from /api/market/sectors) ── */}
      {sectors?.sectors?.length > 0 && (
        <div>
          <div style={{ color: '#9aa0a6', fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{lang === 'zh' ? '板块热力图' : 'Sector Heatmap'}</span>
            <span style={{ fontSize: 11, color: '#4a5568' }}>
              {lang === 'zh' ? '点击色块查看龙头股详情' : 'Click tile for leader details'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
            {sectors.sectors.map((s) => (
              <SectorHeatTile
                key={s.name}
                sector={s}
                lang={lang}
                onSectorClick={handleSectorClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fallback: old sector performance if sectors API not ready */}
      {!sectors && data?.sector_performance?.length > 0 && (
        <div>
          <div style={{ color: '#9aa0a6', fontSize: 12, marginBottom: 10 }}>
            {lang === 'zh' ? '行业板块表现' : 'Sector Performance'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            {data.sector_performance.map((s) => {
              const up  = s.change_pct >= 0
              const mag = Math.min(Math.abs(s.change_pct) / 3, 1)
              return (
                <div key={s.name} style={{
                  background: up ? `rgba(239,83,80,${0.07 + mag * 0.2})` : `rgba(38,166,154,${0.07 + mag * 0.2})`,
                  border: `1px solid ${up ? 'rgba(239,83,80,0.22)' : 'rgba(38,166,154,0.22)'}`,
                  borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                }}>
                  <div style={{ color: '#e8eaed', fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                  <div style={{ color: up ? UP : DOWN, fontSize: 13, fontWeight: 700, marginTop: 4, fontFamily: 'monospace' }}>
                    {up ? '+' : ''}{s.change_pct.toFixed(2)}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hint */}
      <div style={{ textAlign: 'center', marginTop: 6, color: '#4a5568', fontSize: 13 }}>
        {lang === 'zh' ? '在上方搜索栏输入股票代码开始分析 ↑' : 'Search a stock code above to begin analysis ↑'}
      </div>

      {/* Stock detail modal */}
      {detailSymbol && (
        <StockDetailPage
          symbol={detailSymbol}
          name={detailName}
          lang={lang}
          onClose={() => { setDetailSymbol(null); setDetailName(null) }}
          onLoadMain={(code, n) => {
            setDetailSymbol(null)
            setDetailName(null)
            onStockSelect && onStockSelect(code, n)
          }}
        />
      )}
    </div>
  )
}
