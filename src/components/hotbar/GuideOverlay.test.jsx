// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const auth = vi.hoisted(() => ({ user: { uid: 'u1' } }))
vi.mock('../../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(auth) }))
vi.mock('../../services/focus', () => ({
  startFocus: vi.fn(), checkInFocus: vi.fn(), endFocus: vi.fn(), abandonFocus: vi.fn(), CHECKIN_PROMPT_MS: 1500000,
}))
vi.mock('../../lib/guideContext', () => ({ buildGuideContext: vi.fn() }))

const { default: GuideOverlay } = await import('./GuideOverlay')
const { useGuideStore } = await import('../../stores/useGuideStore')
const { useLeavesStore } = await import('../../stores/useLeavesStore')
const { useFocusStore } = await import('../../stores/useFocusStore')
const { buildGuideContext } = await import('../../lib/guideContext')
const focusApi = await import('../../services/focus')

const ctx = (over = {}) => ({
  signedIn: true, practiceDone: false, hasPurchased: false, canAffordSomething: true,
  hasUnplacedItem: true, hasCustomRoom: false, places: 2, ...over,
})

const addTarget = (guide, rect = { left: 10, top: 700, width: 40, height: 40 }) => {
  const el = document.createElement('button')
  el.setAttribute('data-guide', guide)
  el.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height })
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  auth.user = { uid: 'u1' }
  buildGuideContext.mockReturnValue(ctx())
  useGuideStore.getState().reset()
  useLeavesStore.getState().reset()
  useFocusStore.getState().reset()
  document.body.innerHTML = ''
  vi.clearAllMocks()
  buildGuideContext.mockReturnValue(ctx())
})

afterEach(() => { vi.useRealTimers() })

const tick = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(500) }) }

describe('GuideOverlay', () => {
  it('renders nothing before the guide started and for a guest', () => {
    const { container } = render(<GuideOverlay />)
    expect(container.firstChild).toBeNull()
  })

  it('starts by itself once a signed-in student has the welcome pack', async () => {
    useLeavesStore.setState({ welcomePack: 'v2' })
    render(<GuideOverlay />)
    await tick()
    expect(screen.getByText(/ลองโฟกัส 1 นาที/)).toBeTruthy()
  })

  it('does not start before the welcome pack is claimed', async () => {
    render(<GuideOverlay />)
    await tick()
    expect(useGuideStore.getState().started).toBe(false)
  })

  it('shows a spotlight when the target is on screen', async () => {
    addTarget('slot-focus')
    useGuideStore.getState().setContextProvider(() => ctx())
    useGuideStore.getState().start()
    render(<GuideOverlay />)
    await tick()
    expect(document.querySelector('[data-guide-spotlight]')).not.toBeNull()
    expect(document.querySelector('[data-guide-spotlight]').className).toContain('pointer-events-none')
  })

  it('never dims or blocks input when the target is missing', async () => {
    useGuideStore.getState().setContextProvider(() => ctx())
    useGuideStore.getState().start()
    render(<GuideOverlay />)
    await tick()
    expect(document.querySelector('[data-guide-spotlight]')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('the decorate step falls back to the shop slot until its own button is on screen', async () => {
    addTarget('slot-shop', { left: 100, top: 700, width: 40, height: 40 })
    useGuideStore.setState({ started: true, step: 2, done: false, skipped: false })
    render(<GuideOverlay />)
    await tick()
    const spot = document.querySelector('[data-guide-spotlight]')
    expect(spot).not.toBeNull()
    expect(spot.style.left).toBe('94px')
  })

  it('ข้าม skips the guide for good', async () => {
    useGuideStore.getState().setContextProvider(() => ctx())
    useGuideStore.getState().start()
    render(<GuideOverlay />)
    await tick()
    fireEvent.click(screen.getByRole('button', { name: 'ข้าม' }))
    expect(useGuideStore.getState().skipped).toBe(true)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('เริ่มลองโฟกัส starts a practice session', async () => {
    focusApi.startFocus.mockResolvedValue({ ok: true, practice: true, mode: 'flexible', plannedMin: 1, startedAt: 1, lastCheckInAt: 1, verifiedMs: 0 })
    useGuideStore.getState().setContextProvider(() => ctx())
    useGuideStore.getState().start()
    render(<GuideOverlay />)
    await tick()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'เริ่มลองโฟกัส' })) })
    expect(focusApi.startFocus).toHaveBeenCalledWith({ mode: undefined, plannedMin: undefined, practice: true })
    expect(useFocusStore.getState().practice).toBe(true)
  })

  it('an already-taken gift (PRACTICE_DONE) moves the guide on instead of failing', async () => {
    focusApi.startFocus.mockRejectedValue(new Error('PRACTICE_DONE'))
    useGuideStore.getState().setContextProvider(() => ctx())
    useGuideStore.getState().start()
    render(<GuideOverlay />)
    await tick()
    buildGuideContext.mockReturnValue(ctx({ practiceDone: true }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'เริ่มลองโฟกัส' })) })
    expect(useLeavesStore.getState().practiceDone).toBe(true)
    expect(useGuideStore.getState().current().id).toBe('buy')
  })

  it('a failed start shows an error and keeps the step', async () => {
    focusApi.startFocus.mockRejectedValue(new Error('offline'))
    useGuideStore.getState().setContextProvider(() => ctx())
    useGuideStore.getState().start()
    render(<GuideOverlay />)
    await tick()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'เริ่มลองโฟกัส' })) })
    expect(screen.getByRole('alert').textContent).toContain('ลองใหม่')
    expect(useGuideStore.getState().step).toBe(0)
  })

  it('does not offer a practice session while another focus session is running', async () => {
    useFocusStore.setState({ status: 'running' })
    useGuideStore.getState().setContextProvider(() => ctx())
    useGuideStore.getState().start()
    render(<GuideOverlay />)
    await tick()
    expect(screen.queryByRole('button', { name: 'เริ่มลองโฟกัส' })).toBeNull()
    expect(screen.getByText(/จบโฟกัสที่กำลังทำอยู่ก่อน/)).toBeTruthy()
  })
})
