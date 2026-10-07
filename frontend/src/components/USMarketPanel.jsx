import { useEffect, useState } from 'react'
import useCompareStore from '../store/compareStore'

const L = {
  zh: { title: '美股大盘', pre: '盘前交易', regular: '交易中', post: '盘后交易', closed: '休市', opens: '距开盘', h: '小时', m: '分钟', d: '天',
        mega: '七巨头', gainers: '涨幅榜', losers: '跌幅榜', active: '活跃榜', sectors: '行业板块', up: '上涨', down: '下跌', delayed: '数据延迟，仅供参考' },
  en: { title: 'US Market', pre: 'Pre-market', regular: 'Market open', post: 'After-hours', closed: 'Closed', opens: 'Opens in', h: 'h', m: 'min', d: 'd',
        mega: 'Magnificent 7', gainers: 'Top gainers', losers: 'Top losers', active: 'Most active', sectors: 'Sectors', up: 'up', down: 'down', delayed: 'Data may be delayed' },
  ja: { title: '米国市場', pre: 'プレマーケット', regular: '取引中', post: '時間外取引', closed: '休場', opens: '開場まで', h: '時間', m: '分', d: '日',
        mega: 'マグニフィセント7', gainers: '値上がり', losers: '値下がり', active: '出来高上位', sectors: 'セクター', up: '上昇', down: '下落', delayed: 'データは遅延する場合があります' },
  ko: { title: '미국 시장', pre: '프리마켓', regular: '거래 중', post: '애프터마켓', closed: '휴장', opens: '개장까지', h: '시간', m: '분', d: '일',
        mega: '매그니피센트 7', gainers: '상승률', losers: '하락률', active: '거래대금', sectors: '섹터', up: '상승', down: '하락', delayed: '데이터가 지연될 수 있습니다' },
  fr: { title: 'Marché américain', pre: 'Pré-ouverture', regular: 'Marché ouvert', post: 'Après-clôture', closed: 'Fermé', opens: 'Ouverture dans', h: 'h', m: 'min', d: 'j',
        mega: 'Les 7 Magnifiques', gainers: 'Plus fortes hausses', losers: 'Plus fortes baisses', active: 'Plus actives', sectors: 'Secteurs', up: 'hausse', down: 'baisse', delayed: 'Données possiblement différées' },
}
const SECTOR = {
  zh: { Technology: '科技', Financials: '金融', Energy: '能源', 'Health Care': '医疗保健', 'Consumer Discretionary': '非必需消费', 'Consumer Staples': '必需消费', Industrials: '工业', Utilities: '公用事业', Materials: '原材料', 'Real Estate': '房地产', Communication: '通信服务' },
}
const INDEX_ZH = { 'S&P 500': '标普500', Nasdaq: '纳斯达克', 'Dow Jones': '道琼斯', 'Russell 2000': '罗素2000' }

// US convention: green up, red down
const UP = 'var(--green-bright)', DOWN = 'var(--red-bright)'
const col = (p) => (p > 0 ? UP : p < 0 ? DOWN : 'var(--text-secondary)')
const pct = (p) => `${p > 0 ? '+' : ''}${p.toFixed(2)}%`
const num = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const CSS = `
.usp-hit { transition: background .15s, border-color .15s, transform .15s; }
.usp-hit:hover { background: var(--bg-hover) !important; }
.usp-tile:hover { border-color: var(--border-glow) !important; transform: translateY(-1px); }
.usp-hit:focus-visible { outline: 2px solid var(--accent-blue); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .usp-hit { transition: none; } .usp-tile:hover { transform: none; } }
`
const card = { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12 }

function countdown(iso, t) {
  if (!iso) return ''
  const mins = Math.floor((new Date(iso).getTime() - Date.now()) / 60000)
  if (mins <= 0) return ''
  const txt = mins >= 2880 ? `${Math.floor(mins / 1440)}${t.d}` : `${Math.floor(mins / 60)}${t.h} ${mins % 60}${t.m}`
  return `${t.opens} ${txt}`
}

