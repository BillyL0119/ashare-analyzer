import { useState, useEffect } from 'react'
import useLangStore from '../store/langStore'
import useCompareStore from '../store/compareStore'
import { T } from '../i18n/translations'
import { getNews } from '../api/stockApi'
import { THEME } from '../utils/chartHelpers'
import useThemeStore from '../store/themeStore'

const SENT_COLOR = {
  positive: '#26a69a',
  neutral: 'var(--text-muted)',
  negative: '#ef5350',
}

const IMPACT_STYLE = {
  high:   { bg: 'rgba(239,83,80,0.14)',   color: '#ef5350' },
  medium: { bg: 'rgba(255,167,38,0.14)',  color: '#ffa726' },
  low:    { bg: 'rgba(154,160,166,0.10)', color: 'var(--text-muted)' },
}

// ── News skeleton ─────────────────────────────────────────────────────────────
function NewsSkeleton() {
  return (
    <div className="skeleton-appear" style={{ display: 'flex', flexDirection: 'column' }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{
          padding: '12px 0',
          borderBottom: `1px solid ${THEME.border}`,
          display: 'flex', flexDirection: 'column', gap: 7,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="skeleton" style={{ height: 18, width: 48, borderRadius: 10, flexShrink: 0 }} />
            <div className="skeleton" style={{ height: 14, flex: 1 }} />
          </div>
          <div className="skeleton" style={{ height: 11, width: '72%', marginLeft: 56 }} />
          <div className="skeleton" style={{ height: 10, width: '32%', marginLeft: 56 }} />
        </div>
      ))}
    </div>
  )
}

