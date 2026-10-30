import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { HackathonEvent, EventRegistration, ChaperoneAssignment, BudgetLedger, UserProfile } from '../types'
import { calculateChaperoneNeed } from '../lib/utils'
import StatusBadge from '../components/StatusBadge'
import {
  Shield, Users, Bus, DollarSign, FileText, CheckCircle2, XCircle,
  AlertTriangle, Download, ToggleLeft, ToggleRight, Eye
} from 'lucide-react'

type AdvisorTab = 'chaperones' | 'clearance' | 'medical' | 'budget' | 'stipends'

export default function AdvisorSuite() {
  const [activeTab, setActiveTab] = useState<AdvisorTab>('chaperones')
  const tabs: { key: AdvisorTab; label: string; icon: React.ReactNode }[] = [
    { key: 'chaperones', label: 'Chaperone Ratio', icon: <Users size={16} /> },
    { key: 'clearance', label: 'Travel Clearance', icon: <Shield size={16} /> },
    { key: 'medical', label: 'Medical Roster', icon: <Eye size={16} /> },
    { key: 'budget', label: 'Budget Ledger', icon: <DollarSign size={16} /> },
    { key: 'stipends', label: 'Stipends & Reimbursements', icon: <FileText size={16} /> },
  ]

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0A192F]">Faculty Advisor Suite</h1>
        <p className="text-sm text-gray-500 mt-1">Compliance, clearance, and financial oversight</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key ? 'bg-white text-[#0A192F] shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'chaperones' && <ChaperoneRatioPanel />}
      {activeTab === 'clearance' && <TravelClearancePanel />}
      {activeTab === 'medical' && <MedicalRosterPanel />}
      {activeTab === 'budget' && <BudgetLedgerPanel />}
      {activeTab === 'stipends' && <StipendPanel />}
    </div>
  )
}

// ---- Chaperone Ratio Calculator ----

