import { useState, useEffect } from 'react'
import { T } from '../i18n/translations'
import { getKnowledgeToday } from '../api/stockApi'

const LS_KEY = 'bfs_knowledge_date'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function KnowledgeCard({ lang }) {
  const t = T[lang]
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  // Auto-open once per day
  useEffect(() => {
    const seen = localStorage.getItem(LS_KEY)
    if (seen !== todayStr()) {
      setOpen(true)
      localStorage.setItem(LS_KEY, todayStr())
    }
  }, [])

  // Fetch when opened for the first time
  useEffect(() => {
    if (open && !data && !loading) {
      setLoading(true)
      getKnowledgeToday()
        .then((res) => setData(res.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const content = data ? (lang === 'zh' ? data.content_zh : data.content_en) : null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {/* Expanded card */}
      {open && (
        <div
          style={{
            width: 320,
            background: 'rgba(12, 18, 30, 0.97)',
            border: '1px solid rgba(138,180,248,0.18)',
            borderRadius: 14,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(138,180,248,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Top bar with gradient */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(138,180,248,0.15), rgba(192,132,252,0.15))',
              borderBottom: '1px solid rgba(138,180,248,0.12)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>
              {t.knowledgeBtn}
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9aa0a6',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                padding: '0 2px',
              }}
            >
              {t.knowledgeClose}
            </button>
          </div>

          <div style={{ padding: '12px 14px 14px' }}>
            {loading && (
              <div style={{ color: '#9aa0a6', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                ...
              </div>
            )}

            {data && !loading && (
              <>
                {/* Category pill + difficulty */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: `${data.category_color}20`,
                      color: data.category_color,
                      border: `1px solid ${data.category_color}40`,
                      letterSpacing: '0.03em',
                    }}
                  >
                    {data.category}
                  </span>
                  <span style={{ fontSize: 11, color: '#9aa0a6' }}>
                    {t.knowledgeDifficulty}: {data.difficulty}
                  </span>
                </div>

                {/* Topic */}
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e8eaed', marginBottom: 8 }}>
                  {data.topic}
                </div>

                {/* Content */}
                <div style={{ fontSize: 13, color: '#c0c6d0', lineHeight: 1.65, marginBottom: 10 }}>
                  {content}
                </div>

                {/* Formula */}
                {data.key_formula && (
                  <div
                    style={{
                      background: 'rgba(138,180,248,0.07)',
                      border: '1px solid rgba(138,180,248,0.18)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#8ab4f8', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t.knowledgeFormula}
                    </div>
                    <div style={{ fontSize: 12, color: '#c0c6d0', fontFamily: 'monospace', lineHeight: 1.5 }}>
                      {data.key_formula}
                    </div>
                  </div>
                )}

                {/* Example */}
                {data.example && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#26a69a', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t.knowledgeExample}
                    </div>
                    <div style={{ fontSize: 12, color: '#9aa0a6', lineHeight: 1.55 }}>
                      {data.example}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {data.tags && data.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {data.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          color: '#9aa0a6',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 6,
                          padding: '2px 7px',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Collapsed trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: 'linear-gradient(135deg, rgba(138,180,248,0.2), rgba(192,132,252,0.2))',
            border: '1px solid rgba(138,180,248,0.3)',
            borderRadius: 20,
            padding: '8px 16px',
            color: '#c8d4f0',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(138,180,248,0.6)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(138,180,248,0.3)' }}
        >
          {t.knowledgeBtn}
        </button>
      )}
    </div>
  )
}
