import { create } from 'zustand'

const useLangStore = create((set) => ({
  lang: localStorage.getItem('bfs_lang') || 'zh',
  setLang: (lang) => {
    localStorage.setItem('bfs_lang', lang)
    set({ lang })
  },
}))

export default useLangStore
