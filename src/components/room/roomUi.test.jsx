// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

const m = vi.hoisted(() => ({
  startFocus: vi.fn(),
  checkInFocus: vi.fn(),
  endFocus: vi.fn(),
  abandonFocus: vi.fn(),
  buyRoomItem: vi.fn(),
  saveRoomLayout: vi.fn(),
  claimWelcomePack: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), getDocs: vi.fn() }))
vi.mock('../../lib/db', () => ({
  refs: { user: () => ({}), room: () => ({}) },
  cols: { roomCatalog: {} },
  shapes: { roomLayout: (d) => d },
}))
vi.mock('../../services/focus', () => ({
  startFocus: (...a) => m.startFocus(...a),
  checkInFocus: (...a) => m.checkInFocus(...a),
  endFocus: (...a) => m.endFocus(...a),
  abandonFocus: (...a) => m.abandonFocus(...a),
  CHECKIN_PROMPT_MS: 25 * 60 * 1000,
}))
vi.mock('../../services/roomApi', () => ({
  buyRoomItem: (...a) => m.buyRoomItem(...a),
  saveRoomLayout: (...a) => m.saveRoomLayout(...a),
  claimWelcomePack: (...a) => m.claimWelcomePack(...a),
}))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: FocusSetupSheet } = await import('./FocusSetupSheet')
const { default: FocusHud } = await import('./FocusHud')
const { default: FocusCompleteScreen } = await import('./FocusCompleteScreen')
const { default: ShopSheet } = await import('./ShopSheet')
const { default: DecorateBar } = await import('./DecorateBar')
const { useFocusStore } = await import('../../stores/useFocusStore')
const { useLeavesStore } = await import('../../stores/useLeavesStore')
const { useRoomStore, roomSync } = await import('../../stores/useRoomStore')
const { useFxStore } = await import('../../stores/useFxStore')
const { ROOM_CATALOG } = await import('../../data/roomCatalogSeed')

beforeEach(() => {
  vi.clearAllMocks()
  useFocusStore.getState().reset()
  useFxStore.setState({ toasts: [] })
  useLeavesStore.setState({ leaves: 200, inventory: { chair_basic: 2, lamp_desk: 1, theme_minimal: 1 }, welcomePack: 'v2', loaded: true })
  roomSync.cancel()
  useRoomStore.setState({
    layout: { tier: 0, theme: 'minimal', petId: null, placed: [] },
    catalog: ROOM_CATALOG,
    decorating: false,
    selected: null,
    lastError: null,
  })
})

