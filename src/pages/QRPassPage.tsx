import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generateQRPassData } from '../lib/utils'
import { cacheQRPass, getCachedQRPass } from '../lib/offline-store'
import type { EventRegistration } from '../types'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Download, Wifi, WifiOff } from 'lucide-react'

export default function QRPassPage() {
  const { profile } = useAuth()
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Network status listener
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    async function load() {
      if (!profile) return

      // Try offline cache first if no network
      if (!navigator.onLine) {
        const cached = await getCachedQRPass(profile.id)
        if (cached) {
          setRegistrations([{
            id: cached.eventId,
            event_id: cached.eventId,
            user_id: cached.userId,
            status: 'registered' as any,
            registered_at: new Date(cached.cachedAt).toISOString(),
            excuse_deadline: '',
            deposit_paid: true,
            deposit_refunded: false,
            excused: false,
            transport_requested: true,
            transport_seat_confirmed: true,
            luma_synced: false,
            reimbursement_status: 'none',
            event: {
              id: cached.eventId,
              name: cached.eventName,
              slug: '',
              description: '',
              event_status: 'upcoming' as any,
              start_date_time: '',
              end_date_time: '',
              registration_opens_at: '',
              registration_closes_at: '',
              venue_name: '',
              venue_address: '',
              city: '',
              is_virtual: false,
              transport_provided: true,
              bus_capacity: 40,
              max_team_size: 4,
              eligibility_rules: '',
              requires_parent_consent: true,
              requires_gpa_clearance: true,
              stipend_cap_per_student: 500,
              deposit_amount: 20,
              chaperone_ratio: 10,
              created_by: '',
              created_at: '',
              updated_at: '',
            },
          }])
        }
        setLoading(false)
        return
      }

      // Load from Supabase
      const { data } = await supabase
        .from('event_registrations')
        .select('*, event:events(*)')
        .eq('user_id', profile.id)
        .in('status', ['registered', 'approved_to_travel'])
        .order('registered_at', { ascending: false })

      if (data) setRegistrations(data as unknown as EventRegistration[])

      // Cache for offline access
      for (const reg of data || []) {
        const r = reg as unknown as EventRegistration
        if (r.event) {
          await cacheQRPass({
            userId: profile.id,
            eventId: r.event_id,
            qrData: generateQRPassData(profile.id, r.event_id, profile.full_name || ''),
            userName: profile.full_name || '',
            eventName: r.event.name,
            cachedAt: Date.now(),
          })
        }
      }
      setLoading(false)
    }

    load()
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [profile])

  const selectedReg = registrations.find(r => r.event_id === selectedEventId) || registrations[0]
  const qrData = selectedReg ? generateQRPassData(profile?.id || '', selectedReg.event_id, profile?.full_name || '') : ''

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A192F]">Event Pass</h1>
          <p className="text-sm text-gray-500 mt-1">Your QR code for on-site check-in</p>
        </div>
        <div className="flex items-center gap-1">
          {isOnline ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-red-500" />}
          <span className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Event Selector */}
      {registrations.length > 1 && (
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="select-field mb-6 max-w-md"
        >
          <option value="">Select an event...</option>
          {registrations.map(reg => (
            <option key={reg.id} value={reg.event_id}>{reg.event?.name}</option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="skeleton w-full max-w-sm h-80 rounded-xl mx-auto" />
      ) : selectedReg ? (
        <div className="max-w-sm mx-auto">
          {/* QR Code Card */}
          <div className="card text-center">
            <div className="qr-container mx-auto mb-4 inline-block">
              <QRCodeSVG
                value={qrData}
                size={220}
                level="H"
                includeMargin
                bgColor="#FFFFFF"
                fgColor="#0A192F"
              />
            </div>

            <h2 className="font-bold text-lg text-[#0A192F]">{profile?.full_name}</h2>
            <p className="text-sm text-gray-600">{selectedReg.event?.name}</p>
            <p className="text-xs text-gray-400 mt-1">{selectedReg.event?.venue_name}</p>

            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className="font-medium capitalize text-green-700">{selectedReg.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Seat</span>
                <span className="font-medium">
                  {selectedReg.transport_seat_confirmed ? `#${selectedReg.bus_seat_number}` : 'TBD'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Deposit</span>
                <span className="font-medium">
                  {selectedReg.deposit_paid ? `Paid ($${selectedReg.event?.deposit_amount || 20})` : 'Pending'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const svg = document.querySelector('.qr-container svg')
                if (svg) {
                  const data = new XMLSerializer().serializeToString(svg)
                  const blob = new Blob([data], { type: 'image/svg+xml' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `sas-pass-${selectedReg.event?.slug || 'event'}.svg`
                  a.click()
                  URL.revokeObjectURL(url)
                }
              }}
              className="btn btn-secondary btn-sm w-full mt-4"
            >
              <Download size={16} /> Download Pass
            </button>
          </div>

          <p className="text-xs text-center text-gray-400 mt-4">
            Show this QR code at check-in. It works offline too — it's saved on your device.
          </p>
        </div>
      ) : (
        <div className="card text-center py-12 max-w-md mx-auto">
          <QrCode size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No active event passes.</p>
          <p className="text-xs text-gray-400 mt-1">Register for an upcoming event to generate your pass.</p>
        </div>
      )}
    </div>
  )
}
