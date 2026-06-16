// One-time cleanup: deletes all purchases where amount != 25.
// Run: gcloud auth application-default login && node functions/clearTestPurchases.js
// Remove this file when done.
const admin = require('firebase-admin')

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'rollercoasterdottodream',
})

const db = admin.firestore()

async function main() {
  const snap = await db.collection('purchases').get()
  if (snap.empty) { console.log('No purchases found.'); return }

  const toDelete = snap.docs.filter((d) => d.data().amount !== 25)
  const toKeep = snap.size - toDelete.length
  console.log(`Total: ${snap.size} | Keeping: ${toKeep} (amount=25) | Deleting: ${toDelete.length}`)

  for (let i = 0; i < toDelete.length; i += 500) {
    const batch = db.batch()
    toDelete.slice(i, i + 500).forEach((d) => batch.delete(d.ref))
    await batch.commit()
    console.log(`  Deleted batch ${Math.floor(i / 500) + 1}`)
  }
  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
