import { useState, useRef, useEffect } from 'react'
import { T } from '../i18n/translations'
import { newDeviceId } from '../utils/deviceId'

const ACCENT = '#a08672'
const ACCENT2 = '#7c9cb4'
const BDR = 'var(--border-primary)'

const QUICK_PROMPTS = {
  zh: [
    'MACD指标怎么看？',
    'AD-AS模型如何分析通胀？',
    '什么是PE估值？',
    '如何读K线形态？',
  ],
  en: [
    'Explain MACD indicator',
    'How to analyse inflation with AD-AS?',
    'What is P/E ratio?',
    'How to read candlestick patterns?',
  ],
}

function getDeviceId() {
  let id = localStorage.getItem('bfs_device_id')
  if (!id) { id = newDeviceId(); localStorage.setItem('bfs_device_id', id) }
  return id
}

function Bubble({ msg, accent }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      {!isUser && (
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginRight: 7, marginTop: 2,
          background: `${ACCENT}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
        }}>🎓</div>
      )}
      <div style={{
        maxWidth: '82%',
        background: isUser
          ? `color-mix(in srgb, var(--accent) 18%, transparent)`
          : 'var(--bg-tertiary)',
        border: `1px solid ${isUser ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'var(--border-primary)'}`,
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        padding: '9px 13px',
        fontSize: 13,
        color: 'var(--text-primary)',
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
        {msg.streaming && (
          <span style={{ opacity: 0.5, marginLeft: 2, animation: 'blink 1s infinite' }}>▋</span>
        )}
      </div>
    </div>
  )
}

export default function AITeacherFloat({ lang, open, onClose }) {
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [busy,      setBusy]      = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const t = T[lang] || T.en
  const zh = lang === 'zh'
  const prompts = QUICK_PROMPTS[lang] || QUICK_PROMPTS.en

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: zh
          ? '你好！我是 BestFriendStock 的 AI 老师 🎓\n我可以帮你解答股票分析和经济学问题，点击下方快捷问题或直接输入！'
          : 'Hi! I\'m the BestFriendStock AI Tutor 🎓\nI can help with stock analysis and economics. Try the quick prompts below or type your question!',
      }])
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (text) => {
    const q = (text || input).trim()
    if (!q || busy) return
    setInput('')

    const history = messages
      .filter(m => !m.streaming)
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [
      ...prev,
      { role: 'user', content: q },
      { role: 'assistant', content: '', streaming: true },
    ])
    setBusy(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history, device_id: getDeviceId() }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.text) {
              full += d.text
              setMessages(prev => {
                const u = [...prev]
                u[u.length - 1] = { role: 'assistant', content: full, streaming: true }
                return u
              })
            }
            if (d.done || d.error) {
              setMessages(prev => {
                const u = [...prev]
                u[u.length - 1] = {
                  role: 'assistant',
                  content: d.error ? t.atError(d.error) : full,
                  streaming: false,
                }
                return u
              })
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      setMessages(prev => {
        const u = [...prev]
        u[u.length - 1] = {
          role: 'assistant',
          content: t.atNetError(e.message),
          streaming: false,
        }
        return u
      })
    } finally {
      setBusy(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (!open) return null

  return (
    <>
      {/* ── Chat window ── */}
      <div style={{
          position: 'fixed', top: 56, right: 16, zIndex: 950,
          width: 350, height: 480,
          background: '#0b0f1a',
          border: `1px solid ${BDR}`,
          borderRadius: 'var(--radius)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 14px',
            background: 'color-mix(in srgb, var(--accent) 4%, transparent)',
            borderBottom: `1px solid ${BDR}`,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎓</span>
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: `${ACCENT}`,
                }}>
                  {t.atTitle}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>DeepSeek · {t.atFree}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setMessages([])}
                title={t.atClear}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 4,
                }}
              >🗑</button>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 4,
                }}
              >✕</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px' }}>
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 5,
              padding: '6px 10px', borderTop: `1px solid ${BDR}`,
              flexShrink: 0,
            }}>
              {prompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => send(p)}
                  disabled={busy}
                  style={{
                    fontSize: 11, padding: '4px 9px', borderRadius: 'var(--radius)',
                    background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
                    color: ACCENT, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            display: 'flex', gap: 7, padding: '9px 10px',
            borderTop: `1px solid ${BDR}`, flexShrink: 0,
            background: 'var(--bg-primary)',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t.atPlaceholder}
              rows={2}
              disabled={busy}
              style={{
                flex: 1, background: 'var(--bg-tertiary)',
                border: `1px solid color-mix(in srgb, var(--accent) 20%, transparent)`, borderRadius: 'var(--radius)',
                color: 'var(--text-primary)', padding: '8px 11px', fontSize: 13,
                resize: 'none', outline: 'none', lineHeight: 1.55,
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              style={{
                background: input.trim() && !busy
                  ? `${ACCENT}`
                  : 'var(--bg-hover)',
                border: 'none', borderRadius: 'var(--radius)', padding: '0 14px',
                color: input.trim() && !busy ? '#fff' : 'var(--text-muted)',
                fontSize: 18, cursor: input.trim() && !busy ? 'pointer' : 'default',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              {busy ? '⟳' : '↑'}
            </button>
          </div>
        </div>
    </>
  )
}
