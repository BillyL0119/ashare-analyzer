import useLangStore from '../../store/langStore'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from '../../lib/echarts'
import useWatchlistStore from '../../store/watchlistStore'
import { useT } from '../i18n'
import { useAPI, num, pct } from '../data'
import { trackSearch } from '../../utils/analytics'
import { boll, ma, macd, rsi } from '../indicators'
import { ErrorBox, Pill, Section, Segment, Skeleton, SkeletonRows } from '../ui'
import { changeColor, quotePath, historyPath, chipLabel } from '../helpers'
import { CUR, localName } from '../../utils/markets'
import { Icon } from '../icons'

const PERIODS = [['10', '10日'], ['30', '30日'], ['60', '60日'], ['120', '120日'], ['250', '1年']]
const css = (name) => (typeof document === 'undefined' ? '#888' : getComputedStyle(document.querySelector('.m-app') || document.body).getPropertyValue(name).trim() || '#888')

function KLine({ all, count, market, indicator }) {
  const t = useT()
  const [sel, setSel] = useState(null)
  const up = css('--cn-up'), down = css('--cn-down')
  const upC = market === 'cn' ? up : down, downC = market === 'cn' ? down : up
  const txt = css('--text-2'), grid = css('--stroke')

  const candles = useMemo(() => all.slice(-count), [all, count])
  const opt = useMemo(() => {
    // Indicators are computed on the full history, then cut to the visible window, so MACD/MA/BOLL have their warm-up.
    const cut = (arr) => arr.slice(-count)
    const dates = candles.map((c) => c.date.slice(5))
    const closes = all.map((c) => c.close)
    const sub = indicator === 'macd' || indicator === 'rsi'
    const gridsDef = [{ left: 6, right: 46, top: 10, height: 222 }, { left: 6, right: 46, top: 252, height: 54 }]
    if (sub) gridsDef.push({ left: 6, right: 46, top: 328, height: 70 })
    const nGrid = gridsDef.length
    const axisCommon = (i) => ({ type: 'category', data: dates, gridIndex: i, boundaryGap: true, axisLine: { lineStyle: { color: grid } }, axisTick: { show: false },
      axisLabel: { show: i === nGrid - 1, color: txt, fontSize: 10, hideOverlap: true }, splitLine: { show: false }, axisPointer: { label: { show: false } } })
    const series = [{ type: 'candlestick', data: candles.map((c) => [c.open, c.close, c.low, c.high]), xAxisIndex: 0, yAxisIndex: 0,
      itemStyle: { color: upC, color0: downC, borderColor: upC, borderColor0: downC }, barMaxWidth: 9 }]
    const line = (name, data, color, extra = {}) => ({ name, type: 'line', data, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, smooth: true, lineStyle: { width: 1.1, color, ...extra }, silent: true })
    if (indicator === 'boll') {
      const b = boll(closes)
      series.push(line('UP', cut(b.up), css('--accent'), { type: 'dashed' }), line('MID', cut(b.mid), css('--text-3')), line('DN', cut(b.lo), css('--accent'), { type: 'dashed' }))
    } else {
      series.push(line('MA5', cut(ma(closes, 5)), '#E0A100'), line('MA10', cut(ma(closes, 10)), '#7c9cb4'), line('MA20', cut(ma(closes, 20)), '#F28B3C'))
    }
    series.push({ type: 'bar', data: candles.map((c) => ({ value: c.volume, itemStyle: { color: c.close >= c.open ? upC : downC, opacity: .75 } })), xAxisIndex: 1, yAxisIndex: 1, barMaxWidth: 9 })
    if (indicator === 'macd') {
      const m = macd(closes)
      series.push({ type: 'bar', data: cut(m.hist).map((v) => ({ value: v, itemStyle: { color: v >= 0 ? upC : downC, opacity: .8 } })), xAxisIndex: 2, yAxisIndex: 2, barMaxWidth: 7 },
        line('DIF', cut(m.dif), css('--text')), line('DEA', cut(m.dea), '#E0A100'))
      series[series.length - 2].xAxisIndex = 2; series[series.length - 2].yAxisIndex = 2
      series[series.length - 1].xAxisIndex = 2; series[series.length - 1].yAxisIndex = 2
    } else if (indicator === 'rsi') {
      const r = line('RSI', cut(rsi(closes)), '#7c9cb4'); r.xAxisIndex = 2; r.yAxisIndex = 2
      r.markLine = { silent: true, symbol: 'none', label: { show: false }, lineStyle: { type: 'dashed', color: txt, opacity: .5 }, data: [{ yAxis: 70 }, { yAxis: 30 }] }
      series.push(r)
    }
    return {
      animation: false, backgroundColor: 'transparent',
      grid: gridsDef,
      xAxis: gridsDef.map((_, i) => axisCommon(i)),
      yAxis: gridsDef.map((_, i) => ({ gridIndex: i, position: 'right', scale: i !== 1, splitNumber: i === 0 ? 4 : 2, axisLabel: { color: txt, fontSize: 10, formatter: i === 1 ? (v) => (v >= 1e9 ? +(v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? Math.round(v / 1e6) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : v) : undefined },
        splitLine: { lineStyle: { color: grid } }, axisLine: { show: false }, axisTick: { show: false }, ...(i === 2 && indicator === 'rsi' ? { min: 0, max: 100 } : {}) })),
      axisPointer: { link: [{ xAxisIndex: 'all' }], lineStyle: { color: txt, type: 'dashed' } },
      tooltip: { trigger: 'axis', showContent: false, axisPointer: { type: 'cross', label: { show: false }, crossStyle: { color: txt, opacity: .6 } } },
      series,
    }
  }, [all, candles, count, indicator, upC, downC, txt, grid])

  const idx = sel == null ? candles.length - 1 : Math.max(0, Math.min(candles.length - 1, sel))
  const c = candles[idx]
  const prev = candles[idx - 1]
  const chg = c && prev ? ((c.close - prev.close) / prev.close) * 100 : null
  const sub = indicator === 'macd' || indicator === 'rsi'
  return (
    <div>
      {c && (
        <div className="m-num" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 13, padding: '0 4px 8px', color: 'var(--text-2)' }}>
          <b style={{ color: 'var(--text)' }}>{c.date}</b>
          <span>{t('开')} <b style={{ color: 'var(--text)' }}>{num(c.open)}</b></span><span>{t('高')} <b style={{ color: 'var(--text)' }}>{num(c.high)}</b></span>
          <span>{t('低')} <b style={{ color: 'var(--text)' }}>{num(c.low)}</b></span><span>{t('收')} <b style={{ color: 'var(--text)' }}>{num(c.close)}</b></span>
          <b style={{ color: changeColor(chg, market) }}>{pct(chg)}</b>
        </div>
      )}
      <ReactECharts option={opt} notMerge style={{ height: sub ? 420 : 330, width: '100%' }} opts={{ renderer: 'canvas' }}
        onEvents={{ updateAxisPointer: (e) => { const v = e?.axesInfo?.[0]?.value; if (typeof v === 'number') setSel(v) }, globalout: () => setSel(null) }} />
    </div>
  )
}

