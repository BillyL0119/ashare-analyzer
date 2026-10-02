import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LiquidBackground from './components/LiquidBackground'
import SplashScreen, { shouldShowSplash } from './components/SplashScreen'
import SearchBar from './components/SearchBar'
import ComparePanel from './components/ComparePanel'
import WelcomeModal from './components/WelcomeModal'
import Watchlist from './components/Watchlist'
import KnowledgeCard from './components/KnowledgeCard'
import GlobalSentiment from './components/GlobalSentiment'
import StatsDisplay from './components/StatsDisplay'
import QuoteBanner from './components/QuoteBanner'
import AuthModal from './components/AuthModal'
import useAuthStore from './store/authStore'

const PaperTradingPanel  = lazy(() => import('./components/PaperTradingPanel'))
const StudyCenter        = lazy(() => import('./components/StudyCenter'))
const AITeacherFloat     = lazy(() => import('./components/AITeacherFloat'))
const UniversitiesPage   = lazy(() => import('./components/UniversitiesPage'))
const DailyNewsPage      = lazy(() => import('./components/DailyNewsPage'))
const BankViewsPage      = lazy(() => import('./components/BankViewsPage'))
const CareerGuidePage    = lazy(() => import('./components/CareerGuidePage'))
import useCompareStore from './store/compareStore'
import useLangStore from './store/langStore'
import useThemeStore from './store/themeStore'
import useWatchlistStore from './store/watchlistStore'
import { T } from './i18n/translations'
import { useMobile } from './hooks/useMobile'
import { trackVisit, trackFeature } from './utils/analytics'

const ACCENT_BLUE = '#0ea5e9'

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
  news:         '/news',
  paper:        '/paper',
  study:        '/study',
  universities: '/universities',
  bank_views:   '/bank_views',
  career:       '/career',
}
const PATH_TABS = Object.fromEntries(Object.entries(TAB_PATHS).map(([k, v]) => [v, k]))

const LANG_OPTIONS = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'FR' },
]

