import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useLangStore from '../../store/langStore'
import { useT } from '../i18n'
import { useAPI, num, pct } from '../data'
import { changeColor } from '../helpers'
import { ErrorBox, Pill, Section, Segment, Skeleton, SkeletonRows } from '../ui'

const SECTOR_ZH = {
  Technology: '科技', Financials: '金融', Energy: '能源板块', 'Health Care': '医疗保健', 'Consumer Discretionary': '非必需消费',
  'Consumer Staples': '必需消费', Industrials: '工业', Utilities: '公用事业', Materials: '原材料', 'Real Estate': '房地产板块', Communication: '通信服务',
}
const INDEX_ZH = { 'S&P 500': '标普500', Nasdaq: '纳斯达克', 'Dow Jones': '道琼斯', 'Russell 2000': '罗素2000' }

function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])
  if (!iso) return null
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60000))
  return { days: Math.floor(mins / 1440), hours: Math.floor(mins / 60), mins: mins % 60 }
}

function SessionPill({ session }) {
  const t = useT()
  const cd = useCountdown(session.next_open_utc)
  const label = { regular: t('交易中'), pre: t('盘前交易'), post: t('盘后交易'), closed: t('休市') }[session.state]
  const color = session.state === 'regular' ? 'var(--cn-down)' : session.state === 'closed' ? 'var(--text-3)' : '#F28B3C'
  let opens = null
  if (session.state !== 'regular' && cd) opens = cd.hours >= 48 ? t('%lld天', cd.days) : t('%lld小时 %lld分钟', cd.hours, cd.mins)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 650 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color, boxShadow: session.state === 'regular' ? `0 0 0 3px color-mix(in srgb, ${color} 25%, transparent)` : 'none' }} />
      <span style={{ color }}>{label}</span>
      {opens && <span className="m-muted" style={{ fontWeight: 500 }}>· {t('距开盘 %@', opens)}</span>}
    </span>
  )
}

