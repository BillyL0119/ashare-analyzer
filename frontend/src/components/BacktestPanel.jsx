import { useState, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import useLangStore from '../store/langStore'
import { getBacktest } from '../api/stockApi'
import { THEME } from '../utils/chartHelpers'

const ACCENT = '#8ab4f8'
const ACCENT2 = '#c084fc'

const STRATEGIES = [
  { key: 'ma',   zh: '双均线 (MA5/MA20)', en: 'MA Crossover (MA5/MA20)' },
  { key: 'rsi',  zh: 'RSI 超买超卖',       en: 'RSI Overbought/Oversold' },
  { key: 'macd', zh: 'MACD 金叉死叉',      en: 'MACD Golden/Death Cross' },
  { key: 'boll', zh: '布林带策略',         en: 'Bollinger Band Breakout' },
]

const PERIODS = [
  { key: '1y', zh: '1年', en: '1 Year' },
  { key: '2y', zh: '2年', en: '2 Years' },
  { key: '3y', zh: '3年', en: '3 Years' },
  { key: '5y', zh: '5年', en: '5 Years' },
]

const STRATEGY_DESC = {
  ma:   { zh: 'MA5上穿MA20买入，下穿卖出。跟随中期趋势，适合趋势行情。', en: 'Buy when MA5 crosses above MA20, sell when below. Follows medium-term trends.' },
  rsi:  { zh: 'RSI<30时买入（超卖反弹），RSI>70时卖出（超买回调）。逆势策略。', en: 'Buy when RSI<30 (oversold), sell when RSI>70 (overbought). Mean-reversion strategy.' },
  macd: { zh: 'MACD金叉买入，死叉卖出。动量策略，信号滞后但可靠。', en: 'Buy on MACD golden cross, sell on death cross. Momentum strategy with lagging signals.' },
  boll: { zh: '价格触及布林带下轨买入，触及上轨卖出。震荡行情表现较好。', en: 'Buy at lower Bollinger band, sell at upper. Works well in ranging markets.' },
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(138,180,248,0.1)',
      borderRadius: 10, padding: '12px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#e8eaed', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#9aa0a6', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function EquityChart({ data, isCN }) {
  const dates = data.dates || []
  const equity = data.equity || []
  const benchmark = data.benchmark_equity || []
  const bm_name = isCN ? data.benchmark_name : data.benchmark_name_en

  const series = [
    {
      name: isCN ? '策略资金曲线' : 'Strategy Equity',
      type: 'line',
      data: equity,
      smooth: true,
      lineStyle: { color: ACCENT, width: 2 },
      itemStyle: { color: ACCENT },
      showSymbol: false,
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(138,180,248,0.15)' }, { offset: 1, color: 'rgba(138,180,248,0.01)' }] } },
    },
  ]

  if (benchmark.length > 0) {
    series.push({
      name: bm_name || 'Benchmark',
      type: 'line',
      data: benchmark,
      smooth: true,
      lineStyle: { color: ACCENT2, width: 1.5, type: 'dashed' },
      itemStyle: { color: ACCENT2 },
      showSymbol: false,
    })
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(5,10,22,0.95)',
      borderColor: 'rgba(138,180,248,0.3)',
      textStyle: { color: '#e8eaed', fontSize: 12 },
      formatter: (params) => {
        const date = params[0]?.axisValue || ''
        let s = `<div style="font-weight:600;margin-bottom:4px">${date}</div>`
        params.forEach((p) => {
          const v = Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })
          s += `<div>${p.seriesName}: ¥${v}</div>`
        })
        return s
      },
    },
    legend: {
      textStyle: { color: '#9aa0a6', fontSize: 11 },
      top: 4,
    },
    grid: { top: 40, right: 16, bottom: 36, left: 70 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: 'rgba(138,180,248,0.1)' } },
      axisLabel: { color: '#4a5568', fontSize: 10,
        formatter: (v) => v?.slice(0, 7) || v,
        interval: Math.floor(dates.length / 6),
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(138,180,248,0.06)' } },
      axisLabel: { color: '#4a5568', fontSize: 10,
        formatter: (v) => `¥${(v / 10000).toFixed(0)}万`,
      },
    },
    series,
  }

  return <ReactECharts option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
}

