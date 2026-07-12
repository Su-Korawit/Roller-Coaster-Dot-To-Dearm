import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  CURRENT_PATH,
  PENDING_PATH,
  readCurrent,
  writeCurrent,
  clearCurrent,
  readPending,
  enqueuePending,
  clearPending,
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
