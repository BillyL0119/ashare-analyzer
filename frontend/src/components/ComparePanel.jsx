import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { useMobile } from '../hooks/useMobile'
import StockCard from './StockCard'
import { useStockData } from '../hooks/useStockData'
import { buildOverlayOption, THEME } from '../utils/chartHelpers'
import useThemeStore from '../store/themeStore'
import AnalysisPanel from './AnalysisPanel'
import MonteCarloPanel from './MonteCarloPanel'
import FactorPanel from './FactorPanel'
import FinancialPanel from './FinancialPanel'
import SimilarPanel from './SimilarPanel'
import NewsPanel from './NewsPanel'
import RadarPanel from './RadarPanel'
import MarketOverview from './MarketOverview'
import CalendarPanel from './CalendarPanel'
import EarningsPanel from './EarningsPanel'
import StockDetailPage from './StockDetailPage'
import ScorePanel from './ScorePanel'
import BacktestPanel from './BacktestPanel'
import GlobalNewsPanel from './GlobalNewsPanel'
import CommentsPanel from './CommentsPanel'
import SectorRotation from './SectorRotation'

function OverlaySlot({ stock, onData }) {
  const { period, startDate, endDate, adjust, market } = useCompareStore()
  const { data } = useStockData(stock.code, { period, startDate, endDate, adjust, market })

  useEffect(() => {
    onData(stock.code, data)
  }, [data, stock.code, onData])

  return null
}

function OverlayView({ lang }) {
  useThemeStore((s) => s.theme) // re-render on theme toggle
  const { selectedSymbols } = useCompareStore()
  const t = T[lang]
  const [dataMap, setDataMap] = useState({})

  const handleData = (code, data) => {
    setDataMap((prev) => ({ ...prev, [code]: data }))
  }

  const allLoaded = selectedSymbols.length > 0 &&
    selectedSymbols.every((s) => dataMap[s.code])

  const symbolsData = allLoaded
    ? selectedSymbols.map((s) => ({
        symbol: s.code,
        name: s.name,
        candles: dataMap[s.code].candles,
      }))
    : []

  return (
    <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 12 }}>
      {selectedSymbols.map((s) => (
        <OverlaySlot key={s.code} stock={s} onData={handleData} />
      ))}

      <div style={{ color: THEME.text, fontSize: 14, marginBottom: 8 }}>
        {t.overlayTitle}
      </div>

      {!allLoaded ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-muted)' }}>
          {t.loading}
        </div>
      ) : (
        <ReactECharts
          option={buildOverlayOption(symbolsData, lang)}
          style={{ height: 480, width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
        />
      )}
    </div>
  )
}

