import { getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { refs } from '../lib/db'

// Background-music chapter list for HomePage. Each track marks a title + the
// second offset where it starts inside the single streamed audio file
// (media/audio/Background_Music_1.mp3). Stored in Firestore `musicConfig/background`
// so an admin can edit it; DEFAULT_TRACKS reproduces the previously-hardcoded list
// so HomePage is unchanged until the first save (and if Firestore is unreachable).

export const MUSIC_DOC_ID = 'background'

export const DEFAULT_TRACKS = [
  { title: 'Miitopia - Catalog', start: 0 },
  { title: 'Miitopia - Present', start: 67 },
  { title: 'January 2014 - Nintendo eShop', start: 112 },
  { title: 'Miitomo Summer Shop Music', start: 282 },
]

const cfgRef = () => refs.musicConfig(MUSIC_DOC_ID)

// Returns the stored track list, or the built-in default. Falls back to the
// default on a missing doc or any read error so the player always has tracks.
export async function getMusicConfig() {
  try {
    const snap = await getDoc(cfgRef())
    if (!snap.exists()) return { tracks: DEFAULT_TRACKS }
    const tracks = snap.data().tracks
    return { tracks: Array.isArray(tracks) && tracks.length > 0 ? tracks : DEFAULT_TRACKS }
  } catch {
    return { tracks: DEFAULT_TRACKS }
  }
}

export async function saveMusicConfig(tracks, uid) {
  if (!uid) console.warn('[saveMusicConfig] no uid passed — updatedBy will be null (audit trail lost)')
  await setDoc(
    cfgRef(),
    { tracks, updatedAt: serverTimestamp(), updatedBy: uid ?? null },
    { merge: true },
  )
}
