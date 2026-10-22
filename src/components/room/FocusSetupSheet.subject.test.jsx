// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({ startFocus: vi.fn() }))
vi.mock('../../services/focus', () => ({
  startFocus: (...a) => m.startFocus(...a), checkInFocus: vi.fn(), endFocus: vi.fn(), abandonFocus: vi.fn(), CHECKIN_PROMPT_MS: 1500000,
}))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: FocusSetupSheet } = await import('./FocusSetupSheet')
const { useRoomUiStore } = await import('../../stores/useRoomUiStore')
const { useFocusStore } = await import('../../stores/useFocusStore')

beforeEach(() => {
  vi.clearAllMocks()
  useFocusStore.getState().reset()
  useRoomUiStore.getState().close()
  m.startFocus.mockResolvedValue({ ok: true, mode: 'flexible', plannedMin: 25, startedAt: 1, lastCheckInAt: 1, verifiedMs: 0 })
})

describe('FocusSetupSheet with a subject from the Plan', () => {
  it('shows the subject and starts the session for it', async () => {
    useRoomUiStore.getState().open('focus', { subjectKey: 'a_lv_64' })
    render(<FocusSetupSheet onClose={() => {}} />)
    expect(screen.getByText('วิชา: A-Level ฟิสิกส์')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    await waitFor(() => expect(m.startFocus).toHaveBeenCalled())
    expect(m.startFocus.mock.calls[0][0]).toMatchObject({ mode: 'flexible', plannedMin: 25, subjectKey: 'a_lv_64' })
  })

  it('the subject can be removed before starting', async () => {
    useRoomUiStore.getState().open('focus', { subjectKey: 'a_lv_64' })
    render(<FocusSetupSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'ไม่ระบุวิชา' }))
    expect(screen.queryByText('วิชา: A-Level ฟิสิกส์')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    await waitFor(() => expect(m.startFocus).toHaveBeenCalled())
    expect(m.startFocus.mock.calls[0][0].subjectKey).toBeUndefined()
  })

  it('without a payload there is no subject chip and no subject is sent', async () => {
    render(<FocusSetupSheet onClose={() => {}} />)
    expect(screen.queryByText(/^วิชา:/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    await waitFor(() => expect(m.startFocus).toHaveBeenCalled())
    expect(m.startFocus.mock.calls[0][0].subjectKey).toBeUndefined()
  })

  it('ignores a payload key that is not an exam subject', () => {
    useRoomUiStore.getState().open('focus', { subjectKey: 'gpax' })
    render(<FocusSetupSheet onClose={() => {}} />)
    expect(screen.queryByText(/^วิชา:/)).toBeNull()
  })
})
