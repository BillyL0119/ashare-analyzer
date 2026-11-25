import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useCompareStore from '../../store/compareStore'
import { SECTOR_ZH, T, reasons, risks } from './simpleText'
import SplitTrend from './SplitTrend'
import { splitSummary } from './splitText'

// "简单模式" of the quant desk: the same data as the full desk, told in plain words for a student.
// It describes what the rules pick and how the rules work; it does not tell anyone what to buy.

export default function SimpleView({ d, lang }) {
  const L = T[lang === 'zh' ? 'zh' : 'en']
  const zh = lang === 'zh'
  const [all, setAll] = useState(false)
  const navigate = useNavigate()
  const t = d.trend
  const top = d.ranking.filter((r) => r.top)
  const shown = all ? top : top.slice(0, 12)
  const hi = d.short_interest?.high_pct ?? 10
  const v = d.validation
  const open = (r) => {
    useCompareStore.getState().switchMarketAndAddSymbol('us', { code: r.ticker, name: r.name || r.ticker })
    navigate(`/stock/us/${encodeURIComponent(r.ticker)}`)
  }
  const thisMonth = t.provisional ? t.this_month_invested : t.above
  return (
    <>
      <section className="qp-card qd-simple-top" aria-label={L.title}>
        <div className="qp-head"><h3 className="qp-h">{L.title}</h3></div>
        <ul className="qd-points">
          <li><span className={`qd-dot ${(t.split ? t.split.fraction_now >= 0.5 : thisMonth) ? 'up' : 'down'}`} aria-hidden="true" />{t.split ? splitSummary(t.split, zh) : `${L.month(thisMonth)} ${L.next(t.above, t.gap_pct)}`}</li>
          <li><span className="qd-dot neutral" aria-hidden="true" />{L.picks}</li>
          <li><span className="qd-dot neutral" aria-hidden="true" />{L.honest}</li>
        </ul>
        <SplitTrend split={t.split} live={t.split?.live} reviewAfter={d.live?.next_review_after} zh={zh} />
      </section>

      <section className="qp-card" aria-label={L.listTitle}>
        <div className="qp-head"><div>
          <h3 className="qp-h">{L.listTitle}</h3>
          <p className="qd-sub">{L.listSub}</p>
        </div></div>
        <ol className="qd-cards">
          {shown.map((r) => {
            const why = reasons(r, zh ? 'zh' : 'en')
            const bad = risks(r, L, hi)
            return (
              <li key={r.ticker} className="qd-card">
                <button type="button" className="qd-card-btn" onClick={() => open(r)}>
                  <span className="qd-card-rank">{r.rank}</span>
                  <span className="qd-card-name">
                    <b>{zh && r.name_zh ? r.name_zh : r.name}</b>
                    <span className="qd-card-meta">{r.ticker} · {zh ? SECTOR_ZH[r.sector] || r.sector : r.sector}</span>
                  </span>
                </button>
                <div className="qd-tags">
                  {why.map((w) => <span key={w} className="qd-tag good">{w}</span>)}
                  {bad.map((w) => <span key={w} className="qd-tag warn">{w}</span>)}
                </div>
              </li>
            )
          })}
        </ol>
        {top.length > 12 && (
          <button type="button" className="qd-btn qd-btn-quiet" onClick={() => setAll((x) => !x)}>{all ? L.less : L.more}</button>
        )}
      </section>

      <section className="qp-card" aria-label={L.howTitle}>
        <div className="qp-head"><div>
          <h3 className="qp-h">{L.howTitle}</h3>
          <p className="qd-sub">{L.howSub}</p>
        </div></div>
        <ol className="qd-steps-list">
          {L.steps.map(([h, p]) => <li key={h}><b>{h}</b><p>{p}</p></li>)}
        </ol>
      </section>

      {v && (
        <section className="qp-card" aria-label={L.pastTitle}>
          <div className="qp-head"><h3 className="qp-h">{L.pastTitle}</h3></div>
          <div className="fl-table-wrap">
            <table className="fl-table qd-steps">
              <thead><tr>{L.pastCols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
              <tbody>
                {['index', 'model (step E)', 'index + trend rule', 'model + inv-vol + sector + trend'].map((c) => {
                  const s = v.holdout[c] || {}
                  return (
                    <tr key={c}>
                      <td>{L.pastRows[c]}</td>
                      <td>{s.cagr != null ? `${s.cagr.toFixed(1)}%` : '—'}</td>
                      <td>{s.max_drawdown != null ? `−${Math.abs(s.max_drawdown).toFixed(0)}%` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="qd-foot">{L.pastNote}</p>
          {d.live && <p className="qd-foot">{L.liveNote(d.live.started, d.live.trading_days)}</p>}
        </section>
      )}
    </>
  )
}
