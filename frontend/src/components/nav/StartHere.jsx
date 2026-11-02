import { useState } from 'react'
import { T } from '../../i18n/translations'
import tmStrings from '../timemachine/tmStrings'
import casesStrings from '../cases/casesStrings'
import governorStrings from '../governor/governorStrings'
import classStrings from '../classes/classStrings'
import Chevron from './Chevron'
import navStrings from './navStrings'
import { ICONS } from './navItems'
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
        <span aria-hidden="true">🧭</span>
        {s.startTitle}
        <Chevron />
      </button>
    )
  }
  return (
    <section className="bfs-start" aria-labelledby="bfs-start-title">
      <div className="bfs-start-head">
        <h2 id="bfs-start-title">{s.startTitle}</h2>
        <button type="button" className="bfs-start-hide" aria-expanded="true" onClick={() => fold(true)}>
          {s.hide}
          <Chevron open />
        </button>
      </div>
      <div className="bfs-start-grid">
        <div className="bfs-start-col">
          <h3>{s.students}</h3>
          <ul className="bfs-start-cards" role="list">
            {picks.map((p) => (
              <li key={p.tab}>
                <a href={paths[p.tab]} onClick={(e) => go(e, p.tab)}>
                  <span className="bfs-start-icon" aria-hidden="true">{ICONS[p.tab]}</span>
                  <span>
                    <b>{p.title}</b>
                    <span className="bfs-start-text">{p.text}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="bfs-start-code">
            {s.hasCode}
            <a href={paths.class} onClick={(e) => go(e, 'class')}>{cs.joinTitle} →</a>
          </p>
        </div>
        <div className="bfs-start-col is-teacher">
          <h3>{s.teachers}</h3>
          <p>{cs.subtitle}</p>
          <a className="bfs-start-cta" href={paths.class} onClick={(e) => go(e, 'class')}>
            <span aria-hidden="true">{ICONS.class}</span>
            {cs.create} →
          </a>
          <p className="bfs-start-note">{cs.teachSignIn}</p>
        </div>
      </div>
    </section>
  )
}
