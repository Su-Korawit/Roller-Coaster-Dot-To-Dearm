import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSetDoc = vi.fn()
const mockGetDoc = vi.fn()
const mockServerTimestamp = vi.fn(() => ({ _type: 'serverTimestamp' }))

const mockUserRef = vi.fn((uid) => ({ _path: `users/${uid}` }))
const mockProfileFields = vi.fn()
const mockReadProfile = vi.fn()

const mockSelectState = {
  mbti: 'INTJ',
  career: 'engineer',
  mastery: 'mastery-1',
  setMbti: vi.fn(),
  setCareer: vi.fn(),
  setMastery: vi.fn(),
  setUniversity: vi.fn(),
  setProgram: vi.fn(),
}

const mockPlansState = {
  plans: [{ id: 'plan-1', university: 'uni-1', program: 'prog-1', addedAt: 1 }],
  activePlanId: 'plan-1',
  hydrate: vi.fn(),
}

const mockUsePlansStore = {
  getState: vi.fn(() => mockPlansState),
  setState: vi.fn(),
}

vi.mock('firebase/firestore', () => ({
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  serverTimestamp: mockServerTimestamp,
}))

vi.mock('../lib/db', () => ({
  refs: { user: mockUserRef },
  shapes: {
    profileFields: mockProfileFields,
    readProfile: mockReadProfile,
  },
}))

vi.mock('../stores/useSelectStore', () => ({
  useSelectStore: {
    getState: vi.fn(() => mockSelectState),
  },
}))

vi.mock('../stores/usePlansStore', () => ({
  usePlansStore: mockUsePlansStore,
}))

const { syncSelectToFirestore, hydrateSelectStoreFromFirestore } = await import('./syncSelectToFirestore')

describe('syncSelectToFirestore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetDoc.mockResolvedValue(undefined)
    mockUsePlansStore.getState.mockReturnValue(mockPlansState)
    mockProfileFields.mockReturnValue({ mbti: 'INTJ', plans: mockPlansState.plans, activePlanId: 'plan-1' })
  })

  it('rethrows when setDoc fails', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('network down'))
    await expect(syncSelectToFirestore('uid-1')).rejects.toThrow('network down')
  })

  it('writes profile from select + plans stores', async () => {
    await syncSelectToFirestore('uid-1')

    expect(mockProfileFields).toHaveBeenCalledWith({
      mbti: 'INTJ',
      career: 'engineer',
      mastery: 'mastery-1',
      plans: mockPlansState.plans,
      activePlanId: 'plan-1',
    })
    expect(mockSetDoc).toHaveBeenCalledWith(
      { _path: 'users/uid-1' },
      {
        profile: {
          mbti: 'INTJ',
          plans: mockPlansState.plans,
          activePlanId: 'plan-1',
          updatedAt: { _type: 'serverTimestamp' },
        },
      },
      { merge: true },
    )
  })
})

describe('hydrateSelectStoreFromFirestore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePlansStore.getState.mockReturnValue(mockPlansState)
  })

  it('hydrates select store and seeds plans store from readProfile', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ profile: { mbti: 'ISTP' } }),
    })
    mockReadProfile.mockReturnValue({
      mbti: 'ISTP',
      career: 'designer',
      masteryTrack: 'mastery-2',
      university: 'uni-2',
      program: 'prog-2',
      plans: [{ id: 'plan-2', university: 'uni-2', program: 'prog-2', addedAt: 2 }],
      activePlanId: 'plan-2',
    })

    await hydrateSelectStoreFromFirestore('uid-2')

    // the store upgrades old entries itself (usePlansStore.hydrate)
    expect(mockPlansState.hydrate).toHaveBeenCalledWith({
      plans: [{ id: 'plan-2', university: 'uni-2', program: 'prog-2', addedAt: 2 }],
      activePlanId: 'plan-2',
      goalHours: undefined,
    })
    expect(mockSelectState.setMbti).toHaveBeenCalledWith('ISTP')
    expect(mockSelectState.setCareer).toHaveBeenCalledWith('designer')
    expect(mockSelectState.setMastery).toHaveBeenCalledWith('mastery-2')
    expect(mockSelectState.setUniversity).toHaveBeenCalledWith('uni-2')
    expect(mockSelectState.setProgram).toHaveBeenCalledWith('prog-2')
  })
})
