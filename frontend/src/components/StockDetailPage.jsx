import { useState, useEffect } from 'react'

const UP   = '#ef5350'
const DOWN = '#26a69a'
const BDR  = 'rgba(138,180,248,0.12)'
const BG   = 'rgba(255,255,255,0.03)'

const SENT_COLOR = {
  positive: '#26a69a',
  neutral:  'var(--text-muted)',
  negative: '#ef5350',
}

function MetricCard({ label, value }) {
  return (
    <div style={{
      background: BG, border: `1px solid ${BDR}`, borderRadius: 8,
      padding: '10px 14px', minWidth: 100, flex: 1,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
        {value ?? '--'}
      </div>
    </div>
  )
}

function MiniSimilarRow({ item, onStockClick }) {
  return (
    <div
      onClick={() => onStockClick(item.code, item.name)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', cursor: 'pointer',
        borderBottom: '1px solid rgba(138,180,248,0.07)',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(138,180,248,0.07)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ fontSize: 11, color: '#8ab4f8', fontFamily: 'monospace', minWidth: 56 }}>{item.code}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.name}
      </span>
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#c084fc', flexShrink: 0 }}>
        {item.correlation?.toFixed(3)}
      </span>
    </div>
  )
}

function MiniNewsRow({ item }) {
  const sent = item.final_sentiment || 'neutral'
  const color = SENT_COLOR[sent] || SENT_COLOR.neutral
  return (
    <div style={{
      padding: '8px 10px',
      borderBottom: '1px solid rgba(138,180,248,0.07)',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
          background: `${color}20`, color, border: `1px solid ${color}40`,
          flexShrink: 0, marginTop: 1,
        }}>
          {sent === 'positive' ? '正面' : sent === 'negative' ? '负面' : '中性'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {item.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {item.source} {item.time ? `· ${item.time.slice(0, 10)}` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StockDetailPage({ symbol, name, lang, onClose, onLoadMain }) {
  const [quote,   setQuote]   = useState(null)
  const [similar, setSimilar] = useState(null)
  const [news,    setNews]    = useState(null)
  const [analysis,setAnalysis]= useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)

    Promise.allSettled([
      fetch(`/api/stocks/${symbol}/realtime`).then((r) => r.json()),
      fetch(`/api/similar/${symbol}`).then((r) => r.json()),
      fetch(`/api/news/${symbol}`).then((r) => r.json()),
    ]).then(([quoteRes, simRes, newsRes]) => {
      if (quoteRes.status === 'fulfilled') setQuote(quoteRes.value)
      if (simRes.status === 'fulfilled')   setSimilar(simRes.value)
      if (newsRes.status === 'fulfilled')  setNews(newsRes.value)
    }).finally(() => setLoading(false))

    // Analysis is slow — load separately
    fetch(`/api/stocks/${symbol}/analyze`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setAnalysis(d))
      .catch(() => {})
  }, [symbol])

  const q = quote
  const price  = q?.price ?? q?.close ?? null
  const change = q?.change_pct ?? q?.pct_chg ?? null
  const up     = change >= 0

  const simResults = similar?.results ?? similar?.data?.results ?? []
  const newsItems  = (news?.news ?? news?.data?.news ?? []).slice(0, 3)

  const pe  = q?.pe_ttm  ?? q?.pe  ?? null
  const pb  = q?.pb      ?? null
  const cap = q?.total_mv ?? q?.market_cap ?? null
  const high52 = q?.high52w ?? null
  const low52  = q?.low52w  ?? null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0d1117', border: `1px solid ${BDR}`,
        borderRadius: 16, width: '100%', maxWidth: 880,
        maxHeight: '90vh', overflowY: 'auto',
        position: 'relative',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(232,234,240,0.4)', fontSize: 20, zIndex: 1,
          }}
        >✕</button>

        <div style={{ padding: '24px 28px' }}>

          {/* ── 1. Header ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  background: 'rgba(138,180,248,0.1)', border: '1px solid rgba(138,180,248,0.3)',
                  borderRadius: 4, padding: '2px 9px', fontSize: 13, color: '#8ab4f8', fontFamily: 'monospace',
                }}>
                  {symbol}
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {name || q?.name || symbol}
                </span>
                {q?.industry && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 7px' }}>
                    {q.industry}
                  </span>
                )}
              </div>
              {price !== null && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: up ? UP : DOWN, fontFamily: 'monospace' }}>
                    {Number(price).toFixed(2)}
                  </span>
                  {change !== null && (
                    <span style={{ fontSize: 15, color: up ? UP : DOWN, fontWeight: 600 }}>
                      {up ? '+' : ''}{Number(change).toFixed(2)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── 2. Quick metrics ── */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <MetricCard label={lang === 'zh' ? '市盈率(PE)' : 'P/E Ratio'}
              value={pe !== null ? Number(pe).toFixed(1) : '--'} />
            <MetricCard label={lang === 'zh' ? '市净率(PB)' : 'P/B Ratio'}
              value={pb !== null ? Number(pb).toFixed(2) : '--'} />
            <MetricCard label={lang === 'zh' ? '市值(亿)' : 'Mkt Cap (亿)'}
              value={cap !== null ? (Number(cap) / 1e4).toFixed(0) : '--'} />
            <MetricCard label={lang === 'zh' ? '52周高' : '52W High'}
              value={high52 !== null ? Number(high52).toFixed(2) : '--'} />
            <MetricCard label={lang === 'zh' ? '52周低' : '52W Low'}
              value={low52 !== null ? Number(low52).toFixed(2) : '--'} />
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              {lang === 'zh' ? '加载数据中...' : 'Loading...'}
            </div>
          )}

          {/* ── 3 + 4. Two-column layout ── */}
          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Left: similar stocks */}
              <div style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BDR}`,
                  fontSize: 13, fontWeight: 600, color: '#c084fc' }}>
                  {lang === 'zh' ? '相似走势 TOP5' : 'Similar Stocks TOP5'}
                </div>
                {simResults.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                    {lang === 'zh' ? '暂无数据' : 'No data'}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', padding: '5px 10px', fontSize: 10, color: 'var(--text-muted)',
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                      borderBottom: '1px solid rgba(138,180,248,0.07)' }}>
                      <span style={{ minWidth: 56 }}>CODE</span>
                      <span style={{ flex: 1 }}>NAME</span>
                      <span>CORR</span>
                    </div>
                    {simResults.slice(0, 5).map((item, i) => (
                      <MiniSimilarRow key={i} item={item} onStockClick={(code, n) => {
                        onClose()
                        setTimeout(() => onLoadMain(code, n), 50)
                      }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: latest news */}
              <div style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BDR}`,
                  fontSize: 13, fontWeight: 600, color: '#ffa726' }}>
                  {lang === 'zh' ? '新闻舆情（最新3条）' : 'Latest News (Top 3)'}
                </div>
                {newsItems.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                    {lang === 'zh' ? '暂无新闻' : 'No news'}
                  </div>
                ) : (
                  <div>
                    {newsItems.map((item, i) => <MiniNewsRow key={i} item={item} />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 5. AI Analysis summary ── */}
          {analysis && (
            <div style={{
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 10, padding: '14px 18px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#818cf8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {lang === 'zh' ? 'AI 智能分析摘要' : 'AI Analysis Summary'}
              </div>
              <div style={{ fontSize: 13, color: '#c7d2fe', lineHeight: 1.6 }}>
                {analysis.summary ?? analysis.insight ?? analysis.analysis ?? (lang === 'zh' ? '分析中...' : 'Analyzing...')}
              </div>
            </div>
          )}

          {/* ── 6. Bottom button ── */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => {
                onClose()
                setTimeout(() => onLoadMain(symbol, name), 50)
              }}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 36px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}
            >
              {lang === 'zh' ? '查看完整分析 →' : 'Full Analysis →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
