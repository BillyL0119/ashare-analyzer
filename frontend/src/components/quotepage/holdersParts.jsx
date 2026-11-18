import { useId, useState } from 'react'
import './quotepage.css'
import './holders.css'
import { fmtDate } from './format'
import { fill } from './holdersStrings'

/** A label with a plain-language explanation ([definition, formula|null] from holdersStrings), styled like Term. */
export function Tip({ text, children }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  if (!text) return <span>{children}</span>
  return (
    <span className="qp-term" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(ev) => { if (ev.key === 'Escape') setOpen(false) }}
      >
        {children}
      </button>
      {open && (
        <span role="tooltip" id={id} className="qp-pop">
          {text[0]}
          {text[1] && <span className="f">{text[1]}</span>}
        </span>
      )}
    </span>
  )
}

/** A card with a heading and an optional one-line "how to read this". */
export function Section({ title, how, children }) {
  return (
    <section className="qp-card">
      <div className="qp-head">
        <h3 className="qp-h">{title}</h3>
      </div>
      {how && <p className="qo-how">{how}</p>}
      {children}
    </section>
  )
}

export function SourceLine({ data, t, lang }) {
  return <p className="qp-note">{fill(t.source, { date: fmtDate((data.as_of || '').slice(0, 10), lang) })}</p>
}

export function SkeletonBlocks() {
  return (
    <div className="qp" aria-busy="true">
      <div className="qp-skel" style={{ height: 96 }} />
      <div className="qp-skel" style={{ height: 220 }} />
      <div className="qp-skel" style={{ height: 260 }} />
    </div>
  )
}