export default function App() {
  const { market, setMarket, selectedSymbols, switchMarketAndAddSymbol } = useCompareStore()
  const { lang, setLang } = useLangStore()
  const { theme, toggleTheme, setTheme } = useThemeStore()
  const { user, loading: authLoading, init: initAuth, signOut,
          setLangPreference, setThemePreference, setKnowledgeDateSeen,
          setWatchlistPreference } = useAuthStore()
  const t = T[lang]
  const isMobile = useMobile()
  const location = useLocation()
  const navigate  = useNavigate()
  // Derive active tab from URL — no state needed
  const stockRouteMatch = location.pathname.match(/^\/stock\/(\w+)\/(.+)$/)
  const studyRouteMatch = location.pathname.match(/^\/study\/(\w+)$/)
  const appTab = stockRouteMatch ? 'analysis'
    : studyRouteMatch ? 'study'
    : (PATH_TABS[location.pathname] || 'analysis')
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
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200) }
  const watchlist      = useWatchlistStore((s) => s.list)
  const watchlistCount = watchlist.length
  const setWatchlistList = useWatchlistStore((s) => s.setList)
  const watchlistBtnRef   = useRef(null)
  const langDropdownRef   = useRef(null)
  const userMenuRef       = useRef(null)
  const mobileMenuRef     = useRef(null)
  const insightCheckedRef = useRef(false)
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

  // Auto-open Daily Insight once per day.
  // Logged-in users: check/save against account metadata so it syncs across devices.
  // Guests: fall back to localStorage.
  useEffect(() => {
    if (authLoading) return // wait until we know if user is logged in
    if (insightCheckedRef.current) return
    insightCheckedRef.current = true

    const todayStr = new Date().toISOString().slice(0, 10)
    if (user) {
      if (user.user_metadata?.knowledge_date !== todayStr) {
        setShowInsight(true)
        setKnowledgeDateSeen(todayStr)
      }
    } else {
      const seen = localStorage.getItem('bfs_knowledge_date')
      if (seen !== todayStr) {
        setShowInsight(true)
        localStorage.setItem('bfs_knowledge_date', todayStr)
      }
    }
  }, [authLoading, user]) // eslint-disable-line

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
    if (appTab === 'analysis' && selectedSymbols.length > 0) {
      const label = selectedSymbols.length === 1
        ? `${selectedSymbols[0].name || selectedSymbols[0].code} (${selectedSymbols[0].code})`
        : selectedSymbols.map(s => s.code).join(' vs ')
      document.title = `${label} | Best Friend Stock`
      return
    }
    const titles = {
      analysis:     'Best Friend Stock | 免费A股美股分析 · AI智能投资 · 模拟炒股 · 经济学学习',
      news:         'Best Friend Stock | 每日大事件 - 市场重大新闻',
      paper:        'Best Friend Stock | 模拟炒股 - 100万虚拟资金T+1练习',
      study:        'Best Friend Stock | 经济学学习中心 - A-Level IB AP IGCSE',
      universities: 'Best Friend Stock | 全球商学院指南 - 90+顶尖商学院数据库',
      bank_views:   'Best Friend Stock | 大行观点 - 顶级投行研究报告',
      career:       'Best Friend Stock | 求职指南 - 金融行业职业规划',
    }
    document.title = titles[appTab] || titles.analysis
    let canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) {
      canonical.setAttribute('href', 'https://bestfriendstock.com' + location.pathname)
    }
  }, [appTab, selectedSymbols, location.pathname]) // eslint-disable-line

  // On mount: if URL is /stock/:market/:code, auto-load that stock
  useEffect(() => {
    if (stockRouteMatch) {
      const [, urlMarket, urlCode] = stockRouteMatch
      if ((urlMarket === 'cn' || urlMarket === 'us') && selectedSymbols.length === 0) {
        switchMarketAndAddSymbol(urlMarket, { code: urlCode.toUpperCase(), name: urlCode.toUpperCase() })
      }
    }
  }, []) // eslint-disable-line

  // Keep URL in sync as stocks are selected / removed (replace to avoid cluttering history)
  useEffect(() => {
    if (appTab !== 'analysis') return
    if (selectedSymbols.length > 0) {
      const s = selectedSymbols[0]
      navigate(`/stock/${market}/${s.code}`, { replace: true })
    } else if (location.pathname !== '/') {
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

  return (
    <>
    {/* Liquid background — fixed layer, sits below all content (z-index:0) */}
    <LiquidBackground />
    {/* Splash screen — renders above everything, unmounts after animation */}
    {splashActive && (
      <SplashScreen
        onContentVisible={() => setContentVisible(true)}
        onDone={() => setSplashActive(false)}
      />
    )}
    {/* WelcomeModal and KnowledgeCard stay outside the opacity wrapper
        because they are position:fixed — wrapping them in an opacity<1 div
        would break their viewport positioning. They are revealed naturally
        as the splash overlay fades out. */}
    <WelcomeModal onLangSelect={(lang) => setLang(lang)} />
    <KnowledgeCard lang={lang} open={showInsight} onClose={() => setShowInsight(false)} />
    <AuthModal open={showAuth} onClose={() => setShowAuth(false)} lang={lang} />
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        background: 'transparent',
        color: 'var(--text-primary)',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        letterSpacing: '0.15px',
        // When splash plays: opacity transition for seamless cross-fade.
        // Without splash: keep the original bfsPageFadeIn animation.
        ...(hadSplash ? {
          opacity: contentVisible ? 1 : 0,
          transition: 'opacity 0.45s ease',
        } : {
          animation: 'bfsPageFadeIn 0.35s ease both',
        }),
      }}
    >
      {/* Sticky nav wrapper — primary header + secondary tab bar scroll together */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
      {/* Glassmorphism header */}
      <header
        style={{
          background: scrolled ? 'var(--nav-bg)' : 'var(--nav-bg-dim)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: 'none',
          boxShadow: scrolled ? (theme === 'light' ? '0 1px 4px rgba(0,0,0,0.12)' : '0 1px 32px rgba(0,0,0,0.6)') : 'none',
          padding: isMobile ? '8px 12px' : '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 8 : 18,
          flexWrap: 'nowrap',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Logo */}
        <div
          onClick={() => handleTabChange('analysis')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, cursor: 'pointer', opacity: 1, transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.72'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <img
            src="/logo-dark.png"
            alt="Best Friend Stock"
            style={{ height: 40, width: 'auto', filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none' }}
          />
          {!isMobile && (
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.2px' }}>
              Best Friend Stock
            </span>
          )}
        </div>

        {/* Market toggle — pill style */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 24, padding: 3, gap: 2, flexShrink: 0 }}>
          {[{ key: 'cn', label: t.marketCN }, { key: 'us', label: t.marketUS }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMarket(key)}
              style={{
                padding: isMobile ? '4px 10px' : '5px 16px',
                borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 11 : 13, fontWeight: 600, letterSpacing: '0.2px',
                background: market === key ? 'linear-gradient(135deg, var(--accent-blue), #38bdf8)' : 'transparent',
                color: market === key ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
                boxShadow: market === key ? '0 2px 12px rgba(14,165,233,0.3)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <SearchBar />

        {/* Right-side controls pushed to the far right */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, flexShrink: 0 }}>

          {/* Language dropdown — desktop only */}
          {!isMobile && (
            <div ref={langDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowLangDropdown(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 12px', borderRadius: 20,
                  border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)', transition: 'all 0.2s ease', whiteSpace: 'nowrap',
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
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '4px 0',
                    animation: 'bfsPageFadeIn 0.15s ease both',
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
                          localStorage.setItem('bfs_lang', code)
                        }
                      }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 16px', background: lang === code ? 'rgba(14,165,233,0.1)' : 'none',
                        border: 'none', cursor: 'pointer', fontSize: 13,
                        fontWeight: lang === code ? 600 : 400,
                        color: lang === code ? '#0ea5e9' : 'var(--text-primary)',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { if (lang !== code) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = lang === code ? 'rgba(14,165,233,0.1)' : 'none' }}
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
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: '1px solid var(--border-primary)', background: 'transparent',
                cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease', flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}

          {/* 💡 Daily Insight + 🎓 AI Tutor (desktop only) + ⭐ Watchlist (always) */}
          {[
            ...(isMobile ? [] : [
              { key: 'insight',   icon: '💡', active: showInsight,   onClick: () => setShowInsight(v => !v),   title: t.navInsight,   badge: null },
              { key: 'ai',        icon: '🎓', active: showAIFloat,   onClick: () => setShowAIFloat(v => !v),   title: t.navAITutor,   badge: null },
            ]),
            { key: 'watchlist', icon: '⭐', active: showWatchlist, onClick: () => setShowWatchlist(v => !v), title: t.navWatchlist, badge: watchlistCount > 0 ? watchlistCount : null },
          ].map(({ key, icon, active, onClick, title, badge }) => (
            <div key={key} ref={key === 'watchlist' ? watchlistBtnRef : undefined} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={onClick}
                title={title}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  border: `1px solid ${active ? '#0ea5e9' : 'var(--border-primary)'}`,
                  background: active ? 'rgba(14,165,233,0.15)' : 'transparent',
                  cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 0 10px rgba(14,165,233,0.25)' : 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(14,165,233,0.5)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(14,165,233,0.15)' : 'transparent'; e.currentTarget.style.boxShadow = active ? '0 0 10px rgba(14,165,233,0.25)' : 'none' }}
              >
                {icon}
              </button>
              {badge != null && (
                <div style={{
                  position: 'absolute', top: -4, right: -4,
                  background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                  color: '#fff', fontSize: 9, fontWeight: 700,
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
                  border: `1px solid ${showMobileMenu ? '#0ea5e9' : 'var(--border-primary)'}`,
                  background: showMobileMenu ? 'rgba(14,165,233,0.15)' : 'transparent',
                  cursor: 'pointer', fontSize: 18, letterSpacing: '-2px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = showMobileMenu ? 'rgba(14,165,233,0.15)' : 'transparent' }}
              >
                •••
              </button>
              {showMobileMenu && (
                <div
                  style={{
                    position: 'absolute', top: 40, right: 0,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    borderRadius: 12, minWidth: 190, zIndex: 9000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.45)', padding: '8px 0',
                    animation: 'bfsPageFadeIn 0.15s ease both',
                  }}
                >
                  {/* Language chips */}
                  <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid var(--border-primary)', marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Language</div>
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
                              localStorage.setItem('bfs_lang', code)
                            }
                          }}
                          style={{
                            padding: '4px 8px', borderRadius: 6, fontSize: 11,
                            background: lang === code ? 'rgba(14,165,233,0.15)' : 'var(--bg-tertiary)',
                            border: `1px solid ${lang === code ? 'rgba(14,165,233,0.4)' : 'var(--border-primary)'}`,
                            cursor: 'pointer', fontWeight: lang === code ? 700 : 400,
                            color: lang === code ? '#0ea5e9' : 'var(--text-primary)',
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
                    <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                    <span>{theme === 'dark' ? t.lightMode : t.darkMode}</span>
                  </button>
                  {/* Daily Insight */}
                  <button
                    onClick={() => { setShowInsight(v => !v); setShowMobileMenu(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <span>💡</span><span>{t.navInsight}</span>
                  </button>
                  {/* AI Tutor */}
                  <button
                    onClick={() => { setShowAIFloat(v => !v); setShowMobileMenu(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <span>🎓</span><span>{t.navAITutor}</span>
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
                    width: 34, height: 34, borderRadius: '50%',
                    border: '1px solid rgba(14,165,233,0.4)',
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2))',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2))' }}
                >
                  {(user.email?.[0] ?? '?').toUpperCase()}
                </button>
                {showUserMenu && (
                  <div
                    style={{
                      position: 'absolute', top: 40, right: 0,
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                      borderRadius: 10, minWidth: 200, zIndex: 9000,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '8px 0',
                      animation: 'bfsPageFadeIn 0.15s ease both',
                    }}
                  >
                    <div style={{ padding: '8px 16px 10px', borderBottom: '1px solid var(--border-primary)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.signedIn}</div>
                    </div>
                    <button
                      onClick={async () => { setShowUserMenu(false); document.cookie = 'bfs_lang_hint=; path=/; max-age=0; SameSite=Lax'; await signOut() }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef5350', transition: 'background 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    >
                      {t.signOut}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(14,165,233,0.35)',
                  background: 'rgba(14,165,233,0.08)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#0ea5e9',
                  whiteSpace: 'nowrap', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.08)' }}
              >
                {t.signIn}
              </button>
            )}
          </div>

        </div>{/* end right-side controls */}

      </header>
      {/* Gradient nav border line */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, var(--border-primary) 20%, var(--border-glow) 50%, var(--border-primary) 80%, transparent)',
      }} />
      {/* Secondary tab nav */}
      <div
        style={{
          background: scrolled ? 'var(--nav-bg)' : 'var(--nav-bg-dim)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: isMobile ? '0 12px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: '1px solid var(--border-primary)',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'analysis',     label: t.tabAnalysis },
          { key: 'news',         label: t.tabNews },
          { key: 'bank_views',   label: t.tabBankViews },
          { key: 'paper',        label: t.tabPaper },
          { key: 'study',        label: t.tabStudy },
          { key: 'universities', label: t.tabUniversities },
          { key: 'career',       label: t.tabCareer },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`bfs-nav-tab${appTab === key ? ' is-active' : ''}`}
            style={{
              padding: '8px 14px', border: 'none', borderBottom: appTab === key ? '2px solid #0ea5e9' : '2px solid transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: appTab === key ? 600 : 400,
              background: 'transparent',
              color: appTab === key ? '#0ea5e9' : 'var(--text-secondary)',
              transition: 'color 0.15s ease, border-color 0.15s ease',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.3px', flexShrink: 0, paddingLeft: 16 }}>
          {t.dataSource}
        </div>
      </div>
      </div>{/* end sticky nav wrapper */}

      <main style={{ padding: isMobile ? '2px 12px' : '2px 24px', flex: 1 }}>
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
          ) : (
            <>
              {selectedSymbols.length === 0 && (
                <div className="bfs-enter-1"><QuoteBanner lang={lang} /></div>
              )}
              {selectedSymbols.length === 0 && (
                <div className="bfs-enter-2"><GlobalSentiment lang={lang} /></div>
              )}
              <div className="bfs-enter-3"><ComparePanel onTabChange={handleTabChange} onOpenKnowledge={() => setShowInsight(true)} /></div>
            </>
          )}
        </Suspense>
      </main>

      {/* Hidden stats entry — bottom left corner */}
      <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 800 }}>
        <button
          onClick={() => setShowStats(true)}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 20,
            padding: '6px 12px',
            fontSize: 12,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          📊
        </button>
      </div>

      {showStats && <StatsDisplay lang={lang} onClose={() => setShowStats(false)} />}
      {/* Toast notification for saved preferences */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, right: 24, zIndex: 9998,
          background: 'var(--bg-secondary)', border: '1px solid rgba(52,211,153,0.35)',
          borderRadius: 8, padding: '8px 14px', fontSize: 13,
          color: 'var(--text-primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'bfsPageFadeIn 0.2s ease both',
          pointerEvents: 'none',
        }}>
          <span style={{ color: '#34d399', fontSize: 15, lineHeight: 1 }}>✓</span>
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
        <a
          href="mailto:billyl090119@gmail.com"
          style={{ color: '#9ca3af', textDecoration: 'none' }}
        >
          {t.contactLink}
        </a>
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
          [style*="bfsSkeletonPulse"] { animation: none !important; opacity: 0.5 !important; }
        }
      `}</style>
    </div>
    </>
  )
}
