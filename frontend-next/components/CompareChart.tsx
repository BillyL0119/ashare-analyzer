'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface StockSeries {
  code: string
  name: string
  data: Array<{ date: string; close: number }>
}

interface CompareChartProps {
  stocks: StockSeries[]
}

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899']

function normalizeData(stocks: StockSeries[]): Array<Record<string, unknown>> {
  if (stocks.length === 0) return []

  // Get all unique dates
  const allDates = new Set<string>()
  stocks.forEach(s => s.data.forEach(d => allDates.add(d.date)))
  const sortedDates = Array.from(allDates).sort()

  // For each stock, compute normalized price (base=100) keyed by date
  const normalizedMap: Map<string, Map<string, number>> = new Map()
  stocks.forEach(stock => {
    const map = new Map<string, number>()
    const firstPrice = stock.data.find(d => d.close > 0)?.close ?? 1
    stock.data.forEach(d => {
      map.set(d.date, (d.close / firstPrice) * 100)
    })
    normalizedMap.set(stock.code, map)
  })

  return sortedDates.map(date => {
    const row: Record<string, unknown> = { date }
    stocks.forEach(stock => {
      const val = normalizedMap.get(stock.code)?.get(date)
      row[stock.code] = val ?? null
    })
    return row
  })
}

function CustomTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2">{label as string}</p>
      {(payload as Array<{name: string; value: unknown; color: string}>).map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="text-gray-100">
            {typeof p.value === 'number' ? `${p.value.toFixed(2)} (${(p.value - 100).toFixed(2)}%)` : '--'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function CompareChart({ stocks }: CompareChartProps) {
  const data = normalizeData(stocks)

  if (stocks.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 flex items-center justify-center">
        <p className="text-gray-500 text-sm">请添加股票进行对比</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-1">归一化价格走势对比 (基准=100)</h3>
      <p className="text-xs text-gray-500 mb-3">所有股票起始价格归一化为100，便于对比相对涨跌</p>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={v => String(v).slice(5)}
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            width={50}
            tickFormatter={(v: number) => v.toFixed(0)}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip active={false} payload={[]} label="" />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value: string) => {
              const stock = stocks.find(s => s.code === value)
              return stock ? `${stock.name} (${value})` : value
            }}
          />
          {stocks.map((stock, i) => (
            <Line
              key={stock.code}
              type="monotone"
              dataKey={stock.code}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              strokeWidth={2}
              connectNulls
              name={stock.code}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
