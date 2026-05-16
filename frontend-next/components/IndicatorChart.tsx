'use client'

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { MAData, MACDData, RSIData, BollingerData, Candle } from '@/lib/api'

interface IndicatorChartProps {
  candles: Candle[]
  ma: MAData[]
  macd: MACDData[]
  rsi: RSIData[]
  bollinger: BollingerData[]
}

function mergeByDate<T extends { date: string }>(
  base: T[],
  ...others: Array<Record<string, unknown>[]>
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>()
  base.forEach(item => map.set(item.date, { ...item }))
  others.forEach(arr =>
    arr.forEach(item => {
      const existing = map.get(item.date as string)
      if (existing) Object.assign(existing, item)
    })
  )
  return Array.from(map.values()).sort((a, b) =>
    (a.date as string).localeCompare(b.date as string)
  )
}

const TICK_COUNT = 8

function formatDate(dateStr: string) {
  return dateStr?.slice(5) ?? ''
}

function CustomPriceTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label as string}</p>
      {(payload as Array<{name: string; value: unknown; color: string}>).map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : '--'}
        </p>
      ))}
    </div>
  )
}

function CustomMacdTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label as string}</p>
      {(payload as Array<{name: string; value: unknown; color: string}>).map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : '--'}
        </p>
      ))}
    </div>
  )
}

function CustomRsiTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label as string}</p>
      {(payload as Array<{name: string; value: unknown; color: string}>).map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          RSI(14): {typeof p.value === 'number' ? p.value.toFixed(2) : '--'}
        </p>
      ))}
    </div>
  )
}

export default function IndicatorChart({ candles, ma, macd, rsi, bollinger }: IndicatorChartProps) {
  const candleMap = Object.fromEntries(candles.map(c => [c.date, c]))
  const priceData = mergeByDate(
    ma as unknown as Array<{ date: string }>,
    bollinger as unknown as Record<string, unknown>[],
    candles.map(c => ({ date: c.date, price: c.close })) as Record<string, unknown>[]
  ).map(d => ({
    ...d,
    price: candleMap[d.date as string]?.close ?? null,
  }))

  const macdData = macd.map(d => ({
    date: d.date,
    DIF: d.dif,
    DEA: d.dea,
    MACD: d.macd,
  }))

  const rsiData = rsi.map(d => ({
    date: d.date,
    RSI14: d.rsi14,
  }))

  const tickFormatter = (v: string) => formatDate(v)
  const yDomain = ['auto', 'auto'] as [string | number, string | number]

  return (
    <div className="space-y-4">
      {/* Price + MA + Bollinger */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">价格 & 均线 & 布林带</h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={priceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickCount={TICK_COUNT}
              minTickGap={40}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              width={55}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip content={<CustomPriceTooltip active={false} payload={[]} label="" />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Line type="monotone" dataKey="price" stroke="#e5e7eb" dot={false} strokeWidth={1.5} name="收盘价" />
            <Line type="monotone" dataKey="ma5" stroke="#3b82f6" dot={false} strokeWidth={1} name="MA5" connectNulls />
            <Line type="monotone" dataKey="ma10" stroke="#f97316" dot={false} strokeWidth={1} name="MA10" connectNulls />
            <Line type="monotone" dataKey="ma20" stroke="#22c55e" dot={false} strokeWidth={1} name="MA20" connectNulls />
            <Line type="monotone" dataKey="ma60" stroke="#a855f7" dot={false} strokeWidth={1} name="MA60" connectNulls />
            <Line type="monotone" dataKey="upper" stroke="#6b7280" dot={false} strokeWidth={1} strokeDasharray="4 2" name="BB上" connectNulls />
            <Line type="monotone" dataKey="middle" stroke="#6b7280" dot={false} strokeWidth={1} strokeDasharray="4 2" name="BB中" connectNulls />
            <Line type="monotone" dataKey="lower" stroke="#6b7280" dot={false} strokeWidth={1} strokeDasharray="4 2" name="BB下" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">MACD (12,26,9)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={macdData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickCount={TICK_COUNT}
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              width={55}
              tickFormatter={(v: number) => v.toFixed(3)}
            />
            <Tooltip content={<CustomMacdTooltip active={false} payload={[]} label="" />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <ReferenceLine y={0} stroke="#374151" />
            <Bar
              dataKey="MACD"
              fill="#26a69a"
              name="MACD柱"
              isAnimationActive={false}
              // Green for positive, red for negative
              // Recharts Bar doesn't support per-cell color in ComposedChart easily,
              // so we use a single color; the sign conveys direction via tooltip
            />
            <Line type="monotone" dataKey="DIF" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="DIF" connectNulls />
            <Line type="monotone" dataKey="DEA" stroke="#f97316" dot={false} strokeWidth={1.5} name="DEA" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* RSI */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">RSI (14)</h3>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={rsiData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickCount={TICK_COUNT}
              minTickGap={40}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              width={35}
            />
            <Tooltip content={<CustomRsiTooltip active={false} payload={[]} label="" />} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '超买70', fill: '#ef4444', fontSize: 10 }} />
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 2" label={{ value: '超卖30', fill: '#22c55e', fontSize: 10 }} />
            <ReferenceLine y={50} stroke="#374151" />
            <Line type="monotone" dataKey="RSI14" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="RSI14" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
