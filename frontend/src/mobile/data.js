import { useEffect, useRef, useState } from 'react'

const PREFIX = 'bfs_m_cache:'
const MAX_AGE = 24 * 3600 * 1000

function readCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { t, v } = JSON.parse(raw)
    return Date.now() - t < MAX_AGE ? v : null
  } catch { return null }
}
function writeCache(key, v) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v })) } catch { /* quota / private mode */ }
}

export async function getJSON(path, { signal, timeout = 20000 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  signal?.addEventListener('abort', () => ctrl.abort())
  try {
    const res = await fetch('/api' + path, { signal: ctrl.signal })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } finally { clearTimeout(timer) }
}

/**
 * Stale-while-revalidate: paints the last good response at once, then refreshes it.
 * A failed refresh keeps the old data and only sets `error`.
 */
export function useAPI(path, { enabled = true, persist = true, refreshMs = 0 } = {}) {
  const key = path
  const [data, setData] = useState(() => (enabled && persist ? readCache(key) : null))
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [stale, setStale] = useState(false)
  const run = useRef(0)

  const load = useRef(null)
  load.current = async () => {
    if (!enabled || !path) return
    const id = ++run.current
    setLoading(true)
    try {
      const v = await getJSON(path)
      if (id !== run.current) return
      setData(v); setError(null); setStale(false)
      if (persist) writeCache(key, v)
    } catch (e) {
      if (id !== run.current) return
      setError(e); setStale(true)
    } finally {
      if (id === run.current) setLoading(false)
    }
  }

  useEffect(() => {
    setData(enabled && persist ? readCache(key) : null)
    setError(null)
    load.current()
    const runs = run
    if (!refreshMs) return () => { runs.current++ }
    const timer = setInterval(() => load.current(), refreshMs)
    return () => { clearInterval(timer); runs.current++ }
  }, [key, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, error, loading, stale, reload: () => load.current() }
}

export const pct = (v) => (v == null ? '--' : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}%`)
export const num = (v, d = 2) => (v == null || Number.isNaN(Number(v)) ? '--' : Number(v).toFixed(d))
