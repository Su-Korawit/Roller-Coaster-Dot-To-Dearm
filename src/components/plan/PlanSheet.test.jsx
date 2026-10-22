// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

const ent = vi.hoisted(() => ({ extra: 0 }))
vi.mock('../../stores/useEntitlementsStore', () => ({
  useEntitlementsStore: { getState: () => ({ extraPlanSlots: () => ent.extra }) },
}))
let eventsState
vi.mock('../../stores/useTcasEventsStore', () => ({
  useTcasEventsStore: Object.assign((sel) => sel(eventsState), { getState: () => eventsState }),
}))
vi.mock('../../services/focus', () => ({
  startFocus: vi.fn(), checkInFocus: vi.fn(), endFocus: vi.fn(), abandonFocus: vi.fn(), CHECKIN_PROMPT_MS: 1500000,
}))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: PlanSheet } = await import('./PlanSheet')
const { usePlansStore } = await import('../../stores/usePlansStore')
const { useLeavesStore } = await import('../../stores/useLeavesStore')
const { useRoomUiStore } = await import('../../stores/useRoomUiStore')
const { useFocusStore } = await import('../../stores/useFocusStore')

const tpat1 = { key: 'tpat1', label: 'TPAT1 วิชาเฉพาะกสพท', weight: 30 }
const bio = { key: 'a_lv_66', label: 'A-Level ชีววิทยา', weight: 70 }
const chem = { key: 'a_lv_65', label: 'A-Level เคมี', weight: 30 }
const add = (n, over = {}) => usePlansStore.getState().addFromProgram({
  universityId: `u${n}`, universityName: `มหาวิทยาลัย ${n}`, programId: `p${n}`, programName: `หลักสูตร ${n}`,
  buildingId: 'med', round: 3, minGpax: 2.5, scores: [tpat1, bio], ...over,
})

const EVENTS = [
  { id: 'tgat', date: '2027-01-30', title: 'สอบ TGAT', kind: 'exam', examKeys: ['tgat', 'tpat1'] },
  { id: 'r3', date: '2027-05-07', title: 'รอบ 3 Admission เริ่มรับสมัคร', round: 3, kind: 'apply' },
]

beforeEach(() => {
  ent.extra = 10
  eventsState = { events: EVENTS }
  usePlansStore.getState().resetPlans()
  useLeavesStore.getState().reset()
  useRoomUiStore.getState().close()
  useFocusStore.getState().reset()
})

const renderSheet = (today = '2027-01-20') => render(<PlanSheet onClose={() => {}} today={today} />)

describe('PlanSheet — empty', () => {
  it('invites the student to add programs from the campus', () => {
    renderSheet()
    expect(screen.getByText('แผน TCAS70 ของฉัน')).toBeTruthy()
    expect(screen.getByText(/เพิ่มหลักสูตรจากตึกคณะในแคมปัส/)).toBeTruthy()
    expect(screen.queryByText('ต้องทำต่อไป')).toBeNull()
    expect(screen.queryByText('วิชาที่ต้องสอบ')).toBeNull()
  })
})

