import { describe, it, expect, vi, beforeEach } from 'vitest'

const addDoc = vi.fn()
vi.mock('firebase/firestore', () => ({
  addDoc: (...a) => addDoc(...a),
  deleteDoc: vi.fn(),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
}))
vi.mock('../lib/db', () => ({ cols: { tcasEvents: { _col: 'tcasEvents' } }, refs: { tcasEvent: (id) => ({ id }) }, queries: { tcasEventsByDate: () => ({}) } }))
vi.mock('../lib/firestoreListener', () => ({ createFirestoreListener: () => ({ attach: () => () => {} }) }))

const { useTcasEventsStore } = await import('./useTcasEventsStore')

const base = { title: 'สอบ A-Level', description: 'รายละเอียด', date: '2027-03-13', link: '' }
const sent = () => addDoc.mock.calls.at(-1)[1]

describe('addEvent plan fields', () => {
  beforeEach(() => addDoc.mockReset())

  it('stores round, kind and exam keys when they are valid', async () => {
    await useTcasEventsStore.getState().addEvent({ ...base, round: 3, kind: 'exam', examKeys: ['a_lv_64', 'tpat1'] })
    expect(sent()).toMatchObject({ title: 'สอบ A-Level', round: 3, kind: 'exam', examKeys: ['a_lv_64', 'tpat1'] })
  })

  it('accepts a round typed as a string from the form and exam keys as a comma list', async () => {
    await useTcasEventsStore.getState().addEvent({ ...base, round: '2', kind: 'apply', examKeys: ' a_lv_64 , tgat ,, ' })
    expect(sent()).toMatchObject({ round: 2, kind: 'apply', examKeys: ['a_lv_64', 'tgat'] })
  })

  it('drops anything invalid instead of storing it', async () => {
    await useTcasEventsStore.getState().addEvent({ ...base, round: 9, kind: 'party', examKeys: ['gpax', '__proto__', 'a/b', 5] })
    const doc = sent()
    expect(doc.round).toBeUndefined()
    expect(doc.kind).toBeUndefined()
    expect(doc.examKeys).toBeUndefined()
    expect(doc.title).toBe('สอบ A-Level')
  })

  it('an event with none of the new fields is stored exactly as before', async () => {
    await useTcasEventsStore.getState().addEvent(base)
    expect(Object.keys(sent()).sort()).toEqual(['createdAt', 'date', 'description', 'link', 'title'])
  })
})