describe('FocusSetupSheet', () => {
  it('starts a strict 50-minute session from the chips', async () => {
    m.startFocus.mockResolvedValue({ ok: true, mode: 'strict', plannedMin: 50, startedAt: 1, lastCheckInAt: 1, verifiedMs: 0 })
    const onClose = vi.fn()
    render(<FocusSetupSheet onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '50 นาที' }))
    fireEvent.click(screen.getByRole('button', { name: 'เข้มงวด' }))
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    await waitFor(() => expect(m.startFocus).toHaveBeenCalledWith({ mode: 'strict', plannedMin: 50 }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(useFocusStore.getState().status).toBe('running')
  })

  it.each(['9', '121', '2.5', ''])('rejects a custom time of %j with the Thai range message', async (value) => {
    render(<FocusSetupSheet onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('กำหนดเอง (นาที)'), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    expect(await screen.findByText('ใส่เวลาระหว่าง 10–120 นาที')).toBeTruthy()
    expect(m.startFocus).not.toHaveBeenCalled()
  })

  it('accepts a custom time in range', async () => {
    m.startFocus.mockResolvedValue({ ok: true, mode: 'flexible', plannedMin: 35, startedAt: 1, lastCheckInAt: 1, verifiedMs: 0 })
    render(<FocusSetupSheet onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('กำหนดเอง (นาที)'), { target: { value: '35' } })
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    await waitFor(() => expect(m.startFocus).toHaveBeenCalledWith({ mode: 'flexible', plannedMin: 35 }))
  })

  it('previews the tree for the chosen time', () => {
    render(<FocusSetupSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '90 นาที' }))
    expect(screen.getByText('ต้นไม้ดอก')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '25 นาที' }))
    expect(screen.getByText('พุ่มไม้')).toBeTruthy()
  })

  it('tells the student when starting failed and keeps the sheet open', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    m.startFocus.mockRejectedValue(new Error('offline'))
    const onClose = vi.fn()
    render(<FocusSetupSheet onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    expect(await screen.findByText('เริ่มไม่สำเร็จ ลองใหม่อีกครั้ง')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('FocusHud', () => {
  const running = (over = {}) =>
    useFocusStore.setState({ status: 'running', mode: 'strict', plannedMin: 25, startedAt: Date.now(), lastCheckInAt: Date.now(), verifiedMs: 0, ...over })

  afterEach(() => vi.useRealTimers())

  it('renders nothing when no session is running', () => {
    const { container } = render(<FocusHud />)
    expect(container.firstChild).toBeNull()
  })

  it('labels a practice session instead of a mode', () => {
    running({ practice: true, mode: 'flexible', plannedMin: 1, startedAt: Date.now() - 10000 })
    render(<FocusHud />)
    expect(screen.getByText('ลองโฟกัส 1 นาที')).toBeTruthy()
    useFocusStore.setState({ practice: false })
  })

  it('shows the remaining time and the mode', () => {
    running({ startedAt: Date.now() - 5 * 60000 })
    render(<FocusHud />)
    expect(screen.getByText('20:00')).toBeTruthy()
    expect(screen.getByText('เข้มงวด')).toBeTruthy()
  })

  it('withers a strict session that was hidden for more than 10 seconds', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(1_000_000)
    running({ startedAt: Date.now(), lastCheckInAt: Date.now() })
    m.abandonFocus.mockResolvedValue({ ok: true, leaves: 0, tree: 'withered', withered: true })
    render(<FocusHud />)
    const set = (state) => Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
    set('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    vi.setSystemTime(1_000_000 + 11000)
    set('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(m.abandonFocus).toHaveBeenCalledTimes(1)
    expect(useFocusStore.getState()).toMatchObject({ status: 'withered', witherReason: 'hidden' })
  })

  it('does not wither a strict session for a 5 second glance away', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(2_000_000)
    running({ startedAt: Date.now(), lastCheckInAt: Date.now() })
    render(<FocusHud />)
    const set = (state) => Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
    set('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    vi.setSystemTime(2_000_000 + 5000)
    set('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(m.abandonFocus).not.toHaveBeenCalled()
    expect(useFocusStore.getState().status).toBe('running')
  })

  it('asks the student to confirm presence after the check-in interval', async () => {
    running({ startedAt: Date.now() - 26 * 60000, plannedMin: 90, lastCheckInAt: Date.now() - 26 * 60000 })
    m.checkInFocus.mockResolvedValue({ ok: true, lastCheckInAt: Date.now(), verifiedMs: 1, withered: false })
    render(<FocusHud />)
    fireEvent.click(screen.getByRole('button', { name: 'ฉันยังอยู่' }))
    await waitFor(() => expect(m.checkInFocus).toHaveBeenCalledTimes(1))
  })

  it('ends the session early with the stop button', async () => {
    running({ mode: 'flexible', startedAt: Date.now() - 60000 })
    m.endFocus.mockResolvedValue({ ok: true, leaves: 1, tree: 'shrub', withered: false })
    render(<FocusHud />)
    fireEvent.click(screen.getByRole('button', { name: 'จบตอนนี้' }))
    await waitFor(() => expect(m.endFocus).toHaveBeenCalledTimes(1))
    expect(useFocusStore.getState().status).toBe('done')
  })
})

describe('FocusCompleteScreen', () => {
  it('shows nothing while idle or running', () => {
    const { container } = render(<FocusCompleteScreen />)
    expect(container.firstChild).toBeNull()
  })

  it('celebrates a finished session with the Leaves earned', () => {
    useFocusStore.setState({ status: 'done', mode: 'strict', plannedMin: 50, result: { leaves: 82, tree: 'tree', withered: false } })
    render(<FocusCompleteScreen />)
    expect(screen.getByText('โฟกัสสำเร็จ!')).toBeTruthy()
    expect(screen.getByText('+82 ใบไม้')).toBeTruthy()
  })

  it('explains a strict wither caused by leaving the page', () => {
    useFocusStore.setState({ status: 'withered', mode: 'strict', plannedMin: 25, witherReason: 'hidden', result: { leaves: 0, tree: 'withered', withered: true } })
    render(<FocusCompleteScreen />)
    expect(screen.getByText('ต้นไม้เหี่ยวแล้ว')).toBeTruthy()
    expect(screen.getByText('ออกจากหน้านี้นานเกินไป ต้นไม้เลยเหี่ยว')).toBeTruthy()
  })

  it('celebrates a rewarded practice focus as the one-time welcome gift', () => {
    useFocusStore.setState({ status: 'done', mode: 'flexible', plannedMin: 1, practice: true, result: { leaves: 10, tree: 'sprout', withered: false, practice: true } })
    render(<FocusCompleteScreen />)
    expect(screen.getByText('ลองโฟกัสเสร็จแล้ว!')).toBeTruthy()
    expect(screen.getByText('+10 ใบไม้')).toBeTruthy()
    expect(screen.getByText('ของขวัญต้อนรับ ได้ครั้งเดียวเท่านั้น')).toBeTruthy()
  })

  it('tells a too-short practice that it can be retried', () => {
    useFocusStore.setState({ status: 'done', mode: 'flexible', plannedMin: 1, practice: true, result: { leaves: 0, tree: 'sprout', withered: false, practice: true } })
    render(<FocusCompleteScreen />)
    expect(screen.getByText('ต้องครบ 1 นาทีถึงจะได้ของขวัญ ลองใหม่ได้เลย')).toBeTruthy()
  })

  it('explains a lapse when no reason was reported', () => {
    useFocusStore.setState({ status: 'withered', mode: 'strict', plannedMin: 25, witherReason: null, result: { leaves: 0, tree: 'withered', withered: true } })
    render(<FocusCompleteScreen />)
    expect(screen.getByText('ขาดการเชื่อมต่อเกินกำหนด ต้นไม้เลยเหี่ยว')).toBeTruthy()
  })

  it('closes back to idle', () => {
    useFocusStore.setState({ status: 'done', mode: 'flexible', plannedMin: 25, result: { leaves: 27, tree: 'shrub', withered: false } })
    render(<FocusCompleteScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }))
    expect(useFocusStore.getState().status).toBe('idle')
  })
})

describe('ShopSheet', () => {
  it('lists furniture with prices and buys with the server price', async () => {
    m.buyRoomItem.mockResolvedValue({ ok: true, leaves: 110, owned: 1 })
    render(<ShopSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'ของตกแต่ง' }))
    expect(document.querySelector('[data-price="mug"]').textContent).toBe('80 ใบ')
    fireEvent.click(screen.getByRole('button', { name: 'ซื้อ แก้วกาแฟ' }))
    await waitFor(() => expect(m.buyRoomItem).toHaveBeenCalledWith('mug'))
    await waitFor(() => expect(useLeavesStore.getState().leaves).toBe(110))
    expect(useLeavesStore.getState().inventory.mug).toBe(1)
  })

  it('shows the shortfall and keeps the balance when there are not enough Leaves', async () => {
    const err = Object.assign(new Error('x'), { code: 'functions/failed-precondition', details: { reason: 'INSUFFICIENT_LEAVES', missing: 120 } })
    m.buyRoomItem.mockRejectedValue(err)
    render(<ShopSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'ของตกแต่ง' }))
    fireEvent.click(screen.getByRole('button', { name: 'ซื้อ โน้ตบุ๊ก' }))
    await waitFor(() => expect(useFxStore.getState().toasts.map((t) => t.text)).toContain('ใบไม้ไม่พอ ขาดอีก 120 ใบ'))
    expect(useLeavesStore.getState().leaves).toBe(200)
  })

  it('marks the theme in use and does not offer it again', () => {
    render(<ShopSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'ธีม' }))
    // the theme in use is marked and cannot be applied again
    expect(screen.getByRole('button', { name: 'ใช้อยู่' }).disabled).toBe(true)
  })

  it('hides items an admin switched off', () => {
    useRoomStore.setState({ catalog: { ...ROOM_CATALOG, mug: { ...ROOM_CATALOG.mug, hidden: true } } })
    render(<ShopSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'ของตกแต่ง' }))
    expect(screen.queryByRole('button', { name: 'ซื้อ แก้วกาแฟ' })).toBeNull()
  })

  it('starts decorate mode from the shop', () => {
    const onClose = vi.fn()
    render(<ShopSheet onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'แต่งห้อง' }))
    expect(useRoomStore.getState().decorating).toBe(true)
    expect(onClose).toHaveBeenCalled()
  })
})

