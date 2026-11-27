// A week of faceless Instagram posts for the Best Friend Stock account (4 posts, nothing is posted automatically):
//
//   BFS_REPO=/path/to/ashare-analyzer node week1.mjs OUT_DIR       (copy tools/social/ to a folder with Playwright installed)
//
//   Mon  case of the day            4 cards   from the live case library (case_cards.mjs)
//   Wed  History Time Machine       4 cards + a story image   real SPY closes from backend/data/time_machine/covid_2020.json
//   Fri  Draw it                    4 cards   the live Diagram Lab, before and after a supply shock
//   Sun  Evaluate in three moves    5 cards   exam technique, no site data
// Each folder has slide-N.png, caption.txt and alt-text.txt. Every figure on the Time Machine cards is computed from the data
// file; the cards say they are for learning and are not investment advice.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { SITE, TAGS, H, HS, card, cta, esc, foot, launch, render } from './lib.mjs'
import { makeCaseCards } from './case_cards.mjs'

const OUT = process.argv[2] || 'week-1'
const REPO = process.env.BFS_REPO || fileURLToPath(new URL('../..', import.meta.url))
const save = (dir, caption, alt) => {
  writeFileSync(`${dir}/caption.txt`, caption.trim() + '\n')
  writeFileSync(`${dir}/alt-text.txt`, alt.trim() + '\n')
}

// ── Wed: History Time Machine ────────────────────────────────────────────────────────────────────────────────
function timeMachine() {
  const d = JSON.parse(readFileSync(`${REPO}/backend/data/time_machine/covid_2020.json`, 'utf8'))
  const { dates } = d
  const spy = d.closes.SPY
  const i0 = d.start_index
  let peak = i0
  for (let k = i0; k < dates.length && dates[k] <= '2020-03-01'; k++) if (spy[k] > spy[peak]) peak = k
  let low = peak
  for (let k = peak; k < dates.length; k++) if (spy[k] < spy[low]) low = k
  const last = dates.length - 1
  const f = {
    peakDate: dates[peak], peak: spy[peak], lowDate: dates[low], low: spy[low], lastDate: dates[last], last: spy[last],
    days: low - peak, drop: Math.round((1 - spy[low] / spy[peak]) * 100),
    upFromLow: Math.round((spy[last] / spy[low] - 1) * 100), belowPeak: Math.round((1 - spy[last] / spy[peak]) * 100),
  }
  const day = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  // line chart of the closes from the window's start to `end`, with markers
  const chart = (end, marks) => {
    const w = 936, h = 560, pad = { l: 24, r: 24, t: 70, b: 60 }
    const xs = spy.slice(i0, end + 1)
    const lo = Math.min(...xs) * 0.97, hi = Math.max(...xs) * 1.03
    const X = (k) => pad.l + ((k - i0) / (end - i0)) * (w - pad.l - pad.r)
    const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b)
    const pts = xs.map((v, n) => `${X(i0 + n).toFixed(1)},${Y(v).toFixed(1)}`)
    const area = `${pts.join(' ')} ${X(end).toFixed(1)},${h - pad.b} ${X(i0).toFixed(1)},${h - pad.b}`
    const dots = marks.map(([k, , color]) => `<circle cx="${X(k)}" cy="${Y(spy[k])}" r="11" fill="${color}" stroke="#0f2447" stroke-width="4"/>`).join('')
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><polygon points="${area}" fill="#8ab7ff" opacity="0.12"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linejoin="round"/>${dots}
      <text x="${pad.l}" y="${h - 14}" fill="#c4d0e6" font-size="26" font-family="Geist, sans-serif">${day(dates[i0])} 2020</text>
      <text x="${w - pad.r}" y="${h - 14}" fill="#c4d0e6" font-size="26" font-family="Geist, sans-serif" text-anchor="end">${day(dates[end])} 2020</text></svg>`
  }
  // the labelled points sit under the chart, so no text ever covers the line
  const legend = (marks) => `<div style="display:flex;gap:36px;flex-wrap:wrap;font-size:32px;color:#fff">${marks.map(([, label, color]) =>
    `<span style="display:flex;align-items:center;gap:12px"><i style="width:22px;height:22px;border-radius:50%;background:${color};display:inline-block"></i>${label}</span>`).join('')}</div>`
  const m2 = [[peak, `${day(f.peakDate)}: $${f.peak.toFixed(0)}`, '#4cc38a'], [low, `${day(f.lowDate)}: $${f.low.toFixed(0)}`, '#e5484d']]
  const m4 = [...m2, [last, `${day(f.lastDate)}: $${f.last.toFixed(0)}`, '#8ab7ff']]
  const tail = 'For learning only. Not investment advice.'
  const cards = [
    card(`<div class="body"><div class="label">History Time Machine · ${day(f.lowDate)} 2020</div>
        <div class="fit big" data-max="104" style="height:520px">The S&amp;P 500 has fallen ${f.drop}% in ${f.days} trading days.</div>
        <div class="fit title" data-max="72" style="height:150px;color:#8ab7ff">Do you sell?</div></div>${foot(tail)}`, 1, 4),
    card(`<div class="body"><div class="label">The market, ${day(dates[i0])} to ${day(f.lowDate)} 2020</div>
        <div class="panel" style="padding:0">${chart(low, m2)}</div>${legend(m2)}
        <div class="fit" data-max="34" style="height:90px;color:#c4d0e6">S&amp;P 500 fund (SPY). Down ${f.drop}% from the high in ${f.days} trading days. You can see only this, and the news of the day.</div></div>${foot(tail)}`, 2, 4),
    card(`<div class="body"><div class="label">What would you do?</div>
        <div class="opt"><b>A</b>Sell everything</div><div class="opt"><b>B</b>Hold and wait</div>
        <div class="opt"><b>C</b>Buy more now</div><div class="opt"><b>D</b>Buy a little each week</div>
        <div class="fit" data-max="34" style="height:96px;color:#c4d0e6">There is no right answer on the day. That is the point of the exercise.</div></div>${foot(tail)}`, 3, 4),
    card(`<div class="body"><div class="label">What happened next</div>
        <div class="panel" style="padding:0">${chart(last, m4)}</div>${legend(m4)}
        <div class="fit" data-max="40" style="height:170px">By ${day(f.lastDate)} the fund was ${f.upFromLow}% above the low and ${f.belowPeak}% below the February high. Hindsight makes it look easy. On the day, it did not.</div></div>${cta('Try it with virtual money. ' + tail)}`, 4, 4),
  ]
  const story = card(`<div class="body" style="top:260px;bottom:260px"><div class="label">History Time Machine</div>
      <div class="fit big" data-max="120" style="height:640px">${day(f.lowDate)} 2020.<br>Down ${f.drop}% in ${f.days} trading days.</div>
      <div class="fit title" data-max="96" style="height:200px;color:#8ab7ff">Sell or hold?</div></div>${cta('For learning only', 'bestfriendstock.com')}`, 0, 0, { h: HS })
  const caption = `March 2020. The S&P 500 fund has fallen ${f.drop}% in ${f.days} trading days. Do you sell, hold, or buy more?

Swipe for the options, then for what happened next. There is no right answer on the day, and that is why we built the History Time Machine: you see only the prices and news people had that day, you trade with virtual money, and at the end you compare with simply holding an index fund. Free. Link in bio.

${tail}

#investing #stockmarket #personalfinance #financeeducation #studygram #economics #covid19`
  const alt = `A line chart of the S&P 500 fund (SPY) from 21 January to 23 March 2020: it peaks at $${f.peak.toFixed(0)} on ${day(f.peakDate)} and falls to $${f.low.toFixed(0)} on ${day(f.lowDate)}, ${f.drop}% lower in ${f.days} trading days.`
  return { cards, story, caption, alt }
}

