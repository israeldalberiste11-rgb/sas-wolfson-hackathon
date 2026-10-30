import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Save, Upload, CheckCircle2, User, Github, Phone, FileText, Shield } from 'lucide-react'

export default function StudentProfilePage() {
  const { profile, user, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingConsent, setUploadingConsent] = useState(false)

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    student_id: profile?.student_id || '',
    grade_level: profile?.grade_level || 9,
    graduation_year: profile?.graduation_year || new Date().getFullYear() + (profile?.grade_level ? 12 - profile.grade_level : 3),
    technical_skills: (profile?.technical_skills || []).join(', '),
    github_url: profile?.github_url || '',
    shirt_size: profile?.shirt_size || 'M',
    emergency_contact_name: profile?.emergency_contact_name || '',
    emergency_contact_phone: profile?.emergency_contact_phone || '',
    emergency_contact_relation: profile?.emergency_contact_relation || '',
    medical_allergies: profile?.medical_allergies || '',
    medical_notes: profile?.medical_notes || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      await supabase.from('profiles').update({
        full_name: form.full_name,
        student_id: form.student_id,
        grade_level: form.grade_level,
        graduation_year: form.graduation_year,
        technical_skills: form.technical_skills.split(',').map(s => s.trim()).filter(Boolean),
        github_url: form.github_url,
        shirt_size: form.shirt_size,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        emergency_contact_relation: form.emergency_contact_relation,
        medical_allergies: form.medical_allergies,
        medical_notes: form.medical_notes,
      }).eq('auth_id', user.id)
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleConsentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingConsent(true)
    try {
      const ext = file.name.split('.').pop()
      const filePath = `${user.id}/consent.${ext}`
      const { error } = await supabase.storage
        .from('consent-forms')
        .upload(filePath, file, { upsert: true })
      if (!error) {
        await supabase.from('profiles')
          .update({ parent_consent_status: 'pending', parent_consent_file_path: filePath })
          .eq('auth_id', user.id)
        await refreshProfile()
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploadingConsent(false)
    }
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0A192F]">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your information and compliance documents</p>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 flex items-center gap-2">
          <CheckCircle2 size={18} /> Profile saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <section className="card">
            <h2 className="font-bold text-[#0A192F] mb-4 flex items-center gap-2"><User size={18} /> Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input name="full_name" value={form.full_name} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label">Student ID</label>
                <input name="student_id" value={form.student_id} onChange={handleChange} className="input-field" placeholder="e.g., 12345678" />
              </div>
              <div>
                <label className="label">Grade Level</label>
                <select name="grade_level" value={form.grade_level} onChange={handleChange} className="select-field">
                  {[9, 10, 11, 12].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Graduation Year</label>
                <input name="graduation_year" type="number" value={form.graduation_year} onChange={handleChange} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Technical Skills (comma-separated)</label>
                <input name="technical_skills" value={form.technical_skills} onChange={handleChange} className="input-field" placeholder="Python, React, UI/UX, Machine Learning" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">GitHub Profile URL</label>
                <div className="relative">
                  <Github size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input name="github_url" value={form.github_url} onChange={handleChange} className="input-field pl-10" placeholder="https://github.com/username" />
                </div>
              </div>
              <div>
                <label className="label">Shirt Size</label>
                <select name="shirt_size" value={form.shirt_size} onChange={handleChange} className="select-field">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Emergency Contact */}
          <section className="card">
            <h2 className="font-bold text-[#0A192F] mb-4 flex items-center gap-2"><Phone size={18} /> Emergency Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Contact Name</label>
                <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} className="input-field" placeholder="Parent/Guardian name" />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} className="input-field" placeholder="(305) 555-0123" />
              </div>
              <div>
                <label className="label">Relationship</label>
                <input name="emergency_contact_relation" value={form.emergency_contact_relation} onChange={handleChange} className="input-field" placeholder="Parent, Guardian, etc." />
              </div>
            </div>
          </section>

          {/* Medical Info */}
          <section className="card">
            <h2 className="font-bold text-[#0A192F] mb-4 flex items-center gap-2"><Shield size={18} /> Medical Information</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Allergies</label>
                <input name="medical_allergies" value={form.medical_allergies} onChange={handleChange} className="input-field" placeholder="List any known allergies" />
              </div>
              <div>
                <label className="label">Medical Notes</label>
                <textarea name="medical_notes" value={form.medical_notes} onChange={handleChange} className="textarea-field" placeholder="Any medical conditions or medications staff should know about" />
              </div>
            </div>
          </section>

          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-lg w-full sm:w-auto">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Sidebar: Consent & Status */}
        <div className="space-y-6">
          {/* Parent Consent */}
          <section className="card">
            <h2 className="font-bold text-[#0A192F] mb-3 flex items-center gap-2"><FileText size={18} /> Parent Consent</h2>
            <div className={`p-3 rounded-lg mb-3 ${
              profile?.parent_consent_status === 'approved' ? 'bg-green-50' :
              profile?.parent_consent_status === 'pending' ? 'bg-yellow-50' :
              'bg-gray-50'
            }`}>
              <p className="text-sm font-medium">
                Status: <StatusBadge status={(profile?.parent_consent_status as any) || 'not_submitted'} />
              </p>
            </div>
            <label className="btn btn-secondary btn-sm w-full cursor-pointer">
              <Upload size={16} />
              {uploadingConsent ? 'Uploading...' : 'Upload Consent Form (PDF)'}
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleConsentUpload} className="hidden" />
            </label>
            <p className="hint mt-2">MDCPS parent consent form required for off-campus travel.</p>
          </section>

          {/* Account Summary */}
          <section className="card bg-[#0A192F] text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                {profile?.full_name?.charAt(0)}
              </div>
              <div>
                <p className="font-bold">{profile?.full_name}</p>
                <p className="text-xs text-blue-200">{profile?.email}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-200">Role</span>
                <span className="font-semibold capitalize">{profile?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">Grade</span>
                <span className="font-semibold">{profile?.grade_level || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">Member Since</span>
                <span className="font-semibold">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'badge-approved',
    pending: 'badge-waitlisted',
    rejected: 'badge-cancelled',
    not_submitted: 'badge-draft',
  }
  const labels: Record<string, string> = {
    approved: 'Approved',
    pending: 'Pending Review',
    rejected: 'Rejected',
    not_submitted: 'Not Submitted',
  }
  return (
    <span className={`badge ${map[status] || 'badge-draft'}`}>
      {labels[status] || status}
    </span>
  )
}
