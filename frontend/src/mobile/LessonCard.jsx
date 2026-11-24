import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LessonChart from '../components/home/LessonChart'
import IS from '../components/home/intlLessonStrings'
import { SECTOR_NAMES } from '../components/home/lessonStrings'
import useLangStore from '../store/langStore'

// The desktop home's top panel on the phone: the market in one sentence, three months of its main index and the
// popular names that moved most (/api/home/lesson). US: S&P 500; A-shares: SSE Composite, red up / green down.

const LOCALE = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' }
const FLAT = 0.1
const CN = { tz: 'Asia/Shanghai', am: [570, 690], pm: [780, 900] }

function cnState() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: CN.tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]))
  const mins = Number(p.hour) * 60 + Number(p.minute)
  if (p.weekday === 'Sat' || p.weekday === 'Sun') return 'closed'
  if ((mins >= CN.am[0] && mins < CN.am[1]) || (mins >= CN.pm[0] && mins < CN.pm[1])) return 'open'
  return mins >= CN.am[1] && mins < CN.pm[0] ? 'lunch' : 'closed'
}

const shortName = (n) => (n || '').replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Holdings|Plc|Ltd\.?|Co\.?|Company)$/i, '').trim()

export default function LessonCard({ market }) {
  const lang = useLangStore((s) => s.lang)
  const s = IS[lang] || IS.en
  const loc = LOCALE[lang] || 'en-US'
  const navigate = useNavigate()
  const [res, setRes] = useState({ market: null, data: null })
  useEffect(() => {
    let alive = true
    fetch(`/api/home/lesson?market=${market}`).then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setRes({ market, data: j }) }).catch(() => { if (alive) setRes({ market, data: null }) })
    return () => { alive = false }
  }, [market])
  const d = res.market === market ? res.data : null
  const main = d?.main
  if (res.market === market && !main) return null                 // no data: the cards below still show the market
  const dir = !main ? 'flat' : main.change_pct > FLAT ? 'up' : main.change_pct < -FLAT ? 'down' : 'flat'
  const state = market === 'us' ? (d?.session?.state === 'regular' ? 'open' : 'closed') : cnState()
  const live = market === 'us' ? state === 'open' : state !== 'closed' && d?.as_of === new Date().toLocaleDateString('en-CA', { timeZone: CN.tz })
  const day = d?.as_of ? new Date(d.as_of + 'T12:00:00Z').toLocaleDateString(loc, { weekday: lang === 'zh' ? 'short' : 'long', timeZone: 'UTC' }) : ''
  const num = (v, n = 2) => (v == null ? '—' : Number(v).toLocaleString(loc, { minimumFractionDigits: n, maximumFractionDigits: n }))
  const pctText = (v) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v))}%`)
  const up = market === 'cn' ? 'var(--cn-up, var(--red-bright))' : 'var(--green-bright)'
  const down = market === 'cn' ? 'var(--cn-down, var(--green-bright))' : 'var(--red-bright)'
  const color = (v) => (v > 0 ? up : v < 0 ? down : 'var(--text-2)')
  const b = d?.breadth
  const total = b ? (b.sample || (b.advancing || 0) + (b.declining || 0) + (b.flat || 0)) : null
  const sectorName = d?.sector
    ? (market === 'us' ? (SECTOR_NAMES[lang] || {})[d.sector.name] || d.sector.name : lang === 'zh' ? d.sector.name : null)
    : null
  const sentence = main && s.sentence({
    m: market, dir, live, price: num(main.price), pct: num(Math.abs(main.change_pct)), sector: sectorName,
    up: b ? num(dir === 'up' ? b.advancing : b.declining, 0) : null, total: total ? num(total, 0) : null,
  })
  const name = (q) => (lang === 'zh' ? q.name_zh || q.name : q.name || q.name_zh)
  return (
    <div className={`m-card ml-card${market === 'cn' ? ' is-cn' : ''}`}>
      <div className="m-label ml-status">
        <i className={state === 'open' ? 'live' : ''} />
        {state === 'open' ? s.open(market) : state === 'lunch' ? s.lunch(market) : s.closed(market)}
      </div>
      {main ? (
        <>
          <b className="ml-title">{s.title(market, dir, live, day)}</b>
          <p className="m-muted ml-sentence">{sentence}</p>
        </>
      ) : <div className="m-skel" style={{ height: 52, borderRadius: 10 }} />}
      <div className="ml-chart"><LessonChart rows={d?.history} dir={dir} label={s.chartLabel(market)} /></div>
      {d?.movers?.length > 0 && (
        <>
          <div className="m-label" style={{ marginTop: 4 }}>{s.movers}</div>
          <div className="ml-movers">
            {d.movers.map((q) => (
              <button key={q.symbol} onClick={() => navigate(`/stock/${market}/${encodeURIComponent(q.symbol)}`)}>
                <span className="ml-sym">{q.symbol}</span>
                <span className="ml-name">{shortName(name(q))}</span>
                <span className="ml-pct" style={{ color: color(q.pct) }}>{pctText(q.pct)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
