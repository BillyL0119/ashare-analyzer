import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import useAuthStore from '../store/authStore'
import PaperPerformance from './PaperPerformance'
import ptStrings from './paper/ptStrings'
import OrderTicket from './paper/OrderTicket'
import GamesModal from './paper/GamesModal'
import { Positions, Orders, History, Leaderboard } from './paper/DeskTables'
import { BDR, MUTED, UP, DOWN, Card, Seg, Stat, Modal, Button, inputStyle, money, signed, pct, plColor } from './paper/ui'
import getDeviceId from '../utils/deviceId'

// Paper trading desk: four market accounts plus competitions, each traded through the same order
// ticket (market / limit / stop / stop-limit / trailing stop, short selling in US accounts).



// Server nicknames are stored as "用户#1234"; translate the prefix for other languages.
const NICK_PREFIX = { zh: '用户', en: 'Trader', ja: 'ユーザー', ko: '사용자', fr: 'Joueur' }
const localNick = (nick, lang) => (nick || '').replace(/^用户#/, `${NICK_PREFIX[lang] || NICK_PREFIX.en} #`).replace(/^用户 #/, '用户#')

const MARKETS = ['us', 'cn', 'hk', 'jp']

async function postJSON(path, body) {
  const r = await fetch(`/api/paper/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : 'Error')
  return d
}

export default function PaperTradingPanel({ lang, onOpenAuth }) {
  const s = ptStrings(lang)
  const { user, loading: authLoading } = useAuthStore()
  const accountKey = user?.id ?? getDeviceId()

  // /paper?buy=AAPL&market=us (a stock page's "Paper trade" button) opens with the order filled in
  const [prefillUrl] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const sym = (q.get('buy') || '').trim().toUpperCase()
      const m = MARKETS.includes(q.get('market')) ? q.get('market') : 'us'
      return /^[A-Z0-9.]{1,10}$/.test(sym) ? { symbol: sym, market: m, side: 'buy' } : null
    } catch { return null }
  })
  // A reload should not reopen the order
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('buy')) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])

  const [account, setAccount] = useState(null)
  const [gameView, setGameView] = useState(null)
  const [err, setErr] = useState(null)
  const [active, setActive] = useState(prefillUrl?.market || 'us')     // 'us' | 'cn' | 'hk' | 'jp' | 'g:<id>'
  const [tab, setTab] = useState('positions')
  const [prefill, setPrefill] = useState(prefillUrl)
  const [board, setBoard] = useState(null)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)         // 'games' | 'reset' | 'nick'
  const [nickDraft, setNickDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const tick = useRef(0)

  const gameId = active.startsWith('g:') ? active.slice(2) : null
  const view = gameId ? gameView : account?.markets?.[active]
  const market = gameId ? gameView?.market || gameView?.game?.market : active
  const game = gameId ? (gameView?.game || account?.games?.find((g) => g.id === gameId)) : null

  const load = useCallback(async () => {
    try {
      const a = await postJSON('account', { device_id: accountKey })
      setAccount(a); setErr(null)
      if (gameId) setGameView(await postJSON('games/account', { device_id: accountKey, game_id: gameId }))
    } catch (e) { setErr(e.message) }
  }, [accountKey, gameId])

  useEffect(() => { if (!authLoading) load() }, [load, authLoading])
  // Open orders fill in the background: refresh every 30 s while the page is visible
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') { tick.current += 1; load() } }, 30000)
    return () => clearInterval(id)
  }, [load])
  useEffect(() => {
    if (tab !== 'leaderboard' || gameId) return
    setBoard(null)
    fetch(`/api/paper/leaderboard?device_id=${encodeURIComponent(accountKey)}&market=${active}`).then((r) => r.json()).then((d) => setBoard(Array.isArray(d) ? d : [])).catch(() => setBoard([]))
  }, [tab, active, gameId, accountKey, account?.markets?.[active]?.transactions?.length])
  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(null), 5000); return () => clearTimeout(id) }, [toast])

  const cancel = async (o) => {
    try { const d = await postJSON('order/cancel', { device_id: accountKey, order_id: o.id, game_id: gameId, lang }); setToast({ ok: true, text: d.message }); load() }
    catch (e) { setToast({ ok: false, text: e.message }) }
  }
  const onOrderDone = (d) => { setToast({ ok: true, text: d.message }); setTab(d.pending ? 'orders' : 'positions'); load() }

  const an = view?.analytics || {}
  const openOrders = (view?.orders || []).filter((o) => o.status === 'open').length
  const tabs = [
    { value: 'positions', label: s.tabs.positions },
    { value: 'orders', label: `${s.tabs.orders}${openOrders ? ` · ${openOrders}` : ''}` },
    { value: 'history', label: s.tabs.history },
    { value: 'leaderboard', label: game?.status === 'ended' ? s.finalStandings : s.tabs.leaderboard },
  ]
  const portfolioOptions = [
    ...MARKETS.map((m) => ({ value: m, label: s.markets[m] })),
    ...(account?.games || []).map((g) => ({ value: `g:${g.id}`, label: `${g.name}` })),
  ]
  const inviteText = game ? `${s.game.inviteText(game.name, game.code)} ${window.location.origin}/paper` : ''

  if (err && !account) return <div style={{ textAlign: 'center', padding: '60px 0', color: DOWN }}>{err}</div>
  if (!account) return <div style={{ textAlign: 'center', padding: '60px 0', color: MUTED }}>…</div>

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', width: '100%', display: 'grid', gap: 14 }}>
      <style>{`.pt-grid { display: grid; grid-template-columns: minmax(300px, 380px) minmax(0, 1fr); gap: 14px; align-items: start; }
        @media (max-width: 900px) { .pt-grid { grid-template-columns: minmax(0, 1fr); } }`}</style>

      {toast && (
        <div role="status" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9998, maxWidth: '90vw', textAlign: 'center',
          background: 'var(--bg-secondary)', color: toast.ok ? UP : DOWN, borderRadius: 'var(--radius)', padding: '11px 20px', fontSize: 13.5, fontWeight: 650, boxShadow: '0 12px 32px rgba(0,0,0,.3)' }}>
          {toast.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>{s.title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: MUTED, maxWidth: 640 }}>{s.subtitle}</p>
        </div>
        <Button ghost onClick={() => setModal('games')} style={{ fontSize: 13 }}>{s.newGame}</Button>
      </div>

      {!user && (
        <div style={{ background: 'color-mix(in srgb, var(--accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderRadius: 'var(--radius)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{s.guest}</div>
          {onOpenAuth && <Button onClick={onOpenAuth} style={{ padding: '6px 14px', fontSize: 13 }}>{s.signIn}</Button>}
        </div>
      )}

      <Seg value={active} onChange={(v) => { setActive(v); setGameView(null); setPrefill(null) }} options={portfolioOptions} />

      {/* Account summary */}
      <Card style={{ display: 'grid', gap: 14 }}>
        {game && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
            <b style={{ fontSize: 15 }}>{game.name}</b>
            <span style={{ color: game.status === 'ended' ? MUTED : UP, fontWeight: 600 }}>{s.game.status[game.status]}</span>
            <span style={{ color: MUTED }}>{s.game.members(game.members)} · {game.status === 'ended' ? s.game.endedOn(game.end_date) : s.game.ends(game.end_date)} · {s.game.organiser} {game.owner_nickname}</span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ fontSize: 14, fontWeight: 600, letterSpacing: 2, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-tertiary)' }}>{game.code}</code>
              <Button ghost style={{ padding: '5px 10px', fontSize: 13 }} onClick={() => { navigator.clipboard?.writeText(inviteText); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                {copied ? s.game.copied : s.game.copy}
              </Button>
              {game.is_owner
                ? <Button ghost style={{ padding: '5px 10px', fontSize: 13, color: DOWN }} onClick={async () => { if (!window.confirm(s.game.removeConfirm)) return; await postJSON('games/delete', { device_id: accountKey, game_id: game.id }).catch(() => {}); setActive('us'); load() }}>{s.game.remove}</Button>
                : <Button ghost style={{ padding: '5px 10px', fontSize: 13 }} onClick={async () => { await postJSON('games/leave', { device_id: accountKey, game_id: game.id }).catch(() => {}); setActive('us'); load() }}>{s.game.leave}</Button>}
            </span>
          </div>
        )}
        {!view ? <div style={{ height: 70 }} className="skeleton" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, alignItems: 'end' }}>
            <Stat big label={s.totalValue} value={money(view.total_value, market, 0)}
              sub={<span style={{ color: plColor(view.return_pct, market) }}>{s.totalReturn} {pct(view.return_pct)}</span>} />
            <Stat label={s.todayChange} value={signed(an.day_change, market, 0)} color={plColor(an.day_change, market)} sub={pct(an.day_change_pct)} />
            <Stat label={s.buyingPower} value={money(view.buying_power, market, 0)} sub={view.reserved ? `${s.reserved} ${money(view.reserved, market, 0)}` : `${s.cash} ${money(view.cash, market, 0)}`} />
            <Stat label={s.rank} value={view.rank > 0 ? `#${view.rank}` : '—'}
              sub={<span style={{ cursor: 'pointer', textDecoration: 'underline dotted' }} onClick={() => { setNickDraft(account.nickname?.startsWith('用户#') ? '' : account.nickname); setModal('nick') }}>{localNick(account.nickname, lang)} <Icon name="edit" size={13} /></span>} />
          </div>
        )}
        {view && (
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: MUTED, borderTop: `1px solid ${BDR}`, paddingTop: 10 }}>
            <span>{s.realized} <b style={{ color: plColor(an.realized_pl, market) }}>{signed(an.realized_pl, market, 0)}</b></span>
            <span>{s.unrealized} <b style={{ color: plColor(an.unrealized_pl, market) }}>{signed(an.unrealized_pl, market, 0)}</b></span>
            <span>{s.winRate} <b style={{ color: 'var(--text-primary)' }}>{an.win_rate != null ? `${an.win_rate}% (${an.closed_trades})` : '—'}</b></span>
            <span>{s.fees} <b style={{ color: 'var(--text-primary)' }}>{money(an.fees_paid, market)}</b></span>
            {an.best_trade && <span>{s.best} <b style={{ color: plColor(an.best_trade.profit_loss, market) }}>{an.best_trade.symbol} {signed(an.best_trade.profit_loss, market, 0)}</b></span>}
            {an.worst_trade && an.closed_trades > 1 && <span>{s.worst} <b style={{ color: plColor(an.worst_trade.profit_loss, market) }}>{an.worst_trade.symbol} {signed(an.worst_trade.profit_loss, market, 0)}</b></span>}
            {!gameId && <button onClick={() => setModal('reset')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: DOWN, cursor: 'pointer', fontSize: 13 }}>{s.reset}</button>}
          </div>
        )}
      </Card>

      <div className="pt-grid">
        {view && market && (
          <OrderTicket s={s} lang={lang} market={market} view={view} accountKey={accountKey} gameId={gameId} prefill={prefill} onDone={onOrderDone} />
        )}
        <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          {market && <PaperPerformance accountKey={accountKey} market={market} lang={lang} gameId={gameId}
            refreshKey={`${view?.transactions?.length ?? 0}-${view?.cash}`} />}
          <Card style={{ display: 'grid', gap: 12 }}>
            <Seg value={tab} onChange={setTab} options={tabs} size="sm" />
            {tab === 'positions' && <Positions s={s} view={view} market={market} onAction={(p) => { setPrefill({ ...p, t: Date.now() }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
            {tab === 'orders' && <Orders s={s} view={view} market={market} lang={lang} onCancel={cancel} />}
            {tab === 'history' && <History s={s} view={view} market={market} filename={`paper-${gameId ? game?.code : active}-${new Date().toISOString().slice(0, 10)}.csv`} />}
            {tab === 'leaderboard' && <Leaderboard s={s} rows={gameId ? gameView?.leaderboard : board} market={market} />}
          </Card>
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, textAlign: 'center' }}>
        {s.rules[market] || ''} {s.hoursNote}
      </div>

      {modal === 'games' && (
        <GamesModal s={s} accountKey={accountKey} nickname={account.nickname} marketLabels={{ us: 'US', cn: 'A', hk: 'HK', jp: 'JP' }}
          onClose={() => setModal(null)} onJoined={(g) => { setModal(null); setActive(`g:${g.id}`); setGameView(null); load() }} />
      )}
      {modal === 'reset' && (
        <Modal onClose={() => setModal(null)} width={400}>
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>{s.resetTitle}</h2>
          <p style={{ margin: '0 0 18px', fontSize: 13.5, color: MUTED, lineHeight: 1.6 }}>{s.resetBody}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button ghost style={{ flex: 1 }} onClick={() => setModal(null)}>{s.cancelBtn}</Button>
            <Button color={DOWN} style={{ flex: 1 }} onClick={async () => { await postJSON('reset', { device_id: accountKey }).catch(() => {}); setModal(null); load() }}>{s.confirm}</Button>
          </div>
        </Modal>
      )}
      {modal === 'nick' && (
        <Modal onClose={() => setModal(null)} width={380}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>{s.game.nickname}</h2>
          <input value={nickDraft} onChange={(e) => setNickDraft(e.target.value.slice(0, 16))} placeholder={s.game.nicknamePh} style={inputStyle} autoFocus />
          <Button style={{ width: '100%', marginTop: 14 }} disabled={nickDraft.trim().length < 2}
            onClick={async () => { try { await postJSON('nickname', { device_id: accountKey, nickname: nickDraft }); setModal(null); load() } catch (e) { setToast({ ok: false, text: e.message }) } }}>
            {s.confirm}
          </Button>
        </Modal>
      )}
    </div>
  )
}
