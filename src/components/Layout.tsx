import { type ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  showBottomNav?: boolean
}

export default function Layout({ children, showBottomNav = false }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {children}
      {showBottomNav && <BottomNavigation />}
    </div>
  )
}

function BottomNavigation() {
  const navItems = [
    { label: 'QR Pass', icon: '🎫', href: '/student/qr-pass' },
    { label: 'Schedule', icon: '📅', href: '/events' },
    { label: 'Team', icon: '👥', href: '/student/team' },
    { label: 'Alerts', icon: '🔔', href: '/notifications' },
  ]

  return (
    <nav className="mobile-nav">
      {navItems.map(item => (
        <a key={item.href} href={item.href} className="mobile-nav-item">
          <span className="text-lg">{item.icon}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  )
}
