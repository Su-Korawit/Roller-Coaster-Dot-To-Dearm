import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getDocs: (...a) => m.getDocs(...a),
  addDoc: (...a) => m.addDoc(...a),
  deleteDoc: (...a) => m.deleteDoc(...a),
  serverTimestamp: () => 'server-ts',
}))
vi.mock('../lib/db', () => ({
  cols: { timetableTemplates: { _col: 'timetableTemplates' } },
  refs: { timetableTemplate: (id) => ({ _path: `timetableTemplates/${id}` }) },
  queries: {
    latestTemplates: () => ({ _query: 'latest' }),
    templatesBySchool: (term) => ({ _query: `school:${term}` }),
  },
}))
vi.mock('./useSchoolStore', () => ({
  useSchoolStore: {
    getState: () => ({
      subjects: [{ id: 's1', name: 'Math', color: '#a78bda' }],
      scheduleSlots: [{ id: 'sl1', subjectId: 's1', day: 'mon', startTime: '09:00', endTime: '10:00' }],
    }),
  },
}))
vi.mock('./useAuthStore', () => ({
  useAuthStore: { getState: () => ({ user: { uid: 'u1' } }) },
}))

const { useTimetableTemplatesStore } = await import('./useTimetableTemplatesStore')

const SNAP = {
  docs: [{ id: 't1', data: () => ({ name: 'ม.5/1', schoolName: 'สวนกุหลาบ', classLevel: 'ม.5', version: 1, subjects: [], createdBy: 'u9' }) }],
}

describe('useTimetableTemplatesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTimetableTemplatesStore.setState({ templates: [], loading: false })
  })

  it('loadLatest fetches the latest templates', async () => {
    m.getDocs.mockResolvedValue(SNAP)
    await useTimetableTemplatesStore.getState().loadLatest()
    expect(m.getDocs).toHaveBeenCalledWith({ _query: 'latest' })
    expect(useTimetableTemplatesStore.getState().templates).toEqual([
      { id: 't1', name: 'ม.5/1', schoolName: 'สวนกุหลาบ', classLevel: 'ม.5', version: 1, subjects: [], createdBy: 'u9' },
    ])
    expect(useTimetableTemplatesStore.getState().loading).toBe(false)
  })

  it('searchBySchool uses the prefix query for a non-empty term', async () => {
    m.getDocs.mockResolvedValue(SNAP)
    await useTimetableTemplatesStore.getState().searchBySchool('สวน')
    expect(m.getDocs).toHaveBeenCalledWith({ _query: 'school:สวน' })
  })

  it('searchBySchool with a blank term falls back to latest', async () => {
    m.getDocs.mockResolvedValue(SNAP)
    await useTimetableTemplatesStore.getState().searchBySchool('   ')
    expect(m.getDocs).toHaveBeenCalledWith({ _query: 'latest' })
  })

  it('publishTemplate serialises the current timetable with owner metadata', async () => {
    await useTimetableTemplatesStore.getState().publishTemplate({
      name: ' ห้อง 5/1 ', schoolName: ' สวนกุหลาบ ', classLevel: 'ม.5',
    })
    expect(m.addDoc).toHaveBeenCalledWith({ _col: 'timetableTemplates' }, {
      version: 1,
      subjects: [{ name: 'Math', color: '#a78bda', slots: [{ day: 'mon', startTime: '09:00', endTime: '10:00' }] }],
      name: 'ห้อง 5/1',
      schoolName: 'สวนกุหลาบ',
      classLevel: 'ม.5',
      createdBy: 'u1',
      createdAt: 'server-ts',
    })
  })

  it('deleteTemplate deletes by ref and removes it from state', async () => {
    useTimetableTemplatesStore.setState({ templates: [{ id: 't1' }, { id: 't2' }] })
    await useTimetableTemplatesStore.getState().deleteTemplate('t1')
    expect(m.deleteDoc).toHaveBeenCalledWith({ _path: 'timetableTemplates/t1' })
    expect(useTimetableTemplatesStore.getState().templates.map((t) => t.id)).toEqual(['t2'])
  })
})
