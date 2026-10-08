import { useState, useEffect, useRef } from 'react'
import useWatchlistStore from '../store/watchlistStore'
import useCompareStore from '../store/compareStore'
import { getRealtimeQuote, getUSRealtime } from '../api/stockApi'
import { T } from '../i18n/translations'
import { riseColor, fallColor } from '../utils/chartHelpers'

const ACCENT_BLUE = '#8ab4f8'

function WatchlistItem({ stock, t, onRemove, onClick }) {
  const [quote, setQuote] = useState(null)
  const isUS = stock.market === 'us'

  useEffect(() => {
    const fetcher = isUS ? getUSRealtime : getRealtimeQuote
    fetcher(stock.code)
      .then((r) => setQuote(r.data))
      .catch(() => {})
  }, [stock.code, isUS])

  const pct = quote?.pct_change ?? null
  const pctColor = pct == null ? 'var(--text-muted)' : pct >= 0 ? riseColor(stock.market) : fallColor(stock.market)
  const currSym = isUS ? '$' : '¥'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderBottom: '1px solid var(--border-primary)',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(138,180,248,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'nowrap' }}>
          <span style={{ fontSize: 11, color: ACCENT_BLUE, fontFamily: 'monospace', flexShrink: 0 }}>
            {stock.code}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
            {stock.name}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
            background: isUS ? 'rgba(99,102,241,0.15)' : 'rgba(14,165,233,0.12)',
            color: isUS ? '#818cf8' : '#38bdf8',
            border: `1px solid ${isUS ? 'rgba(99,102,241,0.25)' : 'rgba(14,165,233,0.2)'}`,
          }}>
            {isUS ? 'US' : t.marketCN}
          </span>
        </div>
        {quote && (
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 12, color: pctColor, fontWeight: 600 }}>
              {currSym}{quote.price?.toFixed(2) ?? '—'}
            </span>
            <span style={{ fontSize: 11, color: pctColor }}>
              {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : ''}
            </span>
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(stock.code) }}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 16, lineHeight: 1,
          padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s', flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef5350' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        ×
      </button>
    </div>
  )
}

export default function Watchlist({ lang, open, onClose, anchorRef }) {
  const { list, remove } = useWatchlistStore()
  const { addSymbol } = useCompareStore()
  const t = T[lang] || T.en
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose, anchorRef])

  const handleClick = (stock) => {
    addSymbol(stock)
    onClose?.()
  }

  if (!open) return null

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute', right: 0, top: 42, zIndex: 499,
        width: 290, maxHeight: 420,
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-primary)', borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '11px 14px', borderBottom: '1px solid var(--border-primary)',
        fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.2px',
      }}>
        ⭐ {t.navWatchlist}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {list.length === 0 ? (
          <div style={{ padding: '24px 14px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', lineHeight: 1.7 }}>
            <div>{t.watchlistEmpty}</div>
            <div style={{ marginTop: 4, opacity: 0.7 }}>{t.watchlistEmptyHint}</div>
          </div>
        ) : (
          list.map((stock) => (
            <WatchlistItem
              key={stock.code}
              stock={stock}
              t={t}
              onRemove={remove}
              onClick={() => handleClick(stock)}
            />
          ))
        )}
      </div>

      {list.length > 0 && (
        <div style={{
          padding: '7px 14px', borderTop: '1px solid var(--border-primary)',
          fontSize: 11, color: 'var(--text-muted)', textAlign: 'center',
        }}>
          {t.watchlistCount(list.length)}
        </div>
      )}
    </div>
  )
}
