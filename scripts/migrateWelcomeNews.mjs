// One-time migration: legacy welcome news -> content-site articles (spec 2026-10-16).
//
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/migrateWelcomeNews.mjs          (dry run)
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/migrateWelcomeNews.mjs --apply
//
// Copies every `welcomeConfig/news/items/{id}` into `articles/{id}` (published, category
// "news") and `articleDrafts/legacy-{id}` (so the Studio can edit it). Idempotent: ids that
// already exist in `articles` are skipped, and writes use create(), which never overwrites.
// The old collection is left untouched (frozen).
import admin from 'firebase-admin'
import { planMigration } from '../src/content/migrate.js'
import { ADMIN_UID, ADMIN_DISPLAY_NAME } from '../src/constants/admin.js'

const apply = process.argv.includes('--apply')
const BATCH_PAIRS = 200 // 2 writes per article, Firestore batch limit is 500

admin.initializeApp()
const db = admin.firestore()

const oldSnap = await db.collection('welcomeConfig').doc('news').collection('items').orderBy('createdAt', 'desc').get()
const oldDocs = oldSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
const existing = new Set((await db.collection('articles').select().get()).docs.map((d) => d.id))

const plan = planMigration(existing, oldDocs, { authorUid: ADMIN_UID, authorName: ADMIN_DISPLAY_NAME })

console.log(`legacy posts: ${oldDocs.length}`)
console.log(`to create:    ${plan.toCreate.length}`)
console.log(`skipped:      ${plan.skipped.length}`)
for (const s of plan.skipped) console.log(`  - ${s.id}: ${s.reason}`)
for (const c of plan.toCreate) console.log(`  + ${c.id}: ${c.article.title}`)

if (!apply) {
  console.log('\nDry run only. Re-run with --apply to write.')
} else {
  for (let i = 0; i < plan.toCreate.length; i += BATCH_PAIRS) {
    const batch = db.batch()
    for (const { id, article, draft } of plan.toCreate.slice(i, i + BATCH_PAIRS)) {
      batch.create(db.collection('articles').doc(id), article)
      batch.create(db.collection('articleDrafts').doc(`legacy-${id}`), draft)
    }
    await batch.commit()
  }
  console.log(`\nWrote ${plan.toCreate.length} articles.`)
}
