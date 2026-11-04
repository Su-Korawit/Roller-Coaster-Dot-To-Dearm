// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

const m = vi.hoisted(() => ({ canvasProps: null, navigate: vi.fn() }))
vi.mock('../components/GameCanvas', () => ({ default: (props) => { m.canvasProps = props; return <div data-testid="canvas" /> } }))
vi.mock('../services/openHouseClient', () => ({
  fetchIndex: vi.fn().mockResolvedValue({ ok: false, error: 'missing' }),
  fetchBuilding: vi.fn().mockResolvedValue({ ok: false, error: 'missing' }),
}))
vi.mock('../lib/sfx', () => ({ playSound: vi.fn() }))
vi.mock('../components/plan/PlanSheet', () => ({ default: () => <div data-testid="plan-sheet" /> }))
vi.mock('../components/plan/RoundPickerSheet', () => ({ default: ({ program }) => <div data-testid="round-picker">{program.programName}</div> }))
vi.mock('../components/SettingsSheet', () => ({ default: () => <div data-testid="settings-sheet" /> }))
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => m.navigate }))

const { default: OpenHousePage } = await import('./OpenHousePage')
const { useOpenHouseUiStore: ui } = await import('../stores/useOpenHouseUiStore')
const { useRoomUiStore } = await import('../stores/useRoomUiStore')
const { usePlanUiStore } = await import('../stores/usePlanUiStore')
const { useAuthStore } = await import('../stores/useAuthStore')
const { placementOf, doorTile } = await import('../game/campusLayout')

function Where() {
  const loc = useLocation()
  return <output data-testid="where">{loc.pathname + loc.search}</output>
}
const renderAt = (url) => render(<MemoryRouter initialEntries={[url]}><OpenHousePage /><Where /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  m.canvasProps = null
  ui.getState().reset()
  useRoomUiStore.getState().close()
  usePlanUiStore.setState({ adding: null })
  useAuthStore.setState({ user: null, loading: false })
})

describe('OpenHousePage (a guest)', () => {
  it('renders the campus with no account: canvas pinned to the campus map, minimap, reduced hotbar', async () => {
    renderAt('/openhouse')
    expect(await screen.findByTestId('canvas')).toBeTruthy()
    expect(m.canvasProps).toMatchObject({ entryMapKey: 'campus', entrySpawnAt: null })
    expect(screen.getByRole('navigation', { name: 'แผนที่มหาวิทยาลัย' })).toBeTruthy()
    const bar = screen.getByRole('navigation', { name: 'แถบไอเทม' })
    expect(bar.querySelectorAll('button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'แผน TCAS' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'ร้านค้า' })).toBeNull()
    expect(document.title).toContain('Open House')
  })

  it('?b=med opens the faculty popup at once and stands the avatar at that door', async () => {
    renderAt('/openhouse?b=med')
    expect(await screen.findByRole('dialog', { name: 'แพทยศาสตร์' })).toBeTruthy()
    const d = doorTile(placementOf('med'))
    expect(m.canvasProps.entrySpawnAt).toEqual({ x: (d.x + 1) * 16, y: d.y * 16 + 8 })
    expect(m.canvasProps.active).toBe(false) // game input pauses while the popup is up
  })

  it('a deep link keeps the address as shared, other parameters included (review)', async () => {
    renderAt('/openhouse?b=med&utm=x')
    await screen.findByRole('dialog', { name: 'แพทยศาสตร์' })
    expect(screen.getByTestId('where').textContent).toBe('/openhouse?b=med&utm=x')
    act(() => ui.getState().openBuilding('law'))
    expect(screen.getByTestId('where').textContent).toBe('/openhouse?b=law&utm=x')
    act(() => ui.getState().closeBuilding())
    expect(screen.getByTestId('where').textContent).toBe('/openhouse?utm=x')
  })

  it('a deep link survives React StrictMode double effects (dev) and the canvas mounting later', async () => {
    const { StrictMode } = await import('react')
    render(<StrictMode><MemoryRouter initialEntries={['/openhouse?b=eng']}><OpenHousePage /><Where /></MemoryRouter></StrictMode>)
    expect(await screen.findByRole('dialog', { name: 'วิศวกรรมศาสตร์' })).toBeTruthy()
    expect(screen.getByTestId('where').textContent).toBe('/openhouse?b=eng')
  })

  it('an unknown ?b is ignored: no popup, default spawn', async () => {
    renderAt('/openhouse?b=nope')
    await screen.findByTestId('canvas')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(m.canvasProps.entrySpawnAt).toBeNull()
  })

  it('keeps the address in step with the open faculty and drops it when closed', async () => {
    renderAt('/openhouse')
    await screen.findByTestId('canvas')
    act(() => ui.getState().openBuilding('law'))
    expect(screen.getByTestId('where').textContent).toBe('/openhouse?b=law')
    act(() => ui.getState().closeBuilding())
    expect(screen.getByTestId('where').textContent).toBe('/openhouse')
  })

  it('the hotbar plan slot opens the plan sheet; settings opens settings; sign-in goes to /auth', async () => {
    renderAt('/openhouse')
    await screen.findByTestId('canvas')
    fireEvent.click(screen.getByRole('button', { name: 'แผน TCAS' }))
    expect(screen.getByTestId('plan-sheet')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'แผน TCAS' }))
    expect(screen.queryByTestId('plan-sheet')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'ตั้งค่า' }))
    expect(screen.getByTestId('settings-sheet')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))
    expect(m.navigate).toHaveBeenCalledWith('/auth')
  })

  it('mounts the Plan round picker itself when a program is being added', async () => {
    renderAt('/openhouse')
    await screen.findByTestId('canvas')
    act(() => usePlanUiStore.getState().openAdd({ programId: 'p1', programName: 'แพทยศาสตรบัณฑิต', rounds: [] }))
    expect(screen.getByTestId('round-picker').textContent).toBe('แพทยศาสตรบัณฑิต')
  })

  it('the directory board opens from the door-side action', async () => {
    renderAt('/openhouse')
    await screen.findByTestId('canvas')
    act(() => ui.getState().setNearDirectory(true))
    fireEvent.click(screen.getByRole('button', { name: /ดูแผนที่มหาวิทยาลัย/ }))
    expect(screen.getByText('แผนที่มหาวิทยาลัย', { selector: 'h2' })).toBeTruthy()
  })
})
