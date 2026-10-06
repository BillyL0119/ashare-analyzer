import { useMemo, useState } from 'react'
import { Route, Routes, useNavigate, useParams } from 'react-router-dom'
import useLangStore from '../../store/langStore'
import { useT } from '../i18n'
import { useAPI } from '../data'
import { loc } from '../helpers'
import { Icon } from '../icons'
import { ErrorBox, Section, Skeleton, SkeletonRows } from '../ui'

const EXAM_ORDER = ['alevel', 'igcse', 'ap_macro', 'ap_micro', 'ib', 'stocks']
const EXAM_LABEL = { alevel: 'A-Level', igcse: 'IGCSE', ap_macro: 'AP Macro', ap_micro: 'AP Micro', ib: 'IB', stocks: '股票入门' }
const KEY = 'bfs_m_progress'

function useProgress() {
  const [done, setDone] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() } })
  const toggle = (exam, id) => {
    const t = `${exam}/${id}`; const next = new Set(done)
    if (next.has(t)) next.delete(t); else next.add(t)
    setDone(next); try { localStorage.setItem(KEY, JSON.stringify([...next])) } catch { /* ignore */ }
  }
  return { has: (exam, id) => done.has(`${exam}/${id}`), toggle }
}

function List() {
  const t = useT(); const nav = useNavigate(); const lang = useLangStore((s) => s.lang)
  const { data, error, reload } = useAPI('/study/curriculum')
  const [exam, setExam] = useState(() => localStorage.getItem('bfs_m_exam') || 'alevel')
  const progress = useProgress()
  const cur = data?.curricula?.find((c) => c.key === exam)
  const all = useMemo(() => (cur ? (cur.papers ? cur.papers.flatMap((p) => p.topics) : cur.topics || []) : []), [cur])
  const done = all.filter((x) => progress.has(exam, x.id)).length
  const choose = (k) => { setExam(k); try { localStorage.setItem('bfs_m_exam', k) } catch { /* ignore */ } navigator.vibrate?.(8) }

  const topicCard = (topics) => (
    <div className="m-card flush">
      {topics.map((tp) => (
        <button key={tp.id} className="m-row" style={{ padding: '12px 16px' }} onClick={() => nav(`/study/${exam}/${tp.id}`)}>
          <span style={{ width: 22, height: 22, borderRadius: 11, flex: 'none', display: 'grid', placeItems: 'center',
            ...(progress.has(exam, tp.id) ? { background: '#2FB86A', color: '#fff' } : { border: '2px solid var(--text-3)', opacity: .6 }) }}>
            {progress.has(exam, tp.id) && <span style={{ width: 13, height: 13, display: 'block' }}>{Icon.check}</span>}
          </span>
          <div className="m-grow"><div style={{ fontWeight: 600, fontSize: 15 }}>{loc(tp, 'title', lang)}</div><div className="m-label" style={{ marginTop: 3 }}>{t('%lld 个章节', tp.section_count)}</div></div>
          <span className="m-chip">{tp.estimated_time}</span>
          <span style={{ width: 16, color: 'var(--text-3)' }}>{Icon.chevron}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="m-stack" style={{ gap: 18 }}>
      <h1 className="m-title" style={{ marginBottom: 0 }}>{t('学习中心')}</h1>
      <div className="m-strip" style={{ gap: 8 }}>
        {EXAM_ORDER.map((k) => (
          <button key={k} onClick={() => choose(k)} aria-pressed={exam === k} style={{ flex: 'none', padding: '8px 16px', borderRadius: 999, fontWeight: 650, fontSize: 14,
            background: exam === k ? 'var(--accent)' : 'var(--surface-hi)', color: exam === k ? '#fff' : 'var(--text)' }}>{EXAM_LABEL[k].startsWith('股') ? t(EXAM_LABEL[k]) : EXAM_LABEL[k]}</button>
        ))}
      </div>
      {!data ? (error ? <ErrorBox onRetry={reload} /> : <><Skeleton h={78} r={20} /><SkeletonRows rows={4} /></>) : !cur ? null : (
        <>
          <div className="m-card" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <b style={{ fontSize: 14 }}>{t('学习进度')}</b><span className="m-num m-muted" style={{ fontSize: 12, fontWeight: 650 }}>{t('%lld/%lld 已学完', done, all.length)}</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-hi)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${all.length ? (done / all.length) * 100 : 0}%`, minWidth: done ? 8 : 0, borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),var(--accent-2))', transition: 'width .4s' }} />
            </div>
          </div>
          {cur.papers?.length ? cur.papers.map((p) => (
            <Section key={p.id} title={loc(p, 'title', lang)} action={<span className="m-num m-muted">{p.topics.filter((x) => progress.has(exam, x.id)).length}/{p.topics.length}</span>}>{topicCard(p.topics)}</Section>
          )) : topicCard(all)}
        </>
      )}
    </div>
  )
}

function Topic() {
  const { exam, topic } = useParams()
  const t = useT(); const nav = useNavigate(); const lang = useLangStore((s) => s.lang)
  const progress = useProgress()
  const { data, error, reload } = useAPI(`/study/topic/${exam}/${topic}`)
  const [open, setOpen] = useState({})
  const done = progress.has(exam, topic)
  const examName = EXAM_LABEL[exam]?.startsWith('股') ? t(EXAM_LABEL[exam]) : (EXAM_LABEL[exam] || exam.toUpperCase())

  return (
    <div className="m-stack" style={{ gap: 16 }}>
      <div className="m-nav"><button className="m-iconbtn" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/study'))} aria-label={t('返回')}>{Icon.back}</button></div>
      {!data ? (error ? <ErrorBox onRetry={reload} /> : <><Skeleton h={40} w="80%" /><Skeleton h={220} r={20} /></>) : (
        <>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 2px 12px', letterSpacing: -.3, lineHeight: 1.2 }}>{loc(data, 'title', lang)}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="m-chip" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }}>{examName}</span>
              <span className="m-chip">{t('%lld 个章节', data.sections.length)}</span><span className="m-chip">{data.estimated_time}</span>
            </div>
          </div>
          {data.sections.map((s, i) => {
            const isOpen = open[i] !== false
            return (
              <div className="m-card" key={i} style={{ display: 'grid', gap: 14 }}>
                <button onClick={() => setOpen({ ...open, [i]: !isOpen })} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }} aria-expanded={isOpen}>
                  <span className="m-num" style={{ width: 28, height: 28, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }}>{i + 1}</span>
                  <b style={{ flex: 1, fontSize: 17 }}>{loc(s, 'heading', lang)}</b>
                  <span style={{ width: 16, color: 'var(--text-2)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>{Icon.chevron}</span>
                </button>
                {isOpen && (
                  <>
                    <p style={{ margin: 0, lineHeight: 1.65, fontSize: 15.5, whiteSpace: 'pre-wrap' }}>{loc(s, 'body', lang)}</p>
                    {s.key_terms?.length > 0 && (
                      <div><div className="m-label" style={{ marginBottom: 8, fontWeight: 650 }}>{t('关键术语')}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{s.key_terms.map((k) => <span key={k} className="m-chip" style={{ fontSize: 12.5, padding: '5px 10px', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }}>{k}</span>)}</div></div>
                    )}
                    {loc(s, 'real_world', lang) && <Callout icon="🌐" title={t('真实案例')} color="var(--accent)" text={loc(s, 'real_world', lang)} />}
                    {loc(s, 'exam_tip', lang) && <Callout icon="💡" title={t('考试技巧')} color="#F28B3C" text={loc(s, 'exam_tip', lang)} />}
                  </>
                )}
              </div>
            )
          })}
          <button className="m-btn" onClick={() => progress.toggle(exam, topic)} style={done ? { background: 'color-mix(in srgb, #2FB86A 16%, transparent)', color: '#2FB86A' } : undefined}>
            <span style={{ width: 20, height: 20, marginRight: 8, display: 'inline-block' }}>{Icon.check}</span>{done ? t('已学完') : t('标记为已学完')}
          </button>
          <div className="m-footer">{t('仅供学习，不构成投资建议')}</div>
        </>
      )}
    </div>
  )
}

function Callout({ icon, title, color, text }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
      <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 6 }}>{icon} {title}</div>
      <div style={{ fontSize: 14.5, lineHeight: 1.55 }}>{text}</div>
    </div>
  )
}

export default function Learning() {
  return (
    <Routes>
      <Route index element={<List />} />
      <Route path=":exam/:topic" element={<Topic />} />
    </Routes>
  )
}
