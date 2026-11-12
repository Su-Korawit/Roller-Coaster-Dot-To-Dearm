import { useEffect } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { refs } from '../lib/db'
import { hydrateOsDeviceFromFirestore, isOsDevicePending, osDeviceEquals } from '../lib/syncManager'
import { cleanOsDevice } from './osDeviceSync'
import { useOsStore } from '../stores/useOsStore'

// Another device changed the installed apps / Home layout while this one is open: pull it in
// (unless this device has an edit of its own still waiting to be sent).
export function useOsDeviceSync(uid) {
  useEffect(() => {
    if (!uid) return undefined
    const unsub = onSnapshot(
      refs.user(uid),
      (snap) => {
        if (snap.metadata.hasPendingWrites || isOsDevicePending()) return
        const cloud = cleanOsDevice(snap.data()?.osDevice)
        if (!cloud) return
        const local = useOsStore.getState()
        if (osDeviceEquals(local, { ...cloud, wallpaperId: cloud.wallpaperId ?? local.wallpaperId })) return
        hydrateOsDeviceFromFirestore(uid).catch(() => {})
      },
      () => {},
    )
    return unsub
  }, [uid])
}
