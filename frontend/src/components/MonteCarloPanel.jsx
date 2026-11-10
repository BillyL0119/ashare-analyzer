import { useState, useEffect } from 'react'
import ReactECharts from '../lib/echarts'
import { useStockData } from '../hooks/useStockData'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { THEME, riseColor, fallColor } from '../utils/chartHelpers'
import useThemeStore from '../store/themeStore'

const COLORS = ['#64b5f6', '#b388ff', '#ffb74d', '#90a4ae']

// The simulation runs on the server (/api/simulation, services/monte_carlo.py): GJR-GARCH volatility
// that starts from today's level and drifts back to the stock's long-run one, shocks drawn from the
// stock's own past, 3 years of total-return daily closes whatever period the chart shows. This maps
// its answer to the fan chart's fields.
function fromApi(d) {
  const p = d.paths
  return {
    p5: p.p5, p25: p.p25, p50: p.p50, p75: p.p75, p95: p.p95,
    lastPrice: d.current_price, nDays: d.days,
    probProfit: (d.stats.prob_gain * 100).toFixed(1),
    varPct: (d.stats.var_95_pct * 100).toFixed(2),
    expectedReturn: (d.stats.expected_return * 100).toFixed(2),
    volNow: (d.vol_now_annual * 100).toFixed(1),
    volLong: (d.vol_longrun_annual * 100).toFixed(1),
    priorPct: Math.round(d.prior_annual * 100),
    backtest: d.backtest || null,
  }
}

// The backtest figure for the horizon closest to the one shown (keys are trading days)
function backtestFor(bt, nDays) {
  const hs = Object.keys(bt?.h || {}).map(Number)
  if (!hs.length) return null
  const h = hs.reduce((a, b) => (Math.abs(b - nDays) < Math.abs(a - nDays) ? b : a))
  return { h, ...bt.h[String(h)], stocks: bt.stocks, years: bt.years }
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
  // The chart's own candles only draw the history line; the simulation uses 3 years of daily data
  const { data, loading } = useStockData(stock.code, { period, startDate, endDate, adjust, market })
  const key = `${market}:${stock.code}:${nDays}:${nSims}:${trigger}`
  const [res, setRes] = useState(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/simulation/${encodeURIComponent(stock.code)}?market=${market}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: nDays, simulations: nSims, seed: 42 + trigger }),   // "run again" draws new paths
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (alive) setRes({ key, result: fromApi(d) }) })
      .catch(() => { if (alive) setRes({ key, error: true }) })
    return () => { alive = false }
  }, [key, stock.code, market, nDays, nSims, trigger])
  const current = res?.key === key ? res : null
  const result = current?.result

  if (current?.error) {
    return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        {lang === 'zh' ? '暂时无法模拟这只股票，请稍后再试。' : 'This stock cannot be simulated right now. Please try again later.'}
      </div>
    )
  }

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
          {lang === 'zh' ? `年化波动率：现在 ${result.volNow}% · 长期 ${result.volLong}%` : `Ann. vol: now ${result.volNow}% · long-run ${result.volLong}%`}
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
        option={buildMCOption(result, stock.name, color, (data?.candles || []).map((c) => c.close), t, lang)}
        notMerge
        style={{ height: 340, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8 }}>
        {lang === 'zh'
          ? `模型：波动率从现在的水平出发，逐渐回到这只股票的长期水平；如果它历史上下跌后波动更大，模型也会照做（GJR-GARCH）。每天的涨跌从它过去 3 年真实的涨跌里抽取，保留了暴涨暴跌。趋势 25% 取自该股历史收益，75% 取长期股市平均回报（约 ${result.priorPct}%/年）。模拟只展示可能的范围，不能预测涨跌方向。`
          : `Model: volatility starts at today's level and drifts back to this stock's long-run level, and rises more after falls where its history shows that (GJR-GARCH). Each day's move is drawn from its real moves of the past 3 years, crashes and jumps included. Drift: 25% from its past returns, 75% from a long-run market average (about ${result.priorPct}%/yr). The fan shows a range of outcomes; it cannot predict the direction.`}
        {(() => {
          const b = backtestFor(result.backtest, nDays)
          if (!b) return null
          return (
            <div style={{ marginTop: 4 }}>
              {lang === 'zh'
                ? `回测：用 ${b.stocks} 只股票和指数 ${b.years} 年的真实价格，每月做一次预测（共 ${b.n.toLocaleString()} 次）。${b.h} 个交易日后，真实价格有 ${b.cov90}% 落在 90% 区间内（理想 90%），${b.cov50}% 落在 50% 区间内（理想 50%）。`
                : `Backtest: a forecast every month on real prices for ${b.stocks} stocks and indices over ${b.years} (${b.n.toLocaleString()} forecasts). ${b.h} trading days later the real price was inside the 90% band ${b.cov90}% of the time (ideal 90%) and inside the 50% band ${b.cov50}% of the time (ideal 50%).`}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default function MonteCarloPanel({ stocks }) {
  useThemeStore((s) => s.theme) // re-render on theme toggle
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const [nSims, setNSims] = useState(10000)
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
          {[5000, 10000, 20000].map((n) => (
            <button key={n} style={btnStyle(nSims === n)} onClick={() => setNSims(n)}>{n.toLocaleString()}</button>
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
