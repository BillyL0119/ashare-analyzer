import useQuoteApi from '../quotepage/useQuoteApi'
import { LOCALE, isNum, fmtPrice, fmtSignedPct } from '../quotepage/format'

// The US index levels in the right of the desktop nav row, on every page except the home page (which shows
// them large). A dot marks whether the regular session is open.
const STATE_LABEL = { regular: { en: 'Market open', zh: '美股交易中' }, pre: { en: 'Pre-market', zh: '盘前' }, post: { en: 'After hours', zh: '盘后' }, closed: { en: 'Market closed', zh: '美股休市' } }

export default function MarketTicker({ lang }) {
  const { data } = useQuoteApi('/api/us/market/overview', { ttl: 60_000, poll: 60_000 })
  const idx = data?.indices
  if (!idx?.length) return <div className="bfs-site-nav-ticker" aria-hidden="true" />
  const state = data.session?.state || 'closed'
  const label = (STATE_LABEL[state] || STATE_LABEL.closed)[lang === 'zh' ? 'zh' : 'en']
  return (
    <div className="bfs-site-nav-ticker" role="group" aria-label={label}>
      <span className={`bfs-tick-dot${state === 'regular' ? ' is-live' : ''}`} title={label} />
      {idx.slice(0, 4).map((i) => {
        const color = !isNum(i.pct) || i.pct === 0 ? 'var(--text-muted)' : i.pct > 0 ? 'var(--green-bright)' : 'var(--red-bright)'      // the nav bar is navy in both themes: its own tokens
        return (
          <span key={i.symbol} className="bfs-tick">
            <span className="n">{lang === 'zh' ? i.name_zh || i.name : i.name}</span>
            <span className="p">{fmtPrice(i.price, lang)}</span>
            <span className="c" style={{ color }}>{fmtSignedPct(i.pct)}</span>
          </span>
        )
      })}
    </div>
  )
}
