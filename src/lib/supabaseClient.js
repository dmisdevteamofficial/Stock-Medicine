import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_DB_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_DB_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
