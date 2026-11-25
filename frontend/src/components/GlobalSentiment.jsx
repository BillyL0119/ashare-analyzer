import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useMobile } from '../hooks/useMobile'
import { T } from '../i18n/translations'
import { changePctColor, changePctBg, changePctBorder, CN_INDEX_EN } from './globalSentimentColors'

const loadWorldMap = () => import('./WorldMap')
const WorldMap = lazy(loadWorldMap)

// ── Sentiment gauge ───────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s < 25) return '#e5484d'
  if (s < 45) return '#f97316'
  if (s < 55) return '#fbbf24'
  if (s < 75) return '#84cc16'
  return '#3fb67a'
}

// Semicircle gauge in plain SVG: soft full-range track, a progress arc in the same five-colour
// scale ending in a knob at the score, and the score itself set large in the middle.
const GAUGE_STOPS = ['#e5484d', '#f97316', '#fbbf24', '#84cc16', '#3fb67a']

function SemiGauge({ score, id }) {
  const [shown, setShown] = useState(0)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(score)); return () => cancelAnimationFrame(r) }, [score])
  const W = 160, R = 66, CX = W / 2, CY = 78, SW = 11
  const arc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`
  const len = Math.PI * R
  const v = Math.max(0, Math.min(100, shown))
  const a = Math.PI * (1 - v / 100)                       // 180° at 0, 0° at 100
  const kx = CX + R * Math.cos(a), ky = CY - R * Math.sin(a)
  const ease = 'cubic-bezier(.22,1,.36,1)'
  return (
    <svg viewBox={`0 0 ${W} ${CY + SW / 2 + 2}`} width="100%" style={{ display: 'block', maxWidth: 160, margin: '0 auto', overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id={`g-${id}`} x1={CX - R} y1="0" x2={CX + R} y2="0" gradientUnits="userSpaceOnUse">
          {GAUGE_STOPS.map((c, i) => <stop key={c} offset={`${(i / (GAUGE_STOPS.length - 1)) * 100}%`} stopColor={c} />)}
        </linearGradient>
      </defs>
      <path d={arc} fill="none" stroke={`url(#g-${id})`} strokeOpacity="0.16" strokeWidth={SW} strokeLinecap="round" />
      <path d={arc} fill="none" stroke={`url(#g-${id})`} strokeWidth={SW} strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - v / 100)}
        style={{ transition: `stroke-dashoffset 1.1s ${ease}` }} />
      <circle cx={kx} cy={ky} r={SW / 2 + 2.5} fill="#fff" stroke={scoreColor(score)} strokeWidth="3"
        style={{ transition: `cx 1.1s ${ease}, cy 1.1s ${ease}`, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.35))' }} />
    </svg>
  )
}

// What each part of the index measures (0 = fear, 100 = greed)
const PART_LABEL = {
  rsi:      { zh: 'RSI', en: 'RSI', tipZh: '14日相对强弱指数', tipEn: '14-day relative strength index' },
  range52w: { zh: '52周位置', en: '52-wk', tipZh: '指数距一年高点的距离', tipEn: 'How close the index is to its 52-week high' },
  vix:      { zh: 'VIX', en: 'VIX', tipZh: '波动率指数，越低越贪婪', tipEn: 'Volatility index: lower means greedier' },
  breadth:  { zh: '涨跌家数', en: 'Breadth', tipZh: '上涨股票占比', tipEn: 'Share of stocks that rose' },
}

