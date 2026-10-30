import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

export default function TopNavigation() {
  const { user, profile, signOut, isOfficer, isFacultyAdvisor } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-9 h-9 bg-[#0A192F] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SAS</span>
          </div>
          <span className="font-bold text-[#0A192F] text-lg hidden sm:block">Wolfson Hackathon</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-4">
          <Link to="/" className="text-sm font-medium text-gray-600 hover:text-[#1E3A8A] no-underline">Home</Link>
          <Link to="/events" className="text-sm font-medium text-gray-600 hover:text-[#1E3A8A] no-underline">Events</Link>
          <Link to="/showcase" className="text-sm font-medium text-gray-600 hover:text-[#1E3A8A] no-underline">Showcase</Link>

          {user ? (
            <>
              {isStudent(profile) && (
                <>
                  <Link to="/student/dashboard" className="text-sm font-medium text-gray-600 hover:text-[#1E3A8A] no-underline">Dashboard</Link>
                  <Link to="/student/team" className="text-sm font-medium text-gray-600 hover:text-[#1E3A8A] no-underline">My Team</Link>
                </>
              )}
              {(isOfficer || isFacultyAdvisor) && (
                <Link to="/officer/console" className="text-sm font-medium text-purple-600 hover:text-purple-800 no-underline">Officer Console</Link>
              )}
              {isFacultyAdvisor && (
                <Link to="/advisor/compliance" className="text-sm font-medium text-amber-600 hover:text-amber-800 no-underline">Advisor Suite</Link>
              )}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                <div className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-xs font-bold">
                  {profile?.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden lg:block">{profile?.full_name}</span>
                <button onClick={signOut} className="btn btn-ghost btn-sm">Sign Out</button>
              </div>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
          )}
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[60px] left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 p-4 space-y-3">
          <Link to="/" className="block text-sm font-medium text-gray-700 no-underline py-1" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/events" className="block text-sm font-medium text-gray-700 no-underline py-1" onClick={() => setMobileMenuOpen(false)}>Events</Link>
          <Link to="/showcase" className="block text-sm font-medium text-gray-700 no-underline py-1" onClick={() => setMobileMenuOpen(false)}>Showcase</Link>
          {user ? (
            <>
              <Link to="/student/dashboard" className="block text-sm font-medium text-gray-700 no-underline py-1" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
              <Link to="/student/team" className="block text-sm font-medium text-gray-700 no-underline py-1" onClick={() => setMobileMenuOpen(false)}>My Team</Link>
              <button onClick={signOut} className="btn btn-secondary btn-sm w-full mt-2">Sign Out</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm w-full" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
          )}
        </div>
      )}
    </header>
  )
}

function isStudent(profile: { role?: string } | null): boolean {
  return profile?.role === 'student' || profile?.role === 'mentor'
}
