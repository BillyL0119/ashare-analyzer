import { useState } from 'react'
import { readBrokerCsv } from './csvImport'

// "导入券商记录": read a broker's transaction CSV in the browser, show what would be added (a dry run on the server),
// then add it. Nothing is saved before the second button.

const S = {
  zh: {
    title: '导入券商记录（CSV）', sub: '从券商网站导出交易记录（CSV），在这里选文件。先显示会加入哪些记录，确认后才保存。',
    choose: '选择 CSV 文件', reading: '正在读取…', noHeader: '没认出这个文件的表头。需要有日期、操作（买入/卖出等）、代码、数量这几列。',
    found: (n, cols) => `读到 ${n} 行记录。认出的列：${cols}`,
    counts: (c) => `新记录 ${c.ok} 笔，已经记过 ${c.duplicate} 笔（会跳过），有问题 ${c.error} 笔。`,
    needReason: (n) => `其中 ${n} 笔买卖没有理由，导入后标成"待补写理由"，之后记得补上。`,
    problem: (p) => `不能导入：${p}。通常是缺了入金记录，或者文件只包含一部分历史。可以先手动记一笔入金再导入。`,
    skipped: (n) => `${n} 行不是买卖、分红或存取款（比如利息、费用、汇总行），没有导入：`,
    go: (n) => `导入 ${n} 笔`, done: (n) => `已导入 ${n} 笔。`, cancel: '取消', failed: '导入失败，请重试。',
    colNames: { date: '日期', action: '操作', symbol: '代码', quantity: '数量', price: '价格', fee: '费用', amount: '金额', reason: '理由', tag: '标签' },
    status: { ok: '新', duplicate: '已有', error: '有问题' }, types: { buy: '买入', sell: '卖出', deposit: '入金', withdraw: '出金', dividend: '分红' },
  },
  en: {
    title: 'Import from your broker (CSV)', sub: "Download your transactions as CSV from your broker's website and choose the file here. You see what would be added before anything is saved.",
    choose: 'Choose a CSV file', reading: 'Reading…', noHeader: 'Could not find the header row. The file needs columns for date, action (buy, sell, ...), symbol and quantity.',
    found: (n, cols) => `Read ${n} rows. Columns found: ${cols}`,
    counts: (c) => `${c.ok} new, ${c.duplicate} already in the journal (skipped), ${c.error} with a problem.`,
    needReason: (n) => `${n} trades have no reason; they are marked "reason to write" after the import.`,
    problem: (p) => `Cannot import: ${p}. Usually a deposit is missing, or the file covers only part of the history; add the deposit by hand first.`,
    skipped: (n) => `${n} lines are not trades, dividends or cash moves (interest, fees, totals) and were left out:`,
    go: (n) => `Import ${n}`, done: (n) => `Imported ${n}.`, cancel: 'Cancel', failed: 'Import failed. Try again.',
    colNames: { date: 'date', action: 'action', symbol: 'symbol', quantity: 'quantity', price: 'price', fee: 'fees', amount: 'amount', reason: 'reason', tag: 'tag' },
    status: { ok: 'new', duplicate: 'already there', error: 'problem' }, types: { buy: 'Buy', sell: 'Sell', deposit: 'Deposit', withdraw: 'Withdraw', dividend: 'Dividend' },
  },
}

export default function JournalImport({ call, lang, onDone }) {
  const L = S[lang === 'zh' ? 'zh' : 'en']
  const [state, setState] = useState(null)    // {rows, skipped, columns, preview} | {error} | {done}
  const [busy, setBusy] = useState(false)

  const pick = async (ev) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const parsed = readBrokerCsv(await file.text())
      if (parsed.error || !parsed.rows.length) { setState({ error: L.noHeader }); return }
      const r = await call('/import', { method: 'POST', body: JSON.stringify({ rows: parsed.rows, dry_run: true }) })
      if (!r.ok) { setState({ error: L.failed }); return }
      setState({ ...parsed, preview: await r.json() })
    } catch { setState({ error: L.failed }) } finally { setBusy(false) }
  }
  const commit = async () => {
    setBusy(true)
    try {
      const r = await call('/import', { method: 'POST', body: JSON.stringify({ rows: state.rows, dry_run: false }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setState({ ...state, error: j.detail || L.failed }); return }
      setState({ done: j.added })
      onDone?.()
    } catch { setState({ ...state, error: L.failed }) } finally { setBusy(false) }
  }

  const p = state?.preview
  const statusOf = (i) => p?.report?.find((x) => x.row === i)
  return (
    <section className="qp-card" aria-label={L.title}>
      <div className="qp-head"><div>
        <h3 className="qp-h">{L.title}</h3>
        <p className="qd-sub">{L.sub}</p>
      </div></div>
      <label className="qd-btn qd-btn-quiet jn-file">
        {busy ? L.reading : L.choose}
        <input id="jn-import-file" type="file" accept=".csv,text/csv" onChange={pick} disabled={busy} />
      </label>
      {state?.error && <p className="jn-error" role="alert">{state.error}</p>}
      {state?.done != null && <p className="qd-note">{L.done(state.done)}</p>}
      {p && (
        <div className="jn-import">
          <p className="qd-note">{L.found(state.rows.length, Object.entries(state.columns).map(([k, h]) => `${L.colNames[k] || k}=${h}`).join('，'))}</p>
          <p className="qd-note"><b>{L.counts(p.counts)}</b> {p.needs_reason ? L.needReason(p.needs_reason) : ''}</p>
          {p.problem && <p className="jn-error">{L.problem(p.problem)}</p>}
          <div className="fl-table-wrap jn-import-table">
            <table className="fl-table">
              <tbody>
                {state.rows.slice(0, 200).map((r, i) => {
                  const st = statusOf(i)
                  return (
                    <tr key={i} className={st?.status === 'ok' ? '' : 'jn-dim'}>
                      <td>{r.date}</td><td>{L.types[r.type]}</td><td>{r.ticker || ''}</td>
                      <td>{r.shares != null ? `${r.shares} × $${r.price}` : `$${r.amount}`}</td>
                      <td>{L.status[st?.status] || ''}{st?.message ? `：${st.message}` : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {state.skipped.length > 0 && (
            <details className="qd-foot"><summary>{L.skipped(state.skipped.length)}</summary>
              <ul>{state.skipped.slice(0, 50).map((s) => <li key={s.line}>{s.text}</li>)}</ul>
            </details>
          )}
          <div className="jn-actions">
            <button type="button" className="qd-btn" disabled={busy || !p.counts.ok || !!p.problem} onClick={commit}>{L.go(p.counts.ok)}</button>
            <button type="button" className="qd-btn qd-btn-quiet" onClick={() => setState(null)}>{L.cancel}</button>
          </div>
        </div>
      )}
    </section>
  )
}