function GaugeCard({ title, score, labelZh, labelEn, vix, zh, parts, id }) {
  const label = zh ? labelZh : labelEn
  const color = scoreColor(score)
  return (
    <div className="bfs-card" style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
      borderRadius: 14, padding: '12px 10px 10px', textAlign: 'center', fontFamily: 'var(--sans)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0 }}>
        {title}
      </div>
      <div style={{ position: 'relative', marginTop: 6 }}>
        <SemiGauge score={score} id={id} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: -2, lineHeight: 1 }}>
          <div className="serif-num" style={{ fontSize: 36, color: 'var(--text-primary)' }}>
            {Math.round(score)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <span style={{
          display: 'inline-block', padding: '3px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, letterSpacing: '.01em',
          color, background: `color-mix(in srgb, ${color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
        }}>{label}</span>
      </div>
      {parts?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${parts.length}, minmax(0, 1fr))`, marginTop: 10,
          borderTop: '1px solid var(--border-primary)', paddingTop: 8 }}>
          {parts.map((p, i) => {
            const l = PART_LABEL[p.key] || { zh: p.key, en: p.key }
            const raw = p.key === 'vix' && (p.value ?? vix) != null ? Number(p.value ?? vix).toFixed(1) : null
            return (
              <div key={p.key} title={zh ? l.tipZh : l.tipEn}
                style={{ borderLeft: i ? '1px solid var(--border-primary)' : 'none', padding: '0 4px', minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {zh ? l.zh : l.en}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, color: scoreColor(p.score), fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(p.score)}
                </div>
                {raw && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{raw}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Scrolling ticker bar ──────────────────────────────────────────────────────
// The backend names A-share indices in Chinese; other languages get the usual English names

function TickerBar({ indices, zh }) {
  const wrapRef = useRef(null)
  // The strip scrolls with a CSS transform animation (the browser's compositor does it, no JavaScript per frame),
  // and stops while it is off screen. It used to move scrollLeft from a 24 ms timer, which kept the page
  // re-laying-out all day.
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => el.classList.toggle('bfs-ticker-off', !e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const doubled = [...indices, ...indices]
  return (
    <div ref={wrapRef} className="bfs-ticker" style={{ overflow: 'hidden', padding: '4px 0 2px', marginTop: 6, userSelect: 'none' }}>
      <div className="bfs-ticker-track" style={{ display: 'flex', width: 'max-content', animationDuration: `${Math.max(20, indices.length * 6)}s` }}>
      {doubled.map((idx, i) => {
        const pct = idx.change_pct
        return (
          <div key={i} style={{
            flexShrink: 0, minWidth: 100, marginRight: 8,
            background: changePctBg(pct), border: `1px solid ${changePctBorder(pct)}`,
            borderRadius: 8, padding: '4px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap' }}>
              {zh ? (idx.name_zh || idx.name) : (CN_INDEX_EN[idx.name] || idx.name)}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: changePctColor(pct) }}>
              {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {idx.close != null ? Number(idx.close).toLocaleString() : '—'}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  const isMobile = useMobile()
  return (
    <div className="skeleton-appear" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      {/* Map + gauges row */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14, flex: 1, minHeight: 0 }}>
        {/* Map placeholder */}
        <div className="skeleton" style={{
          flex: isMobile ? 'none' : '1 1 0',
          height: isMobile ? 200 : '100%', minHeight: isMobile ? 200 : 240,
          borderRadius: 8,
        }} />
        {/* Gauge cards */}
        <div style={{ flex: isMobile ? 'none' : '0 0 192px', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 8 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 10px', borderRadius: 10, border: '1px solid rgba(108,156,255,0.08)' }}>
              <div className="skeleton" style={{ height: 10, width: '60%', margin: '0 auto' }} />
              {/* Gauge arc placeholder */}
              <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 10, width: '50%', margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Ticker bar placeholders */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, overflow: 'hidden' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ flexShrink: 0, width: 100, borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(108,156,255,0.07)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ height: 9, width: '70%' }} />
            <div className="skeleton" style={{ height: 13, width: '55%' }} />
            <div className="skeleton" style={{ height: 9, width: '45%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

const SENTIMENT_RETRIES = 5
const SENTIMENT_RETRY_MS = 20000

// ── Main export ───────────────────────────────────────────────────────────────
export default function GlobalSentiment({ lang }) {
  useEffect(() => { loadWorldMap().catch(() => {}) }, [])     // fetch the map file while the data loads
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)    // failed loads so far; the panel retries up to RETRIES times
  const [collapsed, setCollapsed] = useState(false)
  const t = T[lang] || T.en
  const zh = lang === 'zh'
  const isMobile = useMobile()

  useEffect(() => {
    let cancelled = false
    let timer
    const load = (n) => {
      fetch('/api/market/sentiment')
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)   // 503 while the server warms up
          return r.json()
        })
        .then(d => {
          // both sides must carry a real score: a missing one is "unavailable", never a made-up 50
          if (typeof d?.us_sentiment?.score !== 'number' || typeof d?.cn_sentiment?.score !== 'number') {
            throw new Error('no sentiment')
          }
          if (cancelled) return
          setData(d)
          setAttempt(0)
          setLoading(false)
        })
        .catch(() => {
          if (cancelled) return
          setLoading(false)
          setAttempt(n + 1)
          if (n < SENTIMENT_RETRIES) timer = setTimeout(() => load(n + 1), SENTIMENT_RETRY_MS)
        })
    }
    load(0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  const unavailable = !loading && !data       // nothing real to show yet (a refresh failing keeps the last good data)
  const retrying = unavailable && attempt <= SENTIMENT_RETRIES
  const usScore = data?.us_sentiment?.score
  const cnScore = data?.cn_sentiment?.score
  const dot = unavailable ? '#9ca3af' : loading ? '#fbbf24' : '#3fb67a'
  const indices = data?.indices ?? []
  const updTime = data?.updated_at?.slice(11, 16) ?? ''

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
      borderRadius: 12,
      marginBottom: 10,
      height: 'calc(100vh - 130px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 14px', cursor: 'pointer', flexShrink: 0, height: 36,
          borderBottom: collapsed ? 'none' : '1px solid var(--border-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: dot,
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {t.gsTitle}
          </span>
          {updTime && !loading && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {t.gsUpdated(updTime)}
            </span>
          )}
        </div>
        <span className={`bfs-chevron${collapsed ? '' : ' is-open'}`} style={{ fontSize: 11, color: 'var(--text-muted)', userSelect: 'none' }}>
          ▼
        </span>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div style={{ padding: '0 8px 4px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {loading ? (
            <LoadingSkeleton />
          ) : unavailable ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              fontSize: 12, color: 'var(--text-muted)', padding: 16,
            }}>
              {retrying
                ? (zh ? '数据暂时不可用，正在重试…' : 'Data unavailable, retrying…')
                : (zh ? '数据暂时不可用，请稍后刷新页面。' : 'Data unavailable. Please reload the page in a moment.')}
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.5s ease both', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              {/* Map + Gauges */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, flex: 1, minHeight: 0, alignItems: 'stretch' }}>
                {/* World map */}
                <div style={{ flex: isMobile ? 'none' : '1 1 0', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <Suspense fallback={<div className="skeleton" style={{ flex: 1, minHeight: 180, borderRadius: 8 }} />}>
                    <WorldMap indices={indices} lang={lang} />
                  </Suspense>
                </div>

                {/* Sentiment gauges */}
                <div style={{ flex: isMobile ? 'none' : '0 0 192px', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 8, overflowY: isMobile ? 'visible' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  {!isMobile && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.3px' }}>
                      {t.gsSentIndex}
                    </div>
                  )}
                  <div style={{ flex: isMobile ? '1 1 45%' : 'none' }}>
                    <GaugeCard
                      title={t.gsUSSent}
                      score={usScore}
                      labelZh={data?.us_sentiment?.label_zh}
                      labelEn={data?.us_sentiment?.label_en}
                      vix={data?.us_sentiment?.vix}
                      parts={data?.us_sentiment?.components}
                      zh={zh}
                      id="us"
                    />
                  </div>
                  <div style={{ flex: isMobile ? '1 1 45%' : 'none' }}>
                    <GaugeCard
                      title={t.gsCNSent}
                      score={cnScore}
                      labelZh={data?.cn_sentiment?.label_zh}
                      labelEn={data?.cn_sentiment?.label_en}
                      parts={data?.cn_sentiment?.components}
                      zh={zh}
                      id="cn"
                    />
                  </div>
                  {!isMobile && (
                    <div style={{
                      fontSize: 10, lineHeight: 1.6, color: 'var(--text-muted)',
                      padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 8, border: '1px solid var(--border-primary)',
                    }}>
                      {zh
                        ? '0 = 极度恐慌，100 = 极度贪婪。由 RSI、距 52 周高点、VIX 和涨跌家数合成，仅供学习。'
                        : '0 = extreme fear, 100 = extreme greed. Built from RSI, distance to the 52-week high, VIX and market breadth. For learning only.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Ticker bar */}
              <div style={{ flexShrink: 0 }}>
                <TickerBar indices={indices} zh={zh} />
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
