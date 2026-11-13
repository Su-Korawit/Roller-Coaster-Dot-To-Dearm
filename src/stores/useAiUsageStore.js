import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { checkLimit, recordUse } from '../os/aiLimit'
import { todayKey } from '../os/lifeLogic'

// How many AI chat messages this student has sent (per day, kept for the current week). Device-local.
export const useAiUsageStore = create(
  persist(
    (set, get) => ({
      ownerUid: null,
      log: {},
      adoptUser: (uid) => set((s) => (s.ownerUid === uid ? s : { ownerUid: uid, log: {} })),
      status: (today = todayKey()) => checkLimit(get().log, today),
      // Call after a message was answered.
      record: (today = todayKey()) => set((s) => ({ log: recordUse(s.log, today) })),
    }),
    { name: 'rc-ai-usage', version: 1, partialize: (s) => ({ ownerUid: s.ownerUid, log: s.log }) },
  ),
)
