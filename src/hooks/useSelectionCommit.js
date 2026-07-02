import { useAuthStore } from '../stores/useAuthStore'
import { syncSelectToFirestore } from '../utils/syncSelectToFirestore'

// Every /select/* page pairs a useSelectStore setter with a push to
// Firestore under the signed-in user's profile — this wraps that pairing
// once instead of five times. Not a React hook internally (no useState/
// useEffect); named useX to match where it's called from and what it stands
// in for at each call site.
export function useSelectionCommit(setter) {
  return (value) => {
    setter(value)
    syncSelectToFirestore(useAuthStore.getState().user?.uid)
  }
}
