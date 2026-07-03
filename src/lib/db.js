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
  user:        (uid)            => doc(db, 'users', uid),
  userMatch:   (uid, targetUid) => doc(db, 'users', uid, 'matches', targetUid),
  chat:        (chatId)         => doc(db, 'chats', chatId),
  chatMessage: (chatId, msgId)  => doc(db, 'chats', chatId, 'messages', msgId),
  purchase:    (purchaseId)     => doc(db, 'purchases', purchaseId),
  product:     (productId)      => doc(db, 'shopProducts', productId),
  map:         (uid)            => doc(db, 'maps', uid),
  mapConfig:   (key)            => doc(db, 'mapConfigs', key),
  musicConfig: (docId)          => doc(db, 'musicConfig', docId),
  assetFolder: (id)             => doc(db, 'assetFolders', id),
  farmItem:    (id)             => doc(db, 'farmItems', id),
  farmPlant:   (id)             => doc(db, 'farmPlants', id),
  farmShop:    (id)             => doc(db, 'farmShops', id),
  appUpdate:   (id)             => doc(db, 'appUpdates', id),
  welcomeGamePreview: ()        => doc(db, 'welcomeConfig', 'gamePreview'),
  welcomeStats:       ()        => doc(db, 'welcomeConfig', 'stats'),
}

// ── Collection refs ───────────────────────────────────────────────────────────
// Static collections are plain values; dynamic subcollections are functions.
export const cols = {
  users:        collection(db, 'users'),
  chats:        collection(db, 'chats'),
  shopProducts: collection(db, 'shopProducts'),
  purchases:    collection(db, 'purchases'),
  maps:         collection(db, 'maps'),
  farmPlants:   collection(db, 'farmPlants'),
  farmItems:    collection(db, 'farmItems'),
  farmShops:    collection(db, 'farmShops'),
  mapConfigs:   collection(db, 'mapConfigs'),
  assetFolders: collection(db, 'assetFolders'),
  appUpdates:   collection(db, 'appUpdates'),
  chatMessages: (chatId) => collection(db, 'chats', chatId, 'messages'),
  userMatches:  (uid)    => collection(db, 'users', uid, 'matches'),
  userCredits:  (uid)    => collection(db, 'users', uid, 'receivedCredits'),
  welcomeNews:         collection(db, 'welcomeConfig', 'news', 'items'),
  welcomeFaq:          collection(db, 'welcomeConfig', 'faq', 'items'),
  welcomeTestimonials: collection(db, 'welcomeConfig', 'testimonials', 'items'),
}

// ── Query builders ────────────────────────────────────────────────────────────
export const prefixUpperBound = (term) => term + ''

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
  searchUsersBySchool: (term)    => query(
    cols.users,
    where('schoolName', '>=', term),
    where('schoolName', '<=', prefixUpperBound(term)),
    limit(20),
  ),
  matchedUsers:    () => query(cols.users, where('matchScore', '>', 0), limit(20)),
  activeProducts:  () => query(cols.shopProducts, where('active', '==', true)),
  purchasesByUser: (uid) => query(cols.purchases, where('uid', '==', uid)),
  appUpdatesByDate: () => query(cols.appUpdates, orderBy('createdAt', 'desc')),
}

// ── Document shapes ───────────────────────────────────────────────────────────
// The User document's Profile (mbti/program/career/masteryTrack/university) lives
// under `profile.*` — this module is the single seam for its shape. `schoolId`
// and friends stay top-level because Firestore queries filter on them.
export const shapes = {
  // Canonical write shape: maps select-store fields onto profile.*, keeping only
  // non-empty values and renaming mastery → masteryTrack.
  profileFields: ({ mbti, career, mastery, university, program } = {}) => {
    const profile = {}
    if (mbti)       profile.mbti = mbti
    if (career)     profile.career = career
    if (mastery)    profile.masteryTrack = mastery
    if (university) profile.university = university
    if (program)    profile.program = program
    return profile
  },

  // Canonical read shape: reads profile.* first, falling back to legacy top-level
  // fields (and the legacy `mastery` name) for documents not yet re-synced.
  readProfile: (userDoc = {}) => {
    const p = userDoc.profile ?? {}
    return {
      mbti:         p.mbti ?? userDoc.mbti ?? null,
      program:      p.program ?? userDoc.program ?? null,
      career:       p.career ?? userDoc.career ?? null,
      masteryTrack: p.masteryTrack ?? userDoc.mastery ?? null,
      university:   p.university ?? userDoc.university ?? null,
    }
  },

  initialUser: (firebaseUser, select = {}) => ({
    uid:            firebaseUser.uid,
    displayName:    firebaseUser.displayName ?? '',
    email:          firebaseUser.email ?? '',
    photoURL:       firebaseUser.photoURL ?? null,
    profile:        shapes.profileFields(select),
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
