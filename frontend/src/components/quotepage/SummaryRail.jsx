import { useState } from 'react'
import { riseColor, fallColor } from '../../utils/chartTheme'
import useThemeStore from '../../store/themeStore'
import useQuoteApi from './useQuoteApi'
import { isNum, fmtPrice, fmtMoney, fmtRatio, fmtSignedPct, changeColor } from './format'
import summaryStrings, { fill } from './summaryStrings'
import './quotepage.css'
import './summary.css'

const clampPct = (v) => Math.min(100, Math.max(0, v))

function AnalystCard({ a, price, lang, S }) {
  useThemeStore((s) => s.theme)
  const { target, target_low: low, target_high: high } = a
  const total = (a.buy || 0) + (a.hold || 0) + (a.sell || 0)
  const haveScale = [low, high].every(isNum) && high > low
  const lo = haveScale ? Math.min(low, isNum(price) ? price : low) : 0
  const hi = haveScale ? Math.max(high, isNum(price) ? price : high) : 1
  const at = (v) => `${clampPct(((v - lo) / (hi - lo)) * 100)}%`
  const upside = isNum(target) && isNum(price) && price > 0 ? (target / price - 1) * 100 : null
  const cell = (k, v) => (
    <div><span className="k">{k}</span><span className="v">{isNum(v) ? `$${fmtPrice(v, lang)}` : '—'}</span></div>
  )
  return (
    <section className="qp-card" aria-label={S.analystsTitle}>
      <div className="qp-head"><h3 className="qp-h">{S.analystsTitle}</h3></div>
      <p className="qp-sub" style={{ margin: '-6px 0 0' }}>{S.analystsHint}</p>
      {haveScale && (
        <div className="qs-scale" aria-hidden="true">
          {isNum(target) && <i className="avg" style={{ left: at(target) }} />}
          {isNum(price) && <i className="now" style={{ left: at(price) }} />}
        </div>
      )}
      <div className="qs-targets">
        {cell(S.targetLow, low)}{cell(S.targetAvg, target)}{cell(S.targetNow, price)}{cell(S.targetHigh, high)}
      </div>
      {upside !== null && (
        <p className="qp-note">{fill(upside >= 0 ? S.upside : S.downside, { d: Math.abs(upside).toFixed(1) })}</p>
      )}
      {total > 0 && (
        <>
          <div className="qs-split" aria-hidden="true">
            {a.buy > 0 && <i style={{ flex: a.buy, background: riseColor('us') }} />}
            {a.hold > 0 && <i style={{ flex: a.hold, background: 'var(--text-muted)' }} />}
            {a.sell > 0 && <i style={{ flex: a.sell, background: fallColor('us') }} />}
          </div>
          <div className="qs-split-legend">
            <span><b>{a.buy || 0}</b> {S.buy}</span>
            <span><b>{a.hold || 0}</b> {S.hold}</span>
            <span><b>{a.sell || 0}</b> {S.sell}</span>
          </div>
        </>
      )}
    </section>
  )
}

function PeersCard({ code, lang, S, onOpenStock }) {
  const { data } = useQuoteApi(`/api/us/quote/${code}/peers`, { ttl: 300_000 })
  const rows = data?.peers || []
  if (!rows.length) return null
  const hint = data.basis === 'industry' ? S.peersHintIndustry : S.peersHintSector
  return (
    <section className="qp-card" aria-label={S.peersTitle}>
      <div className="qp-head"><h3 className="qp-h">{S.peersTitle}</h3></div>
      <p className="qp-sub" style={{ margin: '-6px 0 8px' }}>{fill(hint, { group: data.group })}</p>
      <div className="qp-scroll">
        <table className="qp-table qs-peers">
          <thead>
            <tr><th scope="col">{S.colSymbol}</th><th scope="col">{S.colPriceChange}</th><th scope="col">{S.colCapPe}</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.symbol}>
                <td>
                  <button type="button" className="qp-link" onClick={() => onOpenStock?.(p.symbol, p.name)}>{p.symbol}</button>
                  <span className="nm" title={p.name}>{p.name}</span>
                </td>
                <td className="strong">
                  {isNum(p.price) ? `$${fmtPrice(p.price, lang)}` : '—'}
                  <span className="two" style={{ color: changeColor(p.change_pct) }}>{fmtSignedPct(p.change_pct)}</span>
                </td>
                <td>
                  {fmtMoney(p.market_cap, lang)}
                  <span className="two">{S.pe} {fmtRatio(p.pe, lang, 1)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function shorten(text, n = 280) {
  if (text.length <= n) return text
  const cut = text.slice(0, n)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 40))}…`
}

function ProfileCard({ p, S }) {
  const [open, setOpen] = useState(false)
  const desc = p.description || ''
  const long = desc.length > 280
  let host = null
  try { host = p.website ? new URL(p.website).hostname.replace(/^www\./, '') : null } catch { host = null }
  const facts = [[S.sector, p.sector], [S.industry, p.industry]].filter(([, v]) => v)
  return (
    <section className="qp-card qs-profile" aria-label={S.profileTitle}>
      <div className="qp-head"><h3 className="qp-h">{S.profileTitle}</h3></div>
      <dl className="qp-dl">
        {facts.map(([k, v]) => [<dt key={`k${k}`}>{k}</dt>, <dd key={`v${k}`}>{v}</dd>])}
        {host && [
          <dt key="wk">{S.website}</dt>,
          <dd key="wv"><a className="qp-link" href={p.website} target="_blank" rel="noopener noreferrer">{host}</a></dd>,
        ]}
      </dl>
      {desc && (
        <p className="qs-desc">
          {open || !long ? desc : shorten(desc)}
          {long && (
            <>
              {' '}
              <button type="button" className="qp-link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? S.less : S.more}</button>
            </>
          )}
        </p>
      )}
    </section>
  )
}

export default function SummaryRail({ code, lang, live, onOpenStock }) {
  const S = summaryStrings(lang)
  const f = useQuoteApi(`/api/us/fundamentals/${code}`, { ttl: 300_000 })
  const a = f.data?.analysts
  const p = f.data?.profile
  const hasAnalysts = a && (isNum(a.target) || isNum(a.target_low) || (a.buy || 0) + (a.hold || 0) + (a.sell || 0) > 0)
  const hasProfile = p && (p.description || p.sector || p.industry || p.website)
  return (
    <aside className="qs-rail">
      {f.loading && <div className="qp-skel" style={{ height: 190 }} aria-hidden="true" />}
      {hasAnalysts && <AnalystCard a={a} price={live?.price} lang={lang} S={S} />}
      <PeersCard code={code} lang={lang} S={S} onOpenStock={onOpenStock} />
      {hasProfile && <ProfileCard p={p} S={S} />}
    </aside>
  )
}
