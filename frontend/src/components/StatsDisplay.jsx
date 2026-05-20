import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'

const BDR  = 'rgba(138,180,248,0.12)'
const MUTED = '#9aa0a6'

const FEATURE_LABELS = {
  similar:       { zh: '相似走势', en: 'Similar Trend' },
  news:          { zh: '新闻舆情', en: 'News Sentiment' },
  monte_carlo:   { zh: '蒙特卡洛', en: 'Monte Carlo' },
  paper_trading: { zh: '模拟炒股', en: 'Paper Trade' },
  analysis:      { zh: '智能分析', en: 'AI Analysis' },
  risk:          { zh: '风险分析', en: 'Risk Analytics' },
  regime:        { zh: '市场状态', en: 'Regime Detector' },
  factor:        { zh: '因子分析', en: 'Factor Analysis' },
  financial:     { zh: '财务分析', en: 'Financial' },
  radar:         { zh: '雷达对比', en: 'Radar' },
  calendar:      { zh: 'A股日历', en: 'Calendar' },
}

function BigStatCard({ label, value, sub, gradient }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${BDR}`,
      borderRadius: 16,
      padding: '20px 24px',
      flex: 1,
      minWidth: 160,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: gradient || 'linear-gradient(90deg,#8ab4f8,#c084fc)',
        borderRadius: '16px 16px 0 0',
      }} />
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontSize: 36, fontWeight: 800, fontFamily: 'monospace',
        background: gradient || 'linear-gradient(90deg,#8ab4f8,#c084fc)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        letterSpacing: '-1px',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function StatsDisplay({ lang, onClose }) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const zh = lang === 'zh'

  useEffect(() => {
    fetch('/api/analytics/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Line chart: daily visits ─────────────────────────────────────────────
  const lineOption = stats ? {
    backgroundColor: 'transparent',
    grid: { top: 20, bottom: 40, left: 48, right: 20 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,15,26,0.95)',
      borderColor: BDR,
      textStyle: { color: '#e8eaed', fontSize: 12 },
      formatter: (params) => {
        const d = params[0]
        return `${d.axisValue}<br/>${zh ? '访问' : 'Visits'}: <b>${d.data}</b>`
      },
    },
    xAxis: {
      type: 'category',
      data: stats.daily_chart.map((d) => d.date.slice(5)),  // MM-DD
      axisLabel: { color: MUTED, fontSize: 10 },
      axisLine: { lineStyle: { color: BDR } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: MUTED, fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(138,180,248,0.06)' } },
    },
    series: [{
      type: 'line',
      data: stats.daily_chart.map((d) => d.visits),
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { width: 2.5, color: '#8ab4f8' },
      itemStyle: { color: '#8ab4f8' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(138,180,248,0.25)' },
            { offset: 1, color: 'rgba(138,180,248,0.02)' },
          ],
        },
      },
    }],
  } : null

  // ── Pie chart: feature usage ─────────────────────────────────────────────
  const PIE_COLORS = ['#8ab4f8','#c084fc','#34d399','#fbbf24','#f87171','#60a5fa','#a78bfa','#34d399','#fb923c','#e879f9']

  const pieOption = stats ? (() => {
    const fu = stats.feature_usage || {}
    const entries = Object.entries(fu)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
    if (entries.length === 0) return null
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10,15,26,0.95)',
        borderColor: BDR,
        textStyle: { color: '#e8eaed', fontSize: 12 },
        formatter: (p) => `${p.name}: <b>${p.value}</b> (${p.percent}%)`,
      },
      legend: {
        orient: 'vertical', right: 10, top: 'center',
        textStyle: { color: MUTED, fontSize: 11 },
        itemWidth: 10, itemHeight: 10,
      },
      series: [{
        type: 'pie',
        radius: ['38%', '68%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 700, color: '#e8eaed' } },
        data: entries.map(([key, val], i) => ({
          name: (FEATURE_LABELS[key]?.[lang] ?? key),
          value: val,
          itemStyle: { color: PIE_COLORS[i % PIE_COLORS.length] },
        })),
      }],
    }
  })() : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#080c14',
        border: '1px solid rgba(138,180,248,0.18)',
        borderRadius: 20,
        width: '100%',
        maxWidth: 900,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px 32px',
        position: 'relative',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(232,234,240,0.4)', fontSize: 20,
        }}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 22, fontWeight: 800,
            background: 'linear-gradient(90deg,#8ab4f8,#c084fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 4,
          }}>
            {zh ? 'BestFriendStock 访问统计' : 'BestFriendStock Analytics'}
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>
            bestfriendstock.com &nbsp;·&nbsp; {zh ? '实时数据' : 'Live data'}
          </div>
        </div>

        {loading ? (
          <div style={{ color: MUTED, textAlign: 'center', padding: '40px 0' }}>
            {zh ? '加载统计数据...' : 'Loading stats...'}
          </div>
        ) : !stats ? (
          <div style={{ color: '#f87171', textAlign: 'center', padding: '40px 0' }}>
            {zh ? '加载失败' : 'Failed to load'}
          </div>
        ) : (
          <>
            {/* ── Big stat cards ── */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <BigStatCard
                label={zh ? '总访问次数' : 'Total Visits'}
                value={stats.total_visits.toLocaleString()}
                sub={zh ? `本周 ${stats.this_week_visits} 次` : `${stats.this_week_visits} this week`}
                gradient="linear-gradient(90deg,#8ab4f8,#6366f1)"
              />
              <BigStatCard
                label={zh ? '独立用户数' : 'Unique Visitors'}
                value={stats.unique_devices.toLocaleString()}
                gradient="linear-gradient(90deg,#c084fc,#8b5cf6)"
              />
              <BigStatCard
                label={zh ? '今日访问' : "Today's Visits"}
                value={stats.today_visits.toLocaleString()}
                sub={zh ? `独立 ${stats.today_unique}` : `${stats.today_unique} unique`}
                gradient="linear-gradient(90deg,#34d399,#059669)"
              />
              <BigStatCard
                label={zh ? '最热股票' : 'Top Stock'}
                value={stats.top_stocks[0]?.symbol ?? '--'}
                sub={stats.top_stocks[0]
                  ? `${stats.top_stocks[0].name} · ${stats.top_stocks[0].searches}${zh ? '次' : ' searches'}`
                  : ''}
                gradient="linear-gradient(90deg,#fbbf24,#f59e0b)"
              />
            </div>

            {/* ── Charts row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: pieOption ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
              {/* Line chart */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BDR}`, borderRadius: 12, padding: '16px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#8ab4f8', marginBottom: 10 }}>
                  {zh ? '过去14天访问量' : 'Visits — Last 14 Days'}
                </div>
                {lineOption
                  ? <ReactECharts option={lineOption} style={{ height: 200 }} opts={{ renderer: 'canvas' }} />
                  : <div style={{ color: MUTED, fontSize: 12, padding: '60px 0', textAlign: 'center' }}>{zh ? '暂无数据' : 'No data yet'}</div>
                }
              </div>

              {/* Pie chart */}
              {pieOption && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BDR}`, borderRadius: 12, padding: '16px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#c084fc', marginBottom: 10 }}>
                    {zh ? '功能使用分布' : 'Feature Usage'}
                  </div>
                  <ReactECharts option={pieOption} style={{ height: 200 }} opts={{ renderer: 'canvas' }} />
                </div>
              )}
            </div>

            {/* ── Top stocks list ── */}
            {stats.top_stocks.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BDR}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 12 }}>
                  {zh ? '最热门股票 TOP10' : 'Top Searched Stocks'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.top_stocks.map((s, i) => {
                    const maxSearches = stats.top_stocks[0]?.searches || 1
                    const barPct = (s.searches / maxSearches) * 100
                    return (
                      <div key={s.symbol} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: i < 3 ? '#fbbf24' : MUTED, fontWeight: 700, minWidth: 20, textAlign: 'right' }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 12, color: '#8ab4f8', fontFamily: 'monospace', minWidth: 56 }}>{s.symbol}</span>
                        <span style={{ fontSize: 13, color: '#e8eaed', minWidth: 80 }}>{s.name}</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${barPct}%`, height: '100%', background: 'linear-gradient(90deg,#8ab4f8,#c084fc)', borderRadius: 3, transition: 'width 0.5s' }} />
                        </div>
                        <span style={{ fontSize: 12, color: MUTED, fontFamily: 'monospace', minWidth: 40, textAlign: 'right' }}>
                          {s.searches}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, fontSize: 11, color: '#4a5568', textAlign: 'center' }}>
              {zh ? '数据每次访问实时更新 · 仅用于项目展示' : 'Updated in real-time · For project showcase only'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
