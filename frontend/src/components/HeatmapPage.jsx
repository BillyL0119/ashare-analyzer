import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from '../lib/echarts'
import useCompareStore from '../store/compareStore'
import { SECTOR_ZH, tileColor, money, pct } from '../utils/heatmap'

// Market heatmap: one tile per company, area = market cap, colour = today's move, grouped by sector.
// US colours are green up / red down; A-shares follow the local red up / green down convention.

const L = {
  zh: { eyebrow: '市场热力图', title: '今日市场全景', subUs: (n) => `市值最大的 ${n} 家美国上市公司，面积代表市值，颜色代表今日涨跌。点击任意方块查看个股。`, subCn: (n) => `${n} 家重点 A 股，按行业分组。面积代表市值，颜色代表今日涨跌。点击任意方块查看个股。`, top: (n) => `前 ${n}`, sectors: '板块表现', updated: '更新于', loading: '加载中…', failed: '加载失败，请稍后重试。', retry: '重试', cap: '市值', price: '价格', change: '今日', weighted: '按市值加权', legendUp: '涨', legendDown: '跌', breadth: (u, d) => `${u} 涨 · ${d} 跌` },
  en: { eyebrow: 'Market map', title: "Today's market at a glance", subUs: (n) => `The ${n} largest US-listed companies. Tile size is market cap, colour is today's move. Click any tile to open the stock.`, subCn: (n) => `${n} followed A-shares grouped by industry. Tile size is market cap, colour is today's move. Click any tile to open the stock.`, top: (n) => `Top ${n}`, sectors: 'Sector performance', updated: 'Updated', loading: 'Loading…', failed: 'Could not load the map. Try again.', retry: 'Retry', cap: 'Market cap', price: 'Price', change: 'Today', weighted: 'cap-weighted', legendUp: 'Up', legendDown: 'Down', breadth: (u, d) => `${u} up · ${d} down` },
  ja: { eyebrow: 'マーケットマップ', title: '今日の市場を一目で', subUs: (n) => `時価総額上位 ${n} 社の米国上場企業。面積は時価総額、色は本日の騰落率。タイルをクリックすると個別銘柄を表示します。`, subCn: (n) => `業種別の主要A株 ${n} 銘柄。面積は時価総額、色は本日の騰落率。タイルをクリックすると個別銘柄を表示します。`, top: (n) => `上位 ${n}`, sectors: 'セクター別騰落', updated: '更新', loading: '読み込み中…', failed: '読み込めませんでした。もう一度お試しください。', retry: '再試行', cap: '時価総額', price: '株価', change: '本日', weighted: '時価総額加重', legendUp: '上昇', legendDown: '下落', breadth: (u, d) => `上昇 ${u} · 下落 ${d}` },
  ko: { eyebrow: '마켓 맵', title: '오늘의 시장 한눈에', subUs: (n) => `시가총액 상위 ${n}개 미국 상장사. 면적은 시가총액, 색상은 오늘 등락률입니다. 타일을 누르면 종목으로 이동합니다.`, subCn: (n) => `업종별 주요 A주 ${n}개. 면적은 시가총액, 색상은 오늘 등락률입니다. 타일을 누르면 종목으로 이동합니다.`, top: (n) => `상위 ${n}`, sectors: '섹터별 등락', updated: '업데이트', loading: '불러오는 중…', failed: '불러오지 못했습니다. 다시 시도해 주세요.', retry: '다시 시도', cap: '시가총액', price: '가격', change: '오늘', weighted: '시총 가중', legendUp: '상승', legendDown: '하락', breadth: (u, d) => `상승 ${u} · 하락 ${d}` },
  fr: { eyebrow: 'Carte du marché', title: "Le marché du jour d'un coup d'œil", subUs: (n) => `Les ${n} plus grandes sociétés cotées aux États-Unis. La taille d'une case est la capitalisation, sa couleur la variation du jour. Cliquez sur une case pour ouvrir l'action.`, subCn: (n) => `${n} actions A suivies, groupées par secteur. La taille est la capitalisation, la couleur la variation du jour. Cliquez sur une case pour ouvrir l'action.`, top: (n) => `Top ${n}`, sectors: 'Performance par secteur', updated: 'Mis à jour', loading: 'Chargement…', failed: 'Impossible de charger la carte. Réessayez.', retry: 'Réessayer', cap: 'Capitalisation', price: 'Cours', change: 'Jour', weighted: 'pondéré par la capitalisation', legendUp: 'Hausse', legendDown: 'Baisse', breadth: (u, d) => `${u} en hausse · ${d} en baisse` },
}

