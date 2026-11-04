// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

vi.mock('../../services/openHouseClient', () => ({
  fetchIndex: vi.fn().mockResolvedValue({ ok: false, error: 'missing' }),
  fetchBuilding: vi.fn().mockResolvedValue({ ok: false, error: 'missing' }),
}))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: CampusLayer } = await import('./CampusLayer')
const { useWorldStore } = await import('../../stores/useWorldStore')
const { useOpenHouseUiStore: ui } = await import('../../stores/useOpenHouseUiStore')

beforeEach(() => {
  ui.getState().reset()
  useWorldStore.setState({ currentMapKey: 'room' })
})

describe('CampusLayer (review: a signed-in student who warps to the campus needs the campus UI too)', () => {
  it('renders nothing in the app until the campus is the current map', () => {
    const { container } = render(<CampusLayer />)
    expect(container.firstChild).toBeNull()
    act(() => useWorldStore.setState({ currentMapKey: 'campus' }))
    expect(screen.getByRole('navigation', { name: 'แผนที่มหาวิทยาลัย' })).toBeTruthy()
  })

  it('on the campus it shows the door action and the faculty popup', async () => {
    useWorldStore.setState({ currentMapKey: 'campus' })
    render(<CampusLayer />)
    act(() => ui.getState().setDoor('med'))
    expect(screen.getByRole('button', { name: /เข้าตึกแพทย์/ })).toBeTruthy()
    act(() => ui.getState().openBuilding('med'))
    expect(await screen.findByRole('dialog', { name: 'แพทยศาสตร์' })).toBeTruthy()
  })

  it('warping away closes whatever was open, so coming back starts clean', async () => {
    useWorldStore.setState({ currentMapKey: 'campus' })
    render(<CampusLayer />)
    act(() => ui.getState().openBuilding('law'))
    act(() => useWorldStore.setState({ currentMapKey: 'room' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ui.getState().openBuildingId).toBeNull()
  })

  it('on the guest page (always) it does not wait for the map key', () => {
    useWorldStore.setState({ currentMapKey: null })
    render(<CampusLayer always />)
    expect(screen.getByRole('navigation', { name: 'แผนที่มหาวิทยาลัย' })).toBeTruthy()
    act(() => ui.getState().openBuilding('eng'))
    expect(screen.getByRole('dialog', { name: 'วิศวกรรมศาสตร์' })).toBeTruthy()
  })
})
