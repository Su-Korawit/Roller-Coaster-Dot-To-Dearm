// One-off cleanup after the Study Room release: removes the farm and Personal Map data.
//   node scripts/purgeLegacyWorld.mjs            dry run: prints what would be deleted, writes nothing
//   node scripts/purgeLegacyWorld.mjs --apply    deletes (batches of at most 400 writes)
// Owner credentials, like scripts/uploadAssets.mjs:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/purgeLegacyWorld.mjs
// Never touches coins, focusXp, leaves, roomInventory, rooms or focus history (see legacyWorldPlan.mjs).
import admin from 'firebase-admin'
import { LEGACY_COLLECTIONS, LEGACY_USER_FIELDS, legacyFieldsPresent, planPurge } from './legacyWorldPlan.mjs'

const apply = process.argv.includes('--apply')
const BATCH = 400

admin.initializeApp()
const db = admin.firestore()

async function inBatches(refs, write) {
  for (let i = 0; i < refs.length; i += BATCH) {
    const batch = db.batch()
    for (const ref of refs.slice(i, i + BATCH)) write(batch, ref)
    await batch.commit()
  }
}

const collections = {}
for (const name of LEGACY_COLLECTIONS) {
  const snap = await db.collection(name).get()
  collections[name] = snap.size
  if (apply) await inBatches(snap.docs.map((d) => d.ref), (batch, ref) => batch.delete(ref))
}

const userFields = Object.fromEntries(LEGACY_USER_FIELDS.map((f) => [f, 0]))
const usersWithLegacy = []
for (const doc of (await db.collection('users').get()).docs) {
  const present = legacyFieldsPresent(doc.data())
  if (present.length === 0) continue
  usersWithLegacy.push({ ref: doc.ref, present })
  for (const f of present) userFields[f] += 1
}
if (apply) {
  for (let i = 0; i < usersWithLegacy.length; i += BATCH) {
    const batch = db.batch()
    for (const { ref, present } of usersWithLegacy.slice(i, i + BATCH)) {
      batch.update(ref, Object.fromEntries(present.map((f) => [f, admin.firestore.FieldValue.delete()])))
    }
    await batch.commit()
  }
}

const plan = planPurge({ collections, userFields })
for (const s of plan.steps) console.log(`${s.kind}\t${s.name}\t${s.count}`)
console.log(`${plan.total} items${apply ? ' removed' : ' (dry run — pass --apply to delete)'}`)
