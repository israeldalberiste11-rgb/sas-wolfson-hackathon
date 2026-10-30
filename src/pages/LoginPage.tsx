import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Mail, Chrome, UserPlus, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { signInWithGoogle, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [showMagicLink, setShowMagicLink] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [sendingMagic, setSendingMagic] = useState(false)
  const [magicError, setMagicError] = useState('')

  const handleMagicLink = async () => {
    if (!email.trim()) return
    if (!isSupabaseConfigured) {
      setMagicError('Supabase is not configured. Add credentials to .env.local to enable sign-in.')
      return
    }
    setSendingMagic(true)
    setMagicError('')
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    })
    setSendingMagic(false)
    if (otpError) {
      setMagicError(otpError.message)
    } else {
      setMagicLinkSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] to-[#1E3A8A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-[#0A192F] font-extrabold text-2xl">SAS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Welcome Back</h1>
          <p className="text-blue-200 text-sm">
            Sign in with your @students.dadeschools.net account
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-4">
          {/* Google OAuth (primary for students) */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="btn btn-primary w-full py-3 text-base"
          >
            <Chrome size={20} />
            Sign in with Google (Student)
          </button>

          {/* Staff login */}
          {!showMagicLink && (
            <button
              onClick={() => setShowMagicLink(true)}
              className="btn btn-secondary w-full py-3 text-base"
            >
              <Mail size={20} />
              Staff / Mentor Login
            </button>
          )}

          {/* Magic link form (for staff/mentors) */}
          {showMagicLink && !magicLinkSent && (
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <label className="label">School Email (@dadeschools.net)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.name@dadeschools.net"
                className="input-field"
              />
              <p className="hint">Staff accounts require admin whitelist approval.</p>
              {magicError && (
                <p className="text-xs text-red-600 font-medium">{magicError}</p>
              )}
              <button
                onClick={handleMagicLink}
                disabled={!email || sendingMagic}
                className="btn btn-primary w-full"
              >
                {sendingMagic ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                {sendingMagic ? 'Sending...' : 'Send Magic Link'}
              </button>
              <button
                onClick={() => { setShowMagicLink(false); setMagicError('') }}
                className="btn btn-ghost w-full text-sm"
              >
                ← Back to student sign-in
              </button>
            </div>
          )}

          {/* Magic link sent confirmation */}
          {showMagicLink && magicLinkSent && (
            <div className="space-y-3 pt-4 border-t border-gray-100 text-center">
              <Mail size={32} className="mx-auto text-green-500" />
              <p className="text-sm font-medium text-gray-700">Check your email!</p>
              <p className="text-xs text-gray-500">A magic link has been sent to {email}. Click the link to sign in.</p>
              <button
                onClick={() => { setShowMagicLink(false); setMagicLinkSent(false); setEmail('') }}
                className="btn btn-ghost w-full text-sm"
              >
                ← Back to sign-in
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        <p className="text-center text-blue-200/70 text-xs mt-6">
          Only @students.dadeschools.net accounts are accepted for student logins.
          <br />Staff: contact a faculty advisor for access.
        </p>
      </div>
    </div>
  )
}
