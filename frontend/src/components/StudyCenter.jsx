import { useState, useEffect, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import KLineLesson from './KLineLesson'
import { useMobile } from '../hooks/useMobile'

const SIDEBAR_BG  = '#0d1120'
const CONTENT_BG  = '#0b0f1a'
const BDR         = 'rgba(138,180,248,0.10)'
const MUTED       = '#9aa0a6'
const GREEN       = '#34d399'
const PROGRESS_BG = 'rgba(255,255,255,0.06)'

const EXAMS = [
  { key: 'alevel', label: 'A-Level', label_en: 'A-Level', title: 'A-Level Economics',      title_en: 'A-Level Economics',      color: '#6366f1', board: 'Cambridge 9708' },
  { key: 'igcse',  label: 'IGCSE',   label_en: 'IGCSE',   title: 'IGCSE Economics',        title_en: 'IGCSE Economics',        color: '#10b981', board: 'Cambridge 0455' },
  { key: 'ap_macro', label: 'AP宏观', label_en: 'AP Macro', title: 'AP Macroeconomics', title_en: 'AP Macroeconomics', color: '#f59e0b', board: 'College Board' },
  { key: 'ap_micro', label: 'AP微观', label_en: 'AP Micro', title: 'AP Microeconomics', title_en: 'AP Microeconomics', color: '#ef4444', board: 'College Board' },
  { key: 'ib',     label: 'IB',      label_en: 'IB',      title: 'IB Economics SL/HL',     title_en: 'IB Economics SL/HL',     color: '#8b5cf6', board: 'IB SL/HL'       },
  { key: 'stocks', label: '股票入门', label_en: 'Stock Basics', title: '股票知识入门',       title_en: 'Stock Market Basics',    color: '#ec4899', board: 'Stock Basics'   },
  { key: 'events', label: '历史事件', label_en: 'Economic History', title: '经济事件时间轴', title_en: 'Economic Event Timeline', color: '#06b6d4', board: 'Timeline' },
]

function storageKey(exam) { return `bfs_study_${exam}` }
function loadProgress(exam) {
  try { return JSON.parse(localStorage.getItem(storageKey(exam)) || '{}') } catch { return {} }
}
function saveProgress(exam, p) {
  localStorage.setItem(storageKey(exam), JSON.stringify(p))
}

// ── Sidebar topic row ─────────────────────────────────────────────────────────
function TopicRow({ topic, active, read, accentColor, zh, onClick }) {
  const [hover, setHover] = useState(false)
  const displayTitle = (!zh && topic.title_en) ? topic.title_en : topic.title
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
          {displayTitle}
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
function PaperGroup({ paper, activeId, progress, accentColor, zh, onSelect }) {
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
        <span>{(!zh && paper.title_en) ? paper.title_en : paper.title}</span>
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
          zh={zh}
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
function SectionBlock({ section, index, total, accentColor, zh }) {
  const heading   = (!zh && section.heading_en)   ? section.heading_en   : section.heading
  const body      = (!zh && section.body_en)      ? section.body_en      : section.body
  const realWorld = (!zh && section.real_world_en) ? section.real_world_en : section.real_world
  const examTip   = (!zh && section.exam_tip_en)  ? section.exam_tip_en  : section.exam_tip

  return (
    <div style={{ marginBottom: index < total - 1 ? 32 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 3, height: 22, background: accentColor, borderRadius: 2, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#e8eaed' }}>
          {heading}
        </h3>
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.85, color: '#c9d1d9', margin: '0 0 14px', paddingLeft: 15 }}>
        {body}
      </p>

      {(() => {
        const terms = (!zh && section.key_terms_en?.length > 0)
          ? section.key_terms_en
          : section.key_terms
        return terms?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 15, marginBottom: 14 }}>
            {terms.map((t) => <KeyTermPill key={t} term={t} />)}
          </div>
        ) : null
      })()}

      {realWorld && (
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
            {realWorld}
          </div>
        </div>
      )}

      {examTip && (
        <div style={{
          borderLeft: '3px solid #fbbf24',
          background: 'rgba(251,191,36,0.08)',
          borderRadius: '0 8px 8px 0',
          padding: '12px 16px',
          marginLeft: 15, marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6, letterSpacing: '0.05em' }}>
            📝 {zh ? 'EXAM TIP' : 'KEY INSIGHT'}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(232,234,240,0.8)' }}>
            {examTip}
          </div>
        </div>
      )}

      {index < total - 1 && (
        <div style={{ height: 1, background: 'rgba(138,180,248,0.08)', margin: '24px 0 0 15px' }} />
      )}
    </div>
  )
}

