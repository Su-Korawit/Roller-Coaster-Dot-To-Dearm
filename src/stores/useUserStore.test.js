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

describe('daily streak via addDailyFeel', () => {
  beforeEach(() => {
    useUserStore.setState({
      streak: 0, lastStreakDate: null, bestStreak: 0,
      lastLoginDate: null, feelingNotes: [], totalStacks: 0,
    })
  })

  it('first ever check-in starts the streak at 1', () => {
    const result = useUserStore.getState().addDailyFeel(4, '2026-07-09')
    expect(result).toEqual({ streak: 1, changed: true, broken: false })
    const s = useUserStore.getState()
    expect(s.streak).toBe(1)
    expect(s.lastStreakDate).toBe('2026-07-09')
    expect(s.bestStreak).toBe(1)
    expect(s.lastLoginDate).toBe('2026-07-09')
    expect(s.totalStacks).toBe(1)
    expect(s.feelingNotes).toEqual([{ date: '2026-07-09', feel: 4 }])
  })

  it('consecutive-day check-in increments streak and bestStreak', () => {
    useUserStore.getState().addDailyFeel(3, '2026-07-08')
    const result = useUserStore.getState().addDailyFeel(5, '2026-07-09')
    expect(result).toEqual({ streak: 2, changed: true, broken: false })
    expect(useUserStore.getState().bestStreak).toBe(2)
  })

  it('same-day repeat changes nothing and reports changed: false', () => {
    useUserStore.getState().addDailyFeel(3, '2026-07-09')
    const result = useUserStore.getState().addDailyFeel(5, '2026-07-09')
    expect(result).toEqual({ streak: 1, changed: false, broken: false })
    expect(useUserStore.getState().feelingNotes).toHaveLength(1)
    expect(useUserStore.getState().totalStacks).toBe(1)
  })

  it('a gap resets the streak to 1 but keeps bestStreak', () => {
    useUserStore.setState({ streak: 6, lastStreakDate: '2026-07-01', bestStreak: 6 })
    const result = useUserStore.getState().addDailyFeel(2, '2026-07-09')
    expect(result).toEqual({ streak: 1, changed: true, broken: true })
    expect(useUserStore.getState().streak).toBe(1)
    expect(useUserStore.getState().bestStreak).toBe(6)
  })
})

describe('daily AI usage counter', () => {
  beforeEach(() => {
    useUserStore.setState({ aiUsage: null })
  })

  it('starts at 0 and increments within the same day', () => {
    expect(useUserStore.getState().aiUsesToday('2026-07-09')).toBe(0)
    expect(useUserStore.getState().trackAiUse('2026-07-09')).toBe(1)
    expect(useUserStore.getState().trackAiUse('2026-07-09')).toBe(2)
    expect(useUserStore.getState().aiUsesToday('2026-07-09')).toBe(2)
  })

  it('resets on a new date', () => {
    useUserStore.getState().trackAiUse('2026-07-09')
    expect(useUserStore.getState().aiUsesToday('2026-07-10')).toBe(0)
    expect(useUserStore.getState().trackAiUse('2026-07-10')).toBe(1)
  })
})
