import { useEffect, useState } from 'react'
import useCompareStore from '../../store/compareStore'
import { getJSON } from '../../utils/sharedFetch'
import classStrings from '../classes/classStrings'
import navStrings from '../nav/navStrings'
import S, { SECTOR_NAMES } from './lessonStrings'
import IS from './intlLessonStrings'
import Chart from './LessonChart'
import './lesson.css'

// Top of the home page: yesterday's (or today's) US market as one sentence built from live data,
// the S&P 500's last three months, and three ways to learn from the day. The sentence and the
// mover change every day, so the page never reads the same twice.

const LOCALE = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' }
const FLAT = 0.1   // a move smaller than this, in percent, is "about flat"

const shortName = (n) => (n || '')
  .replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Holdings|Plc|Ltd\.?|Co\.?|Company)$/i, '')
  .replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Holdings|Plc|Ltd\.?)$/i, '')
  .trim()

// [hours, minutes] until the next open when it is within 12 hours, [null, null, weekday and time in New York]
// further out, or [null] when unknown (the same rule as the market panel)
function untilOpen(iso, loc) {
  const ms = iso ? Date.parse(iso) - Date.now() : NaN
  if (!(ms > 0)) return [null]
  const mins = Math.round(ms / 60000)
  if (mins < 720) return [Math.floor(mins / 60), mins % 60]
  const when = new Intl.DateTimeFormat(loc, { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(new Date(iso))
  return [null, null, when]
}

function useJson(url) {
  const [state, setState] = useState({ data: null, failed: false })
  useEffect(() => {
    let alive = true
    getJSON(url)
      .then((d) => { if (alive) setState({ data: d, failed: false }) })
      .catch(() => { if (alive) setState({ data: null, failed: true }) })
    return () => { alive = false }
  }, [url])
  return state
}

// Trading hours in local time, minutes after midnight (morning and afternoon sessions)
const SESSIONS = {
  cn: { tz: 'Asia/Shanghai', am: [570, 690], pm: [780, 900] },
  hk: { tz: 'Asia/Hong_Kong', am: [570, 720], pm: [780, 960] },
  jp: { tz: 'Asia/Tokyo', am: [540, 690], pm: [750, 930] },
}
function sessionNow(market) {
  const { tz, am, pm } = SESSIONS[market]
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]))
  const mins = Number(p.hour) * 60 + Number(p.minute)
  if (p.weekday === 'Sat' || p.weekday === 'Sun') return 'closed'
  if ((mins >= am[0] && mins < am[1]) || (mins >= pm[0] && mins < pm[1])) return 'open'
  if (mins >= am[1] && mins < pm[0]) return 'lunch'
  return 'closed'
}

