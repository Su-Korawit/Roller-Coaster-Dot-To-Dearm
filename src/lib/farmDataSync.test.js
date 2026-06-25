import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFarmDataStore } from '../stores/useFarmDataStore'
import { PLANTS } from '../data/PlantData'
import { ITEMS } from '../data/ItemData'
import { SHOPS } from '../data/ShopData'

// Mock Firestore
const mockSetDoc = vi.fn()
const mockGetDocs = vi.fn()
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, name) => ({ _name: name })),
  getDocs: (...a) => mockGetDocs(...a),
  doc: vi.fn((col, id) => ({ _col: col, _id: id })),
  setDoc: (...a) => mockSetDoc(...a),
}))
vi.mock('../firebase.js', () => ({ db: {} }))

function makeSnap(records) {
  return { empty: records.length === 0, docs: records.map(([id, data]) => ({ id, data: () => data })) }
}

beforeEach(() => {
  vi.clearAllMocks()
  useFarmDataStore.setState({ plants: {}, items: {}, shops: {} })
})

describe('hydrateFarmDataFromFirestore', () => {
  it('seeds Firestore from JS defaults when all collections are empty', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([]))
    const { hydrateFarmDataFromFirestore } = await import('./farmDataSync')
    await hydrateFarmDataFromFirestore()
    // setDoc called for each plant, item, shop
    const plantCount = Object.keys(PLANTS).length
    const itemCount = Object.keys(ITEMS).length
    const shopCount = Object.keys(SHOPS).length
    expect(mockSetDoc).toHaveBeenCalledTimes(plantCount + itemCount + shopCount)
    // store populated with JS defaults
    expect(useFarmDataStore.getState().plants).toEqual(PLANTS)
    expect(useFarmDataStore.getState().items).toEqual(ITEMS)
    expect(useFarmDataStore.getState().shops).toEqual(SHOPS)
  })

  it('reads existing Firestore data without seeding when collections are non-empty', async () => {
    const firestorePlant = { id: 'turnip', name: 'หัวผักกาดแก้ไขแล้ว', stages: 4, growTime: [10, 20, 40], size: { w: 1, h: 1 }, yieldMin: 1, yieldMax: 3, spriteFrames: [0, 1, 2, 3] }
    mockGetDocs
      .mockResolvedValueOnce(makeSnap([['turnip', firestorePlant]]))  // farmPlants
      .mockResolvedValueOnce(makeSnap([['turnip_seed', ITEMS.turnip_seed]])) // farmItems
      .mockResolvedValueOnce(makeSnap([['seed_shop', SHOPS.seed_shop]]))      // farmShops
    const { hydrateFarmDataFromFirestore } = await import('./farmDataSync')
    await hydrateFarmDataFromFirestore()
    expect(mockSetDoc).not.toHaveBeenCalled()
    expect(useFarmDataStore.getState().plants.turnip.name).toBe('หัวผักกาดแก้ไขแล้ว')
  })

  it('seeds only the empty collections when some exist', async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeSnap([['turnip', PLANTS.turnip]]))  // farmPlants non-empty
      .mockResolvedValueOnce(makeSnap([]))                           // farmItems empty
      .mockResolvedValueOnce(makeSnap([['seed_shop', SHOPS.seed_shop]])) // farmShops non-empty
    const { hydrateFarmDataFromFirestore } = await import('./farmDataSync')
    await hydrateFarmDataFromFirestore()
    // only ITEMS seeded
    const itemCount = Object.keys(ITEMS).length
    expect(mockSetDoc).toHaveBeenCalledTimes(itemCount)
  })
})
