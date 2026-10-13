import { useEffect, useMemo, useState } from 'react'
import useSymbolSuggest from '../../hooks/useSymbolSuggest'
import { CUR } from '../../utils/markets'
import { BDR, MUTED, UP, DOWN, ACCENT, Card, Seg, Field, inputStyle, Button, fmt, money, estFee } from './ui'

const SIDE_COLOR = { buy: UP, sell: DOWN, short: '#f59e0b', cover: '#6366f1' }
const PH = { us: 'AAPL / Apple', cn: '600519 / 茅台', hk: '00700 / 腾讯', jp: '7203 / Toyota' }
const CODE_OK = { us: /^[A-Z0-9.\-]{1,10}$/i, cn: /^\d{6}$/, hk: /^\d{1,5}$/, jp: /^(\d{4}|\d{3}[A-Z])$/ }

function useQuote(symbol, market) {
  const [q, setQ] = useState(null)
  useEffect(() => {
    const s = (symbol || '').trim().toUpperCase()
    setQ(null)
    if (!s || !CODE_OK[market].test(s)) return undefined
    let alive = true
    const id = setTimeout(() => {
      fetch(market === 'cn' ? `/api/stocks/${s}/realtime` : `/api/${market}/stock/${encodeURIComponent(s)}/realtime`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive) return
          if (!d?.price) { setQ({ missing: true }); return }
          const chg = d.change_pct ?? d.pct_change
          setQ({ price: Number(d.price), name: d.name || s, chg, lot: market === 'hk' ? (d.lot_size || 100) : market === 'us' ? 1 : 100 })
        })
        .catch(() => alive && setQ({ missing: true }))
    }, 300)
    return () => { alive = false; clearTimeout(id) }
  }, [symbol, market])
  return q
}

