// Analysts tab: rating, price targets, recommendation trend, EPS forecasts and the PEG ratio.
// Data: /api/us/quote/{symbol}/analysts (Nasdaq). Props: { stocks, market, lang, onOpenStock }
import './quotepage.css'
import './holders.css'
import ReactECharts from '../../lib/echarts'
import useThemeStore from '../../store/themeStore'
import { THEME } from '../../utils/chartHelpers'
import useActiveTicker from './useActiveTicker'
import useQuoteApi from './useQuoteApi'
import TickerSwitch from './TickerSwitch'
import QuoteHeader from './QuoteHeader'
import { DASH, fmtDate, fmtInt, fmtPrice, fmtRatio, isNum } from './format'
import holdersStrings, { fill } from './holdersStrings'
import { Section, SkeletonBlocks, SourceLine, Tip } from './holdersParts'

const usd = (v, lang) => (isNum(v) ? `$${fmtPrice(v, lang)}` : DASH)
const month = (ym, lang) => fmtDate(`${ym}-01`, lang, { year: 'numeric', month: 'short' })

function Rating({ rating, t, lang }) {
  const parts = [['buy', THEME.up], ['hold', THEME.text], ['sell', THEME.down]]
  const total = parts.reduce((s, [k]) => s + (rating[k] || 0), 0) || 1
  const mean = rating.mean ? (t.means[rating.mean.toLowerCase()] || rating.mean) : DASH
  return (
    <Section title={t.rateH} how={t.rateHow}>
      <div className="qa-consensus">
        <span><Tip text={t.tip_consensus}>{t.consensus}</Tip></span>
        <b>{mean}</b>
        <span>{t.analystsCounted}: {fmtInt(rating.analysts, lang)}</span>
      </div>
      <div className="qa-stack" role="img" aria-label={parts.map(([k]) => `${t[`rate_${k}`]} ${rating[k] || 0}`).join(', ')}>
        {parts.map(([k, color]) => rating[k] > 0 && <i key={k} style={{ width: `${(rating[k] / total) * 100}%`, background: color }} />)}
      </div>
      <ul className="qa-legend">
        {parts.map(([k, color]) => (
          <li key={k}>
            <span className="qa-swatch" style={{ background: color }} />
            {t[`rate_${k}`]} <b>{rating[k] ?? 0}</b> ({Math.round(((rating[k] || 0) / total) * 100)}%)
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Targets({ tg, t, lang }) {
  const vals = [tg.low, tg.average, tg.high, tg.current].filter(isNum)
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const pad = (hi - lo || hi * 0.1 || 1) * 0.06
  const a = lo - pad, b = hi + pad
  const pos = (v) => `${Math.min(100, Math.max(0, ((v - a) / (b - a)) * 100))}%`
  const upside = isNum(tg.average) && isNum(tg.current) && tg.current > 0 ? (tg.average / tg.current - 1) * 100 : null
  const pct = isNum(upside) ? `${Math.abs(upside).toFixed(1)}%` : ''
  return (
    <Section title={<Tip text={t.tip_target}>{t.targetsH}</Tip>} how={t.targetsHow}>
      <div className="qa-scale">
        {isNum(tg.current) && <div className="qa-now" style={{ left: pos(tg.current) }}>{t.tCurrent} {usd(tg.current, lang)}</div>}
        <div className="qa-track" />
        {isNum(tg.low) && isNum(tg.high) && <div className="qa-range" style={{ left: pos(tg.low), width: `calc(${pos(tg.high)} - ${pos(tg.low)})` }} />}
        {isNum(tg.low) && <div className="qa-tick" style={{ left: pos(tg.low) }} />}
        {isNum(tg.high) && <div className="qa-tick" style={{ left: pos(tg.high) }} />}
        {isNum(tg.average) && <div className="qa-avg" style={{ left: pos(tg.average) }} />}
      </div>
      <dl className="qa-targets">
        {[['tLow', tg.low], ['tAvg', tg.average], ['tHigh', tg.high]].map(([k, v]) => (
          <div key={k}><dt>{t[k]}</dt><dd>{usd(v, lang)}</dd></div>
        ))}
      </dl>
      {isNum(upside) && upside !== 0 && <p className="qo-sentence" style={{ marginTop: 12, marginBottom: 0 }}>{upside > 0 ? t.upside(pct) : t.downside(pct)}</p>}
    </Section>
  )
}

function Trend({ history, t, lang }) {
  useThemeStore((s) => s.theme)
  const axis = { color: THEME.text, fontSize: 11 }
  const names = { buy: t.rate_buy, hold: t.rate_hold, sell: t.rate_sell }
  const option = {
    animation: false,
    grid: { left: 4, right: 4, top: 36, bottom: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: THEME.text, fontSize: 12 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: THEME.tooltipBg, borderColor: THEME.border, textStyle: { color: THEME.tooltipText, fontSize: 12 } },
    xAxis: { type: 'category', data: history.map((h) => month(h.date.slice(0, 7), lang)), axisLabel: { ...axis, hideOverlap: true }, axisLine: { lineStyle: { color: THEME.border } }, axisTick: { show: false } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: axis, splitLine: { lineStyle: { color: THEME.border, opacity: 0.6 } } },
    series: [['buy', THEME.up], ['hold', THEME.text], ['sell', THEME.down]].map(([k, color]) => ({
      name: names[k], type: 'bar', stack: 'n', barMaxWidth: 26, itemStyle: { color }, data: history.map((h) => h[k] ?? 0),
    })),
  }
  return (
    <Section title={t.trendH} how={t.trendHow}>
      <div className="qo-chart" role="img" aria-label={t.trendH}><ReactECharts option={option} notMerge style={{ height: '100%', width: '100%' }} /></div>
    </Section>
  )
}

function EpsTable({ title, rows, t, lang }) {
  if (!rows?.length) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <h4 className="qa-sub">{title}</h4>
      <div className="qp-scroll">
        <table className="qp-table">
          <thead>
            <tr>
              <th>{t.colPeriod}</th><th>{t.colAvg}</th><th>{t.colLow}</th><th>{t.colHigh}</th>
              <th>{t.colEstimates}</th><th>{t.colUp}</th><th>{t.colDown}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.fiscal_end}>
                <td className="strong">{month(r.fiscal_end, lang)}</td>
                <td className="strong">{fmtRatio(r.consensus, lang)}</td>
                <td>{fmtRatio(r.low, lang)}</td>
                <td>{fmtRatio(r.high, lang)}</td>
                <td>{fmtInt(r.estimates, lang)}</td>
                <td>{fmtInt(r.up, lang)}</td>
                <td>{fmtInt(r.down, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function QuoteAnalysts({ stocks, lang }) {
  const t = holdersStrings(lang)
  const [code, setCode] = useActiveTicker(stocks)
  const { data, error } = useQuoteApi(code ? `/api/us/quote/${encodeURIComponent(code)}/analysts` : null, { ttl: 5 * 60_000 })
  if (!code) return null
  const fc = data?.forecasts
  const empty = data && !data.rating && !data.targets && !data.history?.length && !fc && !data.peg
  return (
    <div className="qp">
      <TickerSwitch stocks={stocks} code={code} onChange={setCode} label="Ticker" />
      <QuoteHeader code={code} lang={lang} />
      {error && <div className="qp-card qp-empty" role="alert">{t.loadError}</div>}
      {!data && !error && <SkeletonBlocks />}
      {empty && <div className="qp-card qp-empty">{fill(t.analystsEmpty, { sym: code })}</div>}
      {data && !empty && (
        <>
          <p className="qa-note">{t.aNote}</p>
          {data.rating && <Rating rating={data.rating} t={t} lang={lang} />}
          {data.targets && <Targets tg={data.targets} t={t} lang={lang} />}
          {data.history?.length > 0 && <Trend history={data.history} t={t} lang={lang} />}
          {fc && (
            <Section title={<Tip text={t.tip_eps}>{t.epsH}</Tip>} how={t.epsHow}>
              <EpsTable title={t.epsQ} rows={fc.quarterly} t={t} lang={lang} />
              <EpsTable title={t.epsY} rows={fc.yearly} t={t} lang={lang} />
            </Section>
          )}
          {data.peg && (
            <Section title={t.pegH} how={t.pegHow}>
              <div className="qa-peg"><span><Tip text={t.tip_peg}>{t.pegLabel}</Tip></span><b>{fmtRatio(data.peg.value, lang)}</b></div>
            </Section>
          )}
          <SourceLine data={data} t={t} lang={lang} />
        </>
      )}
    </div>
  )
}
