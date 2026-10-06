import { Fragment } from 'react'

// Minimal, safe Markdown for AI replies: headings, lists, bold/italic/code, tables, rules.
// Output is plain React elements (no innerHTML) and links are rendered as text, never as anchors.

function inline(text, key = 0) {
  const parts = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|\[([^\]]+)\]\([^)]+\))/g
  let last = 0, m, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) parts.push(<strong key={`${key}b${i}`}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) parts.push(<code key={`${key}c${i}`} style={{ background: 'var(--surface-hi)', padding: '1px 5px', borderRadius: 5, fontSize: '.92em' }}>{tok.slice(1, -1)}</code>)
    else if (tok.startsWith('[')) parts.push(m[2])
    else parts.push(<em key={`${key}i${i}`}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length; i++
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export default function Markdown({ text }) {
  const lines = text.split('\n')
  const out = []
  lines.forEach((raw, i) => {
    const l = raw.trim()
    if (!l) { out.push(<div key={i} style={{ height: 4 }} />); return }
    if (/^-{3,}$/.test(l)) { out.push(<hr key={i} style={{ border: 0, borderTop: '1px solid var(--stroke)', margin: '8px 0' }} />); return }
    const h = l.match(/^#{1,4}\s+(.*)/)
    if (h) { out.push(<div key={i} style={{ fontWeight: 800, fontSize: 16, marginTop: 6 }}>{inline(h[1], i)}</div>); return }
    if (l.startsWith('|')) {
      const cells = l.split('|').slice(1, -1).map((c) => c.trim())
      if (cells.every((c) => /^[-: ]+$/.test(c))) return
      out.push(<div key={i} style={{ display: 'flex', gap: 8, padding: '5px 9px', borderRadius: 8, background: 'var(--surface-hi)', fontSize: 13, marginTop: 3 }}>
        {cells.map((c, j) => <div key={j} style={{ flex: 1, minWidth: 0 }}>{inline(c, `${i}-${j}`)}</div>)}</div>); return
    }
    const b = l.match(/^[-*]\s+(.*)/)
    if (b) { out.push(<div key={i} style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--accent)' }}>•</span><span>{inline(b[1], i)}</span></div>); return }
    const n = l.match(/^(\d+)[.、]\s+(.*)/)
    if (n) { out.push(<div key={i} style={{ display: 'flex', gap: 8 }}><span className="m-num" style={{ color: "var(--accent)", flex: "none" }}>{n[1]}.</span><span>{inline(n[2], i)}</span></div>); return }
    out.push(<div key={i}>{inline(l, i)}</div>)
  })
  return <Fragment><div style={{ display: 'grid', gap: 5, wordBreak: 'break-word' }}>{out}</div></Fragment>
}
