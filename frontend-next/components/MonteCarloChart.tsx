'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { PlayCircle, Loader2 } from 'lucide-react'
import { runMonteCarlo, SimulationResponse } from '@/lib/api'

interface MonteCarloChartProps {
  code: string
  currentPrice?: number
}

function formatPct(v: number | null | undefined) {
  if (v == null) return '--'
  return `${(v * 100).toFixed(2)}%`
}

function formatPrice(v: number | null | undefined) {
  if (v == null) return '--'
  return `¥${v.toFixed(2)}`
}

export default function MonteCarloChart({ code, currentPrice }: MonteCarloChartProps) {
  const [result, setResult] = useState<SimulationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(252)
  const [sims, setSims] = useState(1000)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await runMonteCarlo(code, days, sims)
      setResult(data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setError(e.response?.data?.detail || e.message || '模拟失败')
    } finally {
      setLoading(false)
    }
  }

  const chartData = result
    ? result.time_labels.map((t, i) => ({
        day: t,
        P10: result.paths.p10[i],
        P25: result.paths.p25[i],
        P50: result.paths.p50[i],
        P75: result.paths.p75[i],
        P90: result.paths.p90[i],
      }))
    : []

  const refPrice = currentPrice ?? result?.current_price

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">模拟天数</label>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
            >
              <option value={63}>3个月 (63天)</option>
              <option value={126}>6个月 (126天)</option>
              <option value={252}>1年 (252天)</option>
              <option value={504}>2年 (504天)</option>
              <option value={756}>3年 (756天)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">模拟次数</label>
            <select
              value={sims}
              onChange={e => setSims(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
            >
              <option value={500}>500次</option>
              <option value={1000}>1000次</option>
              <option value={2000}>2000次</option>
              <option value={5000}>5000次</option>
            </select>
          </div>
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <PlayCircle size={15} />
            )}
            {loading ? '计算中...' : '运行蒙特卡洛模拟'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* Chart */}
      {result && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-1">
              价格路径分布 ({result.simulations}次模拟, {result.days}个交易日)
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              展示第10、25、50、75、90百分位数路径
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="p10" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="p25" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="p50" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="p75" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="p90" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  label={{ value: '交易日', position: 'insideBottomRight', fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  width={60}
                  tickFormatter={(v: number) => `¥${v.toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {refPrice && (
                  <ReferenceLine y={refPrice} stroke="#6b7280" strokeDasharray="4 2" label={{ value: '当前价', fill: '#9ca3af', fontSize: 10 }} />
                )}
                <Area type="monotone" dataKey="P10" stroke="#ef4444" fill="url(#p10)" strokeWidth={1.5} name="P10 (悲观)" dot={false} />
                <Area type="monotone" dataKey="P25" stroke="#f97316" fill="url(#p25)" strokeWidth={1.5} name="P25" dot={false} />
                <Area type="monotone" dataKey="P50" stroke="#eab308" fill="url(#p50)" strokeWidth={2} name="P50 (中性)" dot={false} />
                <Area type="monotone" dataKey="P75" stroke="#22c55e" fill="url(#p75)" strokeWidth={1.5} name="P75" dot={false} />
                <Area type="monotone" dataKey="P90" stroke="#06b6d4" fill="url(#p90)" strokeWidth={1.5} name="P90 (乐观)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">统计摘要</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: '当前价格', value: formatPrice(result.current_price) },
                { label: '中位预期价', value: formatPrice(result.stats.median_price) },
                { label: '预期收益率', value: formatPct(result.stats.expected_return), color: result.stats.expected_return >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: '收益标准差', value: formatPct(result.stats.std_return) },
                { label: '盈利概率', value: formatPct(result.stats.prob_gain), color: 'text-emerald-400' },
                { label: '95% VaR 价格', value: formatPrice(result.stats.var_95_price) },
                { label: '95% VaR 比例', value: formatPct(result.stats.var_95_pct), color: 'text-red-400' },
                { label: '最低模拟价', value: formatPrice(result.stats.min_price), color: 'text-red-400' },
                { label: '最高模拟价', value: formatPrice(result.stats.max_price), color: 'text-emerald-400' },
                { label: '日均对数收益', value: result.stats ? `${(result.mu * 100).toFixed(4)}%` : '--' },
                { label: '日均波动率', value: result.stats ? `${(result.sigma * 100).toFixed(4)}%` : '--' },
                { label: '年化波动率', value: result.stats ? formatPct(result.sigma * Math.sqrt(252)) : '--' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-sm font-semibold ${color ?? 'text-gray-100'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center gap-3 text-center">
          <PlayCircle size={40} className="text-gray-600" />
          <p className="text-gray-400 text-sm">点击"运行蒙特卡洛模拟"开始分析</p>
          <p className="text-gray-600 text-xs">基于历史数据的随机路径模拟，仅供参考</p>
        </div>
      )}
    </div>
  )
}
