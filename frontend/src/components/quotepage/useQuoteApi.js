import { useEffect, useState } from 'react'
import visibleInterval from '../../utils/visibleInterval'

// Fetch one quote-page endpoint with a small in-memory cache shared by every tab, so switching tabs or
// tickers back and forth does not refetch. `poll` (ms) refreshes live data, e.g. the price while the
// market is open. Returns { data, error, loading } for the current url; data from a previous url is never shown.
const cache = new Map()   // url -> { at, data }
const inflight = new Map() // url -> Promise: two components asking for the same url share one request

export default function useQuoteApi(url, { ttl = 60_000, poll = 0 } = {}) {
  const [res, setRes] = useState({ url: null, data: null, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!url) return undefined
    let alive = true
    const hit = cache.get(url)
    if (hit && Date.now() - hit.at < ttl) {
      Promise.resolve().then(() => { if (alive) setRes({ url, data: hit.data, error: null }) })
      return () => { alive = false }
    }
    let req = inflight.get(url)
    if (!req) {
      req = fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((data) => { cache.set(url, { at: Date.now(), data }); return data })
        .finally(() => inflight.delete(url))
      inflight.set(url, req)
    }
    req
      .then((data) => { if (alive) setRes({ url, data, error: null }) })
      .catch((error) => { if (alive) setRes((prev) => ({ url, data: prev.url === url ? prev.data : null, error })) })
    return () => { alive = false }
  }, [url, ttl, tick])

  useEffect(() => {
    if (!poll || !url) return undefined
    // Header and summary poll the same live quote: the one that fires second finds the fresh copy instead of asking again
    return visibleInterval(() => {
      const hit = cache.get(url)
      if (!hit || Date.now() - hit.at >= poll * 0.8) cache.delete(url)
      setTick((n) => n + 1)
    }, poll)
  }, [poll, url])

  const current = res.url === url
  return {
    data: current ? res.data : null,
    error: current ? res.error : null,
    loading: Boolean(url) && !current,
  }
}

/** The live quote in two steps: the quick answer (`?fast=1`: header, price, ranges, market cap) draws the page at
 * once, and the complete one (EPS, P/E, beta, dividend, earnings date: up to several seconds for a ticker nobody
 * opened yet) replaces it when it arrives. While only the quick one is here `data.partial` is true. */
export function useQuoteLive(code, opts = {}) {
  const base = code ? `/api/us/quote/${code}/live` : null
  const full = useQuoteApi(base, opts)
  const quick = useQuoteApi(base ? `${base}?fast=1` : null, { ttl: 10_000 })
  const data = full.data || quick.data
  return {
    data,
    error: data ? null : full.error,
    loading: !data && (full.loading || quick.loading) && !full.error,
  }
}
