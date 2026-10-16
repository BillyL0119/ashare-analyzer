import { useEffect, useMemo, useState } from 'react'
import { eventName } from '../utils/macro'

// Economic calendar: macro releases with consensus / actual, importance, and a plain-language
// "why it matters" note for the main event families (from /api/macro/calendar).

const L = {
  zh: { eyebrow: '经济日历', title: '影响市场的重要经济数据', sub: '通胀、就业、利率决议、GDP……这些数据发布时，股市往往会大幅波动。点开任何一条，看看它衡量什么、为什么重要。', next: '下一个重磅数据', in: (d, h) => d > 0 ? `${d} 天 ${h} 小时后` : `${h} 小时后`, soon: '即将公布', today: '今天', imp3: '只看重磅', imp2: '重要以上', imp1: '全部', actual: '实际', consensus: '预期', previous: '前值', above: '高于预期', below: '低于预期', mom: '环比', yoy: '同比', none: '这段时间没有符合条件的事件。', loading: '加载中…', failed: '加载失败，请稍后重试。', retry: '重试', why: '为什么重要', times: '时间为你的本地时间', countries: { us: '美国', cn: '中国', eu: '欧元区', jp: '日本', uk: '英国' } },
  en: { eyebrow: 'Economic calendar', title: 'The data releases that move markets', sub: 'Inflation, jobs, rate decisions, GDP: stocks often swing hard when these come out. Open any event to see what it measures and why it matters.', next: 'Next big release', in: (d, h) => d > 0 ? `in ${d}d ${h}h` : `in ${h}h`, soon: 'Due shortly', today: 'Today', imp3: 'Top only', imp2: 'Important', imp1: 'All', actual: 'Actual', consensus: 'Forecast', previous: 'Previous', above: 'Above forecast', below: 'Below forecast', mom: 'MoM', yoy: 'YoY', none: 'No events match these filters in this period.', loading: 'Loading…', failed: 'Could not load the calendar. Try again.', retry: 'Retry', why: 'Why it matters', times: 'Times are in your local time zone', countries: { us: 'US', cn: 'China', eu: 'Euro area', jp: 'Japan', uk: 'UK' } },
  ja: { eyebrow: '経済指標カレンダー', title: '市場を動かす主要経済指標', sub: 'インフレ、雇用、政策金利、GDP……発表時には株価が大きく動くことがあります。各イベントを開くと、何を測る指標でなぜ重要かが分かります。', next: '次の重要指標', in: (d, h) => d > 0 ? `${d}日${h}時間後` : `${h}時間後`, soon: 'まもなく発表', today: '今日', imp3: '最重要のみ', imp2: '重要以上', imp1: 'すべて', actual: '結果', consensus: '予想', previous: '前回', above: '予想を上回る', below: '予想を下回る', mom: '前月比', yoy: '前年比', none: 'この期間に条件に合うイベントはありません。', loading: '読み込み中…', failed: '読み込めませんでした。もう一度お試しください。', retry: '再試行', why: 'なぜ重要か', times: '時刻は現地時間で表示', countries: { us: '米国', cn: '中国', eu: 'ユーロ圏', jp: '日本', uk: '英国' } },
  ko: { eyebrow: '경제 캘린더', title: '시장을 움직이는 주요 경제 지표', sub: '인플레이션, 고용, 금리 결정, GDP 등이 발표될 때 주가가 크게 움직이곤 합니다. 각 이벤트를 열어 무엇을 측정하고 왜 중요한지 확인하세요.', next: '다음 주요 발표', in: (d, h) => d > 0 ? `${d}일 ${h}시간 후` : `${h}시간 후`, soon: '곧 발표', today: '오늘', imp3: '핵심만', imp2: '중요 이상', imp1: '전체', actual: '실제', consensus: '예상', previous: '이전', above: '예상 상회', below: '예상 하회', mom: '전월비', yoy: '전년비', none: '이 기간에 조건에 맞는 이벤트가 없습니다.', loading: '불러오는 중…', failed: '불러오지 못했습니다. 다시 시도해 주세요.', retry: '다시 시도', why: '왜 중요한가', times: '시간은 현지 시간 기준', countries: { us: '미국', cn: '중국', eu: '유로존', jp: '일본', uk: '영국' } },
  fr: { eyebrow: 'Calendrier économique', title: 'Les publications qui font bouger les marchés', sub: "Inflation, emploi, décisions de taux, PIB : les actions bougent souvent fortement à leur publication. Ouvrez un événement pour voir ce qu'il mesure et pourquoi il compte.", next: 'Prochaine publication majeure', in: (d, h) => d > 0 ? `dans ${d} j ${h} h` : `dans ${h} h`, soon: 'Imminent', today: "Aujourd'hui", imp3: 'Majeurs', imp2: 'Importants', imp1: 'Tous', actual: 'Réel', consensus: 'Prévision', previous: 'Précédent', above: 'Au-dessus des prévisions', below: 'En dessous des prévisions', mom: 'm/m', yoy: 'a/a', none: 'Aucun événement ne correspond à ces filtres sur la période.', loading: 'Chargement…', failed: 'Impossible de charger le calendrier. Réessayez.', retry: 'Réessayer', why: 'Pourquoi c’est important', times: 'Heures affichées dans votre fuseau horaire', countries: { us: 'États-Unis', cn: 'Chine', eu: 'Zone euro', jp: 'Japon', uk: 'Royaume-Uni' } },
}

