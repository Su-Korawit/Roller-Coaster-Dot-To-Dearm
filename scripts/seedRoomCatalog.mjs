// Seeds Firestore `roomCatalog` from src/data/roomCatalogSeed.js.
//   node scripts/seedRoomCatalog.mjs            dry run: prints the rows, writes nothing
//   node scripts/seedRoomCatalog.mjs --apply    writes with the Admin SDK (merge, never deletes)
// Owner credentials like scripts/uploadAssets.mjs:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/seedRoomCatalog.mjs --apply
import admin from 'firebase-admin'
import { ROOM_CATALOG } from '../src/data/roomCatalogSeed.js'

const apply = process.argv.includes('--apply')
const rows = Object.entries(ROOM_CATALOG)
for (const [id, item] of rows) console.log(`${id}\t${item.kind}\t${item.price}`)
console.log(`${rows.length} catalog rows${apply ? '' : ' (dry run — pass --apply to write)'}`)

if (apply) {
  admin.initializeApp()
  const db = admin.firestore()
  // Prices an admin already tuned are kept: only create missing rows or fill missing fields.
  for (const [id, item] of rows) {
    const ref = db.collection('roomCatalog').doc(id)
    const snap = await ref.get()
    await ref.set(snap.exists ? { ...item, ...snap.data() } : item, { merge: true })
  }
  console.log('seeded')
}