describe('PlanSheet — a plan', () => {
  beforeEach(() => {
    add(1, { programName: 'แพทย์ มหิดล' })
    add(2, { programName: 'แพทย์ จุฬาฯ' })
    add(3, { programName: 'เภสัช เชียงใหม่', scores: [chem, bio] })
    add(4, { programName: 'พยาบาล', round: 1, scores: [] })
  })

  it('counts down to the next milestone in the header', () => {
    renderSheet()
    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByText(/วัน ถึง สอบ TGAT/)).toBeTruthy()
  })

  it('shows what to do next with its date, the entries it touches and their checklist', () => {
    renderSheet()
    const next = screen.getByRole('region', { name: 'ต้องทำต่อไป' })
    expect(within(next).getByText('30 ม.ค. (อีก 10 วัน)')).toBeTruthy()
    expect(within(next).getByText('สอบ TGAT')).toBeTruthy()
    expect(within(next).getByText(/แพทย์ มหิดล/)).toBeTruthy()
    expect(within(next).getByRole('checkbox', { name: 'GPAX ≥ 2.5' })).toBeTruthy()
  })

  it('ticking a checklist item in the next-up card saves it and moves the progress', () => {
    renderSheet()
    const next = screen.getByRole('region', { name: 'ต้องทำต่อไป' })
    fireEvent.click(within(next).getByRole('checkbox', { name: 'GPAX ≥ 2.5' }))
    expect(usePlansStore.getState().plans[0].checklist.find((c) => c.id === 'auto:gpax').done).toBe(true)
    expect(within(next).getByRole('progressbar').getAttribute('aria-valuenow')).not.toBe('0')
  })

  it('lists round 3 by rank with the score chips', () => {
    renderSheet()
    const list = screen.getByRole('list', { name: 'รอบ 3 Admission' })
    const names = within(list).getAllByRole('listitem').map((li) => li.getAttribute('data-name'))
    expect(names).toEqual(['แพทย์ มหิดล', 'แพทย์ จุฬาฯ', 'เภสัช เชียงใหม่'])
    expect(within(list).getAllByText('1')[0]).toBeTruthy()
    expect(within(list).getAllByText('A-Level ชีววิทยา 70%').length).toBe(3)
  })

  it('the round filter narrows the lists', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('tab', { name: 'รอบ 1' }))
    expect(screen.getByText('พยาบาล')).toBeTruthy()
    expect(screen.queryByText('แพทย์ มหิดล')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'ทั้งหมด' }))
    expect(screen.getByText('แพทย์ มหิดล')).toBeTruthy()
  })

  it('an entry can be opened to move its round, add its own to-do or be removed', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'เปิดรายละเอียด แพทย์ จุฬาฯ' }))
    fireEvent.change(screen.getByLabelText('เพิ่มสิ่งที่ต้องทำ'), { target: { value: 'ถ่ายเอกสาร' } })
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))
    expect(usePlansStore.getState().plans[1].checklist.some((c) => c.text === 'ถ่ายเอกสาร' && c.source === 'user')).toBe(true)
    fireEvent.change(screen.getByLabelText('ย้ายไปรอบ'), { target: { value: '2' } })
    expect(usePlansStore.getState().plans[1]).toMatchObject({ round: 2, rank: null })
    expect(usePlansStore.getState().plans[2].rank).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'เอาออกจากแผน' }))
    expect(usePlansStore.getState().plans.map((p) => p.programName)).not.toContain('แพทย์ จุฬาฯ')
  })

  it('combines the subjects of every program, most used first, with hours and goal', () => {
    useLeavesStore.setState({ focusBySubject: { a_lv_66: 12 * 3600000 } })
    renderSheet()
    const subj = screen.getByRole('region', { name: 'วิชาที่ต้องสอบ' })
    const rows = within(subj).getAllByRole('listitem')
    expect(rows[0].textContent).toContain('A-Level ชีววิทยา')
    expect(rows[0].textContent).toContain('ใช้ใน 3 หลักสูตร, 12 / 60 ชม.')
    expect(within(rows[0]).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('20')
    expect(rows.map((r) => r.getAttribute('data-key'))).toEqual(['a_lv_66', 'tpat1', 'a_lv_65'])
  })

  it('อ่าน opens the focus sheet for that subject', () => {
    renderSheet()
    const subj = screen.getByRole('region', { name: 'วิชาที่ต้องสอบ' })
    fireEvent.click(within(subj).getByRole('button', { name: 'อ่าน A-Level ชีววิทยา' }))
    expect(useRoomUiStore.getState()).toMatchObject({ sheet: 'focus', payload: { subjectKey: 'a_lv_66' } })
  })

  it('อ่าน waits while another focus session is running', () => {
    useFocusStore.setState({ status: 'running' })
    renderSheet()
    const subj = screen.getByRole('region', { name: 'วิชาที่ต้องสอบ' })
    expect(within(subj).getByRole('button', { name: 'อ่าน A-Level ชีววิทยา' }).disabled).toBe(true)
    expect(screen.getByText(/จบโฟกัสที่กำลังทำอยู่ก่อน/)).toBeTruthy()
  })

  it('the goal can be changed in steps and is saved for that subject only', () => {
    renderSheet()
    const subj = screen.getByRole('region', { name: 'วิชาที่ต้องสอบ' })
    fireEvent.click(within(subj).getByRole('button', { name: 'เพิ่มเป้า A-Level ชีววิทยา' }))
    expect(usePlansStore.getState().goalHours).toEqual({ a_lv_66: 65 })
    fireEvent.click(within(subj).getByRole('button', { name: 'ลดเป้า A-Level ชีววิทยา' }))
    fireEvent.click(within(subj).getByRole('button', { name: 'ลดเป้า A-Level ชีววิทยา' }))
    expect(usePlansStore.getState().goalHours).toEqual({ a_lv_66: 55 })
  })

  it('shows the total studied against the total goal', () => {
    useLeavesStore.setState({ focusBySubject: { a_lv_66: 10 * 3600000, tpat1: 5 * 3600000 } })
    renderSheet()
    expect(screen.getByText(/อ่านแล้ว 15 ชม. จากเป้า/)).toBeTruthy()
  })
})

