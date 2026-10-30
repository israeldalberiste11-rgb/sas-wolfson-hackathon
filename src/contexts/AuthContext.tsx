import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { type User, type Session, AuthError } from '@supabase/supabase-js'
import { supabase, getCurrentProfile, isSupabaseConfigured, isAllowedStudentDomain, isAllowedStaffDomain } from '../lib/supabase'
import type { UserProfile, UserRole } from '../types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  hasRole: (roles: UserRole | UserRole[]) => boolean
  isStudent: boolean
  isOfficer: boolean
  isFacultyAdvisor: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    error: null,
  })

  const refreshProfile = useCallback(async () => {
    const profile = await getCurrentProfile()
    setState(prev => ({ ...prev, profile, loading: false }))
  }, [])

  useEffect(() => {
    // Not configured (no real credentials): no session possible, settle immediately
    if (!isSupabaseConfigured) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    // Get initial session — always settle loading, even if Supabase is
    // unreachable or credentials are placeholders
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setState(prev => ({ ...prev, session, user: session?.user ?? null }))
        if (session?.user) {
          try {
            const profile = await getCurrentProfile()
            setState(prev => ({ ...prev, profile, loading: false }))
          } catch {
            setState(prev => ({ ...prev, loading: false }))
          }
        }
      })
      .catch((err) => console.warn('Auth init failed:', err?.message))
      .finally(() => setState(prev => ({ ...prev, loading: false })))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          profile: null,
          error: null,
        }))
        if (session?.user) {
          try {
            const profile = await getCurrentProfile()
            setState(prev => ({ ...prev, profile, loading: false }))
          } catch (err) {
            console.warn('Profile load failed:', err)
            setState(prev => ({ ...prev, loading: false }))
          }
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [refreshProfile])

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      setState(prev => ({
        ...prev,
        error: 'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local to enable sign-in.',
      }))
      return
    }
    setState(prev => ({ ...prev, error: null, loading: true }))
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          queryParams: {
            hd: 'students.dadeschools.net',
          },
        },
      })
      if (error) throw error
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'Sign-in failed'
      setState(prev => ({ ...prev, error: message, loading: false }))
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setState({
      user: null,
      session: null,
      profile: null,
      loading: false,
      error: null,
    })
  }

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!state.profile) return false
      const roleList = Array.isArray(roles) ? roles : [roles]
      return roleList.includes(state.profile.role)
    },
    [state.profile]
  )

  const value: AuthContextValue = {
    ...state,
    signInWithGoogle,
    signOut,
    refreshProfile,
    hasRole,
    isStudent: state.profile?.role === 'student',
    isOfficer: state.profile?.role === 'officer',
    isFacultyAdvisor: state.profile?.role === 'faculty_advisor',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

// Domain validation hook — rejects non-district emails at callback
export function useDomainGuard() {
  const { user, profile, signOut } = useAuth()

  useEffect(() => {
    if (!user?.email) return

    const email = user.email.toLowerCase()

    // If profile exists with a non-student/non-staff domain and not whitelisted, reject
    if (
      !isAllowedStudentDomain(email) &&
      !isAllowedStaffDomain(email) &&
      !profile?.is_whitelisted_staff &&
      !profile?.invited_by
    ) {
      console.warn(`Rejected login from unauthorized domain: ${email}`)
      signOut()
    }
  }, [user?.email, profile, signOut])
}
