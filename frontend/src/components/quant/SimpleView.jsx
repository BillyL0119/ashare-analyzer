import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useCompareStore from '../../store/compareStore'

// "简单模式" of the quant desk: the same data as the full desk, told in plain words for a student.
// It describes what the rules pick and how the rules work; it does not tell anyone what to buy.

const SECTOR_ZH = { 'Basic Materials': '基础材料', 'Communication Services': '通信服务', 'Consumer Cyclical': '可选消费',
  'Consumer Defensive': '必需消费', Energy: '能源', 'Financial Services': '金融', Healthcare: '医疗保健', Industrials: '工业',
  'Real Estate': '房地产', Technology: '科技', Utilities: '公用事业' }

const WHY = {
  zh: { earnings_yield: '相对利润便宜', sales_yield: '相对销售额便宜', fcf_yield: '相对现金流便宜', ebitda_ev: '相对经营利润便宜',
    gross_profit: '资产赚钱效率高', roe: '给股东赚钱多', share_issuance: '在回购股票、不稀释股东' },
  en: { earnings_yield: 'cheap for its profits', sales_yield: 'cheap for its sales', fcf_yield: 'cheap for its cash flow',
    ebitda_ev: 'cheap for its operating profit', gross_profit: 'earns a lot on its assets', roe: 'high return for shareholders',
    share_issuance: 'buying back shares' },
}

