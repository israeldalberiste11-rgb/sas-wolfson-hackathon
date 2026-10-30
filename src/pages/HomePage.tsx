import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Users, DollarSign, Calendar, Code, ArrowRight, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { HackathonEvent, PastShowcase } from '../types'
import CountdownTimer from '../components/CountdownTimer'

interface ClubMetrics {
  total_competitions_attended: number
  total_awards_won: number
  total_prize_money: number
  active_members: number
  upcoming_event_name: string | null
  upcoming_event_start: string | null
}

export default function HomePage() {
  const [metrics, setMetrics] = useState<ClubMetrics | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<HackathonEvent[]>([])
  const [showcases, setShowcases] = useState<PastShowcase[]>([])
  const [showcaseFilter, setShowcaseFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHomeData() {
      try {
        // Load metrics
        const { data: metricData } = await supabase.rpc('get_club_metrics')
        if (metricData) setMetrics(metricData)

        // Load upcoming events
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .in('event_status', ['upcoming', 'registration_open'])
          .order('start_date_time', { ascending: true })
          .limit(5)
        if (events) setUpcomingEvents(events)

        // Load published showcases for gallery
        const { data: showcaseData } = await supabase
          .from('v_public_showcases')
          .select('*')
          .order('event_date', { ascending: false })
          .limit(12)
        if (showcaseData) setShowcases(showcaseData as unknown as PastShowcase[])
      } catch (err) {
        console.error('Failed to load home data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadHomeData()
  }, [])

  const filteredShowcases = showcaseFilter === 'all'
    ? showcases
    : showcases.filter(s => s.awards_won && s.awards_won.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0A192F] via-[#1E3A8A] to-[#0A192F] text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-3xl animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
              <Zap size={16} className="text-amber-400" />
              School for Advanced Studies · Wolfson Campus
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              White Tigers<br />
              <span className="text-amber-400">Hackathon Club</span>
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mb-8 leading-relaxed">
              Build. Compete. Innovate. Join Miami's most ambitious student hackers 
              competing at ShellHacks, MDC Wolfson, and regional championships.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/login" className="btn btn-lg bg-white text-[#0A192F] hover:bg-gray-100 font-bold">
                Get Started <ArrowRight size={18} />
              </Link>
              <Link to="/showcase" className="btn btn-lg border-2 border-white/30 text-white hover:bg-white/10">
                View Portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      {metrics && (
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <MetricCard icon={<Trophy size={24} />} label="Competitions Attended" value={metrics.total_competitions_attended} />
              <MetricCard icon={<AwardIcon />} label="Awards Won" value={metrics.total_awards_won} />
              <MetricCard icon={<DollarSign size={24} />} label="Prize Money Earned" value={`$${metrics.total_prize_money?.toLocaleString() || '0'}`} />
              <MetricCard icon={<Users size={24} />} label="Active Members" value={metrics.active_members} />
            </div>
          </div>
        </section>
      )}

      {/* Next Event Countdown */}
      {metrics?.upcoming_event_start && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="card text-center max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-[#0A192F] mb-1">Next Competition</h2>
            <p className="text-sm text-gray-500 mb-4">{metrics.upcoming_event_name}</p>
            <CountdownTimer targetDate={metrics.upcoming_event_start} className="mb-2" />
            <Link to="/events" className="btn btn-secondary btn-sm mt-2">View All Events</Link>
          </div>
        </section>
      )}

      {/* Upcoming Events Preview */}
      {upcomingEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#0A192F]">Upcoming Events</h2>
            <Link to="/events" className="text-sm font-semibold text-[#1E3A8A] hover:underline">View All →</Link>
          </div>
          <div className="grid grid-auto-fit">
            {upcomingEvents.slice(0, 3).map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Project Showcase Gallery */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-[#0A192F]">Project Showcase</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowcaseFilter('all')}
              className={`btn btn-sm ${showcaseFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Projects
            </button>
            <button
              onClick={() => setShowcaseFilter('awarded')}
              className={`btn btn-sm ${showcaseFilter === 'awarded' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Award Winners
            </button>
          </div>
        </div>

        {filteredShowcases.length > 0 ? (
          <div className="grid grid-auto-fit">
            {filteredShowcases.map(project => (
              <ShowcaseCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Code size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No projects in the showcase yet. Check back after our next competition!</p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-[#0A192F] text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-blue-200">
            SAS Wolfson Hackathon Club · School for Advanced Studies · Miami Dade College
          </p>
          <p className="text-xs text-blue-300/60 mt-2">
            Built with ❤️ for student innovators
          </p>
        </div>
      </footer>

      {loading && (
        <div className="fixed inset-0 bg-white/80 z-[200] flex items-center justify-center">
          <div className="skeleton w-48 h-12 rounded-lg" />
        </div>
      )}
    </div>
  )
}

// ---- Sub-components ----

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="text-center p-3 sm:p-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-[#1E3A8A] mb-2">
        {icon}
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold text-[#0A192F]">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function AwardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

function EventCard({ event }: { event: HackathonEvent }) {
  return (
    <Link to={`/events/${event.slug}`} className="card-hover block no-underline">
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={14} className="text-gray-400" />
        <span className="text-xs text-gray-500">
          {new Date(event.start_date_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <h3 className="font-bold text-[#0A192F] mb-1">{event.name}</h3>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{event.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{event.venue_name}</span>
        <span className="badge badge-registered">Open</span>
      </div>
    </Link>
  )
}

function ShowcaseCard({ project }: { project: PastShowcase }) {
  return (
    <div className="card-static">
      {project.screenshot_urls?.[0] && (
        <div className="w-full h-40 bg-gray-100 rounded-lg mb-3 overflow-hidden">
          <img src={project.screenshot_urls[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <h3 className="font-bold text-[#0A192F] text-sm mb-1 line-clamp-1">{project.project_title}</h3>
      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{project.project_description}</p>
      {project.team_member_first_names && project.team_member_first_names.length > 0 && (
        <p className="text-xs text-gray-400">
          By: {project.team_member_first_names.join(', ')}
        </p>
      )}
      {project.demo_url && (
        <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1E3A8A] font-semibold hover:underline mt-2 inline-block">
          View Demo →
        </a>
      )}
      {project.awards_won && project.awards_won.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {project.awards_won.map((award, i) => (
            <span key={i} className="badge badge-published text-[10px]">🏆 {award}</span>
          ))}
        </div>
      )}
    </div>
  )
}