// ── AI Tutor ──────────────────────────────────────────────────────────────────
function AITutor({ topicId, exam, zh, accentColor }) {
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])   // [{q, answer, displayed}]
  const timerRef = useRef(null)

  // Typewriter: when a new answer arrives, animate it char by char
  useEffect(() => {
    const last = history[history.length - 1]
    if (!last || last.displayed === last.answer) return
    clearInterval(timerRef.current)
    let idx = last.displayed.length
    timerRef.current = setInterval(() => {
      idx += 2  // 2 chars per tick for speed
      setHistory((prev) => {
        const updated = [...prev]
        const item = updated[updated.length - 1]
        if (idx >= item.answer.length) {
          clearInterval(timerRef.current)
          updated[updated.length - 1] = { ...item, displayed: item.answer }
        } else {
          updated[updated.length - 1] = { ...item, displayed: item.answer.slice(0, idx) }
        }
        return updated
      })
    }, 18)
    return () => clearInterval(timerRef.current)
  }, [history.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setLoading(true)
    fetch('/api/study/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, topic_id: topicId, exam, lang: zh ? 'zh' : 'en' }),
    })
      .then((r) => r.json())
      .then((d) => {
        const answer = d.answer || (zh ? '抱歉，AI 暂时无法回答。' : 'Sorry, AI is temporarily unavailable.')
        setHistory((prev) => {
          const next = [...prev, { q, answer, displayed: '' }].slice(-3)
          return next
        })
        // Track AI tutor usage
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: localStorage.getItem('bfs_device_id') || 'anon', event: 'feature', feature: 'ai_tutor' }),
        }).catch(() => {})
      })
      .catch(() => {
        setHistory((prev) => [...prev, {
          q, answer: zh ? '网络错误，请重试。' : 'Network error. Please try again.', displayed: '',
        }].slice(-3))
      })
      .finally(() => setLoading(false))
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }

  return (
    <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid rgba(138,180,248,0.10)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>🤖</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e8eaed' }}>
            {zh ? 'AI 导师' : 'Ask AI Tutor'}
          </div>
          <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 1 }}>
            {zh ? '对这个课题有任何问题，都可以问我' : 'Ask anything about this topic'}
          </div>
        </div>
      </div>

      {/* Past Q&A */}
      {history.map((item, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          {/* Question bubble */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', marginBottom: 8,
          }}>
            <div style={{
              background: `rgba(${hexToRgb(accentColor)},0.12)`,
              border: `1px solid rgba(${hexToRgb(accentColor)},0.2)`,
              borderRadius: '12px 12px 4px 12px',
              padding: '8px 14px',
              maxWidth: '75%',
              fontSize: 13, color: '#e8eaed', lineHeight: 1.6,
            }}>
              {item.q}
            </div>
          </div>
          {/* Answer */}
          <div style={{
            borderLeft: '3px solid',
            borderImage: 'linear-gradient(180deg,#8ab4f8,#c084fc) 1',
            background: 'rgba(138,180,248,0.05)',
            borderRadius: '0 10px 10px 0',
            padding: '12px 16px',
            fontSize: 13, color: 'rgba(232,234,240,0.9)', lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
          }}>
            {item.displayed}
            {item.displayed.length < item.answer.length && (
              <span style={{ opacity: 0.5, animation: 'blink 1s infinite' }}>▋</span>
            )}
          </div>
        </div>
      ))}

      {/* Loading */}
      {loading && (
        <div style={{
          borderLeft: '3px solid rgba(138,180,248,0.4)',
          background: 'rgba(138,180,248,0.04)',
          borderRadius: '0 10px 10px 0',
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: 13, color: '#9aa0a6', fontStyle: 'italic',
        }}>
          {zh ? 'AI 思考中...' : 'AI is thinking...'}
          <span style={{ marginLeft: 6, opacity: 0.6 }}>●●●</span>
        </div>
      )}

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={zh ? '问AI导师任何问题...' : 'Ask anything about this topic...'}
          rows={2}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(${hexToRgb(accentColor)},0.25)`,
            borderRadius: 10,
            color: '#e8eaed',
            padding: '10px 14px',
            fontSize: 13,
            resize: 'none',
            outline: 'none',
            lineHeight: 1.6,
            fontFamily: 'inherit',
          }}
          disabled={loading}
        />
        <button
          onClick={submit}
          disabled={loading || !input.trim()}
          style={{
            background: input.trim() && !loading
              ? `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`
              : 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: 10,
            padding: '0 18px',
            color: input.trim() && !loading ? '#fff' : '#9aa0a6',
            fontSize: 18,
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          {loading ? '⟳' : '↑'}
        </button>
      </div>
      {history.length > 0 && (
        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6, textAlign: 'right' }}>
          {zh ? `显示最近 ${history.length} 条问答` : `Showing last ${history.length} Q&A`}
        </div>
      )}
    </div>
  )
}


// ── Economic Event Price Chart ─────────────────────────────────────────────────
function EventPriceChart({ eventId, tickers, zh }) {
  const [prices, setPrices] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    setPrices(null)
    fetch(`/api/study/events/${eventId}/prices`)
      .then((r) => r.json())
      .then((d) => setPrices(d.prices))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [eventId])

  const option = useMemo(() => {
    if (!prices) return null
    const series = tickers.map((t) => {
      const data = (prices[t.symbol] || []).map((p) => [p.date, p.value])
      return {
        name: t.label,
        type: 'line',
        data,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: t.color },
        itemStyle: { color: t.color },
      }
    })
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1a2035',
        borderColor: 'rgba(138,180,248,0.2)',
        textStyle: { color: '#e8eaed', fontSize: 12 },
        formatter: (params) => {
          let s = `<div style="margin-bottom:4px;font-size:11px;color:#9aa0a6">${params[0]?.axisValue}</div>`
          params.forEach((p) => {
            s += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span>${p.seriesName}: <b>${p.value?.[1]?.toFixed(1)}</b></span>
            </div>`
          })
          return s
        },
      },
      legend: {
        data: tickers.map((t) => t.label),
        textStyle: { color: '#9aa0a6', fontSize: 12 },
        top: 8,
      },
      grid: { left: 48, right: 24, top: 40, bottom: 36 },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: 'rgba(138,180,248,0.15)' } },
        axisLabel: { color: '#9aa0a6', fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: zh ? '相对指数 (=100)' : 'Normalised (=100)',
        nameTextStyle: { color: '#9aa0a6', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: '#9aa0a6', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(138,180,248,0.07)' } },
      },
      series,
    }
  }, [prices, tickers, zh])

  if (loading) return (
    <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6', fontSize: 13 }}>
      {zh ? '加载价格数据...' : 'Loading price data...'}
    </div>
  )
  if (!prices) return null
  const allEmpty = tickers.every((t) => !(prices[t.symbol]?.length))
  if (allEmpty) return (
    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6', fontSize: 13 }}>
      {zh ? '暂无价格数据' : 'Price data unavailable'}
    </div>
  )

  return (
    <ReactECharts
      option={option}
      style={{ height: 260 }}
      theme="dark"
      opts={{ renderer: 'svg' }}
    />
  )
}

