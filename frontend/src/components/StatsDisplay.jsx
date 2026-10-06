import { useState, useEffect, useRef } from 'react'
import ReactECharts from '../lib/echarts'
import { T } from '../i18n/translations'

const BDR   = 'rgba(138,180,248,0.12)'
const MUTED = 'var(--text-muted)'

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
  study:         { zh: '学习中心', en: 'Study Center' },
  ai_tutor:      { zh: 'AI导师', en: 'AI Tutor' },
}

const SOURCE_LABELS = {
  direct: { zh: '直接访问', en: 'Direct' }, instagram: { zh: 'Instagram', en: 'Instagram' }, tiktok: { zh: 'TikTok', en: 'TikTok' },
  facebook: { zh: 'Facebook', en: 'Facebook' }, twitter: { zh: 'X / Twitter', en: 'X / Twitter' }, youtube: { zh: 'YouTube', en: 'YouTube' },
  google: { zh: 'Google 搜索', en: 'Google' }, bing: { zh: 'Bing', en: 'Bing' }, baidu: { zh: '百度', en: 'Baidu' }, wechat: { zh: '微信', en: 'WeChat' },
  xiaohongshu: { zh: '小红书', en: 'Xiaohongshu' }, weibo: { zh: '微博', en: 'Weibo' }, reddit: { zh: 'Reddit', en: 'Reddit' }, line: { zh: 'Line', en: 'Line' },
  other: { zh: '其他', en: 'Other' },
}

