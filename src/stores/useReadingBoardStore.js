import { create } from 'zustand'
import { getDocs, setDoc, serverTimestamp } from 'firebase/firestore'
import { refs, queries } from '../lib/db'
import { useAuthStore } from './useAuthStore'
import { useLifeStore, selectRoomId } from './useLifeStore'
import { sumMinutes, thisWeekMinutes, weekStartKey } from '../os/studyPlan'
import { todayKey } from '../os/lifeLogic'

// Reading leaderboard. Each user owns one doc osReading/{uid} (this week's minutes + total);
// the group board is everyone with the same roomId (same faculty + major), fetched on demand.
export const useReadingBoardStore = create((set) => ({
  entries: [],
  loading: false,
  error: '',

  load: async (roomId) => {
    if (!roomId) { set({ entries: [], loading: false, error: '' }); return }
    set({ loading: true, error: '' })
    try {
      const snap = await getDocs(queries.osReadingByRoom(roomId))
      set({ entries: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false })
    } catch (e) {
      console.error('[readingBoard] load failed:', e)
      set({ loading: false, error: 'โหลดอันดับไม่สำเร็จ' })
    }
  },

  // Publish my current numbers (from the local reading log). Returns an error message or null.
  publish: async () => {
    const user = useAuthStore.getState().user
    if (!user?.uid) return 'กรุณาเข้าสู่ระบบก่อน'
    const life = useLifeStore.getState()
    const today = todayKey()
    const entry = {
      uid: user.uid,
      name: (user.displayName || 'ผู้ใช้').slice(0, 60),
      roomId: selectRoomId(life),
      weekKey: weekStartKey(today),
      weekMinutes: Math.min(10080, Math.round(thisWeekMinutes(life.readLog, today))),
      totalMinutes: Math.round(sumMinutes(life.readLog)),
    }
    try {
      await setDoc(refs.osReading(user.uid), { ...entry, updatedAt: serverTimestamp() })
    } catch (e) {
      console.error('[readingBoard] publish failed:', e)
      return 'อัปเดตอันดับไม่สำเร็จ'
    }
    set((s) => ({ entries: [entry, ...s.entries.filter((x) => x.uid !== user.uid)] }))
    return null
  },
}))