const COUNTRY_KEY = { 'United States': 'us', China: 'cn', 'Euro Zone': 'eu', Japan: 'jp', 'United Kingdom': 'uk' }
const FLAG = { us: '🇺🇸', cn: '🇨🇳', eu: '🇪🇺', jp: '🇯🇵', uk: '🇬🇧' }

const CSS = `
.mc-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius); }
.mc-chip { padding: 6px 12px; border-radius: var(--radius); font-size: 12.5px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-secondary); }
.mc-chip.on { background: color-mix(in srgb, var(--accent) 14%, transparent); border-color: color-mix(in srgb, var(--accent) 55%, transparent); color: var(--accent); font-weight: 600; }
.mc-day { font-size: 12px; font-weight: 600; letter-spacing: .05em;  color: var(--text-muted); padding: 14px 16px 6px; display: flex; gap: 8px; align-items: center; }
.mc-row { display: grid; grid-template-columns: 56px 34px minmax(0, 1fr) 92px 92px 92px; gap: 10px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--border-primary); font-size: 13px; color: var(--text-secondary); cursor: default; }
.mc-row.click { cursor: pointer; }
.mc-row.click:hover { background: var(--bg-hover); }
.mc-row .num { text-align: right; font-variant-numeric: tabular-nums; }
.mc-head { font-size: 10.5px; font-weight: 600; letter-spacing: .06em;  color: var(--text-muted); border-top: none; padding-top: 2px; padding-bottom: 4px; }
.mc-name { color: var(--text-primary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-name.big { font-weight: 600; }
.mc-tag { font-size: 10px; padding: 1px 6px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-muted); margin-left: 6px; font-weight: 500; }
.mc-why { grid-column: 3 / -1; font-size: 12.5px; line-height: 1.65; color: var(--text-secondary); background: var(--bg-tertiary); border-radius: 8px; padding: 10px 12px; margin-top: 2px; }
.mc-dots { display: flex; gap: 2px; }
.mc-dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--border-primary); display: block; }
.mc-dots i.on { background: #f59e0b; }
@media (max-width: 760px) {
  .mc-row { grid-template-columns: 46px minmax(0, 1fr) 74px 74px; gap: 8px; padding: 10px 12px; }
  .mc-row .prev, .mc-row .flag { display: none; }
  .mc-why { grid-column: 1 / -1; }
}
`

