// Reading a broker's transaction CSV for the journal import (JournalPage.jsx → /api/admin/journal/import).
//
// Brokers name their columns differently, so the header row is found by its words (date, action, symbol, quantity,
// price, fees, amount; English and Chinese) and each row's action is read from its text ("Buy", "Sold",
// "Qualified Dividend", "ACH deposit", "买入", "股息" ...). Rows that are not trades, dividends or cash moves
// (interest, fees, journal entries between sub-accounts) are listed as skipped. The journal's own export reads
// back the same way. Everything is checked again on the server.

/** RFC 4180-ish CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  const s = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''))
}

const COLUMNS = {
  date: [/^(trade ?date|transaction ?date|activity ?date|run ?date|date|成交日期|交易日期|日期)$/i, /date|日期/i],
  action: [/^(action|transaction ?type|type|side|activity|trans ?code|交易类型|方向|买卖方向|类型)$/i, /action|type|activity|description|类型|方向/i],
  symbol: [/^(symbol|ticker|代码|股票代码)$/i, /symbol|ticker|代码/i],
  quantity: [/^(quantity|qty|shares|数量|成交数量)$/i, /quantity|qty|shares|数量/i],
  price: [/^(price|price ?\(\$\)|trade ?price|成交价|成交价格|价格)$/i, /^price|成交价/i],
  fee: [/^(fees?|commission|fees ?& ?comm|commissions? ?(and|&) ?fees|手续费|佣金)$/i, /fee|commission|手续费|佣金/i],
  amount: [/^(amount|net ?amount|amount ?\(\$\)|proceeds|金额|成交金额|发生金额)$/i, /amount|proceeds|金额/i],
  reason: [/^(reason|note|notes|理由|备注)$/i],
  tag: [/^tag$/i],
}

function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const map = mapColumns(rows[i])
    const known = ['date', 'action', 'symbol', 'quantity', 'amount'].filter((k) => map[k] != null).length
    if (map.date != null && known >= 3) return { index: i, map }
  }
  return null
}

export function mapColumns(header) {
  const map = {}
  for (const [key, patterns] of Object.entries(COLUMNS)) {
    for (const re of patterns) {
      const j = header.findIndex((h, idx) => re.test(h) && !Object.values(map).includes(idx))
      if (j >= 0) { map[key] = j; break }
    }
  }
  return map
}

const num = (v) => {
  if (v == null) return null
  let s = String(v).replace(/[$,\s¥￥]/g, '')
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-')
  s = s.replace(/[()-]/g, '')
  if (s === '' || isNaN(Number(s))) return null
  return neg ? -Number(s) : Number(s)
}

export function toIsoDate(v) {
  const s = String(v || '')
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)                 // US style: month/day/year (first date wins)
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return null
}

export function actionOf(text) {
  const t = String(text || '').toLowerCase()
  if (/reinvest(ment)? shares|\bbuy\b|bought|purchase|买入|买/.test(t)) return 'buy'
  if (/\bsell\b|\bsold\b|卖出|卖/.test(t)) return 'sell'
  if (/div|股息|分红|派息/.test(t)) return 'dividend'
  if (/withdraw|transfer out|ach out|wire out|disbursement|出金|取出|转出/.test(t)) return 'withdraw'
  if (/deposit|transfer in|ach in|wire in|contribution|funds received|入金|存入|转入/.test(t)) return 'deposit'
  return null
}

const TRANSFER = /transfer|moneylink|funds received|\beft\b|\bach\b|\bwire\b|journaled cash|转账|资金/i

/** text -> {rows: [form-shaped rows], skipped: [{line, text}], columns: {key: header name}} or {error} */
export function readBrokerCsv(text) {
  const table = parseCsv(text)
  const head = findHeader(table)
  if (!head) return { error: 'header' }
  const { index, map } = head
  const header = table[index]
  const feeCols = header.map((h, j) => (/fee|commission|手续费|佣金|规费/i.test(h) ? j : -1)).filter((j) => j >= 0)
  const rows = [], skipped = []
  for (let i = index + 1; i < table.length; i++) {
    const r = table[i]
    const cell = (k) => (map[k] != null ? r[map[k]] : undefined)
    const date = toIsoDate(cell('date'))
    // the action may be in its own column, or only in a description column; a plain cash transfer is a deposit or a
    // withdrawal by the sign of its amount
    const signed = num(cell('amount'))
    const type = actionOf(cell('action')) || actionOf(r.join(' '))
      || (TRANSFER.test(r.join(' ')) && signed ? (signed > 0 ? 'deposit' : 'withdraw') : null)
    if (!date || !type) { skipped.push({ line: i + 1, text: r.join(', ').slice(0, 120) }); continue }
    const qty = Math.abs(num(cell('quantity')) ?? 0)
    const amount = Math.abs(num(cell('amount')) ?? 0)
    const fee = feeCols.reduce((a, j) => a + Math.abs(num(r[j]) ?? 0), 0)
    let price = Math.abs(num(cell('price')) ?? 0)
    if (!price && qty && amount) price = Math.max(0, (type === 'buy' ? amount - fee : amount + fee)) / qty
    const sym = String(cell('symbol') || '').trim().toUpperCase().replace(/\s+/g, '')
    const out = { date, type }
    if (type === 'buy' || type === 'sell') Object.assign(out, { ticker: sym, shares: qty, price: Number(price.toFixed(6)), fee })
    else out.amount = amount
    if (type === 'dividend') out.ticker = sym
    if (cell('reason')) out.reason = cell('reason')
    if (cell('tag')) out.tag = cell('tag')
    rows.push(out)
  }
  const columns = Object.fromEntries(Object.entries(map).map(([k, j]) => [k, header[j]]))
  return { rows, skipped, columns }
}
