import { useState, useEffect, useCallback, useRef } from 'react'
import AiGist from './AiGist'
import { AI_NOTE } from '../utils/aiGist'
import { getDailyMarketNews } from '../api/stockApi'
import { T } from '../i18n/translations'
import { sourceName } from '../utils/newsSources'
import { relativeTime } from '../utils/time'

const SOURCE_COLORS = {
  '财联社':          '#e8a020',
  '新浪财经':        '#e8321e',
  '新浪财经要闻':    '#e8321e',
  '新浪A股':         '#e8321e',
  'BBC Business':    '#bb1919',
  'Guardian Business':'var(--accent)',
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
      width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
      background: color + '22', color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 600,
    }}>
      {letter.toUpperCase()}
      <style>{`
        .bfs-news-row { transition: background 0.15s; }
        .bfs-news-row:hover { background: var(--bg-hover); }
        .bfs-news-row:hover .bfs-news-title { color: var(--accent); }
        .bfs-news-row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
        .bfs-news-arrow { font-size: 13px; color: var(--text-muted); opacity: 0; transition: opacity 0.15s; margin-top: 2px; }
        .bfs-news-row:hover .bfs-news-arrow { opacity: 1; }
      `}</style>
    </div>
  )
}

const CAT_CONFIG = {
  all:      { zh: '全部',   en: 'All',       ja: '全て',    ko: '전체',    fr: 'Tous',      color: 'var(--accent)' },
  market:   { zh: '市场行情', en: 'Market',   ja: '市況',    ko: '시황',    fr: 'Marché',    color: 'var(--accent)' },
  macro:    { zh: '宏观政策', en: 'Macro',    ja: 'マクロ',  ko: '거시',    fr: 'Macro',     color: '#7c9cb4' },
  company:  { zh: '公司动态', en: 'Company',  ja: '企業',    ko: '기업',    fr: 'Entreprise', color: '#34d399' },
  industry: { zh: '行业资讯', en: 'Industry', ja: '業界',    ko: '산업',    fr: 'Industrie', color: '#fb923c' },
  breaking: { zh: '突发事件', en: 'Breaking', ja: '速報',    ko: '속보',    fr: 'Flash',     color: '#f87171' },
}

function getCatLabel(cfg, lang) {
  return cfg[lang] || cfg.en
}

const LANG_OPTS = [
  { key: 'all', zh: '全部', en: 'All',     ja: '全て',  ko: '전체',  fr: 'Tous' },
  { key: 'cn',  zh: '中文', en: 'Chinese', ja: '中国語', ko: '중국어', fr: 'Chinois' },
  { key: 'en',  zh: '英文', en: 'English', ja: '英語',   ko: '영어',   fr: 'Anglais' },
]

function CategoryDot({ category, lang }) {
  const cfg = CAT_CONFIG[category] || CAT_CONFIG.market
  return (
    <span style={{
      fontSize: 13, padding: '1px 7px', borderRadius: 8, fontWeight: 500,
      background: cfg.color + '22', color: cfg.color, flexShrink: 0,
    }}>
      {getCatLabel(cfg, lang)}
    </span>
  )
}

function Pill({ active, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
        background: active ? (color + '28') : 'var(--bg-tertiary)',
        color: active ? color : 'var(--text-secondary)',
        outline: active ? `1px solid ${color}44` : 'none',
        transition: 'all 0.18s',
      }}
    >
      {children}
    </button>
  )
}

function NewsRow({ item, lang, first }) {
  const isLink = item.url && item.url.startsWith('http')
  return (
    <a
      href={isLink ? item.url : undefined}
      target={isLink ? '_blank' : undefined}
      rel="noopener noreferrer"
      className={isLink ? 'bfs-news-row' : undefined}
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        padding: '13px 16px', textDecoration: 'none',
        borderTop: first ? 'none' : '1px solid var(--border-primary)',
        cursor: isLink ? 'pointer' : 'default',
      }}
    >
      <SourceBadge name={item.source} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="bfs-news-title" style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5,
        }}>
          {item.title}
        </div>
        <AiGist text={item.ai_summary} lang={lang} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{sourceName(item.source, lang)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>·</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {relativeTime(item.published_at, lang)}
          </span>
          <CategoryDot category={item.category} lang={lang} />
        </div>
      </div>
      {isLink && <span className="bfs-news-arrow" aria-hidden="true">↗</span>}
    </a>
  )
}

function SkeletonCard() {
  return (
    <div className="skeleton" style={{ height: 64, borderRadius: 'var(--radius)', marginBottom: 8 }} />
  )
}

const DISCLAIMER = {
  zh: '仅供学习，不构成投资建议。数据来源可能存在延迟。',
  en: 'For learning only, not investment advice. Feeds may be delayed.',
  ja: '学習用です。投資助言ではありません。配信に遅れが生じる場合があります。',
  ko: '학습용이며 투자 조언이 아닙니다. 피드가 지연될 수 있습니다.',
  fr: "À but pédagogique uniquement, pas un conseil en investissement. Les flux peuvent être retardés.",
}

