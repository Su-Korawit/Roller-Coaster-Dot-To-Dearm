import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  call: vi.fn(),
  callableName: null,
}))

vi.mock('firebase/firestore', () => ({
  doc: () => ({ id: 'new-draft-id' }),
  setDoc: (...a) => m.setDoc(...a),
  updateDoc: (...a) => m.updateDoc(...a),
  deleteDoc: (...a) => m.deleteDoc(...a),
  serverTimestamp: () => 'SERVER_TS',
}))
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_fns, name) => (data) => {
    m.callableName = name
    return m.call(name, data)
  },
}))
vi.mock('../lib/db', () => ({
  cols: { articleDrafts: {} },
  refs: { articleDraft: (id) => ({ path: `articleDrafts/${id}` }) },
}))

const svc = await import('./articles')
const { parseBody } = await import('../content/renderBody')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createDraft', () => {
  it('writes an empty draft owned by the caller and returns its id', async () => {
    const id = await svc.createDraft('alice', 'Alice')
    expect(id).toBe('new-draft-id')
    const [, data] = m.setDoc.mock.calls[0]
    expect(data).toMatchObject({
      authorUid: 'alice',
      authorName: 'Alice',
      title: '',
      slug: '',
      tags: [],
      createdAt: 'SERVER_TS',
      updatedAt: 'SERVER_TS',
    })
    expect(parseBody(data.body).type).toBe('doc')
  })

  it('never sends server-owned fields', async () => {
    await svc.createDraft('alice', 'Alice')
    const [, data] = m.setDoc.mock.calls[0]
    for (const k of ['publishedSlug', 'publishedAt', 'isLive', 'liveUpdatedAt']) expect(data).not.toHaveProperty(k)
  })
})

describe('saveDraft', () => {
  it('sends the patch with a fresh updatedAt', async () => {
    await svc.saveDraft('d1', { title: 'ใหม่' })
    expect(m.updateDoc).toHaveBeenCalledWith({ path: 'articleDrafts/d1' }, { title: 'ใหม่', updatedAt: 'SERVER_TS' })
  })

  it('strips owner and server-owned fields so the rules never reject an autosave', async () => {
    await svc.saveDraft('d1', { title: 'x', authorUid: 'bob', publishedSlug: 's', publishedAt: 1, isLive: true, liveUpdatedAt: 2 })
    const [, data] = m.updateDoc.mock.calls[0]
    expect(Object.keys(data).sort()).toEqual(['title', 'updatedAt'])
  })
})

describe('publishArticle / unpublishArticle', () => {
  it('publishes through the callable and returns the slug', async () => {
    m.call.mockResolvedValue({ data: { ok: true, slug: 'medicine-all' } })
    await expect(svc.publishArticle('d1')).resolves.toEqual({ ok: true, slug: 'medicine-all' })
    expect(m.call).toHaveBeenCalledWith('publishArticle', { draftId: 'd1' })
  })

  it('turns validation failures into a PublishError carrying the field errors', async () => {
    const err = Object.assign(new Error('bad'), {
      code: 'functions/failed-precondition',
      details: { errors: [{ field: 'excerpt', code: 'required' }] },
    })
    m.call.mockRejectedValue(err)
    const caught = await svc.publishArticle('d1').catch((e) => e)
    expect(caught).toBeInstanceOf(svc.PublishError)
    expect(caught.errors).toEqual([{ field: 'excerpt', code: 'required' }])
  })

  it('passes other failures through unchanged', async () => {
    const err = Object.assign(new Error('taken'), { code: 'functions/already-exists' })
    m.call.mockRejectedValue(err)
    await expect(svc.publishArticle('d1')).rejects.toBe(err)
  })

  it('unpublishes by slug', async () => {
    m.call.mockResolvedValue({ data: { ok: true } })
    await svc.unpublishArticle('medicine-all')
    expect(m.call).toHaveBeenCalledWith('unpublishArticle', { slug: 'medicine-all' })
  })
})

describe('deleteDraft', () => {
  it('deletes the draft document', async () => {
    await svc.deleteDraft('d1')
    expect(m.deleteDoc).toHaveBeenCalledWith({ path: 'articleDrafts/d1' })
  })
})
