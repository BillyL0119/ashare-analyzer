import { create } from 'zustand'

// Priority: logged-in user cookie → guest localStorage → default 'zh'
function readLangHint() {
  return (
    document.cookie.match(/bfs_lang_hint=(\w+)/)?.[1] ||
    localStorage.getItem('bfs_lang') ||
    'zh'
  )
}

const useLangStore = create((set) => ({
  lang: readLangHint(),
  setLang: (lang) => set({ lang }),
}))

export default useLangStore
