import { create } from 'zustand'

// Read a lightweight hint cookie set only for logged-in users.
// This prevents the language flash while Supabase auth is resolving on page load.
// The cookie is not authoritative — it is overwritten once auth resolves.
function readLangHint() {
  return document.cookie.match(/bfs_lang_hint=(\w+)/)?.[1] || 'en'
}

const useLangStore = create((set) => ({
  lang: readLangHint(),
  setLang: (lang) => set({ lang }),
}))

export default useLangStore
