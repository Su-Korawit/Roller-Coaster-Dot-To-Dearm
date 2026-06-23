import { describe, it, expect } from 'vitest'
import { getAdminSections, ADMIN_SECTIONS } from './admin'

describe('getAdminSections', () => {
  it('gives the super-admin every section', () => {
    expect(getAdminSections('o.korawitt@gmail.com').sort()).toEqual([...ADMIN_SECTIONS].sort())
  })

  it('scopes each section admin to their single section', () => {
    expect(getAdminSections('takadaoni07@gmail.com')).toEqual(['maps'])
    expect(getAdminSections('play198725@gmail.com')).toEqual(['characters'])
    expect(getAdminSections('itcity9476@gmail.com')).toEqual(['music'])
  })

  it('is case-insensitive on the email', () => {
    expect(getAdminSections('Takadaoni07@Gmail.com')).toEqual(['maps'])
  })

  it('returns [] for unknown emails and falsy input', () => {
    expect(getAdminSections('stranger@gmail.com')).toEqual([])
    expect(getAdminSections('')).toEqual([])
    expect(getAdminSections(null)).toEqual([])
    expect(getAdminSections(undefined)).toEqual([])
  })
})

describe('welcome section access', () => {
  it('includes welcome in ADMIN_SECTIONS', () => {
    expect(ADMIN_SECTIONS).toContain('welcome')
  })
  it('grants the super-admin the welcome section', () => {
    expect(getAdminSections('o.korawitt@gmail.com')).toContain('welcome')
  })
})
