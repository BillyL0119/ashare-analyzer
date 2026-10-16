import { useState, useEffect } from 'react'
import { T } from '../i18n/translations'

const TYPE_CONFIG = {
  earnings: { zh: '财报', en: 'Earnings', ja: '決算', ko: '실적', fr: 'Résultats', color: '#4a90e2', bg: 'rgba(74,144,226,0.15)' },
  dividend: { zh: '分红', en: 'Dividend', ja: '配当', ko: '배당', fr: 'Dividende', color: '#26a69a', bg: 'rgba(38,166,154,0.15)' },
  ipo:      { zh: '新股', en: 'IPO',      ja: 'IPO',  ko: 'IPO',  fr: 'IPO',       color: '#ffa726', bg: 'rgba(255,167,38,0.15)' },
  holiday:  { zh: '假期', en: 'Holiday',  ja: '休日', ko: '휴일', fr: 'Férié',     color: 'var(--text-muted)', bg: 'rgba(154,160,166,0.12)' },
}

function getLang(cfg, lang) {
  return cfg[lang] || cfg.en
}

function TypeTag({ type, lang }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.holiday
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 'var(--radius)',
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      letterSpacing: '0.2px',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {getLang(cfg, lang)}
    </span>
  )
}

function EventRow({ event, lang, t, onStockClick }) {
  const hasStock = event.symbol && event.type !== 'holiday'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderBottom: '1px solid color-mix(in srgb, var(--accent) 7%, transparent)',
      transition: 'background 0.12s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 4%, transparent)' }}
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
            color: 'var(--accent)',
            fontFamily: 'var(--sans)',
            fontSize: 12,
            padding: 0,
            textDecoration: 'underline dotted',
          }}
          title={t.calClickHint}
        >
          {event.symbol}
        </button>
      ) : null}

      <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {hasStock ? event.name : null}
        {hasStock ? ' · ' : null}
        {lang === 'zh' ? event.title : (event.title_en || event.title)}
      </span>
    </div>
  )
}

function DateGroup({ dateStr, events, lang, t, onStockClick }) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  const dayLabel = diff === 0 ? t.calToday
    : diff === 1 ? t.calTomorrow
    : `+${diff}d`

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px',
        background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
        borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid color-mix(in srgb, var(--accent) 12%, transparent)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--sans)' }}>
          {dateStr}
        </span>
        <span style={{
          fontSize: 11,
          color: diff <= 1 ? '#ffa726' : 'var(--text-muted)',
          background: diff <= 1 ? 'rgba(255,167,38,0.12)' : 'transparent',
          borderRadius: 6,
          padding: diff <= 1 ? '1px 6px' : 0,
          fontWeight: diff <= 1 ? 600 : 400,
        }}>
          {dayLabel}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {events.length} {t.calEventsUnit}
        </span>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '0 0 8px 8px', border: '1px solid color-mix(in srgb, var(--accent) 8%, transparent)', borderTop: 'none' }}>
        {events.map((ev, i) => (
          <EventRow key={i} event={ev} lang={lang} t={t} onStockClick={onStockClick} />
        ))}
      </div>
    </div>
  )
}

export default function CalendarPanel({ lang, onStockSelect }) {
  const t = T[lang] || T.en
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    // Right after a server restart the calendar is still being built ({loading: true}): ask again
    let alive = true, timer, tries = 0
    const load = () => fetch('/api/calendar/events')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        if (d.loading && tries++ < 12) { timer = setTimeout(load, 8000); return }
        setData(d); setLoading(false)
      })
      .catch(() => { if (alive) setLoading(false) })
    load()
    return () => { alive = false; clearTimeout(timer) }
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
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', }}>
          {t.calTitle}
        </div>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {types.map((type) => {
          const cfg = TYPE_CONFIG[type]
          const active = filter === type
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: active ? 700 : 400,
                background: active
                  ? (cfg ? cfg.bg : 'color-mix(in srgb, var(--accent) 15%, transparent)')
                  : 'var(--bg-hover)',
                color: active
                  ? (cfg ? cfg.color : 'var(--accent)')
                  : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {type === 'all' ? t.calAll : getLang(cfg, lang)}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
          {t.calLoading}
        </div>
      ) : dates.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
          {t.calEmpty}
        </div>
      ) : (
        <div>
          {dates.map((d) => (
            <DateGroup
              key={d}
              dateStr={d}
              events={groups[d]}
              lang={lang}
              t={t}
              onStockClick={onStockSelect}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        {t.calFooter}
      </div>
    </div>
  )
}
