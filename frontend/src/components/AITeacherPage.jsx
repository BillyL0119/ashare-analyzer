import { useState, useRef, useEffect } from 'react'

const ACCENT  = '#8ab4f8'
const ACCENT2 = '#c084fc'
const BDR     = 'rgba(138,180,248,0.10)'
const MUTED   = '#9aa0a6'

// ── Topic categories ──────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    icon: '📈', name_zh: '技术分析', name_en: 'Technical Analysis',
    topics: [
      { zh: 'MACD金叉死叉是什么信号？', en: 'What does MACD golden/death cross signal?' },
      { zh: 'RSI超买超卖怎么操作？', en: 'How to trade RSI overbought/oversold?' },
      { zh: 'K线形态：头肩顶/底', en: 'Candlestick: Head & Shoulders pattern' },
      { zh: '均线多头排列是什么意思？', en: 'What is a bullish moving average alignment?' },
      { zh: '布林带如何判断行情？', en: 'How to use Bollinger Bands?' },
    ],
  },
  {
    icon: '🏦', name_zh: '基本面分析', name_en: 'Fundamental Analysis',
    topics: [
      { zh: 'PE估值多少算合理？', en: 'What P/E ratio is considered reasonable?' },
      { zh: 'PB市净率如何分析银行股？', en: 'How to use P/B for bank stocks?' },
      { zh: '如何读懂三大财务报表？', en: 'How to read the 3 financial statements?' },
      { zh: 'ROE和ROA有什么区别？', en: 'Difference between ROE and ROA?' },
      { zh: '自由现金流怎么计算？', en: 'How to calculate free cash flow?' },
    ],
  },
  {
    icon: '📚', name_zh: 'A-Level 经济学', name_en: 'A-Level Economics',
    topics: [
      { zh: 'AD-AS模型如何分析通货膨胀？', en: 'Analyse inflation using AD-AS model' },
      { zh: '货币政策如何影响股票市场？', en: 'How monetary policy affects stock markets?' },
      { zh: '汇率升值对出口的影响', en: 'Effect of currency appreciation on exports' },
      { zh: 'PED弹性A-Level高分考点', en: 'A-Level high-mark points on PED' },
      { zh: '市场失灵与政府干预的评价', en: 'Evaluating market failure & govt intervention' },
    ],
  },
  {
    icon: '🎯', name_zh: 'AP 经济学', name_en: 'AP Economics',
    topics: [
      { zh: 'AP Macro: 财政政策乘数效应', en: 'AP Macro: fiscal multiplier effect' },
      { zh: 'AP Micro: 完全竞争 vs 垄断', en: 'AP Micro: perfect competition vs monopoly' },
      { zh: '菲利普斯曲线短期vs长期', en: 'Phillips curve: short-run vs long-run' },
      { zh: '国际收支与汇率', en: 'Balance of payments & exchange rates' },
      { zh: 'Loanable funds market', en: 'Loanable funds market explained' },
    ],
  },
  {
    icon: '✏️', name_zh: '考试技巧', name_en: 'Exam Tips',
    topics: [
      { zh: 'A-Level 9708大题答题框架', en: 'A-Level 9708 essay answer structure' },
      { zh: 'AP考试图表题技巧', en: 'AP exam diagram question techniques' },
      { zh: '经济学画图满分技巧', en: 'Full marks tips for economics diagrams' },
      { zh: 'IB Economics HL评分标准', en: 'IB Economics HL marking criteria' },
      { zh: '如何在考试中举好例子？', en: 'How to use good examples in exams?' },
    ],
  },
  {
    icon: '🌏', name_zh: '市场热点', name_en: 'Market Themes',
    topics: [
      { zh: '美联储加息为什么影响A股？', en: 'Why do Fed rate hikes affect A-shares?' },
      { zh: '人工智能板块怎么分析？', en: 'How to analyse the AI sector?' },
      { zh: '中美贸易战对股市的影响', en: 'US-China trade war: impact on markets' },
      { zh: '新能源汽车行业投资逻辑', en: 'Investment logic for EV sector' },
      { zh: '如何分析宏观经济周期？', en: 'How to analyse macroeconomic cycles?' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem('bfs_device_id')
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('bfs_device_id', id) }
  return id
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 14, gap: 10,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>🎓</div>
      )}
      <div style={{
        maxWidth: '76%',
        background: isUser
          ? `linear-gradient(135deg,rgba(138,180,248,0.16),rgba(192,132,252,0.13))`
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isUser ? 'rgba(138,180,248,0.22)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        padding: '11px 15px',
        fontSize: 14, color: '#e8eaed', lineHeight: 1.75,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.content}
        {msg.streaming && (
          <span style={{ opacity: 0.5, marginLeft: 2, animation: 'blink 1s step-end infinite' }}>▋</span>
        )}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          background: 'rgba(138,180,248,0.12)', border: '1px solid rgba(138,180,248,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>👤</div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AITeacherPage({ lang }) {
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [busy,      setBusy]      = useState(false)
  const [activeCat, setActiveCat] = useState(0)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const zh = lang === 'zh'

  // Welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: zh
        ? '你好！我是 BestFriendStock 的 AI 老师 🎓\n\n我可以帮你：\n• 解读K线、MACD、RSI等技术指标\n• 分析PE、财务报表等基本面\n• 讲解 A-Level / AP / IB 经济学考点\n• 用真实市场案例说明经济学概念\n\n左侧选择话题，或直接输入你的问题！'
        : 'Hello! I\'m the BestFriendStock AI Tutor 🎓\n\nI can help you:\n• Explain technical indicators (K-line, MACD, RSI)\n• Analyse fundamentals (P/E, financial statements)\n• Cover A-Level / AP / IB Economics exam points\n• Connect real market cases to economic theory\n\nPick a topic from the left, or type your question!',
    }])
  }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      let buf = '', full = ''

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
                  content: d.error ? `⚠️ ${d.error}` : full,
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
          content: `⚠️ ${zh ? '错误：' : 'Error: '}${e.message}`,
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

  const cat = CATEGORIES[activeCat]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      background: '#080c14',
      borderRadius: 12, border: `1px solid ${BDR}`,
      overflow: 'hidden',
    }}>
      {/* ── Top banner ── */}
      <div style={{
        padding: '12px 20px', flexShrink: 0,
        background: 'rgba(138,180,248,0.04)',
        borderBottom: `1px solid ${BDR}`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>🎓</div>
        <div>
          <div style={{
            fontSize: 16, fontWeight: 800,
            background: `linear-gradient(90deg,${ACCENT},${ACCENT2})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {zh ? 'AI 老师' : 'AI Tutor'}
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>
            {zh
              ? '专为学生设计的股市 + 经济学 AI 老师 · 完全免费 · Powered by Google Gemini'
              : 'AI tutor for stock analysis & economics · Completely free · Powered by Google Gemini'}
          </div>
        </div>
        <button
          onClick={() => { setMessages([]); setTimeout(() => {
            setMessages([{ role: 'assistant', content: zh ? '对话已清空，有什么问题尽管问！' : 'Chat cleared! Ask me anything.' }])
          }, 50) }}
          style={{
            marginLeft: 'auto', background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${BDR}`, borderRadius: 8,
            padding: '5px 12px', color: MUTED, fontSize: 12, cursor: 'pointer',
          }}
        >
          {zh ? '清空对话' : 'Clear Chat'}
        </button>
      </div>

      {/* ── Main body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left sidebar ── */}
        <div style={{
          width: 240, flexShrink: 0,
          background: '#0d1120',
          borderRight: `1px solid ${BDR}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '12px 12px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(138,180,248,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {zh ? '话题分类' : 'Topics'}
          </div>

          {CATEGORIES.map((c, i) => (
            <div key={i}>
              {/* Category header */}
              <div
                onClick={() => setActiveCat(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', cursor: 'pointer',
                  background: activeCat === i ? 'rgba(138,180,248,0.08)' : 'transparent',
                  borderLeft: activeCat === i ? `3px solid ${ACCENT}` : '3px solid transparent',
                  transition: 'all 0.12s',
                }}
              >
                <span style={{ fontSize: 15 }}>{c.icon}</span>
                <span style={{
                  fontSize: 12, fontWeight: activeCat === i ? 700 : 400,
                  color: activeCat === i ? '#e8eaed' : MUTED,
                }}>
                  {zh ? c.name_zh : c.name_en}
                </span>
              </div>

              {/* Topic prompts when active */}
              {activeCat === i && (
                <div style={{ paddingLeft: 8, paddingBottom: 4 }}>
                  {c.topics.map((t, j) => (
                    <div
                      key={j}
                      onClick={() => send(zh ? t.zh : t.en)}
                      style={{
                        padding: '6px 10px 6px 28px', cursor: 'pointer',
                        fontSize: 11, color: 'rgba(138,180,248,0.65)',
                        borderRadius: 6, lineHeight: 1.4,
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(138,180,248,0.06)'
                        e.currentTarget.style.color = ACCENT
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'rgba(138,180,248,0.65)'
                      }}
                    >
                      {zh ? t.zh : t.en}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Chat area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 12px' }}>
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            {busy && messages[messages.length - 1]?.streaming && messages[messages.length - 1]?.content === '' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>🎓</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: ACCENT, opacity: 0.6,
                      animation: `bounce 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '12px 20px 16px',
            borderTop: `1px solid ${BDR}`,
            background: 'rgba(255,255,255,0.015)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={zh ? '输入你的问题（Enter 发送，Shift+Enter 换行）...' : 'Ask your question (Enter to send, Shift+Enter for new line)...'}
                rows={3}
                disabled={busy}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid rgba(138,180,248,0.2)`,
                  borderRadius: 12, color: '#e8eaed',
                  padding: '10px 14px', fontSize: 14,
                  resize: 'none', outline: 'none', lineHeight: 1.6,
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(138,180,248,0.45)'}
                onBlur={e => e.target.style.borderColor = 'rgba(138,180,248,0.2)'}
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                style={{
                  background: input.trim() && !busy
                    ? `linear-gradient(135deg,${ACCENT},${ACCENT2})`
                    : 'rgba(255,255,255,0.05)',
                  border: 'none', borderRadius: 12,
                  padding: '0 22px', fontSize: 20,
                  color: input.trim() && !busy ? '#fff' : '#4a5568',
                  cursor: input.trim() && !busy ? 'pointer' : 'default',
                  transition: 'all 0.2s', flexShrink: 0,
                }}
              >
                {busy ? '⟳' : '↑'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#333d4d', marginTop: 6, textAlign: 'right' }}>
              {zh
                ? '仅供学习参考，不构成投资建议 · 10次/分钟限流'
                : 'For educational purposes only, not investment advice · 10 req/min limit'}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.0); opacity: 1; }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
