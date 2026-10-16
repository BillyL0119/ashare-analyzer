import { useState, useEffect } from 'react'
import { T } from '../i18n/translations'
import Icon from './Icon'

const ACCENT = '#8ab4f8'
const ACCENT2 = '#c58af9'

function PctBadge({ val }) {
  if (val == null) return <span style={{ color: 'var(--text-muted)' }}>N/A</span>
  const pos = val >= 0
  const color = pos ? '#22c55e' : '#ef4444'
  const bg    = pos ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'
  const sign  = pos ? '+' : ''
  return (
    <span style={{
      color, background: bg,
      borderRadius: 5, padding: '1px 6px', fontSize: 13, fontWeight: 600,
    }}>
      {sign}{val.toFixed(2)}%
    </span>
  )
}

export default function DailyReport({ lang }) {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const t = T[lang] || T.en
  const zh = lang === 'zh'

  useEffect(() => {
    fetch('/api/market/daily-report')
      .then(r => r.json())
      .then(d => { setReport(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="skeleton-appear" style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}><Icon name="news" size={16} /></span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ height: 12, width: '85%' }} />
          <div className="skeleton" style={{ height: 10, width: '55%' }} />
        </div>
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
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
      borderRadius: 'var(--radius)', marginBottom: 4, overflow: 'hidden',
    }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}><Icon name="news" size={16} /></span>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: `${ACCENT}`,
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {t.drTitle}
        </span>
        <span style={{
          fontSize: 13, color: 'var(--text-muted)', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {summary}
        </span>
        <span className={`bfs-chevron${open ? ' is-open' : ''}`} style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>
          ▼
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{
          borderTop: '1px solid var(--border-primary)',
          padding: '12px 16px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12,
        }}>
          {/* CN Indices */}
          {Object.keys(cn).length > 0 && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                {t.drCNIndices}
              </div>
              {Object.values(cn).map(idx => (
                <div key={idx.name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 5,
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{idx.name}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{idx.close?.toLocaleString()}</span>
                    <PctBadge val={idx.change_pct} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* US Indices */}
          {Object.keys(us).length > 0 && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                {t.drUSIndices}
              </div>
              {Object.values(us).map(idx => (
                <div key={idx.name_en} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 5,
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{zh ? idx.name_zh : idx.name_en}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{idx.close?.toLocaleString()}</span>
                    <PctBadge val={idx.change_pct} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sentiment */}
          {(sent.us_score != null || sent.cn_score != null) && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.4px' }}>
                {t.drMood}
              </div>
              {sent.us_score != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 600, color: ACCENT, fontFamily: 'var(--sans)' }}>
                    {Math.round(sent.us_score)}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                      {zh ? sent.us_label_zh : sent.us_label_en}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.drUSMarket}</div>
                  </div>
                </div>
              )}
              {sent.cn_score != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--sans)' }}>
                    {Math.round(sent.cn_score)}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {zh ? sent.cn_label_zh : sent.cn_label_en}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.drCNMarket}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
