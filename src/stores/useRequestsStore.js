import { create } from 'zustand'
import { getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { refs, queries } from '../lib/db'
import { useAuthStore } from './useAuthStore'
import { validateRequest, cleanRequest, voteId } from '../os/requestsLogic'

// Report app: requests for new apps/websites + votes. One-shot loads (browse on demand); sending
// and voting are explicit button presses, so they write straight away rather than via syncManager.
export const useRequestsStore = create((set, get) => ({
  requests: [],
  votes: [],      // { requestId, uid }
  loading: false,
  error: '',

  load: async () => {
    set({ loading: true, error: '' })
    try {
      const [reqSnap, voteSnap] = await Promise.all([getDocs(queries.osRequestsRecent()), getDocs(queries.osRequestVotesAll())])
      set({
        requests: reqSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        votes: voteSnap.docs.map((d) => d.data()),
        loading: false,
      })
    } catch (e) {
      console.error('[requests] load failed:', e)
      set({ loading: false, error: 'โหลดคำขอไม่สำเร็จ' })
    }
  },

  // Returns an error message or null.
  submit: async (input) => {
    const user = useAuthStore.getState().user
    if (!user?.uid) return 'กรุณาเข้าสู่ระบบก่อน'
    const invalid = validateRequest(input)
    if (invalid) return invalid
    const clean = cleanRequest(input)
    const id = `${user.uid.slice(0, 8)}${Date.now().toString(36)}`
    const name = (user.displayName || 'ผู้ใช้').slice(0, 60)
    try {
      await setDoc(refs.osRequest(id), { ...clean, uid: user.uid, name, status: 'new', createdAt: serverTimestamp() })
    } catch (e) {
      console.error('[requests] submit failed:', e)
      return 'ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง'
    }
    set((s) => ({ requests: [{ id, ...clean, uid: user.uid, name, status: 'new' }, ...s.requests] }))
    return null
  },

  // Toggle my vote. Optimistic; rolled back if the write fails. Returns an error message or null.
  toggleVote: async (requestId) => {
    const uid = useAuthStore.getState().user?.uid
    if (!uid) return 'กรุณาเข้าสู่ระบบก่อนโหวต'
    const had = get().votes.some((v) => v.requestId === requestId && v.uid === uid)
    const apply = (on) => set((s) => ({
      votes: on ? [...s.votes, { requestId, uid }] : s.votes.filter((v) => !(v.requestId === requestId && v.uid === uid)),
    }))
    apply(!had)
    try {
      if (had) await deleteDoc(refs.osRequestVote(voteId(requestId, uid)))
      else await setDoc(refs.osRequestVote(voteId(requestId, uid)), { requestId, uid })
    } catch (e) {
      console.error('[requests] vote failed:', e)
      apply(had)
      return 'โหวตไม่สำเร็จ ลองใหม่อีกครั้ง'
    }
    return null
  },

  remove: async (requestId) => {
    try {
      await deleteDoc(refs.osRequest(requestId))
    } catch (e) {
      console.error('[requests] delete failed:', e)
      return 'ลบคำขอไม่สำเร็จ'
    }
    set((s) => ({ requests: s.requests.filter((r) => r.id !== requestId), votes: s.votes.filter((v) => v.requestId !== requestId) }))
    return null
  },
}))
