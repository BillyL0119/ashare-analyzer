/**
 * KLineSegmentPanel
 * Shown below the K-line chart after the user drags a range selection.
 * Displays quick stats computed on the frontend, then lets the user trigger
 * AI analysis (backend call) which returns news + technical + AI text.
 */
import { useState } from 'react'
import { analyzeKlineSegment } from '../api/stockApi'
import { THEME } from '../utils/chartHelpers'
import useThemeStore from '../store/themeStore'

function StatCard({ label, value, color }) {
  useThemeStore((s) => s.theme)
  return (
    <div style={{
      flex: 1, minWidth: 72,
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${THEME.border}`,
      borderRadius: 6, padding: '7px 10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: color || 'var(--text-primary)' }}>
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
            <div key={i} style={{ color: '#8ab4f8', fontWeight: 700, fontSize: 13, marginTop: 12, marginBottom: 3 }}>
              {line.trim().slice(2, -2)}
            </div>
          )
        }
        // Inline bold **word**
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <div key={i} style={{ color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.75 }}>
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

export default function KLineSegmentPanel({ symbol, name, startDate, endDate, previewStats, onClose, lang }) {
  useThemeStore((s) => s.theme)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)

  const zh = lang !== 'en'

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyzeKlineSegment({
        symbol,
        stock_name: name || symbol,
        start_date: startDate,
        end_date:   endDate,
      })
      setResult(res.data)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || (zh ? 'AI解读失败，请稍后重试' : 'Analysis failed, please retry'))
    } finally {
      setLoading(false)
    }
  }

  const pctColor = previewStats.period_return >= 0 ? '#ef5350' : '#26a69a'

  return (
    <div style={{
      margin: '0 0 4px 0',
      borderTop: `1px solid ${THEME.border}`,
      background: 'rgba(14,165,233,0.03)',
      padding: '12px 14px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#8ab4f8', fontWeight: 700 }}>
          {zh ? '区间分析' : 'Segment Analysis'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {startDate} ~ {endDate}
          &nbsp;·&nbsp;
          {previewStats.bars}{zh ? ' 根K线' : ' bars'}
        </span>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto', background: 'transparent', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
            padding: '0 2px',
          }}
          title={zh ? '关闭' : 'Close'}
        >
          ×
        </button>
      </div>

      {/* Quick stats row (computed from candles on frontend — instant) */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        <StatCard
          label={zh ? '涨跌幅' : 'Return'}
          value={`${previewStats.period_return >= 0 ? '+' : ''}${previewStats.period_return.toFixed(2)}%`}
          color={pctColor}
        />
        <StatCard label={zh ? '区间最高' : 'High'}      value={previewStats.high.toFixed(2)} />
        <StatCard label={zh ? '区间最低' : 'Low'}       value={previewStats.low.toFixed(2)} />
        <StatCard label={zh ? '最大振幅' : 'Amplitude'} value={`${previewStats.amplitude.toFixed(1)}%`} />
        <StatCard
          label={zh ? '波动率(年化)' : 'Ann.Vol'}
          value={`${previewStats.volatility.toFixed(1)}%`}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: '#ef5350', fontSize: 12, padding: '4px 0 8px' }}>{error}</div>
      )}

      {/* AI result section */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Tech summary */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${THEME.border}`,
            borderRadius: 6, padding: '8px 12px', fontSize: 12,
          }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
              MACD:&nbsp;<span style={{ color: 'var(--text-primary)' }}>{result.tech?.macd}</span>
            </div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
              RSI:&nbsp;<span style={{ color: 'var(--text-primary)' }}>{result.tech?.rsi}</span>
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              {zh ? '均线' : 'MA'}:&nbsp;<span style={{ color: 'var(--text-primary)' }}>{result.tech?.ma}</span>
            </div>
          </div>

          {/* News in range */}
          {result.has_news && result.news?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#26a69a', fontWeight: 600, marginBottom: 4 }}>
                {zh
                  ? `同期相关新闻（${result.news.length}条）`
                  : `News in range (${result.news.length})`}
              </div>
              {result.news.map((n, i) => (
                <div key={i} style={{
                  fontSize: 11, padding: '3px 0 3px 8px',
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

          {/* No-news notice */}
          {!result.has_news && (
            <div style={{
              fontSize: 11, color: 'var(--text-muted)',
              padding: '4px 8px',
              border: `1px solid ${THEME.border}`, borderRadius: 4,
              background: 'rgba(239,83,80,0.05)',
            }}>
              {zh
                ? '未查到该时段具体新闻，AI解读仅基于技术面数据'
                : 'No news found for this period — AI analysis is technical only'}
            </div>
          )}

          {/* AI text */}
          <div style={{
            background: 'rgba(138,180,248,0.05)',
            border: `1px solid rgba(138,180,248,0.2)`,
            borderRadius: 6, padding: '10px 14px',
          }}>
            <AIText text={result.ai_analysis} />
          </div>

          {result.ai_source && result.ai_source !== 'none' && result.ai_source !== 'error' && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
              {zh ? `由 ${result.ai_source} 生成` : `Generated by ${result.ai_source}`}
            </div>
          )}

          {/* Re-analyze */}
          <button
            onClick={() => { setResult(null); setError(null) }}
            style={{
              padding: '5px', background: 'transparent',
              color: 'var(--text-muted)', border: `1px solid ${THEME.border}`,
              borderRadius: 5, cursor: 'pointer', fontSize: 11,
            }}
          >
            {zh ? '重新解读' : 'Re-analyze'}
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
              ? 'rgba(138,180,248,0.15)'
              : 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
            color: '#fff', border: 'none', borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600, letterSpacing: '0.3px',
            transition: 'opacity 0.15s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? (zh ? 'AI解读中...' : 'Analyzing...')
            : (zh ? 'AI 解读这段走势' : 'AI Trend Analysis')}
        </button>
      )}
    </div>
  )
}
