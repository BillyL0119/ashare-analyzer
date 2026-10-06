/** East-Asian markets quote red-up; the US convention is green-up (same rule as the iOS app). */
export function changeColor(p, market = 'cn') {
  if (p == null || p === 0) return 'var(--text-2)'
  const up = p > 0
  const cn = market === 'cn'
  return (up === cn) ? 'var(--cn-up)' : 'var(--cn-down)'
}
export const marketOfRegion = (r) => (['cn', 'hk', 'jp', 'kr'].includes(r) ? 'cn' : 'us')


export const marketOf = (code) => (/^\d{6}$/.test(code) ? 'cn' : 'us')
