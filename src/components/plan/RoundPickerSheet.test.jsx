// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const ent = vi.hoisted(() => ({ extra: 0 }))
vi.mock('../../stores/useEntitlementsStore', () => ({
  useEntitlementsStore: { getState: () => ({ extraPlanSlots: () => ent.extra }) },
}))
let eventsState
vi.mock('../../stores/useTcasEventsStore', () => ({
  useTcasEventsStore: Object.assign((sel) => sel(eventsState), { getState: () => eventsState }),
}))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: RoundPickerSheet } = await import('./RoundPickerSheet')
const { usePlansStore } = await import('../../stores/usePlansStore')
const { useRoomUiStore } = await import('../../stores/useRoomUiStore')

const tpat1 = { key: 'tpat1', label: 'TPAT1 วิชาเฉพาะกสพท', weight: 30 }
const bio = { key: 'a_lv_66', label: 'A-Level ชีววิทยา', weight: 70 }
const program = {
  universityId: 'cu', universityName: 'จุฬาลงกรณ์มหาวิทยาลัย', programId: 'p-med', programName: 'แพทยศาสตรบัณฑิต', buildingId: 'med',
  rounds: [
    { round: 1, projects: [{ nameTh: 'Portfolio ทั่วไป', seats: 20, minGpax: 3, scores: [] }] },
    { round: 3, projects: [{ nameTh: 'Admission A', seats: 100, minGpax: 2.5, scores: [tpat1, bio] }, { nameTh: 'Admission B', seats: 30, minGpax: 3, scores: [bio] }] },
  ],
}

beforeEach(() => {
  ent.extra = 0
  eventsState = { events: [] }
  usePlansStore.getState().resetPlans()
  useRoomUiStore.getState().close()
})

const rowOf = (n) => screen.getByRole('radio', { name: new RegExp(`^รอบ ${n}`) })