// ── Economic Events Timeline ───────────────────────────────────────────────────
function EventTimeline({ zh }) {
  const [events, setEvents]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [activeId, setActiveId]   = useState(null)
  const ACCENT = '#06b6d4'

  useEffect(() => {
    setLoading(true)
    fetch('/api/study/events')
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events || [])
        if (d.events?.length) setActiveId(d.events[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const active = events.find((e) => e.id === activeId)

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── Left timeline column ── */}
      <div style={{
        width: 220, flexShrink: 0,
        background: SIDEBAR_BG,
        borderRight: `1px solid ${BDR}`,
        overflowY: 'auto',
        padding: '20px 0',
      }}>
        <div style={{ padding: '0 16px 12px', fontSize: 11, fontWeight: 700, color: `rgba(6,182,212,0.7)`, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {zh ? '历史大事件' : 'Major Events'}
        </div>

        {loading && (
          <div style={{ padding: '16px', color: MUTED, fontSize: 12 }}>
            {zh ? '加载中...' : 'Loading...'}
          </div>
        )}

        {/* Timeline items */}
        <div style={{ position: 'relative', paddingLeft: 16 }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', left: 28, top: 8, bottom: 8,
            width: 2, background: 'rgba(6,182,212,0.15)', borderRadius: 1,
          }} />

          {events.map((ev, i) => {
            const isActive = ev.id === activeId
            return (
              <div
                key={ev.id}
                onClick={() => setActiveId(ev.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px 10px 0', cursor: 'pointer',
                  position: 'relative',
                  borderRadius: 8,
                  background: isActive ? 'rgba(6,182,212,0.08)' : 'transparent',
                  marginBottom: 4,
                  transition: 'background 0.15s',
                }}
              >
                {/* Dot */}
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  marginTop: 3, zIndex: 1,
                  background: isActive ? ACCENT : 'rgba(6,182,212,0.3)',
                  border: isActive ? `2px solid ${ACCENT}` : '2px solid rgba(6,182,212,0.2)',
                  boxShadow: isActive ? `0 0 8px ${ACCENT}60` : 'none',
                  transition: 'all 0.15s',
                }} />
                <div>
                  <div style={{ fontSize: 11, color: isActive ? ACCENT : 'rgba(6,182,212,0.5)', fontWeight: 700, marginBottom: 2 }}>
                    {ev.year}
                  </div>
                  <div style={{ fontSize: 12, color: isActive ? '#e8eaed' : MUTED, lineHeight: 1.4, fontWeight: isActive ? 600 : 400 }}>
                    {zh ? ev.title : ev.title_en}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(154,160,166,0.45)', marginTop: 2 }}>
                    {ev.date_range}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right detail panel ── */}
      <div style={{ flex: 1, background: CONTENT_BG, overflowY: 'auto' }}>
        {!active ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: MUTED, fontSize: 14 }}>
            {zh ? '选择左侧事件' : 'Select an event'}
          </div>
        ) : (
          <div style={{ padding: '28px 36px 48px', maxWidth: 820 }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                  background: 'rgba(6,182,212,0.12)', color: ACCENT,
                  border: '1px solid rgba(6,182,212,0.2)',
                }}>
                  {active.date_range}
                </span>
              </div>
              <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#e8eaed' }}>
                {zh ? active.title : active.title_en}
              </h1>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: '#c9d1d9' }}>
                {zh ? active.description : active.description_en}
              </p>
            </div>

            {/* Price chart */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${BDR}`,
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {zh ? '市场走势（以事件起点=100标准化）' : 'Market Performance (normalised to 100 at start)'}
              </div>
              <EventPriceChart eventId={active.id} tickers={active.tickers} zh={zh} />
            </div>

            {/* Exam points */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${BDR}`,
              borderRadius: 12,
              padding: '16px 20px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                📝 {zh ? '考试考点' : 'Exam Connection Points'}
              </div>
              {(zh ? active.exam_points_zh : active.exam_points).map((ep, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, marginBottom: i < active.exam_points.length - 1 ? 14 : 0,
                  paddingBottom: i < active.exam_points.length - 1 ? 14 : 0,
                  borderBottom: i < active.exam_points.length - 1 ? '1px solid rgba(138,180,248,0.07)' : 'none',
                }}>
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 10, height: 'fit-content',
                    background: 'rgba(251,191,36,0.1)', color: '#fbbf24',
                    border: '1px solid rgba(251,191,36,0.2)',
                    whiteSpace: 'nowrap',
                  }}>
                    {ep.exam}
                  </span>
                  <span style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(232,234,240,0.85)' }}>
                    {ep.point}
                  </span>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}


