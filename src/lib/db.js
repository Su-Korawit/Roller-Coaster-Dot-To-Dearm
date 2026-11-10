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
import { normalizeHotbar } from './hotbarRules'
import { sanitizeResume } from './resumeRules'
import { sanitizeGuide } from './guideRules'

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
  school:      (schoolId)       => doc(db, 'schools', schoolId),
  schoolPost:  (schoolId, postId) => doc(db, 'schoolBoards', schoolId, 'posts', postId),
  focusActive: (uid)            => doc(db, 'focusActive', uid),
  leaderboardMeta: ()           => doc(db, 'leaderboardMeta', 'current'),
  schoolWeek:  (schoolId, week) => doc(db, 'schoolWeeks', `${schoolId}_${week}`),
  focusDaily:  (uid, day)       => doc(db, 'focusDaily', `${uid}_${day}`),
  musicConfig: (docId)          => doc(db, 'musicConfig', docId),
  assetFolder: (id)             => doc(db, 'assetFolders', id),
  roomCatalog: (id)             => doc(db, 'roomCatalog', id),
  room:        (uid)            => doc(db, 'rooms', uid),
  roadmapSheet: (sheetId)       => doc(db, 'roadmapSheets', sheetId),
  appUpdate:   (id)             => doc(db, 'appUpdates', id),
  tcasEvent:   (id)             => doc(db, 'tcasEvents', id),
  timetableTemplate: (id)       => doc(db, 'timetableTemplates', id),
  osAppReview:       (id)       => doc(db, 'osAppReviews', id),
  osReading:         (uid)      => doc(db, 'osReading', uid),
  osRequest:         (id)       => doc(db, 'osRequests', id),
  osRequestVote:     (id)       => doc(db, 'osRequestVotes', id),
  osPost:            (id)       => doc(db, 'osPosts', id),
  osPostLike:        (id)       => doc(db, 'osPostLikes', id),
  osRoomMessage:     (roomId, id) => doc(db, 'osRooms', roomId, 'messages', id),
  entitlementItem: (id)         => doc(db, 'entitlementCatalog', id),
  welcomeGamePreview: ()        => doc(db, 'welcomeConfig', 'gamePreview'),
  welcomeStats:       ()        => doc(db, 'welcomeConfig', 'stats'),
  welcomeNewsPost:    (id)     => doc(db, 'welcomeConfig', 'news', 'items', id),
  fileBagItem:   (id)  => doc(db, 'fileBagItems', id),
  fileBagFolder: (id)  => doc(db, 'fileBagFolders', id),
  bagSettings:    (uid) => doc(db, 'bagSettings', uid),
  article:        (slug) => doc(db, 'articles', slug),
  articleDraft:   (id)   => doc(db, 'articleDrafts', id),
  siteConfigHub:  ()     => doc(db, 'siteConfig', 'hub'),
}

