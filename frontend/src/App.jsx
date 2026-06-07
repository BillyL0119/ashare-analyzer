import { useState, useEffect, lazy, Suspense } from 'react'
import SearchBar from './components/SearchBar'
import ComparePanel from './components/ComparePanel'
import WelcomeModal from './components/WelcomeModal'
import Watchlist from './components/Watchlist'
import KnowledgeCard from './components/KnowledgeCard'
import GlobalSentiment from './components/GlobalSentiment'
import StatsDisplay from './components/StatsDisplay'
import DailyReport from './components/DailyReport'

const PaperTradingPanel  = lazy(() => import('./components/PaperTradingPanel'))
const StudyCenter        = lazy(() => import('./components/StudyCenter'))
const AITeacherFloat     = lazy(() => import('./components/AITeacherFloat'))
const AITeacherPage      = lazy(() => import('./components/AITeacherPage'))
const UniversitiesPage   = lazy(() => import('./components/UniversitiesPage'))
import useCompareStore from './store/compareStore'
import useLangStore from './store/langStore'
import useThemeStore from './store/themeStore'
import { T } from './i18n/translations'
import { useMobile } from './hooks/useMobile'
import { trackVisit, trackFeature } from './utils/analytics'

const ACCENT_BLUE = '#0ea5e9'
const ACCENT_PURPLE = '#8b5cf6'

export default function App() {
  const { startDate, endDate, setDateRange, market, setMarket, selectedSymbols } = useCompareStore()
  const { lang, setLang } = useLangStore()
  const { theme, toggleTheme } = useThemeStore()
  const t = T[lang]
  const isMobile = useMobile()
  const [appTab,       setAppTab]       = useState('analysis')
  const [showStats,    setShowStats]    = useState(false)
  const [scrolled,     setScrolled]     = useState(false)
  const [showInsight,  setShowInsight]  = useState(false)
  const [showAIFloat,  setShowAIFloat]  = useState(false)

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

  const handleTabChange = (tab) => {
    setAppTab(tab)
    if (tab === 'paper') trackFeature('paper_trading')
    else if (tab === 'study') trackFeature('study')
    else if (tab === 'universities') trackFeature('universities')
    else trackFeature('analysis')
  }

  const dateInputStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    padding: '5px 10px',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  }

  return (
    <>
    <WelcomeModal onLangSelect={(lang) => setLang(lang)} />
    <Watchlist lang={lang} />
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
        animation: 'bfsPageFadeIn 0.35s ease both',
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
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="Best Friend Stock"
            style={{
              height: 32,
              width: 'auto',
              filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none',
            }}
          />
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

        {/* Date range — hidden on mobile (too cramped) */}
        <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>{t.from}</span>
          <input
            type="date"
            value={`${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`}
            onChange={(e) => setDateRange(e.target.value.replace(/-/g, ''), endDate)}
            style={dateInputStyle}
            onFocus={(e) => { e.target.style.borderColor = ACCENT_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.15)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-primary)'; e.target.style.boxShadow = 'none' }}
          />
          <span>{t.to}</span>
          <input
            type="date"
            value={`${endDate.slice(0, 4)}-${endDate.slice(4, 6)}-${endDate.slice(6, 8)}`}
            onChange={(e) => setDateRange(startDate, e.target.value.replace(/-/g, ''))}
            style={dateInputStyle}
            onFocus={(e) => { e.target.style.borderColor = ACCENT_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.15)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-primary)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

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

        {/* 💡 Daily Insight + 🎓 AI Tutor navbar buttons */}
        {[
          { key: 'insight', icon: '💡', active: showInsight, onClick: () => setShowInsight(v => !v), title: lang === 'zh' ? '每日知识' : 'Daily Insight' },
          { key: 'ai',      icon: '🎓', active: showAIFloat, onClick: () => setShowAIFloat(v => !v), title: lang === 'zh' ? 'AI 老师'  : 'AI Tutor' },
        ].map(({ key, icon, active, onClick, title }) => (
          <button
            key={key}
            onClick={onClick}
            title={title}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              border: `1px solid ${active ? '#0ea5e9' : 'var(--border-primary)'}`,
              background: active ? 'rgba(14,165,233,0.15)' : 'transparent',
              cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease', flexShrink: 0,
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
            { key: 'paper',         label: lang === 'zh' ? '模拟炒股' : 'Paper Trade' },
            { key: 'study',         label: lang === 'zh' ? '学习中心' : 'Study' },
            { key: 'ai_teacher',    label: lang === 'zh' ? 'AI老师' : 'AI Tutor' },
            { key: 'universities',  label: lang === 'zh' ? '大学推荐' : 'Universities' },
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
          ) : appTab === 'ai_teacher' ? (
            <AITeacherPage lang={lang} />
          ) : appTab === 'universities' ? (
            <UniversitiesPage lang={lang} />
          ) : (
            <>
              {selectedSymbols.length === 0 && (
                <div className="bfs-enter-1"><DailyReport lang={lang} /></div>
              )}
              {selectedSymbols.length === 0 && (
                <div className="bfs-enter-2"><GlobalSentiment lang={lang} /></div>
              )}
              <div className="bfs-enter-3"><ComparePanel onTabChange={handleTabChange} /></div>
            </>
          )}
        </Suspense>
      </main>

      {/* Hidden stats entry — bottom left corner */}
      <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 800 }}>
        <button
          onClick={() => setShowStats(true)}
          style={{
            background: 'rgba(22,27,46,0.9)',
            border: '0.5px solid rgba(138,180,248,0.2)',
            borderRadius: 20,
            padding: '6px 12px',
            fontSize: 12,
            color: 'rgba(232,234,240,0.4)',
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
