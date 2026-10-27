import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useCompareStore from '../store/compareStore'
import { SECTOR_ZH } from '../utils/heatmap'

// US stock screener (/api/us/screener). Sectors are GICS in English, the same ones the heatmap
// groups by; the Chinese view translates them, industries (Nasdaq's) stay in English.

const L = {
  zh: {
    eyebrow: '选股器', title: '美股选股器', sub: (n) => `按行业、规模、估值和走势筛选 ${n.toLocaleString()} 家美国上市公司，点击任意一行查看完整分析。`,
    presets: '快速筛选', all: '全部', biggest: '最大公司', gainers: '今日涨幅榜', losers: '今日跌幅榜', active: '成交最活跃',
    nearHigh: '接近 52 周高点', value: '低估值大盘股', newly: '近两年新上市',
    filters: '筛选条件', search: '代码或公司名', sector: '行业板块', anySector: '全部板块', industry: '细分行业', anyIndustry: '全部细分行业',
    cap: '市值', mega: '超大 >$200B', large: '大盘 $10–200B', mid: '中盘 $2–10B', small: '小盘 $300M–2B', micro: '微盘 <$300M',
    pe: '市盈率', price: '股价 ($)', change: '今日涨跌 (%)', min: '最小', max: '最大', volume: '最低成交量', any: '不限',
    fromHigh: '距 52 周高点', within: (n) => `${n}% 以内`, usOnly: '只看美国公司', reset: '清除条件',
    results: (a, b, n) => `第 ${a}–${b} 条，共 ${n.toLocaleString()} 家`, none: '没有符合条件的公司，试试放宽条件',
    colSymbol: '代码', colName: '公司', colSector: '板块', colCap: '市值', colPrice: '股价', colChange: '涨跌', colVolume: '成交量', colPe: '市盈率', colHigh: '距高点',
    prev: '上一页', next: '下一页', loading: '正在加载…', error: '暂时无法加载选股数据',
    note: '数据：Nasdaq（公司列表、细分行业）· GICS（板块）· 腾讯（价格、市盈率、52 周区间）。价格每 10 分钟更新，可能有延迟，仅供学习。',
    peNote: '市盈率为空的公司（亏损或无数据）不参与市盈率筛选',
  },
  en: {
    eyebrow: 'Screener', title: 'US Stock Screener', sub: (n) => `Filter ${n.toLocaleString()} US-listed companies by sector, size, valuation and momentum. Click any row for the full analysis.`,
    presets: 'Quick screens', all: 'All', biggest: 'Largest companies', gainers: 'Top gainers today', losers: 'Top losers today', active: 'Most active',
    nearHigh: 'Near 52-week high', value: 'Value large caps', newly: 'Newly listed',
    filters: 'Filters', search: 'Symbol or company', sector: 'Sector', anySector: 'All sectors', industry: 'Industry', anyIndustry: 'All industries',
    cap: 'Market cap', mega: 'Mega >$200B', large: 'Large $10–200B', mid: 'Mid $2–10B', small: 'Small $300M–2B', micro: 'Micro <$300M',
    pe: 'P/E', price: 'Price ($)', change: 'Day change (%)', min: 'Min', max: 'Max', volume: 'Min volume', any: 'Any',
    fromHigh: 'From 52-week high', within: (n) => `Within ${n}%`, usOnly: 'US companies only', reset: 'Clear filters',
    results: (a, b, n) => `${a}–${b} of ${n.toLocaleString()}`, none: 'No companies match. Try loosening the filters.',
    colSymbol: 'Symbol', colName: 'Company', colSector: 'Sector', colCap: 'Market cap', colPrice: 'Price', colChange: 'Change', colVolume: 'Volume', colPe: 'P/E', colHigh: 'From high',
    prev: 'Previous', next: 'Next', loading: 'Loading…', error: 'The screener is unavailable right now',
    note: 'Data: Nasdaq (company list, industries) · GICS (sectors) · Tencent (prices, P/E, 52-week range). Prices refresh every 10 minutes and may be delayed. For learning only.',
    peNote: 'Companies without a P/E (losses or no data) are left out of P/E filters',
  },
}
L.ja = { ...L.en, eyebrow: 'スクリーナー', title: '米国株スクリーナー', presets: 'クイック検索', all: 'すべて', biggest: '時価総額上位', gainers: '本日の値上がり', losers: '本日の値下がり',
  active: '出来高上位', nearHigh: '52週高値圏', value: '割安な大型株', newly: '新規上場', filters: '条件', search: '銘柄コード・社名', sector: 'セクター', anySector: '全セクター',
  industry: '業種', anyIndustry: '全業種', cap: '時価総額', pe: 'PER', price: '株価 ($)', change: '前日比 (%)', min: '最小', max: '最大', volume: '最低出来高', any: '指定なし',
  fromHigh: '52週高値からの距離', within: (n) => `${n}% 以内`, usOnly: '米国企業のみ', reset: '条件をクリア', none: '該当する企業がありません',
  colSymbol: 'コード', colName: '企業', colSector: 'セクター', colCap: '時価総額', colPrice: '株価', colChange: '前日比', colVolume: '出来高', colPe: 'PER', colHigh: '高値から',
  prev: '前へ', next: '次へ', loading: '読み込み中…' }
