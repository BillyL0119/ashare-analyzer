import { useState, useEffect, useMemo, useCallback } from 'react'

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

      {/* Modal */}
      {selected && <UniModal uni={selected} lang={lang} onClose={handleClose} />}
    </>
  )
}
