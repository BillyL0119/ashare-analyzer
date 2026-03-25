'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Star, StarOff, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import {
  getKlineData,
  getIndicators,
  getFinancialData,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  StockHistoryResponse,
  IndicatorResponse,
  FinancialData,
  Candle,
} from '@/lib/api'
import { OHLCVData } from '@/components/KLineChart'

const KLineChart = dynamic(() => import('@/components/KLineChart'), { ssr: false })
const IndicatorChart = dynamic(() => import('@/components/IndicatorChart'), { ssr: false })
const MonteCarloChart = dynamic(() => import('@/components/MonteCarloChart'), { ssr: false })
const FinancialTab = dynamic(() => import('@/components/FinancialTab'), { ssr: false })

type Period = 'daily' | 'weekly' | 'monthly'
type Tab = 'kline' | 'indicators' | 'montecarlo' | 'financial'

const RANGES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 1095 },
]

const PERIODS: { label: string; value: Period }[] = [
  { label: '日线', value: 'daily' },
  { label: '周线', value: 'weekly' },
  { label: '月线', value: 'monthly' },
]

const TABS: { label: string; value: Tab }[] = [
  { label: 'K线图', value: 'kline' },
  { label: '技术指标', value: 'indicators' },
  { label: '蒙特卡洛', value: 'montecarlo' },
  { label: '财务分析', value: 'financial' },
]

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function getStartDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return formatDate(d)
}

function SkeletonChart() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-pulse" style={{ height: 420 }}>
      <div className="h-full bg-gradient-to-b from-gray-800/50 to-gray-900" />
    </div>
  )
}

