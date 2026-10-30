import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { HackathonEvent, Team, TeamMember, UserProfile } from '../types'
import { Users, Plus, Lock, Search, UserPlus, Crown, Mail } from 'lucide-react'

export default function TeamBuilderPage() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState<HackathonEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStudentId, setInviteStudentId] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    async function load() {
      if (!user) return
      const [eventRes, teamRes] = await Promise.all([
        supabase.from('events').select('*').in('event_status', ['upcoming', 'registration_open']).order('start_date_time', { ascending: true }),
        supabase.from('team_members').select('*, team:teams(*)').eq('user_id', user.id).eq('invite_status', 'accepted'),
      ])
      if (eventRes.data) setEvents(eventRes.data)
      if (teamRes.data) {
        const teams = (teamRes.data as Array<{ team: Team }>).map(t => t.team).filter(Boolean)
        setMyTeams(teams)
      }
      setLoading(false)
    }
    load()
  }, [user])

  // Load team details when selected
  useEffect(() => {
    if (!currentTeam) return
    supabase.from('team_members')
      .select('*, user:profiles(*)')
      .eq('team_id', currentTeam.id)
      .then(({ data }) => {
        if (data) setMembers(data as unknown as TeamMember[])
      })
  }, [currentTeam])

  const createTeam = async () => {
    if (!user || !selectedEventId) return
    const event = events.find(e => e.id === selectedEventId)
    if (!event) return

    const { data: team } = await supabase.from('teams').insert({
      event_id: selectedEventId,
      name: `${profile?.full_name || 'My'}'s Team`,
      leader_id: user.id,
      max_members: event.max_team_size,
      status: 'draft',
    }).select().single()

    if (team) {
      // Auto-add leader as member
      await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: user.id,
        role: 'leader',
        invite_status: 'accepted',
      })
      setActionMsg('Team created! You are the team leader.')
      setCurrentTeam(team as Team)
      setMyTeams(prev => [...prev, team as Team])
      setTimeout(() => setActionMsg(''), 4000)
    }
  }

  const searchStudents = async () => {
    const query = inviteEmail || inviteStudentId
    if (!query.trim()) return
    const field = query.includes('@') ? 'email' : 'student_id'
    const { data } = await supabase.from('profiles')
      .select('*')
      .or(`${field}.ilike.%${query}%,student_id.ilike.%${query}%`)
      .limit(5)
    if (data) setSearchResults(data)
  }

  const sendInvite = async (inviteeId: string) => {
    if (!currentTeam) return
    // Check max team size
    if (members.length >= (currentTeam.max_members || 4)) {
      setActionMsg(`Team is full (max ${currentTeam.max_members} members)`)
      setTimeout(() => setActionMsg(''), 4000)
      return
    }
    // Check already on team for this event
    const eventId = currentTeam.event_id
    await supabase.from('team_members')
      .select('id')
      .eq('user_id', inviteeId)
      .in('team_id', (
        supabase.from('teams').select('id').eq('event_id', eventId) as any
      ))
    // Simplified check
    await supabase.from('team_members').insert({
      team_id: currentTeam.id,
      user_id: inviteeId,
      role: 'member',
      invite_status: 'pending',
    })
    setActionMsg('Invite sent!')
    setSearchResults([])
    setInviteEmail('')
    setInviteStudentId('')
    setTimeout(() => setActionMsg(''), 3000)
  }

  const lockTeam = async () => {
    if (!currentTeam) return
    if (members.length < 1) {
      setActionMsg('Team must have at least 1 member to lock.')
      return
    }
    await supabase.from('teams').update({ status: 'locked' }).eq('id', currentTeam.id)
    setCurrentTeam(prev => prev ? { ...prev, status: 'locked' } : null)
    setActionMsg('Team roster locked! No further changes can be made.')
    setTimeout(() => setActionMsg(''), 4000)
  }

  const isLeader = currentTeam?.leader_id === user?.id

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0A192F]">Team Builder</h1>
        <p className="text-sm text-gray-500 mt-1">Create or join a hackathon team (max 4 members per event)</p>
      </div>

      {actionMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 mb-4 text-sm font-medium">
          {actionMsg}
        </div>
      )}

      {/* My Existing Teams */}
      {myTeams.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold text-[#0A192F] mb-3 flex items-center gap-2"><Users size={18} /> My Teams</h2>
          <div className="space-y-2">
            {myTeams.map(team => (
              <button
                key={team.id}
                onClick={() => setCurrentTeam(team)}
                className={`w-full card text-left ${currentTeam?.id === team.id ? 'border-[#1E3A8A] bg-blue-50/30' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{team.name}</p>
                    <p className="text-xs text-gray-500">
                      Event: {events.find(e => e.id === team.event_id)?.name || team.event_id}
                    </p>
                  </div>
                  <span className={`badge ${team.status === 'locked' ? 'badge-checked-in' : 'badge-registered'}`}>
                    {team.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Create New Team */}
      {!currentTeam && (
        <section className="card mb-6">
          <h2 className="font-bold text-[#0A192F] mb-3 flex items-center gap-2"><Plus size={18} /> Create a New Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Select Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="select-field"
              >
                <option value="">Choose an event...</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.name} (max {e.max_team_size}/team)</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={createTeam} disabled={!selectedEventId} className="btn btn-primary w-full">
                <Plus size={18} /> Create Team
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Current Team Management */}
      {currentTeam && (
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-[#0A192F]">{currentTeam.name}</h2>
            <div className="flex items-center gap-2">
              <span className={`badge ${currentTeam.status === 'locked' ? 'badge-checked-in' : 'badge-registered'}`}>
                {currentTeam.status}
              </span>
              {isLeader && currentTeam.status !== 'locked' && (
                <button onClick={lockTeam} className="btn btn-primary btn-sm" disabled={members.length < 1}>
                  <Lock size={14} /> Lock Roster
                </button>
              )}
              {currentTeam.status === 'locked' && (
                <span className="text-xs text-gray-500 italic">Roster finalized — contact an officer to unlock.</span>
              )}
            </div>
          </div>

          {/* Member List */}
          <div className="space-y-2 mb-4">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-xs font-bold">
                    {(member.user as UserProfile)?.first_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {(member.user as UserProfile)?.full_name || 'Pending...'}
                      {member.role === 'leader' && <Crown size={12} className="inline ml-1 text-amber-500" />}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.invite_status === 'pending' ? 'Invited — awaiting response' :
                       member.invite_status === 'accepted' ? 'Accepted' : 'Declined'}
                    </p>
                  </div>
                </div>
                <span className={`badge ${
                  member.invite_status === 'accepted' ? 'badge-approved' :
                  member.invite_status === 'pending' ? 'badge-waitlisted' : 'badge-cancelled'
                }`}>
                  {member.invite_status}
                </span>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No members yet. Invite teammates below.</p>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-3">
            {members.filter(m => m.invite_status === 'accepted').length} / {currentTeam.max_members} members
            ({currentTeam.max_members - members.filter(m => m.invite_status === 'accepted').length} spots available)
          </p>

          {/* Invite Form (leader only, unlocked only) */}
          {isLeader && currentTeam.status !== 'locked' && members.length < currentTeam.max_members && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h3 className="font-semibold text-sm text-[#0A192F] mb-3 flex items-center gap-2">
                <UserPlus size={16} /> Invite Teammates
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  placeholder="Search by email..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                />
                <input
                  placeholder="Or student ID..."
                  value={inviteStudentId}
                  onChange={(e) => setInviteStudentId(e.target.value)}
                  className="input-field"
                />
                <button onClick={searchStudents} className="btn btn-secondary btn-sm">
                  <Search size={14} /> Search
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {searchResults.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{s.full_name}</p>
                        <p className="text-xs text-gray-500">{s.email}</p>
                      </div>
                      <button onClick={() => sendInvite(s.id)} className="btn btn-primary btn-sm">
                        <Mail size={12} /> Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {loading && <div className="skeleton w-full h-40 rounded-xl" />}
    </div>
  )
}