const T = {
  zh: {
    title: '这周一句话', more: '显示全部 50 只', less: '只看前 12 只',
    month: (inv) => (inv ? '这个月按趋势规则：正常持有股票。' : '这个月按趋势规则：持有现金（或短期国债）。'),
    next: (above, gap) => (above
      ? `大盘目前在 10 个月均线上方 ${gap}%，如果月底还在上方，下个月继续持股。`
      : `大盘目前在 10 个月均线下方 ${Math.abs(gap)}%，如果月底还在下方，下个月规则会改成持现金。`),
    picks: '按选股规则，这周排名前 50 的公司大多是：相对利润和现金流比较便宜、赚钱能力强、在回购自己股票的公司。',
    honest: '老实说：这套规则过去 22 年里大约一半年份跑输标普 500 指数。不想自己挑股票的话，直接买标普 500 指数基金，历史上的结果和它差不多。',
    listTitle: '规则选出的股票', listSub: '排名越靠前，综合分越高。绿色是被选上的原因，红色是要注意的风险。点股票可以看详细行情。',
    risk: { short: '被大量卖空，波动可能很大', down: (p) => `过去一年跌了 ${Math.abs(p)}%`, up: (p) => `过去一年涨了 ${p}%，注意追高` },
    howTitle: '如果照这套规则操作，大概是这样做的', howSub: '这里只是说明规则怎么运作，用的是假设的数字，不是给你的买卖建议。',
    steps: [
      ['先想清楚投多少', '只用亏了也不影响生活的钱。这套规则历史上最差的时候从高点跌了一半以上（2008 年），问问自己：账户跌 30% 能不能睡得着。'],
      ['平均分成 50 份', '规则的做法是把钱平均分给前 50 只股票。比如假设有 1 万美元，每只大约 200 美元；很多券商支持买零股，股价再高也能买。'],
      ['每 3 个月看一次', '不用天天盯盘。每个季度看一次排名：还在前 30%（约前 295 名）的继续拿着，掉出去的换成新进前 50 的。'],
      ['（可选）用趋势规则躲大跌', '每个月最后一个交易日看一眼：大盘跌破 10 个月均线，下个月就先持有现金或短期国债。它能把大跌时的亏损减半左右，但牛市里会少赚。'],
      ['最简单的替代', '不想管 50 只股票：只买一只标普 500 指数基金（比如 SPY、VOO），长期拿着。'],
    ],
    pastTitle: '过去的成绩（最近 6 年，这段只检验过一次）',
    pastCols: ['做法', '每年平均', '最差时从高点跌了'],
    pastRows: { index: '只买标普 500 指数', 'model (step E)': '照选股规则买 50 只', 'index + trend rule': '指数 + 趋势规则躲大跌', 'model + inv-vol + sector + trend': '选股 + 风险控制 + 趋势规则' },
    pastNote: '过去的成绩不代表未来。选股规则最近 6 年比指数好，但在 2005–2020 年几乎没有优势，好坏很依赖市场风格。',
    liveNote: (d, n) => `从 ${d} 开始，网站会按规则真实记录这 50 只股票的表现（目前 ${n} 个交易日），在专业模式里可以看到。`,
  },
  en: {
    title: 'This week in one line', more: 'Show all 50', less: 'Show the first 12',
    month: (inv) => (inv ? 'This month the trend rule says: hold stocks.' : 'This month the trend rule says: hold cash (or short-term Treasury bills).'),
    next: (above, gap) => (above
      ? `The market is ${gap}% above its 10-month average; if it stays above at month-end, next month stays invested.`
      : `The market is ${Math.abs(gap)}% below its 10-month average; if it is still below at month-end, next month the rule holds cash.`),
    picks: 'The ranking’s top 50 this week are mostly companies that are cheap for their profits and cash flow, earn well, and buy back their own shares.',
    honest: 'Honestly: over the last 22 years this rule trailed the S&P 500 in about half the years. If you would rather not pick stocks, an S&P 500 index fund did about as well.',
    listTitle: 'What the rule picks', listSub: 'Higher rank = higher combined score. Green = why it was picked, red = risks to watch. Tap a stock for its quote page.',
    risk: { short: 'heavily shorted, may swing a lot', down: (p) => `down ${Math.abs(p)}% in a year`, up: (p) => `up ${p}% in a year, careful chasing it` },
    howTitle: 'How the rule would be followed', howSub: 'This only explains how the rule works, with made-up numbers. It is not advice on what you should buy.',
    steps: [
      ['Decide how much', 'Only money you can afford to lose. At its worst (2008) this rule fell by more than half from its high: could you sleep through a 30% drop?'],
      ['Split it into 50 equal parts', 'The rule puts equal money into each of the top 50. With a made-up $10,000 that is about $200 each; many brokers sell fractional shares.'],
      ['Look again every 3 months', 'No daily watching. Each quarter: keep names still in the top 30% (about the top 295), replace the rest with new top-50 names.'],
      ['(Optional) dodge big falls with the trend rule', 'On the last trading day of each month: if the market is below its 10-month average, hold cash or Treasury bills next month. It roughly halved big losses but earns less in bull markets.'],
      ['The simplest alternative', 'Not up for 50 stocks: one S&P 500 index fund (such as SPY or VOO), held for the long run.'],
    ],
    pastTitle: 'Past results (last six years, tested once)',
    pastCols: ['Way', 'Per year', 'Worst fall from a high'],
    pastRows: { index: 'Just the S&P 500 index', 'model (step E)': 'The rule’s 50 stocks', 'index + trend rule': 'Index + trend rule', 'model + inv-vol + sector + trend': 'Stocks + risk controls + trend rule' },
    pastNote: 'Past results do not predict the future. The stock rule beat the index in the last six years but had almost no edge in 2005–2020; it depends on which kinds of stocks are in favour.',
    liveNote: (d, n) => `From ${d} the site records these 50 stocks for real (${n} trading days so far); see the full view.`,
  },
}

function reasons(r, lang) {
  const why = WHY[lang]
  return Object.entries(r.factors || {}).filter(([, v]) => v != null && v >= 85)
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => why[f]).filter(Boolean)
}

function risks(r, L, hi) {
  const m = r.metrics || {}
  const out = []
  if (m.short_pct != null && m.short_pct >= hi) out.push(L.risk.short)
  if (m.return_1y != null && m.return_1y <= -30) out.push(L.risk.down(Math.round(m.return_1y)))
  if (m.return_1y != null && m.return_1y >= 60) out.push(L.risk.up(Math.round(m.return_1y)))
  return out
}

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
          <li><span className={`qd-dot ${thisMonth ? 'up' : 'down'}`} aria-hidden="true" />{L.month(thisMonth)} {L.next(t.above, t.gap_pct)}</li>
          <li><span className="qd-dot neutral" aria-hidden="true" />{L.picks}</li>
          <li><span className="qd-dot neutral" aria-hidden="true" />{L.honest}</li>
        </ul>
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
