import { describe, it, expect } from 'vitest'
import { validateRequest, cleanRequest, tallyVotes, rankRequests, voteId, MAX_TITLE, MAX_REASON } from './requestsLogic'

describe('validateRequest', () => {
  const ok = { kind: 'app', title: 'แอปจดโน้ต', url: '', reason: '' }
  it('accepts a minimal app request', () => expect(validateRequest(ok)).toBeNull())
  it('needs a kind and a 3+ character title', () => {
    expect(validateRequest({ ...ok, kind: 'x' })).toMatch(/ประเภท/)
    expect(validateRequest({ ...ok, title: ' ab ' })).toMatch(/3/)
    expect(validateRequest({ ...ok, title: 'x'.repeat(MAX_TITLE + 1) })).toMatch(/ยาวเกิน/)
  })
  it('a website request needs an http(s) link; an app link is optional but must be valid', () => {
    expect(validateRequest({ kind: 'website', title: 'เว็บใหม่' })).toMatch(/ลิงก์/)
    expect(validateRequest({ kind: 'website', title: 'เว็บใหม่', url: 'example.com' })).toMatch(/http/)
    expect(validateRequest({ kind: 'website', title: 'เว็บใหม่', url: 'https://example.com/a' })).toBeNull()
    expect(validateRequest({ ...ok, url: 'ftp://x.y' })).toMatch(/http/)
  })
  it('limits the reason', () => expect(validateRequest({ ...ok, reason: 'x'.repeat(MAX_REASON + 1) })).toMatch(/ยาวเกิน/))
  it('cleanRequest trims', () => expect(cleanRequest({ kind: 'app', title: '  ชื่อ  ', url: ' ', reason: ' r ' })).toEqual({ kind: 'app', title: 'ชื่อ', url: '', reason: 'r' }))
})

describe('votes and ranking', () => {
  const votes = [{ requestId: 'a', uid: 'u1' }, { requestId: 'a', uid: 'u2' }, { requestId: 'b', uid: 'u1' }]
  it('tallies per request and finds my votes', () => {
    const { counts, mine } = tallyVotes(votes, 'u1')
    expect(counts.get('a')).toBe(2)
    expect(counts.get('b')).toBe(1)
    expect([...mine].sort()).toEqual(['a', 'b'])
    expect(voteId('a', 'u1')).toBe('a_u1')
  })
  it('ranks by votes, then newest first; unsent (no server time yet) counts as newest', () => {
    const t = (n) => ({ toMillis: () => n })
    const reqs = [{ id: 'old', createdAt: t(1) }, { id: 'new', createdAt: t(9) }, { id: 'fresh' }, { id: 'popular', createdAt: t(2) }]
    const counts = new Map([['popular', 3]])
    expect(rankRequests(reqs, counts).map((r) => r.id)).toEqual(['popular', 'fresh', 'new', 'old'])
  })
})
