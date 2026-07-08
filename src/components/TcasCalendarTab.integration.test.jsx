// @vitest-environment jsdom
// Real-store render guard against unstable-selector infinite loops (see
// SubjectDetailPanel fix e1d67fe). Firestore listener attach is mocked away;
// the Zustand stores themselves are real.
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/firestoreListener', () => ({
  createFirestoreListener: () => ({ attach: () => () => {} }),
}))
vi.mock('../lib/db', () => ({
  cols: {}, refs: {}, queries: { tcasEventsByDate: () => ({}) },
}))
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(), deleteDoc: vi.fn(), serverTimestamp: () => null,
}))
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel({ user: { uid: 'student-1' } }),
}))

const { default: TcasCalendarTab } = await import('./TcasCalendarTab')
const { useTcasEventsStore } = await import('../stores/useTcasEventsStore')

describe('TcasCalendarTab against the real events store', () => {
  it('renders events without an infinite getSnapshot loop', () => {
    useTcasEventsStore.setState({
      events: [
        { id: 'e1', title: 'ลงทะเบียน myTCAS', description: 'x', date: '2026-07-15', link: null },
      ],
    })
    render(<TcasCalendarTab today="2026-07-08" />)
    expect(screen.getByText('ลงทะเบียน myTCAS')).toBeTruthy()
  })
})
