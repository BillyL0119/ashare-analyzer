import { useState } from 'react'
import { T } from '../../i18n/translations'
import tmStrings from '../timemachine/tmStrings'
import casesStrings from '../cases/casesStrings'
import governorStrings from '../governor/governorStrings'
import classStrings from '../classes/classStrings'
import Chevron from './Chevron'
import Icon from '../Icon'
import navStrings from './navStrings'
import { ICONS, TINTS } from './navItems'
import './nav.css'

const KEY = 'bfs_start_here'

// Home-page block for first-time visitors: what a student should try first, and where a teacher sets up
// a class. It folds down to one line, remembered on this device.
export default function StartHere({ lang, paths, onTabChange }) {
  const [folded, setFolded] = useState(() => { try { return localStorage.getItem(KEY) === 'folded' } catch { return false } })
  const fold = (v) => {
    setFolded(v)
    try { if (v) localStorage.setItem(KEY, 'folded'); else localStorage.removeItem(KEY) } catch { /* storage blocked */ }
  }
  const s = navStrings(lang)
  const t = T[lang] || T.en
  const cs = classStrings(lang)
  const go = (e, tab) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return   // new tab or window
    e.preventDefault()
    onTabChange(tab)
  }
  const picks = [
    { tab: 'study',        title: t.tabStudy,                   text: s.studyCard },
    { tab: 'time_machine', title: tmStrings(lang).title,        text: tmStrings(lang).subtitle },
    { tab: 'governor',     title: governorStrings(lang).title,  text: governorStrings(lang).card },
    { tab: 'cases',        title: casesStrings(lang).title,     text: casesStrings(lang).subtitle },
  ]

  if (folded) {
    return (
      <button type="button" className="bfs-start-fold" aria-expanded="false" onClick={() => fold(false)}>
        {s.startTitle}
        <Chevron />
      </button>
    )
  }
  // One compact panel: a title row with the class links, then four places to start in a single row
  return (
    <section className="bfs-start" aria-labelledby="bfs-start-title">
      <div className="bfs-start-head">
        <h2 id="bfs-start-title">{s.startTitle}</h2>
        <div className="bfs-start-links">
          <span>{s.hasCode} <a href={paths.class} onClick={(e) => go(e, 'class')}>{cs.joinTitle} →</a></span>
          <span>{s.isTeacher} <a href={paths.class} onClick={(e) => go(e, 'class')} title={cs.subtitle}>{cs.create} →</a></span>
          <button type="button" className="bfs-start-hide" aria-expanded="true" onClick={() => fold(true)}>
            {s.hide}
            <Chevron open />
          </button>
        </div>
      </div>
      <ul className="bfs-start-cards" role="list">
        {picks.map((p) => (
          <li key={p.tab}>
            <a href={paths[p.tab]} onClick={(e) => go(e, p.tab)}>
              <span className="bfs-chip is-md" style={{ background: `var(--chip-${TINTS[p.tab]})` }}><Icon name={ICONS[p.tab]} size={18} strokeWidth={2} /></span>
              <span className="bfs-start-body">
                <b>{p.title}</b>
                <span className="bfs-start-text">{p.text}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
