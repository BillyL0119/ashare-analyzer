import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { getStockRisk } from '../api/stockApi'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { THEME } from '../utils/chartHelpers'

const COLORS = ['#64b5f6', '#ef5350', '#66bb6a', '#ffca28']

// ── Small helpers ─────────────────────────────────────────────────────────────

function pctColor(v, invert = false) {
  if (v == null) return THEME.text
  const pos = invert ? v < 0 : v > 0
  return pos ? '#ef5350' : '#26a69a'
}

function Pill({ value, suffix = '%', invert = false, decimals = 2 }) {
  if (value == null) return <span style={{ color: '#484f58' }}>—</span>
  const color = pctColor(value, invert)
  return <span style={{ color, fontWeight: 600 }}>{value > 0 && !invert ? '+' : ''}{Number(value).toFixed(decimals)}{suffix}</span>
}

function MetricRow({ label, value, suffix = '', decimals = 2, invert = false, hint }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${THEME.border}` }}>
      <span style={{ color: '#8b949e', fontSize: 12 }}>
        {label}
        {hint && <span style={{ color: '#484f58', fontSize: 11, marginLeft: 4 }}>({hint})</span>}
      </span>
      <Pill value={value} suffix={suffix} invert={invert} decimals={decimals} />
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ color: '#58a6ff', fontSize: 13, fontWeight: 600, margin: '16px 0 8px', letterSpacing: 0.3 }}>
      {children}
    </div>
  )
}

// ── VaR / CVaR table ─────────────────────────────────────────────────────────

function VaRTable({ varCvar, t }) {
  const cols = [
    { key: 95, label: t.confidence95 },
    { key: 99, label: t.confidence99 },
  ]
  const rows = [
    { label: `${t.riskHistorical} VaR`, field: 'hist_var' },
    { label: `${t.riskHistorical} CVaR`, field: 'hist_cvar' },
    { label: `${t.riskParametric} VaR`, field: 'param_var' },
    { label: `${t.riskParametric} CVaR`, field: 'param_cvar' },
  ]
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: '#21262d' }}>
          <th style={{ padding: '7px 10px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{t.metric}</th>
          {cols.map(c => <th key={c.key} style={{ padding: '7px 10px', textAlign: 'right', color: '#64b5f6', fontWeight: 600 }}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.field} style={{ borderBottom: `1px solid ${THEME.border}` }}>
            <td style={{ padding: '6px 10px', color: '#8b949e' }}>{r.label}</td>
            {cols.map(c => {
              const v = varCvar[c.key]?.[r.field]
              return (
                <td key={c.key} style={{ padding: '6px 10px', textAlign: 'right', color: '#ff9800', fontWeight: 600 }}>
                  {v != null ? `${v.toFixed(3)}%` : '—'}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Drawdown chart ────────────────────────────────────────────────────────────

function DrawdownChart({ series, t }) {
  const option = {
    backgroundColor: THEME.gridBg,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13,17,23,0.9)',
      borderColor: THEME.border,
      textStyle: { color: THEME.text, fontSize: 11 },
      formatter: (params) => `${params[0].axisValue}: ${params[0].data.toFixed(2)}%`,
    },
    grid: { top: 16, bottom: 30, left: 56, right: 12 },
    xAxis: {
      type: 'category',
      data: series.map((_, i) => i),
      axisLabel: { show: false },
      axisLine: { lineStyle: { color: THEME.border } },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
      axisLabel: { color: THEME.text, fontSize: 10, formatter: v => `${v.toFixed(0)}%` },
    },
    series: [{
      type: 'line',
      data: series,
      showSymbol: false,
      lineStyle: { width: 1.5, color: '#ef5350' },
      itemStyle: { color: '#ef5350' },
      areaStyle: { color: 'rgba(239,83,80,0.15)' },
    }],
  }
  return (
    <ReactECharts option={option} style={{ height: 180, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge={true} />
  )
}

// ── Return distribution ───────────────────────────────────────────────────────

function DistributionChart({ distribution, t }) {
  const { centers, counts } = distribution
  const colors = centers.map(c => c >= 0 ? 'rgba(239,83,80,0.7)' : 'rgba(38,166,154,0.7)')
  const option = {
    backgroundColor: THEME.gridBg,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(13,17,23,0.9)',
      borderColor: THEME.border,
      textStyle: { color: THEME.text, fontSize: 11 },
      formatter: (p) => `${p[0].axisValue.toFixed(2)}%: ${p[0].data}`,
    },
    grid: { top: 16, bottom: 30, left: 40, right: 12 },
    xAxis: {
      type: 'category',
      data: centers,
      axisLabel: { color: THEME.text, fontSize: 9, formatter: v => `${Number(v).toFixed(1)}%` },
      axisLine: { lineStyle: { color: THEME.border } },
    },
    yAxis: {
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
      axisLabel: { color: THEME.text, fontSize: 9 },
    },
    series: [{
      type: 'bar',
      data: counts.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
      barMaxWidth: 14,
    }],
  }
  return (
    <ReactECharts option={option} style={{ height: 180, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge={true} />
  )
}

// ── Stress test table ─────────────────────────────────────────────────────────

function StressTable({ tests, t, lang }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: '#21262d' }}>
          <th style={{ padding: '7px 10px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{t.riskScenario}</th>
          <th style={{ padding: '7px 10px', textAlign: 'right', color: '#8b949e', fontWeight: 500 }}>{t.riskShock}</th>
          <th style={{ padding: '7px 10px', textAlign: 'right', color: '#8b949e', fontWeight: 500 }}>{t.riskPrice}</th>
          <th style={{ padding: '7px 10px', textAlign: 'right', color: '#8b949e', fontWeight: 500 }}>{t.riskZScore}</th>
          <th style={{ padding: '7px 10px', textAlign: 'right', color: '#8b949e', fontWeight: 500 }}>{t.riskProb}</th>
        </tr>
      </thead>
      <tbody>
        {tests.map((s, i) => {
          const isDown = s.shock_pct < 0
          return (
            <tr key={i} style={{ borderBottom: `1px solid ${THEME.border}` }}>
              <td style={{ padding: '6px 10px', color: THEME.text }}>{lang === 'en' ? s.name_en : s.name_zh}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: isDown ? '#26a69a' : '#ef5350', fontWeight: 600 }}>
                {s.shock_pct > 0 ? '+' : ''}{s.shock_pct}%
              </td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: THEME.text }}>{s.stressed_price}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#8b949e' }}>{s.z_score ?? '—'}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#8b949e' }}>{s.prob_pct != null ? `${s.prob_pct}%` : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Per-stock risk card ───────────────────────────────────────────────────────

function StockRiskCard({ stock, color, t, lang, period, startDate, endDate, adjust }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getStockRisk(stock.code, { period, start_date: startDate, end_date: endDate, adjust })
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => { setError(err?.response?.data?.detail || 'Error'); setLoading(false) })
  }, [stock.code, period, startDate, endDate, adjust])

  return (
    <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color, fontWeight: 700, fontSize: 15 }}>{stock.name}</span>
        <span style={{ color: '#8b949e', fontSize: 13 }}>{stock.code}</span>
        {data && <span style={{ marginLeft: 'auto', color: '#484f58', fontSize: 12 }}>{data.trading_days} {lang === 'en' ? 'days' : '个交易日'} | {lang === 'en' ? 'Price' : '当前价'}: {data.current_price}</span>}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#8b949e' }}>{t.riskLoading}</div>}
      {error && <div style={{ color: '#ef5350', fontSize: 13 }}>{error}</div>}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Top summary strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, background: '#0d1117', borderRadius: 6, padding: '12px 8px', marginBottom: 8 }}>
            {[
              { label: t.riskAnnReturn, v: data.tail_metrics.ann_return, s: '%' },
              { label: t.riskAnnVol, v: data.tail_metrics.ann_volatility, s: '%', invert: true },
              { label: t.sharpe, v: data.tail_metrics.sharpe, s: '' },
              { label: t.riskSortino, v: data.tail_metrics.sortino, s: '' },
            ].map(({ label, v, s, invert }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ color: '#8b949e', fontSize: 11, marginBottom: 3 }}>{label}</div>
                <Pill value={v} suffix={s} invert={invert} decimals={2} />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Left column */}
            <div>
              <SectionTitle>{t.riskVaR} / {t.riskCVaR}</SectionTitle>
              <VaRTable varCvar={data.var_cvar} t={t} />

              <SectionTitle>{t.riskDrawdown}</SectionTitle>
              {[
                { label: t.riskMaxDD, v: data.drawdowns.max_drawdown, invert: true },
                { label: t.riskCurDD, v: data.drawdowns.current_drawdown, invert: true },
                { label: t.riskAvgDD, v: data.drawdowns.avg_drawdown, invert: true },
                { label: t.riskMaxDur, v: data.drawdowns.max_duration_days, s: ` ${t.days}`, decimals: 0 },
                { label: t.riskCurDur, v: data.drawdowns.current_duration_days, s: ` ${t.days}`, decimals: 0 },
                { label: t.riskRecovery, v: data.drawdowns.recovery_factor, s: 'x', invert: false },
              ].map(({ label, v, s = '%', invert = false, decimals = 2 }) => (
                <MetricRow key={label} label={label} value={v} suffix={s} invert={invert} decimals={decimals} />
              ))}

              <SectionTitle>{t.riskDDChart}</SectionTitle>
              <DrawdownChart series={data.drawdown_series} t={t} />
            </div>

            {/* Right column */}
            <div>
              <SectionTitle>{t.riskTailMetrics}</SectionTitle>
              {[
                { label: t.riskCalmar, v: data.tail_metrics.calmar, s: '' },
                { label: t.riskOmega, v: data.tail_metrics.omega, s: '' },
                { label: t.riskTailRatio, v: data.tail_metrics.tail_ratio, s: '', decimals: 3 },
                { label: t.riskSkew, v: data.tail_metrics.skewness, s: '', invert: true, decimals: 3 },
                { label: t.riskKurt, v: data.tail_metrics.kurtosis, s: '', invert: true, decimals: 3 },
                { label: t.riskWinRate, v: data.tail_metrics.win_rate, s: '%' },
                { label: t.riskAvgGain, v: data.tail_metrics.avg_gain, s: '%' },
                { label: t.riskAvgLoss, v: data.tail_metrics.avg_loss, s: '%', invert: true },
                { label: t.riskBestDay, v: data.tail_metrics.best_day, s: '%' },
                { label: t.riskWorstDay, v: data.tail_metrics.worst_day, s: '%', invert: true },
              ].map(({ label, v, s = '%', invert = false, decimals = 2 }) => (
                <MetricRow key={label} label={label} value={v} suffix={s} invert={invert} decimals={decimals} />
              ))}

              <SectionTitle>{t.riskDistribution}</SectionTitle>
              <DistributionChart distribution={data.distribution} t={t} />
            </div>
          </div>

          {/* Stress tests — full width */}
          <SectionTitle>{t.riskStress}</SectionTitle>
          <StressTable tests={data.stress_tests} t={t} lang={lang} />
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function RiskPanel({ stocks }) {
  const { period, startDate, endDate, adjust } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {stocks.map((stock, i) => (
        <StockRiskCard
          key={stock.code}
          stock={stock}
          color={COLORS[i % COLORS.length]}
          t={t}
          lang={lang}
          period={period}
          startDate={startDate}
          endDate={endDate}
          adjust={adjust}
        />
      ))}
    </div>
  )
}
