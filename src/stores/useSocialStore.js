import { create } from 'zustand'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  arrayRemove,
  arrayUnion,
} from 'firebase/firestore'
import { auth, db } from '../firebase'

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
  // matchScore is incremented externally (e.g. shared MBTI/program/mastery).
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
}))
