import { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '../i18n'
import { num, pct } from '../data'
import { changeColor } from '../helpers'
import { Icon } from '../icons'
import { ErrorBox, Pill, Section, Segment, Skeleton } from '../ui'

function deviceId() {
  let id = localStorage.getItem('bfs_device_id')
  if (!id) { id = Math.random().toString(36).slice(2, 11) + Date.now(); localStorage.setItem('bfs_device_id', id) }
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

function TradeSheet({ market, mode, pos, symbol: sym0, onClose, onDone }) {
  const t = useT()
  const buy = mode === 'buy'
  const step = market === 'cn' ? 100 : 1
  const cur = market === 'cn' ? '¥' : '$'
  const [symbol, setSymbol] = useState(sym0 || '')
  const [shares, setShares] = useState(step)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const max = buy ? 1000000 : Math.max(step, pos?.available_shares ?? 0)
  const norm = useCallback((n) => { const c = Math.min(Math.max(Number.isFinite(n) ? n : step, step), max); return market === 'cn' && buy ? Math.max(100, Math.floor(c / 100) * 100) : c }, [step, max, market, buy])
  const quick = buy ? (market === 'cn' ? [100, 500, 1000, 5000] : [1, 10, 50, 100]) : [...new Set([0.25, 0.5, 0.75, 1].map((f) => Math.max(step, Math.floor((max * f) / step) * step)))]
  const quickLabel = (v) => (buy ? String(v) : v === max ? t('全部') : `${Math.round((v / max) * 100)}%`)
  const valid = buy ? symbol.trim() && shares > 0 && (market !== 'cn' || shares % 100 === 0) : shares > 0 && shares <= (pos?.available_shares ?? 0)
  const est = !buy && pos ? pos.current_price * shares : null
  const tint = buy ? 'var(--accent)' : '#F28B3C'

  const go = async () => {
    setBusy(true); setErr('')
    try { const r = await post(buy ? '/buy' : '/sell', { symbol: (buy ? symbol.trim() : sym0).toUpperCase(), shares, market }); onDone(r.message || t('买入成功')) }
    catch (e) { setErr(e.message); setBusy(false) }
  }
  return (
    <Sheet onClose={onClose}>
      <div className="m-stack" style={{ gap: 16 }}>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 17 }}>{buy ? t('买入') : t('卖出')}</div>
        {buy ? (
          <div className="m-card">
            <div className="m-label" style={{ marginBottom: 8 }}>{market === 'cn' ? t('A股 · 股票代码') : t('美股 · 股票代码')}</div>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder={market === 'cn' ? t('如 000001') : t('如 AAPL')} autoCapitalize="characters" autoCorrect="off" inputMode={market === 'cn' ? 'numeric' : 'text'}
              style={{ width: '100%', minWidth: 0, background: 'none', border: 0, outline: 0, fontSize: 28, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace' }} />
          </div>
        ) : (
          <div className="m-card" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 18 }}>{sym0}</b><Pill value={pos.profit_loss_pct} market={market} /></div>
            <div className="m-tiles">
              {[[t('现价'), money(pos.current_price, cur)], [t('成本'), money(pos.avg_cost, cur)], [t('可卖/持有'), `${pos.available_shares}/${pos.shares}`]].map(([k, v]) => (
                <div key={k} className="m-tile"><div className="m-label">{k}</div><div className="m-num" style={{ fontWeight: 700, fontSize: 13.5, marginTop: 3 }}>{v}</div></div>))}
            </div>
            {pos.available_shares < pos.shares && <div style={{ fontSize: 12, color: '#F28B3C' }}>{market === 'cn' ? t('T+1：今日买入部分明日可卖') : t('T+2：部分持仓尚未结算')}</div>}
          </div>
        )}
        <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div className="m-label" style={{ fontWeight: 650 }}>{market === 'cn' ? t('股数（100 的整数倍）') : t('股数')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="m-iconbtn" style={{ width: 46, height: 46, flex: 'none' }} onClick={() => setShares(norm(shares - step))} disabled={shares <= step} aria-label={t('减少')}>−</button>
            <input className="m-num" inputMode="numeric" value={shares} onChange={(e) => setShares(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} onBlur={() => setShares(norm(shares))}
              style={{ flex: 1, minWidth: 0, width: 0, textAlign: 'center', background: 'none', border: 0, outline: 0, fontSize: 36, fontWeight: 800 }} />
            <button className="m-iconbtn" style={{ width: 46, height: 46, flex: 'none' }} onClick={() => setShares(norm(shares + step))} disabled={shares >= max} aria-label={t('增加')}>+</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {quick.map((v) => <button key={v} onClick={() => setShares(norm(v))} className="m-num" style={{ flex: 1, padding: '8px 0', borderRadius: 999, fontWeight: 700, fontSize: 13, background: shares === v ? tint : 'var(--surface-hi)', color: shares === v ? '#fff' : 'var(--text)' }}>{quickLabel(v)}</button>)}
          </div>
        </div>
        {est != null && (
          <div className="m-card" style={{ display: 'grid', gap: 10, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="m-muted">{t('预计成交金额')}</span><b className="m-num">{money(est, cur)}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="m-muted">{t('预计盈亏')}</span><b className="m-num" style={{ color: changeColor(est - pos.avg_cost * shares, market) }}>{money(est - pos.avg_cost * shares, cur)}</b></div>
          </div>
        )}
        {err && <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{err}</div>}
        <button className="m-btn" disabled={!valid || busy} onClick={go} style={{ background: tint }}>{buy ? t('确认买入 %lld 股', shares) : t('确认卖出 %lld 股', shares)}</button>
        <div className="m-footer">{t('仅供学习，不构成投资建议。实际成交价以服务器返回为准。')}</div>
      </div>
    </Sheet>
  )
}

function Board({ onClose }) {
  const t = useT()
  const [rows, setRows] = useState(null); const [err, setErr] = useState(false)
  useEffect(() => { fetch(`/api/paper/leaderboard?device_id=${deviceId()}`).then((r) => r.json()).then(setRows).catch(() => setErr(true)) }, [])
  const medal = ['#F5C542', '#B8C2D0', '#D98A4E']
  return (
    <Sheet onClose={onClose}>
      <div className="m-stack" style={{ gap: 16 }}>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 17 }}>{t('收益排行榜')}</div>
        {err ? <ErrorBox onRetry={() => { setErr(false); window.location.reload() }} /> : !rows ? <Skeleton h={180} r={20} /> : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              {[1, 0, 2].filter((i) => rows[i]).map((i) => {
                const r = rows[i]; const first = i === 0
                return (
                  <div key={i} className="m-card" style={{ flex: 1, textAlign: 'center', padding: first ? '20px 6px' : '14px 6px', borderColor: r.is_me ? 'var(--accent)' : `color-mix(in srgb, ${medal[i]} 40%, transparent)`, background: `linear-gradient(180deg, color-mix(in srgb, ${medal[i]} 22%, var(--surface)), var(--surface))` }}>
                    <div style={{ color: medal[i], fontWeight: 800, fontSize: first ? 30 : 24 }} className="m-num">{r.rank}</div>
                    <div style={{ fontSize: 12, fontWeight: 650, margin: '6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nickname}{r.is_me ? t('（我）') : ''}</div>
                    <Pill value={r.return_pct} market="cn" minWidth={0} />
                  </div>
                )
              })}
            </div>
            <div className="m-card flush">
              {rows.slice(3).map((r) => (
                <div className="m-row" key={r.rank} style={r.is_me ? { background: 'color-mix(in srgb, var(--accent) 12%, transparent)' } : undefined}>
                  <span className="m-num m-muted" style={{ width: 24, fontWeight: 700 }}>{r.rank}</span>
                  <div className="m-grow"><div className="m-name">{r.nickname}</div><div className="m-sub m-num">¥{Math.round(r.total_value).toLocaleString()}</div></div>
                  <Pill value={r.return_pct} market="cn" />
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

export default function Paper() {
  const t = useT()
  const [acc, setAcc] = useState(null); const [err, setErr] = useState(null)
  const [market, setMarket] = useState('us')
  const [sheet, setSheet] = useState(null) // {mode, symbol, pos} | 'board' | 'reset'
  const [toast, setToast] = useState('')

  const load = useCallback(async () => { try { setAcc(await post('/account', {})); setErr(null) } catch (e) { setErr(e) } }, [])
  useEffect(() => {
    let on = true
    post('/account', {}).then((a) => { if (on) { setAcc(a); setErr(null) } }).catch((e) => { if (on) setErr(e) })
    return () => { on = false }
  }, [])
  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(''), 3200); return () => clearTimeout(id) }, [toast])

  const cn = market === 'cn'
  const cur = cn ? '¥' : '$'
  const view = useMemo(() => acc && ({
    total: cn ? acc.total_value : acc.us_total_value, ret: cn ? acc.return_pct : acc.us_return_pct, cash: cn ? acc.cash : acc.us_cash,
    positions: Object.entries(cn ? acc.portfolio : acc.us_portfolio).sort(([a], [b]) => a.localeCompare(b)),
    txs: [...(cn ? acc.transactions : acc.us_transactions)].reverse().slice(0, 10),
  }), [acc, cn])

  if (err && !acc) return <ErrorBox onRetry={load} />
  const accent = view ? changeColor(view.ret, market) : 'var(--text-2)'
  const done = (msg) => { setSheet(null); setToast(msg); load() }

  return (
    <div className="m-stack" style={{ gap: 22, paddingBottom: 72 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="m-iconbtn" onClick={() => setSheet('reset')} aria-label={t('重置账户')}>↺</button>
        <b>{t('模拟盘')}</b>
        <button className="m-iconbtn" onClick={() => setSheet('board')} aria-label={t('收益排行榜')}>🏆</button>
      </div>

      {!view ? <Skeleton h={220} r={24} /> : (
        <div className="m-card" style={{ padding: 18, display: 'grid', gap: 18, background: `linear-gradient(135deg, color-mix(in srgb, ${view.ret === 0 ? 'var(--accent)' : accent} 20%, var(--surface)), var(--surface) 60%)` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="m-muted" style={{ fontWeight: 650, fontSize: 14 }}>{cn ? t('A股账户') : t('美股账户')}</span>
            <span className="m-chip m-num" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }}>🏆 #{acc.rank}</span>
          </div>
          <div>
            <div className="m-num" style={{ fontSize: 36, fontWeight: 800, letterSpacing: -.5 }}><span className="m-muted" style={{ fontSize: 22, fontWeight: 650 }}>{cur}</span> {Number(view.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><Pill value={view.ret} market={market} /><span className="m-label">{t('总收益率')}</span></div>
          </div>
          <div className="m-tiles" style={{ background: 'var(--surface-hi)', borderRadius: 14, padding: '12px 0' }}>
            {(() => {
              const base = view.ret > -100 ? view.total / (1 + view.ret / 100) : 0
              const pl = view.total - base
              const flat = Math.abs(pl) < 0.5
              const g = (v) => cur + Math.round(v).toLocaleString('en-US')
              return [
                [t('可用现金'), g(view.cash), null],
                [t('持仓市值'), g(Math.max(view.total - view.cash, 0)), null],
                [t('总盈亏'), (flat ? '' : pl > 0 ? '+' : '-') + g(Math.abs(pl)), flat ? null : changeColor(pl, market)],
              ].map(([k, v, c], i) => (
                <div key={k} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid var(--stroke)' : 'none', minWidth: 0 }}>
                  <div className="m-label">{k}</div>
                  <div className="m-num" style={{ fontWeight: 700, marginTop: 3, fontSize: 15, color: c || undefined, whiteSpace: 'nowrap' }}>{v}</div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      <Section title={t('持仓')} action={null}>
        <div style={{ margin: '-4px 4px 10px' }}><Segment value={market} onChange={setMarket} options={[{ value: 'cn', label: t('A股') }, { value: 'us', label: t('美股') }]} /></div>
        {view && (view.positions.length === 0 ? (
          <div className="m-card" style={{ display: 'grid', justifyItems: 'center', gap: 10, padding: '28px 16px', textAlign: 'center' }}>
            <span style={{ width: 54, height: 54, borderRadius: 27, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></svg>
            </span>
            <b style={{ fontSize: 16 }}>{t('暂无持仓')}</b>
            <span className="m-label">{t('用虚拟资金练习买卖，不承担真实风险')}</span>
            <button onClick={() => setSheet({ mode: 'buy' })} style={{ marginTop: 4, padding: '10px 22px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontWeight: 650, fontSize: 14 }}>{t('买入第一只股票')}</button>
          </div>
        ) : (
          <div className="m-card flush">
            {view.positions.map(([sym, p]) => (
              <button className="m-row" key={sym} onClick={() => setSheet({ mode: 'sell', symbol: sym, pos: p })}>
                <div className="m-grow"><div className="m-name">{sym}</div><div className="m-label m-num">{t('%lld股 · 均价%@', p.shares, cur + num(p.avg_cost))}</div></div>
                <div style={{ textAlign: 'right' }}><div className="m-num" style={{ fontWeight: 650 }}>{money(p.market_value, cur)}</div>
                  <div className="m-num" style={{ fontSize: 12, fontWeight: 650, color: changeColor(p.profit_loss_pct, market) }}>{p.profit_loss >= 0 ? '+' : ''}{num(p.profit_loss)} ({pct(p.profit_loss_pct)})</div></div>
              </button>
            ))}
          </div>
        ))}
      </Section>

      {view?.txs.length > 0 && (
        <Section title={t('最近交易')}>
          <div className="m-card flush">
            {view.txs.map((x, i) => (
              <div className="m-row" key={i}>
                <span className="m-num" style={{ width: 28, height: 28, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, color: '#fff', background: x.type === 'buy' ? 'var(--accent)' : 'var(--text-3)' }}>{x.type === 'buy' ? t('买') : t('卖')}</span>
                <div className="m-grow"><div className="m-name">{x.name || x.symbol}</div><div className="m-label m-num">{t('%lld股 @ %@', x.shares, cur + num(x.price))}</div></div>
                <div style={{ textAlign: 'right' }}><div className="m-num">{money(x.amount, cur)}</div><div className="m-label">{x.date}</div></div>
              </div>
            ))}
          </div>
        </Section>
      )}
      <div className="m-footer">{t('仅供学习，不构成投资建议')}</div>

      <button onClick={() => setSheet({ mode: 'buy' })} aria-label={t('买入')} style={{ position: 'fixed', right: 20, bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 16px)', width: 56, height: 56, borderRadius: 28, color: '#fff', fontSize: 30, lineHeight: 1,
        background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', boxShadow: '0 8px 22px color-mix(in srgb, var(--accent) 45%, transparent)', zIndex: 15 }}>+</button>

      {sheet?.mode && <TradeSheet market={market} mode={sheet.mode} pos={sheet.pos} symbol={sheet.symbol} onClose={() => setSheet(null)} onDone={done} />}
      {sheet === 'board' && <Board onClose={() => setSheet(null)} />}
      {sheet === 'reset' && (
        <Sheet onClose={() => setSheet(null)}>
          <div className="m-stack" style={{ gap: 14, textAlign: 'center' }}>
            <b style={{ fontSize: 17 }}>{t('确认重置账户')}</b>
            <p className="m-muted" style={{ margin: 0, fontSize: 14 }}>{t('所有持仓和交易记录将清除，初始资金将恢复至 100万元（A股）/ $10万（美股）。')}</p>
            <button className="m-btn" style={{ background: '#ef4444' }} onClick={async () => { try { await post('/reset', {}); done(t('重置')) } catch (e) { setToast(e.message) } }}>{t('重置')}</button>
            <button className="m-btn ghost" onClick={() => setSheet(null)}>{t('取消')}</button>
          </div>
        </Sheet>
      )}
      {toast && <div className="m-toast" role="status">{toast}</div>}
    </div>
  )
}
