import { useState, useEffect, useCallback, useRef } from 'react'
import { getBankViews } from '../api/stockApi'

// ── Bank brand colours ────────────────────────────────────────────────────────
const BANK_COLORS = {
  'Goldman Sachs':   '#1565c0',
  'JPMorgan':        '#0d47a1',
  'Morgan Stanley':  '#1a237e',
  'Bank of America': '#b71c1c',
  'Citi':            '#1b5e20',
  'UBS':             '#880e4f',
  'Barclays':        '#01579b',
  'Deutsche Bank':   '#311b92',
  'HSBC':            '#b71c1c',
  'Nomura':          '#4a148c',
  'BlackRock':       '#37474f',
  'Wells Fargo':     '#bf360c',
}

function bankColor(name) {
  return BANK_COLORS[name] || '#1e3a5f'
}

// ── Action type config ────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  rating:   { label: '评级变动', labelEn: 'Rating Change', color: '#0ea5e9' },
  target:   { label: '目标价',   labelEn: 'Price Target',  color: '#f59e0b' },
  macro:    { label: '宏观展望', labelEn: 'Macro',         color: '#a78bfa' },
  strategy: { label: '策略观点', labelEn: 'Strategy',      color: '#34d399' },
  outlook:  { label: '市场观点', labelEn: 'Market Outlook', color: '#fb923c' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(iso, zh) {
  if (!iso) return ''
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (zh) {
      if (diff < 60)    return '刚刚'
      if (diff < 3600)  return `${Math.floor(diff / 60)}分钟前`
      if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
      return `${Math.floor(diff / 86400)}天前`
    } else {
      if (diff < 60)    return 'just now'
      if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      return `${Math.floor(diff / 86400)}d ago`
    }
  } catch { return '' }
}

function BankTag({ name }) {
  const color = bankColor(name)
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 700,
      background: color + '28', color: color,
      border: `1px solid ${color}44`,
      flexShrink: 0,
    }}>
      {name}
    </span>
  )
}

function ActionBadge({ type, zh }) {
  const cfg = ACTION_CONFIG[type] || ACTION_CONFIG.outlook
  return (
    <span style={{
      fontSize: 10, padding: '1px 6px', borderRadius: 5, fontWeight: 500,
      background: cfg.color + '22', color: cfg.color, flexShrink: 0,
    }}>
      {zh ? cfg.label : cfg.labelEn}
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

function NewsCard({ item, zh }) {
  const isLink = item.url && item.url.startsWith('http')
  return (
    <a
      href={isLink ? item.url : undefined}
      target={isLink ? '_blank' : undefined}
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 8,
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
        {/* Bank tags + action badge row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          {(item.banks || []).map(b => <BankTag key={b} name={b} />)}
          <ActionBadge type={item.action_type} zh={zh} />
        </div>

        {/* AI summary */}
        {item.ai_summary && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            background: 'rgba(14,165,233,0.07)',
            border: '1px solid rgba(14,165,233,0.15)',
            borderRadius: 8, padding: '5px 10px', marginBottom: 8,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#0ea5e9',
              background: 'rgba(14,165,233,0.15)',
              padding: '1px 5px', borderRadius: 4, flexShrink: 0, marginTop: 1,
            }}>AI速读</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
              {item.ai_summary}
            </span>
          </div>
        )}

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
            marginBottom: 8,
          }}>
            {item.summary}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {zh ? '来源：' : 'Source: '}{item.source}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {relativeTime(item.published_at, zh)}
          </span>
        </div>
      </div>
    </a>
  )
}

function SkeletonCard() {
  return (
    <div style={{
      height: 110, borderRadius: 12, marginBottom: 8,
      background: 'rgba(255,255,255,0.04)',
      animation: 'bvPulse 1.5s ease-in-out infinite',
    }} />
  )
}

const PAGE_SIZE = 20
const REFRESH_MS = 20 * 60 * 1000

