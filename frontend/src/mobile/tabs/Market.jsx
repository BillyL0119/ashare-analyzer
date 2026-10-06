import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useWatchlistStore from '../../store/watchlistStore'
import useLangStore from '../../store/langStore'
import { useT } from '../i18n'
import { getJSON, useAPI, pct, num } from '../data'
import { ErrorBox, Gauge, Pill, Section, Segment, Skeleton, SkeletonRows, Sparkline } from '../ui'
import { changeColor, marketOf, marketOfRegion } from '../helpers'
import USMarket from './USMarket'
import { Icon } from '../icons'
const open = (nav, market, code) => nav(`/stock/${market}/${code}`)

function useRecent() {
  const [list, setList] = useState(() => { try { return JSON.parse(localStorage.getItem('bfs_m_recent') || '[]') } catch { return [] } })
  const add = (item) => {
    const next = [item, ...list.filter((x) => !(x.code === item.code && x.market === item.market))].slice(0, 8)
    setList(next); try { localStorage.setItem('bfs_m_recent', JSON.stringify(next)) } catch { /* ignore */ }
  }
  const clear = () => { setList([]); try { localStorage.removeItem('bfs_m_recent') } catch { /* ignore */ } }
  return { list, add, clear }
}

function SearchBox() {
  const t = useT(); const nav = useNavigate()
  const [q, setQ] = useState(''); const [results, setResults] = useState(null); const [busy, setBusy] = useState(false)
  const recent = useRecent()
  const seq = useRef(0)

  useEffect(() => {
    const term = q.trim()
    if (!term) return undefined
    const id = ++seq.current
    const timer = setTimeout(async () => {
      setBusy(true)
      // US first: any ticker or company (English or Chinese name). A-share lookup only when it can be an A-share.
      const mayBeAShare = /^\d+$/.test(term) || /[\u2E80-\uFFFF]/.test(term)
      const [cn, us] = await Promise.allSettled([
        mayBeAShare ? getJSON('/stocks/search?q=' + encodeURIComponent(term)) : Promise.resolve([]),
        getJSON('/us/market/search?q=' + encodeURIComponent(term)),
      ])
      if (id !== seq.current) return
      const cnList = cn.status === 'fulfilled' ? cn.value.map((r) => ({ code: r.code, name: r.name, pct: r.change_pct, market: 'cn' })) : []
      const usList = us.status === 'fulfilled' ? us.value.results.map((r) => ({ code: r.symbol, name: r.name, pct: r.pct, market: 'us' })) : []
      setResults([...usList, ...cnList]); setBusy(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  const pick = (r) => { recent.add({ code: r.code, name: r.name, market: r.market }); setQ(''); open(nav, r.market, r.code) }

  return (
    <>
      <label className="m-search">
        {Icon.search}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('搜索股票或代码')} enterKeyHint="search"
          autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
        {q && <button onClick={() => setQ('')} aria-label={t('清除')} className="m-muted">✕</button>}
      </label>
      {q.trim() && (
        <div className="m-card flush" style={{ marginBottom: 22 }}>
          {busy && !results && <div className="m-empty">{t('加载中')}…</div>}
          {results && results.length === 0 && <div className="m-empty">{t('未找到相关股票')}</div>}
          {(results || []).map((r) => (
            <button className="m-row" key={r.market + r.code} onClick={() => pick(r)}>
              <div className="m-grow"><div className="m-name">{r.name}</div><div className="m-sub">{r.code}</div></div>
              <span className="m-chip">{r.market === 'us' ? t('美股') : t('A股')}</span>
              {r.pct != null && <Pill value={r.pct} market={r.market} width={72} />}
            </button>
          ))}
        </div>
      )}
      {!q.trim() && recent.list.length > 0 && (
        <div style={{ margin: '-6px 0 20px', display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <span className="m-label" style={{ flex: 'none' }}>{t('最近搜索')}</span>
          {recent.list.map((r) => <button key={r.market + r.code} className="m-chip" style={{ flex: 'none' }} onClick={() => open(nav, r.market, r.code)}>{r.name}</button>)}
          <button className="m-link" style={{ flex: 'none', fontSize: 12 }} onClick={recent.clear}>{t('清除')}</button>
        </div>
      )}
    </>
  )
}

function IndexTile({ name, q }) {
  const p = q ? q.change_pct * 100 : null
  const c = changeColor(p, 'cn')
  return (
    <div className="m-tile" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${c} 16%, transparent), var(--surface-hi))` }}>
      <div className="m-label">{name}</div>
      <div className="m-big m-num" style={{ margin: '5px 0 3px', fontSize: 16 }}>{q ? num(q.value) : '--'}</div>
      <div className="m-num" style={{ color: c, fontWeight: 700, fontSize: 12.5 }}>{pct(p)}</div>
    </div>
  )
}

function Overview() {
  const t = useT()
  const { data: d, error, reload } = useAPI('/market/overview')
  if (!d) return error ? <ErrorBox onRetry={reload} /> : (
    <div className="m-card" style={{ display: 'grid', gap: 14 }}><Skeleton w={90} h={14} /><div className="m-tiles"><Skeleton h={78} r={14} /><Skeleton h={78} r={14} /><Skeleton h={78} r={14} /></div><Skeleton h={8} r={4} /></div>
  )
  const up = d.advance_count, flat = d.flat_count, down = d.decline_count, total = up + flat + down
  const noIdx = !d.shanghai_index && !d.shenzhen_index && !d.chinext_index
  return (
    <div className="m-card" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }} />
        <b style={{ fontSize: 14 }}>{t('A股大盘')}</b><span className="m-muted m-num" style={{ marginLeft: 'auto', fontSize: 12 }}>{d.date}</span>
      </div>
      {noIdx ? <div className="m-tile m-muted" style={{ fontSize: 13 }}>{t('暂无指数数据，开盘后自动更新')}</div> : (
        <div className="m-tiles">
          <IndexTile name={t('上证指数')} q={d.shanghai_index} /><IndexTile name={t('深证成指')} q={d.shenzhen_index} /><IndexTile name={t('创业板指')} q={d.chinext_index} />
        </div>
      )}
      <div>
        <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--surface-hi)' }}>
          {total > 0 && <><span style={{ flex: up, background: 'var(--cn-up)' }} /><span style={{ flex: flat, background: 'var(--text-3)', opacity: .5 }} /><span style={{ flex: down, background: 'var(--cn-down)' }} /></>}
        </div>
        <div className="m-num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, fontWeight: 600 }}>
          <span style={{ color: 'var(--cn-up)' }}>{t('%lld 上涨', up.toLocaleString())}</span>
          <span className="m-muted">{t('%lld 平盘', flat)}</span>
          <span style={{ color: 'var(--cn-down)' }}>{t('%lld 下跌', down.toLocaleString())}</span>
        </div>
      </div>
    </div>
  )
}

function WatchRow({ item }) {
  const nav = useNavigate()
  const market = marketOf(item.code)
  const q = useAPI(market === 'cn' ? `/stocks/${item.code}/realtime` : `/us/stock/${item.code}/realtime`)
  const h = useAPI(market === 'cn' ? `/stocks/${item.code}/history?count=30` : `/us/stock/${item.code}/history?count=30`)
  const closes = useMemo(() => {
    const c = h.data ? (market === 'cn' ? h.data.candles : h.data.data) : null
    return c ? c.slice(-30).map((x) => x.close) : []
  }, [h.data, market])
  const trend = closes.length > 1 ? closes[closes.length - 1] - closes[0] : 0
  const p = q.data ? (market === 'cn' ? q.data.pct_change : q.data.change_pct) : null
  return (
    <button className="m-row" onClick={() => open(nav, market, item.code)}>
      <div className="m-grow"><div className="m-name">{item.name}</div><div className="m-sub">{item.code}</div></div>
      <Sparkline values={closes} color={changeColor(trend, market)} />
      <span className="m-num" style={{ fontWeight: 650, minWidth: 66, textAlign: 'right' }}>{q.data ? num(q.data.price) : ''}</span>
      <Pill value={p} market={market} width={78} />
    </button>
  )
}

function Watchlist() {
  const t = useT()
  const list = useWatchlistStore((s) => s.list)
  const [editing, setEditing] = useState(false)
  const remove = useWatchlistStore((s) => s.remove)
  if (!list.length) {
    return (
      <Section title={t('自选股')}>
        <div className="m-card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span className="m-iconbtn" style={{ width: 44, height: 44, color: 'var(--accent)' }}>{Icon.star}</span>
          <div><b style={{ fontSize: 14 }}>{t('还没有自选股')}</b><div className="m-label" style={{ marginTop: 3, fontSize: 12 }}>{t('搜索股票，点详情页右上角的星标即可添加')}</div></div>
        </div>
      </Section>
    )
  }
  return (
    <Section title={t('自选股')} action={editing ? t('完成') : t('编辑')} onAction={() => setEditing(!editing)}>
      <div className="m-card flush">
        {list.map((it) => editing ? (
          <div className="m-row" key={it.code}>
            <button aria-label={t('移出自选') + ' ' + it.name} onClick={() => remove(it.code)} style={{ color: '#ef4444', fontSize: 22, lineHeight: 1 }}>⊖</button>
            <div className="m-grow"><div className="m-name">{it.name}</div><div className="m-sub">{it.code}</div></div>
          </div>
        ) : <WatchRow key={it.code} item={it} />)}
      </div>
    </Section>
  )
}

function Global() {
  const t = useT(); const lang = useLangStore((s) => s.lang)
  const { data: s, error, reload } = useAPI('/market/sentiment')
  return (
    <Section title={t('全球市场')}>
      <div className="m-card" style={{ display: 'grid', gap: 16 }}>
        {!s ? (error ? <ErrorBox onRetry={reload} /> : <><div className="m-tiles"><Skeleton h={124} r={14} /><Skeleton h={124} r={14} /></div><Skeleton h={72} r={14} /></>) : (
          <>
            <div className="m-tiles">
              <Gauge title={t('美股情绪')} score={s.us_sentiment.score} label={t(s.us_sentiment.label_zh)} />
              <Gauge title={t('A股情绪')} score={s.cn_sentiment.score} label={t(s.cn_sentiment.label_zh)} />
            </div>
            <div className="m-strip">
              {s.indices.filter((i) => i.close > 0 && i.change_pct != null).map((i) => {
                const m = marketOfRegion(i.region); const c = changeColor(i.change_pct, m)
                return (
                  <div key={i.symbol} className="m-tile" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${c} 14%, transparent), var(--surface-hi))` }}>
                    <div className="m-label">{lang === 'zh' ? i.name_zh : i.name}</div>
                    <div className="m-num" style={{ fontWeight: 800, fontSize: 15, margin: '5px 0 3px' }}>{num(i.close)}</div>
                    <div className="m-num" style={{ color: c, fontWeight: 700, fontSize: 12.5 }}>{pct(i.change_pct)}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Section>
  )
}

function Sectors() {
  const t = useT()
  const { data, error, reload } = useAPI('/market/sectors')
  const rows = data?.sectors || []
  const maxAbs = Math.max(0.01, ...rows.map((r) => Math.abs(r.change_pct)))
  return (
    <Section title={t('行业板块')}>
      {!data ? (error ? <ErrorBox onRetry={reload} /> : <SkeletonRows rows={4} />) : (
        <div className="m-card flush">
          {rows.map((r) => {
            const c = changeColor(r.change_pct, 'cn'); const w = (Math.abs(r.change_pct) / maxAbs) * 50
            return (
              <div className="m-row" key={r.name} style={{ padding: '11px 16px' }}>
                <div style={{ width: 92, flex: 'none', minWidth: 0 }}>
                  <div className="m-name">{t(r.name)}</div>
                  {r.leader && <div className="m-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('领涨 %@', r.leader)}</div>}
                </div>
                <div className="m-grow" style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--surface-hi)' }} aria-hidden="true">
                  <span style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 4, background: c, width: `max(${w}%, 3px)`, ...(r.change_pct >= 0 ? { left: '50%' } : { right: '50%' }) }} />
                </div>
                <Pill value={r.change_pct} market="cn" width={74} />
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

function Hot() {
  const t = useT(); const nav = useNavigate()
  const [market, setMarket] = useState('cn')
  const { data, error, reload } = useAPI(`/stocks/hot?market=${market}`)
  return (
    <Section title={t('热门股票')} action={null}>
      <div style={{ margin: '-4px 4px 10px' }}><Segment value={market} onChange={setMarket} options={[{ value: 'cn', label: t('A股') }, { value: 'us', label: t('美股') }]} /></div>
      {!data ? (error ? <ErrorBox onRetry={reload} /> : <SkeletonRows rows={5} />) : data.length === 0 ? (
        <div className="m-card m-empty">{t('暂无热门股数据，稍后下拉刷新')}</div>
      ) : (
        <div className="m-card flush">
          {data.slice(0, 20).map((s, i) => (
            <button className="m-row" key={s.code} onClick={() => open(nav, market, s.code)}>
              <span className="m-num" style={{ width: 20, fontWeight: 800, fontSize: 13, color: i < 3 ? 'var(--accent)' : 'var(--text-3)' }}>{i + 1}</span>
              <div className="m-grow"><div className="m-name">{s.name}</div><div className="m-sub">{s.code}</div></div>
              <Pill value={s.change_pct} market={market} />
            </button>
          ))}
        </div>
      )}
    </Section>
  )
}

function useMode() {
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('bfs_m_market') === 'cn' ? 'cn' : 'us' } catch { return 'us' } })
  const change = (m) => { setMode(m); try { localStorage.setItem('bfs_m_market', m) } catch { /* ignore */ } }
  return [mode, change]
}

export default function Market({ onSettings }) {
  const t = useT()
  const [mode, setMode] = useMode()
  return (
    <div className="m-stack" style={{ gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="m-title">{t('行情')}</h1>
        <button className="m-iconbtn" onClick={onSettings} aria-label={t('关于')}>{Icon.more}</button>
      </div>
      <SearchBox />
      <div style={{ marginBottom: 20 }}><Segment full value={mode} onChange={setMode} options={[{ value: 'us', label: t('美股') }, { value: 'cn', label: t('A股') }]} /></div>
      <div className="m-stack">
        {mode === 'us' ? (
          <><USMarket /><Watchlist /><Global /></>
        ) : (
          <><Overview /><Watchlist /><Global /><Sectors /><Hot /></>
        )}
        <div className="m-footer">{t('仅供学习，不构成投资建议')}</div>
        <div className="m-footer" style={{ marginTop: -18 }}>{t('数据延迟，仅供参考')}</div>
      </div>
    </div>
  )
}
