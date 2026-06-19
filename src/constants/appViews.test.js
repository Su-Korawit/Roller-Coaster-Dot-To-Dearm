import { describe, it, expect } from 'vitest'
import { APP_VIEWS, shouldShowNav } from './appViews'

describe('shouldShowNav', () => {
  it('hides nav when chat is active', () => {
    expect(shouldShowNav(APP_VIEWS.CHAT)).toBe(false)
  })

  it('shows nav for all other views', () => {
    const otherViews = Object.values(APP_VIEWS).filter((v) => v !== APP_VIEWS.CHAT)
    otherViews.forEach((view) => {
      expect(shouldShowNav(view), `expected nav visible for view "${view}"`).toBe(true)
    })
  })
})
