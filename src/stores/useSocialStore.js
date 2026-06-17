import { create } from 'zustand'
import {
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  arrayRemove,
  arrayUnion,
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import { refs, cols, queries, shapes } from '../lib/db'

// ─── Career family mapping ────────────────────────────────────────────────────
// Groups career ids into families so "similar program" scoring works.
// Handles both id (e.g. 'data-scientist') and display name (e.g. 'Data Scientist').
const CAREER_FAMILY_MAP = {
  'data-scientist': 'analyst',    'Data Scientist': 'analyst',
  'ml-engineer': 'analyst',       'AI / ML Specialist': 'analyst',
  'ai-architect': 'analyst',      'AI Solutions Architect': 'analyst',
  'prompt-engineer': 'analyst',   'Prompt Engineer': 'analyst',
  'product-manager': 'analyst',   'Product Manager': 'analyst',
  'fintech-developer': 'analyst', 'Fintech Developer': 'analyst',
  'ui-ux': 'diplomat',            'UI/UX Designer': 'diplomat',
  'content-strategist': 'diplomat','Content Strategist': 'diplomat',
  'learning-designer': 'diplomat','Learning Experience Designer': 'diplomat',
  'wellness-coach': 'diplomat',   'Digital Wellness Coach': 'diplomat',
  'hr-tech': 'diplomat',          'HR Tech Specialist': 'diplomat',
  'cybersecurity': 'sentinel',    'Cybersecurity Analyst': 'sentinel',
  'compliance-officer': 'sentinel','Digital Compliance Officer': 'sentinel',
  'project-manager': 'sentinel',  'Project Manager (Agile)': 'sentinel',
  'cloud-ops': 'sentinel',        'Cloud Operations Engineer': 'sentinel',
  'business-analyst': 'sentinel', 'Business Analyst': 'sentinel',
  'fullstack-dev': 'explorer',    'Full-Stack Developer': 'explorer',
  'digital-artist': 'explorer',   'Digital Artist / 3D Creator': 'explorer',
  'game-developer': 'explorer',   'Game Developer': 'explorer',
  'growth-hacker': 'explorer',    'Growth Hacker': 'explorer',
  'iot-engineer': 'explorer',     'IoT / Hardware Engineer': 'explorer',
}

// ─── Match scoring ─────────────────────────────────────────────────────────────
// Reads each user's Profile through the canonical shape seam (shapes.readProfile),
// which resolves profile.* with a legacy top-level fallback.
export function calculateMatchScore(a, b) {
  if (!a || !b) return 0
  let score = 0

  const pa = shapes.readProfile(a)
  const pb = shapes.readProfile(b)
  const aProgram    = pa.program
  const bProgram    = pb.program
  const aMastery    = pa.masteryTrack
  const bMastery    = pb.masteryTrack
  const aMbti       = pa.mbti
  const bMbti       = pb.mbti
  const aUniversity = pa.university
  const bUniversity = pb.university

  // Program: 40 pts exact match, 20 pts same career family
  if (aProgram && bProgram) {
    if (aProgram === bProgram) {
      score += 40
    } else {
      const fa = CAREER_FAMILY_MAP[aProgram]
      const fb = CAREER_FAMILY_MAP[bProgram]
      if (fa && fb && fa === fb) score += 20
    }
  }

  // Mastery track: 25 pts
  if (aMastery && bMastery && aMastery === bMastery) score += 25

  // MBTI type: 15 pts
  if (aMbti && bMbti && aMbti === bMbti) score += 15

  // University: 10 pts
  if (aUniversity && bUniversity && aUniversity === bUniversity) score += 10

  // Same school (schoolId): 10 pts — always top-level
  if (a.schoolId && b.schoolId && a.schoolId === b.schoolId) score += 10

  return Math.min(score, 100)
}

// Throws if called before auth is ready — actions guard against this.
function myUid() {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('[useSocialStore] Not authenticated')
  return uid
}

// Module-level ref so unsubscribing doesn't cause a Zustand state update.
let _unsub = null

export const useSocialStore = create((set) => ({
  nearbyUsers: [],
  following: [],
  followers: [],
  pendingRequests: [],
  sentRequests: [],
  matchedUsers: [],
  searchResults: [],
  // Match feature state
  matchResult: null,        // { matched, score, targetUser } | null
  checkedMatches: {},       // { [targetUid]: { score, status:'checking'|'matched'|'no-match', checkedAt } }
  matches: [],              // MatchedTab list: [{ uid, score, checkedAt, user }]

  // Adds myUid to target's followRequests array and targetUid to my sentRequests.
  // arrayUnion is idempotent — safe to call if a request was already sent.
  sendFollowRequest: async (targetUid) => {
    const uid = myUid()
    const batch = writeBatch(db)
    batch.update(refs.user(targetUid), {
      followRequests: arrayUnion(uid),
    })
    // sentRequests field is created by arrayUnion if it doesn't exist yet.
    batch.update(refs.user(uid), {
      sentRequests: arrayUnion(targetUid),
    })
    await batch.commit()
    set((s) => ({
      sentRequests: [...new Set([...s.sentRequests, targetUid])],
    }))
  },

  // Removes fromUid from my followRequests, adds to my followers,
  // and adds me to fromUid's following — all in one atomic batch.
  acceptFollowRequest: async (fromUid) => {
    const uid = myUid()
    const batch = writeBatch(db)
    batch.update(refs.user(uid), {
      followRequests: arrayRemove(fromUid),
      followers: arrayUnion(fromUid),
    })
    batch.update(refs.user(fromUid), {
      following: arrayUnion(uid),
      sentRequests: arrayRemove(uid),
    })
    await batch.commit()
    set((s) => ({
      pendingRequests: s.pendingRequests.filter((id) => id !== fromUid),
      followers: [...new Set([...s.followers, fromUid])],
    }))
  },

  // Removes targetUid from my following and removes me from their followers.
  unfollowUser: async (targetUid) => {
    const uid = myUid()
    const batch = writeBatch(db)
    batch.update(refs.user(uid), { following: arrayRemove(targetUid) })
    batch.update(refs.user(targetUid), { followers: arrayRemove(uid) })
    await batch.commit()
    set((s) => ({ following: s.following.filter((id) => id !== targetUid) }))
  },

  // Removes fromUid from my followRequests without creating a follow relationship.
  rejectFollowRequest: async (fromUid) => {
    const uid = myUid()
    const batch = writeBatch(db)
    batch.update(refs.user(uid), {
      followRequests: arrayRemove(fromUid),
    })
    batch.update(refs.user(fromUid), {
      sentRequests: arrayRemove(uid),
    })
    await batch.commit()
    set((s) => ({
      pendingRequests: s.pendingRequests.filter((id) => id !== fromUid),
    }))
  },

  // Queries users at the same school, excluding the current user. Limit 50.
  loadNearbyUsers: async (schoolId) => {
    if (!schoolId) return
    const uid = myUid()
    const snap = await getDocs(queries.nearbyUsers(schoolId))
    const users = snap.docs.map((d) => d.data()).filter((u) => u.uid !== uid)
    set({ nearbyUsers: users })
  },

  // Fetches the current user's Firestore doc and syncs all social arrays into the store.
  loadMyProfile: async () => {
    const uid = myUid()
    const snap = await getDoc(refs.user(uid))
    if (!snap.exists()) return
    const data = snap.data()
    set({
      following: data.following ?? [],
      followers: data.followers ?? [],
      pendingRequests: data.followRequests ?? [],
      sentRequests: data.sentRequests ?? [],
    })
  },

  // Attaches a real-time listener to the current user's doc.
  // Replaces any existing listener. Returns the unsubscribe function.
  subscribeToRequests: (uid) => {
    if (_unsub) {
      _unsub()
      _unsub = null
    }
    _unsub = onSnapshot(refs.user(uid), (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      set({
        pendingRequests: data.followRequests ?? [],
        followers: data.followers ?? [],
        following: data.following ?? [],
        sentRequests: data.sentRequests ?? [],
      })
    })
    return _unsub
  },

  // Prefix search on displayName across all users — works regardless of schoolId.
  // Uses Firestore range query ( trick) so no extra index is needed.
  // Clears results when term is empty.
  searchUsers: async (term) => {
    const uid = myUid()
    if (!term.trim()) {
      set({ searchResults: [] })
      return
    }
    const snap = await getDocs(queries.searchUsersByName(term))
    const results = snap.docs.map((d) => d.data()).filter((u) => u.uid !== uid)
    set({ searchResults: results })
  },

  // Fetches users whose matchScore is above 0, excluding the current user.
  loadMatchedUsers: async () => {
    const uid = myUid()
    const snap = await getDocs(queries.matchedUsers())
    const users = snap.docs.map((d) => d.data()).filter((u) => u.uid !== uid)
    set({ matchedUsers: users })
  },

  setMatchResult: (result) => set({ matchResult: result }),
  clearMatchResult: () => set({ matchResult: null }),

  // Fetch both profiles, compute score, save to subcollection, trigger overlay.
  checkAndAnimateMatch: async (targetUid) => {
    let uid
    try { uid = myUid() } catch { return }

    set((s) => ({
      checkedMatches: { ...s.checkedMatches, [targetUid]: { status: 'checking' } },
    }))

    try {
      const [mySnap, theirSnap] = await Promise.all([
        getDoc(refs.user(uid)),
        getDoc(refs.user(targetUid)),
      ])

      if (!mySnap.exists() || !theirSnap.exists()) {
        set((s) => { const n = { ...s.checkedMatches }; delete n[targetUid]; return { checkedMatches: n } })
        return
      }

      const myData = mySnap.data()
      const theirData = theirSnap.data()
      const score = calculateMatchScore(myData, theirData)
      const status = score >= 60 ? 'matched' : 'no-match'
      const checkedAt = new Date()

      await setDoc(
        refs.userMatch(uid, targetUid),
        { score, checkedAt: serverTimestamp() },
        { merge: true },
      )

      set((s) => ({
        checkedMatches: { ...s.checkedMatches, [targetUid]: { score, status, checkedAt } },
        matchResult: { matched: score >= 60, score, targetUser: theirData },
      }))
    } catch (err) {
      console.error('[checkAndAnimateMatch] error:', err)
      set((s) => { const n = { ...s.checkedMatches }; delete n[targetUid]; return { checkedMatches: n } })
    }
  },

  // Load matches subcollection → populate checkedMatches + matches list.
  loadMatches: async () => {
    let uid
    try { uid = myUid() } catch { return }

    try {
      const snap = await getDocs(cols.userMatches(uid))
      if (snap.empty) return

      const allChecked = {}
      const highScore = []

      for (const d of snap.docs) {
        const data = d.data()
        const checkedAt = data.checkedAt?.toDate?.() ?? null
        const status = data.score >= 60 ? 'matched' : 'no-match'
        allChecked[d.id] = { score: data.score, status, checkedAt }
        if (data.score >= 60) highScore.push({ uid: d.id, score: data.score, checkedAt })
      }

      const matchesWithUsers = (
        await Promise.all(
          highScore.map(async (m) => {
            const userSnap = await getDoc(refs.user(m.uid))
            return userSnap.exists() ? { ...m, user: userSnap.data() } : null
          }),
        )
      ).filter(Boolean).sort((a, b) => b.score - a.score)

      set((s) => ({
        checkedMatches: { ...s.checkedMatches, ...allChecked },
        matches: matchesWithUsers,
      }))
    } catch (err) {
      console.error('[loadMatches] error:', err)
    }
  },

  // Scores each nearby user against myProfile, writes docs for score >= 60,
  // and updates matchedUsers in the store.
  computeAndSaveMatchScores: async (myProfile, nearbyUsers) => {
    const uid = myUid()
    const matched = []
    await Promise.all(
      nearbyUsers.map(async (other) => {
        const score = calculateMatchScore(myProfile, other)
        if (score >= 60) {
          await setDoc(
            refs.userMatch(uid, other.uid),
            { score, matchedAt: serverTimestamp() },
          )
          matched.push({ ...other, matchScore: score })
        }
      }),
    )
    set({ matchedUsers: matched })
  },
}))
