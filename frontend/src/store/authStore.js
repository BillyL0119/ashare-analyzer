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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false })
    })

    const { data: { session } } = await supabase.auth.getSession()
    set({ session, user: session?.user ?? null, loading: false })

    return () => subscription.unsubscribe()
  },

  signOut: async () => {
    await supabase.auth.signOut()
  },
}))

export default useAuthStore
