import { useState } from 'react'
import { BDR, MUTED, ACCENT, Card } from './ui'

// Learning missions: the server works out which ones are done from the account. One compact strip
// shows progress and the next step with a button that takes the student straight to it; the full
// checklist folds out on demand so it never pushes the order desk off the screen.
export default function Missions({ s, missions, onAction }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('bfs_pt_missions_list') === 'open' } catch { return false }
  })
  if (!missions?.length) return null
  const done = missions.filter((m) => m.done).length
  const next = missions.find((m) => !m.done)
  const toggle = () => {
    setOpen(!open)
    try { localStorage.setItem('bfs_pt_missions_list', open ? 'closed' : 'open') } catch { /* storage blocked */ }
  }
  const R = 17, C = 2 * Math.PI * R
  return (
    <Card style={{ display: 'grid', gap: 12, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
          <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
            <circle cx="21" cy="21" r={R} fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
            <circle cx="21" cy="21" r={R} fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${(done / missions.length) * C} ${C}`} transform="rotate(-90 21 21)" />
            <text x="21" y="25" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="var(--text-primary)">{done}/{missions.length}</text>
          </svg>
          <div style={{ display: 'grid', gap: 1 }}>
            <b style={{ fontSize: 13.5 }}>{s.missions.title}</b>
            <span style={{ fontSize: 12, color: MUTED }}>{s.missions.progress(done, missions.length)}</span>
          </div>
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 0, paddingLeft: 14, borderLeft: `1px solid ${BDR}` }}>
          {next ? (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 650 }}>{next.title}</div>
              <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>{next.body}</div>
            </>
          ) : <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{s.missions.allDone}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none', marginLeft: 'auto' }}>
          {next?.action && (
            <button onClick={() => onAction(next)} style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: ACCENT, color: '#fff', fontSize: 12.5, fontWeight: 700,
            }}>{s.missions.go}</button>
          )}
          <button onClick={toggle} aria-expanded={open} style={{
            padding: '7px 10px', borderRadius: 8, border: `1px solid ${BDR}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12.5,
          }}>{open ? s.missions.hide : s.missions.show} {open ? '▴' : '▾'}</button>
        </div>
      </div>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px 16px', paddingTop: 10, borderTop: `1px solid ${BDR}` }}>
          {missions.map((m) => (
            <div key={m.id} title={m.body} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, opacity: m.done ? 0.6 : 1, minWidth: 0 }}>
              <span aria-hidden="true" style={{
                flex: 'none', width: 16, height: 16, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800,
                background: m.done ? ACCENT : 'transparent', color: '#fff', border: m.done ? 'none' : `1.5px solid ${m === next ? ACCENT : BDR}`,
              }}>{m.done ? '✓' : ''}</span>
              <span style={{ textDecoration: m.done ? 'line-through' : 'none', fontWeight: m === next ? 650 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
