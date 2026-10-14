import { describe, it, expect, vi, beforeEach } from 'vitest'

const setDoc = vi.fn()
vi.mock('firebase/firestore', () => ({ setDoc: (...a) => setDoc(...a), serverTimestamp: () => ({ _ts: true }) }))
vi.mock('../lib/db', () => ({ refs: { user: (u) => `user:${u}` } }))

const { CONSENT_VERSION } = await import('../constants/legal')
const { useConsentStore } = await import('../stores/useConsentStore')
const {
  PENDING_KEY, needsConsent, markConsentPending, hasPendingConsent, clearPendingConsent, recordConsent, resolveConsent,
} = await import('./consent')

const memStorage = () => {
  const d = {}
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v) }, removeItem: (k) => { delete d[k] }, _d: d }
}

beforeEach(() => {
  setDoc.mockReset(); setDoc.mockResolvedValue()
  useConsentStore.getState().reset()
  vi.stubGlobal('sessionStorage', memStorage())
})

describe('needsConsent', () => {
  it('is true with no record, an older version, or a malformed record', () => {
    expect(needsConsent(undefined)).toBe(true)
    expect(needsConsent({})).toBe(true)
    expect(needsConsent({ consent: { version: '2020-01-01' } })).toBe(true)
    expect(needsConsent({ consent: null })).toBe(true)
  })
  it('is false only for the current version', () => {
    expect(needsConsent({ consent: { version: CONSENT_VERSION } })).toBe(false)
  })
})

describe('pending marker', () => {
  it('round-trips, is scoped to the current version, and can be cleared', () => {
    expect(hasPendingConsent()).toBe(false)
    markConsentPending()
    expect(hasPendingConsent()).toBe(true)
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ version: '1999-01-01' }))
    expect(hasPendingConsent()).toBe(false)
    markConsentPending()
    clearPendingConsent()
    expect(hasPendingConsent()).toBe(false)
  })

  it('survives blocked or corrupt storage', () => {
    sessionStorage.setItem(PENDING_KEY, '{not json')
    expect(hasPendingConsent()).toBe(false)
    const hostile = {
      getItem() { throw new Error('blocked') },
      setItem() { throw new Error('blocked') },
      removeItem() { throw new Error('blocked') },
    }
    expect(() => markConsentPending(hostile)).not.toThrow()
    expect(hasPendingConsent(hostile)).toBe(false)
    expect(() => clearPendingConsent(hostile)).not.toThrow()
  })

  it('uses an rc- key so account deletion clears it with the rest', () => {
    expect(PENDING_KEY.startsWith('rc-')).toBe(true)
  })
})

describe('recordConsent', () => {
  it('writes version + server timestamp + the age/guardian confirmation (merged), then marks ok and clears the marker', async () => {
    markConsentPending()
    await recordConsent('u1')
    const [ref, data, opts] = setDoc.mock.calls[0]
    expect(ref).toBe('user:u1')
    expect(opts).toEqual({ merge: true })
    expect(data.consent).toEqual({ version: CONSENT_VERSION, acceptedAt: { _ts: true }, ageOrGuardianConfirmed: true })
    expect(useConsentStore.getState().status).toBe('ok')
    expect(hasPendingConsent()).toBe(false)
  })

  it('a failed write leaves the status and the marker alone so it can be retried', async () => {
    setDoc.mockRejectedValue(new Error('offline'))
    markConsentPending()
    await expect(recordConsent('u1')).rejects.toThrow('offline')
    expect(useConsentStore.getState().status).toBe('unknown')
    expect(hasPendingConsent()).toBe(true)
  })
})

describe('resolveConsent', () => {
  it('current consent on file -> ok, nothing written', async () => {
    expect(await resolveConsent('u1', { consent: { version: CONSENT_VERSION } })).toBe('ok')
    expect(setDoc).not.toHaveBeenCalled()
    expect(useConsentStore.getState().status).toBe('ok')
  })

  it('no record but the sign-in page left a marker (new sign-up) -> recorded silently', async () => {
    markConsentPending()
    expect(await resolveConsent('u1', {})).toBe('recorded')
    expect(setDoc).toHaveBeenCalledTimes(1)
    expect(useConsentStore.getState().status).toBe('ok')
  })

  it('no record and no marker (existing user, or a new version) -> the gate must ask', async () => {
    expect(await resolveConsent('u1', { consent: { version: '2020-01-01' } })).toBe('needed')
    expect(setDoc).not.toHaveBeenCalled()
    expect(useConsentStore.getState().status).toBe('needed')
  })
})
