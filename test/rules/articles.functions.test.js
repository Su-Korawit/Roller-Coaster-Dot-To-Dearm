// Content site: the REAL grantCreatorRole / publishArticle / unpublishArticle handlers
// against the Auth + Firestore emulators.
// Requires the emulators: npm run test:rules:emu
/* global process */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createRequire } from 'node:module'

process.env.GCLOUD_PROJECT = 'demo-rcdtd'
const SUPER_UID = 'IaltEhO0mPVfK3ng8npr4CdqnEE3'
const fnRequire = createRequire(new URL('../../functions/index.js', import.meta.url))

let fns, admin, db

const body = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'เนื้อหา' }] }] })
const draft = (over = {}) => ({
  authorUid: 'alice',
  authorName: 'Alice',
  title: 'ทุกโครงการแพทย์',
  slug: 'medicine-all',
  category: 'compare',
  excerpt: 'สรุป',
  coverUrl: 'https://x.org/c.png',
  coverAlt: 'ปก',
  tags: [],
  body,
  ...over,
})
const creator = (uid) => ({ uid, token: { creator: true } })
const run = (name, auth, data) => fns[name].run({ auth, data })
const live = async (slug) => (await db.collection('articles').doc(slug).get()).data()

beforeAll(() => {
  admin = fnRequire('firebase-admin')
  fns = fnRequire('./index.js')
  db = admin.firestore()
})

beforeEach(async () => {
  await db.recursiveDelete(db.collection('articles'))
  await db.recursiveDelete(db.collection('articleDrafts'))
})

describe('grantCreatorRole', () => {
  beforeEach(async () => {
    try { await admin.auth().deleteUser('writer-1') } catch { /* not there */ }
    await admin.auth().createUser({ uid: 'writer-1', email: 'Writer@Example.test' })
  })

  it('refuses everyone but the super-admin', async () => {
    await expect(run('grantCreatorRole', { uid: 'alice' }, { email: 'writer@example.test' })).rejects.toMatchObject({
      code: 'permission-denied',
    })
    await expect(run('grantCreatorRole', undefined, { email: 'writer@example.test' })).rejects.toMatchObject({
      code: 'permission-denied',
    })
  })

  it('grants by email, then revokes, keeping other claims', async () => {
    await admin.auth().setCustomUserClaims('writer-1', { teacher: true })
    const granted = await run('grantCreatorRole', { uid: SUPER_UID }, { email: 'writer@example.test' })
    expect(granted).toEqual({ ok: true, uid: 'writer-1', creator: true })
    expect((await admin.auth().getUser('writer-1')).customClaims).toEqual({ teacher: true, creator: true })

    const revoked = await run('grantCreatorRole', { uid: SUPER_UID }, { uid: 'writer-1', revoke: true })
    expect(revoked.creator).toBe(false)
    expect((await admin.auth().getUser('writer-1')).customClaims).toEqual({ teacher: true })
  })

  it('reports an unknown user and missing input', async () => {
    await expect(run('grantCreatorRole', { uid: SUPER_UID }, { email: 'nobody@example.test' })).rejects.toMatchObject({
      code: 'not-found',
    })
    await expect(run('grantCreatorRole', { uid: SUPER_UID }, {})).rejects.toMatchObject({ code: 'invalid-argument' })
  })
})

