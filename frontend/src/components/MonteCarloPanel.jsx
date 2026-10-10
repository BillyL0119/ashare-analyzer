import { useState, useEffect, useCallback } from 'react'
import ReactECharts from '../lib/echarts'
import { useStockData } from '../hooks/useStockData'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { THEME, riseColor, fallColor } from '../utils/chartHelpers'
import useThemeStore from '../store/themeStore'

const COLORS = ['#64b5f6', '#b388ff', '#ffb74d', '#90a4ae']

// Share of the drift taken from the stock's own history; the rest is a long-run equity
// return. Same rule as the backend (/simulation) used by the app.
const HIST_WEIGHT = 0.25
const PRIOR_ANNUAL = { us: 0.08, cn: 0.06 }

// Geometric Brownian Motion Monte Carlo simulation (pure JS, runs in browser)
function runMonteCarlo(closes, nSims = 500, nDays = 252, market = 'us') {
  const logReturns = []
  for (let i = 1; i < closes.length; i++) {
    logReturns.push(Math.log(closes[i] / closes[i - 1]))
  }
  if (logReturns.length < 5) return null

  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length
  const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / logReturns.length
  const sigma = Math.sqrt(variance)
  // `mean` is already a mean *log* return, so it is the daily log drift as is. A trailing mean is a
  // noisy estimate (a big run-up would project itself forward), so shrink it toward the prior.
  const prior = (PRIOR_ANNUAL[market] ?? 0.08) / 252 - variance / 2
  const drift = HIST_WEIGHT * mean + (1 - HIST_WEIGHT) * prior
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
  const expectedReturn = ((finalPrices.reduce((a, b) => a + b, 0) / nSims - lastPrice) / lastPrice * 100).toFixed(2)

  return { p5, p25, p50, p75, p95, lastPrice, probProfit, varPct, expectedReturn, nDays, sigma: (sigma * Math.sqrt(252) * 100).toFixed(1) }
}

function hexA(hex, alpha) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

// Fan chart: history flows into a dashed median, with shaded 90% (P5–P95) and 50% (P25–P75) bands.
function buildMCOption(result, name, color, historicalCloses, t, lang) {
  const { p5, p25, p50, p75, p95, nDays } = result
  const histLen = Math.min(historicalCloses.length, 60)
  const histSlice = historicalCloses.slice(-histLen)
  const histSeries = histSlice.map((v, i) => [i - histLen + 1, +v.toFixed(3)])
  const zh = lang === 'zh'
  const L = {
    median: t.mcP50,
    inner: zh ? '50% 区间（P25–P75）' : '50% range (P25–P75)',
    outer: zh ? '90% 区间（P5–P95）' : '90% range (P5–P95)',
    today: zh ? '今天' : 'Today',
    day: zh ? '天' : 'Day',
  }
  const band = (lo, hi) => hi.map((v, i) => [i, +(v - lo[i]).toFixed(3)])
  const pts = (arr) => arr.map((v, i) => [i, v])

  return {
    backgroundColor: THEME.gridBg,
    tooltip: {
      trigger: 'axis',
      backgroundColor: THEME.tooltipBg,
      borderColor: THEME.border,
      textStyle: { color: THEME.tooltipText, fontSize: 11 },
      formatter: (params) => {
        const x = Math.round(params[0]?.axisValue ?? 0)
        if (x <= 0) {
          const h = histSeries.find((d) => d[0] === x)
          return h ? `<div style="font-weight:600">${x}d</div><div>${t.mcHistorical}: ${h[1].toFixed(2)}</div>` : ''
        }
        const row = (label, v) => `<div>${label}: <b>${v.toFixed(2)}</b></div>`
        return `<div style="font-weight:600;margin-bottom:2px">${L.day} +${x}</div>` +
          row('P95', p95[x]) + row('P75', p75[x]) + row(L.median, p50[x]) + row('P25', p25[x]) + row('P5', p5[x])
      },
    },
    legend: {
      top: 4, left: 8,
      textStyle: { color: THEME.text, fontSize: 10 },
      itemWidth: 14, itemHeight: 8,
      data: [t.mcHistorical, L.median, L.inner, L.outer],
    },
    grid: { top: 56, bottom: 30, left: 60, right: 20 },
    xAxis: {
      type: 'value',
      min: -(histLen - 1),
      max: nDays,
      // min/max (-59, +252) are off the tick grid and collide with the nearest tick label
      axisLabel: { color: THEME.text, fontSize: 10, showMinLabel: false, showMaxLabel: false, formatter: (v) => (v <= 0 ? `${v}d` : `+${v}d`) },
      splitLine: { show: false },
      axisLine: { lineStyle: { color: THEME.border } },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
      axisLabel: { color: THEME.text, fontSize: 10 },
    },
    series: [
      // Outer band: invisible P5 base + (P95 − P5) stacked on top
      { name: '_p5', type: 'line', smooth: 0.3, data: pts(p5), stack: 'outer', showSymbol: false, lineStyle: { opacity: 0 }, silent: true, tooltip: { show: false } },
      { name: L.outer, type: 'line', smooth: 0.3, data: band(p5, p95), stack: 'outer', showSymbol: false, lineStyle: { opacity: 0 },
        areaStyle: { color: hexA(color, 0.12) }, itemStyle: { color: hexA(color, 0.35) }, silent: true },
      // Inner band
      { name: '_p25', type: 'line', smooth: 0.3, data: pts(p25), stack: 'inner', showSymbol: false, lineStyle: { opacity: 0 }, silent: true },
      { name: L.inner, type: 'line', smooth: 0.3, data: band(p25, p75), stack: 'inner', showSymbol: false, lineStyle: { opacity: 0 },
        areaStyle: { color: hexA(color, 0.24) }, itemStyle: { color: hexA(color, 0.6) }, silent: true },
      // Median
      { name: L.median, type: 'line', smooth: 0.3, data: pts(p50), showSymbol: false, z: 9,
        lineStyle: { width: 2, color, type: 'dashed' }, itemStyle: { color } },
      // History, with a "today" marker
      { name: t.mcHistorical, type: 'line', data: histSeries, showSymbol: false, z: 10,
        lineStyle: { width: 2, color }, itemStyle: { color },
        markLine: { symbol: 'none', silent: true, label: { formatter: L.today, color: THEME.text, fontSize: 10 },
          lineStyle: { color: THEME.border, type: 'solid' }, data: [{ xAxis: 0 }] } },
    ],
  }
}

