import { describe, it, expect } from 'vitest'
import {
  shortSubject, scoresFromProject, scoresFromSubjects, makeGoal, applyGoalToState, goalKey,
  universityAppId, matchUniversity, matchByName, DEFAULT_NEEDED,
} from './goalLogic'

describe('score requirements', () => {
  it('MyTCAS project: exam subjects only, needed = minimum total when published', () => {
    const project = {
      min_total_score: 55.4,
      scores: [
        { key: 'tgat1', label: 'TGAT1 การสื่อสารภาษาอังกฤษ', weight: 30 },
        { key: 'a_lv_61', label: 'A-Level คณิตศาสตร์ 1', weight: 40 },
        { key: 'gpax', label: 'GPAX', weight: 30 },
      ],
    }
    expect(scoresFromProject(project)).toEqual([
      { subject: 'TGAT1', weight: 30, needed: 55, estimated: false },
      { subject: 'A-Level คณิตศาสตร์ 1', weight: 40, needed: 55, estimated: false },
    ])
  })
  it('falls back to an estimated target when no minimum is published', () => {
    const [s] = scoresFromProject({ scores: [{ key: 'tpat3', label: 'TPAT3 ความถนัดวิทยาศาสตร์ฯ', weight: 50 }] })
    expect(s).toMatchObject({ subject: 'TPAT3', needed: DEFAULT_NEEDED, estimated: true })
  })
  it('TCAS Starter subjects keep TGAT/TPAT/A-Level and are always estimated', () => {
    expect(scoresFromSubjects([{ label: 'TGAT1', weight: 50 }, { label: 'GPAX', weight: 20 }, { label: 'TPAT3', weight: 50 }]).map((s) => s.subject)).toEqual(['TGAT1', 'TPAT3'])
    expect(shortSubject('tgat2 การคิด')).toBe('TGAT2')
  })
})

describe('applyGoalToState', () => {
  const goal = makeGoal({ university: 'จุฬา', faculty: 'วิศวกรรมศาสตร์', program: 'วิศวกรรมคอม', reqs: [{ subject: 'TGAT1', needed: 60, weight: 50 }, { subject: 'TPAT3', needed: 60, weight: 50 }] })
  const base = { target: { university: '', faculty: '', major: '', interest: 'x', examDate: '' }, scores: [] }
  it('sets the target text and goal scores, keeping exam date and interest', () => {
    const out = applyGoalToState(base, goal)
    expect(out.target).toMatchObject({ university: 'จุฬา', faculty: 'วิศวกรรมศาสตร์', major: 'วิศวกรรมคอม', examDate: '2027-01-30', interest: 'x' })   // TGAT/TPAT3 → official first exam day
    expect(out.scores.map((s) => s.subject)).toEqual(['TGAT1', 'TPAT3'])
  })
  it('keeps a hand-set exam date; goal scores carry their own exam day', () => {
    const out = applyGoalToState({ target: { ...base.target, examDate: '2027-02-20', examDateManual: true }, scores: [] }, goal)
    expect(out.target.examDate).toBe('2027-02-20')
    const auto = applyGoalToState(base, makeGoal({ reqs: [{ subject: 'A-Level ฟิสิกส์', needed: 50 }, { subject: 'TGAT', needed: 50 }] }))
    expect(auto.scores.map((x) => x.examDate)).toEqual(['2027-03-13', '2027-01-30'])
    expect(auto.target.examDate).toBe('2027-01-30')
  })
  it('switching goal replaces goal scores, keeps manual ones and my scores by subject', () => {
    const first = applyGoalToState({ ...base, scores: [{ id: 'm', subject: 'ภาษาไทย', needed: 50, mine: 40 }] }, goal)
    first.scores.find((s) => s.subject === 'TGAT1').mine = 72
    const other = makeGoal({ university: 'เกษตร', faculty: 'วิทย์', program: 'คอม', reqs: [{ subject: 'TGAT1', needed: 50 }, { subject: 'A-Level คณิตศาสตร์ 1', needed: 50 }] })
    const out = applyGoalToState({ target: first.target, scores: first.scores }, other)
    expect(out.scores.map((s) => s.subject)).toEqual(['ภาษาไทย', 'TGAT1', 'A-Level คณิตศาสตร์ 1'])
    expect(out.scores.find((s) => s.subject === 'TGAT1').mine).toBe(72)
    expect(out.scores.find((s) => s.subject === 'ภาษาไทย').mine).toBe(40)
  })
})

describe('helpers', () => {
  it('goalKey distinguishes sources and falls back to names', () => {
    expect(goalKey({ source: 'mytcas', programId: 'P1' })).toBe('mytcas:P1')
    expect(goalKey({ source: 'manual', university: 'A', faculty: 'B', program: 'C' })).toBe('a|b|c')
  })
  it('universityAppId: KU keeps its original tile', () => {
    expect(universityAppId('002')).toBe('link-kuadmission')
    expect(universityAppId('001')).toBe('uni-001')
    expect(universityAppId(null)).toBeNull()
  })
  it('matches AI-written names to MyTCAS names loosely', () => {
    const unis = [{ university_name_th: 'จุฬาลงกรณ์มหาวิทยาลัย' }, { university_name_th: 'มหาวิทยาลัยเกษตรศาสตร์' }]
    expect(matchUniversity(unis, 'ม.เกษตรศาสตร์').university_name_th).toBe('มหาวิทยาลัยเกษตรศาสตร์')
    expect(matchUniversity(unis, 'จุฬาลงกรณ์มหาวิทยาลัย')).toBe(unis[0])
    expect(matchUniversity(unis, 'ไม่มีจริง')).toBeNull()
    const facs = [{ faculty_name_th: 'คณะวิศวกรรมศาสตร์' }, { faculty_name_th: 'คณะวิทยาศาสตร์' }]
    expect(matchByName(facs, 'วิศวกรรมศาสตร์', 'faculty_name_th')).toBe(facs[0])
  })
})

describe('universityIdByName', () => {
  it('maps TCAS Starter names onto MyTCAS ids', async () => {
    const { universityIdByName } = await import('./goalLogic')
    expect(universityIdByName('มหาวิทยาลัยเกษตรศาสตร์')).toBe('002')
    expect(universityIdByName('จุฬาลงกรณ์มหาวิทยาลัย')).toBe('001')
    expect(universityIdByName('ไม่มีจริงเลย')).toBeNull()
  })
})
