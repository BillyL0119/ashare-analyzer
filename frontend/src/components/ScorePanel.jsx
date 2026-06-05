import { useState, useEffect, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import useLangStore from '../store/langStore'
import { getStockScore } from '../api/stockApi'
import { THEME } from '../utils/chartHelpers'

const ACCENT = '#8ab4f8'
const ACCENT2 = '#c084fc'

const GRADE_COLOR = {
  'A+': '#00ff88', A: '#22c55e', 'B+': '#84cc16',
  B: '#fbbf24', C: '#f97316', D: '#ef4444',
}

const DIM_LABEL = {
  technical:   { zh: '技术面', en: 'Technical' },
  fundamental: { zh: '基本面', en: 'Fundamental' },
  sentiment:   { zh: '市场情绪', en: 'Sentiment' },
  risk:        { zh: '风险控制', en: 'Risk Control' },
}

function ScoreRing({ score, grade }) {
  const color = GRADE_COLOR[grade] || '#8ab4f8'
  const r = 54, cx = 70, cy = 70
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{grade}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', marginTop: 4 }}>{score}</div>
        <div style={{ fontSize: 10, color: '#9aa0a6' }}>/ 100</div>
      </div>
    </div>
  )
}

function RadarChart({ dimensions }) {
  const isCN = useLangStore((s) => s.lang) === 'zh'
  const indicators = Object.entries(DIM_LABEL).map(([k, v]) => ({
    name: isCN ? v.zh : v.en,
    max: 100,
  }))
  const data = Object.entries(dimensions).map(([k, d]) =>
    Math.round(d.score / d.max * 100)
  )
  const option = {
    backgroundColor: 'transparent',
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#9aa0a6', fontSize: 12 },
      splitLine: { lineStyle: { color: 'rgba(138,180,248,0.1)' } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: 'rgba(138,180,248,0.15)' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: data,
        name: isCN ? '评分' : 'Score',
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: ACCENT, width: 2 },
        itemStyle: { color: ACCENT },
        areaStyle: { color: 'rgba(138,180,248,0.15)' },
      }],
    }],
  }
  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} opts={{ renderer: 'svg' }} />
}

function DimCard({ dimKey, dim, isCN }) {
  const label = DIM_LABEL[dimKey]
  const pct = Math.round(dim.score / dim.max * 100)
  const barColor = pct >= 70 ? '#22c55e' : pct >= 50 ? '#fbbf24' : '#ef4444'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(138,180,248,0.1)',
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>
          {isCN ? label.zh : label.en}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>
          {dim.score} / {dim.max}
        </span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${barColor}aa, ${barColor})`,
          transition: 'width 0.6s ease',
        }} />
      </div>
      {dim.details.map((d, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          gap: 8,
        }}>
          <span style={{ fontSize: 11, color: '#9aa0a6', flexShrink: 0 }}>
            {isCN ? (d.dim_zh || d.dim) : (d.dim || d.dim_zh)}
          </span>
          <span style={{ fontSize: 11, color: '#4a5568', textAlign: 'right', flex: 1 }}>
            {isCN ? d.note_zh : d.note_en}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, flexShrink: 0,
            color: d.score >= d.max * 0.7 ? '#22c55e' : d.score >= d.max * 0.4 ? '#fbbf24' : '#ef4444',
          }}>
            {d.score}/{d.max}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ScorePanel({ stocks }) {
  const lang = useLangStore((s) => s.lang)
  const isCN = lang === 'zh'
  const [dataMap, setDataMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const key = useMemo(() => stocks?.map((s) => s.code).join(',') ?? '', [stocks])

  useEffect(() => {
    if (!stocks?.length) return
    setLoading(true); setError(null)
    Promise.all(
      stocks.map((s) =>
        getStockScore(s.code)
          .then((r) => [s.code, r.data])
          .catch((e) => [s.code, { error: e.message }])
      )
    ).then((pairs) => {
      const map = {}
      pairs.forEach(([code, data]) => { map[code] = data })
      setDataMap(map)
      setLoading(false)
    })
  }, [key]) // eslint-disable-line

  if (!stocks?.length) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#4a5568' }}>
      {isCN ? '请先搜索并添加股票' : 'Please add a stock first'}
    </div>
  )

  if (loading) return (
    <div className="skeleton-appear" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {stocks.map((s) => (
        <div key={s.code} style={{
          background: THEME.gridBg, border: `1px solid ${THEME.border}`,
          borderRadius: 12, padding: '16px 20px',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <div className="skeleton" style={{ height: 16, width: 100 }} />
            <div className="skeleton" style={{ height: 16, width: 52, marginLeft: 'auto', borderRadius: 12 }} />
          </div>
          {/* Radar + score ring */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="skeleton" style={{ flex: '1 1 200px', height: 200, borderRadius: 8 }} />
            <div className="skeleton" style={{ width: 140, height: 140, borderRadius: '50%', flexShrink: 0, alignSelf: 'center' }} />
          </div>
          {/* Dim cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 88, borderRadius: 10 }} />
            ))}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11, color: '#4a5568', textAlign: 'center', marginTop: 4 }}>
        {isCN ? '首次计算约需 10–20 秒' : 'First load may take 10–20s'}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {stocks.map((s) => {
        const d = dataMap[s.code]
        if (!d) return null
        if (d.error) return (
          <div key={s.code} style={{
            background: THEME.gridBg, border: `1px solid ${THEME.border}`,
            borderRadius: 10, padding: 20, color: '#ef4444', fontSize: 13,
          }}>
            {s.code}: {d.error}
          </div>
        )
        const gradeColor = GRADE_COLOR[d.grade] || ACCENT
        return (
          <div key={s.code} style={{
            background: THEME.gridBg, border: `1px solid ${THEME.border}`,
            borderRadius: 12, padding: '16px 20px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#e8eaed' }}>{s.name || s.code}</span>
              <span style={{ fontSize: 12, color: '#4a5568' }}>{s.code}</span>
              <div style={{
                marginLeft: 'auto', padding: '2px 12px',
                background: `${gradeColor}22`, border: `1px solid ${gradeColor}55`,
                borderRadius: 20, fontSize: 13, fontWeight: 700, color: gradeColor,
              }}>
                {d.grade}
              </div>
            </div>

            {/* Top row: radar + score ring + summary */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <RadarChart dimensions={d.dimensions} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <ScoreRing score={d.total} grade={d.grade} />
              </div>
              <div style={{
                flex: '1 1 200px', minWidth: 0, fontSize: 12, lineHeight: 1.7, color: '#9aa0a6',
                background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                border: '1px solid rgba(138,180,248,0.07)', padding: '10px 14px',
              }}>
                <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 6, fontWeight: 600 }}>
                  {isCN ? '综合评语' : 'Summary'}
                </div>
                {isCN ? d.summary_zh : d.summary_en}
              </div>
            </div>

            {/* Dimension cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              {Object.entries(d.dimensions).map(([k, dim]) => (
                <DimCard key={k} dimKey={k} dim={dim} isCN={isCN} />
              ))}
            </div>

            <div style={{ fontSize: 10, color: '#4a5568', marginTop: 10, textAlign: 'right' }}>
              {isCN ? '* 评分仅供参考，不构成投资建议' : '* Scores for reference only, not investment advice'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
