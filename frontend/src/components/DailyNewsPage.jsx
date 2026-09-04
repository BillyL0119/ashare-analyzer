import { useState, useEffect, useCallback, useRef } from 'react'
import { getDailyMarketNews } from '../api/stockApi'

const SOURCE_COLORS = {
  '财联社':          '#e8a020',
  '新浪财经':        '#e8321e',
  '新浪财经要闻':    '#e8321e',
  'Reuters Business':'#ff8c00',
  'Yahoo Finance':   '#6001d2',
  'MarketWatch':     '#00a651',
  'CNBC':            '#cc0000',
}

function sourceColor(name) {
  return SOURCE_COLORS[name] || '#4a90d9'
}

function SourceBadge({ name }) {
  const color = sourceColor(name)
  const letter = [...name].find(c => /[\w\u4e00-\u9fa5]/.test(c)) || '?'
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color: '#fff',
    }}>
      {letter.toUpperCase()}
    </div>
  )
}

function relativeTime(iso) {
  if (!iso) return ''
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 60)    return '刚刚'
    if (diff < 3600)  return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    return `${Math.floor(diff / 86400)}天前`
  } catch { return '' }
}

const CAT_CONFIG = {
  all:      { label: '全部',   labelEn: 'All',       color: '#0ea5e9' },
  market:   { label: '市场行情', labelEn: 'Market',   color: '#38bdf8' },
  macro:    { label: '宏观政策', labelEn: 'Macro',    color: '#a78bfa' },
  company:  { label: '公司动态', labelEn: 'Company',  color: '#34d399' },
  industry: { label: '行业资讯', labelEn: 'Industry', color: '#fb923c' },
  breaking: { label: '突发事件', labelEn: 'Breaking', color: '#f87171' },
}

const LANG_OPTS = [
  { key: 'all', label: '全部', labelEn: 'All' },
  { key: 'cn',  label: '中文', labelEn: '中文' },
  { key: 'en',  label: 'English', labelEn: 'English' },
]

