import { useState, useEffect } from 'react'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { getSimilarStocks, getSimilarCross } from '../api/stockApi'
import { THEME } from '../utils/chartHelpers'
import { useMobile } from '../hooks/useMobile'

// ── Sub-components ────────────────────────────────────────────────────────────

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
  const up = data[data.length - 1] >= data[0]
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={up ? '#26a69a' : '#ef5350'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CorrBar({ value }) {
  const pct = Math.round(((value + 1) / 2) * 100)
  const color = value >= 0.8 ? '#26a69a' : value >= 0.5 ? '#f0e68c' : '#9aa0a6'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'monospace', minWidth: 36 }}>
        {value.toFixed(3)}
      </span>
    </div>
  )
}

function IndustryPill({ label, type }) {
  const isSame = type === 'same'
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 10,
        whiteSpace: 'nowrap',
        background: isSame
          ? 'rgba(138,180,248,0.12)'
          : 'rgba(192,132,252,0.12)',
        color: isSame ? '#8ab4f8' : '#c084fc',
        border: `1px solid ${isSame ? 'rgba(138,180,248,0.25)' : 'rgba(192,132,252,0.25)'}`,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  )
}

// ── ModeToggle ────────────────────────────────────────────────────────────────

function ModeToggle({ mode, setMode, t }) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(138,180,248,0.12)',
        borderRadius: 20,
        padding: 3,
        gap: 2,
        flexShrink: 0,
      }}
    >
      {[
        { key: 'same', label: t.similarSame },
        { key: 'cross', label: t.similarCross },
      ].map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setMode(key)}
          style={{
            padding: '4px 14px',
            borderRadius: 16,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: mode === key ? 600 : 400,
            background: mode === key
              ? 'linear-gradient(135deg, #8ab4f8, #c084fc)'
              : 'transparent',
            color: mode === key ? '#fff' : '#9aa0a6',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── StockBlock ────────────────────────────────────────────────────────────────

function StockBlock({ stock, mode, lang, isMobile }) {
  const t = T[lang]
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setData(null)
    setLoading(true)
    setError(null)
    const fetch = mode === 'cross' ? getSimilarCross : getSimilarStocks
    fetch(stock.code)
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.response?.data?.detail || t.similarError))
      .finally(() => setLoading(false))
  }, [stock.code, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const isCross = mode === 'cross'

  // Column definitions: cross mode adds an industry column
  const gridSame  = '28px 80px 1fr 120px 90px'
  const gridCross = '28px 80px 80px 1fr 120px 90px'

  return (
    <div
      style={{
        background: THEME.gridBg,
        border: `1px solid ${THEME.border}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
          paddingBottom: 10,
          borderBottom: `1px solid ${THEME.border}`,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            background: 'rgba(138,180,248,0.08)',
            border: '1px solid rgba(138,180,248,0.3)',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 12,
            color: '#8ab4f8',
            fontFamily: 'monospace',
          }}
        >
          {stock.code}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#e8eaed' }}>{stock.name}</span>

        {/* Industry tag (same mode) */}
        {!isCross && data?.industry && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: '#9aa0a6',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 4,
              padding: '2px 8px',
            }}
          >
            {data.industry}
          </span>
        )}

        {/* Cross mode: scanned industries summary */}
        {isCross && data?.scanned_industries && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: '#9aa0a6',
            }}
          >
            {t.similarScanned(data.scanned_industries, data.results.length)}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ color: '#9aa0a6', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
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
          {isMobile ? (
            /* ── Mobile card list ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.results.map((item, idx) => (
                <div
                  key={item.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    background: 'rgba(138,180,248,0.04)',
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 700, minWidth: 18 }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#8ab4f8', fontFamily: 'monospace' }}>
                        {item.code}
                      </span>
                      <span style={{ fontSize: 13, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      {isCross && item.industry && (
                        <IndustryPill label={item.industry} type={item.industry_type} />
                      )}
                    </div>
                    <CorrBar value={item.correlation} />
                  </div>
                  <Sparkline data={item.sparkline} width={60} height={26} />
                </div>
              ))}
            </div>
          ) : (
            /* ── Desktop table ── */
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isCross ? gridCross : gridSame,
                  gap: '0 12px',
                  padding: '4px 8px',
                  marginBottom: 4,
                  fontSize: 11,
                  color: '#4a5568',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <span>#</span>
                <span>{t.similarCode}</span>
                {isCross && <span>{t.similarIndustry}</span>}
                <span>{t.similarName}</span>
                <span>{t.similarCorr}</span>
                <span>{t.similarTrend2}</span>
              </div>

              {data.results.map((item, idx) => (
                <div
                  key={item.code}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isCross ? gridCross : gridSame,
                    gap: '0 12px',
                    alignItems: 'center',
                    padding: '8px 8px',
                    borderRadius: 6,
                    borderBottom: idx < data.results.length - 1 ? `1px solid ${THEME.border}` : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(138,180,248,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 12, color: '#4a5568', fontWeight: 700 }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: 12, color: '#8ab4f8', fontFamily: 'monospace' }}>
                    {item.code}
                  </span>
                  {isCross && (
                    <span>
                      <IndustryPill label={item.industry} type={item.industry_type} />
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <CorrBar value={item.correlation} />
                  <Sparkline data={item.sparkline} />
                </div>
              ))}
            </>
          )}

          {data.results.length === 0 && (
            <div style={{ color: '#9aa0a6', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
              {t.similarNoResults}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── SimilarPanel (outer) ──────────────────────────────────────────────────────

export default function SimilarPanel({ stocks }) {
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const isMobile = useMobile()
  const [mode, setMode] = useState('same')   // 'same' | 'cross'

  if (!stocks || stocks.length === 0) {
    return (
      <div style={{ color: '#9aa0a6', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
        {t.similarNoResults}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Mode toggle (shared across all stock blocks) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ModeToggle mode={mode} setMode={setMode} t={t} />
        <span style={{ fontSize: 12, color: '#4a5568' }}>
          {mode === 'same' ? t.similarSame : t.similarCross}
        </span>
      </div>

      {stocks.map((stock) => (
        <StockBlock
          key={stock.code}
          stock={stock}
          mode={mode}
          lang={lang}
          isMobile={isMobile}
        />
      ))}
    </div>
  )
}