// ── Main component ────────────────────────────────────────────────────────────
export default function StudyCenter({ lang }) {
  const zh = lang === 'zh'
  const isMobile = useMobile()
  const [activeExam, setActiveExam] = useState('alevel')
  const [curriculum,    setCurriculum]    = useState(null)
  const [activeId,      setActiveId]      = useState(null)
  const [topicData,     setTopicData]     = useState(null)
  const [progress,      setProgress]      = useState(() => loadProgress('alevel'))
  const [loadingTopic,  setLoadingTopic]  = useState(false)
  const [loadingCurr,   setLoadingCurr]   = useState(false)
  const [mobileView,    setMobileView]    = useState('list') // 'list' | 'content'

  const examMeta = EXAMS.find((e) => e.key === activeExam) || EXAMS[0]
  const accentColor = examMeta.color

  // Fetch curriculum whenever exam changes (skip for events/stocks tabs)
  useEffect(() => {
    if (activeExam === 'events' || activeExam === 'stocks') return
    setLoadingCurr(true)
    setCurriculum(null)
    setActiveId(null)
    setTopicData(null)
    setProgress(loadProgress(activeExam))
    setMobileView('list')
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
    setMobileView('content')
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
      <div className="tab-bar" style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '10px 14px 0',
        background: SIDEBAR_BG,
        borderBottom: `1px solid ${BDR}`,
        flexShrink: 0, overflowX: 'auto',
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
              {zh ? exam.label : exam.label_en}
            </button>
          )
        })}
      </div>

      {/* ── Body: sidebar + content (or EventTimeline) ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Events timeline special view ── */}
        {activeExam === 'events' && <EventTimeline zh={zh} />}

        {/* ── Stocks K-line lesson ── */}
        {activeExam === 'stocks' && <KLineLesson zh={zh} />}

        {/* ── Left sidebar ── */}
        {activeExam !== 'events' && activeExam !== 'stocks' &&
        (!isMobile || mobileView === 'list') &&
        <div style={{
          width: isMobile ? '100%' : 260, flexShrink: 0, background: SIDEBAR_BG,
          borderRight: isMobile ? 'none' : `1px solid ${BDR}`,
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 14px 12px', borderBottom: `1px solid ${BDR}` }}>
            <div style={{
              fontSize: 13, fontWeight: 800, letterSpacing: '0.02em',
              color: accentColor, marginBottom: 2,
            }}>
              {zh ? examMeta.title : examMeta.title_en}
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
                  zh={zh}
                  onSelect={selectTopic}
                />
              ))
            )}
          </div>
        </div>
        }

        {/* ── Right content area ── */}
        {activeExam !== 'events' && activeExam !== 'stocks' &&
        (!isMobile || mobileView === 'content') &&
        <div style={{
          flex: 1, background: CONTENT_BG,
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {/* Mobile back button */}
          {isMobile && (
            <button
              onClick={() => setMobileView('list')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 14px', background: SIDEBAR_BG,
                border: 'none', borderBottom: `1px solid ${BDR}`,
                color: '#9aa0a6', fontSize: 13, cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ← {zh ? '返回列表' : 'Back'}
            </button>
          )}
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
                    {(!zh && topicData.title_en) ? topicData.title_en : topicData.title}
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
                  zh={zh}
                />
              ))}

              {/* AI Tutor */}
              <AITutor
                topicId={activeId}
                exam={activeExam}
                zh={zh}
                accentColor={accentColor}
              />

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
                      {zh ? '下一课题 →' : 'Next Topic →'} {(!zh && next.title_en) ? next.title_en : next.title}
                    </button>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
        }
      </div>
    </div>
  )
}