function CategoryDot({ category }) {
  const cfg = CAT_CONFIG[category] || CAT_CONFIG.market
  return (
    <span style={{
      fontSize: 10, padding: '1px 7px', borderRadius: 8, fontWeight: 500,
      background: cfg.color + '22', color: cfg.color, flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

function Pill({ active, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
        background: active ? (color + '28') : 'rgba(255,255,255,0.04)',
        color: active ? color : 'var(--text-secondary)',
        outline: active ? `1px solid ${color}44` : 'none',
        transition: 'all 0.18s',
      }}
    >
      {children}
    </button>
  )
}

function NewsCard({ item }) {
  const href = item.url || '#'
  const isLink = item.url && item.url.startsWith('http')
  return (
    <a
      href={isLink ? href : undefined}
      target={isLink ? '_blank' : undefined}
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block', cursor: isLink ? 'pointer' : 'default' }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 8,
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onMouseEnter={e => {
          if (!isLink) return
          e.currentTarget.style.borderColor = 'rgba(14,165,233,0.35)'
          e.currentTarget.style.background = 'rgba(14,165,233,0.04)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <SourceBadge name={item.source} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{item.source}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{relativeTime(item.published_at)}</span>
              <span style={{
                fontSize: 10, padding: '1px 5px', borderRadius: 6,
                background: item.lang === 'cn' ? 'rgba(232,50,30,0.1)' : 'rgba(14,100,233,0.1)',
                color: item.lang === 'cn' ? '#e8321e' : '#5b9cf6', fontWeight: 500,
              }}>
                {item.lang === 'cn' ? '🇨🇳' : '🇺🇸'}
              </span>
              <CategoryDot category={item.category} />
            </div>
            {/* Title */}
            <div style={{
              fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
              lineHeight: 1.5, marginBottom: item.summary ? 6 : 0,
            }}>
              {item.title}
            </div>
            {/* Summary */}
            {item.summary && (
              <div style={{
                fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {item.summary}
              </div>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}

function SkeletonCard() {
  return (
    <div style={{
      height: 90, borderRadius: 12, marginBottom: 8,
      background: 'rgba(255,255,255,0.04)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

const PAGE_SIZE = 20
const REFRESH_MS = 20 * 60 * 1000  // 20 min

export default function DailyNewsPage({ lang = 'zh' }) {
  const zh = lang === 'zh'
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [sources,   setSources]   = useState([])
  const [catFilter, setCatFilter] = useState('all')
  const [langFilter, setLangFilter] = useState('all')
  const [page,      setPage]      = useState(1)
  const timerRef = useRef(null)

  const fetchNews = useCallback((cf = catFilter, lf = langFilter) => {
    setLoading(true)
    getDailyMarketNews({
      lang:     lf !== 'all' ? lf : undefined,
      category: cf !== 'all' ? cf : undefined,
    })
      .then(res => {
        const data = res.data
        setItems(data.items || [])
        setUpdatedAt(data.updated_at)
        setSources(data.sources || [])
        setPage(1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])  // eslint-disable-line

  useEffect(() => {
    fetchNews('all', 'all')
    timerRef.current = setInterval(() => fetchNews(catFilter, langFilter), REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [])  // eslint-disable-line

  const setCategory = (cat) => {
    setCatFilter(cat)
    fetchNews(cat, langFilter)
  }

  const setLang = (l) => {
    setLangFilter(l)
    fetchNews(catFilter, l)
  }

  const displayed = items.slice(0, page * PAGE_SIZE)
  const hasMore   = displayed.length < items.length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: 24, paddingBottom: 48 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            {zh ? '每日大事件' : 'Daily Market News'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {zh
              ? '影响大盘与市场的重大新闻，每20分钟自动刷新'
              : 'Major news affecting the market, auto-refreshes every 20 min'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {updatedAt && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {zh ? '更新于' : 'Updated'} {relativeTime(updatedAt)}
            </span>
          )}
          <button
            onClick={() => fetchNews(catFilter, langFilter)}
            disabled={loading}
            style={{
              padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(14,165,233,0.4)',
              background: loading ? 'rgba(14,165,233,0.05)' : 'rgba(14,165,233,0.1)',
              color: '#0ea5e9', fontSize: 12, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (zh ? '加载中…' : 'Loading…') : (zh ? '刷新' : 'Refresh')}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: 1, marginBottom: 18,
        background: 'linear-gradient(90deg, rgba(14,165,233,0.4) 0%, rgba(139,92,246,0.3) 50%, transparent 100%)',
      }} />

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {/* Category pills */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Object.entries(CAT_CONFIG).map(([k, cfg]) => (
            <Pill
              key={k}
              active={catFilter === k}
              color={cfg.color}
              onClick={() => setCategory(k)}
            >
              {zh ? cfg.label : cfg.labelEn}
            </Pill>
          ))}
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px', flexShrink: 0 }} />

        {/* Language pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {LANG_OPTS.map(({ key, label, labelEn }) => (
            <Pill
              key={key}
              active={langFilter === key}
              color="#0ea5e9"
              onClick={() => setLang(key)}
            >
              {zh ? label : labelEn}
            </Pill>
          ))}
        </div>

        {/* Item count */}
        {items.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {items.length} {zh ? '条新闻' : 'articles'}
          </span>
        )}
      </div>

      {/* Stats strip */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(CAT_CONFIG).filter(([k]) => k !== 'all').map(([k, cfg]) => {
            const count = items.filter(i => i.category === k).length
            if (count === 0) return null
            return (
              <div
                key={k}
                onClick={() => setCategory(k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${cfg.color}33`,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = cfg.color + '11'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{zh ? cfg.label : cfg.labelEn}</span>
                <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* News list */}
      {loading && items.length === 0 ? (
        <div>{[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}</div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          color: 'var(--text-muted)', fontSize: 14,
        }}>
          {zh ? '暂无新闻数据，请稍后刷新' : 'No news available, try refreshing later'}
        </div>
      ) : (
        <>
          {displayed.map((item, i) => (
            <NewsCard key={`${item.source}-${i}`} item={item} />
          ))}
          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              style={{
                display: 'block', width: '100%', padding: '12px 0',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, color: 'var(--text-secondary)', fontSize: 13,
                cursor: 'pointer', marginTop: 4,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              {zh
                ? `加载更多（还有 ${items.length - displayed.length} 条）`
                : `Load more (${items.length - displayed.length} more)`}
            </button>
          )}
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