function TradeTable({ trades, isCN }) {
  const [page, setPage] = useState(0)
  const PAGE = 10
  const paged = trades.slice(page * PAGE, (page + 1) * PAGE)
  const total = Math.ceil(trades.length / PAGE)

  if (!trades.length) return (
    <div style={{ textAlign: 'center', padding: 20, color: '#4a5568', fontSize: 12 }}>
      {isCN ? '该策略在此期间无交易信号' : 'No trades generated in this period'}
    </div>
  )

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: '#4a5568' }}>
              {[
                isCN ? '买入日期' : 'Buy Date',
                isCN ? '买入价' : 'Buy Price',
                isCN ? '卖出日期' : 'Sell Date',
                isCN ? '卖出价' : 'Sell Price',
                isCN ? '盈亏' : 'P&L',
                isCN ? '收益率' : 'Return',
              ].map((h) => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((t, i) => {
              const color = t.win ? '#22c55e' : '#ef4444'
              return (
                <tr key={i} style={{ borderTop: '1px solid rgba(138,180,248,0.06)' }}>
                  <td style={{ padding: '6px 10px', color: '#9aa0a6' }}>{t.buy_date}</td>
                  <td style={{ padding: '6px 10px', color: '#e8eaed', fontFamily: 'monospace' }}>{t.buy_price}</td>
                  <td style={{ padding: '6px 10px', color: '#9aa0a6' }}>{t.sell_date}</td>
                  <td style={{ padding: '6px 10px', color: '#e8eaed', fontFamily: 'monospace' }}>{t.sell_price}</td>
                  <td style={{ padding: '6px 10px', color, fontFamily: 'monospace', fontWeight: 600 }}>
                    {t.pnl >= 0 ? '+' : ''}{t.pnl.toLocaleString()}
                  </td>
                  <td style={{ padding: '6px 10px', color, fontFamily: 'monospace' }}>
                    {t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct.toFixed(2)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {total > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
          {Array.from({ length: total }, (_, i) => (
            <button key={i} onClick={() => setPage(i)} style={{
              padding: '3px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11,
              background: page === i ? `linear-gradient(135deg,${ACCENT},${ACCENT2})` : 'rgba(255,255,255,0.06)',
              color: page === i ? '#fff' : '#9aa0a6',
            }}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BacktestPanel({ stocks }) {
  const lang = useLangStore((s) => s.lang)
  const isCN = lang === 'zh'

  const [strategy, setStrategy] = useState('ma')
  const [period, setPeriod] = useState('1y')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeStock, setActiveStock] = useState(null)

  const stock = activeStock || stocks?.[0]

  const run = useCallback(async () => {
    if (!stock) return
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await getBacktest(stock.code, strategy, period)
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }, [stock, strategy, period])

  if (!stocks?.length) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#4a5568' }}>
      {isCN ? '请先搜索并添加股票' : 'Please add a stock first'}
    </div>
  )

  const btnStyle = (active) => ({
    padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? `linear-gradient(135deg,${ACCENT},${ACCENT2})` : 'rgba(255,255,255,0.05)',
    color: active ? '#fff' : '#9aa0a6', transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  })

  const ret = result?.total_return
  const bm_ret = result?.benchmark_return

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Config panel */}
      <div style={{
        background: THEME.gridBg, border: `1px solid ${THEME.border}`,
        borderRadius: 12, padding: '14px 18px',
      }}>
        {/* Stock selector (if multiple stocks) */}
        {stocks.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#4a5568', alignSelf: 'center' }}>
              {isCN ? '股票：' : 'Stock:'}
            </span>
            {stocks.map((s) => (
              <button key={s.code} onClick={() => { setActiveStock(s); setResult(null) }}
                style={btnStyle(stock?.code === s.code)}>
                {s.name || s.code}
              </button>
            ))}
          </div>
        )}

        {/* Strategy selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#4a5568', flexShrink: 0 }}>
            {isCN ? '策略：' : 'Strategy:'}
          </span>
          {STRATEGIES.map((s) => (
            <button key={s.key} onClick={() => { setStrategy(s.key); setResult(null) }}
              style={btnStyle(strategy === s.key)}>
              {isCN ? s.zh : s.en}
            </button>
          ))}
        </div>

        {/* Strategy description */}
        <div style={{
          fontSize: 11, color: '#9aa0a6', marginBottom: 10,
          padding: '6px 10px', background: 'rgba(255,255,255,0.02)',
          borderRadius: 6, border: '1px solid rgba(138,180,248,0.07)',
        }}>
          {isCN ? STRATEGY_DESC[strategy].zh : STRATEGY_DESC[strategy].en}
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#4a5568', flexShrink: 0 }}>
            {isCN ? '时间范围：' : 'Period:'}
          </span>
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => { setPeriod(p.key); setResult(null) }}
              style={btnStyle(period === p.key)}>
              {isCN ? p.zh : p.en}
            </button>
          ))}
        </div>

        {/* Run button */}
        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: '8px 28px', borderRadius: 20, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700,
            background: loading ? 'rgba(138,180,248,0.15)' : `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
            color: loading ? '#4a5568' : '#fff',
            boxShadow: loading ? 'none' : '0 2px 12px rgba(138,180,248,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {loading
            ? (isCN ? '回测中…（约10-20秒）' : 'Running… (~10-20s)')
            : (isCN ? '▶ 开始回测' : '▶ Run Backtest')
          }
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: '#ef4444', fontSize: 13, padding: '10px 16px',
          background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Key metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <MetricCard
              label={isCN ? '总收益率' : 'Total Return'}
              value={`${ret >= 0 ? '+' : ''}${ret?.toFixed(2)}%`}
              color={ret >= 0 ? '#22c55e' : '#ef4444'}
            />
            <MetricCard
              label={isCN ? '年化收益率' : 'CAGR'}
              value={`${result.cagr >= 0 ? '+' : ''}${result.cagr?.toFixed(2)}%`}
              color={result.cagr >= 0 ? '#22c55e' : '#ef4444'}
            />
            {bm_ret != null && (
              <MetricCard
                label={isCN ? `${result.benchmark_name}收益` : `${result.benchmark_name_en} Return`}
                value={`${bm_ret >= 0 ? '+' : ''}${bm_ret?.toFixed(2)}%`}
                color={bm_ret >= 0 ? '#84cc16' : '#f97316'}
              />
            )}
            <MetricCard
              label={isCN ? '最大回撤' : 'Max Drawdown'}
              value={`-${result.max_drawdown?.toFixed(2)}%`}
              color='#f97316'
            />
            <MetricCard
              label={isCN ? '夏普比率' : 'Sharpe Ratio'}
              value={result.sharpe?.toFixed(2)}
              color={result.sharpe >= 1 ? '#22c55e' : result.sharpe >= 0 ? '#fbbf24' : '#ef4444'}
            />
            <MetricCard
              label={isCN ? '胜率' : 'Win Rate'}
              value={`${result.win_rate?.toFixed(1)}%`}
              sub={`${result.total_trades} ${isCN ? '次交易' : 'trades'}`}
              color={result.win_rate >= 50 ? '#22c55e' : '#ef4444'}
            />
          </div>

          {/* Equity curve */}
          <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', marginBottom: 10 }}>
              {isCN ? '资金曲线（初始100万）' : 'Equity Curve (Initial ¥1M)'}
            </div>
            <EquityChart data={result} isCN={isCN} />
          </div>

          {/* Trade log */}
          <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', marginBottom: 10 }}>
              {isCN ? `交易记录（共 ${result.total_trades} 笔）` : `Trade Log (${result.total_trades} total)`}
            </div>
            <TradeTable trades={result.trades || []} isCN={isCN} />
          </div>

          <div style={{ fontSize: 10, color: '#4a5568', textAlign: 'right' }}>
            {isCN
              ? `* 回测仅为历史模拟，不代表未来收益。${result.is_cn ? 'A股已按T+1规则处理。' : ''}`
              : `* Backtest is historical simulation only, not a guarantee of future returns.`
            }
          </div>
        </div>
      )}
    </div>
  )
}
