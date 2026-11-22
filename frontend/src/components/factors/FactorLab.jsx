import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from '../../lib/echarts'
import useThemeStore from '../../store/themeStore'
import useCompareStore from '../../store/compareStore'
import { THEME } from '../../utils/chartHelpers'
import useQuoteApi from '../quotepage/useQuoteApi'
import { isNum, fmtRatio, fmtSignedPct, changeColor } from '../quotepage/format'
import factorStrings from './factorStrings'
import '../quotepage/quotepage.css'
import './factors.css'

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''))
const BACKTESTED = ['momentum', 'low_vol']
const RANKED = ['momentum', 'low_vol', 'value']
const monthLabel = (iso) => iso.slice(0, 7)
const pct = (v, digits = 1) => (isNum(v) ? `${v.toFixed(digits)}%` : '—')

function chartOption(bt, S, theme) {
  void theme // read so the option is rebuilt (colours re-read) when the theme changes
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-blue').trim() || '#6c9cff'
  const lines = [
    ['top', S.lineTop, accent, 2.2],
    ['all', S.lineAll, THEME.text, 1.4],
    ['bottom', S.lineBottom, '#e5484d', 1.2],
    ['spy', S.lineSpy, '#a99ad6', 1.2],
  ]
  return {
    animation: false,
    grid: { left: 8, right: 8, top: 10, bottom: 24, containLabel: true },
    tooltip: {
      trigger: 'axis', confine: true,
      backgroundColor: THEME.tooltipBg, borderColor: THEME.border, textStyle: { color: THEME.tooltipText, fontSize: 12 },
      valueFormatter: (v) => `$${Number(v).toFixed(0)}`,
    },
    xAxis: {
      type: 'category', data: bt.dates.map(monthLabel), boundaryGap: false,
      axisLine: { lineStyle: { color: THEME.border } }, axisTick: { show: false },
      axisLabel: { color: THEME.text, fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: THEME.border, opacity: 0.6 } },
      axisLabel: { color: THEME.text, fontSize: 11, formatter: (v) => `$${Math.round(v)}` },
    },
    series: lines.map(([key, name, color, width]) => ({
      name, type: 'line', showSymbol: false, symbol: 'none', smooth: false,
      lineStyle: { width, color }, itemStyle: { color },
      data: bt.curves[key],
    })),
  }
}

