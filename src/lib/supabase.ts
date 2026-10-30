import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const isSupabaseConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Helper: get current user's profile (returns null when Supabase isn't configured)
export async function getCurrentProfile() {
  if (!isSupabaseConfigured) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_id', user.id)
    .single()

  return profile ?? null
}

// Helper: check if email is allowed domain
export function isAllowedStudentDomain(email: string): boolean {
  return email.endsWith('@students.dadeschools.net')
}

export function isAllowedStaffDomain(email: string): boolean {
  return email.endsWith('@dadeschools.net') && !email.endsWith('@students.dadeschools.net')
}
