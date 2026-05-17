import { useState, useEffect } from 'react'

const TYPE_CONFIG = {
  earnings: { zh: '财报', en: 'Earnings', color: '#4a90e2', bg: 'rgba(74,144,226,0.15)' },
  dividend: { zh: '分红', en: 'Dividend', color: '#26a69a', bg: 'rgba(38,166,154,0.15)' },
  ipo:      { zh: '新股', en: 'IPO',      color: '#ffa726', bg: 'rgba(255,167,38,0.15)' },
  holiday:  { zh: '假期', en: 'Holiday',  color: '#9aa0a6', bg: 'rgba(154,160,166,0.12)' },
}

function TypeTag({ type, lang }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.holiday
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 7px',
      borderRadius: 10,
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      letterSpacing: '0.2px',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {lang === 'zh' ? cfg.zh : cfg.en}
    </span>
  )
}

function EventRow({ event, lang, onStockClick }) {
  const hasStock = event.symbol && event.type !== 'holiday'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderBottom: '1px solid rgba(138,180,248,0.07)',
      transition: 'background 0.12s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(138,180,248,0.04)' }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <TypeTag type={event.type} lang={lang} />

      {hasStock ? (
        <button
          onClick={() => onStockClick(event.symbol, event.name)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#8ab4f8',
            fontFamily: 'monospace',
            fontSize: 12,
            padding: 0,
            textDecoration: 'underline dotted',
          }}
          title={lang === 'zh' ? '点击分析' : 'Click to analyze'}
        >
          {event.symbol}
        </button>
      ) : null}

      <span style={{ fontSize: 13, color: '#e8eaed', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {hasStock ? event.name : null}
        {hasStock ? ' · ' : null}
        {lang === 'zh' ? event.title : event.title_en}
      </span>
    </div>
  )
}

function DateGroup({ dateStr, events, lang, onStockClick }) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  const dayLabel = diff === 0 ? (lang === 'zh' ? '今天' : 'Today')
    : diff === 1 ? (lang === 'zh' ? '明天' : 'Tomorrow')
    : `+${diff}d`

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px',
        background: 'rgba(138,180,248,0.06)',
        borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid rgba(138,180,248,0.12)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#8ab4f8', fontFamily: 'monospace' }}>
          {dateStr}
        </span>
        <span style={{
          fontSize: 11,
          color: diff <= 1 ? '#ffa726' : '#4a5568',
          background: diff <= 1 ? 'rgba(255,167,38,0.12)' : 'transparent',
          borderRadius: 6,
          padding: diff <= 1 ? '1px 6px' : 0,
          fontWeight: diff <= 1 ? 600 : 400,
        }}>
          {dayLabel}
        </span>
        <span style={{ fontSize: 11, color: '#4a5568', marginLeft: 'auto' }}>
          {events.length} {lang === 'zh' ? '件' : 'events'}
        </span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.015)', borderRadius: '0 0 8px 8px', border: '1px solid rgba(138,180,248,0.08)', borderTop: 'none' }}>
        {events.map((ev, i) => (
          <EventRow key={i} event={ev} lang={lang} onStockClick={onStockClick} />
        ))}
      </div>
    </div>
  )
}

export default function CalendarPanel({ lang, onStockSelect }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    fetch('/api/calendar/events')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => console.error('calendar:', e))
      .finally(() => setLoading(false))
  }, [])

  const types = ['all', 'earnings', 'dividend', 'ipo', 'holiday']

  const filtered = (data?.events || []).filter(
    (e) => filter === 'all' || e.type === filter
  )

  // Group by date
  const groups = {}
  for (const ev of filtered) {
    if (!groups[ev.date]) groups[ev.date] = []
    groups[ev.date].push(ev)
  }
  const dates = Object.keys(groups).sort()

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600, background: 'linear-gradient(90deg,#8ab4f8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {lang === 'zh' ? 'A股日历 · 未来30天' : 'A-Share Calendar · Next 30 Days'}
        </div>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {types.map((t) => {
          const cfg = TYPE_CONFIG[t]
          const active = filter === t
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '4px 12px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: active ? 700 : 400,
                background: active
                  ? (cfg ? cfg.bg : 'rgba(138,180,248,0.15)')
                  : 'rgba(255,255,255,0.05)',
                color: active
                  ? (cfg ? cfg.color : '#8ab4f8')
                  : '#9aa0a6',
                transition: 'all 0.15s',
              }}
            >
              {t === 'all'
                ? (lang === 'zh' ? '全部' : 'All')
                : (lang === 'zh' ? TYPE_CONFIG[t].zh : TYPE_CONFIG[t].en)
              }
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: '#9aa0a6', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
          {lang === 'zh' ? '加载日历数据...' : 'Loading calendar data...'}
        </div>
      ) : dates.length === 0 ? (
        <div style={{ color: '#9aa0a6', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
          {lang === 'zh' ? '未来30天暂无事件' : 'No events in the next 30 days'}
        </div>
      ) : (
        <div>
          {dates.map((d) => (
            <DateGroup
              key={d}
              dateStr={d}
              events={groups[d]}
              lang={lang}
              onStockClick={onStockSelect}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: '#4a5568', textAlign: 'center' }}>
        {lang === 'zh'
          ? '点击股票代码可加载到主分析页 · 数据来源：东方财富 / 巨潮资讯'
          : 'Click stock code to load analysis · Source: EastMoney / CNINFO'
        }
      </div>
    </div>
  )
}
