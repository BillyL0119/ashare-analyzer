import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DiagramSVG from './DiagramSVG'
import { DIAGRAM_CSS, FILL } from './diagramTheme'
import { adasAdjust, applyDrag, CURRENCIES, DIAGRAM_IDS, DIAGRAMS, GROUPS, nudge, TOPICS } from './diagramModels'
import diagramStrings from './diagramStrings'
import casesStrings from '../cases/casesStrings'

// Interactive economics diagrams: drag curves or pick a shock, read what happened, see the exam
// topics and the news cases (services/econ_diagrams.py tags each case with a preset) that use it.
// URL: /diagrams?d=<diagram>&p=<preset>&case=<case id>&cur=<currency>

const ACCENT = '#0ea5e9'
const BOARD_KEY = 'bfs_dl_board'
const BOARD_ORDER = ['ib', 'alevel', 'ap_micro', 'ap_macro', 'igcse']

const CSS = `
.dl { display: grid; gap: 16px; max-width: 1180px; margin: 0 auto; width: 100%; padding: 18px 0 40px; min-width: 0; }
.dl-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 14px; padding: 16px 18px; min-width: 0; }
.dl-muted { color: var(--text-secondary); }
.dl-h { font-size: 11.5px; font-weight: 800; letter-spacing: .4px; text-transform: uppercase; color: var(--text-secondary); margin: 0 0 6px; }
.dl-picker { display: grid; gap: 8px; }
.dl-group { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.dl-group-name { font-size: 11.5px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .4px; min-width: 96px; }
.dl-pill { border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); border-radius: 999px; padding: 6px 12px; font-size: 13px; font-weight: 650; cursor: pointer; white-space: nowrap; }
.dl-pill.on { background: ${ACCENT}; border-color: ${ACCENT}; color: #fff; }
.dl-seg { display: inline-flex; border: 1px solid var(--border-primary); border-radius: 10px; overflow: hidden; flex-wrap: wrap; }
.dl-seg button { border: none; background: transparent; color: var(--text-secondary); padding: 6px 10px; font-size: 12.5px; font-weight: 650; cursor: pointer; }
.dl-seg button.on { background: ${ACCENT}1f; color: ${ACCENT}; }
.dl-layout { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.dl-side { display: grid; gap: 14px; min-width: 0; }
.dl-shock { display: block; width: 100%; text-align: left; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); border-radius: 10px; padding: 8px 11px; font-size: 13.5px; cursor: pointer; line-height: 1.35; }
.dl-shock:hover { border-color: ${ACCENT}; }
.dl-shock.on { border-color: ${ACCENT}; background: ${ACCENT}1a; }
.dl-shocks { display: grid; gap: 6px; }
.dl-body { font-size: 14px; line-height: 1.7; margin: 0; }
.dl-act { border: 1px solid var(--border-primary); background: transparent; color: var(--text-primary); border-radius: 8px; padding: 6px 11px; font-size: 12.5px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
.dl-act:hover { background: var(--bg-tertiary); }
.dl-act.primary { border-color: ${ACCENT}; color: ${ACCENT}; font-weight: 700; }
.dl-controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.dl-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12.5px; color: var(--text-secondary); }
.dl-sw { display: inline-block; width: 14px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; border: 1px solid var(--border-primary); }
.dl-case { border-left: 3px solid #f59e0b; background: #f59e0b12; border-radius: 10px; padding: 10px 12px; display: grid; gap: 6px; }
.dl-topic { display: inline-flex; gap: 6px; align-items: baseline; font-size: 13px; text-decoration: none; color: var(--text-primary); border: 1px solid var(--border-primary); border-radius: 999px; padding: 4px 11px; }
.dl-topic b { color: ${ACCENT}; font-size: 11.5px; }
.dl-news { display: grid; gap: 2px; }
.dl-news button { text-align: left; border: none; background: none; color: var(--text-primary); padding: 8px 6px; border-radius: 8px; cursor: pointer; display: grid; gap: 2px; font-size: 13.5px; line-height: 1.4; }
.dl-news button:hover { background: var(--bg-tertiary); }
.dl-select { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 5px 8px; font-size: 12.5px; }
.dl-pill:focus-visible, .dl-shock:focus-visible, .dl-act:focus-visible, .dl-seg button:focus-visible, .dl-news button:focus-visible, .dl-topic:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
@media (max-width: 900px) {
  .dl-layout { grid-template-columns: minmax(0, 1fr); }
  .dl-group { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
  .dl-group::-webkit-scrollbar { display: none; }
  .dl-group-name { min-width: 0; flex: none; }
  .dl-card { padding: 14px 12px; }
}
`