export default function StockPage() {
  const params = useParams()
  const code = params.code as string

  const [tab, setTab] = useState<Tab>('kline')
  const [period, setPeriod] = useState<Period>('daily')
  const [rangeIdx, setRangeIdx] = useState(3) // 1Y default
  const [stockData, setStockData] = useState<StockHistoryResponse | null>(null)
  const [indicatorData, setIndicatorData] = useState<IndicatorResponse | null>(null)
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [indicatorLoading, setIndicatorLoading] = useState(false)
  const [financialLoading, setFinancialLoading] = useState(false)
  const [financialError, setFinancialError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  const startDate = getStartDate(RANGES[rangeIdx].days)
  const endDate = formatDate(new Date())

  const loadKline = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getKlineData(code, period, startDate, endDate)
      setStockData(data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setError(e.response?.data?.detail || e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [code, period, startDate, endDate])

  const loadIndicators = useCallback(async () => {
    if (tab !== 'indicators') return
    setIndicatorLoading(true)
    try {
      const data = await getIndicators(code, period, startDate, endDate)
      setIndicatorData(data)
    } catch {
      // ignore, fallback to stock data indicators
    } finally {
      setIndicatorLoading(false)
    }
  }, [code, period, startDate, endDate, tab])

  const loadFinancial = useCallback(async () => {
    if (tab !== 'financial') return
    if (financialData) return // already loaded
    setFinancialLoading(true)
    setFinancialError(null)
    try {
      const data = await getFinancialData(code)
      setFinancialData(data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setFinancialError(e.response?.data?.detail || e.message || '加载财务数据失败')
    } finally {
      setFinancialLoading(false)
    }
  }, [code, tab, financialData])

  useEffect(() => { loadKline() }, [loadKline])
  useEffect(() => { loadIndicators() }, [loadIndicators])
  useEffect(() => { loadFinancial() }, [loadFinancial])

  // Check watchlist
  useEffect(() => {
    getWatchlist().then(list => {
      setInWatchlist(list.some(item => item.code === code))
    }).catch(() => {})
  }, [code])

  const toggleWatchlist = async () => {
    if (!stockData) return
    setWatchlistLoading(true)
    try {
      if (inWatchlist) {
        await removeFromWatchlist(code)
        setInWatchlist(false)
      } else {
        await addToWatchlist(code, stockData.name)
        setInWatchlist(true)
      }
    } catch {}
    setWatchlistLoading(false)
  }

  // Prepare kline data
  const klineData: OHLCVData[] = (stockData?.candles ?? []).map((c: Candle) => ({
    time: c.date,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }))

  const lastCandle = stockData?.candles?.[stockData.candles.length - 1]
  const prevCandle = stockData?.candles?.[stockData.candles.length - 2]
  const priceChange = lastCandle && prevCandle ? lastCandle.close - prevCandle.close : 0
  const pctChange = prevCandle && prevCandle.close > 0 ? (priceChange / prevCandle.close) * 100 : 0
  const isUp = priceChange >= 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {stockData ? (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-100">{stockData.name}</h1>
                <span className="font-mono text-sm text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">{code}</span>
              </div>
              {lastCandle && (
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-2xl font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    ¥{lastCandle.close.toFixed(2)}
                  </span>
                  <div className={`flex items-center gap-1 text-sm font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{isUp ? '+' : ''}{priceChange.toFixed(2)}</span>
                    <span>({isUp ? '+' : ''}{pctChange.toFixed(2)}%)</span>
                  </div>
                </div>
              )}
            </>
          ) : loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-7 bg-gray-800 rounded w-40" />
              <div className="h-8 bg-gray-800 rounded w-32" />
            </div>
          ) : (
            <h1 className="text-xl font-bold text-gray-300">{code}</h1>
          )}
        </div>

        {/* Watchlist button */}
        <button
          onClick={toggleWatchlist}
          disabled={watchlistLoading || !stockData}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            inWatchlist
              ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:text-yellow-400'
          }`}
        >
          {watchlistLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : inWatchlist ? (
            <StarOff size={14} />
          ) : (
            <Star size={14} />
          )}
          {inWatchlist ? '移出自选' : '加入自选'}
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Range selector */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                i === rangeIdx
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-gray-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-400 hover:text-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-800">
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.value
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-100 hover:border-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 text-sm font-medium">加载失败</p>
            <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'kline' && (
        <div>
          {loading ? (
            <SkeletonChart />
          ) : klineData.length > 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <KLineChart data={klineData} height={440} />
            </div>
          ) : !error ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500">暂无数据</p>
            </div>
          ) : null}

          {/* OHLCV stats */}
          {lastCandle && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
              {[
                { label: '开盘', value: lastCandle.open.toFixed(2) },
                { label: '最高', value: lastCandle.high.toFixed(2), color: 'text-emerald-400' },
                { label: '最低', value: lastCandle.low.toFixed(2), color: 'text-red-400' },
                { label: '收盘', value: lastCandle.close.toFixed(2), color: isUp ? 'text-emerald-400' : 'text-red-400' },
                { label: '成交量', value: (lastCandle.volume / 1e4).toFixed(1) + '万手' },
                { label: '换手率', value: lastCandle.turnover.toFixed(2) + '%' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-sm font-semibold font-mono ${color ?? 'text-gray-100'}`}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'indicators' && (
        <div>
          {indicatorLoading || loading ? (
            <div className="space-y-4">
              {[280, 180, 160].map(h => (
                <div
                  key={h}
                  className="bg-gray-900 border border-gray-800 rounded-xl animate-pulse"
                  style={{ height: h }}
                />
              ))}
            </div>
          ) : indicatorData && stockData ? (
            <IndicatorChart
              candles={stockData.candles}
              ma={indicatorData.ma}
              macd={indicatorData.macd}
              rsi={indicatorData.rsi}
              bollinger={indicatorData.bollinger}
            />
          ) : stockData ? (
            <IndicatorChart
              candles={stockData.candles}
              ma={stockData.ma.map(m => ({
                date: m.date,
                ma5: (m as unknown as { ma5?: number }).ma5 ?? null,
                ma10: (m as unknown as { ma10?: number }).ma10 ?? null,
                ma20: (m as unknown as { ma20?: number }).ma20 ?? null,
                ma60: (m as unknown as { ma60?: number }).ma60 ?? null,
              }))}
              macd={stockData.macd.map(m => ({
                date: m.date,
                dif: (m as unknown as { dif?: number }).dif ?? null,
                dea: (m as unknown as { dea?: number }).dea ?? null,
                macd: (m as unknown as { macd?: number }).macd ?? null,
              }))}
              rsi={stockData.rsi.map(r => ({
                date: r.date,
                rsi14: (r as unknown as { rsi12?: number }).rsi12 ?? null,
              }))}
              bollinger={[]}
            />
          ) : null}
        </div>
      )}

      {tab === 'montecarlo' && (
        <MonteCarloChart
          code={code}
          currentPrice={lastCandle?.close}
        />
      )}

      {tab === 'financial' && (
        <div>
          {financialLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-900 border border-gray-800 rounded-xl animate-pulse"
                  style={{ height: 140 }}
                />
              ))}
            </div>
          ) : financialError ? (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-400 text-sm font-medium">加载失败</p>
                <p className="text-red-400/70 text-xs mt-0.5">{financialError}</p>
              </div>
            </div>
          ) : financialData ? (
            <FinancialTab data={financialData} />
          ) : null}
        </div>
      )}
    </div>
  )
}
