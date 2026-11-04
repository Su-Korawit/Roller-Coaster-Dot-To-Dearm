// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PublishChecklist from './PublishChecklist'
import { validateDraftForPublish } from '../../content/validatePublish'
import fixtures from '../../content/publishFixtures.json'

describe('PublishChecklist', () => {
  it('renders nothing when there are no problems', () => {
    const { container } = render(<PublishChecklist errors={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('explains a missing excerpt in Thai', () => {
    render(<PublishChecklist errors={[{ field: 'excerpt', code: 'required' }]} />)
    expect(screen.getByText('ใส่คำโปรยก่อนเผยแพร่')).toBeTruthy()
  })

  it('lists every problem', () => {
    render(
      <PublishChecklist
        errors={[
          { field: 'title', code: 'required' },
          { field: 'coverUrl', code: 'required' },
          { field: 'body', code: 'empty_body' },
        ]}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('has a Thai message for every error the validator can produce', () => {
    const seen = new Set()
    for (const f of fixtures) {
      const draft = { ...f.draft, body: f.draft.body === '__LARGE__' ? 'x'.repeat(716801) : f.draft.body }
      for (const e of validateDraftForPublish(draft).errors) seen.add(`${e.field}:${e.code}`)
    }
    expect(seen.size).toBeGreaterThan(5)
    for (const key of seen) {
      const [field, code] = key.split(':')
      const { container, unmount } = render(<PublishChecklist errors={[{ field, code }]} />)
      expect(container.textContent, key).not.toContain(key)
      unmount()
    }
  })

  it('falls back to the raw key for an unknown error instead of hiding it', () => {
    render(<PublishChecklist errors={[{ field: 'mystery', code: 'odd' }]} />)
    expect(screen.getByText('mystery:odd')).toBeTruthy()
  })
})
