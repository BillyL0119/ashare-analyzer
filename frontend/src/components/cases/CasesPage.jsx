import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import casesStrings from './casesStrings'
import diagramNav, { diagramHref } from '../diagrams/diagramNav'

// Economics case library: real news turned into essay examples (concept, figures to quote,
// evaluation, practice question), filterable by exam board, concept and keyword.
// Each case also has its own page at /cases/<id>; the backend writes its static HTML for search
// engines (backend/services/case_pages.py) and the app opens the case there.

const ACCENT = '#0ea5e9'
const BOARDS = ['ib', 'alevel', 'ap_macro', 'ap_micro', 'igcse']
const SAVE_KEY = 'bfs_saved_cases'
const PAGE = 20

const CSS = `
.cs { display: grid; gap: 16px; max-width: 1180px; margin: 0 auto; width: 100%; padding: 18px 0 40px; }
.cs-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 14px; padding: 16px 18px; min-width: 0; }
.cs-muted { color: var(--text-secondary); }
.cs-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 16px; align-items: start; }
.cs-side { display: grid; gap: 4px; position: sticky; top: 110px; max-height: calc(100vh - 130px); overflow-y: auto; }
.cs-pill { border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-secondary); border-radius: 999px; padding: 6px 12px; font-size: 12.5px; font-weight: 650; cursor: pointer; white-space: nowrap; }
.cs-pill.on { background: ${ACCENT}; border-color: ${ACCENT}; color: #fff; }
.cs-concept { display: flex; justify-content: space-between; gap: 8px; text-align: left; width: 100%; border: none; background: none; color: var(--text-primary); padding: 7px 10px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.cs-concept:hover { background: var(--bg-tertiary); }
.cs-concept.on { background: ${ACCENT}1f; color: ${ACCENT}; font-weight: 700; }
.cs-concept:disabled { opacity: .45; cursor: default; }
.cs-tag { border: none; cursor: pointer; font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: ${ACCENT}1f; color: ${ACCENT}; }
.cs-h { font-size: 11.5px; font-weight: 800; letter-spacing: .4px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 3px; }
.cs-body { font-size: 14px; line-height: 1.7; }
.cs-q { border-left: 3px solid #f59e0b; background: #f59e0b12; border-radius: 8px; padding: 10px 12px; font-size: 14px; line-height: 1.6; }
.cs-act { border: 1px solid var(--border-primary); background: transparent; color: var(--text-primary); border-radius: 8px; padding: 6px 11px; font-size: 12.5px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
.cs-act:hover { background: var(--bg-tertiary); }
.cs-input { width: 100%; min-width: 0; background: var(--bg-secondary); border: 1px solid var(--border-primary); color: var(--text-primary); border-radius: 10px; padding: 9px 12px; font-size: 14px; }
.cs-link { color: var(--text-primary); text-decoration: none; }
.cs-link:hover { color: ${ACCENT}; }
.cs-pill:focus-visible, .cs-concept:focus-visible, .cs-tag:focus-visible, .cs-act:focus-visible, .cs-link:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
@media (max-width: 860px) {
  .cs-layout { grid-template-columns: minmax(0, 1fr); }
  .cs-side { position: static; max-height: none; display: flex; overflow-x: auto; gap: 6px; scrollbar-width: none; }
  .cs-side .cs-concept { width: auto; flex: none; white-space: nowrap; border: 1px solid var(--border-primary); }
  .cs-side .cs-side-title { display: none; }
}
`

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]') } catch { return [] }
}

// Saved cases live on this device only
function useSaved() {
  const [saved, setSaved] = useState(loadSaved)
  const savedIds = new Set(saved.map((c) => c.id))
  const toggleSave = (c) => {
    const card = { ...c }
    delete card.concept_details; delete card.other; delete card.related   // extras of a case's own page
    const next = savedIds.has(c.id) ? saved.filter((x) => x.id !== c.id) : [card, ...saved].slice(0, 200)
    setSaved(next)
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)) } catch { /* storage full or blocked */ }
  }
  return { saved, savedIds, toggleSave }
}

