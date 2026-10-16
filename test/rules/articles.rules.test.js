// Content site rules: public `articles` (no client writes), creator-only `articleDrafts`,
// `siteConfig`, and creator-only article images in Storage.
// Requires the Firestore + Storage emulators: npm run test:rules:emu
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where } from 'firebase/firestore'
import { ref, uploadBytes, getBytes } from 'firebase/storage'

const SUPER_UID = 'IaltEhO0mPVfK3ng8npr4CdqnEE3'
let testEnv

const fs = (uid, claims) => testEnv.authenticatedContext(uid, claims).firestore()
const creator = (uid) => fs(uid, { creator: true })
const anon = () => testEnv.unauthenticatedContext().firestore()

const draft = (over = {}) => ({
  authorUid: 'alice',
  authorName: 'Alice',
  title: 'หัวข้อ',
  slug: 'my-article',
  category: 'guide',
  excerpt: 'สรุป',
  tags: [],
  coverUrl: 'https://x.org/c.png',
  coverAlt: 'ปก',
  body: '{"type":"doc","content":[{"type":"paragraph"}]}',
  ...over,
})

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rcdtd',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  })
})

afterAll(async () => { await testEnv?.cleanup() })

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'articles/live-one'), { title: 'เผยแพร่แล้ว', authorUid: 'alice', draftId: 'd1' })
    await setDoc(doc(db, 'articleDrafts/d1'), draft({ publishedSlug: 'live-one' }))
    await setDoc(doc(db, 'articleDrafts/d2'), draft({ authorUid: 'bob', slug: 'bobs' }))
    await setDoc(doc(db, 'siteConfig/hub'), { lineOpenChatUrl: 'https://line.me/ti/g2/abc' })
  })
})

describe('articles (public, server-written)', () => {
  it('lets anyone read a live article', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'articles/live-one')))
    await assertSucceeds(getDocs(collection(anon(), 'articles')))
  })

  it('lets NO client write, including creators and the super-admin', async () => {
    const data = { title: 'x', authorUid: 'alice', draftId: 'd1' }
    await assertFails(setDoc(doc(anon(), 'articles/a'), data))
    await assertFails(setDoc(doc(creator('alice'), 'articles/a'), data))
    await assertFails(setDoc(doc(fs(SUPER_UID), 'articles/a'), data))
    await assertFails(updateDoc(doc(creator('alice'), 'articles/live-one'), { title: 'hacked' }))
    await assertFails(deleteDoc(doc(creator('alice'), 'articles/live-one')))
    await assertFails(deleteDoc(doc(fs(SUPER_UID), 'articles/live-one')))
  })
})

