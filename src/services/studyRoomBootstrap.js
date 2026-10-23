// Post-login Study Room setup: read the Leaves balance, claim the welcome pack once, then
// load the room layout and catalog. Every part is isolated: a failure in one never stops the
// next, and nothing here can block sign-in (the caller wraps it in a step).
import { useLeavesStore } from '../stores/useLeavesStore'
import { useRoomStore } from '../stores/useRoomStore'
import { useFocusHistoryStore } from '../stores/useFocusHistoryStore'
import { claimWelcomePack } from './roomApi'

const safely = async (name, fn) => {
  try {
    await fn()
    return true
  } catch (e) {
    console.error(`[studyRoomBootstrap] ${name} failed:`, e)
    return false
  }
}

export async function bootstrapStudyRoom(uid) {
  await safely('leaves', () => useLeavesStore.getState().hydrate(uid))
  if (useLeavesStore.getState().welcomePack !== 'v2') {
    const claimed = await safely('welcome pack', () => claimWelcomePack())
    if (claimed) await safely('leaves after claim', () => useLeavesStore.getState().hydrate(uid))
  }
  await safely('room', () => useRoomStore.getState().hydrate(uid))
  await safely('history', () => useFocusHistoryStore.getState().load(uid)) // the trophy shelf
}
