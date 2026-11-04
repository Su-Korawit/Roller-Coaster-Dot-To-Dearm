import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { isSubjectKey as client } from './planDerive'
import { SCORE_LABELS } from '../constants/scoreLabels'

const require = createRequire(import.meta.url)
const { isSubjectKey: server } = require('../../functions/subjectKeys.js')

const VALID = ['tgat', 'tgat1', 'tgat2', 'tgat3', 'tpat1', 'tpat11', 'tpat13', 'tpat2', 'tpat21', 'tpat3', 'tpat4', 'tpat5',
  'a_lv_61', 'a_lv_62', 'a_lv_63', 'a_lv_64', 'a_lv_65', 'a_lv_66', 'a_lv_70', 'a_lv_81', 'a_lv_82', 'a_lv_83', 'a_lv_84', 'a_lv_85', 'a_lv_86', 'a_lv_87', 'a_lv_88', 'a_lv_89']
const INVALID = ['gpax', 'gpax6_score', 'gpa22', 'portfolio', 'interview', 'priority_score', '', 'tgat4', 'tpat6', 'a_lv_60', 'a_lv_67', 'a_lv_90',
  '__proto__', 'constructor', 'a/b', ' tgat', 'tgat ', 'TGAT', 'x'.repeat(65), null, undefined, 5, {}, []]

describe('subject keys: client and server agree', () => {
  it.each(VALID)('both accept %s', (k) => {
    expect(client(k)).toBe(true)
    expect(server(k)).toBe(true)
  })
  it.each(INVALID.map((k) => [JSON.stringify(k), k]))('both reject %s', (_n, k) => {
    expect(client(k)).toBe(false)
    expect(server(k)).toBe(false)
  })
  it('every exam score key MyTCAS can send is accepted, and nothing else with a label is', () => {
    const exams = Object.keys(SCORE_LABELS).filter((k) => /^(tgat|tpat|a_lv_)/.test(k))
    for (const k of exams) expect(client(k), k).toBe(true)
    for (const k of Object.keys(SCORE_LABELS).filter((x) => !exams.includes(x))) expect(client(k), k).toBe(false)
  })
})
