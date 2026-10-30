import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { HackathonEvent, EventRegistration } from '../types'
import CountdownTimer from '../components/CountdownTimer'
import StatusBadge from '../components/StatusBadge'
import { Calendar, MapPin, Users, Bus, ExternalLink, Search } from 'lucide-react'

type TabKey = 'upcoming' | 'my_registrations' | 'past'

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<HackathonEvent[]>([])
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [eventRes, regRes] = await Promise.all([
        supabase.from('events').select('*').order('start_date_time', { ascending: true }),
        user ? supabase.from('event_registrations').select('*, event:events(*)').eq('user_id', user.id) : Promise.resolve({ data: [] }),
      ])
      if (eventRes.data) setEvents(eventRes.data)
      if (regRes.data) setRegistrations(regRes.data as unknown as EventRegistration[])
      setLoading(false)
    }
    load()
  }, [user])

  const filteredEvents = events.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.venue_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const upcomingEvents = filteredEvents.filter(e => !['completed', 'cancelled'].includes(e.event_status))
  const pastEvents = filteredEvents.filter(e => e.event_status === 'completed')

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'upcoming', label: 'Upcoming Events', count: upcomingEvents.length },
    { key: 'my_registrations', label: 'My Registrations', count: registrations.length },
    { key: 'past', label: 'Past Events', count: pastEvents.length },
  ]

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A192F]">Events</h1>
          <p className="text-sm text-gray-500 mt-1">Discover and register for hackathons</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-[#0A192F] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-[#1E3A8A]/10 text-[#1E3A8A]' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingEvents.map(event => (
            <EventDetailCard
              key={event.id}
              event={event}
              registration={registrations.find(r => r.event_id === event.id)}
              isRegistered={!!registrations.find(r => r.event_id === event.id)}
              onRegister={() => handleRegister(event)}
            />
          ))}
          {upcomingEvents.length === 0 && !loading && (
            <div className="card text-center py-12">
              <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No upcoming events found.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'my_registrations' && (
        <div className="space-y-3">
          {registrations.map(reg => (
            <div key={reg.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-[#0A192F]">{reg.event?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{reg.event?.venue_name}</p>
                </div>
                <StatusBadge status={reg.status} />
              </div>
              {reg.excuse_deadline && !reg.excused && new Date(reg.excuse_deadline) > new Date() && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <CountdownTimer targetDate={reg.excuse_deadline} label="Excuse deadline:" />
                </div>
              )}
            </div>
          ))}
          {registrations.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-gray-500">You haven't registered for any events yet.</p>
              <button onClick={() => setActiveTab('upcoming')} className="btn btn-primary btn-sm mt-3">Browse Events</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'past' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pastEvents.map(event => (
            <div key={event.id} className="card opacity-75">
              <p className="font-bold text-[#0A192F]">{event.name}</p>
              <p className="text-xs text-gray-500 mt-1">{event.venue_name}</p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(event.start_date_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ))}
          {pastEvents.length === 0 && (
            <div className="card text-center py-12 col-span-2">
              <p className="text-gray-500">No past events recorded.</p>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton w-full h-48 rounded-xl" />)}
        </div>
      )}
    </div>
  )
}

// ---- Event Detail Card ----

function EventDetailCard({
  event,
  registration,
  isRegistered,
  onRegister,
}: {
  event: HackathonEvent
  registration?: EventRegistration
  isRegistered: boolean
  onRegister: () => void
}) {
  const now = new Date()
  const regOpen = new Date(event.registration_opens_at) <= now
  const regClosed = new Date(event.registration_closes_at) <= now

  return (
    <div className="card-hover">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-[#0A192F]">{event.name}</h3>
            <StatusBadge status={event.event_status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
            <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(event.start_date_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="flex items-center gap-1"><MapPin size={14} /> {event.venue_name}, {event.city}</span>
            <span className="flex items-center gap-1"><Users size={14} /> Max {event.max_team_size}/team</span>
            {event.transport_provided && <span className="flex items-center gap-1"><Bus size={14} /> Bus ({event.bus_capacity} seats)</span>}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>

      {/* Countdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {!regOpen && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Registration Opens In:</p>
            <CountdownTimer targetDate={event.registration_opens_at} />
          </div>
        )}
        {regOpen && !regClosed && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1">Registration Closes In:</p>
            <CountdownTimer targetDate={event.registration_closes_at} />
          </div>
        )}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">Event Starts In:</p>
          <CountdownTimer targetDate={event.start_date_time} />
        </div>
      </div>

      {/* Eligibility & Rules */}
      <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 mb-4">
        <p className="text-xs font-semibold text-amber-800 mb-1">Eligibility Rules</p>
        <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
          {event.requires_parent_consent && <li>Parent consent form required</li>}
          {event.requires_gpa_clearance && <li>GPA clearance required</li>}
          {event.min_grade_level && <li>Minimum grade level: {event.min_grade_level}</li>}
          <li>Deposit: ${event.deposit_amount} (refundable if you attend or excuse 48h+ early)</li>
          <li>Team size: up to {event.max_team_size} members</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
        {isRegistered ? (
          <>
            <span className="badge badge-approved py-1.5 px-4 text-sm">✓ Registered</span>
            {registration?.status === 'waitlisted' && (
              <span className="badge badge-waitlisted py-1.5 px-4 text-sm">
                Waitlist #{registration.waitlist_position}
              </span>
            )}
          </>
        ) : regOpen && !regClosed ? (
          <button onClick={onRegister} className="btn btn-primary">
            Register Now
          </button>
        ) : !regOpen ? (
          <span className="badge badge-draft py-1.5 px-4 text-sm">Registration Not Yet Open</span>
        ) : (
          <span className="badge badge-cancelled py-1.5 px-4 text-sm">Registration Closed</span>
        )}

        {event.luma_registration_url && (
          <a href={event.luma_registration_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            <ExternalLink size={14} /> Lu.ma Page
          </a>
        )}
        {event.devpost_url && (
          <a href={event.devpost_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            <ExternalLink size={14} /> Devpost
          </a>
        )}
        <Link to={`/events/${event.slug}`} className="btn btn-ghost btn-sm ml-auto">
          View Details →
        </Link>
      </div>
    </div>
  )
}

async function handleRegister(event: HackathonEvent) {
  // This would be connected to actual registration logic
  alert(`Registration for "${event.name}" — this will connect to Supabase when the database is provisioned.`)
}
