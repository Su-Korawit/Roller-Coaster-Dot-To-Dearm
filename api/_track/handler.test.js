import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleTrack } from './handler.js'

const API = fileURLToPath(new URL('..', import.meta.url))
const ROOT = fileURLToPath(new URL('../..', import.meta.url))

const fakeRes = () => ({ code: null, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this }, end() { return this } })

// Every non-underscore file under api/ becomes a Vercel function; the Hobby plan allows 12 (a 13th
// makes the deploy fail at "Deploying outputs"). Put new endpoints behind content.js / voice.js.
const countFunctions = (dir) => readdirSync(dir).reduce((n, name) => {
  if (name.startsWith('_')) return n
  const p = join(dir, name)
  return n + (statSync(p).isDirectory() ? countFunctions(p) : 1)
}, 0)

describe('track endpoint', () => {
  it('rejects non-POST and bad payloads before touching Firestore', async () => {
    let r = fakeRes()
    await handleTrack({ method: 'GET' }, r)
    expect(r.code).toBe(405)
    r = fakeRes()
    await handleTrack({ method: 'POST', body: { vid: 'x', t: 'view' } }, r)
    expect(r.code).toBe(400)
  })
  it('is reached through a rewrite to content.js, not its own function', () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'))
    expect(cfg.rewrites.find((x) => x.source === '/api/track')?.destination).toBe('/api/content?route=track')
    expect(cfg.rewrites.at(-1).source).toBe('/(.*)')
  })
  it('keeps api/ within the 12-function Hobby limit', () => {
    expect(countFunctions(API)).toBeLessThanOrEqual(12)
  })
})
