// The room the scene draws and the room UI edits: the student's own, or (part 2, friend visits) a
// friend's, read-only. One place decides, so a visitor can never be handed the editing paths.
import { useRoomStore } from '../stores/useRoomStore'
import { useLeavesStore } from '../stores/useLeavesStore'
import { useVisitStore } from '../stores/useVisitStore'

// The avatar the scene dresses the player in: always the student's own (a visitor keeps their outfit).
export const currentAvatar = () => useLeavesStore.getState().avatar

export function currentRoomView() {
  const { layout, catalog } = useRoomStore.getState()
  const visiting = useVisitStore.getState().visiting
  if (visiting) return { layout: visiting.layout, catalog, readOnly: true, ownerUid: visiting.ownerUid }
  return { layout, catalog, readOnly: false, ownerUid: null }
}