function Stats({ d, S, lang }) {
  const st = d.stats
  const cols = [['top', S.lineTop], ['bottom', S.lineBottom], ['all', S.lineAll], ['spy', S.lineSpy]]
  const rows = [
    [S.rowCagr, (c) => pct(st[c].cagr)],
    [S.rowVol, (c) => pct(st[c].vol)],
    [S.rowDd, (c) => pct(st[c].max_drawdown)],
    [S.rowRpr, (c) => fmtRatio(st[c].return_per_risk, lang)],
    [S.rowTurn, (c) => (c === 'top' ? pct(st[c].turnover, 0) : '—')],
  ]
  const { t_stat: t, avg_monthly_excess: ex, months_beating_all: beat } = d.luck
  const luck = ex < 0 ? S.luckNeg : t != null && t >= 2 ? S.luckStrong : S.luckWeak
  const f = d.halves.first
  const s = d.halves.second
  const signed = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%'
  return (
    <>
      <div className="fl-table-wrap">
        <table className="fl-table">
          <thead>
            <tr>
              <th scope="col">{fill(S.months, { n: d.months, from: monthLabel(d.start), to: monthLabel(d.end) })}</th>
              {cols.map(([c, name]) => <th key={c} scope="col">{name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, fn]) => (
              <tr key={name}>
                <td>{name}</td>
                {cols.map(([c]) => <td key={c} className={c === 'top' ? 'strong' : ''}>{fn(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4 className="fl-sub">{S.luckTitle}</h4>
      <p className="fl-note">{fill(luck, { pct: Math.abs(ex).toFixed(2), t: t == null ? '—' : t.toFixed(1), months: Math.round(beat) })}</p>
      <p className="fl-note">{fill(S.halves, {
        from: monthLabel(f.from), to: monthLabel(f.to), a: signed(f.excess_annual),
        from2: monthLabel(s.from), to2: monthLabel(s.to), b: signed(s.excess_annual),
      })}</p>
      <p className="fl-cov">{fill(S.coverage, { used: d.coverage.used, universe: d.coverage.universe, asOf: d.coverage.as_of })}</p>
    </>
  )
}

function Backtest({ lang, S }) {
  const [factor, setFactor] = useState('momentum')
  const theme = useThemeStore((s) => s.theme)
  const bt = useQuoteApi(`/api/us/factors/backtest?factor=${factor}`, { ttl: 5 * 60_000 })
  const label = { momentum: S.factorMomentum, low_vol: S.factorLowVol }
  const def = { momentum: S.defMomentum, low_vol: S.defLowVol }
  const d = bt.data
  const option = useMemo(() => (d ? chartOption(d, S, theme) : null), [d, S, theme])
  return (
    <section className="qp-card" aria-label={S.testTitle}>
      <div className="qp-head">
        <h3 className="qp-h">{S.testTitle}</h3>
        <div className="qp-seg" role="group" aria-label={S.testTitle}>
          {BACKTESTED.map((f) => (
            <button key={f} type="button" aria-pressed={factor === f} onClick={() => setFactor(f)}>{label[f]}</button>
          ))}
        </div>
      </div>
      <p className="fl-def"><b>{label[factor]}.</b> {def[factor]} {S.testHint}</p>
      {bt.loading && <div className="qp-skel" style={{ height: 340, marginTop: 8 }} aria-busy="true" />}
      {!bt.loading && !d && <div className="fl-err" role="alert">{S.error}</div>}
      {d && (
        <>
          <div className="fl-chart" role="img" aria-label={S.testTitle}>
            <ReactECharts option={option} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
          </div>
          <ul className="fl-legend">
            {[['top', S.lineTop, 'var(--accent-blue)'], ['all', S.lineAll, THEME.text], ['bottom', S.lineBottom, '#e5484d'], ['spy', S.lineSpy, '#a99ad6']]
              .map(([k, name, c]) => <li key={k}><i style={{ borderColor: c }} />{name}</li>)}
          </ul>
          <Stats d={d} S={S} lang={lang} />
        </>
      )}
    </section>
  )
}

function Ranking({ S }) {
  const [on, setOn] = useState({ momentum: true, low_vol: true, value: true })
  const navigate = useNavigate()
  const openStock = (symbol, name) => {
    useCompareStore.getState().switchMarketAndAddSymbol('us', { code: symbol, name: name || symbol })
    navigate(`/stock/us/${encodeURIComponent(symbol)}`)
  }
  const names = { momentum: S.factorMomentum, low_vol: S.factorLowVol, value: S.factorValue }
  const short = { momentum: S.colMomentum, low_vol: S.colLowVol, value: S.colValue }
  const shown = RANKED.filter((f) => on[f])
  const weights = shown.map((f) => `${f}:1`).join(',')
  const r = useQuoteApi(`/api/us/factors/rank?weights=${weights}&limit=20`, { ttl: 5 * 60_000 })
  // at least one factor stays on
  const toggle = (f) => setOn((o) => (shown.length === 1 && o[f] ? o : { ...o, [f]: !o[f] }))
  return (
    <section className="qp-card" aria-label={S.rankTitle}>
      <div className="qp-head"><h3 className="qp-h">{S.rankTitle}</h3></div>
      <p className="fl-note" style={{ marginTop: 0 }}>{S.rankHint}</p>
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="fl-sub" style={{ padding: 0 }}>{S.chooseFactors}</legend>
        <div className="fl-checks">
          {RANKED.map((f) => (
            <label key={f} htmlFor={`fl-${f}`}><input type="checkbox" id={`fl-${f}`} checked={on[f]} onChange={() => toggle(f)} />{names[f]}</label>
          ))}
        </div>
      </fieldset>
      {r.loading && <div className="qp-skel" style={{ height: 320 }} aria-busy="true" />}
      {!r.loading && !r.data && <div className="fl-err" role="alert">{S.error}</div>}
      {r.data && (
        <div className="fl-table-wrap">
          <table className="fl-table fl-rank">
            <thead>
              <tr>
                <th scope="col">{S.colRank}</th><th scope="col">{S.colStock}</th><th scope="col">{S.colScore}</th>
                {shown.map((f) => <th key={f} scope="col">{short[f]}</th>)}
                <th scope="col">{S.colChange}</th>
              </tr>
            </thead>
            <tbody>
              {r.data.rows.map((row) => (
                <tr key={row.symbol}>
                  <td>{row.rank}</td>
                  <td>
                    <button type="button" className="fl-sym" onClick={() => openStock(row.symbol, row.name)}>{row.symbol}</button>
                    {row.name && <span className="fl-name">{row.name}</span>}
                  </td>
                  <td className="strong">{row.score.toFixed(0)}</td>
                  {shown.map((f) => <td key={f}>{row.factors[f] ? row.factors[f].pct.toFixed(0) : '—'}</td>)}
                  <td style={{ color: changeColor(row.change_pct) }}>{isNum(row.change_pct) ? fmtSignedPct(row.change_pct) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function FactorLab({ lang }) {
  const S = factorStrings(lang)
  return (
    <div className="fl">
      <header>
        <h2 className="fl-title">{S.title}</h2>
        <p className="fl-intro">{S.intro}</p>
      </header>
      <Backtest lang={lang} S={S} />
      <Ranking S={S} />
      <section className="qp-card" aria-label={S.readTitle}>
        <div className="qp-head"><h3 className="qp-h">{S.readTitle}</h3></div>
        <ul className="fl-read">{S.read.map((line) => <li key={line}>{fill(line, { bps: 10 })}</li>)}</ul>
      </section>
    </div>
  )
}