// What happened, the economics, figures, evaluation and the practice question
function CaseText({ c, s }) {
  return (
    <>
      <div><div className="cs-h">{s.what}</div><div className="cs-body">{c.what}</div></div>
      <div><div className="cs-h">{s.angle}</div><div className="cs-body">{c.angle}</div></div>
      {c.data?.length > 0 && (
        <div><div className="cs-h">{s.data}</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 2 }} className="cs-body">{c.data.map((d) => <li key={d} style={{ fontVariantNumeric: 'tabular-nums' }}>{d}</li>)}</ul>
        </div>
      )}
      {c.evaluate && <div><div className="cs-h">{s.evaluate}</div><div className="cs-body">{c.evaluate}</div></div>}
      <div className="cs-q"><div className="cs-h" style={{ color: '#b45309' }}>✍️ {s.question}</div>{c.question}</div>
    </>
  )
}

function CaseCard({ c, s, board, studyHref, saved, onToggleSave, onConcept, conceptTopics, drawLabel, own }) {
  const [copied, setCopied] = useState(false)
  const cite = `${c.source}, "${c.title}", ${c.date}. ${c.url}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(cite); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }
  // Link to the study topic for the chosen board, or the first board that teaches the first concept
  let study = null
  for (const k of c.concepts) {
    const topics = conceptTopics[k.id] || {}
    const b = board && topics[board]?.length ? board : BOARDS.find((x) => topics[x]?.length)
    if (b) { study = studyHref(b, topics[b][0]); break }
  }
  return (
    <article className="cs-card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="cs-muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{c.date} · {c.source}{c.source_lang ? ` · ${s.sourceLang[c.source_lang] || ''}` : ''}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {c.concepts.map((k) => <button key={k.id} className="cs-tag" onClick={() => onConcept(k.id)}>{k.name}</button>)}
        </span>
      </div>
      {own ? (
        // The case's own page: its headline is the page's heading
        <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.35 }}>{c.title}</h1>
      ) : (
        <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.45 }}>
          <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{c.title} <span style={{ color: ACCENT, fontSize: 13 }}>↗</span></a>
        </h2>
      )}
      <CaseText c={c} s={s} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a className="cs-act" href={c.url} target="_blank" rel="noopener noreferrer">{s.readSource} ↗</a>
        <button className="cs-act" onClick={copy}>{copied ? `✓ ${s.copied}` : `⧉ ${s.copy}`}</button>
        <button className="cs-act" onClick={() => onToggleSave(c)} aria-pressed={saved}>{saved ? `★ ${s.unsave}` : `☆ ${s.save}`}</button>
        {study && <Link className="cs-act" to={study}>📘 {s.study}</Link>}
        {diagramHref(c) && <Link className="cs-act" to={diagramHref(c)}>📐 {drawLabel}</Link>}
        {!own && <Link className="cs-act" to={`/cases/${c.id}`}>🔗 {s.open}</Link>}
      </div>
    </article>
  )
}

function HowTo({ s }) {
  return (
    <div className="cs-card" style={{ display: 'grid', gap: 4, padding: '12px 16px' }}>
      <b style={{ fontSize: 13 }}>{s.how}</b>
      <span className="cs-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{s.howText}</span>
      <span className="cs-muted" style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 4 }}>{s.note}</span>
    </div>
  )
}

const defaultStudyHref = (board, topic) => `/study/${board}?topic=${topic}`

export default function CasesPage({ caseId, ...props }) {
  return caseId ? <OneCase key={caseId} caseId={caseId} {...props} /> : <Library {...props} />
}

// One case at /cases/<id>, with the same case in the other language and more cases on its concept
function OneCase({ lang, caseId, studyHref = defaultStudyHref }) {
  const s = casesStrings(lang)
  const navigate = useNavigate()
  const { savedIds, toggleSave } = useSaved()
  const [kase, setKase] = useState(null)   // the case, or { missing } when it cannot be shown

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    let alive = true
    fetch(`/api/cases/item/${encodeURIComponent(caseId)}?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : { missing: r.status === 404 ? 'gone' : 'failed' }))
      .then((d) => { if (alive) setKase(d) })
      .catch(() => { if (alive) setKase({ missing: 'failed' }) })
    return () => { alive = false }
  }, [caseId, lang])

  // Same wording as the page's static <title> (case_pages.title), in the reader's language
  useEffect(() => {
    if (!kase?.title) return
    const name = kase.concepts?.[0]?.name
    document.title = !name ? `${kase.title} | BestFriendStock`
      : lang === 'zh' ? `${kase.title} - ${name}案例 | BestFriendStock` : `${kase.title} – ${name} example | BestFriendStock`
  }, [kase, lang])

  // A case that has left the library should drop out of search results, not stay as an empty page
  useEffect(() => {
    if (kase?.missing !== 'gone') return undefined
    const robots = document.querySelector('meta[name="robots"]')
    const before = robots?.getAttribute('content')
    robots?.setAttribute('content', 'noindex')
    return () => { if (before) robots.setAttribute('content', before) }
  }, [kase])

  const conceptTopics = Object.fromEntries((kase?.concept_details || []).map((c) => [c.id, c.topics]))
  const other = kase?.other ? casesStrings(kase.other.lang) : null
  return (
    <div className="cs">
      <style>{CSS}</style>
      <Link className="cs-act" to="/cases" style={{ justifySelf: 'start' }}>← {s.title}</Link>
      {!kase && <div className="cs-card skeleton" style={{ height: 320 }} />}
      {kase?.missing && <div className="cs-card cs-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{kase.missing === 'gone' ? s.notFound : s.failed}</div>}
      {kase?.title && (
        <>
          <CaseCard c={kase} s={s} own studyHref={studyHref} saved={savedIds.has(kase.id)} onToggleSave={toggleSave}
            onConcept={(id) => navigate(`/cases?concept=${id}`)} conceptTopics={conceptTopics} drawLabel={diagramNav(lang).drawLink} />
          {other && (
            <details className="cs-card" lang={kase.other.lang === 'zh' ? 'zh-CN' : 'en'}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{s.otherLang}</summary>
              <div style={{ display: 'grid', gap: 12, marginTop: 12 }}><CaseText c={kase.other} s={other} /></div>
            </details>
          )}
          {kase.related?.length > 0 && (
            <nav className="cs-card" style={{ display: 'grid', gap: 8 }}>
              <div className="cs-h">{s.related(kase.concepts[0]?.name || '')}</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }} className="cs-body">
                {kase.related.map((r) => (
                  <li key={r.id}><Link className="cs-link" to={`/cases/${r.id}`}>{r.title}</Link> <span className="cs-muted" style={{ fontSize: 12 }}>{r.date}</span></li>
                ))}
              </ul>
            </nav>
          )}
        </>
      )}
      <HowTo s={s} />
    </div>
  )
}

