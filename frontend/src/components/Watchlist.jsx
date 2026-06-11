import { useState, useEffect, useRef } from 'react'
import useWatchlistStore from '../store/watchlistStore'
import useCompareStore from '../store/compareStore'
import { getRealtimeQuote } from '../api/stockApi'

const ACCENT_BLUE = '#8ab4f8'
const ACCENT_PURPLE = '#c084fc'

function WatchlistItem({ stock, onRemove, onClick }) {
  const [quote, setQuote] = useState(null)

  useEffect(() => {
    getRealtimeQuote(stock.code)
      .then((r) => setQuote(r.data))
      .catch(() => {})
  }, [stock.code])

  const pct = quote?.pct_change ?? null
  const pctColor = pct == null ? 'var(--text-muted)' : pct >= 0 ? '#26a69a' : '#ef5350'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 12px',
        borderBottom: '1px solid var(--border-primary)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(138,180,248,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: ACCENT_BLUE, fontFamily: 'monospace', flexShrink: 0 }}>
            {stock.code}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stock.name}
          </span>
        </div>
        {quote && (
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 12, color: pctColor, fontWeight: 600 }}>
              ¥{quote.price?.toFixed(2) ?? '—'}
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
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: 16,
          lineHeight: 1,
          padding: '2px 4px',
          borderRadius: 4,
          transition: 'color 0.15s',
          flexShrink: 0,
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
  const isCN = lang === 'zh'
  const panelRef = useRef(null)

  // Click outside to close
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
        position: 'absolute',
        right: 0,
        top: 42,
        zIndex: 499,
        width: 280,
        maxHeight: 400,
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-primary)',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '11px 14px',
          borderBottom: '1px solid var(--border-primary)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '0.2px',
        }}
      >
        ⭐ {isCN ? '收藏夹' : 'Watchlist'}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {list.length === 0 ? (
          <div style={{ padding: '28px 14px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
            {isCN
              ? '暂无收藏\n在股票卡片上点击 ⭐ 添加'
              : 'No saved stocks.\nClick ⭐ on a stock card to add.'}
          </div>
        ) : (
          list.map((stock) => (
            <WatchlistItem
              key={stock.code}
              stock={stock}
              onRemove={remove}
              onClick={() => handleClick(stock)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {list.length > 0 && (
        <div
          style={{
            padding: '7px 14px',
            borderTop: '1px solid var(--border-primary)',
            fontSize: 11,
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          {isCN ? `共 ${list.length} 只股票` : `${list.length} stock${list.length !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  )
}
