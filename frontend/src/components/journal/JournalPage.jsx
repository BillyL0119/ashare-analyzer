import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from '../../lib/echarts'
import useAuthStore from '../../store/authStore'
import useThemeStore from '../../store/themeStore'
import useCompareStore from '../../store/compareStore'
import { THEME } from '../../utils/chartHelpers'
import { changeColor } from '../quotepage/format'
import '../quotepage/quotepage.css'
import '../factors/factors.css'
import '../quant/quant.css'
import './journal.css'
import JournalImport from './JournalImport'

// "我的投资记录": the admin's own real trades, with the reason for each, compared with the S&P 500.
// Data lives on the server per account (/api/admin/journal, admin only); the maths is in backend/services/journal.py.

const SECTOR_ZH = { 'Communication Services': '通信服务', 'Consumer Discretionary': '可选消费', 'Consumer Staples': '必需消费',
  Energy: '能源', Financials: '金融', Finance: '金融', 'Health Care': '医疗保健', Industrials: '工业', 'Information Technology': '信息技术',
  Technology: '科技', Materials: '原材料', 'Basic Materials': '基础材料', 'Real Estate': '房地产', Utilities: '公用事业',
  Telecommunications: '电信', Miscellaneous: '其他', 'ETF / fund': '指数基金 / ETF', Other: '其他', cash: '现金' }

