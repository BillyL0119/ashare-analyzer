import { useState, lazy, Suspense } from 'react'
import useCompareStore, { US_VIEWS } from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { useMobile } from '../hooks/useMobile'
import useThemeStore from '../store/themeStore'
import MarketOverview from './MarketOverview'
import movesStrings from './moves/movesStrings'

// Everything that draws a chart or fetches a stock's data loads on demand, so the home page (no
// stock selected) does not download ECharts and the analysis panels up front
const OverlayView      = lazy(() => import('./OverlayView'))
const StockCard        = lazy(() => import('./StockCard'))
const AnalysisPanel    = lazy(() => import('./AnalysisPanel'))
const MonteCarloPanel  = lazy(() => import('./MonteCarloPanel'))
const FactorPanel      = lazy(() => import('./FactorPanel'))
const FinancialPanel   = lazy(() => import('./FinancialPanel'))
const SimilarPanel     = lazy(() => import('./SimilarPanel'))
const NewsPanel        = lazy(() => import('./NewsPanel'))
const RadarPanel       = lazy(() => import('./RadarPanel'))
const CalendarPanel    = lazy(() => import('./CalendarPanel'))
const EarningsPanel    = lazy(() => import('./EarningsPanel'))
const StockDetailPage  = lazy(() => import('./StockDetailPage'))
const ScorePanel       = lazy(() => import('./ScorePanel'))
const FundamentalsPanel = lazy(() => import('./FundamentalsPanel'))
const BacktestPanel    = lazy(() => import('./BacktestPanel'))
const GlobalNewsPanel  = lazy(() => import('./GlobalNewsPanel'))
const CommentsPanel    = lazy(() => import('./CommentsPanel'))
const SectorRotation   = lazy(() => import('./SectorRotation'))
const MovesPanel       = lazy(() => import('./moves/MovesPanel'))
// Quote pages in the style of Yahoo Finance (US stocks): components/quotepage/
const QuoteSummary     = lazy(() => import('./quotepage/QuoteSummary'))
const QuoteStatistics  = lazy(() => import('./quotepage/QuoteStatistics'))
const QuoteHistory     = lazy(() => import('./quotepage/QuoteHistory'))
const QuoteHolders     = lazy(() => import('./quotepage/QuoteHolders'))
const QuoteAnalysts    = lazy(() => import('./quotepage/QuoteAnalysts'))
const PanelFallback = () => <div className="skeleton" style={{ height: 360, borderRadius: 8 }} aria-hidden="true" />

// View modes where the date range is irrelevant
const _NO_DATE_MODES = new Set(['summary', 'statistics', 'history', 'holders', 'analysts', 'moves', 'fundamentals', 'news', 'global_news', 'calendar', 'earnings', 'sectors', 'comments', 'backtest', 'score', 'radar', 'similar'])

