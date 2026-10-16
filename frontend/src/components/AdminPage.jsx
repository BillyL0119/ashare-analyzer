import { useEffect, useMemo, useState, useCallback } from 'react'
import ReactECharts from '../lib/echarts'
import useAuthStore from '../store/authStore'
import { THEME } from '../utils/chartHelpers'

const ACCENT = '#a08672', GREEN = '#34d399', VIOLET = '#7c9cb4'
const MUTED = 'var(--text-muted)'

const TXT = {
  zh: {
    eyebrow: '管理员', title: '影响力数据看板', sub: '网站使用情况、登录用户与成长趋势，可导出用于申请材料。',
    since: (d) => `登录统计自 ${d} 开始记录`,
    signIn: '请先登录管理员账号', signInBtn: '登录', denied: '这个账号没有管理员权限。', failed: '加载失败，请稍后重试。', retry: '重试', loading: '加载中…',
    users: '已登录用户', newToday: (n) => `今日新增 ${n}`, dau: '今日活跃', wau: '7 日活跃', mau: '30 日活跃', returning: '回访用户', returningSub: (n) => `访问 2 天以上的用户 ${n} 人`,
    logins: '累计登录次数', visits: '总访问量', devices: '独立设备', weekVisits: (n) => `本周 ${n}`, stocks: '股票分析次数', paper: '模拟炒股', paperSub: (a, t) => `${t} 人下过单 / ${a} 个账号`,
    trend: '近期趋势', d30: '30 天', d90: '90 天', newUsers: '新增用户', activeUsers: '活跃用户', visitsS: '访问量',
    sources: '访问来源', ui: '设备', mobile: '手机', desktop: '电脑', features: '功能使用', topStocks: '热门股票', searches: '次',
    members: '会员管理', membersSub: '会员由管理员按邮箱授予。管理员邮箱在服务器配置中设定。', email: '用户邮箱', grant: '设为会员', revoke: '取消', admins: '管理员', noMembers: '还没有会员',
    since2: '起', exportCsv: '导出 CSV', print: '打印 / 存为 PDF', summary: '申请材料摘要', copy: '复制', copied: '已复制',
    roleAdmin: '管理员', roleMember: '会员', roleUser: '普通用户',
    feat: { similar: '相似走势', news: '新闻舆情', monte_carlo: '蒙特卡洛', paper_trading: '模拟炒股', analysis: '智能分析', risk: '风险分析', regime: '市场状态', factor: '因子分析', financial: '财务分析', radar: '雷达对比', calendar: 'A股日历', study: '学习中心', ai_tutor: 'AI导师' },
    src: { direct: '直接访问', other: '其他' },
  },
  en: {
    eyebrow: 'Admin', title: 'Impact dashboard', sub: 'Site usage, signed-in users and growth, ready to export for applications.',
    since: (d) => `Login tracking started ${d}`,
    signIn: 'Sign in with an admin account to continue', signInBtn: 'Sign in', denied: 'This account does not have admin access.', failed: 'Could not load the data. Try again.', retry: 'Retry', loading: 'Loading…',
    users: 'Signed-in users', newToday: (n) => `${n} new today`, dau: 'Active today', wau: 'Active, 7 days', mau: 'Active, 30 days', returning: 'Returning users', returningSub: (n) => `${n} users came back on 2+ days`,
    logins: 'Total logins', visits: 'Total visits', devices: 'Unique devices', weekVisits: (n) => `${n} this week`, stocks: 'Stocks analyzed', paper: 'Paper trading', paperSub: (a, t) => `${t} traders of ${a} accounts`,
    trend: 'Recent trend', d30: '30 days', d90: '90 days', newUsers: 'New users', activeUsers: 'Active users', visitsS: 'Visits',
    sources: 'Traffic sources', ui: 'Devices', mobile: 'Mobile', desktop: 'Desktop', features: 'Feature usage', topStocks: 'Top stocks', searches: 'searches',
    members: 'Members', membersSub: 'Admins grant membership by email. Admin emails are set in the server configuration.', email: 'User email', grant: 'Make member', revoke: 'Remove', admins: 'Admins', noMembers: 'No members yet',
    since2: 'since', exportCsv: 'Export CSV', print: 'Print / save as PDF', summary: 'Summary for applications', copy: 'Copy', copied: 'Copied',
    roleAdmin: 'Admin', roleMember: 'Member', roleUser: 'User',
    feat: { similar: 'Similar Trend', news: 'News Sentiment', monte_carlo: 'Monte Carlo', paper_trading: 'Paper Trade', analysis: 'AI Analysis', risk: 'Risk Analytics', regime: 'Regime Detector', factor: 'Factor Analysis', financial: 'Financial', radar: 'Radar', calendar: 'A-share Calendar', study: 'Study Center', ai_tutor: 'AI Tutor' },
    src: { direct: 'Direct', google: 'Google', instagram: 'Instagram', tiktok: 'TikTok', other: 'Other' },
  },
}

