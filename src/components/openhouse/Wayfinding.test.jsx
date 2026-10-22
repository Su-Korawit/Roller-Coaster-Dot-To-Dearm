// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: EnterBuildingButton } = await import('./EnterBuildingButton')
const { default: Minimap } = await import('./Minimap')
const { default: DirectoryBoard } = await import('./DirectoryBoard')
const { useOpenHouseUiStore: ui } = await import('../../stores/useOpenHouseUiStore')
const { BUILDINGS } = await import('../../constants/openHouseBuildings')
const { PLACEMENTS, doorTile, placementOf } = await import('../../game/campusLayout')

beforeEach(() => { ui.getState().reset(); ui.getState().setWalker(null) })

describe('EnterBuildingButton', () => {
  it('is hidden away from doors', () => {
    const { container } = render(<EnterBuildingButton />)
    expect(container.firstChild).toBeNull()
  })

  it('appears in a door zone, never opens by itself, and opens on tap', () => {
    render(<EnterBuildingButton />)
    act(() => ui.getState().setDoor('med'))
    expect(ui.getState().openBuildingId).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /เข้าตึกแพทย์/ }))
    expect(ui.getState().openBuildingId).toBe('med')
  })

  it('E and Enter open it, typing in a field does not, and it hides once a popup is open', () => {
    render(<><input aria-label="q" /><EnterBuildingButton /></>)
    act(() => ui.getState().setDoor('law'))
    fireEvent.keyDown(screen.getByLabelText('q'), { key: 'e' })
    expect(ui.getState().openBuildingId).toBeNull()
    fireEvent.keyDown(window, { key: 'e' })
    expect(ui.getState().openBuildingId).toBe('law')
    expect(screen.queryByRole('button', { name: /เข้าตึก/ })).toBeNull()
    act(() => ui.getState().closeBuilding())
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(ui.getState().openBuildingId).toBe('law')
  })

  it('walking out of the door removes the button', () => {
    render(<EnterBuildingButton />)
    act(() => ui.getState().setDoor('eng'))
    expect(screen.getByRole('button', { name: /เข้าตึก/ })).toBeTruthy()
    act(() => ui.getState().clearDoor('eng'))
    expect(screen.queryByRole('button', { name: /เข้าตึก/ })).toBeNull()
  })

  it('at the directory board the same slot opens the map', () => {
    render(<EnterBuildingButton />)
    act(() => ui.getState().setNearDirectory(true))
    fireEvent.click(screen.getByRole('button', { name: /ดูแผนที่มหาวิทยาลัย/ }))
    expect(ui.getState().directoryOpen).toBe(true)
  })
})

describe('Minimap', () => {
  it('has a button per faculty and tapping one walks to that door', () => {
    const walker = vi.fn()
    ui.getState().setWalker(walker)
    render(<Minimap />)
    for (const b of BUILDINGS) expect(screen.getByRole('button', { name: `เดินไป${b.nameTh}` })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'เดินไปนิติศาสตร์' }))
    const d = doorTile(placementOf('law'))
    expect(walker).toHaveBeenCalledWith(d.x, d.y)
    expect(walker).toHaveBeenCalledTimes(1) // the building tap does not also walk to the lawn under it
  })

  it('covers every placed building exactly once', () => {
    render(<Minimap />)
    expect(screen.getAllByRole('button', { name: /^เดินไป/ }).length).toBe(PLACEMENTS.length + 2) // + hall + entrance
  })
})

describe('DirectoryBoard', () => {
  it('lists all 18 buildings; เดินไป walks to the door and closes, ดูเส้นทาง opens the popup', () => {
    const walker = vi.fn()
    const onClose = vi.fn()
    ui.getState().setWalker(walker)
    render(<DirectoryBoard onClose={onClose} />)
    expect(screen.getAllByRole('button', { name: /^เดินไป/ })).toHaveLength(18)
    fireEvent.click(screen.getByRole('button', { name: 'เดินไปแพทยศาสตร์' }))
    const d = doorTile(placementOf('med'))
    expect(walker).toHaveBeenCalledWith(d.x, d.y)
    expect(onClose).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'ดูเส้นทางเข้าวิศวกรรมศาสตร์' }))
    expect(ui.getState().openBuildingId).toBe('eng')
  })
})
