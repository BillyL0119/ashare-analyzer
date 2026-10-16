import { useCallback, useEffect, useMemo, useState } from 'react'
import useLangStore from '../../store/langStore'
import PaperPerformance from '../PaperPerformance'
import useSymbolSuggest from '../../hooks/useSymbolSuggest'
import { useT } from '../i18n'
import { num, pct } from '../data'
import { changeColor, chipLabel } from '../helpers'
import { CUR } from '../../utils/markets'
import { Icon } from '../icons'
import { ErrorBox, Pill, Section, Segment, Skeleton } from '../ui'
import { estFee } from '../../components/paper/ui'
import { newDeviceId } from '../../utils/deviceId'
import LineIcon from '../../components/Icon'

function deviceId() {
  let id = localStorage.getItem('bfs_device_id')
  if (!id) { id = newDeviceId(); localStorage.setItem('bfs_device_id', id) }
  return id
}

async function post(path, body) {
  const res = await fetch('/api/paper' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id: deviceId(), ...body }) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'error')
  return data
}

const money = (v, cur) => `${cur}${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Sheet({ onClose, children }) {
  return (
    <div className="m-sheet-back" onClick={onClose}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"><div className="m-grabber" />{children}</div>
    </div>
  )
}

const PICKS = {
  us: [['AAPL', 'Apple'], ['NVDA', 'NVIDIA'], ['MSFT', 'Microsoft'], ['TSLA', 'Tesla'], ['SPY', 'S&P 500 ETF'], ['QQQ', 'Nasdaq 100 ETF']],
  cn: [['600519', '贵州茅台'], ['300750', '宁德时代'], ['601318', '中国平安'], ['000858', '五粮液'], ['600036', '招商银行'], ['510300', '沪深300ETF']],
  hk: [['00700', '腾讯'], ['09988', '阿里巴巴'], ['03690', '美团'], ['01810', '小米'], ['00005', '汇丰'], ['02800', '盈富基金']],
  jp: [['7203', '丰田'], ['6758', '索尼'], ['7974', '任天堂'], ['9984', '软银'], ['8306', '三菱日联'], ['1321', '日经ETF']],
}
const CODE_LABEL = { us: '美股 · 股票代码', cn: 'A股 · 股票代码', hk: '港股 · 股票代码', jp: '日股 · 股票代码' }
const PLACEHOLDER = { us: '代码或公司名，如 AAPL、苹果', cn: '代码或名称，如 600519、茅台', hk: '代码或名称，如 00700、腾讯', jp: '代码或名称，如 7203、丰田' }
const ACCOUNT_LABEL = { us: '美股账户', cn: 'A股账户', hk: '港股账户', jp: '日股账户' }

/** Live quote for the code being typed, so the order shows what it buys and roughly what it costs. */
function useQuote(symbol, market) {
  const [q, setQ] = useState(null)   // null = nothing to show, {name, price} or {missing: true}
  useEffect(() => {
    const sym = symbol.trim().toUpperCase()
    const ok = { us: /^[A-Z0-9.\-]{1,10}$/, cn: /^\d{6}$/, hk: /^\d{1,5}$/, jp: /^(\d{4}|\d{3}[A-Z])$/ }[market]
    if (!sym || !ok.test(sym)) { setQ(null); return }
    let alive = true
    const id = setTimeout(() => {
      fetch(market === 'cn' ? `/api/stocks/${sym}/realtime` : `/api/${market}/stock/${encodeURIComponent(sym)}/realtime`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive) setQ(d?.price ? { name: d.name || sym, price: Number(d.price), lot: d.lot_size } : { missing: true }) })
        .catch(() => { if (alive) setQ({ missing: true }) })
    }, 350)
    return () => { alive = false; clearTimeout(id) }
  }, [symbol, market])
  return q
}

const SIDE_LABEL = { buy: '买入', sell: '卖出', short: '卖空', cover: '买入平仓' }
const SIDE_BADGE = { buy: '买', sell: '卖', short: '空', cover: '平' }
const SIDE_TINT = { buy: 'var(--accent)', sell: '#F28B3C', short: '#7c9cb4', cover: '#7c9cb4' }
const TYPE_LABEL = { market: '市价单', limit: '限价单', stop: '止损单', stop_limit: '止损限价单', trailing_stop: '追踪止损' }
const TYPE_HELP = {
  market: '市价单按当前价格立即成交（休市时排队到开盘）。', limit: '限价单只在达到你设定的价格或更好时成交。',
  stop: '止损单在价格到达触发价后按市价成交，常用来止损。', stop_limit: '止损限价单在价格到达触发价后变成限价单，急跌时可能成交不了。',
  trailing_stop: '追踪止损的触发价跟着最高价按百分比上移，价格回落这么多就卖出，用来锁住利润。',
}
const STATUS_LABEL = { open: '未成交', filled: '已成交', cancelled: '已撤销', expired: '已过期', rejected: '被拒' }
const STATUS_COLOR = { open: 'var(--accent)', filled: '#22C55E', cancelled: 'var(--text-3)', expired: 'var(--text-3)', rejected: '#ef4444' }
const SHORT_MARGIN = 0.5   // extra margin the server holds on a short, as a share of its value

function Row({ k, v, color, strong }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span className="m-muted">{k}</span><span className="m-num" style={{ fontWeight: strong ? 750 : 600, color }}>{v}</span></div>
}

function PriceInput({ label, value, onChange, cur }) {
  return (
    <label style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}>
      <span className="m-label" style={{ fontWeight: 650 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-hi)', borderRadius: 12, padding: '10px 12px' }}>
        {cur && <span className="m-muted">{cur}</span>}
        <input className="m-num" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
          style={{ flex: 1, minWidth: 0, width: 0, background: 'none', border: 0, outline: 0, fontSize: 17, fontWeight: 600 }} />
      </span>
    </label>
  )
}

function TradeSheet({ market, view, init, gameId, onClose, onDone }) {
  const t = useT()
  const lang = useLangStore((st) => st.lang)
  const cur = CUR[market]
  const shortOk = !!view?.short_ok
  const [side, setSide] = useState(init?.side || 'buy')
  const [symbol, setSymbol] = useState(init?.symbol || '')
  const [type0, setType] = useState('market')
  const [tif, setTif] = useState('day')
  const [limit0, setLimit] = useState(null); const [stop0, setStop] = useState(null); const [trail, setTrail] = useState('5')
  const opening = side === 'buy' || side === 'short'
  const type = type0 === 'trailing_stop' && opening ? 'market' : type0   // trailing stops only protect an open position
  const sym = symbol.trim().toUpperCase()
  const held = side === 'sell' ? view?.portfolio?.[sym] : side === 'cover' ? view?.shorts?.[sym] : null
  const holdings = Object.keys((side === 'sell' ? view?.portfolio : side === 'cover' ? view?.shorts : null) || {})
  const quote = useQuote(opening ? symbol : '', market)
  const price = held ? held.current_price : quote?.price
  // Size step: 1 share for US; the board lot (100 for A-shares and Japan, per-stock for HK) when buying elsewhere
  const step = market === 'us' || side !== 'buy' ? 1 : market === 'hk' ? (quote?.lot || 100) : 100
  const bp = view?.buying_power ?? 0
  const max = side === 'sell' ? held?.available_shares ?? 0 : side === 'cover' ? held?.shares ?? 0
    : !price ? 0 : side === 'short' ? Math.floor(bp / (price * SHORT_MARGIN)) : Math.floor(bp / (price * 1.002) / step) * step
  const [shares, setShares] = useState(init?.shares || step)
  useEffect(() => { if (side === 'buy' && market !== 'us') setShares((n) => Math.max(step, Math.round(n / step) * step)) }, [step, side, market])
  // Untouched price boxes show the live price, so a limit or stop order starts from a sensible number
  const live = price ? String(+price.toFixed(2)) : ''
  const limit = limit0 ?? live, stop = stop0 ?? live
  const norm = (n) => { const c = Math.max(Number.isFinite(n) ? n : step, step); return side === 'buy' && market !== 'us' ? Math.max(step, Math.floor(c / step) * step) : c }
  const quick = max >= step ? [...new Set([0.25, 0.5, 0.75, 1].map((f) => (f === 1 ? max : Math.max(step, Math.floor((max * f) / step) * step))))] : []

  const suggestions = useSymbolSuggest(opening ? symbol : '', market)
  const exact = suggestions.some((x) => x.symbol === sym)
  const showSuggest = opening && suggestions.length > 0 && !(quote?.price && exact)

  const lim = parseFloat(limit), stp = parseFloat(stop), tr = parseFloat(trail)
  const needLimit = type === 'limit' || type === 'stop_limit'
  const needStop = type === 'stop' || type === 'stop_limit'
  const pricesOk = (!needLimit || lim > 0) && (!needStop || stp > 0) && (type !== 'trailing_stop' || (tr >= 0.5 && tr <= 50))
  const px = !price ? null : type === 'limit' || type === 'stop_limit' ? lim : type === 'stop' ? stp
    : type === 'trailing_stop' ? price * (side === 'sell' ? 1 - tr / 100 : 1 + tr / 100) : price
  const amount = px > 0 ? px * shares : null
  const fee = amount ? estFee(market, side, amount, shares) : 0
  const need = amount == null ? null : side === 'buy' ? amount + fee : side === 'short' ? amount * SHORT_MARGIN : null
  const overBp = need != null && need > bp
  const pl = amount == null || !held ? null : side === 'sell' ? amount - fee - held.avg_cost * shares : (held.avg_price - px) * shares - fee
  const lotOk = side !== 'buy' || market === 'us' || shares % step === 0
  const valid = !!sym && !!price && shares > 0 && lotOk && pricesOk && !overBp && (opening || shares <= max)
  const closed = view?.session && !view.session.open
  const tint = SIDE_TINT[side]
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')

  const go = async () => {
    setBusy(true); setErr('')
    try {
      const r = await post('/order', {
        symbol: sym, shares, market, side, type, tif, lang, game_id: gameId || null,
        limit_price: needLimit ? lim : null, stop_price: needStop ? stp : null, trail_pct: type === 'trailing_stop' ? tr : null,
      })
      onDone(r.message || t('提交委托'))
    } catch (e) { setErr(e.message); setBusy(false) }
  }
  const sides = ['buy', 'sell', ...(shortOk ? ['short', 'cover'] : [])]
  const types = ['market', 'limit', 'stop', 'stop_limit', ...(opening ? [] : ['trailing_stop'])]

  return (
    <Sheet onClose={onClose}>
      <div className="m-stack" style={{ gap: 14 }}>
        <Segment full value={side} onChange={(v) => { setSide(v); setErr(''); if ((v === 'sell' || v === 'cover') !== !opening) setShares(1) }} options={sides.map((v) => ({ value: v, label: t(SIDE_LABEL[v]) }))} />
        {opening ? (
          <div className="m-card">
            <div className="m-label" style={{ marginBottom: 8 }}>{t(CODE_LABEL[market])}</div>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder={t(PLACEHOLDER[market])} autoCapitalize="characters" autoCorrect="off" autoComplete="off" enterKeyHint="search"
              style={{ width: '100%', minWidth: 0, background: 'none', border: 0, outline: 0, fontSize: symbol ? 26 : 17, fontWeight: symbol ? 800 : 500, fontFamily: 'inherit' }} />
            <div style={{ minHeight: 18, fontSize: 13, marginTop: 4 }}>
              {quote?.price ? <span><b>{quote.name}</b> <span className="m-muted m-num">· {money(quote.price, cur)}</span></span>
                : quote?.missing && !showSuggest ? <span style={{ color: '#ef4444' }}>{t('没有找到这只股票')}</span> : null}
            </div>
            {showSuggest && (
              <div style={{ margin: '8px -16px -4px', width: 'calc(100% + 32px)' }}>
                {suggestions.map((x) => (
                  <button key={x.symbol} className="m-row" onClick={() => setSymbol(x.symbol)} style={{ padding: '10px 16px' }}>
                    <span className="m-num" style={{ fontWeight: 600, minWidth: 64, fontFamily: 'var(--sans)' }}>{x.symbol}</span>
                    <span className="m-grow m-muted" style={{ fontSize: 13, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lang === 'zh' && x.nameZh ? x.nameZh : x.name}</span>
                    {x.price != null && <span className="m-num" style={{ fontSize: 13 }}>{money(x.price, cur)}</span>}
                  </button>
                ))}
              </div>
            )}
            {!symbol.trim() && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {PICKS[market].map(([code, label]) => (
                  <button key={code} onClick={() => setSymbol(code)} style={{ padding: '6px 11px', borderRadius: 'var(--radius)', background: 'var(--surface-hi)', fontSize: 13, fontWeight: 600 }}>
                    {market === 'us' || (market !== 'cn' && lang !== 'zh') ? code : label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : held ? (
          <div className="m-card" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setSymbol('')} style={{ fontSize: 18, fontWeight: 600 }}>{sym} <span className="m-muted" style={{ fontSize: 13, fontWeight: 500 }}>{held.name}</span></button>
              <Pill value={held.profit_loss_pct} market={market} />
            </div>
            <div className="m-tiles">
              {[[t('现价'), money(held.current_price, cur)], [t('成本'), money(side === 'sell' ? held.avg_cost : held.avg_price, cur)],
                [side === 'sell' ? t('可卖/持有') : t('持仓'), side === 'sell' ? `${held.available_shares}/${held.shares}` : `-${held.shares}`]].map(([k, v]) => (
                <div key={k} className="m-tile"><div className="m-label">{k}</div><div className="m-num" style={{ fontWeight: 600, fontSize: 13.5, marginTop: 3 }}>{v}</div></div>))}
            </div>
            {side === 'sell' && held.available_shares < held.shares && (market === 'cn' || market === 'us') && <div style={{ fontSize: 13, color: '#F28B3C' }}>{market === 'cn' ? t('T+1：今日买入部分明日可卖') : t('T+2：部分持仓尚未结算')}</div>}
          </div>
        ) : (
          <div className="m-card" style={{ display: 'grid', gap: 10 }}>
            <div className="m-label" style={{ fontWeight: 650 }}>{t('选择持仓')}</div>
            {holdings.length ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {holdings.map((s) => <button key={s} onClick={() => setSymbol(s)} className="m-num" style={{ padding: '7px 13px', borderRadius: 'var(--radius)', background: 'var(--surface-hi)', fontSize: 13, fontWeight: 600 }}>{s}</button>)}
              </div>
            ) : <div className="m-muted" style={{ fontSize: 14 }}>{t('暂无持仓')}</div>}
          </div>
        )}

        <div className="m-card" style={{ display: 'grid', gap: 12, minWidth: 0 }}>
          <div className="m-label" style={{ fontWeight: 650 }}>{t('订单类型')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {types.map((v) => (
              <button key={v} onClick={() => setType(v)} aria-pressed={type === v}
                style={{ flex: 'none', padding: '7px 12px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap', background: type === v ? tint : 'var(--surface-hi)', color: type === v ? '#fff' : 'var(--text)' }}>{t(TYPE_LABEL[v])}</button>
            ))}
          </div>
          {(needStop || needLimit || type === 'trailing_stop') && (
            <div style={{ display: 'flex', gap: 10 }}>
              {needStop && <PriceInput label={t('触发价')} value={stop} onChange={setStop} cur={cur} />}
              {needLimit && <PriceInput label={t('限价')} value={limit} onChange={setLimit} cur={cur} />}
              {type === 'trailing_stop' && <PriceInput label={t('回撤幅度 %')} value={trail} onChange={setTrail} />}
            </div>
          )}
          {type !== 'market' && <Segment full value={tif} onChange={setTif} options={[{ value: 'day', label: t('当日有效') }, { value: 'gtc', label: t('撤单前有效') }]} />}
          <div className="m-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{t(TYPE_HELP[type])}{side === 'short' ? ' ' + t('卖空是先借股票卖出，以后再买回来还。股价下跌就赚钱，上涨就亏钱，亏损没有上限。需要占用一半金额的保证金。') : ''}</div>
          {closed && type === 'market' && <div style={{ fontSize: 13, color: '#F28B3C' }}>{view.session.holiday ? t('今天是交易所假日，休市。市价单会在下一个交易日开盘后成交。') : t('休市中：市价单会在开盘后按开盘附近的价格成交。')}</div>}
        </div>

        <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div className="m-label" style={{ fontWeight: 650 }}>{side === 'buy' && market === 'hk' ? t('股数（每手 %lld 股）', step) : side === 'buy' && market !== 'us' ? t('股数（100 的整数倍）') : t('股数')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="m-iconbtn" style={{ width: 46, height: 46, flex: 'none' }} onClick={() => setShares(norm(shares - step))} disabled={shares <= step} aria-label={t('减少')}>−</button>
            <input className="m-num" inputMode="numeric" value={shares} onChange={(e) => setShares(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} onBlur={() => setShares(norm(shares))}
              style={{ flex: 1, minWidth: 0, width: 0, textAlign: 'center', background: 'none', border: 0, outline: 0, fontSize: 34, fontWeight: 600 }} />
            <button className="m-iconbtn" style={{ width: 46, height: 46, flex: 'none' }} onClick={() => setShares(norm(shares + step))} aria-label={t('增加')}>+</button>
          </div>
          {quick.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {quick.map((v) => <button key={v} onClick={() => setShares(v)} className="m-num" style={{ flex: 1, padding: '8px 0', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 13, background: shares === v ? tint : 'var(--surface-hi)', color: shares === v ? '#fff' : 'var(--text)' }}>
                {v === max ? (opening ? t('最多') : t('全部')) : `${Math.round((v / max) * 100)}%`}</button>)}
            </div>
          )}
        </div>

        {amount != null && (
          <div className="m-card" style={{ display: 'grid', gap: 10, fontSize: 14 }}>
            {side === 'buy' && <Row k={t('预计花费')} v={money(need, cur)} strong />}
            {side === 'short' && <><Row k={t('预计到账')} v={money(amount - fee, cur)} /><Row k={t('需要保证金')} v={money(need, cur)} strong /></>}
            {side === 'sell' && <Row k={t('预计到账')} v={money(amount - fee, cur)} strong />}
            {side === 'cover' && <Row k={t('预计花费')} v={money(amount + fee, cur)} strong />}
            {fee > 0.005 && <Row k={market === 'hk' ? t('印花税及交易所费用') : t('手续费')} v={money(fee, cur)} />}
            {pl != null && <Row k={t('预计盈亏')} v={(pl >= 0 ? '+' : '-') + money(Math.abs(pl), cur)} color={changeColor(pl, market)} />}
            {opening && <Row k={t('可用购买力')} v={money(bp, cur)} color={overBp ? '#ef4444' : undefined} />}
          </div>
        )}
        {err && <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{err}</div>}
        <button className="m-btn" disabled={!valid || busy} onClick={go} style={{ background: tint }}>
          {type === 'market' && side === 'buy' ? t('确认买入 %lld 股', shares) : type === 'market' && side === 'sell' ? t('确认卖出 %lld 股', shares) : `${t('提交委托')} · ${t(SIDE_LABEL[side])} ${shares}`}
        </button>
        <div className="m-footer">{t('仅供学习，不构成投资建议。实际成交价以服务器返回为准。')}</div>
      </div>
    </Sheet>
  )
}

const GAME_CASH = { us: [10_000, 100_000, 1_000_000], cn: [100_000, 1_000_000, 10_000_000], hk: [100_000, 1_000_000, 10_000_000], jp: [1_000_000, 10_000_000, 100_000_000] }
const isoIn = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }

function GameSheet({ nickname, onClose, onJoined }) {
  const t = useT()
  const [mode, setMode] = useState('join')
  const [code, setCode] = useState(''); const [name, setName] = useState('')
  const [gm, setGm] = useState('us'); const [cash, setCash] = useState(100_000)
  const [end, setEnd] = useState(isoIn(30)); const [short, setShort] = useState(false)
  const [nick, setNick] = useState(nickname && !/^用户#/.test(nickname) ? nickname : '')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const field = { width: '100%', minWidth: 0, background: 'var(--surface-hi)', border: 0, outline: 0, borderRadius: 12, padding: '11px 12px', fontSize: 15, color: 'var(--text)' }
  const submit = async () => {
    setBusy(true); setErr('')
    try {
      const r = mode === 'join' ? await post('/games/join', { code, nickname: nick || null })
        : await post('/games/create', { name, market: gm, start_cash: cash, end_date: end, allow_short: short, nickname: nick || null })
      onJoined(r.game)
    } catch (e) { setErr(e.message); setBusy(false) }
  }
  return (
    <Sheet onClose={onClose}>
      <div className="m-stack" style={{ gap: 14 }}>
        <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 17 }}>{t('比赛')}</div>
        <div className="m-muted" style={{ fontSize: 13, lineHeight: 1.55, textAlign: 'center' }}>{t('创建一场比赛，把邀请码发给同学，大家用同样的本金在同一个市场比收益。')}</div>
        <Segment full value={mode} onChange={setMode} options={[{ value: 'join', label: t('加入比赛') }, { value: 'create', label: t('创建比赛') }]} />
        <div className="m-card" style={{ display: 'grid', gap: 12 }}>
          {mode === 'join' ? (
            <label style={{ display: 'grid', gap: 6 }}><span className="m-label">{t('邀请码')}</span>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC123" autoCapitalize="characters" autoComplete="off"
                style={{ ...field, textAlign: 'center', letterSpacing: 6, fontWeight: 600, fontSize: 22, fontFamily: 'var(--sans)' }} /></label>
          ) : (<>
            <label style={{ display: 'grid', gap: 6 }}><span className="m-label">{t('比赛名称')}</span><input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} style={field} /></label>
            <Segment full value={gm} onChange={(m) => { setGm(m); setCash(GAME_CASH[m][1]); if (m !== 'us') setShort(false) }} options={['us', 'cn', 'hk', 'jp'].map((m) => ({ value: m, label: t(chipLabel(m)) }))} />
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}><span className="m-label">{t('每人本金')}</span>
                <select value={cash} onChange={(e) => setCash(Number(e.target.value))} style={field}>{GAME_CASH[gm].map((c) => <option key={c} value={c}>{CUR[gm]}{c.toLocaleString('en-US')}</option>)}</select></label>
              <label style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}><span className="m-label">{t('结束日期')}</span>
                <input type="date" value={end} min={isoIn(1)} max={isoIn(365)} onChange={(e) => setEnd(e.target.value)} style={field} /></label>
            </div>
            {gm === 'us' && <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={short} onChange={(e) => setShort(e.target.checked)} />{t('允许卖空（仅美股）')}</label>}
          </>)}
          <label style={{ display: 'grid', gap: 6 }}><span className="m-label">{t('你的昵称')}</span><input value={nick} onChange={(e) => setNick(e.target.value.slice(0, 16))} style={field} /></label>
        </div>
        {err && <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{err}</div>}
        <button className="m-btn" disabled={busy || (mode === 'join' ? code.length !== 6 : name.trim().length < 2)} onClick={submit}>{mode === 'join' ? t('加入比赛') : t('创建比赛')}</button>
        <button className="m-btn ghost" onClick={onClose}>{t('取消')}</button>
      </div>
    </Sheet>
  )
}

function Board({ market, onClose }) {
  const t = useT()
  const cur = CUR[market]
  const [rows, setRows] = useState(null); const [err, setErr] = useState(false)
  useEffect(() => { fetch(`/api/paper/leaderboard?device_id=${deviceId()}&market=${market}`).then((r) => r.json()).then(setRows).catch(() => setErr(true)) }, [market])
  const medal = ['#F5C542', '#B8C2D0', '#D98A4E']
  return (
    <Sheet onClose={onClose}>
      <div className="m-stack" style={{ gap: 16 }}>
        <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 17 }}>{t('收益排行榜')} · {t(chipLabel(market))}</div>
        {err ? <ErrorBox onRetry={() => { setErr(false); window.location.reload() }} /> : !rows ? <Skeleton h={180} r={20} /> : rows.length === 0 ? (
          <div className="m-muted" style={{ textAlign: 'center', fontSize: 14, padding: '24px 8px' }}>{t('还没有人在这个市场交易过，完成第一笔交易就能上榜')}</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              {[1, 0, 2].filter((i) => rows[i]).map((i) => {
                const r = rows[i]; const first = i === 0
                return (
                  <div key={i} className="m-card" style={{ flex: 1, textAlign: 'center', padding: first ? '20px 6px' : '14px 6px', borderColor: r.is_me ? 'var(--accent)' : `color-mix(in srgb, ${medal[i]} 40%, transparent)`, background: `color-mix(in srgb, ${medal[i]} 22%, var(--surface))` }}>
                    <div style={{ color: medal[i], fontWeight: 600, fontSize: first ? 30 : 24 }} className="m-num">{r.rank}</div>
                    <div style={{ fontSize: 13, fontWeight: 650, margin: '6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nickname}{r.is_me ? t('（我）') : ''}</div>
                    <Pill value={r.return_pct} market={market} minWidth={0} />
                  </div>
                )
              })}
            </div>
            <div className="m-card flush">
              {rows.slice(3).map((r) => (
                <div className="m-row" key={r.rank} style={r.is_me ? { background: 'color-mix(in srgb, var(--accent) 12%, transparent)' } : undefined}>
                  <span className="m-num m-muted" style={{ width: 24, fontWeight: 600 }}>{r.rank}</span>
                  <div className="m-grow"><div className="m-name">{r.nickname}</div><div className="m-sub m-num">{cur}{Math.round(r.total_value).toLocaleString()}</div></div>
                  <Pill value={r.return_pct} market={market} />
                </div>
              ))}
            </div>
          </>
        )}
        <button className="m-btn ghost" onClick={onClose}>{t('关闭')}</button>
      </div>
    </Sheet>
  )
}

function orderTerms(o, t, cur) {
  return [
    o.limit_price ? `${t('限价')} ${money(o.limit_price, cur)}` : null,
    o.stop_price ? `${t('触发价')} ${money(o.stop_price, cur)}${o.type === 'trailing_stop' ? ` (${o.trail_pct}%)` : ''}` : null,
    o.status === 'filled' && o.filled_price ? `@ ${money(o.filled_price, cur)}` : null,
    o.status === 'rejected' && o.reason ? o.reason : null,
  ].filter(Boolean).join(' · ')
}

function daysLeft(end) {
  const ms = new Date(end + 'T23:59:00+08:00') - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export default function Paper() {
  const t = useT()
  const lang = useLangStore((st) => st.lang)
  const [acc, setAcc] = useState(null); const [err, setErr] = useState(null)
  // /paper?buy=AAPL&market=us (a stock page's "Paper trade" button) opens the order sheet filled in
  const [prefill] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const sym = (q.get('buy') || '').trim().toUpperCase()
      if (q.has('buy')) window.history.replaceState(window.history.state, '', window.location.pathname)   // a reload should not reopen the order
      const m = ['cn', 'hk', 'jp'].includes(q.get('market')) ? q.get('market') : 'us'
      return /^[A-Z0-9.]{1,10}$/.test(sym) ? { sym, market: m } : null
    } catch { return null }
  })
  // 'us' | 'cn' | 'hk' | 'jp' for the personal accounts, 'g:<id>' for a competition
  const [active, setActive] = useState(prefill?.market || 'us')
  const [gameAcc, setGameAcc] = useState(null)
  const [sheet, setSheet] = useState(prefill ? { side: 'buy', symbol: prefill.sym } : null) // {side, symbol, shares} | 'board' | 'reset' | 'games'
  const [toast, setToast] = useState('')
  const gameId = active.startsWith('g:') ? active.slice(2) : null
  const game = gameId ? (acc?.games || []).find((g) => g.id === gameId) || gameAcc?.game : null
  const market = game ? game.market : gameId ? 'us' : active

  const loadGame = useCallback(async (gid) => {
    try { setGameAcc(await post('/games/account', { game_id: gid })) } catch (e) { setToast(e.message); setActive('us') }
  }, [])
  const load = useCallback(async () => {
    try { setAcc(await post('/account', {})); setErr(null) } catch (e) { setErr(e) }
    if (gameId) loadGame(gameId)
  }, [gameId, loadGame])
  useEffect(() => {
    let on = true
    post('/account', {}).then((a) => { if (on) { setAcc(a); setErr(null) } }).catch((e) => { if (on) setErr(e) })
    return () => { on = false }
  }, [])
  useEffect(() => {
    if (!gameId) return undefined
    let on = true
    post('/games/account', { game_id: gameId }).then((d) => { if (on) setGameAcc(d) }).catch((e) => { if (on) { setToast(e.message); setActive('us') } })
    return () => { on = false }
  }, [gameId])
  // Pending orders fill in the background, so refresh while the page is open
  useEffect(() => { const id = setInterval(() => { if (!document.hidden) load() }, 30_000); return () => clearInterval(id) }, [load])
  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(''), 3200); return () => clearTimeout(id) }, [toast])

  const cur = CUR[market]
  const raw = gameId ? (gameAcc?.game?.id === gameId ? gameAcc : null) : acc?.markets?.[market]
  const view = useMemo(() => raw && {
    raw, total: raw.total_value, ret: raw.return_pct, cash: raw.cash, bp: raw.buying_power ?? raw.cash, rank: raw.rank,
    day: raw.analytics?.day_change ?? 0, dayPct: raw.analytics?.day_change_pct ?? 0,
    positions: Object.entries(raw.portfolio || {}).sort(([, a], [, b]) => b.market_value - a.market_value),
    shorts: Object.entries(raw.shorts || {}),
    open: (raw.orders || []).filter((o) => o.status === 'open').sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    closed: (raw.orders || []).filter((o) => o.status !== 'open').sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 5),
    txs: [...(raw.transactions || [])].reverse().slice(0, 10), count: (raw.transactions || []).length,
  }, [raw])

  if (err && !acc) return <ErrorBox onRetry={load} />
  const accent = view ? changeColor(view.ret, market) : 'var(--text-2)'
  const done = (msg) => { setSheet(null); setToast(msg); load() }
  const cancel = async (o) => {
    try { const r = await post('/order/cancel', { order_id: o.id, game_id: gameId, lang }); setToast(r.message || t('已撤销')); load() } catch (e) { setToast(e.message) }
  }
  const g = (v) => cur + Math.round(Math.abs(v)).toLocaleString('en-US')
  const sgn = (v) => (Math.abs(v) < 0.5 ? '' : v > 0 ? '+' : '-')
  const ended = game?.status === 'ended'
  const copyInvite = async () => {
    const text = `${game.name} · ${t('邀请码')} ${game.code} · ${window.location.origin}/paper`
    try { await navigator.clipboard.writeText(text); setToast(t('已复制')) } catch { setToast(game.code) }
  }
  const leaveGame = async () => {
    if (!window.confirm(`${t(game.is_owner ? '删除比赛' : '退出比赛')} · ${game.name}?`)) return
    try { await post(game.is_owner ? '/games/delete' : '/games/leave', { game_id: game.id }); setActive(game.market); load() } catch (e) { setToast(e.message) }
  }

  return (
    <div className="m-stack" style={{ gap: 22, paddingBottom: 72 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="m-iconbtn" onClick={() => setSheet('reset')} aria-label={t('重置账户')}>↺</button>
        <b>{t('模拟盘')}</b>
        <button className="m-iconbtn" onClick={() => (gameId ? document.getElementById('pt-standings')?.scrollIntoView({ behavior: 'smooth' }) : setSheet('board'))} aria-label={t('收益排行榜')}><LineIcon name="trophy" size={20} /></button>
      </div>
      {/* The switch drives the whole page (account card, positions, trades), so it sits on top */}
      <div style={{ margin: '-8px 2px -6px', display: 'grid', gap: 10 }}>
        <Segment value={active} onChange={setActive} options={['us', 'cn', 'hk', 'jp'].map((m) => ({ value: m, label: t(chipLabel(m)) }))} />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {(acc?.games || []).map((x) => (
            <button key={x.id} onClick={() => setActive('g:' + x.id)} aria-pressed={active === 'g:' + x.id}
              style={{ flex: 'none', padding: '7px 13px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis',
                background: active === 'g:' + x.id ? 'var(--accent)' : 'var(--surface-hi)', color: active === 'g:' + x.id ? 'var(--accent-ink)' : 'var(--text)' }}>{x.name}</button>
          ))}
          <button onClick={() => setSheet('games')} style={{ flex: 'none', padding: '7px 13px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap', border: '1px dashed var(--stroke)', color: 'var(--accent)' }}>+ {t('比赛')}</button>
        </div>
      </div>

      {game && (
        <div className="m-card" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <b style={{ fontSize: 16, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.name}</b>
            <span className="m-chip" style={{ flex: 'none', color: ended ? 'var(--text-3)' : '#22C55E', background: ended ? 'var(--surface-hi)' : 'color-mix(in srgb, #22C55E 14%, transparent)' }}>
              {ended ? t('已结束') : game.status === 'upcoming' ? t('未开始') : t('进行中')}</span>
          </div>
          <div className="m-label m-num">{t(chipLabel(game.market))} · {t('%lld 人参加', game.members)} · {ended ? game.end_date : t('%lld 天后结束', daysLeft(game.end_date))}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="m-num" style={{ fontFamily: 'var(--sans)', fontWeight: 600, letterSpacing: 3, fontSize: 18 }}>{game.code}</span>
            <span className="m-grow" />
            <button onClick={copyInvite} style={{ padding: '7px 12px', borderRadius: 'var(--radius)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)', fontSize: 13, fontWeight: 650 }}>{t('复制邀请')}</button>
            <button onClick={leaveGame} style={{ padding: '7px 12px', borderRadius: 'var(--radius)', background: 'var(--surface-hi)', color: '#ef4444', fontSize: 13, fontWeight: 650 }}>{game.is_owner ? t('删除比赛') : t('退出比赛')}</button>
          </div>
        </div>
      )}

      {!view ? <Skeleton h={220} r={24} /> : (
        <div className="m-card" style={{ padding: 18, display: 'grid', gap: 18, background: `color-mix(in srgb, ${view.ret === 0 ? 'var(--accent)' : accent} 20%, var(--surface))` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="m-muted" style={{ fontWeight: 650, fontSize: 14 }}>{game ? game.name : t(ACCOUNT_LABEL[market])}</span>
            {view.rank > 0 && (
              <span className="m-chip m-num" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }}>#{view.rank}</span>
            )}
          </div>
          <div>
            <div className="m-num m-serif-num" style={{ fontSize: 38 }}><span className="m-muted" style={{ fontSize: 22, fontWeight: 650 }}>{cur}</span> {Number(view.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><Pill value={view.ret} market={market} /><span className="m-label">{t('总收益率')}</span></div>
          </div>
          <div className="m-tiles" style={{ background: 'var(--surface-hi)', borderRadius: 14, padding: '12px 0' }}>
            {(() => {
              const base = view.ret > -100 ? view.total / (1 + view.ret / 100) : 0
              const pl = view.total - base
              return [
                [t('可用购买力'), g(view.bp), null],
                [t('今日盈亏'), sgn(view.day) + g(view.day), Math.abs(view.day) < 0.5 ? null : changeColor(view.day, market)],
                [t('总盈亏'), sgn(pl) + g(pl), Math.abs(pl) < 0.5 ? null : changeColor(pl, market)],
              ].map(([k, v, c], i) => (
                <div key={k} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid var(--stroke)' : 'none', minWidth: 0 }}>
                  <div className="m-label">{k}</div>
                  <div className="m-num" style={{ fontWeight: 600, marginTop: 3, fontSize: 15, color: c || undefined, whiteSpace: 'nowrap' }}>{v}</div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {acc && view && <PaperPerformance deviceId={deviceId()} market={market} gameId={gameId} refreshKey={`${view.count}-${view.cash}`} />}

      {view && view.open.length > 0 && (
        <Section title={`${t('委托')} · ${t('未成交')}`}>
          <div className="m-card flush">
            {view.open.map((o) => (
              <div className="m-row" key={o.id}>
                <span className="m-num" style={{ width: 28, height: 28, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, color: '#fff', background: SIDE_TINT[o.side] }}>{t(SIDE_BADGE[o.side])}</span>
                <div className="m-grow" style={{ minWidth: 0 }}>
                  <div className="m-name">{o.symbol} · {o.shares}</div>
                  <div className="m-label m-num" style={{ whiteSpace: 'normal' }}>{t(TYPE_LABEL[o.type])}{o.type !== 'market' ? ` · ${o.tif === 'gtc' ? t('撤单前有效') : t('当日有效')}` : ''}{orderTerms(o, t, cur) ? ` · ${orderTerms(o, t, cur)}` : ''}</div>
                </div>
                <button onClick={() => cancel(o)} style={{ flex: 'none', padding: '6px 12px', borderRadius: 'var(--radius)', background: 'var(--surface-hi)', color: '#ef4444', fontSize: 13, fontWeight: 650 }}>{t('撤单')}</button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={t('持仓')} action={null}>
        {view && (view.positions.length === 0 && view.shorts.length === 0 ? (
          <div className="m-card" style={{ display: 'grid', justifyItems: 'center', gap: 10, padding: '28px 16px', textAlign: 'center' }}>
            <span style={{ width: 54, height: 54, borderRadius: 27, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></svg>
            </span>
            <b style={{ fontSize: 16 }}>{t('暂无持仓')}</b>
            <span className="m-label">{t('用虚拟资金练习买卖，不承担真实风险')}</span>
            {!ended && <button onClick={() => setSheet({ side: 'buy' })} style={{ marginTop: 4, padding: '10px 22px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: 'var(--accent-ink)', fontWeight: 650, fontSize: 14 }}>{t('买入第一只股票')}</button>}
          </div>
        ) : (
          <div className="m-card flush">
            {view.positions.map(([sym, p]) => (
              <button className="m-row" key={sym} disabled={ended} onClick={() => setSheet({ side: 'sell', symbol: sym, shares: p.available_shares || 1 })}>
                <div className="m-grow"><div className="m-name">{sym}</div><div className="m-label m-num">{t('%lld股 · 均价%@', p.shares, cur + num(p.avg_cost))}</div></div>
                <div style={{ textAlign: 'right' }}><div className="m-num" style={{ fontWeight: 650 }}>{money(p.market_value, cur)}</div>
                  <div className="m-num" style={{ fontSize: 13, fontWeight: 650, color: changeColor(p.profit_loss_pct, market) }}>{p.profit_loss >= 0 ? '+' : ''}{num(p.profit_loss)} ({pct(p.profit_loss_pct)})</div></div>
              </button>
            ))}
          </div>
        ))}
      </Section>

      {view && view.shorts.length > 0 && (
        <Section title={t('空头仓位')}>
          <div className="m-card flush">
            {view.shorts.map(([sym, p]) => (
              <button className="m-row" key={sym} disabled={ended} onClick={() => setSheet({ side: 'cover', symbol: sym, shares: p.shares })}>
                <span className="m-num" style={{ width: 28, height: 28, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, color: '#fff', background: SIDE_TINT.short }}>{t('空')}</span>
                <div className="m-grow"><div className="m-name">{sym}</div><div className="m-label m-num">{t('%lld股 · 均价%@', -p.shares, cur + num(p.avg_price))}</div></div>
                <div style={{ textAlign: 'right' }}><div className="m-num" style={{ fontWeight: 650 }}>{money(p.market_value, cur)}</div>
                  <div className="m-num" style={{ fontSize: 13, fontWeight: 650, color: changeColor(p.profit_loss, market) }}>{p.profit_loss >= 0 ? '+' : ''}{num(p.profit_loss)} ({pct(p.profit_loss_pct)})</div></div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {game && gameAcc?.leaderboard && (
        <div id="pt-standings">
          <Section title={ended ? t('最终排名') : t('比赛排名')}>
            <div className="m-card flush">
              {gameAcc.leaderboard.map((r, i) => (
                <div className="m-row" key={i} style={r.is_me ? { background: 'color-mix(in srgb, var(--accent) 12%, transparent)' } : undefined}>
                  <span className="m-num" style={{ width: 24, fontWeight: 600, color: i < 3 ? ['#F5C542', '#B8C2D0', '#D98A4E'][i] : 'var(--text-3)' }}>{i + 1}</span>
                  <div className="m-grow"><div className="m-name">{r.nickname}{r.is_me ? t('（我）') : ''}</div><div className="m-sub m-num">{cur}{Math.round(r.total_value).toLocaleString('en-US')}</div></div>
                  <Pill value={r.return_pct} market={market} />
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {view && (view.txs.length > 0 || view.closed.length > 0) && (
        <Section title={t('最近交易')}>
          <div className="m-card flush">
            {view.txs.map((x, i) => (
              <div className="m-row" key={i}>
                <span className="m-num" style={{ width: 28, height: 28, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, color: '#fff', background: SIDE_TINT[x.type] || 'var(--text-3)' }}>{t(SIDE_BADGE[x.type] || '卖')}</span>
                <div className="m-grow"><div className="m-name">{x.name || x.symbol}</div><div className="m-label m-num">{t('%lld股 @ %@', x.shares, cur + num(x.price))}</div></div>
                <div style={{ textAlign: 'right' }}><div className="m-num">{money(x.amount, cur)}</div>
                  {x.profit_loss != null ? <div className="m-num" style={{ fontSize: 13, fontWeight: 650, color: changeColor(x.profit_loss, market) }}>{x.profit_loss >= 0 ? '+' : ''}{num(x.profit_loss)}</div> : <div className="m-label">{x.date}</div>}</div>
              </div>
            ))}
            {view.closed.filter((o) => o.status !== 'filled').map((o) => (
              <div className="m-row" key={o.id} style={{ opacity: 0.7 }}>
                <span className="m-num" style={{ width: 28, height: 28, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'var(--surface-hi)' }}>{t(SIDE_BADGE[o.side])}</span>
                <div className="m-grow" style={{ minWidth: 0 }}><div className="m-name">{o.symbol} · {o.shares}</div><div className="m-label" style={{ whiteSpace: 'normal' }}>{t(TYPE_LABEL[o.type])}{orderTerms(o, t, cur) ? ` · ${orderTerms(o, t, cur)}` : ''}</div></div>
                <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLOR[o.status] }}>{t(STATUS_LABEL[o.status] || o.status)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
      <div className="m-footer">{t('仅供学习，不构成投资建议')}</div>

      {!ended && (
        <button onClick={() => setSheet({ side: 'buy' })} aria-label={t('买入')} style={{ position: 'fixed', right: 20, bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 16px)', width: 56, height: 56, borderRadius: 'var(--radius)', color: 'var(--accent-ink)', fontSize: 30, lineHeight: 1,
          background: 'var(--accent)', boxShadow: '0 8px 24px rgba(0,0,0,.3)', zIndex: 15 }}>+</button>
      )}

      {sheet?.side && view && <TradeSheet key={`${active}-${sheet.side}-${sheet.symbol || ''}`} market={market} view={raw} init={sheet} gameId={gameId} onClose={() => setSheet(null)} onDone={done} />}
      {sheet === 'board' && <Board market={market} onClose={() => setSheet(null)} />}
      {sheet === 'games' && <GameSheet nickname={acc?.nickname} onClose={() => setSheet(null)} onJoined={(x) => { setSheet(null); setActive('g:' + x.id); setToast(x.name); load() }} />}
      {sheet === 'reset' && (
        <Sheet onClose={() => setSheet(null)}>
          <div className="m-stack" style={{ gap: 14, textAlign: 'center' }}>
            <b style={{ fontSize: 17 }}>{t('确认重置账户')}</b>
            <p className="m-muted" style={{ margin: 0, fontSize: 14 }}>{t('所有持仓和交易记录将清除，四个账户恢复初始资金：美股 $10万、A股 100万元、港股 HK$100万、日股 ¥1000万。')}</p>
            <button className="m-btn" style={{ background: '#ef4444' }} onClick={async () => { try { await post('/reset', {}); done(t('重置')) } catch (e) { setToast(e.message) } }}>{t('重置')}</button>
            <button className="m-btn ghost" onClick={() => setSheet(null)}>{t('取消')}</button>
          </div>
        </Sheet>
      )}
      {toast && <div className="m-toast" role="status">{toast}</div>}
    </div>
  )
}
