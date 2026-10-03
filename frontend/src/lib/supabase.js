// Supabase anon key is a PUBLIC client-side credential — safe to embed.
// Never put service_role key here.
const SUPABASE_URL = 'https://yanbnkraietnntyqhtck.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbmJua3JhaWV0bm50eXFodGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MzY5MDQsImV4cCI6MjEwNTAxMjkwNH0.PF5VVcdbqpYzAz6QfZgNWETTqJawZ5_zpDwjlKMFtTY'

// The Supabase SDK is large (~1 MB unminified), so load it in its own chunk
// after first paint instead of bundling it into the main entry.
let clientPromise = null
export function getSupabase() {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
      .catch((err) => { clientPromise = null; throw err })
  }
  return clientPromise
}
