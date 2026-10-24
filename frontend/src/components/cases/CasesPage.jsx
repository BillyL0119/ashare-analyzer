import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import casesStrings from './casesStrings'

// Economics case library: real news turned into essay examples (concept, figures to quote,
// evaluation, practice question), filterable by exam board, concept and keyword.

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
.cs-pill:focus-visible, .cs-concept:focus-visible, .cs-tag:focus-visible, .cs-act:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
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

function CaseCard({ c, s, board, studyHref, saved, onToggleSave, onConcept, conceptTopics }) {
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
      <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.45 }}>
        <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{c.title} <span style={{ color: ACCENT, fontSize: 13 }}>↗</span></a>
      </h2>
      <div><div className="cs-h">{s.what}</div><div className="cs-body">{c.what}</div></div>
      <div><div className="cs-h">{s.angle}</div><div className="cs-body">{c.angle}</div></div>
      {c.data?.length > 0 && (
        <div><div className="cs-h">{s.data}</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 2 }} className="cs-body">{c.data.map((d) => <li key={d} style={{ fontVariantNumeric: 'tabular-nums' }}>{d}</li>)}</ul>
        </div>
      )}
      {c.evaluate && <div><div className="cs-h">{s.evaluate}</div><div className="cs-body">{c.evaluate}</div></div>}
      <div className="cs-q"><div className="cs-h" style={{ color: '#b45309' }}>✍️ {s.question}</div>{c.question}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a className="cs-act" href={c.url} target="_blank" rel="noopener noreferrer">{s.readSource} ↗</a>
        <button className="cs-act" onClick={copy}>{copied ? `✓ ${s.copied}` : `⧉ ${s.copy}`}</button>
        <button className="cs-act" onClick={() => onToggleSave(c)} aria-pressed={saved}>{saved ? `★ ${s.unsave}` : `☆ ${s.save}`}</button>
        {study && <Link className="cs-act" to={study}>📘 {s.study}</Link>}
      </div>
    </article>
  )
}

const defaultStudyHref = (board, topic) => `/study/${board}?topic=${topic}`

export default function CasesPage({ lang, studyHref = defaultStudyHref }) {
  const s = casesStrings(lang)
  const [board, setBoard] = useState('')
  const [concept, setConcept] = useState('')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const [saved, setSaved] = useState(loadSaved)
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
  const savedIds = new Set(saved.map((c) => c.id))
  const toggleSave = (c) => {
    const next = savedIds.has(c.id) ? saved.filter((x) => x.id !== c.id) : [c, ...saved].slice(0, 200)
    setSaved(next)
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)) } catch { /* storage full or blocked */ }
  }
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
              onToggleSave={toggleSave} onConcept={pickConcept} conceptTopics={conceptTopics} />
          ))}
          {!showSaved && data && data.cases.length < data.total && (
            <button className="cs-pill" style={{ justifySelf: 'center' }} onClick={() => setLimit(limit + PAGE)}>{s.more}</button>
          )}
          <div className="cs-card" style={{ display: 'grid', gap: 4, padding: '12px 16px' }}>
            <b style={{ fontSize: 13 }}>{s.how}</b>
            <span className="cs-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{s.howText}</span>
            <span className="cs-muted" style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 4 }}>{s.note}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