export default function BankViewsPage({ lang = 'zh' }) {
  const zh = lang === 'zh'
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [allBanks,  setAllBanks]  = useState([])
  const [bankFilter, setBankFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const timerRef = useRef(null)

  const fetchData = useCallback((bf = bankFilter, af = actionFilter) => {
    setLoading(true)
    const params = {}
    if (bf !== 'all') params.bank = bf
    getBankViews(params)
      .then(res => {
        const data = res.data
        setItems(data.items || [])
        setUpdatedAt(data.updated_at)
        setAllBanks(data.banks || [])
        setPage(1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  useEffect(() => {
    fetchData('all', 'all')
    timerRef.current = setInterval(() => fetchData(bankFilter, actionFilter), REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, []) // eslint-disable-line

  const selectBank = (b) => {
    setBankFilter(b)
    fetchData(b, actionFilter)
  }

  const selectAction = (a) => {
    setActionFilter(a)
    setPage(1)
  }

  // Action filter is client-side (no extra API call needed)
  const visibleItems = actionFilter === 'all'
    ? items
    : items.filter(i => i.action_type === actionFilter)

  const displayed = visibleItems.slice(0, page * PAGE_SIZE)
  const hasMore   = displayed.length < visibleItems.length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: 24, paddingBottom: 48 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            {zh ? '大行观点' : 'Bank Views'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {zh
              ? '聚合公开财经媒体对投行市场观点的转述报道（来源：Reuters、CNBC 等）'
              : 'Public news reporting on investment bank views — Reuters, CNBC and more'}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
            {zh
              ? '仅收录公开新闻转述，不涉及付费研报原文'
              : 'Public news summaries only — no proprietary research content'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {updatedAt && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {zh ? '更新于' : 'Updated'} {relativeTime(updatedAt, zh)}
            </span>
          )}
          <button
            onClick={() => fetchData(bankFilter, actionFilter)}
            disabled={loading}
            style={{
              padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(14,165,233,0.4)',
              background: loading ? 'rgba(14,165,233,0.05)' : 'rgba(14,165,233,0.1)',
              color: '#0ea5e9', fontSize: 12, fontWeight: 600,
              cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s',
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {/* Bank filter pills */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Pill active={bankFilter === 'all'} color="#0ea5e9" onClick={() => selectBank('all')}>
            {zh ? '全部' : 'All'}
          </Pill>
          {allBanks.map(b => (
            <Pill key={b} active={bankFilter === b} color={bankColor(b)} onClick={() => selectBank(b)}>
              {b}
            </Pill>
          ))}
        </div>

        {/* Item count */}
        {visibleItems.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {visibleItems.length} {zh ? '条' : 'articles'}
          </span>
        )}
      </div>

      {/* Action type filter */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
        <Pill active={actionFilter === 'all'} color="#6b7280" onClick={() => selectAction('all')}>
          {zh ? '全部类型' : 'All Types'}
        </Pill>
        {Object.entries(ACTION_CONFIG).map(([k, cfg]) => (
          <Pill key={k} active={actionFilter === k} color={cfg.color} onClick={() => selectAction(k)}>
            {zh ? cfg.label : cfg.labelEn}
          </Pill>
        ))}
      </div>

      {/* News list */}
      {loading && items.length === 0 ? (
        <div>{[0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}</div>
      ) : visibleItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          {zh
            ? '暂无相关大行观点报道，请稍后刷新'
            : 'No bank view articles found — try refreshing later'}
        </div>
      ) : (
        <>
          {displayed.map((item, i) => (
            <NewsCard key={`${item.source}-${i}`} item={item} zh={zh} />
          ))}
          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              style={{
                display: 'block', width: '100%', padding: '12px 0',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, color: 'var(--text-secondary)', fontSize: 13,
                cursor: 'pointer', marginTop: 4, transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              {zh
                ? `加载更多（还有 ${visibleItems.length - displayed.length} 条）`
                : `Load more (${visibleItems.length - displayed.length} more)`}
            </button>
          )}
        </>
      )}

      <style>{`
        @keyframes bvPulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