// ── Collection refs ───────────────────────────────────────────────────────────
// Static collections are plain values; dynamic subcollections are functions.
export const cols = {
  users:        collection(db, 'users'),
  chats:        collection(db, 'chats'),
  shopProducts: collection(db, 'shopProducts'),
  purchases:    collection(db, 'purchases'),
  maps:         collection(db, 'maps'),
  roomCatalog:  collection(db, 'roomCatalog'),
  focusSessions: collection(db, 'focusSessions'),
  roadmapSheets: collection(db, 'roadmapSheets'),
  mapConfigs:   collection(db, 'mapConfigs'),
  assetFolders: collection(db, 'assetFolders'),
  appUpdates:   collection(db, 'appUpdates'),
  tcasEvents:   collection(db, 'tcasEvents'),
  timetableTemplates: collection(db, 'timetableTemplates'),
  osAppReviews:       collection(db, 'osAppReviews'),
  osReading:          collection(db, 'osReading'),
  osRequests:         collection(db, 'osRequests'),
  osRequestVotes:     collection(db, 'osRequestVotes'),
  osPosts:            collection(db, 'osPosts'),
  osPostLikes:        collection(db, 'osPostLikes'),
  osRoomMessages:     (roomId) => collection(db, 'osRooms', roomId, 'messages'),
  entitlementCatalog: collection(db, 'entitlementCatalog'),
  fileBagItems:   collection(db, 'fileBagItems'),
  fileBagFolders: collection(db, 'fileBagFolders'),
  bagSettings:     collection(db, 'bagSettings'),
  analyticsDaily:  collection(db, 'analyticsDaily'),
  articles:        collection(db, 'articles'),
  articleDrafts:   collection(db, 'articleDrafts'),
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
  topSchools:        (week, n = 20) => query(
    collection(db, 'schoolWeeks'),
    where('week', '==', week),
    where('ranked', '==', true),
    orderBy('avgHoursPerMember', 'desc'),
    limit(n),
  ),
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
  sheetByShareId: (shareId) => query(
    cols.roadmapSheets,
    where('shareId', '==', shareId),
    where('public', '==', true),
    limit(1),
  ),
  appUpdatesByDate: () => query(cols.appUpdates, orderBy('createdAt', 'desc')),
  tcasEventsByDate: () => query(cols.tcasEvents, orderBy('date', 'asc')),
  schoolPostsRecent: (schoolId, n = 20) => query(
    collection(db, 'schoolBoards', schoolId, 'posts'), orderBy('createdAt', 'desc'), limit(n),
  ),
  osAppReviewsByApp: (appId, n = 50) => query(cols.osAppReviews, where('appId', '==', appId), limit(n)),
  osRoomMessages:  (roomId, n = 100) => query(cols.osRoomMessages(roomId), orderBy('createdAt', 'desc'), limit(n)),
  osRequestsRecent: (n = 100) => query(cols.osRequests, orderBy('createdAt', 'desc'), limit(n)),
  osRequestVotesAll: (n = 1000) => query(cols.osRequestVotes, limit(n)),
  osPostsRecent: (n = 100) => query(cols.osPosts, orderBy('createdAt', 'desc'), limit(n)),
  osPostLikesAll: (n = 2000) => query(cols.osPostLikes, limit(n)),
  osReadingByRoom: (roomId, n = 50) => query(cols.osReading, where('roomId', '==', roomId), limit(n)),
  latestTemplates: () => query(cols.timetableTemplates, orderBy('createdAt', 'desc'), limit(20)),
  templatesBySchool: (term) => query(
    cols.timetableTemplates,
    where('schoolName', '>=', term),
    where('schoolName', '<=', prefixUpperBound(term)),
    limit(20),
  ),
  activeEntitlements: () => query(cols.entitlementCatalog, where('active', '==', true)),
  fileBagItemsByOwner: (uid) => query(cols.fileBagItems, where('ownerUid', '==', uid)),
  fileBagItemsByFolder: (uid, folderId) => query(
    cols.fileBagItems,
    where('ownerUid', '==', uid),
    where('folderId', '==', folderId),
  ),
  fileBagFoldersByOwner: (uid) => query(cols.fileBagFolders, where('ownerUid', '==', uid)),
  // Content site: newest published first; a creator's drafts are filtered by author only
  // (sorted client-side) to avoid a composite index; the super-admin lists all by updatedAt.
  publishedArticles: (n = 60) => query(cols.articles, orderBy('publishedAt', 'desc'), limit(n)),
  draftsByAuthor:    (uid)    => query(cols.articleDrafts, where('authorUid', '==', uid)),
  allDrafts:         ()       => query(cols.articleDrafts, orderBy('updatedAt', 'desc')),
}

