import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStockSearch from '../../hooks/useStockSearch'
import useCompareStore from '../../store/compareStore'
import { BDR, MUTED, ACCENT, fmt, pct, plColor, stockHref } from './ui'
import { CUR } from '../../utils/markets'

/**
 * Stock lookup on the paper desk. Picking a result opens its chart page; the Trade button fills in the
 * order ticket instead. `only` keeps a competition to its own market.
 */
export default function StockSearch({ s, lang, first, only, onTrade }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const rows = useStockSearch(q, lang, { only, first })
  const nav = useNavigate()
  const box = useRef(null)

  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [])

  const chart = (r) => {
    useCompareStore.getState().switchMarketAndAddSymbol(r.market, { code: r.code, name: r.name })
    nav(stockHref(r.market, r.code))
  }
  const trade = (r) => { setOpen(false); setQ(''); onTrade(r) }
  const sel = rows?.length ? Math.min(hi, rows.length - 1) : 0
  const onKey = (e) => {
    if (!rows?.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(Math.min(rows.length - 1, sel + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(Math.max(0, sel - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); chart(rows[sel]) }
    else if (e.key === 'Escape') setOpen(false)
  }
  const show = open && q.trim()

  return (
    <div ref={box} style={{ position: 'relative', flex: '1 1 320px', maxWidth: 520, minWidth: 0 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: `1px solid ${show ? ACCENT : BDR}`, background: 'var(--bg-secondary)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ color: MUTED, flex: 'none' }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input id="pt-stock-search" value={q} placeholder={s.search.placeholder} autoComplete="off" spellCheck={false}
          role="combobox" aria-expanded={!!show} aria-controls="pt-stock-results" aria-label={s.search.placeholder}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0) }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 13.5 }} />
        {q && <button onClick={() => setQ('')} aria-label="clear" style={{ border: 'none', background: 'none', color: MUTED, cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>}
      </label>
      {show && (
        <div id="pt-stock-results" role="listbox" style={{ position: 'absolute', zIndex: 50, top: 'calc(100% + 6px)', left: 0, right: 0, maxHeight: 420, overflowY: 'auto',
          background: 'var(--bg-secondary)', border: `1px solid ${BDR}`, borderRadius: 12, boxShadow: '0 16px 40px rgba(0,0,0,.28)', padding: 4 }}>
          {rows == null && <div style={{ padding: '12px 14px', fontSize: 13, color: MUTED }}>{s.search.searching}</div>}
          {rows && rows.length === 0 && <div style={{ padding: '12px 14px', fontSize: 13, color: MUTED }}>{s.search.none}</div>}
          {(rows || []).map((r, i) => (
            <div key={r.market + r.code} role="option" aria-selected={i === sel} onMouseEnter={() => setHi(i)} onClick={() => chart(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: i === sel ? 'var(--bg-tertiary)' : 'transparent' }}>
              <span style={{ flex: 'none', minWidth: 46, textAlign: 'center', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 5, color: MUTED, border: `1px solid ${BDR}` }}>{s.search.tags[r.market]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{r.code}{r.price ? ` · ${CUR[r.market]}${fmt(r.price)}` : ''}</div>
              </div>
              {r.pct != null && <span style={{ flex: 'none', fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: plColor(r.pct, r.market) }}>{pct(r.pct)}</span>}
              <span style={{ flex: 'none', fontSize: 12, color: ACCENT, fontWeight: 650 }}>{s.search.chart} ↗</span>
              <button onClick={(e) => { e.stopPropagation(); trade(r) }}
                style={{ flex: 'none', border: 'none', cursor: 'pointer', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
                {s.search.trade}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
