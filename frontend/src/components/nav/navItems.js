import { T } from '../../i18n/translations'
import tmStrings from '../timemachine/tmStrings'
import casesStrings from '../cases/casesStrings'
import diagramNav from '../diagrams/diagramNav'
import governorStrings from '../governor/governorStrings'
import classStrings from '../classes/classStrings'

// The desktop site's sections, split the same way as the phone tabs (行情 / 学习 / AI老师 / 模拟盘):
// the Fed chair game sits with economics, the time machine with trading. Classes get their own entry
// for teachers, and universities and careers theirs. Items are App.jsx tab keys (see TAB_PATHS).
export const SECTIONS = [
  { key: 'markets',  items: ['analysis', 'screener', 'heatmap', 'news', 'macro', 'bank_views'] },
  { key: 'practice', items: ['paper', 'time_machine'] },
  { key: 'learn',    items: ['study', 'cases', 'diagrams', 'governor', 'ai_teacher'] },
  { key: 'class',    items: ['class'] },
  { key: 'future',   items: ['universities', 'career'] },
]

// Same pictures as the phone cards where a feature has one (🕰 📰 📐 🏛 🏫) and the header's 🎓 for the AI teacher
export const ICONS = {
  analysis: '📈', screener: '🔎', heatmap: '🗺️', news: '🗞️', macro: '📅', bank_views: '🏦',
  paper: '💵', time_machine: '🕰', study: '📚', cases: '📰', diagrams: '📐', governor: '🏛',
  ai_teacher: '🎓', class: '🏫', universities: '🌍', career: '💼',
}

// Each page keeps the name it already has in its own strings
export function itemLabel(key, lang) {
  const t = T[lang] || T.en
  switch (key) {
    case 'analysis':     return t.tabAnalysis
    case 'screener':     return t.tabScreener
    case 'heatmap':      return t.tabHeatmap
    case 'news':         return t.tabNews
    case 'macro':        return t.tabMacro
    case 'bank_views':   return t.tabBankViews
    case 'paper':        return t.tabPaper
    case 'time_machine': return tmStrings(lang).nav
    case 'study':        return t.tabStudy
    case 'cases':        return casesStrings(lang).nav
    case 'diagrams':     return diagramNav(lang).nav
    case 'governor':     return governorStrings(lang).nav
    case 'ai_teacher':   return t.navAITutor
    case 'class':        return classStrings(lang).nav
    case 'universities': return t.tabUniversities
    case 'career':       return t.tabCareer
    default:             return key
  }
}

export function sectionOf(tab) {
  return SECTIONS.find((s) => s.items.includes(tab))?.key || null
}
