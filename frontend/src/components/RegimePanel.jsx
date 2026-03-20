import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { getStockRegime } from '../api/stockApi'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { THEME } from '../utils/chartHelpers'

const STOCK_COLORS = ['#64b5f6', '#ef5350', '#66bb6a', '#ffca28']

const REGIME_COLORS = {
  bull:     '#ef5350',
  bear:     '#26a69a',
  sideways: '#ff9800',
  crisis:   '#ab47bc',
}

const REGIME_KEYS = ['bull', 'bear', 'sideways', 'crisis']

function regimeLabel(key, lang) {
  const map = {
    bull:     { zh: '牛市', en: 'Bull' },
    bear:     { zh: '熊市', en: 'Bear' },
    sideways: { zh: '震荡', en: 'Sideways' },
    crisis:   { zh: '危机', en: 'Crisis' },
  }
  return map[key]?.[lang] ?? key
}

// ── Current regime badge ──────────────────────────────────────────────────────

function RegimeBadge({ regime, duration, lang, t }) {
  const color = REGIME_COLORS[regime] ?? '#8b949e'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        background: color + '22',
        border: `2px solid ${color}`,
        borderRadius: 8,
        padding: '8px 18px',
        textAlign: 'center',
      }}>
        <div style={{ color, fontSize: 20, fontWeight: 800 }}>{regimeLabel(regime, lang)}</div>
        <div style={{ color: '#8b949e', fontSize: 11, marginTop: 2 }}>{t.regimeCurrent}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: THEME.text, fontSize: 22, fontWeight: 700 }}>{duration}</div>
        <div style={{ color: '#8b949e', fontSize: 11 }}>{t.regimeDuration} ({lang === 'en' ? 'd' : '天'})</div>
      </div>
    </div>
  )
}

// ── Regime breakdown donut-style bars ─────────────────────────────────────────

