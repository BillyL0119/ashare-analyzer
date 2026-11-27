// "Economics case of the day" Instagram carousels from the live case library (bestfriendstock.com/cases).
//
//   node tools/social/case_cards.mjs OUT_DIR [HOW_MANY=3]
//
// Needs Playwright (npm i playwright@1.56.1 && npx playwright install chromium, in a scratch folder: copy this file there).
// For each of the newest cases with a clear concept it writes
//   OUT_DIR/<date>-<id>/slide-1.png .. slide-4.png   1080 x 1350 (Instagram portrait): hook, what happened, the economics, exam question
//   OUT_DIR/<date>-<id>/caption.txt                  caption with the tracked link (utm_source=ig_post) and hashtags
// Nothing is posted: a person looks at the cards and posts them. The text is the library's own (what / angle / evaluate /
// question, already checked against the source article), the headline is credited to its outlet, and nothing here
// promises returns or tells anyone what to buy.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = process.argv[2] || 'social-cards'
const HOW_MANY = Number(process.argv[3] || 3)
const SITE = 'https://bestfriendstock.com'
const W = 1080
const H = 1350

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const CSS = `
  :root { --navy:#0a1a36; --card:#0f2447; --raised:#153059; --line:#2f5088; --text:#ffffff; --soft:#c4d0e6; --accent:#8ab7ff; }
  * { box-sizing: border-box; margin: 0; }
  body { width:${W}px; height:${H}px; background: var(--navy); color: var(--text); font-family: 'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif; position: relative; overflow: hidden; }
  .top { position:absolute; left:72px; right:72px; top:64px; display:flex; align-items:center; justify-content:space-between; }
  .brand { display:flex; align-items:center; gap:14px; font-weight:600; font-size:30px; }
  .brand img { height:46px; filter: brightness(0) invert(1); }
  .count { font-size:26px; color: var(--soft); font-variant-numeric: tabular-nums; }
  .body { position:absolute; left:72px; right:72px; top:170px; bottom:170px; display:flex; flex-direction:column; justify-content:center; gap:36px; }
  .label { font-size:30px; color: var(--accent); font-weight:500; }
  .fit { line-height:1.28; overflow:hidden; }
  .title { font-family:'Bricolage Grotesque','Geist',sans-serif; font-weight:600; line-height:1.15; }
  .chips { display:flex; flex-wrap:wrap; gap:14px; }
  .chip { border:2px solid var(--line); border-radius:999px; padding:10px 24px; font-size:28px; color: var(--soft); }
  .panel { background: var(--card); border:2px solid var(--line); border-radius:28px; padding:48px; }
  .q { background: var(--raised); border-left: 8px solid var(--accent); border-radius: 20px; padding: 44px; }
  .foot { position:absolute; left:72px; right:72px; bottom:64px; display:flex; justify-content:space-between; align-items:flex-end; color: var(--soft); font-size:26px; }
  .cta { background:#fff; color: var(--navy); border-radius:18px; padding:20px 32px; font-weight:600; font-size:32px; }
  .src { max-width: 560px; }
`

function page(inner, n) {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Bricolage+Grotesque:wght@600&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="top"><div class="brand"><img src="${SITE}/logo-header.png" alt="">Best Friend Stock</div><div class="count">${n} / 4</div></div>
${inner}</body></html>`
}

function slides(c) {
  const day = c.date
  const concepts = (c.concepts || []).slice(0, 3).map((k) => `<span class="chip">${esc(k.name)}</span>`).join('')
  const foot = (extra = '') => `<div class="foot"><div class="src">${extra}</div><div>bestfriendstock.com/cases</div></div>`
  return [
    page(`<div class="body">
        <div class="label">Economics case of the day · ${esc(day)}</div>
        <div class="fit title" data-max="92" style="height:640px">${esc(c.title)}</div>
        <div class="chips">${concepts}</div>
      </div>${foot(`Source: ${esc(c.source)}`)}`, 1),
    page(`<div class="body"><div class="label">What happened</div>
        <div class="panel"><div class="fit" data-max="50" style="height:640px">${esc(c.what)}</div></div></div>${foot(`Source: ${esc(c.source)}`)}`, 2),
    page(`<div class="body"><div class="label">The economics</div>
        <div class="panel"><div class="fit" data-max="46" style="height:${c.evaluate ? 380 : 640}px">${esc(c.angle)}</div></div>
        ${c.evaluate ? `<div class="label">Evaluate</div><div class="panel"><div class="fit" data-max="40" style="height:230px">${esc(c.evaluate)}</div></div>` : ''}
      </div>${foot()}`, 3),
    page(`<div class="body"><div class="label">Exam question</div>
        <div class="q"><div class="fit" data-max="48" style="height:560px">${esc(c.question)}</div></div></div>
      <div class="foot"><div>Free for IB, A-Level, AP and IGCSE students</div><div class="cta">Link in bio</div></div>`, 4),
  ]
}

function caption(c) {
  const tags = ['#economics', '#ibeconomics', '#aleveleconomics', '#apmacro', '#apmicro', '#igcseeconomics', '#studygram', '#economicsstudent']
  const first = (c.concepts || [])[0]?.name
  return [
    `${c.title}`,
    '',
    first ? `Concept: ${first}. Swipe for what happened, the economics, and an exam-style question.` : 'Swipe for what happened, the economics, and an exam-style question.',
    '',
    `A real news story turned into an essay example, every day, free: ${SITE}/cases/${c.id}?utm_source=ig_post`,
    `Source: ${c.source}.`,
    '',
    tags.join(' '),
  ].join('\n')
}

const res = await fetch(`${SITE}/api/cases?lang=en&limit=40`)
const { cases } = await res.json()
// A school-friendly account stays out of campaigns and violence; a person still reads every card before it is posted
const AVOID = /election|midterm|campaign|impeach|trial|court|war\b|attack|kill|shoot|terror|scandal|manipulat|fraud|sanction|probe|investigat/i
const picked = []
const seen = new Set()
for (const c of cases) {
  const key = c.concepts?.[0]?.id
  if (!c.what || !c.angle || !c.question || !key || seen.has(key) || /[㐀-鿿]/.test(c.title)) continue
  if (AVOID.test(`${c.title} ${c.what}`)) continue
  seen.add(key)
  picked.push(c)
  if (picked.length >= HOW_MANY) break
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const tab = await ctx.newPage()
for (const c of picked) {
  const dir = `${OUT}/${c.date}-${c.id}`
  mkdirSync(dir, { recursive: true })
  const html = slides(c)
  for (let i = 0; i < html.length; i++) {
    await tab.setContent(html[i], { waitUntil: 'networkidle' })
    await tab.evaluate(async () => {
      await document.fonts.ready
      for (const el of document.querySelectorAll('.fit')) {                      // the largest size at which the text fits its box
        let size = Number(el.dataset.max)
        el.style.fontSize = size + 'px'
        while (el.scrollHeight > el.clientHeight + 1 && size > 26) { size -= 2; el.style.fontSize = size + 'px' }
      }
    })
    await tab.screenshot({ path: `${dir}/slide-${i + 1}.png` })
  }
  writeFileSync(`${dir}/caption.txt`, caption(c) + '\n')
  console.log('cards:', dir, '|', c.title.slice(0, 70))
}
await browser.close()
