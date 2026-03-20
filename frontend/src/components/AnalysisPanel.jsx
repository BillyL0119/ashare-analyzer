import { useState, useEffect } from 'react'
import { getPairAnalysis } from '../api/stockApi'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { THEME } from '../utils/chartHelpers'

const COLORS = ['#64b5f6', '#ef5350', '#66bb6a', '#ffca28']

function GaugeBar({ value, label, color }) {
  const pct = Math.round(((value + 1) / 2) * 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8b949e', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{value.toFixed(2)}</span>
      </div>
      <div style={{ background: '#21262d', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function StatRow({ label, v1, v2, highlight = false }) {
  return (
    <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
      <td style={{ padding: '7px 10px', color: '#8b949e', fontSize: 12, whiteSpace: 'nowrap' }}>{label}</td>
      <td style={{
        padding: '7px 10px', textAlign: 'right', fontSize: 12, fontWeight: highlight ? 600 : 400,
        color: highlight ? (parseFloat(v1) > parseFloat(v2) ? '#ef5350' : parseFloat(v1) < parseFloat(v2) ? '#26a69a' : THEME.text) : THEME.text,
      }}>
        {v1}
      </td>
      <td style={{
        padding: '7px 10px', textAlign: 'right', fontSize: 12, fontWeight: highlight ? 600 : 400,
        color: highlight ? (parseFloat(v2) > parseFloat(v1) ? '#ef5350' : parseFloat(v2) < parseFloat(v1) ? '#26a69a' : THEME.text) : THEME.text,
      }}>
        {v2}
      </td>
    </tr>
  )
}

function InterpretationBlock({ text }) {
  const sections = text.split('\n\n')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sections.map((section, i) => {
        const [title, ...rest] = section.split('\n')
        const body = rest.join('\n')
        const renderBold = (str) =>
          str.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} style={{ color: '#e6edf3' }}>{part.slice(2, -2)}</strong>
              : part
          )
        return (
          <div key={i} style={{ background: '#1c2128', border: `1px solid ${THEME.border}`, borderRadius: 6, padding: '10px 14px' }}>
            <div style={{ color: '#58a6ff', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{title}</div>
            <div style={{ color: '#c9d1d9', fontSize: 13, lineHeight: 1.7 }}>{renderBold(body)}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalysisPanel({ stocks }) {
  const { period, startDate, endDate, adjust } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const [pairs, setPairs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (stocks.length < 2) return
    const pairList = []
    for (let i = 0; i < stocks.length - 1; i++) {
      for (let j = i + 1; j < stocks.length; j++) {
        pairList.push([stocks[i], stocks[j]])
      }
    }

    setLoading(true)
    Promise.all(
      pairList.map(([a, b]) =>
        getPairAnalysis(a.code, b.code, { period, start_date: startDate, end_date: endDate, adjust, lang })
          .then((res) => ({ a, b, data: res.data }))
          .catch((err) => ({ a, b, error: err?.response?.data?.detail || (lang === 'en' ? 'Analysis failed' : '分析失败') }))
      )
    ).then((results) => {
      setPairs(results)
      setLoading(false)
    })
  }, [stocks, period, startDate, endDate, adjust, lang])

  if (stocks.length < 2) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#484f58', fontSize: 14 }}>{t.needTwoStocks}</div>
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 10, color: '#8b949e' }}>
        {t.calculating}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {pairs.map(({ a, b, data, error: pairErr }, idx) => {
        const colorA = COLORS[stocks.findIndex((s) => s.code === a.code) % COLORS.length]
        const colorB = COLORS[stocks.findIndex((s) => s.code === b.code) % COLORS.length]

        return (
          <div key={idx} style={{ background: THEME.gridBg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ color: colorA, fontWeight: 700, fontSize: 15 }}>{a.name}</span>
              <span style={{ color: '#8b949e', fontSize: 13 }}>{a.code}</span>
              <span style={{ color: '#484f58', margin: '0 4px' }}>vs</span>
              <span style={{ color: colorB, fontWeight: 700, fontSize: 15 }}>{b.name}</span>
              <span style={{ color: '#8b949e', fontSize: 13 }}>{b.code}</span>
              {data && (
                <span style={{ marginLeft: 'auto', color: '#484f58', fontSize: 12 }}>
                  {t.tradingDays(data.trading_days)}
                </span>
              )}
            </div>

            {pairErr && <div style={{ color: '#ef5350', fontSize: 13 }}>{pairErr}</div>}

            {data && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#0d1117', borderRadius: 6, padding: '14px 18px' }}>
                  <GaugeBar value={data.correlation} label={t.returnCorr} color="#64b5f6" />
                  <GaugeBar value={data.price_similarity} label={t.priceSim} color="#66bb6a" />
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#21262d' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{t.metric}</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: colorA, fontWeight: 600 }}>{data.stock1.name} ({a.code})</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: colorB, fontWeight: 600 }}>{data.stock2.name} ({b.code})</th>
                      </tr>
                    </thead>
                    <tbody>
                      <StatRow label={t.periodReturn} v1={`${data.stock1.total_return > 0 ? '+' : ''}${data.stock1.total_return.toFixed(2)}%`} v2={`${data.stock2.total_return > 0 ? '+' : ''}${data.stock2.total_return.toFixed(2)}%`} highlight />
                      <StatRow label={t.annVol} v1={`${data.stock1.volatility.toFixed(1)}%`} v2={`${data.stock2.volatility.toFixed(1)}%`} />
                      <StatRow label={t.maxDD} v1={`-${data.stock1.max_drawdown.toFixed(1)}%`} v2={`-${data.stock2.max_drawdown.toFixed(1)}%`} />
                      <StatRow label={t.sharpe} v1={data.stock1.sharpe.toFixed(2)} v2={data.stock2.sharpe.toFixed(2)} highlight />
                      <StatRow label={t.trend} v1={data.stock1.trend} v2={data.stock2.trend} />
                      <StatRow label={t.support} v1={data.stock1.support_resistance.support} v2={data.stock2.support_resistance.support} />
                      <StatRow label={t.resistance} v1={data.stock1.support_resistance.resistance} v2={data.stock2.support_resistance.resistance} />
                      <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <td style={{ padding: '7px 10px', color: '#8b949e', fontSize: 12 }}>{t.patterns}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: 12, color: THEME.text }}>
                          {data.stock1.patterns.length ? data.stock1.patterns.join('、') : t.none}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: 12, color: THEME.text }}>
                          {data.stock2.patterns.length ? data.stock2.patterns.join('、') : t.none}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <div style={{ color: '#58a6ff', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{t.summary}</div>
                  <InterpretationBlock text={data.interpretation} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
