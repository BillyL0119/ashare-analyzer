import { useId, useState } from 'react'
import { explain } from './glossary'

/**
 * A figure's label. When the glossary explains the term, the label gets a dotted underline and opens a
 * short definition (and formula) on hover, keyboard focus or tap; Escape closes it. Otherwise plain text.
 */
export default function Term({ k, lang, children }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const e = explain(k, lang)
  if (!e) return <span>{children}</span>
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
          {e.d}
          {e.f && <span className="f">{e.f}</span>}
        </span>
      )}
    </span>
  )
}
