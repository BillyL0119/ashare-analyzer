import { useState, useEffect, useMemo } from 'react'

const API = import.meta.env.VITE_API_BASE || ''

// ── palette ─────────────────────────────────────────────────────────────────
const BLUE   = '#0ea5e9'
const PURPLE = '#8b5cf6'
const GREEN  = '#10b981'
const AMBER  = '#f59e0b'

const COUNTRY_OPTIONS = [
  { key: 'us', label: 'United States', label_cn: '美国', flag: '🇺🇸' },
  { key: 'uk', label: 'United Kingdom', label_cn: '英国', flag: '🇬🇧' },
  { key: 'ca', label: 'Canada', label_cn: '加拿大', flag: '🇨🇦' },
  { key: 'hk', label: 'Hong Kong', label_cn: '香港', flag: '🇭🇰' },
  { key: 'cn', label: 'Mainland China', label_cn: '中国大陆', flag: '🇨🇳' },
  { key: 'au', label: 'Australia', label_cn: '澳大利亚', flag: '🇦🇺' },
  { key: 'sg', label: 'Singapore', label_cn: '新加坡', flag: '🇸🇬' },
]

const SPECIALTY_OPTIONS = ['Finance', 'Accounting', 'Economics', 'Marketing', 'Consulting']

// Get initials for logo placeholder
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// Match % color
function matchColor(pct) {
  if (pct >= 80) return GREEN
  if (pct >= 55) return AMBER
  return '#94a3b8'
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div style={{
      background: 'var(--bg-card, #060f1e)',
      border: '1px solid #1a2f50',
      borderRadius: 14,
      padding: 20,
    }}>
      {[80, 55, 95, 40, 70].map((w, i) => (
        <div key={i} className="skeleton" style={{
          width: `${w}%`, height: i === 0 ? 18 : 12,
          borderRadius: 6, marginBottom: 10,
          background: 'var(--skeleton-base, #0a1628)',
        }} />
      ))}
    </div>
  )
}

// ── School Logo ──────────────────────────────────────────────────────────────
function SchoolLogo({ name, size = 44 }) {
  const letters = initials(name)
  const hue = (letters.charCodeAt(0) * 17 + (letters.charCodeAt(1) || 0) * 31) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: `linear-gradient(135deg, hsl(${hue},60%,35%), hsl(${(hue + 60) % 360},60%,25%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff',
      boxShadow: `0 2px 12px rgba(0,0,0,0.4)`,
    }}>
      {letters}
    </div>
  )
}

// ── Tag pill ─────────────────────────────────────────────────────────────────
function Tag({ label }) {
  const colors = {
    Finance: '#0ea5e9', Accounting: '#8b5cf6', Economics: '#10b981',
    Marketing: '#f59e0b', Consulting: '#ef4444', Strategy: '#06b6d4',
    MBA: '#6366f1', Undergraduate: '#84cc16', STEM: '#f97316',
  }
  const color = colors[label] || '#64748b'
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// ── Match badge ──────────────────────────────────────────────────────────────
function MatchBadge({ pct }) {
  const color = matchColor(pct)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: `conic-gradient(${color} ${pct * 3.6}deg, #1a2f50 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 12px ${color}44`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#020813',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color,
        }}>
          {pct}%
        </div>
      </div>
    </div>
  )
}

