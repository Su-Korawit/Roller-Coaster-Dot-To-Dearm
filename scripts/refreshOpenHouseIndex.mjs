// Refreshes the Open House index (ADR-0026) in Firebase Storage:
//   data/mytcas/openhouse/index.json            summary per building (read first by the campus)
//   data/mytcas/openhouse/{buildingId}.json     universities, programs and rounds of one building
//
// Usage (owner credentials, like scripts/refreshTcasSnapshot.mjs):
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/refreshOpenHouseIndex.mjs            dry run
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/refreshOpenHouseIndex.mjs --apply    publish
//   ... --year 2570   TCAS year (default: data/mytcas/meta.json, else 2570)
//   ... --force       publish even if the result is smaller than the index already live
//
// Courses come from the same source as /api/mytcas (live courses.json, or the Storage snapshot while
// MyTCAS is mid-rebuild). Rounds are crawled per program (concurrency 4, retry with backoff). The
// building files are written first and index.json last, so the campus never sees an index that
// points at files that are not there yet.

import { pathToFileURL } from 'node:url'
import { pickCourseSource, resolveTcasYear, MIN_LIVE_ROWS } from '../api/mytcasSource.js'
import { buildIndex, indexVerdict } from './openHouseCrawl.mjs'

const S3_URL = 'https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json'
const ROUNDS_URL = 'https://tcas65.as.r.appspot.com/program-projects/program-id'
const BASE = 'data/mytcas/openhouse'
const META_PATH = 'data/mytcas/meta.json'
const SNAPSHOT_PATH = 'data/mytcas/courses-snapshot.json'
const DEFAULT_YEAR = 2570

// deps: { fetchJson(url), storage: { read(path), write(path, data) }, now(), log(line) } — injected for tests.
export async function runRefresh({ apply = false, force = false, yearArg = null }, deps) {
  const { fetchJson, storage, now = Date.now, log = console.log } = deps

  const meta = await storage.read(META_PATH)
  const year = yearArg ? Number(yearArg) : resolveTcasYear(meta, DEFAULT_YEAR)
  if (!Number.isInteger(year)) throw new Error(`--year must be an integer, got: ${yearArg}`)

  const liveRows = await fetchJson(S3_URL).catch(() => [])
  const live = Array.isArray(liveRows) ? liveRows : []
  // The snapshot is only read when the live dataset looks mid-rebuild (same rule as /api/mytcas).
  const snapshotRows = live.length >= MIN_LIVE_ROWS ? [] : (await storage.read(SNAPSHOT_PATH)) ?? []
  const { rows, source } = pickCourseSource({ liveRows: live, snapshotRows })
  log(`courses:       ${rows.length} rows (${source})`)
  log(`tcas year:     ${year}`)

  const { index, buildings } = await buildIndex({
    rows,
    year,
    now,
    fetchRounds: (id) => fetchJson(`${ROUNDS_URL}/${id}`),
  })
  const total = Object.values(index.buildings).reduce((n, b) => n + b.programs, 0)
  log(`buildings:     ${Object.keys(buildings).length}`)
  log(`programs:      ${total} (skipped ${index.skipped}, rounds unavailable for ${index.failed})`)

  const existing = await storage.read(`${BASE}/index.json`)
  const verdict = indexVerdict(existing, index, { force })
  if (!verdict.ok) {
    log(`index kept: ${verdict.reason} (use --force to override)`)
    return { published: false, index }
  }
  if (!apply) {
    log('dry run: nothing written (pass --apply to publish)')
    return { published: false, index }
  }
  for (const [id, data] of Object.entries(buildings)) await storage.write(`${BASE}/${id}.json`, data)
  await storage.write(`${BASE}/index.json`, index)
  log(`published ${Object.keys(buildings).length} building files and index.json`)
  return { published: true, index }
}

async function main() {
  const argv = process.argv.slice(2)
  const arg = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : null)
  const { default: admin } = await import('firebase-admin')
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rollercoasterdottodream.firebasestorage.app',
  })
  const bucket = admin.storage().bucket()
  const storage = {
    async read(path) {
      const file = bucket.file(path)
      const [exists] = await file.exists()
      if (!exists) return null
      const [buf] = await file.download()
      return JSON.parse(buf.toString('utf8'))
    },
    async write(path, data) {
      await bucket.file(path).save(JSON.stringify(data), {
        contentType: 'application/json',
        metadata: { cacheControl: 'public, max-age=300' },
      })
    },
  }
  const fetchJson = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} -> ${res.status}`)
    return res.json()
  }
  await runRefresh({ apply: argv.includes('--apply'), force: argv.includes('--force'), yearArg: arg('--year') }, { fetchJson, storage })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
