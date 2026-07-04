import { describe, it, expect, beforeEach } from 'vitest'
import { useUserStore } from './useUserStore'

describe('useUserStore controlMode', () => {
  beforeEach(() => {
    useUserStore.setState({ controlMode: 'joystick' })
  })

  it('defaults to joystick', () => {
    expect(useUserStore.getState().controlMode).toBe('joystick')
  })

  it('setControlMode switches to clickToMove', () => {
    useUserStore.getState().setControlMode('clickToMove')
    expect(useUserStore.getState().controlMode).toBe('clickToMove')
  })

  it('resetUser restores joystick default', () => {
    useUserStore.getState().setControlMode('clickToMove')
    useUserStore.getState().resetUser()
    expect(useUserStore.getState().controlMode).toBe('joystick')
  })
})

describe('useUserStore uiVisibility', () => {
  beforeEach(() => {
    useUserStore.setState({
      uiVisibility: { hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true },
    })
  })

  it('defaults every HUD element to visible', () => {
    expect(useUserStore.getState().uiVisibility).toEqual({
      hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true,
    })
  })

  it('setUiVisibility flips a single key without touching the others', () => {
    useUserStore.getState().setUiVisibility('hotbar', false)
    const { uiVisibility } = useUserStore.getState()
    expect(uiVisibility.hotbar).toBe(false)
    expect(uiVisibility.shortcuts).toBe(true)
  })

  it('resetUser restores all uiVisibility keys to true', () => {
    useUserStore.getState().setUiVisibility('hotbar', false)
    useUserStore.getState().setUiVisibility('newsButton', false)
    useUserStore.getState().resetUser()
    expect(useUserStore.getState().uiVisibility).toEqual({
      hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true,
    })
  })
})
