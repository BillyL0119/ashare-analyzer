// Small building blocks shared by the paper trading desk.
import { useNavigate } from 'react-router-dom'
import { CUR } from '../../utils/markets'
import useCompareStore from '../../store/compareStore'

export const BDR = 'var(--border-primary)'
export const MUTED = 'var(--text-secondary)'
export const UP = '#10b981'
export const DOWN = '#ef4444'
export const ACCENT = '#0ea5e9'

export const fmt = (n, d = 2) => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }))
export const money = (n, m, d = 2) => (n == null ? '—' : `${n < 0 ? '-' : ''}${CUR[m] || '$'}${fmt(Math.abs(n), d)}`)
export const signed = (n, m, d = 2) => (n == null ? '—' : `${n > 0 ? '+' : n < 0 ? '-' : ''}${CUR[m] || '$'}${fmt(Math.abs(n), d)}`)
export const pct = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${Number(n).toFixed(2)}%`)
/** A-shares are red-up like the rest of the site; other markets green-up. */
export const plColor = (v, m) => (!v ? MUTED : (v > 0) === (m !== 'cn') ? UP : DOWN)

export function Card({ children, style, ...rest }) {
  return (
    <section {...rest} style={{ background: 'var(--bg-secondary)', border: `1px solid ${BDR}`, borderRadius: 14, padding: '16px 18px', minWidth: 0, ...style }}>
      {children}
    </section>
  )
}

export function Seg({ value, onChange, options, size = 'md', full }) {
  return (
    <div role="tablist" style={{ display: full ? 'flex' : 'inline-flex', gap: 3, padding: 3, borderRadius: 999, background: 'var(--bg-tertiary)', border: `1px solid ${BDR}`, maxWidth: '100%', overflowX: 'auto', scrollbarWidth: 'none' }}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} disabled={o.disabled} onClick={() => onChange(o.value)}
          style={{
            flex: full ? 1 : 'none', whiteSpace: 'nowrap', border: 'none', cursor: o.disabled ? 'not-allowed' : 'pointer', borderRadius: 999,
            padding: size === 'sm' ? '4px 10px' : '6px 14px', fontSize: size === 'sm' ? 12 : 13, fontWeight: 650,
            background: value === o.value ? (o.color || 'linear-gradient(135deg, #0ea5e9, #6366f1)') : 'transparent',
            color: value === o.value ? '#fff' : o.disabled ? 'var(--text-muted)' : MUTED, opacity: o.disabled ? 0.5 : 1,
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'grid', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, color: MUTED, fontWeight: 600 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</span>}
    </label>
  )
}

export const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: 'var(--bg-tertiary)', border: `1px solid ${BDR}`, borderRadius: 9,
  color: 'var(--text-primary)', padding: '8px 11px', fontSize: 14, outline: 'none', fontVariantNumeric: 'tabular-nums',
}

export function Stat({ label, value, sub, color, big }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: MUTED, fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div className={big ? 'serif-num' : undefined} style={{ fontSize: big ? 30 : 17, fontWeight: big ? 400 : 700, color: color || 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{sub}</div>}
    </div>
  )
}

export function Modal({ onClose, children, width = 460 }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-secondary)', border: `1px solid ${BDR}`, borderRadius: 16, padding: '22px 24px', width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 10, right: 14, background: 'none', border: 'none', color: MUTED, fontSize: 20, cursor: 'pointer' }}>×</button>
        {children}
      </div>
    </div>
  )
}

export function Button({ children, onClick, disabled, color = ACCENT, ghost, style, type = 'button' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        border: ghost ? `1px solid ${BDR}` : 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13.5, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer', background: ghost ? 'transparent' : disabled ? 'var(--bg-hover)' : color,
        color: ghost ? 'var(--text-secondary)' : disabled ? 'var(--text-muted)' : '#fff', ...style,
      }}>
      {children}
    </button>
  )
}

/** Client-side estimate of fees, mirroring services/paper_engine.fee on the server. */
export function estFee(m, side, amount, shares) {
  if (!(amount > 0)) return 0
  const selling = side === 'sell' || side === 'short'
  if (m === 'cn') return Math.max(5, amount * (selling ? 0.0013 : 0.0003))
  if (m === 'us') return selling ? shares * 0.000008 : 0
  if (m === 'hk') return Math.ceil(amount * 0.001) + amount * 0.000085
  return 0
}

export const stockHref = (market, code) => `/stock/${market}/${encodeURIComponent(code)}`

/** A ticker that opens the stock's chart page; a modified click still opens a new tab. */
export function StockLink({ market, code, name, children, style, title }) {
  const nav = useNavigate()
  const href = stockHref(market, code)
  return (
    <a href={href} title={title} style={{ color: 'inherit', textDecoration: 'none', ...style }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return
        e.preventDefault()
        useCompareStore.getState().switchMarketAndAddSymbol(market, { code, name: name || code })
        nav(href)
      }}>
      {children}
    </a>
  )
}
