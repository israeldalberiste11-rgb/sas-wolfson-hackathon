import type { RegistrationStatus, ShowcaseStatus, EventStatus } from '../types'

const statusStyles: Record<string, string> = {
  registered: 'badge-registered',
  waitlisted: 'badge-waitlisted',
  approved_to_travel: 'badge-approved',
  checked_in: 'badge-checked-in',
  cancelled: 'badge-cancelled',
  no_show: 'badge-cancelled',
  draft: 'badge-draft',
  pending_review: 'badge-waitlisted',
  published: 'badge-published',
  archived: 'badge-registered',
  upcoming: 'badge-registered',
  registration_open: 'badge-approved',
  registration_closed: 'badge-waitlisted',
  ongoing: 'badge-checked-in',
  completed: 'badge-registered',
}

const statusLabels: Record<string, string> = {
  registered: 'Registered',
  waitlisted: 'Waitlisted',
  approved_to_travel: 'Approved to Travel',
  checked_in: 'Checked In',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  archived: 'Archived',
  upcoming: 'Upcoming',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  ongoing: 'Ongoing',
  completed: 'Completed',
}

interface StatusBadgeProps {
  status: RegistrationStatus | ShowcaseStatus | EventStatus
  className?: string
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = statusStyles[status] || 'badge-registered'
  const label = statusLabels[status] || status

  return (
    <span className={`badge ${style} ${className}`}>
      {label}
    </span>
  )
}