function ChaperoneRatioPanel() {
  const [events, setEvents] = useState<HackathonEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [chaperones, setChaperones] = useState<ChaperoneAssignment[]>([])
  const [approvedCount, setApprovedCount] = useState(0)
  const [newChaperoneName, setNewChaperoneName] = useState('')
  const [newChaperonePhone, setNewChaperonePhone] = useState('')
  const [newChaperoneRole, setNewChaperoneRole] = useState<'faculty_advisor' | 'officer' | 'vetted_adult'>('vetted_adult')

  useEffect(() => {
    supabase.from('events')
      .select('*')
      .in('event_status', ['upcoming', 'registration_open', 'registration_closed'])
      .order('start_date_time', { ascending: true })
      .then(({ data }) => data && setEvents(data))
  }, [])

  useEffect(() => {
    if (!selectedEventId) return
    Promise.all([
      supabase.from('chaperone_assignments').select('*').eq('event_id', selectedEventId),
      supabase.from('event_registrations').select('id').eq('event_id', selectedEventId).eq('status', 'approved_to_travel'),
    ]).then(([chapRes, regRes]) => {
      if (chapRes.data) setChaperones(chapRes.data)
      if (regRes.data) setApprovedCount(regRes.data.length)
    })
  }, [selectedEventId])

  const event = events.find(e => e.id === selectedEventId)
  const ratio = calculateChaperoneNeed(approvedCount, chaperones.filter(c => c.confirmed).length, event?.chaperone_ratio)

  const addChaperone = async () => {
    if (!selectedEventId || !newChaperoneName.trim()) return
    await supabase.from('chaperone_assignments').insert({
      event_id: selectedEventId,
      external_name: newChaperoneName,
      external_phone: newChaperonePhone,
      role: newChaperoneRole,
    })
    const { data } = await supabase.from('chaperone_assignments').select('*').eq('event_id', selectedEventId)
    if (data) setChaperones(data)
    setNewChaperoneName('')
    setNewChaperonePhone('')
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <label className="label">Select Event</label>
        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="select-field max-w-md">
          <option value="">Choose event...</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {selectedEventId && event && (
        <>
          {/* Ratio Status Card */}
          <div className={`card ${ratio.ok ? 'border-green-300 bg-green-50/30' : 'border-red-300 bg-red-50/30'}`}>
            <h3 className="font-bold text-[#0A192F] mb-3 flex items-center gap-2">
              <Bus size={18} /> Chaperone Ratio (1:{event.chaperone_ratio})
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#0A192F]">{approvedCount}</p>
                <p className="text-xs text-gray-500">Approved Students</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${ratio.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {ratio.assigned}
                </p>
                <p className="text-xs text-gray-500">Confirmed Chaperones</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{ratio.needed}</p>
                <p className="text-xs text-gray-500">Required</p>
              </div>
            </div>
            {!ratio.ok && (
              <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 font-medium">
                  ⛔ Travel blocked: need {ratio.shortfall} more chaperone(s) for {approvedCount} students.
                </p>
              </div>
            )}
            {ratio.ok && (
              <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-green-800 font-medium">
                  ✅ Chaperone requirement met. Travel can be approved.
                </p>
              </div>
            )}
          </div>

          {/* Add Chaperone */}
          <div className="card">
            <h4 className="font-semibold text-sm text-[#0A192F] mb-3">Assign Chaperone</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                value={newChaperoneName}
                onChange={(e) => setNewChaperoneName(e.target.value)}
                placeholder="Full name"
                className="input-field"
              />
              <input
                value={newChaperonePhone}
                onChange={(e) => setNewChaperonePhone(e.target.value)}
                placeholder="Phone number"
                className="input-field"
              />
              <select value={newChaperoneRole} onChange={(e) => setNewChaperoneRole(e.target.value as any)} className="select-field">
                <option value="faculty_advisor">Faculty Advisor</option>
                <option value="officer">Officer</option>
                <option value="vetted_adult">Vetted Adult</option>
              </select>
              <button onClick={addChaperone} className="btn btn-primary btn-sm">Add</button>
            </div>
          </div>

          {/* Chaperone List */}
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Role</th><th>Phone</th><th>Confirmed</th></tr>
              </thead>
              <tbody>
                {chaperones.map(c => (
                  <tr key={c.id}>
                    <td data-label="Name">{c.external_name || (c.user_id as any)}</td>
                    <td data-label="Role"><span className={`badge role-${c.role}`}>{c.role.replace('_', ' ')}</span></td>
                    <td data-label="Phone">{c.external_phone || '—'}</td>
                    <td data-label="Confirmed">
                      {c.confirmed
                        ? <CheckCircle2 size={16} className="text-green-500" />
                        : <XCircle size={16} className="text-gray-300" />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ---- Travel Clearance Panel ----

function TravelClearancePanel() {
  const [registrations, setRegistrations] = useState<(EventRegistration & { user?: UserProfile })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('event_registrations')
      .select('*, user:profiles(*), event:events(*)')
      .in('status', ['registered', 'waitlisted'])
      .order('registered_at', { ascending: true })
      .then(({ data }) => {
        if (data) setRegistrations(data as any)
        setLoading(false)
      })
  }, [])

  const toggleGPA = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ gpa_cleared: !current }).eq('id', userId)
    setRegistrations(prev => prev.map(r =>
      r.user?.id === userId
        ? { ...r, user: { ...(r.user!), gpa_cleared: !current } }
        : r
    ))
  }

  const toggleConsent = async (userId: string, current: string) => {
    const next = current === 'approved' ? 'rejected' : 'approved'
    await supabase.from('profiles').update({ parent_consent_status: next }).eq('id', userId)
    setRegistrations(prev => prev.map(r =>
      r.user?.id === userId
        ? { ...r, user: { ...(r.user!), parent_consent_status: next } }
        : r
    ))
  }

  const toggleMembership = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ membership_active: !current }).eq('id', userId)
    setRegistrations(prev => prev.map(r =>
      r.user?.id === userId
        ? { ...r, user: { ...(r.user!), membership_active: !current } }
        : r
    ))
  }

  const approveTravel = async (regId: string) => {
    // Check bus capacity and chaperone ratio before approving
    await supabase.from('event_registrations').update({ status: 'approved_to_travel' }).eq('id', regId)
    setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: 'approved_to_travel' as any } : r))
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Member</th>
              <th>GPA Clear</th>
              <th>Consent</th>
              <th>Eligible</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map(reg => {
              const u = reg.user
              const eligible = u?.membership_active && u?.gpa_cleared && u?.parent_consent_status === 'approved'
              return (
                <tr key={reg.id}>
                  <td data-label="Student">
                    <span className="font-medium text-sm">{u?.full_name || '—'}</span>
                    <span className="block text-xs text-gray-400">{u?.email}</span>
                  </td>
                  <td data-label="Membership">
                    <button onClick={() => u && toggleMembership(u.id || '', !!u.membership_active)}>
                      {u?.membership_active
                        ? <ToggleRight size={24} className="text-green-500" />
                        : <ToggleLeft size={24} className="text-gray-300" />
                      }
                    </button>
                  </td>
                  <td data-label="GPA Clearance">
                    <button onClick={() => u && toggleGPA(u.id || '', !!u.gpa_cleared)}>
                      {u?.gpa_cleared
                        ? <ToggleRight size={24} className="text-green-500" />
                        : <ToggleLeft size={24} className="text-gray-300" />
                      }
                    </button>
                  </td>
                  <td data-label="Parent Consent">
                    <button onClick={() => u && toggleConsent(u.id || '', u.parent_consent_status || '')}>
                      <span className={`badge ${u?.parent_consent_status === 'approved' ? 'badge-approved' : 'badge-waitlisted'}`}>
                        {u?.parent_consent_status || 'not_submitted'}
                      </span>
                    </button>
                  </td>
                  <td data-label="Eligible">
                    {eligible
                      ? <CheckCircle2 size={20} className="text-green-500" />
                      : <AlertTriangle size={20} className="text-amber-500" />
                    }
                  </td>
                  <td data-label="Action">
                    {eligible && reg.status !== 'approved_to_travel' && (
                      <button onClick={() => approveTravel(reg.id)} className="btn btn-success btn-sm">
                        Approve Travel
                      </button>
                    )}
                    {!eligible && (
                      <span className="text-xs text-gray-400">Clear all 3 checks</span>
                    )}
                    {reg.status === 'approved_to_travel' && (
                      <StatusBadge status="approved_to_travel" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {registrations.length === 0 && !loading && <p className="text-sm text-gray-400 text-center py-8">No pending registrations.</p>}
      </div>
    </div>
  )
}

// ---- Medical Roster (Restricted View) ----

function MedicalRosterPanel() {
  const [students, setStudents] = useState<UserProfile[]>([])
  const [eventId, setEventId] = useState<string>('')
  const [events, setEvents] = useState<HackathonEvent[]>([])

  useEffect(() => {
    supabase.from('events')
      .select('*')
      .in('event_status', ['upcoming', 'registration_open', 'registration_closed', 'ongoing'])
      .order('start_date_time', { ascending: true })
      .then(({ data }) => data && setEvents(data))
  }, [])

  useEffect(() => {
    if (!eventId) return
    // Get all registered students with medical info for this event
    supabase.from('event_registrations')
      .select('user:profiles(*)')
      .eq('event_id', eventId)
      .neq('status', 'cancelled')
      .then(({ data }) => {
        if (data) {
          const profiles = (data as unknown as Array<{ user: UserProfile }>).map(d => d.user).filter(Boolean)
          setStudents(profiles)
        }
      })
  }, [eventId])

  const hasAllergies = students.some(s => s.medical_allergies)
  const severeAllergyStudents = students.filter(s => s.medical_allergies && s.medical_allergies.length > 0)

  const exportRoster = () => {
    const rows = [
      ['Name', 'Emergency Contact', 'Emergency Phone', 'Relation', 'Allergies', 'Medical Notes'],
      ...students.map(s => [
        s.full_name,
        s.emergency_contact_name || '',
        s.emergency_contact_phone || '',
        s.emergency_contact_relation || '',
        s.medical_allergies || '',
        s.medical_notes || '',
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `medical-roster-${eventId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <label className="label">Select Event</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="select-field max-w-md">
              <option value="">Choose event...</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          {eventId && (
            <button onClick={exportRoster} className="btn btn-secondary btn-sm">
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
        <p className="hint mt-2">
          🔒 Restricted view — only visible to faculty advisors and lead officers during active events.
        </p>
      </div>

      {/* Severe Allergy Alert */}
      {hasAllergies && severeAllergyStudents.length > 0 && (
        <div className="card border-red-300 bg-red-50/50">
          <h4 className="font-bold text-red-800 flex items-center gap-2 mb-3">
            <AlertTriangle size={18} /> Severe Allergy Alert ({severeAllergyStudents.length} student{severeAllergyStudents.length !== 1 ? 's' : ''})
          </h4>
          <div className="space-y-2">
            {severeAllergyStudents.map(s => (
              <div key={s.id} className="bg-white rounded-lg p-3 border border-red-200">
                <p className="font-semibold text-sm text-red-900">{s.full_name}</p>
                <p className="text-sm text-red-700 mt-1"><strong>Allergies:</strong> {s.medical_allergies}</p>
                {s.medical_notes && <p className="text-xs text-red-600 mt-1">{s.medical_notes}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Emergency: {s.emergency_contact_name} · {s.emergency_contact_phone}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Medical Table */}
      {eventId && (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Emergency Contact</th>
                <th>Phone</th>
                <th>Allergies</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td data-label="Student">{s.full_name}</td>
                  <td data-label="Emergency Contact">{s.emergency_contact_name || '—'}</td>
                  <td data-label="Phone">{s.emergency_contact_phone || '—'}</td>
                  <td data-label="Allergies">
                    {s.medical_allergies
                      ? <span className="text-red-700 font-medium text-sm">{s.medical_allergies}</span>
                      : <span className="text-gray-400">None listed</span>}
                  </td>
                  <td data-label="Notes">{s.medical_notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No registered students.</p>}
        </div>
      )}
    </div>
  )
}

// ---- Budget Ledger Panel ----

function BudgetLedgerPanel() {
  const [entries, setEntries] = useState<BudgetLedger[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    supabase.from('budget_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => data && setEntries(data))
  }, [])

  const filtered = filter === 'all' ? entries : entries.filter(e => e.entry_type === filter)

  const totalIncome = filtered.filter(e => e.amount > 0).reduce((sum, e) => sum + Number(e.amount), 0)
  const totalExpense = filtered.filter(e => e.amount < 0).reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0)
  const balance = totalIncome - totalExpense

  const entryTypes = ['all', 'allocation', 'bus_expense', 'ticket_expense', 'food_expense', 'stipend', 'deposit', 'deposit_forfeited', 'reimbursement']

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-xl font-bold text-green-600">${totalIncome.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total Income</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold text-red-600">${totalExpense.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total Expenses</p>
        </div>
        <div className="card text-center">
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-[#0A192F]' : 'text-red-600'}`}>${balance.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Balance</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {entryTypes.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Ledger Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td data-label="Date">{new Date(e.created_at).toLocaleDateString()}</td>
                <td data-label="Description">{e.description}</td>
                <td data-label="Type">
                  <span className="badge badge-draft">{e.entry_type.replace(/_/g, ' ')}</span>
                </td>
                <td data-label="Amount">
                  <span className={`font-semibold ${e.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {e.amount >= 0 ? '+' : ''}{Number(e.amount).toFixed(2)}
                  </span>
                </td>
                <td data-label="Status">
                  <span className={`badge ${
                    e.status === 'approved' ? 'badge-approved' :
                    e.status === 'pending' ? 'badge-waitlisted' : 'badge-cancelled'
                  }`}>
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No ledger entries.</p>}
      </div>
    </div>
  )
}

// ---- Stipend & Reimbursement Approval ----

function StipendPanel() {
  const [reimbursements, setReimbursements] = useState<BudgetLedger[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('budget_ledger')
      .select('*, submitted_by_user:profiles!budget_ledger_submitted_by_fkey(full_name,email)')
      .in('entry_type', ['stipend', 'reimbursement'])
      .in('status', ['pending', 'submitted'])
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setReimbursements(data as unknown as BudgetLedger[])
        setLoading(false)
      })
  }, [])

  const handleApprove = async (id: string) => {
    await supabase.from('budget_ledger').update({ status: 'approved' }).eq('id', id)
    setReimbursements(prev => prev.map(e => e.id === id ? { ...e, status: 'approved' as const } : e))
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason (required):')
    if (!reason) return
    await supabase.from('budget_ledger').update({ status: 'rejected', reimbursement_notes: reason }).eq('id', id)
    setReimbursements(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="card bg-amber-50/50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Stipend Cap:</strong> $500 per student per event (configurable per event).
          <br />
          <strong>Deposit:</strong> $20 refundable cash deposit; forfeited to travel fund if unexcused no-show within 48h of event start.
        </p>
      </div>

      {reimbursements.map(entry => (
        <div key={entry.id} className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm text-[#0A192F]">{entry.description}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Type: {entry.entry_type.replace(/_/g, ' ')} · Submitted {new Date(entry.created_at).toLocaleDateString()}
              </p>
              {entry.receipt_file_path && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <FileText size={12} /> Receipt attached
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-[#0A192F]">${Math.abs(Number(entry.amount)).toFixed(2)}</span>
              <div className="flex gap-1">
                <button onClick={() => handleApprove(entry.id)} className="btn btn-success btn-sm">
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button onClick={() => handleReject(entry.id)} className="btn btn-danger btn-sm">
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {reimbursements.length === 0 && !loading && (
        <div className="card text-center py-12">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No pending stipend or reimbursement requests.</p>
        </div>
      )}
    </div>
  )
}
