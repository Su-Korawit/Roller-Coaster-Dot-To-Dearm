import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOpenHouseUiStore as store } from './useOpenHouseUiStore'

beforeEach(() => { store.getState().reset(); store.getState().setWalker(null) })

describe('useOpenHouseUiStore', () => {
  it('opens a known building and ignores an unknown id', () => {
    store.getState().openBuilding('med')
    expect(store.getState().openBuildingId).toBe('med')
    store.getState().closeBuilding()
    store.getState().openBuilding('nope')
    expect(store.getState().openBuildingId).toBeNull()
  })

  it('tracks the door the player stands at; clearDoor only clears its own door', () => {
    store.getState().setDoor('law')
    store.getState().clearDoor('med')
    expect(store.getState().doorBuildingId).toBe('law')
    store.getState().clearDoor('law')
    expect(store.getState().doorBuildingId).toBeNull()
    store.getState().setDoor('nope')
    expect(store.getState().doorBuildingId).toBeNull()
  })

  it('walking out of a door closes that building popup but not another one', () => {
    store.getState().openBuilding('law')
    store.getState().clearDoor('med')
    expect(store.getState().openBuildingId).toBe('law')
    store.getState().clearDoor('law')
    expect(store.getState().openBuildingId).toBeNull()
  })

  it('opening the directory closes a building and vice versa', () => {
    store.getState().openBuilding('eng')
    store.getState().openDirectory()
    expect(store.getState()).toMatchObject({ directoryOpen: true, openBuildingId: null })
    store.getState().openBuilding('eng')
    expect(store.getState()).toMatchObject({ directoryOpen: false, openBuildingId: 'eng' })
  })

  it('walkTo calls the registered walker and reports whether there was one', () => {
    expect(store.getState().walkTo(3, 4)).toBe(false)
    const walker = vi.fn()
    store.getState().setWalker(walker)
    expect(store.getState().walkTo(3, 4)).toBe(true)
    expect(walker).toHaveBeenCalledWith(3, 4)
    store.getState().setWalker('junk')
    expect(store.getState().walker).toBeNull()
  })
})
