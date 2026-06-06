import { useState, useEffect, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { getRadarScore } from '../api/stockApi'
import { THEME } from '../utils/chartHelpers'
import useThemeStore from '../store/themeStore'
import { useMobile } from '../hooks/useMobile'

const COLORS = ['#8ab4f8', '#c084fc', '#26a69a', '#ffa726']

export default function RadarPanel({ stocks }) {
  useThemeStore((s) => s.theme) // re-render on theme toggle
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const isMobile = useMobile()
  const isCN = lang === 'zh'

  const [dataMap, setDataMap] = useState({})
  const [loading, setLoading] = useState(false)

  const stocksKey = useMemo(() => stocks?.map((s) => s.code).join(',') ?? '', [stocks])

  useEffect(() => {
    if (!stocks || stocks.length === 0) return
    setLoading(true)
    Promise.all(
      stocks.map((s) =>
        getRadarScore(s.code)
          .then((r) => ({ code: s.code, name: r.data.name || s.name, scores: r.data.scores }))
          .catch(() => ({ code: s.code, name: s.name, scores: null }))
      )
    ).then((results) => {
      const map = {}
      results.forEach((r) => { map[r.code] = r })
      setDataMap(map)
      setLoading(false)
    })
  }, [stocksKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const indicators = [
    { name: isCN ? 'PE估值' : 'Valuation', key: 'valuation' },
    { name: isCN ? 'PB市净率' : 'P/B Ratio', key: 'pb' },
    { name: isCN ? '近年涨幅' : 'Momentum', key: 'momentum' },
    { name: isCN ? '稳定性' : 'Stability', key: 'stability' },
    { name: isCN ? '成交活跃' : 'Volume Act.', key: 'volume' },
    { name: isCN ? '市场相关' : 'Mkt Corr', key: 'similarity' },
  ]

  if (!stocks || stocks.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
        {t.radarNoStocks}
      </div>
    )
  }

  const validStocks = stocks.filter((s) => dataMap[s.code]?.scores)

  const radarSeries = validStocks.map((s, i) => ({
    name: `${s.code} ${dataMap[s.code]?.name || s.name}`,
    value: indicators.map((ind) => dataMap[s.code].scores[ind.key] ?? 50),
  }))

  const option = {
    backgroundColor: 'transparent',
    legend: {
      data: validStocks.map((s, i) => ({
        name: `${s.code} ${dataMap[s.code]?.name || s.name}`,
        itemStyle: { color: COLORS[i % COLORS.length] },
        textStyle: { color: COLORS[i % COLORS.length], fontSize: 12 },
      })),
      top: 4,
    },
    radar: {
      indicator: indicators.map((ind) => ({ name: ind.name, max: 100 })),
      center: ['50%', isMobile ? '52%' : '54%'],
      radius: isMobile ? '52%' : '62%',
      splitNumber: 4,
      axisName: {
        color: 'var(--text-muted)',
        fontSize: isMobile ? 10 : 11,
      },
      splitLine: {
        lineStyle: { color: 'rgba(255,255,255,0.08)' },
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(255,255,255,0.025)', 'rgba(255,255,255,0.01)'],
        },
      },
      axisLine: {
        lineStyle: { color: 'rgba(255,255,255,0.1)' },
      },
    },
    series: [
      {
        type: 'radar',
        data: radarSeries.map((s, i) => ({
          ...s,
          lineStyle: { color: COLORS[i % COLORS.length], width: 2 },
          areaStyle: { color: COLORS[i % COLORS.length], opacity: 0.12 },
          itemStyle: { color: COLORS[i % COLORS.length] },
          symbol: 'circle',
          symbolSize: 5,
        })),
      },
    ],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(10,15,26,0.95)',
      borderColor: 'rgba(138,180,248,0.2)',
      textStyle: { color: 'var(--text-primary)', fontSize: 12 },
      formatter: (params) => {
        const vals = params.value
        return [
          `<b>${params.name}</b>`,
          ...indicators.map((ind, i) => `${ind.name}: <b>${vals[i]}</b>`),
        ].join('<br/>')
      },
    },
  }

  return (
    <div
      style={{
        background: THEME.gridBg,
        border: `1px solid ${THEME.border}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text, marginBottom: 14 }}>
        {t.radarTitle}
      </div>

      {loading ? (
        <div
          style={{
            height: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          {t.radarLoading}
        </div>
      ) : (
        <>
          <ReactECharts
            option={option}
            style={{ height: isMobile ? 320 : 460, width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
          />

          {/* Score table */}
          {validStocks.length > 0 && (
            <div
              style={{
                marginTop: 16,
                borderTop: `1px solid ${THEME.border}`,
                paddingTop: 14,
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, padding: '4px 8px', whiteSpace: 'nowrap' }}>
                      {isCN ? '维度' : 'Dimension'}
                    </th>
                    {validStocks.map((s, i) => (
                      <th key={s.code} style={{ textAlign: 'center', color: COLORS[i % COLORS.length], fontWeight: 600, padding: '4px 8px', whiteSpace: 'nowrap' }}>
                        {s.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {indicators.map((ind) => (
                    <tr key={ind.key}>
                      <td style={{ color: 'var(--text-muted)', padding: '5px 8px', whiteSpace: 'nowrap' }}>{ind.name}</td>
                      {validStocks.map((s) => {
                        const score = dataMap[s.code]?.scores?.[ind.key]
                        const color = score >= 70 ? '#26a69a' : score >= 40 ? '#e8c34a' : '#ef5350'
                        return (
                          <td key={s.code} style={{ textAlign: 'center', color, fontWeight: 700, padding: '5px 8px' }}>
                            {score ?? '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
