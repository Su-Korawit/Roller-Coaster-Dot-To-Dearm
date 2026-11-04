// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

const m = vi.hoisted(() => ({ fetchBuilding: vi.fn(), fetchIndex: vi.fn() }))
vi.mock('../../services/openHouseClient', () => ({ fetchBuilding: (...a) => m.fetchBuilding(...a), fetchIndex: (...a) => m.fetchIndex(...a) }))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: FacultyPopup } = await import('./FacultyPopup')
const { useOpenHouseStore } = await import('../../stores/useOpenHouseStore')
const { usePlanUiStore } = await import('../../stores/usePlanUiStore')

const project = (over = {}) => ({ nameTh: 'โครงการ A', seats: 10, minGpax: 3.5, scores: [{ key: 'tgat', label: 'TGAT', weight: 60 }], interview: true, link: 'https://example.com/p', ...over })
const prog = (id, name, rounds, costText = '30,000/ภาค') => ({ programId: id, nameTh: name, typeTh: 'ปกติ', costText, rounds })
const uni = (id, nameTh, typeTh, programs) => ({ id, nameTh, typeTh, logoUrl: '', programs })

const data = {
  tcasYear: 70,
  updatedAt: '2026-10-16T00:00:00Z',
  universities: [
    uni('cu', 'จุฬาลงกรณ์มหาวิทยาลัย', 'ทปอ.', [prog('p1', 'แพทยศาสตรบัณฑิต', [{ round: 1, seats: 24, projects: [project({ seats: 24 })] }, { round: 2, seats: 8, projects: [project({ nameTh: 'โควตา', seats: 8 })] }])]),
    uni('mu', 'มหาวิทยาลัยมหิดล', 'ทปอ.', [prog('p2', 'แพทยศาสตรบัณฑิต มหิดล', [{ round: 1, seats: 40, projects: [project({ seats: 40 })] }]), prog('p3', 'สาธารณสุข', [{ round: 1, seats: 5, projects: [project({ seats: 5 })] }])]),
    uni('rj', 'มหาวิทยาลัยราชภัฏ', 'ราชภัฏ', [prog('p4', 'พยาบาล', [{ round: 2, seats: 12, projects: [project({ seats: 12 })] }])]),
  ],
}

const ready = (over = {}) => useOpenHouseStore.setState({ buildings: { med: { status: 'ready', data: { ...data, ...over }, error: null, ticket: 1 } } })
const open = (onClose = () => {}) => render(<FacultyPopup buildingId="med" onClose={onClose} />)

beforeEach(() => {
  vi.clearAllMocks()
  useOpenHouseStore.getState().reset()
  usePlanUiStore.setState({ adding: null })
  m.fetchBuilding.mockResolvedValue({ ok: true, data })
})

