import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { HackathonEvent, EventRegistration, Team } from '../types'
import CountdownTimer from '../components/CountdownTimer'
import StatusBadge from '../components/StatusBadge'
import { Clock, Users, FileText, QrCode, AlertTriangle, CheckCircle2, Upload } from 'lucide-react'

export default function StudentDashboard() {
  const { profile } = useAuth()
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<HackathonEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    async function loadDashboard() {
      const profileId = profile!.id
      const [regRes, teamRes, eventRes] = await Promise.all([
        supabase.from('event_registrations').select('*, event:events(*)').eq('user_id', profileId).order('registered_at', { ascending: false }),
        supabase.from('team_members').select('*, team:teams(*)').eq('user_id', profileId).eq('invite_status', 'accepted'),
        supabase.from('events').select('*').in('event_status', ['upcoming', 'registration_open']).order('start_date_time', { ascending: true }).limit(6),
      ])
      if (regRes.data) setRegistrations(regRes.data as unknown as EventRegistration[])
      if (teamRes.data) setTeams((teamRes.data as Array<{ team: Team }>).map(t => t.team).filter(Boolean))
      if (eventRes.data) setUpcomingEvents(eventRes.data)
      setLoading(false)
    }
    loadDashboard()
  }, [profile])

  // Group registrations by status
  const upcomingRegs = registrations.filter((r: EventRegistration) => r.event?.event_status === 'upcoming' || r.event?.event_status === 'registration_open')
  const pendingApprovals = registrations.filter(r => r.status === 'registered' || r.status === 'waitlisted')

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0A192F]">
          Welcome back, {profile?.first_name || 'Hacker'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Your hackathon dashboard</p>
      </div>

      {/* Travel Eligibility Summary */}
      <EligibilityCard profile={profile} />

      {/* Upcoming Registrations */}
      <section className="mt-6">
        <h2 className="text-lg font-bold text-[#0A192F] mb-3 flex items-center gap-2">
          <Clock size={18} /> My Events
        </h2>
        {upcomingRegs.length > 0 ? (
          <div className="space-y-3">
            {upcomingRegs.map(reg => (
              <RegistrationCard key={reg.id} reg={reg} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-gray-500 text-sm">No upcoming event registrations.</p>
            <Link to="/events" className="btn btn-primary btn-sm mt-3">Browse Events</Link>
          </div>
        )}
      </section>

      {/* Deposit Forfeiture Countdowns */}
      {pendingApprovals.some(r => !r.excused && r.excuse_deadline) && (
        <section className="mt-6">
          <h2 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} /> Excuse Deadlines
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingApprovals
              .filter(r => !r.excused && r.excuse_deadline)
              .map(reg => (
                <div key={reg.id} className="card border-amber-200 bg-amber-50/50">
                  <p className="font-semibold text-sm text-[#0A192F]">{reg.event?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Excuse deadline (48h before event):</p>
                  <CountdownTimer targetDate={reg.excuse_deadline!} className="mt-2" />
                  {!reg.deposit_paid && (
                    <p className="text-xs text-amber-600 mt-2 font-medium">
                      ⚠️ ${reg.event?.deposit_amount || 20} deposit required
                    </p>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="mt-6">
        <h2 className="text-lg font-bold text-[#0A192F] mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={<QrCode size={20} />} label="QR Pass" href="/student/qr-pass" />
          <QuickAction icon={<Users size={20} />} label="My Team" href="/student/team" />
          <QuickAction icon={<FileText size={20} />} label="Profile" href="/student/profile" />
          <QuickAction icon={<Upload size={20} />} label="Upload Receipt" href="/student/receipt" />
        </div>
      </section>

      {/* My Teams */}
      {teams.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-bold text-[#0A192F] mb-3 flex items-center gap-2">
            <Users size={18} /> My Teams
          </h2>
          <div className="space-y-3">
            {teams.map(team => (
              <div key={team.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{team.name}</p>
                  <p className="text-xs text-gray-500">Status: <StatusBadge status={team.status as any} /></p>
                </div>
                <Link to={`/student/team/${team.id}`} className="btn btn-secondary btn-sm">Manage</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Discover More Events */}
      <section className="mt-8 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#0A192F]">Discover Events</h2>
          <Link to="/events" className="text-sm text-[#1E3A8A] font-semibold hover:underline">View All →</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton w-full h-28 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingEvents.slice(0, 3).map(event => (
              <EventMiniCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ---- Sub-components ----

function EligibilityCard({ profile }: { profile: { gpa_cleared?: boolean; membership_active?: boolean; parent_consent_status?: string; travel_eligible?: boolean } | null }) {
  if (!profile) return null

  const checks = [
    { label: 'Active Membership', ok: profile.membership_active },
    { label: 'Parent Consent', ok: profile.parent_consent_status === 'approved' },
    { label: 'GPA Clearance', ok: profile.gpa_cleared },
  ]

  return (
    <div className={`card ${profile.travel_eligible ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
      <h3 className="font-bold text-sm text-[#0A192F] mb-3">Travel Eligibility</h3>
      <div className="space-y-2">
        {checks.map(check => (
          <div key={check.label} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{check.label}</span>
            {check.ok ? (
              <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 size={14} /> Clear</span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 font-medium"><AlertTriangle size={14} /> Pending</span>
            )}
          </div>
        ))}
      </div>
      {profile.travel_eligible && (
        <p className="text-xs text-green-700 font-medium mt-3">✅ Cleared for travel</p>
      )}
    </div>
  )
}

function RegistrationCard({ reg }: { reg: EventRegistration }) {
  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="font-bold text-[#0A192F]">{reg.event?.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(reg.event?.start_date_time || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}{reg.event?.venue_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={reg.status} />
          {reg.transport_seat_confirmed && (
            <span className="text-xs text-green-600 font-medium">Seat #{reg.bus_seat_number}</span>
          )}
        </div>
      </div>
      {reg.event && new Date(reg.event.start_date_time) > new Date() && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <CountdownTimer targetDate={reg.event.start_date_time} label="Event starts in:" />
        </div>
      )}
    </div>
  )
}

function QuickAction({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link to={href} className="card-hover flex flex-col items-center gap-2 py-4 no-underline text-center">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
    </Link>
  )
}

function EventMiniCard({ event }: { event: HackathonEvent }) {
  return (
    <Link to={`/events/${event.slug}`} className="card-hover block no-underline">
      <p className="font-semibold text-sm text-[#0A192F]">{event.name}</p>
      <p className="text-xs text-gray-500 mt-1">{event.venue_name}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          {new Date(event.start_date_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <StatusBadge status={event.event_status} />
      </div>
    </Link>
  )
}
