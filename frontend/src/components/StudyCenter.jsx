import { useState, useEffect } from 'react'

const SIDEBAR_BG  = '#0d1120'
const CONTENT_BG  = '#0b0f1a'
const BDR         = 'rgba(138,180,248,0.10)'
const MUTED       = '#9aa0a6'
const BLUE        = '#8ab4f8'
const GREEN       = '#34d399'
const PROGRESS_BG = 'rgba(255,255,255,0.06)'

const STORAGE_KEY = 'bfs_study_alevel'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function saveProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

// ── Sidebar topic row ─────────────────────────────────────────────────────────
function TopicRow({ topic, active, read, onClick }) {
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
          ? 'rgba(138,180,248,0.12)'
          : hover ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderLeft: active ? `3px solid ${BLUE}` : '3px solid transparent',
        marginBottom: 2, transition: 'background 0.12s',
      }}
    >
      <span style={{
        fontSize: 14, flexShrink: 0,
        color: read ? GREEN : active ? BLUE : 'rgba(154,160,166,0.4)',
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

// ── Paper group (collapsible) ─────────────────────────────────────────────────
function PaperGroup({ paper, activeId, progress, onSelect }) {
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
          color: 'rgba(138,180,248,0.7)', textTransform: 'uppercase',
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
function SectionBlock({ section, index, total }) {
  return (
    <div style={{ marginBottom: index < total - 1 ? 32 : 0 }}>
      {/* Heading */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
      }}>
        <div style={{ width: 3, height: 22, background: BLUE, borderRadius: 2, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#e8eaed' }}>
          {section.heading}
        </h3>
      </div>

      {/* Body text */}
      <p style={{
        fontSize: 14, lineHeight: 1.85, color: '#c9d1d9',
        margin: '0 0 14px', paddingLeft: 15,
      }}>
        {section.body}
      </p>

      {/* Key terms */}
      {section.key_terms?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 15, marginBottom: 14 }}>
          {section.key_terms.map((t) => <KeyTermPill key={t} term={t} />)}
        </div>
      )}

      {/* Real World card */}
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

      {/* Exam Tip card */}
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

      {/* Section divider */}
      {index < total - 1 && (
        <div style={{ height: 1, background: 'rgba(138,180,248,0.08)', margin: '24px 0 0 15px' }} />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StudyCenter({ lang }) {
  const zh = lang === 'zh'
  const [curriculum, setCurriculum] = useState(null)
  const [activeId,   setActiveId]   = useState(null)
  const [topicData,  setTopicData]  = useState(null)
  const [progress,   setProgress]   = useState(loadProgress)
  const [loadingTopic, setLoadingTopic] = useState(false)

  // Fetch curriculum on mount
  useEffect(() => {
    fetch('/api/study/curriculum')
      .then((r) => r.json())
      .then((d) => {
        setCurriculum(d)
        // Auto-select first topic
        const firstId = d.papers?.[0]?.topics?.[0]?.id
        if (firstId) selectTopic(firstId)
      })
      .catch(console.error)
  }, [])

  const selectTopic = (id) => {
    setActiveId(id)
    setLoadingTopic(true)
    fetch(`/api/study/topic/${id}`)
      .then((r) => r.json())
      .then(setTopicData)
      .catch(console.error)
      .finally(() => setLoadingTopic(false))
  }

  const markRead = () => {
    if (!activeId) return
    const updated = { ...progress, [activeId]: true }
    setProgress(updated)
    saveProgress(updated)
  }

  const isRead = activeId ? !!progress[activeId] : false

  // Total topic count for progress bar
  const allTopics = curriculum?.papers?.flatMap((p) => p.topics) ?? []
  const readCount = allTopics.filter((t) => progress[t.id]).length
  const totalCount = allTopics.length
  const progressPct = totalCount ? (readCount / totalCount) * 100 : 0

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 60px)',
      background: '#080c14', borderRadius: 12,
      border: `1px solid ${BDR}`, overflow: 'hidden',
    }}>

      {/* ── Left sidebar ── */}
      <div style={{
        width: 260, flexShrink: 0, background: SIDEBAR_BG,
        borderRight: `1px solid ${BDR}`,
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 14px 14px', borderBottom: `1px solid ${BDR}` }}>
          <div style={{
            fontSize: 13, fontWeight: 800, letterSpacing: '0.02em',
            background: 'linear-gradient(90deg,#8ab4f8,#c084fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 2,
          }}>
            A-Level Economics
          </div>
          <div style={{ fontSize: 11, color: MUTED }}>Cambridge 9708</div>

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
          {curriculum?.papers?.map((paper) => (
            <PaperGroup
              key={paper.id}
              paper={paper}
              activeId={activeId}
              progress={progress}
              onSelect={selectTopic}
            />
          ))}
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
              </div>
            </div>

            {/* Sections */}
            {topicData.sections?.map((section, i) => (
              <SectionBlock
                key={i}
                section={section}
                index={i}
                total={topicData.sections.length}
              />
            ))}

            {/* Mark as read button */}
            <div style={{ marginTop: 36, paddingTop: 24, borderTop: `1px solid ${BDR}` }}>
              <button
                onClick={markRead}
                disabled={isRead}
                style={{
                  background: isRead
                    ? 'rgba(52,211,153,0.1)'
                    : 'linear-gradient(135deg, #34d399, #059669)',
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

              {/* Next topic button */}
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
                      background: 'rgba(138,180,248,0.1)',
                      color: BLUE, border: `1px solid rgba(138,180,248,0.2)`,
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
  )
}
