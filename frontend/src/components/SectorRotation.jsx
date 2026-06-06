import { useState, useEffect, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import useThemeStore from '../store/themeStore'
import { THEME } from '../utils/chartHelpers'

const API = import.meta.env.VITE_API_BASE || ''

const GREEN_DARK  = '#16a34a'
const GREEN_MID   = '#22c55e'
const GREEN_LIGHT = '#86efac'
const RED_LIGHT   = '#fca5a5'
const RED_MID     = '#ef4444'
const RED_DARK    = '#b91c1c'
const NEUTRAL     = '#64748b'
const ACCENT      = '#0ea5e9'
const ACCENT2     = '#8b5cf6'

// Map pct to color (red-neutral-green spectrum)
function pctColor(pct) {
  if (pct > 3)   return GREEN_DARK
  if (pct > 1.5) return GREEN_MID
  if (pct > 0.3) return GREEN_LIGHT
  if (pct > -0.3) return NEUTRAL
  if (pct > -1.5) return RED_LIGHT
  if (pct > -3)  return RED_MID
  return RED_DARK
}

function pctTextColor(pct) {
  return pct >= 0 ? '#22c55e' : '#ef4444'
}

function fmt(n) {
  if (n == null) return 'N/A'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${Number(n).toFixed(2)}%`
}

function volLabel(ratio, zh) {
  if (ratio > 1.5) return zh ? '📈量大' : '📈 High Vol'
  if (ratio > 1.1) return zh ? '量增' : 'Vol↑'
  if (ratio < 0.7) return zh ? '📉量缩' : '📉 Low Vol'
  return zh ? '量平' : 'Vol~'
}

// ── Sentiment summary ─────────────────────────────────────────────────────────

function buildSummary(sectors, period, zh) {
  if (!sectors.length) return ''
  const key = period === 'today' ? 'today_pct' : period === '5d' ? 'pct_5d' : 'pct_20d'
  const sorted = [...sectors].sort((a, b) => b[key] - a[key])
  const top3 = sorted.slice(0, 3).filter(s => s[key] > 0).map(s => zh ? s.name_zh : s.name_en)
  const bot3 = sorted.slice(-3).filter(s => s[key] < 0).map(s => zh ? s.name_zh : s.name_en)

  const periodLabel = {
    today: { zh: '今日', en: 'Today' },
    '5d':  { zh: '近5日', en: 'Past 5 days' },
    '20d': { zh: '近20日', en: 'Past 20 days' },
  }[period]

  if (zh) {
    const inflow  = top3.length ? `资金持续流入：${top3.join('、')}` : ''
    const outflow = bot3.length ? `持续流出：${bot3.join('、')}` : ''
    return `${periodLabel}${[inflow, outflow].filter(Boolean).join('；')}。`
  } else {
    const inflow  = top3.length ? `Capital inflow: ${top3.join(', ')}` : ''
    const outflow = bot3.length ? `outflow: ${bot3.join(', ')}` : ''
    return `${periodLabel.en}: ${[inflow, outflow].filter(Boolean).join('; ')}.`
  }
}

// ── Treemap chart ─────────────────────────────────────────────────────────────

function Treemap({ sectors, lang }) {
  const zh = lang === 'zh'
  const theme = useThemeStore((s) => s.theme)

  const option = useMemo(() => {
    const data = sectors.map(s => ({
      name:  zh ? s.name_zh : s.name_en,
      value: Math.max(1, Math.abs(s.today_pct) * 100 + 50),  // size proportional to volatility
      pct:   s.today_pct,
      pct5d: s.pct_5d,
      vol:   s.vol_ratio,
      itemStyle: { color: pctColor(s.today_pct) },
      label:  { show: true, formatter: '{name|\n}{pct|}' },
    }))

    return {
      backgroundColor: 'transparent',
      tooltip: {
        confine: true,
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.border,
        textStyle: { color: THEME.tooltipText, fontSize: 12 },
        formatter: (p) => {
          const d = p.data
          return `<b>${p.name}</b><br/>
今日 / Today: <b style="color:${pctColor(d.pct)}">${fmt(d.pct)}</b><br/>
近5日 / 5-day: ${fmt(d.pct5d)}<br/>
量比 / Vol ratio: ${d.vol?.toFixed(2) ?? 'N/A'}`
        },
      },
      series: [{
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        width: '100%',
        height: '100%',
        data,
        label: {
          show: true,
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          formatter: (p) => {
            const pct = p.data.pct
            const sign = pct >= 0 ? '+' : ''
            return `${p.name}\n${sign}${pct.toFixed(2)}%`
          },
        },
        itemStyle: {
          gapWidth: 2,
          borderWidth: 0,
        },
        levels: [{ itemStyle: { borderWidth: 0, gapWidth: 3 } }],
      }],
    }
  }, [sectors, lang, theme])

  return (
    <ReactECharts
      option={option}
      style={{ height: 360, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  )
}

// ── Bar chart ranking ─────────────────────────────────────────────────────────

function BarRanking({ sectors, period, lang }) {
  const zh = lang === 'zh'
  const theme = useThemeStore((s) => s.theme)

  const key = period === 'today' ? 'today_pct' : period === '5d' ? 'pct_5d' : 'pct_20d'
  const sorted = useMemo(() => [...sectors].sort((a, b) => a[key] - b[key]), [sectors, period])

  const option = useMemo(() => {
    const names  = sorted.map(s => zh ? s.name_zh : s.name_en)
    const values = sorted.map(s => s[key])
    const colors = values.map(v => pctColor(v))

    return {
      backgroundColor: 'transparent',
      grid: { top: 8, bottom: 4, left: 4, right: 60, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'none' },
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.border,
        textStyle: { color: THEME.tooltipText, fontSize: 12 },
        formatter: (params) => {
          const p = params[0]
          const s = sorted[p.dataIndex]
          return `${p.name}<br/>${fmt(p.value)}<br/>${zh ? '量比' : 'Vol'}: ${s.vol_ratio?.toFixed(2) ?? 'N/A'}`
        },
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: THEME.text, fontSize: 10,
          formatter: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
        },
        splitLine: { lineStyle: { color: THEME.border } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: { color: THEME.text, fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i], borderRadius: [0, 3, 3, 0] },
        })),
        barMaxWidth: 28,
        label: {
          show: true,
          position: values[values.length - 1] >= 0 ? 'right' : 'left',
          formatter: p => fmt(p.value),
          color: THEME.text,
          fontSize: 10,
        },
      }],
    }
  }, [sorted, period, lang, theme])

  const barH = Math.max(300, sorted.length * 22)

  return (
    <ReactECharts
      option={option}
      style={{ height: barH, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SectorRotation({ lang, defaultMarket = 'cn' }) {
  useThemeStore((s) => s.theme)
  const zh = lang === 'zh'

  const [market,  setMarket]  = useState(defaultMarket)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [period,  setPeriod]  = useState('today')
  const [view,    setView]    = useState('treemap')  // 'treemap' | 'bar'

  useEffect(() => {
    setData(null)
    setError('')
    setLoading(true)
    fetch(`${API}/api/sectors/rotation?market=${market}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError(zh ? '加载失败' : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [market])

  const sectors = data?.sectors || []

  const summary = useMemo(() =>
    sectors.length ? buildSummary(sectors, period, zh) : '',
  [sectors, period, zh])

  // ── Layout ──

  const pillBtn = (active) => ({
    padding: '4px 14px', borderRadius: 20, border: 'none',
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
    background: active ? `linear-gradient(135deg,${ACCENT},${ACCENT2})` : 'var(--bg-tertiary)',
    color: active ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ padding: '12px 0' }}>

      {/* ── Market toggle ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 4 }}>
          {zh ? '市场：' : 'Market:'}
        </span>
        {[
          { key: 'cn', label: zh ? '🇨🇳 A股' : '🇨🇳 A-Share' },
          { key: 'us', label: zh ? '🇺🇸 美股' : '🇺🇸 US' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setMarket(key)} style={pillBtn(market === key)}>
            {label}
          </button>
        ))}

        {data?.date && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {zh ? '更新：' : 'Updated:'} {data.date}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{
            display: 'inline-block', width: 32, height: 32, borderRadius: '50%',
            border: `3px solid var(--border-primary)`,
            borderTopColor: ACCENT,
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
            {zh ? '正在加载板块数据（首次约30秒）...' : 'Loading sector data (first load ~30s)...'}
          </div>
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !error && sectors.length > 0 && (
        <>
          {/* ── View toggle ── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[
              { key: 'treemap', label: zh ? '🗺 热力图' : '🗺 Heatmap' },
              { key: 'bar',     label: zh ? '📊 排行榜' : '📊 Ranking' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setView(key)} style={{
                ...pillBtn(view === key),
                background: view === key ? 'rgba(14,165,233,0.15)' : 'var(--bg-tertiary)',
                color: view === key ? ACCENT : 'var(--text-muted)',
                border: `1px solid ${view === key ? ACCENT + '55' : 'var(--border-primary)'}`,
              }}>
                {label}
              </button>
            ))}

            {/* Period toggle — always shown */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {[
                { key: 'today', label: zh ? '今日' : 'Today' },
                { key: '5d',   label: zh ? '5日'  : '5-Day' },
                { key: '20d',  label: zh ? '20日' : '20-Day' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setPeriod(key)} style={{
                  padding: '4px 12px', borderRadius: 20, border: 'none',
                  cursor: 'pointer', fontSize: 11, fontWeight: period === key ? 700 : 400,
                  background: period === key ? 'rgba(139,92,246,0.15)' : 'var(--bg-tertiary)',
                  color: period === key ? ACCENT2 : 'var(--text-muted)',
                  border: `1px solid ${period === key ? ACCENT2 + '55' : 'var(--border-primary)'}`,
                  transition: 'all 0.15s',
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Chart area ── */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
            borderRadius: 12, padding: '14px', marginBottom: 14, overflow: 'hidden',
          }}>
            {view === 'treemap' ? (
              <Treemap sectors={sectors} lang={lang} />
            ) : (
              <BarRanking sectors={sectors} period={period} lang={lang} />
            )}
          </div>

          {/* ── Treemap legend ── */}
          {view === 'treemap' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {[
                [GREEN_DARK,  zh ? '>+3%'   : '>+3%'],
                [GREEN_MID,   zh ? '+1.5~3%': '+1.5~3%'],
                [GREEN_LIGHT, zh ? '+0.3~1.5%': '+0.3~1.5%'],
                [NEUTRAL,     zh ? '±0.3%'  : '±0.3%'],
                [RED_LIGHT,   zh ? '-0.3~1.5%': '-0.3~1.5%'],
                [RED_MID,     zh ? '-1.5~3%': '-1.5~3%'],
                [RED_DARK,    zh ? '<-3%'   : '<-3%'],
              ].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 14, height: 10, borderRadius: 2, background: color }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Sector table (quick stats) ── */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
            borderRadius: 12, overflow: 'hidden', marginBottom: 14,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 80px 80px 72px',
              gap: 0,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              padding: '8px 14px',
              borderBottom: '1px solid var(--border-primary)',
              background: 'var(--bg-tertiary)',
            }}>
              <span>{zh ? '行业' : 'Sector'}</span>
              <span style={{ textAlign: 'right' }}>{zh ? '今日' : 'Today'}</span>
              <span style={{ textAlign: 'right' }}>{zh ? '近5日' : '5-Day'}</span>
              <span style={{ textAlign: 'right' }}>{zh ? '近20日' : '20-Day'}</span>
              <span style={{ textAlign: 'right' }}>{zh ? '量比' : 'Vol'}</span>
            </div>
            {[...sectors]
              .sort((a, b) => {
                const key = period === 'today' ? 'today_pct' : period === '5d' ? 'pct_5d' : 'pct_20d'
                return b[key] - a[key]
              })
              .map((s, i) => {
                const pctKey = period === 'today' ? 'today_pct' : period === '5d' ? 'pct_5d' : 'pct_20d'
                return (
                  <div
                    key={s.name}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 80px 80px 72px',
                      gap: 0,
                      padding: '7px 14px',
                      borderBottom: i < sectors.length - 1 ? '1px solid var(--border-primary)' : 'none',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(138,180,248,0.02)',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 4, height: 16, borderRadius: 2,
                        background: pctColor(s[pctKey]),
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: i < 3 ? 700 : 400 }}>
                        {zh ? s.name_zh : s.name_en}
                      </span>
                    </div>
                    <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: pctTextColor(s.today_pct) }}>
                      {fmt(s.today_pct)}
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 12, color: pctTextColor(s.pct_5d) }}>
                      {fmt(s.pct_5d)}
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 12, color: pctTextColor(s.pct_20d) }}>
                      {fmt(s.pct_20d)}
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 11, color: s.vol_ratio > 1.2 ? GREEN_MID : s.vol_ratio < 0.8 ? RED_MID : 'var(--text-muted)' }}>
                      {volLabel(s.vol_ratio, zh)}
                    </span>
                  </div>
                )
              })}
          </div>

          {/* ── Summary ── */}
          {summary && (
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              borderLeft: `3px solid ${ACCENT2}`,
              borderRadius: 10, padding: '10px 14px',
              fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              <span style={{ fontWeight: 700, color: ACCENT2 }}>
                {zh ? '📡 轮动小结' : '📡 Rotation Summary'}：
              </span>
              {' '}{summary}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