describe('publishArticle', () => {
  it('refuses callers without the creator claim', async () => {
    await db.collection('articleDrafts').doc('d1').set(draft())
    await expect(run('publishArticle', { uid: 'alice' }, { draftId: 'd1' })).rejects.toMatchObject({
      code: 'permission-denied',
    })
    await expect(run('publishArticle', undefined, { draftId: 'd1' })).rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it('publishes a valid draft and records the slug on the draft', async () => {
    await db.collection('articleDrafts').doc('d1').set(draft())
    const res = await run('publishArticle', creator('alice'), { draftId: 'd1' })
    expect(res).toEqual({ ok: true, slug: 'medicine-all' })
    expect(await live('medicine-all')).toMatchObject({ title: 'ทุกโครงการแพทย์', draftId: 'd1', authorUid: 'alice' })
    const stored = (await db.collection('articleDrafts').doc('d1').get()).data()
    expect(stored.publishedSlug).toBe('medicine-all')
    expect(stored.isLive).toBe(true)
    expect(stored.liveUpdatedAt.isEqual(stored.updatedAt)).toBe(true)
  })

  it('does not let a second creator take an existing slug', async () => {
    await db.collection('articleDrafts').doc('d1').set(draft())
    await db.collection('articleDrafts').doc('d2').set(draft({ authorUid: 'bob', title: 'ของบ๊อบ' }))
    await run('publishArticle', creator('alice'), { draftId: 'd1' })
    await expect(run('publishArticle', creator('bob'), { draftId: 'd2' })).rejects.toMatchObject({ code: 'already-exists' })
    expect((await live('medicine-all')).title).toBe('ทุกโครงการแพทย์')
  })

  it('does not let one creator publish another creator draft', async () => {
    await db.collection('articleDrafts').doc('d1').set(draft())
    await expect(run('publishArticle', creator('bob'), { draftId: 'd1' })).rejects.toMatchObject({
      code: 'permission-denied',
    })
  })

  it('lets the super-admin publish any draft', async () => {
    await db.collection('articleDrafts').doc('d1').set(draft())
    expect((await run('publishArticle', { uid: SUPER_UID }, { draftId: 'd1' })).slug).toBe('medicine-all')
  })

  it('returns the validation errors for an incomplete draft and writes nothing', async () => {
    await db.collection('articleDrafts').doc('d1').set(draft({ excerpt: '' }))
    const err = await run('publishArticle', creator('alice'), { draftId: 'd1' }).catch((e) => e)
    expect(err.code).toBe('failed-precondition')
    expect(err.details).toEqual({ errors: [{ field: 'excerpt', code: 'required' }] })
    expect(await live('medicine-all')).toBeUndefined()
  })

  it('republishes in place, keeping the first slug and publishedAt', async () => {
    await db.collection('articleDrafts').doc('d1').set(draft())
    await run('publishArticle', creator('alice'), { draftId: 'd1' })
    const first = await live('medicine-all')
    await db.collection('articleDrafts').doc('d1').update({ slug: 'renamed-later', title: 'หัวข้อใหม่' })
    const res = await run('publishArticle', creator('alice'), { draftId: 'd1' })
    expect(res.slug).toBe('medicine-all')
    const second = await live('medicine-all')
    expect(second.title).toBe('หัวข้อใหม่')
    expect(second.publishedAt.isEqual(first.publishedAt)).toBe(true)
    expect(await live('renamed-later')).toBeUndefined()
  })

  it('rejects a missing draft id or draft', async () => {
    await expect(run('publishArticle', creator('alice'), {})).rejects.toMatchObject({ code: 'invalid-argument' })
    await expect(run('publishArticle', creator('alice'), { draftId: 'nope' })).rejects.toMatchObject({
      code: 'failed-precondition',
    })
  })
})

describe('unpublishArticle', () => {
  beforeEach(async () => {
    await db.collection('articleDrafts').doc('d1').set(draft())
    await run('publishArticle', creator('alice'), { draftId: 'd1' })
  })

  it('refuses a stranger and keeps the article', async () => {
    await expect(run('unpublishArticle', creator('bob'), { slug: 'medicine-all' })).rejects.toMatchObject({
      code: 'permission-denied',
    })
    expect(await live('medicine-all')).toBeDefined()
  })

  it('removes the live article for its author but keeps the draft and its slug', async () => {
    expect(await run('unpublishArticle', creator('alice'), { slug: 'medicine-all' })).toEqual({ ok: true })
    expect(await live('medicine-all')).toBeUndefined()
    const stored = (await db.collection('articleDrafts').doc('d1').get()).data()
    expect(stored.publishedSlug).toBe('medicine-all')
    expect(stored.isLive).toBe(false)
  })

  it('lets the author republish after an unpublish', async () => {
    await run('unpublishArticle', creator('alice'), { slug: 'medicine-all' })
    expect((await run('publishArticle', creator('alice'), { draftId: 'd1' })).slug).toBe('medicine-all')
    expect(await live('medicine-all')).toBeDefined()
    expect((await db.collection('articleDrafts').doc('d1').get()).data().isLive).toBe(true)
  })

  it('lets the super-admin unpublish, and reports a missing article', async () => {
    expect(await run('unpublishArticle', { uid: SUPER_UID }, { slug: 'medicine-all' })).toEqual({ ok: true })
    await expect(run('unpublishArticle', creator('alice'), { slug: 'medicine-all' })).rejects.toMatchObject({
      code: 'failed-precondition',
    })
  })
})
