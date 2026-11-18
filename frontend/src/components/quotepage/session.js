// Pre-market, regular and after-hours prices all move (04:00-20:00 ET, weekdays): poll fast then, slowly otherwise.
export function extendedSessionNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date()).map((x) => [x.type, x.value]))
  const mins = (Number(p.hour) % 24) * 60 + Number(p.minute)
  return !['Sat', 'Sun'].includes(p.weekday) && mins >= 4 * 60 && mins < 20 * 60
}