const PAGE_SIZE = 20
const REFRESH_MS = 20 * 60 * 1000  // 20 min

export default function DailyNewsPage({ lang = 'zh' }) {
  const t = T[lang] || T.en
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [catFilter, setCatFilter] = useState('all')
  // Non-Chinese readers start on the English feed; they can still switch to All / 中文.
  const [langFilter, setLangFilter] = useState(lang === 'zh' ? 'all' : 'en')
  const [page,      setPage]      = useState(1)
  const timerRef = useRef(null)
  const filtersRef = useRef({ cat: 'all', lang: langFilter })

  const uiRef = useRef(lang)
  useEffect(() => { uiRef.current = lang }, [lang])   // before the effect that refetches on a new language
  const pollRef = useRef({ timer: null, left: 0 })
  const fetchRef = useRef(null)

  // silent: a follow-up that only fills in AI 速读 still being written (keeps page and spinner)
  const fetchNews = useCallback((cf = catFilter, lf = langFilter, silent = false) => {
    filtersRef.current = { cat: cf, lang: lf }
    if (!silent) { setLoading(true); pollRef.current.left = 4 }
    clearTimeout(pollRef.current.timer)
    getDailyMarketNews({
      lang:     lf !== 'all' ? lf : undefined,
      category: cf !== 'all' ? cf : undefined,
      ui:       uiRef.current,
    })
      .then(res => {
        const data = res.data
        setItems(data.items || [])
        setUpdatedAt(data.updated_at)
        if (!silent) setPage(1)
        if (data.ai_pending > 0 && pollRef.current.left-- > 0) {
          pollRef.current.timer = setTimeout(() => fetchRef.current(cf, lf, true), 15000)
        }
      })
      .catch(() => {})
      .finally(() => { if (!silent) setLoading(false) })
  }, [])  // eslint-disable-line
  useEffect(() => { fetchRef.current = fetchNews }, [fetchNews])

  useEffect(() => {
    fetchNews('all', langFilter)
    timerRef.current = setInterval(() => fetchNews(filtersRef.current.cat, filtersRef.current.lang), REFRESH_MS)
    const poll = pollRef.current
    return () => { clearInterval(timerRef.current); clearTimeout(poll.timer) }
  }, [])  // eslint-disable-line

  // A new site language needs AI 速读 in that language
  const firstLang = useRef(true)
  useEffect(() => {
    if (firstLang.current) { firstLang.current = false; return }
    fetchNews(filtersRef.current.cat, filtersRef.current.lang)
  }, [lang])  // eslint-disable-line

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
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingTop: 24, paddingBottom: 48 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            {t.dnTitle}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {t.dnSubtitle}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {DISCLAIMER[lang] || DISCLAIMER.en} {AI_NOTE[lang] || AI_NOTE.en}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {updatedAt && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t.dnUpdated} {relativeTime(updatedAt, lang)}
            </span>
          )}
          <button
            onClick={() => fetchNews(catFilter, langFilter)}
            disabled={loading}
            style={{
              padding: '6px 16px', borderRadius: 'var(--radius)', border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
              background: loading ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'color-mix(in srgb, var(--accent) 10%, transparent)',
              color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? t.dnRefreshing : t.dnRefresh}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: 1, marginBottom: 18,
        background: 'color-mix(in srgb, var(--accent) 40%, transparent)',
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
              {getCatLabel(cfg, lang)}
            </Pill>
          ))}
        </div>

        {/* Separator */}
        <div className="dn-sep" style={{ width: 1, height: 20, background: 'var(--border-primary)', margin: '0 4px', flexShrink: 0 }} />

        {/* Language pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {LANG_OPTS.map((opt) => (
            <Pill
              key={opt.key}
              active={langFilter === opt.key}
              color="var(--accent)"
              onClick={() => setLang(opt.key)}
            >
              {opt[lang] || opt.en}
            </Pill>
          ))}
        </div>

        {/* Item count */}
        {items.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
            {t.dnCount(items.length)}
          </span>
        )}
      </div>

      {/* News list */}
      {loading && items.length === 0 ? (
        <div>{[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}</div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          color: 'var(--text-muted)', fontSize: 14,
        }}>
          {t.dnEmpty}
        </div>
      ) : (
        <>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 8,
          }}>
            {displayed.map((item, i) => (
              <NewsRow key={`${item.source}-${i}`} item={item} lang={lang} first={i === 0} />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              style={{
                display: 'block', width: '100%', padding: '12px 0',
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 13,
                cursor: 'pointer', marginTop: 4,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            >
              {t.dnLoadMore(items.length - displayed.length)}
            </button>
          )}
        </>
      )}

      <style>{`
        .bfs-news-row { transition: background 0.15s; }
        .bfs-news-row:hover { background: var(--bg-hover); }
        .bfs-news-row:hover .bfs-news-title { color: var(--accent); }
        .bfs-news-row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
        .bfs-news-arrow { font-size: 13px; color: var(--text-muted); opacity: 0; transition: opacity 0.15s; margin-top: 2px; }
        .bfs-news-row:hover .bfs-news-arrow { opacity: 1; }
      `}</style>
    </div>
  )
}
