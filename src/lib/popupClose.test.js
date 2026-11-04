import { describe, it, expect, vi } from 'vitest'
import { closeTopPopup } from './popupClose'

const make = (activePopup) => ({ activePopup, closePopup: vi.fn(), setActiveTab: vi.fn() })

describe('closeTopPopup', () => {
  it('closes an ordinary popup and leaves the view alone', () => {
    const a = make('mastery')
    expect(closeTopPopup(a)).toBe(true)
    expect(a.closePopup).toHaveBeenCalled()
    expect(a.setActiveTab).not.toHaveBeenCalled()
  })

  it('closing the calendar also restores the Home view so the game is not left paused', () => {
    const a = make('calendar')
    closeTopPopup(a)
    expect(a.setActiveTab).toHaveBeenCalledWith('home')
  })

  it('refuses to dismiss the daily mood check-in', () => {
    const a = make('dailyLogin')
    expect(closeTopPopup(a)).toBe(false)
    expect(a.closePopup).not.toHaveBeenCalled()
  })

  it('does nothing when no popup is open', () => {
    const a = make(null)
    expect(closeTopPopup(a)).toBe(false)
    expect(a.closePopup).not.toHaveBeenCalled()
  })
})