describe('articleDrafts', () => {
  it('lets a creator create a draft as themselves', async () => {
    await assertSucceeds(setDoc(doc(creator('carol'), 'articleDrafts/d3'), draft({ authorUid: 'carol' })))
  })

  it('blocks users without the creator claim, and anonymous users', async () => {
    await assertFails(setDoc(doc(fs('carol'), 'articleDrafts/d3'), draft({ authorUid: 'carol' })))
    await assertFails(setDoc(doc(anon(), 'articleDrafts/d3'), draft({ authorUid: 'carol' })))
  })

  it('blocks creating a draft for someone else or with server-owned fields', async () => {
    const c = creator('carol')
    await assertFails(setDoc(doc(c, 'articleDrafts/x1'), draft({ authorUid: 'alice' })))
    await assertFails(setDoc(doc(c, 'articleDrafts/x2'), draft({ authorUid: 'carol', publishedSlug: 'stolen' })))
    await assertFails(setDoc(doc(c, 'articleDrafts/x3'), draft({ authorUid: 'carol', featured: true })))
  })

  it('lets the author read and edit their own draft but not change owner or published slug', async () => {
    const a = creator('alice')
    await assertSucceeds(getDoc(doc(a, 'articleDrafts/d1')))
    await assertSucceeds(updateDoc(doc(a, 'articleDrafts/d1'), { title: 'แก้ไขแล้ว' }))
    await assertFails(updateDoc(doc(a, 'articleDrafts/d1'), { authorUid: 'bob' }))
    await assertFails(updateDoc(doc(a, 'articleDrafts/d1'), { publishedSlug: 'other' }))
    await assertFails(updateDoc(doc(a, 'articleDrafts/d1'), { featured: true }))
  })

  it("hides one creator's drafts from another and from the public", async () => {
    await assertFails(getDoc(doc(creator('alice'), 'articleDrafts/d2')))
    await assertFails(getDoc(doc(anon(), 'articleDrafts/d1')))
    await assertFails(updateDoc(doc(creator('alice'), 'articleDrafts/d2'), { title: 'ยึดไป' }))
  })

  it('allows an author-scoped list query', async () => {
    const q = query(collection(creator('alice'), 'articleDrafts'), where('authorUid', '==', 'alice'))
    await assertSucceeds(getDocs(q))
    await assertFails(getDocs(collection(creator('alice'), 'articleDrafts')))
  })

  it('lets the super-admin read and edit any draft', async () => {
    const s = fs(SUPER_UID)
    await assertSucceeds(getDoc(doc(s, 'articleDrafts/d2')))
    await assertSucceeds(updateDoc(doc(s, 'articleDrafts/d2'), { title: 'ผู้ดูแลแก้ให้' }))
    await assertSucceeds(getDocs(collection(s, 'articleDrafts')))
  })

  it('only lets an author delete a draft that was never published', async () => {
    await assertFails(deleteDoc(doc(creator('alice'), 'articleDrafts/d1')))
    await assertSucceeds(deleteDoc(doc(creator('bob'), 'articleDrafts/d2')))
    await assertFails(deleteDoc(doc(creator('alice'), 'articleDrafts/d2')))
    await assertSucceeds(deleteDoc(doc(fs(SUPER_UID), 'articleDrafts/d1')))
  })
})

describe('siteConfig', () => {
  it('is public to read and super-admin only to write', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'siteConfig/hub')))
    await assertFails(setDoc(doc(creator('alice'), 'siteConfig/hub'), { lineOpenChatUrl: 'https://evil' }))
    await assertSucceeds(setDoc(doc(fs(SUPER_UID), 'siteConfig/hub'), { lineOpenChatUrl: 'https://line.me/ti/g2/new' }))
  })
})

describe('storage articles/**', () => {
  const PNG = new Uint8Array([137, 80, 78, 71])
  const store = (uid, claims) => testEnv.authenticatedContext(uid, claims).storage()

  it('lets a creator upload a small image', async () => {
    await assertSucceeds(uploadBytes(ref(store('alice', { creator: true }), 'articles/d1/a.png'), PNG, { contentType: 'image/png' }))
  })

  it('rejects a non-image, an oversize file, a non-creator and anonymous users', async () => {
    const c = store('alice', { creator: true })
    await assertFails(uploadBytes(ref(c, 'articles/d1/a.html'), PNG, { contentType: 'text/html' }))
    const big = new Uint8Array(5 * 1024 * 1024 + 1)
    await assertFails(uploadBytes(ref(c, 'articles/d1/big.png'), big, { contentType: 'image/png' }))
    await assertFails(uploadBytes(ref(store('carol'), 'articles/d1/a.png'), PNG, { contentType: 'image/png' }))
    await assertFails(uploadBytes(ref(testEnv.unauthenticatedContext().storage(), 'articles/d1/a.png'), PNG, { contentType: 'image/png' }))
  })

  it('lets the super-admin upload and everyone read', async () => {
    await assertSucceeds(uploadBytes(ref(store(SUPER_UID), 'articles/d1/s.png'), PNG, { contentType: 'image/png' }))
    await assertSucceeds(getBytes(ref(testEnv.unauthenticatedContext().storage(), 'articles/d1/s.png')))
  })
})
