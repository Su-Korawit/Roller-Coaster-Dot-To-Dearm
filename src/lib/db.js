import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'

// ── Document refs ─────────────────────────────────────────────────────────────
export const refs = {
  user:      (uid)            => doc(db, 'users', uid),
  userMatch: (uid, targetUid) => doc(db, 'users', uid, 'matches', targetUid),
  chat:      (chatId)         => doc(db, 'chats', chatId),
  purchase:  (purchaseId)     => doc(db, 'purchases', purchaseId),
  product:   (productId)      => doc(db, 'shopProducts', productId),
}

// ── Collection refs ───────────────────────────────────────────────────────────
// Static collections are plain values; dynamic subcollections are functions.
export const cols = {
  users:        collection(db, 'users'),
  chats:        collection(db, 'chats'),
  shopProducts: collection(db, 'shopProducts'),
  purchases:    collection(db, 'purchases'),
  chatMessages: (chatId) => collection(db, 'chats', chatId, 'messages'),
  userMatches:  (uid)    => collection(db, 'users', uid, 'matches'),
}

// ── Query builders ────────────────────────────────────────────────────────────
export const queries = {
  chatsByMember:     (uid)      => query(cols.chats, where('members', 'array-contains', uid)),
  messagesByChat:    (chatId)   => query(cols.chatMessages(chatId), orderBy('createdAt', 'asc')),
  nearbyUsers:       (schoolId) => query(cols.users, where('schoolId', '==', schoolId), limit(50)),
  searchUsersByName: (term)     => query(
    cols.users,
    where('displayName', '>=', term),
    where('displayName', '<=', term + ''),
    limit(20),
  ),
  matchedUsers:    () => query(cols.users, where('matchScore', '>', 0), limit(20)),
  activeProducts:  () => query(cols.shopProducts, where('active', '==', true)),
  purchasesByUser: (uid) => query(cols.purchases, where('uid', '==', uid)),
}

// ── Document shapes ───────────────────────────────────────────────────────────
export const shapes = {
  initialUser: (firebaseUser, { mbti = null, program = null, university = null, mastery = null } = {}) => ({
    uid:            firebaseUser.uid,
    displayName:    firebaseUser.displayName ?? '',
    email:          firebaseUser.email ?? '',
    photoURL:       firebaseUser.photoURL ?? null,
    mbti,
    program,
    university,
    mastery,
    schoolId:       null,
    schoolName:     null,
    schoolLat:      null,
    schoolLng:      null,
    followRequests: [],
    followers:      [],
    following:      [],
    matchScore:     0,
    fireStacks:     0,
    createdAt:      serverTimestamp(),
  }),
}

// ── Path helpers ──────────────────────────────────────────────────────────────
// Canonical 1-to-1 chat id — sorted so both parties derive the same key
// regardless of who initiates.
export function buildChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_')
}
