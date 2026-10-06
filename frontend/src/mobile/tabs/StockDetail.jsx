import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from '../../lib/echarts'
import useWatchlistStore from '../../store/watchlistStore'
import { useT } from '../i18n'
import { useAPI, num, pct } from '../data'
import { boll, ma, macd, rsi } from '../indicators'
import { ErrorBox, Pill, Section, Segment, Skeleton, SkeletonRows } from '../ui'
import { changeColor } from '../helpers'
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
      series.push(line('MA5', cut(ma(closes, 5)), '#E0A100'), line('MA10', cut(ma(closes, 10)), '#B05CF0'), line('MA20', cut(ma(closes, 20)), '#F28B3C'))
    }
    series.push({ type: 'bar', data: candles.map((c) => ({ value: c.volume, itemStyle: { color: c.close >= c.open ? upC : downC, opacity: .75 } })), xAxisIndex: 1, yAxisIndex: 1, barMaxWidth: 9 })
    if (indicator === 'macd') {
      const m = macd(closes)
      series.push({ type: 'bar', data: cut(m.hist).map((v) => ({ value: v, itemStyle: { color: v >= 0 ? upC : downC, opacity: .8 } })), xAxisIndex: 2, yAxisIndex: 2, barMaxWidth: 7 },
        line('DIF', cut(m.dif), css('--text')), line('DEA', cut(m.dea), '#E0A100'))
      series[series.length - 2].xAxisIndex = 2; series[series.length - 2].yAxisIndex = 2
      series[series.length - 1].xAxisIndex = 2; series[series.length - 1].yAxisIndex = 2
    } else if (indicator === 'rsi') {
      const r = line('RSI', cut(rsi(closes)), '#B05CF0'); r.xAxisIndex = 2; r.yAxisIndex = 2
      r.markLine = { silent: true, symbol: 'none', label: { show: false }, lineStyle: { type: 'dashed', color: txt, opacity: .5 }, data: [{ yAxis: 70 }, { yAxis: 30 }] }
      series.push(r)
    }
    return {
      animation: false, backgroundColor: 'transparent',
      grid: gridsDef,
      xAxis: gridsDef.map((_, i) => axisCommon(i)),
      yAxis: gridsDef.map((_, i) => ({ gridIndex: i, position: 'right', scale: i !== 1, splitNumber: i === 0 ? 4 : 2, axisLabel: { color: txt, fontSize: 10, formatter: i === 1 ? (v) => (v >= 1e8 ? (v / 1e8).toFixed(1) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v) : undefined },
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
        <div className="m-num" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 11.5, padding: '0 4px 8px', color: 'var(--text-2)' }}>
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
  const { data, error, reload } = useAPI(`/news/${symbol}?market=${market}`)
  const o = data?.overall
  // news tone colours follow green = good / red = bad everywhere
  const good = 'var(--cn-down)', bad = 'var(--cn-up)'
  return (
    <Section title={t('相关新闻')}>
      {!data ? (error ? <ErrorBox onRetry={reload} /> : <SkeletonRows rows={4} />) : (
        <div className="m-card flush">
          {o && (
            <div style={{ padding: 14, borderBottom: '1px solid var(--stroke)' }}>
              <div className="m-num" style={{ display: 'flex', gap: 10, fontSize: 12.5, fontWeight: 700 }}>
                <span style={{ color: good }}>{t('利好')} {o.positive_count}</span><span className="m-muted">· {t('中性')} {o.neutral_count}</span>
                <span style={{ color: bad }}>· {t('利空')} {o.negative_count}</span>
                <span style={{ marginLeft: 'auto', color: o.sentiment_score > .05 ? good : o.sentiment_score < -.05 ? bad : 'var(--text-2)' }}>{t('情感 %@', (o.sentiment_score > 0 ? '+' : '') + o.sentiment_score.toFixed(2))}</span>
              </div>
              {o.ai_summary && <p className="m-muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>{o.ai_summary}</p>}
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
                  <div className="m-label" style={{ marginTop: 5, display: 'flex', gap: 8 }}><span>{n.source}</span><span style={{ marginLeft: 'auto', color: c, fontWeight: 700 }}>{label}</span></div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </Section>
  )
}

export default function StockDetail() {
  const { market, code } = useParams()
  const t = useT(); const nav = useNavigate()
  const [period, setPeriod] = useState('30'); const [indicator, setIndicator] = useState('ma')
  const watched = useWatchlistStore((s) => s.list.some((x) => x.code === code))
  const add = useWatchlistStore((s) => s.add), remove = useWatchlistStore((s) => s.remove)

  const q = useAPI(market === 'cn' ? `/stocks/${code}/realtime` : `/us/stock/${code}/realtime`, { refreshMs: 30000 })
  const h = useAPI(market === 'cn' ? `/stocks/${code}/history?count=250` : `/us/stock/${code}/history?count=250`)
  const all = h.data ? (market === 'cn' ? h.data.candles : h.data.data) : null
  const candles = useMemo(() => (all ? all.slice(-Number(period)) : []), [all, period])

  const d = q.data
  const price = d?.price
  const p = d ? (market === 'cn' ? d.pct_change : d.change_pct) : null
  const name = d?.name || code
  const last = candles[candles.length - 1]
  const open = d?.open > 0 ? d.open : last?.open, high = d?.high > 0 ? d.high : last?.high, low = d?.low > 0 ? d.low : last?.low
  const vol = d?.volume > 0 ? d.volume : last?.volume
  const [lo, hi] = all ? [Math.min(...all.map((c) => c.low)), Math.max(...all.map((c) => c.high))] : [null, null]
  const pos = price != null && hi > lo ? Math.min(1, Math.max(0, (price - lo) / (hi - lo))) : null
  const c = changeColor(p, market)

  const grid = [[t('今开'), open], [t('昨收'), d?.prev_close > 0 ? d.prev_close : (candles.length > 1 ? candles[candles.length - 2].close : null)], [t('最高'), high], [t('最低'), low]]
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
        <button className="m-iconbtn" onClick={() => (watched ? remove(code) : add({ code, name }))} aria-label={watched ? t('移出自选') : t('加入自选')}>{watched ? Icon.starFill : Icon.star}</button>
      </div>

      <div style={{ padding: '0 4px' }}>
        {price == null ? <Skeleton h={50} w={190} /> : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span className="m-num" style={{ fontSize: 42, fontWeight: 800, color: c, letterSpacing: -1 }}>{num(price)}</span>
            <span style={{ display: 'grid', gap: 3 }}><Pill value={p} market={market} width={86} /><span className="m-num" style={{ color: c, fontSize: 12.5, fontWeight: 650, paddingLeft: 4 }}>{d.change > 0 ? '+' : ''}{num(d.change)}</span></span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontWeight: 600 }}>{name}</span><span className="m-sub" style={{ flex: 'none' }}>{code}</span><span className="m-chip">{market === 'us' ? t('美股') : t('A股')}</span>
        </div>
      </div>

      <div className="m-card" style={{ padding: 12 }}>
        <Segment full value={period} onChange={setPeriod} options={PERIODS.map(([v, l]) => ({ value: v, label: t(l) }))} />
        <div style={{ height: 8 }} />
        <Segment full value={indicator} onChange={setIndicator} options={[{ value: 'ma', label: t('指标') }, { value: 'macd', label: 'MACD' }, { value: 'rsi', label: 'RSI' }, { value: 'boll', label: 'BOLL' }]} />
        <div style={{ height: 12 }} />
        {!all ? (h.error ? <ErrorBox onRetry={h.reload} /> : <Skeleton h={300} r={14} />) : <KLine all={all} count={Number(period)} market={market} indicator={indicator} />}
      </div>

      <div className="m-card" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[...grid, [t('成交量'), fmtVol(vol)], [t('成交额'), d?.amount > 0 ? (d.amount >= 1e8 ? (d.amount / 1e8).toFixed(2) + t('亿') : (d.amount / 1e4).toFixed(2) + t('万')) : '--']].map(([k, v], i) => (
            <div key={i}><div className="m-label">{k}</div><div className="m-num" style={{ fontWeight: 700, fontSize: 15, marginTop: 3 }}>{typeof v === 'number' ? num(v) : (v ?? '--')}</div></div>
          ))}
        </div>
        {pos != null && (
          <div>
            <div className="m-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>{t('区间最低')}</span><span>{t('区间最高')}</span></div>
            <div style={{ position: 'relative', height: 14 }}>
              <span style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${changeColor(-1, market)}, ${changeColor(1, market)})`, opacity: .75 }} />
              <span style={{ position: 'absolute', top: 0, width: 14, height: 14, borderRadius: 7, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.35)', left: `calc((100% - 14px) * ${pos})` }} />
            </div>
            <div className="m-num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 12.5, fontWeight: 700 }}><span>{num(lo)}</span><span>{num(hi)}</span></div>
          </div>
        )}
      </div>

      <News symbol={code} market={market} />
      <div className="m-footer">{t('仅供学习，不构成投资建议')}</div>
    </div>
  )
}
