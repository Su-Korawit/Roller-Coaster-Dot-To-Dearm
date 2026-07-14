// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const m = vi.hoisted(() => ({ getDocs: vi.fn() }))
vi.mock('firebase/firestore', () => ({ getDocs: (...a) => m.getDocs(...a) }))
vi.mock('../lib/db', () => ({ queries: { sheetByShareId: (id) => ({ _shareId: id }) } }))
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }) => <div data-testid="reactflow-stub">{children}</div>,
  Background: () => null,
  Controls: () => null,
}))
vi.mock('../components/roadmap/nodeTypes', () => ({ nodeTypes: {} }))
vi.mock('../components/roadmap/AnnotationEdge', () => ({ default: () => null }))
vi.mock('../components/roadmap/InvisibleEdge', () => ({ default: () => null }))

const { default: RoadmapPublicView } = await import('./RoadmapPublicView')

function renderAt(shareId) {
  return render(
    <MemoryRouter initialEntries={[`/view/${shareId}`]}>
      <Routes>
        <Route path="/view/:shareId" element={<RoadmapPublicView />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoadmapPublicView', () => {
  beforeEach(() => m.getDocs.mockReset())

  it('shows a not-found state when no public sheet matches the shareId', async () => {
    m.getDocs.mockResolvedValue({ docs: [] })
    renderAt('missing')
    await waitFor(() => expect(screen.getByText(/isn't public/i)).toBeTruthy())
  })

  it('renders the sheet name and a View only badge for a matching public sheet', async () => {
    m.getDocs.mockResolvedValue({ docs: [{ data: () => ({ name: 'My Plan', nodes: [], edges: [] }) }] })
    renderAt('share-abc')
    await waitFor(() => expect(screen.getByText('My Plan')).toBeTruthy())
    expect(screen.getByText('View only')).toBeTruthy()
  })
})
