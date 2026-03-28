import { useState, useEffect, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import { useStockData } from '../hooks/useStockData'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { THEME } from '../utils/chartHelpers'

const COLORS = ['#64b5f6', '#ef5350', '#66bb6a', '#ffca28']

// Geometric Brownian Motion Monte Carlo simulation (pure JS, runs in browser)
function runMonteCarlo(closes, nSims = 500, nDays = 252) {
  const logReturns = []
  for (let i = 1; i < closes.length; i++) {
    logReturns.push(Math.log(closes[i] / closes[i - 1]))
  }
  if (logReturns.length < 5) return null

  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length
  const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / logReturns.length
  const sigma = Math.sqrt(variance)
  const drift = mean - variance / 2
  const lastPrice = closes[closes.length - 1]

  // Run simulations using Box-Muller transform for normal distribution
  const finalPrices = []
  const allPaths = []

  for (let s = 0; s < nSims; s++) {
    const path = [lastPrice]
    for (let d = 0; d < nDays; d++) {
      const u1 = Math.random()
      const u2 = Math.random()
      const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
      path.push(path[path.length - 1] * Math.exp(drift + sigma * z))
    }
    allPaths.push(path)
    finalPrices.push(path[nDays])
  }

  finalPrices.sort((a, b) => a - b)

  // Compute percentile bands at each day
  const p5 = [], p25 = [], p50 = [], p75 = [], p95 = []
  for (let d = 0; d <= nDays; d++) {
    const vals = allPaths.map(p => p[d]).sort((a, b) => a - b)
    p5.push(+vals[Math.floor(nSims * 0.05)].toFixed(3))
    p25.push(+vals[Math.floor(nSims * 0.25)].toFixed(3))
    p50.push(+vals[Math.floor(nSims * 0.50)].toFixed(3))
    p75.push(+vals[Math.floor(nSims * 0.75)].toFixed(3))
    p95.push(+vals[Math.floor(nSims * 0.95)].toFixed(3))
  }

  const probProfit = (finalPrices.filter(p => p > lastPrice).length / nSims * 100).toFixed(1)
  const varPct = ((finalPrices[Math.floor(nSims * 0.05)] - lastPrice) / lastPrice * 100).toFixed(2)
  const expectedReturn = ((p50[nDays] - lastPrice) / lastPrice * 100).toFixed(2)

  return { p5, p25, p50, p75, p95, lastPrice, probProfit, varPct, expectedReturn, nDays, sigma: (sigma * Math.sqrt(252) * 100).toFixed(1) }
}

function buildMCOption(result, name, color, historicalCloses, t) {
  const { p5, p25, p50, p75, p95, nDays, lastPrice } = result
  const histLen = Math.min(historicalCloses.length, 60)
  const histSlice = historicalCloses.slice(-histLen)

  // X-axis: historical days (negative) + forecast days (positive)
  const xData = []
  for (let i = histLen - 1; i >= 1; i--) xData.push(-i)
  for (let i = 0; i <= nDays; i++) xData.push(i)

  const histSeries = histSlice.map((v, i) => [i - histLen + 1, +v.toFixed(3)])

  // For fan chart: use 'band' technique with upper-lower pairs
  const forecastOffset = histLen - 1

  return {
    backgroundColor: THEME.gridBg,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13,17,23,0.9)',
      borderColor: THEME.border,
      textStyle: { color: THEME.text, fontSize: 11 },
      formatter: (params) => {
        let html = `<div style="font-weight:bold">${t.mcTitle}: Day ${params[0]?.axisValue}</div>`
        params.forEach((p) => {
          if (p.data != null && p.seriesName) {
            const val = Array.isArray(p.data) ? p.data[1] : p.data
            if (val != null)
              html += `<div style="color:${p.color}">${p.seriesName}: ${Number(val).toFixed(2)}</div>`
          }
        })
        return html
      },
    },
    legend: {
      top: 4,
      left: 8,
      textStyle: { color: THEME.text, fontSize: 10 },
      itemWidth: 14,
      itemHeight: 6,
      data: [t.mcHistorical, t.mcP5, t.mcP25, t.mcP50, t.mcP75, t.mcP95],
    },
    grid: { top: 36, bottom: 36, left: 70, right: 20 },
    xAxis: {
      type: 'value',
      min: -(histLen - 1),
      max: nDays,
      axisLabel: {
        color: THEME.text,
        fontSize: 10,
        formatter: (v) => v <= 0 ? `${v}d` : `+${v}d`,
      },
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
      axisLine: { lineStyle: { color: THEME.border } },
      markLine: { data: [{ xAxis: 0 }] },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
      axisLabel: { color: THEME.text, fontSize: 10 },
    },
    series: [
      // Historical
      {
        name: t.mcHistorical,
        type: 'line',
        data: histSeries,
        showSymbol: false,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        z: 10,
      },
      // P5
      {
        name: t.mcP5,
        type: 'line',
        data: p5.map((v, i) => [i, v]),
        showSymbol: false,
        lineStyle: { width: 1, color: '#ef5350', type: 'dashed' },
        itemStyle: { color: '#ef5350' },
        areaStyle: null,
      },
      // P25
      {
        name: t.mcP25,
        type: 'line',
        data: p25.map((v, i) => [i, v]),
        showSymbol: false,
        lineStyle: { width: 1, color: '#ff9800', type: 'dashed' },
        itemStyle: { color: '#ff9800' },
      },
      // P50 (median)
      {
        name: t.mcP50,
        type: 'line',
        data: p50.map((v, i) => [i, v]),
        showSymbol: false,
        lineStyle: { width: 2, color: '#66bb6a' },
        itemStyle: { color: '#66bb6a' },
        z: 9,
      },
      // P75
      {
        name: t.mcP75,
        type: 'line',
        data: p75.map((v, i) => [i, v]),
        showSymbol: false,
        lineStyle: { width: 1, color: '#ff9800', type: 'dashed' },
        itemStyle: { color: '#ff9800' },
      },
      // P95
      {
        name: t.mcP95,
        type: 'line',
        data: p95.map((v, i) => [i, v]),
        showSymbol: false,
        lineStyle: { width: 1, color: '#ef5350', type: 'dashed' },
        itemStyle: { color: '#ef5350' },
      },
    ],
  }
}

