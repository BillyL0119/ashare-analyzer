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

export const searchUSStocks = (query) =>
  api.get(`/us/search/${encodeURIComponent(query)}`)
