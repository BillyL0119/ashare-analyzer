import { create } from 'zustand'

const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10)
  .replace(/-/g, '')

// Tabs that only US stocks have (Nasdaq data). Other markets open on the chart.
export const US_VIEWS = new Set(['summary', 'statistics', 'history', 'holders', 'analysts'])
// Every view a URL may name (/stock/us/AAPL?view=statistics)
export const VIEW_KEYS = new Set([
  'summary', 'statistics', 'fundamentals', 'history', 'holders', 'analysts',
  'sideBySide', 'overlay', 'analysis', 'monteCarlo', 'backtest', 'moves', 'score', 'radar', 'similar',
  'factor', 'financial', 'news', 'global_news', 'earnings', 'calendar', 'sectors', 'comments',
])
/** The tab a stock opens on: the Yahoo-style summary for US stocks, the chart elsewhere */
export const defaultView = (market) => (market === 'us' ? 'summary' : 'sideBySide')

const useCompareStore = create((set, get) => ({
  selectedSymbols: [],
  viewMode: defaultView('us'), // see VIEW_KEYS
  period: 'daily',
  startDate: oneYearAgo,
  endDate: today,
  adjust: 'qfq',
  market: 'us', // 'cn' | 'us'

  addSymbol: (stock) => {
    const { selectedSymbols } = get()
    if (selectedSymbols.length >= 4) return
    if (selectedSymbols.find((s) => s.code === stock.code)) return
    set({ selectedSymbols: [...selectedSymbols, stock] })
  },

  removeSymbol: (code) =>
    set((state) => ({
      selectedSymbols: state.selectedSymbols.filter((s) => s.code !== code),
    })),

  setViewMode: (viewMode) => set({ viewMode }),
  setPeriod: (period) => set({ period }),
  setDateRange: (startDate, endDate) => set({ startDate, endDate }),
  setAdjust: (adjust) => set({ adjust }),
  setMarket: (market) => set({ market, selectedSymbols: [], viewMode: defaultView(market) }),

  // Switch market AND add a stock atomically (used by cross-market search)
  switchMarketAndAddSymbol: (newMarket, stock) =>
    set({ market: newMarket, selectedSymbols: [stock], viewMode: defaultView(newMarket) }),
}))

export default useCompareStore
