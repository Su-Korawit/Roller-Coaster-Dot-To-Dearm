import { describe, it, expect } from 'vitest'
import { runCommand } from './irReport.mjs'

// Minimal fake of the Admin SDK surface irReport.mjs touches: db.doc(path)
// for read-only commands, and db.runTransaction(fn) for the three mutating
// commands. tx.get() re-reads `store` fresh each call, so a test can put a
// "concurrent write" into the store right before invoking runCommand and
// prove the transaction picks it up instead of silently dropping it.
function makeFakeDb(initialDoc) {
  let store = initialDoc
  return {
    _peek: () => store,
    doc: () => ({
      get: async () => ({ exists: store != null, data: () => store }),
    }),
    runTransaction: async (fn) => {
      const ref = {}
      const tx = {
        get: async () => ({ exists: store != null, data: () => store }),
        set: (_ref, data) => { store = { ...store, ...data } },
      }
      return fn(tx, ref)
    },
  }
}

describe('irReport.mjs — transactional writes (admin-idea-board only)', () => {
  it('set-status recomputes off a fresh transaction read, preserving a concurrent write', async () => {
    const db = makeFakeDb({
      nodes: [{ id: 'idea-1', type: 'ideaRoot', position: { x: 0, y: 0 }, data: { status: 'idea' } }],
      edges: [{ id: 'e-existing', source: 'a', target: 'b' }],
    })

    // Simulate the admin's browser autosave landing "between" the script
    // starting and actually committing — mutate the fake store directly
    // before runCommand's transaction reads it.
    db._peek().edges.push({ id: 'e-from-browser', source: 'x', target: 'y' })

    await runCommand({ command: 'set-status', ideaId: 'idea-1', status: 'planned' }, { db })

    const final = db._peek()
    expect(final.nodes.find((n) => n.id === 'idea-1').data.status).toBe('planned')
    // The concurrent edge survived — the transaction wrote off a fresh read
    // that already included it, not a stale copy loaded earlier.
    expect(final.edges.map((e) => e.id)).toContain('e-from-browser')
  })

  it('append-update sets status to in-progress and appends a report node from a fresh read', async () => {
    const db = makeFakeDb({
      nodes: [{ id: 'idea-1', type: 'ideaRoot', position: { x: 0, y: 0 }, data: { status: 'idea', title: 'X' } }],
      edges: [],
    })

    await runCommand({ command: 'append-update', ideaId: 'idea-1', summary: 'progress note' }, { db })

    const final = db._peek()
    expect(final.nodes.find((n) => n.id === 'idea-1').data.status).toBe('in-progress')
    expect(final.nodes.some((n) => n.type === 'update')).toBe(true)
  })
})
