import { create } from 'zustand'

const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10)
  .replace(/-/g, '')

const useCompareStore = create((set, get) => ({
  selectedSymbols: [],
  viewMode: 'sideBySide', // 'sideBySide' | 'overlay'
  period: 'daily',
  startDate: oneYearAgo,
  endDate: today,
  adjust: 'qfq',
  market: 'cn', // 'cn' | 'us'

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
  setMarket: (market) => set({ market, selectedSymbols: [], viewMode: 'sideBySide' }),
}))

export default useCompareStore
