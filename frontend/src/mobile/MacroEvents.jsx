import { useState } from 'react'
import { useT } from './i18n'
import { useAPI } from './data'
import { Section, SkeletonRows } from './ui'
import useLangStore from '../store/langStore'
import { eventName } from '../utils/macro'

// Upcoming market-moving US releases (CPI, jobs, Fed, GDP...) for the phone market tab.
// Tap a row for a plain-language note on what the number means.
export default function MacroEvents() {
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const [open, setOpen] = useState(null)
  const { data } = useAPI(`/macro/calendar?country=us&days_back=0&days_ahead=21&min_importance=3&lang=${lang}`)
  const now = Date.now()
  // One row per release: CPI comes as headline/core x month/year; keep the headline monthly figure
  const rank = (e) => (/^core/i.test(e.name) ? 2 : 0) + (e.period === 'yoy' ? 1 : 0)
  const byRelease = new Map()
  for (const e of data?.events || []) {
    if (!e.time_utc || new Date(e.time_utc).getTime() < now - 3 * 3600e3) continue
    const k = `${e.time_utc}|${e.family || e.name}`
    const cur = byRelease.get(k)
    if (!cur || rank(e) < rank(cur)) byRelease.set(k, e)
  }
  const events = [...byRelease.values()].slice(0, 6)
  const locale = lang === 'zh' ? 'zh-CN' : lang

  if (data && !events.length) return null
  return (
    <Section title={t('重要经济数据')}>
      {!data ? <SkeletonRows rows={3} /> : (
        <div className="m-card flush">
          {events.map((e, i) => {
            const when = new Date(e.time_utc)
            const id = `${e.time_utc}-${e.name}-${i}`
            return (
              <button key={id} className="m-row" style={{ width: '100%', background: 'none', border: 0, borderTop: i ? '1px solid var(--stroke)' : 0, textAlign: 'left', display: 'block', color: 'inherit', padding: '12px 14px' }}
                onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 52, flexShrink: 0, fontSize: 13, lineHeight: 1.3 }} className="m-muted">
                    {when.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}<br />
                    {when.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="m-grow" style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {eventName(e.name, lang)}{e.period && <span className="m-muted" style={{ fontSize: 13, fontWeight: 500, marginLeft: 6 }}>{t(e.period === 'mom' ? '环比' : '同比')}</span>}
                    </div>
                    <div className="m-muted" style={{ fontSize: 13, marginTop: 2 }}>
                      {e.released ? <>{t('实际')} <b style={{ color: 'var(--text)' }}>{e.actual}</b> · </> : null}
                      {t('预期')} {e.consensus || '—'} · {t('前值')} {e.previous || '—'}
                    </div>
                  </div>
                  <span className="m-muted" style={{ fontSize: 13 }}>{open === id ? '▴' : '▾'}</span>
                </div>
                {open === id && e.explain && <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6 }} className="m-muted">{e.explain}</p>}
              </button>
            )
          })}
        </div>
      )}
    </Section>
  )
}
