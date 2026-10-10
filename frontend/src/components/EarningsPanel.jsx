import { useState, useEffect } from 'react'
import { T } from '../i18n/translations'

const MUTED = 'var(--text-muted)'
const BDR = 'rgba(138,180,248,0.10)'

const MARKET_CFG = {
  us: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', zh: '美股', en: 'US Stocks', ja: '米国株', ko: '미국주', fr: 'Actions US' },
  cn: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', zh: 'A股',  en: 'A-Shares',  ja: 'A株',   ko: 'A주식',  fr: 'A-Share' },
}

function getLang(cfg, lang) {
  return cfg[lang] || cfg.en
}

function EarningsRow({ item, lang, t, onStockClick }) {
  const [hover, setHover] = useState(false)
  const mkt = MARKET_CFG[item.market] || MARKET_CFG.us
  const hasEps = item.eps_estimate !== null && item.eps_estimate !== undefined
  const hasRevest = item.revenue_estimate !== null && item.revenue_estimate !== undefined
  const hasActualEps = item.eps_actual !== null && item.eps_actual !== undefined
  const hasActualRev = item.revenue_actual !== null && item.revenue_actual !== undefined

  // Beat/miss indicator
  const epsBeat = hasEps && hasActualEps
    ? parseFloat(item.eps_actual) >= parseFloat(item.eps_estimate) ? 'beat' : 'miss'
    : null

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px',
        borderBottom: '1px solid rgba(138,180,248,0.06)',
        background: hover ? 'rgba(138,180,248,0.04)' : 'transparent',
        transition: 'background 0.12s',
        cursor: onStockClick ? 'pointer' : 'default',
      }}
      onClick={() => onStockClick && onStockClick(item.symbol, item.name)}
    >
      {/* Symbol */}
      <span style={{
        fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
        color: mkt.color, minWidth: 60, flexShrink: 0,
      }}>
        {item.symbol}
      </span>

      {/* Company name */}
      <span style={{
        fontSize: 13, color: 'var(--text-primary)', flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.name}
      </span>

      {/* Report type badge (A-share) */}
      {item.timing && (
        <span style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 10, flexShrink: 0,
          background: mkt.bg, color: mkt.color,
          border: `1px solid ${mkt.color}40`,
          fontWeight: 600,
        }}>
          {item.timing}
        </span>
      )}

      {/* EPS block */}
      {(hasEps || hasActualEps) && (
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 1 }}>EPS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            {hasEps && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t.earEst} {item.eps_estimate}
              </span>
            )}
            {epsBeat && (
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: epsBeat === 'beat' ? '#34d399' : '#f87171',
              }}>
                {epsBeat === 'beat' ? '▲' : '▼'}
              </span>
            )}
            {hasActualEps && (
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: epsBeat === 'beat' ? '#34d399' : epsBeat === 'miss' ? '#f87171' : 'var(--text-primary)',
              }}>
                {item.eps_actual}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Revenue block */}
      {(hasRevest || hasActualRev) && (
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 1 }}>
            {t.earRevenue}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            {hasRevest && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {t.earEst}{item.revenue_estimate}
              </span>
            )}
            {hasActualRev && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
                {item.revenue_actual}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DateGroup({ dateStr, items, lang, t, onStockClick }) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  const dayLabel = diff === 0 ? t.earToday : diff === 1 ? t.earTomorrow : `+${diff}d`

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 14px',
        background: 'rgba(138,180,248,0.06)',
        borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid rgba(138,180,248,0.12)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#8ab4f8', fontFamily: 'monospace' }}>
          {dateStr}
        </span>
        <span style={{
          fontSize: 11, borderRadius: 6,
          color: diff <= 1 ? '#ffa726' : 'var(--text-muted)',
          background: diff <= 1 ? 'rgba(255,167,38,0.12)' : 'transparent',
          padding: diff <= 1 ? '1px 6px' : 0,
          fontWeight: diff <= 1 ? 600 : 400,
        }}>
          {dayLabel}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {items.length} {t.earCompanies}
        </span>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.015)',
        borderRadius: '0 0 8px 8px',
        border: '1px solid rgba(138,180,248,0.08)',
        borderTop: 'none',
      }}>
        {items.map((item, i) => (
          <EarningsRow key={i} item={item} lang={lang} t={t} onStockClick={onStockClick} />
        ))}
      </div>
    </div>
  )
}

export default function EarningsPanel({ lang, onStockSelect }) {
  const t = T[lang] || T.en
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [market,  setMarket]  = useState('us')

  useEffect(() => {
    fetch('/api/earnings/calendar')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => console.error('earnings:', e))
      .finally(() => setLoading(false))
  }, [])

  const events = data ? (market === 'us' ? (data.us || []) : (data.cn || [])) : []

  // Group by date
  const groups = {}
  for (const ev of events) {
    if (!groups[ev.date]) groups[ev.date] = []
    groups[ev.date].push(ev)
  }
  const dates = Object.keys(groups).sort()

  const handleStockClick = (symbol, name) => {
    onStockSelect && onStockSelect(symbol, name)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          fontSize: 16, fontWeight: 600,
          background: 'linear-gradient(90deg,#8ab4f8,#c084fc)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {t.earTitle}
        </div>
        {data?.updated_at && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {t.earUpdated} {data.updated_at.slice(0, 16).replace('T', ' ')}
          </div>
        )}
      </div>

      {/* Market toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['us', 'cn'].map((m) => {
          const cfg = MARKET_CFG[m]
          const active = market === m
          return (
            <button
              key={m}
              onClick={() => setMarket(m)}
              style={{
                padding: '5px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 400,
                background: active ? cfg.bg : 'rgba(255,255,255,0.05)',
                color: active ? cfg.color : MUTED,
                border: active ? `1px solid ${cfg.color}40` : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {getLang(cfg, lang)}
              {data && (
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                  ({m === 'us' ? (data.us?.length || 0) : (data.cn?.length || 0)})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
          {t.earLoading}
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text-muted)' }}>
            {t.earLongLoad}
          </div>
        </div>
      ) : dates.length === 0 ? (
        <div style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
          {t.earEmpty}
        </div>
      ) : (
        <div>
          {dates.map((d) => (
            <DateGroup
              key={d}
              dateStr={d}
              items={groups[d]}
              lang={lang}
              t={t}
              onStockClick={handleStockClick}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        {t.earFooter}
      </div>
    </div>
  )
}
