import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useDomainGuard } from './contexts/AuthContext'
import Layout from './components/Layout'
import OfflineBanner from './components/OfflineBanner'
import TopNavigation from './components/TopNavigation'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import StudentDashboard from './pages/StudentDashboard'
import StudentProfilePage from './pages/StudentProfilePage'
import TeamBuilderPage from './pages/TeamBuilderPage'
import EventsPage from './pages/EventsPage'
import QRPassPage from './pages/QRPassPage'
import OfficerConsole from './pages/OfficerConsole'
import AdvisorSuite from './pages/AdvisorSuite'

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth()
  useDomainGuard()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="skeleton w-48 h-12 rounded-lg" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard based on role
    if (profile.role === 'student' || profile.role === 'mentor') return <Navigate to="/student/dashboard" replace />
    if (profile.role === 'officer') return <Navigate to="/officer/console" replace />
    if (profile.role === 'faculty_advisor') return <Navigate to="/advisor/compliance" replace />
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Public route (redirects to dashboard if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="skeleton w-48 h-12 rounded-lg" />
    </div>
  )

  if (user) return <Navigate to="/student/dashboard" replace />

  return <>{children}</>
}

// Student layout with bottom nav
function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout showBottomNav>
      {children}
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineBanner />
        <TopNavigation />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:slug" element={<EventsPage />} />
          <Route path="/showcase" element={<HomePage />} /> {/* Reuse home for showcase gallery */}

          {/* Auth */}
          <Route path="/login" element={
            <PublicRoute><LoginPage /></PublicRoute>
          } />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={
            <ProtectedRoute allowedRoles={['student', 'mentor']}>
              <StudentLayout><StudentDashboard /></StudentLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/profile" element={
            <ProtectedRoute allowedRoles={['student', 'mentor']}>
              <StudentLayout><StudentProfilePage /></StudentLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/team" element={
            <ProtectedRoute allowedRoles={['student', 'mentor']}>
              <StudentLayout><TeamBuilderPage /></StudentLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/team/:teamId" element={
            <ProtectedRoute allowedRoles={['student', 'mentor']}>
              <StudentLayout><TeamBuilderPage /></StudentLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/qr-pass" element={
            <ProtectedRoute allowedRoles={['student', 'mentor']}>
              <StudentLayout><QRPassPage /></StudentLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/receipt" element={
            <ProtectedRoute allowedRoles={['student', 'mentor']}>
              <StudentLayout>
                <div className="page-container">
                  <div className="card text-center py-12">
                    <p className="text-gray-500">Receipt upload form — connects to Supabase Storage when provisioned.</p>
                  </div>
                </div>
              </StudentLayout>
            </ProtectedRoute>
          } />

          {/* Officer Routes */}
          <Route path="/officer/console" element={
            <ProtectedRoute allowedRoles={['officer', 'faculty_advisor']}>
              <Layout><OfficerConsole /></Layout>
            </ProtectedRoute>
          } />

          {/* Faculty Advisor Routes */}
          <Route path="/advisor/compliance" element={
            <ProtectedRoute allowedRoles={['faculty_advisor']}>
              <Layout><AdvisorSuite /></Layout>
            </ProtectedRoute>
          } />

          {/* Notifications placeholder */}
          <Route path="/notifications" element={
            <ProtectedRoute>
              <StudentLayout>
                <div className="page-container">
                  <h1 className="text-2xl font-bold text-[#0A192F] mb-4">Notifications</h1>
                  <div className="card text-center py-12">
                    <p className="text-gray-500">Push notifications configured via service worker. No notifications yet.</p>
                  </div>
                </div>
              </StudentLayout>
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={
            <div className="page-container text-center py-20">
              <h1 className="text-4xl font-bold text-[#0A192F] mb-2">404</h1>
              <p className="text-gray-500 mb-4">Page not found</p>
              <a href="/" className="btn btn-primary">Go Home</a>
            </div>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Auth callback handler — processes OAuth redirect
function AuthCallback() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="skeleton w-48 h-12 rounded-lg mx-auto mb-4" />
          <p className="text-sm text-gray-500">Signing you in...</p>
        </div>
      </div>
    )
  }

  return <Navigate to={user ? "/student/dashboard" : "/login"} replace />
}
