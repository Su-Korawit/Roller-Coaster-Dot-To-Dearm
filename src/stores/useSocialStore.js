import { create } from 'zustand'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  arrayRemove,
  arrayUnion,
} from 'firebase/firestore'
import { auth, db } from '../firebase'

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
export function calculateMatchScore(a, b) {
  if (!a || !b) return 0
  let score = 0

  // Program: 40 pts exact match, 20 pts same career family
  if (a.program && b.program) {
    if (a.program === b.program) {
      score += 40
    } else {
      const fa = CAREER_FAMILY_MAP[a.program]
      const fb = CAREER_FAMILY_MAP[b.program]
      if (fa && fb && fa === fb) score += 20
    }
  }

  // Mastery track: 25 pts
  if (a.mastery && b.mastery && a.mastery === b.mastery) score += 25

  // MBTI type: 15 pts
  if (a.mbti && b.mbti && a.mbti === b.mbti) score += 15

  // University: 10 pts
  if (a.university && b.university && a.university === b.university) score += 10

  // Same school (schoolId): 10 pts
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

  // Adds myUid to target's followRequests array and targetUid to my sentRequests.
  // arrayUnion is idempotent — safe to call if a request was already sent.
  sendFollowRequest: async (targetUid) => {
    const uid = myUid()
    const batch = writeBatch(db)
    batch.update(doc(db, 'users', targetUid), {
      followRequests: arrayUnion(uid),
    })
    // sentRequests field is created by arrayUnion if it doesn't exist yet.
    batch.update(doc(db, 'users', uid), {
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
    batch.update(doc(db, 'users', uid), {
      followRequests: arrayRemove(fromUid),
      followers: arrayUnion(fromUid),
    })
    batch.update(doc(db, 'users', fromUid), {
      following: arrayUnion(uid),
      sentRequests: arrayRemove(uid),
    })
    await batch.commit()
    set((s) => ({
      pendingRequests: s.pendingRequests.filter((id) => id !== fromUid),
      followers: [...new Set([...s.followers, fromUid])],
    }))
  },

  // Removes fromUid from my followRequests without creating a follow relationship.
  rejectFollowRequest: async (fromUid) => {
    const uid = myUid()
    const batch = writeBatch(db)
    batch.update(doc(db, 'users', uid), {
      followRequests: arrayRemove(fromUid),
    })
    batch.update(doc(db, 'users', fromUid), {
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
    const q = query(
      collection(db, 'users'),
      where('schoolId', '==', schoolId),
      limit(50),
    )
    const snap = await getDocs(q)
    const users = snap.docs.map((d) => d.data()).filter((u) => u.uid !== uid)
    set({ nearbyUsers: users })
  },

  // Fetches the current user's Firestore doc and syncs all social arrays into the store.
  loadMyProfile: async () => {
    const uid = myUid()
    const snap = await getDoc(doc(db, 'users', uid))
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
    _unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
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

  // Fetches users whose matchScore is above 0, excluding the current user.
  loadMatchedUsers: async () => {
    const uid = myUid()
    const q = query(
      collection(db, 'users'),
      where('matchScore', '>', 0),
      limit(20),
    )
    const snap = await getDocs(q)
    const users = snap.docs.map((d) => d.data()).filter((u) => u.uid !== uid)
    set({ matchedUsers: users })
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
            doc(db, 'users', uid, 'matches', other.uid),
            { score, matchedAt: serverTimestamp() },
          )
          matched.push({ ...other, matchScore: score })
        }
      }),
    )
    set({ matchedUsers: matched })
  },
}))
