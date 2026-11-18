import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DASH, fmtDate, fmtMoney, fmtCompact, fmtInt, fmtPrice, isNum } from '../quotepage/format'

const SHOW = 100        // a busy earnings day has several hundred rows: start with the biggest 100

const eps = (v, lang) => (isNum(v) ? `${v < 0 ? '−' : ''}$${fmtPrice(Math.abs(v), lang, 2)}` : DASH)
// $0.0655 keeps its fourth decimal, $0.5 reads $0.50
const perShare = (v, lang) => (isNum(v)
  ? `$${new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : lang, { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v)}`
  : DASH)

function Ticker({ t, sym }) {
  const navigate = useNavigate()
  return (
    <button type="button" className="ev-sym" aria-label={t.openStock(sym)} onClick={() => navigate(`/stock/us/${encodeURIComponent(sym)}`)}>
      {sym}
    </button>
  )
}

const COLS = {
  earnings: (t, lang) => [
    { h: t.col.symbol, left: true, cell: (r) => <Ticker t={t} sym={r.symbol} />, cls: 'sym' },
    { h: t.col.company, left: true, cell: (r) => r.name, cls: 'co' },
    { h: t.col.quarter, cell: (r) => r.fiscal_quarter || DASH },
    { h: t.col.reports, cell: (r) => t.timing[r.timing || 'none'] },
    { h: t.col.epsForecast, cell: (r) => eps(r.eps_estimate, lang) },
    { h: t.col.estimates, cell: (r) => (isNum(r.estimates) ? fmtInt(r.estimates, lang) : DASH) },
    { h: t.col.lastEps, cell: (r) => eps(r.last_year_eps, lang) },
    { h: t.col.lastReported, cell: (r) => fmtDate(r.last_year_date, lang) },
    { h: t.col.marketCap, cell: (r) => fmtMoney(r.market_cap, lang), cls: 'strong' },
  ],
  ipos: (t, lang) => [
    { h: t.col.symbol, left: true, cell: (r) => (r.symbol && r.status === 'priced' ? <Ticker t={t} sym={r.symbol} /> : (r.symbol || DASH)), cls: 'sym' },
    { h: t.col.company, left: true, cell: (r) => r.company, cls: 'co' },
    { h: t.col.exchange, cell: (r) => r.exchange || DASH },
    { h: t.col.price, cell: (r) => (isNum(r.price) ? `$${fmtPrice(r.price, lang)}` : r.price_text ? `$${r.price_text.replace('-', ' – $')}` : DASH) },
    { h: t.col.shares, cell: (r) => fmtCompact(r.shares, lang) },
    { h: t.col.dealSize, cell: (r) => fmtMoney(r.deal_size, lang), cls: 'strong' },
    { h: t.col.status, cell: (r) => t.status[r.status] || r.status },
  ],
  splits: (t) => [
    { h: t.col.symbol, left: true, cell: (r) => <Ticker t={t} sym={r.symbol} />, cls: 'sym' },
    { h: t.col.company, left: true, cell: (r) => r.name, cls: 'co' },
    { h: t.col.ratio, cell: (r) => r.ratio || DASH, cls: 'strong' },
    { h: t.col.effective, cell: (r, lang) => fmtDate(r.effective_date, lang) },
  ],
  dividends: (t, lang) => [
    { h: t.col.symbol, left: true, cell: (r) => <Ticker t={t} sym={r.symbol} />, cls: 'sym' },
    { h: t.col.company, left: true, cell: (r) => r.name, cls: 'co' },
    { h: t.col.dividend, cell: (r) => perShare(r.amount, lang), cls: 'strong' },
    { h: t.col.annual, cell: (r) => perShare(r.annual, lang) },
    { h: t.col.record, cell: (r) => fmtDate(r.record_date, lang) },
    { h: t.col.payment, cell: (r) => fmtDate(r.payment_date, lang) },
    { h: t.col.announced, cell: (r) => fmtDate(r.announcement_date, lang) },
  ],
}

export default function EventTable({ type, rows, t, lang }) {
  const [all, setAll] = useState(false)
  const cols = COLS[type](t, lang)
  const shown = all ? rows : rows.slice(0, SHOW)
  return (
    <>
      <div className="qp-scroll">
        <table className="qp-table">
          <thead>
            <tr>{cols.map((c) => <th key={c.h} scope="col" style={c.left ? { textAlign: 'left' } : undefined}>{c.h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={`${r.symbol || r.company}-${i}`}>
                {cols.map((c) => (
                  <td key={c.h} className={c.cls} style={c.left ? { textAlign: 'left' } : undefined}>{c.cell(r, lang)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!all && rows.length > SHOW && (
        <p className="ev-note"><button type="button" className="qp-link" onClick={() => setAll(true)}>{t.showAll(rows.length)}</button></p>
      )}
    </>
  )
}