function StockMC({ stock, color, nSims, nDays, trigger }) {
  const { period, startDate, endDate, adjust } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const { data, loading } = useStockData(stock.code, { period, startDate, endDate, adjust })
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!data || !data.candles || data.candles.length < 30) return
    const closes = data.candles.map((c) => c.close)
    const mc = runMonteCarlo(closes, nSims, nDays)
    setResult(mc)
  }, [data, nSims, nDays, trigger])

  if (loading) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6' }}>
        {t.loading}
      </div>
    )
  }

  if (!result) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568', fontSize: 13 }}>
        {t.loading}
      </div>
    )
  }

  const statStyle = { textAlign: 'center', flex: 1 }
  const statLabel = { color: '#9aa0a6', fontSize: 11, marginBottom: 4 }
  const statVal = (color) => ({ color, fontWeight: 700, fontSize: 18 })

  return (
    <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color, fontWeight: 700, fontSize: 15 }}>{stock.name}</span>
        <span style={{ color: '#9aa0a6', fontSize: 13 }}>{stock.code}</span>
        <span style={{ marginLeft: 'auto', color: '#4a5568', fontSize: 12 }}>
          {t.mcCurrentPrice}: {result.lastPrice.toFixed(2)} &nbsp;|&nbsp;
          {lang === 'en' ? 'Ann. Vol' : '年化波动率'}: {result.sigma}%
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '12px 8px', marginBottom: 14 }}>
        <div style={statStyle}>
          <div style={statLabel}>{t.mcProb}</div>
          <div style={statVal(parseFloat(result.probProfit) >= 50 ? '#ef5350' : '#26a69a')}>{result.probProfit}%</div>
        </div>
        <div style={{ width: 1, background: THEME.border }} />
        <div style={statStyle}>
          <div style={statLabel}>{t.mcExpected}</div>
          <div style={statVal(parseFloat(result.expectedReturn) >= 0 ? '#ef5350' : '#26a69a')}>
            {result.expectedReturn > 0 ? '+' : ''}{result.expectedReturn}%
          </div>
        </div>
        <div style={{ width: 1, background: THEME.border }} />
        <div style={statStyle}>
          <div style={statLabel}>{t.mcVaR95}</div>
          <div style={statVal('#ff9800')}>{result.varPct}%</div>
        </div>
        <div style={{ width: 1, background: THEME.border }} />
        <div style={statStyle}>
          <div style={statLabel}>{t.mcP50} ({nDays}d)</div>
          <div style={statVal('#66bb6a')}>{result.p50[nDays].toFixed(2)}</div>
        </div>
      </div>

      {/* Chart */}
      <ReactECharts
        option={buildMCOption(result, stock.name, color, data.candles.map((c) => c.close), t)}
        style={{ height: 340, width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
    </div>
  )
}

export default function MonteCarloPanel({ stocks }) {
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const [nSims, setNSims] = useState(500)
  const [nDays, setNDays] = useState(252)
  const [trigger, setTrigger] = useState(0)
  const [running, setRunning] = useState(false)

  const handleRun = () => {
    setRunning(true)
    setTimeout(() => {
      setTrigger((v) => v + 1)
      setRunning(false)
    }, 50)
  }

  const btnStyle = (active) => ({
    padding: '4px 10px',
    borderRadius: 4,
    border: `1px solid ${active ? '#8ab4f8' : THEME.border}`,
    cursor: 'pointer',
    fontSize: 12,
    background: active ? 'rgba(138,180,248,0.12)' : 'rgba(255,255,255,0.06)',
    color: active ? '#8ab4f8' : THEME.text,
    transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Controls */}
      <div style={{
        background: THEME.gridBg,
        border: `1px solid ${THEME.border}`,
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#9aa0a6', fontSize: 13 }}>{t.mcSims}:</span>
          {[100, 500, 1000].map((n) => (
            <button key={n} style={btnStyle(nSims === n)} onClick={() => setNSims(n)}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#9aa0a6', fontSize: 13 }}>{t.mcDays}:</span>
          {[60, 125, 252].map((n) => (
            <button key={n} style={btnStyle(nDays === n)} onClick={() => setNDays(n)}>{n}d</button>
          ))}
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            padding: '6px 18px',
            borderRadius: 4,
            border: 'none',
            cursor: running ? 'wait' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
            background: running ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #8ab4f8, #c084fc)',
            color: running ? '#9aa0a6' : '#fff',
            transition: 'all 0.15s',
          }}
        >
          {running ? t.mcRunning : t.mcRun}
        </button>
      </div>

      {/* Per-stock simulations */}
      {stocks.map((stock, i) => (
        <StockMC
          key={stock.code}
          stock={stock}
          color={COLORS[i % COLORS.length]}
          nSims={nSims}
          nDays={nDays}
          trigger={trigger}
        />
      ))}
    </div>
  )
}
