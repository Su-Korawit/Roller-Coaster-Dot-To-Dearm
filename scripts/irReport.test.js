import { describe, it, expect } from 'vitest'
import { parseArgs, formatIdeaRead } from './irReportLib.mjs'

describe('parseArgs', () => {
  it('parses ensure', () => {
    expect(parseArgs(['node', 'irReport.mjs', 'ensure'])).toEqual({ command: 'ensure' })
  })

  it('parses list without include-done', () => {
    expect(parseArgs(['node', 'irReport.mjs', 'list'])).toEqual({
      command: 'list',
      includeDone: false,
    })
  })

  it('parses list with --include-done', () => {
    expect(parseArgs(['node', 'irReport.mjs', 'list', '--include-done'])).toEqual({
      command: 'list',
      includeDone: true,
    })
  })

  it('parses read', () => {
    expect(parseArgs(['node', 'irReport.mjs', 'read', 'idea-1'])).toEqual({
      command: 'read',
      ideaId: 'idea-1',
    })
  })

  it('parses set-status', () => {
    expect(parseArgs(['node', 'irReport.mjs', 'set-status', 'idea-1', 'planned'])).toEqual({
      command: 'set-status',
      ideaId: 'idea-1',
      status: 'planned',
    })
  })

  it('parses append-update with multi-word summary', () => {
    expect(parseArgs(['node', 'irReport.mjs', 'append-update', 'idea-1', 'tests', 'still', 'failing'])).toEqual({
      command: 'append-update',
      ideaId: 'idea-1',
      summary: 'tests still failing',
    })
  })

  it('parses append-success', () => {
    expect(parseArgs(['node', 'irReport.mjs', 'append-success', 'idea-1', 'shipped'])).toEqual({
      command: 'append-success',
      ideaId: 'idea-1',
      summary: 'shipped',
    })
  })

  it('throws when command is missing', () => {
    expect(() => parseArgs(['node', 'irReport.mjs'])).toThrow('missing command')
  })

  it('throws for unknown command', () => {
    expect(() => parseArgs(['node', 'irReport.mjs', 'nope'])).toThrow('unknown command: nope')
  })

  it('throws when read lacks ideaId', () => {
    expect(() => parseArgs(['node', 'irReport.mjs', 'read'])).toThrow('read requires ideaId')
  })

  it('throws when append-update lacks summary', () => {
    expect(() => parseArgs(['node', 'irReport.mjs', 'append-update', 'idea-1'])).toThrow(
      'append-update requires ideaId and summary',
    )
  })
})

describe('formatIdeaRead', () => {
  it('returns idea root and non-root blocks', () => {
    const subtree = {
      root: { id: 'r1', type: 'ideaRoot', data: { title: 'IR', status: 'idea' } },
      nodes: [
        { id: 'r1', type: 'ideaRoot', data: { title: 'IR', status: 'idea' } },
        { id: 'p1', type: 'process', data: { label: 'req' } },
        { id: 'u1', type: 'update', data: { summary: 'wip' } },
      ],
      edges: [],
    }
    expect(formatIdeaRead(subtree)).toEqual({
      idea: { id: 'r1', type: 'ideaRoot', data: { title: 'IR', status: 'idea' } },
      blocks: [
        { id: 'p1', type: 'process', data: { label: 'req' } },
        { id: 'u1', type: 'update', data: { summary: 'wip' } },
      ],
    })
  })
})
