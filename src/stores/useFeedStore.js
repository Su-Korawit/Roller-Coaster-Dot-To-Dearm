import { create } from 'zustand'
import { getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { refs, queries } from '../lib/db'
import { useAuthStore } from './useAuthStore'
import { validatePost, cleanPost, likeId } from '../os/feedLogic'

// Community feed: posts + likes. One-shot loads (pull to refresh); posting and liking are explicit
// button presses, so they write straight away rather than through syncManager.
export const useFeedStore = create((set, get) => ({
  posts: [],
  likes: [],     // { postId, uid }
  loading: false,
  error: '',

  load: async () => {
    set({ loading: true, error: '' })
    try {
      const [postSnap, likeSnap] = await Promise.all([getDocs(queries.osPostsRecent()), getDocs(queries.osPostLikesAll())])
      set({
        posts: postSnap.docs.map((d) => ({ id: d.id, ...d.data(), createdAtMs: d.data().createdAt?.toMillis?.() ?? 0 })),
        likes: likeSnap.docs.map((d) => d.data()),
        loading: false,
      })
    } catch (e) {
      console.error('[feed] load failed:', e)
      set({ loading: false, error: 'โหลดฟีดไม่สำเร็จ' })
    }
  },

  // Returns an error message or null.
  submit: async (input) => {
    const user = useAuthStore.getState().user
    if (!user?.uid) return 'กรุณาเข้าสู่ระบบก่อน'
    const invalid = validatePost(input)
    if (invalid) return invalid
    const clean = cleanPost(input)
    const id = `${user.uid.slice(0, 8)}${Date.now().toString(36)}`
    const name = (user.displayName || 'ผู้ใช้').slice(0, 60)
    try {
      await setDoc(refs.osPost(id), { ...clean, uid: user.uid, name, createdAt: serverTimestamp() })
    } catch (e) {
      console.error('[feed] post failed:', e)
      return 'โพสต์ไม่สำเร็จ ลองใหม่อีกครั้ง'
    }
    set((s) => ({ posts: [{ id, ...clean, uid: user.uid, name, createdAtMs: Date.now() }, ...s.posts] }))
    return null
  },

  // Toggle my like. Optimistic; rolled back if the write fails. Returns an error message or null.
  toggleLike: async (postId) => {
    const uid = useAuthStore.getState().user?.uid
    if (!uid) return 'กรุณาเข้าสู่ระบบก่อน'
    const had = get().likes.some((l) => l.postId === postId && l.uid === uid)
    const apply = (on) => set((s) => ({
      likes: on ? [...s.likes, { postId, uid }] : s.likes.filter((l) => !(l.postId === postId && l.uid === uid)),
    }))
    apply(!had)
    try {
      if (had) await deleteDoc(refs.osPostLike(likeId(postId, uid)))
      else await setDoc(refs.osPostLike(likeId(postId, uid)), { postId, uid })
    } catch (e) {
      console.error('[feed] like failed:', e)
      apply(had)
      return 'กดถูกใจไม่สำเร็จ ลองใหม่อีกครั้ง'
    }
    return null
  },

  remove: async (postId) => {
    try {
      await deleteDoc(refs.osPost(postId))
    } catch (e) {
      console.error('[feed] delete failed:', e)
      return 'ลบโพสต์ไม่สำเร็จ'
    }
    set((s) => ({ posts: s.posts.filter((p) => p.id !== postId), likes: s.likes.filter((l) => l.postId !== postId) }))
    return null
  },
}))
