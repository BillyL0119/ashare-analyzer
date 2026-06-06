import { useState, useEffect, useCallback, useRef } from 'react'
import useThemeStore from '../store/themeStore'

const API = import.meta.env.VITE_API_BASE || ''

const ACCENT   = '#0ea5e9'
const GREEN    = '#22c55e'
const RED      = '#ef4444'
const AMBER    = '#f59e0b'

const SENT_CFG = {
  bullish: { label_zh: '看多', label_en: 'Bullish', icon: '🐂', color: GREEN,  bg: 'rgba(34,197,94,0.12)'  },
  neutral: { label_zh: '中性', label_en: 'Neutral', icon: '😐', color: AMBER,  bg: 'rgba(245,158,11,0.12)' },
  bearish: { label_zh: '看空', label_en: 'Bearish', icon: '🐻', color: RED,    bg: 'rgba(239,68,68,0.12)'  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDeviceId() {
  let id = localStorage.getItem('bfs_device_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('bfs_device_id', id)
  }
  return id
}

function relativeTime(isoStr, zh) {
  const diff = (Date.now() - new Date(isoStr)) / 1000
  if (diff < 60)  return zh ? '刚刚' : 'just now'
  if (diff < 3600) return zh ? `${Math.floor(diff/60)}分钟前` : `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return zh ? `${Math.floor(diff/3600)}小时前` : `${Math.floor(diff/3600)}h ago`
  if (diff < 2592000) return zh ? `${Math.floor(diff/86400)}天前` : `${Math.floor(diff/86400)}d ago`
  return new Date(isoStr).toLocaleDateString()
}

function avatarColor(nickname) {
  let h = 0
  for (let i = 0; i < nickname.length; i++) h = (h * 31 + nickname.charCodeAt(i)) % 360
  return `hsl(${h},55%,45%)`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SentimentBar({ stats, zh }) {
  if (!stats || stats.total === 0) return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
      {zh ? '暂无评论数据' : 'No comments yet'}
    </div>
  )
  const { bullish_pct, neutral_pct, bearish_pct, total } = stats
  return (
    <div style={{ marginBottom: 14 }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${bullish_pct}%`, background: GREEN, transition: 'width 0.5s' }} />
        <div style={{ width: `${neutral_pct}%`, background: AMBER, transition: 'width 0.5s' }} />
        <div style={{ width: `${bearish_pct}%`, background: RED,   transition: 'width 0.5s' }} />
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>🐂 {bullish_pct}%</span>
          <span style={{ fontSize: 12, color: AMBER, fontWeight: 600 }}>😐 {neutral_pct}%</span>
          <span style={{ fontSize: 12, color: RED,   fontWeight: 600 }}>🐻 {bearish_pct}%</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {total} {zh ? '条评论' : 'comments'}
        </span>
      </div>
    </div>
  )
}