// Curriculum titles for the "where it is examined" links (cached for the session)
let curriculumPromise = null
function loadCurriculum() {
  curriculumPromise = curriculumPromise || fetch('/api/study/curriculum').then((r) => r.json()).catch(() => { curriculumPromise = null; return null })
  return curriculumPromise
}
const topicTitle = (t, lang) => (lang === 'zh' ? t.title : t[`title_${lang}`] || t.title_en || t.title)

function loadBoard() { try { return localStorage.getItem(BOARD_KEY) || 'ib' } catch { return 'ib' } }

function startState(id, preset, cur) {
  const d = DIAGRAMS[id]
  const s = { ...d.base, ...(d.presets[preset] || {}), _d: id }   // _d: the diagram this state belongs to
  if (id === 'forex' && CURRENCIES[cur]) s.cur = cur
  return s
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const defaultStudyHref = (board, topic) => `/study/${board}?topic=${topic}`

export default function DiagramLab({ lang, studyHref = defaultStudyHref }) {
  const S = diagramStrings(lang)
  const cs = casesStrings(lang)
  const [params, setParams] = useSearchParams()
  const id = DIAGRAM_IDS.includes(params.get('d')) ? params.get('d') : 'sd'
  const preset = params.get('p') || ''
  const caseId = params.get('case') || ''
  const curParam = params.get('cur') || ''
  const [board, setBoardState] = useState(loadBoard)
  const [st, setSt] = useState(() => startState(id, preset, curParam))
  const [shock, setShock] = useState(null)
  const [kaseRaw, setKase] = useState(null)
  const [newsRaw, setNews] = useState({ key: '', items: null })
  const [urlKey, setUrlKey] = useState(`${id}|${preset}|${curParam}`)
  const [curriculum, setCurriculum] = useState(null)
  const stRef = useRef(st)
  const dragStart = useRef(null)
  const anim = useRef(0)
  const topRef = useRef(null)
  useEffect(() => { stRef.current = st }, [st])
  const def = DIAGRAMS[id]
  const text = S.d[id]
  const boardLabels = board === 'ap' ? 'ap' : board === 'alevel' ? 'alevel' : 'ib'

  // A new diagram or preset in the URL starts from that preset (and stops any running animation).
  // A state left over from another diagram (an animation frame that landed after the switch) is reset too.
  if (urlKey !== `${id}|${preset}|${curParam}` || st._d !== id) {
    setUrlKey(`${id}|${preset}|${curParam}`)
    setSt(startState(id, preset, curParam))
    setShock(null)
  }
  useLayoutEffect(() => () => cancelAnimationFrame(anim.current), [id, preset, curParam])

  const kase = caseId && kaseRaw?.id === caseId ? kaseRaw : null
  const newsKey = `${id}|${lang}`
  const news = newsRaw.key === newsKey ? newsRaw.items : null

  useEffect(() => {
    if (!caseId) return undefined
    let alive = true
    fetch(`/api/cases/item/${encodeURIComponent(caseId)}?lang=${lang}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive) setKase(d) }).catch(() => { if (alive) setKase(null) })
    return () => { alive = false }
  }, [caseId, lang])

  useEffect(() => {
    let alive = true
    const key = `${id}|${lang}`
    fetch(`/api/cases?diagram=${id}&lang=${lang}&limit=6`).then((r) => r.json())
      .then((d) => { if (alive) setNews({ key, items: d.cases || [] }) }).catch(() => { if (alive) setNews({ key, items: [] }) })
    return () => { alive = false }
  }, [id, lang])

  useEffect(() => { loadCurriculum().then((d) => setCurriculum(d)) }, [])
  useEffect(() => () => cancelAnimationFrame(anim.current), [])

  const setBoard = (b) => { setBoardState(b); try { localStorage.setItem(BOARD_KEY, b) } catch { /* storage blocked */ } }

  const animateTo = (target) => {
    cancelAnimationFrame(anim.current)
    const from = stRef.current
    if (reducedMotion()) { setSt(target); return }
    let t0 = null
    const step = (now) => {
      if (t0 === null) t0 = now
      const k = Math.min(1, (now - t0) / 420)
      const e = 1 - (1 - k) ** 3
      const mid = { ...target }
      for (const key of Object.keys(target)) {
        if (typeof target[key] === 'number' && typeof from[key] === 'number') mid[key] = from[key] + (target[key] - from[key]) * e
      }
      setSt(mid)
      if (k < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }

  const keep = (s) => ({ cur: s.cur, surplus: s.surplus, el: s.el })
  const pickShock = ([key, change]) => {
    setShock(key)
    const cur = stRef.current
    const keepers = Object.fromEntries(Object.entries(keep(cur)).filter(([k, v]) => v !== undefined && !(k in change)))
    animateTo({ ...def.base, ...keepers, ...change, _d: id })
  }
  const reset = () => { setShock(null); animateTo({ ...def.base, ...keep(stRef.current), ...(def.base.el ? { el: def.base.el } : {}), _d: id }) }

  const onDrag = (spec, m, m0, phase) => {
    if (phase === 'start') { cancelAnimationFrame(anim.current); dragStart.current = stRef.current; setShock(null); return }
    if (phase !== 'move' || !dragStart.current) return
    const change = applyDrag(spec, dragStart.current, m, m0)
    setSt((s) => ({ ...s, ...change, ...(spec.key !== 'adj' ? { adjusted: false } : {}) }))
  }
  const onNudge = (spec, step) => {
    setShock(null)
    setSt((s) => ({ ...s, ...nudge(spec, s, step), ...(spec.key !== 'adj' ? { adjusted: false } : {}) }))
  }

  const built = useMemo(() => (st._d === id ? def.build(st, { S, board: boardLabels }) : null), [id, def, st, S, boardLabels])

  const choose = (next) => {
    const q = new URLSearchParams({ d: next })
    setParams(q)
  }
  const openCase = (c) => {
    const q = new URLSearchParams({ d: id })
    if (c.diagram?.preset) q.set('p', c.diagram.preset)
    if (c.diagram?.currency) q.set('cur', c.diagram.currency)
    q.set('case', c.id)
    setParams(q)
    topRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }
  const closeCase = () => {
    const q = new URLSearchParams(params)
    q.delete('case')
    setParams(q)
  }

  // Exam topics for this diagram, by board, with titles from the study centre
  const topics = useMemo(() => {
    const map = TOPICS[id] || {}
    const all = curriculum?.curricula || []
    const out = []
    for (const b of BOARD_ORDER) {
      for (const tid of map[b] || []) {
        const cur = all.find((c) => c.key === b)
        const list = cur ? (cur.papers ? cur.papers.flatMap((p) => p.topics) : cur.topics || []) : []
        const t = list.find((x) => x.id === tid)
        out.push({ board: b, id: tid, title: t ? topicTitle(t, lang) : null })
      }
    }
    return out
  }, [id, curriculum, lang])
  if (!built) return null                       // only in the render that resets a leftover state

  const caseMatches = kase && kase.diagram?.id === id
  const sideShocks = (
    <div className="dl-card">
      <div className="dl-h">⚡ {S.shocks}</div>
      <div className="dl-shocks">
        {def.shocks.map((sh) => (
          <button key={sh[0]} className={`dl-shock${shock === sh[0] ? ' on' : ''}`} onClick={() => pickShock(sh)} aria-pressed={shock === sh[0]}>{text.shocks[sh[0]]}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="dl dl-vars">
      <style>{CSS}{DIAGRAM_CSS}</style>
      <div style={{ display: 'grid', gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>📐 {S.title}</h1>
        <p className="dl-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6, maxWidth: 780 }}>{S.subtitle}</p>
      </div>

      <nav className="dl-picker" aria-label={S.title}>
        {GROUPS.map(([g, ids]) => (
          <div key={g} className="dl-group">
            <span className="dl-group-name">{S.groups[g]}</span>
            {ids.map((k) => <button key={k} className={`dl-pill${k === id ? ' on' : ''}`} onClick={() => choose(k)} aria-pressed={k === id}>{S.d[k].name}</button>)}
          </div>
        ))}
      </nav>

      <div className="dl-layout" ref={topRef} style={{ scrollMarginTop: 120 }}>
        <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          <section className="dl-card" style={{ display: 'grid', gap: 12 }} aria-label={text.name}>
            {kase && (
              <div className="dl-case">
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div className="dl-h" style={{ color: '#b45309', margin: 0 }}>📰 {S.fromCase}</div>
                  <button className="dl-act" onClick={closeCase} style={{ padding: '2px 8px' }} aria-label={S.closeCase}>✕</button>
                </div>
                <b style={{ fontSize: 15, lineHeight: 1.45 }}>{kase.title}</b>
                <span className="dl-muted" style={{ fontSize: 12 }}>{kase.date} · {kase.source}</span>
                {kase.angle && <p className="dl-body" style={{ fontSize: 13.5 }}>{kase.angle}</p>}
                {kase.data?.length > 0 && (
                  <div>
                    <div className="dl-h" style={{ margin: '2px 0 2px' }}>{S.figures}</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6, fontVariantNumeric: 'tabular-nums' }}>{kase.data.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                )}
                <span className="dl-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{caseMatches && !kase.diagram?.preset ? S.pickShift : S.figuresNote}</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link className="dl-act" to={`/cases?q=${encodeURIComponent(kase.title.slice(0, 40))}`}>{S.readCase}</Link>
                  <a className="dl-act" href={kase.url} target="_blank" rel="noopener noreferrer">{S.readSource} ↗</a>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 19 }}>{text.name}</h2>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="dl-muted" style={{ fontSize: 12 }}>{S.boardLabel}</span>
                <span className="dl-seg" role="group" aria-label={S.boardLabel}>
                  {['ib', 'alevel', 'ap'].map((b) => <button key={b} className={board === b ? 'on' : ''} onClick={() => setBoard(b)} aria-pressed={board === b}>{S.boards[b]}</button>)}
                </span>
                <button className="dl-act" onClick={reset}>↺ {S.reset}</button>
              </span>
            </div>
            <p className="dl-muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{text.blurb}</p>

            <div style={{ maxWidth: 640, width: '100%', justifySelf: 'center' }}>
              <DiagramSVG scene={built} state={st} title={text.name} onDrag={onDrag} onNudge={onNudge} />
            </div>

            <Controls id={id} def={def} st={st} setSt={setSt} S={S} text={text} built={built} setShock={setShock} animateTo={animateTo} />

            {built.legend?.length > 0 && (
              <div className="dl-legend">
                {built.legend.map(([k, label]) => <span key={label}><span className="dl-sw" style={{ background: FILL[k] }} />{label}</span>)}
              </div>
            )}
            <span className="dl-muted" style={{ fontSize: 12 }}>✋ {S.dragHint}</span>
          </section>

          <section className="dl-card" aria-live="polite">
            <div className="dl-h">{S.whatHappened}</div>
            <div style={{ display: 'grid', gap: 8 }}>{built.text.map((p) => <p key={p} className="dl-body">{p}</p>)}</div>
          </section>
        </div>

        <aside className="dl-side">
          {sideShocks}
          <div className="dl-card" style={{ borderColor: '#f59e0b55' }}>
            <div className="dl-h" style={{ color: '#b45309' }}>✍️ {S.examTip}</div>
            <p className="dl-body" style={{ fontSize: 13.5 }}>{text.tip}</p>
          </div>
          <div className="dl-card">
            <div className="dl-h">📘 {S.topics}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {topics.map((t) => (
                <Link key={`${t.board}-${t.id}`} className="dl-topic" to={studyHref(t.board, t.id)}><b>{cs.boards[t.board]}</b>{t.title || t.id}</Link>
              ))}
            </div>
          </div>
          <div className="dl-card">
            <div className="dl-h">📰 {S.inNews}</div>
            {news === null && <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />}
            {news && news.length === 0 && <p className="dl-muted" style={{ margin: 0, fontSize: 13.5 }}>{S.noNews}</p>}
            {news && news.length > 0 && (
              <div className="dl-news">
                {news.map((c) => (
                  <button key={c.id} onClick={() => openCase(c)} aria-current={c.id === caseId ? 'true' : undefined} style={c.id === caseId ? { background: 'var(--bg-tertiary)' } : undefined}>
                    <span>{c.title}</span>
                    <span className="dl-muted" style={{ fontSize: 11.5 }}>{c.date} · {c.source}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

// The row of switches under the diagram: modes, toggles and buttons specific to each diagram
function Controls({ id, def, st, setSt, S, text, built, setShock, animateTo }) {
  const items = []
  if (def.modes) {
    items.push(
      <span key="modes" className="dl-seg" role="group">
        {def.modes.map((m) => (
          <button key={m} className={st.mode === m ? 'on' : ''} aria-pressed={st.mode === m}
            onClick={() => { setShock(null); animateTo({ ...st, mode: m, ...(def.modeDefaults?.[m] || {}) }) }}>{text.modes[m]}</button>
        ))}
      </span>,
    )
  }
  if (def.elastic) {
    items.push(
      <span key="el" className="dl-seg" role="group">
        {def.elastic.map((e) => <button key={e} className={st.el === e ? 'on' : ''} aria-pressed={st.el === e} onClick={() => setSt({ ...st, el: e })}>{text.el[e]}</button>)}
      </span>,
    )
  }
  if (id === 'ped') {
    items.push(
      <span key="move" className="dl-seg" role="group">
        {[[1, text.rise], [-1, text.cut], [0, text.noMove]].map(([m, label]) => (
          <button key={m} className={st.move === m ? 'on' : ''} aria-pressed={st.move === m} onClick={() => { setShock(null); setSt({ ...st, move: m }) }}>{label}</button>
        ))}
      </span>,
    )
  }
  if (id === 'forex') {
    items.push(
      <label key="cur" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12.5 }} className="dl-muted">
        {S.currency}
        <select className="dl-select" value={st.cur} onChange={(e) => setSt({ ...st, cur: e.target.value })}>
          {Object.keys(CURRENCIES).map((c) => <option key={c} value={c}>{S.cur[c].name}</option>)}
        </select>
      </label>,
    )
  }
  if (def.toggles?.includes('surplus')) {
    items.push(
      <label key="surplus" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!st.surplus} onChange={(e) => setSt({ ...st, surplus: e.target.checked })} />{S.surplusToggle}
      </label>,
    )
  }
  if (built.canAdjust) {
    items.push(
      <button key="adj" className="dl-act primary" onClick={() => animateTo(id === 'adas' ? { ...st, adjusted: true, adj: adasAdjust(st) } : { ...st, adjusted: true })}>
        ⏩ {text.adjustBtn}
      </button>,
    )
  }
  if (!items.length) return null
  return <div className="dl-controls">{items}</div>
}
