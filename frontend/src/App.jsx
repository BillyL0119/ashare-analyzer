import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import SplashScreen, { shouldShowSplash } from './components/SplashScreen'
import SearchBar from './components/SearchBar'
import ComparePanel from './components/ComparePanel'
import WelcomeModal from './components/WelcomeModal'
import Watchlist from './components/Watchlist'
import KnowledgeCard from './components/KnowledgeCard'
import GlobalSentiment from './components/GlobalSentiment'
import StatsDisplay from './components/StatsDisplay'
import QuoteBanner from './components/QuoteBanner'

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

export default function App() {
  const { market, setMarket, selectedSymbols } = useCompareStore()
  const { lang, setLang } = useLangStore()
  const { theme, toggleTheme } = useThemeStore()
  const t = T[lang]
  const isMobile = useMobile()
  const [appTab,       setAppTab]       = useState('analysis')
  const [showStats,     setShowStats]     = useState(false)
  const [scrolled,      setScrolled]      = useState(false)
  const [showInsight,   setShowInsight]   = useState(false)
  const [showAIFloat,   setShowAIFloat]   = useState(false)
  const [showWatchlist, setShowWatchlist] = useState(false)
  const watchlistCount = useWatchlistStore((s) => s.list.length)
  const watchlistBtnRef = useRef(null)

  // Splash screen — computed once at mount, stable for this session
  const [hadSplash]      = useState(shouldShowSplash)
  const [splashActive,   setSplashActive]   = useState(hadSplash)
  const [contentVisible, setContentVisible] = useState(!hadSplash)

  // Track page visit once on mount
  useEffect(() => { trackVisit('home') }, [])

  // Auto-open Daily Insight once per day
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const seen = localStorage.getItem('bfs_knowledge_date')
    if (seen !== todayStr) {
      setShowInsight(true)
      localStorage.setItem('bfs_knowledge_date', todayStr)
    }
  }, [])

  // Scroll-aware header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Update document title and canonical on tab change for SEO
  useEffect(() => {
    const titles = {
      analysis:     'Best Friend Stock | 免费A股美股分析 · AI智能投资 · 模拟炒股 · 经济学学习',
      news:         'Best Friend Stock | 每日大事件 - 市场重大新闻',
      paper:        'Best Friend Stock | 模拟炒股 - 100万虚拟资金T+1练习',
      study:        'Best Friend Stock | 经济学学习中心 - A-Level IB AP IGCSE',
      universities: 'Best Friend Stock | 全球商学院指南 - 90+顶尖商学院数据库',
    }
    document.title = titles[appTab] || titles.analysis
    let canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) {
      const paths = { universities: '/universities' }
      canonical.setAttribute('href', 'https://bestfriendstock.com' + (paths[appTab] || '/'))
    }
  }, [appTab])

  const handleTabChange = (tab) => {
    setAppTab(tab)
    if (tab === 'paper') trackFeature('paper_trading')
    else if (tab === 'study') trackFeature('study')
    else if (tab === 'universities') trackFeature('universities')
    else trackFeature('analysis')
  }

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
        would break their viewport positioning. They are revealed naturally
        as the splash overlay fades out. */}
    <WelcomeModal onLangSelect={(lang) => setLang(lang)} />
    <KnowledgeCard lang={lang} open={showInsight} onClose={() => setShowInsight(false)} />
    <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(ellipse 55% 45% at 0% 0%, rgba(14,165,233,0.06) 0%, transparent 70%),
          radial-gradient(ellipse 50% 45% at 100% 100%, rgba(139,92,246,0.05) 0%, transparent 70%),
          var(--bg-primary)
        `,
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
      {/* Glassmorphism header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: scrolled ? 'var(--nav-bg)' : 'var(--nav-bg-dim)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: 'none',
          boxShadow: scrolled ? (theme === 'light' ? '0 1px 4px rgba(0,0,0,0.12)' : '0 1px 32px rgba(0,0,0,0.6)') : 'none',
          padding: isMobile ? '8px 12px' : '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 8 : 18,
          flexShrink: 0,
          flexWrap: 'wrap',
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
            style={{
              height: 40,
              width: 'auto',
              filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none',
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.2px' }}>
            Best Friend Stock
          </span>
        </div>

        {/* Market toggle — pill style */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 24,
            padding: 3,
            gap: 2,
          }}
        >
          {[{ key: 'cn', label: t.marketCN }, { key: 'us', label: t.marketUS }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMarket(key)}
              style={{
                padding: '5px 16px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.2px',
                background: market === key
                  ? 'linear-gradient(135deg, var(--accent-blue), #38bdf8)'
                  : 'transparent',
                color: market === key ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
                boxShadow: market === key ? `0 2px 12px rgba(14,165,233,0.3)` : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <SearchBar />

        {/* Language toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 24,
            padding: 3,
            marginLeft: 'auto',
            gap: 2,
          }}
        >
          {['zh', 'en'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: lang === l ? ACCENT_BLUE : 'transparent',
                color: lang === l ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
              }}
            >
              {l === 'zh' ? '中文' : 'EN'}
            </button>
          ))}
        </div>

        {/* ☀️/🌙 Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? (lang === 'zh' ? '切换浅色模式' : 'Light mode') : (lang === 'zh' ? '切换深色模式' : 'Dark mode')}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            border: '1px solid var(--border-primary)',
            background: 'transparent',
            cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* 💡 Daily Insight + 🎓 AI Tutor + ⭐ Watchlist navbar buttons */}
        {[
          { key: 'insight',   icon: '💡', active: showInsight,   onClick: () => setShowInsight(v => !v),   title: lang === 'zh' ? '每日知识' : 'Daily Insight', badge: null },
          { key: 'ai',        icon: '🎓', active: showAIFloat,   onClick: () => setShowAIFloat(v => !v),   title: lang === 'zh' ? 'AI 老师'  : 'AI Tutor',     badge: null },
          { key: 'watchlist', icon: '⭐', active: showWatchlist, onClick: () => setShowWatchlist(v => !v), title: lang === 'zh' ? '收藏夹'   : 'Watchlist',     badge: watchlistCount > 0 ? watchlistCount : null },
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.boxShadow = '0 0 12px rgba(14,165,233,0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = active ? 'rgba(14,165,233,0.15)' : 'transparent'
                e.currentTarget.style.boxShadow = active ? '0 0 10px rgba(14,165,233,0.25)' : 'none'
              }}
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

        {/* App tab toggle */}
        <div
          className="tab-bar"
          style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 24, padding: 3, gap: 2,
            overflowX: 'auto', flexWrap: 'nowrap', flexShrink: 1,
          }}
        >
          {[
            { key: 'analysis',      label: lang === 'zh' ? '行情分析' : 'Analysis' },
            { key: 'news',          label: lang === 'zh' ? '每日新闻' : 'Daily News' },
            { key: 'bank_views',    label: lang === 'zh' ? '大行观点' : 'Bank Views' },
            { key: 'paper',         label: lang === 'zh' ? '模拟炒股' : 'Paper Trade' },
            { key: 'study',         label: lang === 'zh' ? '学习中心' : 'Study' },
            { key: 'universities',  label: lang === 'zh' ? '大学推荐' : 'Universities' },
            { key: 'career',        label: lang === 'zh' ? '求职指南' : 'Career Guide' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`bfs-nav-tab${appTab === key ? ' is-active' : ''}`}
              style={{
                padding: '4px 13px', borderRadius: 6, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: appTab === key ? 600 : 400,
                background: 'transparent',
                color: appTab === key ? '#0ea5e9' : 'var(--text-secondary)',
                transition: 'color 0.2s ease', whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.3px' }}>{t.dataSource}</div>
      </header>
      {/* Gradient nav border line */}
      <div style={{
        height: 1, flexShrink: 0,
        background: 'linear-gradient(90deg, transparent, var(--border-primary) 20%, var(--border-glow) 50%, var(--border-primary) 80%, transparent)',
      }} />

      <main style={{ padding: isMobile ? '2px 12px' : '2px 24px', flex: 1 }}>
        <Suspense fallback={null}>
          {appTab === 'study' ? (
            <StudyCenter lang={lang} />
          ) : appTab === 'paper' ? (
            <PaperTradingPanel lang={lang} />
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
          {lang === 'zh' ? '有问题请联系：billyl090119@gmail.com' : 'Contact: billyl090119@gmail.com'}
        </a>
      </footer>

      <style>{`
        @keyframes bfsPageFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="bfsPageFadeIn"] { animation: none !important; }
        }
      `}</style>
    </div>
    </>
  )
}
