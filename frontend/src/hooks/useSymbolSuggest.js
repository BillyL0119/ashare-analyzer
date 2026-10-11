import { useEffect, useState } from 'react'

// Ticker suggestions for a trade box, so typing a company name ("google", "苹果", "茅台", "腾讯", "丰田")
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
      const url = market === 'cn' ? `/api/stocks/search?q=${encodeURIComponent(q)}` : `/api/${market}/search?q=${encodeURIComponent(q)}`
      fetch(url)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          if (!alive || !Array.isArray(rows)) return
          // US / HK / Japan rows share a shape (Japanese names come with name_zh for well-known companies)
          const list = market !== 'cn'
            ? rows.map((r) => ({ symbol: r.symbol, name: market === 'us' ? r.name : (r.name_en || r.name), nameZh: r.name_zh || (market === 'us' ? '' : r.name), price: r.price, change_pct: r.change_pct }))
            : rows.filter((r) => !r.market || r.market === 'cn').map((r) => ({ symbol: r.code, name: r.name, price: r.price, change_pct: r.change_pct }))
          setItems(list.filter((r) => r.symbol).slice(0, 6))
        })
        .catch(() => { if (alive) setItems([]) })
    }, 250)
    return () => { alive = false; clearTimeout(id) }
  }, [query, market])
  return items
}
