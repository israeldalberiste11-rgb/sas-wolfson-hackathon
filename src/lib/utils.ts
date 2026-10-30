import { differenceInSeconds, intervalToDuration, format } from 'date-fns'

export interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isPast: boolean
}

/**
 * Calculate time remaining from now to a target date.
 * Returns zeroed values if target is in the past.
 */
export function getTimeLeft(targetDate: string | Date): TimeLeft {
  const target = new Date(targetDate)
  const now = new Date()
  const totalSeconds = differenceInSeconds(target, now)

  if (totalSeconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isPast: true }
  }

  const duration = intervalToDuration({ start: now, end: target })
  return {
    days: duration.days || 0,
    hours: duration.hours || 0,
    minutes: duration.minutes || 0,
    seconds: duration.seconds || 0,
    totalSeconds,
    isPast: false,
  }
}

/**
 * Format a date for display.
 */
export function formatDate(dateStr: string, fmt = 'MMM d, yyyy h:mm a'): string {
  return format(new Date(dateStr), fmt)
}

/**
 * Format currency.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

/**
 * Validate Devpost URL structure.
 */
export function isValidDevpostUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'devpost.com' || parsed.hostname.endsWith('.devpost.com')
  } catch {
    return false
  }
}

/**
 * Validate Lu.ma ticket reference format (basic check).
 */
export function isValidLumaRef(ref: string): boolean {
  // Lu.ma tickets are typically alphanumeric strings of 6-20 chars
  return /^[A-Za-z0-9_-]{6,20}$/.test(ref)
}

/**
 * Generate QR data payload for a student's event pass.
 */
export function generateQRPassData(userId: string, eventId: string, userName: string): string {
  const payload = {
    type: 'sas-hackathon-pass',
    v: 1,
    uid: userId,
    eid: eventId,
    n: userName,
    ts: new Date().toISOString(),
  }
  return btoa(JSON.stringify(payload))
}

/**
 * Check if registration is still open.
 */
export function isRegistrationOpen(event: { registration_opens_at: string; registration_closes_at: string }): boolean {
  const now = new Date()
  return now >= new Date(event.registration_opens_at) && now <= new Date(event.registration_closes_at)
}

/**
 * Calculate chaperone requirement: returns { needed, assigned, ok }
 */
export function calculateChaperoneNeed(
  approvedStudentCount: number,
  assignedChaperoneCount: number,
  ratio: number = 10
): { needed: number; assigned: number; ok: boolean; shortfall: number } {
  const needed = Math.ceil(approvedStudentCount / ratio)
  const shortfall = Math.max(0, needed - assignedChaperoneCount)
  return { needed, assigned: assignedChaperoneCount, ok: assignedChaperoneCount >= needed, shortfall }
}
