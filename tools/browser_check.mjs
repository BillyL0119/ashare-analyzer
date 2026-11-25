// Daily browser check of bestfriendstock.com (.github/workflows/browser-check.yml).
//
// Opens every main page in a real browser, each in a FRESH profile (no saved language, no login), the way a
// first-time visitor sees it: on desktop, again on desktop as a returning visitor (language already chosen), and
// on a phone. A page fails when it shows the error box ("出错了 / Something went wrong"), throws an uncaught
// JavaScript error, gets a 4xx/5xx answer from the site itself, or is wider than the screen. A failing page is
// tried once more after a pause, so one slow answer or a restart does not raise an alarm.
//
// Why: on 2026-11-25 a sweep found that every first-time desktop visitor had seen the error box for three weeks
// (WelcomeModal) and that a Career tab crashed when clicked; nothing checked pages in a browser.
//
//   npx playwright@1.56.1 install chromium   (once)
//   node tools/browser_check.mjs                       # the live site
//   node tools/browser_check.mjs http://localhost:4999 # another copy
// Writes browser-check-report.md and exits 1 when something failed. Read-only: it never submits a form, and the
// site's visit counters are blocked so these runs do not show up in the statistics.

import { writeFileSync } from 'node:fs'
import { chromium, devices } from 'playwright'

const BASE = (process.argv[2] || 'https://bestfriendstock.com').replace(/\/$/, '')
const PAGES = [
  '/', '/screener', '/heatmap', '/news', '/macro', '/factors', '/paper', '/time-machine', '/cases', '/diagrams',
  '/governor', '/class', '/study', '/universities', '/bank_views', '/career', '/ai-teacher',
  '/stock/us/AAPL', '/stock/cn/600519', '/stock/hk/00700', '/stock/jp/7203',
]
// Clicks that once crashed a page: [page, button text]
const CLICKS = [['/career', /Interview Questions|面试题库/]]
const PASSES = [
  { name: 'desktop, first visit', device: { viewport: { width: 1440, height: 900 } }, lang: null },
  { name: 'desktop, returning (中文)', device: { viewport: { width: 1440, height: 900 } }, lang: 'zh' },
  { name: 'phone, first visit', device: devices['iPhone 13'], lang: null },
]
const SETTLE_MS = 4000
const RETRY_MS = 20000
const ERROR_BOX = /出错了|Something went wrong/

async function visit(browser, pass, path) {
  const ctx = await browser.newContext({ ...pass.device, userAgent: `${pass.device.userAgent || 'Mozilla/5.0'} bfs-browser-check` })
  if (pass.lang) await ctx.addInitScript((lang) => { try { localStorage.setItem('bfs_lang', lang) } catch { /* ignore */ } }, pass.lang)
  await ctx.route(/\/api\/analytics\/|amplitude/, (route) => route.abort())       // keep checks out of the statistics
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(`JavaScript error: ${String(e.message || e).slice(0, 160)}`))
  page.on('response', (r) => {
    const u = r.url()
    if (u.startsWith(BASE) && r.status() >= 400) problems.push(`${r.status()} ${u.slice(BASE.length, BASE.length + 100)}`)
  })
  try {
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(SETTLE_MS)
    for (const [p, label] of CLICKS) {
      if (p !== path) continue
      const button = page.locator('button', { hasText: label }).first()
      // clicked from script: on a first visit the language window covers the page
      if (await button.count()) { await button.evaluate((b) => b.click()); await page.waitForTimeout(1500) } else problems.push(`button ${label} not found`)
    }
    const text = await page.evaluate(() => document.body.innerText)
    if (ERROR_BOX.test(text)) problems.push(`error box: ${text.match(/出错了[^\n]*\n?[^\n]*|Something went wrong[^\n]*/)?.[0]?.slice(0, 160)}`)
    if (text.trim().length < 80) problems.push('page is almost empty')
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (over > 2) problems.push(`page is ${over}px wider than the screen`)
  } catch (e) {
    problems.push(`did not load: ${String(e.message || e).split('\n')[0].slice(0, 160)}`)
  }
  await ctx.close()
  return [...new Set(problems)]
}

const browser = await chromium.launch()
const failures = []
let checked = 0
for (const pass of PASSES) {
  for (const path of PAGES) {
    let problems = await visit(browser, pass, path)
    if (problems.length) {
      await new Promise((r) => setTimeout(r, RETRY_MS))
      problems = await visit(browser, pass, path)
    }
    checked += 1
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${pass.name.padEnd(26)} ${path}${problems.length ? '\n       ' + problems.join('\n       ') : ''}`)
    if (problems.length) failures.push({ pass: pass.name, path, problems })
  }
}
await browser.close()

const when = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
const lines = failures.length
  ? [`**${failures.length} of ${checked} page checks failed** (${when}, ${BASE}). Each was tried twice.`, '',
     ...failures.map((f) => `- \`${f.path}\` (${f.pass}): ${f.problems.join('; ')}`)]
  : [`All ${checked} page checks passed (${when}, ${BASE}).`]
writeFileSync('browser-check-report.md', lines.join('\n') + '\n')
console.log('\n' + lines.join('\n'))
process.exit(failures.length ? 1 : 0)