export default function USMarketPanel({ lang }) {
  const t = L[lang] || L.en
  const zh = lang === 'zh'
  const [d, setD] = useState(null)
  const [tab, setTab] = useState('gainers')
  const openUS = (q) => useCompareStore.getState().switchMarketAndAddSymbol('us', { code: q.symbol, name: q.name })

  useEffect(() => {
    let alive = true
    const load = () => fetch('/api/us/market/overview').then((r) => r.json()).then((j) => alive && j.indices && setD(j)).catch(() => {})
    load()
    const id = setInterval(load, 60000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  if (!d) return <div className="skeleton" style={{ ...card, height: 150, marginBottom: 10 }} />

  const s = d.session
  const label = t[s.state] || t.closed
  const cd = s.state === 'regular' ? '' : countdown(s.next_open_utc, t)
  const rows = tab === 'gainers' ? d.gainers : tab === 'losers' ? d.losers : d.active_20.slice(0, 10)
  const maxAbs = Math.max(...d.sectors.map((x) => Math.abs(x.pct)), 0.01)
  const b = d.breadth

  return (
    <div style={{ ...card, padding: 16, marginBottom: 10, display: 'grid', gap: 16 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: s.state === 'regular' ? UP : s.state === 'closed' ? 'var(--text-muted)' : 'var(--accent-gold)' }} />
        <strong style={{ fontSize: 14 }}>{t.title}</strong>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{label}{cd && ` · ${cd}`}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{d.session.et_time.slice(11)} ET · {t.delayed}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {d.indices.map((i) => (
          <div key={i.symbol} style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{zh ? INDEX_ZH[i.name] || i.name : i.name}</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', margin: '2px 0' }}>{num(i.price)}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: col(i.pct), fontVariantNumeric: 'tabular-nums' }}>{pct(i.pct)}{i.change != null && <span style={{ marginLeft: 8, opacity: 0.8 }}>{i.change > 0 ? '+' : ''}{num(i.change)}</span>}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
          <span style={{ flex: b.advancing, background: UP }} /><span style={{ flex: b.declining, background: DOWN }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
          <span>{b.advancing} {t.up}</span><span>{b.declining} {t.down}</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{t.mega}</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {d.mega_caps.map((q) => (
            <button key={q.symbol} className="usp-hit usp-tile" onClick={() => openUS(q)} style={{ flex: '0 0 auto', minWidth: 104, textAlign: 'left', background: 'var(--bg-tertiary)', border: '1px solid transparent', borderRadius: 10, padding: '8px 10px', color: 'inherit', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{q.symbol}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{num(q.price)}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: col(q.pct), fontVariantNumeric: 'tabular-nums' }}>{pct(q.pct)}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {['gainers', 'losers', 'active'].map((k) => (
              <button key={k} onClick={() => setTab(k)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 14, cursor: 'pointer', border: '1px solid var(--border-primary)', background: tab === k ? 'var(--accent-blue)' : 'transparent', color: tab === k ? '#fff' : 'var(--text-secondary)' }}>{t[k]}</button>
            ))}
          </div>
          {rows.map((q) => (
            <button key={q.symbol} className="usp-hit" onClick={() => openUS(q)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 6, background: 'none', border: 'none', borderBottom: '1px solid var(--border-primary)', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 56, fontWeight: 700, fontSize: 14 }}>{q.symbol}</span>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.name}</span>
              <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{num(q.price)}</span>
              <span style={{ width: 66, textAlign: 'right', fontSize: 12, fontWeight: 600, color: col(q.pct), fontVariantNumeric: 'tabular-nums' }}>{pct(q.pct)}</span>
            </button>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{t.sectors}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {d.sectors.map((x) => {
              const c = col(x.pct)
              return (
                <button key={x.symbol} className="usp-hit usp-tile" onClick={() => openUS({ symbol: x.symbol, name: x.name })} style={{ textAlign: 'left', border: '1px solid transparent', borderRadius: 8, padding: '10px 11px', cursor: 'pointer', color: 'inherit', background: `color-mix(in srgb, ${c} ${Math.round(8 + 22 * Math.abs(x.pct) / maxAbs)}%, var(--bg-tertiary))` }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.25, minHeight: 31 }}>{(zh && SECTOR.zh[x.name]) || x.name}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: c, fontVariantNumeric: 'tabular-nums' }}>{pct(x.pct)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{x.symbol}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
