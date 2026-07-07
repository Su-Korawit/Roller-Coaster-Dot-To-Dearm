// Refreshes the MyTCAS fallback snapshot in Firebase Storage.
// /api/mytcas serves this snapshot whenever the live courses.json is
// mid-rebuild for a new TCAS cycle (row count under MIN_LIVE_ROWS).
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/refreshTcasSnapshot.mjs
//   ... --year 2570   also set the current TCAS Buddhist-era year in meta.json
//   ... --force       upload even if the live dataset looks mid-rebuild
//
// Refuses (without --force) to overwrite a larger snapshot with a smaller live
// dataset, so running it during a cycle transition cannot destroy the fallback.

import admin from 'firebase-admin'
import { MIN_LIVE_ROWS } from '../api/mytcasSource.js'

const S3_URL = 'https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json'
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'rollercoasterdottodream.firebasestorage.app'
const SNAPSHOT_PATH = 'data/mytcas/courses-snapshot.json'
const META_PATH = 'data/mytcas/meta.json'
const DEFAULT_TCAS_YEAR = 2570

function argValue(flag) {
  const i = process.argv.indexOf(flag)
  return i === -1 ? null : process.argv[i + 1]
}

async function readJsonIfExists(bucket, path) {
  const file = bucket.file(path)
  const [exists] = await file.exists()
  if (!exists) return null
  const [buf] = await file.download()
  return JSON.parse(buf.toString('utf8'))
}

async function saveJson(bucket, path, data) {
  await bucket.file(path).save(JSON.stringify(data), {
    contentType: 'application/json',
    metadata: { cacheControl: 'public, max-age=300' },
  })
}

async function main() {
  const force = process.argv.includes('--force')
  const yearArg = argValue('--year')

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: BUCKET,
  })
  const bucket = admin.storage().bucket()

  const existingMeta = await readJsonIfExists(bucket, META_PATH)
  const tcasYear = yearArg ? Number(yearArg) : (existingMeta?.tcasYear ?? DEFAULT_TCAS_YEAR)
  if (!Number.isInteger(tcasYear)) throw new Error(`--year must be an integer, got: ${yearArg}`)

  const res = await fetch(S3_URL)
  if (!res.ok) throw new Error(`live courses.json fetch failed: ${res.status}`)
  const liveRows = await res.json()
  if (!Array.isArray(liveRows)) throw new Error('live courses.json is not an array')

  console.log(`live rows:            ${liveRows.length}`)
  console.log(`existing snapshot:    ${existingMeta ? `${existingMeta.rows} rows @ ${existingMeta.updatedAt}` : '(none)'}`)
  console.log(`tcas year:            ${tcasYear} (TCAS${tcasYear - 2500})`)

  const liveLooksHealthy = liveRows.length >= MIN_LIVE_ROWS
  const shrinks = existingMeta && liveRows.length < existingMeta.rows

  if ((liveLooksHealthy || force) && !(shrinks && !force)) {
    await saveJson(bucket, SNAPSHOT_PATH, liveRows)
    await saveJson(bucket, META_PATH, {
      tcasYear,
      rows: liveRows.length,
      updatedAt: new Date().toISOString(),
    })
    console.log(`snapshot refreshed:   ${liveRows.length} rows uploaded`)
  } else {
    // Live data is mid-rebuild (or would shrink the fallback) — keep the
    // snapshot, but still persist a year change if one was requested.
    if (yearArg && existingMeta) {
      await saveJson(bucket, META_PATH, { ...existingMeta, tcasYear })
      console.log('snapshot kept; meta.tcasYear updated')
    } else {
      console.log('snapshot kept (live dataset looks mid-rebuild; use --force to override)')
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
