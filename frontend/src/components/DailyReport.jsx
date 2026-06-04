import { useState, useEffect } from 'react'

const ACCENT = '#8ab4f8'
const ACCENT2 = '#c084fc'

function PctBadge({ val }) {
  if (val == null) return <span style={{ color: '#9aa0a6' }}>N/A</span>
  const pos = val >= 0
  const color = pos ? '#22c55e' : '#ef4444'
  const bg    = pos ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'
  const sign  = pos ? '+' : ''
  return (
    <span style={{
      color, background: bg, border: `1px solid ${color}33`,
      borderRadius: 5, padding: '1px 6px', fontSize: 12, fontWeight: 600,
    }}>
      {sign}{val.toFixed(2)}%
    </span>
  )
}

export default function DailyReport({ lang }) {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const zh = lang === 'zh'

  useEffect(() => {
    fetch('/api/market/daily-report')
      .then(r => r.json())
      .then(d => { setReport(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{
        background: 'rgba(138,180,248,0.04)', border: '1px solid rgba(138,180,248,0.12)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 16 }}>📰</span>
        <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
      </div>
    )
  }

  if (!report) return null

  const summary = zh ? report.summary_zh : report.summary_en
  const cn = report.cn_indices || {}
  const us = report.us_indices || {}
  const sent = report.sentiment || {}

  return (
    <div style={{
      background: 'rgba(8,12,20,0.7)', border: '1px solid rgba(138,180,248,0.15)',
      borderRadius: 12, marginBottom: 16, overflow: 'hidden',
      backdropFilter: 'blur(10px)',
    }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>📰</span>
        <span style={{
          fontSize: 12, fontWeight: 700,
          background: `linear-gradient(90deg,${ACCENT},${ACCENT2})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {zh ? '今日日报' : 'Daily Brief'}
        </span>
        <span style={{
          fontSize: 12, color: '#9aa0a6', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {summary}
        </span>
        <span style={{ fontSize: 12, color: '#4a5568', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{
          borderTop: '1px solid rgba(138,180,248,0.08)',
          padding: '12px 16px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12,
        }}>
          {/* CN Indices */}
          {Object.keys(cn).length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 6, fontWeight: 600 }}>
                {zh ? 'A股指数' : 'A-Share Indices'}
              </div>
              {Object.values(cn).map(idx => (
                <div key={idx.name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 5,
                }}>
                  <span style={{ fontSize: 12, color: '#9aa0a6' }}>{idx.name}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#e8eaed' }}>{idx.close?.toLocaleString()}</span>
                    <PctBadge val={idx.change_pct} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* US Indices */}
          {Object.keys(us).length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 6, fontWeight: 600 }}>
                {zh ? '美股指数' : 'US Indices'}
              </div>
              {Object.values(us).map(idx => (
                <div key={idx.name_en} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 5,
                }}>
                  <span style={{ fontSize: 12, color: '#9aa0a6' }}>{zh ? idx.name_zh : idx.name_en}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#e8eaed' }}>{idx.close?.toLocaleString()}</span>
                    <PctBadge val={idx.change_pct} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sentiment */}
          {sent.cn_score != null && (
            <div>
              <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 6, fontWeight: 600 }}>
                {zh ? '市场情绪' : 'Market Mood'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: ACCENT }}>
                  {Math.round(sent.cn_score)}
                </span>
                <span style={{ fontSize: 12, color: '#9aa0a6' }}>
                  {zh ? sent.cn_label_zh : sent.cn_label_en}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
