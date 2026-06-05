import { useState, useRef, useEffect } from 'react'

const ACCENT = '#8ab4f8'
const ACCENT2 = '#c084fc'
const BDR = 'rgba(138,180,248,0.12)'

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
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('bfs_device_id', id) }
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
          background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
        }}>🎓</div>
      )}
      <div style={{
        maxWidth: '82%',
        background: isUser
          ? `linear-gradient(135deg,rgba(138,180,248,0.18),rgba(192,132,252,0.15))`
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isUser ? 'rgba(138,180,248,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        padding: '9px 13px',
        fontSize: 13,
        color: '#e8eaed',
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
  const zh = lang === 'zh'
  const prompts = zh ? QUICK_PROMPTS.zh : QUICK_PROMPTS.en

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
                  content: d.error ? (zh ? `错误：${d.error}` : `Error: ${d.error}`) : full,
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
          content: zh ? `网络错误：${e.message}` : `Network error: ${e.message}`,
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
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(138,180,248,0.08)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 14px',
            background: 'rgba(138,180,248,0.04)',
            borderBottom: `1px solid ${BDR}`,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎓</span>
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  background: `linear-gradient(90deg,${ACCENT},${ACCENT2})`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {zh ? 'AI 老师' : 'AI Tutor'}
                </div>
                <div style={{ fontSize: 10, color: '#4a5568' }}>Gemini · {zh ? '免费' : 'Free'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setMessages([])}
                title={zh ? '清空对话' : 'Clear chat'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: '#4a5568', padding: '2px 4px', borderRadius: 4,
                }}
              >🗑</button>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, color: '#4a5568', padding: '2px 4px', borderRadius: 4,
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
                    fontSize: 11, padding: '4px 9px', borderRadius: 10,
                    background: 'rgba(138,180,248,0.08)',
                    border: '1px solid rgba(138,180,248,0.18)',
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
            background: 'rgba(255,255,255,0.02)',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={zh ? '输入问题...' : 'Ask anything...'}
              rows={2}
              disabled={busy}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: `1px solid rgba(138,180,248,0.2)`, borderRadius: 10,
                color: '#e8eaed', padding: '8px 11px', fontSize: 13,
                resize: 'none', outline: 'none', lineHeight: 1.55,
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              style={{
                background: input.trim() && !busy
                  ? `linear-gradient(135deg,${ACCENT},${ACCENT2})`
                  : 'rgba(255,255,255,0.06)',
                border: 'none', borderRadius: 10, padding: '0 14px',
                color: input.trim() && !busy ? '#fff' : '#4a5568',
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
