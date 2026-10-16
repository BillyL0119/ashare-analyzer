import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from './i18n'
import { useAPI } from './data'
import { ErrorBox, Section, Skeleton } from './ui'
import useLangStore from '../store/langStore'
import { SECTOR_ZH, pct, squarify, tileColor } from '../utils/heatmap'

// Market heatmap for the phone UI: plain positioned divs laid out with a squarified treemap,
// so the home tab does not need the chart library.
const HEADER = 15

export default function MarketMap({ market }) {
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const nav = useNavigate()
  const box = useRef(null)
  const [width, setWidth] = useState(0)
  const height = Math.round(Math.min(Math.max(width * 1.15, 340), 520))
  const { data, error, reload } = useAPI(`/heatmap?market=${market}&limit=80`, { refreshMs: 60000 })

  useEffect(() => {
    if (!box.current) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  const cjk = lang === 'zh' || lang === 'ja'
  const sectorName = (g) => {
    if (market === 'cn') return lang === 'zh' ? g.name : t(g.name)
    if (market === 'hk' || market === 'jp') return cjk ? g.name_zh || g.name : g.name
    return lang === 'zh' ? SECTOR_ZH[g.name] || g.name : g.name
  }
  const tileName = (x) => {
    if (market === 'cn') return lang === 'zh' ? x.name : x.symbol
    if (market === 'hk') return (cjk ? x.name_zh : x.name_en) || x.symbol
    if (market === 'jp') return (lang === 'ja' ? x.name_ja : lang === 'zh' ? x.name_zh || x.name_ja : null) || x.symbol
    return x.symbol
  }

  const tiles = useMemo(() => {
    if (!data?.sectors || !width || data.market !== market) return []
    const out = []
    for (const s of squarify(data.sectors.map((g) => ({ ...g, value: g.market_cap })), 0, 0, width, height)) {
      const g = s.item
      const showHead = s.h > HEADER + 18 && s.w > 44
      out.push({ kind: 'sector', key: 'g' + g.name, ...s, name: sectorName(g), chg: g.change_pct, showHead })
      const top = showHead ? HEADER : 0
      for (const c of squarify(g.stocks.map((x) => ({ ...x, value: x.market_cap })), s.x + 1, s.y + top + 1, s.w - 2, s.h - top - 2)) {
        out.push({ kind: 'stock', key: c.item.symbol, ...c, s: c.item })
      }
    }
    return out
  }, [data, width, height, market, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const ups = data?.sectors?.flatMap((g) => g.stocks).filter((s) => s.change_pct > 0).length ?? 0
  const downs = data?.sectors?.flatMap((g) => g.stocks).filter((s) => s.change_pct < 0).length ?? 0

  return (
    <Section title={t('市场热力图')}>
      <div className="m-card flush" style={{ padding: 6 }}>
        <div ref={box} style={{ position: 'relative', height: width ? height : 340, borderRadius: 10, overflow: 'hidden', background: '#1b1f2a' }}>
          {error && !data ? <ErrorBox onRetry={reload} /> : !tiles.length ? <Skeleton h={height} r={10} /> : tiles.map((x) => x.kind === 'sector' ? (
            x.showHead && (
              <div key={x.key} style={{ position: 'absolute', left: x.x + 3, top: x.y, width: x.w - 6, height: HEADER, fontSize: 13, lineHeight: `${HEADER}px`, color: '#d1d5db', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
                {x.name} {pct(x.chg)}
              </div>
            )
          ) : (
            <button
              key={x.key}
              onClick={() => nav(`/stock/${market}/${x.s.symbol}`)}
              aria-label={`${x.s.name} ${pct(x.s.change_pct)}`}
              style={{
                position: 'absolute', left: x.x, top: x.y, width: Math.max(x.w - 1, 0), height: Math.max(x.h - 1, 0),
                background: tileColor(x.s.change_pct, market), border: 0, padding: 0, color: '#fff', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.15,
              }}
            >
              {x.w > 30 && x.h > 18 && <span style={{ fontSize: x.w > 70 && x.h > 44 ? 13 : 10, fontWeight: 600, maxWidth: '96%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'clip' }}>{tileName(x.s)}</span>}
              {x.w > 40 && x.h > 34 && <span style={{ fontSize: x.w > 70 && x.h > 44 ? 11 : 9, opacity: 0.9 }}>{pct(x.s.change_pct)}</span>}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px 2px', fontSize: 13 }} className="m-muted">
          <span>{t('面积代表市值，颜色代表今日涨跌')}</span>
          {(ups || downs) ? <span>{t('%lld 涨 · %lld 跌', ups, downs)}</span> : null}
        </div>
      </div>
    </Section>
  )
}
