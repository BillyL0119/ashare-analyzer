import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useLangStore from '../store/langStore'
import { CUR, localName } from '../utils/markets'
import visibleInterval from '../utils/visibleInterval'

// Phone home for Hong Kong and Japan: the market's indices and its most-followed names (/api/{hk,jp}/overview,
// the same data as the desktop IntlMarketPanel). Green up / red down, as in those markets.

const L = {
  zh: { hk: '港股市场', jp: '日本股市', popular: '热门股票' },
  en: { hk: 'Hong Kong market', jp: 'Japan market', popular: 'Most followed' },
  ja: { hk: '香港市場', jp: '日本市場', popular: '注目銘柄' },
  ko: { hk: '홍콩 시장', jp: '일본 시장', popular: '인기 종목' },
  fr: { hk: 'Marché de Hong Kong', jp: 'Marché japonais', popular: 'Les plus suivies' },
}
const color = (p) => (p > 0 ? 'var(--green-bright)' : p < 0 ? 'var(--red-bright)' : 'var(--text-2)')
const pct = (p) => (p == null ? '—' : `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(2)}%`)

export default function IntlMarket({ market }) {
  const lang = useLangStore((s) => s.lang)
  const t = L[lang] || L.en
  const navigate = useNavigate()
  const [res, setRes] = useState({ market: null, data: null })
  useEffect(() => {
    let alive = true
    const load = () => fetch(`/api/${market}/overview`).then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j?.hot) setRes({ market, data: j }) }).catch(() => {})
    load()
    const stop = visibleInterval(load, 60000)
    return () => { alive = false; stop() }
  }, [market])
  const d = res.market === market ? res.data : null
  const loc = lang === 'zh' ? 'zh-CN' : 'en-US'
  const num = (v, n = 2) => (v == null ? '—' : Number(v).toLocaleString(loc, { minimumFractionDigits: n, maximumFractionDigits: n }))
  if (!d) return <div className="m-card"><div className="m-skel" style={{ height: 140, borderRadius: 12 }} /></div>
  const digits = market === 'jp' ? 1 : 2
  return (
    <div className="m-card mi-card">
      <b style={{ fontSize: 17 }}>{t[market]}</b>
      {d.indices?.length > 0 && (
        <div className="mi-idx">
          {d.indices.map((i) => (
            <div key={i.symbol} className="m-tile">
              <div className="m-label">{lang === 'zh' || lang === 'ja' ? i.name_zh : i.name_en}</div>
              <div className="m-num mi-px">{num(i.price, market === 'jp' ? 0 : 2)}</div>
              <div className="m-num" style={{ color: color(i.change_pct), fontWeight: 600, fontSize: 13 }}>{pct(i.change_pct)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="m-label" style={{ marginTop: 4 }}>{t.popular}</div>
      <div className="mi-list">
        {d.hot.map((q) => (
          <button key={q.symbol} onClick={() => navigate(`/stock/${market}/${encodeURIComponent(q.symbol)}`)}>
            <span className="mi-name">{localName(q, lang, market)}<small>{q.symbol}</small></span>
            <span className="m-num mi-price">{CUR[market]}{num(q.price, digits)}</span>
            <span className="m-num mi-pct" style={{ color: color(q.change_pct) }}>{pct(q.change_pct)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
