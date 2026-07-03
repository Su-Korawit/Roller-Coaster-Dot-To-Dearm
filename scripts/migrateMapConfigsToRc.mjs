// scripts/migrateMapConfigsToRc.mjs
//
// Rewrites mapConfigs/{key}.tilesets entries that point into sprites/tilesets/
// or sprites/objects/ to their rc/ equivalent. Dry-run by default; pass
// --apply to write. Run scripts/auditMapConfigsTilesets.mjs first to see
// what this will touch.
//
// Run:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/migrateMapConfigsToRc.mjs [--apply]

import admin from 'firebase-admin'
import { toRcPath } from '../src/utils/rcPathRewrite.js'

const APPLY = process.argv.includes('--apply')
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rollercoasterdottodream'

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID })
const db = admin.firestore()

const snap = await db.collection('mapConfigs').get()
let changed = 0

for (const doc of snap.docs) {
  const tilesets = doc.data().tilesets ?? {}
  const next = { ...tilesets }
  let dirty = false
  for (const [name, value] of Object.entries(tilesets)) {
    const rc = toRcPath(value)
    if (rc) {
      console.log(`  [${doc.id}] ${name}: ${value} -> ${rc}`)
      next[name] = rc
      dirty = true
    }
  }
  if (dirty) {
    changed++
    if (APPLY) await doc.ref.update({ tilesets: next })
  }
}

console.log(`\n${changed} map(s) ${APPLY ? 'updated' : 'would be updated'} (${APPLY ? 'applied' : 'dry run — pass --apply to write'})`)
process.exit(0)
