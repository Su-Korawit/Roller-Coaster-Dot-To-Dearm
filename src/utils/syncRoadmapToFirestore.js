import { setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { refs } from '../lib/db'
import { useRoadmapStore } from '../stores/useRoadmapStore'

let currentUid = null
let subscribed = false
let timer = null
let suppress = false

export async function syncRoadmapToFirestore(uid) {
  if (!uid) return
  const { nodes, edges } = useRoadmapStore.getState()
  try {
    await setDoc(
      refs.user(uid),
      { roadmap: { nodes, edges }, roadmapUpdatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (error) {
    console.error('[syncRoadmapToFirestore] failed:', error)
  }
}

export async function hydrateRoadmapFromFirestore(uid) {
  if (!uid) return
  try {
    const snap = await getDoc(refs.user(uid))
    const data = snap.exists() ? snap.data() : {}

    if (data.roadmap) {
      suppress = true
      useRoadmapStore.setState({
        nodes: data.roadmap.nodes ?? [],
        edges: data.roadmap.edges ?? [],
      })
      suppress = false
    }

    if (!data.roadmap) {
      await syncRoadmapToFirestore(uid)
    }
  } catch (error) {
    console.error('[hydrateRoadmapFromFirestore] failed:', error)
  }
}

export function setRoadmapSyncUser(uid) {
  currentUid = uid
  if (!uid) clearTimeout(timer)

  if (subscribed) return
  subscribed = true
  useRoadmapStore.subscribe((state, prev) => {
    if (suppress || !currentUid) return
    if (state.nodes === prev.nodes && state.edges === prev.edges) return
    clearTimeout(timer)
    timer = setTimeout(() => syncRoadmapToFirestore(currentUid), 1000)
  })
}
