import { create } from 'zustand'

const useLangStore = create((set) => ({
  lang: 'zh',
  setLang: (lang) => set({ lang }),
}))

export default useLangStore
