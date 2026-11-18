import { useEffect, useState } from 'react'
import ReactECharts from '../lib/echarts'
import useCompareStore from '../store/compareStore'
import useThemeStore from '../store/themeStore'
import { T } from '../i18n/translations'
import { useStockData } from '../hooks/useStockData'
import { buildOverlayOption, THEME } from '../utils/chartHelpers'

// The "Overlay" view: every selected stock's price on one chart. Loaded on demand by ComparePanel.
function OverlaySlot({ stock, onData }) {
  const { period, startDate, endDate, adjust, market } = useCompareStore()
  const { data } = useStockData(stock.code, { period, startDate, endDate, adjust, market })

  useEffect(() => {
    onData(stock.code, data)
  }, [data, stock.code, onData])

  return null
}

export default function OverlayView({ lang }) {
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
          option={buildOverlayOption(symbolsData)}
          style={{ height: 480, width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
        />
      )}
    </div>
  )
}