// ── Document shapes ───────────────────────────────────────────────────────────
// The User document's Profile (mbti/program/career/masteryTrack/university) lives
// under `profile.*` — this module is the single seam for its shape. `schoolId`
// and friends stay top-level because Firestore queries filter on them.
export const shapes = {
  // users/{uid}.hotbar: always 7 unique, ready item ids including warp (repaired, never thrown on).
  hotbar: (d) => normalizeHotbar(d?.hotbar),

  // users/{uid}.guide = { started, step, done, skipped }: malformed data is a fresh guide.
  guide: (d) => sanitizeGuide(d?.guide),

  // users/{uid}.resume = { last, points }: malformed parts are dropped, never thrown on.
  resume: (d) => sanitizeResume(d?.resume),

  // Study Room layout as saved by the saveRoomLayout function (rooms/{uid}); a missing doc
  // is the starter room. Malformed placements are dropped, never thrown on.
  roomLayout: (d) => ({
    tier: Number.isInteger(d?.tier) ? d.tier : 0,
    theme: typeof d?.theme === 'string' ? d.theme : 'minimal',
    placed: (Array.isArray(d?.placed) ? d.placed : []).filter(
      (p) => p && typeof p.itemId === 'string' && Number.isFinite(p.x) && Number.isFinite(p.y),
    ),
    petId: typeof d?.petId === 'string' ? d.petId : null,
  }),

  // Canonical write shape: maps select-store fields onto profile.*, keeping only
  // non-empty values and renaming mastery → masteryTrack.
  profileFields: ({ mbti, career, mastery, university, program, plans, activePlanId, goalHours } = {}) => {
    const profile = {}
    if (mbti)    profile.mbti = mbti
    if (career)  profile.career = career
    if (mastery) profile.masteryTrack = mastery
    if (mastery) profile.masteryTracks = [{ masteryId: mastery, milestones: [], progressPct: 0, addedAt: Date.now() }]

    if (Array.isArray(plans) && plans.length) {
      // v2 entries (the Plan, ADR-0025) carry their round, rank, scores and checklist.
      profile.plans = plans.map((pl) => (pl.v === 2
        ? {
            id: pl.id, v: 2, addedAt: pl.addedAt ?? Date.now(),
            university: pl.university ?? null, program: pl.program ?? null,
            universityId: pl.universityId ?? null, universityName: pl.universityName ?? null,
            programId: pl.programId ?? null, programName: pl.programName ?? null, buildingId: pl.buildingId ?? null,
            round: pl.round ?? null, rank: pl.rank ?? null, projectName: pl.projectName ?? null,
            scores: pl.scores ?? [], minGpax: pl.minGpax ?? null, checklist: pl.checklist ?? [],
          }
        : {
            id: pl.id,
            university: pl.university ?? null,
            program: pl.program ?? null,
            addedAt: pl.addedAt ?? Date.now(),
          }))
      if (goalHours && Object.keys(goalHours).length) profile.goalHours = goalHours
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
      ...(p.goalHours ? { goalHours: p.goalHours } : {}),
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

  // File Bag item — Firestore pointer to a Storage object (or reference duplicate).
  fileBagItem: ({
    ownerUid,
    storagePath,
    name,
    kind,
    source,
    folderId = null,
    sizeBytes = 0,
    position = { x: 80, y: 80 },
  }) => ({
    ownerUid,
    storagePath,
    name,
    kind,
    source,
    folderId,
    sizeBytes,
    position,
    createdAt: serverTimestamp(),
  }),

  fileBagFolder: ({
    ownerUid,
    name,
    parentId = null,
    position = { x: 80, y: 80 },
  }) => ({
    ownerUid,
    name,
    parentId,
    position,
    createdAt: serverTimestamp(),
  }),

  bagSettings: ({ visibleCategories }) => ({
    visibleCategories: visibleCategories ?? ['images', 'videos', 'files', 'exports', 'trash'],
    updatedAt: serverTimestamp(),
  }),
}

// ── Path helpers ──────────────────────────────────────────────────────────────
// Canonical 1-to-1 chat id — sorted so both parties derive the same key
// regardless of who initiates.
export function buildChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_')
}