const S = {
  zh: {
    title: '我的投资记录', only: '只有你能看到', sub: '记下每一笔真实的买卖和当时的理由，网站帮你算收益、和标普 500 比、提醒风险。',
    export: '导出备份（CSV）', loading: '加载中…', signIn: '请先登录管理员账号', signInBtn: '登录', denied: '这个账号没有权限。', failed: '加载失败，请稍后重试。',
    emptyTitle: '从第一笔开始', empty: ['先记一笔"入金"：你往券商账户里存了多少钱。', '之后每次买卖都记一笔，并写下理由：为什么买、打算拿多久、什么情况下卖。', '网站会自动算出你的收益，和标普 500 比较，并在仓位太集中时提醒你。'],
    value: '账户总值', gain: '总盈亏', gainSub: (d) => `投入本金 $${d}`, ret: '收益率（扣除存取款影响）', vsSpy: (s) => `同期标普 500：${s}`,
    vsModel: (m) => `研究台模型同期：${m}`, dd: '最大回撤', ddSub: '从最高点最多跌了多少', cash: (c) => `其中现金 $${c}`,
    chart: '你的账户 vs 标普 500（起点 = 100）', lineMe: '我的账户', lineSpy: '标普 500（含分红）',
    warnTitle: '提醒', noWarn: '目前没有需要特别注意的地方。',
    warn: {
      big_position: (w) => `${w.ticker} 占了账户的 ${w.pct}%。一只股票超过 20%，它出问题时整个账户都会受重伤。`,
      big_sector: (w, z) => `${z(w.sector)} 行业占了 ${w.pct}%。同一个行业的股票常常一起涨跌，等于没分散。`,
      few_names: (w) => `只持有 ${w.n} 只个股，也没有指数基金。持股太少，运气对结果的影响很大。`,
      drawdown: (w) => `账户曾从高点回撤 ${Math.abs(w.pct)}%。回头看看那段时间你做了什么决定。`,
      many_trades: (w) => `最近 30 天交易了 ${w.n} 次。交易越频繁，成本越高，也越容易被情绪带着走。`,
    },
    holdTitle: '当前持仓', cols: ['股票', '股数', '平均成本', '现价', '市值', '占比', '盈亏', '行业'],
    formTitle: '记一笔', editTitle: '修改这一笔', types: { buy: '买入', sell: '卖出', deposit: '入金', withdraw: '出金', dividend: '分红' },
    f: { date: '日期', ticker: '股票代码', shares: '股数（可以是小数）', price: '成交价（美元）', fee: '手续费', amount: '金额（美元）',
      tag: '这笔属于', reason: '理由', note: '备注（可不填）' },
    tags: { own: '自己挑的', model: '按研究台规则', index: '指数基金', other: '其他' },
    reasonHint: { buy: '为什么买？打算拿多久？跌到什么程度或出现什么情况你会卖？', sell: '为什么卖？和当初买的理由比，发生了什么变化？' },
    save: '保存', saving: '保存中…', cancel: '取消', saved: '已保存',
    reviewTitle: '复盘：卖出时对照当初的理由', noReview: '还没有卖出过。卖出后会在这里对照你买入和卖出时写的理由。',
    held: (n) => `持有 ${n} 天`, buyWhy: '买入时的理由', sellWhy: '卖出时的理由',
    needsReason: '待补写理由', listTitle: '全部记录', edit: '修改', del: '删除', confirmDel: '确定删除这一笔吗？删除后不能恢复（可以先导出备份）。',
    disclaimer: '这是记录和复盘工具，不是投资建议。收益按"时间加权"计算：存钱取钱不算赚亏。行情来自 Nasdaq 和腾讯，可能有延迟。',
  },
  en: {
    title: 'My investing journal', only: 'Only you can see this', sub: 'Write down every real trade and why; the site works out your return, compares it with the S&P 500 and flags risks.',
    export: 'Export backup (CSV)', loading: 'Loading…', signIn: 'Sign in with an admin account', signInBtn: 'Sign in', denied: 'This account has no access.', failed: 'Could not load. Try again later.',
    emptyTitle: 'Start with the first entry', empty: ['Record a deposit: how much you put into your brokerage account.', 'Then record every buy and sell with the reason: why, for how long, and what would make you sell.', 'The site works out your return, compares it with the S&P 500 and warns when you are too concentrated.'],
    value: 'Account value', gain: 'Total gain', gainSub: (d) => `Money put in $${d}`, ret: 'Return (deposits excluded)', vsSpy: (s) => `S&P 500 same period: ${s}`,
    vsModel: (m) => `Desk model same period: ${m}`, dd: 'Worst drawdown', ddSub: 'Biggest fall from a high', cash: (c) => `Cash $${c}`,
    chart: 'Your account vs the S&P 500 (start = 100)', lineMe: 'My account', lineSpy: 'S&P 500 (with dividends)',
    warnTitle: 'Things to watch', noWarn: 'Nothing that needs attention right now.',
    warn: {
      big_position: (w) => `${w.ticker} is ${w.pct}% of the account. Above 20%, one bad stock hurts the whole account.`,
      big_sector: (w, z) => `${z(w.sector)} is ${w.pct}% of the account. Stocks in one sector tend to move together.`,
      few_names: (w) => `Only ${w.n} stocks and no index fund: luck decides a lot with so few.`,
      drawdown: (w) => `The account fell ${Math.abs(w.pct)}% from a high at one point. Look back at what you decided then.`,
      many_trades: (w) => `${w.n} trades in the last 30 days. Frequent trading costs more and invites emotional decisions.`,
    },
    holdTitle: 'Holdings', cols: ['Stock', 'Shares', 'Avg cost', 'Price', 'Value', 'Weight', 'Gain', 'Sector'],
    formTitle: 'Add an entry', editTitle: 'Edit this entry', types: { buy: 'Buy', sell: 'Sell', deposit: 'Deposit', withdraw: 'Withdraw', dividend: 'Dividend' },
    f: { date: 'Date', ticker: 'Ticker', shares: 'Shares (fractions OK)', price: 'Price (USD)', fee: 'Fee', amount: 'Amount (USD)',
      tag: 'This trade is', reason: 'Reason', note: 'Note (optional)' },
    tags: { own: 'My own pick', model: 'From the desk rule', index: 'Index fund', other: 'Other' },
    reasonHint: { buy: 'Why buy? For how long? What fall or event would make you sell?', sell: 'Why sell? What changed since the reason you bought?' },
    save: 'Save', saving: 'Saving…', cancel: 'Cancel', saved: 'Saved',
    reviewTitle: 'Review: each sale against the original reason', noReview: 'No sales yet. After one, your buy and sell reasons appear side by side here.',
    held: (n) => `held ${n} days`, buyWhy: 'Why you bought', sellWhy: 'Why you sold',
    needsReason: 'Reason to write', listTitle: 'All entries', edit: 'Edit', del: 'Delete', confirmDel: 'Delete this entry? It cannot be undone (export a backup first if unsure).',
    disclaimer: 'A record-keeping and review tool, not investment advice. Returns are time-weighted: deposits and withdrawals are not gains or losses. Prices from Nasdaq and Tencent, possibly delayed.',
  },
}