L.ko = { ...L.en, eyebrow: '스크리너', title: '미국 주식 스크리너', presets: '빠른 검색', all: '전체', biggest: '시가총액 상위', gainers: '오늘의 상승', losers: '오늘의 하락',
  active: '거래 활발', nearHigh: '52주 고점 근접', value: '저평가 대형주', newly: '신규 상장', filters: '조건', search: '티커 또는 기업명', sector: '섹터', anySector: '전체 섹터',
  industry: '업종', anyIndustry: '전체 업종', cap: '시가총액', pe: 'P/E', price: '주가 ($)', change: '등락률 (%)', min: '최소', max: '최대', volume: '최소 거래량', any: '제한 없음',
  fromHigh: '52주 고점 대비', within: (n) => `${n}% 이내`, usOnly: '미국 기업만', reset: '조건 초기화', none: '조건에 맞는 기업이 없습니다',
  colSymbol: '티커', colName: '기업', colSector: '섹터', colCap: '시가총액', colPrice: '주가', colChange: '등락', colVolume: '거래량', colPe: 'P/E', colHigh: '고점 대비',
  prev: '이전', next: '다음', loading: '불러오는 중…' }
L.fr = { ...L.en, eyebrow: 'Filtre', title: 'Filtre d\'actions US', presets: 'Filtres rapides', all: 'Tout', biggest: 'Plus grandes sociétés', gainers: 'Plus fortes hausses', losers: 'Plus fortes baisses',
  active: 'Plus actives', nearHigh: 'Proches du plus haut 52 sem.', value: 'Grandes valeurs peu chères', newly: 'Nouvelles cotations', filters: 'Filtres', search: 'Symbole ou société',
  sector: 'Secteur', anySector: 'Tous les secteurs', industry: 'Industrie', anyIndustry: 'Toutes les industries', cap: 'Capitalisation', pe: 'PER', price: 'Cours ($)',
  change: 'Variation (%)', min: 'Min', max: 'Max', volume: 'Volume minimum', any: 'Indifférent', fromHigh: 'Écart au plus haut 52 sem.', within: (n) => `À ${n}% près`,
  usOnly: 'Sociétés américaines uniquement', reset: 'Effacer les filtres', none: 'Aucune société ne correspond',
  colSymbol: 'Symbole', colName: 'Société', colSector: 'Secteur', colCap: 'Capitalisation', colPrice: 'Cours', colChange: 'Var.', colVolume: 'Volume', colPe: 'PER', colHigh: 'Vs plus haut',
  prev: 'Précédent', next: 'Suivant', loading: 'Chargement…' }

