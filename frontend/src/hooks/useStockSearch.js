import { useEffect, useRef, useState } from 'react'
import { localName } from '../utils/markets'

const get = (path) => fetch('/api' + path).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))

/**
 * Company or ticker search across the US, A-share, Hong Kong and Japan lists ("苹果", "NVDA", "茅台",
 * "腾讯", "Toyota"). `only` limits it to one market (a competition trades a single market).
 * Rows: { code, name, pct, price?, market }, the `first` market's matches on top. null while the first answer is pending.
 */
export default function useStockSearch(query, lang, { only = null, first = 'us' } = {}) {
  const [result, setResult] = useState({ key: '', rows: null })
  const seq = useRef(0)
  useEffect(() => {
    const term = (query || '').trim()
    const id = ++seq.current
    if (!term) return undefined
    const want = (m) => !only || only === m
    const timer = setTimeout(async () => {
      // A-share lookup only when the text can be an A-share (digits or Chinese characters)
      const mayBeAShare = /^\d+$/.test(term) || /[⺀-￿]/.test(term)
      const q = encodeURIComponent(term)
      const none = Promise.resolve([])
      const [cn, us, hk, jp] = await Promise.allSettled([
        want('cn') && mayBeAShare ? get('/stocks/search?q=' + q) : none,
        want('us') ? get('/us/market/search?q=' + q).then((d) => d.results || []) : none,
        want('hk') ? get('/hk/search?q=' + q) : none,
        want('jp') ? get('/jp/search?q=' + q) : none,
      ])
      if (id !== seq.current) return
      const ok = (r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [])
      const lists = {
        cn: ok(cn).filter((r) => !r.market || r.market === 'cn').map((r) => ({ code: r.code, name: r.name, pct: r.change_pct, market: 'cn' })),
        us: ok(us).map((r) => ({ code: r.symbol, name: lang === 'zh' && r.name_zh ? r.name_zh : r.name, pct: r.pct, price: r.price, market: 'us' })),
        hk: ok(hk).map((r) => ({ code: r.symbol, name: localName(r, lang, 'hk'), pct: r.change_pct, price: r.price, market: 'hk' })),
        jp: ok(jp).map((r) => ({ code: r.symbol, name: localName(r, lang, 'jp'), pct: r.change_pct, price: r.price, market: 'jp' })),
      }
      // A complete A-share code is answered even when the list does not carry it
      if (want('cn') && /^\d{6}$/.test(term) && !lists.cn.some((r) => r.code === term)) lists.cn.unshift({ code: term, name: term, pct: null, market: 'cn' })
      const order = [first, ...['us', 'cn', 'hk', 'jp'].filter((m) => m !== first)]
      // The reader's market gets more room; the others a few each
      setResult({ key: `${term}|${only}|${first}|${lang}`, rows: order.flatMap((m) => lists[m].filter((r) => r.code).slice(0, only || m === first ? 8 : 4)) })
    }, 280)
    return () => clearTimeout(timer)
  }, [query, lang, only, first])
  // Answers for an earlier query are not shown while the current one is pending
  return result.key === `${(query || '').trim()}|${only}|${first}|${lang}` ? result.rows : null
}