function CommentCard({ comment, zh, onLike }) {
  const cfg = SENT_CFG[comment.sentiment] || SENT_CFG.neutral
  const initial = (comment.nickname || '?')[0].toUpperCase()
  const [liked, setLiked] = useState(comment.liked)
  const [likes, setLikes] = useState(comment.likes)

  const handleLike = async () => {
    const newLiked = !liked
    setLiked(newLiked)
    setLikes(l => newLiked ? l + 1 : Math.max(0, l - 1))
    try { await onLike(comment.id, newLiked) }
    catch { setLiked(!newLiked); setLikes(l => newLiked ? Math.max(0, l - 1) : l + 1) }
  }

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '12px 0',
      borderBottom: '1px solid var(--border-primary)',
    }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: avatarColor(comment.nickname),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#fff',
      }}>
        {initial}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: name + sentiment + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {comment.nickname}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`,
          }}>
            {cfg.icon} {zh ? cfg.label_zh : cfg.label_en}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {relativeTime(comment.timestamp, zh)}
          </span>
        </div>

        {/* Content */}
        <div style={{
          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65,
          wordBreak: 'break-word', marginBottom: 6,
        }}>
          {comment.content}
        </div>

        {/* Like */}
        <button
          onClick={handleLike}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
            display: 'flex', alignItems: 'center', gap: 4,
            color: liked ? ACCENT : 'var(--text-muted)',
            fontSize: 12, transition: 'color 0.15s',
          }}
        >
          {liked ? '👍' : '👍'} {likes > 0 && likes}
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CommentsPanel({ stocks, lang }) {
  useThemeStore((s) => s.theme)
  const zh = lang === 'zh'

  // Use first selected stock
  const symbol = stocks?.[0]?.code || ''

  const [comments, setComments]   = useState([])
  const [stats, setStats]         = useState(null)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [loading, setLoading]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  // Form state
  const [nickname, setNickname]   = useState(() => localStorage.getItem('bfs_nickname') || '')
  const [content, setContent]     = useState('')
  const [sentiment, setSentiment] = useState('bullish')

  const deviceId = getDeviceId()
  const listRef = useRef(null)

  const fetchComments = useCallback(async (p = 1, reset = false) => {
    if (!symbol) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/comments/${symbol}?page=${p}&limit=20&device_id=${deviceId}`)
      const data = await res.json()
      setComments(prev => reset ? data.comments : [...prev, ...data.comments])
      setStats(data.stats)
      setPage(data.page)
      setPages(data.pages)
    } catch (e) {
      setError(zh ? '加载失败' : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [symbol, deviceId, zh])

  useEffect(() => {
    setComments([])
    setPage(1)
    setStats(null)
    setError('')
    if (symbol) fetchComments(1, true)
  }, [symbol])

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    const nick = nickname.trim() || (zh ? '匿名用户' : 'Anonymous')
    const text = content.trim()
    if (text.length < 10) {
      setError(zh ? '评论至少10个字符' : 'Min 10 characters')
      return
    }
    if (text.length > 500) {
      setError(zh ? '评论最多500字符' : 'Max 500 characters')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/comments/${symbol}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nick, content: text, sentiment, device_id: deviceId }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || (zh ? '发送失败' : 'Failed to post'))
        return
      }
      localStorage.setItem('bfs_nickname', nick)
      setContent('')
      setSuccess(zh ? '评论已发送！' : 'Comment posted!')
      setTimeout(() => setSuccess(''), 3000)
      // Reload page 1
      await fetchComments(1, true)
    } catch {
      setError(zh ? '网络错误' : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (commentId) => {
    await fetch(`${API}/api/comments/${symbol}/${commentId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    })
  }

  if (!symbol) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
        {zh ? '请先选择一只股票' : 'Please select a stock first'}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>

      {/* ── Sentiment stats ── */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          📊 {symbol} {zh ? '社区情绪' : 'Community Sentiment'}
        </div>
        <SentimentBar stats={stats} zh={zh} />
      </div>

      {/* ── Post comment ── */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          ✍️ {zh ? '发表看法' : 'Share Your View'}
        </div>

        {/* Nickname */}
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          maxLength={30}
          placeholder={zh ? '你的昵称（可选）' : 'Nickname (optional)'}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
            borderRadius: 8, color: 'var(--text-primary)',
            padding: '7px 12px', fontSize: 13, outline: 'none',
            marginBottom: 10,
          }}
          onFocus={e => e.target.style.borderColor = ACCENT}
          onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
        />

        {/* Content */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={zh ? '分享你对这只股票的看法...' : 'Share your view on this stock...'}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
              borderRadius: 8, color: 'var(--text-primary)',
              padding: '9px 12px', fontSize: 13, outline: 'none',
              resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = ACCENT}
            onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
          />
          <span style={{
            position: 'absolute', bottom: 8, right: 10,
            fontSize: 11, color: content.length > 450 ? RED : 'var(--text-muted)',
            pointerEvents: 'none',
          }}>
            {content.length}/500
          </span>
        </div>

        {/* Sentiment selector + submit */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {(['bullish', 'neutral', 'bearish']).map(s => {
            const cfg = SENT_CFG[s]
            const active = sentiment === s
            return (
              <button
                key={s}
                onClick={() => setSentiment(s)}
                style={{
                  padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                  fontSize: 12, fontWeight: active ? 700 : 400,
                  border: `1px solid ${active ? cfg.color : 'var(--border-primary)'}`,
                  background: active ? cfg.bg : 'transparent',
                  color: active ? cfg.color : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {cfg.icon} {zh ? cfg.label_zh : cfg.label_en}
              </button>
            )
          })}

          <button
            onClick={handleSubmit}
            disabled={submitting || content.trim().length < 10}
            style={{
              marginLeft: 'auto', padding: '6px 20px', borderRadius: 20,
              border: 'none', cursor: submitting || content.trim().length < 10 ? 'default' : 'pointer',
              background: submitting || content.trim().length < 10
                ? 'var(--bg-tertiary)'
                : `linear-gradient(135deg, ${ACCENT}, #38bdf8)`,
              color: submitting || content.trim().length < 10 ? 'var(--text-muted)' : '#fff',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            }}
          >
            {submitting ? '...' : (zh ? '发送' : 'Post')}
          </button>
        </div>

        {error   && <div style={{ marginTop: 8, fontSize: 12, color: RED   }}>{error}</div>}
        {success && <div style={{ marginTop: 8, fontSize: 12, color: GREEN }}>{success}</div>}
      </div>

      {/* ── Comment list ── */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        borderRadius: 12, padding: '14px 18px',
      }} ref={listRef}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          💬 {zh ? '全部评论' : 'All Comments'}
          {stats?.total > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              ({stats.total})
            </span>
          )}
        </div>

        {loading && comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            {zh ? '加载中...' : 'Loading...'}
          </div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            {zh ? '还没有评论，来抢沙发！' : 'No comments yet — be the first!'}
          </div>
        ) : (
          <>
            {comments.map(c => (
              <CommentCard key={c.id} comment={c} zh={zh} onLike={handleLike} />
            ))}

            {/* Load more */}
            {page < pages && (
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button
                  onClick={() => fetchComments(page + 1)}
                  disabled={loading}
                  style={{
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                    borderRadius: 20, padding: '6px 22px',
                    color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {loading ? '...' : (zh ? '加载更多' : 'Load more')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
