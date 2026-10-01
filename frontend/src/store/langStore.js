import { create } from 'zustand'

const useLangStore = create((set) => ({
  lang: 'en',
  setLang: (lang) => set({ lang }),
}))

export default useLangStore
