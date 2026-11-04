import { describe, it, expect, beforeEach, vi } from 'vitest'

const auth = vi.hoisted(() => ({ user: { uid: 'u1' } }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: { getState: () => auth } }))

const { buildGuideContext } = await import('./guideContext')
const { useLeavesStore } = await import('../stores/useLeavesStore')
const { useRoomStore } = await import('../stores/useRoomStore')
const { STARTER_ITEMS } = await import('../data/roomCatalogSeed')

beforeEach(() => {
  auth.user = { uid: 'u1' }
  useLeavesStore.getState().reset()
  useRoomStore.getState().reset()
  useLeavesStore.setState({ leaves: 100, inventory: { ...STARTER_ITEMS }, practiceDone: false })
})

describe('buildGuideContext', () => {
  it('a fresh student with the welcome pack: can afford something, owns an unplaced starter plant, no custom room', () => {
    expect(buildGuideContext()).toMatchObject({
      signedIn: true, practiceDone: false, hasPurchased: false, canAffordSomething: true,
      hasUnplacedItem: true, hasCustomRoom: false, places: 2,
    })
  })

  it('a purchase that is not on the floor yet is an unplaced item', () => {
    useLeavesStore.setState({ inventory: { ...STARTER_ITEMS, mug: 1 } })
    expect(buildGuideContext()).toMatchObject({ hasPurchased: true, hasUnplacedItem: true })
  })

  it('placing a new item makes the room custom; once everything owned is placed nothing is left', () => {
    useLeavesStore.setState({ inventory: { ...STARTER_ITEMS, mug: 1 } })
    const layout = useRoomStore.getState().layout
    useRoomStore.getState().setLayout({ ...layout, placed: [...layout.placed, { itemId: 'mug', x: 96, y: 32, slot: 'right' }] })
    expect(buildGuideContext()).toMatchObject({ hasCustomRoom: true, hasUnplacedItem: true })
    const next = useRoomStore.getState().layout
    useRoomStore.getState().setLayout({ ...next, placed: [...next.placed, { itemId: 'plant_small', x: 96, y: 32, slot: 'centre' }] })
    expect(buildGuideContext().hasUnplacedItem).toBe(false)
  })

  it('with no Leaves left nothing is affordable', () => {
    useLeavesStore.setState({ leaves: 0 })
    expect(buildGuideContext().canAffordSomething).toBe(false)
  })

  it('a guest has one place and cannot do the account steps', () => {
    auth.user = null
    expect(buildGuideContext()).toMatchObject({ signedIn: false, places: 1 })
  })

  it('knows the practice gift was taken', () => {
    useLeavesStore.setState({ practiceDone: true })
    expect(buildGuideContext().practiceDone).toBe(true)
  })
})
