import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from './components/Icon'
import HomeHero from './components/HomeHero'
import SplashScreen, { shouldShowSplash } from './components/SplashScreen'
import SearchBar from './components/SearchBar'
import ComparePanel from './components/ComparePanel'
import WelcomeModal from './components/WelcomeModal'
import Watchlist from './components/Watchlist'
import KnowledgeCard from './components/KnowledgeCard'
import GlobalSentiment from './components/GlobalSentiment'
import USMarketPanel from './components/USMarketPanel'
const IntlMarketPanel = lazy(() => import('./components/IntlMarketPanel'))
import StatsDisplay from './components/StatsDisplay'
import QuoteBanner from './components/QuoteBanner'
import AuthModal from './components/AuthModal'
import ErrorBoundary from './components/ErrorBoundary'
import useAuthStore from './store/authStore'

const PaperTradingPanel  = lazy(() => import('./components/PaperTradingPanel'))
const StudyCenter        = lazy(() => import('./components/StudyCenter'))
const AITeacherFloat     = lazy(() => import('./components/AITeacherFloat'))
const UniversitiesPage   = lazy(() => import('./components/UniversitiesPage'))
const DailyNewsPage      = lazy(() => import('./components/DailyNewsPage'))
const BankViewsPage      = lazy(() => import('./components/BankViewsPage'))
const CareerGuidePage    = lazy(() => import('./components/CareerGuidePage'))
const ScreenerPage       = lazy(() => import('./components/ScreenerPage'))
const AdminPage          = lazy(() => import('./components/AdminPage'))
const HeatmapPage        = lazy(() => import('./components/HeatmapPage'))
const MacroCalendarPage  = lazy(() => import('./components/MacroCalendarPage'))
const AITeacherPage      = lazy(() => import('./components/AITeacherPage'))
const PrivacyPage        = lazy(() => import('./components/PrivacyPage'))
import useCompareStore from './store/compareStore'
import useLangStore from './store/langStore'
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
  paper:        '/paper',
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
const FOOTER_WHAT = {
  zh: '两个高中生做给学生的免费股票与经济学网站',
  en: 'a free stock and economics site, made by two students for students',
  ja: '高校生2人が学生のために作った無料の株式・経済学サイト',
  ko: '고등학생 두 명이 학생을 위해 만든 무료 주식·경제학 사이트',
  fr: 'un site gratuit de bourse et d’économie, fait par deux lycéens pour les élèves',
}
const FOOTER_CONTACT = { zh: '联系我们', en: 'Contact', ja: 'お問い合わせ', ko: '문의', fr: 'Contact' }
const FOOTER_PRIVACY = { zh: '隐私政策', en: 'Privacy', ja: 'プライバシー', ko: '개인정보', fr: 'Confidentialité' }
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

// Logged-in users get a cookie hint so the next page load starts in their language
function rememberLangHint(code) {
  document.cookie = `bfs_lang_hint=${code}; path=/; max-age=31536000; SameSite=Lax`
}

