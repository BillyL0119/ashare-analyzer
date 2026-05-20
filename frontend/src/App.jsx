import { useState, useEffect } from 'react'
import SearchBar from './components/SearchBar'
import ComparePanel from './components/ComparePanel'
import WelcomeModal from './components/WelcomeModal'
import Watchlist from './components/Watchlist'
import KnowledgeCard from './components/KnowledgeCard'
import PaperTradingPanel from './components/PaperTradingPanel'
import StudyCenter from './components/StudyCenter'
import StatsDisplay from './components/StatsDisplay'
import useCompareStore from './store/compareStore'
import useLangStore from './store/langStore'
import { T } from './i18n/translations'
import { useMobile } from './hooks/useMobile'
import { trackVisit, trackFeature } from './utils/analytics'

const ACCENT_BLUE = '#8ab4f8'
const ACCENT_PURPLE = '#c084fc'

export default function App() {
  const { startDate, endDate, setDateRange, market, setMarket } = useCompareStore()
  const { lang, setLang } = useLangStore()
  const t = T[lang]
  const isMobile = useMobile()
  const [appTab,    setAppTab]    = useState('analysis')  // 'analysis' | 'paper'
  const [showStats, setShowStats] = useState(false)

  // Track page visit once on mount
  useEffect(() => { trackVisit('home') }, [])

  const handleTabChange = (tab) => {
    setAppTab(tab)
    trackFeature(tab === 'paper' ? 'paper_trading' : 'analysis')
  }

  const dateInputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(138,180,248,0.18)',
    borderRadius: 8,
    color: '#e8eaed',
    padding: '5px 10px',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s',
    cursor: 'pointer',
  }

  return (
    <>
    <WelcomeModal onLangSelect={(lang) => setLang(lang)} />
    <Watchlist lang={lang} />
    <KnowledgeCard lang={lang} />
    <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(ellipse 55% 45% at 0% 0%, rgba(138,180,248,0.07) 0%, transparent 70%),
          radial-gradient(ellipse 50% 45% at 100% 100%, rgba(192,132,252,0.06) 0%, transparent 70%),
          #080c14
        `,
        color: '#e8eaed',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        letterSpacing: '0.15px',
      }}
    >
      {/* Glassmorphism header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(8, 12, 20, 0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(138,180,248,0.10)',
          padding: isMobile ? '8px 12px' : '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 8 : 18,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              boxShadow: `0 0 12px rgba(138,180,248,0.3)`,
            }}
          >
            📊
          </div>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              background: `linear-gradient(90deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.3px',
            }}
          >
            {t.appTitle}
          </span>
        </div>

        {/* Market toggle — pill style */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(138,180,248,0.12)',
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
                  ? `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`
                  : 'transparent',
                color: market === key ? '#fff' : '#9aa0a6',
                transition: 'all 0.2s ease',
                boxShadow: market === key ? `0 2px 12px rgba(138,180,248,0.25)` : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <SearchBar />

        {/* Date range — hidden on mobile (too cramped) */}
        <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9aa0a6' }}>
          <span>{t.from}</span>
          <input
            type="date"
            value={`${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`}
            onChange={(e) => setDateRange(e.target.value.replace(/-/g, ''), endDate)}
            style={dateInputStyle}
            onFocus={(e) => { e.target.style.borderColor = ACCENT_BLUE }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(138,180,248,0.18)' }}
          />
          <span>{t.to}</span>
          <input
            type="date"
            value={`${endDate.slice(0, 4)}-${endDate.slice(4, 6)}-${endDate.slice(6, 8)}`}
            onChange={(e) => setDateRange(startDate, e.target.value.replace(/-/g, ''))}
            style={dateInputStyle}
            onFocus={(e) => { e.target.style.borderColor = ACCENT_BLUE }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(138,180,248,0.18)' }}
          />
        </div>

        {/* Language toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(138,180,248,0.12)',
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
                background: lang === l ? `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})` : 'transparent',
                color: lang === l ? '#fff' : '#9aa0a6',
                transition: 'all 0.2s ease',
              }}
            >
              {l === 'zh' ? '中文' : 'EN'}
            </button>
          ))}
        </div>

        {/* App tab toggle */}
        <div
          style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(138,180,248,0.12)',
            borderRadius: 24, padding: 3, gap: 2,
          }}
        >
          {[
            { key: 'analysis', label: lang === 'zh' ? '行情分析' : 'Analysis' },
            { key: 'paper',    label: lang === 'zh' ? '模拟炒股' : 'Paper Trade' },
            { key: 'study',    label: lang === 'zh' ? '学习中心' : 'Study' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              style={{
                padding: '4px 13px', borderRadius: 20, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: appTab === key
                  ? `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`
                  : 'transparent',
                color: appTab === key ? '#fff' : '#9aa0a6',
                transition: 'all 0.2s ease', whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ color: '#4a5568', fontSize: 11, letterSpacing: '0.3px' }}>{t.dataSource}</div>
      </header>

      <main style={{ padding: isMobile ? '10px 12px' : '20px 24px', flex: 1 }}>
        {appTab === 'study' ? <StudyCenter lang={lang} /> : appTab === 'paper' ? <PaperTradingPanel lang={lang} /> : <ComparePanel onTabChange={handleTabChange} />}
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
    </div>
    </>
  )
}
