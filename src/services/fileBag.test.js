import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  doc: vi.fn(() => ({ id: 'new-item' })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
}))
vi.mock('../lib/db', () => ({
  refs: {},
  cols: { fileBagItems: 'fileBagItems', fileBagFolders: 'fileBagFolders' },
  queries: {},
  shapes: {
    fileBagItem: (p) => ({ ...p, createdAt: { _type: 'serverTimestamp' } }),
    fileBagFolder: (p) => p,
  },
}))
vi.mock('../utils/storageOps', () => ({
  uploadAsset: vi.fn().mockResolvedValue('https://example.com/f'),
  deleteFile: vi.fn(),
}))
vi.mock('../stores/useEntitlementsStore', () => ({
  useEntitlementsStore: { getState: () => ({ extraStorageBytes: () => 0 }) },
}))

const { httpsCallable } = await import('firebase/functions')
const { uploadToBag, resolveBagQuotaBytes } = await import('./fileBag')
const { FREE_BAG_BYTES, ADMIN_BAG_BYTES } = await import('../constants/entitlements')

describe('fileBag upload flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls reserveBagUpload then uploads on success', async () => {
    httpsCallable.mockReturnValue(vi.fn().mockResolvedValue({ data: { ok: true } }))
    const file = new File(['hi'], 'hi.txt', { type: 'text/plain' })
    await uploadToBag({ uid: 'u1', file, source: 'bag-upload' })
    expect(httpsCallable).toHaveBeenCalled()
  })

  it('surfaces BAG_QUOTA_EXCEEDED when reserve fails', async () => {
    const err = new Error('BAG_QUOTA_EXCEEDED')
    err.code = 'functions/resource-exhausted'
    httpsCallable.mockReturnValue(vi.fn().mockRejectedValue(err))
    const file = new File(['hi'], 'hi.txt', { type: 'text/plain' })
    await expect(uploadToBag({ uid: 'u1', file })).rejects.toMatchObject({ code: 'BAG_QUOTA_EXCEEDED' })
  })

  it('resolveBagQuotaBytes gives admins 1TB', () => {
    expect(resolveBagQuotaBytes({ email: 'o.korawitt@gmail.com' })).toBe(ADMIN_BAG_BYTES)
    expect(resolveBagQuotaBytes({ email: 'student@example.com', extraStorageBytes: 0 })).toBe(FREE_BAG_BYTES)
  })
})
