import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { paperKey, paperHeaders } from '../../utils/paperAuth'
import classStrings from './classStrings'

// Classroom mode: students join a teacher's class with a code; teachers set assignments that complete
// on their own and follow the whole class's progress.

const ACCENT = '#0ea5e9'
const UP = '#10b981', DOWN = '#ef4444'

const CSS = `
.cl { display: grid; gap: 18px; max-width: 1180px; margin: 0 auto; width: 100%; padding: 18px 0 40px; }
.cl-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 14px; padding: 16px 18px; min-width: 0; display: grid; gap: 12px; }
.cl-muted { color: var(--text-secondary); }
.cl-h { margin: 0; font-size: 17px; }
.cl-btn { border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); border-radius: 9px; padding: 8px 14px; font-size: 13px; font-weight: 650; cursor: pointer; white-space: nowrap; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
.cl-btn.primary { background: linear-gradient(135deg, #0ea5e9, #6366f1); border-color: transparent; color: #fff; }
.cl-btn.danger { color: ${DOWN}; background: transparent; }
.cl-btn:disabled { opacity: .5; cursor: not-allowed; }
.cl-btn:focus-visible, .cl-input:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
.cl-input { width: 100%; min-width: 0; background: var(--bg-tertiary); border: 1px solid var(--border-primary); color: var(--text-primary); border-radius: 9px; padding: 9px 12px; font-size: 14px; }
.cl-label { font-size: 12.5px; font-weight: 650; color: var(--text-secondary); display: grid; gap: 6px; }
.cl-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.cl-scroll { overflow-x: auto; }
.cl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.cl-table th { text-align: left; font-weight: 600; color: var(--text-secondary); padding: 7px 9px; border-bottom: 1px solid var(--border-primary); white-space: nowrap; font-size: 12px; }
.cl-table td { padding: 8px 9px; border-bottom: 1px solid var(--border-primary); white-space: nowrap; font-variant-numeric: tabular-nums; }
.cl-code { font-family: ui-monospace, Menlo, monospace; font-size: 28px; font-weight: 800; letter-spacing: 5px; }
.cl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.cl-bar { height: 6px; border-radius: 3px; background: var(--bg-tertiary); overflow: hidden; }
`

async function api(path, { body, method } = {}) {
  const r = await fetch(`/api/classes/${path}`, { method: method || (body ? 'POST' : 'GET'), headers: paperHeaders(), body: body ? JSON.stringify(body) : undefined })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : 'error')
  return d
}

