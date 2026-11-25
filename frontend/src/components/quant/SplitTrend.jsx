import { SPLIT, buildIcs, reviewDates } from './splitText'

// The split trend rule (research/trend_split.py): five parts, each checked on its own trading day after month-end.
// Shows each part's next check day, its trigger as an SPY close and, once SPY has closed on that day, the decision
// (from the server's live reading). Also a calendar file with every check day and the quarterly reviews.

export default function SplitTrend({ split, live, reviewAfter, zh }) {
  if (!split) return null
  const S = SPLIT[zh ? 'zh' : 'en']
  const now = live?.parts ? Object.fromEntries(live.parts.map((p) => [p.part, p])) : {}
  const n = Math.round((split.fraction_now ?? 1) * split.parts_n)
  const download = () => {
    const ics = buildIcs(split, reviewDates(reviewAfter), zh)
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'bfs-quant-checks.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="qd-split">
      <div className="qd-split-head">
        <div>
          <h4 className="qd-split-title">{S.title}</h4>
          <p className="qd-sub">{S.sub}</p>
        </div>
        <button type="button" className="qd-btn" onClick={download}>{S.calendar}</button>
      </div>
      <p className="qd-split-now">{S.now(n, split.parts_n)}</p>
      <div className="fl-table-wrap">
        <table className="fl-table qd-split-table">
          <thead>
            <tr><th scope="col">{S.colPart}</th><th scope="col">{S.colDay}</th><th scope="col">{S.colTrigger}</th><th scope="col">{S.colState}</th></tr>
          </thead>
          <tbody>
            {split.parts.map((p) => {
              const l = now[p.part] || {}
              let state
              if (!p.threshold_ratio) state = S.noHistory
              else if (l.invested != null) state = S.decided(l.checked_close, l.threshold_spy, l.invested) + S.tradeOn(l.trade_on, l.changes) + (l.close_call ? S.closeCall : '')
              else state = `${S.holdNow(p.last_invested)} · ${l.gap_pct != null ? S.waiting(l.gap_pct) : ''}`
              return (
                <tr key={p.part}>
                  <td>{S.part(p.part)}</td>
                  <td>{p.next_check}</td>
                  <td>{l.threshold_spy != null ? `$${l.threshold_spy.toFixed(2)}` : '—'}</td>
                  <td className={l.invested == null ? '' : l.invested ? 'qd-up' : 'qd-down'}>{state}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {live?.spy_latest && <p className="qd-foot">{S.spyNote(live.spy_latest.date, live.spy_latest.close)}</p>}
      {split.results && <p className="qd-foot">{S.results(split.results)}</p>}
      <p className="qd-foot">{S.calendarNote} {S.holidays(split.holidays_known_until)}</p>
    </div>
  )
}
