import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useCompareStore from '../../store/compareStore'
import { ROLES } from '../careerData'
import { META, TRACK_FIRMS } from './careerMeta'
import { CATEGORIES, FIRMS } from './firms'

const CSS = `
.cg-table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
.cg-table th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: .04em; 
  color: var(--text-muted); padding: 10px 12px; border-bottom: 1px solid var(--border-primary); white-space: nowrap; }
.cg-table td { padding: 11px 12px; border-bottom: 1px solid var(--border-primary); color: var(--text-secondary); vertical-align: top; }
.cg-table tr:last-child td { border-bottom: none; }
.cg-row { cursor: pointer; transition: background .12s; }
.cg-row:hover { background: var(--bg-hover); }
.cg-row:focus-visible { outline: 2px solid var(--accent-blue, var(--accent)); outline-offset: -2px; }
.cg-row.is-active { background: color-mix(in srgb, var(--accent) 9%, transparent); }
.cg-panel { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius); }
.cg-h { font-size: 12px; font-weight: 600; letter-spacing: .06em;  color: var(--text-muted); margin: 0 0 10px; }
.cg-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: var(--radius); font-size: 12px;
  border: 1px solid var(--border-primary); background: transparent; color: var(--text-secondary); cursor: pointer; white-space: nowrap; }
.cg-chip.is-on { background: color-mix(in srgb, var(--accent) 14%, transparent); border-color: color-mix(in srgb, var(--accent) 55%, transparent); color: var(--accent); font-weight: 600; }
.cg-chip .n { font-size: 11px; opacity: .7; }
.cg-tick { font-family: var(--sans); font-size: 12px; font-weight: 600; color: var(--accent);
  background: none; border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); border-radius: 6px; padding: 2px 8px; cursor: pointer; }
.cg-tick:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); }
.cg-profile { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; }
.cg-tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
@media (max-width: 900px) { .cg-profile { grid-template-columns: minmax(0, 1fr); } .cg-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .cg-hide-sm { display: none; } .cg-table.cg-fit { min-width: 0 !important; } .cg-table td, .cg-table th { padding: 10px 8px; } }
`

const L = (o, zh) => (o ? (zh ? o.zh : o.en) : '')

// ── Careers: comparison table + track profile ───────────────────────────────

