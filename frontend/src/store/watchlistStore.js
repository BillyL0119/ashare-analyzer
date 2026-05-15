import { create } from 'zustand'

const LS_KEY = 'bfs_watchlist'

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

const useWatchlistStore = create((set, get) => ({
  list: load(),

  add: (stock) => set((s) => {
    if (s.list.find((x) => x.code === stock.code)) return s
    const next = [...s.list, { code: stock.code, name: stock.name }]
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    return { list: next }
  }),

  remove: (code) => set((s) => {
    const next = s.list.filter((x) => x.code !== code)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    return { list: next }
  }),

  has: (code) => get().list.some((x) => x.code === code),
}))

export default useWatchlistStore