const PAGE = 50
const EMPTY = { q: '', sector: '', industry: '', cap: [], pe_min: '', pe_max: '', price_min: '', price_max: '', change_min: '', change_max: '', volume_min: '', near_high: '', us_only: false, ipo_since: '' }
const YEAR = new Date().getFullYear()
const PRESETS = [
  { key: 'all', f: {}, sort: ['market_cap', 'desc'] },
  { key: 'biggest', f: { cap: ['mega', 'large'] }, sort: ['market_cap', 'desc'] },
  { key: 'gainers', f: { cap: ['mega', 'large', 'mid'] }, sort: ['change_pct', 'desc'] },
  { key: 'losers', f: { cap: ['mega', 'large', 'mid'] }, sort: ['change_pct', 'asc'] },
  { key: 'active', f: {}, sort: ['volume', 'desc'] },
  { key: 'nearHigh', f: { cap: ['mega', 'large', 'mid'], near_high: '3' }, sort: ['market_cap', 'desc'] },
  { key: 'value', f: { cap: ['mega', 'large'], pe_min: '0', pe_max: '15' }, sort: ['pe', 'asc'] },
  { key: 'newly', f: { cap: ['mega', 'large', 'mid'], ipo_since: String(YEAR - 1) }, sort: ['market_cap', 'desc'] },
]

const money = (v) => (v == null ? '—' : v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${v.toFixed(0)}`)
const vol = (v) => (v == null ? '—' : v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v))
const UP = '#26a69a', DOWN = '#ef5350', ACCENT = '#0ea5e9'

const CSS = `
.sc-wrap { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 18px; align-items: start; }
.sc-panel { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; }
.sc-filters { padding: 14px; display: grid; gap: 14px; position: sticky; top: 112px; }
.sc-lbl { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
.sc-in { width: 100%; box-sizing: border-box; padding: 7px 10px; border-radius: 8px; font-size: 13px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); color: var(--text-primary); outline: none; }
.sc-in:focus { border-color: ${ACCENT}; }
.sc-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.sc-chip { padding: 6px 12px; border-radius: 999px; font-size: 12.5px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-secondary); white-space: nowrap; }
.sc-chip.on { background: color-mix(in srgb, ${ACCENT} 14%, transparent); border-color: color-mix(in srgb, ${ACCENT} 55%, transparent); color: ${ACCENT}; font-weight: 600; }
.sc-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); cursor: pointer; padding: 3px 0; }
.sc-table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
.sc-table th { text-align: right; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--text-muted); padding: 10px 10px; border-bottom: 1px solid var(--border-primary); white-space: nowrap; user-select: none; }
.sc-table th.l, .sc-table td.l { text-align: left; }
.sc-table th.sortable { cursor: pointer; }
.sc-table th.sortable:hover { color: var(--text-primary); }
.sc-table td { text-align: right; padding: 9px 10px; border-bottom: 1px solid var(--border-primary); color: var(--text-secondary); white-space: nowrap; }
.sc-table tr.row { cursor: pointer; transition: background .12s; }
.sc-table tr.row:hover { background: var(--bg-hover); }
.sc-table tr.row:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: -2px; }
@media (max-width: 1400px) { .sc-hide-lg { display: none; } }
@media (max-width: 960px) { .sc-wrap { grid-template-columns: minmax(0, 1fr); } .sc-filters { position: static; } .sc-hide-md { display: none; }
  .sc-filters:not(.open) { display: none; } .sc-ftoggle { display: inline-flex !important; } }
