import { useEffect, useId, useRef } from 'react'
import { COLOR, FILL } from './diagramTheme'

// Draws a scene from diagramModels.js as an exam-style diagram: axes with titles, curves labelled at
// their ends, dashed guides to P1/Q1-style tick labels, shaded areas, shift arrows and brackets.
// Curves and points that carry a `drag` spec can be dragged (mouse, touch, or arrow keys).

const W = 430
const X0 = 58
const X1 = 392

// Panel layouts: one diagram, or a main diagram with a smaller one under it (elasticity + TR)
const LAYOUTS = {
  1: { h: 336, panels: [{ top: 34, bottom: 290 }] },
  2: { h: 486, panels: [{ top: 34, bottom: 264 }, { top: 336, bottom: 442 }] },
}

// "P_{max}", "S_2", "D£_1" → base text plus lowered subscripts
const SUB = /_(\{([^}]*)\}|([0-9A-Za-z*]+))/g
function parts(text) {
  const out = []
  let last = 0, m
  SUB.lastIndex = 0
  while ((m = SUB.exec(text))) {
    if (m.index > last) out.push([text.slice(last, m.index), false])
    out.push([m[2] ?? m[3], true])
    last = SUB.lastIndex
  }
  if (last < text.length) out.push([text.slice(last), false])
  return out
}
export function Rich({ text }) {
  let low = false
  return parts(text).map(([t, sub], i) => {
    const dy = sub && !low ? '0.32em' : !sub && low ? '-0.32em' : undefined
    low = sub
    return <tspan key={i} dy={dy} fontSize={sub ? '72%' : undefined}>{t}</tspan>
  })
}
function textWidth(text, size) {
  let w = 0
  for (const [t, sub] of parts(text)) for (const ch of t) w += (/[⺀-￿]/.test(ch) ? 1 : 0.58) * size * (sub ? 0.72 : 1)
  return w
}

// Spread labels along one axis so neighbours do not overlap; labels at the same spot are merged
function spread(items, gapOf, lo, hi) {
  const sorted = [...items].sort((a, b) => a.pos - b.pos)
  const merged = []
  for (const it of sorted) {
    const prev = merged[merged.length - 1]
    if (prev && Math.abs(prev.pos - it.pos) < 2.5) { prev.label = `${prev.label} = ${it.label}`; prev.faded = prev.faded && it.faded } else merged.push({ ...it })
  }
  for (const it of merged) it.at = it.pos
  for (let i = 1; i < merged.length; i++) {
    const need = gapOf(merged[i - 1], merged[i])
    if (merged[i].at - merged[i - 1].at < need) merged[i].at = merged[i - 1].at + need
  }
  const over = merged.length ? merged[merged.length - 1].at - hi : 0
  if (over > 0) for (let i = merged.length - 1; i >= 0; i--) {
    merged[i].at -= over
    if (i > 0 && merged[i].at - merged[i - 1].at >= gapOf(merged[i - 1], merged[i])) break
  }
  if (merged.length && merged[0].at < lo) { const d = lo - merged[0].at; merged.forEach((m) => { m.at += d }) }
  return merged
}

