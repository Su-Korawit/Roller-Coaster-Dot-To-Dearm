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
  spotifyAuth: (uid)            => doc(db, 'users', uid, 'private', 'spotify'),
  mapConfig:   (key)            => doc(db, 'mapConfigs', key),
  musicConfig: (docId)          => doc(db, 'musicConfig', docId),
  assetFolder: (id)             => doc(db, 'assetFolders', id),
  farmItem:    (id)             => doc(db, 'farmItems', id),
  farmPlant:   (id)             => doc(db, 'farmPlants', id),
  farmShop:    (id)             => doc(db, 'farmShops', id),
  roadmapSheet: (sheetId)       => doc(db, 'roadmapSheets', sheetId),
  appUpdate:   (id)             => doc(db, 'appUpdates', id),
  tcasEvent:   (id)             => doc(db, 'tcasEvents', id),
  timetableTemplate: (id)       => doc(db, 'timetableTemplates', id),
  welcomeGamePreview: ()        => doc(db, 'welcomeConfig', 'gamePreview'),
  welcomeStats:       ()        => doc(db, 'welcomeConfig', 'stats'),
  welcomeNewsPost:    (id)     => doc(db, 'welcomeConfig', 'news', 'items', id),
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
  roadmapSheets: collection(db, 'roadmapSheets'),
  mapConfigs:   collection(db, 'mapConfigs'),
  assetFolders: collection(db, 'assetFolders'),
  appUpdates:   collection(db, 'appUpdates'),
  tcasEvents:   collection(db, 'tcasEvents'),
  timetableTemplates: collection(db, 'timetableTemplates'),
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
  sheetsSharedWithMe: (uid) => query(cols.roadmapSheets, where('collaboratorUids', 'array-contains', uid)),
  appUpdatesByDate: () => query(cols.appUpdates, orderBy('createdAt', 'desc')),
  tcasEventsByDate: () => query(cols.tcasEvents, orderBy('date', 'asc')),
  latestTemplates: () => query(cols.timetableTemplates, orderBy('createdAt', 'desc'), limit(20)),
  templatesBySchool: (term) => query(
    cols.timetableTemplates,
    where('schoolName', '>=', term),
    where('schoolName', '<=', prefixUpperBound(term)),
    limit(20),
  ),
}

// ── Document shapes ───────────────────────────────────────────────────────────
// The User document's Profile (mbti/program/career/masteryTrack/university) lives
// under `profile.*` — this module is the single seam for its shape. `schoolId`
// and friends stay top-level because Firestore queries filter on them.
export const shapes = {
  // Canonical write shape: maps select-store fields onto profile.*, keeping only
  // non-empty values and renaming mastery → masteryTrack.
  profileFields: ({ mbti, career, mastery, university, program, plans, activePlanId } = {}) => {
    const profile = {}
    if (mbti)    profile.mbti = mbti
    if (career)  profile.career = career
    if (mastery) profile.masteryTrack = mastery
    if (mastery) profile.masteryTracks = [{ masteryId: mastery, milestones: [], progressPct: 0, addedAt: Date.now() }]

    if (Array.isArray(plans) && plans.length) {
      profile.plans = plans.map((pl) => ({
        id: pl.id,
        university: pl.university ?? null,
        program: pl.program ?? null,
        addedAt: pl.addedAt ?? Date.now(),
      }))
      if (activePlanId) profile.activePlanId = activePlanId
      // Mirror rank-1 (plans[0]) into legacy singular fields for downstream readers.
      const top = profile.plans[0]
      if (top?.university) profile.university = top.university
      if (top?.program) {
        profile.program = top.program
        profile.programs = [{ programId: top.program, addedAt: top.addedAt ?? Date.now() }]
      }
    } else {
      // Fallback: legacy single-select path still works.
      if (university) profile.university = university
      if (program) {
        profile.program = program
        profile.programs = [{ programId: program, addedAt: Date.now() }]
      }
    }
    return profile
  },

  // Canonical read shape: reads profile.* first, falling back to legacy top-level
  // fields (and the legacy `mastery` name) for documents not yet re-synced.
  readProfile: (userDoc = {}) => {
    const p = userDoc.profile ?? {}
    const masteryTrack = p.masteryTrack ?? userDoc.mastery ?? null
    const singleUni = p.university ?? userDoc.university ?? null
    const singleProg = p.program ?? userDoc.program ?? null
    const plans = p.plans
      ?? (singleProg || singleUni
        ? [{ id: 'legacy', university: singleUni, program: singleProg }]
        : [])
    return {
      mbti:       p.mbti ?? userDoc.mbti ?? null,
      program:    singleProg,
      career:     p.career ?? userDoc.career ?? null,
      masteryTrack,
      university: singleUni,
      plans,
      activePlanId: p.activePlanId ?? plans[0]?.id ?? null,
      programs: p.programs ?? (p.program ?? userDoc.program
        ? [{ programId: p.program ?? userDoc.program }]
        : []),
      masteryTracks: p.masteryTracks ?? (masteryTrack
        ? [{ masteryId: masteryTrack }]
        : []),
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

  // Canonical write shape for a brand-new Roadmap sheet doc — the single seam
  // used by migration/bootstrap/service codepaths.
  newRoadmapSheet: ({ ownerUid, name, nodes = [], edges = [], order = 0 }) => ({
    ownerUid,
    name,
    nodes,
    edges,
    order,
    collaborators: {},
    collaboratorUids: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }),

  // Private Spotify connection — refresh token lives in users/{uid}/private/*
  // (owner-only), NEVER the world-readable user doc. See docs/adr/0010.
  spotifyConnection: ({ refreshToken, spotifyUserId }) => ({
    refreshToken,
    spotifyUserId: spotifyUserId ?? null,
    connectedAt: serverTimestamp(),
  }),
}

// ── Path helpers ──────────────────────────────────────────────────────────────
// Canonical 1-to-1 chat id — sorted so both parties derive the same key
// regardless of who initiates.
export function buildChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_')
}
