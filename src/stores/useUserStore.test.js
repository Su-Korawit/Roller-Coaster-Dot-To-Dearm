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
