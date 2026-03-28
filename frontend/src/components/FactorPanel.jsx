import { useState, useEffect, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { getStockFactor } from '../api/stockApi'
import { THEME } from '../utils/chartHelpers'

const COLORS = ['#8ab4f8', '#f78166', '#3fb950', '#d2a8ff']

function bold(text) {
  if (!text) return []
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function MetricRow({ label, value, sub, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: `1px solid ${THEME.border}` }}>
      <span style={{ color: '#9aa0a6', fontSize: 13 }}>{label}</span>
      <span style={{ color: color || THEME.text, fontWeight: 600, fontSize: 14 }}>
        {value}
        {sub && <span style={{ color: '#9aa0a6', fontSize: 12, marginLeft: 4 }}>{sub}</span>}
      </span>
    </div>
  )
}

function RollingBetaChart({ rolling, t }) {
  const validPoints = rolling.filter(p => p.beta !== null)
  if (validPoints.length === 0) return null

  const dates = validPoints.map(p => p.date)
  const betas = validPoints.map(p => p.beta)

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 30, right: 20, bottom: 40, left: 50 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13,17,23,0.9)',
      borderColor: THEME.border,
      textStyle: { color: THEME.text, fontSize: 12 },
      formatter: (params) => {
        const p = params[0]
        return `${p.axisValue}<br/>Beta: <b>${p.value}</b>`
      },
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#9aa0a6', fontSize: 11,
        formatter: (v) => v.substring(0, 4) !== dates[0].substring(0, 4) || dates.indexOf(v) === 0
          ? v.substring(0, 7) : v.substring(5, 7) },
      axisLine: { lineStyle: { color: THEME.border } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9aa0a6', fontSize: 11 },
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
    },
    series: [
      {
        type: 'line',
        data: betas,
        smooth: true,
        lineStyle: { color: '#8ab4f8', width: 2 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(138,180,248,0.3)' },
                       { offset: 1, color: 'rgba(138,180,248,0)' }] } },
        symbol: 'none',
      },
      {
        type: 'line',
        data: new Array(betas.length).fill(1),
        lineStyle: { color: '#9aa0a6', width: 1, type: 'dashed' },
        symbol: 'none',
        tooltip: { show: false },
      },
    ],
  }

  return (
    <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`,
      borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ color: THEME.text, fontSize: 13, marginBottom: 8 }}>{t.factorRollingBeta}</div>
      <ReactECharts option={option} style={{ height: 200, width: '100%' }}
        opts={{ renderer: 'canvas' }} notMerge={true} />
    </div>
  )
}

function RiskDecompositionBar({ pctSys, pctIdio, t }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#9aa0a6', fontSize: 12 }}>{t.factorSysRisk}: {pctSys}%</span>
        <span style={{ color: '#9aa0a6', fontSize: 12 }}>{t.factorIdioRisk}: {pctIdio}%</span>
      </div>
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden',
        background: THEME.border }}>
        <div style={{ width: `${pctSys}%`, background: '#8ab4f8', transition: 'width 0.5s' }} />
        <div style={{ width: `${pctIdio}%`, background: '#3fb950', transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
        <span style={{ color: '#8ab4f8', fontSize: 11 }}>■ Systematic</span>
        <span style={{ color: '#3fb950', fontSize: 11 }}>■ Idiosyncratic</span>
      </div>
    </div>
  )
}

function CorrelationBars({ correlations, t }) {
  const items = Object.entries(correlations)
    .filter(([, v]) => v.correlation !== null)
    .sort((a, b) => Math.abs(b[1].correlation) - Math.abs(a[1].correlation))

  if (items.length === 0) return null

  return (
    <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`,
      borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ color: THEME.text, fontSize: 13, marginBottom: 10 }}>{t.factorCorrelations}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '6px 12px',
        alignItems: 'center' }}>
        {items.map(([sym, v]) => {
          const pct = Math.abs(v.correlation) * 100
          const isPos = v.correlation >= 0
          return [
            <span key={`n-${sym}`} style={{ color: '#9aa0a6', fontSize: 12, whiteSpace: 'nowrap' }}>
              {t === T.zh ? v.zh : v.en}
            </span>,
            <div key={`b-${sym}`} style={{ position: 'relative', height: 8, borderRadius: 4,
              background: THEME.border, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${pct}%`, background: isPos ? '#8ab4f8' : '#f85149',
                borderRadius: 4, transition: 'width 0.5s' }} />
            </div>,
            <span key={`c-${sym}`} style={{ color: isPos ? '#8ab4f8' : '#f85149',
              fontSize: 12, fontWeight: 600 }}>
              {v.correlation.toFixed(3)}
            </span>,
            <span key={`bt-${sym}`} style={{ color: '#9aa0a6', fontSize: 12 }}>
              β={v.beta.toFixed(2)}
            </span>,
          ]
        })}
      </div>
    </div>
  )
}

function StockFactor({ stock, color, t, lang, params }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getStockFactor(stock.code, params)
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => {
        setError(err.response?.data?.detail || 'Error')
        setLoading(false)
      })
  }, [stock.code, params.period, params.start_date, params.end_date, params.adjust])

  const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${THEME.border}`,
    borderRadius: 10,
    padding: 16,
    flex: '1 1 400px',
    minWidth: 320,
  }

  if (loading) return (
    <div style={cardStyle}>
      <div style={{ color, fontWeight: 700, marginBottom: 12 }}>{stock.name} ({stock.code})</div>
      <div style={{ color: '#9aa0a6', fontSize: 13 }}>{t.factorLoading}</div>
    </div>
  )

  if (error) return (
    <div style={cardStyle}>
      <div style={{ color, fontWeight: 700, marginBottom: 12 }}>{stock.name} ({stock.code})</div>
      <div style={{ color: '#f85149', fontSize: 13 }}>{error}</div>
    </div>
  )

  const betaColor = data.beta > 1.2 ? '#f85149' : data.beta < 0.8 ? '#3fb950' : '#8ab4f8'
  const alphaColor = data.alpha_annual_pct >= 0 ? '#ef5350' : '#26a69a'

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14 }}>
        <span style={{ color, fontWeight: 700, fontSize: 15 }}>{stock.name} ({stock.code})</span>
        <span style={{ color: '#9aa0a6', fontSize: 12 }}>{t.factorSummary} · {data.sample_days}d</span>
      </div>

      {/* Key metrics strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: t.factorBeta, val: data.beta.toFixed(2), color: betaColor },
          { label: t.factorAlpha, val: `${data.alpha_annual_pct > 0 ? '+' : ''}${data.alpha_annual_pct.toFixed(1)}%`, color: alphaColor },
          { label: t.factorRSquared, val: data.r_squared.toFixed(2), color: THEME.text },
          { label: t.factorTreynor, val: data.treynor_ratio !== null ? data.treynor_ratio.toFixed(2) : 'N/A', color: THEME.text },
        ].map(({ label, val, color: c }) => (
          <div key={label} style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`,
            borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ color: '#9aa0a6', fontSize: 11, marginBottom: 3 }}>{label}</div>
            <div style={{ color: c, fontWeight: 700, fontSize: 16 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`,
        borderRadius: 8, padding: '4px 12px', marginBottom: 12 }}>
        <MetricRow label={t.factorAnnReturn}
          value={`${data.ann_return_pct > 0 ? '+' : ''}${data.ann_return_pct.toFixed(1)}%`}
          color={data.ann_return_pct >= 0 ? '#ef5350' : '#26a69a'} />
        <MetricRow label={t.factorMktReturn}
          value={`${data.mkt_ann_return_pct > 0 ? '+' : ''}${data.mkt_ann_return_pct.toFixed(1)}%`}
          color={data.mkt_ann_return_pct >= 0 ? '#ef5350' : '#26a69a'} />
        <MetricRow label={t.factorAnnVol} value={`${data.ann_vol_pct.toFixed(1)}%`} />
        <MetricRow label={t.factorInfoRatio}
          value={data.information_ratio !== null ? data.information_ratio.toFixed(2) : 'N/A'} />
        <MetricRow label={t.factorTrackingError} value={`${data.tracking_error_pct.toFixed(1)}%`} />
        <MetricRow label={t.factorBetaSE} value={data.beta_se.toFixed(4)} />
      </div>

      {/* Risk decomposition */}
      <RiskDecompositionBar pctSys={data.pct_systematic} pctIdio={data.pct_idiosyncratic} t={t} />

      {/* Rolling beta chart */}
      <RollingBetaChart rolling={data.rolling_beta} t={t} />

      {/* Index correlations */}
      <CorrelationBars correlations={data.correlations} t={t} />

      {/* Interpretation */}
      <div style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`,
        borderRadius: 8, padding: 12 }}>
        <div style={{ color: THEME.text, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          {t.factorInterpret}
        </div>
        {(lang === 'zh' ? data.interpretation.zh : data.interpretation.en)
          .split('\n\n')
          .map((para, i) => (
            <p key={i} style={{ color: '#9aa0a6', fontSize: 13, lineHeight: 1.7, margin: '0 0 8px' }}>
              {bold(para)}
            </p>
          ))}
      </div>
    </div>
  )
}

export default function FactorPanel({ stocks }) {
  const { period, startDate, endDate, adjust } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]

  const params = {
    period,
    start_date: startDate,
    end_date: endDate,
    adjust,
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {stocks.map((stock, i) => (
        <StockFactor
          key={stock.code}
          stock={stock}
          color={COLORS[i % COLORS.length]}
          t={t}
          lang={lang}
          params={params}
        />
      ))}
    </div>
  )
}
