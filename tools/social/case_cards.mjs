// "Economics case of the day" Instagram carousels from the live case library (bestfriendstock.com/cases).
//
//   node tools/social/case_cards.mjs OUT_DIR [HOW_MANY=3]
//
// Needs Playwright (npm i playwright@1.56.1 && npx playwright install chromium, in a scratch folder: copy tools/social/ there).
// For each of the newest cases with a clear concept it writes
//   OUT_DIR/<date>-<id>/slide-1.png .. slide-4.png   1080 x 1350 (Instagram portrait): hook, what happened, the economics, exam question
//   OUT_DIR/<date>-<id>/caption.txt                  the caption (a link in a caption is not clickable on Instagram: "link in bio")
//   OUT_DIR/<date>-<id>/story-link.txt               the tracked address for a story's link sticker (utm_source=ig_story)
// Nothing is posted: a person looks at the cards and posts them. The text is the library's own (what / angle / evaluate /
// question, already checked against the source article), the headline is credited to its outlet, and nothing here
// promises returns or tells anyone what to buy.
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { SITE, TAGS, card, cta, esc, foot, launch, render } from './lib.mjs'

// A school-friendly account stays out of campaigns and violence; a person still reads every card before it is posted
const AVOID = /election|midterm|campaign|impeach|trial|court|war\b|attack|kill|shoot|terror|scandal|manipulat|fraud|sanction|probe|investigat/i

function slides(c) {
  const concepts = (c.concepts || []).slice(0, 3).map((k) => `<span class="chip">${esc(k.name)}</span>`).join('')
  const src = `Source: ${esc(c.source)}`
  return [
    card(`<div class="body">
        <div class="label">Economics case of the day · ${esc(c.date)}</div>
        <div class="fit title" data-max="92" style="height:640px">${esc(c.title)}</div>
        <div class="chips">${concepts}</div>
      </div>${foot(src, 'bestfriendstock.com/cases')}`, 1, 4),
    card(`<div class="body"><div class="label">What happened</div>
        <div class="panel"><div class="fit" data-max="50" style="height:640px">${esc(c.what)}</div></div></div>${foot(src, 'bestfriendstock.com/cases')}`, 2, 4),
    card(`<div class="body"><div class="label">The economics</div>
        <div class="panel"><div class="fit" data-max="46" style="height:${c.evaluate ? 380 : 640}px">${esc(c.angle)}</div></div>
        ${c.evaluate ? `<div class="label">Evaluate</div><div class="panel"><div class="fit" data-max="40" style="height:230px">${esc(c.evaluate)}</div></div>` : ''}
      </div>${foot('', 'bestfriendstock.com/cases')}`, 3, 4),
    card(`<div class="body"><div class="label">Exam question</div>
        <div class="q"><div class="fit" data-max="48" style="height:560px">${esc(c.question)}</div></div></div>${cta('Free for IB, A-Level, AP and IGCSE students')}`, 4, 4),
  ]
}

export function caption(c) {
  const first = (c.concepts || [])[0]?.name
  return [
    `${c.title}`,
    '',
    first ? `Concept: ${first}. Swipe for what happened, the economics, and an exam-style question.` : 'Swipe for what happened, the economics, and an exam-style question.',
    '',
    'A real news story turned into an essay example, every day, free. Link in bio.',
    `Source: ${c.source}.`,
    '',
    TAGS.join(' '),
  ].join('\n')
}

export async function pickCases(n) {
  const res = await fetch(`${SITE}/api/cases?lang=en&limit=40`)
  const { cases } = await res.json()
  const picked = []
  const seen = new Set()
  for (const c of cases) {
    const key = c.concepts?.[0]?.id
    if (!c.what || !c.angle || !c.question || !key || seen.has(key) || /[㐀-鿿]/.test(c.title)) continue
    if (AVOID.test(`${c.title} ${c.what}`)) continue
    seen.add(key)
    picked.push(c)
    if (picked.length >= n) break
  }
  return picked
}

export async function makeCaseCards(out, howMany, tab) {
  const dirs = []
  for (const c of await pickCases(howMany)) {
    const dir = `${out}/${c.date}-${c.id}`
    mkdirSync(dir, { recursive: true })
    const html = slides(c)
    for (let i = 0; i < html.length; i++) await render(tab, html[i], `${dir}/slide-${i + 1}.png`)
    writeFileSync(`${dir}/caption.txt`, caption(c) + '\n')
    writeFileSync(`${dir}/alt-text.txt`, `Four slides about a news story, "${c.title}": what happened, the economics behind it, and an exam-style question. Source: ${c.source}.\n`)
    writeFileSync(`${dir}/story-link.txt`, `${SITE}/cases/${c.id}?utm_source=ig_story\n`)
    console.log('cards:', dir, '|', c.title.slice(0, 70))
    dirs.push(dir)
  }
  return dirs
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { browser, tab } = await launch()
  await makeCaseCards(process.argv[2] || 'social-cards', Number(process.argv[3] || 3), tab)
  await browser.close()
}