function Library({ lang, studyHref = defaultStudyHref }) {
  const s = casesStrings(lang)
  const [board, setBoard] = useState('')
  // ?concept= comes from a case's page (its concept tags and "more cases" links)
  const [concept, setConcept] = useState(() => new URLSearchParams(window.location.search).get('concept') || '')
  // ?q= comes from links elsewhere on the site
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [query, setQuery] = useState(q)
  const [showSaved, setShowSaved] = useState(false)
  const { saved, savedIds, toggleSave } = useSaved()
  const [concepts, setConcepts] = useState([])
  const [data, setData] = useState(null)
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    let alive = true
    fetch(`/api/cases/concepts?lang=${lang}`).then((r) => r.json()).then((d) => { if (alive) setConcepts(d.concepts || []) }).catch(() => {})
    return () => { alive = false }
  }, [lang])

  // Search waits for a pause in typing
  useEffect(() => { const id = setTimeout(() => setQuery(q.trim()), 300); return () => clearTimeout(id) }, [q])

  useEffect(() => {
    let alive = true
    const params = new URLSearchParams({ lang, limit: String(limit) })
    if (board) params.set('board', board)
    if (concept) params.set('concept', concept)
    if (query) params.set('q', query)
    fetch(`/api/cases?${params}`).then((r) => r.json()).then((d) => { if (alive) setData(d) }).catch(() => { if (alive) setData({ cases: [], total: 0, counts: {} }) })
    return () => { alive = false }
  }, [lang, board, concept, query, limit])

  const conceptTopics = useMemo(() => Object.fromEntries(concepts.map((c) => [c.id, c.topics])), [concepts])
  // Concepts that have cases (and the one selected); the rest would only be empty filters
  const visibleConcepts = concepts.filter((c) => (!board || c.topics?.[board]?.length) && ((data?.counts?.[c.id] ?? 0) > 0 || c.id === concept))
  const pickConcept = (id) => { setConcept(id === concept ? '' : id); setShowSaved(false); setLimit(PAGE); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const active = concepts.find((c) => c.id === concept)
  const list = showSaved ? saved : data?.cases || []
  const total = showSaved ? saved.length : data?.total ?? 0
  const libraryEmpty = data && !showSaved && !board && !concept && !query && data.total === 0

  return (
    <div className="cs">
      <style>{CSS}</style>
      <div style={{ display: 'grid', gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>📰 {s.title}</h1>
        <p className="cs-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6, maxWidth: 760 }}>{s.subtitle}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className={`cs-pill${!board ? ' on' : ''}`} onClick={() => { setBoard(''); setLimit(PAGE) }}>{s.allBoards}</button>
        {BOARDS.map((b) => <button key={b} className={`cs-pill${board === b ? ' on' : ''}`} onClick={() => { setBoard(b); setLimit(PAGE); if (concept && !concepts.find((c) => c.id === concept)?.topics?.[b]?.length) setConcept('') }}>{s.boards[b]}</button>)}
        <button className={`cs-pill${showSaved ? ' on' : ''}`} onClick={() => setShowSaved(!showSaved)} style={{ marginLeft: 'auto' }}>★ {s.saved} ({saved.length})</button>
      </div>

      <div className="cs-layout">
        <nav className="cs-card cs-side" aria-label={s.concepts} style={{ padding: 8 }}>
          <div className="cs-h cs-side-title" style={{ padding: '6px 10px' }}>{s.concepts}</div>
          <button className={`cs-concept${!concept ? ' on' : ''}`} onClick={() => pickConcept('')}><span>{s.allConcepts}</span></button>
          {visibleConcepts.map((c) => {
            const n = data?.counts?.[c.id] ?? 0
            return (
              <button key={c.id} className={`cs-concept${concept === c.id ? ' on' : ''}`} onClick={() => pickConcept(c.id)}>
                <span>{c.name}</span><span className="cs-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          {!showSaved && <input className="cs-input" type="search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} placeholder={s.search} aria-label={s.search} />}
          {active && !showSaved && (
            <div className="cs-card" style={{ borderColor: `${ACCENT}66`, display: 'grid', gap: 4 }}>
              <b style={{ fontSize: 15 }}>{active.name}</b>
              <span className="cs-muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{active.definition}</span>
            </div>
          )}
          {data && <div className="cs-muted" style={{ fontSize: 12.5 }}>{s.count(total)}</div>}
          {!data && [0, 1, 2].map((i) => <div key={i} className="cs-card skeleton" style={{ height: 260 }} />)}
          {libraryEmpty && <div className="cs-card cs-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{s.building}</div>}
          {data && !libraryEmpty && list.length === 0 && <div className="cs-card cs-muted" style={{ fontSize: 14 }}>{showSaved ? s.savedEmpty : s.none}</div>}
          {list.map((c) => (
            <CaseCard key={c.id} c={c} s={s} board={board} studyHref={studyHref} saved={savedIds.has(c.id)}
              onToggleSave={toggleSave} onConcept={pickConcept} conceptTopics={conceptTopics} drawLabel={diagramNav(lang).drawLink} />
          ))}
          {!showSaved && data && data.cases.length < data.total && (
            <button className="cs-pill" style={{ justifySelf: 'center' }} onClick={() => setLimit(limit + PAGE)}>{s.more}</button>
          )}
          <HowTo s={s} />
        </div>
      </div>
    </div>
  )
}
