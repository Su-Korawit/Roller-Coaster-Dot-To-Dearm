import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { projectChecklist, announcementFor } from './checklistProjects'

const DIR = path.resolve('public/data/checklist/announcements')
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^\d{3}\.json$/.test(f)) : []
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'))

describe('committed announcement data', () => {
  it('coverage counts add up', () => {
    const t = manifest.total
    expect(t.derived + t.nolink + t.portal + t.unreachable + t.empty).toBe(t.projects)
    expect(manifest.universities.reduce((n, c) => n + c.derived, 0)).toBe(t.derived)
  })
  for (const f of files) {
    it(`${f}: items have source refs, stable unique ids and map to real projects`, () => {
      const d = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
      const snap = JSON.parse(fs.readFileSync(path.resolve('public/data/checklist/projects', f), 'utf8'))
      const ids = new Set(); const keys = new Set()
      for (const pr of snap.programs) for (const p of pr.j) keys.add(`${pr.p}:${p.k}`)
      for (const doc of d.docs) {
        expect(doc.url).toMatch(/^https?:\/\//)
        expect(doc.at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        for (const g of doc.groups) for (const it of g.items) {
          expect(it.t.length).toBeGreaterThan(2)
          expect(it.ref).toBeTruthy()
          expect(it.id).toMatch(/^[a-z]+-[0-9a-z]+$/)
          ids.add(`${doc.url}|${g.id}|${it.id}`)
        }
      }
      for (const [k, i] of Object.entries(d.map)) { expect(keys.has(k)).toBe(true); expect(d.docs[i]).toBeTruthy() }
    })
  }
  it('an announcement-derived project doc marks its source and keeps unique item ids', () => {
    const f = files[0]
    if (!f) return
    const d = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
    const snap = JSON.parse(fs.readFileSync(path.resolve('public/data/checklist/projects', f), 'utf8'))
    const [key] = Object.keys(d.map)
    const pr = snap.programs.find((x) => key.startsWith(`${x.p}:`))
    const project = pr.j.find((p) => `${pr.p}:${p.k}` === key)
    const doc = projectChecklist(pr, project, undefined, announcementFor(d, pr.p, project))
    expect(doc.announcement.url).toMatch(/^https?:/)
    const all = doc.groups.flatMap((g) => g.items.map((i) => i.id))
    expect(new Set(all).size).toBe(all.length)
    expect(projectChecklist(pr, project).announcement).toBeUndefined()
  })
})
