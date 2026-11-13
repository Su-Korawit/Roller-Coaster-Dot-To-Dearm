// Integrity of the committed Checklist data: the generated project snapshot and the hand-verified lists.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { projectChecklist, universityIdOfProgram, ROUNDS } from './checklistProjects'
import criteria from '../data/checklists/criteria-labels.json'
import { uniLinks } from './checklistLogic'

const DIR = 'public/data/checklist/projects'
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8'))
const shards = manifest.universities.map((u) => ({ u, shard: JSON.parse(readFileSync(`${DIR}/${u.id}.json`, 'utf8')) }))

describe('project snapshot', () => {
  it('has a shard for every manifest university and no stray files', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'manifest.json').sort()
    expect(files).toEqual(manifest.universities.map((u) => `${u.id}.json`).sort())
    // universities MyTCAS lists but has no TCAS70 programmes for: each must still be reachable through its own site
    const idsWith = new Set(manifest.universities.map((u) => u.id))
    for (const x of manifest.withoutProjects) {
      expect(idsWith.has(x.id)).toBe(false)
      expect(uniLinks([x.id])).toHaveLength(1)
    }
  })
  it('covers every programme MyTCAS lists, and the manifest counts match the shards', () => {
    let programmes = 0
    for (const { u, shard } of shards) {
      programmes += shard.programs.length
      expect(shard.id).toBe(u.id)
      expect(shard.programs).toHaveLength(u.programs)
      const all = shard.programs.flatMap((p) => p.j)
      for (const r of ROUNDS) expect(all.filter((x) => x.r === r)).toHaveLength(u[`r${r}`])
    }
    expect(programmes).toBe(manifest.programmesTotal)
    expect(manifest.programmesWithProjects).toBe(manifest.programmesTotal)
    expect(manifest.universities.length).toBeGreaterThanOrEqual(77)
  })
  it('has well-formed programmes and projects', () => {
    for (const { u, shard } of shards) {
      for (const p of shard.programs) {
        expect(universityIdOfProgram(p.p)).toBe(u.id)
        expect(p.n).toBeTruthy()
        expect(p.j.length).toBeGreaterThan(0)
        const keys = new Set()
        for (const j of p.j) {
          expect(ROUNDS).toContain(j.r)
          expect(keys.has(j.k)).toBe(false)
          keys.add(j.k)
          expect(Number.isInteger(j.s) && j.s >= 0).toBe(true)
          if (j.l) expect(/^https?:\/\//.test(j.l)).toBe(true)
          for (const k of Object.keys(j.q ?? {})) expect(criteria[k]).toBeTruthy()
        }
      }
    }
  })
  it('builds a checklist for every project', () => {
    let n = 0
    for (const { shard } of shards) {
      for (const p of shard.programs) {
        for (const j of p.j) {
          const doc = projectChecklist(p, j)
          expect(doc).toBeTruthy()
          const ids = doc.groups.flatMap((g) => g.items.map((i) => i.id))
          expect(new Set(ids).size).toBe(ids.length)
          expect(doc.source.url.startsWith('http')).toBe(true)
          n++
        }
      }
    }
    expect(n).toBe(manifest.universities.reduce((t, u) => t + u.r1 + u.r2 + u.r3 + u.r4, 0))
  })
})