function localDay(iso, lang) {
  const d = new Date(iso)
  return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function MacroCalendarPage({ lang }) {
  const t = L[lang] || L.en
  const [countries, setCountries] = useState(['us'])
  const [minImp, setMinImp] = useState(2)
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [open, setOpen] = useState(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setState('loading')
    fetch(`/api/macro/calendar?country=${countries.join(',')}&days_back=3&days_ahead=21&min_importance=${minImp}&lang=${lang}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (alive) { setData(d); setState('ok') } })
      .catch(() => { if (alive) setState('failed') })
    return () => { alive = false }
  }, [countries, minImp, lang, nonce])

  const now = Date.now()
  const todayKey = new Date().toDateString()
  const groups = useMemo(() => {
    const out = []
    for (const e of data?.events || []) {
      const when = e.time_utc ? new Date(e.time_utc) : new Date(e.date + 'T12:00:00')
      const key = when.toDateString()
      let g = out[out.length - 1]
      if (!g || g.key !== key) { g = { key, label: localDay(when.toISOString(), lang), events: [] }; out.push(g) }
      g.events.push({ ...e, when })
    }
    return out
  }, [data, lang])

  const next = (data?.events || []).find((e) => e.importance === 3 && !e.released && e.time_utc && new Date(e.time_utc).getTime() > now)
  const toggleCountry = (c) => setCountries((cs) => (cs.includes(c) ? (cs.length > 1 ? cs.filter((x) => x !== c) : cs) : [...cs, c]))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingTop: 22, paddingBottom: 48 }}>
      <style>{CSS}</style>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', color: 'var(--accent)' }}>{t.eyebrow}</div>
        <h1 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{t.title}</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 720, lineHeight: 1.6 }}>{t.sub}</p>
      </div>

      {next && (() => {
        const ms = new Date(next.time_utc).getTime() - now
        const d = Math.floor(ms / 86400000), h = Math.max(0, Math.floor((ms % 86400000) / 3600000))
        return (
          <div className="mc-card" style={{ padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderColor: 'color-mix(in srgb, #f59e0b 45%, var(--border-primary))' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', color: '#f59e0b' }}>{t.next}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              {FLAG[COUNTRY_KEY[next.country]] || ''} {eventName(next.name, lang)}{next.period && <span className="mc-tag">{t[next.period]}</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {new Date(next.time_utc).toLocaleString(lang === 'zh' ? 'zh-CN' : lang, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {' · '}{ms < 3600000 ? t.soon : t.in(d, h)}
            </div>
            {next.consensus && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.consensus} <b style={{ color: 'var(--text-primary)' }}>{next.consensus}</b> · {t.previous} {next.previous || '—'}</div>}
          </div>
        )
      })()}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['us', 'cn', 'eu', 'jp', 'uk'].map((c) => (
            <button key={c} className={`mc-chip${countries.includes(c) ? ' on' : ''}`} onClick={() => toggleCountry(c)} aria-pressed={countries.includes(c)}>
              {FLAG[c]} {t.countries[c]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[3, 2, 1].map((n) => (
            <button key={n} className={`mc-chip${minImp === n ? ' on' : ''}`} onClick={() => setMinImp(n)}>{t[`imp${n}`]}</button>
          ))}
        </div>
      </div>

      <div className="mc-card" style={{ overflow: 'hidden' }}>
        {state === 'loading' && !data ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t.loading}</div>
        ) : state === 'failed' ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
            <p style={{ margin: '0 0 12px' }}>{t.failed}</p>
            <button className="mc-chip" onClick={() => setNonce((n) => n + 1)}>{t.retry}</button>
          </div>
        ) : !groups.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t.none}</div>
        ) : (
          <div style={{ opacity: state === 'loading' ? 0.6 : 1, transition: 'opacity .15s' }}>
            <div className="mc-row mc-head" style={{ cursor: 'default' }}>
              <span /><span className="flag" /><span />
              <span className="num">{t.actual}</span><span className="num">{t.consensus}</span><span className="num prev">{t.previous}</span>
            </div>
            {groups.map((g) => (
              <div key={g.key}>
                <div className="mc-day">
                  {g.label}
                  {g.key === todayKey && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', letterSpacing: 0 }}>{t.today}</span>}
                </div>
                {g.events.map((e, i) => {
                  const id = `${g.key}-${i}`
                  const past = e.time_utc && new Date(e.time_utc).getTime() < now
                  const ck = COUNTRY_KEY[e.country]
                  return (
                    <div key={id} className={`mc-row${e.explain ? ' click' : ''}`} style={{ opacity: past && !e.released ? 0.75 : 1 }}
                      onClick={() => e.explain && setOpen(open === id ? null : id)}
                      role={e.explain ? 'button' : undefined} tabIndex={e.explain ? 0 : undefined}
                      onKeyDown={(ev) => { if (e.explain && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); setOpen(open === id ? null : id) } }}
                      aria-expanded={e.explain ? open === id : undefined}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
                        {e.time_utc ? e.when.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : lang, { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                      <span className="flag" title={t.countries[ck] || e.country}>{FLAG[ck] || ''}</span>
                      <span className={`mc-name${e.importance === 3 ? ' big' : ''}`} title={e.name}>
                        <span className="mc-dots" style={{ display: 'inline-flex', marginRight: 8, verticalAlign: 'middle' }}>
                          {[1, 2, 3].map((n) => <i key={n} className={n <= e.importance ? 'on' : ''} />)}
                        </span>
                        {eventName(e.name, lang)}
                        {e.period && <span className="mc-tag">{t[e.period]}</span>}
                        {e.explain && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)' }}>{open === id ? '▴' : '▾'}</span>}
                      </span>
                      <span className="num" style={{ color: e.released ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: e.released ? 700 : 400 }} title={e.surprise ? t[e.surprise] : undefined}>
                        {e.actual || '—'}{e.surprise && <span style={{ marginLeft: 4, fontSize: 10, color: '#f59e0b' }}>{e.surprise === 'above' ? '▲' : '▼'}</span>}
                      </span>
                      <span className="num">{e.consensus || '—'}</span>
                      <span className="num prev">{e.previous || '—'}</span>
                      {open === id && e.explain && (
                        <div className="mc-why"><b style={{ color: 'var(--text-primary)' }}>{t.why}{lang === 'zh' ? '：' : ': '}</b>{e.explain}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '8px 2px 0' }}>{t.times} · {data?.source || 'Nasdaq'} · ▲▼ = {t.above} / {t.below}</p>
    </div>
  )
}
