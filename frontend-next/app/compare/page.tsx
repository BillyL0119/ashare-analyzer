'use client'

import { useState, useCallback } from 'react'
import { Plus, X, Loader2, AlertCircle, BarChart3 } from 'lucide-react'
import dynamic from 'next/dynamic'
import SearchBar from '@/components/SearchBar'
import { getKlineData, StockInfo, Candle } from '@/lib/api'
import { StockSeries } from '@/components/CompareChart'

const CompareChart = dynamic(() => import('@/components/CompareChart'), { ssr: false })

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899']

interface StockState {
  code: string
  name: string
  loading: boolean
  error: string | null
  data: Array<{ date: string; close: number }>
}

function calcStats(data: Array<{ date: string; close: number }>) {
  if (data.length < 2) return null
  const prices = data.map(d => d.close)
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i])
  const totalReturn = (prices[prices.length - 1] - prices[0]) / prices[0]
  const annualVol = Math.sqrt(252) * Math.sqrt(returns.reduce((s, r) => s + r * r, 0) / returns.length)

  // Max drawdown
  let maxDD = 0
  let peak = prices[0]
  for (const p of prices) {
    if (p > peak) peak = p
    const dd = (p - peak) / peak
    if (dd < maxDD) maxDD = dd
  }

  return { totalReturn, annualVol, maxDD }
}

export default function ComparePage() {
  const [stocks, setStocks] = useState<StockState[]>([])
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [days, setDays] = useState(365)

  const addStock = useCallback(async (info: StockInfo) => {
    if (stocks.length >= 5) return
    if (stocks.some(s => s.code === info.code)) return

    const newStock: StockState = {
      code: info.code,
      name: info.name,
      loading: true,
      error: null,
      data: [],
    }

    setStocks(prev => [...prev, newStock])

    try {
      const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const startD = new Date()
      startD.setDate(startD.getDate() - days)
      const startDate = startD.toISOString().slice(0, 10).replace(/-/g, '')

      const result = await getKlineData(info.code, period, startDate, endDate)
      const data = result.candles.map((c: Candle) => ({ date: c.date, close: c.close }))

      setStocks(prev =>
        prev.map(s =>
          s.code === info.code ? { ...s, loading: false, data, name: result.name || info.name } : s
        )
      )
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setStocks(prev =>
        prev.map(s =>
          s.code === info.code
            ? { ...s, loading: false, error: e.response?.data?.detail || e.message || '加载失败' }
            : s
        )
      )
    }
  }, [stocks, period, days])

  const removeStock = (code: string) => {
    setStocks(prev => prev.filter(s => s.code !== code))
  }

  const chartSeries: StockSeries[] = stocks
    .filter(s => !s.loading && !s.error && s.data.length > 0)
    .map(s => ({ code: s.code, name: s.name, data: s.data }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <BarChart3 size={24} className="text-emerald-400" />
          股票对比
        </h1>
        <p className="text-gray-400 text-sm mt-1">最多添加5支股票进行归一化价格走势对比</p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">时间周期</label>
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              {[
                { label: '日线', value: 'daily' as const },
                { label: '周线', value: 'weekly' as const },
                { label: '月线', value: 'monthly' as const },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    period === p.value ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">时间范围</label>
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              {[
                { label: '1M', days: 30 },
                { label: '3M', days: 90 },
                { label: '6M', days: 180 },
                { label: '1Y', days: 365 },
                { label: '3Y', days: 1095 },
              ].map(r => (
                <button
                  key={r.label}
                  onClick={() => setDays(r.days)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    days === r.days ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Add stock search */}
        {stocks.length < 5 && (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              添加股票 ({stocks.length}/5)
            </label>
            <div className="max-w-md">
              <SearchBar
                placeholder="搜索股票添加对比..."
                onSelect={addStock}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stock chips */}
      {stocks.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {stocks.map((s, i) => (
            <div
              key={s.code}
              className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg"
              style={{ borderLeftColor: COLORS[i % COLORS.length], borderLeftWidth: 3 }}
            >
              {s.loading ? (
                <Loader2 size={12} className="animate-spin text-gray-400" />
              ) : s.error ? (
                <AlertCircle size={12} className="text-red-400" />
              ) : (
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              )}
              <div>
                <span className="text-sm font-medium text-gray-200">{s.name}</span>
                <span className="font-mono text-xs text-gray-500 ml-1.5">{s.code}</span>
              </div>
              {s.error && <span className="text-xs text-red-400">{s.error}</span>}
              <button
                onClick={() => removeStock(s.code)}
                className="ml-1 p-0.5 text-gray-600 hover:text-gray-300 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <CompareChart stocks={chartSeries} />

      {/* Stats table */}
      {chartSeries.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300">表现统计</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">股票</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">区间收益率</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">年化波动率</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">最大回撤</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">数据点数</th>
                </tr>
              </thead>
              <tbody>
                {chartSeries.map((s, i) => {
                  const stats = calcStats(s.data)
                  return (
                    <tr key={s.code} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="font-medium text-gray-200">{s.name}</span>
                          <span className="font-mono text-xs text-gray-500">{s.code}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${
                        stats && stats.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {stats ? `${stats.totalReturn >= 0 ? '+' : ''}${(stats.totalReturn * 100).toFixed(2)}%` : '--'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">
                        {stats ? `${(stats.annualVol * 100).toFixed(2)}%` : '--'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-400">
                        {stats ? `${(stats.maxDD * 100).toFixed(2)}%` : '--'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {s.data.length}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stocks.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 flex flex-col items-center justify-center gap-4 text-center">
          <Plus size={40} className="text-gray-700" />
          <div>
            <p className="text-gray-400">搜索并添加股票开始对比</p>
            <p className="text-gray-600 text-xs mt-1">最多可对比5支股票</p>
          </div>
        </div>
      )}
    </div>
  )
}
