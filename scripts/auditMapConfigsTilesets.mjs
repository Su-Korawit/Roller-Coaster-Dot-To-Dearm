// scripts/auditMapConfigsTilesets.mjs
//
// Read-only: lists every mapConfigs/{key}.tilesets entry that still points
// into the official sprites/ prefix (sprites/tilesets/* or sprites/objects/*).
// These are Roller Coaster custom files (see docs/adr/0007) that must be
// migrated to rc/ before scripts/migrateRcAssets.mjs (Assets repo) deletes
// them from sprites/ — Firestore data overrides the DEFAULT_MAP_CONFIGS
// fallback in src/utils/mapConfig.js, so the JS default alone is not proof
// that nothing still points at the old path.
//
// Run:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/auditMapConfigsTilesets.mjs

import admin from 'firebase-admin'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rollercoasterdottodream'

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID })
const db = admin.firestore()

const snap = await db.collection('mapConfigs').get()
if (snap.empty) {
  console.log('mapConfigs collection is empty — nothing stored in Firestore, JS defaults are authoritative.')
  process.exit(0)
}

let flagged = 0
for (const doc of snap.docs) {
  const tilesets = doc.data().tilesets ?? {}
  for (const [name, value] of Object.entries(tilesets)) {
    if (value.startsWith('sprites/tilesets/') || value.startsWith('sprites/objects/')) {
      console.log(`  [${doc.id}] ${name}: ${value}`)
      flagged++
    }
  }
}

console.log(`\n${flagged} tileset reference(s) still point into sprites/ — these need scripts/migrateMapConfigsToRc.mjs.`)
process.exit(0)