export default function ComparePanel({ onTabChange }) {
  useThemeStore((s) => s.theme) // re-render on theme toggle
  const { selectedSymbols, viewMode, setViewMode, addSymbol, market } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const isMobile = useMobile()
  const [detailSymbol, setDetailSymbol] = useState(null)
  const [detailName,   setDetailName]   = useState(null)

  const openDetail = (code, name) => { setDetailSymbol(code); setDetailName(name) }
  const closeDetail = () => { setDetailSymbol(null); setDetailName(null) }
  const handleLoadMain = (code, name) => {
    closeDetail()
    addSymbol({ code, name: name || code })
  }

  const handleStockSelect = (code, name) => {
    addSymbol({ code, name: name || code })
  }

  if (selectedSymbols.length === 0 && viewMode !== 'calendar' && viewMode !== 'earnings' && viewMode !== 'global_news') {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
          {market !== 'us' && (
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, background: 'rgba(138,180,248,0.1)', color: '#8ab4f8',
              }}
            >
              {lang === 'zh' ? 'A股日历' : 'A-Share Calendar'}
            </button>
          )}
          <button
            onClick={() => setViewMode('earnings')}
            style={{
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, background: 'rgba(99,102,241,0.12)', color: '#818cf8',
            }}
          >
            {lang === 'zh' ? '财报日历' : 'Earnings Calendar'}
          </button>
        </div>
        <MarketOverview lang={lang} onStockSelect={handleStockSelect} onTabChange={onTabChange} />
        {detailSymbol && (
          <StockDetailPage symbol={detailSymbol} name={detailName} lang={lang}
            onClose={closeDetail} onLoadMain={handleLoadMain} />
        )}
      </>
    )
  }

  const cols = Math.min(selectedSymbols.length, 2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Mode tab bar — horizontal scroll on mobile */}
      <div
        className="tab-bar"
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          overflowX: isMobile ? 'auto' : 'visible',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 16,
          padding: '6px 10px',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: 12, letterSpacing: '0.3px', marginRight: 2 }}>{t.viewMode}</span>
        {[
          { key: 'sideBySide', label: t.sideBySide },
          { key: 'overlay', label: t.overlay },
          { key: 'analysis', label: t.analysis },
          { key: 'monteCarlo', label: t.monteCarlo },
          // factor & financial rely on A-share specific data sources
          ...(market !== 'us' ? [
            { key: 'factor', label: t.factorAnalysis },
            { key: 'financial', label: t.financialAnalysis },
          ] : []),
          { key: 'similar', label: t.similarTrend },
          { key: 'news', label: t.newsSentiment },
          { key: 'global_news', label: lang === 'zh' ? '全球新闻' : 'Global News' },
          { key: 'radar', label: t.radarTab },
          // calendar is A-share only
          ...(market !== 'us' ? [{ key: 'calendar', label: lang === 'zh' ? 'A股日历' : 'Calendar' }] : []),
          { key: 'earnings', label: lang === 'zh' ? '财报日历' : 'Earnings' },
          { key: 'score',   label: t.scoreTab || (lang === 'zh' ? '股票打分' : 'Score') },
          { key: 'backtest',label: t.backtestTab || (lang === 'zh' ? '策略回测' : 'Backtest') },
          { key: 'sectors',  label: lang === 'zh' ? '🔄 板块' : '🔄 Sectors' },
          { key: 'comments', label: lang === 'zh' ? '💬 评论' : '💬 Comments' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            style={{
              padding: isMobile ? '4px 10px' : '5px 14px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: isMobile ? 11 : 12,
              fontWeight: viewMode === key ? 600 : 400,
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: 'transparent',
              color: viewMode === key ? '#0ea5e9' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === key ? 'inset 0 -2px 0 #0ea5e9' : 'none',
            }}
            onMouseEnter={(e) => {
              if (viewMode !== key) e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              if (viewMode !== key) e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {viewMode === 'overlay' ? (
        <OverlayView lang={lang} />
      ) : viewMode === 'analysis' ? (
        <AnalysisPanel stocks={selectedSymbols} />
      ) : viewMode === 'monteCarlo' ? (
        <MonteCarloPanel stocks={selectedSymbols} />
      ) : viewMode === 'factor' ? (
        <FactorPanel stocks={selectedSymbols} />
      ) : viewMode === 'financial' ? (
        <FinancialPanel stocks={selectedSymbols} />
      ) : viewMode === 'similar' ? (
        <SimilarPanel stocks={selectedSymbols} onOpenDetail={openDetail} />
      ) : viewMode === 'news' ? (
        <NewsPanel stocks={selectedSymbols} onOpenDetail={openDetail} />
      ) : viewMode === 'global_news' ? (
        <GlobalNewsPanel lang={lang} />
      ) : viewMode === 'radar' ? (
        <RadarPanel stocks={selectedSymbols} />
      ) : viewMode === 'calendar' ? (
        <CalendarPanel lang={lang} onStockSelect={handleStockSelect} />
      ) : viewMode === 'earnings' ? (
        <EarningsPanel lang={lang} onStockSelect={handleStockSelect} />
      ) : viewMode === 'score' ? (
        <ScorePanel stocks={selectedSymbols} />
      ) : viewMode === 'backtest' ? (
        <BacktestPanel stocks={selectedSymbols} />
      ) : viewMode === 'sectors' ? (
        <SectorRotation lang={lang} defaultMarket={market} />
      ) : viewMode === 'comments' ? (
        <CommentsPanel stocks={selectedSymbols} lang={lang} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 12,
          }}
        >
          {selectedSymbols.map((s) => (
            <StockCard key={s.code} stock={s} />
          ))}
        </div>
      )}

      {detailSymbol && (
        <StockDetailPage symbol={detailSymbol} name={detailName} lang={lang}
          onClose={closeDetail} onLoadMain={handleLoadMain} />
      )}
    </div>
  )
}
