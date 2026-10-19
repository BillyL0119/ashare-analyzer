import { useEffect, useState } from 'react'
import { MUTED, BDR } from './ui'
import { paperHeaders } from '../../utils/paperAuth'

const PALETTE = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#6366f1', '#14b8a6', '#f97316']
const LEVEL = { warn: { icon: '!', color: '#f59e0b' }, info: { icon: 'i', color: '#0ea5e9' }, good: { icon: '✓', color: '#10b981' } }

// Portfolio check-up: where the money sits and plain findings, worked out by the server
export default function Checkup({ accountKey, market, gameId, lang, refreshKey }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let alive = true
    fetch('/api/paper/checkup', { method: 'POST', headers: paperHeaders(), body: JSON.stringify({ device_id: accountKey, market, game_id: gameId || null, lang }) })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive) setData(d) }).catch(() => {})
    return () => { alive = false }
  }, [accountKey, market, gameId, lang, refreshKey])
  if (!data) return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>…</div>
  const alloc = data.allocation || []
  let ci = 0
  const colored = alloc.map((a) => ({ ...a, color: a.cash ? 'var(--text-muted)' : PALETTE[ci++ % PALETTE.length] }))
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {colored.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
            {colored.map((a) => <div key={a.name} title={`${a.name} ${a.pct}%`} style={{ width: `${a.pct}%`, background: a.color }} />)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {colored.map((a) => (
              <span key={a.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: a.color }} />{a.name} <b style={{ fontVariantNumeric: 'tabular-nums' }}>{a.pct}%</b>
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {(data.findings || []).map((f) => {
          const lv = LEVEL[f.level] || LEVEL.info
          return (
            <div key={f.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${BDR}`, borderLeft: `3px solid ${lv.color}` }}>
              <span aria-hidden="true" style={{ flex: 'none', width: 20, height: 20, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, color: '#fff', background: lv.color }}>{lv.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 650 }}>{f.title}</div>
                <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55, marginTop: 2 }}>{f.body}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
