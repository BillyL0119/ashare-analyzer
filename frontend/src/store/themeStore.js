import { create } from 'zustand'

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('bfs_theme', theme)
  window.dispatchEvent(new Event('themechange'))
}

// Read saved preference and apply immediately (before React mounts)
const savedTheme = localStorage.getItem('bfs_theme') || 'dark'
applyTheme(savedTheme)

const useThemeStore = create((set) => ({
  theme: savedTheme,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return { theme: next }
    }),
}))

export default useThemeStore
