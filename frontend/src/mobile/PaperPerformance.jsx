import { useEffect, useMemo, useState } from 'react'
import { useT } from './i18n'
import { Section } from './ui'
import useLangStore from '../store/langStore'
import { changeColor } from './helpers'
import { paperHeaders } from '../utils/paperAuth'

// Account value vs the S&P 500 / CSI 300 / Hang Seng / Nikkei 225 since the first trade, drawn as plain SVG lines.
const W = 340, H = 150, PAD = 4

const fmtPct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`)

export default function PaperPerformance({ deviceId, market, refreshKey, gameId }) {
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    fetch('/api/paper/performance', { method: 'POST', headers: paperHeaders(), body: JSON.stringify({ device_id: deviceId, market, game_id: gameId || null }) })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive) setData(d) }).catch(() => {})
    return () => { alive = false }
  }, [deviceId, market, refreshKey, gameId])

  const pts = data?.points || []
  const paths = useMemo(() => {
    if (pts.length < 2) return null
    const vals = pts.flatMap((p) => [p.value, p.bench])
    const lo = Math.min(...vals), hi = Math.max(...vals)
    const span = hi - lo || 1
    const x = (i) => PAD + (i / (pts.length - 1)) * (W - PAD * 2)
    const y = (v) => PAD + (1 - (v - lo) / span) * (H - PAD * 2)
    const line = (key) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
    return { mine: line('value'), bench: line('bench'), base: y(data.initial) }
  }, [pts, data])

  if (!paths) return null
  const benchName = { 'S&P 500': t('标普500'), 'CSI 300': t('沪深300'), 'Hang Seng': t('恒生指数'), 'Nikkei 225': t('日经225') }[data.benchmark] || data.benchmark
  const ahead = (data.excess_pct ?? 0) >= 0
  const locale = lang === 'zh' ? 'zh-CN' : lang
  const since = new Date(data.since + 'T00:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' })

  return (
    <Section title={t('收益曲线')}>
      <div className="m-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className="m-chip" style={{ fontWeight: 700, color: ahead ? 'var(--accent)' : '#F59E0B', background: ahead ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'color-mix(in srgb, #F59E0B 14%, transparent)' }}>
            {ahead ? t('跑赢大盘 %@', fmtPct(data.excess_pct).replace('+', '')) : t('跑输大盘 %@', fmtPct(data.excess_pct).replace('-', ''))}
          </span>
          <span className="m-label">{t('自 %@ 起', since)}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={t('收益曲线')}>
          <line x1="0" x2={W} y1={paths.base} y2={paths.base} stroke="var(--stroke)" strokeWidth="1" />
          <path d={paths.bench} fill="none" stroke="var(--text-3)" strokeWidth="1.6" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          <path d={paths.mine} fill="none" stroke="var(--accent)" strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        <div className="m-tiles" style={{ background: 'var(--surface-hi)', borderRadius: 14, padding: '10px 0' }}>
          {[[t('我的收益'), fmtPct(data.return_pct), changeColor(data.return_pct, market)], [benchName, fmtPct(data.bench_return_pct), null], [t('最大回撤'), fmtPct(data.max_drawdown_pct), null]].map(([k, v, c], i) => (
            <div key={k} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid var(--stroke)' : 'none', minWidth: 0 }}>
              <div className="m-label">{k}</div>
              <div className="m-num" style={{ fontWeight: 700, marginTop: 3, fontSize: 15, color: c || undefined }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11.5 }} className="m-muted">
          <span><b style={{ color: 'var(--accent)' }}>━</b> {t('我的组合')}</span>
          <span><b style={{ color: 'var(--text-3)' }}>┅</b> {benchName}</span>
        </div>
      </div>
    </Section>
  )
}
