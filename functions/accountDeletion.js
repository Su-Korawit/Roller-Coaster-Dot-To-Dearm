/* global module, require */
// Erasure of one student's data (PDPA right to erasure). Dependencies are passed
// in so the whole thing runs against the emulators in tests. Idempotent: every
// step queries by owner, so a retry after a partial failure finishes the job.
//
// What is DELETED: the user document and its subcollections (profile, matches,
// private Spotify token, received credits), roadmaps, File Bag items/folders and
// their Storage files, payment slip images, personal map, timetable templates, Focus records, school
// announcements the user posted, the user's chat messages (and chats left empty),
// RTDB presence/school mirror, and finally the Auth account.
//
// What is RETAINED, on purpose, with the person removed:
//   - purchases + usedSlips: kept as the revenue/dedup ledger, uid replaced by
//     'deleted' (accounting records may have to be retained by law).
//   - other people's messages in a shared chat, and other people's own follow
//     lists (the user's uid is removed from them).
//   - an erasure log entry: SHA-256 of the uid, timestamp and per-step counts,
//     as proof that the request was honoured.
// Known leftovers (documented in the privacy policy): match scores other users
// cached about this uid in their own private `matches` subcollection (orphaned,
// resolve to nothing once the account is gone).

const crypto = require('crypto')

const CHUNK = 400
const DELETED = 'deleted'

// Delete every doc a query returns, in chunks. Returns how many were removed.
async function deleteQuery(db, buildQuery) {
  let n = 0
  for (;;) {
    const snap = await buildQuery().limit(CHUNK).get()
    if (snap.empty) return n
    const batch = db.batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    n += snap.size
  }
}

// Apply `patchFor(doc)` to every doc a query returns. The query must STOP matching
// once patched (an arrayRemove/field change), otherwise this would loop forever.
async function patchQuery(db, buildQuery, patchFor) {
  let n = 0
  for (;;) {
    const snap = await buildQuery().limit(CHUNK).get()
    if (snap.empty) return n
    const batch = db.batch()
    snap.docs.forEach((d) => batch.update(d.ref, patchFor(d)))
    await batch.commit()
    n += snap.size
  }
}

const hashUid = (uid) => crypto.createHash('sha256').update(String(uid)).digest('hex')

async function eraseUser({ admin, db, uid, nowMs = Date.now() }) {
  const FieldValue = admin.firestore.FieldValue
  const counts = {}
  const step = async (name, fn) => { counts[name] = await fn() }

  // ── owned documents ──
  await step('roadmapSheets', () => deleteQuery(db, () => db.collection('roadmapSheets').where('ownerUid', '==', uid)))
  await step('fileBagItems', () => deleteQuery(db, () => db.collection('fileBagItems').where('ownerUid', '==', uid)))
  await step('fileBagFolders', () => deleteQuery(db, () => db.collection('fileBagFolders').where('ownerUid', '==', uid)))
  await step('timetableTemplates', () => deleteQuery(db, () => db.collection('timetableTemplates').where('createdBy', '==', uid)))
  await step('focusDaily', () => deleteQuery(db, () => db.collection('focusDaily').where('uid', '==', uid)))
  await step('focusSessions', () => deleteQuery(db, () => db.collection('focusSessions').where('uid', '==', uid)))
  await step('schoolPosts', () => deleteQuery(db, () => db.collectionGroup('posts').where('authorUid', '==', uid)))
  for (const [name, path] of [['bagSettings', `bagSettings/${uid}`], ['personalMap', `maps/${uid}`], ['focusActive', `focusActive/${uid}`]]) {
    const ref = db.doc(path)
    counts[name] = (await ref.get()).exists ? 1 : 0
    if (counts[name]) await ref.delete()
  }

  // ── Storage: everything the user uploaded — bag, roadmap images/videos/files, and the
  //    payment slip images (bank slips carry account numbers and names) ──
  counts.storage = 'none'
  for (const prefix of [`users/${uid}/`, `slips/${uid}/`]) {
    try {
      await admin.storage().bucket().deleteFiles({ prefix, force: true })
      counts.storage = 'deleted'
    } catch (e) {
      // A missing bucket/prefix is fine; anything else must fail the request so it is retried.
      if (e?.code !== 404) throw e
    }
  }

  // ── other people's documents that mention this user ──
  await step('sharedSheetsLeft', () => patchQuery(
    db,
    () => db.collection('roadmapSheets').where('collaboratorUids', 'array-contains', uid),
    () => ({
      collaboratorUids: FieldValue.arrayRemove(uid),
      [`collaborators.${uid}`]: FieldValue.delete(),
    }),
  ))
  let social = 0
  for (const field of ['followers', 'following', 'followRequests', 'sentRequests']) {
    social += await patchQuery(
      db,
      () => db.collection('users').where(field, 'array-contains', uid),
      () => ({ [field]: FieldValue.arrayRemove(uid) }),
    )
  }
  counts.socialLinksRemoved = social
  await step('creditsAnonymised', () => patchQuery(
    db,
    () => db.collectionGroup('receivedCredits').where('fromUid', '==', uid),
    () => ({ fromUid: DELETED, fromName: '' }),
  ))

  // ── chats: remove the user's messages; drop chats left empty; leave the rest to the other person ──
  const chats = await db.collection('chats').where('members', 'array-contains', uid).get()
  let chatsRemoved = 0
  let messagesRemoved = 0
  for (const chat of chats.docs) {
    messagesRemoved += await deleteQuery(db, () => chat.ref.collection('messages').where('senderId', '==', uid))
    const remaining = await chat.ref.collection('messages').limit(1).get()
    if (remaining.empty) {
      await db.recursiveDelete(chat.ref)
      chatsRemoved += 1
    } else {
      await chat.ref.update({ members: FieldValue.arrayRemove(uid), lastMessage: null })
    }
  }
  counts.chatMessages = messagesRemoved
  counts.chatsRemoved = chatsRemoved

  // ── ledger rows are kept, de-identified ──
  await step('purchasesAnonymised', () => patchQuery(
    db, () => db.collection('purchases').where('uid', '==', uid), () => ({ uid: DELETED }),
  ))
  await step('usedSlipsAnonymised', () => patchQuery(
    db, () => db.collection('usedSlips').where('uid', '==', uid), () => ({ uid: DELETED }),
  ))

  // ── Realtime Database: presence in the user's own world + the school mirror ──
  await admin.database().ref(`worlds/${uid}`).remove()
  await admin.database().ref(`userSchool/${uid}`).remove()

  // ── the user document and everything under it (matches, private/spotify, receivedCredits) ──
  // Deleting it also fires syncUserSchool, which decrements the school's memberCount.
  counts.userDoc = (await db.doc(`users/${uid}`).get()).exists ? 1 : 0
  await db.recursiveDelete(db.doc(`users/${uid}`))

  // ── proof of erasure (no personal data) ──
  await db.collection('accountDeletions').add({ uidHash: hashUid(uid), deletedAt: nowMs, counts })

  // ── the Auth account goes last, so a failed run can be retried by the same signed-in user ──
  try {
    await admin.auth().deleteUser(uid)
  } catch (e) {
    if (e?.code !== 'auth/user-not-found') throw e
  }
  return counts
}

module.exports = { eraseUser, hashUid, DELETED }
