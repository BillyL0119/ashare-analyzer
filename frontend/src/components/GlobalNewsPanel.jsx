import { useState, useEffect, useCallback, useRef } from 'react'
import { getGlobalNews } from '../api/stockApi'

const LANG = 'zh'   // will use prop

const SOURCE_COLORS = {
  'Reuters Business': '#ff8c00',
  'Yahoo Finance':    '#6001d2',
  'MarketWatch':      '#00a651',
  'CNBC':             '#cc0000',
  '新浪财经':          '#e8321e',
}

function sourceColor(name) {
  return SOURCE_COLORS[name] || '#4a90d9'
}

function SourceBadge({ name }) {
  const color = sourceColor(name)
  const letter = [...name].find(c => /[\w\u4e00-\u9fa5]/.test(c)) || '?'
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 0,
    }}>
      {letter.toUpperCase()}
    </div>
  )
}

function relativeTime(iso, lang) {
  if (!iso) return ''
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 60)   return lang === 'zh' ? '刚刚' : 'just now'
    if (diff < 3600) return lang === 'zh' ? `${Math.floor(diff / 60)}分钟前` : `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return lang === 'zh' ? `${Math.floor(diff / 3600)}小时前` : `${Math.floor(diff / 3600)}h ago`
    return lang === 'zh' ? `${Math.floor(diff / 86400)}天前` : `${Math.floor(diff / 86400)}d ago`
  } catch {
    return ''
  }
}

const CAT_LABELS = {
  all:     { zh: '全部', en: 'All' },
  market:  { zh: '市场', en: 'Market' },
  economy: { zh: '宏观', en: 'Economy' },
  company: { zh: '公司', en: 'Company' },
  crypto:  { zh: '加密', en: 'Crypto' },
}

const LANG_LABELS = {
  all: { zh: '全部', en: 'All' },
  cn:  { zh: '中文', en: '中文' },
  en:  { zh: 'English', en: 'English' },
}

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
        background: active ? 'rgba(14,165,233,0.18)' : 'rgba(255,255,255,0.04)',
        color: active ? '#0ea5e9' : 'var(--text-secondary)',
        transition: 'all 0.18s',
      }}
    >
      {children}
    </button>
  )
}

function NewsCard({ item, lang }) {
  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        marginBottom: 8,
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(14,165,233,0.4)'
          e.currentTarget.style.background = 'rgba(14,165,233,0.05)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <SourceBadge name={item.source} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.source}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{relativeTime(item.published_at, lang)}</span>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 8,
                background: item.lang === 'cn' ? 'rgba(232,50,30,0.12)' : 'rgba(14,100,233,0.12)',
                color: item.lang === 'cn' ? '#e8321e' : '#5b9cf6',
                fontWeight: 500,
              }}>
                {item.lang === 'cn' ? '🇨🇳' : '🇺🇸'}
              </span>
            </div>
            <div style={{
              fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
              lineHeight: 1.45, marginBottom: item.summary ? 5 : 0,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.title}
            </div>
            {item.summary && (
              <div style={{
                fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4,
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

const PAGE_SIZE = 20

export default function GlobalNewsPanel({ lang = 'zh' }) {
  const zh = lang === 'zh'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [sources, setSources] = useState([])
  const [filters, setFilters] = useState({ lang: 'all', category: 'all', source: 'all' })
  const [page, setPage] = useState(1)
  const timerRef = useRef(null)

  const fetchNews = useCallback((f = filters) => {
    setLoading(true)
    getGlobalNews({ lang: f.lang !== 'all' ? f.lang : undefined, category: f.category !== 'all' ? f.category : undefined })
      .then(res => {
        const data = res.data
        let list = data.items || []
        if (f.source && f.source !== 'all') {
          list = list.filter(i => i.source === f.source)
        }
        setItems(list)
        setUpdatedAt(data.updated_at)
        setSources(data.sources || [])
        setPage(1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])  // eslint-disable-line

  useEffect(() => {
    fetchNews(filters)
    timerRef.current = setInterval(() => fetchNews(filters), 30 * 60 * 1000)
    return () => clearInterval(timerRef.current)
  }, []) // eslint-disable-line

  const applyFilter = (next) => {
    setFilters(next)
    fetchNews(next)
  }

  const displayed = items.slice(0, page * PAGE_SIZE)
  const hasMore = displayed.length < items.length

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {zh ? '全球财经新闻' : 'Global Financial News'}
          {items.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
              {items.length} {zh ? '条' : 'articles'}
            </span>
          )}
        </div>
        {updatedAt && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {zh ? '更新于' : 'Updated'} {relativeTime(updatedAt, lang)}
            <button
              onClick={() => fetchNews(filters)}
              style={{
                marginLeft: 8, fontSize: 11, background: 'none', border: 'none',
                color: '#0ea5e9', cursor: 'pointer', padding: 0,
              }}
            >
              {zh ? '刷新' : 'Refresh'}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {/* Lang */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Object.entries(LANG_LABELS).map(([k, v]) => (
            <Pill key={k} active={filters.lang === k} onClick={() => applyFilter({ ...filters, lang: k })}>
              {v[zh ? 'zh' : 'en']}
            </Pill>
          ))}
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
        {/* Category */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Object.entries(CAT_LABELS).map(([k, v]) => (
            <Pill key={k} active={filters.category === k} onClick={() => applyFilter({ ...filters, category: k })}>
              {v[zh ? 'zh' : 'en']}
            </Pill>
          ))}
        </div>
        {sources.length > 0 && (
          <>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
            {/* Source */}
            <select
              value={filters.source}
              onChange={e => applyFilter({ ...filters, source: e.target.value })}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, padding: '3px 10px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              <option value="all">{zh ? '全部来源' : 'All Sources'}</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}
      </div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 80, borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          {zh ? '暂无新闻数据，请稍后再试' : 'No news available, please try again later'}
        </div>
      ) : (
        <>
          {displayed.map((item, i) => (
            <NewsCard key={`${item.source}-${i}`} item={item} lang={lang} />
          ))}
          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              style={{
                display: 'block', width: '100%', padding: '10px 0',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                marginTop: 4,
              }}
            >
              {zh ? `加载更多 (${items.length - displayed.length} 条)` : `Load more (${items.length - displayed.length})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
