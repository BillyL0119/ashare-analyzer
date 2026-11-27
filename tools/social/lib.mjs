// Shared look and renderer for the social cards (case_cards.mjs, week1.mjs): navy page, white text, one blue accent, the
// site's own logo. A card is an HTML string; render() draws it at the given size and shrinks every .fit box's text until it fits.
import { chromium } from 'playwright'

export const SITE = 'https://bestfriendstock.com'
export const W = 1080
export const H = 1350           // Instagram portrait feed post
export const HS = 1920          // story

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const CSS = (h) => `
  :root { --navy:#0a1a36; --card:#0f2447; --raised:#153059; --line:#2f5088; --text:#ffffff; --soft:#c4d0e6; --accent:#8ab7ff; --red:#e5484d; --green:#4cc38a; }
  * { box-sizing: border-box; margin: 0; }
  body { width:${W}px; height:${h}px; background: var(--navy); color: var(--text); font-family: 'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif; position: relative; overflow: hidden; }
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
  .opt { display:flex; gap:28px; align-items:center; background: var(--card); border:2px solid var(--line); border-radius:24px; padding:30px 36px; font-size:40px; }
  .opt b { width:64px; height:64px; border-radius:50%; background: var(--raised); display:flex; align-items:center; justify-content:center; font-size:34px; flex:none; }
  .foot { position:absolute; left:72px; right:72px; bottom:64px; display:flex; justify-content:space-between; align-items:flex-end; color: var(--soft); font-size:26px; gap:32px; }
  .cta { background:#fff; color: var(--navy); border-radius:18px; padding:20px 32px; font-weight:600; font-size:32px; white-space:nowrap; }
  .src { max-width: 640px; }
  .shot { border:2px solid var(--line); border-radius:28px; overflow:hidden; background: var(--card); }
  .shot img { display:block; width:100%; }
  .big { font-family:'Bricolage Grotesque','Geist',sans-serif; font-weight:600; line-height:1.05; }
`

export function card(inner, n, total, { h = H } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Bricolage+Grotesque:wght@600&display=swap" rel="stylesheet">
<style>${CSS(h)}</style></head><body>
<div class="top"><div class="brand"><img src="${SITE}/logo-header.png" alt="">Best Friend Stock</div>${total ? `<div class="count">${n} / ${total}</div>` : ''}</div>
${inner}</body></html>`
}

export const foot = (left = '', right = 'bestfriendstock.com') => `<div class="foot"><div class="src">${left}</div><div>${right}</div></div>`
export const cta = (left, button = 'Link in bio') => `<div class="foot"><div>${left}</div><div class="cta">${button}</div></div>`

export async function launch() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  return { browser, tab: await ctx.newPage() }
}

export async function render(tab, html, path, { h = H } = {}) {
  await tab.setViewportSize({ width: W, height: h })
  await tab.setContent(html, { waitUntil: 'networkidle' })
  await tab.evaluate(async () => {
    await document.fonts.ready
    for (const el of document.querySelectorAll('.fit')) {                  // the largest size at which the text fits its box
      let size = Number(el.dataset.max)
      el.style.fontSize = size + 'px'
      while (el.scrollHeight > el.clientHeight + 1 && size > 26) { size -= 2; el.style.fontSize = size + 'px' }
    }
  })
  await tab.screenshot({ path })
}

export const TAGS = ['#economics', '#ibeconomics', '#aleveleconomics', '#apmacro', '#apmicro', '#igcseeconomics', '#studygram', '#economicsstudent']
