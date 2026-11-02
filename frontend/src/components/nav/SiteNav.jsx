import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import classStrings from '../classes/classStrings'
import Chevron from './Chevron'
import navStrings from './navStrings'
import { ICONS, SECTIONS, itemLabel, sectionOf } from './navItems'
import './nav.css'

const HOVER_OPEN = 120     // ms a mouse rests on a section before its menu opens
const HOVER_CLOSE = 250    // ms after the mouse leaves before a hover-opened menu closes
const hasMenu = (key) => SECTIONS.find((x) => x.key === key).items.length > 1
const menuLinks = (box) => [...(box?.querySelectorAll('a') || [])]
const focusLink = (box, which) => { const l = menuLinks(box); (which === 'last' ? l[l.length - 1] : l[0])?.focus() }

// Second header row of the desktop site: five sections instead of one tab per page.
// A section with several pages opens a menu by click, tap or keyboard (a mouse can also just rest on it);
// Classes is a plain link. The pages are real links, so they can be opened in a new tab.
export default function SiteNav({ appTab, lang, paths, onTabChange, isMobile, scrolled, dataSource }) {
  const s = navStrings(lang)
  const { pathname } = useLocation()
  // The open menu belongs to the page it was opened on, so moving to another page closes it
  const [menu, setMenu] = useState({ key: null, path: null })
  const open = menu.path === pathname ? menu.key : null
  const setOpen = (key) => setMenu({ key, path: pathname })
  const navRef = useRef(null)
  const triggers = useRef({})
  const menus = useRef({})
  const hover = useRef({ timer: null, by: null, at: 0 })
  const current = sectionOf(appTab)

  const clearTimer = () => { clearTimeout(hover.current.timer); hover.current.timer = null }
  const close = () => { clearTimer(); setMenu({ key: null, path: null }) }
  useEffect(() => { const h = hover.current; return () => clearTimeout(h.timer) }, [])

  // Close on a press outside, Escape, or a window resize
  useEffect(() => {
    if (!open) return
    const shut = () => setMenu({ key: null, path: null })
    const onDown = (e) => { if (!navRef.current?.contains(e.target)) shut() }
    const onKey = (e) => { if (e.key === 'Escape') shut() }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', shut)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', shut)
    }
  }, [open])

  const pendingFocus = useRef(null)    // 'first' | 'last' link to focus once a keyboard-opened menu is shown

  // Desktop: the menu hangs under its section, kept inside the row. Phones: full width (CSS).
  useLayoutEffect(() => {
    const nav = navRef.current, btn = triggers.current[open], box = menus.current[open]
    if (!nav || !btn || !box) return
    if (!isMobile) {
      const n = nav.getBoundingClientRect(), b = btn.getBoundingClientRect()
      box.style.left = `${Math.max(8, Math.min(b.left - n.left, n.width - box.offsetWidth - 8))}px`
    }
    if (pendingFocus.current) { focusLink(box, pendingFocus.current); pendingFocus.current = null }
  }, [open, isMobile])

  const openMenu = (key, which) => {
    clearTimer()
    hover.current.by = 'click'
    if (open === key) { focusLink(menus.current[key], which); return }
    pendingFocus.current = which
    setOpen(key)
  }

  const onTriggerClick = (e, key) => {
    clearTimer()
    // A click just after the mouse opened the menu keeps it open instead of closing it again
    // (event times and performance.now() share one clock)
    if (open === key && hover.current.by === 'hover' && e.timeStamp - hover.current.at < 700) { hover.current.by = 'click'; return }
    hover.current.by = 'click'
    if (open === key) close()
    else setOpen(key)
  }

  const onTriggerKey = (e, key, i) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && hasMenu(key)) {
      e.preventDefault()
      openMenu(key, e.key === 'ArrowDown' ? 'first' : 'last')
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = SECTIONS[(i + (e.key === 'ArrowRight' ? 1 : SECTIONS.length - 1)) % SECTIONS.length].key
      triggers.current[next]?.focus()
      if (open) setOpen(hasMenu(next) ? next : null)
    }
  }

  const onMenuKey = (e, key) => {
    const l = menuLinks(menus.current[key])
    const i = l.indexOf(document.activeElement)
    const to = { ArrowDown: (i + 1) % l.length, ArrowUp: (i - 1 + l.length) % l.length, Home: 0, End: l.length - 1 }[e.key]
    if (to !== undefined) { e.preventDefault(); l[to]?.focus() }
    else if (e.key === 'Escape') { e.preventDefault(); close(); triggers.current[key]?.focus() }
  }

  // Mouse only: touch and pen open menus by tapping
  const onEnter = (e, key) => {
    if (e.pointerType !== 'mouse' || isMobile) return
    clearTimer()
    if (open === key) return
    if (open) { hover.current.at = e.timeStamp; setOpen(hasMenu(key) ? key : null); return }
    if (!hasMenu(key)) return
    hover.current.timer = setTimeout(() => {
      hover.current.timer = null
      hover.current.by = 'hover'
      hover.current.at = performance.now()
      setOpen(key)
    }, HOVER_OPEN)
  }
  const onLeave = (e) => {
    if (e.pointerType !== 'mouse' || isMobile) return
    clearTimer()
    if (open && hover.current.by === 'hover') hover.current.timer = setTimeout(close, HOVER_CLOSE)
  }

  const go = (e, tab, section) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return   // new tab or window
    e.preventDefault()
    close()
    onTabChange(tab)
    if (e.detail === 0 && section) triggers.current[section]?.focus()   // keyboard: keep focus when the menu closes
  }

  // Focus moving to anything outside the open section (Tab past its last page, say) closes the menu
  const onBlur = (e) => {
    const to = e.relatedTarget
    if (!open || !to || to === triggers.current[open] || menus.current[open]?.contains(to)) return
    close()
  }

  return (
    <nav
      ref={navRef}
      aria-label={s.label}
      className={`bfs-site-nav${isMobile ? ' is-mobile' : ''}`}
      style={{ background: scrolled ? 'var(--nav-bg)' : 'var(--nav-bg-dim)' }}
      onBlur={onBlur}
    >
      {/* Each menu follows its button, so Tab goes from the button into the open menu. The menus are
          positioned against the nav, outside this row, so a row that scrolls sideways doesn't cut them off. */}
      <div className="bfs-site-nav-row" onScroll={() => { if (open) close() }}>
        {SECTIONS.map(({ key, items }, i) => {
          const name = key === 'class' ? classStrings(lang).nav : s.sections[key]
          const common = {
            ref: (el) => { triggers.current[key] = el },
            className: `bfs-nav-tab bfs-site-nav-btn${current === key ? ' is-active' : ''}`,
            onKeyDown: (e) => onTriggerKey(e, key, i),
            onPointerEnter: (e) => onEnter(e, key),
            onPointerLeave: onLeave,
          }
          if (items.length === 1) {
            return (
              <a key={key} {...common} href={paths[items[0]]} aria-current={appTab === items[0] ? 'page' : undefined}
                onClick={(e) => go(e, items[0])}>
                {name}
              </a>
            )
          }
          return (
            <Fragment key={key}>
              <button {...common} type="button" id={`bfs-nav-btn-${key}`}
                aria-expanded={open === key} aria-controls={`bfs-nav-menu-${key}`} onClick={(e) => onTriggerClick(e, key)}>
                {name}
                <Chevron open={open === key} />
              </button>
              <div
                id={`bfs-nav-menu-${key}`}
                ref={(el) => { menus.current[key] = el }}
                className="bfs-site-nav-menu"
                hidden={open !== key}
                onKeyDown={(e) => onMenuKey(e, key)}
                onPointerEnter={(e) => onEnter(e, key)}
                onPointerLeave={onLeave}
              >
                <ul role="list" aria-labelledby={`bfs-nav-btn-${key}`}>
                  {items.map((tab) => (
                    <li key={tab}>
                      <a href={paths[tab]} aria-current={appTab === tab ? 'page' : undefined} onClick={(e) => go(e, tab, key)}>
                        <span className="bfs-site-nav-icon" aria-hidden="true">{ICONS[tab]}</span>
                        {itemLabel(tab, lang)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Fragment>
          )
        })}
      </div>
      {dataSource && !isMobile && <div className="bfs-site-nav-source">{dataSource}</div>}
    </nav>
  )
}
