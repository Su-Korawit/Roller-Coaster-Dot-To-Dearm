// The room the scene draws and the room UI edits: the student's own, or (part 2, friend visits) a
// friend's, read-only. One place decides, so a visitor can never be handed the editing paths.
import { useRoomStore } from '../stores/useRoomStore'

export function currentRoomView() {
  const { layout, catalog } = useRoomStore.getState()
  return { layout, catalog, readOnly: false, ownerUid: null }
}
