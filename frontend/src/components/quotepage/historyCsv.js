// CSV for the Historical data tab, built in the browser from the endpoint's JSON (no extra request).
// Opens cleanly in Excel, Google Sheets and pandas: ISO dates, plain numbers (no thousands separators, no
// currency signs), oldest first, one header row, CRLF line ends, empty cell for a missing value.

const cell = (v) => (v === null || v === undefined || Number.isNaN(v) ? '' : String(v))

/** rows arrive newest first (as the API sends them); the file lists them oldest first */
export function historyCsv(rows) {
  const lines = ['Date,Open,High,Low,Close,Adj Close,Volume']
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]
    lines.push([r.date, r.open, r.high, r.low, r.close, r.adj_close, r.volume].map(cell).join(','))
  }
  return `${lines.join('\r\n')}\r\n`
}

export function dividendsCsv(dividends) {
  const lines = ['Date,Dividend']
  for (let i = dividends.length - 1; i >= 0; i--) lines.push(`${dividends[i].date},${cell(dividends[i].amount)}`)
  return `${lines.join('\r\n')}\r\n`
}

const WORD = { '1d': 'daily', '1wk': 'weekly', '1mo': 'monthly' }

/** AAPL_daily_2025-11-18_2026-11-18.csv */
export function csvName(symbol, interval, from, to) {
  return `${symbol.replace(/[^A-Za-z0-9.]/g, '')}_${WORD[interval] || interval}_${from}_${to}.csv`
}

export function dividendsCsvName(symbol, from, to) {
  return `${symbol.replace(/[^A-Za-z0-9.]/g, '')}_dividends_${from}_${to}.csv`
}

/** Hand the text to the browser as a file download (Blob + object URL). */
export function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
