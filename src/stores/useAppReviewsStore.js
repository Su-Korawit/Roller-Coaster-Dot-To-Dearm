import { create } from 'zustand'
import { getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { refs, queries } from '../lib/db'
import { useAuthStore } from './useAuthStore'
import { reviewId, validateReview, sortReviews } from '../os/reviewsLogic'

// Store app reviews. One-shot fetch per app (browse-on-demand). Submitting is an explicit user
// action (a button press), so it writes straight away rather than going through syncManager.
export const useAppReviewsStore = create((set, get) => ({
  appId: null,
  reviews: [],
  loading: false,
  error: '',

  load: async (appId) => {
    set({ appId, reviews: [], loading: true, error: '' })
    try {
      const snap = await getDocs(queries.osAppReviewsByApp(appId))
      if (get().appId !== appId) return          // user opened another app meanwhile
      set({ reviews: sortReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), loading: false })
    } catch (e) {
      console.error('[appReviews] load failed:', e)
      if (get().appId === appId) set({ loading: false, error: 'โหลดรีวิวไม่สำเร็จ' })
    }
  },

  // Create or replace my review of `appId`. Returns an error message or null.
  submit: async (appId, { rating, text }) => {
    const user = useAuthStore.getState().user
    if (!user?.uid) return 'กรุณาเข้าสู่ระบบก่อนรีวิว'
    const clean = { rating, text: (text ?? '').trim() }
    const invalid = validateReview(clean)
    if (invalid) return invalid
    const name = (user.displayName || 'ผู้ใช้').slice(0, 60)
    try {
      await setDoc(refs.osAppReview(reviewId(appId, user.uid)), {
        appId, uid: user.uid, name, ...clean, updatedAt: serverTimestamp(),
      })
    } catch (e) {
      console.error('[appReviews] submit failed:', e)
      return 'ส่งรีวิวไม่สำเร็จ ลองใหม่อีกครั้ง'
    }
    const mine = { id: reviewId(appId, user.uid), appId, uid: user.uid, name, ...clean }
    set((s) => (s.appId === appId
      ? { reviews: sortReviews([mine, ...s.reviews.filter((r) => r.uid !== user.uid)]) }
      : s))
    return null
  },

  remove: async (appId) => {
    const uid = useAuthStore.getState().user?.uid
    if (!uid) return 'กรุณาเข้าสู่ระบบก่อน'
    try {
      await deleteDoc(refs.osAppReview(reviewId(appId, uid)))
    } catch (e) {
      console.error('[appReviews] delete failed:', e)
      return 'ลบรีวิวไม่สำเร็จ'
    }
    set((s) => ({ reviews: s.reviews.filter((r) => r.uid !== uid) }))
    return null
  },
}))