const money = (v, d = 2) => (v == null ? '—' : `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`)
const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%`)
// the person's own calendar day (toISOString would give UTC: tomorrow already in the US evening)
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const BLANK = { type: 'buy', date: today(), ticker: '', shares: '', price: '', fee: '', amount: '', tag: 'own', reason: '' }

function Chart({ series, L }) {
  const theme = useThemeStore((s) => s.theme)
  const option = useMemo(() => {
    void theme
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-blue').trim() || '#6c9cff'
    return {
      animation: false, grid: { left: 8, right: 8, top: 10, bottom: 22, containLabel: true },
      tooltip: { trigger: 'axis', confine: true, backgroundColor: THEME.tooltipBg, borderColor: THEME.border, textStyle: { color: THEME.tooltipText, fontSize: 12 } },
      xAxis: { type: 'category', data: series.map((x) => x.date), boundaryGap: false, axisTick: { show: false },
        axisLine: { lineStyle: { color: THEME.border } }, axisLabel: { color: THEME.text, fontSize: 11, hideOverlap: true } },
      yAxis: { type: 'value', scale: true, axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: THEME.border, opacity: 0.6 } }, axisLabel: { color: THEME.text, fontSize: 11 } },
      series: [
        { name: L.lineMe, type: 'line', showSymbol: false, data: series.map((x) => x.account), lineStyle: { width: 2, color: accent }, itemStyle: { color: accent } },
        { name: L.lineSpy, type: 'line', showSymbol: false, data: series.map((x) => x.spy), lineStyle: { width: 1.4, color: THEME.text, type: 'dashed' }, itemStyle: { color: THEME.text } },
      ],
    }
  }, [series, L, theme])
  return <div className="qd-chart"><ReactECharts option={option} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} /></div>
}

function EntryForm({ L, initial, onSave, onCancel, busy, error }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const trade = f.type === 'buy' || f.type === 'sell'
  return (
    <form className="jn-form" onSubmit={(e) => { e.preventDefault(); onSave(f) }}>
      <div className="qp-seg jn-types" role="group" aria-label={L.formTitle}>
        {Object.keys(L.types).map((t) => (
          <button key={t} type="button" aria-pressed={f.type === t} onClick={() => setF((x) => ({ ...x, type: t }))}>{L.types[t]}</button>
        ))}
      </div>
      <div className="jn-grid">
        <label htmlFor="jn-date">{L.f.date}<input id="jn-date" type="date" value={f.date} max={today()} onChange={set('date')} required /></label>
        {(trade || f.type === 'dividend') && (
          <label htmlFor="jn-ticker">{L.f.ticker}<input id="jn-ticker" value={f.ticker} onChange={set('ticker')} placeholder="AAPL" autoCapitalize="characters" required /></label>
        )}
        {trade && <label htmlFor="jn-shares">{L.f.shares}<input id="jn-shares" inputMode="decimal" value={f.shares} onChange={set('shares')} required /></label>}
        {trade && <label htmlFor="jn-price">{L.f.price}<input id="jn-price" inputMode="decimal" value={f.price} onChange={set('price')} required /></label>}
        {trade && <label htmlFor="jn-fee">{L.f.fee}<input id="jn-fee" inputMode="decimal" value={f.fee} onChange={set('fee')} placeholder="0" /></label>}
        {!trade && <label htmlFor="jn-amount">{L.f.amount}<input id="jn-amount" inputMode="decimal" value={f.amount} onChange={set('amount')} required /></label>}
        {trade && (
          <label htmlFor="jn-tag">{L.f.tag}
            <select id="jn-tag" value={f.tag} onChange={set('tag')}>{Object.keys(L.tags).map((t) => <option key={t} value={t}>{L.tags[t]}</option>)}</select>
          </label>
        )}
      </div>
      <label htmlFor="jn-reason" className="jn-reason">{trade ? L.f.reason : L.f.note}
        <textarea id="jn-reason" rows={3} value={f.reason} onChange={set('reason')} placeholder={trade ? L.reasonHint[f.type] : ''} required={trade} />
      </label>
      {error && <p className="jn-error" role="alert">{error}</p>}
      <div className="jn-actions">
        <button type="submit" className="qd-btn" disabled={busy}>{busy ? L.saving : L.save}</button>
        {onCancel && <button type="button" className="qd-btn qd-btn-quiet" onClick={onCancel}>{L.cancel}</button>}
      </div>
    </form>
  )
}

export default function JournalPage({ lang, onOpenAuth }) {
  const L = S[lang === 'zh' ? 'zh' : 'en']
  const zh = lang === 'zh'
  const z = (s) => (zh ? SECTOR_ZH[s] || s : s === 'cash' ? 'Cash' : s)
  const { session, loading: authLoading } = useAuthStore()
  const token = session?.access_token
  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const navigate = useNavigate()

  const call = useCallback((path, opts = {}) => fetch(`/api/admin/journal${path}`, {
    ...opts, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  }), [token])

  const load = useCallback(async () => {
    if (authLoading) return
    if (!token) { setState('signin'); return }
    try {
      const r = await call('')
      if (r.status === 401) { setState('signin'); return }
      if (r.status === 403) { setState('denied'); return }
      if (!r.ok) throw new Error(String(r.status))
      setData(await r.json())
      setState('ok')
    } catch { setState('failed') }
  }, [authLoading, token, call])
  useEffect(() => { load() }, [load])

  const save = async (f) => {
    setBusy(true); setError('')
    try {
      const r = await call(editing ? `/entries/${editing.id}` : '/entries', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(f) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setError(j.detail || L.failed); return }
      setEditing(null); setFormKey((k) => k + 1)
      await load()
    } finally { setBusy(false) }
  }
  const remove = async (e) => {
    if (!window.confirm(L.confirmDel)) return
    const r = await call(`/entries/${e.id}`, { method: 'DELETE' })
    if (!r.ok) { const j = await r.json().catch(() => ({})); window.alert(j.detail || L.failed); return }
    await load()
  }
  const exportCsv = async () => {
    const r = await call('/export.csv')
    if (!r.ok) return
    const url = URL.createObjectURL(await r.blob())
    const a = document.createElement('a')
    a.href = url; a.download = `investing-journal-${today()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }
  const openStock = (sym) => {
    useCompareStore.getState().switchMarketAndAddSymbol('us', { code: sym, name: sym })
    navigate(`/stock/us/${encodeURIComponent(sym)}`)
  }

  if (state !== 'ok') {
    return (
      <div className="qd">
        <h2 className="fl-title">{L.title}</h2>
        {state === 'loading' && <div className="qp-skel" style={{ height: 200 }} aria-busy="true" />}
        {state === 'signin' && <div className="qd-msg"><p>{L.signIn}</p><button type="button" className="qd-btn" onClick={onOpenAuth}>{L.signInBtn}</button></div>}
        {state === 'denied' && <div className="qd-msg"><p>{L.denied}</p></div>}
        {state === 'failed' && <div className="qd-msg" role="alert"><p>{L.failed}</p></div>}
      </div>
    )
  }
  const s = data.summary || {}
  const entries = data.entries || []
  return (
    <div className="qd">
      <header className="qd-header">
        <div>
          <h2 className="fl-title">{L.title} <span className="qd-badge">{L.only}</span></h2>
          <p className="qd-meta">{L.sub}</p>
        </div>
        {entries.length > 0 && <button type="button" className="qd-btn qd-btn-quiet" onClick={exportCsv}>{L.export}</button>}
      </header>

      {s.error && <p className="jn-error" role="alert">{s.error}</p>}

      {s.empty !== false || !s.holdings ? (
        <section className="qp-card" aria-label={L.emptyTitle}>
          <div className="qp-head"><h3 className="qp-h">{L.emptyTitle}</h3></div>
          <ol className="qd-steps-list">{L.empty.map((x) => <li key={x}><p>{x}</p></li>)}</ol>
        </section>
      ) : (
        <>
          <div className="jn-stats">
            <div className="qp-card jn-stat"><span>{L.value}</span><b>{money(s.total_value)}</b><small>{L.cash(s.cash?.toLocaleString('en-US', { maximumFractionDigits: 2 }))}</small></div>
            <div className="qp-card jn-stat"><span>{L.gain}</span><b style={{ color: changeColor(s.total_gain) }}>{money(s.total_gain)}</b><small>{L.gainSub(s.net_deposits?.toLocaleString('en-US'))}</small></div>
            <div className="qp-card jn-stat"><span>{L.ret}</span><b style={{ color: changeColor(s.return_pct) }}>{pct(s.return_pct)}</b>
              <small>{L.vsSpy(pct(s.spy_pct))}{s.model ? ` · ${L.vsModel(pct(s.model.pct))}` : ''}</small></div>
            <div className="qp-card jn-stat"><span>{L.dd}</span><b>{pct(s.max_drawdown_pct)}</b><small>{L.ddSub}</small></div>
          </div>

          {s.series?.length > 1 && (
            <section className="qp-card" aria-label={L.chart}>
              <div className="qp-head"><h3 className="qp-h">{L.chart}</h3></div>
              <Chart series={s.series} L={L} />
            </section>
          )}

          <section className="qp-card" aria-label={L.warnTitle}>
            <div className="qp-head"><h3 className="qp-h">{L.warnTitle}</h3></div>
            {s.warnings?.length ? (
              <ul className="qd-points">{s.warnings.map((w, i) => (
                <li key={i}><span className="qd-dot down" aria-hidden="true" />{L.warn[w.code]?.(w, z) || w.code}</li>
              ))}</ul>
            ) : <p className="qd-note">{L.noWarn}</p>}
          </section>

          {s.holdings.length > 0 && (
            <section className="qp-card" aria-label={L.holdTitle}>
              <div className="qp-head"><h3 className="qp-h">{L.holdTitle}</h3></div>
              <div className="fl-table-wrap">
                <table className="fl-table jn-table">
                  <thead><tr>{L.cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
                  <tbody>
                    {s.holdings.map((h) => (
                      <tr key={h.ticker}>
                        <td><button type="button" className="fl-sym" onClick={() => openStock(h.ticker)}>{h.ticker}</button>
                          <span className="fl-name">{zh && h.name_zh ? h.name_zh : h.name}</span></td>
                        <td>{h.shares}</td><td>{money(h.avg_cost)}</td><td>{money(h.price)}</td><td>{money(h.value)}</td>
                        <td>{h.weight.toFixed(1)}%</td>
                        <td style={{ color: changeColor(h.gain) }}>{money(h.gain)} <small>{pct(h.gain_pct)}</small></td>
                        <td className="qd-sector">{z(h.sector)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <section className="qp-card" aria-label={editing ? L.editTitle : L.formTitle}>
        <div className="qp-head"><h3 className="qp-h">{editing ? L.editTitle : L.formTitle}</h3></div>
        <EntryForm key={editing ? editing.id : `new-${formKey}`} L={L} busy={busy} error={error}
          initial={editing ? { ...BLANK, ...editing, fee: editing.fee ?? '', amount: editing.amount ?? '', reason: editing.needs_reason ? '' : (editing.reason ?? '') } : { ...BLANK, date: today() }}
          onSave={save} onCancel={editing ? () => { setEditing(null); setError('') } : null} />
      </section>

      <JournalImport call={call} lang={lang} onDone={load} />

      {s.empty === false && (
        <section className="qp-card" aria-label={L.reviewTitle}>
          <div className="qp-head"><h3 className="qp-h">{L.reviewTitle}</h3></div>
          {s.realised?.length ? (
            <div className="jn-reviews">
              {s.realised.map((r) => (
                <article key={r.id || `${r.date}${r.ticker}`} className="jn-review">
                  <header>
                    <b>{r.ticker}</b> <span className="qd-sub">{r.date} · {L.held(r.held_days)}</span>
                    <span style={{ color: changeColor(r.gain), marginLeft: 'auto' }}>{money(r.gain)} {pct(r.gain_pct)}</span>
                  </header>
                  <div className="jn-why"><span>{L.buyWhy}</span>{r.buy_reasons.map((b) => <p key={b.date + b.reason}>{b.date}：{b.reason}</p>)}</div>
                  <div className="jn-why"><span>{L.sellWhy}</span><p>{r.sell_reason}</p></div>
                </article>
              ))}
            </div>
          ) : <p className="qd-note">{L.noReview}</p>}
        </section>
      )}

      {entries.length > 0 && (
        <section className="qp-card" aria-label={L.listTitle}>
          <div className="qp-head"><h3 className="qp-h">{L.listTitle}</h3></div>
          <ul className="jn-list">
            {entries.map((e) => (
              <li key={e.id}>
                <span className="jn-date">{e.date}</span>
                <b>{L.types[e.type]}</b>
                <span className="jn-what">
                  {e.ticker ? `${e.ticker} ` : ''}
                  {e.shares != null ? `${e.shares} × ${money(e.price)}` : money(e.amount)}
                  {e.tag ? ` · ${L.tags[e.tag] || e.tag}` : ''}
                  {e.needs_reason ? <span className="jn-badge">{L.needsReason}</span> : e.reason ? <small>{e.reason}</small> : null}
                </span>
                <span className="jn-buttons">
                  <button type="button" onClick={() => { setEditing(e); setError(''); setTimeout(() => document.getElementById('jn-date')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0) }}>{L.edit}</button>
                  <button type="button" onClick={() => remove(e)}>{L.del}</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="qd-foot">{L.disclaimer}</p>
    </div>
  )
}
