import { useState, useEffect } from 'react'

const SIDEBAR_BG  = '#0d1120'
const CONTENT_BG  = '#0b0f1a'
const BDR         = 'rgba(138,180,248,0.10)'
const MUTED       = '#9aa0a6'
const GREEN       = '#34d399'
const PROGRESS_BG = 'rgba(255,255,255,0.06)'

const EXAMS = [
  { key: 'alevel', label: 'A-Level', title: 'A-Level Economics',      color: '#6366f1', board: 'Cambridge 9708' },
  { key: 'igcse',  label: 'IGCSE',   title: 'IGCSE Economics',        color: '#10b981', board: 'Cambridge 0455' },
  { key: 'ap',     label: 'AP',      title: 'AP Macroeconomics',      color: '#f59e0b', board: 'College Board'  },
  { key: 'ib',     label: 'IB',      title: 'IB Economics SL/HL',     color: '#8b5cf6', board: 'IB SL/HL'       },
  { key: 'stocks', label: '股票入门', title: '股票知识入门',            color: '#ec4899', board: 'Stock Basics'   },
]

function storageKey(exam) { return `bfs_study_${exam}` }
function loadProgress(exam) {
  try { return JSON.parse(localStorage.getItem(storageKey(exam)) || '{}') } catch { return {} }
}
function saveProgress(exam, p) {
  localStorage.setItem(storageKey(exam), JSON.stringify(p))
}

// ── Sidebar topic row ─────────────────────────────────────────────────────────
function TopicRow({ topic, active, read, accentColor, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', cursor: 'pointer', borderRadius: 8,
        background: active
          ? `rgba(${hexToRgb(accentColor)},0.12)`
          : hover ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderLeft: active ? `3px solid ${accentColor}` : '3px solid transparent',
        marginBottom: 2, transition: 'background 0.12s',
      }}
    >
      <span style={{
        fontSize: 14, flexShrink: 0,
        color: read ? GREEN : active ? accentColor : 'rgba(154,160,166,0.4)',
      }}>
        {read ? '✓' : '●'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, lineHeight: 1.35,
          color: active ? '#e8eaed' : read ? '#c9d1d9' : MUTED,
          fontWeight: active ? 600 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {topic.title}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(154,160,166,0.5)', marginTop: 1 }}>
          {topic.estimated_time}
        </div>
      </div>
    </div>
  )
}

// hex color → "r,g,b" string for rgba()
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

// ── Paper group (collapsible) ─────────────────────────────────────────────────
function PaperGroup({ paper, activeId, progress, accentColor, onSelect }) {
  const [open, setOpen] = useState(true)
  const readCount = paper.topics.filter((t) => progress[t.id]).length

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', cursor: 'pointer',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
          color: `rgba(${hexToRgb(accentColor)},0.7)`, textTransform: 'uppercase',
        }}
      >
        <span>{paper.title}</span>
        <span style={{ fontSize: 10, color: MUTED }}>
          {readCount}/{paper.topics.length} {open ? '▲' : '▼'}
        </span>
      </div>
      {open && paper.topics.map((t) => (
        <TopicRow
          key={t.id}
          topic={t}
          active={t.id === activeId}
          read={!!progress[t.id]}
          accentColor={accentColor}
          onClick={() => onSelect(t.id)}
        />
      ))}
    </div>
  )
}

// ── Key term pill ─────────────────────────────────────────────────────────────
function KeyTermPill({ term }) {
  return (
    <span style={{
      fontSize: 11, padding: '3px 9px', borderRadius: 12,
      background: 'rgba(99,102,241,0.15)',
      color: '#818cf8',
      border: '1px solid rgba(99,102,241,0.2)',
      whiteSpace: 'nowrap',
    }}>
      {term}
    </span>
  )
}

