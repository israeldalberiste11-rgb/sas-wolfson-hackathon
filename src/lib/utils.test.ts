import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getTimeLeft,
  formatCurrency,
  isValidDevpostUrl,
  isValidLumaRef,
  generateQRPassData,
  isRegistrationOpen,
  calculateChaperoneNeed,
  getFirstName,
  getLastName,
} from './utils'

describe('utils', () => {
  describe('getFirstName / getLastName', () => {
    it('splits a full name into first and last', () => {
      expect(getFirstName('Alex Rodriguez')).toBe('Alex')
      expect(getLastName('Alex Rodriguez')).toBe('Rodriguez')
    })

    it('handles multiple last names', () => {
      expect(getFirstName('Dr. Meera Patel')).toBe('Dr.')
      expect(getLastName('Dr. Meera Patel')).toBe('Meera Patel')
    })

    it('handles single names', () => {
      expect(getFirstName('Sam')).toBe('Sam')
      expect(getLastName('Sam')).toBe('')
    })

    it('handles empty input', () => {
      expect(getFirstName('')).toBe('')
      expect(getLastName('')).toBe('')
    })
  })

  describe('formatCurrency', () => {
    it('formats USD values', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(0)).toBe('$0.00')
      expect(formatCurrency(-850)).toBe('-$850.00')
    })
  })

  describe('isValidDevpostUrl', () => {
    it('accepts devpost.com and subdomains', () => {
      expect(isValidDevpostUrl('https://devpost.com/software/xyz')).toBe(true)
      expect(isValidDevpostUrl('https://shellhacks2025.devpost.com/')).toBe(true)
    })

    it('rejects non-Devpost URLs', () => {
      expect(isValidDevpostUrl('https://github.com/project')).toBe(false)
      expect(isValidDevpostUrl('not-a-url')).toBe(false)
      expect(isValidDevpostUrl('')).toBe(false)
    })
  })

  describe('isValidLumaRef', () => {
    it('accepts alphanumeric references 6-20 chars', () => {
      expect(isValidLumaRef('ABC123XYZ')).toBe(true)
      expect(isValidLumaRef('abc-def_123')).toBe(true)
    })

    it('rejects invalid refs', () => {
      expect(isValidLumaRef('short')).toBe(false)
      expect(isValidLumaRef('too-long-ref-123456789012345')).toBe(false)
      expect(isValidLumaRef('has spaces')).toBe(false)
    })
  })

  describe('generateQRPassData', () => {
    it('generates a base64 JSON payload', () => {
      const data = generateQRPassData('user-1', 'event-1', 'Alex Rodriguez')
      const parsed = JSON.parse(atob(data))
      expect(parsed.type).toBe('sas-hackathon-pass')
      expect(parsed.uid).toBe('user-1')
      expect(parsed.eid).toBe('event-1')
      expect(parsed.n).toBe('Alex Rodriguez')
      expect(parsed.ts).toBeDefined()
    })
  })

  describe('isRegistrationOpen', () => {
    it('returns true when inside registration window', () => {
      const now = new Date()
      const opens = new Date(now.getTime() - 1000).toISOString()
      const closes = new Date(now.getTime() + 1000).toISOString()
      expect(isRegistrationOpen({ registration_opens_at: opens, registration_closes_at: closes })).toBe(true)
    })

    it('returns false outside registration window', () => {
      const now = new Date()
      const opens = new Date(now.getTime() + 1000).toISOString()
      const closes = new Date(now.getTime() + 2000).toISOString()
      expect(isRegistrationOpen({ registration_opens_at: opens, registration_closes_at: closes })).toBe(false)
    })
  })

  describe('calculateChaperoneNeed', () => {
    it('calculates 1 chaperone per 10 students', () => {
      expect(calculateChaperoneNeed(10, 1)).toEqual({ needed: 1, assigned: 1, ok: true, shortfall: 0 })
      expect(calculateChaperoneNeed(11, 1)).toEqual({ needed: 2, assigned: 1, ok: false, shortfall: 1 })
    })

    it('respects custom ratio', () => {
      expect(calculateChaperoneNeed(20, 2, 5)).toEqual({ needed: 4, assigned: 2, ok: false, shortfall: 2 })
    })
  })

  describe('getTimeLeft', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns remaining time for future date', () => {
      const result = getTimeLeft('2026-01-02T00:00:00Z')
      expect(result.isPast).toBe(false)
      expect(result.days).toBe(1)
      expect(result.totalSeconds).toBe(86400)
    })

    it('returns zero for past date', () => {
      const result = getTimeLeft('2025-12-31T00:00:00Z')
      expect(result.isPast).toBe(true)
      expect(result.totalSeconds).toBe(0)
    })
  })
})
