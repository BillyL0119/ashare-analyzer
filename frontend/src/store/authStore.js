import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,

  // Call once on app mount. Returns cleanup fn.
  init: async () => {
    // Subscribe BEFORE getSession so the SIGNED_IN event from PKCE code
    // exchange is never missed (Supabase v2 requirement).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[BFS Auth] onAuthStateChange:', event, session?.user?.email ?? null)
      set({ session, user: session?.user ?? null, loading: false })
    })

    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('[BFS Auth] getSession:', session?.user?.email ?? null, error ?? 'no error')
    set({ session, user: session?.user ?? null, loading: false })

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
