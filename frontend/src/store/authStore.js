import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { currentUI } from '../utils/device'

// Tell the backend who just loaded the site (counts one login per browser session) and learn this
// account's role. The role only drives what the UI shows; the server re-checks it on every admin call.
async function syncRole(session, set) {
  if (!session?.access_token) { set({ role: 'user' }); return }
  let first = true
  try {
    first = !sessionStorage.getItem('bfs_login_ping')
    sessionStorage.setItem('bfs_login_ping', '1')
  } catch { /* storage blocked: count it */ }
  try {
    const r = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ui: currentUI(), new_session: first }),
    })
    if (r.ok) set({ role: (await r.json()).role || 'user' })
  } catch { /* offline: keep the default role */ }
}

const useAuthStore = create((set) => ({
  user: null,
  session: null,
  role: 'user',          // 'admin' | 'member' | 'user' (from the server)
  loading: true,

  // Call once on app mount. Returns cleanup fn.
  init: async () => {
    // Subscribe BEFORE getSession so the SIGNED_IN event from PKCE code
    // exchange is never missed (Supabase v2 requirement).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[BFS Auth] onAuthStateChange:', event, session?.user?.email ?? null)
      set({ session, user: session?.user ?? null, loading: false })
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setTimeout(() => syncRole(session, set), 0)     // never await Supabase calls inside this callback
      }
    })

    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('[BFS Auth] getSession:', session?.user?.email ?? null, error ?? 'no error')
    set({ session, user: session?.user ?? null, loading: false })
    if (session) syncRole(session, set)

    return () => subscription.unsubscribe()
  },

  signOut: async () => {
    await supabase.auth.signOut()
  },

  // Persist language preference to the user's Supabase account
  setLangPreference: async (lang) => {
    const { data: { user }, error } = await supabase.auth.updateUser({ data: { lang } })
    if (!error && user) set({ user })
  },

  // Persist theme preference to the user's Supabase account
  setThemePreference: async (theme) => {
    const { data: { user }, error } = await supabase.auth.updateUser({ data: { theme } })
    if (!error && user) set({ user })
  },

  // Record that today's Daily Insight has been shown (so it doesn't re-appear on other devices)
  setKnowledgeDateSeen: async (date) => {
    const { data: { user }, error } = await supabase.auth.updateUser({ data: { knowledge_date: date } })
    if (!error && user) set({ user })
  },

  // Sync watchlist to account
  setWatchlistPreference: async (watchlist) => {
    const { data: { user }, error } = await supabase.auth.updateUser({ data: { watchlist } })
    if (!error && user) set({ user })
  },

  // Sync study progress to account (object keyed by exam)
  setStudyProgressPreference: async (study_progress) => {
    const { data: { user }, error } = await supabase.auth.updateUser({ data: { study_progress } })
    if (!error && user) set({ user })
  },
}))

export default useAuthStore
