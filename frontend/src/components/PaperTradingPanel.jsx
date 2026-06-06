import { useState, useEffect, useCallback } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────
const BG        = 'var(--bg-primary)'
const CARD_BG   = 'var(--bg-secondary)'
const BDR       = 'var(--border-primary)'
const BUY_CLR   = '#34d399'
const SELL_CLR  = '#ef4444'
const PROFIT_CLR = '#f59e0b'  /* gold for positive returns */
const MUTED     = 'var(--text-secondary)'

function getDeviceId() {
  const key = 'bfs_device_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = Math.random().toString(36).substr(2, 9) + Date.now()
    localStorage.setItem(key, id)
  }
  return id
}

// ── Small UI helpers ─────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BDR}`, borderRadius: 12, padding: '16px 20px', transition: 'border-color 0.2s', ...style }}>
      {children}
    </div>
  )
}

function Pill({ children, color, bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      background: bg || `${color}20`, color, border: `1px solid ${color}40`,
      letterSpacing: '0.2px', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function Btn({ children, onClick, color = BUY_CLR, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'rgba(255,255,255,0.06)' : color,
        color: disabled ? MUTED : '#fff',
        border: 'none', borderRadius: 8, padding: '8px 20px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13, fontWeight: 700, transition: 'opacity 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function fmt(n, dec = 2) {
  if (n == null) return '--'
  return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function PctBadge({ value }) {
  const up = value >= 0
  return (
    <span style={{ color: up ? PROFIT_CLR : SELL_CLR, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
      {up ? '+' : ''}{fmt(value)}%
    </span>
  )
}

// ── Sell Modal ───────────────────────────────────────────────────────────────
function SellModal({ pos, symbol, lang, market, onConfirm, onClose }) {
  const isUS   = market === 'us'
  const lotSize = isUS ? 1 : 100
  const currSym = isUS ? '$' : '¥'
  const [shares, setShares] = useState(pos.available_shares)

  const amount     = shares * pos.current_price
  const commission = isUS ? 0 : Math.max(5, amount * 0.0013)
  const net        = amount - commission

  const zhEn = (zh, en) => lang === 'zh' ? zh : en

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#0d1117', border: `1px solid ${BDR}`, borderRadius: 16, padding: '28px 32px', width: 360, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 18 }}>✕</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: SELL_CLR, marginBottom: 18 }}>
          {zhEn('卖出', 'Sell')} {symbol}
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 6 }}>
          {zhEn('可卖股数', 'Available')}: {pos.available_shares} {zhEn('股', 'shares')}
          &nbsp;·&nbsp;{zhEn('现价', 'Price')}: {currSym}{fmt(pos.current_price)}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: MUTED, display: 'block', marginBottom: 4 }}>
            {isUS ? zhEn('卖出数量', 'Shares to sell') : zhEn('卖出数量（100股整数倍）', 'Shares to sell (×100)')}
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              value={shares}
              min={lotSize}
              max={pos.available_shares}
              step={lotSize}
              onChange={(e) => {
                const v = Number(e.target.value)
                const clamped = Math.min(pos.available_shares, Math.max(lotSize, isUS ? Math.floor(v) : Math.round(v / 100) * 100))
                setShares(clamped)
              }}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BDR}`,
                borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', fontSize: 14, outline: 'none',
              }}
            />
            <button onClick={() => setShares(pos.available_shares)}
              style={{ fontSize: 11, color: '#8ab4f8', background: 'rgba(138,180,248,0.1)', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
              {zhEn('全部', 'All')}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: MUTED }}>{zhEn('成交金额', 'Trade Amount')}</span>
            <span style={{ color: 'var(--text-primary)' }}>{currSym}{fmt(amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: MUTED }}>{isUS ? zhEn('手续费（零佣金）', 'Commission (zero)') : zhEn('手续费 + 印花税', 'Commission + Stamp Duty')}</span>
            <span style={{ color: isUS ? BUY_CLR : SELL_CLR }}>{isUS ? zhEn('$0', '$0') : `-${currSym}${fmt(commission)}`}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span style={{ color: MUTED }}>{zhEn('预计到账', 'Net Proceeds')}</span>
            <span style={{ color: BUY_CLR }}>{currSym}{fmt(net)}</span>
          </div>
        </div>
        <Btn
          color={SELL_CLR}
          disabled={shares <= 0 || shares > pos.available_shares || (!isUS && shares % 100 !== 0)}
          onClick={() => onConfirm(shares)}
          style={{ width: '100%' }}
        >
          {zhEn('确认卖出', 'Confirm Sell')} {shares} {zhEn('股', 'shares')}
        </Btn>
      </div>
    </div>
  )
}

// ── Reset Confirm Modal ──────────────────────────────────────────────────────
function ResetModal({ lang, onConfirm, onClose }) {
  const zhEn = (zh, en) => lang === 'zh' ? zh : en
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#0d1117', border: `1px solid rgba(248,113,113,0.3)`, borderRadius: 16, padding: '28px 32px', width: 340, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: SELL_CLR, marginBottom: 10 }}>
          {zhEn('重置账户', 'Reset Account')}
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 24, lineHeight: 1.6 }}>
          {zhEn('将清空所有持仓和交易记录，恢复初始资金 100万元。此操作不可撤销。', 'This will clear all positions and transactions, restoring ¥1,000,000 initial capital. This cannot be undone.')}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: MUTED, padding: '10px 0', cursor: 'pointer', fontSize: 13 }}>
            {zhEn('取消', 'Cancel')}
          </button>
          <Btn color={SELL_CLR} onClick={onConfirm} style={{ flex: 1 }}>
            {zhEn('确认重置', 'Confirm Reset')}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function PaperTradingPanel({ lang }) {
  const zhEn = (zh, en) => lang === 'zh' ? zh : en

  const [deviceId]            = useState(getDeviceId)
  const [account,  setAccount] = useState(null)
  const [loading,  setLoading] = useState(true)
  const [err,      setErr]     = useState(null)

  // Market toggle for paper trading
  const [ptMarket, setPtMarket] = useState('cn')   // 'cn' | 'us'
  const isUS = ptMarket === 'us'
  const currSym = isUS ? '$' : '¥'

  // Buy form
  const [buyCode,    setBuyCode]    = useState('')
  const [buyShares,  setBuyShares]  = useState(100)
  const [quoteInfo,  setQuoteInfo]  = useState(null)   // {price, name}
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [buyMsg,     setBuyMsg]     = useState(null)   // {type:'success'|'error', text}

  // UI state
  const [sellModal,   setSellModal]  = useState(null)  // {symbol, pos}
  const [showTxn,     setShowTxn]    = useState(false)
  const [showBoard,   setShowBoard]  = useState(false)
  const [leaderboard, setLeaderboard]= useState([])
  const [resetModal,  setResetModal] = useState(false)
  const [actionMsg,   setActionMsg]  = useState(null)

  // ── API helpers ────────────────────────────────────────────────────────────

  const fetchAccount = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/paper/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      setAccount(data)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/paper/leaderboard?device_id=${deviceId}`)
      const data = await res.json()
      setLeaderboard(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('leaderboard:', e)
    }
  }, [deviceId])

  useEffect(() => { fetchAccount() }, [fetchAccount])
  useEffect(() => { if (showBoard) fetchLeaderboard() }, [showBoard, fetchLeaderboard])

  // ── Quote lookup ──────────────────────────────────────────────────────────
  useEffect(() => {
    setQuoteInfo(null)
    if (!buyCode) return
    const minLen = isUS ? 1 : 6
    if (buyCode.length < minLen) return
    setQuoteLoading(true)
    const url = isUS
      ? `/api/us/stock/${buyCode.toUpperCase()}/realtime`
      : `/api/stocks/${buyCode}/realtime`
    fetch(url)
      .then((r) => r.json())
      .then((d) => setQuoteInfo(d.price ? { price: d.price, name: d.name } : null))
      .catch(() => setQuoteInfo(null))
      .finally(() => setQuoteLoading(false))
  }, [buyCode, isUS])

  // Reset shares when switching market
  useEffect(() => {
    setBuyCode('')
    setBuyShares(isUS ? 1 : 100)
    setQuoteInfo(null)
    setBuyMsg(null)
  }, [ptMarket]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Buy ───────────────────────────────────────────────────────────────────
  const handleBuy = async () => {
    setBuyMsg(null)
    try {
      const res = await fetch('/api/paper/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, symbol: buyCode, shares: buyShares, market: ptMarket }),
      })
      const data = await res.json()
      if (!res.ok) { setBuyMsg({ type: 'error', text: data.detail }); return }
      setBuyMsg({ type: 'success', text: data.message })
      setBuyCode(''); setBuyShares(isUS ? 1 : 100); setQuoteInfo(null)
      fetchAccount()
    } catch (e) {
      setBuyMsg({ type: 'error', text: e.message })
    }
  }

  // ── Sell ──────────────────────────────────────────────────────────────────
  const handleSell = async (shares) => {
    setSellModal(null)
    try {
      const res = await fetch('/api/paper/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, symbol: sellModal.symbol, shares, market: ptMarket }),
      })
      const data = await res.json()
      if (!res.ok) { setActionMsg({ type: 'error', text: data.detail }); return }
      const pl = data.profit_loss
      const sign = pl >= 0 ? '+' : ''
      setActionMsg({
        type: pl >= 0 ? 'success' : 'error',
        text: `${data.message} | ${zhEn('盈亏', 'P&L')}: ${sign}${currSym}${fmt(pl)} (${sign}${fmt(data.profit_loss_pct)}%)`,
      })
      fetchAccount()
    } catch (e) {
      setActionMsg({ type: 'error', text: e.message })
    }
    setTimeout(() => setActionMsg(null), 5000)
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    setResetModal(false)
    try {
      const res = await fetch('/api/paper/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      })
      const data = await res.json()
      if (res.ok) { setActionMsg({ type: 'success', text: data.message }); fetchAccount() }
    } catch (e) { setActionMsg({ type: 'error', text: e.message }) }
    setTimeout(() => setActionMsg(null), 4000)
  }

  // ── Pre-render calculations ───────────────────────────────────────────────
  const portfolio  = isUS ? (account?.us_portfolio || {}) : (account?.portfolio || {})
  const txns       = isUS ? (account?.us_transactions || []) : (account?.transactions || [])
  const totalValue = isUS ? (account?.us_total_value ?? 100_000) : (account?.total_value ?? 1_000_000)
  const cash       = isUS ? (account?.us_cash ?? 100_000) : (account?.cash ?? 1_000_000)
  const retPct     = isUS ? (account?.us_return_pct ?? 0) : (account?.return_pct ?? 0)
  const commission = isUS ? (account?.us_total_commission_paid ?? 0) : (account?.total_commission_paid ?? 0)
  const rank       = account?.rank ?? '--'

  const portfolioValue = Object.values(portfolio).reduce((s, p) => s + (p.market_value || 0), 0)

  const buyAmount     = quoteInfo ? quoteInfo.price * buyShares : 0
  const buyCommission = isUS ? 0 : (buyAmount ? Math.max(5, buyAmount * 0.0003) : 0)
  const buyTotalCost  = buyAmount + buyCommission

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: MUTED, fontSize: 14 }}>
      {zhEn('加载模拟账户...', 'Loading paper account...')}
    </div>
  )

  if (err) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: SELL_CLR }}>
      {err}
    </div>
  )

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Modals ── */}
      {sellModal && (
        <SellModal
          pos={sellModal.pos}
          symbol={sellModal.symbol}
          lang={lang}
          market={ptMarket}
          onConfirm={handleSell}
          onClose={() => setSellModal(null)}
        />
      )}
      {resetModal && <ResetModal lang={lang} onConfirm={handleReset} onClose={() => setResetModal(false)} />}

      {/* ── Action message toast ── */}
      {actionMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: actionMsg.type === 'success' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
          border: `1px solid ${actionMsg.type === 'success' ? BUY_CLR : SELL_CLR}40`,
          borderRadius: 10, padding: '12px 24px', color: actionMsg.type === 'success' ? BUY_CLR : SELL_CLR,
          fontSize: 13, fontWeight: 600, zIndex: 9998, backdropFilter: 'blur(8px)',
          maxWidth: '90vw', textAlign: 'center',
        }}>
          {actionMsg.text}
        </div>
      )}

      {/* ── Market toggle ── */}
      <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR}`, borderRadius: 24, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'cn', label: zhEn('A股（¥100万）', 'A-Share (¥1M)') },
          { key: 'us', label: zhEn('美股（$10万）', 'US Stocks ($100K)') },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPtMarket(key)}
            style={{
              padding: '5px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: ptMarket === key ? 'linear-gradient(135deg, #8ab4f8, #c084fc)' : 'transparent',
              color: ptMarket === key ? '#fff' : MUTED,
              transition: 'all 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 1. Account Overview ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>
              {account?.nickname} · {zhEn('全球排名', 'Global Rank')}:
              <span style={{ color: '#8ab4f8', fontWeight: 700, marginLeft: 4 }}>
                {rank === -1 ? '--' : `#${rank}`}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: retPct >= 0 ? PROFIT_CLR : SELL_CLR, fontFamily: '"JetBrains Mono", monospace' }}>
              {currSym}{fmt(totalValue, 0)}
            </div>
            <div style={{ marginTop: 4 }}>
              <PctBadge value={retPct} />
              <span style={{ fontSize: 12, color: MUTED, marginLeft: 8 }}>
                {zhEn('总收益率', 'Total Return')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setResetModal(true)}
            style={{
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
              color: SELL_CLR, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12,
            }}
          >
            {zhEn('重置账户', 'Reset Account')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: zhEn('现金余额', 'Cash'), value: `${currSym}${fmt(cash, 0)}`, color: 'var(--text-primary)' },
            { label: zhEn('持仓市值', 'Portfolio Value'), value: `${currSym}${fmt(portfolioValue, 0)}`, color: '#8ab4f8' },
            { label: zhEn('已付手续费', 'Commission Paid'), value: `${currSym}${fmt(commission)}`, color: MUTED },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 16px', minWidth: 140, flex: 1 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 2. Buy Panel ── */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: BUY_CLR, marginBottom: 14 }}>
          {zhEn('买入股票', 'Buy Stock')}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Code input */}
          <div style={{ flex: '0 0 140px' }}>
            <label style={{ fontSize: 11, color: MUTED, display: 'block', marginBottom: 4 }}>
              {isUS ? zhEn('股票代码', 'Ticker') : zhEn('股票代码', 'Stock Code')}
            </label>
            <input
              value={buyCode}
              onChange={(e) => setBuyCode(e.target.value.trim().toUpperCase())}
              placeholder={isUS ? 'AAPL' : '600519'}
              maxLength={isUS ? 10 : 6}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${BDR}`,
                borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', fontSize: 14, outline: 'none',
              }}
            />
            {quoteInfo && (
              <div style={{ fontSize: 11, color: BUY_CLR, marginTop: 4 }}>
                {quoteInfo.name} · {currSym}{fmt(quoteInfo.price)}
              </div>
            )}
            {quoteLoading && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{zhEn('查询中...', 'Loading...')}</div>}
          </div>

          {/* Shares input */}
          <div style={{ flex: '0 0 180px' }}>
            <label style={{ fontSize: 11, color: MUTED, display: 'block', marginBottom: 4 }}>
              {isUS ? zhEn('买入股数（最少1股）', 'Shares (min 1)') : zhEn('买入股数（100整数倍）', 'Shares (×100)')}
            </label>
            <input
              type="number"
              value={buyShares}
              min={isUS ? 1 : 100}
              step={isUS ? 1 : 100}
              onChange={(e) => {
                const v = Math.max(isUS ? 1 : 100, Number(e.target.value))
                setBuyShares(isUS ? Math.floor(v) : Math.round(v / 100) * 100)
              }}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${BDR}`,
                borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {/* Preview */}
          {quoteInfo && (
            <div style={{ flex: 1, minWidth: 200, fontSize: 12, color: MUTED, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div>{zhEn('预计花费', 'Est. Cost')}: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{currSym}{fmt(buyTotalCost)}</span></div>
              {!isUS && <div>{zhEn('手续费', 'Commission')}: <span style={{ color: SELL_CLR, fontFamily: 'monospace' }}>{currSym}{fmt(buyCommission)}</span></div>}
              {isUS && <div style={{ color: BUY_CLR }}>{lang === 'zh' ? '零佣金' : 'Zero commission'}</div>}
              <div>{zhEn('买入后剩余现金', 'Cash After')}: <span style={{
                color: cash >= buyTotalCost ? BUY_CLR : SELL_CLR, fontFamily: 'monospace',
              }}>{currSym}{fmt(cash - buyTotalCost, 0)}</span></div>
            </div>
          )}

          <Btn
            onClick={handleBuy}
            disabled={!quoteInfo || !buyCode || buyShares <= 0 || cash < buyTotalCost}
            style={{ height: 38, paddingLeft: 28, paddingRight: 28 }}
          >
            {zhEn('买入', 'Buy')}
          </Btn>
        </div>

        {buyMsg && (
          <div style={{
            marginTop: 12, padding: '8px 14px', borderRadius: 8, fontSize: 13,
            background: buyMsg.type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            color: buyMsg.type === 'success' ? BUY_CLR : SELL_CLR,
            border: `1px solid ${buyMsg.type === 'success' ? BUY_CLR : SELL_CLR}30`,
          }}>
            {buyMsg.text}
          </div>
        )}
      </Card>

      {/* ── 3. Portfolio ── */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#8ab4f8', marginBottom: 14 }}>
          {zhEn('持仓列表', 'Portfolio')}
          <span style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginLeft: 8 }}>
            ({Object.keys(portfolio).length} {zhEn('只', 'stocks')})
          </span>
        </div>

        {Object.keys(portfolio).length === 0 ? (
          <div style={{ color: MUTED, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            {zhEn('暂无持仓，去买入第一只股票吧', 'No positions yet. Buy your first stock!')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {[
                    zhEn('代码', 'Code'),
                    zhEn('持仓', 'Shares'),
                    zhEn('可卖', 'Available'),
                    zhEn('成本', 'Avg Cost'),
                    zhEn('现价', 'Price'),
                    zhEn('市值', 'Value'),
                    zhEn('盈亏', 'P&L'),
                    zhEn('操作', 'Action'),
                  ].map((h) => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: `1px solid ${BDR}`, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(portfolio).map(([sym, pos]) => {
                  const isProfit = pos.profit_loss >= 0
                  const canSell  = pos.available_shares > 0
                  return (
                    <tr
                      key={sym}
                      style={{
                        background: isProfit ? 'rgba(52,211,153,0.04)' : 'rgba(248,113,113,0.04)',
                        transition: 'background 0.1s',
                      }}
                    >
                      <td style={{ padding: '10px 10px', fontFamily: 'monospace', color: '#8ab4f8', fontWeight: 600 }}>{sym}</td>
                      <td style={{ padding: '10px 10px', color: 'var(--text-primary)' }}>{pos.shares}</td>
                      <td style={{ padding: '10px 10px' }}>
                        {canSell ? (
                          <span style={{ color: BUY_CLR }}>{pos.available_shares}</span>
                        ) : (
                          <span style={{ color: MUTED, fontSize: 11 }}>{isUS ? zhEn('T+2 🔒', 'T+2 🔒') : zhEn('明日可卖 🔒', 'T+1 🔒')}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 10px', fontFamily: 'monospace', color: MUTED }}>{currSym}{fmt(pos.avg_cost)}</td>
                      <td style={{ padding: '10px 10px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{currSym}{fmt(pos.current_price)}</td>
                      <td style={{ padding: '10px 10px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{currSym}{fmt(pos.market_value, 0)}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ color: isProfit ? PROFIT_CLR : SELL_CLR, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>
                          {isProfit ? '+' : ''}{currSym}{fmt(pos.profit_loss, 0)}
                        </div>
                        <div style={{ color: isProfit ? PROFIT_CLR : SELL_CLR, fontSize: 11 }}>
                          ({isProfit ? '+' : ''}{fmt(pos.profit_loss_pct)}%)
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <Btn
                          color={SELL_CLR}
                          disabled={!canSell}
                          onClick={() => setSellModal({ symbol: sym, pos })}
                          style={{ padding: '5px 14px', fontSize: 12 }}
                        >
                          {zhEn('卖出', 'Sell')}
                        </Btn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 4. Transaction History ── */}
      <Card>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setShowTxn((v) => !v)}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c084fc' }}>
            {zhEn('交易记录', 'Transaction History')}
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginLeft: 8 }}>({txns.length})</span>
          </div>
          <span style={{ color: MUTED, fontSize: 12 }}>{showTxn ? '▲' : '▼'}</span>
        </div>

        {showTxn && (
          txns.length === 0 ? (
            <div style={{ color: MUTED, fontSize: 13, textAlign: 'center', padding: '20px 0', marginTop: 12 }}>
              {zhEn('暂无交易记录', 'No transactions yet')}
            </div>
          ) : (
            <div style={{ marginTop: 14, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: MUTED, fontSize: 11, textTransform: 'uppercase' }}>
                    {[zhEn('日期','Date'), zhEn('类型','Type'), zhEn('股票','Stock'), zhEn('数量','Shares'), zhEn('价格','Price'), zhEn('手续费','Comm.'), zhEn('盈亏','P&L')].map((h) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: `1px solid ${BDR}`, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...txns].reverse().map((tx, i) => {
                    const isBuy = tx.type === 'buy'
                    const pl    = tx.profit_loss
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid rgba(138,180,248,0.05)` }}>
                        <td style={{ padding: '8px 10px', color: MUTED }}>{tx.date}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <Pill color={isBuy ? BUY_CLR : SELL_CLR}>
                            {isBuy ? zhEn('买入','BUY') : zhEn('卖出','SELL')}
                          </Pill>
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>
                          <span style={{ color: '#8ab4f8', fontFamily: 'monospace', marginRight: 6 }}>{tx.symbol}</span>
                          {tx.name}
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>{tx.shares}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>¥{fmt(tx.price)}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: SELL_CLR }}>¥{fmt(tx.commission)}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                          {pl != null ? (
                            <span style={{ color: pl >= 0 ? BUY_CLR : SELL_CLR, fontWeight: 700 }}>
                              {pl >= 0 ? '+' : ''}¥{fmt(pl, 0)}
                            </span>
                          ) : <span style={{ color: MUTED }}>--</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      {/* ── 5. Leaderboard ── */}
      <Card>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setShowBoard((v) => !v)}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>
            {zhEn('全球排行榜 TOP 20', 'Global Leaderboard TOP 20')}
          </div>
          <span style={{ color: MUTED, fontSize: 12 }}>{showBoard ? '▲' : '▼'}</span>
        </div>

        {showBoard && (
          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            {leaderboard.length === 0 ? (
              <div style={{ color: MUTED, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                {zhEn('加载排行榜...', 'Loading leaderboard...')}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: MUTED, fontSize: 11, textTransform: 'uppercase' }}>
                    {[zhEn('排名','Rank'), zhEn('昵称','Nickname'), zhEn('总资产','Total Value'), zhEn('收益率','Return')].map((h) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: `1px solid ${BDR}`, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.rank}
                      style={{
                        background: entry.is_me ? 'rgba(138,180,248,0.08)' : 'transparent',
                        borderBottom: `1px solid rgba(138,180,248,0.05)`,
                      }}
                    >
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: entry.rank <= 3 ? '#fbbf24' : MUTED }}>
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                      </td>
                      <td style={{ padding: '9px 10px', color: entry.is_me ? '#8ab4f8' : 'var(--text-primary)', fontWeight: entry.is_me ? 700 : 400 }}>
                        {entry.nickname}
                        {entry.is_me && <span style={{ fontSize: 10, color: '#8ab4f8', marginLeft: 6, background: 'rgba(138,180,248,0.15)', padding: '1px 5px', borderRadius: 4 }}>{zhEn('我', 'ME')}</span>}
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>¥{fmt(entry.total_value, 0)}</td>
                      <td style={{ padding: '9px 10px' }}><PctBadge value={entry.return_pct} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', paddingBottom: 8 }}>
        {zhEn('模拟交易 · 初始资金100万 · T+1规则 · 买0.03%+卖0.13%手续费', 'Paper Trading · ¥1M start · T+1 · Buy 0.03% / Sell 0.13% fee')}
      </div>
    </div>
  )
}