describe('DecorateBar', () => {
  it('renders nothing outside decorate mode', () => {
    const { container } = render(<DecorateBar />)
    expect(container.firstChild).toBeNull()
  })

  it('lists only owned items that are not placed yet and arms one on tap', () => {
    useRoomStore.setState({ decorating: true, layout: { tier: 0, theme: 'minimal', petId: null, placed: [{ itemId: 'chair_basic', x: 32, y: 32 }] } })
    render(<DecorateBar />)
    expect(screen.getByRole('button', { name: /เก้าอี้/ }).textContent).toContain('×1')
    expect(screen.queryByRole('button', { name: /ธีมมินิมอล/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /โคมไฟตั้งโต๊ะ/ }))
    expect(useRoomStore.getState().selected).toBe('lamp_desk')
  })

  it('explains why a placement was refused', () => {
    useRoomStore.setState({ decorating: true, lastError: 'overlap' })
    render(<DecorateBar />)
    expect(screen.getByText('วางทับของอื่นไม่ได้')).toBeTruthy()
  })

  it('finishes decorating', () => {
    useRoomStore.setState({ decorating: true, selected: 'chair_basic' })
    render(<DecorateBar />)
    fireEvent.click(screen.getByRole('button', { name: 'เสร็จ' }))
    expect(useRoomStore.getState()).toMatchObject({ decorating: false, selected: null })
  })
})