// Class prefix is 'dash-', not 'ad-': ad blockers hide elements with ad-* classes.
const CSS = `
.dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.dash-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius); padding: 16px 18px; min-width: 0; }
.dash-lbl { font-size: 11px; font-weight: 600; letter-spacing: .06em;  color: var(--text-muted); }
.dash-num { font-family: var(--sans); font-size: 32px; font-weight: 500; color: var(--text-primary); margin-top: 6px; font-variant-numeric: lining-nums tabular-nums; letter-spacing: -.01em; }
.dash-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.dash-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.dash-h { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 12px; }
.dash-bar { display: flex; align-items: center; gap: 10px; margin: 7px 0; font-size: 12.5px; color: var(--text-secondary); }
.dash-bar > span:first-child { min-width: 92px; }
.dash-track { flex: 1; height: 5px; border-radius: 3px; background: var(--bg-tertiary); overflow: hidden; }
.dash-fill { height: 100%; border-radius: 3px; background: ${GREEN}; }
.dash-val { min-width: 64px; text-align: right; font-variant-numeric: tabular-nums; color: var(--text-muted); font-size: 12px; }
.dash-btn { padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-secondary); }
.dash-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.dash-btn.pri { background: ${ACCENT}; border-color: ${ACCENT}; color: #fff; }
.dash-in { flex: 1; min-width: 0; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; font-size: 13px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); color: var(--text-primary); outline: none; }
.dash-in:focus { border-color: ${ACCENT}; }
.dash-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-primary); font-size: 13px; color: var(--text-secondary); }
.dash-row span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.dash-pill { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: var(--radius); color: ${ACCENT}; background: color-mix(in srgb, ${ACCENT} 14%, transparent); flex-shrink: 0; }
.dash-chip { padding: 5px 12px; border-radius: var(--radius); font-size: 12px; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-secondary); }
.dash-chip.on { background: color-mix(in srgb, ${ACCENT} 14%, transparent); border-color: color-mix(in srgb, ${ACCENT} 55%, transparent); color: ${ACCENT}; font-weight: 600; }
@media (max-width: 760px) { .dash-two { grid-template-columns: minmax(0, 1fr); } .dash-num { font-size: 24px; } }
@media print {
  header, nav, footer, .dash-noprint { display: none !important; }
  .dash-card { break-inside: avoid; }
}
`

const fmt = (n) => (n ?? 0).toLocaleString()

function Shell({ children }) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingTop: 22, paddingBottom: 56 }}>
      <style>{CSS}</style>
      {children}
    </div>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="dash-card">
      <div className="dash-lbl">{label}</div>
      <div className="dash-num">{value}</div>
      {sub != null && <div className="dash-sub">{sub}</div>}
    </div>
  )
}

function Bars({ rows, labelOf }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  const total = rows.reduce((a, r) => a + r[1], 0) || 1
  return rows.map(([k, n]) => (
    <div className="dash-bar" key={k}>
      <span>{labelOf(k)}</span>
      <div className="dash-track"><div className="dash-fill" style={{ width: `${(n / max) * 100}%` }} /></div>
      <span className="dash-val">{fmt(n)} · {Math.round((n / total) * 100)}%</span>
    </div>
  ))
}

