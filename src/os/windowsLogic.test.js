import { describe, it, expect } from 'vitest'
import {
  openWindow, focusWindow, closeWindow, minimizeWindow, toggleMaximize, moveWindow,
  topWindowId, taskbarToggle, clampPos, centredPos, windowSize, TASKBAR_H,
} from './windowsLogic'

const A = { id: 'a' }
const B = { id: 'b' }
const C = { id: 'c' }
const ids = (l) => l.map((w) => w.id)

describe('open / focus / close', () => {
  it('opens windows in stacking order, one per app', () => {
    let l = openWindow([], A)
    l = openWindow(l, B)
    expect(ids(l)).toEqual(['a', 'b'])
    l = openWindow(l, A)   // re-open brings it to the top, no duplicate
    expect(ids(l)).toEqual(['b', 'a'])
  })
  it('re-opening a minimized window restores it', () => {
    let l = minimizeWindow(openWindow(openWindow([], A), B), 'b')
    l = openWindow(l, B)
    expect(l.find((w) => w.id === 'b').minimized).toBe(false)
  })
  it('focus raises and restores; unknown id is a no-op', () => {
    let l = openWindow(openWindow([], A), B)
    l = focusWindow(l, 'a')
    expect(ids(l)).toEqual(['b', 'a'])
    expect(focusWindow(l, 'zzz')).toBe(l)
  })
  it('closes by id', () => {
    expect(ids(closeWindow(openWindow(openWindow([], A), B), 'a'))).toEqual(['b'])
  })
})

describe('minimize / maximize / move', () => {
  it('minimizing hands focus to the next visible window', () => {
    let l = openWindow(openWindow(openWindow([], A), B), C)
    expect(topWindowId(l)).toBe('c')
    l = minimizeWindow(l, 'c')
    expect(topWindowId(l)).toBe('b')
    l = minimizeWindow(minimizeWindow(l, 'b'), 'a')
    expect(topWindowId(l)).toBe(null)
  })
  it('toggles maximize and stores the dragged position per window', () => {
    let l = openWindow(openWindow([], A), B)
    l = toggleMaximize(l, 'a')
    expect(l.find((w) => w.id === 'a').maximized).toBe(true)
    expect(l.find((w) => w.id === 'b').maximized).toBe(false)
    l = toggleMaximize(l, 'a')
    expect(l.find((w) => w.id === 'a').maximized).toBe(false)
    l = moveWindow(l, 'b', { x: 10, y: 20 })
    expect(l.find((w) => w.id === 'b').pos).toEqual({ x: 10, y: 20 })
    expect(l.find((w) => w.id === 'a').pos).toBe(null)
  })
})

describe('taskbarToggle', () => {
  it('restores minimized, minimizes the focused one, focuses a background one', () => {
    let l = openWindow(openWindow([], A), B)        // b focused
    l = taskbarToggle(l, 'b')                        // focused → minimize
    expect(l.find((w) => w.id === 'b').minimized).toBe(true)
    l = taskbarToggle(l, 'b')                        // minimized → restore + top
    expect(topWindowId(l)).toBe('b')
    l = taskbarToggle(l, 'a')                        // background → focus
    expect(topWindowId(l)).toBe('a')
  })
})

describe('geometry', () => {
  it('sizes the window to the screen and centres it above the taskbar', () => {
    expect(windowSize(2000, 1200).w).toBe(960)
    expect(windowSize(800, 600).w).toBe(720)
    const { x, y } = centredPos(1600, 900)
    expect(x).toBe(320)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(y + windowSize(1600, 900).h).toBeLessThanOrEqual(900 - TASKBAR_H)
  })
  it('keeps the title bar on screen while dragging', () => {
    const size = { w: 960, h: 680 }
    expect(clampPos({ x: -5000, y: -50 }, size, 1600, 900)).toEqual({ x: 120 - 960, y: 0 })
    const far = clampPos({ x: 9000, y: 9000 }, size, 1600, 900)
    expect(far.x).toBe(1600 - 120)
    expect(far.y).toBe(900 - TASKBAR_H - 44)
    expect(clampPos({ x: 100, y: 50 }, size, 1600, 900)).toEqual({ x: 100, y: 50 })
  })
})