function SourceBlock({ stats, lang }) {
  const sources = stats.sources || []
  const ui = stats.ui_split || {}
  const total = sources.reduce((a, [, n]) => a + n, 0)
  const uiTotal = (ui.mobile || 0) + (ui.desktop || 0)
  if (!total) return null
  const L = lang === 'zh' ? 'zh' : 'en'
  return (
    <div style={{ background: 'var(--bg-tertiary)', border: `1px solid ${BDR}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>{L === 'zh' ? '访问来源' : 'Traffic sources'}</span>
        {uiTotal > 0 && (
          <span style={{ fontSize: 11, color: MUTED }}>
            {L === 'zh' ? '手机' : 'Mobile'} {Math.round(((ui.mobile || 0) / uiTotal) * 100)}% · {L === 'zh' ? '电脑' : 'Desktop'} {Math.round(((ui.desktop || 0) / uiTotal) * 100)}%
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {sources.slice(0, 6).map(([key, n]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-primary)', minWidth: 96 }}>{SOURCE_LABELS[key]?.[L] ?? key}</span>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${(n / sources[0][1]) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#34d399,#8ab4f8)', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace', minWidth: 40, textAlign: 'right' }}>{n} · {Math.round((n / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BigStatCard({ icon, label, value, sub, gradient, exportMode }) {
  return (
    <div style={{
      background: 'var(--bg-tertiary)',
      border: `1px solid ${BDR}`,
      borderRadius: 16,
      padding: exportMode ? '16px 20px' : '20px 24px',
      flex: 1,
      minWidth: 150,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: gradient || 'linear-gradient(90deg,#8ab4f8,#c084fc)',
        borderRadius: '16px 16px 0 0',
      }} />
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 6, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontSize: exportMode ? 30 : 36, fontWeight: 800, fontFamily: 'monospace',
        background: gradient || 'linear-gradient(90deg,#8ab4f8,#c084fc)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        letterSpacing: '-1px',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function StatsDisplay({ lang, onClose }) {
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [exportMode, setExportMode] = useState(false)
  const t = T[lang] || T.en
  const containerRef = useRef(null)

  useEffect(() => {
    fetch('/api/analytics/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Estimate country count from unique devices (rough heuristic for showcase)
  const countryEst = stats
    ? Math.min(Math.max(Math.floor(stats.unique_devices / 3), 1), 80)
    : 1

  // ── Line chart: 30-day visits ─────────────────────────────────────────────
  const lineOption = stats ? {
    backgroundColor: 'transparent',
    grid: { top: 20, bottom: 40, left: 48, right: 20 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,15,26,0.95)',
      borderColor: BDR,
      textStyle: { color: 'var(--text-primary)', fontSize: 12 },
      formatter: (params) => {
        const d = params[0]
        return `${d.axisValue}<br/>${t.stVisits}: <b>${d.data}</b>`
      },
    },
    xAxis: {
      type: 'category',
      data: stats.daily_chart.map((d) => d.date.slice(5)),
      axisLabel: { color: MUTED, fontSize: 9, interval: 4 },
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
      symbolSize: 4,
      lineStyle: { width: 2.5, color: 'var(--accent-blue)' },
      itemStyle: { color: 'var(--accent-blue)' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(138,180,248,0.30)' },
            { offset: 1, color: 'rgba(192,132,252,0.04)' },
          ],
        },
      },
    }],
  } : null

  // ── Pie chart: feature usage ─────────────────────────────────────────────
  const PIE_COLORS = ['#8ab4f8','#c084fc','#34d399','#fbbf24','#f87171','#60a5fa','#a78bfa','#fb923c','#e879f9','#38bdf8']

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
        textStyle: { color: 'var(--text-primary)', fontSize: 12 },
        formatter: (p) => `${p.name}: <b>${p.value}</b> (${p.percent}%)`,
      },
      legend: {
        orient: 'vertical', right: 10, top: 'center',
        textStyle: { color: MUTED, fontSize: 10 },
        itemWidth: 8, itemHeight: 8,
      },
      series: [{
        type: 'pie',
        radius: ['38%', '65%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' } },
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
      background: exportMode ? 'var(--bg-primary)' : 'rgba(0,0,0,0.8)',
      backdropFilter: exportMode ? 'none' : 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
    onClick={(e) => { if (!exportMode && e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={containerRef}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid rgba(138,180,248,0.18)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 920,
          maxHeight: exportMode ? 'none' : '92vh',
          overflowY: exportMode ? 'visible' : 'auto',
          padding: '28px 32px',
          position: 'relative',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{
              fontSize: 22, fontWeight: 800,
              background: 'linear-gradient(90deg,#8ab4f8,#c084fc)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 4,
            }}>
              {t.stTitle}
            </div>
            <div style={{ fontSize: 12, color: MUTED }}>
              bestfriendstock.com &nbsp;·&nbsp; {t.stLive}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {/* Export mode toggle */}
            {!exportMode ? (
              <button onClick={() => setExportMode(true)} style={{
                background: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: 8, padding: '6px 14px',
                color: '#fbbf24', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                📸 {t.stExport}
              </button>
            ) : (
              <button onClick={() => setExportMode(false)} style={{
                background: 'rgba(52,211,153,0.1)',
                border: '1px solid rgba(52,211,153,0.25)',
                borderRadius: 8, padding: '6px 14px',
                color: '#34d399', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                ✓ {t.stExitExport}
              </button>
            )}
            {/* Close — hidden in export mode */}
            {!exportMode && (
              <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 20, padding: '2px 8px',
              }}>✕</button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ color: MUTED, textAlign: 'center', padding: '40px 0' }}>
            {t.stLoading}
          </div>
        ) : !stats ? (
          <div style={{ color: '#f87171', textAlign: 'center', padding: '40px 0' }}>
            {t.stLoadFail}
          </div>
        ) : (
          <>
            {/* ── Four stat cards ── */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              <BigStatCard
                icon="🌍"
                label={t.stTotalVisits}
                value={stats.total_visits.toLocaleString()}
                sub={t.stThisWeek(stats.this_week_visits)}
                gradient="linear-gradient(90deg,#8ab4f8,#6366f1)"
                exportMode={exportMode}
              />
              <BigStatCard
                icon="👥"
                label={t.stUniqueUsers}
                value={stats.unique_devices.toLocaleString()}
                sub={t.stUniqueToday(stats.today_unique)}
                gradient="linear-gradient(90deg,#c084fc,#8b5cf6)"
                exportMode={exportMode}
              />
              <BigStatCard
                icon="📈"
                label={t.stStocksAnalyzed}
                value={(stats.stocks_analyzed || 0).toLocaleString()}
                sub={t.stTopStock(stats.top_stocks[0]?.symbol ?? '--')}
                gradient="linear-gradient(90deg,#34d399,#059669)"
                exportMode={exportMode}
              />
              <BigStatCard
                icon="🎓"
                label={t.stStudySessions}
                value={(stats.study_sessions || 0).toLocaleString()}
                sub={t.stStudyCenter}
                gradient="linear-gradient(90deg,#fbbf24,#f59e0b)"
                exportMode={exportMode}
              />
            </div>

            {/* ── 30-day chart ── */}
            <div style={{
              background: 'var(--bg-tertiary)', border: `1px solid ${BDR}`,
              borderRadius: 12, padding: '16px 12px', marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 10 }}>
                {t.stChartTitle}
              </div>
              {lineOption
                ? <ReactECharts option={lineOption} style={{ height: 180 }} opts={{ renderer: 'canvas' }} />
                : <div style={{ color: MUTED, fontSize: 12, padding: '50px 0', textAlign: 'center' }}>{t.stNoData}</div>
              }
            </div>

            <SourceBlock stats={stats} lang={lang} />

            {/* ── Bottom two columns ── */}
            <div style={{ display: 'grid', gridTemplateColumns: pieOption ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 16 }}>
              {/* Top 5 stocks */}
              <div style={{ background: 'var(--bg-tertiary)', border: `1px solid ${BDR}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 12 }}>
                  {t.stTop5}
                </div>
                {stats.top_stocks.length === 0 ? (
                  <div style={{ color: MUTED, fontSize: 12 }}>{t.stNoData}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stats.top_stocks.slice(0, 5).map((s, i) => {
                      const maxS = stats.top_stocks[0]?.searches || 1
                      return (
                        <div key={s.symbol} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: i < 3 ? '#fbbf24' : MUTED, fontWeight: 700, minWidth: 18, textAlign: 'right' }}>
                            {i + 1}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--accent-blue)', fontFamily: 'monospace', minWidth: 52 }}>{s.symbol}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.name}
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${(s.searches / maxS) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#8ab4f8,#c084fc)', borderRadius: 2 }} />
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>
                            {s.searches}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Feature usage pie */}
              {pieOption && (
                <div style={{ background: 'var(--bg-tertiary)', border: `1px solid ${BDR}`, borderRadius: 12, padding: '16px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 10 }}>
                    {t.stFeatureUsage}
                  </div>
                  <ReactECharts option={pieOption} style={{ height: 180 }} opts={{ renderer: 'canvas' }} />
                </div>
              )}
            </div>

            {/* ── Tagline ── */}
            <div style={{
              marginTop: 8,
              padding: '14px 20px',
              background: 'rgba(138,180,248,0.05)',
              border: `1px solid ${BDR}`,
              borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 14, fontWeight: 600,
                background: 'linear-gradient(90deg,#8ab4f8,#c084fc)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {t.stTagline(countryEst)}
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                {t.stFooter}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