const CSS = `
.hm-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; }
.hm-chip { padding: 6px 12px; border-radius: 999px; font-size: 12.5px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-secondary); }
.hm-chip.on { background: color-mix(in srgb, #0ea5e9 14%, transparent); border-color: color-mix(in srgb, #0ea5e9 55%, transparent); color: #0ea5e9; font-weight: 600; }
.hm-sec { display: grid; grid-template-columns: minmax(0, 150px) minmax(0, 1fr) 64px; gap: 10px; align-items: center; font-size: 12.5px; padding: 5px 0; color: var(--text-secondary); }
.hm-sec span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hm-axis { position: relative; height: 6px; background: var(--bg-tertiary); border-radius: 3px; }
.hm-axis::after { content: ''; position: absolute; left: 50%; top: -3px; bottom: -3px; width: 1px; background: var(--border-primary); }
.hm-bar { position: absolute; top: 0; bottom: 0; border-radius: 3px; }
@media (max-width: 700px) { .hm-sec { grid-template-columns: minmax(0, 110px) minmax(0, 1fr) 58px; } }
`

export default function HeatmapPage({ lang }) {
  const t = L[lang] || L.en
  const zh = lang === 'zh'
  const nav = useNavigate()
  const market = useCompareStore((s) => s.market)
  const [limit, setLimit] = useState(300)
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => (data && data.market === market ? s : 'loading'))
    const load = () => fetch(`/api/heatmap?market=${market}&limit=${limit}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (alive) { setData(d); setState('ok') } })
      .catch(() => { if (alive) setState((s) => (s === 'ok' ? s : 'failed')) })
    load()
    const id = setInterval(load, 60000)                  // quotes refresh in the background
    return () => { alive = false; clearInterval(id) }
  }, [market, limit, nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  const sectorLabel = (g) => (market === 'cn' ? (zh ? g.name : g.name_en || g.name) : (zh ? SECTOR_ZH[g.name] || g.name : g.name))
  const tileLabel = (s) => (market === 'cn' ? (zh ? s.name : s.symbol) : s.symbol)

  const option = useMemo(() => {
    if (!data || data.market !== market) return null
    const total = data.sectors.reduce((a, g) => a + g.market_cap, 0) || 1
    return {
      tooltip: {
        backgroundColor: 'rgba(10,15,26,0.95)', borderColor: 'rgba(138,180,248,0.2)', textStyle: { color: '#e5e7eb', fontSize: 12 },
        formatter: (p) => {
          const d = p.data || {}
          if (d.sector) return `<b>${d.name}</b>${d.sym && d.sym !== d.name ? ` · ${d.sym}` : ''}<br/>${t.change}: <b>${pct(d.chg)}</b><br/>${t.price}: ${d.price ?? '—'}<br/>${t.cap}: ${money(d.value, market)}`
          return `<b>${p.name}</b><br/>${t.change}: <b>${pct(d.chg)}</b> (${t.weighted})<br/>${t.cap}: ${money(p.value, market)}`
        },
      },
      series: [{
        type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false },
        left: 0, right: 0, top: 0, bottom: 0, squareRatio: 0.9,
        levels: [
          { itemStyle: { borderColor: 'transparent', borderWidth: 0, gapWidth: 3 }, upperLabel: { show: false } },
          {
            itemStyle: { borderColor: '#1b1f2a', borderWidth: 2, gapWidth: 1, color: '#1b1f2a' },
            upperLabel: {
              show: true, height: 20, color: '#e5e7eb', fontSize: 11, fontWeight: 600, overflow: 'truncate',
              formatter: (p) => `${p.name}  ${pct(p.data.chg)}`,
            },
          },
          {
            itemStyle: { borderColor: '#1b1f2a', borderWidth: 1, gapWidth: 0 },
            label: {
              show: true, position: 'inside', overflow: 'truncate', color: '#fff', lineHeight: 15,
              formatter: (p) => `{s|${p.name}}\n{p|${pct(p.data.chg)}}`,
              rich: { s: { fontSize: 12, fontWeight: 700, color: '#fff' }, p: { fontSize: 11, color: 'rgba(255,255,255,0.88)' } },
            },
          },
        ],
        data: data.sectors.map((g) => ({
          name: sectorLabel(g), value: g.market_cap, chg: g.change_pct,
          children: g.stocks.map((s) => {
            // Tiles too small for two lines of text show the ticker only, the smallest nothing
            const share = s.market_cap / total
            const label = share < 0.0009 ? { show: false } : share < 0.003 ? { formatter: (p) => `{s|${p.name}}` } : undefined
            return {
              name: tileLabel(s), sym: s.symbol, value: s.market_cap, chg: s.change_pct, price: s.price, sector: g.name,
              fullName: s.name, itemStyle: { color: tileColor(s.change_pct, market) }, ...(label ? { label } : {}),
            }
          }),
        })),
      }],
    }
  }, [data, market, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const onEvents = useMemo(() => ({
    click: (p) => {
      const d = p.data
      if (!d?.sym) return
      useCompareStore.getState().switchMarketAndAddSymbol(market, { code: d.sym, name: d.fullName || d.sym })
      nav(`/stock/${market}/${d.sym}`)
    },
  }), [market, nav])

  const all = data && data.market === market ? data.sectors.flatMap((g) => g.stocks) : []
  const ups = all.filter((s) => s.change_pct > 0).length
  const downs = all.filter((s) => s.change_pct < 0).length
  const sectors = data && data.market === market ? [...data.sectors].sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0)) : []
  const maxAbs = Math.max(1, ...sectors.map((g) => Math.abs(g.change_pct ?? 0)))

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingTop: 22, paddingBottom: 48 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#0ea5e9' }}>{t.eyebrow}</div>
          <h1 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{t.title}</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 720, lineHeight: 1.6 }}>
            {market === 'us' ? t.subUs(data?.count || limit) : t.subCn(data?.count || 200)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {all.length > 0 && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{t.breadth(ups, downs)}</span>}
          {market === 'us' && [100, 300, 500].map((n) => (
            <button key={n} className={`hm-chip${limit === n ? ' on' : ''}`} onClick={() => setLimit(n)}>{t.top(n)}</button>
          ))}
        </div>
      </div>

      <div className="hm-card" style={{ padding: 6, position: 'relative' }}>
        {state === 'failed' && !option ? (
          <div style={{ height: 420, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 12px' }}>{t.failed}</p>
              <button className="hm-chip" onClick={() => setNonce((n) => n + 1)}>{t.retry}</button>
            </div>
          </div>
        ) : !option ? (
          <div style={{ height: 'min(68vh, 720px)', minHeight: 420, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t.loading}</div>
        ) : (
          <ReactECharts option={option} onEvents={onEvents} notMerge style={{ height: 'min(68vh, 720px)', minHeight: 420, width: '100%' }} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '8px 2px 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>-3%</span>
          {[-3, -2, -1, 0, 1, 2, 3].map((v) => <span key={v} style={{ width: 22, height: 10, borderRadius: 2, background: tileColor(v, market) }} />)}
          <span>+3%</span>
        </div>
        {data?.updated && <span>{t.updated} {new Date(data.updated * 1000).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : lang, { hour: '2-digit', minute: '2-digit' })}</span>}
      </div>

      {sectors.length > 0 && (
        <div className="hm-card" style={{ padding: '14px 18px', marginTop: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{t.sectors} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>· {t.weighted}</span></h2>
          {sectors.map((g) => {
            const v = g.change_pct ?? 0
            const w = (Math.abs(v) / maxAbs) * 50
            return (
              <div className="hm-sec" key={g.name}>
                <span>{sectorLabel(g)}</span>
                <div className="hm-axis">
                  <div className="hm-bar" style={{ left: v >= 0 ? '50%' : `${50 - w}%`, width: `${w}%`, background: tileColor(v >= 0 ? 3 : -3, market) }} />
                </div>
                <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{pct(g.change_pct)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
