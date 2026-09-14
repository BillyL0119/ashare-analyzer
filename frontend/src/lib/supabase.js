import { createClient } from '@supabase/supabase-js'

// Supabase anon key is a PUBLIC client-side credential — safe to embed.
// Never put service_role key here.
export const supabase = createClient(
  'https://nadhlozvalgizccmnpay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hZGhsb3p2YWxnaXpjY21ucGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNTk2NjUsImV4cCI6MjA4OTczNTY2NX0.X5EGW-TYm5_TezaVnt_m_yua-eidGMGW3gmY2psP7Z4',
)
