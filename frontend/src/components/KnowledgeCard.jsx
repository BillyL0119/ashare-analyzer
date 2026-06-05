import { useState, useEffect } from 'react'
import { T } from '../i18n/translations'
import { getKnowledgeToday } from '../api/stockApi'

const LS_KEY = 'bfs_knowledge_date'
const CATEGORY_COLOR = {
  '宏观经济': '#c084fc',
  '微观经济': '#a78bfa',
  '估值':    '#8ab4f8',
  '技术分析': '#26a69a',
  '基本面':  '#ffa726',
  'A股特色': '#f06292',
  '投资理念': '#66bb6a',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function CardPanel({ item, lang }) {
  if (!item) return null
  const topic   = lang === 'zh' ? item.topic_zh   : item.topic_en
  const content = lang === 'zh' ? item.content_zh : item.content_en
  const color   = CATEGORY_COLOR[item.category] || '#8ab4f8'

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Category + difficulty */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          background: `${color}20`, color, border: `1px solid ${color}40`,
        }}>
          {item.category}
        </span>
        <span style={{ fontSize: 11, color: '#9aa0a6' }}>
          {'⭐'.repeat(Number(item.difficulty) || 1)}
        </span>
      </div>

      {/* Topic */}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
        {topic}
      </div>

      {/* Content */}
      <div style={{ fontSize: 12, color: '#c0c6d0', lineHeight: 1.65, marginBottom: 8 }}>
        {content}
      </div>

      {/* Formula */}
      {item.key_formula && (
        <div style={{
          background: 'rgba(138,180,248,0.07)',
          border: '1px solid rgba(138,180,248,0.18)',
          borderRadius: 6, padding: '6px 10px', marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, color: '#8ab4f8', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Formula
          </div>
          <div style={{ fontSize: 11, color: '#c0c6d0', fontFamily: 'monospace', lineHeight: 1.5 }}>
            {item.key_formula}
          </div>
        </div>
      )}

      {/* Example */}
      {item.example && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: '#26a69a', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Example
          </div>
          <div style={{ fontSize: 11, color: '#9aa0a6', lineHeight: 1.55 }}>
            {item.example}
          </div>
        </div>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {item.tags.map((tag) => (
            <span key={tag} style={{
              fontSize: 10, color: '#9aa0a6',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 5, padding: '2px 6px',
            }}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function KnowledgeCard({ lang, open, onClose }) {
  const t = T[lang]
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState('economics')  // 'economics' | 'finance'

  // Fetch when first opened
  useEffect(() => {
    if (open && !data && !loading) {
      setLoading(true)
      getKnowledgeToday()
        .then((res) => setData(res.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const TAB_LABEL = {
    economics: lang === 'zh' ? '宏观经济' : 'Economics',
    finance:   lang === 'zh' ? '金融分析' : 'Finance',
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', top: 56, right: 16, zIndex: 900,
      width: 320,
      background: 'rgba(6, 15, 30, 0.98)',
      border: '1px solid #1a2f50',
      borderRadius: 14,
      boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px #2a4a7f',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(139,92,246,0.12))',
        borderBottom: '1px solid #1a2f50',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
          💡 {t.knowledgeBtn}
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#94a3b8',
          cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px',
        }}>
          {t.knowledgeClose}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a2f50' }}>
        {['economics', 'finance'].map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, padding: '7px 0', fontSize: 12, fontWeight: tab === key ? 700 : 400,
              border: 'none', cursor: 'pointer',
              background: tab === key ? 'rgba(14,165,233,0.08)' : 'transparent',
              color: tab === key ? '#0ea5e9' : '#94a3b8',
              borderBottom: tab === key ? '2px solid #0ea5e9' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {TAB_LABEL[key]}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 14px 14px' }}>
        {loading && (
          <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            ...
          </div>
        )}
        {data && !loading && (
          <CardPanel item={data[tab]} lang={lang} />
        )}
      </div>
    </div>
  )
}