function StockMC({ stock, color, nSims, nDays, trigger }) {
  const { period, startDate, endDate, adjust, market } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const { data, loading } = useStockData(stock.code, { period, startDate, endDate, adjust })
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!data || !data.candles || data.candles.length < 30) return
    const closes = data.candles.map((c) => c.close)
    const mc = runMonteCarlo(closes, nSims, nDays, market)
    setResult(mc)
  }, [data, nSims, nDays, trigger, market])

  if (loading) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        {t.loading}
      </div>
    )
  }

  if (!result) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        {t.loading}
      </div>
    )
  }

  const statStyle = { textAlign: 'center', flex: 1 }
  const statLabel = { color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }
  const statVal = (color) => ({ color, fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums' })
  const up = riseColor(market), down = fallColor(market)

  return (
    <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color, fontWeight: 700, fontSize: 15 }}>{stock.name}</span>
        {stock.name !== stock.code && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{stock.code}</span>}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>
          {t.mcCurrentPrice}: {result.lastPrice.toFixed(2)} &nbsp;|&nbsp;
          {lang === 'en' ? 'Ann. Vol' : '年化波动率'}: {result.sigma}%
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 6, padding: '12px 8px', marginBottom: 14 }}>
        <div style={statStyle}>
          <div style={statLabel}>{t.mcProb}</div>
          <div style={statVal(parseFloat(result.probProfit) >= 50 ? up : down)}>{result.probProfit}%</div>
        </div>
        <div style={{ width: 1, background: THEME.border }} />
        <div style={statStyle}>
          <div style={statLabel}>{t.mcExpected}</div>
          <div style={statVal(parseFloat(result.expectedReturn) >= 0 ? up : down)}>
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
          <div style={statVal('var(--text-primary)')}>{result.p50[nDays].toFixed(2)}</div>
        </div>
      </div>

      {/* Chart */}
      <ReactECharts
        option={buildMCOption(result, stock.name, color, data.candles.map((c) => c.close), t, lang)}
        notMerge
        style={{ height: 340, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8 }}>
        {lang === 'zh'
          ? `趋势假设：25% 取自该股历史收益，75% 取长期股市平均回报（约 ${market === 'cn' ? 6 : 8}%/年）；波动率取自历史。模拟只展示可能的范围，不是预测。`
          : `Drift: 25% from this stock's past returns, 75% from a long-run market average (about ${market === 'cn' ? 6 : 8}%/yr); volatility from history. The fan shows a range of outcomes, not a forecast.`}
      </div>
    </div>
  )
}

export default function MonteCarloPanel({ stocks }) {
  useThemeStore((s) => s.theme) // re-render on theme toggle
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
    border: `1px solid ${active ? '#0ea5e9' : THEME.border}`,
    cursor: 'pointer',
    fontSize: 12,
    background: active ? 'rgba(14,165,233,0.12)' : 'var(--bg-hover)',
    color: active ? '#0ea5e9' : THEME.text,
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
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.mcSims}:</span>
          {[100, 500, 1000].map((n) => (
            <button key={n} style={btnStyle(nSims === n)} onClick={() => setNSims(n)}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.mcDays}:</span>
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
            background: running ? 'var(--bg-hover)' : 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
            color: running ? 'var(--text-muted)' : '#fff',
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