describe('PlanSheet — entries from onboarding', () => {
  it('shows a program picked in onboarding (no round yet) with its name, so it is not hidden while it still uses a slot', () => {
    const id = usePlansStore.getState().addPlan()
    usePlansStore.getState().updatePlan(id, { university: 'cu', program: 'ce-cu' })
    renderSheet()
    expect(screen.queryByText(/ยังไม่มีหลักสูตรในแผน/)).toBeNull()
    expect(screen.getByText('ยังไม่เลือกรอบ')).toBeTruthy()
    expect(screen.getByText('วิศวกรรมคอมพิวเตอร์')).toBeTruthy()
    expect(screen.getByText('จุฬาลงกรณ์มหาวิทยาลัย')).toBeTruthy()
  })

  it('an empty slot (no program yet) is not listed', () => {
    usePlansStore.getState().addPlan()
    renderSheet()
    expect(screen.getByText(/ยังไม่มีหลักสูตรในแผน/)).toBeTruthy()
  })

  it('such a program can be given a round from the plan', () => {
    const id = usePlansStore.getState().addPlan()
    usePlansStore.getState().updatePlan(id, { university: 'cu', program: 'ce-cu' })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'เปิดรายละเอียด วิศวกรรมคอมพิวเตอร์' }))
    fireEvent.change(screen.getByLabelText('ย้ายไปรอบ'), { target: { value: '3' } })
    expect(usePlansStore.getState().plans[0]).toMatchObject({ round: 3, rank: 1 })
  })
})

describe('PlanSheet — no invented dates', () => {
  it('shows no countdown and no next-up card when the calendar has nothing for the plan', () => {
    eventsState = { events: [{ id: 'x', date: '2027-03-01', title: 'ไม่เกี่ยว', round: 2 }] }
    add(1)
    renderSheet()
    expect(screen.queryByRole('region', { name: 'ต้องทำต่อไป' })).toBeNull()
    expect(screen.queryByText(/วัน ถึง/)).toBeNull()
  })

  it('keeps working when the admin calendar exists but carries no plan tags (built-in rows are used too)', () => {
    eventsState = { events: [{ id: 'x', date: '2027-03-01', title: 'ข่าวทั่วไป' }] }
    add(1)
    renderSheet('2027-01-20')
    expect(screen.getByRole('region', { name: 'ต้องทำต่อไป' })).toBeTruthy()
  })

  it('falls back to the built-in TCAS70 calendar when no events are stored', () => {
    eventsState = { events: [] }
    add(1)
    renderSheet('2027-01-20')
    expect(screen.getByRole('region', { name: 'ต้องทำต่อไป' })).toBeTruthy()
  })
})
