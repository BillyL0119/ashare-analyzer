// Writes dist/quote-text.json: every string of the quote pages and the events calendar in all five languages,
// plus the glossary (definition + formula of each figure). The iOS app reads it through /api/us/quote/text, so
// the app and the website always say the same thing and a wording fix needs no app release.
//
// Strings that are functions on the web (`showAll: (n) => \`Show all ${n}\``) become templates with positional
// slots ("Show all {0}"): each function is called with "{0}", "{1}", ... as its arguments. Runs after vite build.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import summaryStrings from '../src/components/quotepage/summaryStrings.js'
import statsStrings from '../src/components/quotepage/statsStrings.js'
import holdersStrings from '../src/components/quotepage/holdersStrings.js'
import historyStrings from '../src/components/quotepage/historyStrings.js'
import eventsStrings from '../src/components/events/eventsStrings.js'
import { GLOSSARY, explain } from '../src/components/quotepage/glossary.js'
import { T } from '../src/i18n/translations.js'

const LANGS = ['en', 'zh', 'ja', 'ko', 'fr']
const TAB_KEYS = ['tabSummary', 'tabStatistics', 'fundamentalsTab', 'tabHistory', 'tabHolders', 'tabAnalysts', 'tabMacro']

function plain(value) {
  if (typeof value === 'function') {
    const slots = Array.from({ length: Math.max(value.length, 1) }, (_, i) => `{${i}}`)
    try {
      return String(value(...slots))
    } catch {
      return null
    }
  }
  if (Array.isArray(value)) return value.map(plain)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]).filter(([, v]) => v != null))
  }
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

const langs = {}
for (const lang of LANGS) {
  const t = T[lang] || T.en
  langs[lang] = {
    summary: plain(summaryStrings(lang)),
    stats: plain(statsStrings(lang)),
    holders: plain(holdersStrings(lang)),
    history: plain(historyStrings(lang)),
    events: plain(eventsStrings(lang)),
    tabs: Object.fromEntries(TAB_KEYS.map((k) => [k, t[k]])),
    glossary: Object.fromEntries(Object.keys(GLOSSARY).map((k) => [k, explain(k, lang)]).filter(([, v]) => v)),
  }
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'quote-text.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), langs }))
console.log(`quote text: ${Object.keys(langs.en.glossary).length} glossary terms, ${LANGS.length} languages`)
