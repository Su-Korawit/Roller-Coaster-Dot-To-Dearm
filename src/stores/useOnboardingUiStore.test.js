// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useOnboardingUiStore } from './useOnboardingUiStore'

describe('useOnboardingUiStore', () => {
  beforeEach(() => {
    useOnboardingUiStore.setState({ forceOpen: false })
  })

  it('defaults to closed', () => {
    expect(useOnboardingUiStore.getState().forceOpen).toBe(false)
  })

  it('open() sets forceOpen true', () => {
    useOnboardingUiStore.getState().open()
    expect(useOnboardingUiStore.getState().forceOpen).toBe(true)
  })

  it('close() sets forceOpen false', () => {
    useOnboardingUiStore.setState({ forceOpen: true })
    useOnboardingUiStore.getState().close()
    expect(useOnboardingUiStore.getState().forceOpen).toBe(false)
  })
})
