import { useState, useEffect } from 'react'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { getSimilarStocks } from '../api/stockApi'
import { THEME } from '../utils/chartHelpers'

// Simple SVG sparkline
function Sparkline({ data, width = 80, height = 32 }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const last = data[data.length - 1]
  const first = data[0]
  const up = last >= first
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={up ? '#3fb950' : '#f85149'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Correlation bar (–1 to +1 → 0% to 100%)
function CorrBar({ value }) {
  const pct = Math.round(((value + 1) / 2) * 100)
  const color = value >= 0.8 ? '#3fb950' : value >= 0.5 ? '#f0e68c' : '#8b949e'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: 60,
          height: 6,
          background: '#21262d',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'monospace', minWidth: 36 }}>
        {value.toFixed(3)}
      </span>
    </div>
  )
}

function StockBlock({ stock, lang }) {
  const t = T[lang]
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getSimilarStocks(stock.code)
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.response?.data?.detail || t.similarError))
      .finally(() => setLoading(false))
  }, [stock.code]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        background: THEME.gridBg,
        border: `1px solid ${THEME.border}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
        <span
          style={{
            background: '#1f6feb22',
            border: '1px solid #1f6feb66',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 12,
            color: '#58a6ff',
            fontFamily: 'monospace',
          }}
        >
          {stock.code}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3' }}>{stock.name}</span>
        {data?.industry && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: '#8b949e',
              background: '#21262d',
              borderRadius: 4,
              padding: '2px 8px',
            }}
          >
            {data.industry}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ color: '#8b949e', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
          {t.similarLoading}
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            color: '#f85149',
            fontSize: 13,
            padding: 12,
            background: '#f8514910',
            border: '1px solid #f8514930',
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 80px 1fr 120px 90px',
              gap: '0 12px',
              padding: '4px 8px',
              marginBottom: 4,
              fontSize: 11,
              color: '#484f58',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span>#</span>
            <span>{t.similarCode}</span>
            <span>{t.similarName}</span>
            <span>{t.similarCorr}</span>
            <span>{t.similarTrend2}</span>
          </div>

          {data.results.map((item, idx) => (
            <div
              key={item.code}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 80px 1fr 120px 90px',
                gap: '0 12px',
                alignItems: 'center',
                padding: '8px 8px',
                borderRadius: 6,
                borderBottom: idx < data.results.length - 1 ? `1px solid ${THEME.border}` : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 12, color: '#484f58', fontWeight: 700 }}>
                {idx + 1}
              </span>
              <span style={{ fontSize: 12, color: '#58a6ff', fontFamily: 'monospace' }}>
                {item.code}
              </span>
              <span style={{ fontSize: 13, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
              <CorrBar value={item.correlation} />
              <Sparkline data={item.sparkline} />
            </div>
          ))}

          {data.results.length === 0 && (
            <div style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
              {t.similarNoResults}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function SimilarPanel({ stocks }) {
  const lang = useLangStore((s) => s.lang)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {stocks.map((stock) => (
        <StockBlock key={stock.code} stock={stock} lang={lang} />
      ))}
    </div>
  )
}