function IndexCard({ i }) {
  const t = useT(); const lang = useLangStore((s) => s.lang)
  const c = changeColor(i.pct, 'us')
  return (
    <div className="m-tile" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${c} 16%, transparent), var(--surface-hi))`, padding: '12px 14px' }}>
      <div className="m-label">{lang === 'zh' ? i.name_zh : (INDEX_ZH[i.name] ? t(INDEX_ZH[i.name]) : i.name)}</div>
      <div className="m-big m-num" style={{ margin: '6px 0 3px', fontSize: 18 }}>{num(i.price)}</div>
      <div className="m-num" style={{ color: c, fontWeight: 700, fontSize: 13 }}>{pct(i.pct)}</div>
    </div>
  )
}

function Overview({ d, error, reload }) {
  const t = useT()
  if (!d) return error ? <ErrorBox onRetry={reload} /> : (
    <div className="m-card" style={{ display: 'grid', gap: 14 }}><Skeleton w={120} h={14} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{[0, 1, 2, 3].map((k) => <Skeleton key={k} h={84} r={14} />)}</div></div>
  )
  const b = d.breadth
  return (
    <div className="m-card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <b style={{ fontSize: 14 }}>{t('美股大盘')}</b><SessionPill session={d.session} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{d.indices.map((i) => <IndexCard key={i.symbol || i.name} i={i} />)}</div>
      {b?.sample > 0 && (
        <div>
          <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--surface-hi)' }}>
            <span style={{ flex: b.advancing, background: 'var(--cn-down)' }} /><span style={{ flex: Math.max(b.sample - b.advancing - b.declining, 0), background: 'var(--text-3)', opacity: .4 }} /><span style={{ flex: b.declining, background: 'var(--cn-up)' }} />
          </div>
          <div className="m-label m-num" style={{ marginTop: 7, display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('上涨 %lld · 下跌 %lld', b.advancing, b.declining)}</span>{d.as_of && <span>{d.as_of.slice(5, 16)} ET</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function Movers({ d }) {
  const t = useT(); const nav = useNavigate()
  const [tab, setTab] = useState('gainers')
  const rows = d ? { gainers: d.gainers, losers: d.losers, active: d.active }[tab] : null
  return (
    <Section title={t('美股热门')} action={null}>
      <div style={{ margin: '-4px 4px 10px' }}>
        <Segment value={tab} onChange={setTab} options={[{ value: 'gainers', label: t('涨幅榜') }, { value: 'losers', label: t('跌幅榜') }, { value: 'active', label: t('活跃榜') }]} />
      </div>
      {!rows ? <SkeletonRows rows={5} /> : (
        <div className="m-card flush">
          {rows.map((q, i) => (
            <button className="m-row" key={q.symbol} onClick={() => nav(`/stock/us/${q.symbol}`)}>
              <span className="m-num" style={{ width: 18, fontWeight: 800, fontSize: 13, color: i < 3 ? 'var(--accent)' : 'var(--text-3)' }}>{i + 1}</span>
              <div className="m-grow"><div className="m-name">{q.symbol}</div><div className="m-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div></div>
              <span className="m-num" style={{ fontWeight: 650 }}>{num(q.price)}</span>
              <Pill value={q.pct} market="us" width={78} />
            </button>
          ))}
        </div>
      )}
    </Section>
  )
}

function Sectors({ d }) {
  const t = useT(); const nav = useNavigate()
  if (!d) return null
  const maxAbs = Math.max(0.5, ...d.sectors.map((s) => Math.abs(s.pct)))
  return (
    <Section title={t('行业板块')}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {d.sectors.map((s) => {
          const c = changeColor(s.pct, 'us'); const a = 10 + Math.round((Math.abs(s.pct) / maxAbs) * 34)
          return (
            <button key={s.symbol} onClick={() => nav(`/stock/us/${s.symbol}`)} style={{ padding: '12px 10px', borderRadius: 14, textAlign: 'left', border: '1px solid var(--stroke)',
              background: `color-mix(in srgb, ${c} ${a}%, var(--surface))` }}>
              <div style={{ fontSize: 12, fontWeight: 650, lineHeight: 1.2, minHeight: 29 }}>{t(SECTOR_ZH[s.name] || s.name)}</div>
              <div className="m-num" style={{ color: c, fontWeight: 800, fontSize: 15, marginTop: 6 }}>{pct(s.pct)}</div>
              <div className="m-label m-num" style={{ marginTop: 1 }}>{s.symbol}</div>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

function Mega({ d }) {
  const t = useT(); const nav = useNavigate()
  if (!d?.mega_caps?.length) return null
  return (
    <Section title={t('七巨头')}>
      <div className="m-strip">
        {d.mega_caps.map((q) => {
          const c = changeColor(q.pct, 'us')
          return (
            <button key={q.symbol} className="m-tile" style={{ textAlign: 'left', background: `linear-gradient(135deg, color-mix(in srgb, ${c} 14%, transparent), var(--surface-hi))` }} onClick={() => nav(`/stock/us/${q.symbol}`)}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{q.symbol}</div>
              <div className="m-num" style={{ fontWeight: 700, fontSize: 14, margin: '4px 0 2px' }}>{num(q.price)}</div>
              <div className="m-num" style={{ color: c, fontWeight: 700, fontSize: 12.5 }}>{pct(q.pct)}</div>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

const LOCALE = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' }

function Earnings() {
  const t = useT(); const nav = useNavigate(); const lang = useLangStore((s) => s.lang)
  const { data } = useAPI('/earnings/calendar')
  if (!data) return null
  const today = new Date().toISOString().slice(0, 10)
  const end = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const groups = {}
  for (const e of data.us || []) {
    if (e.date >= today && e.date <= end) (groups[e.date] ||= []).push(e)
  }
  const days = Object.keys(groups).sort()
  const label = (d) => new Date(d + 'T12:00:00').toLocaleDateString(LOCALE[lang] || 'en-US', { month: 'short', day: 'numeric', weekday: 'short' })
  return (
    <Section title={t('财报日历')}>
      {days.length === 0 ? <div className="m-card m-label" style={{ textAlign: 'center' }}>{t('未来一周暂无重要财报')}</div> : (
        <div className="m-card flush">
          {days.map((d) => (
            <div key={d}>
              <div className="m-label" style={{ padding: '10px 16px 4px', fontWeight: 700 }}>{label(d)}</div>
              {groups[d].slice(0, 5).map((e) => (
                <button key={e.symbol} className="m-row" style={{ padding: '9px 16px' }} onClick={() => nav(`/stock/us/${e.symbol}`)}>
                  <div className="m-grow"><div style={{ fontWeight: 700, fontSize: 14.5 }}>{e.symbol}</div>
                    <div className="m-label" style={{ marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div></div>
                  {e.eps_estimate != null && <span className="m-num m-label">{t('预期 EPS %@', e.eps_estimate)}</span>}
                  {e.timing && <span className="m-chip">{e.timing === 'BMO' ? t('盘前') : t('盘后')}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

export default function USMarket({ afterOverview }) {
  const { data, error, reload } = useAPI('/us/market/overview', { refreshMs: 60000 })
  return (
    <>
      <Overview d={data} error={error} reload={reload} />
      {afterOverview}
      <Mega d={data} />
      <Movers d={data} />
      <Sectors d={data} />
      <Earnings />
    </>
  )
}
