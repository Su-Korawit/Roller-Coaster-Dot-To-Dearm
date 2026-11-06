import { create } from 'zustand'
import { onSnapshot, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { cols, refs, queries } from '../lib/db'
import { useAuthStore } from './useAuthStore'

export const MAX_CHAT_TEXT = 500
export const GENERAL_ROOM = 'general'

let unsubscribe = null

// Live chat of one OS community room (same faculty + major, or the open "general" room).
// One room is watched at a time; switching rooms detaches the previous listener.
export const useRoomChatStore = create((set, get) => ({
  roomId: null,
  messages: [],   // oldest first
  status: 'idle', // idle | loading | ready | denied | error

  open: (roomId) => {
    if (get().roomId === roomId && unsubscribe) return
    unsubscribe?.()
    unsubscribe = null
    if (!roomId) { set({ roomId: null, messages: [], status: 'idle' }); return }
    set({ roomId, messages: [], status: 'loading' })
    unsubscribe = onSnapshot(
      queries.osRoomMessages(roomId),
      (snap) => {
        if (get().roomId !== roomId) return
        const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()
        set({ messages, status: 'ready' })
      },
      (error) => {
        console.error('[roomChat] listener failed:', error)
        if (get().roomId === roomId) set({ status: error?.code === 'permission-denied' ? 'denied' : 'error' })
      },
    )
  },

  close: () => {
    unsubscribe?.()
    unsubscribe = null
    set({ roomId: null, messages: [], status: 'idle' })
  },

  // Returns an error message (Thai) or null.
  send: async (roomId, text) => {
    const user = useAuthStore.getState().user
    const clean = (text ?? '').trim()
    if (!user?.uid) return 'กรุณาเข้าสู่ระบบก่อน'
    if (!roomId) return 'ยังไม่มีห้องแชต'
    if (!clean) return 'พิมพ์ข้อความก่อนส่ง'
    if (clean.length > MAX_CHAT_TEXT) return `ข้อความยาวเกิน ${MAX_CHAT_TEXT} ตัวอักษร`
    try {
      await addDoc(cols.osRoomMessages(roomId), {
        uid: user.uid,
        name: (user.displayName || 'ผู้ใช้').slice(0, 60),
        text: clean,
        createdAt: serverTimestamp(),
      })
      return null
    } catch (e) {
      console.error('[roomChat] send failed:', e)
      return 'ส่งข้อความไม่สำเร็จ ลองใหม่อีกครั้ง'
    }
  },

  remove: async (roomId, messageId) => {
    try {
      await deleteDoc(refs.osRoomMessage(roomId, messageId))
      return null
    } catch (e) {
      console.error('[roomChat] delete failed:', e)
      return 'ลบข้อความไม่สำเร็จ'
    }
  },
}))