describe('RoundPickerSheet', () => {
  it('names the program and lists the four rounds with their status', () => {
    render(<RoundPickerSheet program={program} onClose={() => {}} today="2027-01-01" />)
    expect(screen.getByText('แพทยศาสตรบัณฑิต')).toBeTruthy()
    expect(screen.getByText('จุฬาลงกรณ์มหาวิทยาลัย')).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(rowOf(2).textContent).toContain('ยังไม่ประกาศ')
    expect(rowOf(2).textContent).toContain('ตรวจเงื่อนไขพื้นที่ใน MyTCAS')
    expect(rowOf(4).textContent).toContain('ยังไม่ประกาศ')
    expect(rowOf(3).textContent).toContain('อันดับ 1 จาก 10')
  })

  it('proposes the next free round-3 rank', () => {
    usePlansStore.getState().addFromProgram({ ...program, programId: 'other', round: 3, scores: [] })
    render(<RoundPickerSheet program={program} onClose={() => {}} today="2027-01-01" />)
    expect(rowOf(3).textContent).toContain('อันดับ 2 จาก 10')
  })

  it('a round whose results are out is closed and cannot be picked', () => {
    eventsState = { events: [{ id: 'r1', round: 1, kind: 'announce', date: '2027-03-10', title: 'ประกาศผลรอบ 1' }] }
    render(<RoundPickerSheet program={program} onClose={() => {}} today="2027-03-11" />)
    expect(rowOf(1).textContent).toContain('ปิดรับแล้ว')
    expect(rowOf(1).getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(rowOf(1))
    expect(screen.getByRole('button', { name: 'เพิ่มเข้าแผน' }).disabled).toBe(true)
  })

  it('the add button waits for a round, then adds with that round’s first project and shows the result', () => {
    render(<RoundPickerSheet program={program} onClose={() => {}} today="2027-01-01" />)
    const add = screen.getByRole('button', { name: 'เพิ่มเข้าแผน' })
    expect(add.disabled).toBe(true)
    fireEvent.click(rowOf(3))
    fireEvent.click(add)
    const e = usePlansStore.getState().plans[0]
    expect(e).toMatchObject({ programId: 'p-med', round: 3, rank: 1, projectName: 'Admission A', minGpax: 2.5 })
    expect(e.checklist.length).toBeGreaterThan(0)
    expect(screen.getByText('เพิ่ม แพทยศาสตรบัณฑิต เข้ารอบ 3 อันดับ 1 แล้ว')).toBeTruthy()
  })

  it('lets the student choose among several projects of the round', () => {
    render(<RoundPickerSheet program={program} onClose={() => {}} today="2027-01-01" />)
    fireEvent.click(rowOf(3))
    fireEvent.click(screen.getByRole('radio', { name: /Admission B/ }))
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มเข้าแผน' }))
    expect(usePlansStore.getState().plans[0]).toMatchObject({ projectName: 'Admission B', minGpax: 3 })
    expect(usePlansStore.getState().plans[0].scores.map((s) => s.key)).toEqual(['a_lv_66'])
  })

  it('a round with no projects can still be planned, without a checklist', () => {
    render(<RoundPickerSheet program={program} onClose={() => {}} today="2027-01-01" />)
    fireEvent.click(rowOf(4))
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มเข้าแผน' }))
    expect(usePlansStore.getState().plans[0]).toMatchObject({ round: 4, rank: null, checklist: [] })
  })

  it('ดูแผน opens the plan sheet and closes the picker', () => {
    const onClose = vi.fn()
    render(<RoundPickerSheet program={program} onClose={onClose} today="2027-01-01" />)
    fireEvent.click(rowOf(3))
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มเข้าแผน' }))
    fireEvent.click(screen.getByRole('button', { name: 'ดูแผน' }))
    expect(useRoomUiStore.getState().sheet).toBe('plan')
    expect(onClose).toHaveBeenCalled()
  })

  it('says why when the plan is full and keeps the sheet open', () => {
    for (let i = 1; i <= 3; i++) usePlansStore.getState().addFromProgram({ ...program, programId: `x${i}`, round: 3, scores: [] })
    render(<RoundPickerSheet program={program} onClose={() => {}} today="2027-01-01" />)
    fireEvent.click(rowOf(1))
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มเข้าแผน' }))
    expect(screen.getByRole('alert').textContent).toContain('แผนเต็มแล้ว')
    expect(usePlansStore.getState().plans).toHaveLength(3)
  })

  it('says so when the program is already in that round', () => {
    usePlansStore.getState().addFromProgram({ ...program, round: 3, scores: [] })
    render(<RoundPickerSheet program={program} onClose={() => {}} today="2027-01-01" />)
    fireEvent.click(rowOf(3))
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มเข้าแผน' }))
    expect(screen.getByRole('alert').textContent).toContain('อยู่ในแผนรอบนี้แล้ว')
  })

  it('round 3 is full when ten ranks are taken', () => {
    ent.extra = 20
    for (let i = 1; i <= 10; i++) usePlansStore.getState().addFromProgram({ ...program, programId: `x${i}`, round: 3, scores: [] })
    render(<RoundPickerSheet program={program} onClose={() => {}} today="2027-01-01" />)
    expect(rowOf(3).textContent).toContain('เต็ม 10 อันดับแล้ว')
    expect(rowOf(3).getAttribute('aria-disabled')).toBe('true')
  })

  it('never invents eligibility: round 2 only points at MyTCAS', () => {
    render(<RoundPickerSheet program={{ ...program, rounds: [{ round: 2, projects: [{ nameTh: 'โควตา', seats: 5, minGpax: 2, scores: [] }] }] }} onClose={() => {}} today="2027-01-01" />)
    expect(rowOf(2).textContent).toContain('ตรวจเงื่อนไขพื้นที่ใน MyTCAS')
    expect(rowOf(2).textContent).not.toMatch(/มีสิทธิ์|ผ่านเงื่อนไข/)
  })
})
