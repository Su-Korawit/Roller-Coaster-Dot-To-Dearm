// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { storeState, resetStore, fakeStoreHook, summary, renderAt } from './testUtils'

vi.mock('../../stores/useArticlesStore', () => ({ useArticlesStore: (sel) => fakeStoreHook(sel) }))
vi.mock('../../components/landing/SiteFooter', () => ({ default: () => <footer data-testid="footer" /> }))

const { default: HubHome } = await import('./HubHome')
const show = () => renderAt('/', [['/', <HubHome key="h" />]], render)

beforeEach(() => resetStore())

describe('HubHome banner', () => {
  it('shows the headline, the app link with banner UTM, and a search field', () => {
    show()
    expect(screen.getAllByText(/วางแผนสอบติดมหาลัย/).length).toBeGreaterThan(0)
    const app = screen.getAllByRole('link', { name: 'เข้าสู่แอป' })
    expect(app.some((a) => a.getAttribute('href').startsWith('https://app.ilovetcas.com/') && a.getAttribute('href').includes('utm_medium=banner'))).toBe(true)
    expect(screen.getByRole('searchbox')).toBeTruthy()
  })

  it('hides the Open House button until it is enabled in the hub config', () => {
    const { unmount } = show()
    expect(screen.queryByRole('link', { name: /Open House/ })).toBeNull()
    unmount()
    resetStore({ config: { openHouseEnabled: true } })
    show()
    expect(screen.getByRole('link', { name: /Open House/ }).getAttribute('href')).toBe('/openhouse')
  })

  it('loads the home data once on mount', () => {
    show()
    expect(storeState.loadHome).toHaveBeenCalledTimes(1)
  })
})

describe('HubHome content', () => {
  it('renders a row per category that has articles and hides empty ones', () => {
    resetStore({
      summaries: [summary('f', { publishedAt: '2026-10-09T00:00:00.000Z' }), summary('n1'), summary('g1', { category: 'guide' })],
    })
    show()
    expect(screen.getByRole('heading', { name: 'ข่าว TCAS' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'แนะแนวเลือกคณะ' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'ค่ายและกิจกรรม' })).toBeNull()
    expect(screen.getByRole('link', { name: /บทความ n1/ }).getAttribute('href')).toBe('/blog/n1')
  })

  it('features the configured article, falling back to the newest', () => {
    resetStore({
      summaries: [
        summary('new', { publishedAt: '2026-10-09T00:00:00.000Z' }),
        summary('picked', { publishedAt: '2026-01-01T00:00:00.000Z' }),
      ],
      config: { featuredSlug: 'picked' },
    })
    const { unmount } = show()
    const featured = screen.getByTestId('featured-article')
    expect(within(featured).getByRole('link', { name: /บทความ picked/ })).toBeTruthy()
    unmount()
    resetStore({ summaries: [summary('new', { publishedAt: '2026-10-09T00:00:00.000Z' }), summary('old', { publishedAt: '2026-01-01T00:00:00.000Z' })] })
    show()
    expect(within(screen.getByTestId('featured-article')).getByRole('link', { name: /บทความ new/ })).toBeTruthy()
  })

  it('shows the OpenChat band only when a valid https link is configured', () => {
    const { unmount } = show()
    expect(screen.queryByTestId('openchat-band')).toBeNull()
    unmount()
    resetStore({ config: { lineOpenChatUrl: 'http://line.me/insecure' } })
    const second = show()
    expect(screen.queryByTestId('openchat-band')).toBeNull()
    second.unmount()
    resetStore({ config: { lineOpenChatUrl: 'https://line.me/ti/g2/abc', lineRules: 'ห้ามโฆษณา', lineModerators: 'พี่มายด์' } })
    show()
    const band = screen.getByTestId('openchat-band')
    const join = within(band).getByRole('link')
    expect(join.getAttribute('href')).toContain('https://line.me/ti/g2/abc')
    expect(join.getAttribute('href')).toContain('utm_medium=band')
    expect(within(band).getByText(/ห้ามโฆษณา/)).toBeTruthy()
    expect(within(band).getByText(/พี่มายด์/)).toBeTruthy()
  })

  it('lists the four free tools', () => {
    show()
    const strip = screen.getByTestId('tools-strip')
    expect(within(strip).getAllByRole('link')).toHaveLength(4)
  })

  it('still renders the banner and tools when loading failed', () => {
    resetStore({ error: new Error('offline') })
    show()
    expect(screen.getAllByRole('link', { name: 'เข้าสู่แอป' }).length).toBeGreaterThan(0)
    expect(screen.getByTestId('tools-strip')).toBeTruthy()
  })
})
