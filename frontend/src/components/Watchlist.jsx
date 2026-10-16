import { useState, useEffect, useRef } from 'react'
import useWatchlistStore from '../store/watchlistStore'
import useCompareStore from '../store/compareStore'
import { getRealtimeQuote, getIntlRealtime } from '../api/stockApi'
import { T } from '../i18n/translations'
import { riseColor, fallColor } from '../utils/chartHelpers'
import { CUR, MARKET_TINT, guessMarket } from '../utils/markets'

const ACCENT_BLUE = '#a08672'

function WatchlistItem({ stock, t, onRemove, onClick }) {
  const [quote, setQuote] = useState(null)
  // Entries saved by older versions have no market: guess it from the code's shape
  const m = stock.market || guessMarket(stock.code)

  useEffect(() => {
    const req = m === 'cn' ? getRealtimeQuote(stock.code) : getIntlRealtime(m, stock.code)
    req.then((r) => setQuote(r.data)).catch(() => {})
  }, [stock.code, m])

  // A-share quotes call it pct_change, the US / HK / Japan ones change_pct
  const pct = quote?.pct_change ?? quote?.change_pct ?? null
  const pctColor = pct == null ? 'var(--text-muted)' : pct >= 0 ? riseColor(m) : fallColor(m)
  const currSym = CUR[m]
  const tint = MARKET_TINT[m]

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderBottom: '1px solid var(--border-primary)',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 6%, transparent)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'nowrap' }}>
          <span style={{ fontSize: 13, color: ACCENT_BLUE, fontFamily: 'var(--sans)', flexShrink: 0 }}>
            {stock.code}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
            {stock.name}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 600, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
            background: `${tint}1f`, color: tint,
          }}>
            {m === 'us' ? 'US' : m === 'cn' ? t.marketCN : m === 'hk' ? t.marketHK : t.marketJP}
          </span>
        </div>
        {quote && (
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 13, color: pctColor, fontWeight: 600 }}>
              {currSym}{quote.price?.toFixed(2) ?? '—'}
            </span>
            <span style={{ fontSize: 13, color: pctColor }}>
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
  const { addSymbol, switchMarketAndAddSymbol, market } = useCompareStore()
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
    // A stock from another market switches the page to that market first
    const m = stock.market || guessMarket(stock.code)
    if (m !== market) switchMarketAndAddSymbol(m, stock)
    else addSymbol(stock)
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
        border: '1px solid var(--border-primary)', borderRadius: 'var(--radius)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '11px 14px', borderBottom: '1px solid var(--border-primary)',
        fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.2px',
      }}>
        ⭐ {t.navWatchlist}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {list.length === 0 ? (
          <div style={{ padding: '24px 14px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
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
          fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
        }}>
          {t.watchlistCount(list.length)}
        </div>
      )}
    </div>
  )
}