// ── Fri: Draw it (the live Diagram Lab) ──────────────────────────────────────────────────────────────────────
async function drawIt() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
  await ctx.addInitScript(() => { try { localStorage.setItem('bfs_lang', 'en'); localStorage.setItem('bfs_lang_src', 'pick'); localStorage.setItem('bfs_theme', 'dark') } catch { /* ignore */ } })
  await ctx.route(/\/api\/analytics\//, (r) => r.abort())
  const page = await ctx.newPage()
  const shots = {}
  for (const [name, q] of [['before', 'd=sd'], ['after', 'd=sd&p=supply_decrease']]) {
    await page.goto(`${SITE}/diagrams?lang=en&${q}`, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(6000)
    shots[name] = (await page.locator('.dl-svg').screenshot()).toString('base64')
  }
  await browser.close()
  const img = (b64) => `<div class="shot"><img src="data:image/png;base64,${b64}" alt=""></div>`
  const tip = 'Draw the old and the new curve and number them. Run dashed lines from both equilibria to the axes so P1, P2, Q1 and Q2 can be read off.'
  const cards = [
    card(`<div class="body"><div class="label">Draw it</div>
        <div class="fit big" data-max="108" style="height:560px">Oil supply falls. Draw what happens in 20 seconds.</div>
        <div class="chips"><span class="chip">Supply and demand</span><span class="chip">IB</span><span class="chip">A-Level</span><span class="chip">AP</span></div></div>${foot('', 'bestfriendstock.com')}`, 1, 4),
    card(`<div class="body"><div class="label">Step 1: the market before the shock</div>${img(shots.before)}
        <div class="fit" data-max="36" style="height:90px;color:#c4d0e6">Supply (S) and demand (D) meet at the equilibrium: price P1, quantity Q1.</div></div>${foot('', 'bestfriendstock.com/diagrams')}`, 2, 4),
    card(`<div class="body"><div class="label">Step 2: supply falls, S shifts left</div>${img(shots.after)}
        <div class="fit" data-max="36" style="height:90px;color:#c4d0e6">New equilibrium: the price rises to P2 and the quantity falls to Q2.</div></div>${foot('', 'bestfriendstock.com/diagrams')}`, 3, 4),
    card(`<div class="body"><div class="label">Exam tip</div>
        <div class="q"><div class="fit" data-max="46" style="height:500px">${esc(tip)}</div></div></div>${cta('Drag the curves yourself, free')}`, 4, 4),
  ]
  const caption = `Oil supply falls. Can you draw what happens in 20 seconds?

Start with S and D meeting at P1 and Q1. Shift supply to the left: the new equilibrium has a higher price (P2) and a lower quantity (Q2). Number the curves, and run dashed lines to the axes so the examiner can read your prices and quantities.

You can drag the curves yourself in our free Diagram Lab, with the labels IB, A-Level and AP examiners expect. Link in bio.

${TAGS.join(' ')}`
  const alt = 'A supply and demand diagram: supply shifts left from S1 to S2, so the equilibrium price rises from P1 to P2 and the quantity falls from Q1 to Q2.'
  return { cards, caption, alt }
}

// ── Sun: Evaluate in three moves ─────────────────────────────────────────────────────────────────────────────
function evaluate() {
  const move = (n, head, text, example, i) => card(`<div class="body"><div class="label">Move ${n}</div>
      <div class="fit big" data-max="100" style="height:200px">${esc(head)}</div>
      <div class="panel"><div class="fit" data-max="48" style="height:190px">${esc(text)}</div></div>
      <div class="fit" data-max="34" style="height:130px;color:#c4d0e6">${esc(example)}</div></div>${foot('', 'bestfriendstock.com')}`, i, 5)
  const cards = [
    card(`<div class="body"><div class="label">Exam technique</div>
        <div class="fit big" data-max="112" style="height:560px">Stop memorising evaluation. Use these three moves.</div>
        <div class="fit" data-max="40" style="height:80px;color:#c4d0e6">They work on almost any economics question. Save this for your next essay.</div></div>${foot('', 'bestfriendstock.com')}`, 1, 5),
    move(1, 'Time', 'Does the effect change between the short run and the long run?', 'A fuel tax may cut demand only a little now (few alternatives), and more later (people switch to efficient cars).', 2),
    move(2, 'Who', 'Who gains and who loses?', 'A tariff helps domestic producers, but raises prices for consumers and for firms that import parts.', 3),
    move(3, 'How big', 'What does the size of the effect depend on?', 'Elasticity, the size of the change, and other things that are moving at the same time.', 4),
    card(`<div class="body"><div class="label">Write it like this</div>
        <div class="q"><div class="fit big" data-max="76" style="height:420px">&ldquo;This depends on ___, because ___.&rdquo;</div></div>
        <div class="fit" data-max="38" style="height:120px;color:#c4d0e6">One sentence like that, with a reason, is what turns a description into evaluation.</div></div>${cta('A new real-news exam question every day, free')}`, 5, 5),
  ]
  const caption = `Evaluation is where most marks are lost. Three moves that work on almost any question: time, who, how big.

Which one do you forget most? Tell us in the comments. Save this for your next essay.

A new real-news economics example with an exam-style question every day, free. Link in bio.

${TAGS.join(' ')}`
  const alt = 'Five slides: three evaluation moves for economics essays (time, who gains and loses, how big), and a sentence frame: This depends on ___, because ___.'
  return { cards, caption, alt }
}

const { browser, tab } = await launch()
mkdirSync(OUT, { recursive: true })

const mon = `${OUT}/1-mon-case-of-the-day`
mkdirSync(mon, { recursive: true })
await makeCaseCards(mon, 1, tab)

const wedDir = `${OUT}/2-wed-history-time-machine`
mkdirSync(wedDir, { recursive: true })
const tm = timeMachine()
for (let i = 0; i < tm.cards.length; i++) await render(tab, tm.cards[i], `${wedDir}/slide-${i + 1}.png`)
await render(tab, tm.story, `${wedDir}/story-poll.png`, { h: HS })
save(wedDir, tm.caption, tm.alt)

const friDir = `${OUT}/3-fri-draw-it`
mkdirSync(friDir, { recursive: true })
const di = await drawIt()
for (let i = 0; i < di.cards.length; i++) await render(tab, di.cards[i], `${friDir}/slide-${i + 1}.png`)
save(friDir, di.caption, di.alt)

const sunDir = `${OUT}/4-sun-evaluate-in-three-moves`
mkdirSync(sunDir, { recursive: true })
const ev = evaluate()
for (let i = 0; i < ev.cards.length; i++) await render(tab, ev.cards[i], `${sunDir}/slide-${i + 1}.png`)
save(sunDir, ev.caption, ev.alt)
await browser.close()
console.log('week written to', OUT)