function Panel({ p, box, idx, onGrab, onKey, interactive, markerId, state }) {
  const { top, bottom } = box
  const X = (x) => X0 + (x / 10) * (X1 - X0)
  const Y = (y) => bottom - (y / 10) * (bottom - top)
  const path = (pts) => pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join('')

  // Curve labels at the curve's end, nudged apart when two land on each other. A curve that has
  // moved back onto an earlier one (long-run adjustment) shares one label: "SRAS_1 = SRAS_3".
  const near = (a, b) => a && b && a.length === b.length && a.every((q, k) => Math.hypot(q[0] - b[k][0], q[1] - b[k][1]) < 0.05)
  const labels = []
  for (const [li, ln] of p.lines.entries()) {
    if (!ln.pts || !ln.label) continue
    if (p.lines.slice(li + 1).some((o) => o.label && near(o.pts, ln.pts))) continue
    const twins = p.lines.slice(0, li).filter((o) => o.label && near(o.pts, ln.pts)).map((o) => o.label)
    const text = [...twins, ln.label].join(' = ')
    const pts = ln.pts
    let tx, ty, anchor = 'start'
    const w = textWidth(text, 12.5)
    if (ln.labelAt === 'top' || (pts.length === 2 && Math.abs(pts[0][0] - pts[1][0]) < 1e-6)) {
      const q = pts[0][1] > pts[1][1] ? pts[0] : pts[1]
      tx = X(q[0]); ty = Y(q[1]) - 7; anchor = 'middle'
    } else if (ln.labelAt === 'right-above') {
      const q = pts[0][0] > pts[pts.length - 1][0] ? pts[0] : pts[pts.length - 1]
      tx = X(q[0]); ty = Y(q[1]) - 6; anchor = 'end'
    } else if (ln.labelAt === 'peak') {
      const q = pts.reduce((a, b) => (b[1] > a[1] ? b : a))
      tx = X(q[0]) + 14; ty = Y(q[1]) - 6
    } else {
      const endFirst = pts[0][0] > pts[pts.length - 1][0]
      const q = endFirst ? pts[0] : pts[pts.length - 1], o = endFirst ? pts[pts.length - 1] : pts[0]
      const sx = X(q[0]), sy = Y(q[1])
      if (sx + 5 + w <= W - 2) { tx = sx + 5; ty = sy + (sy < top + 8 ? 8 : sy > bottom - 8 ? -2 : 4) }
      else if (q[1] < o[1] && pts.length === 2) {
        // a long label on a downward curve: move back up the curve until it fits on the right
        const k = (W - 2 - w - 5 - sx) / (X(o[0]) - sx)
        tx = sx + k * (X(o[0]) - sx) + 5; ty = sy + k * (Y(o[1]) - sy) + 4
      } else { tx = sx - 2; ty = sy - 9; anchor = 'end' }
    }
    const x0 = anchor === 'start' ? tx : anchor === 'end' ? tx - w : tx - w / 2
    labels.push({ ln, text, tx, ty, anchor, box: [x0, ty - 11, x0 + w, ty + 6] })
  }
  // Later labels move up past earlier ones; repeat, since a move can land on a label already passed
  for (let pass = 0, moved = true; moved && pass < 6; pass++) {
    moved = false
    for (let i = 1; i < labels.length; i++) for (let j = 0; j < i; j++) {
      const a = labels[j].box, b = labels[i].box
      if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) {
        const d = b[3] - a[1] + 1
        labels[i].ty -= d; labels[i].box = [b[0], b[1] - d, b[2], b[3] - d]
        moved = true
      }
    }
  }

  const xt = spread((p.ticks?.x || []).map((t) => ({ ...t, pos: X(t.v) })), (a, b) => (textWidth(a.label, 12) + textWidth(b.label, 12)) / 2 + 5, X0 + 4, X1 + 30)
  const yt = spread((p.ticks?.y || []).map((t) => ({ ...t, pos: -Y(t.v) })), () => 18, -bottom + 2, -top + 4).map((t) => ({ ...t, at: -t.at, pos: -t.pos }))

  // Point labels sit up and to the right; one that would land on an earlier point label moves to
  // another corner (labels of points that coincide are joined above, so only distinct points count)
  const pointSpots = []
  const placed = []
  for (const [i, pt] of (p.points || []).entries()) {
    const cx = X(pt.at[0]), cy = Y(pt.at[1])
    const same = (q) => q.label && Math.hypot(X(q.at[0]) - cx, Y(q.at[1]) - cy) < 3
    const all = p.points
    const text = !pt.label ? '' : [pt.label, ...all.slice(i + 1).filter(same).map((q) => q.label)].join(' = ')
    const w = textWidth(text, 12)
    const options = [[cx + 8, cy - 8, 'start'], [cx - 8, cy - 8, 'end'], [cx + 8, cy + 18, 'start'], [cx - 8, cy + 18, 'end']]
    const boxOf = ([x, y, anchor]) => (anchor === 'start' ? [x, y - 11, x + w, y + 3] : [x - w, y - 11, x, y + 3])
    const free = (bx) => !placed.some((o) => bx[0] < o[2] && o[0] < bx[2] && bx[1] < o[3] && o[1] < bx[3])
    const pick = !text || all.slice(0, i).some(same) ? options[0] : options.find((o) => free(boxOf(o))) || options[0]
    if (text && !all.slice(0, i).some(same)) placed.push(boxOf(pick))
    pointSpots.push({ x: pick[0], y: pick[1], anchor: pick[2] })
  }

  const guide = (g, i) => {
    const o = Array.isArray(g) ? { at: g } : g
    const [x, y] = o.at
    const sx = X(x), sy = Y(y)
    return (
      <g key={`g${i}`} stroke="var(--dl-ink2)" strokeWidth="1" strokeDasharray="4 4" opacity={o.faded ? 0.35 : 0.7}>
        {o.v !== false && <line x1={sx} y1={sy} x2={sx} y2={bottom} />}
        {o.h !== false && <line x1={X0} y1={sy} x2={sx} y2={sy} />}
      </g>
    )
  }
  const centroid = (pts) => [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length]

  return (
    <g>
      {/* Shaded areas */}
      {(p.areas || []).map((a, i) => a.pts.length > 2 && (
        <g key={`a${i}`}>
          <path d={`${path(a.pts)}Z`} fill={FILL[a.kind]} stroke="none" />
          {a.label && a.label.length <= 2 && (() => { const c = centroid(a.pts); return <text x={X(c[0])} y={Y(c[1]) + 4} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--dl-ink)">{a.label}</text> })()}
        </g>
      ))}
      {(p.vlines || []).map((v, i) => <line key={`v${i}`} x1={X(v.x)} y1={top} x2={X(v.x)} y2={bottom} stroke="var(--dl-ink2)" strokeDasharray="3 4" opacity={v.faded ? 0.4 : 0.8} />)}
      {(p.guides || []).map(guide)}

      {/* Axes */}
      <g stroke="var(--dl-ink2)" strokeWidth="1.4" fill="none">
        <path d={`M${X0},${top - 10}L${X0},${bottom}L${X1 + 12},${bottom}`} />
        <path d={`M${X0 - 4},${top - 4}L${X0},${top - 12}L${X0 + 4},${top - 4}M${X1 + 6},${bottom - 4}L${X1 + 14},${bottom}L${X1 + 6},${bottom + 4}`} />
      </g>
      <text x={X0 - 52} y={top - 18} fontSize="12" fontWeight="650" fill="var(--dl-ink2)"><Rich text={p.axes.y} /></text>
      <text x={X1 + 14} y={bottom + 34} textAnchor="end" fontSize="12" fontWeight="650" fill="var(--dl-ink2)"><Rich text={p.axes.x} /></text>
      <text x={X0 - 8} y={bottom + 14} textAnchor="end" fontSize="11" fill="var(--dl-ink2)">0</text>

      {/* Curves (a wide invisible stroke under each draggable one catches the pointer) */}
      {p.lines.map((ln, i) => {
        if (!ln.pts) return null
        const d = path(ln.pts)
        const color = COLOR[ln.kind] || 'var(--dl-ink)'
        const drag = interactive && ln.drag
        return (
          <g key={`l${i}`}>
            {drag && (
              <path d={d} className="dl-hit" data-drag="1" stroke="transparent" strokeWidth="24" fill="none" tabIndex={0} role="slider"
                aria-label={ln.drag.aria} aria-valuenow={Number((state[ln.drag.key] ?? 0).toFixed(2))} aria-valuemin={ln.drag.min} aria-valuemax={ln.drag.max}
                onPointerDown={(e) => onGrab(e, ln.drag, idx)} onKeyDown={(e) => onKey(e, ln.drag)} />
            )}
            {ln.kind !== 'hit' && (
              <path d={d} className="dl-curve" stroke={color} strokeWidth={ln.faded ? 2 : 2.6} fill="none" opacity={ln.faded ? 0.45 : 1}
                strokeLinecap="round" pointerEvents="none" />
            )}
            {drag && ln.kind !== 'hit' && (() => {
              // a small grip on each draggable curve, so touch users can see what moves
              // (78% along: the upper or lower right, away from the shaded areas near the axes)
              const q = ln.pts.length === 2 ? [ln.pts[0][0] * 0.22 + ln.pts[1][0] * 0.78, ln.pts[0][1] * 0.22 + ln.pts[1][1] * 0.78] : ln.pts[Math.floor(ln.pts.length * 0.75)]
              return <circle cx={X(q[0])} cy={Y(q[1])} r="5" fill="var(--dl-bg)" stroke={color} strokeWidth="2" pointerEvents="none" />
            })()}
          </g>
        )
      })}

      {/* Shift arrows */}
      {(p.arrows || []).map((a, i) => {
        const x1 = X(a.from[0]), y1 = Y(a.from[1]), x2 = X(a.to[0]), y2 = Y(a.to[1])
        const len = Math.hypot(x2 - x1, y2 - y1)
        if (len < 16) return null
        const ux = (x2 - x1) / len, uy = (y2 - y1) / len
        return <line key={`ar${i}`} x1={x1 + ux * 5} y1={y1 + uy * 5} x2={x2 - ux * 7} y2={y2 - uy * 7} stroke="var(--dl-ink)" strokeWidth="1.5" markerEnd={`url(#${markerId})`} opacity="0.85" />
      })}

      {/* Brackets: shortage, surplus, output gap, imports, the tax wedge */}
      {(p.brackets || []).map((b, i) => {
        const x1 = X(b.from[0]), y1 = Y(b.from[1]), x2 = X(b.to[0]), y2 = Y(b.to[1])
        if (Math.hypot(x2 - x1, y2 - y1) < 10) return null
        const color = b.kind === 'rec' || b.kind === 'inf' ? 'var(--c-ctrl)' : 'var(--dl-ink)'
        return (
          <g key={`b${i}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.4" markerStart={`url(#${markerId}s)`} markerEnd={`url(#${markerId})`} />
            {b.vertical
              ? <text x={x1 + (b.side === 'left' ? -6 : 6)} y={(y1 + y2) / 2 + 4} textAnchor={b.side === 'left' ? 'end' : 'start'} fontSize="11.5" fontWeight="650" fill={color}>{b.label}</text>
              : <text x={(x1 + x2) / 2} y={Math.min(y1, y2) - 5} textAnchor="middle" fontSize="11.5" fontWeight="650" fill={color}>{b.label}</text>}
          </g>
        )
      })}

      {/* Elasticity zones along the demand curve */}
      {(p.zones || []).map((z, i) => {
        const mx = (z.from[0] + z.to[0]) / 2, my = (z.from[1] + z.to[1]) / 2
        return <text key={`z${i}`} x={X(mx) + 8} y={Y(my) - 6} fontSize="11.5" fontStyle="italic" fill="var(--dl-ink2)">{z.label}</text>
      })}
      {p.mid && <g><line x1={X(p.mid.at[0]) - 6} y1={Y(p.mid.at[1]) - 6} x2={X(p.mid.at[0]) + 6} y2={Y(p.mid.at[1]) + 6} stroke="var(--dl-ink2)" strokeWidth="1.4" />
        <text x={X(p.mid.at[0]) + 10} y={Y(p.mid.at[1]) + 18} fontSize="11" fill="var(--dl-ink2)">{p.mid.label}</text></g>}

      {/* Points (a point the economy returns to carries both labels, e.g. "A = C") */}
      {(p.points || []).map((pt, i, all) => {
        const cx = X(pt.at[0]), cy = Y(pt.at[1])
        const drag = interactive && pt.drag
        const same = (q) => q.label && Math.hypot(X(q.at[0]) - cx, Y(q.at[1]) - cy) < 3
        const label = !pt.label || all.slice(0, i).some(same) ? null : [pt.label, ...all.slice(i + 1).filter(same).map((q) => q.label)].join(' = ')
        const spot = pointSpots[i]
        return (
          <g key={`p${i}`}>
            {drag && <circle cx={cx} cy={cy} r="16" className="dl-pt-hit" data-drag="1" fill="transparent" tabIndex={0} role="slider" aria-label={pt.drag.aria}
              aria-valuenow={Number((state[pt.drag.key] ?? 0).toFixed(2))} onPointerDown={(e) => onGrab(e, pt.drag, idx)} onKeyDown={(e) => onKey(e, pt.drag)} />}
            <circle cx={cx} cy={cy} r={drag ? 6.5 : 4.5} fill={pt.faded ? 'var(--dl-bg)' : 'var(--dl-ink)'} stroke={drag ? 'var(--c-d)' : 'var(--dl-ink)'} strokeWidth={drag ? 2.5 : 1.6} pointerEvents="none" />
            {label && <text x={spot.x} y={spot.y} textAnchor={spot.anchor} fontSize="12" fontWeight="700" fill="var(--dl-ink)" opacity={pt.faded && !all.slice(i + 1).some(same) ? 0.6 : 1}>{label}</text>}
          </g>
        )
      })}

      {/* Curve labels */}
      {labels.map((l, i) => (
        <text key={`cl${i}`} x={l.tx} y={l.ty} textAnchor={l.anchor} fontSize="12.5" fontWeight="700" fill={COLOR[l.ln.kind] || 'var(--dl-ink)'} opacity={l.ln.faded ? 0.6 : 1}>
          <Rich text={l.text} />
        </text>
      ))}

      {/* Tick labels */}
      {xt.map((t, i) => (
        <g key={`xt${i}`} opacity={t.faded ? 0.55 : 1}>
          <line x1={t.pos} y1={bottom} x2={t.pos} y2={bottom + 4} stroke="var(--dl-ink2)" />
          <text x={t.at} y={bottom + 17} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--dl-ink)"><Rich text={t.label} /></text>
        </g>
      ))}
      {yt.map((t, i) => (
        <g key={`yt${i}`} opacity={t.faded ? 0.55 : 1}>
          <line x1={X0 - 4} y1={t.pos} x2={X0} y2={t.pos} stroke="var(--dl-ink2)" />
          <text x={X0 - 7} y={t.at + 4} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--dl-ink)"><Rich text={t.label} /></text>
        </g>
      ))}
    </g>
  )
}

export default function DiagramSVG({ scene, state, title, interactive = true, onDrag, onNudge }) {
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const layout = LAYOUTS[scene.panels.length] || LAYOUTS[1]

  // Grabbing a curve on a touch screen must not scroll the page
  useEffect(() => {
    const el = svgRef.current
    if (!el) return undefined
    const stop = (e) => { if (e.target.closest?.('[data-drag]')) e.preventDefault() }
    el.addEventListener('touchstart', stop, { passive: false })
    return () => el.removeEventListener('touchstart', stop)
  }, [])

  const toModel = (e, idx) => {
    const svg = svgRef.current
    const ctm = svg.getScreenCTM()
    if (!ctm) return [0, 0]
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const { top, bottom } = layout.panels[idx]
    return [((pt.x - X0) / (X1 - X0)) * 10, ((bottom - pt.y) / (bottom - top)) * 10]
  }
  const onGrab = (e, spec, idx) => {
    if (!onDrag) return
    e.preventDefault()
    e.currentTarget.focus?.({ preventScroll: true })
    svgRef.current.setPointerCapture?.(e.pointerId)
    const m0 = toModel(e, idx)
    dragRef.current = { spec, idx, m0 }
    onDrag(spec, m0, m0, 'start')
  }
  const onMove = (e) => {
    const d = dragRef.current
    if (!d) return
    onDrag(d.spec, toModel(e, d.idx), d.m0, 'move')
  }
  const onUp = () => { if (dragRef.current) { dragRef.current = null; onDrag?.(null, null, null, 'end') } }
  const onKey = (e, spec) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]
    if (!step || !onNudge) return
    e.preventDefault()
    // left/right always moves an x-drag; up/down moves a y-drag
    const along = spec.axis === 'y' ? (e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : step) : step
    onNudge(spec, spec.axis === 'y' ? along * (spec.sign || 1) : along)
  }

  return (
    <svg ref={svgRef} className="dl-svg" viewBox={`0 0 ${W} ${layout.h}`} role="img" aria-label={title}
      onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp}>
      <defs>
        <marker id={uid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0L10,5L0,10z" fill="var(--dl-ink)" />
        </marker>
        <marker id={`${uid}s`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0L10,5L0,10z" fill="var(--dl-ink)" />
        </marker>
      </defs>
      {scene.panels.map((p, i) => (
        <Panel key={i} p={p} box={layout.panels[i]} idx={i} onGrab={onGrab} onKey={onKey} interactive={interactive} markerId={uid} state={state} />
      ))}
    </svg>
  )
}
