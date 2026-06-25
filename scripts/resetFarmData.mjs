// Clears farmPlants, farmItems, farmShops in Firestore and re-seeds from JS defaults.
//
// Setup (same as uploadAssets.mjs):
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/resetFarmData.mjs
//
// Pass --dry-run to preview what would be written without touching Firestore.

import admin from 'firebase-admin'
import { PLANTS } from '../src/data/PlantData.js'
import { ITEMS } from '../src/data/ItemData.js'
import { SHOPS } from '../src/data/ShopData.js'

const DRY = process.argv.includes('--dry-run')
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rollercoasterdottodream'

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID })
const db = admin.firestore()

async function deleteCollection(colName) {
  const snap = await db.collection(colName).get()
  if (snap.empty) { console.log(`  ${colName}: empty, nothing to delete`); return }
  const batch = db.batch()
  snap.docs.forEach(d => batch.delete(d.ref))
  if (!DRY) await batch.commit()
  console.log(`  ${colName}: deleted ${snap.size} doc(s)${DRY ? ' [dry-run]' : ''}`)
}

async function seedCollection(colName, defaults) {
  const batch = db.batch()
  for (const [id, data] of Object.entries(defaults)) {
    batch.set(db.doc(`${colName}/${id}`), data)
  }
  if (!DRY) await batch.commit()
  console.log(`  ${colName}: seeded ${Object.keys(defaults).length} doc(s)${DRY ? ' [dry-run]' : ''}`)
}

console.log(DRY ? '=== DRY RUN — no writes ===' : '=== Resetting farm data ===')

console.log('\n[1/2] Deleting old documents...')
await deleteCollection('farmPlants')
await deleteCollection('farmItems')
await deleteCollection('farmShops')

console.log('\n[2/2] Seeding new documents...')
await seedCollection('farmPlants', PLANTS)
await seedCollection('farmItems', ITEMS)
await seedCollection('farmShops', SHOPS)

console.log('\nDone.')
process.exit(0)
