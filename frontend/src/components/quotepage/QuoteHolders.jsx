// Holders tab: who owns the stock (institutions), what insiders did, and short interest.
// Data: /api/us/quote/{symbol}/holders (Nasdaq). Props: { stocks, market, lang, onOpenStock }
import './quotepage.css'
import './holders.css'
import ReactECharts from '../../lib/echarts'
import useThemeStore from '../../store/themeStore'
import { THEME } from '../../utils/chartHelpers'
import useActiveTicker from './useActiveTicker'
import useQuoteApi from './useQuoteApi'
import TickerSwitch from './TickerSwitch'
import { DASH, fmtCompact, fmtDate, fmtInt, fmtMoney, fmtPct, fmtPrice, fmtRatio, fmtShortDate, fmtSignedPct, isNum, changeColor } from './format'
import holdersStrings, { fill } from './holdersStrings'
import { Section, SkeletonBlocks, SourceLine, Tip } from './holdersParts'
import { cssVar } from './holdersUtil'

const signed = (v, lang) => (isNum(v) && v !== 0 ? `${v > 0 ? '+' : '−'}${fmtCompact(Math.abs(v), lang)}` : fmtCompact(v, lang))

function OwnershipStrip({ own, t, lang }) {
  const items = [
    ['instPct', fmtPct(own.institutional_pct, 1)],
    ['instCount', fmtInt(own.institutions_count, lang)],
    ['sharesOut', fmtCompact(own.shares_outstanding, lang)],
    ['instValue', fmtMoney(own.total_value, lang)],
  ]
  return (
    <Section title={t.ownH} how={t.ownHow}>
      <dl className="qo-strip">
        {items.map(([k, v]) => (
          <div key={k}>
            <dt><Tip text={t[`tip_${k}`]}>{t[k]}</Tip></dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

function Changes({ positions, t, lang }) {
  const rows = [
    ['increased', 1], ['decreased', -1], ['new', 1], ['sold_out', -1], ['held', 0],
  ].filter(([k]) => positions?.[k])
  if (!rows.length) return null
  const max = Math.max(1, ...rows.filter(([, s]) => s).map(([k]) => positions[k].shares || 0))
  return (
    <Section title={t.changesH} how={t.changesHow}>
      <div className="qp-scroll">
        <table className="qp-table qo-table">
          <thead>
            <tr><th>{t.colChange}</th><th>{t.colHolders}</th><th>{t.colShares}</th><th aria-hidden="true" /></tr>
          </thead>
          <tbody>
            {rows.map(([k, sign]) => {
              const p = positions[k]
              return (
                <tr key={k}>
                  <td className="strong">{t[`pos_${k}`]}</td>
                  <td>{fmtInt(p.holders, lang)}</td>
                  <td>{sign ? signed(sign * (p.shares || 0), lang) : fmtCompact(p.shares, lang)}</td>
                  <td className="qo-barcell">
                    {sign !== 0 && <span className={`qo-bar ${sign > 0 ? 'up' : 'down'}`} style={{ width: `${Math.max(2, ((p.shares || 0) / max) * 100)}%` }} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function TopInstitutions({ rows, t, lang }) {
  if (!rows?.length) return null
  return (
    <Section title={t.topH} how={t.topHow}>
      <div className="qp-scroll">
        <table className="qp-table qo-table">
          <thead>
            <tr>
              <th>{t.colInstitution}</th><th>{t.colShares}</th><th>{t.colValue}</th>
              <th><Tip text={t.tip_changePct}>{t.colChangePct}</Tip></th><th>{t.colReported}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="name">{r.name}</td>
                <td>{fmtCompact(r.shares, lang)}</td>
                <td>{fmtMoney(r.value, lang)}</td>
                <td style={{ color: changeColor(r.change_pct) }}>{fmtSignedPct(r.change_pct, 1)}</td>
                <td>{fmtDate(r.as_of, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function Insiders({ ins, t, lang }) {
  const s = ins.summary || {}
  const tx = ins.transactions || []
  const quiet = !tx.length && ![s.sells_12m, s.buys_12m].some((v) => v > 0)
  const anyPlanned = tx.some((x) => x.planned)
  return (
    <Section title={t.insH} how={t.insHow}>
      {quiet ? <p className="qp-empty">{t.insEmpty}</p> : (
        <>
          {[[3, 'sells_3m', 'buys_3m'], [12, 'sells_12m', 'buys_12m']].map(([m, sk, bk]) => (
            isNum(s[sk]) && isNum(s[bk]) && (
              <p key={m} className="qo-sentence">{t.insSentence(s[sk], s[bk], m)}</p>
            )
          ))}
          <div className="qp-scroll" style={{ marginBottom: 16 }}>
            <table className="qp-table qo-table">
              <thead><tr><th /><th>{t.months3}</th><th>{t.months12}</th></tr></thead>
              <tbody>
                {[['insBuys', 'buys'], ['insSells', 'sells'], ['insSharesBought', 'shares_bought'], ['insSharesSold', 'shares_sold']].map(([lab, k]) => (
                  <tr key={k}>
                    <td className="strong">{t[lab]}</td>
                    <td>{fmtInt(s[`${k}_3m`], lang)}</td>
                    <td>{fmtInt(s[`${k}_12m`], lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {anyPlanned && <p className="qo-how" style={{ marginTop: 0 }}>{t.insPlanned}</p>}
          <div className="qp-scroll">
            <table className="qp-table qo-table">
              <thead>
                <tr>
                  <th>{t.colInsider}</th><th className="l">{t.colRelation}</th><th>{t.colDate}</th><th className="l">{t.colType}</th>
                  <th>{t.colTraded}</th><th>{t.colPrice}</th><th>{t.colValue}</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((x, i) => (
                  <tr key={`${x.name}${x.date}${x.type}${i}`}>
                    <td className="name">{x.name}</td>
                    <td className="l wrap">{x.relation || DASH}</td>
                    <td>{fmtDate(x.date, lang)}</td>
                    <td className="l wrap">
                      {t.types[(x.type || '').toLowerCase()] || x.type || DASH}
                      {x.planned && <Tip text={t.tip_planned}><span className="qo-tag">{t.planned}</span></Tip>}
                    </td>
                    <td>{fmtInt(x.shares, lang)}</td>
                    <td>{isNum(x.price) ? `$${fmtPrice(x.price, lang)}` : DASH}</td>
                    <td>{fmtMoney(x.value, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  )
}

function ShortChart({ rows, t, lang }) {
  useThemeStore((s) => s.theme)
  const bar = cssVar('--accent-fill', '#3b6fd4')
  const line = THEME.dif
  const axis = { color: THEME.text, fontSize: 11 }
  const option = {
    animation: false,
    grid: { left: 4, right: 4, top: 40, bottom: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: THEME.text, fontSize: 12 } },
    tooltip: {
      trigger: 'axis', backgroundColor: THEME.tooltipBg, borderColor: THEME.border, textStyle: { color: THEME.tooltipText, fontSize: 12 },
      formatter: (ps) => {
        const r = rows[ps[0].dataIndex]
        return `${fmtDate(r.settlement_date, lang)}<br/>${t.shortShares}: ${fmtInt(r.shares_short, lang)}<br/>${t.shortDtc}: ${fmtRatio(r.days_to_cover, lang)}`
      },
    },
    xAxis: {
      type: 'category', data: rows.map((r) => fmtShortDate(r.settlement_date, lang)),
      axisLabel: { ...axis, hideOverlap: true }, axisLine: { lineStyle: { color: THEME.border } }, axisTick: { show: false },
    },
    yAxis: [
      { type: 'value', axisLabel: { ...axis, formatter: (v) => fmtCompact(v, lang) }, splitLine: { lineStyle: { color: THEME.border, opacity: 0.6 } } },
      { type: 'value', axisLabel: { ...axis, formatter: (v) => fmtRatio(v, lang, 1) }, splitLine: { show: false }, min: 0 },
    ],
    series: [
      { name: t.shortShares, type: 'bar', data: rows.map((r) => r.shares_short), itemStyle: { color: bar }, barMaxWidth: 18 },
      { name: t.shortDtc, type: 'line', yAxisIndex: 1, data: rows.map((r) => r.days_to_cover), symbol: 'circle', symbolSize: 5, lineStyle: { width: 1.5, color: line }, itemStyle: { color: line } },
    ],
  }
  return <div className="qo-chart" role="img" aria-label={t.shortChartLabel}><ReactECharts option={option} notMerge style={{ height: '100%', width: '100%' }} /></div>
}

function ShortInterest({ si, sym, t, lang }) {
  if (!si?.rows?.length) {
    return <Section title={t.shortH} how={t.shortHow}><p className="qp-empty">{fill(t.shortEmpty, { sym })}</p></Section>
  }
  const last = si.rows[si.rows.length - 1]
  return (
    <Section title={t.shortH} how={t.shortHow}>
      <ShortChart rows={si.rows} t={t} lang={lang} />
      <dl className="qp-dl qo-facts">
        <dt>{t.shortLatest}</dt><dd>{fmtDate(last.settlement_date, lang)}</dd>
        <dt><Tip text={t.tip_shortShares}>{t.shortShares}</Tip></dt><dd>{fmtInt(last.shares_short, lang)}</dd>
        <dt><Tip text={t.tip_shortPct}>{t.shortPct}</Tip></dt><dd>{fmtPct(si.latest_pct_of_shares)}</dd>
        <dt><Tip text={t.tip_shortDtc}>{t.shortDtc}</Tip></dt><dd>{fmtRatio(last.days_to_cover, lang)}</dd>
      </dl>
    </Section>
  )
}

export default function QuoteHolders({ stocks, lang }) {
  const t = holdersStrings(lang)
  const [code, setCode] = useActiveTicker(stocks)
  const { data, error } = useQuoteApi(code ? `/api/us/quote/${encodeURIComponent(code)}/holders` : null, { ttl: 10 * 60_000 })
  if (!code) return null
  const etf = data?.asset_class === 'etf'
  const empty = data && !data.ownership && !data.top_institutions?.length && !data.insiders && !data.short_interest
  return (
    <div className="qp">
      <TickerSwitch stocks={stocks} code={code} onChange={setCode} label="Ticker" />
      {error && <div className="qp-card qp-empty" role="alert">{t.loadError}</div>}
      {!data && !error && <SkeletonBlocks />}
      {empty && <div className="qp-card qp-empty">{fill(t.holdersEmpty, { sym: code })}</div>}
      {data && !empty && (
        <>
          {data.ownership && <OwnershipStrip own={data.ownership} t={t} lang={lang} />}
          {data.ownership && <Changes positions={data.ownership.positions} t={t} lang={lang} />}
          <TopInstitutions rows={data.top_institutions} t={t} lang={lang} />
          {!etf && data.insiders && <Insiders ins={data.insiders} t={t} lang={lang} />}
          <ShortInterest si={data.short_interest} sym={code} t={t} lang={lang} />
          <SourceLine data={data} t={t} lang={lang} />
        </>
      )}
    </div>
  )
}
