// Guards against drift between ADMIN_ROLES (the app's role model) and the email
// literals hard-coded in firestore.rules + storage.rules. Pure test, no emulator:
// runs in the default `npm test` suite. See ADMIN_ROLES in ./admin.js — the rules
// gate section-admin writes by token email, and this asserts both stay in sync.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ADMIN_ROLES, ADMIN_EMAIL } from './admin'

const firestoreRules = readFileSync('firestore.rules', 'utf8')
const storageRules = readFileSync('storage.rules', 'utf8')

// Section admins are email-gated in the rules; the super-admin is UID-gated, so
// exclude their email from the email-literal comparisons.
const sectionAdminEmails = Object.keys(ADMIN_ROLES).filter((e) => e !== ADMIN_EMAIL)
const emailsForSection = (section) =>
  sectionAdminEmails.filter((e) => ADMIN_ROLES[e].includes(section)).sort()

// Every single-quoted email literal in a chunk of rules text.
const extractEmails = (text) =>
  [...text.matchAll(/'([^'@\s]+@[^'\s]+)'/g)].map((m) => m[1]).sort()

// Body of a named rules function: function name() { ... }
function fnBody(text, name) {
  const m = text.match(new RegExp(`function ${name}\\(\\)\\s*{([\\s\\S]*?)}`))
  if (!m) throw new Error(`function ${name}() not found in rules`)
  return m[1]
}

// The `allow write` condition of a storage match block for an inline-gated prefix.
function writeCond(text, matchPath) {
  const m = text.match(new RegExp(`match ${matchPath}[\\s\\S]*?allow write: if ([^\\n]+)`))
  if (!m) throw new Error(`write rule for ${matchPath} not found in storage.rules`)
  return m[1]
}

describe('ADMIN_ROLES ↔ rules email sync', () => {
  it('firestore canEditMaps() lists exactly the maps-section admins', () => {
    expect(extractEmails(fnBody(firestoreRules, 'canEditMaps'))).toEqual(emailsForSection('maps'))
  })

  it('firestore canEditMusic() lists exactly the music-section admins', () => {
    expect(extractEmails(fnBody(firestoreRules, 'canEditMusic'))).toEqual(emailsForSection('music'))
  })

  it('firestore canEditShop() lists no section-admin emails (super-admin only)', () => {
    expect(extractEmails(fnBody(firestoreRules, 'canEditShop'))).toEqual(emailsForSection('shop'))
  })

  it('firestore isAnyAdmin() lists every ADMIN_ROLES email exactly once', () => {
    const body = fnBody(firestoreRules, 'isAnyAdmin')
    const emails = extractEmails(body)
    expect([...new Set(emails)].sort()).toEqual(Object.keys(ADMIN_ROLES).sort())
  })

  it('storage canEditMaps() lists exactly the maps-section admins', () => {
    expect(extractEmails(fnBody(storageRules, 'canEditMaps'))).toEqual(emailsForSection('maps'))
  })

  it('storage sprites/characters write lists exactly the characters-section admins', () => {
    expect(extractEmails(writeCond(storageRules, '/sprites/characters/'))).toEqual(
      emailsForSection('characters'),
    )
  })

  it('storage media/ write lists exactly the music-section admins', () => {
    expect(extractEmails(writeCond(storageRules, '/media/'))).toEqual(emailsForSection('music'))
  })

  it('no unknown email appears in either rules file', () => {
    const known = new Set(Object.keys(ADMIN_ROLES))
    for (const e of [...extractEmails(firestoreRules), ...extractEmails(storageRules)]) {
      expect(known.has(e), `${e} is in the rules but not ADMIN_ROLES`).toBe(true)
    }
  })

  it('every section-admin email appears in at least one rules file', () => {
    const inRules = new Set([...extractEmails(firestoreRules), ...extractEmails(storageRules)])
    for (const e of sectionAdminEmails) {
      expect(inRules.has(e), `${e} is in ADMIN_ROLES but no rules file`).toBe(true)
    }
  })
})