// ── Section block ─────────────────────────────────────────────────────────────
function SectionBlock({ section, index, total, accentColor }) {
  return (
    <div style={{ marginBottom: index < total - 1 ? 32 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 3, height: 22, background: accentColor, borderRadius: 2, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#e8eaed' }}>
          {section.heading}
        </h3>
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.85, color: '#c9d1d9', margin: '0 0 14px', paddingLeft: 15 }}>
        {section.body}
      </p>

      {section.key_terms?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 15, marginBottom: 14 }}>
          {section.key_terms.map((t) => <KeyTermPill key={t} term={t} />)}
        </div>
      )}

      {section.real_world && (
        <div style={{
          borderLeft: '3px solid #f59e0b',
          background: 'rgba(245,158,11,0.08)',
          borderRadius: '0 8px 8px 0',
          padding: '12px 16px',
          marginLeft: 15, marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 6, letterSpacing: '0.05em' }}>
            🌍 REAL WORLD CONNECTION
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(232,234,240,0.8)' }}>
            {section.real_world}
          </div>
        </div>
      )}

      {section.exam_tip && (
        <div style={{
          borderLeft: '3px solid #fbbf24',
          background: 'rgba(251,191,36,0.08)',
          borderRadius: '0 8px 8px 0',
          padding: '12px 16px',
          marginLeft: 15, marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6, letterSpacing: '0.05em' }}>
            📝 EXAM TIP
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(232,234,240,0.8)' }}>
            {section.exam_tip}
          </div>
        </div>
      )}

      {index < total - 1 && (
        <div style={{ height: 1, background: 'rgba(138,180,248,0.08)', margin: '24px 0 0 15px' }} />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StudyCenter({ lang }) {
  const zh = lang === 'zh'
  const [activeExam, setActiveExam] = useState('alevel')
  const [curriculum,    setCurriculum]    = useState(null)
  const [activeId,      setActiveId]      = useState(null)
  const [topicData,     setTopicData]     = useState(null)
  const [progress,      setProgress]      = useState(() => loadProgress('alevel'))
  const [loadingTopic,  setLoadingTopic]  = useState(false)
  const [loadingCurr,   setLoadingCurr]   = useState(false)

  const examMeta = EXAMS.find((e) => e.key === activeExam) || EXAMS[0]
  const accentColor = examMeta.color

  // Fetch curriculum whenever exam changes
  useEffect(() => {
    setLoadingCurr(true)
    setCurriculum(null)
    setActiveId(null)
    setTopicData(null)
    setProgress(loadProgress(activeExam))
    fetch(`/api/study/curriculum?exam=${activeExam}`)
      .then((r) => r.json())
      .then((d) => {
        setCurriculum(d)
        const firstId = d.papers?.[0]?.topics?.[0]?.id
        if (firstId) selectTopic(firstId, activeExam)
      })
      .catch(console.error)
      .finally(() => setLoadingCurr(false))
  }, [activeExam])

  const selectTopic = (id, exam = activeExam) => {
    setActiveId(id)
    setLoadingTopic(true)
    fetch(`/api/study/topic/${exam}/${id}`)
      .then((r) => r.json())
      .then(setTopicData)
      .catch(console.error)
      .finally(() => setLoadingTopic(false))
  }

  const markRead = () => {
    if (!activeId) return
    const updated = { ...progress, [activeId]: true }
    setProgress(updated)
    saveProgress(activeExam, updated)
  }

  const isRead = activeId ? !!progress[activeId] : false

  const allTopics = curriculum?.papers?.flatMap((p) => p.topics) ?? []
  const readCount = allTopics.filter((t) => progress[t.id]).length
  const totalCount = allTopics.length
  const progressPct = totalCount ? (readCount / totalCount) * 100 : 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      background: '#080c14', borderRadius: 12,
      border: `1px solid ${BDR}`, overflow: 'hidden',
    }}>

      {/* ── Exam tab bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '10px 14px 0',
        background: SIDEBAR_BG,
        borderBottom: `1px solid ${BDR}`,
        flexShrink: 0,
      }}>
        {EXAMS.map((exam) => {
          const active = exam.key === activeExam
          return (
            <button
              key={exam.key}
              onClick={() => setActiveExam(exam.key)}
              style={{
                padding: '7px 18px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                background: active ? CONTENT_BG : 'transparent',
                color: active ? exam.color : MUTED,
                borderTop: active ? `2px solid ${exam.color}` : '2px solid transparent',
                borderLeft: active ? `1px solid ${BDR}` : '1px solid transparent',
                borderRight: active ? `1px solid ${BDR}` : '1px solid transparent',
                transition: 'all 0.15s',
                letterSpacing: '0.3px',
              }}
            >
              {exam.label}
            </button>
          )
        })}
      </div>

      {/* ── Body: sidebar + content ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left sidebar ── */}
        <div style={{
          width: 260, flexShrink: 0, background: SIDEBAR_BG,
          borderRight: `1px solid ${BDR}`,
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 14px 12px', borderBottom: `1px solid ${BDR}` }}>
            <div style={{
              fontSize: 13, fontWeight: 800, letterSpacing: '0.02em',
              color: accentColor, marginBottom: 2,
            }}>
              {examMeta.title}
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>{examMeta.board}</div>

            {/* Progress bar */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: MUTED, marginBottom: 5 }}>
                <span>{zh ? '学习进度' : 'Progress'}</span>
                <span style={{ color: readCount > 0 ? GREEN : MUTED }}>
                  {readCount} / {totalCount} {zh ? '已读' : 'read'}
                </span>
              </div>
              <div style={{ height: 5, background: PROGRESS_BG, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${GREEN}, #059669)`,
                  borderRadius: 3, transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Topic list */}
          <div style={{ padding: '10px 6px', flex: 1 }}>
            {loadingCurr ? (
              <div style={{ padding: '20px 12px', color: MUTED, fontSize: 12 }}>
                {zh ? '加载中...' : 'Loading...'}
              </div>
            ) : (
              curriculum?.papers?.map((paper) => (
                <PaperGroup
                  key={paper.id}
                  paper={paper}
                  activeId={activeId}
                  progress={progress}
                  accentColor={accentColor}
                  onSelect={selectTopic}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right content area ── */}
        <div style={{
          flex: 1, background: CONTENT_BG,
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {!topicData && !loadingTopic ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: MUTED, fontSize: 14 }}>
              {zh ? '选择左侧课题开始学习' : 'Select a topic from the sidebar to begin'}
            </div>
          ) : loadingTopic ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: MUTED, fontSize: 14 }}>
              {zh ? '加载中...' : 'Loading...'}
            </div>
          ) : (
            <div style={{ padding: '28px 36px 40px', maxWidth: 780 }}>
              {/* Topic header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#e8eaed', lineHeight: 1.2 }}>
                    {topicData.title}
                  </h1>
                  {isRead && (
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                      background: 'rgba(52,211,153,0.15)', color: GREEN,
                      border: '1px solid rgba(52,211,153,0.25)',
                    }}>
                      ✓ {zh ? '已读' : 'Read'}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: MUTED }}>
                  ⏱ {topicData.estimated_time} &nbsp;·&nbsp; {topicData.sections?.length} {zh ? '个章节' : 'sections'}
                  &nbsp;·&nbsp; <span style={{ color: accentColor }}>{examMeta.label}</span>
                </div>
              </div>

              {/* Sections */}
              {topicData.sections?.map((section, i) => (
                <SectionBlock
                  key={i}
                  section={section}
                  index={i}
                  total={topicData.sections.length}
                  accentColor={accentColor}
                />
              ))}

              {/* Mark as read + next topic */}
              <div style={{ marginTop: 36, paddingTop: 24, borderTop: `1px solid ${BDR}` }}>
                <button
                  onClick={markRead}
                  disabled={isRead}
                  style={{
                    background: isRead
                      ? 'rgba(52,211,153,0.1)'
                      : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                    color: isRead ? GREEN : '#fff',
                    border: isRead ? `1px solid rgba(52,211,153,0.25)` : 'none',
                    borderRadius: 10, padding: '11px 28px',
                    fontSize: 14, fontWeight: 700,
                    cursor: isRead ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {isRead
                    ? `✓ ${zh ? '已标记为已读' : 'Marked as Read'}`
                    : `${zh ? '标记为已读' : 'Mark as Read'} ✓`
                  }
                </button>

                {(() => {
                  if (!curriculum) return null
                  const flat = curriculum.papers.flatMap((p) => p.topics)
                  const idx  = flat.findIndex((t) => t.id === activeId)
                  const next = flat[idx + 1]
                  if (!next) return null
                  return (
                    <button
                      onClick={() => { markRead(); selectTopic(next.id) }}
                      style={{
                        marginLeft: 12,
                        background: `rgba(${hexToRgb(accentColor)},0.1)`,
                        color: accentColor,
                        border: `1px solid rgba(${hexToRgb(accentColor)},0.2)`,
                        borderRadius: 10, padding: '11px 22px',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {zh ? '下一课题 →' : 'Next Topic →'} {next.title}
                    </button>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
