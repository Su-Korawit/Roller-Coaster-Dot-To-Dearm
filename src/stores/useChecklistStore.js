import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toggleId } from '../os/checklistLogic'

// Which checklist items the student ticked, per list: { [listId]: itemId[] }. Kept on this device
// (localStorage). Unknown ids are dropped when a list is opened, so changing the JSON never breaks it.
export const useChecklistStore = create(
  persist(
    (set) => ({
      checked: {},
      toggle: (listId, itemId) =>
        set((s) => ({ checked: { ...s.checked, [listId]: toggleId(s.checked[listId], itemId) } })),
      setChecked: (listId, ids) => set((s) => ({ checked: { ...s.checked, [listId]: ids } })),
      reset: (listId) =>
        set((s) => {
          const { [listId]: _gone, ...rest } = s.checked
          return { checked: rest }
        }),
    }),
    { name: 'rc-checklist', version: 1, partialize: (s) => ({ checked: s.checked }) },
  ),
)