export default function App() {
  const { market, setMarket, selectedSymbols, switchMarketAndAddSymbol } = useCompareStore()
  const { lang, setLang } = useLangStore()
  const { theme, toggleTheme, setTheme } = useThemeStore()
  const { user, role, init: initAuth, signOut,
          setLangPreference, setThemePreference,
          setWatchlistPreference } = useAuthStore()
  const t = T[lang]
  const isMobile = useMobile()
  // Phones and tablets: the bar keeps to one row (search behind an icon, extras in the menu)
  const compactBar = useMobile(1000)
  const location = useLocation()
  const navigate  = useNavigate()
  // Derive active tab from URL — no state needed
  const stockRouteMatch = location.pathname.match(/^\/stock\/(\w+)\/(.+)$/)
  const studyRouteMatch = location.pathname.match(/^\/study\/(\w+)$/)
  const appTab = stockRouteMatch ? 'analysis'
    : studyRouteMatch ? 'study'
    : (PATH_TABS[location.pathname.replace(/(.)\/+$/, '$1')] || 'analysis')   // '/heatmap/' is '/heatmap'
  const [showStats,        setShowStats]        = useState(false)
  const [showInsight,      setShowInsight]      = useState(false)
  const [showAIFloat,      setShowAIFloat]      = useState(false)
  const [showWatchlist,    setShowWatchlist]    = useState(false)
  const [showAuth,         setShowAuth]         = useState(false)
  const [showUserMenu,     setShowUserMenu]     = useState(false)
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [toast,          setToast]          = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  // Phones: search lives behind an icon so the sticky header stays one row tall
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  useEffect(() => { setShowMobileSearch(false) }, [location.pathname])
  useEffect(() => {
    if (!compactBar) return
    document.querySelector('.bfs-nav-tab.is-active')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [compactBar, location.pathname])
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200) }
  const watchlist      = useWatchlistStore((s) => s.list)
  const watchlistCount = watchlist.length
  const setWatchlistList = useWatchlistStore((s) => s.setList)
  const watchlistBtnRef   = useRef(null)
  const langDropdownRef   = useRef(null)
  const userMenuRef       = useRef(null)
  const mobileMenuRef     = useRef(null)
  const watchlistSyncRef  = useRef(null) // tracks last saved serialized value

  // Splash screen — computed once at mount, stable for this session
  const [hadSplash]      = useState(shouldShowSplash)
  const [splashActive,   setSplashActive]   = useState(hadSplash)
  const [contentVisible, setContentVisible] = useState(!hadSplash)

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
      study:        'BestFriendStock | 经济学学习中心 - A-Level IB AP IGCSE 与美股入门',
      universities: 'BestFriendStock | 全球商学院指南 - 100+顶尖商学院数据库',
      bank_views:   'BestFriendStock | 大行观点 - 顶级投行研究观点',
      career:       'BestFriendStock | 求职指南 - 金融行业职业规划与模拟面试',
      screener:     'BestFriendStock | 美股选股器 - US Stock Screener',
      heatmap:      'BestFriendStock | 市场热力图 - 美股与A股板块涨跌全景',
      macro:        'BestFriendStock | 经济日历 - CPI 非农 美联储议息 GDP 发布时间与解读',
      admin:        'BestFriendStock | Admin',
      ai_teacher:   'BestFriendStock | AI经济学老师 - 免费AI经济学与股票辅导',
    }
    const titlesEn = {
      analysis:     'Best Friend Stock | Free US & China Stock Analysis, Paper Trading and Economics',
      news:         'Best Friend Stock | Daily Market News',
      paper:        'Best Friend Stock | Paper Trading with $1M Virtual Cash',
      study:        'Best Friend Stock | Economics Study Center: A-Level, IB, AP, IGCSE',
      universities: 'Best Friend Stock | Business School Guide',
      bank_views:   'Best Friend Stock | Bank Research Views',
      career:       'Best Friend Stock | Finance Career Guide and Mock Interviews',
      screener:     'Best Friend Stock | US Stock Screener',
      heatmap:      'Best Friend Stock | Market Heatmap',
      macro:        'Best Friend Stock | Economic Calendar',
      admin:        'Best Friend Stock | Admin',
      ai_teacher:   'Best Friend Stock | AI Economics Teacher',
    }
    // Crawlers always get Chinese (see langStore), so the indexed titles do not change
    const set = lang === 'zh' ? titles : titlesEn
    document.title = set[appTab] || set.analysis
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
      }
    }
  }, []) // eslint-disable-line

  // Keep URL in sync as stocks are selected / removed (replace to avoid cluttering history)
  useEffect(() => {
    if (appTab !== 'analysis') return
    if (selectedSymbols.length > 0) {
      const s = selectedSymbols[0]
      navigate(`/stock/${market}/${s.code}`, { replace: true })
    } else if (location.pathname !== '/' && location.pathname !== '/privacy') {
      // /privacy is a standalone page: a direct visit must not be bounced to the home page
      navigate('/', { replace: true })
    }
  }, [selectedSymbols]) // eslint-disable-line

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
    else if (tab === 'study') trackFeature('study')
    else if (tab === 'universities') trackFeature('universities')
    else trackFeature('analysis')
  }

  if (location.pathname === '/privacy') {
    return <Suspense fallback={<PageSkeleton />}><PrivacyPage /></Suspense>
  }

  const menuItem = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
    padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, color: 'var(--text-primary)',
  }
  const menuBox = {
    position: 'absolute', top: 42, right: 0, zIndex: 9000,
    background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '6px 0',
    boxShadow: '0 12px 32px rgba(0,0,0,0.28)',   // a real overlay: the one place a shadow belongs
    animation: 'bfsPageFadeIn 0.15s ease both',
  }
  const iconBtn = (active) => ({
    width: 36, height: 36, borderRadius: 'var(--radius)', border: 'none', flexShrink: 0, cursor: 'pointer',
    background: active ? 'var(--bg-hover)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })
  const pickLang = (code, close) => {
    setLang(code); close()
    if (user) {
      setLangPreference(code)
      rememberLangHint(code)
      showToast('Language saved')
    } else {
      localStorage.setItem('bfs_lang', code)
    }
  }
  const flipTheme = () => { const next = theme === 'dark' ? 'light' : 'dark'; toggleTheme(); if (user) { setThemePreference(next); showToast('Theme saved') } }

  return (
    <>
    {/* Splash screen — renders above everything, unmounts after animation */}
    {splashActive && (
      <SplashScreen
        onContentVisible={() => setContentVisible(true)}
        onDone={() => setSplashActive(false)}
      />
    )}
    {/* WelcomeModal and KnowledgeCard stay outside the opacity wrapper
        because they are position:fixed — wrapping them in an opacity<1 div
        would break their viewport positioning. */}
    <WelcomeModal onLangSelect={(lang) => setLang(lang)} />
    <KnowledgeCard lang={lang} open={showInsight} onClose={() => setShowInsight(false)} />
    <AuthModal open={showAuth} onClose={() => setShowAuth(false)} lang={lang} />
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--sans)',
        display: 'flex',
        flexDirection: 'column',
        ...(hadSplash ? {
          opacity: contentVisible ? 1 : 0,
          transition: 'opacity 0.45s ease',
        } : {
          animation: 'bfsPageFadeIn 0.35s ease both',
        }),
      }}
    >
      {/* Sticky bar: wordmark, market, search, a few controls, one action; the section tabs below it */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, flexShrink: 0, background: 'var(--nav-bg)' }}>
      <header
        style={{
          background: 'var(--nav-bg)',
          padding: compactBar ? '8px 12px' : '12px 28px',
          display: 'flex',
          alignItems: 'center',
          rowGap: 8,
          columnGap: compactBar ? 8 : 20,
          flexWrap: compactBar ? 'wrap' : 'nowrap',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Wordmark */}
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); handleTabChange('analysis') }}
          className="bfs-wordmark"
          style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, cursor: 'pointer', textDecoration: 'none', color: 'var(--text-primary)' }}
        >
          <img
            src="/logo-dark.png"
            alt="Best Friend Stock"
            style={{ height: compactBar ? 28 : 32, width: 'auto', filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none' }}
          />
          {!compactBar && (
            <span className="bfs-wordmark-text" style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.02em' }}>
              Best Friend Stock
            </span>
          )}
        </a>

        {/* Market switch: a segmented control from the product */}
        <div role="group" aria-label="Market" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', padding: 3, gap: 2, flexShrink: 0 }}>
          {[{ key: 'us', label: t.marketUS }, { key: 'cn', label: t.marketCN },
            { key: 'hk', label: t.marketHK }, { key: 'jp', label: t.marketJP }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMarket(key)}
              aria-pressed={market === key}
              className="bfs-seg"
              style={{
                padding: compactBar ? '5px 8px' : '6px 12px',
                borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                background: market === key ? 'var(--bg-secondary)' : 'transparent',
                color: market === key ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {compactBar && lang !== 'zh' ? { us: 'US', cn: 'CN', hk: 'HK', jp: 'JP' }[key] : label}
            </button>
          ))}
        </div>

        {compactBar ? (showMobileSearch && <div style={{ order: 10, flexBasis: '100%' }}><SearchBar fullWidth autoFocus /></div>) : <SearchBar />}

        {/* Right-side controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: compactBar ? 2 : 4, flexShrink: 0 }}>

          {!compactBar && (
            <div ref={langDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowLangDropdown(v => !v)}
                aria-expanded={showLangDropdown}
                className="bfs-ghost"
                style={{ ...iconBtn(showLangDropdown), width: 'auto', padding: '0 10px', gap: 6, fontSize: 14 }}
              >
                {LANG_OPTIONS.find(l => l.code === lang)?.label ?? 'EN'}
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
              </button>
              {showLangDropdown && (
                <div style={{ ...menuBox, minWidth: 140 }}>
                  {LANG_OPTIONS.map(({ code, label }) => (
                    <button key={code} onClick={() => pickLang(code, () => setShowLangDropdown(false))} className="bfs-menu-item"
                      style={{ ...menuItem, fontWeight: lang === code ? 600 : 400, color: lang === code ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!compactBar && (
            <button onClick={flipTheme} title={theme === 'dark' ? t.lightMode : t.darkMode} aria-label={theme === 'dark' ? t.lightMode : t.darkMode} className="bfs-ghost" style={iconBtn(false)}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
          )}

          {compactBar && (
            <button onClick={() => setShowMobileSearch(v => !v)} aria-label={t.searchPlaceholder} aria-expanded={showMobileSearch} className="bfs-ghost" style={iconBtn(showMobileSearch)}>
              <Icon name="search" size={18} />
            </button>
          )}

          {[
            ...(compactBar ? [] : [
              { key: 'insight', icon: 'bulb', active: showInsight, onClick: () => setShowInsight(v => !v), title: t.navInsight, badge: null },
              { key: 'ai',      icon: 'cap',  active: showAIFloat, onClick: () => setShowAIFloat(v => !v), title: t.navAITutor, badge: null },
            ]),
            { key: 'watchlist', icon: 'star', active: showWatchlist, onClick: () => setShowWatchlist(v => !v), title: t.navWatchlist, badge: watchlistCount > 0 ? watchlistCount : null },
          ].map(({ key, icon, active, onClick, title, badge }) => (
            <div key={key} ref={key === 'watchlist' ? watchlistBtnRef : undefined} style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={onClick} title={title} aria-label={title} aria-pressed={active} className="bfs-ghost" style={iconBtn(active)}>
                <Icon name={icon} size={18} fill={key === 'watchlist' && watchlistCount > 0} />
              </button>
              {badge != null && (
                <div style={{
                  position: 'absolute', top: -2, right: -4,
                  background: 'var(--accent)', color: 'var(--accent-ink)',
                  fontSize: 13, fontWeight: 600, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
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

          {compactBar && (
            <div ref={mobileMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setShowMobileMenu(v => !v)} aria-label="Menu" aria-expanded={showMobileMenu} className="bfs-ghost" style={iconBtn(showMobileMenu)}>
                <Icon name="more" size={20} />
              </button>
              {showMobileMenu && (
                <div style={{ ...menuBox, minWidth: 210 }}>
                  <div style={{ padding: '6px 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {LANG_OPTIONS.map(({ code, label }) => (
                      <button
                        key={code}
                        onClick={() => pickLang(code, () => setShowMobileMenu(false))}
                        aria-pressed={lang === code}
                        style={{
                          padding: '6px 10px', borderRadius: 4, fontSize: 13, border: 'none', cursor: 'pointer',
                          background: lang === code ? 'var(--accent)' : 'var(--bg-tertiary)',
                          color: lang === code ? 'var(--accent-ink)' : 'var(--text-primary)',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { flipTheme(); setShowMobileMenu(false) }} className="bfs-menu-item" style={menuItem}>
                    <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} /><span>{theme === 'dark' ? t.lightMode : t.darkMode}</span>
                  </button>
                  <button onClick={() => { setShowInsight(v => !v); setShowMobileMenu(false) }} className="bfs-menu-item" style={menuItem}>
                    <Icon name="bulb" size={16} /><span>{t.navInsight}</span>
                  </button>
                  <button onClick={() => { setShowAIFloat(v => !v); setShowMobileMenu(false) }} className="bfs-menu-item" style={menuItem}>
                    <Icon name="cap" size={16} /><span>{t.navAITutor}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Account: the one action in the bar */}
          <div ref={userMenuRef} style={{ position: 'relative', flexShrink: 0, marginLeft: compactBar ? 2 : 8 }}>
            {user ? (
              <>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  title={user.email}
                  aria-expanded={showUserMenu}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: 'var(--accent)', color: 'var(--accent-ink)',
                    cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {(user.email?.[0] ?? '?').toUpperCase()}
                </button>
                {showUserMenu && (
                  <div style={{ ...menuBox, minWidth: 220 }}>
                    <div style={{ padding: '8px 16px 10px' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        {t.signedIn}
                        {role !== 'user' && <> · {(ROLE_LABELS[role] || ROLE_LABELS.admin)[lang] || (ROLE_LABELS[role] || ROLE_LABELS.admin).en}</>}
                      </div>
                    </div>
                    {role === 'admin' && (
                      <button onClick={() => { setShowUserMenu(false); navigate('/admin') }} className="bfs-menu-item" style={menuItem}>
                        {ADMIN_LINK[lang] || ADMIN_LINK.en}
                      </button>
                    )}
                    <button
                      onClick={async () => { setShowUserMenu(false); document.cookie = 'bfs_lang_hint=; path=/; max-age=0; SameSite=Lax'; await signOut() }}
                      className="bfs-menu-item"
                      style={{ ...menuItem, color: 'var(--red-bright)' }}
                    >
                      {t.signOut}
                    </button>
                  </div>
                )}
              </>
            ) : compactBar ? (
              <button onClick={() => setShowAuth(true)} aria-label={t.signIn} title={t.signIn} className="bfs-ghost" style={iconBtn(false)}>
                <Icon name="user" size={18} />
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)} className="bfs-primary" style={{ minHeight: 36, padding: '0 16px', fontSize: 14 }}>
                {t.signIn}
              </button>
            )}
          </div>

        </div>{/* end right-side controls */}

      </header>
      {/* Section tabs */}
      <nav
        aria-label="Sections"
        className="tab-bar"
        style={{
          padding: compactBar ? '0 8px' : '0 16px',
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          background: 'var(--bg-secondary)',
        }}
      >
        {[
          { key: 'analysis',     label: t.tabAnalysis },
          { key: 'screener',     label: t.tabScreener },
          { key: 'heatmap',      label: t.tabHeatmap },
          { key: 'news',         label: t.tabNews },
          { key: 'macro',        label: t.tabMacro },
          { key: 'bank_views',   label: t.tabBankViews },
          { key: 'paper',        label: t.tabPaper },
          { key: 'study',        label: t.tabStudy },
          { key: 'universities', label: t.tabUniversities },
          { key: 'career',       label: t.tabCareer },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={TAB_PATHS[key]}
            onClick={(e) => { e.preventDefault(); handleTabChange(key) }}
            aria-current={appTab === key ? 'page' : undefined}
            className={`bfs-nav-tab${appTab === key ? ' is-active' : ''}`}
            style={{
              padding: '12px 12px', textDecoration: 'none',
              fontSize: 14, fontWeight: appTab === key ? 500 : 400,
              color: appTab === key ? 'var(--text-primary)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {label}
          </a>
        ))}
        {!compactBar && (
          <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13, flexShrink: 0, padding: '0 12px 0 16px' }}>
            {t.dataSource}
          </div>
        )}
      </nav>
      </div>{/* end sticky bar */}

      <main style={{ padding: isMobile ? '12px 12px 0' : '20px 28px 0', flex: 1 }}>
        <ErrorBoundary key={appTab}>
        <Suspense fallback={<PageSkeleton />}>
          {appTab === 'study' ? (
            <StudyCenter lang={lang} />
          ) : appTab === 'paper' ? (
            <PaperTradingPanel lang={lang} onOpenAuth={() => setShowAuth(true)} />
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
            <MacroCalendarPage lang={lang} />
          ) : appTab === 'admin' ? (
            <AdminPage lang={lang} onOpenAuth={() => setShowAuth(true)} />
          ) : appTab === 'ai_teacher' ? (
            <AITeacherPage lang={lang} />
          ) : (
            <>
              {selectedSymbols.length === 0 && (
                <HomeHero lang={lang} market={market} onOpenAuth={() => setShowAuth(true)} onTabChange={handleTabChange} />
              )}
              {selectedSymbols.length === 0 && (
                <div className="bfs-enter-3"><ErrorBoundary fallback={null}>
                  {market === 'hk' || market === 'jp' ? <IntlMarketPanel lang={lang} market={market} /> : <USMarketPanel lang={lang} />}
                </ErrorBoundary></div>
              )}
              {selectedSymbols.length === 0 && (
                <div className="bfs-enter-4"><ErrorBoundary><GlobalSentiment lang={lang} /></ErrorBoundary></div>
              )}
              {selectedSymbols.length === 0 && (
                <ErrorBoundary fallback={null}><QuoteBanner lang={lang} /></ErrorBoundary>
              )}
              <div><ComparePanel onTabChange={handleTabChange} onOpenKnowledge={() => setShowInsight(true)} /></div>
            </>
          )}
        </Suspense>
        </ErrorBoundary>
      </main>

      {showStats && <StatsDisplay lang={lang} onClose={() => setShowStats(false)} />}
      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 80, right: 24, zIndex: 9998,
          background: 'var(--text-primary)', color: 'var(--bg-primary)',
          borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'bfsPageFadeIn 0.2s ease both',
          pointerEvents: 'none',
        }}>
          <Icon name="check" size={16} />
          {toast}
        </div>
      )}
      <Suspense fallback={null}>
        <AITeacherFloat lang={lang} open={showAIFloat} onClose={() => setShowAIFloat(false)} />
      </Suspense>
      {/* The close: one quiet line */}
      <footer className="bfs-footer" style={{ padding: isMobile ? '64px 16px 24px' : '96px 28px 28px', flexShrink: 0, fontSize: 14 }}>
        <span style={{ color: 'var(--text-secondary)' }}>Best Friend Stock · {FOOTER_WHAT[lang] || FOOTER_WHAT.en}</span>
        <span className="bfs-footer-links">
          <a href="mailto:billyl090119@gmail.com">{FOOTER_CONTACT[lang] || FOOTER_CONTACT.en}</a>
          <button onClick={() => setShowStats(true)}>{lang === 'zh' ? '访问统计' : 'Site stats'}</button>
          <a href="/privacy">{FOOTER_PRIVACY[lang] || FOOTER_PRIVACY.en}</a>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>{FOOTER_NOTE[lang] || FOOTER_NOTE.en}</span>
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
          [style*="bfsPageFadeIn"],
          [style*="bfsSkeletonPulse"] { animation: none !important; }
        }
      `}</style>
    </div>
    </>
  )
}
