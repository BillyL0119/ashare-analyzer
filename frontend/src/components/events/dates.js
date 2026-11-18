// Calendar dates are plain 'YYYY-MM-DD' strings, so no time zone can move a day. "Today" is New York's date,
// because that is the market's calendar.

export const ISO = /^\d{4}-\d{2}-\d{2}$/

export function isIso(s) {
  if (!ISO.test(s || '')) return false
  const d = new Date(`${s}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export function todayET() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function sundayOf(iso) {
  const d = new Date(`${iso}T12:00:00Z`)
  return addDays(iso, -d.getUTCDay())
}
