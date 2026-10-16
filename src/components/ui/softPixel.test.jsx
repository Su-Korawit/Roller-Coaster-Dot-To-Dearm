// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Button from './Button'
import Popup from './Popup'
import DragHandle from './DragHandle'
import SegmentedTabs from './SegmentedTabs'
import SelectCard from './SelectCard'
import SelectableRow from './SelectableRow'
import SearchBar from './SearchBar'
import Toggle from './Toggle'
import PanelHeader from './PanelHeader'
import StatBadge from './StatBadge'
import ProgressRing from './ProgressRing'
import NotificationBadge from './NotificationBadge'
import LoadingScene from './LoadingScene'
import StepScreen from './StepScreen'
import Avatar from './Avatar'

const cls = (el) => el.className.toString()

describe('Soft Pixel primitives', () => {
  it('Button primary is an ink px-btn with white text', () => {
    render(<Button>Go</Button>)
    const c = cls(screen.getByRole('button'))
    expect(c).toContain('px-btn')
    expect(c).toContain('bg-ink')
    expect(c).toContain('text-white')
  })

  it('Button secondary is a paper px-btn', () => {
    render(<Button variant="secondary">Back</Button>)
    const c = cls(screen.getByRole('button'))
    expect(c).toContain('px-btn')
    expect(c).toContain('bg-paper')
    expect(c).toContain('text-ink')
  })

  it('Popup sheet uses px-sheet and an ink backdrop', () => {
    const { container } = render(<Popup onClose={() => {}}>x</Popup>)
    expect(container.querySelector('.px-sheet')).toBeTruthy()
    expect(container.querySelector('.bg-ink\\/40')).toBeTruthy()
  })

  it('Popup center variant uses px-card', () => {
    const { container } = render(<Popup variant="center" onClose={() => {}}>x</Popup>)
    expect(container.querySelector('.px-card')).toBeTruthy()
  })

  it('DragHandle bar uses the soft line colour', () => {
    const { container } = render(<DragHandle />)
    expect(container.querySelector('.bg-line-soft')).toBeTruthy()
  })

  it('SegmentedTabs selects with an ink pill', () => {
    render(<SegmentedTabs tabs={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} activeId="a" onChange={() => {}} />)
    const [a, b] = screen.getAllByRole('tab')
    expect(cls(a)).toContain('bg-ink')
    expect(cls(a)).toContain('text-white')
    expect(cls(a)).toContain('rounded-ui')
    expect(cls(b)).toContain('text-ink-soft')
  })

  it('SelectCard shows the selected state with a line border and px shadow', () => {
    render(<SelectCard name="n" selected onClick={() => {}} />)
    const c = cls(screen.getByRole('option'))
    expect(c).toContain('border-line')
    expect(c).toContain('bg-brand-soft')
    expect(c).toContain('shadow-px-sm')
    expect(c).toContain('rounded-slot')
  })

  it('SelectableRow uses slot radius and hairline when unselected', () => {
    render(<SelectableRow title="t" selected={false} onClick={() => {}} />)
    const c = cls(screen.getAllByRole('button')[0])
    expect(c).toContain('rounded-slot')
    expect(c).toContain('border-hairline')
  })

  it('SearchBar wrapper is a px-input', () => {
    const { container } = render(<SearchBar value="" onChange={() => {}} />)
    expect(container.firstChild.className).toContain('px-input')
  })

  it('Toggle track is hairline off and leaf on', () => {
    const { rerender } = render(<Toggle checked={false} onChange={() => {}} label="t" />)
    expect(cls(screen.getByRole('switch'))).toContain('bg-hairline')
    rerender(<Toggle checked onChange={() => {}} label="t" />)
    expect(cls(screen.getByRole('switch'))).toContain('bg-leaf')
  })

  it('PanelHeader uses the display font and a px-btn close button, no all-caps', () => {
    render(<PanelHeader title="Title" onClose={() => {}} />)
    const h = screen.getByRole('heading', { name: 'Title' })
    expect(cls(h)).toContain('font-display')
    expect(cls(h)).not.toContain('uppercase')
    expect(cls(screen.getByRole('button', { name: 'ปิด' }))).toContain('px-btn')
  })

  it('StatBadge neutral tone is a mist pill', () => {
    const { container } = render(<StatBadge icon="x" count={3} />)
    expect(container.firstChild.className).toContain('bg-mist')
  })

  it('ProgressRing track and fill use theme tokens', () => {
    const { container } = render(<ProgressRing value={1} total={2} />)
    const [track, fill] = container.querySelectorAll('circle')
    expect(track.getAttribute('stroke')).toBe('var(--color-hairline)')
    expect(fill.getAttribute('stroke')).toBe('var(--color-leaf)')
  })

  it('NotificationBadge uses the danger token', () => {
    const { container } = render(<NotificationBadge count={2} />)
    expect(container.firstChild.className).toContain('bg-danger')
  })

  it('LoadingScene card is a px-card with leaf blocks', () => {
    const { container } = render(<LoadingScene label="Loading" />)
    expect(container.querySelector('.px-card')).toBeTruthy()
    expect(container.querySelector('.bg-leaf')).toBeTruthy()
  })

  it('StepScreen uses px-card header and a paper footer', () => {
    const { container } = render(
      <StepScreen title="T" onNext={() => {}} onBack={() => {}}>c</StepScreen>,
    )
    expect(container.querySelector('.px-card')).toBeTruthy()
    expect(container.querySelector('.bg-paper.border-line')).toBeTruthy()
    expect(cls(container.querySelector('h1'))).toContain('font-display')
  })

  it('Avatar fallback uses the brand-soft tint', () => {
    const { container } = render(<Avatar />)
    expect(container.firstChild.className).toContain('bg-brand-soft')
  })

  it('no primitive leaks legacy or off-theme classes', () => {
    const { container } = render(
      <div>
        <Button>a</Button>
        <Button variant="secondary">b</Button>
        <Popup onClose={() => {}}>x</Popup>
        <DragHandle />
        <SegmentedTabs tabs={[{ id: 'a', label: 'A', badge: 2 }]} activeId="a" onChange={() => {}} />
        <SelectCard name="n" selected={false} onClick={() => {}} />
        <SelectableRow title="t" selected onClick={() => {}} />
        <SearchBar value="" onChange={() => {}} />
        <Toggle checked={false} onChange={() => {}} label="t" />
        <PanelHeader title="T" onClose={() => {}} />
        <StatBadge icon="x" count={1} tone="fire" />
        <ProgressRing value={1} total={2} />
        <NotificationBadge count={1} />
        <LoadingScene />
        <StepScreen title="T" onNext={() => {}} onBack={() => {}}>c</StepScreen>
        <Avatar />
      </div>,
    )
    const html = container.innerHTML
    for (const banned of ['neo-', 'rpg-btn-primary', 'bg-gray-', 'bg-black', 'bg-red-500', 'bg-purple-']) {
      expect(html, banned).not.toContain(banned)
    }
  })
})
