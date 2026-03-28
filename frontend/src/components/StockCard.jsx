import { useEffect } from 'react'
import * as echarts from 'echarts'
import { useStockData } from '../hooks/useStockData'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import KLineChart from './KLineChart'
import VolumeChart from './VolumeChart'
import MACDChart from './MACDChart'
import RSIChart from './RSIChart'
import { THEME } from '../utils/chartHelpers'

export default function StockCard({ stock }) {
  const { code, name } = stock
  const { period, startDate, endDate, adjust, removeSymbol, setPeriod, setAdjust, market } =
    useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]

  const { data, loading, error, quote } = useStockData(code, {
    period,
    startDate,
    endDate,
    adjust,
    market,
  })

  const groupId = `group_${code}`
  useEffect(() => {
    echarts.connect(groupId)
  }, [groupId])

  const priceDelta = quote?.pct_change ?? 0
  const priceColor = priceDelta >= 0 ? THEME.up : THEME.down

  const periodLabels = {
    daily: t.periodDaily,
    weekly: t.periodWeekly,
    monthly: t.periodMonthly,
  }
  const adjustLabels = {
    qfq: t.adjFwd,
    hfq: t.adjBack,
    '': t.adjNone,
  }

  return (
    <div
      style={{
        background: THEME.gridBg,
        border: `1px solid ${THEME.border}`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${THEME.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: '#64b5f6', fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>
            {code}
          </span>
          <span style={{ color: THEME.text, fontSize: 14 }}>{name}</span>
        </div>

        {quote && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span style={{ color: priceColor, fontSize: 18, fontWeight: 700 }}>
              {quote.price.toFixed(2)}
            </span>
            <span style={{ color: priceColor, fontSize: 13 }}>
              {priceDelta >= 0 ? '+' : ''}{priceDelta.toFixed(2)}%
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {Object.entries(periodLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                background: period === key ? 'linear-gradient(135deg, #8ab4f8, #c084fc)' : 'rgba(255,255,255,0.06)',
                color: period === key ? '#fff' : THEME.text,
                transition: 'background 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {Object.entries(adjustLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setAdjust(key)}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                background: adjust === key ? 'linear-gradient(135deg, #8ab4f8, #c084fc)' : 'rgba(255,255,255,0.06)',
                color: adjust === key ? '#fff' : THEME.text,
                transition: 'background 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => removeSymbol(code)}
          style={{
            padding: '3px 10px',
            borderRadius: 4,
            border: `1px solid ${THEME.border}`,
            cursor: 'pointer',
            fontSize: 12,
            background: 'transparent',
            color: '#9aa0a6',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,83,80,0.15)'
            e.currentTarget.style.color = '#ef5350'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#9aa0a6'
          }}
        >
          {t.remove}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6', fontSize: 14 }}>
            {t.loading}
          </div>
        )}
        {error && (
          <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f85149', fontSize: 13 }}>
            {error}
          </div>
        )}
        {data && !loading && (
          <>
            <div style={{ height: 360 }}>
              <KLineChart candles={data.candles} ma={data.ma} groupId={groupId} market={market} />
            </div>
            <div style={{ height: 120, borderTop: `1px solid ${THEME.border}` }}>
              <VolumeChart candles={data.candles} groupId={groupId} market={market} />
            </div>
            <div style={{ height: 120, borderTop: `1px solid ${THEME.border}` }}>
              <MACDChart macd={data.macd} groupId={groupId} />
            </div>
            <div style={{ height: 120, borderTop: `1px solid ${THEME.border}` }}>
              <RSIChart rsi={data.rsi} groupId={groupId} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
