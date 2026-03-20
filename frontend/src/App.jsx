import SearchBar from './components/SearchBar'
import ComparePanel from './components/ComparePanel'
import useCompareStore from './store/compareStore'
import useLangStore from './store/langStore'
import { T } from './i18n/translations'
import { THEME } from './utils/chartHelpers'

export default function App() {
  const { startDate, endDate, setDateRange } = useCompareStore()
  const { lang, setLang } = useLangStore()
  const t = T[lang]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: THEME.bg,
        color: THEME.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          background: '#161b22',
          borderBottom: `1px solid ${THEME.border}`,
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3' }}>{t.appTitle}</span>
        </div>

        <SearchBar />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ color: '#8b949e' }}>{t.from}</span>
          <input
            type="date"
            value={`${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`}
            onChange={(e) => {
              const d = e.target.value.replace(/-/g, '')
              setDateRange(d, endDate)
            }}
            style={{
              background: '#21262d',
              border: `1px solid ${THEME.border}`,
              borderRadius: 4,
              color: THEME.text,
              padding: '4px 8px',
              fontSize: 13,
            }}
          />
          <span style={{ color: '#8b949e' }}>{t.to}</span>
          <input
            type="date"
            value={`${endDate.slice(0, 4)}-${endDate.slice(4, 6)}-${endDate.slice(6, 8)}`}
            onChange={(e) => {
              const d = e.target.value.replace(/-/g, '')
              setDateRange(startDate, d)
            }}
            style={{
              background: '#21262d',
              border: `1px solid ${THEME.border}`,
              borderRadius: 4,
              color: THEME.text,
              padding: '4px 8px',
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginLeft: 'auto' }}>
          {['zh', 'en'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: '4px 10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                background: lang === l ? '#1f6feb' : 'transparent',
                color: lang === l ? '#fff' : '#8b949e',
                borderRadius: 4,
                transition: 'all 0.15s',
              }}
            >
              {l === 'zh' ? '中文' : 'EN'}
            </button>
          ))}
        </div>

        <div style={{ color: '#484f58', fontSize: 12 }}>{t.dataSource}</div>
      </header>

      <main style={{ padding: '16px 20px' }}>
        <ComparePanel />
      </main>
    </div>
  )
}
