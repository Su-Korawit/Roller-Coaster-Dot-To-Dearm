import { useEffect } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { refs } from '../lib/db'
import { hydrateOsFromFirestore } from '../lib/syncManager'

import { shouldReloadForVoice } from './voiceSyncLogic'

// The voice secretary edits the plan on the server (users/{uid}.os.tasks) while the student is on the phone,
// and bumps `osVoiceRev`. When that number changes while the OS is open, reload the plan so the new or moved
// task shows up at once, and so the next debounced client write does not overwrite it with a stale list.
export function useVoiceSync(uid) {
  useEffect(() => {
    if (!uid) return undefined
    let prev   // undefined until the first snapshot: only changes after it count
    const unsub = onSnapshot(
      refs.user(uid),
      (snap) => {
        if (snap.metadata.hasPendingWrites) return
        const rev = snap.data()?.osVoiceRev ?? null
        if (shouldReloadForVoice(prev, rev)) hydrateOsFromFirestore(uid).catch(() => {})
        prev = rev
      },
      () => {},
    )
    return unsub
  }, [uid])
}
