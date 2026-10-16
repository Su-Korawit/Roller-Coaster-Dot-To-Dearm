// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { resetStore, fakeStoreHook, summary, renderAt } from './testUtils'

vi.mock('../../stores/useArticlesStore', () => ({ useArticlesStore: (sel) => fakeStoreHook(sel) }))
vi.mock('../../components/landing/SiteFooter', () => ({ default: () => <footer /> }))

const { default: SearchPage } = await import('./SearchPage')
const show = (q = '') =>
  renderAt(`/search${q ? `?q=${encodeURIComponent(q)}` : ''}`, [['/search', <SearchPage key="s" />]], render)

beforeEach(() => {
  resetStore({
    summaries: [
      summary('med', { title: 'แพทย์ จุฬาฯ ทุกโครงการ', tags: ['แพทย์'] }),
      summary('eng', { title: 'วิศวะ ม.ตัวอย่าง' }),
    ],
  })
})

describe('SearchPage', () => {
  it('shows a hint when there is no query', () => {
    show()
    expect(screen.getByText(/พิมพ์ชื่อคณะ/)).toBeTruthy()
  })

  it('filters results from the query string', () => {
    show('แพทย์')
    expect(screen.getByRole('link', { name: /แพทย์ จุฬาฯ/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /วิศวะ/ })).toBeNull()
  })

  it('updates results as the user types', () => {
    show()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'วิศวะ' } })
    expect(screen.getByRole('link', { name: /วิศวะ ม.ตัวอย่าง/ })).toBeTruthy()
  })

  it('offers faculty search when nothing matches', () => {
    show('ไม่มีแน่นอน')
    expect(screen.getByText('ไม่พบบทความ')).toBeTruthy()
    expect(screen.getByRole('link', { name: /ค้นหาคณะ/ }).getAttribute('href')).toContain('tcas')
  })
})
