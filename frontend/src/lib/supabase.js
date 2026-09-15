import { createClient } from '@supabase/supabase-js'

// Supabase anon key is a PUBLIC client-side credential — safe to embed.
// Never put service_role key here.
export const supabase = createClient(
  'https://yanbnkraietnntyqhtck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbmJua3JhaWV0bm50eXFodGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MzY5MDQsImV4cCI6MjEwNTAxMjkwNH0.PF5VVcdbqpYzAz6QfZgNWETTqJawZ5_zpDwjlKMFtTY',
)