describe('FacultyPopup', () => {
  it('shows the header, totals, the rounds and starts on the first announced round', () => {
    ready()
    open()
    expect(screen.getByRole('dialog', { name: 'แพทยศาสตร์' })).toBeTruthy()
    expect(screen.getByText('3 มหาลัย · 4 หลักสูตร · โซนสุขภาพ')).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Portfolio/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    // rounds 3 and 4 are greyed but selectable
    expect(within(screen.getByRole('tab', { name: /Admission/ })).getByText('ยังไม่ประกาศ')).toBeTruthy()
    // round 1 has CU (24) and MU (40+5)
    const list = screen.getByRole('list', { name: 'มหาวิทยาลัย' })
    expect(within(list).getAllByRole('button', { expanded: false })).toHaveLength(2)
    expect(screen.getByText('ข้อมูลจาก MyTCAS อัปเดต', { exact: false })).toBeTruthy()
  })

  it('sorts by seats by default and switching round changes the rows', () => {
    ready()
    open()
    const names = () => within(screen.getByRole('list', { name: 'มหาวิทยาลัย' })).getAllByRole('button').map((b) => b.textContent)
    expect(names()[0]).toContain('มหาวิทยาลัยมหิดล')
    fireEvent.click(screen.getByRole('tab', { name: /Quota/ }))
    expect(names().some((n) => n.includes('ราชภัฏ'))).toBe(true)
  })

  it('selecting a round nobody announced shows the waiting message, not an empty list', () => {
    ready()
    open()
    fireEvent.click(screen.getByRole('tab', { name: /Direct/ }))
    expect(screen.getByText('รอบ 4 ยังไม่ประกาศ')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'มหาวิทยาลัย' })).toBeNull()
  })

  it('search is literal (Thai and regex characters), and a miss offers to clear the filters', () => {
    ready()
    open()
    fireEvent.change(screen.getByLabelText('ค้นหามหาลัยหรือหลักสูตร'), { target: { value: 'จุฬา' } })
    expect(screen.getByText('จุฬาลงกรณ์มหาวิทยาลัย')).toBeTruthy()
    expect(screen.queryByText('มหาวิทยาลัยมหิดล')).toBeNull()
    fireEvent.change(screen.getByLabelText('ค้นหามหาลัยหรือหลักสูตร'), { target: { value: '(.*[' } })
    expect(screen.getByText('ไม่พบมหาลัยหรือหลักสูตรที่ค้นหา')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }))
    expect(screen.getByText('มหาวิทยาลัยมหิดล')).toBeTruthy()
  })

  it('type chips narrow the list and ทั้งหมด clears them', () => {
    ready()
    open()
    fireEvent.click(screen.getByRole('tab', { name: /Quota/ }))
    fireEvent.click(screen.getByRole('button', { name: 'ราชภัฏ' }))
    expect(screen.queryByText('จุฬาลงกรณ์มหาวิทยาลัย')).toBeNull()
    expect(screen.getByText('มหาวิทยาลัยราชภัฏ')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ทั้งหมด' }))
    expect(screen.getByText('จุฬาลงกรณ์มหาวิทยาลัย')).toBeTruthy()
  })

  it('opening a row shows programs and projects of the round with MyTCAS link and cost', () => {
    ready()
    open()
    fireEvent.click(screen.getByRole('button', { name: /มหาวิทยาลัยมหิดล/ }))
    const sec = screen.getByRole('region', { name: 'แพทยศาสตรบัณฑิต มหิดล' })
    expect(within(sec).getByText('โครงการ A')).toBeTruthy()
    expect(within(sec).getByText('3.50')).toBeTruthy()
    expect(within(sec).getByRole('link', { name: 'เปิดใน MyTCAS' }).getAttribute('href')).toBe('https://example.com/p')
    expect(within(sec).getByText('30,000/ภาค')).toBeTruthy()
    // opening another row closes the first
    fireEvent.click(screen.getByRole('button', { name: /จุฬาลงกรณ์/ }))
    expect(screen.queryByRole('region', { name: 'แพทยศาสตรบัณฑิต มหิดล' })).toBeNull()
  })

  it('+ เพิ่มเข้าแผน hands the whole program, with all its rounds, to the Plan', () => {
    ready()
    open()
    fireEvent.click(screen.getByRole('button', { name: /จุฬาลงกรณ์/ }))
    fireEvent.click(screen.getByRole('button', { name: '+ เพิ่มเข้าแผน' }))
    const adding = usePlanUiStore.getState().adding
    expect(adding).toMatchObject({ universityId: 'cu', universityName: 'จุฬาลงกรณ์มหาวิทยาลัย', programId: 'p1', programName: 'แพทยศาสตรบัณฑิต', buildingId: 'med' })
    expect(adding.rounds.map((r) => r.round)).toEqual([1, 2])
    expect(adding.rounds[0].projects[0]).toMatchObject({ nameTh: 'โครงการ A', seats: 24, minGpax: 3.5 })
  })

  it('a long cost is clipped and expands', () => {
    const long = 'ค่าเทอม '.repeat(30)
    ready({ universities: [uni('cu', 'จุฬาลงกรณ์มหาวิทยาลัย', 'ทปอ.', [prog('p1', 'แพทย์', [{ round: 1, seats: 1, projects: [project()] }], long)])] })
    open()
    fireEvent.click(screen.getByRole('button', { name: /จุฬาลงกรณ์/ }))
    expect(screen.getByText('…', { exact: false })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ดูเพิ่ม' }))
    expect(screen.getByRole('button', { name: 'ย่อ' })).toBeTruthy()
  })

  it('a non-http MyTCAS link is not rendered', () => {
    ready({ universities: [uni('cu', 'จุฬาลงกรณ์มหาวิทยาลัย', 'ทปอ.', [prog('p1', 'แพทย์', [{ round: 1, seats: 1, projects: [project({ link: 'javascript:alert(1)' })] }])])] })
    open()
    fireEvent.click(screen.getByRole('button', { name: /จุฬาลงกรณ์/ }))
    expect(screen.queryByRole('link', { name: 'เปิดใน MyTCAS' })).toBeNull()
  })

  it('600 universities render a window first, and แสดงเพิ่ม extends it', () => {
    const many = Array.from({ length: 600 }, (_, i) => uni(`u${i}`, `มหาวิทยาลัย${i}`, 'ทปอ.', [prog(`p${i}`, 'แพทย์', [{ round: 1, seats: 1, projects: [project()] }])]))
    ready({ universities: many })
    open()
    const list = () => screen.getByRole('list', { name: 'มหาวิทยาลัย' })
    expect(within(list()).getAllByRole('button', { expanded: false })).toHaveLength(40)
    fireEvent.click(screen.getByRole('button', { name: /แสดงเพิ่ม/ }))
    expect(within(list()).getAllByRole('button', { expanded: false })).toHaveLength(80)
  })

  it('Esc and the close button call onClose', () => {
    ready()
    const onClose = vi.fn()
    open(onClose)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('shows loading, then the data (and asks the store to load the building)', async () => {
    open()
    expect(screen.getByText('กำลังโหลดข้อมูล…')).toBeTruthy()
    expect(m.fetchBuilding).toHaveBeenCalledWith('med')
    expect(await screen.findByRole('tab', { name: /Portfolio/ })).toBeTruthy()
  })

  it('a missing file says the building is updating, with no retry button', async () => {
    m.fetchBuilding.mockResolvedValue({ ok: false, error: 'missing' })
    open()
    expect(await screen.findByText('ข้อมูลตึกนี้กำลังอัปเดต ลองกลับมาใหม่ภายหลัง')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'ลองใหม่' })).toBeNull()
  })

  it('a network or corrupt failure offers a retry that loads again', async () => {
    m.fetchBuilding.mockResolvedValueOnce({ ok: false, error: 'network' })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'ลองใหม่' }))
    expect(await screen.findByRole('tab', { name: /Portfolio/ })).toBeTruthy()
    expect(m.fetchBuilding).toHaveBeenCalledTimes(2)
  })

  it('an unknown building renders nothing', () => {
    const { container } = render(<FacultyPopup buildingId="zzz" onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
