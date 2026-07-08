import { describe, it, expect } from 'vitest'
import { toTimetableTemplate, fromTimetableTemplate } from './timetableTemplate'

const SUBJECTS = [
  { id: 's1', name: 'Math', color: '#a78bda', description: '', createdAt: 1 },
  { id: 's2', name: 'Physics', color: '#7c3aed', description: 'x', createdAt: 2 },
]
const SLOTS = [
  { id: 'sl1', subjectId: 's1', day: 'mon', startTime: '09:00', endTime: '10:00' },
  { id: 'sl2', subjectId: 's2', day: 'tue', startTime: '10:00', endTime: '11:00' },
  { id: 'sl3', subjectId: 's1', day: 'thu', startTime: '09:00', endTime: '10:00' },
]

describe('toTimetableTemplate', () => {
  it('produces a version-1 envelope grouping slots under their subject, ids stripped', () => {
    expect(toTimetableTemplate(SUBJECTS, SLOTS)).toEqual({
      version: 1,
      subjects: [
        { name: 'Math', color: '#a78bda', slots: [
          { day: 'mon', startTime: '09:00', endTime: '10:00' },
          { day: 'thu', startTime: '09:00', endTime: '10:00' },
        ] },
        { name: 'Physics', color: '#7c3aed', slots: [
          { day: 'tue', startTime: '10:00', endTime: '11:00' },
        ] },
      ],
    })
  })

  it('includes a subject even when it has no slots', () => {
    const { subjects } = toTimetableTemplate([SUBJECTS[0]], [])
    expect(subjects).toEqual([{ name: 'Math', color: '#a78bda', slots: [] }])
  })
})

describe('fromTimetableTemplate', () => {
  it('round-trips through a JSON serialisation', () => {
    const entries = fromTimetableTemplate(JSON.parse(JSON.stringify(toTimetableTemplate(SUBJECTS, SLOTS))))
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({
      name: 'Math', color: '#a78bda',
      slots: [
        { day: 'mon', startTime: '09:00', endTime: '10:00' },
        { day: 'thu', startTime: '09:00', endTime: '10:00' },
      ],
    })
  })

  it('rejects an unknown or missing version', () => {
    expect(() => fromTimetableTemplate({ version: 2, subjects: [] })).toThrow()
    expect(() => fromTimetableTemplate({ subjects: [] })).toThrow()
  })
})
