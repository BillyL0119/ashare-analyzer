import { useState, useEffect, useRef, useCallback } from 'react'
import { getStockHistory, getRealtimeQuote, getUSStockHistory, getUSRealtime } from '../api/stockApi'

const cache = new Map()

function cacheKey(symbol, period, startDate, endDate, adjust) {
  return `${symbol}_${period}_${startDate}_${endDate}_${adjust}`
}

export function useStockData(symbol, { period, startDate, endDate, adjust, market = 'cn' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [quote, setQuote] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const intervalRef = useRef(null)

  const key = cacheKey(symbol, period, startDate, endDate, adjust)

  const refetch = useCallback(() => {
    cache.delete(key)
    setRetryCount((c) => c + 1)
  }, [key])

  useEffect(() => {
    if (!symbol) return

    const fetchHistory = async () => {
      if (cache.has(key)) {
        setData(cache.get(key))
        return
      }
      setLoading(true)
      setError(null)
      try {
        let res
        if (market === 'us') {
          res = await getUSStockHistory(symbol, {
            period,
            start_date: startDate,
            end_date: endDate,
          })
        } else {
          res = await getStockHistory(symbol, {
            period,
            start_date: startDate,
            end_date: endDate,
            adjust,
          })
        }
        cache.set(key, res.data)
        setData(res.data)
      } catch (e) {
        setError(e.response?.data?.detail || e.message || 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    const fetchQuote = async () => {
      try {
        if (market === 'us') {
          const res = await getUSRealtime(symbol)
          const d = res.data
          setQuote({
            price: d.price,
            pct_change: d.change_pct,
            change: d.change,
            volume: d.volume,
            name: d.name,
          })
        } else {
          const res = await getRealtimeQuote(symbol)
          setQuote(res.data)
        }
      } catch {
        // Silently fail — market may be closed or outside hours
      }
    }

    fetchHistory()
    fetchQuote()

    // Poll A-shares every 5s; US every 60s (yfinance is slower)
    const pollInterval = market === 'us' ? 60000 : 5000
    intervalRef.current = setInterval(fetchQuote, pollInterval)
    return () => clearInterval(intervalRef.current)
  }, [symbol, period, startDate, endDate, adjust, market, retryCount]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, quote, refetch }
}
