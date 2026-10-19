import { useState } from 'react'
import { BDR, MUTED, ACCENT, Card } from './ui'

// Learning missions: the server works out which ones are done from the account; the next one
// open gets a button that takes the student straight to it.
export default function Missions({ s, missions, onAction }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('bfs_pt_missions') !== 'closed' } catch { return true }
  })
  if (!missions?.length) return null
  const done = missions.filter((m) => m.done).length
  const next = missions.find((m) => !m.done)
  const toggle = () => {
    setOpen(!open)
    try { localStorage.setItem('bfs_pt_missions', open ? 'closed' : 'open') } catch { /* storage blocked */ }
  }
  return (
    <Card style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 15 }}>{s.missions.title}</b>
        <span style={{ fontSize: 12.5, color: MUTED }}>{s.missions.progress(done, missions.length)}</span>
        <div style={{ flex: '1 1 120px', height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden', minWidth: 80 }}>
          <div style={{ width: `${(done / missions.length) * 100}%`, height: '100%', background: ACCENT, borderRadius: 3 }} />
        </div>
        <button onClick={toggle} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 12.5 }}>
          {open ? s.missions.hide : s.missions.show}
        </button>
      </div>
      {open && (!next ? (
        <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{s.missions.allDone}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
          {missions.map((m) => {
            const isNext = m === next
            return (
              <div key={m.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${isNext ? `${ACCENT}66` : BDR}`, background: isNext ? `${ACCENT}10` : 'transparent',
                opacity: m.done ? 0.55 : 1,
              }}>
                <span aria-hidden="true" style={{
                  flex: 'none', width: 20, height: 20, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800,
                  background: m.done ? ACCENT : 'transparent', color: m.done ? '#fff' : MUTED, border: m.done ? 'none' : `1.5px solid ${BDR}`,
                }}>{m.done ? '✓' : ''}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 650, textDecoration: m.done ? 'line-through' : 'none' }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginTop: 2 }}>{m.body}</div>
                  {isNext && m.action && (
                    <button onClick={() => onAction(m)} style={{
                      marginTop: 8, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      background: ACCENT, color: '#fff', fontSize: 12.5, fontWeight: 700,
                    }}>{s.missions.go}</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </Card>
  )
}