export default function AdminPage({ lang, onOpenAuth }) {
  const t = TXT[lang === 'zh' ? 'zh' : 'en']
  const isZh = lang === 'zh'
  const { session, loading: authLoading } = useAuthStore()
  const token = session?.access_token
  const [state, setState] = useState('loading')       // loading | ok | signin | denied | failed
  const [data, setData] = useState(null)
  const [days, setDays] = useState(30)
  const [members, setMembers] = useState(null)
  const [email, setEmail] = useState('')
  const [memberErr, setMemberErr] = useState('')
  const [copied, setCopied] = useState(false)

  const call = useCallback(async (path, opts = {}) => {
    const r = await fetch(`/api/admin${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
    return r
  }, [token])

  const load = useCallback(async () => {
    if (authLoading) return
    if (!token) { setState('signin'); return }
    setState('loading')
    try {
      const r = await call('/overview')
      if (r.status === 401) { setState('signin'); return }
      if (r.status === 403) { setState('denied'); return }
      if (!r.ok) throw new Error(String(r.status))
      setData(await r.json())
      setState('ok')
      const m = await call('/members')
      if (m.ok) setMembers(await m.json())
    } catch { setState('failed') }
  }, [authLoading, token, call])

  useEffect(() => { load() }, [load])

  const addMember = async (on, addr) => {
    setMemberErr('')
    const r = await call('/members', { method: 'POST', body: JSON.stringify({ email: addr, member: on }) })
    if (r.ok) { setMembers(await r.json()); if (on) setEmail(''); load() }
    else setMemberErr((await r.json().catch(() => ({}))).detail || t.failed)
  }

  const series = useMemo(() => (data ? data.series.slice(-days) : []), [data, days])

  const option = useMemo(() => !data ? null : ({
    backgroundColor: 'transparent',
    grid: { top: 34, bottom: 30, left: 44, right: 40 },
    legend: { top: 0, textStyle: { color: '#8a94a6', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,26,0.95)', borderColor: 'rgba(160,134,114,0.12)', textStyle: { color: THEME.tooltipText, fontSize: 12 } },
    xAxis: { type: 'category', data: series.map((d) => d.date.slice(5)), axisLabel: { color: '#8a94a6', fontSize: 10, interval: Math.max(0, Math.floor(series.length / 8) - 1) }, axisLine: { lineStyle: { color: 'rgba(160,134,114,0.15)' } } },
    yAxis: [
      { type: 'value', minInterval: 1, axisLabel: { color: '#8a94a6', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(160,134,114,0.07)' } } },
      { type: 'value', minInterval: 1, axisLabel: { color: '#8a94a6', fontSize: 10 }, splitLine: { show: false } },
    ],
    series: [
      { name: `${t.visitsS} (${isZh ? '左轴' : 'left'})`, type: 'line', data: series.map((d) => d.visits), smooth: true, symbol: 'none', lineStyle: { width: 2, color: ACCENT }, areaStyle: { color: 'rgba(160,134,114,0.10)' } },
      { name: `${t.activeUsers} (${isZh ? '右轴' : 'right'})`, type: 'line', yAxisIndex: 1, data: series.map((d) => d.active_users), smooth: true, symbol: 'none', lineStyle: { width: 2, color: GREEN } },
      { name: `${t.newUsers} (${isZh ? '右轴' : 'right'})`, type: 'bar', yAxisIndex: 1, data: series.map((d) => d.new_users), barMaxWidth: 10, itemStyle: { color: VIOLET, borderRadius: [3, 3, 0, 0] } },
    ],
  }), [data, series, t, isZh])

  const summaryText = useMemo(() => {
    if (!data) return ''
    const u = data.users, s = data.site
    const since = data.tracking_since
    return isZh
      ? `Best Friend Stock（bestfriendstock.com）是一个免费的股票学习与分析平台，提供美股与 A 股行情、基本面分析、选股器、模拟炒股和经济学学习中心，支持中英日韩法五种语言，并有网页版与 iOS App。截至 ${data.generated}，网站累计 ${fmt(s.total_visits)} 次访问、${fmt(s.unique_devices)} 台独立设备；其中注册并登录的用户 ${fmt(u.total)} 人（统计自 ${since || data.generated} 起），近 30 天活跃 ${fmt(u.mau)} 人，${u.returning_pct}% 的用户在不同日期回访；用户共进行 ${fmt(s.stocks_analyzed)} 次股票分析，${fmt(data.paper.traders)} 人使用模拟炒股完成 ${fmt(data.paper.trades)} 笔虚拟交易。`
      : `Best Friend Stock (bestfriendstock.com) is a free stock analysis and learning platform. It covers US and A-share quotes, fundamentals, a stock screener, paper trading and an economics study center in five languages, on the web and as an iOS app. As of ${data.generated} it has had ${fmt(s.total_visits)} visits from ${fmt(s.unique_devices)} unique devices. ${fmt(u.total)} people have signed in (tracked since ${since || data.generated}), ${fmt(u.mau)} were active in the last 30 days, and ${u.returning_pct}% came back on a different day. Users ran ${fmt(s.stocks_analyzed)} stock analyses, and ${fmt(data.paper.traders)} people placed ${fmt(data.paper.trades)} paper trades.`
  }, [data, isZh])

  const copySummary = async () => {
    try { await navigator.clipboard.writeText(summaryText); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ }
  }

  const exportCsv = () => {
    if (!data) return
    const u = data.users, s = data.site
    const lines = [
      ['metric', 'value'],
      ['generated', data.generated], ['login_tracking_since', data.tracking_since || ''],
      ['signed_in_users', u.total], ['active_today', u.dau], ['active_7d', u.wau], ['active_30d', u.mau],
      ['returning_users', u.returning], ['returning_pct', u.returning_pct], ['total_logins', u.total_logins],
      ['total_visits', s.total_visits], ['unique_devices', s.unique_devices], ['stocks_analyzed', s.stocks_analyzed],
      ['paper_accounts', data.paper.accounts], ['paper_traders', data.paper.traders], ['paper_trades', data.paper.trades],
      [], ['date', 'visits', 'new_users', 'active_users', 'logins'],
      ...data.series.map((d) => [d.date, d.visits, d.new_users, d.active_users, d.logins]),
    ]
    const blob = new Blob([lines.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bestfriendstock-impact-${data.generated}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  if (state === 'loading') return <Shell><p style={{ color: MUTED }}>{t.loading}</p></Shell>
  if (state === 'signin') {
    return (
      <Shell>
        <div className="dash-card" style={{ maxWidth: 420, textAlign: 'center', margin: '60px auto' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 14px' }}>{t.signIn}</p>
          <button className="dash-btn pri" onClick={onOpenAuth}>{t.signInBtn}</button>
        </div>
      </Shell>
    )
  }
  if (state === 'denied') return <Shell><div className="dash-card" style={{ maxWidth: 420, margin: '60px auto', textAlign: 'center', color: 'var(--text-secondary)' }}>{t.denied}</div></Shell>
  if (state === 'failed' || !data) {
    return <Shell><div className="dash-card" style={{ maxWidth: 420, margin: '60px auto', textAlign: 'center' }}><p style={{ color: 'var(--text-secondary)', margin: '0 0 12px' }}>{t.failed}</p><button className="dash-btn" onClick={load}>{t.retry}</button></div></Shell>
  }

  const u = data.users, s = data.site
  const uiTotal = (s.ui_split.mobile || 0) + (s.ui_split.desktop || 0)
  const features = Object.entries(s.feature_usage || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 8)

  return (
    <Shell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', color: ACCENT }}>{t.eyebrow}</div>
          <h1 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{t.title}</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 640, lineHeight: 1.6 }}>{t.sub}</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: MUTED }}>{t.since(data.tracking_since || data.generated)}</p>
        </div>
        <div className="dash-noprint" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="dash-btn" onClick={exportCsv}>{t.exportCsv}</button>
          <button className="dash-btn" onClick={() => window.print()}>{t.print}</button>
        </div>
      </div>

      <div className="dash-grid">
        <Stat label={t.users} value={fmt(u.total)} sub={t.newToday(u.new_today)} />
        <Stat label={t.dau} value={fmt(u.dau)} />
        <Stat label={t.wau} value={fmt(u.wau)} />
        <Stat label={t.mau} value={fmt(u.mau)} />
        <Stat label={t.returning} value={`${u.returning_pct}%`} sub={t.returningSub(fmt(u.returning))} />
        <Stat label={t.logins} value={fmt(u.total_logins)} />
      </div>
      <div className="dash-grid" style={{ marginTop: 12 }}>
        <Stat label={t.visits} value={fmt(s.total_visits)} sub={t.weekVisits(fmt(s.this_week_visits))} />
        <Stat label={t.devices} value={fmt(s.unique_devices)} />
        <Stat label={t.stocks} value={fmt(s.stocks_analyzed)} />
        <Stat label={t.paper} value={fmt(data.paper.trades)} sub={t.paperSub(fmt(data.paper.accounts), fmt(data.paper.traders))} />
      </div>

      <div className="dash-card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
          <h2 className="dash-h" style={{ margin: 0 }}>{t.trend}</h2>
          <div className="dash-noprint" style={{ display: 'flex', gap: 6 }}>
            {[30, 90].map((n) => <button key={n} className={`dash-chip${days === n ? ' on' : ''}`} onClick={() => setDays(n)}>{n === 30 ? t.d30 : t.d90}</button>)}
          </div>
        </div>
        <ReactECharts option={option} style={{ height: 260 }} notMerge />
      </div>

      <div className="dash-two">
        <div className="dash-card">
          <h2 className="dash-h">{t.sources}</h2>
          <Bars rows={(s.sources || []).slice(0, 6)} labelOf={(k) => t.src[k] || k} />
          {uiTotal > 0 && (
            <div style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>
              {t.ui}: {t.mobile} {Math.round(((s.ui_split.mobile || 0) / uiTotal) * 100)}% · {t.desktop} {Math.round(((s.ui_split.desktop || 0) / uiTotal) * 100)}%
            </div>
          )}
        </div>
        <div className="dash-card">
          <h2 className="dash-h">{t.features}</h2>
          <Bars rows={features} labelOf={(k) => t.feat[k] || k} />
        </div>
      </div>

      <div className="dash-two">
        <div className="dash-card">
          <h2 className="dash-h">{t.topStocks}</h2>
          {(s.top_stocks || []).slice(0, 8).map((x) => (
            <div className="dash-row" key={x.symbol}><span>{x.symbol} · {x.name}</span><span style={{ color: MUTED }}>{fmt(x.searches)} {t.searches}</span></div>
          ))}
        </div>
        <div className="dash-card">
          <h2 className="dash-h">{t.summary}</h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{summaryText}</p>
          <button className="dash-btn dash-noprint" style={{ marginTop: 12 }} onClick={copySummary}>{copied ? t.copied : t.copy}</button>
        </div>
      </div>

      <div className="dash-card dash-noprint" style={{ marginTop: 12 }}>
        <h2 className="dash-h">{t.members}</h2>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: MUTED }}>{t.membersSub}</p>
        <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) addMember(true, email.trim()) }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input id="dash-email" className="dash-in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.email} autoComplete="off" />
          <button className="dash-btn pri" type="submit">{t.grant}</button>
        </form>
        {memberErr && <div style={{ color: '#ef5350', fontSize: 12.5, marginTop: 8 }}>{memberErr}</div>}
        <div style={{ marginTop: 12 }}>
          {(members?.admins || []).map((e) => <div className="dash-row" key={e}><span>{e}</span><span className="dash-pill">{t.roleAdmin}</span></div>)}
          {(members?.members || []).map((m) => (
            <div className="dash-row" key={m.email}>
              <span>{m.email} {m.since && <span style={{ color: MUTED }}>· {m.since}</span>}</span>
              <button className="dash-btn" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => addMember(false, m.email)}>{t.revoke}</button>
            </div>
          ))}
          {members && !members.members.length && <div style={{ fontSize: 12.5, color: MUTED, paddingTop: 8 }}>{t.noMembers}</div>}
        </div>
      </div>
    </Shell>
  )
}
