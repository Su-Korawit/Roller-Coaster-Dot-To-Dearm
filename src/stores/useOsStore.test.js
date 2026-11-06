import { describe, it, expect, beforeEach } from 'vitest'
import { useOsStore } from './useOsStore'

const reset = () => useOsStore.setState({
  wallpaperId: 'lavender', installed: [], customAspect: null, customDark: false,
  customCrop: { fx: 50, fy: 50, zoom: 1 }, customRev: 0,
})

describe('useOsStore', () => {
  beforeEach(reset)

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

  it('cannot pick "custom" before a photo is saved', () => {
    useOsStore.getState().setWallpaper('custom')
    expect(useOsStore.getState().wallpaperId).toBe('lavender')
  })

  it('saving a photo selects it with a fresh centred crop and bumps the revision', () => {
    useOsStore.getState().setCustomCrop({ fx: 10, fy: 10, zoom: 2 })
    useOsStore.getState().setCustomWallpaper({ aspect: 1.5, dark: true })
    const s = useOsStore.getState()
    expect(s.wallpaperId).toBe('custom')
    expect(s.customAspect).toBe(1.5)
    expect(s.customDark).toBe(true)
    expect(s.customCrop).toEqual({ fx: 50, fy: 50, zoom: 1 })
    expect(s.customRev).toBe(1)
  })

  it('clamps the crop it is given', () => {
    useOsStore.getState().setCustomCrop({ fx: 500, fy: -3, zoom: 99 })
    expect(useOsStore.getState().customCrop).toEqual({ fx: 100, fy: 0, zoom: 3 })
  })

  it('removing the photo falls back to the default wallpaper only if it was selected', () => {
    useOsStore.getState().setCustomWallpaper({ aspect: 1, dark: false })
    useOsStore.getState().clearCustomWallpaper()
    expect(useOsStore.getState().wallpaperId).toBe('lavender')
    expect(useOsStore.getState().customAspect).toBeNull()

    useOsStore.getState().setCustomWallpaper({ aspect: 1, dark: false })
    useOsStore.getState().setWallpaper('night')
    useOsStore.getState().clearCustomWallpaper()
    expect(useOsStore.getState().wallpaperId).toBe('night')
  })
})
