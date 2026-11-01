import { describe, it, expect } from 'vitest'
import { isAllowedStudentDomain, isAllowedStaffDomain } from './supabase'
import { getFirstName, getLastName } from './utils'

describe('domain validation', () => {
  it('accepts valid student domain', () => {
    expect(isAllowedStudentDomain('alex@students.dadeschools.net')).toBe(true)
    expect(isAllowedStudentDomain('ALEX@STUDENTS.DADESCHOOLS.NET')).toBe(true)
  })

  it('rejects staff domain as student', () => {
    expect(isAllowedStudentDomain('teacher@dadeschools.net')).toBe(false)
    expect(isAllowedStudentDomain('alex@gmail.com')).toBe(false)
  })

  it('accepts valid staff domain', () => {
    expect(isAllowedStaffDomain('teacher@dadeschools.net')).toBe(true)
  })

  it('rejects student domain as staff', () => {
    expect(isAllowedStaffDomain('alex@students.dadeschools.net')).toBe(false)
    expect(isAllowedStaffDomain('teacher@gmail.com')).toBe(false)
  })
})

describe('privacy-safe display helpers', () => {
  it('exposes only first name for public display', () => {
    const fullName = 'Alex Rodriguez'
    expect(getFirstName(fullName)).toBe('Alex')
    expect(getLastName(fullName)).toBe('Rodriguez')
  })

  it('handles names with titles', () => {
    expect(getFirstName('Dr. Meera Patel')).toBe('Dr.')
    expect(getLastName('Dr. Meera Patel')).toBe('Meera Patel')
  })
})