// ── Expanded detail panel ────────────────────────────────────────────────────
function SchoolDetail({ uni, lang, onClose }) {
  const t = lang === 'zh'
  return (
    <div style={{
      marginTop: 12,
      background: '#050d1a',
      border: '1px solid #1a2f50',
      borderRadius: 12,
      padding: 20,
      animation: 'bfsPageFadeIn 0.2s ease both',
    }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Description */}
        <div style={{ flex: '1 1 280px' }}>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 14 }}>
            {t ? uni.description_cn : uni.description}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
            {t ? '知名校友' : 'Notable Alumni'}
          </div>
          <div style={{ fontSize: 13, color: '#e2e8f0' }}>
            {uni.notable_alumni.join(' · ')}
          </div>
        </div>

        {/* Programs + Requirements */}
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            {t ? '提供项目' : 'Programs'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
            {uni.programs.map(p => (
              <span key={p} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: '#0f1f3d', color: '#8ab4f8',
                border: '1px solid #1a3060',
              }}>{p}</span>
            ))}
          </div>

          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            {t ? '入学要求' : 'Requirements'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            {[
              ['GPA', uni.requirements.gpa],
              ['GMAT', uni.requirements.gmat],
              ['IELTS', uni.requirements.ielts],
              ['TOEFL', uni.requirements.toefl],
            ].map(([k, v]) => v && (
              <div key={k} style={{ fontSize: 12, color: '#94a3b8' }}>
                <span style={{ color: '#64748b' }}>{k}: </span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tuition + link */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              {t ? '学费参考' : 'Tuition'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: AMBER }}>
              {uni.tuition}
            </div>
          </div>
          <a
            href={uni.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', padding: '8px 18px', borderRadius: 8,
              background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`,
              color: '#fff', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 2px 12px rgba(14,165,233,0.3)',
            }}
          >
            {t ? '访问官网' : 'Official Website'}
          </a>
        </div>
      </div>
    </div>
  )
}

// ── University Card ──────────────────────────────────────────────────────────
function UniCard({ uni, lang, expanded, onToggle, onCompareToggle, inCompare, matchPct, matchReasons }) {
  const t = lang === 'zh'
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card, #060f1e)',
        border: `1px solid ${hovered || expanded ? BLUE + '66' : '#1a2f50'}`,
        borderRadius: 14,
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered || expanded ? `0 0 24px rgba(14,165,233,0.12)` : 'none',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <SchoolLogo name={uni.name} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
              {t ? uni.name_cn : uni.name}
            </span>
            <span style={{ fontSize: 12, color: '#4a5568' }}>
              {t ? uni.name_cn === uni.name ? '' : uni.name : uni.name_cn}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {COUNTRY_OPTIONS.find(c => c.key === uni.country)?.flag} {uni.city}
            &nbsp;·&nbsp;
            <span style={{ color: AMBER }}>
              #{uni.ranking} {t ? '排名' : 'Ranked'}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {uni.specialties.slice(0, 3).map(s => <Tag key={s} label={s} />)}
          </div>
        </div>

        {/* Right side: match badge / tuition / compare */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {matchPct !== undefined && <MatchBadge pct={matchPct} />}
          <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
            {uni.tuition}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onCompareToggle(uni) }}
            style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
              border: `1px solid ${inCompare ? PURPLE : '#1a2f50'}`,
              background: inCompare ? `${PURPLE}22` : 'transparent',
              color: inCompare ? PURPLE : '#64748b',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {inCompare ? (t ? '取消对比' : '− Compare') : (t ? '+对比' : '+ Compare')}
          </button>
        </div>
      </div>

      {/* Expand toggle */}
      <div
        onClick={() => onToggle(uni.id)}
        style={{
          marginTop: 12, fontSize: 12, color: expanded ? BLUE : '#4a5568',
          display: 'flex', alignItems: 'center', gap: 4,
          userSelect: 'none',
        }}
      >
        <span style={{ transform: expanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
        {expanded ? (t ? '收起详情' : 'Hide Details') : (t ? '展开详情' : 'Show Details')}
        {matchReasons && matchReasons.length > 0 && !expanded && (
          <span style={{ marginLeft: 8, color: GREEN, fontStyle: 'italic' }}>
            · {matchReasons[0]}
          </span>
        )}
      </div>

      {expanded && <SchoolDetail uni={uni} lang={lang} />}
    </div>
  )
}

// ── Compare Table ────────────────────────────────────────────────────────────
function CompareTable({ unis, lang, onRemove }) {
  const t = lang === 'zh'
  if (unis.length === 0) return null

  const rows = [
    { key: 'country_name', label: t ? '国家/地区' : 'Country' },
    { key: 'city',         label: t ? '城市' : 'City' },
    { key: 'ranking',      label: t ? '排名' : 'Ranking', fmt: v => `#${v}` },
    { key: 'tuition',      label: t ? '学费' : 'Tuition' },
    { key: '_gpa',         label: 'GPA', fmt: (_, u) => u.requirements.gpa },
    { key: '_gmat',        label: 'GMAT', fmt: (_, u) => u.requirements.gmat },
    { key: '_ielts',       label: 'IELTS', fmt: (_, u) => u.requirements.ielts },
    { key: '_programs',    label: t ? '项目' : 'Programs', fmt: (_, u) => u.programs.slice(0, 3).join(', ') },
    { key: '_specialties', label: t ? '强势专业' : 'Specialties', fmt: (_, u) => u.specialties.slice(0, 3).join(', ') },
  ]

  return (
    <div style={{
      background: '#060f1e',
      border: '1px solid #1a2f50',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2f50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
          {t ? '学校对比' : 'School Comparison'}
        </span>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {t ? `已选 ${unis.length}/3 所` : `${unis.length}/3 selected`}
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#050d1a' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {t ? '指标' : 'Metric'}
              </th>
              {unis.map(u => (
                <th key={u.id} style={{ padding: '10px 16px', minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SchoolLogo name={u.name} size={28} />
                      <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, textAlign: 'left' }}>
                        {lang === 'zh' ? u.name_cn : u.name}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemove(u.id)}
                      style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                    >×</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.key} style={{ background: ri % 2 === 0 ? 'transparent' : '#050d1a' }}>
                <td style={{ padding: '9px 16px', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {row.label}
                </td>
                {unis.map(u => {
                  const val = row.fmt
                    ? row.fmt(u[row.key.replace('_', '')], u)
                    : u[row.key]
                  return (
                    <td key={u.id} style={{ padding: '9px 16px', color: '#e2e8f0', textAlign: 'center' }}>
                      {val ?? '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Recommend Form ────────────────────────────────────────────────────────────
function RecommendForm({ lang, onResults }) {
  const t = lang === 'zh'
  const [gpa, setGpa] = useState('')
  const [testScore, setTestScore] = useState('')
  const [interests, setInterests] = useState([])
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(false)

  const toggleInterest = (s) => setInterests(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  const toggleCountry  = (c) => setCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  const handleSubmit = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (gpa) params.set('gpa', gpa)
    if (testScore) params.set('test_score', testScore)
    if (interests.length) params.set('interests', interests.join(','))
    if (countries.length) params.set('preferred_countries', countries.join(','))
    try {
      const res = await fetch(`${API}/api/universities/recommend?${params}`)
      const data = await res.json()
      onResults(data)
    } catch {
      onResults([])
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: '#060f1e',
    border: '1px solid #1a2f50',
    borderRadius: 8,
    color: '#e2e8f0',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  const pillStyle = (active) => ({
    padding: '5px 14px',
    borderRadius: 20,
    border: `1px solid ${active ? BLUE : '#1a2f50'}`,
    background: active ? `${BLUE}22` : 'transparent',
    color: active ? BLUE : '#64748b',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  })

  return (
    <div style={{
      background: '#060f1e',
      border: '1px solid #1a2f50',
      borderRadius: 16,
      padding: 24,
      marginBottom: 28,
    }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', marginBottom: 18,
        background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {t ? '智能推荐：为我选出最合适的商学院' : 'Smart Recommender: Find Your Best-Fit Business Schools'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 18 }}>
        <div>
          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>
            GPA (0–4.0)
          </label>
          <input
            type="number" min="0" max="4" step="0.1"
            value={gpa} onChange={e => setGpa(e.target.value)}
            placeholder="3.5"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>
            {t ? 'GMAT / SAT 分数' : 'GMAT / SAT Score'}
          </label>
          <input
            type="number" min="200" max="1600"
            value={testScore} onChange={e => setTestScore(e.target.value)}
            placeholder={t ? 'GMAT: 700, SAT: 1400' : 'GMAT: 700, SAT: 1400'}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
          {t ? '感兴趣专业（可多选）' : 'Interested Specialties (multi-select)'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SPECIALTY_OPTIONS.map(s => (
            <button key={s} onClick={() => toggleInterest(s)} style={pillStyle(interests.includes(s))}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
          {t ? '目标国家/地区（可多选）' : 'Target Countries (multi-select)'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COUNTRY_OPTIONS.map(c => (
            <button key={c.key} onClick={() => toggleCountry(c.key)} style={pillStyle(countries.includes(c.key))}>
              {c.flag} {t ? c.label_cn : c.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: '10px 28px', borderRadius: 10,
          background: loading ? '#1a2f50' : `linear-gradient(135deg, ${BLUE}, ${PURPLE})`,
          color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 14, fontWeight: 700,
          boxShadow: loading ? 'none' : '0 2px 16px rgba(14,165,233,0.35)',
          transition: 'all 0.2s',
        }}
      >
        {loading ? (t ? '推荐中...' : 'Finding matches...') : (t ? '为我推荐' : 'Recommend Schools')}
      </button>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function UniversitiesPage({ lang = 'zh' }) {
  const t = lang === 'zh'
  const [allUnis, setAllUnis]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterCountry, setFilterCountry] = useState('')
  const [filterSpec,    setFilterSpec]    = useState('')
  const [search,        setSearch]        = useState('')
  const [expanded,      setExpanded]      = useState(null)
  const [compareList,   setCompareList]   = useState([])
  const [recommended,   setRecommended]   = useState(null)  // null = not yet queried

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/universities`)
      .then(r => r.json())
      .then(d => { setAllUnis(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Client-side filter (on top of server data)
  const displayed = useMemo(() => {
    let list = recommended !== null ? recommended : allUnis
    if (filterCountry) list = list.filter(u => u.country === filterCountry)
    if (filterSpec) list = list.filter(u =>
      u.specialties.some(s => s.toLowerCase().includes(filterSpec.toLowerCase())) ||
      u.tags.some(s => s.toLowerCase().includes(filterSpec.toLowerCase()))
    )
    if (search) {
      const kw = search.toLowerCase()
      list = list.filter(u =>
        u.name.toLowerCase().includes(kw) ||
        u.name_cn.includes(kw) ||
        u.city.toLowerCase().includes(kw)
      )
    }
    return list
  }, [allUnis, recommended, filterCountry, filterSpec, search])

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id)

  const toggleCompare = (uni) => {
    setCompareList(prev => {
      if (prev.find(u => u.id === uni.id)) return prev.filter(u => u.id !== uni.id)
      if (prev.length >= 3) return prev
      return [...prev, uni]
    })
  }
  const removeCompare = (id) => setCompareList(prev => prev.filter(u => u.id !== id))

  const clearRecommended = () => setRecommended(null)

  const pillStyle = (active) => ({
    padding: '5px 14px', borderRadius: 20,
    border: `1px solid ${active ? BLUE : '#1a2f50'}`,
    background: active ? `${BLUE}22` : 'transparent',
    color: active ? BLUE : '#64748b',
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 0 48px' }}>

      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800, margin: 0,
          background: `linear-gradient(135deg, #38bdf8, #818cf8)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {t ? '全球商学院推荐' : 'Global Business School Guide'}
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0' }}>
          {t
            ? `收录 ${allUnis.length} 所顶尖商学院 · 智能匹配 · 横向对比`
            : `${allUnis.length} top schools · Smart matching · Side-by-side comparison`
          }
        </p>
      </div>

      {/* Recommender */}
      <RecommendForm lang={lang} onResults={data => { setRecommended(data); setExpanded(null) }} />

      {/* Compare table */}
      {compareList.length > 0 && (
        <CompareTable unis={compareList} lang={lang} onRemove={removeCompare} />
      )}

      {/* If showing recommendations, show banner */}
      {recommended !== null && (
        <div style={{
          background: `${GREEN}18`,
          border: `1px solid ${GREEN}44`,
          borderRadius: 10, padding: '12px 18px', marginBottom: 18,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: GREEN }}>
            {t
              ? `为你推荐了 ${recommended.length} 所学校，按匹配度排序`
              : `Showing ${recommended.length} recommended schools, sorted by match score`
            }
          </span>
          <button onClick={clearRecommended} style={{
            background: 'none', border: `1px solid ${GREEN}66`,
            color: GREEN, borderRadius: 6, padding: '4px 12px',
            cursor: 'pointer', fontSize: 12,
          }}>
            {t ? '查看全部' : 'View All Schools'}
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t ? '搜索学校名称或城市...' : 'Search school name or city...'}
          style={{
            background: '#060f1e', border: '1px solid #1a2f50', borderRadius: 8,
            color: '#e2e8f0', padding: '7px 14px', fontSize: 13, outline: 'none',
            width: 220,
          }}
        />

        {/* Country filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button onClick={() => setFilterCountry('')} style={pillStyle(!filterCountry)}>
            {t ? '全部' : 'All'}
          </button>
          {COUNTRY_OPTIONS.map(c => (
            <button key={c.key} onClick={() => setFilterCountry(c.key === filterCountry ? '' : c.key)} style={pillStyle(filterCountry === c.key)}>
              {c.flag} {t ? c.label_cn : c.label}
            </button>
          ))}
        </div>

        {/* Specialty filter */}
        <select
          value={filterSpec}
          onChange={e => setFilterSpec(e.target.value)}
          style={{
            background: '#060f1e', border: '1px solid #1a2f50', borderRadius: 8,
            color: filterSpec ? '#e2e8f0' : '#64748b', padding: '7px 12px', fontSize: 13, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">{t ? '所有专业方向' : 'All Specialties'}</option>
          {SPECIALTY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* School grid */}
      {loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#4a5568', padding: '60px 0', fontSize: 14 }}>
          {t ? '没有找到匹配的学校' : 'No schools found'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {displayed.map(uni => (
            <UniCard
              key={uni.id}
              uni={uni}
              lang={lang}
              expanded={expanded === uni.id}
              onToggle={toggleExpand}
              onCompareToggle={toggleCompare}
              inCompare={!!compareList.find(u => u.id === uni.id)}
              matchPct={uni.match_pct}
              matchReasons={uni.match_reasons}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div style={{ textAlign: 'center', fontSize: 12, color: '#2a3a5c', marginTop: 32 }}>
        {t
          ? '排名数据来源：QS World University Rankings / Financial Times MBA Rankings（参考值，请以官方最新数据为准）'
          : 'Rankings reference: QS World University Rankings / Financial Times MBA Rankings (indicative only)'
        }
      </div>
    </div>
  )
}
