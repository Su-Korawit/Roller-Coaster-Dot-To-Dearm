import { describe, it, expect, beforeEach } from 'vitest'
import { usePopupStore } from './usePopupStore'

describe('usePopupStore', () => {
  beforeEach(() => usePopupStore.getState().close())

  it('opens a popup by id', () => {
    usePopupStore.getState().open('calendar')
    expect(usePopupStore.getState().activePopup).toBe('calendar')
  })

  it('opening a second popup replaces the first (no stacking)', () => {
    usePopupStore.getState().open('calendar')
    usePopupStore.getState().open('mastery')
    expect(usePopupStore.getState().activePopup).toBe('mastery')
  })

  it('close() clears the active popup', () => {
    usePopupStore.getState().open('settings')
    usePopupStore.getState().close()
    expect(usePopupStore.getState().activePopup).toBeNull()
  })

  it('carries an optional payload', () => {
    usePopupStore.getState().open('userProfile', { uid: 'u9' })
    expect(usePopupStore.getState().payload).toEqual({ uid: 'u9' })
  })
})
