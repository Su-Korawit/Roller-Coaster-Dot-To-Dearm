import { describe, it, expect, beforeEach } from 'vitest'
import { useRoomUiStore } from './useRoomUiStore'
import { usePlanUiStore } from './usePlanUiStore'

beforeEach(() => {
  useRoomUiStore.getState().close()
  usePlanUiStore.getState().closeAdd()
})

describe('useRoomUiStore', () => {
  it('opens a sheet with an optional payload and closing clears both', () => {
    useRoomUiStore.getState().open('focus', { subjectKey: 'a_lv_64' })
    expect(useRoomUiStore.getState()).toMatchObject({ sheet: 'focus', payload: { subjectKey: 'a_lv_64' } })
    useRoomUiStore.getState().close()
    expect(useRoomUiStore.getState()).toMatchObject({ sheet: null, payload: null })
  })

  it('opening another sheet without a payload drops the old payload', () => {
    useRoomUiStore.getState().open('focus', { subjectKey: 'tgat' })
    useRoomUiStore.getState().open('shop')
    expect(useRoomUiStore.getState().payload).toBeNull()
  })
})

describe('usePlanUiStore', () => {
  it('holds the program being added until closed', () => {
    const program = { programId: 'p1', rounds: [] }
    usePlanUiStore.getState().openAdd(program)
    expect(usePlanUiStore.getState().adding).toBe(program)
    usePlanUiStore.getState().closeAdd()
    expect(usePlanUiStore.getState().adding).toBeNull()
  })
})
