import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_BASE || ''

// ── palette ──────────────────────────────────────────────────────────────────
const BLUE   = '#0ea5e9'
const PURPLE = '#8b5cf6'
const GREEN  = '#10b981'
const AMBER  = '#f59e0b'

const REGIONS = [
  { key: '',              label: 'All',        label_cn: '全部' },
  { key: 'north_america', label: 'North America', label_cn: '北美' },
  { key: 'uk',            label: 'UK',         label_cn: '英国' },
  { key: 'europe',        label: 'Europe',     label_cn: '欧洲' },
  { key: 'asia',          label: 'Asia',       label_cn: '亚洲' },
  { key: 'oceania',       label: 'Oceania',    label_cn: '大洋洲' },
]

const SPECIALTIES = ['Finance', 'Accounting', 'Economics', 'Consulting', 'Tech']

const SPECIALTY_COLORS = {
  Finance: '#0ea5e9', Accounting: '#8b5cf6', Economics: '#10b981',
  Marketing: '#f59e0b', Consulting: '#ef4444', Strategy: '#06b6d4',
  MBA: '#6366f1', Undergraduate: '#84cc16', Tech: '#f97316',
  Analytics: '#a78bfa', Entrepreneurship: '#34d399', STEM: '#fb923c',
}

function tagColor(tag) {
  for (const [k, v] of Object.entries(SPECIALTY_COLORS)) {
    if (tag.toLowerCase().includes(k.toLowerCase())) return v
  }
  return 'var(--text-muted)'
}

