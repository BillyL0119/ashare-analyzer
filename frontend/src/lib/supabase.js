// Sign-in only: the site uses Supabase for accounts and nothing else (no database, storage or realtime from the
// browser), so it loads just the auth client (@supabase/auth-js, the same client supabase-js wraps; about a third
// of supabase-js's size) and loads it after the first paint. The settings match createClient's defaults, including
// the storage key, so sessions saved by the old full client keep working.
// The anon key is a PUBLIC client-side credential, safe to embed. Never put the service_role key here.

const PROJECT = 'yanbnkraietnntyqhtck'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbmJua3JhaWV0bm50eXFodGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MzY5MDQsImV4cCI6MjEwNTAxMjkwNH0.PF5VVcdbqpYzAz6QfZgNWETTqJawZ5_zpDwjlKMFtTY'
let client = null

export function getAuth() {
  if (!client) {
    client = import('@supabase/auth-js').then(({ AuthClient }) => new AuthClient({
      url: `https://${PROJECT}.supabase.co/auth/v1`,
      headers: { Authorization: `Bearer ${KEY}`, apikey: KEY },
      storageKey: `sb-${PROJECT}-auth-token`,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    }))
  }
  return client
}

// A return from Google sign-in (or an email link) carries the session in the URL. Read it before the app renders,
// in case a page rewrites the URL first.
export const urlHasAuthResult = () => /[#&?](access_token|error_description)=/.test(window.location.href)
