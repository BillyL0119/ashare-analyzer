import { useState } from 'react'
import { BDR, MUTED, UP, DOWN, ACCENT, fmt, money, signed, pct, plColor, StockLink } from './ui'

const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11.5, color: MUTED, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: `1px solid ${BDR}` }
const td = { padding: '9px 10px', fontSize: 13, borderBottom: `1px solid ${BDR}`, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
const num = { ...td, textAlign: 'right' }
const thr = { ...th, textAlign: 'right' }

function Table({ head, children, empty, emptyText }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead><tr>{head}</tr></thead>
        <tbody>
          {empty ? <tr><td colSpan={20} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', padding: 28, whiteSpace: 'normal' }}>{emptyText}</td></tr> : children}
        </tbody>
      </table>
    </div>
  )
}

const small = (color) => ({ border: `1px solid ${color}55`, background: `${color}14`, color, borderRadius: 7, padding: '3px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' })

export function Positions({ s, view, market, onAction }) {
  const longs = Object.entries(view?.portfolio || {}).sort(([, a], [, b]) => b.market_value - a.market_value)
  const shorts = Object.entries(view?.shorts || {})
  const total = view?.total_value || 1
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Table empty={!longs.length && !shorts.length} emptyText={s.noPositions} head={<>
        <th style={th}>{s.cols.symbol}</th><th style={thr}>{s.cols.shares}</th><th style={thr}>{s.cols.avgCost}</th><th style={thr}>{s.cols.price}</th>
        <th style={thr}>{s.cols.value}</th><th style={thr}>{s.cols.today}</th><th style={thr}>{s.cols.pl}</th><th style={th} />
      </>}>
        {longs.map(([sym, p]) => (
          <tr key={sym}>
            <td style={td}><StockLink market={market} code={sym} name={p.name} title={s.search.viewChart}><b style={{ color: ACCENT }}>{sym}</b> <span style={{ color: MUTED, fontSize: 12 }}>{p.name}</span></StockLink>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(p.market_value / total * 100, 1)}%{p.available_shares < p.shares ? ` · ${s.available(p.available_shares)}` : ''}</div></td>
            <td style={num}>{p.shares}</td><td style={num}>{money(p.avg_cost, market)}</td><td style={num}>{money(p.current_price, market)}</td>
            <td style={num}>{money(p.market_value, market, 0)}</td>
            <td style={{ ...num, color: plColor(p.day_change, market) }}>{signed(p.day_change, market, 0)}</td>
            <td style={{ ...num, color: plColor(p.profit_loss, market) }}>{signed(p.profit_loss, market, 0)}<div style={{ fontSize: 11 }}>{pct(p.profit_loss_pct)}</div></td>
            <td style={{ ...td, textAlign: 'right' }}>
              <button style={small(DOWN)} disabled={!p.available_shares} onClick={() => onAction({ side: 'sell', symbol: sym, shares: p.available_shares })}>{s.sellAction}</button>
            </td>
          </tr>
        ))}
      </Table>
      {shorts.length > 0 && (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, margin: '0 0 6px' }}>{s.shortsTitle}</div>
          <Table head={<>
            <th style={th}>{s.cols.symbol}</th><th style={thr}>{s.cols.shares}</th><th style={thr}>{s.cols.avgCost}</th><th style={thr}>{s.cols.price}</th>
            <th style={thr}>{s.cols.value}</th><th style={thr}>{s.cols.pl}</th><th style={th} />
          </>}>
            {shorts.map(([sym, p]) => (
              <tr key={sym}>
                <td style={td}><StockLink market={market} code={sym} name={p.name} title={s.search.viewChart}><b style={{ color: '#f59e0b' }}>{sym}</b> <span style={{ color: MUTED, fontSize: 12 }}>{p.name}</span></StockLink></td>
                <td style={num}>-{p.shares}</td><td style={num}>{money(p.avg_price, market)}</td><td style={num}>{money(p.current_price, market)}</td>
                <td style={num}>{money(-p.market_value, market, 0)}</td>
                <td style={{ ...num, color: plColor(p.profit_loss, market) }}>{signed(p.profit_loss, market, 0)}<div style={{ fontSize: 11 }}>{pct(p.profit_loss_pct)}</div></td>
                <td style={{ ...td, textAlign: 'right' }}><button style={small('#6366f1')} onClick={() => onAction({ side: 'cover', symbol: sym, shares: p.shares })}>{s.coverAction}</button></td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </div>
  )
}

const terms = (o, s, market) => [
  o.limit_price ? `${s.limitPrice} ${money(o.limit_price, market)}` : null,
  o.stop_price && o.type !== 'trailing_stop' ? `${s.stopPrice} ${money(o.stop_price, market)}` : null,
  o.type === 'trailing_stop' ? `${o.trail_pct}% · ${s.stopPrice} ${money(o.stop_price, market)}` : null,
  o.status === 'filled' && o.filled_price ? `@ ${money(o.filled_price, market)}` : null,
  o.reason || null,
].filter(Boolean).join(' · ') || '—'

export function Orders({ s, view, market, lang, onCancel }) {
  const orders = view?.orders || []
  const color = { open: ACCENT, filled: UP, cancelled: MUTED, expired: MUTED, rejected: DOWN }
  const when = (iso) => (iso ? new Date(iso).toLocaleString({ zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' }[lang] || 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
  return (
    <Table empty={!orders.length} emptyText={s.noOrders} head={<>
      <th style={th}>{s.cols.time}</th><th style={th}>{s.cols.side}</th><th style={th}>{s.cols.symbol}</th><th style={thr}>{s.cols.shares}</th>
      <th style={th}>{s.cols.type}</th><th style={th}>{s.cols.detail}</th><th style={th}>{s.cols.status}</th><th style={th} />
    </>}>
      {orders.map((o) => (
        <tr key={o.id} style={{ opacity: o.status === 'open' ? 1 : 0.65 }}>
          <td style={td}>{when(o.created_at)}</td>
          <td style={{ ...td, fontWeight: 700 }}>{s.side[o.side]}</td>
          <td style={td}><StockLink market={market} code={o.symbol} title={s.search.viewChart}><b>{o.symbol}</b></StockLink></td>
          <td style={num}>{o.shares}</td>
          <td style={td}>{s.type[o.type]}{o.type !== 'market' ? ` · ${o.tif === 'gtc' ? 'GTC' : s.tif.day}` : ''}</td>
          <td style={{ ...td, whiteSpace: 'normal', minWidth: 160, color: MUTED, fontSize: 12 }}>{terms(o, s, market)}</td>
          <td style={{ ...td, color: color[o.status], fontWeight: 700 }}>{s.status[o.status] || o.status}</td>
          <td style={{ ...td, textAlign: 'right' }}>{o.status === 'open' && <button style={small(DOWN)} onClick={() => onCancel(o)}>{s.cancel}</button>}</td>
        </tr>
      ))}
    </Table>
  )
}

export function History({ s, view, market, filename }) {
  const [side, setSide] = useState('all')
  const all = [...(view?.transactions || [])].reverse()
  const rows = side === 'all' ? all : side === 'corp' ? all.filter((t) => s.corp?.[t.type]) : all.filter((t) => t.type === side)
  const exportCsv = () => {
    const head = ['date', 'time', 'side', 'symbol', 'name', 'shares', 'price', 'amount', 'fee', 'profit_loss']
    const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
    const csv = [head.join(','), ...all.map((t) => [t.date, t.time, t.type, t.symbol, t.name, t.shares, t.price, t.amount, t.commission, t.profit_loss].map(esc).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'buy', 'sell', ...(view?.short_ok ? ['short', 'cover'] : []), ...(all.some((t) => s.corp?.[t.type]) ? ['corp'] : [])].map((k) => (
          <button key={k} onClick={() => setSide(k)} style={{ ...small(side === k ? ACCENT : 'var(--text-muted)'), fontWeight: side === k ? 700 : 500 }}>
            {k === 'all' ? s.all : k === 'corp' ? Object.values(s.corp).slice(0, 2).join(' / ') : s.side[k]}
          </button>
        ))}
        <button onClick={exportCsv} disabled={!all.length} style={{ ...small(ACCENT), marginLeft: 'auto' }}>{s.exportCsv}</button>
      </div>
      <Table empty={!rows.length} emptyText={s.noHistory} head={<>
        <th style={th}>{s.cols.date}</th><th style={th}>{s.cols.side}</th><th style={th}>{s.cols.symbol}</th><th style={thr}>{s.cols.shares}</th>
        <th style={thr}>{s.cols.price}</th><th style={thr}>{s.cols.amount}</th><th style={thr}>{s.cols.fee}</th><th style={thr}>{s.cols.pl}</th>
      </>}>
        {rows.slice(0, 100).map((t, i) => {
          const corp = s.corp?.[t.type]
          if (corp) {
            // Dividend: price is cash per share, amount received (or paid on a short); split / bonus: share change
            return (
              <tr key={i}>
                <td style={td}>{t.date}{t.time ? ` ${t.time}` : ''}</td>
                <td style={{ ...td, fontWeight: 700, color: ACCENT }}>{corp}</td>
                <td style={td}><StockLink market={market} code={t.symbol} name={t.name} title={s.search.viewChart}><b>{t.symbol}</b> <span style={{ color: MUTED, fontSize: 12 }}>{t.name}</span></StockLink></td>
                <td style={num}>{t.type === 'dividend' ? Math.abs(t.shares) : `${t.shares > 0 ? '+' : ''}${t.shares}`}</td>
                <td style={num}>{t.type === 'dividend' ? money(t.price, market) : t.ratio || '—'}</td>
                <td style={{ ...num, color: plColor(t.amount, market) }}>{t.amount ? signed(t.amount, market) : '—'}</td>
                <td style={num}>—</td><td style={num}>—</td>
              </tr>
            )
          }
          return (
            <tr key={i}>
              <td style={td}>{t.date}{t.time ? ` ${t.time}` : ''}</td>
              <td style={{ ...td, fontWeight: 700, color: t.type === 'buy' || t.type === 'cover' ? UP : DOWN }}>{s.side[t.type] || t.type}</td>
              <td style={td}><StockLink market={market} code={t.symbol} name={t.name} title={s.search.viewChart}><b>{t.symbol}</b> <span style={{ color: MUTED, fontSize: 12 }}>{t.name}</span></StockLink></td>
              <td style={num}>{t.shares}</td><td style={num}>{money(t.price, market)}</td><td style={num}>{money(t.amount, market, 0)}</td>
              <td style={num}>{money(t.commission, market)}</td>
              <td style={{ ...num, color: plColor(t.profit_loss, market) }}>{t.profit_loss != null ? signed(t.profit_loss, market, 0) : '—'}</td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}

export function Leaderboard({ s, rows, market }) {
  return (
    <Table empty={!rows?.length} emptyText={rows ? s.lbEmpty : '…'} head={<>
      <th style={th}>#</th><th style={th}>{s.cols.trader}</th><th style={thr}>{s.cols.ret}</th><th style={thr}>{s.cols.value}</th>
    </>}>
      {(rows || []).map((r) => (
        <tr key={r.rank} style={r.is_me ? { background: 'rgba(14,165,233,0.08)' } : undefined}>
          <td style={{ ...td, fontWeight: 800, color: r.rank <= 3 ? '#f59e0b' : MUTED }}>{r.rank}</td>
          <td style={{ ...td, fontWeight: r.is_me ? 800 : 500 }}>{r.nickname}{r.is_me ? s.you : ''}</td>
          <td style={{ ...num, color: plColor(r.return_pct, market), fontWeight: 700 }}>{pct(r.return_pct)}</td>
          <td style={num}>{money(r.total_value, market, 0)}</td>
        </tr>
      ))}
    </Table>
  )
}