function RegimeBreakdown({ stats, lang, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {REGIME_KEYS.map(key => {
        const s = stats[key]
        const color = REGIME_COLORS[key]
        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color }}>{regimeLabel(key, lang)}</span>
              <span style={{ color: '#8b949e' }}>{s.days}{lang === 'en' ? 'd' : '天'} &nbsp;
                <span style={{ color: THEME.text, fontWeight: 600 }}>{s.pct}%</span>
                &nbsp;| avg {s.avg_daily_return > 0 ? '+' : ''}{s.avg_daily_return.toFixed(3)}%/d
              </span>
            </div>
            <div style={{ background: '#21262d', borderRadius: 3, height: 7, overflow: 'hidden' }}>
              <div style={{ width: `${s.pct}%`, height: '100%', background: color, borderRadius: 3 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Coloured price chart with regime background bands ─────────────────────────

function RegimePriceChart({ series, lang, t }) {
  if (!series || series.length === 0) return null

  const dates = series.map(d => d.date.slice(0, 10))
  const closes = series.map(d => d.close)

  // Build visual map pieces for background colouring
  const pieces = []
  let segStart = 0
  for (let i = 1; i <= series.length; i++) {
    const prev = series[i - 1]?.regime
    const cur  = series[i]?.regime
    if (cur !== prev || i === series.length) {
      if (prev && REGIME_COLORS[prev]) {
        pieces.push({
          gt: segStart - 0.5,
          lte: i - 0.5,
          color: REGIME_COLORS[prev] + '28',
        })
      }
      segStart = i
    }
  }

  // Rolling return & vol series (secondary axes)
  const rollRet = series.map(d => d.roll_ret)
  const rollVol = series.map(d => d.roll_vol)

  const option = {
    backgroundColor: THEME.gridBg,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(13,17,23,0.9)',
      borderColor: THEME.border,
      textStyle: { color: THEME.text, fontSize: 11 },
      formatter: (params) => {
        const idx = params[0]?.dataIndex
        const row = series[idx]
        if (!row) return ''
        let html = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`
        html += `<div>Price: <b>${row.close}</b></div>`
        if (row.regime) {
          const col = REGIME_COLORS[row.regime]
          html += `<div>Regime: <span style="color:${col};font-weight:700">${regimeLabel(row.regime, lang)}</span></div>`
        }
        if (row.roll_ret != null) html += `<div>Roll Ret: ${row.roll_ret > 0 ? '+' : ''}${row.roll_ret.toFixed(2)}%</div>`
        if (row.roll_vol != null) html += `<div>Roll Vol: ${row.roll_vol.toFixed(1)}%</div>`
        html += `<div>Drawdown: ${row.drawdown.toFixed(2)}%</div>`
        return html
      },
    },
    legend: {
      top: 4, left: 8,
      textStyle: { color: THEME.text, fontSize: 10 },
      data: [t.regimePriceChart, t.regimeRollRet, t.regimeRollVol],
    },
    visualMap: {
      show: false,
      dimension: 0,
      pieces,
      seriesIndex: 0,
    },
    grid: [
      { top: 36, bottom: '38%', left: 64, right: 12 },
      { top: '65%', bottom: 30, left: 64, right: 12 },
    ],
    xAxis: [
      { type: 'category', data: dates, axisLabel: { show: false }, axisLine: { lineStyle: { color: THEME.border } }, axisTick: { show: false }, splitLine: { show: false }, gridIndex: 0 },
      { type: 'category', data: dates, axisLabel: { color: THEME.text, fontSize: 9 }, axisLine: { lineStyle: { color: THEME.border } }, axisTick: { show: false }, splitLine: { show: false }, gridIndex: 1 },
    ],
    yAxis: [
      { scale: true, splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } }, axisLabel: { color: THEME.text, fontSize: 10 }, gridIndex: 0 },
      { scale: true, splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } }, axisLabel: { color: THEME.text, fontSize: 9, formatter: v => `${v.toFixed(0)}%` }, gridIndex: 1 },
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: 0, end: 100 },
      { type: 'slider', xAxisIndex: [0, 1], start: 0, end: 100, height: 16, bottom: 0, borderColor: THEME.border, textStyle: { color: THEME.text }, fillerColor: 'rgba(100,181,246,0.1)' },
    ],
    series: [
      {
        name: t.regimePriceChart,
        type: 'line',
        data: closes,
        showSymbol: false,
        lineStyle: { width: 1.8, color: '#64b5f6' },
        itemStyle: { color: '#64b5f6' },
        xAxisIndex: 0, yAxisIndex: 0,
      },
      {
        name: t.regimeRollRet,
        type: 'line',
        data: rollRet,
        showSymbol: false,
        lineStyle: { width: 1.3, color: '#66bb6a' },
        itemStyle: { color: '#66bb6a' },
        xAxisIndex: 1, yAxisIndex: 1,
      },
      {
        name: t.regimeRollVol,
        type: 'line',
        data: rollVol,
        showSymbol: false,
        lineStyle: { width: 1.3, color: '#ff9800' },
        itemStyle: { color: '#ff9800' },
        xAxisIndex: 1, yAxisIndex: 1,
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 440, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge={true}
    />
  )
}

// ── Transition history table ───────────────────────────────────────────────────

function TransitionTable({ transitions, lang, t }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#21262d' }}>
            {[t.regimeStart, t.regimeEnd, t.regimeCurrent, t.regimeDuration, t.regimeReturn].map(h => (
              <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...transitions].reverse().map((tr, i) => {
            const color = REGIME_COLORS[tr.regime] ?? THEME.text
            return (
              <tr key={i} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                <td style={{ padding: '6px 10px', color: '#8b949e' }}>{tr.start_date.slice(0, 10)}</td>
                <td style={{ padding: '6px 10px', color: '#8b949e' }}>{tr.end_date.slice(0, 10)}</td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ color, background: color + '22', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
                    {regimeLabel(tr.regime, lang)}
                  </span>
                </td>
                <td style={{ padding: '6px 10px', color: THEME.text }}>{tr.duration}{lang === 'en' ? 'd' : '天'}</td>
                <td style={{ padding: '6px 10px', color: tr.return_pct >= 0 ? '#ef5350' : '#26a69a', fontWeight: 600 }}>
                  {tr.return_pct > 0 ? '+' : ''}{tr.return_pct.toFixed(2)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Interpretation block ──────────────────────────────────────────────────────

function Interpretation({ text }) {
  const sections = text.split('\n\n')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sections.map((s, i) => {
        const renderBold = (str) =>
          str.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} style={{ color: '#e6edf3' }}>{part.slice(2, -2)}</strong>
              : part
          )
        return (
          <div key={i} style={{ background: '#1c2128', border: `1px solid ${THEME.border}`, borderRadius: 6, padding: '9px 13px', color: '#c9d1d9', fontSize: 13, lineHeight: 1.7 }}>
            {renderBold(s)}
          </div>
        )
      })}
    </div>
  )
}

// ── Per-stock card ────────────────────────────────────────────────────────────

function StockRegimeCard({ stock, color, t, lang, period, startDate, endDate, adjust, window: win }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getStockRegime(stock.code, { period, start_date: startDate, end_date: endDate, adjust, window: win })
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => { setError(err?.response?.data?.detail || 'Error'); setLoading(false) })
  }, [stock.code, period, startDate, endDate, adjust, win])

  return (
    <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ color, fontWeight: 700, fontSize: 15 }}>{stock.name}</span>
        <span style={{ color: '#8b949e', fontSize: 13 }}>{stock.code}</span>
        {data && (
          <span style={{ marginLeft: 'auto', color: '#484f58', fontSize: 12 }}>
            {t.regimeWindow}: {data.window}{lang === 'en' ? 'd' : '天'} &nbsp;|&nbsp; {data.series.length} {lang === 'en' ? 'bars' : '根K线'}
          </span>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#8b949e' }}>{t.regimeLoading}</div>}
      {error && <div style={{ color: '#ef5350', fontSize: 13 }}>{error}</div>}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Current regime + breakdown side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'start', background: '#0d1117', borderRadius: 6, padding: '14px 18px' }}>
            <RegimeBadge regime={data.current_regime} duration={data.current_duration_days} lang={lang} t={t} />
            <RegimeBreakdown stats={data.regime_stats} lang={lang} t={t} />
          </div>

          {/* Price + regime chart */}
          <div>
            <div style={{ color: '#58a6ff', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.regimePriceChart}</div>
            <RegimePriceChart series={data.series} lang={lang} t={t} />
          </div>

          {/* Transition history */}
          <div>
            <div style={{ color: '#58a6ff', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.regimeHistory}</div>
            <TransitionTable transitions={data.transitions} lang={lang} t={t} />
          </div>

          {/* Interpretation */}
          <div>
            <div style={{ color: '#58a6ff', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.regimeInterpret}</div>
            <Interpretation text={data.interpretation[lang]} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function RegimePanel({ stocks }) {
  const { period, startDate, endDate, adjust } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const [win, setWin] = useState(20)

  const btnStyle = (active) => ({
    padding: '4px 10px', borderRadius: 4, fontSize: 12, border: `1px solid ${active ? '#1f6feb' : THEME.border}`,
    background: active ? '#1f6feb22' : '#21262d', color: active ? '#64b5f6' : THEME.text, cursor: 'pointer',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: THEME.gridBg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '10px 16px' }}>
        <span style={{ color: '#8b949e', fontSize: 13 }}>{t.regimeWindow}:</span>
        {[10, 20, 40, 60].map(w => (
          <button key={w} style={btnStyle(win === w)} onClick={() => setWin(w)}>{w}{lang === 'en' ? 'd' : '天'}</button>
        ))}
        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {REGIME_KEYS.map(k => (
            <span key={k} style={{ fontSize: 12, color: REGIME_COLORS[k], display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: REGIME_COLORS[k], display: 'inline-block' }} />
              {regimeLabel(k, lang)}
            </span>
          ))}
        </div>
      </div>

      {stocks.map((stock, i) => (
        <StockRegimeCard
          key={stock.code}
          stock={stock}
          color={STOCK_COLORS[i % STOCK_COLORS.length]}
          t={t}
          lang={lang}
          period={period}
          startDate={startDate}
          endDate={endDate}
          adjust={adjust}
          window={win}
        />
      ))}
    </div>
  )
}