function News({ symbol, market }) {
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const { data, error, reload } = useAPI(`/news/${symbol}?market=${market}&lang=${lang}`)
  const o = data?.overall
  // news tone colours follow green = good / red = bad everywhere
  const good = 'var(--cn-down)', bad = 'var(--cn-up)'
  return (
    <Section title={t('相关新闻')}>
      {!data ? (error ? <ErrorBox onRetry={reload} /> : <SkeletonRows rows={4} />) : (
        <div className="m-card flush">
          {o && (
            <div style={{ padding: 14, borderBottom: '1px solid var(--stroke)' }}>
              <div className="m-num" style={{ display: 'flex', gap: 10, fontSize: 13, fontWeight: 600 }}>
                <span style={{ color: good }}>{t('利好')} {o.positive_count}</span><span className="m-muted">· {t('中性')} {o.neutral_count}</span>
                <span style={{ color: bad }}>· {t('利空')} {o.negative_count}</span>
                <span style={{ marginLeft: 'auto', color: o.sentiment_score > .05 ? good : o.sentiment_score < -.05 ? bad : 'var(--text-2)' }}>{t('情感 %@', (o.sentiment_score > 0 ? '+' : '') + o.sentiment_score.toFixed(2))}</span>
              </div>
              {o.ai_summary && <p className="m-muted" style={{ fontSize: 13, margin: '8px 0 0' }}>{o.ai_summary}</p>}
            </div>
          )}
          {data.news.slice(0, 10).map((n, i) => {
            const [c, label] = n.final_sentiment === 'positive' ? [good, t('利好')] : n.final_sentiment === 'negative' ? [bad, t('利空')] : ['var(--text-3)', t('中性')]
            let href = null; try { const u = new URL(n.url); if (u.protocol === 'https:' || u.protocol === 'http:') href = u.href } catch { /* invalid */ }
            return (
              <a key={i} className="m-row" style={{ alignItems: 'flex-start' }} href={href || undefined} target="_blank" rel="noopener noreferrer nofollow">
                <span style={{ width: 8, height: 8, borderRadius: 4, background: c, marginTop: 7, flex: 'none' }} />
                <div className="m-grow">
                  <div style={{ fontSize: 14.5, lineHeight: 1.35 }}>{n.title}</div>
                  <div className="m-label" style={{ marginTop: 5, display: 'flex', gap: 8 }}><span>{n.source}</span><span style={{ marginLeft: 'auto', color: c, fontWeight: 600 }}>{label}</span></div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// Company fundamentals for US stocks (same API and strings as the iOS app's section)
const usd = (v) => {
  if (v == null) return '—'
  const a = Math.abs(v), s = v < 0 ? '-' : ''
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(a >= 1e11 ? 0 : 1)}B`   // $216B, $27.0B: keeps 4 columns on a phone
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(0)}M`
  return `${s}$${a.toFixed(0)}`
}
const shortPeriod = (p) => (/^FY\d{4}$/.test(p) ? 'FY' + p.slice(4) : p.replace(/ (\d{2})(\d{2})$/, ' $2'))

function Fundamentals({ symbol, price }) {
  const t = useT()
  const { data: d, error, reload } = useAPI(`/us/fundamentals/${symbol}`)
  const [freq, setFreq] = useState('annual')
  const [more, setMore] = useState(false)
  if (error) return <Section title={t('公司基本面')}><ErrorBox onRetry={reload} /></Section>
  if (!d) return <Section title={t('公司基本面')}><Skeleton h={220} r={20} /></Section>
  const up = changeColor(1, 'us'), down = changeColor(-1, 'us')
  const f = (freq === 'quarterly' ? d.quarterly : d.annual) || d.annual
  const ttm = d.earnings?.length >= 4 ? d.earnings.slice(-4).reduce((a, e) => a + (e.eps ?? 0), 0) : null
  const target = d.analysts?.target ?? d.stats?.one_year_target
  const upside = target && price ? ((target - price) / price) * 100 : null
  const ne = d.next_earnings
  const tiles = [
    ttm != null && [t('每股收益 (近4季)'), `$${ttm.toFixed(2)}`],
    (d.annual || d.stats?.dividend_yield) && [t('股息率'), d.stats?.dividend_yield ? `${d.stats.dividend_yield.toFixed(2)}%` : t('无'), d.stats?.annual_dividend ? `$${d.stats.annual_dividend.toFixed(2)}${t('/年')}` : null],
    d.stats?.week52_low != null && [t('52 周区间'), `$${d.stats.week52_low.toFixed(0)}–${d.stats.week52_high.toFixed(0)}`],
    target && [t('分析师目标价'), `$${target.toFixed(2)}`, upside != null ? <span style={{ color: upside >= 0 ? up : down }}>{upside >= 0 ? '+' : ''}{upside.toFixed(1)}% {t('空间')}</span> : null],
    ne?.date && [t('下次财报'), new Date(`${ne.date}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), ne.timing === 'after_close' ? t('盘后') : ne.timing === 'before_open' ? t('盘前') : null],
    d.holders?.institutional_pct != null && [t('机构持股'), `${d.holders.institutional_pct.toFixed(1)}%`],
  ].filter(Boolean)
  const meta = [d.profile?.sector, d.profile?.industry].filter(Boolean).join(' · ')
  const option = f && {
    grid: { left: 44, right: 8, top: 26, bottom: 22 },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: css('--text-2'), fontSize: 11 } },
    xAxis: { type: 'category', data: f.periods.map(shortPeriod), axisLabel: { color: css('--text-2'), fontSize: 10 }, axisTick: { show: false }, axisLine: { lineStyle: { color: css('--stroke') } } },
    yAxis: { type: 'value', axisLabel: { color: css('--text-2'), fontSize: 10, formatter: (v) => `$${Math.round(v / 1e9)}B` }, splitLine: { lineStyle: { color: css('--stroke'), type: 'dashed' } } },
    series: [
      { name: t('营收'), type: 'bar', data: f.revenue, barMaxWidth: 22, itemStyle: { color: '#5B9CF6', borderRadius: [3, 3, 0, 0] } },
      { name: t('净利润'), type: 'bar', data: f.net_income, barMaxWidth: 22, itemStyle: { color: '#26A69A', borderRadius: [3, 3, 0, 0] } },
    ],
  }
  const a = d.analysts
  const total = a ? a.buy + a.hold + a.sell : 0
  return (
    <Section title={t('公司基本面')}>
      <div style={{ display: 'grid', gap: 12 }}>
        {(meta || d.profile?.description) && (
          <div className="m-card" style={{ display: 'grid', gap: 8 }}>
            {meta && <div className="m-label" style={{ fontWeight: 650 }}>{meta}</div>}
            {d.profile?.description && (
              <div style={{ fontSize: 13.5, lineHeight: 1.55, ...(more ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>{d.profile.description}</div>
            )}
            {d.profile?.description && <button style={{ justifySelf: 'start', color: 'var(--accent)', fontSize: 13, fontWeight: 650 }} onClick={() => setMore((v) => !v)}>{more ? t('收起') : t('展开')}</button>}
          </div>
        )}
        {tiles.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {tiles.map(([k, v, sub]) => (
              <div key={k} className="m-card" style={{ padding: 12 }}>
                <div className="m-label">{k}</div>
                <div className="m-num" style={{ fontWeight: 600, fontSize: 17, marginTop: 4 }}>{v}</div>
                {sub && <div className="m-label" style={{ marginTop: 3 }}>{sub}</div>}
              </div>
            ))}
          </div>
        )}
        {f && (
          <div className="m-card" style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <b style={{ fontSize: 15 }}>{t('财务表现')}</b>
              {d.quarterly && <Segment value={freq} onChange={setFreq} options={[{ value: 'annual', label: t('年度') }, { value: 'quarterly', label: t('季度') }]} />}
            </div>
            <ReactECharts option={option} notMerge style={{ height: 180, width: '100%' }} />
            <div style={{ overflowX: 'auto' }}>
              <table className="m-num" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr><th />{f.periods.map((p) => <th key={p} style={{ textAlign: 'right', fontWeight: 650, color: 'var(--text-2)', padding: '4px 0 6px 6px' }}>{shortPeriod(p)}</th>)}</tr></thead>
                <tbody>
                  {[[t('营收'), f.revenue, usd], [t('净利润'), f.net_income, usd], [t('毛利率'), f.gross_margin, (v) => (v == null ? '—' : `${v.toFixed(1)}%`)],
                    [t('净利率'), f.net_margin, (v) => (v == null ? '—' : `${v.toFixed(1)}%`)], [t('自由现金流'), f.free_cash_flow, usd]].map(([k, vals, fmt]) => (
                    <tr key={k}>
                      <td style={{ fontWeight: 650, padding: '5px 0', whiteSpace: 'nowrap' }}>{k}</td>
                      {vals.map((v, i) => <td key={i} style={{ textAlign: 'right', padding: '5px 0 5px 6px', whiteSpace: 'nowrap', color: v < 0 ? down : undefined }}>{fmt(v)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {d.earnings?.length > 0 && (
          <div className="m-card" style={{ display: 'grid', gap: 10 }}>
            <b style={{ fontSize: 15 }}>{t('盈利 vs 预期')}</b>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${d.earnings.length}, minmax(0, 1fr))`, gap: 6 }}>
              {d.earnings.map((e) => (
                <div key={e.quarter} className="m-num" style={{ textAlign: 'center', padding: '8px 2px', borderRadius: 10, background: 'var(--surface-hi)', display: 'grid', gap: 3 }}>
                  <span className="m-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.quarter}</span>
                  <b style={{ fontSize: 14 }}>{e.eps != null ? `$${e.eps.toFixed(2)}` : '—'}</b>
                  <span className="m-label">{t('预期')} {e.estimate != null ? `$${e.estimate.toFixed(2)}` : '—'}</span>
                  {e.surprise_pct != null && <span style={{ fontSize: 13, fontWeight: 600, color: e.surprise_pct >= 0 ? up : down }}>{e.surprise_pct >= 0 ? '+' : ''}{e.surprise_pct.toFixed(1)}%</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {a && (
          <div className="m-card" style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 15 }}>{t('分析师评级')}</b>{total > 0 && <span className="m-label">{t('%lld 位分析师', total)}</span>}</div>
            {total > 0 && (
              <>
                <div style={{ display: 'flex', gap: 2, height: 10, borderRadius: 5, overflow: 'hidden' }}>
                  {[[a.buy, up], [a.hold, '#F5A524'], [a.sell, down]].map(([n, c], i) => n > 0 && <span key={i} style={{ flex: n, background: c }} />)}
                </div>
                <div className="m-label" style={{ display: 'flex', gap: 14 }}>
                  <span>{t('买入')} {a.buy}</span><span>{t('持有')} {a.hold}</span><span>{t('卖出')} {a.sell}</span>
                </div>
              </>
            )}
            {a.target != null && (
              <div className="m-num" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                {[[t('最低'), a.target_low], [t('平均'), a.target], [t('最高'), a.target_high], [t('现价'), price]].map(([k, v], i) => (
                  <div key={k}><div className="m-label">{k}</div><div style={{ fontWeight: 600, fontSize: 14, marginTop: 2, color: i === 1 ? 'var(--accent)' : undefined }}>{v != null ? `$${v.toFixed(2)}` : '—'}</div></div>
                ))}
              </div>
            )}
          </div>
        )}
        {d.holders?.top?.length > 0 && (
          <div className="m-card flush">
            <div style={{ padding: '14px 16px 4px' }}><b style={{ fontSize: 15 }}>{t('主要机构股东')}</b></div>
            {d.holders.top.slice(0, 5).map((r) => (
              <div className="m-row" key={r.name}>
                <div className="m-grow m-name" style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                <span className="m-num" style={{ fontWeight: 600 }}>{usd(r.value)}</span>
                <span className="m-num" style={{ width: 62, textAlign: 'right', fontSize: 13, color: (r.change_pct ?? 0) >= 0 ? up : down }}>{r.change_pct != null ? `${r.change_pct >= 0 ? '+' : ''}${r.change_pct.toFixed(2)}%` : ''}</span>
              </div>
            ))}
          </div>
        )}
        <div className="m-label" style={{ padding: '0 4px' }}>{t('数据来源：Nasdaq · 单位美元 · 财年按公司口径')}</div>
      </div>
    </Section>
  )
}

export default function StockDetail() {
  const { market, code } = useParams()
  const t = useT(); const nav = useNavigate()
  const [period, setPeriod] = useState('30'); const [indicator, setIndicator] = useState('ma')
  const watched = useWatchlistStore((s) => s.list.some((x) => x.code === code))
  const add = useWatchlistStore((s) => s.add), remove = useWatchlistStore((s) => s.remove)
  useEffect(() => { trackSearch(code) }, [code])

  const lang = useLangStore((s) => s.lang)
  const intl = market !== 'cn'             // US, Hong Kong, Japan: same quote/history shapes
  const hkjp = market === 'hk' || market === 'jp'
  const q = useAPI(quotePath(market, code), { refreshMs: 30000 })
  const h = useAPI(historyPath(market, code, 250))
  const all = h.data ? (market === 'cn' ? h.data.candles : h.data.data) : null
  const candles = useMemo(() => (all ? all.slice(-Number(period)) : []), [all, period])

  const d = q.data
  const price = d?.price
  const p = d ? (market === 'cn' ? d.pct_change : d.change_pct) : null
  const name = (hkjp && d ? localName(d, lang, market) : d?.name) || code
  // US pages get a server-rendered title; the other markets name the tab once the quote arrives
  useEffect(() => {
    if (!d?.name || document.title.toUpperCase().includes(code.toUpperCase())) return
    const label = { cn: 'A股', hk: '港股', jp: '日股', us: '美股' }[market] || ''
    document.title = lang === 'zh' ? `${name} (${code}) ${label}行情 · K线 · AI分析 | BestFriendStock` : `${name} (${code}) | Best Friend Stock`
  }, [d?.name, name, code, market, lang])
  const last = candles[candles.length - 1]
  const open = d?.open > 0 ? d.open : last?.open, high = d?.high > 0 ? d.high : last?.high, low = d?.low > 0 ? d.low : last?.low
  const vol = d?.volume > 0 ? d.volume : last?.volume
  const has52 = intl && d?.week52_low > 0 && d?.week52_high > 0
  const [lo, hi] = has52 ? [d.week52_low, d.week52_high] : all ? [Math.min(...all.map((c) => c.low)), Math.max(...all.map((c) => c.high))] : [null, null]
  const pos = price != null && hi > lo ? Math.min(1, Math.max(0, (price - lo) / (hi - lo))) : null
  const c = changeColor(p, market)

  const prevClose = d?.prev_close > 0 ? d.prev_close : (candles.length > 1 ? candles[candles.length - 2].close : null)
  const grid = [[t('今开'), open], [t('昨收'), prevClose], [t('最高'), high], [t('最低'), low]]
  const money = (v) => {
    if (!(v > 0)) return '--'
    if (intl) return CUR[market] + (v >= 1e12 ? (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : (v / 1e6).toFixed(1) + 'M')
    return v >= 1e8 ? (v / 1e8).toFixed(2) + t('亿') : (v / 1e4).toFixed(2) + t('万')
  }
  const fmtVol = (v) => {
    if (!(v > 0)) return '--'
    const myriad = ['zh', 'ja', 'ko'].includes(localStorage.getItem('bfs_lang') || 'zh')
    const unit = market === 'cn' ? t('手') : t('股')
    if (myriad) return (v >= 1e8 ? (v / 1e8).toFixed(2) + t('亿') : v >= 1e4 ? (v / 1e4).toFixed(1) + t('万') : v.toFixed(0)) + unit
    return (v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v.toFixed(0)) + (market === 'cn' ? ' ' + unit : '')
  }

  return (
    <div className="m-stack" style={{ gap: 16 }}>
      <div className="m-nav">
        <button className="m-iconbtn" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} aria-label={t('返回')}>{Icon.back}</button>
        <div className="m-nav-title"><div style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          {price != null && <small className="m-num" style={{ color: c }}>{num(price)} {pct(p)}</small>}</div>
        <button className="m-iconbtn" onClick={() => (watched ? remove(code) : add({ code, name, market }))} aria-label={watched ? t('移出自选') : t('加入自选')}>{watched ? Icon.starFill : Icon.star}</button>
      </div>

      <div style={{ padding: '0 4px' }}>
        {price == null ? <Skeleton h={50} w={190} /> : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span className="m-num m-serif-num" style={{ fontSize: 44, color: c }}>{num(price)}</span>
            <span style={{ display: 'grid', gap: 3 }}><Pill value={p} market={market} width={86} /><span className="m-num" style={{ color: c, fontSize: 13, fontWeight: 650, paddingLeft: 4 }}>{d.change > 0 ? '+' : ''}{num(d.change)}</span></span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span><span className="m-sub" style={{ flex: 'none' }}>{code}</span><span className="m-chip">{t(chipLabel(market))}</span>
          <button onClick={() => nav(`/paper?buy=${encodeURIComponent(code)}&market=${market}`)}
            style={{ marginLeft: 'auto', flex: 'none', padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, color: 'var(--accent-ink)', background: 'var(--accent)' }}>
            {t('模拟买入')}
          </button>
        </div>
      </div>

      {intl && d && (
        <div style={{ display: 'flex', alignItems: 'stretch', background: 'var(--surface-hi)', borderRadius: 14, padding: '12px 0' }}>
          {[[t('总市值'), money(d.market_cap)], [t('市盈率'), d.pe_ratio > 0 ? d.pe_ratio.toFixed(1) : '--'], [t('成交额'), money(d.amount)]].map(([k, v], i) => (
            <div key={k} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid var(--line, rgba(128,128,128,.25))' : 'none' }}>
              <div className="m-label">{k}</div><div className="m-num" style={{ fontWeight: 600, fontSize: 15, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="m-card" style={{ padding: 12 }}>
        <Segment full value={period} onChange={setPeriod} options={PERIODS.map(([v, l]) => ({ value: v, label: t(l) }))} />
        <div style={{ height: 8 }} />
        <Segment full value={indicator} onChange={setIndicator} options={[{ value: 'ma', label: t('指标') }, { value: 'macd', label: 'MACD' }, { value: 'rsi', label: 'RSI' }, { value: 'boll', label: 'BOLL' }]} />
        <div style={{ height: 12 }} />
        {!all ? (h.error ? <ErrorBox onRetry={h.reload} /> : <Skeleton h={300} r={14} />) : <KLine all={all} count={Number(period)} market={market} indicator={indicator} />}
      </div>

      <div className="m-card" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[...grid, [t('成交量'), fmtVol(vol)], intl
              ? [t('日内振幅'), high > 0 && low > 0 && prevClose > 0 ? ((high - low) / prevClose * 100).toFixed(2) + '%' : '--']
              : [t('成交额'), money(d?.amount)]].map(([k, v], i) => (
            <div key={i}><div className="m-label">{k}</div><div className="m-num" style={{ fontWeight: 600, fontSize: 15, marginTop: 3 }}>{typeof v === 'number' ? num(v) : (v ?? '--')}</div></div>
          ))}
        </div>
        {pos != null && (
          <div>
            <div className="m-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>{has52 ? t('52周最低') : t('区间最低')}</span><span>{has52 ? t('52周最高') : t('区间最高')}</span></div>
            <div style={{ position: 'relative', height: 14 }}>
              <span style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 6, borderRadius: 3, background: `${changeColor(-1, market)}`, opacity: .75 }} />
              <span style={{ position: 'absolute', top: 0, width: 14, height: 14, borderRadius: 7, background: 'var(--text)', left: `calc((100% - 14px) * ${pos})` }} />
            </div>
            <div className="m-num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 13, fontWeight: 600 }}><span>{num(lo)}</span><span>{num(hi)}</span></div>
          </div>
        )}
      </div>

      {market === 'us' && <Fundamentals symbol={code} price={d?.price} />}
      {!hkjp && <News symbol={code} market={market} />}
      <div className="m-footer">{t('仅供学习，不构成投资建议')}</div>
    </div>
  )
}
