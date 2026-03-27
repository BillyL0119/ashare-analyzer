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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#8b949e' }}>
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
        <div style={{ fontSize: 48 }}>📈</div>
        <div style={{ fontSize: 18, color: '#8b949e' }}>{t.emptyTitle}</div>
        <div style={{ fontSize: 13, color: '#484f58' }}>{t.emptySubtitle}</div>
      </div>
    )
  }

  const cols = Math.min(selectedSymbols.length, 2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#8b949e', fontSize: 13 }}>{t.viewMode}</span>
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
              padding: '4px 12px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              background: viewMode === key ? '#1f6feb' : '#21262d',
              color: viewMode === key ? '#fff' : '#c9d1d9',
              transition: 'background 0.15s',
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
