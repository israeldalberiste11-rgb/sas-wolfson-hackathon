import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { HackathonEvent, EventRegistration, EquipmentItem, EquipmentCheckout, PastShowcase } from '../types'
import StatusBadge from '../components/StatusBadge'
import {
  QrCode, Package, FileText, Eye, CheckCircle2, XCircle,
  Camera, Users
} from 'lucide-react'

type OfficerTab = 'checkin' | 'equipment' | 'luma' | 'showcases' | 'registrations'

export default function OfficerConsole() {
  const [activeTab, setActiveTab] = useState<OfficerTab>('checkin')
  const tabs: { key: OfficerTab; label: string; icon: React.ReactNode }[] = [
    { key: 'checkin', label: 'QR Check-In', icon: <QrCode size={16} /> },
    { key: 'equipment', label: 'Equipment', icon: <Package size={16} /> },
    { key: 'luma', label: 'Lu.ma Verifier', icon: <FileText size={16} /> },
    { key: 'showcases', label: 'Showcase Review', icon: <Eye size={16} /> },
    { key: 'registrations', label: 'Registrations', icon: <Users size={16} /> },
  ]

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0A192F]">Officer Console</h1>
        <p className="text-sm text-gray-500 mt-1">Hackathon day operations & management</p>
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

      {/* Tab Content */}
      {activeTab === 'checkin' && <QRCheckInPanel />}
      {activeTab === 'equipment' && <EquipmentLedger />}
      {activeTab === 'luma' && <LumaVerifier />}
      {activeTab === 'showcases' && <ShowcaseReview />}
      {activeTab === 'registrations' && <RegistrationManager />}
    </div>
  )
}

// ---- QR Check-In Panel ----

