import { create } from 'zustand'

// The "add to plan" flow. Whoever shows a program (the Open House popup) calls openAdd(program):
//   program = { universityId, universityName, programId, programName, buildingId,
//               rounds: [{ round: 1..4, projects: [{ nameTh, seats, minGpax, scores: [{ key, label, weight }] }] }] }
// RoundPickerSheet (mounted in RoomLayer) renders while `adding` is set.
export const usePlanUiStore = create((set) => ({
  adding: null,
  openAdd: (program) => set({ adding: program }),
  closeAdd: () => set({ adding: null }),
}))
