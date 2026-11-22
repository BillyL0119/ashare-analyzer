import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from './components/Icon'
import SearchBar from './components/SearchBar'
import ComparePanel from './components/ComparePanel'
import WelcomeModal from './components/WelcomeModal'
import Watchlist from './components/Watchlist'
import KnowledgeCard from './components/KnowledgeCard'
import GlobalSentiment from './components/GlobalSentiment'
import USMarketPanel from './components/USMarketPanel'
const IntlMarketPanel = lazy(() => import('./components/IntlMarketPanel'))
import AuthModal from './components/AuthModal'
import ErrorBoundary from './components/ErrorBoundary'
import useAuthStore from './store/authStore'

const PaperTradingPanel  = lazy(() => import('./components/PaperTradingPanel'))
const StatsDisplay       = lazy(() => import('./components/StatsDisplay'))   // site stats dialog, draws charts
const TimeMachinePage    = lazy(() => import('./components/timemachine/TimeMachinePage'))
const CasesPage          = lazy(() => import('./components/cases/CasesPage'))
const DiagramLab         = lazy(() => import('./components/diagrams/DiagramLab'))
const GovernorPage       = lazy(() => import('./components/governor/GovernorPage'))
const ClassPage          = lazy(() => import('./components/classes/ClassPage'))
const StudyCenter        = lazy(() => import('./components/StudyCenter'))
const AITeacherFloat     = lazy(() => import('./components/AITeacherFloat'))
const UniversitiesPage   = lazy(() => import('./components/UniversitiesPage'))
const DailyNewsPage      = lazy(() => import('./components/DailyNewsPage'))
const BankViewsPage      = lazy(() => import('./components/BankViewsPage'))
const CareerGuidePage    = lazy(() => import('./components/CareerGuidePage'))
const ScreenerPage       = lazy(() => import('./components/ScreenerPage'))
const AdminPage          = lazy(() => import('./components/AdminPage'))
const HeatmapPage        = lazy(() => import('./components/HeatmapPage'))
const FactorLab = lazy(() => import('./components/factors/FactorLab'))   // /factors: rank stocks by a rule and back-test it
const EventsCalendarPage = lazy(() => import('./components/events/EventsCalendarPage'))   // /macro: economic, earnings, IPO, split and dividend calendar
const AITeacherPage      = lazy(() => import('./components/AITeacherPage'))
const PrivacyPage        = lazy(() => import('./components/PrivacyPage'))
import SiteNav from './components/nav/SiteNav'
import MarketLesson from './components/home/MarketLesson'
import QuoteBanner from './components/QuoteBanner'
import useCompareStore, { VIEW_KEYS, defaultView } from './store/compareStore'
import useLangStore, { rememberLang } from './store/langStore'
import useThemeStore from './store/themeStore'
import useWatchlistStore from './store/watchlistStore'
import { T } from './i18n/translations'
import { useMobile } from './hooks/useMobile'
import { trackVisit, trackFeature } from './utils/analytics'

// Skeleton placeholder shown while lazy page chunks are loading
function PageSkeleton() {
  return (
    <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[100, 60, 80, 60].map((h, i) => (
        <div key={i} style={{
          height: h, borderRadius: 8,
          background: 'var(--bg-secondary)',
          animation: `bfsSkeletonPulse 1.6s ease-in-out ${i * 0.1}s infinite`,
        }} />
      ))}
    </div>
  )
}

const TAB_PATHS = {
  analysis:     '/',
  screener:     '/screener',
  heatmap:      '/heatmap',
  news:         '/news',
  macro:        '/macro',
  factors:      '/factors',
  paper:        '/paper',
  time_machine: '/time-machine',
  cases:        '/cases',
  diagrams:     '/diagrams',
  governor:     '/governor',
  class:        '/class',
  study:        '/study',
  universities: '/universities',
  bank_views:   '/bank_views',
  career:       '/career',
  ai_teacher:   '/ai-teacher',
  admin:        '/admin',
}
const FOOTER_NOTE = {
  zh: '仅供学习，不构成投资建议。数据来源可能存在延迟。',
  en: 'For educational use only. Not investment advice. Data may be delayed.',
  ja: '学習用です。投資助言ではありません。データに遅れが生じる場合があります。',
  ko: '학습용이며 투자 조언이 아닙니다. 데이터가 지연될 수 있습니다.',
  fr: "À but pédagogique uniquement, pas un conseil en investissement. Les données peuvent être retardées.",
}
const ROLE_LABELS = {
  admin:  { en: 'Admin', zh: '管理员', ja: '管理者', ko: '관리자', fr: 'Admin' },
  member: { en: 'Member', zh: '会员', ja: 'メンバー', ko: '멤버', fr: 'Membre' },
}
const ADMIN_LINK = { en: 'Admin dashboard', zh: '管理员看板', ja: '管理ダッシュボード', ko: '관리자 대시보드', fr: 'Tableau de bord admin' }
const PATH_TABS = Object.fromEntries(Object.entries(TAB_PATHS).map(([k, v]) => [v, k]))

