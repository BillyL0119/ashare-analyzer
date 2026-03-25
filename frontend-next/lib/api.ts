import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

export interface StockInfo {
  code: string
  name: string
}

export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  amount: number
  pct_change: number
  turnover: number
}

export interface MAData {
  date: string
  ma5: number | null
  ma10: number | null
  ma20: number | null
  ma60: number | null
}

export interface MACDData {
  date: string
  dif: number | null
  dea: number | null
  macd: number | null
}

export interface RSIData {
  date: string
  rsi14: number | null
}

export interface BollingerData {
  date: string
  upper: number | null
  middle: number | null
  lower: number | null
}

export interface IndicatorResponse {
  code: string
  ma: MAData[]
  macd: MACDData[]
  rsi: RSIData[]
  bollinger: BollingerData[]
}

export interface StockHistoryResponse {
  symbol: string
  name: string
  candles: Candle[]
  ma: MAData[]
  macd: MACDData[]
  rsi: Array<{ date: string; rsi6?: number | null; rsi12?: number | null; rsi24?: number | null }>
}

export interface WatchlistItem {
  id?: string
  code: string
  name: string
  added_at?: string
}

export interface SimulationStats {
  expected_return: number
  std_return: number
  prob_gain: number
  var_95_price: number
  var_95_pct: number
  min_price: number
  max_price: number
  median_price: number
}

export interface SimulationResponse {
  code: string
  current_price: number
  days: number
  simulations: number
  mu: number
  sigma: number
  time_labels: number[]
  paths: {
    p10: number[]
    p25: number[]
    p50: number[]
    p75: number[]
    p90: number[]
  }
  stats: SimulationStats
}

export async function searchStocks(q: string): Promise<StockInfo[]> {
  const res = await api.get('/api/stocks/search', { params: { q } })
  return res.data
}

export async function getKlineData(
  code: string,
  period: string = 'daily',
  start?: string,
  end?: string,
  adjust: string = 'qfq'
): Promise<StockHistoryResponse> {
  const params: Record<string, string> = { period, adjust }
  if (start) params.start_date = start
  if (end) params.end_date = end
  const res = await api.get(`/api/stocks/${code}/history`, { params })
  return res.data
}

export async function getStockInfo(code: string): Promise<{ code: string; name: string; price?: number }> {
  const res = await api.get(`/api/stocks/${code}/realtime`)
  return res.data
}

export async function getIndicators(
  code: string,
  period: string = 'daily',
  start?: string,
  end?: string
): Promise<IndicatorResponse> {
  const params: Record<string, string> = { period }
  if (start) params.start = start
  if (end) params.end = end
  const res = await api.get(`/api/indicators/${code}`, { params })
  return res.data
}

export async function runMonteCarlo(
  code: string,
  days: number = 252,
  simulations: number = 1000
): Promise<SimulationResponse> {
  const res = await api.post(`/api/simulation/${code}`, { days, simulations })
  return res.data
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const res = await api.get('/api/watchlist')
  return res.data
}

export async function addToWatchlist(code: string, name: string): Promise<WatchlistItem> {
  const res = await api.post('/api/watchlist', { code, name })
  return res.data
}

export async function removeFromWatchlist(code: string): Promise<void> {
  await api.delete(`/api/watchlist/${code}`)
}

export interface FinancialMetric {
  value: number | null
  yoy: number | null
  date: string
}

export interface FinancialData {
  symbol: string
  valuation: {
    pe_ttm?: number | null
    pb?: number | null
  }
  profitability: {
    gross_margin?: FinancialMetric
    net_margin?: FinancialMetric
    roe?: FinancialMetric
  }
  growth: {
    revenue_growth?: FinancialMetric
  }
  cashflow: {
    operating_cf?: FinancialMetric
  }
  history: {
    pe: Array<{ date: string; value: number }>
    pb: Array<{ date: string; value: number }>
    gross_margin: Array<{ date: string; value: number }>
    net_margin: Array<{ date: string; value: number }>
    roe: Array<{ date: string; value: number }>
    revenue_growth: Array<{ date: string; value: number }>
  }
}

export async function getFinancialData(code: string): Promise<FinancialData> {
  const res = await api.get(`/api/financial/${code}`)
  return res.data
}