const fmtTime = (iso, lang) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString({ zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' }[lang] || 'en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * The order form. `view` is the portfolio being traded (a market account or a competition), `prefill`
 * comes from a position's Sell / Cover button or a stock page link.
 */
export default function OrderTicket({ s, lang, market, view, accountKey, gameId, prefill, onDone }) {
  const [side, setSide] = useState('buy')
  const [symbol, setSymbol] = useState('')
  const [shares, setShares] = useState(market === 'us' ? 1 : 100)
  const [type, setType] = useState('market')
  const [limitPrice, setLimit] = useState('')
  const [stopPrice, setStop] = useState('')
  const [trail, setTrail] = useState('5')
  const [tif, setTif] = useState('day')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [suggestOpen, setSuggestOpen] = useState(false)

  // New portfolio: start clean
  useEffect(() => { setSide('buy'); setSymbol(''); setShares(market === 'us' ? 1 : 100); setType('market'); setMsg(null) }, [market, gameId])
  useEffect(() => {
    if (!prefill) return
    setSymbol(prefill.symbol || '')
    if (prefill.side) setSide(prefill.side)
    if (prefill.shares) setShares(prefill.shares)
    setType('market'); setMsg(null)
  }, [prefill])

  const q = useQuote(symbol, market)
  const suggestions = useSymbolSuggest(suggestOpen ? symbol : '', market)
  const showSuggest = suggestOpen && suggestions.length > 0 && !(q?.price && suggestions.some((x) => x.symbol === symbol.trim().toUpperCase()))
  const lot = q?.lot || (market === 'us' ? 1 : 100)
  const shortOk = !!view?.short_ok
  useEffect(() => { if (market !== 'us' && q?.lot) setShares((n) => Math.max(q.lot, Math.round(n / q.lot) * q.lot)) }, [q?.lot, market])
  useEffect(() => { if (type === 'trailing_stop' && (side === 'buy' || side === 'short')) setType('stop') }, [side, type])

  const sym = symbol.trim().toUpperCase()
  const held = side === 'sell' ? view?.portfolio?.[sym] : side === 'cover' ? view?.shorts?.[sym] : null
  const basis = type === 'limit' || type === 'stop_limit' ? Number(limitPrice) : type === 'stop' ? Number(stopPrice) : q?.price
  const amount = basis > 0 ? basis * shares : 0
  const fee = estFee(market, side, amount, shares)
  const bp = view?.buying_power ?? 0
  const bpAfter = side === 'buy' ? bp - amount - fee : side === 'short' ? bp - amount * 0.5 : side === 'sell' ? bp + amount - fee : bp + amount * 0.5 - fee
  const maxShares = useMemo(() => {
    if (side === 'sell') return held?.available_shares ?? 0
    if (side === 'cover') return held?.shares ?? 0
    if (!(basis > 0)) return 0
    const per = side === 'short' ? basis * 0.5 : basis * (1 + (market === 'cn' ? 0.0003 : market === 'hk' ? 0.0011 : 0))
    const n = Math.floor(bp / per)
    return market === 'us' ? n : Math.floor(n / lot) * lot
  }, [side, held, basis, bp, market, lot])

  const needLimit = type === 'limit' || type === 'stop_limit'
  const needStop = type === 'stop' || type === 'stop_limit'
  const valid = q?.price && shares > 0 && (!needLimit || Number(limitPrice) > 0) && (!needStop || Number(stopPrice) > 0)
    && (type !== 'trailing_stop' || (Number(trail) >= 0.5 && Number(trail) <= 50))
    && (side === 'buy' || side === 'short' ? bpAfter >= 0 : shares <= maxShares)
  const sess = view?.session

  const submit = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/paper/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: accountKey, market, symbol: sym, shares: Number(shares), side, type, tif, lang, game_id: gameId || null,
          limit_price: needLimit ? Number(limitPrice) : null, stop_price: needStop ? Number(stopPrice) : null,
          trail_pct: type === 'trailing_stop' ? Number(trail) : null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : 'Error')
      setMsg({ ok: true, text: d.message })
      onDone?.(d)
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  const sides = [{ value: 'buy', label: s.side.buy, color: UP }, { value: 'sell', label: s.side.sell, color: DOWN }]
  if (shortOk) sides.push({ value: 'short', label: s.side.short, color: SIDE_COLOR.short }, { value: 'cover', label: s.side.cover, color: SIDE_COLOR.cover })
  const types = ['market', 'limit', 'stop', 'stop_limit', ...(side === 'sell' || side === 'cover' ? ['trailing_stop'] : [])]

  return (
    <Card style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Seg value={side} onChange={setSide} options={sides} size="sm" />
        {sess && (
          <span title={s.hoursNote} style={{ fontSize: 11.5, fontWeight: 650, color: sess.open ? UP : MUTED, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: sess.open ? UP : 'var(--text-muted)' }} />
            {sess.open ? s.open : s.closed}
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>· {sess.open ? s.closesAt(fmtTime(sess.closes_at, lang)) : s.opensAt(fmtTime(sess.next_open, lang))}</span>
          </span>
        )}
      </div>

      <Field label={s.symbol}>
        <div style={{ position: 'relative' }}>
          <input value={symbol} onChange={(e) => { setSymbol(e.target.value.trim().toUpperCase()); setSuggestOpen(true) }}
            onFocus={() => setSuggestOpen(true)} onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            placeholder={PH[market]} autoComplete="off" style={{ ...inputStyle, fontWeight: 700 }} id="pt-order-symbol" />
          {showSuggest && (
            <div role="listbox" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 30, background: 'var(--bg-secondary)', border: `1px solid ${BDR}`, borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,.28)', overflow: 'hidden' }}>
              {suggestions.map((x) => (
                <div key={x.symbol} role="option" onMouseDown={(e) => { e.preventDefault(); setSymbol(x.symbol); setSuggestOpen(false) }}
                  style={{ display: 'flex', gap: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12.5 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                  <b style={{ minWidth: 56, fontFamily: 'var(--mono, monospace)' }}>{x.symbol}</b>
                  <span style={{ flex: 1, minWidth: 0, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'zh' && x.nameZh ? x.nameZh : x.name}</span>
                  {x.price != null && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{CUR[market]}{fmt(x.price)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ minHeight: 18, fontSize: 12.5 }}>
          {q?.price ? <span><b>{q.name}</b> <span style={{ color: MUTED }}>· {money(q.price, market)}</span>
            {q.chg != null && <span style={{ color: (q.chg >= 0) === (market !== 'cn') ? UP : DOWN, marginLeft: 6 }}>{q.chg > 0 ? '+' : ''}{Number(q.chg).toFixed(2)}%</span>}</span>
            : q?.missing ? <span style={{ color: DOWN }}>—</span> : null}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <Field label={s.shares} hint={market !== 'us' ? s.lot(lot) : null}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" min={market === 'us' ? 1 : lot} step={market === 'us' ? 1 : lot} value={shares}
              onChange={(e) => setShares(Math.max(0, Math.floor(Number(e.target.value) || 0)))} style={inputStyle} aria-label={s.shares} />
            <button type="button" onClick={() => maxShares > 0 && setShares(maxShares)} disabled={!(maxShares > 0)}
              style={{ ...inputStyle, width: 'auto', padding: '0 10px', cursor: 'pointer', fontSize: 12, color: ACCENT, fontWeight: 700, whiteSpace: 'nowrap', flex: 'none' }}>
              {side === 'sell' || side === 'cover' ? s.all : s.max}
            </button>
          </div>
        </Field>
        <Field label={s.orderType}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle} aria-label={s.orderType}>
            {types.map((t) => <option key={t} value={t}>{s.type[t]}</option>)}
          </select>
        </Field>
        {needStop && (
          <Field label={s.stopPrice}>
            <input type="number" step="0.01" min="0" value={stopPrice} onChange={(e) => setStop(e.target.value)} style={inputStyle}
              placeholder={q?.price ? fmt(q.price) : ''} aria-label={s.stopPrice} />
          </Field>
        )}
        {needLimit && (
          <Field label={s.limitPrice}>
            <input type="number" step="0.01" min="0" value={limitPrice} onChange={(e) => setLimit(e.target.value)} style={inputStyle}
              placeholder={q?.price ? fmt(q.price) : ''} aria-label={s.limitPrice} />
          </Field>
        )}
        {type === 'trailing_stop' && (
          <Field label={s.trailPct}>
            <input type="number" step="0.5" min="0.5" max="50" value={trail} onChange={(e) => setTrail(e.target.value)} style={inputStyle} aria-label={s.trailPct} />
          </Field>
        )}
        {type !== 'market' && (
          <Field label={s.duration}>
            <select value={tif} onChange={(e) => setTif(e.target.value)} style={inputStyle} aria-label={s.duration}>
              <option value="day">{s.tif.day}</option>
              <option value="gtc">{s.tif.gtc}</option>
            </select>
          </Field>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: MUTED, background: 'var(--bg-tertiary)', borderRadius: 10, padding: '9px 12px' }}>
        {side === 'short' ? s.help.short : s.help[type]}
      </p>

      {amount > 0 && (
        <div style={{ display: 'grid', gap: 5, fontSize: 13 }}>
          {[[side === 'sell' || side === 'short' ? s.estProceeds : s.estCost, money(side === 'sell' || side === 'short' ? amount - fee : amount + fee, market)],
            [s.estFees, money(fee, market)],
            ...(side === 'short' ? [[s.marginNeed, money(amount * 0.5, market)]] : []),
            [s.bpAfter, money(bpAfter, market, 0)]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: MUTED }}>{k}</span>
              <b style={{ fontVariantNumeric: 'tabular-nums', color: k === s.bpAfter && bpAfter < 0 ? DOWN : undefined }}>{v}</b>
            </div>
          ))}
        </div>
      )}

      {sess && !sess.open && <div style={{ fontSize: 12, color: '#f59e0b', lineHeight: 1.55 }}>{s.closedHint}</div>}

      <Button onClick={submit} disabled={!valid || busy} color={SIDE_COLOR[side]} style={{ width: '100%', padding: '11px 0', fontSize: 14.5 }}>
        {busy ? s.submitting : s.submit(s.side[side], s.type[type])}
      </Button>
      {msg && <div role="status" style={{ fontSize: 12.5, color: msg.ok ? UP : DOWN, lineHeight: 1.5 }}>{msg.text}</div>}
    </Card>
  )
}