const LANG_OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'FR' },
]

export default function App() {
  const { market, setMarket, selectedSymbols, switchMarketAndAddSymbol, viewMode, setViewMode } = useCompareStore()
  const { lang, setLang } = useLangStore()
  const { theme, toggleTheme, setTheme } = useThemeStore()
  const { user, role, init: initAuth, signOut,
          setLangPreference, setThemePreference,
          setWatchlistPreference } = useAuthStore()
  const t = T[lang]
  const isMobile = useMobile()
  const location = useLocation()
  const navigate  = useNavigate()
  // Derive active tab from URL — no state needed
  const stockRouteMatch = location.pathname.match(/^\/stock\/(\w+)\/(.+)$/)
  const studyRouteMatch = location.pathname.match(/^\/study\/(\w+)$/)
  const classRouteMatch = location.pathname.match(/^\/class\/([A-Za-z0-9]{6})$/)   // an invite link
  const caseRouteMatch = location.pathname.match(/^\/cases\/([A-Za-z0-9_-]+)\/?$/)   // one case's own page
  const appTab = stockRouteMatch ? 'analysis'
    : studyRouteMatch ? 'study'
    : classRouteMatch ? 'class'
    : caseRouteMatch ? 'cases'
    : (PATH_TABS[location.pathname.replace(/(.)\/+$/, '$1')] || 'analysis')   // '/heatmap/' is '/heatmap'
  const [showStats,        setShowStats]        = useState(false)
  const [scrolled,         setScrolled]         = useState(false)
  const [showInsight,      setShowInsight]      = useState(false)
  const [showAIFloat,      setShowAIFloat]      = useState(false)
  const [showWatchlist,    setShowWatchlist]    = useState(false)
  const [showAuth,         setShowAuth]         = useState(false)
  const [showUserMenu,     setShowUserMenu]     = useState(false)
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [toast,          setToast]          = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  // Phones: search lives behind an icon so the sticky header stays one row tall; a new page closes it
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [searchPage, setSearchPage] = useState(location.pathname)
  if (searchPage !== location.pathname) {
    setSearchPage(location.pathname)
    setShowMobileSearch(false)
  }
  useEffect(() => {
    if (!isMobile) return
    document.querySelector('.bfs-nav-tab.is-active')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [isMobile, location.pathname])
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200) }
  const watchlist      = useWatchlistStore((s) => s.list)
  const watchlistCount = watchlist.length
  const setWatchlistList = useWatchlistStore((s) => s.setList)
  const watchlistBtnRef   = useRef(null)
  const langDropdownRef   = useRef(null)
  const userMenuRef       = useRef(null)
  const mobileMenuRef     = useRef(null)
  const watchlistSyncRef  = useRef(null) // tracks last saved serialized value
  // Height of the sticky header, as --chrome-h, so the home page's top section can end exactly at
  // the bottom of the first screen
  const chromeRef = useRef(null)
  useEffect(() => {
    const el = chromeRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => document.documentElement.style.setProperty('--chrome-h', `${Math.round(e.borderBoxSize?.[0]?.blockSize ?? e.contentRect.height)}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Initialize Supabase Auth listener once on mount
  useEffect(() => {
    let cleanup
    initAuth().then(fn => { cleanup = fn })
    return () => { cleanup?.() }
  }, []) // eslint-disable-line

  // When a logged-in user's session resolves, restore their saved language + theme.
  // Also refresh the lang hint cookie to eliminate the English flash on next page load.
  useEffect(() => {
    if (user?.user_metadata?.lang) {
      setLang(user.user_metadata.lang)
      document.cookie = `bfs_lang_hint=${user.user_metadata.lang}; path=/; max-age=31536000; SameSite=Lax`
    }
    if (user?.user_metadata?.theme) {
      setTheme(user.user_metadata.theme)
    }
  }, [user]) // eslint-disable-line

  // Track page visit once on mount
  useEffect(() => { trackVisit('home') }, [])


  // Close any open dropdown when clicking outside
  useEffect(() => {
    if (!showLangDropdown && !showUserMenu && !showMobileMenu) return
    const handler = (e) => {
      if (showLangDropdown && langDropdownRef.current && !langDropdownRef.current.contains(e.target)) setShowLangDropdown(false)
      if (showUserMenu   && userMenuRef.current   && !userMenuRef.current.contains(e.target))   setShowUserMenu(false)
      if (showMobileMenu && mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) setShowMobileMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showLangDropdown, showUserMenu, showMobileMenu])

  // Scroll-aware header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Update document title and canonical on tab/stock change for SEO
  useEffect(() => {
    // When stocks are selected in the analysis tab, show a stock-specific title
    // A stock opened from a URL only knows its code at first: keep the server-rendered title (it carries the company name)
    if (location.pathname.startsWith('/stock/') && (selectedSymbols.length === 0 ||
        (selectedSymbols.length === 1 && (!selectedSymbols[0].name || selectedSymbols[0].name === selectedSymbols[0].code)))) {
      // The server-rendered title is Chinese ("Apple Inc. (AAPL) 美股行情 · K线 · AI分析 | ..."): keep the name part for other languages
      if (lang !== 'zh') document.title = document.title.replace(/\s*(美股|A股|港股|日股)行情[^|]*\|\s*BestFriendStock/, ' | Best Friend Stock')
      // Only US pages get a server-rendered title; the others look the name up here
      if (stockRouteMatch && !document.title.toUpperCase().includes(stockRouteMatch[2].toUpperCase())) {
        const [, mk, code] = stockRouteMatch
        const url = mk === 'cn' ? `/api/stocks/${code}/realtime` : `/api/${mk}/stock/${encodeURIComponent(code)}/realtime`
        let alive = true
        fetch(url).then((r) => (r.ok ? r.json() : null)).then((d) => {
          if (!alive || !d?.name) return
          const label = { cn: 'A股', hk: '港股', jp: '日股', us: '美股' }[mk] || ''
          document.title = lang === 'zh' ? `${d.name} (${code}) ${label}行情 · K线 · AI分析 | BestFriendStock` : `${d.name} (${code}) | Best Friend Stock`
        }).catch(() => {})
        return () => { alive = false }
      }
      return
    }
    if (appTab === 'analysis' && selectedSymbols.length > 0) {
      const label = selectedSymbols.length === 1
        ? `${selectedSymbols[0].name} (${selectedSymbols[0].code})`
        : selectedSymbols.map(s => s.code).join(' vs ')
      document.title = `${label} | Best Friend Stock`
      return
    }
    const titles = {
      analysis:     'BestFriendStock | 免费美股A股分析 · AI智能投资 · 模拟炒股 · 经济学学习',
      news:         'BestFriendStock | 每日大事件 - 市场重大新闻',
      paper:        'BestFriendStock | 模拟炒股 - 用虚拟资金练习美股与A股交易',
      time_machine: 'BestFriendStock | 历史穿越交易 - 回到2008金融危机、2020疫情暴跌、2015股灾做投资决定',
      cases:        'BestFriendStock | 经济学案例库 - IB、A-Level、AP 论文可用的真实新闻案例',
      diagrams:     'BestFriendStock | 经济学图表实验室 - 可拖动的供求、AD-AS、外部性、汇率、关税图',
      governor:     'BestFriendStock | 当一次美联储主席 - 回到2021通胀、1979沃尔克、2007金融危机决定利率',
      class:        'BestFriendStock | 班级 - 老师布置作业、查看全班模拟交易与学习进度',
      study:        'BestFriendStock | 经济学学习中心 - A-Level IB AP IGCSE 与美股入门',
      universities: 'BestFriendStock | 全球商学院指南 - 100+顶尖商学院数据库',
      bank_views:   'BestFriendStock | 大行观点 - 顶级投行研究观点',
      career:       'BestFriendStock | 求职指南 - 金融行业职业规划与模拟面试',
      screener:     'BestFriendStock | 美股选股器 - US Stock Screener',
      heatmap:      'BestFriendStock | 市场热力图 - 美股与A股板块涨跌全景',
      macro:        'BestFriendStock | 财经日历 - 经济数据、财报、新股上市、拆股与分红',
      factors:      'BestFriendStock | 因子实验室 - 用十年真实价格检验动量、低波动等选股规则',
      admin:        'BestFriendStock | Admin',
      ai_teacher:   'BestFriendStock | AI经济学老师 - 免费AI经济学与股票辅导',
    }
    const titlesEn = {
      analysis:     'Best Friend Stock | Free US & China Stock Analysis, Paper Trading and Economics',
      news:         'Best Friend Stock | Daily Market News',
      paper:        'Best Friend Stock | Paper Trading with $1M Virtual Cash',
      time_machine: 'Best Friend Stock | History Time Machine: Trade Through 2008, 2020 and 2022',
      cases:        'Best Friend Stock | Economics Case Library: Real-World Examples for IB, A-Level and AP Essays',
      diagrams:     'Best Friend Stock | Economics Diagram Lab: Interactive Supply and Demand, AD-AS and More',
      governor:     'Best Friend Stock | Be the Fed Chair: Set Interest Rates Through 2021, 1979 and 2007',
      class:        'Best Friend Stock | Classes: Assignments and Progress for Economics Teachers',
      study:        'Best Friend Stock | Economics Study Center: A-Level, IB, AP, IGCSE',
      universities: 'Best Friend Stock | Business School Guide',
      bank_views:   'Best Friend Stock | Bank Research Views',
      career:       'Best Friend Stock | Finance Career Guide and Mock Interviews',
      screener:     'Best Friend Stock | US Stock Screener',
      heatmap:      'Best Friend Stock | Market Heatmap',
      macro:        'Best Friend Stock | Calendar: economic data, earnings, IPOs, splits and dividends',
      factors:      'Best Friend Stock | Factor lab: test momentum and low-volatility rules on ten years of prices',
      admin:        'Best Friend Stock | Admin',
      ai_teacher:   'Best Friend Stock | AI Economics Teacher',
    }
    // Crawlers always get Chinese (see langStore), so the indexed titles do not change
    const set = lang === 'zh' ? titles : titlesEn
    if (!caseRouteMatch) document.title = set[appTab] || set.analysis   // a case's page sets its own (CasesPage)
    const robots = document.querySelector('meta[name="robots"]')
    if (robots) robots.setAttribute('content', appTab === 'admin' ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large')
    let canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) {
      canonical.setAttribute('href', 'https://bestfriendstock.com' + location.pathname)
    }
  }, [appTab, selectedSymbols, location.pathname, lang]) // eslint-disable-line

  // On mount: if URL is /stock/:market/:code, auto-load that stock
  useEffect(() => {
    if (stockRouteMatch) {
      const [, urlMarket, urlCode] = stockRouteMatch
      if (['cn', 'us', 'hk', 'jp'].includes(urlMarket) && selectedSymbols.length === 0) {
        const code = urlMarket === 'hk' && /^\d{1,5}$/.test(urlCode) ? urlCode.padStart(5, '0') : urlCode.toUpperCase()
        switchMarketAndAddSymbol(urlMarket, { code, name: code })
        // A shared link can open a given tab: /stock/us/AAPL?view=statistics
        const view = new URLSearchParams(location.search).get('view')
        if (view && VIEW_KEYS.has(view)) setViewMode(view)
      }
    }
  }, []) // eslint-disable-line

  // Keep URL in sync as stocks are selected / removed (replace to avoid cluttering history)
  useEffect(() => {
    if (appTab !== 'analysis') return
    if (selectedSymbols.length > 0) {
      const s = selectedSymbols[0]
      // The open tab is part of the address (unless it is the stock's default tab), so links keep it
      const view = viewMode && viewMode !== defaultView(market) ? `?view=${viewMode}` : ''
      navigate(`/stock/${market}/${s.code}${view}`, { replace: true })
    } else if (location.pathname !== '/' && location.pathname !== '/privacy') {
      // /privacy is a standalone page: a direct visit must not be bounced to the home page
      navigate('/', { replace: true })
    }
  }, [selectedSymbols, viewMode]) // eslint-disable-line

  // Watchlist cloud sync: load from account on login, save on every change
  useEffect(() => {
    if (!user) { watchlistSyncRef.current = null; return }
    if (watchlistSyncRef.current === null && user.user_metadata?.watchlist?.length) {
      // First login: restore cloud watchlist, skip next save (same data)
      setWatchlistList(user.user_metadata.watchlist)
      watchlistSyncRef.current = JSON.stringify(user.user_metadata.watchlist)
    }
  }, [user]) // eslint-disable-line

  useEffect(() => {
    if (!user) return
    const serialized = JSON.stringify(watchlist)
    if (serialized === watchlistSyncRef.current) return
    watchlistSyncRef.current = serialized
    setWatchlistPreference(watchlist)
  }, [watchlist]) // eslint-disable-line

  const handleTabChange = (tab) => {
    navigate(TAB_PATHS[tab] || '/')
    if (tab === 'paper') trackFeature('paper_trading')
    else if (tab === 'time_machine') trackFeature('time_machine')
    else if (tab === 'cases') trackFeature('cases')
    else if (tab === 'diagrams') trackFeature('diagrams')
    else if (tab === 'governor') trackFeature('governor')
    else if (tab === 'class') trackFeature('class')
    else if (tab === 'study') trackFeature('study')
    else if (tab === 'universities') trackFeature('universities')
    else if (tab === 'ai_teacher') trackFeature('ai_tutor')   // the phone site's name for this page
    else trackFeature('analysis')
  }

  if (location.pathname === '/privacy') {
    return <Suspense fallback={<PageSkeleton />}><PrivacyPage /></Suspense>
  }

  return (
    <>
    <WelcomeModal onLangSelect={(lang) => setLang(lang)} />
    <KnowledgeCard lang={lang} open={showInsight} onClose={() => setShowInsight(false)} />
    <AuthModal open={showAuth} onClose={() => setShowAuth(false)} lang={lang} />
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--sans)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Sticky nav wrapper — primary header + secondary tab bar scroll together */}
      <div ref={chromeRef} data-bfs-chrome style={{ position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
      <header
        style={{
          background: 'var(--nav-bg)',
          borderBottom: '1px solid var(--border-primary)',
          padding: isMobile ? '8px 10px' : '10px 24px',
          display: 'flex',
          alignItems: 'center',
          rowGap: 8,
          columnGap: isMobile ? 8 : 18,
          // Phones: search drops to its own full-width row so the top row fits 360px screens
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          onClick={() => { setMarket(market); handleTabChange('analysis') }}   // setMarket also closes the open stock, so / really is the home page
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, cursor: 'pointer', opacity: 1, transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.72'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <img
            src="/logo-header.png"
            alt="Best Friend Stock"
            style={{ height: isMobile ? 32 : 40, width: 'auto', filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none' }}
          />
          {!isMobile && (
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Best Friend Stock
            </span>
          )}
        </div>

        {/* Market switch: a segmented control */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 2, gap: 2, flexShrink: 0 }}>
          {[{ key: 'us', label: t.marketUS }, { key: 'cn', label: t.marketCN },
            { key: 'hk', label: t.marketHK }, { key: 'jp', label: t.marketJP }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMarket(key)}
              aria-pressed={market === key}
              style={{
                padding: isMobile ? '4px 7px' : '5px 12px',
                borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 11 : 13, fontWeight: 500,
                background: market === key ? 'var(--bg-hover)' : 'transparent',
                color: market === key ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {isMobile && lang !== 'zh' ? { us: 'US', cn: 'CN', hk: 'HK', jp: 'JP' }[key] : label}
            </button>
          ))}
        </div>

        {isMobile ? (showMobileSearch && <div style={{ order: 10, flexBasis: '100%' }}><SearchBar fullWidth autoFocus /></div>) : <SearchBar />}

        {/* Right-side controls pushed to the far right */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 8, flexShrink: 0 }}>

          {/* Language dropdown — desktop only */}
          {!isMobile && (
            <div ref={langDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowLangDropdown(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 10px', borderRadius: 8,
                  border: '1px solid var(--border-primary)', background: 'transparent',
                  cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {LANG_OPTIONS.find(l => l.code === lang)?.label ?? 'EN'}
                <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
              </button>
              {showLangDropdown && (
                <div
                  style={{
                    position: 'absolute', top: 38, right: 0,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    borderRadius: 10, minWidth: 120, zIndex: 9000,
                    boxShadow: 'var(--shadow-pop)', padding: '4px 0',
                  }}
                >
                  {LANG_OPTIONS.map(({ code, label }) => (
                    <button
                      key={code}
                      onClick={() => {
                        setLang(code); setShowLangDropdown(false)
                        if (user) {
                          setLangPreference(code)
                          document.cookie = `bfs_lang_hint=${code}; path=/; max-age=31536000; SameSite=Lax`
                          showToast('Language saved')
                        } else {
                          rememberLang(code)
                        }
                      }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 16px', background: 'none',
                        border: 'none', cursor: 'pointer', fontSize: 13,
                        fontWeight: lang === code ? 600 : 400,
                        color: lang === code ? 'var(--accent-blue)' : 'var(--text-primary)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Theme toggle — desktop only */}
          {!isMobile && (
            <button
              onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; toggleTheme(); if (user) { setThemePreference(next); showToast('Theme saved') } }}
              title={theme === 'dark' ? t.lightMode : t.darkMode}
              aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: 'none', background: 'transparent', color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} strokeWidth={1.9} />
            </button>
          )}

          {isMobile && (
            <button
              onClick={() => setShowMobileSearch(v => !v)}
              aria-label={t.searchPlaceholder}
              aria-expanded={showMobileSearch}
              style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                border: 'none',
                background: showMobileSearch ? 'var(--bg-hover)' : 'transparent',
                color: showMobileSearch ? 'var(--text-primary)' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </button>
          )}

          {/* Daily insight + AI tutor (desktop only) + watchlist (always) */}
          {[
            ...(isMobile ? [] : [
              { key: 'insight',   icon: 'bulb', active: showInsight,   onClick: () => setShowInsight(v => !v),   title: t.navInsight,   badge: null },
              { key: 'ai',        icon: 'tutor', active: showAIFloat,   onClick: () => setShowAIFloat(v => !v),   title: t.navAITutor,   badge: null },
            ]),
            { key: 'watchlist', icon: 'star', active: showWatchlist, onClick: () => setShowWatchlist(v => !v), title: t.navWatchlist, badge: watchlistCount > 0 ? watchlistCount : null },
          ].map(({ key, icon, active, onClick, title, badge }) => (
            <div key={key} ref={key === 'watchlist' ? watchlistBtnRef : undefined} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={onClick}
                title={title}
                aria-label={title}
                aria-pressed={active}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  border: 'none',
                  background: active ? 'var(--bg-hover)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--bg-hover)' : 'transparent' }}
              >
                <Icon name={icon} size={19} strokeWidth={1.9} />
              </button>
              {badge != null && (
                <div style={{
                  position: 'absolute', top: -3, right: -3,
                  background: 'var(--accent-fill)',
                  color: '#fff', fontSize: 9, fontWeight: 600,
                  width: 15, height: 15, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  {badge}
                </div>
              )}
              {key === 'watchlist' && (
                <Watchlist lang={lang} open={showWatchlist} onClose={() => setShowWatchlist(false)} anchorRef={watchlistBtnRef} />
              )}
            </div>
          ))}

          {/* ⋯ Mobile overflow menu — mobile only */}
          {isMobile && (
            <div ref={mobileMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setShowMobileMenu(v => !v)}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  border: 'none', color: 'var(--text-secondary)',
                  background: showMobileMenu ? 'var(--bg-hover)' : 'transparent',
                  cursor: 'pointer', fontSize: 18, letterSpacing: '-2px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = showMobileMenu ? 'var(--bg-hover)' : 'transparent' }}
              >
                •••
              </button>
              {showMobileMenu && (
                <div
                  style={{
                    position: 'absolute', top: 40, right: 0,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    borderRadius: 12, minWidth: 190, zIndex: 9000,
                    boxShadow: 'var(--shadow-pop)', padding: '8px 0',
                  }}
                >
                  {/* Language chips */}
                  <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid var(--border-primary)', marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0 }}>Language</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {LANG_OPTIONS.map(({ code, label }) => (
                        <button
                          key={code}
                          onClick={() => {
                            setLang(code); setShowMobileMenu(false)
                            if (user) {
                              setLangPreference(code)
                              document.cookie = `bfs_lang_hint=${code}; path=/; max-age=31536000; SameSite=Lax`
                              showToast('Language saved')
                            } else {
                              rememberLang(code)
                            }
                          }}
                          style={{
                            padding: '4px 8px', borderRadius: 6, fontSize: 11,
                            background: lang === code ? 'var(--accent-blue-soft)' : 'var(--bg-tertiary)',
                            border: `1px solid ${lang === code ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                            cursor: 'pointer', fontWeight: lang === code ? 700 : 400,
                            color: lang === code ? 'var(--accent-blue)' : 'var(--text-primary)',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Theme */}
                  <button
                    onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; toggleTheme(); setShowMobileMenu(false); if (user) { setThemePreference(next); showToast('Theme saved') } }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
                    <span>{theme === 'dark' ? t.lightMode : t.darkMode}</span>
                  </button>
                  {/* Daily Insight */}
                  <button
                    onClick={() => { setShowInsight(v => !v); setShowMobileMenu(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <Icon name="bulb" size={16} /><span>{t.navInsight}</span>
                  </button>
                  {/* AI Tutor */}
                  <button
                    onClick={() => { setShowAIFloat(v => !v); setShowMobileMenu(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <Icon name="tutor" size={16} /><span>{t.navAITutor}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Auth button / user avatar */}
          <div ref={userMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
            {user ? (
              <>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  title={user.email}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: '1px solid var(--border-glow)',
                    background: 'var(--bg-tertiary)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                >
                  {(user.email?.[0] ?? '?').toUpperCase()}
                </button>
                {showUserMenu && (
                  <div
                    style={{
                      position: 'absolute', top: 40, right: 0,
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                      borderRadius: 10, minWidth: 200, zIndex: 9000,
                      boxShadow: 'var(--shadow-pop)', padding: '8px 0',
                    }}
                  >
                    <div style={{ padding: '8px 16px 10px', borderBottom: '1px solid var(--border-primary)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t.signedIn}
                        {role !== 'user' && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999, color: role === 'admin' ? 'var(--accent-blue)' : 'var(--accent-gold)', border: '1px solid currentColor' }}>
                            {(ROLE_LABELS[role] || ROLE_LABELS.admin)[lang] || (ROLE_LABELS[role] || ROLE_LABELS.admin).en}
                          </span>
                        )}
                      </div>
                    </div>
                    {role === 'admin' && (
                      <button
                        onClick={() => { setShowUserMenu(false); navigate('/admin') }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', transition: 'background 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                      >
                        {ADMIN_LINK[lang] || ADMIN_LINK.en}
                      </button>
                    )}
                    <button
                      onClick={async () => { setShowUserMenu(false); document.cookie = 'bfs_lang_hint=; path=/; max-age=0; SameSite=Lax'; await signOut() }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--red-bright)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    >
                      {t.signOut}
                    </button>
                  </div>
                )}
              </>
            ) : isMobile ? (
              <button
                onClick={() => setShowAuth(true)}
                aria-label={t.signIn}
                title={t.signIn}
                style={{
                  width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
                  border: 'none', background: 'var(--text-primary)', color: 'var(--bg-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--text-primary)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--bg-primary)',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                {t.signIn}
              </button>
            )}
          </div>

        </div>{/* end right-side controls */}

      </header>
      {/* Secondary nav: five sections with menus (components/nav) */}
      <SiteNav appTab={appTab} lang={lang} paths={TAB_PATHS} onTabChange={handleTabChange}
        isMobile={isMobile} scrolled={scrolled} dataSource={t.dataSource}
        showTicker={!(appTab === 'analysis' && location.pathname === '/')} />
      </div>{/* end sticky nav wrapper */}

      <main style={{ padding: isMobile ? '2px 12px' : '2px 24px', flex: 1 }}>
        <ErrorBoundary key={appTab}>
        <Suspense fallback={<PageSkeleton />}>
          {appTab === 'study' ? (
            <StudyCenter lang={lang} />
          ) : appTab === 'paper' ? (
            <PaperTradingPanel lang={lang} onOpenAuth={() => setShowAuth(true)} />
          ) : appTab === 'time_machine' ? (
            <TimeMachinePage lang={lang} />
          ) : appTab === 'cases' ? (
            <CasesPage lang={lang} caseId={caseRouteMatch?.[1]} />
          ) : appTab === 'diagrams' ? (
            <DiagramLab lang={lang} />
          ) : appTab === 'governor' ? (
            <GovernorPage lang={lang} />
          ) : appTab === 'class' ? (
            <ClassPage lang={lang} code={classRouteMatch?.[1]} onOpenAuth={() => setShowAuth(true)} />
          ) : appTab === 'universities' ? (
            <UniversitiesPage lang={lang} />
          ) : appTab === 'news' ? (
            <DailyNewsPage lang={lang} />
          ) : appTab === 'bank_views' ? (
            <BankViewsPage lang={lang} />
          ) : appTab === 'career' ? (
            <CareerGuidePage lang={lang} />
          ) : appTab === 'screener' ? (
            <ScreenerPage lang={lang} />
          ) : appTab === 'heatmap' ? (
            <HeatmapPage lang={lang} />
          ) : appTab === 'macro' ? (
            <EventsCalendarPage lang={lang} />
          ) : appTab === 'factors' ? (
            <FactorLab lang={lang} />
          ) : appTab === 'admin' ? (
            <AdminPage lang={lang} onOpenAuth={() => setShowAuth(true)} />
          ) : appTab === 'ai_teacher' ? (
            <AITeacherPage lang={lang} />
          ) : (
            <>
              {selectedSymbols.length === 0 && (
                <div className="bfs-home-top bfs-enter-1">
                  <ErrorBoundary fallback={null}><QuoteBanner lang={lang} variant="band" /></ErrorBoundary>
                  <ErrorBoundary fallback={null}><MarketLesson lang={lang} paths={TAB_PATHS} onTabChange={handleTabChange} onNavigate={navigate} /></ErrorBoundary>
                </div>
              )}
              {selectedSymbols.length === 0 && (
                <div className="bfs-enter-2"><ErrorBoundary fallback={null}>
                  {market === 'hk' || market === 'jp' ? <IntlMarketPanel lang={lang} market={market} /> : <USMarketPanel lang={lang} hideIndices />}
                </ErrorBoundary></div>
              )}
              {selectedSymbols.length === 0 && (
                <div className="bfs-enter-2"><ErrorBoundary><GlobalSentiment lang={lang} /></ErrorBoundary></div>
              )}
              <div className="bfs-enter-3"><ComparePanel onTabChange={handleTabChange} onOpenKnowledge={() => setShowInsight(true)} /></div>
            </>
          )}
        </Suspense>
        </ErrorBoundary>
      </main>

      {showStats && <Suspense fallback={null}><StatsDisplay lang={lang} onClose={() => setShowStats(false)} /></Suspense>}
      {/* Toast notification for saved preferences */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, right: 24, zIndex: 9998,
          background: 'var(--bg-secondary)', border: '1px solid var(--border-glow)',
          borderRadius: 8, padding: '8px 14px', fontSize: 13,
          color: 'var(--text-primary)', boxShadow: 'var(--shadow-pop)',
          display: 'flex', alignItems: 'center', gap: 8,
          pointerEvents: 'none',
        }}>
          <span style={{ color: '#4cc38a', fontSize: 15, lineHeight: 1 }}>✓</span>
          {toast}
        </div>
      )}
      <Suspense fallback={null}>
        <AITeacherFloat lang={lang} open={showAIFloat} onClose={() => setShowAIFloat(false)} />
      </Suspense>
      <footer style={{
        textAlign: 'center',
        padding: '12px 24px',
        fontSize: 11,
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-primary)',
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: 4, fontSize: 11, color: 'var(--text-muted)' }}>
          {FOOTER_NOTE[lang] || FOOTER_NOTE.en} {t.dataSource}
        </div>
        <a
          href="mailto:billyl090119@gmail.com"
          style={{ color: '#9ca3af', textDecoration: 'none' }}
        >
          {t.contactLink}
        </a>
        {' · '}
        <button
          onClick={() => setShowStats(true)}
          style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: '#9ca3af', cursor: 'pointer' }}
        >
          {lang === 'zh' ? '访问统计' : 'Site stats'}
        </button>
      </footer>

      <style>{`
        @keyframes bfsPageFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bfsSkeletonPulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="bfsPageFadeIn"] { animation: none !important; opacity: 1 !important; }
          [style*="bfsSkeletonPulse"] { animation: none !important; opacity: 0.5 !important; }
        }
      `}</style>
    </div>
    </>
  )
}