export function CareersView({ zh, onShowFirms }) {
  const [active, setActive] = useState('IBD')
  const profileRef = useRef(null)
  const role = ROLES.find((r) => r.id === active)
  const m = META[active]

  const pick = (id) => {
    setActive(id)
    requestAnimationFrame(() => profileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <style>{CSS}</style>

      <div className="cg-panel" style={{ overflowX: 'auto' }}>
        <div style={{ padding: '14px 16px 4px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 className="cg-h" style={{ margin: 0 }}>{zh ? '职业路径对比' : 'Compare career tracks'}</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{zh ? '美国市场 · 薪资为估算区间' : 'US market · pay figures are estimates'}</span>
        </div>
        <table className="cg-table cg-fit" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>{zh ? '方向' : 'Track'}</th>
              <th>{zh ? '入门总薪酬' : 'Entry-level all-in'}</th>
              <th>{zh ? '每周工时' : 'Hours / week'}</th>
              <th className="cg-hide-sm">{zh ? '招聘起点' : 'Recruiting starts'}</th>
              <th className="cg-hide-sm">{zh ? '常见去向' : 'Typical exits'}</th>
            </tr>
          </thead>
          <tbody>
            {ROLES.map((r) => {
              const mm = META[r.id]
              return (
                <tr key={r.id} className={`cg-row${r.id === active ? ' is-active' : ''}`} tabIndex={0}
                  onClick={() => pick(r.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick(r.id))}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: r.color, marginRight: 8 }} />
                    {zh ? r.title : r.titleEn}
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{mm.entryAllIn}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{mm.hours}h</td>
                  <td className="cg-hide-sm">{L(mm.recruitStart, zh)}</td>
                  <td className="cg-hide-sm">{(zh ? mm.exits.zh : mm.exits.en).slice(0, 2).join(' · ')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div ref={profileRef} style={{ scrollMarginTop: 120 }}>
        <TrackProfile role={role} m={m} zh={zh} onShowFirms={onShowFirms} />
      </div>
    </div>
  )
}

function Tile({ label, value, sub }) {
  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius)', padding: '12px 14px', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.25 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function TrackProfile({ role, m, zh, onShowFirms }) {
  const t = (zhKey, enKey) => (zh ? role[zhKey] : role[enKey])
  const day = t('typicalDay', 'typicalDayEn') || []
  const skills = t('skills', 'skillsEn') || []
  const diffs = t('differentiators', 'differentiatorsEn') || []
  const certs = t('certs', 'certsEn') || []
  const cats = TRACK_FIRMS[role.id] || []

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header */}
      <div className="cg-panel" style={{ padding: '18px 18px 16px', display: 'grid', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', color: role.color }}>
            {zh ? '职业路径' : 'Career track'} · {L(m.short, zh)}
          </div>
          <h2 style={{ margin: '4px 0 6px', fontSize: 22, color: 'var(--text-primary)', letterSpacing: '-.2px' }}>{zh ? role.title : role.titleEn}</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 760 }}>{t('tagline', 'taglineEn')}</p>
        </div>
        <div className="cg-tiles">
          <Tile label={zh ? '入门总薪酬（美国）' : 'Entry-level all-in (US)'} value={m.entryAllIn} sub={zh ? '底薪 + 奖金' : 'Base + bonus'} />
          <Tile label={zh ? '每周工时' : 'Hours per week'} value={`${m.hours}h`} />
          <Tile label={zh ? '招聘起点' : 'Recruiting starts'} value={L(m.recruitStart, zh)} />
          <Tile label={zh ? '最常见去向' : 'Most common exit'} value={(zh ? m.exits.zh : m.exits.en)[0]} />
        </div>
      </div>

      <div className="cg-profile">
        {/* Main column */}
        <div style={{ display: 'grid', gap: 16, alignContent: 'start', minWidth: 0 }}>
          <section className="cg-panel" style={{ padding: 18 }}>
            <h3 className="cg-h">{zh ? '这份工作做什么' : 'What the job is'}</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: 'var(--text-secondary)' }}>{t('description', 'descriptionEn')}</p>
            {t('coreScenario', 'coreScenarioEn') && (
              <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.75, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 12px' }}>
                {t('coreScenario', 'coreScenarioEn')}
              </p>
            )}
          </section>

          <section className="cg-panel" style={{ overflowX: 'auto' }}>
            <div style={{ padding: '16px 16px 4px' }}><h3 className="cg-h" style={{ margin: 0 }}>{zh ? '各级别薪酬（美国，估算）' : 'Pay by level (US, estimates)'}</h3></div>
            <table className="cg-table" style={{ minWidth: 460 }}>
              <thead>
                <tr><th>{zh ? '级别' : 'Level'}</th><th>{zh ? '从业年限' : 'Years'}</th><th>{zh ? '底薪' : 'Base'}</th><th>{zh ? '总薪酬' : 'All-in'}</th></tr>
              </thead>
              <tbody>
                {m.ladder.map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{L(row.level, zh)}</td>
                    <td>{row.years}</td>
                    <td>{row.base}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{row.allIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ margin: 0, padding: '8px 16px 14px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {zh
                ? '根据银行公开的薪酬调整、行业薪酬调查和媒体报道整理的大致区间，因机构、部门、城市、年份和个人表现差异很大。中国市场：'
                : 'Rough ranges compiled from public bank pay announcements, compensation surveys and press coverage; they vary widely by firm, group, city, year and performance. China market: '}
              {t('salary', 'salaryEn')}
            </p>
          </section>

          <section className="cg-panel" style={{ padding: 18 }}>
            <h3 className="cg-h">{zh ? '招聘时间线' : 'Recruiting timeline'}</h3>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
              {m.timeline.map((s, i) => (
                <li key={i} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, color: role.color, background: `${role.color}1f`, border: `1px solid ${role.color}55` }}>{i + 1}</span>
                    {i < m.timeline.length - 1 && <span style={{ flex: 1, width: 1, background: 'var(--border-primary)', minHeight: 14 }} />}
                  </div>
                  <div style={{ paddingBottom: i < m.timeline.length - 1 ? 14 : 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{L(s.when, zh)}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 2 }}>{L(s.what, zh)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {Array.isArray(day) && day.length > 0 && (
            <section className="cg-panel" style={{ padding: 18 }}>
              <h3 className="cg-h">{zh ? '典型的一天' : 'A typical day'}</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {day.map((line, i) => {
                  const [time, ...rest] = String(line).split(/\s+[—–-]\s+/)
                  const hasTime = rest.length > 0
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: hasTime ? '92px minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 10, fontSize: 13, lineHeight: 1.6 }}>
                      {hasTime && <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: role.color, fontWeight: 600, paddingTop: 1 }}>{time}</span>}
                      <span style={{ color: 'var(--text-secondary)' }}>{hasTime ? rest.join(' — ') : line}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* Side column */}
        <aside style={{ display: 'grid', gap: 16, alignContent: 'start', minWidth: 0 }}>
          <section className="cg-panel" style={{ padding: 16 }}>
            <h3 className="cg-h">{zh ? '常见去向' : 'Exit opportunities'}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(zh ? m.exits.zh : m.exits.en).map((x) => (
                <span key={x} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>{x}</span>
              ))}
            </div>
          </section>

          {cats.length > 0 && (
            <section className="cg-panel" style={{ padding: 16 }}>
              <h3 className="cg-h">{zh ? '招聘机构' : 'Where they hire'}</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {cats.map((c) => {
                  const cat = CATEGORIES.find((x) => x.key === c)
                  const n = FIRMS.filter((x) => x.cat === c).length
                  return (
                    <button key={c} onClick={() => onShowFirms(c)} className="cg-row"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, textAlign: 'left' }}>
                      <span>{L(cat, zh)}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n} {zh ? '家' : 'firms'} →</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <section className="cg-panel" style={{ padding: 16 }}>
            <h3 className="cg-h">{zh ? '核心技能' : 'Core skills'}</h3>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              {skills.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </section>

          <section className="cg-panel" style={{ padding: 16 }}>
            <h3 className="cg-h">{zh ? '入行要求' : 'How to get in'}</h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)' }}>{t('entry', 'entryEn')}</p>
          </section>

          {certs.length > 0 && (
            <section className="cg-panel" style={{ padding: 16 }}>
              <h3 className="cg-h">{zh ? '证书' : 'Certifications'}</h3>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                {certs.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </section>
          )}

          {diffs.length > 0 && (
            <section className="cg-panel" style={{ padding: 16 }}>
              <h3 className="cg-h">{zh ? '和相近岗位的区别' : 'How it differs'}</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {diffs.map((d, i) => <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{d}</p>)}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

// ── Firms directory ──────────────────────────────────────────────────────────

export function FirmsView({ zh, initialCat = 'all' }) {
  const nav = useNavigate()
  const [cat, setCat] = useState(initialCat)
  const [q, setQ] = useState('')
  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.key, FIRMS.filter((x) => x.cat === c.key).length])), [])

  const rows = FIRMS.filter((x) => (cat === 'all' || x.cat === cat) && (!q.trim() || `${x.name} ${x.hq} ${x.known.en} ${x.known.zh}`.toLowerCase().includes(q.trim().toLowerCase())))
  // Same as the rest of the app: put the stock into the analysis store, then show its page
  const open = (firm) => {
    const [mkt, sym] = firm.ticker.split(':')
    useCompareStore.getState().switchMarketAndAddSymbol(mkt, { code: sym, name: firm.name })
    nav(`/stock/${mkt}/${sym}`)
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className={`cg-chip${cat === 'all' ? ' is-on' : ''}`} onClick={() => setCat('all')}>
          {zh ? '全部' : 'All'} <span className="n">{FIRMS.length}</span>
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`cg-chip${cat === c.key ? ' is-on' : ''}`} onClick={() => setCat(c.key)}>
            {L(c, zh)} <span className="n">{counts[c.key]}</span>
          </button>
        ))}
        <input
          id="cg-firm-search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={zh ? '搜索机构、城市、业务…' : 'Search firm, city, business…'}
          style={{ marginLeft: 'auto', minWidth: 0, flex: '0 1 240px', padding: '7px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
        />
      </div>

      <div className="cg-panel" style={{ overflowX: 'auto' }}>
        <table className="cg-table" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>{zh ? '机构' : 'Firm'}</th>
              <th>{zh ? '类别' : 'Category'}</th>
              <th>{zh ? '总部' : 'HQ'}</th>
              <th className="cg-hide-sm">{zh ? '主要业务' : 'Known for'}</th>
              <th>{zh ? '股票' : 'Stock'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.name}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{x.name}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{L(CATEGORIES.find((c) => c.key === x.cat), zh)}</td>
                <td>{x.hq}</td>
                <td className="cg-hide-sm">{L(x.known, zh)}</td>
                <td>
                  {!x.ticker
                    ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{zh ? '未上市' : 'Not listed'}</span>
                    : /^(us|cn|hk|jp):/.test(x.ticker)
                      ? <button className="cg-tick" onClick={() => open(x)} title={zh ? '查看股票分析' : 'Open stock analysis'}>{x.ticker.split(':')[1]} →</button>
                      : <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--sans)' }}>{x.ticker.split(':')[1]} · {x.hq}</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>{zh ? '没有匹配的机构' : 'No firms match'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
        {zh
          ? '点击股票代码可查看该机构的股票分析。“未上市”指机构本身未上市（私人合伙或子公司）。分类按行业通行说法，部分机构跨多个类别。'
          : 'Click a ticker to open the firm\'s stock analysis. "Not listed" means the firm itself is not public (a partnership or a subsidiary). Categories follow common industry usage; some firms span several.'}
      </p>
    </div>
  )
}
