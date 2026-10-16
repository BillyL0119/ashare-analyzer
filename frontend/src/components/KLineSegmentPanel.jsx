/**
 * KLineSegmentPanel
 * Shown below the K-line chart after the user drags a range selection.
 * Displays quick stats computed on the frontend, then lets the user trigger
 * AI analysis (backend call) which returns news + technical + AI text.
 */
import { useState, useEffect } from 'react'
import { analyzeKlineSegment } from '../api/stockApi'
import { THEME, riseColor, fallColor } from '../utils/chartHelpers'
import useThemeStore from '../store/themeStore'
import { T } from '../i18n/translations'
import Icon from './Icon'

function StatCard({ label, value, color }) {
  useThemeStore((s) => s.theme)
  return (
    <div style={{
      flex: 1, minWidth: 72,
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${THEME.border}`,
      borderRadius: 6, padding: '7px 10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', color: color || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

function AIText({ text }) {
  if (!text) return null
  return (
    <div>
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />
        // Section header: **Title**
        if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
          return (
            <div key={i} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13, marginTop: 12, marginBottom: 3 }}>
              {line.trim().slice(2, -2)}
            </div>
          )
        }
        // Inline bold **word**
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <div key={i} style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.75 }}>
            {parts.map((p, j) =>
              /^\*\*[^*]+\*\*$/.test(p)
                ? <strong key={j}>{p.slice(2, -2)}</strong>
                : p
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function KLineSegmentPanel({ symbol, name, market, startDate, endDate, previewStats, onClose, lang }) {
  useThemeStore((s) => s.theme)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)

  const t  = T[lang] || T.en

  // A new range or a language switch makes an old answer stale
  useEffect(() => { setResult(null); setError(null) }, [startDate, endDate, lang, symbol])

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyzeKlineSegment({
        symbol,
        stock_name: name || symbol,
        start_date: startDate,
        end_date:   endDate,
        market:     market || 'cn',
        lang:       lang || 'en',
      })
      setResult(res.data)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || t.ksAnalyzeFail)
    } finally {
      setLoading(false)
    }
  }

  // Up = red / down = green for A-shares, the reverse for US stocks (same as the chart)
  const pctColor = previewStats.period_return >= 0 ? riseColor(market) : fallColor(market)

  return (
    <div style={{
      margin: '0 0 4px 0',
      borderTop: `1px solid ${THEME.border}`,
      background: 'color-mix(in srgb, var(--accent) 3%, transparent)',
      padding: '12px 14px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
          {t.ksTitle}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {startDate} ~ {endDate}
          &nbsp;·&nbsp;
          {previewStats.bars}{t.ksBars}
        </span>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto', background: 'transparent', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
            padding: '0 2px',
          }}
          title={t.ksClose}
        >
          ×
        </button>
      </div>

      {/* Quick stats row (computed from candles on frontend — instant) */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        <StatCard
          label={t.ksReturn}
          value={`${previewStats.period_return >= 0 ? '+' : ''}${previewStats.period_return.toFixed(2)}%`}
          color={pctColor}
        />
        <StatCard label={t.ksHigh}      value={previewStats.high.toFixed(2)} />
        <StatCard label={t.ksLow}       value={previewStats.low.toFixed(2)} />
        <StatCard label={t.ksAmplitude} value={`${previewStats.amplitude.toFixed(1)}%`} />
        <StatCard
          label={t.ksAnnVol}
          value={`${previewStats.volatility.toFixed(1)}%`}
        />
      </div>

      {/* Error — muted info style, not alarming red */}
      {error && (
        <div style={{
          fontSize: 13, padding: '6px 10px', marginBottom: 6,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${THEME.border}`,
          borderRadius: 5, color: 'var(--text-muted)',
        }}>
          <Icon name="warn" size={15} style={{ marginRight: 6 }} />{error}
        </div>
      )}

      {/* AI result section */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Tech summary */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${THEME.border}`,
            borderRadius: 6, padding: '8px 12px', fontSize: 13,
          }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
              MACD:&nbsp;<span style={{ color: 'var(--text-primary)' }}>{result.tech?.macd}</span>
            </div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
              RSI:&nbsp;<span style={{ color: 'var(--text-primary)' }}>{result.tech?.rsi}</span>
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              {t.ksMA}:&nbsp;<span style={{ color: 'var(--text-primary)' }}>{result.tech?.ma}</span>
            </div>
          </div>

          {/* News in range */}
          {result.has_news && result.news?.length > 0 && (
            <div>
              <div style={{ fontSize: 13, color: '#26a69a', fontWeight: 600, marginBottom: 4 }}>
                {t.ksNewsInRange(result.news.length)}
              </div>
              {result.news.map((n, i) => (
                <div key={i} style={{
                  fontSize: 13, padding: '3px 0 3px 8px',
                  borderLeft: '2px solid #26a69a',
                  marginBottom: 3,
                }}>
                  <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>[{n.date}]</span>
                  <span style={{ color: 'var(--text-primary)' }}>{n.title}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>— {n.source}</span>
                </div>
              ))}
            </div>
          )}

          {/* No-news notice — neutral info style */}
          {!result.has_news && (
            <div style={{
              fontSize: 13, color: 'var(--text-muted)',
              padding: '4px 10px',
              border: `1px solid ${THEME.border}`, borderRadius: 4,
              background: 'rgba(255,255,255,0.03)',
            }}>
              {t.ksNoNews}
            </div>
          )}

          {/* AI text */}
          <div style={{
            background: 'color-mix(in srgb, var(--accent) 5%, transparent)',
            border: `1px solid color-mix(in srgb, var(--accent) 20%, transparent)`,
            borderRadius: 6, padding: '10px 14px',
          }}>
            <AIText text={result.ai_analysis} />
          </div>

          {result.ai_source && result.ai_source !== 'none' && result.ai_source !== 'error' && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'right' }}>
              {t.ksGenBy(result.ai_source)}
            </div>
          )}

          {/* Re-analyze */}
          <button
            onClick={() => { setResult(null); setError(null) }}
            style={{
              padding: '5px', background: 'transparent',
              color: 'var(--text-muted)', border: `1px solid ${THEME.border}`,
              borderRadius: 5, cursor: 'pointer', fontSize: 13,
            }}
          >
            {t.ksReanalyze}
          </button>
        </div>
      )}

      {/* Analyze button — shown before result */}
      {!result && (
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            display: 'block', width: '100%', padding: '10px 0',
            background: loading
              ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
              : 'var(--accent)',
            color: 'var(--accent-ink)', border: 'none', borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600, letterSpacing: '0.3px',
            transition: 'opacity 0.15s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? t.ksAnalyzing : t.ksAnalyze}
        </button>
      )}
    </div>
  )
}