export default function ComparePanel({ onTabChange, onOpenKnowledge }) {
  useThemeStore((s) => s.theme) // re-render on theme toggle
  const { selectedSymbols, viewMode: storedView, setViewMode, addSymbol, market,
          startDate, endDate, setDateRange, switchMarketAndAddSymbol } = useCompareStore()
  // A US-only tab stays selected when the reader switches market: show the chart there instead
  const viewMode = market !== 'us' && US_VIEWS.has(storedView) ? 'sideBySide' : storedView
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const isMobile = useMobile()
  const hkjp = market === 'hk' || market === 'jp'
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
  // A peer or related ticker on a quote page opens that stock's own page (replacing the selection)
  const openStock = (code, name) => switchMarketAndAddSymbol('us', { code, name: name || code })

  if (selectedSymbols.length === 0 && viewMode !== 'calendar' && viewMode !== 'earnings' && viewMode !== 'global_news') {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
          {market === 'cn' && (
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, background: 'rgba(108,156,255,0.1)', color: '#6c9cff',
              }}
            >
              {t.calendarTab}
            </button>
          )}
          <button
            onClick={() => setViewMode('earnings')}
            style={{
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, background: 'rgba(95,115,184,0.12)', color: '#8f99dc',
            }}
          >
            {t.earningsTab}
          </button>
        </div>
        <MarketOverview lang={lang} onStockSelect={handleStockSelect} onTabChange={onTabChange} onOpenKnowledge={onOpenKnowledge} />
        {detailSymbol && (
          <Suspense fallback={null}>
            <StockDetailPage symbol={detailSymbol} name={detailName} lang={lang} market={market}
              onClose={closeDetail} onLoadMain={handleLoadMain} />
          </Suspense>
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
          gap: 4,
          alignItems: 'center',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          borderBottom: '1px solid var(--border-primary)',
          paddingTop: 8,
        }}
        role="tablist"
      >
        {[
          // Grouped: charts · research · news & market · community (a divider sits between groups)
          // US: the quote page (Yahoo-style) comes first, with the company financials among its tabs
          market === 'us' ? [
            { key: 'summary', label: t.tabSummary },
            { key: 'statistics', label: t.tabStatistics },
            { key: 'fundamentals', label: t.fundamentalsTab },
            { key: 'history', label: t.tabHistory },
            { key: 'holders', label: t.tabHolders },
            { key: 'analysts', label: t.tabAnalysts },
          ] : [],
          [
            { key: 'sideBySide', label: t.sideBySide },
            { key: 'overlay', label: t.overlay },
            // Hong Kong / Japan: charts, AI K-line reading and Monte Carlo run on price history alone;
            // the research tabs below need US or A-share data sources
            ...(!hkjp ? [{ key: 'analysis', label: t.analysis }] : []),
            { key: 'monteCarlo', label: t.monteCarlo },
            ...(!hkjp ? [{ key: 'backtest', label: t.backtestTab }] : []),
          ],
          hkjp ? [] : [
            // why the biggest daily moves happened (US: SEC filings, Fed; A-shares: cninfo announcements)
            ...(market === 'us' || market === 'cn' ? [{ key: 'moves', label: movesStrings(lang).tab }] : []),
            { key: 'score', label: t.scoreTab },
            { key: 'radar', label: t.radarTab },
            { key: 'similar', label: t.similarTrend },
            // factor & financial rely on A-share specific data sources
            ...(market === 'cn' ? [
              { key: 'factor', label: t.factorAnalysis },
              { key: 'financial', label: t.financialAnalysis },
            ] : []),
          ],
          [
            ...(!hkjp ? [{ key: 'news', label: t.newsSentiment }] : []),
            { key: 'global_news', label: t.globalNews },
            { key: 'earnings', label: t.earningsTab },
            // calendar is A-share only
            ...(market === 'cn' ? [{ key: 'calendar', label: t.calendarTab }] : []),
            { key: 'sectors', label: t.sectorsTab },
          ],
          [{ key: 'comments', label: t.commentsTab }],
        ].filter((group) => group.length).map((group, gi) => [
          gi > 0 && <span key={`sep-${gi}`} aria-hidden="true" style={{ width: 1, height: 14, background: 'var(--border-glow)', flexShrink: 0, margin: '0 6px', alignSelf: 'center' }} />,
          ...group.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              role="tab"
              aria-selected={viewMode === key}
              style={{
                padding: isMobile ? '8px 9px' : '9px 9px',
                marginBottom: -1,
                borderRadius: 0,
                border: 'none',
                borderBottom: `2px solid ${viewMode === key ? 'var(--accent-blue)' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: isMobile ? 12 : 13,
                fontWeight: viewMode === key ? 500 : 400,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                background: 'transparent',
                color: viewMode === key ? 'var(--text-primary)' : 'var(--text-secondary)',
                transition: 'color 150ms var(--ease)',
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
          )),
        ])}
      </div>

      {/* Date range — shown only for chart/analysis modes, hidden on mobile */}
      {!isMobile && !_NO_DATE_MODES.has(viewMode) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: 'var(--text-muted)',
          padding: '4px 2px',
        }}>
          <span>{t.from}</span>
          <input
            type="date"
            value={`${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`}
            onChange={(e) => setDateRange(e.target.value.replace(/-/g, ''), endDate)}
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              borderRadius: 8, color: 'var(--text-primary)', padding: '4px 8px',
              fontSize: 12, outline: 'none', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#4f86f7' }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--border-primary)' }}
          />
          <span>{t.to}</span>
          <input
            type="date"
            value={`${endDate.slice(0, 4)}-${endDate.slice(4, 6)}-${endDate.slice(6, 8)}`}
            onChange={(e) => setDateRange(startDate, e.target.value.replace(/-/g, ''))}
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              borderRadius: 8, color: 'var(--text-primary)', padding: '4px 8px',
              fontSize: 12, outline: 'none', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#4f86f7' }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--border-primary)' }}
          />
        </div>
      )}

      <Suspense fallback={<PanelFallback />}>
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
      ) : viewMode === 'summary' ? (
        <QuoteSummary stocks={selectedSymbols} market={market} lang={lang} onOpenStock={openStock} />
      ) : viewMode === 'statistics' ? (
        <QuoteStatistics stocks={selectedSymbols} market={market} lang={lang} onOpenStock={openStock} />
      ) : viewMode === 'history' ? (
        <QuoteHistory stocks={selectedSymbols} market={market} lang={lang} onOpenStock={openStock} />
      ) : viewMode === 'holders' ? (
        <QuoteHolders stocks={selectedSymbols} market={market} lang={lang} onOpenStock={openStock} />
      ) : viewMode === 'analysts' ? (
        <QuoteAnalysts stocks={selectedSymbols} market={market} lang={lang} onOpenStock={openStock} />
      ) : viewMode === 'fundamentals' ? (
        <FundamentalsPanel stocks={selectedSymbols} market={market} />
      ) : viewMode === 'moves' ? (
        <div style={{ display: 'grid', gap: 28 }}>
          {selectedSymbols.map((st) => <MovesPanel key={st.code} symbol={st.code} market={market} lang={lang} />)}
        </div>
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
      </Suspense>

      {detailSymbol && (
        <Suspense fallback={null}>
          <StockDetailPage symbol={detailSymbol} name={detailName} lang={lang} market={market}
            onClose={closeDetail} onLoadMain={handleLoadMain} />
        </Suspense>
      )}
    </div>
  )
}