// The same panel for the A-share, Hong Kong and Japan markets: headline index, one sentence, the popular names that
// moved most, the market's indices and three months of the headline index (/api/home/lesson)
function IntlLesson({ market, lang, paths, onTabChange, onNavigate }) {
  const s = IS[lang] || IS.en
  const ns = navStrings(lang)
  const loc = LOCALE[lang] || 'en-US'
  const { switchMarketAndAddSymbol } = useCompareStore()
  const res = useJson(`/api/home/lesson?market=${market}`)
  const d = res.data && res.data.market === market ? res.data : null
  const main = d?.main
  const dir = !main ? 'flat' : main.change_pct > FLAT ? 'up' : main.change_pct < -FLAT ? 'down' : 'flat'
  const state = sessionNow(market)
  const live = state !== 'closed' && d?.as_of === new Date().toLocaleDateString('en-CA', { timeZone: SESSIONS[market].tz })
  const day = d?.as_of
    ? new Date(d.as_of + 'T12:00:00Z').toLocaleDateString(loc, { weekday: lang === 'zh' ? 'short' : 'long', timeZone: 'UTC' })
    : ''
  const digits = market === 'jp' ? 0 : 2
  const num = (v, n = 2) => (v == null ? '—' : Number(v).toLocaleString(loc, { minimumFractionDigits: n, maximumFractionDigits: n }))
  const pctText = (v) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v))}%`)
  const tone = (v) => (v > 0 ? 'is-up' : v < 0 ? 'is-down' : '')
  const idxName = (i) => (lang === 'zh' || lang === 'ja' ? i.name_zh || i.name_en : i.name_en || i.name_zh)
  const stockName = (q) => (lang === 'zh' ? q.name_zh || q.name : q.name || q.name_zh)
  const b = d?.breadth
  const total = b && b.advancing != null ? (b.advancing || 0) + (b.declining || 0) + (b.flat || 0) : null
  const sector = d?.sector && lang === 'zh' ? d.sector.name : null       // A-share sector names are Chinese only
  const title = main ? s.title(market, dir, live, day) : ns.introTitle
  const sentence = main && s.sentence({
    m: market, dir, live, price: num(main.price), pct: num(Math.abs(main.change_pct)),
    sector, up: b ? num(dir === 'up' ? b.advancing : b.declining, 0) : null, total: total ? num(total, 0) : null,
  })
  const go = (e, href, tab) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (tab) onTabChange(tab)
    else onNavigate(href)
  }
  return (
    // A-shares are shown red-up / green-down, as on the rest of the site's A-share pages
    <section className={`bfs-lesson${market === 'cn' ? ' is-cn' : ''}`} aria-labelledby="bfs-lesson-title">
      <div className="bfs-lesson-top">
        <div className="bfs-lesson-text">
          <p className="bfs-lesson-status">
            <span className={`bfs-dot${state === 'open' ? ' is-live' : ''}`} aria-hidden="true" />
            {state === 'open' ? s.open(market) : state === 'lunch' ? s.lunch(market) : s.closed(market)}
          </p>
          <h1 id="bfs-lesson-title" className={res.data || res.failed ? '' : 'skeleton'}>{res.data || res.failed ? title : '\u00a0'}</h1>
          <p className="bfs-lesson-sentence">{sentence || ns.introSub}</p>
          {d?.movers?.length > 0 && (
            <div className="bfs-lesson-movers">
              <p className="bfs-lesson-label">{s.movers}</p>
              <ul role="list">
                {d.movers.map((q) => (
                  <li key={q.symbol}>
                    <button type="button" onClick={() => switchMarketAndAddSymbol(market, { code: q.symbol, name: stockName(q) })}>
                      <span className="sym">{q.symbol}</span>
                      <span className="nm">{shortName(stockName(q))}</span>
                      <span className="px">{q.price != null ? num(q.price, market === 'jp' ? 1 : 2) : ''}</span>
                      <span className={`c ${tone(q.pct)}`}>{pctText(q.pct)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {d?.indices?.length > 0 && (
            <ul className="bfs-lesson-idx" role="list">
              {d.indices.map((i) => (
                <li key={i.symbol}>
                  <span className="k">{idxName(i)}</span>
                  <span className="v">{num(i.price, digits)}</span>
                  <span className={`c ${tone(i.change_pct)}`}>{pctText(i.change_pct)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Chart rows={d?.history} dir={dir} label={s.chartLabel(market)} />
      </div>
      <ul className="bfs-lesson-ways" role="list">
        <li>
          <a href="/study" onClick={(e) => go(e, '/study')}>
            <span className="k">{s.study}</span><span className="v">{s.studyText}</span>
          </a>
        </li>
        <li>
          <a href={paths.paper} onClick={(e) => go(e, null, 'paper')}>
            <span className="k">{s.try}</span><span className="v">{s.tryText}</span>
          </a>
        </li>
      </ul>
    </section>
  )
}

export default function MarketLesson(props) {
  const market = useCompareStore((st) => st.market)
  return market === 'cn' || market === 'hk' || market === 'jp'
    ? <IntlLesson key={market} market={market} {...props} />
    : <UsLesson {...props} />
}

function UsLesson({ lang, paths, onTabChange, onNavigate }) {
  const s = S[lang] || S.en
  const ns = navStrings(lang)
  const cs = classStrings(lang)
  const loc = LOCALE[lang] || 'en-US'
  const { switchMarketAndAddSymbol, setViewMode } = useCompareStore()
  const overview = useJson('/api/us/market/overview')
  const history = useJson('/api/us/stock/SPY/history?count=64')

  const d = overview.data
  const spx = d?.indices?.find((i) => i.symbol === '.INX') || d?.indices?.[0]
  const dir = !spx ? 'flat' : spx.pct > FLAT ? 'up' : spx.pct < -FLAT ? 'down' : 'flat'
  const live = d?.session?.state === 'regular'
  const day = d?.as_of
    ? new Date(d.as_of.slice(0, 10) + 'T12:00:00Z').toLocaleDateString(loc, { weekday: lang === 'zh' ? 'short' : 'long', timeZone: 'UTC' })
    : ''
  const num = (v, digits = 2) => Number(v).toLocaleString(loc, { minimumFractionDigits: digits, maximumFractionDigits: digits })

  // The sector that moved most in the day's direction, and how many big companies went that way
  const sector = d?.sectors?.length
    ? [...d.sectors].sort((a, b) => (dir === 'up' ? b.pct - a.pct : a.pct - b.pct))[0]
    : null
  const sectorName = sector ? ((SECTOR_NAMES[lang] || {})[sector.name] || sector.name) : null
  const breadth = d?.breadth
  const count = breadth ? (dir === 'up' ? breadth.advancing : breadth.declining) : null

  // The day's biggest mover in the same direction: the "why it moved" example
  const pool = dir === 'up' ? d?.gainers : d?.losers
  const mover = pool?.[0] || d?.losers?.[0] || d?.gainers?.[0]

  const openMover = () => {
    if (!mover) return
    switchMarketAndAddSymbol('us', { code: mover.symbol, name: mover.name })
    setViewMode('moves')
  }
  const go = (e, href, tab) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (tab) onTabChange(tab)
    else onNavigate(href)
  }

  const title = spx ? s.title(dir, live, day) : ns.introTitle
  const sentence = spx && s.sentence({
    dir, live,
    price: num(spx.price), pct: num(Math.abs(spx.pct)),
    sector: sectorName, n: count, total: breadth?.sample,
  })

  // Two biggest gainers and two biggest losers, largest move first
  const movers = [...(d?.gainers || []).slice(0, 2), ...(d?.losers || []).slice(0, 2)]
    .sort((x, y) => Math.abs(y.pct) - Math.abs(x.pct))
  const idxName = (i) => (lang === 'zh' ? i.name_zh || i.name : i.name)
  const pctText = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v))}%`
  const tone = (v) => (v > 0 ? 'is-up' : v < 0 ? 'is-down' : '')

  // One panel: the headline, sentence and four indices on the left with the S&P 500 line beside
  // them, then the three ways in as a ruled row across the bottom
  return (
    <section className="bfs-lesson" aria-labelledby="bfs-lesson-title">
      <div className="bfs-lesson-top">
        <div className="bfs-lesson-text">
          <p className="bfs-lesson-status">
            <span className={`bfs-dot${live ? ' is-live' : ''}`} aria-hidden="true" />
            {!d ? s.loading : live ? s.open : d.session?.state === 'pre' ? s.pre : d.session?.state === 'post' ? s.post : s.closed(...untilOpen(d.session?.next_open_utc, loc))}
          </p>
          <h1 id="bfs-lesson-title" className={overview.data || overview.failed ? '' : 'skeleton'}>{overview.data || overview.failed ? title : '\u00a0'}</h1>
          <p className="bfs-lesson-sentence">{sentence || ns.introSub}</p>
          {movers.length > 0 && (
            <div className="bfs-lesson-movers">
              <p className="bfs-lesson-label">{s.movers}</p>
              <ul role="list">
                {movers.map((q) => (
                  <li key={q.symbol}>
                    <button type="button" onClick={() => switchMarketAndAddSymbol('us', { code: q.symbol, name: q.name })}>
                      <span className="sym">{q.symbol}</span>
                      <span className="nm">{shortName(q.name)}</span>
                      <span className="px">{num(q.price)}</span>
                      <span className={`c ${tone(q.pct)}`}>{pctText(q.pct)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {d?.indices?.length > 0 && (
            <ul className="bfs-lesson-idx" role="list">
              {d.indices.map((i) => (
                <li key={i.symbol}>
                  <span className="k">{idxName(i)}</span>
                  <span className="v">{num(i.price)}</span>
                  <span className={`c ${tone(i.pct)}`}>{pctText(i.pct)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Chart rows={history.data?.data} dir={dir} label={s.chartLabel} />
      </div>

      <ul className="bfs-lesson-ways" role="list">
        <li>
          {mover ? (
            <button type="button" onClick={openMover}>
              <span className="k">{s.why}</span>
              <span className="v">{s.moved(shortName(mover.name), mover.pct > 0 ? 'up' : 'down', num(Math.abs(mover.pct)))}</span>
            </button>
          ) : (
            <a href={paths.screener} onClick={(e) => go(e, null, 'screener')}>
              <span className="k">{s.why}</span><span className="v">{s.findMover}</span>
            </a>
          )}
        </li>
        <li>
          <a href="/study/stocks?topic=us_2" onClick={(e) => go(e, '/study/stocks?topic=us_2')}>
            <span className="k">{s.idea}</span><span className="v">{s.ideaText}</span>
          </a>
        </li>
        <li>
          <a href={paths.paper} onClick={(e) => go(e, null, 'paper')}>
            <span className="k">{s.try}</span><span className="v">{s.tryText}</span>
          </a>
        </li>
        <li className="bfs-lesson-class">
          <span className="k">{ns.hasCode}</span>
          <span className="v">
            <a href={paths.class} onClick={(e) => go(e, null, 'class')}>{cs.joinTitle}</a>
            <span className="sep"><a href={paths.class} onClick={(e) => go(e, null, 'class')} title={cs.subtitle}>{cs.create}</a></span>
          </span>
        </li>
      </ul>
    </section>
  )
}
