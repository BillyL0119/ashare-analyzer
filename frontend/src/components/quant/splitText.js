// Words for the split trend rule (SplitTrend.jsx, the simple views). Kept outside .jsx for react-refresh.

const money = (v) => (v == null ? '—' : `$${Number(v).toFixed(2)}`)
const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`)

export const SPLIT = {
  zh: {
    title: '趋势规则：分 5 份执行',
    sub: '把用于这条规则的钱分成 5 份，每份在月底后的不同交易日各自检查一次',
    now: (n, total) => `现在 ${total} 份里有 ${n} 份持股，${total - n} 份持现金（短期国债）。`,
    colPart: '份', colDay: '检查日', colTrigger: '触发价（SPY 收盘）', colState: '结果',
    part: (d) => `第 ${d + 1} 份`,
    noHistory: '历史不足',
    decided: (close, thr, inv) => `SPY 收于 ${money(close)}，${inv ? '不低于' : '低于'} ${money(thr)} → ${inv ? '持股' : '持现金'}`,
    tradeOn: (day, change) => (change ? `，${day} 收盘前调整` : '，不用调整'),
    closeCall: '（离触发价很近，以研究台周更新为准）',
    waiting: (gap) => `SPY 现在比触发价 ${pct(gap)}`,
    holdNow: (inv) => (inv ? '目前持股' : '目前持现金'),
    spyNote: (d, c) => `SPY 最新收盘 ${money(c)}（${d}）。触发价由研究台指数换算成 SPY 价格，两者短期走势几乎一致，接近触发价时会注明。`,
    results: (r) => `历史检验（分 5 份，看到信号第二天交易）：2005–2020 年每年 ${r.dev.trend.cagr}%，最大回撤 ${r.dev.trend.max_drawdown}%（只持指数 ${r.dev.index.cagr}%、${r.dev.index.max_drawdown}%）；最近 6 年每年 ${r.holdout.trend.cagr}%、${r.holdout.trend.max_drawdown}%（指数 ${r.holdout.index.cagr}%、${r.holdout.index.max_drawdown}%）。分 5 份是 2026-11-25 看过每个检查日的结果后定下的：它就是 5 个检查日的平均，没有调参数，但也没有像其他方法那样单独留出年份检验。`,
    calendar: '加入日历（.ics）',
    calendarNote: '下载后用手机或电脑日历打开：每个检查日当天早上 9 点提醒，还有季度复查日。',
    evCheck: (d) => `趋势规则检查：第 ${d + 1} 份`,
    evCheckBody: '美股收盘后打开量化研究台看这一份的结果；如果要从持股换成现金（或反过来），在下一个交易日收盘前执行。',
    evReview: '量化研究台：季度复查前 50 名',
    evReviewBody: '还在前 30% 的继续持有，掉出去的换成新进前 50 的公司。',
    holidays: (y) => `休市日只录入到 ${y} 年，之后的检查日可能差一天。`,
  },
  en: {
    title: 'Trend rule, in five parts',
    sub: 'The money for this rule is split into 5 parts; each part checks on a different trading day after month-end',
    now: (n, total) => `${n} of ${total} parts are in stocks now, ${total - n} in cash (Treasury bills).`,
    colPart: 'Part', colDay: 'Check day', colTrigger: 'Trigger (SPY close)', colState: 'Result',
    part: (d) => `Part ${d + 1}`,
    noHistory: 'Not enough history',
    decided: (close, thr, inv) => `SPY closed at ${money(close)}, ${inv ? 'at or above' : 'below'} ${money(thr)} → ${inv ? 'stocks' : 'cash'}`,
    tradeOn: (day, change) => (change ? `; switch by the close on ${day}` : '; no change'),
    closeCall: ' (very close to the trigger: go by the next weekly update)',
    waiting: (gap) => `SPY is ${pct(gap)} from the trigger now`,
    holdNow: (inv) => (inv ? 'in stocks now' : 'in cash now'),
    spyNote: (d, c) => `Latest SPY close ${money(c)} (${d}). Triggers are the desk's index converted to SPY prices; the two move almost together over a few weeks, and near misses are flagged.`,
    results: (r) => `Tested (five parts, trading the day after each check): 2005–2020 ${r.dev.trend.cagr}% a year, worst drop ${r.dev.trend.max_drawdown}% (index alone ${r.dev.index.cagr}%, ${r.dev.index.max_drawdown}%); last six years ${r.holdout.trend.cagr}%, ${r.holdout.trend.max_drawdown}% (index ${r.holdout.index.cagr}%, ${r.holdout.index.max_drawdown}%). The five-part split was chosen on 2026-11-25 after seeing each check day's results: it is simply their average, with nothing fitted, but unlike the other methods it had no years set aside for a separate test.`,
    calendar: 'Add to calendar (.ics)',
    calendarNote: 'Open the file in your phone or computer calendar: a 9 am reminder on each check day, plus the quarterly reviews.',
    evCheck: (d) => `Trend rule check: part ${d + 1}`,
    evCheckBody: "After the US close, open the quant desk for this part's result; if it switches between stocks and cash, do it by the next trading day's close.",
    evReview: 'Quant desk: quarterly review of the top 50',
    evReviewBody: 'Keep names still in the top 30%; replace the rest with new top-50 names.',
    holidays: (y) => `Market holidays are entered up to ${y}; later check days may be off by a day.`,
  },
}

// One-line summary for the simple views
export function splitSummary(split, zh) {
  if (!split) return null
  const S = SPLIT[zh ? 'zh' : 'en']
  const n = Math.round((split.fraction_now ?? 1) * split.parts_n)
  const days = split.parts.map((p) => p.next_check).sort()
  const window = days.length ? (zh ? `下一轮检查：${days[0]} 到 ${days[days.length - 1]}，每天一份。` : `Next checks: ${days[0]} to ${days[days.length - 1]}, one part a day.`) : ''
  return `${zh ? '趋势规则（分 5 份）：' : 'Trend rule (five parts): '}${S.now(n, split.parts_n)} ${window}`
}

// An .ics file with every check day of the next twelve months (all-day events, 9 am reminder) and the review dates
export function buildIcs(split, reviews, zh) {
  const S = SPLIT[zh ? 'zh' : 'en']
  const esc = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`)
  const day = (iso) => iso.replace(/-/g, '')
  const next = (iso) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const event = (uid, iso, title, body) => [
    'BEGIN:VEVENT', `UID:${uid}@bestfriendstock.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day(iso)}`,
    `DTEND;VALUE=DATE:${day(next(iso))}`, `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(body)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER;RELATED=START:PT9H', `DESCRIPTION:${esc(title)}`, 'END:VALARM', 'END:VEVENT',
  ]
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//bestfriendstock//quant desk//EN', 'CALSCALE:GREGORIAN']
  for (const c of split.calendar || []) lines.push(...event(`trend-${c.date}-${c.part}`, c.date, S.evCheck(c.part), S.evCheckBody))
  for (const r of reviews) lines.push(...event(`review-${r}`, r, S.evReview, S.evReviewBody))
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

// The quarterly review dates after `after` (every 91 days), for the calendar
export function reviewDates(after, count = 4) {
  if (!after) return []
  const out = []
  const d = new Date(`${after}T12:00:00Z`)
  for (let k = 0; k < count; k++) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 91)
  }
  return out
}
