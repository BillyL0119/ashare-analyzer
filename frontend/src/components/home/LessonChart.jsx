import { useEffect, useMemo, useState } from 'react'
import './lessonChart.css'

// The home page's small three-month line (desktop top panel and the phone home card).
// Drawn in real pixels: the plot box is sized by the layout (it grows to fill the section) and
// the svg is placed inside it absolutely, so labels and the end dot keep their size at any size
export default function LessonChart({ rows, dir, label }) {
  const PAD_B = 20, PAD_T = 6, PAD_R = 6
  const [box, setBox] = useState(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!box) return
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }))
    ro.observe(box)
    return () => ro.disconnect()
  }, [box])
  const { w: W, h: H } = size
  const geo = useMemo(() => {
    if (!rows?.length || !W || !H) return null
    const closes = rows.map((r) => r.close)
    const lo = Math.min(...closes), hi = Math.max(...closes)
    const span = hi - lo || 1
    const x = (i) => (i / (rows.length - 1)) * (W - PAD_R)
    const y = (v) => PAD_T + (1 - (v - lo) / span) * (H - PAD_B - PAD_T)
    const pts = closes.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
    const months = []
    rows.forEach((r, i) => {
      if (i === 0 || r.date.slice(0, 7) !== rows[i - 1].date.slice(0, 7)) months.push({ i, date: r.date })
    })
    return { pts, x, y, last: closes[closes.length - 1], n: rows.length, months }
  }, [rows, W, H])
  return (
    <figure className="bfs-lesson-chart">
      <div className="bfs-lesson-plot" ref={setBox}>
        {geo ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
            {[0, 0.5, 1].map((f) => {
              const yy = Math.round(PAD_T + f * (H - PAD_B - PAD_T)) + 0.5
              return <line key={f} x1="0" x2={W} y1={yy} y2={yy} className="grid" />
            })}
            <polyline points={geo.pts} className="line" />
            <circle cx={geo.x(geo.n - 1)} cy={geo.y(geo.last)} r="3.5" className={`dot is-${dir}`} />
            {geo.months.filter((m) => geo.x(m.i) < W - 36).map((m) => (
              <text key={m.date} x={geo.x(m.i)} y={H - 4} className="axis">
                {new Date(m.date + 'T12:00:00Z').toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}
              </text>
            ))}
          </svg>
        ) : <div className="is-empty" aria-hidden="true" />}
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  )
}
