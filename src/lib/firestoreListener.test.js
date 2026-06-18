import { describe, it, expect, vi, beforeEach } from 'vitest'

const onSnapshot = vi.fn()
vi.mock('firebase/firestore', () => ({
  onSnapshot: (...args) => onSnapshot(...args),
}))

const { createFirestoreListener } = await import('./firestoreListener')

describe('createFirestoreListener', () => {
  beforeEach(() => {
    onSnapshot.mockReset()
  })

  it('attaches via onSnapshot and returns the unsubscribe fn', () => {
    const unsub = vi.fn()
    onSnapshot.mockReturnValue(unsub)
    const listener = createFirestoreListener()
    const handler = () => {}

    const ret = listener.attach('QUERY', handler)

    expect(onSnapshot).toHaveBeenCalledWith('QUERY', handler)
    expect(ret).toBe(unsub)
  })

  it('detaches the previous listener before re-attaching', () => {
    const unsub1 = vi.fn()
    const unsub2 = vi.fn()
    onSnapshot.mockReturnValueOnce(unsub1).mockReturnValueOnce(unsub2)
    const listener = createFirestoreListener()

    listener.attach('Q1', () => {})
    listener.attach('Q2', () => {})

    expect(unsub1).toHaveBeenCalledTimes(1)
    expect(unsub2).not.toHaveBeenCalled()
  })

  it('detach() calls the active unsub once and is idempotent', () => {
    const unsub = vi.fn()
    onSnapshot.mockReturnValue(unsub)
    const listener = createFirestoreListener()
    listener.attach('Q', () => {})

    listener.detach()
    listener.detach()

    expect(unsub).toHaveBeenCalledTimes(1)
  })
})
