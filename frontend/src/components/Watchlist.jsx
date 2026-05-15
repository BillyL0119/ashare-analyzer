import { useState, useEffect } from 'react'
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
  const pctColor = pct == null ? '#9aa0a6' : pct >= 0 ? '#26a69a' : '#ef5350'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 12px',
        borderBottom: '1px solid rgba(138,180,248,0.07)',
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
          <span style={{ fontSize: 12, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          color: '#4a5568',
          fontSize: 16,
          lineHeight: 1,
          padding: '2px 4px',
          borderRadius: 4,
          transition: 'color 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef5350' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#4a5568' }}
      >
        ×
      </button>
    </div>
  )
}

export default function Watchlist({ lang }) {
  const [open, setOpen] = useState(false)
  const { list, remove } = useWatchlistStore()
  const { addSymbol } = useCompareStore()
  const isCN = lang === 'zh'

  const handleClick = (stock) => {
    addSymbol(stock)
    setOpen(false)
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={isCN ? '收藏夹' : 'Watchlist'}
        style={{
          position: 'fixed',
          right: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 500,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: open
            ? `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`
            : 'rgba(16, 20, 36, 0.95)',
          border: `1px solid ${open ? 'transparent' : 'rgba(138,180,248,0.25)'}`,
          cursor: 'pointer',
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'all 0.2s ease',
        }}
      >
        {list.length > 0 && !open ? '★' : open ? '★' : '☆'}
      </button>

      {/* Badge count */}
      {list.length > 0 && (
        <div
          style={{
            position: 'fixed',
            right: 14,
            top: 'calc(50% - 26px)',
            zIndex: 501,
            background: `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`,
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            width: 16,
            height: 16,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {list.length}
        </div>
      )}

      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            right: 72,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 499,
            width: 260,
            maxHeight: '70vh',
            background: 'rgba(14, 18, 32, 0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(138,180,248,0.18)',
            borderRadius: 14,
            boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '11px 14px',
              borderBottom: '1px solid rgba(138,180,248,0.12)',
              fontSize: 13,
              fontWeight: 700,
              color: '#e8eaed',
              background: 'rgba(138,180,248,0.04)',
              letterSpacing: '0.2px',
            }}
          >
            ⭐ {isCN ? '收藏夹' : 'Watchlist'}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {list.length === 0 ? (
              <div style={{ padding: '28px 14px', color: '#4a5568', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
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
                borderTop: '1px solid rgba(138,180,248,0.08)',
                fontSize: 11,
                color: '#4a5568',
                textAlign: 'center',
              }}
            >
              {isCN ? `共 ${list.length} 只股票` : `${list.length} stock${list.length !== 1 ? 's' : ''}`}
            </div>
          )}
        </div>
      )}
    </>
  )
}
