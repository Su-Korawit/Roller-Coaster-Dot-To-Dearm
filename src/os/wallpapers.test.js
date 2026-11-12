import { describe, it, expect } from 'vitest'
import { WALLPAPERS, WALLPAPER_CATEGORIES, wallpapersIn, getWallpaper, wallpaperImage, wallpaperVideo } from './wallpapers'

describe('wallpapers', () => {
  it('ids are unique and every wallpaper is in a known category', () => {
    expect(new Set(WALLPAPERS.map((w) => w.id)).size).toBe(WALLPAPERS.length)
    const cats = new Set(WALLPAPER_CATEGORIES.map((c) => c.id))
    expect(WALLPAPERS.every((w) => cats.has(w.category))).toBe(true)
  })

  it('has the EU and USA & Canada collections', () => {
    expect(wallpapersIn('eu').length).toBeGreaterThan(0)
    expect(wallpapersIn('na').length).toBeGreaterThan(0)
    expect(WALLPAPER_CATEGORIES.map((c) => c.name)).toEqual(expect.arrayContaining(['EU', 'USA & Canada']))
  })

  it('builds image and video paths and falls back to the first wallpaper', () => {
    expect(wallpaperImage('eu-alps', 'portrait')).toBe('/assets/os/wallpapers/eu-alps-portrait.webp')
    expect(wallpaperVideo('eu-alps', 'landscape')).toBe('/assets/os/wallpapers/eu-alps-landscape.mp4')
    expect(getWallpaper('nope').id).toBe('lavender')
  })
})
