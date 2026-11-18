import { useMemo, useState } from 'react'
import ReactECharts from '../../lib/echarts'
import useThemeStore from '../../store/themeStore'
import { THEME, riseColor, fallColor } from '../../utils/chartHelpers'
import useQuoteApi from './useQuoteApi'
import { LOCALE, fmtPrice, fmtSignedPct, isNum, changeColor } from './format'
import summaryStrings, { fill } from './summaryStrings'
import './quotepage.css'
import './summary.css'

const RANGES = [['1d', '1D'], ['5d', '5D'], ['1m', '1M'], ['6m', '6M'], ['ytd', 'YTD'], ['1y', '1Y'], ['5y', '5Y'], ['10y', '10Y']]
const ET = 'America/New_York'
const MIN = 60_000

const etParts = (ms, lang, opts) => new Intl.DateTimeFormat(LOCALE[lang] || 'en-US', { timeZone: ET, ...opts }).format(ms)
const etDay = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: ET }).format(ms)    // 2026-11-18

function axisLabel(ms, range, lang) {
  if (range === '1d') return etParts(ms, lang, { hour: 'numeric', minute: '2-digit' })
  if (range === '5d') return etParts(ms, lang, { weekday: 'short' })
  if (range === '5y' || range === '10y') return etParts(ms, lang, { year: 'numeric' })
  if (range === '1m') return etParts(ms, lang, { month: 'short', day: 'numeric' })
  return etParts(ms, lang, { month: 'short', year: '2-digit' })
}

function tipTime(ms, range, lang) {
  if (range === '1d' || range === '5d') {
    return etParts(ms, lang, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET'
  }
  return etParts(ms, lang, { year: 'numeric', month: 'short', day: 'numeric' })
}

function lineColor(pct) {
  if (!isNum(pct) || pct === 0) return THEME.text
  return pct > 0 ? riseColor('us') : fallColor('us')
}

function buildOption(chart, range, lang, theme) {
  void theme // read so the option is rebuilt (and colours re-read) when the theme changes
  const pts = chart.points
  const color = lineColor(chart.change_pct)
  const prices = pts.map((p) => p[1])
  const withPrev = range === '1d' && isNum(chart.prev_close)
  const lo = Math.min(...prices, ...(withPrev ? [chart.prev_close] : []))
  const hi = Math.max(...prices, ...(withPrev ? [chart.prev_close] : []))
  const pad = (hi - lo) * 0.08 || hi * 0.01 || 1
  const timeAxis = range === '1d' && chart.session

  // 1D uses a real time axis so the line spans 9:30-16:00 even mid-session; other ranges use the points in
  // order (no gaps for nights and weekends) and label the first point of each day, month or year.
  let labelEvery = 0
  if (!timeAxis) {
    if (range === '1m') {
      labelEvery = Math.max(1, Math.floor(pts.length / 5))
    } else {
      const key = (ms) => (range === '5d' ? etDay(ms) : range === '5y' || range === '10y' ? etDay(ms).slice(0, 4) : etDay(ms).slice(0, 7))
      const seen = new Set()
      const first = pts.map((p) => { const k = key(p[0]); const f = !seen.has(k); seen.add(k); return f })
      // a range that starts late in a month would label that sliver and crowd out the next month
      const startsLate = range !== '5d' && Number(etDay(pts[0][0]).slice(8)) > 7
      labelEvery = (i) => first[i] && !(i === 0 && startsLate)
    }
  }

  return {
    animation: false,
    grid: { left: 4, right: 56, top: 10, bottom: 22 },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: THEME.tooltipBg, borderColor: THEME.border, textStyle: { color: THEME.tooltipText, fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: THEME.border } },
      formatter: (ps) => {
        const p = ps[0]
        const ms = Number(timeAxis ? p.value[0] : p.axisValue)
        const price = timeAxis ? p.value[1] : p.value
        return `<div>${tipTime(ms, range, lang)}</div><div style="font-weight:600">$${fmtPrice(price, lang)}</div>`
      },
    },
    xAxis: timeAxis ? {
      type: 'value', min: chart.session.open_ms, max: chart.session.close_ms, interval: 90 * MIN,
      axisLine: { lineStyle: { color: THEME.border } }, axisTick: { show: false }, splitLine: { show: false },
      axisLabel: { color: THEME.text, fontSize: 11, hideOverlap: true, showMaxLabel: false, formatter: (v) => axisLabel(v, range, lang) },
    } : {
      type: 'category', data: pts.map((p) => p[0]), boundaryGap: false,
      axisLine: { lineStyle: { color: THEME.border } }, axisTick: { show: false },
      axisLabel: {
        color: THEME.text, fontSize: 11, hideOverlap: true, interval: labelEvery,
        formatter: (v) => axisLabel(Number(v), range, lang),
      },
    },
    yAxis: {
      type: 'value', position: 'right', min: lo - pad, max: hi + pad, scale: true,
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: THEME.border, opacity: 0.6 } },
      axisLabel: { color: THEME.text, fontSize: 11, formatter: (v) => fmtPrice(v, lang, hi < 5 ? 3 : hi < 1000 ? 2 : 0) },
    },
    series: [{
      type: 'line',
      data: timeAxis ? pts : prices,
      showSymbol: false, symbol: 'none', smooth: false, sampling: 'lttb',
      lineStyle: { width: 1.5, color },
      itemStyle: { color },
      areaStyle: { color, opacity: 0.07 },
      markLine: withPrev ? {
        silent: true, symbol: 'none', animation: false,
        lineStyle: { type: 'dashed', color: THEME.text, opacity: 0.7, width: 1 },
        label: { show: false },
        data: [{ yAxis: chart.prev_close }],
      } : undefined,
    }],
  }
}

