import { useState } from 'react'
import { T } from '../../i18n/translations'
import tmStrings from '../timemachine/tmStrings'
import casesStrings from '../cases/casesStrings'
import governorStrings from '../governor/governorStrings'
import classStrings from '../classes/classStrings'
import Chevron from './Chevron'
import Icon from '../Icon'
import navStrings from './navStrings'
import { ICONS } from './navItems'
import './nav.css'

const KEY = 'bfs_start_here'

// The home page's one introduction: what the site is, one primary and one secondary action, the
// class links, and four places to start as a ruled list. It folds down to one line, remembered on
// this device.
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
  const searchStock = () => {
    const input = document.querySelector('header input')
    if (input) { input.focus(); input.select?.() } else onTabChange('screener')
  }
  const picks = [
    { tab: 'paper',        title: t.tabPaper,                   text: s.paperCard },
    { tab: 'time_machine', title: tmStrings(lang).title,        text: tmStrings(lang).subtitle },
    { tab: 'governor',     title: governorStrings(lang).title,  text: governorStrings(lang).card },
    { tab: 'cases',        title: casesStrings(lang).title,     text: casesStrings(lang).subtitle },
  ]

  if (folded) {
    return (
      <button type="button" className="bfs-start-fold" aria-expanded="false" onClick={() => fold(false)}>
        {s.introTitle}
        <Chevron />
      </button>
    )
  }
  return (
    <section className="bfs-start" aria-labelledby="bfs-start-title">
      <div className="bfs-start-intro">
        <h1 id="bfs-start-title">{s.introTitle}</h1>
        <p className="bfs-start-sub">{s.introSub}</p>
        <div className="bfs-start-actions">
          <a className="bfs-btn-primary" href={paths.study} onClick={(e) => go(e, 'study')}>{s.startStudy}</a>
          <button type="button" className="bfs-btn-secondary" onClick={searchStock}>
            <Icon name="search" size={16} strokeWidth={1.5} />{s.searchStock}
          </button>
        </div>
        <p className="bfs-start-links">
          {s.hasCode} <a href={paths.class} onClick={(e) => go(e, 'class')}>{cs.joinTitle}</a>
          <span aria-hidden="true"> · </span>
          {s.isTeacher} <a href={paths.class} onClick={(e) => go(e, 'class')} title={cs.subtitle}>{cs.create}</a>
        </p>
      </div>
      <div className="bfs-start-more">
        <div className="bfs-start-more-head">
          <h2>{s.tryThese}</h2>
          <button type="button" className="bfs-start-hide" aria-expanded="true" onClick={() => fold(true)}>
            {s.hide}
            <Chevron open />
          </button>
        </div>
        <ul className="bfs-start-list" role="list">
          {picks.map((p) => (
            <li key={p.tab}>
              <a href={paths[p.tab]} onClick={(e) => go(e, p.tab)}>
                <Icon name={ICONS[p.tab]} size={18} strokeWidth={1.5} className="bfs-start-icon" />
                <span className="bfs-start-body">
                  <b>{p.title}</b>
                  <span className="bfs-start-text">{p.text}</span>
                </span>
                <span className="bfs-start-go" aria-hidden="true">›</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
