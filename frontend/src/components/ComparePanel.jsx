import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import StockCard from './StockCard'
import { useStockData } from '../hooks/useStockData'
import { buildOverlayOption, THEME } from '../utils/chartHelpers'
import AnalysisPanel from './AnalysisPanel'
import MonteCarloPanel from './MonteCarloPanel'
import RiskPanel from './RiskPanel'
import RegimePanel from './RegimePanel'
import FactorPanel from './FactorPanel'
import FinancialPanel from './FinancialPanel'
import SimilarPanel from './SimilarPanel'

function OverlaySlot({ stock, onData }) {
  const { period, startDate, endDate, adjust, market } = useCompareStore()
  const { data } = useStockData(stock.code, { period, startDate, endDate, adjust, market })

  useEffect(() => {
    onData(stock.code, data)
  }, [data, stock.code, onData])

  return null
}

function OverlayView({ lang }) {
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#9aa0a6' }}>
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

export default function ComparePanel() {
  const { selectedSymbols, viewMode, setViewMode } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]

  if (selectedSymbols.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 52, filter: 'drop-shadow(0 0 20px rgba(138,180,248,0.4))' }}>📈</div>
        <div style={{ fontSize: 18, color: '#9aa0a6', fontWeight: 500, letterSpacing: '0.2px' }}>{t.emptyTitle}</div>
        <div style={{ fontSize: 13, color: '#4a5568', letterSpacing: '0.1px' }}>{t.emptySubtitle}</div>
      </div>
    )
  }

  const cols = Math.min(selectedSymbols.length, 2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Mode tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(138,180,248,0.10)',
          borderRadius: 16,
          padding: '6px 10px',
        }}
      >
        <span style={{ color: '#4a5568', fontSize: 12, letterSpacing: '0.3px', marginRight: 2 }}>{t.viewMode}</span>
        {[
          { key: 'sideBySide', label: t.sideBySide },
          { key: 'overlay', label: t.overlay },
          { key: 'analysis', label: t.analysis },
          { key: 'monteCarlo', label: t.monteCarlo },
          { key: 'risk', label: t.riskAnalytics },
          { key: 'regime', label: t.regimeDetector },
          { key: 'factor', label: t.factorAnalysis },
          { key: 'financial', label: t.financialAnalysis },
          { key: 'similar', label: t.similarTrend },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: viewMode === key ? 600 : 400,
              letterSpacing: '0.2px',
              background: viewMode === key
                ? 'linear-gradient(135deg, #8ab4f8, #c084fc)'
                : 'transparent',
              color: viewMode === key ? '#fff' : '#9aa0a6',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === key ? '0 2px 10px rgba(138,180,248,0.25)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (viewMode !== key) e.currentTarget.style.color = '#e8eaed'
            }}
            onMouseLeave={(e) => {
              if (viewMode !== key) e.currentTarget.style.color = '#9aa0a6'
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
      ) : viewMode === 'risk' ? (
        <RiskPanel stocks={selectedSymbols} />
      ) : viewMode === 'regime' ? (
        <RegimePanel stocks={selectedSymbols} />
      ) : viewMode === 'factor' ? (
        <FactorPanel stocks={selectedSymbols} />
      ) : viewMode === 'financial' ? (
        <FinancialPanel stocks={selectedSymbols} />
      ) : viewMode === 'similar' ? (
        <SimilarPanel stocks={selectedSymbols} />
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
    </div>
  )
}
