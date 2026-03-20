import { useState, useEffect, useRef } from 'react'
import { getStockHistory, getRealtimeQuote } from '../api/stockApi'

const cache = new Map()

function cacheKey(symbol, period, startDate, endDate, adjust) {
  return `${symbol}_${period}_${startDate}_${endDate}_${adjust}`
}

export function useStockData(symbol, { period, startDate, endDate, adjust }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [quote, setQuote] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!symbol) return
    const key = cacheKey(symbol, period, startDate, endDate, adjust)

    const fetchHistory = async () => {
      if (cache.has(key)) {
        setData(cache.get(key))
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await getStockHistory(symbol, {
          period,
          start_date: startDate,
          end_date: endDate,
          adjust,
        })
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
        const res = await getRealtimeQuote(symbol)
        setQuote(res.data)
      } catch {
        // Silently fail — market may be closed
      }
    }

    fetchHistory()
    fetchQuote()

    // Poll realtime quote every 5 seconds
    intervalRef.current = setInterval(fetchQuote, 5000)
    return () => clearInterval(intervalRef.current)
  }, [symbol, period, startDate, endDate, adjust])

  return { data, loading, error, quote }
}