export default function QuoteChart({ code, lang, live }) {
  const S = summaryStrings(lang)
  const theme = useThemeStore((s) => s.theme)
  const [range, setRange] = useState('1d')
  const sessionHours = Boolean(live && live.market_status !== 'closed')

  // The 1D answer also carries every range's % change, so the buttons keep their numbers while another range loads.
  const base = useQuoteApi(`/api/us/quote/${code}/chart?range=1d`, { ttl: 30_000, poll: sessionHours ? 60_000 : 0 })
  const other = useQuoteApi(range === '1d' ? null : `/api/us/quote/${code}/chart?range=${range}`,
    { ttl: 60_000, poll: range === '5d' && sessionHours ? 60_000 : 0 })
  const cur = range === '1d' ? base : other
  const chart = cur.data
  const ranges = base.data?.ranges || chart?.ranges || {}
  const ok = chart && chart.points?.length > 1

  const option = useMemo(() => (ok ? buildOption(chart, range, lang, theme) : null), [ok, chart, range, lang, theme])

  return (
    <section className="qp-card" aria-label={S.chartTitle}>
      <div className="qp-seg qs-ranges" role="group" aria-label={S.chartTitle}>
        {RANGES.map(([k, label]) => {
          const v = ranges[k]
          return (
            <button key={k} type="button" aria-pressed={range === k} onClick={() => setRange(k)}>
              <span className="l">{label}</span>
              <span className="p" style={{ color: changeColor(v) }}>
                {isNum(v) ? fmtSignedPct(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2) : ''}
              </span>
            </button>
          )
        })}
      </div>
      <div className="qs-chart">
        {ok && <ReactECharts option={option} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />}
        {!ok && cur.loading && <div className="qp-skel" style={{ position: 'absolute', inset: 0 }} aria-hidden="true" />}
        {!ok && !cur.loading && (
          <div className="qs-chart-msg">{cur.error ? S.chartLoadError : S.chartEmpty}</div>
        )}
      </div>
      {range === '1d' && ok && isNum(chart.prev_close) && (
        <p className="qp-note">{fill(S.prevCloseDashed, { price: `$${fmtPrice(chart.prev_close, lang)}` })}</p>
      )}
    </section>
  )
}