@media (max-width: 600px) { .sc-hide-sm { display: none; } .sc-show-sm { display: block !important; max-width: 104px; } .sc-table { font-size: 12px; } .sc-table td, .sc-table th { padding: 9px 5px; } .sc-table th { font-size: 10px; letter-spacing: 0; } }
.sc-ftoggle, .sc-show-sm { display: none; }
`

export default function ScreenerPage({ lang }) {
  const t = L[lang] || L.en
  const zh = lang === 'zh'
  const nav = useNavigate()
  const [f, setF] = useState(EMPTY)
  const [sort, setSort] = useState(['market_cap', 'desc'])
  const [preset, setPreset] = useState('all')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)   // phones/tablets: filters start collapsed
  const abortRef = useRef(null)

  const params = useMemo(() => {
    const p = new URLSearchParams()
    Object.entries(f).forEach(([k, v]) => {
      if (k === 'cap') { if (v.length) p.set('cap', v.join(',')) }
      else if (k === 'us_only') { if (v) p.set('us_only', 'true') }
      else if (v !== '' && v != null) p.set(k, v)
    })
    p.set('sort', sort[0]); p.set('order', sort[1]); p.set('limit', PAGE); p.set('offset', page * PAGE)
    return p.toString()
  }, [f, sort, page])

  useEffect(() => {
    const id = setTimeout(() => {
      abortRef.current?.abort()
      const ctl = new AbortController(); abortRef.current = ctl
      setLoading(true)
      fetch(`/api/us/screener?${params}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d) => { setData(d); setErr(false); setLoading(false) })
        .catch((e) => { if (e?.name !== 'AbortError') { setErr(true); setLoading(false) } })
    }, 220)
    return () => clearTimeout(id)
  }, [params])

  const set = (patch) => { setF((x) => ({ ...x, ...patch })); setPage(0); setPreset('') }
  const applyPreset = (p) => { setF({ ...EMPTY, ...p.f }); setSort(p.sort); setPage(0); setPreset(p.key) }
  const toggleSort = (key) => { setSort(([k, o]) => (k === key ? [k, o === 'desc' ? 'asc' : 'desc'] : [key, key === 'symbol' ? 'asc' : 'desc'])); setPage(0); setPreset('') }
  const open = (r) => {
    useCompareStore.getState().switchMarketAndAddSymbol('us', { code: r.symbol, name: r.name })
    nav(`/stock/us/${r.symbol}`)
  }
  const sectorName = (s) => (zh ? SECTOR_ZH[s] || s : s)

  const rows = data?.rows || []
  const total = data?.total ?? 0
  const head = (key, label, cls = '') => (
    <th className={`sortable ${cls}`} onClick={() => toggleSort(key)} aria-sort={sort[0] === key ? (sort[1] === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {label}{sort[0] === key ? (sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 22, paddingBottom: 48 }}>
      <style>{CSS}</style>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: ACCENT }}>{t.eyebrow}</div>
        <h1 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{t.title}</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 680, lineHeight: 1.6 }}>{t.sub(data?.universe || 5000)}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }} role="group" aria-label={t.presets}>
        {PRESETS.map((p) => (
          <button key={p.key} className={`sc-chip${preset === p.key ? ' on' : ''}`} onClick={() => applyPreset(p)}>{t[p.key]}</button>
        ))}
      </div>

      <button className="sc-chip sc-ftoggle" style={{ marginBottom: 12 }} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
        {t.filters} {filtersOpen ? '▴' : '▾'}
      </button>
      <div className="sc-wrap">
        <aside className={`sc-panel sc-filters${filtersOpen ? ' open' : ''}`} aria-label={t.filters}>
          <div>
            <div className="sc-lbl">{t.search}</div>
            <input id="sc-q" className="sc-in" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="AAPL, Tesla…" />
          </div>
          <div>
            <div className="sc-lbl">{t.sector}</div>
            <select id="sc-sector" aria-label={t.sector} className="sc-in" value={f.sector} onChange={(e) => set({ sector: e.target.value, industry: '' })}>
              <option value="">{t.anySector}</option>
              {(data?.sectors || []).map((s) => <option key={s.name} value={s.name}>{sectorName(s.name)} ({s.count})</option>)}
            </select>
            {f.sector && (data?.industries || []).length > 0 && (
              <select id="sc-industry" className="sc-in" style={{ marginTop: 6 }} value={f.industry} onChange={(e) => set({ industry: e.target.value })}>
                <option value="">{t.anyIndustry}</option>
                {data.industries.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
              </select>
            )}
          </div>
          <div>
            <div className="sc-lbl">{t.cap}</div>
            {['mega', 'large', 'mid', 'small', 'micro'].map((c) => (
              <label key={c} className="sc-check">
                <input type="checkbox" checked={f.cap.includes(c)} onChange={(e) => set({ cap: e.target.checked ? [...f.cap, c] : f.cap.filter((x) => x !== c) })} />
                {t[c]}
              </label>
            ))}
          </div>
          {[['pe', 'pe_min', 'pe_max'], ['price', 'price_min', 'price_max'], ['change', 'change_min', 'change_max']].map(([k, lo, hi]) => (
            <div key={k}>
              <div className="sc-lbl">{t[k]}</div>
              <div className="sc-pair">
                <input id={`sc-${lo}`} className="sc-in" inputMode="decimal" placeholder={t.min} value={f[lo]} onChange={(e) => set({ [lo]: e.target.value.replace(/[^\d.-]/g, '') })} />
                <input id={`sc-${hi}`} className="sc-in" inputMode="decimal" placeholder={t.max} value={f[hi]} onChange={(e) => set({ [hi]: e.target.value.replace(/[^\d.-]/g, '') })} />
              </div>
            </div>
          ))}
          <div>
            <div className="sc-lbl">{t.volume}</div>
            <select id="sc-volume" aria-label={t.volume} className="sc-in" value={f.volume_min} onChange={(e) => set({ volume_min: e.target.value })}>
              <option value="">{t.any}</option>
              {[[1e5, '100K'], [5e5, '500K'], [1e6, '1M'], [5e6, '5M'], [2e7, '20M']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <div className="sc-lbl">{t.fromHigh}</div>
            <select id="sc-near" aria-label={t.fromHigh} className="sc-in" value={f.near_high} onChange={(e) => set({ near_high: e.target.value })}>
              <option value="">{t.any}</option>
              {[3, 5, 10, 20].map((n) => <option key={n} value={n}>{t.within(n)}</option>)}
            </select>
          </div>
          <label className="sc-check">
            <input type="checkbox" checked={f.us_only} onChange={(e) => set({ us_only: e.target.checked })} /> {t.usOnly}
          </label>
          <button className="sc-chip" style={{ justifySelf: 'start' }} onClick={() => applyPreset(PRESETS[0])}>{t.reset}</button>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.peNote}</div>
        </aside>

        <section className="sc-panel" style={{ overflow: 'hidden', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid var(--border-primary)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              {err ? t.error : !data ? t.loading : total === 0 ? t.none : t.results(page * PAGE + 1, Math.min(total, (page + 1) * PAGE), total)}
            </span>
            <div style={{ display: 'flex', gap: 6, opacity: loading ? 0.6 : 1 }}>
              <button className="sc-chip" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← {t.prev}</button>
              <button className="sc-chip" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>{t.next} →</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto', opacity: loading && data ? 0.65 : 1, transition: 'opacity .15s' }}>
            <table className="sc-table">
              <thead>
                <tr>
                  {head('symbol', t.colSymbol, 'l')}
                  <th className="l sc-hide-sm">{t.colName}</th>
                  <th className="l sc-hide-lg">{t.colSector}</th>
                  {head('market_cap', t.colCap)}
                  {head('price', t.colPrice)}
                  {head('change_pct', t.colChange)}
                  {head('volume', t.colVolume, 'sc-hide-sm')}
                  {head('pe', t.colPe, 'sc-hide-sm')}
                  {head('off_high_pct', t.colHigh, 'sc-hide-md')}
                </tr>
              </thead>
              <tbody>
                {!data && !err && Array.from({ length: 10 }, (_, i) => (
                  <tr key={i}><td colSpan={9}><div className="skeleton" style={{ height: 16, borderRadius: 6 }} /></td></tr>
                ))}
                {rows.map((r) => (
                  <tr key={r.symbol} className="row" tabIndex={0} onClick={() => open(r)} onKeyDown={(e) => e.key === 'Enter' && open(r)}>
                    <td className="l" style={{ maxWidth: 150 }}>
                      <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontWeight: 700, color: ACCENT }}>{r.symbol}</div>
                      <div className="sc-show-sm" style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                    </td>
                    <td className="l sc-hide-sm" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.name}>{r.name}</div>
                      {r.industry && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.industry}>{r.industry}</div>}
                    </td>
                    <td className="l sc-hide-lg">{r.sector ? sectorName(r.sector) : '—'}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{money(r.market_cap)}</td>
                    <td>${r.price?.toFixed(2)}</td>
                    <td style={{ color: r.change_pct > 0 ? UP : r.change_pct < 0 ? DOWN : undefined, fontWeight: 600 }}>
                      {r.change_pct == null ? '—' : `${r.change_pct > 0 ? '+' : ''}${r.change_pct.toFixed(2)}%`}
                    </td>
                    <td className="sc-hide-sm">{vol(r.volume)}</td>
                    <td className="sc-hide-sm">{r.pe != null ? r.pe.toFixed(1) : '—'}</td>
                    <td className="sc-hide-md">{r.off_high_pct != null ? `${r.off_high_pct.toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>{t.note}</p>
    </div>
  )
}