const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}%`)
const pcol = (v, cn) => (!v ? undefined : (v > 0) === !cn ? UP : DOWN)
const day = (iso) => (iso || '').slice(0, 10)
const assignmentHref = (a) => (a.type === 'time_machine' ? `/time-machine?s=${a.ref}` : a.type === 'governor' ? `/governor?s=${a.ref}` : '/paper')
// A Fed-chair score against the real Fed's, with the game's own thresholds for better / worse
const govColor = (g) => (g.miss <= g.fed_miss - 0.1 ? UP : g.miss >= g.fed_miss + 0.1 ? DOWN : undefined)
const typeLabel = (s, t) => ({ mission: s.typeMission, time_machine: s.typeTm, governor: s.typeGov })[t]

function GovCell({ s, g }) {
  if (!g) return '—'
  if (g.miss == null) return <span className="cl-muted">{s.govProgress(g.decision, g.of)}</span>
  return <span><b style={{ color: govColor(g) }}>{g.miss.toFixed(2)}</b> <span className="cl-muted" style={{ fontSize: 11.5 }}>{s.vsFed(g.fed_miss.toFixed(2))}</span></span>
}

// ── Student side ──────────────────────────────────────────────────────────────

function JoinCard({ s, initialCode, onJoined }) {
  const [code, setCode] = useState(initialCode || '')
  const [info, setInfo] = useState(null)
  const [nick, setNick] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const find = useCallback((c) => {
    const v = (c || '').trim().toUpperCase()
    if (v.length !== 6) return
    setErr(''); setInfo(null)
    api(`info/${v}`).then(setInfo).catch(() => setErr(s.noClass))
  }, [s.noClass])
  useEffect(() => { if (initialCode) find(initialCode) }, [initialCode, find])
  const join = async () => {
    setBusy(true); setErr('')
    try { await api('join', { body: { code: info.code, device_id: paperKey(), nickname: nick } }); onJoined() }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <section className="cl-card" style={{ borderColor: info ? `${ACCENT}88` : undefined }}>
      <h2 className="cl-h">{s.joinTitle}</h2>
      <div className="cl-row">
        <label className="cl-label" style={{ flex: '1 1 180px', maxWidth: 240 }}>{s.joinCode}
          <input className="cl-input" value={code} maxLength={6} placeholder={s.joinCodePh} onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') find(code) }} style={{ fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: 3 }} />
        </label>
        <button className="cl-btn" onClick={() => find(code)} disabled={code.trim().length !== 6}>{s.find}</button>
      </div>
      {info && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div><b style={{ fontSize: 16 }}>{info.name}</b> <span className="cl-muted" style={{ fontSize: 13 }}>{info.teacher_name ? `· ${s.teacherBy(info.teacher_name)} ` : ''}· {s.studentsN(info.students)}</span></div>
          <label className="cl-label">{s.joinAs}
            <input className="cl-input" value={nick} maxLength={16} placeholder={s.joinNickPh} onChange={(e) => setNick(e.target.value)} style={{ maxWidth: 320 }} />
          </label>
          <p className="cl-muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>{s.joinNote}</p>
          <div><button className="cl-btn primary" disabled={busy || nick.trim().length < 2} onClick={join}>{s.join}</button></div>
        </div>
      )}
      {err && <div style={{ color: DOWN, fontSize: 13 }}>{err}</div>}
    </section>
  )
}

function StudentClasses({ s, classes, onLeave }) {
  if (!classes) return null
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h2 className="cl-h">{s.myClasses}</h2>
      {classes.length === 0 && <div className="cl-card cl-muted" style={{ fontSize: 13.5 }}>{s.myClassesEmpty}</div>}
      {classes.map((c) => {
        const done = c.assignments.filter((a) => a.done).length
        return (
          <article key={c.id} className="cl-card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <b style={{ fontSize: 17 }}>{c.name}</b>
              <span className="cl-muted" style={{ fontSize: 12.5 }}>{c.teacher_name ? s.teacherBy(c.teacher_name) + ' · ' : ''}{s.yourNick(c.nickname)}</span>
              <button className="cl-btn danger" style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: 12 }} onClick={() => { if (window.confirm(s.leaveConfirm)) onLeave(c.id) }}>{s.leave}</button>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <b style={{ fontSize: 14 }}>{s.assignments}</b>
                {c.assignments.length > 0 && <span className="cl-muted" style={{ fontSize: 12.5 }}>{done}/{c.assignments.length}</span>}
              </div>
              {c.assignments.length === 0 && <div className="cl-muted" style={{ fontSize: 13 }}>{s.noAssignments}</div>}
              {c.assignments.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-primary)', opacity: a.done ? 0.65 : 1 }}>
                  <span aria-label={a.done ? s.done : s.todo} style={{ flex: 'none', width: 22, height: 22, borderRadius: 11, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, color: '#fff', background: a.done ? UP : 'transparent', border: a.done ? 'none' : '2px solid var(--border-primary)' }}>{a.done ? '✓' : ''}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 650 }}>{a.title}</div>
                    <div className="cl-muted" style={{ fontSize: 12 }}>
                      {[a.due ? s.due(a.due) : '', a.result?.miss != null ? s.govScore(a.result.miss.toFixed(2), a.result.fed_miss.toFixed(2))
                        : a.result?.decision ? s.govProgress(a.result.decision, a.result.of) : ''].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {!a.done && <Link className="cl-btn" to={assignmentHref(a)} style={{ padding: '6px 12px' }}>{s.goDo}</Link>}
                </div>
              ))}
            </div>
            {c.leaderboard.length > 1 && (
              <div style={{ display: 'grid', gap: 6 }}>
                <b style={{ fontSize: 14 }}>{s.leaderboard}</b>
                <div className="cl-scroll"><table className="cl-table">
                  <thead><tr><th>#</th><th>{s.colName}</th><th style={{ textAlign: 'right' }}>{s.colDone}</th><th style={{ textAlign: 'right' }}>{s.colMissions}</th><th style={{ textAlign: 'right' }}>{s.colReturn}</th></tr></thead>
                  <tbody>{c.leaderboard.map((r, i) => (
                    <tr key={i} style={r.me ? { background: `${ACCENT}14` } : undefined}>
                      <td style={{ fontWeight: 800 }}>{i + 1}</td><td>{r.nickname}{r.me ? s.me : ''}</td>
                      <td style={{ textAlign: 'right' }}>{r.done}/{c.assignments.length}</td><td style={{ textAlign: 'right' }}>{s.missionsOf(r.missions)}</td>
                      <td style={{ textAlign: 'right', color: pcol(r.return_pct) }}>{pct(r.return_pct)}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}

// ── Teacher side ──────────────────────────────────────────────────────────────

function Dashboard({ s, lang, id, onBack, onDeleted }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [type, setType] = useState('mission')
  const [ref, setRef] = useState('')
  const [due, setDue] = useState('')
  const [name, setName] = useState('')
  const [tname, setTname] = useState('')
  const load = useCallback(() => {
    api(`${id}/dashboard?lang=${lang}`).then((x) => { setD(x); setName(x.class.name); setTname(x.class.teacher_name || '') }).catch((e) => setErr(e.message))
  }, [id, lang])
  useEffect(() => { load() }, [load])
  if (!d) return <div className="cl-card">{err ? <span style={{ color: DOWN }}>{err}</span> : <div className="skeleton" style={{ height: 200 }} />}</div>
  const c = d.class
  const url = `${window.location.origin}/class/${c.code}`
  const options = (type === 'mission' ? d.options.missions : d.options[type]) || []
  const govA = d.assignments.filter((a) => a.type === 'governor')
  const run = async (path, body, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return
    try { await api(`${id}/${path}`, { body: body || {} }); setErr(''); load() } catch (e) { setErr(e.message) }
  }
  const csv = () => {
    const head = [s.colName, s.colJoined, s.colMissions, s.colTrades, s.colReturnUs, s.colReturnCn, s.colTm,
      ...govA.map((a) => `${s.typeGov} ${a.short}`), ...d.assignments.map((a) => a.title)]
    const rows = d.students.map((r) => [r.nickname, day(r.joined), r.missions.length, r.trades, r.returns.us ?? '', r.returns.cn ?? '',
      Object.values(r.time_machine).filter((t) => t.finished).length,
      ...govA.map((a) => { const g = r.governor?.[a.ref]; return !g ? '' : g.miss != null ? g.miss : `${g.decision}/${g.of}` }),
      ...d.assignments.map((a) => (r.done.includes(a.id) ? '✓' : ''))])
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const blob = new Blob(['﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${c.name}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div><button className="cl-btn" onClick={onBack}>{s.back}</button></div>
      <section className="cl-card">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ minWidth: 0, flex: '1 1 260px' }}>
            <h2 className="cl-h" style={{ fontSize: 22 }}>{c.name}</h2>
            <div className="cl-muted" style={{ fontSize: 13 }}>{c.teacher_name ? s.teacherBy(c.teacher_name) + ' · ' : ''}{s.studentsN(d.students.length)}</div>
          </div>
          <div style={{ display: 'grid', gap: 6, justifyItems: 'start' }}>
            <span className="cl-muted" style={{ fontSize: 12 }}>{s.code}</span>
            <span className="cl-code">{c.code}</span>
          </div>
          <button className="cl-btn primary" onClick={async () => { try { await navigator.clipboard.writeText(s.inviteText(c.name, c.code, url)); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* blocked */ } }}>
            {copied ? `✓ ${s.copied}` : `🔗 ${s.copyLink}`}
          </button>
        </div>
        {err && <div style={{ color: DOWN, fontSize: 13 }}>{err}</div>}
      </section>

      <section className="cl-card">
        <h3 className="cl-h">{s.assignments}</h3>
        {d.assignments.length === 0 && <div className="cl-muted" style={{ fontSize: 13 }}>{s.noAssignments}</div>}
        {d.assignments.map((a) => (
          <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontWeight: 650, fontSize: 14 }}>{a.title}</div>
              <div className="cl-muted" style={{ fontSize: 12 }}>{typeLabel(s, a.type)}{a.due ? ` · ${s.due(a.due)}` : ''}</div>
            </div>
            <div style={{ flex: '0 1 220px', display: 'grid', gap: 4 }}>
              <span className="cl-muted" style={{ fontSize: 12 }}>{s.completed(a.completed, d.students.length)}</span>
              <div className="cl-bar"><div style={{ width: `${d.students.length ? (a.completed / d.students.length) * 100 : 0}%`, height: '100%', background: UP }} /></div>
            </div>
            <button className="cl-btn danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => run('unassign', { id: a.id })}>{s.unassign}</button>
          </div>
        ))}
        <div className="cl-row" style={{ paddingTop: 10, borderTop: '1px solid var(--border-primary)' }}>
          <label className="cl-label">{s.type}
            <select className="cl-input" value={type} onChange={(e) => { setType(e.target.value); setRef('') }}>
              <option value="mission">{s.typeMission}</option><option value="time_machine">{s.typeTm}</option><option value="governor">{s.typeGov}</option>
            </select>
          </label>
          <label className="cl-label" style={{ flex: '1 1 220px' }}>{s.item}
            <select className="cl-input" value={ref} onChange={(e) => setRef(e.target.value)}>
              <option value="">—</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
          <label className="cl-label">{s.dueDate}<input className="cl-input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          <button className="cl-btn primary" disabled={!ref} onClick={() => { run('assign', { type, ref, due: due || null }); setRef(''); setDue('') }}>{s.add}</button>
        </div>
      </section>

      <section className="cl-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 className="cl-h">{s.students}</h3>
          {d.students.length > 0 && <button className="cl-btn" style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: 12 }} onClick={csv}>⬇ {s.exportCsv}</button>}
        </div>
        {d.students.length === 0 ? <div className="cl-muted" style={{ fontSize: 13 }}>{s.noStudents}</div> : (
          <div className="cl-scroll"><table className="cl-table">
            <thead><tr>
              <th>{s.colName}</th><th>{s.colDone}</th><th>{s.colMissions}</th><th style={{ textAlign: 'right' }}>{s.colTrades}</th>
              <th style={{ textAlign: 'right' }}>{s.colReturnUs}</th><th style={{ textAlign: 'right' }}>{s.colReturnCn}</th><th>{s.colTm}</th>
              {govA.map((a) => <th key={a.id} title={a.title}>🏛 {a.short}</th>)}
              <th>{s.colLast}</th><th>{s.colJoined}</th><th />
            </tr></thead>
            <tbody>{d.students.map((r) => {
              const tmDone = Object.values(r.time_machine).filter((t) => t.finished).length
              return (
                <tr key={r.sid}>
                  <td style={{ fontWeight: 650 }}>{r.nickname}</td>
                  <td>{r.done.length}/{d.assignments.length}</td>
                  <td>{s.missionsOf(r.missions.length)}</td>
                  <td style={{ textAlign: 'right' }}>{r.trades}</td>
                  <td style={{ textAlign: 'right', color: pcol(r.returns.us) }}>{pct(r.returns.us)}</td>
                  <td style={{ textAlign: 'right', color: pcol(r.returns.cn, true) }}>{pct(r.returns.cn)}</td>
                  <td>{tmDone ? s.tmDone(tmDone) : '—'}</td>
                  {govA.map((a) => <td key={a.id}><GovCell s={s} g={r.governor?.[a.ref]} /></td>)}
                  <td>{r.last_trade || '—'}</td>
                  <td>{day(r.joined)}</td>
                  <td><button className="cl-btn danger" style={{ padding: '3px 8px', fontSize: 11.5 }} onClick={() => run('remove', { id: r.sid }, s.removeConfirm(r.nickname))}>{s.remove}</button></td>
                </tr>
              )
            })}</tbody>
          </table></div>
        )}
        {d.students.length > 0 && govA.length > 0 && <p className="cl-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>🏛 {s.govNote}</p>}
      </section>

      <section className="cl-card">
        <h3 className="cl-h">{s.settings}</h3>
        <div className="cl-row">
          <label className="cl-label" style={{ flex: '1 1 220px' }}>{s.className}<input className="cl-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label>
          <label className="cl-label" style={{ flex: '1 1 180px' }}>{s.teacherName}<input className="cl-input" value={tname} maxLength={30} onChange={(e) => setTname(e.target.value)} /></label>
          <button className="cl-btn" onClick={() => run('rename', { name, teacher_name: tname })}>{s.rename}</button>
        </div>
        <div><button className="cl-btn danger" onClick={async () => { if (!window.confirm(s.deleteConfirm)) return; try { await api(`${id}/delete`, { body: {} }); onDeleted() } catch (e) { setErr(e.message) } }}>{s.deleteClass}</button></div>
      </section>
    </div>
  )
}

function TeacherClasses({ s, lang, onOpenAuth, phone }) {
  const user = useAuthStore((st) => st.user)
  const [list, setList] = useState(null)
  const [open, setOpen] = useState(null)
  const [name, setName] = useState('')
  const [tname, setTname] = useState('')
  const [err, setErr] = useState('')
  const load = useCallback(() => { api('mine').then((d) => setList(d.classes)).catch(() => setList([])) }, [])
  useEffect(() => { if (user) load() }, [user, load])
  if (!user) {
    return (
      <section className="cl-card">
        <h2 className="cl-h">🏫 {s.teach}</h2>
        <div className="cl-muted" style={{ fontSize: 13.5 }}>{phone ? s.teachSignInPhone : s.teachSignIn}</div>
        {onOpenAuth && <div><button className="cl-btn primary" onClick={onOpenAuth}>{s.signIn}</button></div>}
      </section>
    )
  }
  if (open) return <Dashboard s={s} lang={lang} id={open} onBack={() => { setOpen(null); load() }} onDeleted={() => { setOpen(null); load() }} />
  const create = async () => {
    setErr('')
    try { const c = await api('create', { body: { name, teacher_name: tname } }); setName(''); setOpen(c.id) } catch (e) { setErr(e.message) }
  }
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h2 className="cl-h">🏫 {s.teach}</h2>
      {list && list.length > 0 && (
        <div className="cl-grid">
          {list.map((c) => (
            <button key={c.id} className="cl-card" onClick={() => setOpen(c.id)} style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <b style={{ fontSize: 16 }}>{c.name}</b>
              <span className="cl-muted" style={{ fontSize: 12.5 }}>{s.code} <b style={{ fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: 2, color: 'var(--text-primary)' }}>{c.code}</b> · {s.studentsN(c.students)} · {s.assignments} {c.assignments}</span>
            </button>
          ))}
        </div>
      )}
      <div className="cl-card">
        <b style={{ fontSize: 14 }}>{s.create}</b>
        <div className="cl-row">
          <label className="cl-label" style={{ flex: '2 1 240px' }}>{s.className}<input className="cl-input" value={name} maxLength={40} placeholder={s.classNamePh} onChange={(e) => setName(e.target.value)} /></label>
          <label className="cl-label" style={{ flex: '1 1 180px' }}>{s.teacherName}<input className="cl-input" value={tname} maxLength={30} placeholder={s.teacherNamePh} onChange={(e) => setTname(e.target.value)} /></label>
          <button className="cl-btn primary" disabled={name.trim().length < 2} onClick={create}>{s.create}</button>
        </div>
        {err && <div style={{ color: DOWN, fontSize: 13 }}>{err}</div>}
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClassPage({ lang, code, onOpenAuth, phone = false }) {
  const s = classStrings(lang)
  const navigate = useNavigate()
  const user = useAuthStore((st) => st.user)
  const [classes, setClasses] = useState(null)
  const loadMine = useCallback(() => {
    api('student', { body: { device_id: paperKey(), lang } }).then((d) => setClasses(d.classes)).catch(() => setClasses([]))
  }, [lang])
  useEffect(() => { loadMine() }, [loadMine, user])
  const joinedCode = code && classes?.some((c) => c.code === code.toUpperCase())
  const leave = async (id) => { try { await api('leave', { body: { class_id: id, device_id: paperKey() } }) } catch { /* shown on reload */ } loadMine() }
  return (
    <div className="cl">
      <style>{CSS}</style>
      <div style={{ display: 'grid', gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>🏫 {s.title}</h1>
        <p className="cl-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6, maxWidth: 780 }}>{s.subtitle}</p>
      </div>
      {!joinedCode && <JoinCard s={s} initialCode={code} onJoined={() => { loadMine(); if (code) navigate('/class', { replace: true }) }} />}
      <StudentClasses s={s} classes={classes} onLeave={leave} />
      <TeacherClasses s={s} lang={lang} onOpenAuth={onOpenAuth} phone={phone} />
    </div>
  )
}
