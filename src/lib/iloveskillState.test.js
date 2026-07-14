import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  CURRENT_PATH,
  PENDING_PATH,
  QUEUE_PATH,
  SIGNAL_PATH,
  readCurrent,
  writeCurrent,
  clearCurrent,
  readPending,
  enqueuePending,
  clearPending,
  readQueue,
  enqueueIdea,
  dequeueNext,
  readSignal,
  writeSignal,
  clearSignal,
} from './iloveskillState'

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iloveskill-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('iloveskillState paths', () => {
  it('exports expected relative paths', () => {
    expect(CURRENT_PATH).toBe('.iloveskill/current.json')
    expect(PENDING_PATH).toBe('.iloveskill/pending-deploys.json')
    expect(QUEUE_PATH).toBe('.iloveskill/queue.json')
    expect(SIGNAL_PATH).toBe('.iloveskill/task-done.json')
  })
})

describe('current idea state', () => {
  it('round-trips writeCurrent and readCurrent', () => {
    const data = {
      ideaId: 'idea-1',
      ideaTitle: 'IR Board',
      planPath: 'docs/plans/2026-07-12-ir-board.md',
    }
    writeCurrent(data, tmpDir)
    expect(readCurrent(tmpDir)).toEqual(data)
    expect(fs.existsSync(path.join(tmpDir, CURRENT_PATH))).toBe(true)
  })

  it('clearCurrent deletes the file', () => {
    writeCurrent({ ideaId: 'x', ideaTitle: 'y', planPath: 'z' }, tmpDir)
    clearCurrent(tmpDir)
    expect(readCurrent(tmpDir)).toBeNull()
    expect(fs.existsSync(path.join(tmpDir, CURRENT_PATH))).toBe(false)
  })
})

describe('pending deploy queue', () => {
  it('readPending returns empty queue when missing', () => {
    expect(readPending(tmpDir)).toEqual({ commands: [] })
  })

  it('enqueuePending appends commands', () => {
    enqueuePending('npm run deploy:rules', tmpDir)
    enqueuePending('npm run deploy:functions', tmpDir)
    expect(readPending(tmpDir)).toEqual({
      commands: ['npm run deploy:rules', 'npm run deploy:functions'],
    })
  })

  it('clearPending resets to empty commands', () => {
    enqueuePending('npm run deploy:rules', tmpDir)
    clearPending(tmpDir)
    expect(readPending(tmpDir)).toEqual({ commands: [] })
    expect(fs.existsSync(path.join(tmpDir, PENDING_PATH))).toBe(true)
  })
})

describe('multitask idea queue', () => {
  it('readQueue returns empty items when missing', () => {
    expect(readQueue(tmpDir)).toEqual({ items: [] })
  })

  it('enqueueIdea appends ideas in order', () => {
    enqueueIdea({ ideaId: 'a', ideaTitle: 'Alpha', planPath: 'docs/plans/a.md' }, tmpDir)
    enqueueIdea({ ideaId: 'b', ideaTitle: 'Beta', planPath: 'docs/plans/b.md' }, tmpDir)
    expect(readQueue(tmpDir)).toEqual({
      items: [
        { ideaId: 'a', ideaTitle: 'Alpha', planPath: 'docs/plans/a.md' },
        { ideaId: 'b', ideaTitle: 'Beta', planPath: 'docs/plans/b.md' },
      ],
    })
  })

  it('dequeueNext pops the front item and rewrites the rest', () => {
    enqueueIdea({ ideaId: 'a', ideaTitle: 'Alpha', planPath: 'docs/plans/a.md' }, tmpDir)
    enqueueIdea({ ideaId: 'b', ideaTitle: 'Beta', planPath: 'docs/plans/b.md' }, tmpDir)
    const next = dequeueNext(tmpDir)
    expect(next).toEqual({ ideaId: 'a', ideaTitle: 'Alpha', planPath: 'docs/plans/a.md' })
    expect(readQueue(tmpDir)).toEqual({
      items: [{ ideaId: 'b', ideaTitle: 'Beta', planPath: 'docs/plans/b.md' }],
    })
  })

  it('dequeueNext returns null on an empty queue', () => {
    expect(dequeueNext(tmpDir)).toBeNull()
  })
})

describe('task-done signal', () => {
  it('readSignal returns null when missing', () => {
    expect(readSignal(tmpDir)).toBeNull()
  })

  it('round-trips writeSignal and readSignal', () => {
    const data = {
      completed: [{ ideaId: 'a', ideaTitle: 'Alpha', summary: 'shipped' }],
      finishedAt: '2026-07-14T00:00:00.000Z',
    }
    writeSignal(data, tmpDir)
    expect(readSignal(tmpDir)).toEqual(data)
  })

  it('clearSignal deletes the file', () => {
    writeSignal({ completed: [], finishedAt: 't' }, tmpDir)
    clearSignal(tmpDir)
    expect(readSignal(tmpDir)).toBeNull()
    expect(fs.existsSync(path.join(tmpDir, SIGNAL_PATH))).toBe(false)
  })
})
