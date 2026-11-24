import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useLangStore from '../../store/langStore'
import { setUIOverride } from '../../utils/device'
import { T, SECTOR_ZH, reasons, risks } from '../../components/quant/simpleText'

// Phone version of the admin quant desk's simple mode (/admin/quant). Same words and the same checks as the desktop
// simple mode (components/quant/SimpleView.jsx); /api/admin/quant/signals checks the admin role on every request.

const M = {
  zh: { title: '量化研究台', admin: '仅管理员可见', asOf: (d) => `数据截至 ${d}`, signIn: '请先在设置里登录管理员账号。',
    denied: '这个账号没有管理员权限。', missing: '还没有上传研究结果。', failed: '加载失败，请稍后再试。', retry: '重试',
    full: '查看完整专业版（电脑版布局）', ai: 'AI 解读', aiNote: '由 AI 根据这一页的数据生成，只解释规则和历史结果，不是投资建议。',
    disclaimer: '研究工具，不构成投资建议。数据来自 Sharadar，个人授权，请勿截图公开。' },
  en: { title: 'Quant desk', admin: 'Admins only', asOf: (d) => `Data as of ${d}`, signIn: 'Sign in with an admin account in Settings.',
    denied: 'This account does not have admin access.', missing: 'No research file has been uploaded yet.', failed: 'Could not load. Try again.', retry: 'Retry',
    full: 'Open the full view (desktop layout)', ai: 'AI reading', aiNote: 'Written by AI from this page’s data; it explains the rules and past results and is not investment advice.',
    disclaimer: 'A research tool, not investment advice. Data from Sharadar under a personal licence: do not post screenshots.' },
}

export default function Quant() {
  const lang = useLangStore((s) => s.lang)
  const zh = lang === 'zh'
  const L = T[zh ? 'zh' : 'en']
  const S = M[zh ? 'zh' : 'en']
  const { session, loading: authLoading } = useAuthStore()
  const token = session?.access_token
  const [fetched, setState] = useState('loading')
  const [d, setD] = useState(null)
  const [ai, setAi] = useState(null)
  const [all, setAll] = useState(false)
  const [tries, setTries] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading || !token) return undefined
    let alive = true
    const h = { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    fetch('/api/admin/quant/signals', h)
      .then((r) => {
        if (r.status === 401) throw new Error('signin')
        if (r.status === 403) throw new Error('denied')
        if (r.status === 404) throw new Error('missing')
        if (!r.ok) throw new Error('failed')
        return r.json()
      })
      .then((j) => { if (alive) { setD(j); setState('ok') } })
      .catch((e) => alive && setState(['signin', 'denied', 'missing'].includes(e.message) ? e.message : 'failed'))
    fetch('/api/admin/quant/explain', h).then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j && j.zh) setAi(j) }).catch(() => {})
    return () => { alive = false }
  }, [token, authLoading, tries])

  const state = authLoading ? 'loading' : !token ? 'signin' : fetched
  const header = (
    <>
      <div className="m-title" style={{ marginBottom: 4 }}>{S.title}</div>
      <div className="m-label" style={{ margin: '0 2px 14px' }}>{S.admin}{d ? ` · ${S.asOf(d.as_of)}` : ''}</div>
    </>
  )
  if (state !== 'ok') {
    return (
      <div className="m-stack">
        {header}
        {state === 'loading' ? <div className="m-skel" style={{ height: 160 }} /> : (
          <div className="m-card">
            <p className="m-muted" style={{ margin: 0 }}>{S[state]}</p>
            {state === 'failed' && <button className="m-btn" style={{ marginTop: 12 }} onClick={() => setTries((n) => n + 1)}>{S.retry}</button>}
          </div>
        )}
      </div>
    )
  }

  const t = d.trend
  const thisMonth = t.provisional ? t.this_month_invested : t.above
  const top = d.ranking.filter((r) => r.top)
  const shown = all ? top : top.slice(0, 12)
  const hi = d.short_interest?.high_pct ?? 10
  const v = d.validation
  const fullView = () => { setUIOverride('desktop'); window.location.assign('/admin/quant') }

  return (
    <div className="m-stack mq">
      {header}

      <div className="m-sec"><span>{L.title}</span></div>
      <div className="m-card mq-points">
        <p><i className={`mq-dot ${thisMonth ? 'up' : 'down'}`} />{L.month(thisMonth)} {L.next(t.above, t.gap_pct)}</p>
        <p><i className="mq-dot" />{L.picks}</p>
        <p><i className="mq-dot" />{L.honest}</p>
      </div>

      <div className="m-sec"><span>{L.listTitle}</span></div>
      <p className="m-muted mq-note">{L.listSub}</p>
      <div className="m-card flush">
        {shown.map((r) => {
          const why = reasons(r, zh ? 'zh' : 'en')
          const bad = risks(r, L, hi)
          return (
            <button key={r.ticker} className="mq-row" onClick={() => navigate(`/stock/us/${encodeURIComponent(r.ticker)}`)}>
              <span className="mq-rank">{r.rank}</span>
              <span className="mq-body">
                <b>{zh && r.name_zh ? r.name_zh : r.name}</b>
                <span className="m-label">{r.ticker} · {zh ? SECTOR_ZH[r.sector] || r.sector : r.sector}</span>
                {(why.length > 0 || bad.length > 0) && (
                  <span className="mq-tags">
                    {why.map((w) => <span key={w} className="mq-tag good">{w}</span>)}
                    {bad.map((w) => <span key={w} className="mq-tag warn">{w}</span>)}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      {top.length > 12 && <button className="m-btn ghost" onClick={() => setAll((x) => !x)}>{all ? L.less : L.more}</button>}

      <div className="m-sec"><span>{L.howTitle}</span></div>
      <p className="m-muted mq-note">{L.howSub}</p>
      <div className="m-card mq-steps">
        {L.steps.map(([h, p], i) => (
          <div key={h} className="mq-step"><span className="mq-num">{i + 1}</span><div><b>{h}</b><p className="m-muted">{p}</p></div></div>
        ))}
      </div>

      {v && (
        <>
          <div className="m-sec"><span>{L.pastTitle}</span></div>
          <div className="m-card flush">
            {['index', 'model (step E)', 'index + trend rule', 'model + inv-vol + sector + trend'].map((c) => {
              const s = v.holdout[c] || {}
              return (
                <div key={c} className="mq-past">
                  <span>{L.pastRows[c]}</span>
                  <span className="mq-past-num"><b>{s.cagr != null ? `${s.cagr.toFixed(1)}%` : '—'}</b>
                    <span className="m-label">{L.pastCols[2]} {s.max_drawdown != null ? `−${Math.abs(s.max_drawdown).toFixed(0)}%` : '—'}</span></span>
                </div>
              )
            })}
          </div>
          <p className="m-muted mq-note">{L.pastNote}</p>
        </>
      )}

      {ai && (
        <>
          <div className="m-sec"><span>{S.ai}</span></div>
          <div className="m-card mq-ai">
            {(zh ? ai.zh : ai.en).map((x) => <div key={x.title}><b>{x.title}</b><p className="m-muted">{x.body}</p></div>)}
          </div>
          <p className="m-muted mq-note">{S.aiNote}</p>
        </>
      )}

      <button className="m-btn ghost" onClick={fullView}>{S.full}</button>
      <p className="m-muted mq-note" style={{ marginBottom: 24 }}>{S.disclaimer}</p>
    </div>
  )
}
