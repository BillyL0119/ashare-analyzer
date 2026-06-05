import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const searchStocks = (q) => api.get('/stocks/search', { params: { q } })

export const getStockHistory = (symbol, params) =>
  api.get(`/stocks/${symbol}/history`, { params })

export const getRealtimeQuote = (symbol) =>
  api.get(`/stocks/${symbol}/realtime`)

export const getPairAnalysis = (symbol1, symbol2, params) =>
  api.get('/stocks/pair-analysis', { params: { symbol1, symbol2, ...params } })

export const getStockRisk = (symbol, params) =>
  api.get(`/stocks/${symbol}/risk`, { params })

export const getStockRegime = (symbol, params) =>
  api.get(`/stocks/${symbol}/regime`, { params })

export const getStockFactor = (symbol, params) =>
  api.get(`/stocks/${symbol}/factor`, { params })

export const getFinancial = (symbol) =>
  api.get(`/financial/${symbol}`)

export const getUSStockHistory = (symbol, params) =>
  api.get(`/us/stock/${symbol}`, { params })

export const getUSRealtime = (symbol) =>
  api.get(`/us/stock/${symbol}/realtime`)

export const searchUSStocks = (query) =>
  api.get('/us/search', { params: { q: query } })

export const getUSSimilarStocks = (symbol) =>
  api.get(`/us/similar/${symbol}`)

export const getSimilarStocks = (symbol) =>
  api.get(`/similar/${symbol}`)

export const getSimilarCross = (symbol) =>
  api.get(`/similar/${symbol}/cross`)

export const getNews = (symbol, market = 'cn') =>
  api.get(`/news/${symbol}`, { params: { market } })

export const getRadarScore = (symbol) =>
  api.get(`/radar/${symbol}`)

export const getKnowledgeToday = () =>
  api.get('/knowledge/today')

export const getStockScore = (symbol) =>
  api.get(`/stock/score/${symbol}`)

export const getBacktest = (symbol, strategy, period) =>
  api.get(`/stock/backtest/${symbol}`, { params: { strategy, period } })