// ── Sentiment bar chart (positive / neutral / negative) ───────────────────────
function SentimentBar({ positive, neutral, negative, t }) {
  const total = positive + neutral + negative || 1
  const segments = [
    { key: 'positive', value: positive, color: SENT_COLOR.positive, label: t.newsPositive },
    { key: 'neutral',  value: neutral,  color: SENT_COLOR.neutral,  label: t.newsNeutral  },
    { key: 'negative', value: negative, color: SENT_COLOR.negative, label: t.newsNegative },
  ]
  return (
    <div>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 8 }}>
        {segments.map(({ key, value, color }) => (
          <div
            key={key}
            style={{ width: `${(value / total) * 100}%`, background: color, transition: 'width 0.5s ease' }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
        {segments.map(({ key, value, color, label }) => (
          <span key={key} style={{ color, fontWeight: 600 }}>
            {label} <span style={{ color: 'var(--text-primary)' }}>{value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Sentiment gauge (arc, –1 to +1) ──────────────────────────────────────────
function SentimentGauge({ score, t }) {
  const pct = Math.max(0, Math.min(100, Math.round(((score + 1) / 2) * 100)))
  const color = score > 0.2 ? SENT_COLOR.positive : score < -0.2 ? SENT_COLOR.negative : SENT_COLOR.neutral
  // Arc path: semicircle, r=28, cx=40 cy=40
  // Total arc length of semicircle ≈ π*28 ≈ 88
  const arcLen = Math.PI * 28
  const dashArray = `${(pct / 100) * arcLen} ${arcLen}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 80 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{t.newsSentimentScore}</div>
      <svg width="80" height="46" viewBox="0 0 80 46">
        {/* Track */}
        <path
          d="M 8 40 A 28 28 0 0 1 72 40"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Value */}
        <path
          d="M 8 40 A 28 28 0 0 1 72 40"
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={dashArray}
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s' }}
        />
      </svg>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: -12 }}>
        {score > 0 ? '+' : ''}{score.toFixed(2)}
      </div>
    </div>
  )
}

// ── Single news item ──────────────────────────────────────────────────────────
function NewsItem({ item, t }) {
  const [expanded, setExpanded] = useState(false)
  const sent = item.final_sentiment || 'neutral'
  const borderColor = SENT_COLOR[sent] || SENT_COLOR.neutral
  const ai = item.ai_sentiment || {}
  const impactStyle = IMPACT_STYLE[ai.impact] || IMPACT_STYLE.low
  const impactLabel = ai.impact === 'high' ? t.newsHighImpact
                    : ai.impact === 'medium' ? t.newsMedImpact
                    : ai.impact === 'low' ? t.newsLowImpact : ''

  const sentLabel = sent === 'positive' ? t.newsPositive
                  : sent === 'negative' ? t.newsNegative
                  : t.newsNeutral

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      style={{
        borderLeft: `3px solid ${borderColor}`,
        paddingLeft: 12,
        padding: '10px 10px 10px 14px',
        cursor: 'pointer',
        borderBottom: `1px solid ${THEME.border}`,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(138,180,248,0.04)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Sentiment pill */}
        <span style={{
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 10,
          background: `${borderColor}1a`,
          color: borderColor,
          border: `1px solid ${borderColor}40`,
          letterSpacing: '0.2px',
        }}>
          {sentLabel}
        </span>

        {/* Title + AI summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            color: 'var(--text-primary)',
            lineHeight: 1.45,
            marginBottom: ai.summary ? 4 : 0,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: expanded ? 'unset' : 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {item.title}
          </div>
          {ai.summary && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {ai.summary}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>{item.source}</span>
            {item.time && <span>{item.time.slice(0, 16)}</span>}
            {item.lang === 'en' && (
              <span style={{ color: '#8ab4f8', fontSize: 10, background: 'rgba(138,180,248,0.1)', padding: '1px 5px', borderRadius: 3 }}>EN</span>
            )}
          </div>
        </div>

        {/* Impact badge */}
        {impactLabel && (
          <span style={{
            flexShrink: 0,
            fontSize: 10,
            padding: '2px 7px',
            borderRadius: 4,
            background: impactStyle.bg,
            color: impactStyle.color,
            fontWeight: 600,
          }}>
            {impactLabel}
          </span>
        )}

        {/* Expand arrow */}
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 2, flexShrink: 0, marginTop: 2 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded AI detail */}
      {expanded && (
        <div style={{
          marginTop: 10,
          padding: '10px 12px',
          background: 'rgba(138,180,248,0.04)',
          border: '1px solid rgba(138,180,248,0.10)',
          borderRadius: 6,
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}>
          {ai.reason && (
            <div>
              <span style={{ color: '#8ab4f8', fontWeight: 600 }}>{t.newsAiAnalysis}：</span>
              {ai.reason}
            </div>
          )}
          <div style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>
              <span style={{ color: 'var(--text-muted)' }}>{t.newsSource}：</span>
              {item.source}
            </span>
            {item.url && item.url !== 'nan' && item.url.startsWith('http') && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: '#8ab4f8', textDecoration: 'none', fontSize: 11 }}
              >
                {t.newsReadMore}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Filter pill button ────────────────────────────────────────────────────────
function FilterPill({ active, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 11px',
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        background: active
          ? `${color || 'rgba(138,180,248,0.25)'}30`
          : 'rgba(255,255,255,0.05)',
        color: active ? (color || '#8ab4f8') : 'var(--text-muted)',
        transition: 'all 0.15s',
        letterSpacing: '0.2px',
      }}
    >
      {children}
    </button>
  )
}

// ── Per-stock news block ──────────────────────────────────────────────────────
function NewsBlock({ stock, lang, market, onOpenDetail }) {
  const t = T[lang]
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [langFilter, setLangFilter] = useState('all')
  const [sentFilter, setSentFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    setError(null)
    setData(null)
    getNews(stock.code, market)
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.response?.data?.detail || t.newsError))
      .finally(() => setLoading(false))
  }, [stock.code, market]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = (data?.news || [])
    .filter((n) => langFilter === 'all' || n.lang === langFilter)
    .filter((n) => sentFilter === 'all' || n.final_sentiment === sentFilter)

  return (
    <div
      style={{
        background: THEME.gridBg,
        border: `1px solid ${THEME.border}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      {/* Stock header */}
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
        <span style={{
          background: 'rgba(138,180,248,0.08)',
          border: '1px solid rgba(138,180,248,0.3)',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 12,
          color: '#8ab4f8',
          fontFamily: 'monospace',
        }}>
          {stock.code}
        </span>
        <span
          onClick={() => onOpenDetail && onOpenDetail(stock.code, stock.name)}
          style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', cursor: onOpenDetail ? 'pointer' : 'default', textDecoration: onOpenDetail ? 'underline dotted' : 'none' }}
        >
          {stock.name}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: 'var(--text-muted)',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 4,
          padding: '2px 8px',
        }}>
          {t.newsSentiment}
        </span>
      </div>

      {/* Loading */}
      {loading && <NewsSkeleton />}

      {/* Error */}
      {error && !loading && (
        <div style={{
          color: '#f85149',
          fontSize: 13,
          padding: 12,
          background: '#f8514910',
          border: '1px solid #f8514930',
          borderRadius: 6,
        }}>
          {error}
        </div>
      )}

      {/* Content */}
      {data && !loading && (
        <>
          {/* ── Overview card ── */}
          {data.overall && (
            <div style={{
              background: 'rgba(138,180,248,0.03)',
              border: '1px solid rgba(138,180,248,0.10)',
              borderRadius: 8,
              padding: '14px 16px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.3px', marginBottom: 10, textTransform: 'uppercase' }}>
                  {t.newsOverview}
                </div>
                <SentimentBar
                  positive={data.overall.positive_count}
                  neutral={data.overall.neutral_count}
                  negative={data.overall.negative_count}
                  t={t}
                />
                {data.overall.ai_summary && (
                  <div style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: '#c084fc',
                    lineHeight: 1.5,
                    paddingTop: 10,
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    {data.overall.ai_summary}
                  </div>
                )}
              </div>
              <SentimentGauge score={data.overall.sentiment_score} t={t} />
            </div>
          )}

          {/* ── Filters ── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <FilterPill active={langFilter === 'all'} onClick={() => setLangFilter('all')}>
              {t.newsAllLang}
            </FilterPill>
            <FilterPill active={langFilter === 'zh'} onClick={() => setLangFilter('zh')}>
              {t.newsZh}
            </FilterPill>
            <FilterPill active={langFilter === 'en'} onClick={() => setLangFilter('en')}>
              {t.newsEn}
            </FilterPill>

            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 3px' }} />

            <FilterPill active={sentFilter === 'all'} onClick={() => setSentFilter('all')}>
              {t.newsAllSent}
            </FilterPill>
            <FilterPill
              active={sentFilter === 'positive'}
              color={SENT_COLOR.positive}
              onClick={() => setSentFilter('positive')}
            >
              {t.newsPositive}
            </FilterPill>
            <FilterPill
              active={sentFilter === 'negative'}
              color={SENT_COLOR.negative}
              onClick={() => setSentFilter('negative')}
            >
              {t.newsNegative}
            </FilterPill>
          </div>

          {/* ── News list ── */}
          {filtered.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
              {t.newsNoData}
            </div>
          ) : (
            <div style={{ borderTop: `1px solid ${THEME.border}` }}>
              {filtered.map((item, idx) => (
                <NewsItem key={idx} item={item} t={t} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Panel (one block per compared stock) ─────────────────────────────────────
export default function NewsPanel({ stocks, onOpenDetail }) {
  useThemeStore((s) => s.theme) // re-render on theme toggle
  const lang = useLangStore((s) => s.lang)
  const market = useCompareStore((s) => s.market)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {stocks.map((stock) => (
        <NewsBlock key={stock.code} stock={stock} lang={lang} market={market} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  )
}
