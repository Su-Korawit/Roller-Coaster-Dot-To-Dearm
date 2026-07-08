// @vitest-environment jsdom
// Real-store render guard against unstable-selector infinite loops (e1d67fe).
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../lib/db', () => ({
  cols: {}, refs: {},
  queries: { latestTemplates: () => ({}), templatesBySchool: () => ({}) },
}))
vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  addDoc: vi.fn(), deleteDoc: vi.fn(), serverTimestamp: () => null,
}))
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: Object.assign((sel) => sel({ user: { uid: 'me' } }), {
    getState: () => ({ user: { uid: 'me' } }),
  }),
}))
vi.mock('../ui/Popup', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

const { default: TimetableTemplateSheet } = await import('./TimetableTemplateSheet')
const { useTimetableTemplatesStore } = await import('../../stores/useTimetableTemplatesStore')

describe('TimetableTemplateSheet against the real templates store', () => {
  it('renders templates without an infinite getSnapshot loop', () => {
    useTimetableTemplatesStore.setState({
      templates: [{ id: 't1', version: 1, name: 'ม.5/1', schoolName: 'ส.ก.', classLevel: 'ม.5', createdBy: 'x', subjects: [] }],
      loading: false,
    })
    render(<TimetableTemplateSheet onClose={() => {}} />)
    expect(screen.getByText('ม.5/1')).toBeTruthy()
  })
})
