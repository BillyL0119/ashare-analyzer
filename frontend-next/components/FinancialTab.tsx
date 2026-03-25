'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FinancialData, FinancialMetric } from '@/lib/api'

interface Props {
  data: FinancialData
}

function fmt(v: number | null | undefined, decimals = 2, suffix = '') {
  if (v == null) return '—'
  return v.toFixed(decimals) + suffix
}

function YoYBadge({ yoy }: { yoy: number | null | undefined }) {
  if (yoy == null) return null
  const up = yoy >= 0
  return (
    <span
      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
        up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
      }`}
    >
      {up ? '+' : ''}{yoy.toFixed(2)}pp
    </span>
  )
}

function Sparkline({ data }: { data: Array<{ date: string; value: number }> }) {
  if (!data || data.length < 2) return <div className="h-12" />
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line
          type="monotone"
          dataKey="value"
          dot={false}
          strokeWidth={1.5}
          stroke="#34d399"
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 6, fontSize: 11 }}
          itemStyle={{ color: '#d1fae5' }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(v: number) => [v.toFixed(2), '']}
          labelFormatter={(l: string) => l?.slice(0, 7) ?? ''}
        />
        <XAxis dataKey="date" hide />
        <YAxis hide domain={['auto', 'auto']} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface MetricCardProps {
  label: string
  sublabel?: string
  value: string
  yoy?: number | null
  sparkData?: Array<{ date: string; value: number }>
  date?: string
}

function MetricCard({ label, sublabel, value, yoy, sparkData, date }: MetricCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-400 font-medium">{label}</p>
          {sublabel && <p className="text-xs text-gray-600">{sublabel}</p>}
        </div>
        {yoy != null && <YoYBadge yoy={yoy} />}
      </div>
      <p className="text-xl font-mono font-semibold text-gray-100">{value}</p>
      {sparkData && sparkData.length > 1 && <Sparkline data={sparkData} />}
      {date && <p className="text-xs text-gray-600 mt-1">截至 {date}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6 first:mt-0">
      {children}
    </h3>
  )
}

export default function FinancialTab({ data }: Props) {
  const { valuation, profitability, growth, cashflow, history } = data

  const metricValue = (m: FinancialMetric | undefined, suffix = '%') =>
    m?.value != null ? fmt(m.value, 2, suffix) : '—'

  return (
    <div className="space-y-1">
      {/* Valuation */}
      <SectionTitle>估值指标</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="市盈率 (PE TTM)"
          sublabel="Price / Earnings"
          value={valuation.pe_ttm != null ? fmt(valuation.pe_ttm, 2, 'x') : '—'}
          sparkData={history.pe}
        />
        <MetricCard
          label="市净率 (PB)"
          sublabel="Price / Book"
          value={valuation.pb != null ? fmt(valuation.pb, 2, 'x') : '—'}
          sparkData={history.pb}
        />
      </div>

      {/* Profitability */}
      <SectionTitle>盈利能力</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="毛利率"
          sublabel="Gross Margin"
          value={metricValue(profitability.gross_margin)}
          yoy={profitability.gross_margin?.yoy}
          sparkData={history.gross_margin}
          date={profitability.gross_margin?.date}
        />
        <MetricCard
          label="净利率"
          sublabel="Net Profit Margin"
          value={metricValue(profitability.net_margin)}
          yoy={profitability.net_margin?.yoy}
          sparkData={history.net_margin}
          date={profitability.net_margin?.date}
        />
        <MetricCard
          label="净资产收益率 (ROE)"
          sublabel="Return on Equity"
          value={metricValue(profitability.roe)}
          yoy={profitability.roe?.yoy}
          sparkData={history.roe}
          date={profitability.roe?.date}
        />
      </div>

      {/* Growth & Cash Flow */}
      <SectionTitle>成长与现金流</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="营收同比增长"
          sublabel="Revenue Growth YoY"
          value={metricValue(growth.revenue_growth)}
          sparkData={history.revenue_growth}
          date={growth.revenue_growth?.date}
        />
        <MetricCard
          label="经营现金流"
          sublabel="Operating Cash Flow"
          value={
            cashflow.operating_cf?.value != null
              ? fmt(cashflow.operating_cf.value, 2, ' 亿')
              : '—'
          }
          date={cashflow.operating_cf?.date}
        />
      </div>
    </div>
  )
}
