import { describe, it, expect, beforeEach } from 'vitest'
import { useOsStore } from './useOsStore'

describe('useOsStore', () => {
  beforeEach(() => useOsStore.setState({ wallpaperId: 'lavender', installed: [] }))

  it('installs once and uninstalls', () => {
    const { installApp, uninstallApp } = useOsStore.getState()
    installApp('notes')
    installApp('notes')
    expect(useOsStore.getState().installed).toEqual(['notes'])
    uninstallApp('notes')
    expect(useOsStore.getState().installed).toEqual([])
  })

  it('sets a known wallpaper and ignores unknown ones', () => {
    useOsStore.getState().setWallpaper('night')
    expect(useOsStore.getState().wallpaperId).toBe('night')
    useOsStore.getState().setWallpaper('nope')
    expect(useOsStore.getState().wallpaperId).toBe('night')
  })
})