// Generate a deterministic gradient from school name
function schoolGradient(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h},55%,30%), hsl(${(h + 55) % 360},55%,20%))`
}

function initials(name) {
  const words = name.split(/[\s\-]+/).filter(w => w.length > 2)
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
      borderRadius: 14,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 8 }} />
      {[85, 60, 95, 50].map((w, i) => (
        <div key={i} className="skeleton" style={{ width: `${w}%`, height: i === 0 ? 16 : 12, borderRadius: 6 }} />
      ))}
    </div>
  )
}

// ── QS Rank badge ─────────────────────────────────────────────────────────────
function RankBadge({ rank }) {
  if (!rank) return null
  const isTop10  = rank <= 10
  const isTop50  = rank <= 50
  const color    = isTop10 ? AMBER : isTop50 ? BLUE : 'var(--text-muted)'
  return (
    <div style={{
      position: 'absolute', top: 12, left: 12,
      background: `${color}22`,
      border: `1px solid ${color}66`,
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: 11, fontWeight: 700, color,
    }}>
      QS #{rank}
    </div>
  )
}

// ── School logo ───────────────────────────────────────────────────────────────
function SchoolLogo({ name, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: schoolGradient(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 800, color: 'rgba(255,255,255,0.9)',
      letterSpacing: '-0.5px',
    }}>
      {initials(name)}
    </div>
  )
}

// ── Tag pill ──────────────────────────────────────────────────────────────────
function TagPill({ label }) {
  const color = tagColor(label)
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 20,
      background: `${color}20`, color,
      border: `1px solid ${color}40`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// ── Country flag helper ───────────────────────────────────────────────────────
function countryFlag(country) {
  const map = {
    'United States': '🇺🇸', 'Canada': '🇨🇦', 'United Kingdom': '🇬🇧',
    'France': '🇫🇷', 'France / Singapore': '🇫🇷🇸🇬',
    'Switzerland': '🇨🇭', 'Denmark': '🇩🇰', 'Netherlands': '🇳🇱',
    'Spain': '🇪🇸', 'Sweden': '🇸🇪',
    'Hong Kong': '🇭🇰', 'Singapore': '🇸🇬',
    'China': '🇨🇳', 'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Taiwan': '🇹🇼',
    'Australia': '🇦🇺', 'New Zealand': '🇳🇿',
  }
  return map[country] || '🌐'
}

// ── Modal tabs ────────────────────────────────────────────────────────────────
const MODAL_TABS = [
  { key: 'overview',     en: 'Overview',     zh: '概览' },
  { key: 'programs',     en: 'Programs',     zh: '项目' },
  { key: 'requirements', en: 'Requirements', zh: '申请要求' },
  { key: 'alumni',       en: 'Alumni',       zh: '知名校友' },
]

function InfoRow({ label, value, valueColor }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '9px 0', borderBottom: '1px solid var(--border-primary)', gap: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor || 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function UniModal({ uni, lang, onClose }) {
  const [tab, setTab] = useState('overview')
  const zh = lang === 'zh'

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const req = uni.requirements || {}
  const alumni = uni.alumni_detail || uni.notable_alumni || []
  const programs = uni.programs_detail || []

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 18,
        width: '100%', maxWidth: 800,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(14,165,233,0.1)',
        animation: 'bfsPageFadeIn 0.18s ease both',
      }}>

        {/* ── Hero header ── */}
        <div style={{
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-primary)',
          borderRadius: '18px 18px 0 0',
          padding: '20px 24px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
            <SchoolLogo name={uni.name} size={60} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 4 }}>
                {uni.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {uni.university}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {countryFlag(uni.country)} {uni.city}
                </span>
                {uni.language && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '1px 7px', borderRadius: 4,
                    border: '1px solid var(--border-primary)' }}>
                    {uni.language === 'english' ? (zh ? '英语授课' : 'English') : (zh ? '双语授课' : 'Bilingual')}
                  </span>
                )}
                {uni.established && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Est. {uni.established}
                  </span>
                )}
                {uni.qs_rank && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    background: `${AMBER}22`, color: AMBER, border: `1px solid ${AMBER}44` }}>
                    QS #{uni.qs_rank}
                  </span>
                )}
                {uni.business_rank && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                    background: `${BLUE}18`, color: BLUE, border: `1px solid ${BLUE}44` }}>
                    {uni.business_rank}
                  </span>
                )}
                <a href={uni.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
                    background: `${GREEN}18`, color: GREEN, border: `1px solid ${GREEN}44`,
                    textDecoration: 'none', marginLeft: 2 }}>
                  {zh ? '官网 →' : 'Website →'}
                </a>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid var(--border-primary)',
              color: 'var(--text-muted)', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', fontSize: 18, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >×</button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0 }}>
            {MODAL_TABS.map(({ key, en, zh: zhLabel }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: '10px 18px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 700 : 400,
                color: tab === key ? BLUE : 'var(--text-muted)',
                borderBottom: tab === key ? `2px solid ${BLUE}` : '2px solid transparent',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>
                {zh ? zhLabel : en}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab body (scrollable) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Overview ── */}
          {tab === 'overview' && (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0,
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                borderRadius: 10, padding: '14px 16px' }}>
                {zh ? uni.description_cn : uni.description_en}
              </p>

              {/* 2×2 data cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Tuition */}
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                  borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                    {zh ? '学费参考' : 'Tuition'}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: AMBER }}>{uni.tuition_usd || '—'}</div>
                </div>

                {/* Acceptance rate */}
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                  borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                    {zh ? '录取率' : 'Acceptance Rate'}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: GREEN }}>
                    {req.acceptance_rate || (zh ? '详见官网' : 'See website')}
                  </div>
                </div>

                {/* Specialties */}
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                  borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                    {zh ? '强势专业' : 'Specialties'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {(uni.specialties || []).map(s => <TagPill key={s} label={s} />)}
                  </div>
                </div>

                {/* Employment */}
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                  borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                    {zh ? '就业去向' : 'Top Employment'}
                  </div>
                  {uni.employment ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {uni.employment.slice(0, 4).map(e => (
                        <div key={e} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>• {e}</div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(uni.tags || []).map(tag => <TagPill key={tag} label={tag} />)}
              </div>
            </>
          )}

          {/* ── Programs ── */}
          {tab === 'programs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {programs.length > 0 ? programs.map((p, i) => (
                <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                  borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                        background: `${BLUE}18`, color: BLUE, border: `1px solid ${BLUE}33` }}>
                        {p.duration}
                      </span>
                      {p.language && p.language !== 'English' && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                          background: `${PURPLE}18`, color: PURPLE, border: `1px solid ${PURPLE}33` }}>
                          {p.language}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    {zh ? p.description_cn : p.description_en}
                  </div>
                </div>
              )) : (
                /* Fallback to simple programs list */
                (uni.programs || []).map(p => (
                  <div key={p} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                    borderRadius: 10, padding: '12px 16px',
                    fontSize: 14, fontWeight: 600, color: BLUE }}>
                    {p}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Requirements ── */}
          {tab === 'requirements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.keys(req).length > 0 ? (
                <>
                  <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                    borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
                      {zh ? '学术成绩' : 'Academic'}
                    </div>
                    <InfoRow label={zh ? '本科 GPA' : 'Undergraduate GPA'} value={req.gpa} />
                    <InfoRow label={zh ? 'GMAT 中位数' : 'GMAT Median'} value={req.gmat_median} valueColor={BLUE} />
                    <InfoRow label={zh ? 'GRE 可接受' : 'GRE Accepted'} value={req.gre_accepted ? (zh ? '是' : 'Yes') : (zh ? '否' : 'No')} />
                    <InfoRow label={zh ? '录取率' : 'Acceptance Rate'} value={req.acceptance_rate} valueColor={GREEN} />
                  </div>

                  <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                    borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
                      {zh ? '语言要求' : 'Language Requirements'}
                    </div>
                    <InfoRow label="TOEFL" value={req.toefl ? `${req.toefl}+` : null} valueColor={PURPLE} />
                    <InfoRow label="IELTS" value={req.ielts ? `${req.ielts}+` : null} valueColor={PURPLE} />
                  </div>

                  {req.deadlines && (
                    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                      borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
                        {zh ? '申请截止日期' : 'Application Deadlines'}
                      </div>
                      {['r1','r2','r3','r4'].map(r => req.deadlines[r] && (
                        <InfoRow key={r} label={`Round ${r[1]}`} value={req.deadlines[r]} valueColor={AMBER} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0', fontSize: 14 }}>
                  {zh ? '详细申请要求请访问官方网站' : 'Please visit the official website for detailed requirements'}
                  <br />
                  <a href={uni.url} target="_blank" rel="noopener noreferrer"
                    style={{ color: BLUE, fontSize: 13, marginTop: 8, display: 'inline-block' }}>
                    {uni.url}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── Alumni ── */}
          {tab === 'alumni' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alumni.length > 0 ? (
                typeof alumni[0] === 'string' ? (
                  /* Fallback: simple string list */
                  alumni.map(a => (
                    <div key={a} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                      borderRadius: 10, padding: '12px 16px',
                      fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {a}
                    </div>
                  ))
                ) : (
                  /* Rich alumni_detail format */
                  alumni.map((a, i) => (
                    <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                      borderRadius: 10, padding: '14px 16px',
                      display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: schoolGradient(a.name),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.9)',
                      }}>
                        {a.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{a.name}</div>
                          {a.year && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                              {zh ? `${a.year}届` : `Class of ${a.year}`}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{a.role}</div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0', fontSize: 14 }}>
                  {zh ? '暂无校友数据' : 'No alumni data available'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Interview: constants ───────────────────────────────────────────────────────
const IV_PROGRAMS = [
  '本科申请 Undergraduate', '预MBA Pre-MBA', 'MBA', '理学硕士 Master\'s / MSc',
  '金融硕士 MFin / MiF', '会计硕士 MAcc', '管理学硕士 MiM', '博士 PhD / DBA',
]
const IV_TESTS = ['SAT', 'ACT', 'A-Level', 'IB', 'GMAT', 'GRE', '高考', 'Other']

const DEVICE_ID = (() => {
  let id = localStorage.getItem('bfs_did')
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('bfs_did', id) }
  return id
})()

// ── Interview: SSE helper ──────────────────────────────────────────────────────
async function streamSSE(url, payload, onChunk, onDone, onError) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      onError(err.detail || `HTTP ${res.status}`)
      return
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6)
        try {
          const obj = JSON.parse(raw)
          if (obj.done) { onDone(); return }
          if (obj.text) onChunk(obj.text)
          if (obj.error) { onError(obj.error); return }
        } catch (_) {}
      }
    }
    onDone()
  } catch (e) {
    onError(e.message)
  }
}

// ── Interview: inline markdown renderer ───────────────────────────────────────
function MdLine({ text }) {
  const parts = text.split(/\*\*(.+?)\*\*/)
  return <>{parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p}</strong>
      : p
  )}</>
}

function RenderReport({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <div key={i} style={{
              fontSize: 14, fontWeight: 800, color: BLUE,
              marginTop: i > 0 ? 18 : 4, marginBottom: 6, lineHeight: 1.3,
            }}>
              {line.slice(3)}
            </div>
          )
        }
        if (line === '---') {
          return <div key={i} style={{ borderTop: '1px solid var(--border-primary)', margin: '10px 0' }} />
        }
        if (line.startsWith('⚠️')) {
          return (
            <div key={i} style={{
              background: `${AMBER}12`, border: `1px solid ${AMBER}35`,
              borderRadius: 8, padding: '10px 14px',
              fontSize: 12, color: `${AMBER}dd`, lineHeight: 1.65, margin: '6px 0',
            }}>
              <MdLine text={line} />
            </div>
          )
        }
        if (line.startsWith('- ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '2px 0' }}>
              <span style={{ color: BLUE, flexShrink: 0, lineHeight: '1.65', fontSize: 13 }}>•</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                <MdLine text={line.slice(2)} />
              </span>
            </div>
          )
        }
        if (line === '') return <div key={i} style={{ height: 4 }} />
        if (line.startsWith('**区间')) {
          // probability range line — highlight it prominently
          const match = line.match(/(\d+%–\d+%)/)
          return (
            <div key={i} style={{
              background: `${AMBER}18`, border: `1px solid ${AMBER}44`,
              borderRadius: 10, padding: '14px 18px', margin: '8px 0',
              fontSize: 18, fontWeight: 800, color: AMBER, letterSpacing: '0.5px',
            }}>
              <MdLine text={line} />
              {match && (
                <div style={{ fontSize: 11, fontWeight: 400, color: `${AMBER}99`, marginTop: 4 }}>
                  粗略参考估算 · 非官方数据 · 仅供策略参考
                </div>
              )}
            </div>
          )
        }
        return (
          <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '3px 0', lineHeight: 1.7 }}>
            <MdLine text={line} />
          </p>
        )
      })}
    </div>
  )
}

// ── Interview: input field helper ─────────────────────────────────────────────
function IvInput({ label, value, onChange, placeholder, as = 'input', rows = 3, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
      {as === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          style={{
            background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
            borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px',
            fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
          }}
          onFocus={e => { e.target.style.borderColor = BLUE }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-primary)' }}
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
            borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px',
            fontSize: 13, outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = BLUE }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-primary)' }}
        />
      )}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  )
}

function IvSelect({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
          borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px',
          fontSize: 13, outline: 'none', cursor: 'pointer',
        }}
        onFocus={e => { e.target.style.borderColor = BLUE }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-primary)' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ── Interview: school autocomplete ────────────────────────────────────────────
function SchoolInput({ value, onChange, unis }) {
  const [open, setOpen] = useState(false)
  const suggestions = value.length > 0
    ? unis.filter(u => u.name.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : []

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
        目标学校 Target School *
      </label>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="输入学校名称（如 Harvard Business School）"
        style={{
          background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
          borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px',
          fontSize: 13, outline: 'none',
        }}
        onFocus_real={e => { e.target.style.borderColor = BLUE }}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
          borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden', marginTop: 4,
        }}>
          {suggestions.map(u => (
            <div
              key={u.id}
              onMouseDown={() => { onChange(u.name); setOpen(false) }}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-primary)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${BLUE}15` }}
              onMouseLeave={e => { e.currentTarget.style.background = '' }}
            >
              <SchoolLogo name={u.name} size={22} />
              <span>{u.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Interview: step 1 — profile form ─────────────────────────────────────────
function ProfileForm({ unis, profile, setProfile, onStart }) {
  const set = (k) => (v) => setProfile(p => ({ ...p, [k]: v }))
  const canStart = profile.school.trim().length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: `${BLUE}10`, border: `1px solid ${BLUE}30`,
        borderRadius: 10, padding: '12px 16px',
        fontSize: 12, color: `${BLUE}cc`, lineHeight: 1.65,
      }}>
        🎓 填写你的背景信息，AI面试官将结合这些内容进行有针对性的追问。
        成绩为必填项，课外活动选填但建议填写以获得更准确的评估。
      </div>

      <SchoolInput value={profile.school} onChange={set('school')} unis={unis} />

      <IvSelect
        label="申请项目 Programme"
        value={profile.program}
        onChange={set('program')}
        options={IV_PROGRAMS}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <IvInput
          label="GPA / 学业成绩 *"
          value={profile.gpa}
          onChange={set('gpa')}
          placeholder="如 3.8/4.0 · A*AA · 40/45"
          hint="支持不同评分体系"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            标化考试 Standardised Test
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              value={profile.test_type}
              onChange={e => set('test_type')(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                borderRadius: 8, color: 'var(--text-primary)', padding: '8px 10px',
                fontSize: 13, outline: 'none', cursor: 'pointer', width: 90,
              }}
            >
              {IV_TESTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              value={profile.test_score}
              onChange={e => set('test_score')(e.target.value)}
              placeholder="分数"
              style={{
                flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                borderRadius: 8, color: 'var(--text-primary)', padding: '8px 10px', fontSize: 13, outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      <IvInput
        label="相关科目成绩（选填）"
        value={profile.subjects}
        onChange={set('subjects')}
        placeholder="如 AP Calculus AB 5分 · IB Math AA HL 7分 · A-Level Economics A*"
        hint="商学院重点关注数学、经济、商科类科目"
      />

      <IvInput
        label="课外活动与经历（选填但强烈建议填写）"
        value={profile.activities}
        onChange={set('activities')}
        placeholder={'示例：\n• 商业计划大赛 全国季军，团队负责市场分析\n• 学生会财务官，管理年度预算$5000\n• 某机构3个月实习，协助整理财务报告'}
        as="textarea"
        rows={5}
        hint="AI面试官会针对这里的活动进行深度追问"
      />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>面试语言：</span>
        {[['zh', '🇨🇳 中文'], ['en', '🇺🇸 English']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => set('lang')(val)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: 'none',
              border: `1px solid ${profile.lang === val ? BLUE : 'var(--border-primary)'}`,
              background: profile.lang === val ? `${BLUE}22` : 'transparent',
              color: profile.lang === val ? BLUE : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 12, fontWeight: profile.lang === val ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={onStart}
        disabled={!canStart}
        style={{
          padding: '12px 0', borderRadius: 10, border: 'none',
          background: canStart
            ? `linear-gradient(135deg, ${BLUE}, ${PURPLE})`
            : 'var(--border-primary)',
          color: canStart ? '#fff' : 'var(--text-muted)',
          fontSize: 14, fontWeight: 700, cursor: canStart ? 'pointer' : 'not-allowed',
          transition: 'opacity 0.15s',
          marginTop: 4,
        }}
      >
        开始模拟面试 →
      </button>
    </div>
  )
}

// ── Interview: step 2 — chat ──────────────────────────────────────────────────
function ChatView({ profile, chatHistory, setChatHistory, onGenerateReport }) {
  const [userInput, setUserInput]   = useState('')
  const [streaming, setStreaming]   = useState('')   // AI response being streamed
  const [isBusy, setIsBusy]         = useState(false)
  const [error, setError]           = useState('')
  const chatEndRef                  = useRef(null)
  const aiRounds = chatHistory.filter(m => m.role === 'assistant').length

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory, streaming])

  // On mount, trigger the opening question from the interviewer
  useEffect(() => {
    if (chatHistory.length === 0) fetchAI([])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAI(history) {
    setIsBusy(true)
    setError('')
    setStreaming('')
    let acc = ''
    await streamSSE(
      `${API}/api/universities/interview/chat`,
      { profile, history, device_id: DEVICE_ID },
      (chunk) => { acc += chunk; setStreaming(acc) },
      () => {
        const msg = { role: 'assistant', content: acc }
        setChatHistory(h => [...h, msg])
        setStreaming('')
        setIsBusy(false)
      },
      (err) => { setError(err); setIsBusy(false) },
    )
  }

  async function handleSend() {
    if (!userInput.trim() || isBusy) return
    const userMsg = { role: 'user', content: userInput.trim() }
    const next = [...chatHistory, userMsg]
    setChatHistory(next)
    setUserInput('')
    await fetchAI(next)
  }

  const MSG_AI = {
    alignSelf: 'flex-start', maxWidth: '82%',
    background: `${BLUE}14`, border: `1px solid ${BLUE}30`,
    borderRadius: '4px 14px 14px 14px', padding: '10px 14px',
    fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
  }
  const MSG_USER = {
    alignSelf: 'flex-end', maxWidth: '82%',
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
    borderRadius: '14px 4px 14px 14px', padding: '10px 14px',
    fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Interviewer persona header */}
      <div style={{
        padding: '10px 16px', marginBottom: 8, flexShrink: 0,
        background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>🎓</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {profile.school} 招生面试官
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            严格但专业 · 会追问细节 · {profile.lang === 'zh' ? '中文面试' : 'English interview'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
          第 {aiRounds}/{aiRounds < 4 ? '4-6' : aiRounds} 轮
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12,
        padding: '4px 0', minHeight: 0,
      }}>
        {chatHistory.map((m, i) => (
          <div key={i} style={m.role === 'assistant' ? MSG_AI : MSG_USER}>
            {m.content}
          </div>
        ))}
        {streaming && (
          <div style={{ ...MSG_AI }}>
            {streaming}
            <span style={{ display: 'inline-block', width: 8, height: 14, background: BLUE,
              marginLeft: 2, verticalAlign: 'middle', animation: 'bfsCursorBlink 1s infinite' }} />
          </div>
        )}
        {isBusy && !streaming && (
          <div style={{ ...MSG_AI, opacity: 0.5 }}>…</div>
        )}
        {error && (
          <div style={{ fontSize: 12, color: '#f87171', padding: '8px 12px',
            background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>
            ⚠️ {error}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input row */}
      <div style={{ flexShrink: 0, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="输入你的回答… (Enter 发送 · Shift+Enter 换行)"
            disabled={isBusy}
            rows={2}
            style={{
              flex: 1, background: 'var(--bg-tertiary)', border: `1px solid ${BLUE}55`,
              borderRadius: 10, color: 'var(--text-primary)', padding: '10px 14px',
              fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit',
              opacity: isBusy ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={isBusy || !userInput.trim()}
            style={{
              width: 44, borderRadius: 10, border: 'none', flexShrink: 0,
              background: (isBusy || !userInput.trim()) ? 'var(--border-primary)' : BLUE,
              color: '#fff', cursor: (isBusy || !userInput.trim()) ? 'not-allowed' : 'pointer',
              fontSize: 18, transition: 'background 0.15s',
            }}
          >↑</button>
        </div>
        {/* Generate report button — show after 3+ AI rounds */}
        {aiRounds >= 3 && !isBusy && (
          <button
            onClick={onGenerateReport}
            style={{
              padding: '10px 0', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`,
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            📊 面试结束，生成综合评估报告 →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Interview: step 3 — report ────────────────────────────────────────────────
function ReportView({ profile, chatHistory, onReset }) {
  const [report, setReport]   = useState('')
  const [isReady, setIsReady] = useState(false)
  const [error, setError]     = useState('')
  const endRef                = useRef(null)

  useEffect(() => {
    let acc = ''
    streamSSE(
      `${API}/api/universities/interview/report`,
      { profile, history: chatHistory, device_id: DEVICE_ID },
      (chunk) => { acc += chunk; setReport(acc) },
      () => { setIsReady(true) },
      (err) => { setError(err) },
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [report])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Disclaimer banner */}
      <div style={{
        background: `${AMBER}12`, border: `1px solid ${AMBER}40`,
        borderRadius: 10, padding: '12px 16px',
        fontSize: 12, color: `${AMBER}cc`, lineHeight: 1.65,
      }}>
        ⚠️ <strong>免责声明：</strong>
        此评估基于公开录取数据的一般规律和AI分析，<strong>不代表官方立场，不构成录取保证，仅供申请策略参考。</strong>
        实际录取受文书质量、推荐信、面试表现、申请年份竞争情况等AI无法评估的因素影响——这些因素可能比成绩本身影响更大。
        概率区间为粗略估算，请以区间范围理解，而非精确数值。
      </div>

      {/* Report body */}
      {report ? (
        <div style={{
          background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
          borderRadius: 12, padding: '16px 20px',
        }}>
          <RenderReport text={report} />
          {!isReady && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: BLUE, animation: 'bfsCursorBlink 1s infinite' }} />
              生成中…
            </div>
          )}
        </div>
      ) : !error ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ display: 'inline-block', width: 24, height: 24, border: `2px solid ${BLUE}`,
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
          <div>正在生成综合评估报告…</div>
        </div>
      ) : null}

      {error && (
        <div style={{ color: '#f87171', fontSize: 13, padding: '12px 16px',
          background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>
          ⚠️ {error}
        </div>
      )}

      {isReady && (
        <button
          onClick={onReset}
          style={{
            padding: '10px 0', borderRadius: 10, border: `1px solid var(--border-primary)`,
            background: 'transparent', color: 'var(--text-muted)',
            fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', marginTop: 4,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.color = BLUE }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          ↩ 重新评估 / New Assessment
        </button>
      )}
      <div ref={endRef} />
    </div>
  )
}

// ── Interview: main modal ─────────────────────────────────────────────────────
function InterviewModal({ unis, lang, onClose }) {
  const [step, setStep]               = useState(1)   // 1 | 2 | 3
  const [profile, setProfile]         = useState({
    school: '', program: IV_PROGRAMS[0],
    gpa: '', test_type: 'SAT', test_score: '',
    subjects: '', activities: '', lang: lang === 'zh' ? 'zh' : 'en',
  })
  const [chatHistory, setChatHistory] = useState([])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])

  const STEPS = [
    { n: 1, label: '填写背景' },
    { n: 2, label: '模拟面试' },
    { n: 3, label: '评估报告' },
  ]

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9100,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 18, width: '100%', maxWidth: 680,
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 40px ${PURPLE}18`,
        animation: 'bfsPageFadeIn 0.18s ease both',
      }}>

        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '18px 22px 0',
          borderBottom: '1px solid var(--border-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                🎓 商学院模拟面试 & 录取评估
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                AI严格模拟面试官 · 综合录取概率参考（粗略估算）
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid var(--border-primary)',
                color: 'var(--text-muted)', borderRadius: 8,
                width: 32, height: 32, cursor: 'pointer', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >×</button>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 0 }}>
            {STEPS.map(({ n, label }) => (
              <div
                key={n}
                style={{
                  flex: 1, textAlign: 'center', padding: '8px 4px',
                  borderBottom: step === n ? `2px solid ${BLUE}` : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: step > n ? GREEN : step === n ? BLUE : 'var(--border-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff',
                }}>
                  {step > n ? '✓' : n}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: step === n ? 700 : 400,
                  color: step === n ? BLUE : 'var(--text-muted)',
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflowY: step === 2 ? 'hidden' : 'auto',
          padding: step === 2 ? '16px 22px' : '20px 22px',
          display: 'flex', flexDirection: 'column',
        }}>
          {step === 1 && (
            <ProfileForm
              unis={unis}
              profile={profile}
              setProfile={setProfile}
              onStart={() => { setChatHistory([]); setStep(2) }}
            />
          )}
          {step === 2 && (
            <ChatView
              profile={profile}
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              onGenerateReport={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <ReportView
              profile={profile}
              chatHistory={chatHistory}
              onReset={() => { setStep(1); setProfile(p => ({ ...p, school: '' })); setChatHistory([]) }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Interview: entry card ─────────────────────────────────────────────────────
function InterviewEntryCard({ lang, onOpen }) {
  const t = lang === 'zh'
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        marginBottom: 24,
        background: hov
          ? `linear-gradient(135deg, ${PURPLE}22, ${BLUE}18)`
          : `linear-gradient(135deg, ${PURPLE}14, ${BLUE}10)`,
        border: `1px solid ${hov ? PURPLE + '66' : PURPLE + '33'}`,
        borderRadius: 14, padding: '18px 24px',
        cursor: 'pointer', transition: 'all 0.18s',
        boxShadow: hov ? `0 4px 24px ${PURPLE}25` : 'none',
        display: 'flex', alignItems: 'center', gap: 18,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>🎓</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          {t ? '商学院模拟面试 & 录取概率评估' : 'Business School Mock Interview & Admission Assessment'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {t
            ? 'AI扮演严格招生面试官，结合你的成绩与面试表现，给出录取概率区间参考（粗略估算）和详细改进建议'
            : 'AI acts as a rigorous admissions interviewer. Combines your scores & interview to estimate admission probability (rough range) and provide actionable feedback'
          }
        </div>
      </div>
      <div style={{
        fontSize: 20, color: hov ? PURPLE : 'var(--text-muted)',
        transition: 'color 0.15s', flexShrink: 0,
      }}>→</div>
    </div>
  )
}

// ── University card ───────────────────────────────────────────────────────────
function UniCard({ uni, lang, onClick }) {
  const [hovered, setHovered] = useState(false)
  const t = lang === 'zh'

  return (
    <div
      onClick={() => onClick(uni)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'var(--bg-secondary)',
        border: `1px solid ${hovered ? BLUE + '55' : 'var(--border-primary)'}`,
        borderRadius: 14,
        padding: '44px 16px 16px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
        boxShadow: hovered ? `0 0 28px rgba(14,165,233,0.12), 0 4px 20px rgba(0,0,0,0.3)` : '0 2px 8px rgba(0,0,0,0.2)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <RankBadge rank={uni.qs_rank} />

      {/* School identity */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <SchoolLogo name={uni.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
            lineHeight: 1.3, marginBottom: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {uni.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {uni.university}
          </div>
        </div>
      </div>

      {/* Location */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {countryFlag(uni.country)} {uni.city}
      </div>

      {/* Business rank */}
      {uni.business_rank && (
        <div style={{ fontSize: 11, color: BLUE, fontWeight: 600 }}>
          {uni.business_rank}
        </div>
      )}

      {/* Specialties */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(uni.specialties || []).slice(0, 3).map(s => <TagPill key={s} label={s} />)}
      </div>

      {/* Footer: tuition + CTA */}
      <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{uni.tuition_usd}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: hovered ? BLUE : 'var(--text-muted)',
          transition: 'color 0.15s',
        }}>
          {t ? '查看详情 →' : 'Details →'}
        </span>
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ lang, stats }) {
  const t = lang === 'zh'
  return (
    <div style={{
      textAlign: 'center',
      padding: '40px 0 32px',
      position: 'relative',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 200,
        background: `radial-gradient(ellipse, rgba(14,165,233,0.08) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        display: 'inline-block',
        fontSize: 11, fontWeight: 600, letterSpacing: '1.5px',
        color: BLUE, textTransform: 'uppercase',
        background: `${BLUE}15`, border: `1px solid ${BLUE}30`,
        borderRadius: 20, padding: '4px 14px', marginBottom: 16,
      }}>
        {t ? 'QS 世界大学前100 商学院' : 'QS Top-Ranked University Business Schools'}
      </div>

      <h1 style={{
        fontSize: 'clamp(24px,4vw,38px)', fontWeight: 900,
        margin: '0 0 12px',
        background: `linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        lineHeight: 1.15,
      }}>
        {t ? '全球顶尖商学院指南' : 'Global Business School Guide'}
      </h1>

      <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
        {t
          ? '全球顶尖大学商学院 · 深度资料 · 专业筛选 · 一站式了解'
          : 'In-depth profiles · specialty filters · everything you need to choose your school'
        }
      </p>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          {[
            { val: stats.total,     label: t ? '所学校' : 'Schools' },
            { val: stats.countries, label: t ? '个国家/地区' : 'Countries' },
            { val: stats.languages, label: t ? '种语言' : 'Languages' },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 28, fontWeight: 800,
                background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {val}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sticky filters ────────────────────────────────────────────────────────────
function StickyFilters({ lang, filters, onChange }) {
  const t = lang === 'zh'

  const pill = (active) => ({
    padding: '5px 14px', borderRadius: 20, border: 'none',
    border: `1px solid ${active ? BLUE : 'var(--border-primary)'}`,
    background: active ? `${BLUE}22` : 'transparent',
    color: active ? BLUE : 'var(--text-muted)',
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  })

  return (
    <div style={{
      position: 'sticky', top: 54, zIndex: 99,
      background: 'var(--nav-bg, rgba(2,8,19,0.9))',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-primary)',
      padding: '12px 0',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>
            🔍
          </span>
          <input
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            placeholder={t ? '搜索学校...' : 'Search schools...'}
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8,
              color: 'var(--text-primary)', padding: '7px 12px 7px 32px', fontSize: 13,
              outline: 'none', width: 180,
            }}
            onFocus={e => { e.target.style.borderColor = BLUE }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-primary)' }}
          />
        </div>

        {/* Region pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {REGIONS.map(r => (
            <button
              key={r.label}
              onClick={() => onChange({ ...filters, region: r.key })}
              style={pill(filters.region === r.key)}
            >
              {t ? r.label_cn : r.label}
            </button>
          ))}
        </div>

        {/* Language */}
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => onChange({ ...filters, language: '' })} style={pill(!filters.language)}>
            {t ? '全语言' : 'All Lang'}
          </button>
          <button onClick={() => onChange({ ...filters, language: filters.language === 'english' ? '' : 'english' })} style={pill(filters.language === 'english')}>
            {t ? '英语' : 'English'}
          </button>
          <button onClick={() => onChange({ ...filters, language: filters.language === 'bilingual' ? '' : 'bilingual' })} style={pill(filters.language === 'bilingual')}>
            {t ? '双语' : 'Bilingual'}
          </button>
        </div>

        {/* Specialty */}
        <select
          value={filters.specialty}
          onChange={e => onChange({ ...filters, specialty: e.target.value })}
          style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
            borderRadius: 8, color: filters.specialty ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '7px 12px', fontSize: 12, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">{t ? '所有专业' : 'All Specialties'}</option>
          {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Count */}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {/* filled in parent */}
        </span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UniversitiesPage({ lang = 'zh' }) {
  const t = lang === 'zh'
  const [allUnis,  setAllUnis]  = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [filters,  setFilters]  = useState({ region: '', language: '', specialty: '', search: '' })

  // Fetch all data once — split into two independent fetches so a stats
  // failure never prevents the main school list from loading.
  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/universities`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllUnis(data) })
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch(`${API}/api/universities/stats`)
      .then(r => r.json())
      .then(data => { if (data && data.total) setStats(data) })
      .catch(() => {})
  }, [])

  // Client-side filtering
  const displayed = useMemo(() => {
    let list = allUnis
    if (filters.region) list = list.filter(u => u.region === filters.region)
    if (filters.language !== '') list = list.filter(u => (u.language || 'english') === filters.language)
    if (filters.specialty) {
      const kw = filters.specialty.toLowerCase()
      list = list.filter(u =>
        (u.specialties || []).some(s => s.toLowerCase().includes(kw)) ||
        (u.tags || []).some(s => s.toLowerCase().includes(kw))
      )
    }
    if (filters.search) {
      const kw = filters.search.toLowerCase()
      list = list.filter(u =>
        u.name.toLowerCase().includes(kw) ||
        u.university.toLowerCase().includes(kw) ||
        u.city.toLowerCase().includes(kw) ||
        u.country.toLowerCase().includes(kw)
      )
    }
    // Sort by QS rank ascending; schools without a rank go to the end
    list = [...list].sort((a, b) => (a.qs_rank || 9999) - (b.qs_rank || 9999))
    return list
  }, [allUnis, filters])

  const [showInterview, setShowInterview] = useState(false)

  const handleCardClick = useCallback((uni) => setSelected(uni), [])
  const handleClose = useCallback(() => setSelected(null), [])

  return (
    <>
      <style>{`
        .uni-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) {
          .uni-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 580px) {
          .uni-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
        <Hero lang={lang} stats={stats} />

        <InterviewEntryCard lang={lang} onOpen={() => setShowInterview(true)} />

        <StickyFilters lang={lang} filters={filters} onChange={setFilters} />

        {/* Result count */}
        {!loading && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textAlign: 'right' }}>
            {t ? `显示 ${displayed.length} / ${allUnis.length} 所学校` : `Showing ${displayed.length} of ${allUnis.length} schools`}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="uni-grid">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '80px 0', fontSize: 14 }}>
            {t ? '没有找到匹配的学校，请调整筛选条件' : 'No schools found — try adjusting filters'}
          </div>
        ) : (
          <div className="uni-grid">
            {displayed.map(uni => (
              <UniCard
                key={uni.id}
                uni={uni}
                lang={lang}
                onClick={handleCardClick}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--border-primary)', marginTop: 40, lineHeight: 1.6 }}>
          {t
            ? '数据参考来源：QS World University Rankings 2024、Financial Times Business School Rankings 2024。学费为参考区间，请以各院校官方网站为准。'
            : 'Data sourced from QS World University Rankings 2024 and FT Business School Rankings 2024. Tuition figures are approximate — always verify with the official school website.'
          }
        </div>
      </div>

      {/* Uni detail modal */}
      {selected && <UniModal uni={selected} lang={lang} onClose={handleClose} />}

      {/* Interview modal */}
      {showInterview && <InterviewModal unis={allUnis} lang={lang} onClose={() => setShowInterview(false)} />}
    </>
  )
}
