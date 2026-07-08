import { describe, it, expect, vi, beforeEach } from 'vitest'

const incrementStacks = vi.fn()
vi.mock('./useUserStore', () => ({
  useUserStore: { getState: () => ({ incrementStacks }) },
}))

const { useSchoolStore } = await import('./useSchoolStore')

describe('useSchoolStore', () => {
  beforeEach(() => {
    useSchoolStore.getState().clearSchool()
    incrementStacks.mockClear()
  })

  it('adds a subject and returns its id', () => {
    const id = useSchoolStore.getState().addSubject({ name: 'Math', color: '#a78bda', description: '' })
    const subjects = useSchoolStore.getState().subjects
    expect(subjects).toHaveLength(1)
    expect(subjects[0]).toMatchObject({ id, name: 'Math', color: '#a78bda' })
  })

  it('updates a subject', () => {
    const id = useSchoolStore.getState().addSubject({ name: 'Math' })
    useSchoolStore.getState().updateSubject(id, { name: 'Advanced Math' })
    expect(useSchoolStore.getState().subjects[0].name).toBe('Advanced Math')
  })

  it('removing a subject cascades to its schedule slots and appointments', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const physicsId = useSchoolStore.getState().addSubject({ name: 'Physics' })
    useSchoolStore.getState().addScheduleSlot(mathId, { day: 'mon', startTime: '09:00', endTime: '10:00' })
    useSchoolStore.getState().addScheduleSlot(physicsId, { day: 'tue', startTime: '09:00', endTime: '10:00' })
    useSchoolStore.getState().addAppointment(mathId, { title: 'HW', dueDate: '2026-07-10' })
    useSchoolStore.getState().addAppointment(physicsId, { title: 'Lab', dueDate: '2026-07-11' })

    useSchoolStore.getState().removeSubject(mathId)

    const state = useSchoolStore.getState()
    expect(state.subjects.map((s) => s.id)).toEqual([physicsId])
    expect(state.scheduleSlots.every((sl) => sl.subjectId !== mathId)).toBe(true)
    expect(state.appointments.every((a) => a.subjectId !== mathId)).toBe(true)
  })

  it('adds a schedule slot under a subject', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const slotId = useSchoolStore.getState().addScheduleSlot(mathId, { day: 'mon', startTime: '12:00', endTime: '13:00' })
    const slots = useSchoolStore.getState().scheduleSlots
    expect(slots).toEqual([{ id: slotId, subjectId: mathId, day: 'mon', startTime: '12:00', endTime: '13:00' }])
  })

  it('updates and removes a schedule slot', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const slotId = useSchoolStore.getState().addScheduleSlot(mathId, { day: 'mon', startTime: '12:00', endTime: '13:00' })
    useSchoolStore.getState().updateScheduleSlot(slotId, { startTime: '14:00' })
    expect(useSchoolStore.getState().scheduleSlots[0].startTime).toBe('14:00')
    useSchoolStore.getState().removeScheduleSlot(slotId)
    expect(useSchoolStore.getState().scheduleSlots).toEqual([])
  })

  it('adds an appointment with homework defaults', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const apptId = useSchoolStore.getState().addAppointment(mathId, { title: '1.1.3 Page 21', dueDate: '2026-07-10' })
    const appt = useSchoolStore.getState().appointments[0]
    expect(appt).toMatchObject({
      id: apptId,
      subjectId: mathId,
      title: '1.1.3 Page 21',
      kind: 'homework',
      dueDate: '2026-07-10',
      completed: false,
      completedAt: null,
    })
    expect(typeof appt.createdAt).toBe('number')
  })

  it('accepts an explicit kind for a checkpoint/exam', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    useSchoolStore.getState().addAppointment(mathId, { title: 'สอบเก็บคะแนน', kind: 'checkpoint', dueDate: '2026-07-10' })
    expect(useSchoolStore.getState().appointments[0].kind).toBe('checkpoint')
  })

  it('toggling an appointment to complete sets completedAt and increments stacks once', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const apptId = useSchoolStore.getState().addAppointment(mathId, { title: 'HW', dueDate: '2026-07-10' })

    useSchoolStore.getState().toggleAppointment(apptId)

    const appt = useSchoolStore.getState().appointments[0]
    expect(appt.completed).toBe(true)
    expect(typeof appt.completedAt).toBe('number')
    expect(incrementStacks).toHaveBeenCalledTimes(1)
  })

  it('toggling back to incomplete clears completedAt and does not increment stacks again', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const apptId = useSchoolStore.getState().addAppointment(mathId, { title: 'HW', dueDate: '2026-07-10' })
    useSchoolStore.getState().toggleAppointment(apptId) // complete
    incrementStacks.mockClear()

    useSchoolStore.getState().toggleAppointment(apptId) // uncomplete

    const appt = useSchoolStore.getState().appointments[0]
    expect(appt.completed).toBe(false)
    expect(appt.completedAt).toBeNull()
    expect(incrementStacks).not.toHaveBeenCalled()
  })

  it('removes an appointment', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const apptId = useSchoolStore.getState().addAppointment(mathId, { title: 'HW', dueDate: '2026-07-10' })
    useSchoolStore.getState().removeAppointment(apptId)
    expect(useSchoolStore.getState().appointments).toEqual([])
  })
})
