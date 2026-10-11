import { useEffect, useState } from 'react'

// Ticker suggestions for a trade box, so typing a company name ("google", "苹果", "茅台")
// finds the ticker. Users were typing names straight into the ticker field and getting no quote.
// Returns [{ symbol, name, price, change_pct }] (at most 6), debounced.
export default function useSymbolSuggest(query, market) {
  const [items, setItems] = useState([])
  useEffect(() => {
    const q = (query || '').trim()
    // Nothing to suggest for an empty box or a complete A-share code
    if (!q || (market === 'cn' && /^\d{6}$/.test(q))) { setItems([]); return }
    let alive = true
    const id = setTimeout(() => {
      const url = market === 'us' ? `/api/us/search?q=${encodeURIComponent(q)}` : `/api/stocks/search?q=${encodeURIComponent(q)}`
      fetch(url)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          if (!alive || !Array.isArray(rows)) return
          const list = market === 'us'
            ? rows.map((r) => ({ symbol: r.symbol, name: r.name, nameZh: r.name_zh, price: r.price, change_pct: r.change_pct }))
            : rows.filter((r) => !r.market || r.market === 'cn').map((r) => ({ symbol: r.code, name: r.name, price: r.price, change_pct: r.change_pct }))
          setItems(list.filter((r) => r.symbol).slice(0, 6))
        })
        .catch(() => { if (alive) setItems([]) })
    }, 250)
    return () => { alive = false; clearTimeout(id) }
  }, [query, market])
  return items
}
