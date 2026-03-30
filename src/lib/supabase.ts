import { createClient } from '@supabase/supabase-js'

const fallbackSupabaseUrl = 'https://euuovmqydddzxybhndqo.supabase.co'
const fallbackSupabaseAnonKey = 'sb_publishable_DAGFRvDOO6oFUhO7sTewCA_gSrOaJfi'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL ?? fallbackSupabaseUrl
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  fallbackSupabaseAnonKey

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
