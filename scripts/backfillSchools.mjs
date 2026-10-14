// One-off backfill for ADR 0018: the syncUserSchool Cloud Function only reacts to
// FUTURE users/{uid} writes, so existing students would leave every school at
// memberCount 0 (no school rooms) and have no RTDB userSchool mirror (rules deny
// the room). This recomputes both from scratch — absolute values, safe to re-run.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//   FIREBASE_DATABASE_URL=https://<project>-default-rtdb.<region>.firebasedatabase.app \
//   node scripts/backfillSchools.mjs [--dry-run]
//
// Run it AFTER deploying syncUserSchool (so no write is missed in between) and
// again if the function was ever down.

import admin from 'firebase-admin'
import { normalizeSchoolId } from '../functions/schoolMembers.js'

const DRY = process.argv.includes('--dry-run')
const databaseURL = process.env.FIREBASE_DATABASE_URL
if (!databaseURL) {
  console.error('Set FIREBASE_DATABASE_URL (see VITE_FIREBASE_DATABASE_URL in .env).')
  process.exit(1)
}

admin.initializeApp({ databaseURL })
const db = admin.firestore()

const snap = await db.collection('users').select('schoolId', 'schoolName').get()
const counts = new Map()   // schoolId -> { name, memberCount }
const mirror = {}          // uid -> schoolId

for (const d of snap.docs) {
  const schoolId = normalizeSchoolId(d.data())
  if (!schoolId) continue
  mirror[d.id] = schoolId
  const entry = counts.get(schoolId) ?? { name: null, memberCount: 0 }
  entry.memberCount += 1
  entry.name ??= typeof d.data().schoolName === 'string' ? d.data().schoolName : null
  counts.set(schoolId, entry)
}

console.log(`${snap.size} users, ${Object.keys(mirror).length} with a school, ${counts.size} schools`)
if (DRY) {
  console.log('--dry-run: nothing written')
  process.exit(0)
}

// Firestore batches are limited to 500 writes.
const schools = [...counts.entries()]
for (let i = 0; i < schools.length; i += 400) {
  const batch = db.batch()
  for (const [schoolId, { name, memberCount }] of schools.slice(i, i + 400)) {
    const patch = { memberCount }
    if (name) patch.name = name
    batch.set(db.collection('schools').doc(schoolId), patch, { merge: true })
  }
  await batch.commit()
}

// Multi-path update: replaces only the keys listed, leaving other userSchool entries alone.
const updates = Object.fromEntries(Object.entries(mirror).map(([uid, id]) => [`userSchool/${uid}`, id]))
const entries = Object.entries(updates)
for (let i = 0; i < entries.length; i += 1000) {
  await admin.database().ref().update(Object.fromEntries(entries.slice(i, i + 1000)))
}
console.log('backfill done')
