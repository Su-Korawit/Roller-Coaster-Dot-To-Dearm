import { describe, it, expect } from 'vitest'
import { toNotebookSchema, fromNotebookSchema } from './notebookExport'

const NOTES = [
  { id: 'n1', date: '2026-07-10', subjectId: null, text: 'general note', createdAt: 1, updatedAt: 1 },
  { id: 'n2', date: '2026-07-11', subjectId: 'math', text: 'math note', createdAt: 2, updatedAt: 2 },
]

describe('toNotebookSchema', () => {
  it('produces a version-1 envelope', () => {
    expect(toNotebookSchema(NOTES).version).toBe(1)
  })

  it('drops ids and timestamps, keeping only date/subjectId/text', () => {
    expect(toNotebookSchema(NOTES).notes).toEqual([
      { date: '2026-07-10', subjectId: null, text: 'general note' },
      { date: '2026-07-11', subjectId: 'math', text: 'math note' },
    ])
  })
})

describe('fromNotebookSchema', () => {
  it('round-trips through a JSON serialisation', () => {
    const roundTripped = fromNotebookSchema(JSON.parse(JSON.stringify(toNotebookSchema(NOTES))))
    expect(roundTripped).toEqual([
      { date: '2026-07-10', subjectId: null, text: 'general note' },
      { date: '2026-07-11', subjectId: 'math', text: 'math note' },
    ])
  })

  it('rejects a schema with an unknown version', () => {
    expect(() => fromNotebookSchema({ version: 2, notes: [] })).toThrow()
  })

  it('rejects a schema with a missing version', () => {
    expect(() => fromNotebookSchema({ notes: [] })).toThrow()
  })
})