function QRCheckInPanel() {
  const [events, setEvents] = useState<HackathonEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{ name: string; status: string } | null>(null)

  useEffect(() => {
    supabase.from('events')
      .select('*')
      .in('event_status', ['ongoing', 'registration_closed'])
      .order('start_date_time', { ascending: true })
      .then(({ data }) => data && setEvents(data))
  }, [])

  useEffect(() => {
    if (!selectedEventId) return
    supabase.from('event_registrations')
      .select('*, user:profiles(*), event:events(*)')
      .eq('event_id', selectedEventId)
      .neq('status', 'cancelled')
      .order('registered_at', { ascending: true })
      .then(({ data }) => data && setRegistrations(data as unknown as EventRegistration[]))
  }, [selectedEventId])

  const handleManualCheckIn = async (regId: string, studentName: string) => {
    await supabase.from('event_registrations')
      .update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
      .eq('id', regId)
    setRegistrations(prev => prev.map(r =>
      r.id === regId ? { ...r, status: 'checked_in' as any, checked_in_at: new Date().toISOString() } : r
    ))
    setScanResult({ name: studentName, status: 'checked_in' })
    setTimeout(() => setScanResult(null), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Event Selector */}
      <div className="card">
        <label className="label">Select Active Event</label>
        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="select-field max-w-md">
          <option value="">Choose event...</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Scanner Area */}
      {selectedEventId && (
        <div className="card">
          <h3 className="font-bold text-[#0A192F] mb-3 flex items-center gap-2">
            <Camera size={18} /> QR Scanner
          </h3>
          <div className="bg-gray-900 rounded-xl aspect-video max-w-md mx-auto flex flex-col items-center justify-center text-white relative overflow-hidden">
            {!scanning ? (
              <>
                <QrCode size={48} className="text-gray-400 mb-3" />
                <p className="text-sm text-gray-300">Camera scanner area</p>
                <p className="text-xs text-gray-500 mt-1">(Requires camera permission — uses device camera for QR scanning)</p>
                <button onClick={() => setScanning(true)} className="btn btn-primary btn-sm mt-4">
                  <Camera size={14} /> Start Scanner
                </button>
              </>
            ) : (
              <>
                <div className="absolute inset-0 border-2 border-dashed border-green-400 rounded-xl m-4" />
                <p className="text-green-400 font-mono text-sm animate-pulse">Scanning...</p>
                <button onClick={() => setScanning(false)} className="btn btn-danger btn-sm mt-4">Stop</button>
              </>
            )}
          </div>

          {scanResult && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <CheckCircle2 size={18} className="inline text-green-600 mr-1" />
              <span className="text-sm font-medium text-green-800">
                {scanResult.name} — {scanResult.status}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Registration Roster */}
      {selectedEventId && (
        <div className="card">
          <h3 className="font-bold text-[#0A192F] mb-3">
            Registration Roster ({registrations.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Transport</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map(reg => (
                  <tr key={reg.id}>
                    <td data-label="Student">
                      <span className="font-medium text-sm">{(reg.user as any)?.full_name || 'Unknown'}</span>
                      <span className="block text-xs text-gray-400">{(reg.user as any)?.email}</span>
                    </td>
                    <td data-label="Status"><StatusBadge status={reg.status} /></td>
                    <td data-label="Transport">
                      {reg.transport_seat_confirmed ? `Seat #${reg.bus_seat_number}` : '—'}
                    </td>
                    <td data-label="Action">
                      {reg.status !== 'checked_in' && (
                        <button
                          onClick={() => handleManualCheckIn(reg.id, (reg.user as any)?.full_name || '')}
                          className="btn btn-success btn-sm"
                        >
                          <CheckCircle2 size={12} /> Check In
                        </button>
                      )}
                      {reg.status === 'checked_in' && (
                        <span className="text-xs text-green-600 font-medium inline-flex items-center"><CheckCircle2 size={12} className="inline" /> Checked in</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Equipment Ledger ----

function EquipmentLedger() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [checkouts, setCheckouts] = useState<EquipmentCheckout[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    Promise.all([
      supabase.from('equipment_items').select('*').order('name'),
      supabase.from('equipment_checkouts').select('*, user:profiles(*), equipment:equipment_items(*)').order('checked_out_at', { ascending: false }),
    ]).then(([itemRes, checkoutRes]) => {
      if (itemRes.data) setItems(itemRes.data)
      if (checkoutRes.data) setCheckouts(checkoutRes.data as unknown as EquipmentCheckout[])
    })
  }, [])

  const filteredCheckouts = filter === 'all' ? checkouts : checkouts.filter(c => c.status === filter)

  return (
    <div className="space-y-6">
      {/* Inventory Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Available', count: items.filter(i => i.status === 'available').length, color: 'text-green-600' },
          { label: 'Checked Out', count: items.filter(i => i.status === 'checked_out').length, color: 'text-blue-600' },
          { label: 'Overdue', count: items.filter(i => i.status === 'overdue').length, color: 'text-amber-600' },
          { label: 'Missing', count: items.filter(i => i.status === 'missing').length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'returned', 'overdue', 'lost'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Checkout Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Holder</th>
              <th>Checked Out</th>
              <th>Due Back</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredCheckouts.map(co => (
              <tr key={co.id}>
                <td data-label="Item">{(co.equipment as any)?.name || co.equipment_id}</td>
                <td data-label="Holder">{(co.user as any)?.full_name || co.user_id}</td>
                <td data-label="Checked Out">{new Date(co.checked_out_at).toLocaleDateString()}</td>
                <td data-label="Due Back">{new Date(co.due_back_at).toLocaleDateString()}</td>
                <td data-label="Status">
                  <span className={`badge ${
                    co.status === 'active' ? 'badge-registered' :
                    co.status === 'returned' ? 'badge-approved' :
                    co.status === 'overdue' ? 'badge-waitlisted' : 'badge-cancelled'
                  }`}>
                    {co.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCheckouts.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No checkout records found.</p>
        )}
      </div>
    </div>
  )
}

// ---- Lu.ma Ticket Verifier ----

function LumaVerifier() {
  const [ticketRef, setTicketRef] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string; student?: string } | null>(null)

  const handleVerify = async () => {
    if (!ticketRef.trim()) return
    setVerifying(true)
    // Simulated verification — in production this calls Lu.ma API or checks DB
    await new Promise(r => setTimeout(r, 1200))
    setResult({
      ok: Math.random() > 0.3,
      message: Math.random() > 0.3
        ? `Ticket ${ticketRef} verified — linked to student registration`
        : `Ticket ${ticketRef} not found or already used`,
      student: Math.random() > 0.3 ? 'Sample Student' : undefined,
    })
    setVerifying(false)
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="card">
        <h3 className="font-bold text-[#0A192F] mb-2 flex items-center gap-2">
          <FileText size={18} /> Manual Ticket Verification
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter a Lu.ma ticket reference ID to cross-check against registrations.
          Use this when webhooks are restricted or delayed.
        </p>
        <div className="flex gap-2">
          <input
            value={ticketRef}
            onChange={(e) => setTicketRef(e.target.value)}
            placeholder="e.g., ABC123XYZ"
            className="input-field flex-1"
          />
          <button onClick={handleVerify} disabled={verifying || !ticketRef.trim()} className="btn btn-primary">
            {verifying ? '...' : 'Verify'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`card ${result.ok ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
          <div className="flex items-start gap-2">
            {result.ok ? <CheckCircle2 size={20} className="text-green-600 shrink-0" /> : <XCircle size={20} className="text-red-600 shrink-0" />}
            <div>
              <p className={`font-semibold text-sm ${result.ok ? 'text-green-800' : 'text-red-800'}`}>
                {result.ok ? '✓ Verified' : '✗ Not Found'}
              </p>
              <p className="text-sm mt-1">{result.message}</p>
              {result.student && <p className="text-xs text-gray-500 mt-1">Student: {result.student}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Showcase Review Queue ----

function ShowcaseReview() {
  const [showcases, setShowcases] = useState<PastShowcase[]>([])

  useEffect(() => {
    supabase.from('past_showcases')
      .select('*, event:events(*), team:teams(*)')
      .in('status', ['draft', 'pending_review'])
      .order('created_at', { ascending: false })
      .then(({ data }) => data && setShowcases(data as unknown as PastShowcase[]))
  }, [])

  const handlePublish = async (id: string) => {
    await supabase.from('past_showcases').update({ status: 'published' }).eq('id', id)
    setShowcases(prev => prev.map(s => s.id === id ? { ...s, status: 'published' as const } : s))
  }

  const handleArchive = async (id: string) => {
    await supabase.from('past_showcases').update({ status: 'archived' }).eq('id', id)
    setShowcases(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-4">
      {showcases.length > 0 ? showcases.map(sc => (
        <div key={sc.id} className="card">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1">
              <h4 className="font-bold text-[#0A192F]">{sc.project_title}</h4>
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">{sc.project_description}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={sc.status} />
                {(sc.event as any)?.name && (
                  <span className="text-xs text-gray-400">{(sc.event as any).name}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => handlePublish(sc.id)} className="btn btn-success btn-sm">
                <Eye size={14} /> Publish
              </button>
              <button onClick={() => handleArchive(sc.id)} className="btn btn-danger btn-sm">
                Archive
              </button>
            </div>
          </div>
        </div>
      )) : (
        <div className="card text-center py-12">
          <Eye size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No pending showcase drafts.</p>
        </div>
      )}
    </div>
  )
}

// ---- Registration Manager ----

function RegistrationManager() {
  const [events, setEvents] = useState<HackathonEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    supabase.from('events').select('*').order('start_date_time', { ascending: true }).then(({ data }) => data && setEvents(data))
  }, [])

  useEffect(() => {
    if (!selectedEventId) return
    supabase.from('event_registrations')
      .select('*, user:profiles(*), team:teams(*)')
      .eq('event_id', selectedEventId)
      .order('registered_at', { ascending: true })
      .then(({ data }) => data && setRegistrations(data as unknown as EventRegistration[]))
  }, [selectedEventId])

  const filtered = statusFilter === 'all' ? registrations : registrations.filter(r => r.status === statusFilter)

  const updateStatus = async (regId: string, newStatus: string) => {
    await supabase.from('event_registrations').update({ status: newStatus }).eq('id', regId)
    setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: newStatus as any } : r))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="select-field flex-1">
          <option value="">Select event...</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-field w-40">
          <option value="all">All Statuses</option>
          {['registered', 'waitlisted', 'approved_to_travel', 'checked_in', 'cancelled', 'no_show'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {selectedEventId && (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Team</th>
                <th>Deposit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(reg => (
                <tr key={reg.id}>
                  <td data-label="Student">
                    <span className="font-medium text-sm">{(reg.user as any)?.full_name || '—'}</span>
                    <span className="block text-xs text-gray-400">{(reg.user as any)?.email}</span>
                  </td>
                  <td data-label="Status"><StatusBadge status={reg.status} /></td>
                  <td data-label="Team">{(reg.team as any)?.name || '—'}</td>
                  <td data-label="Deposit">
                    {reg.deposit_paid ? `$${reg.event?.deposit_amount || 20}` : '—'}
                  </td>
                  <td data-label="Actions">
                    <select
                      value=""
                      onChange={(e) => e.target.value && updateStatus(reg.id, e.target.value)}
                      className="select-field text-xs py-1"
                      defaultValue=""
                    >
                      <option value="" disabled>Change...</option>
                      <option value="approved_to_travel">Approve Travel</option>
                      <option value="checked_in">Check In</option>
                      <option value="waitlisted">Waitlist</option>
                      <option value="cancelled">Cancel</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No registrations.</p>}
        </div>
      )}
    </div>
  )
}
