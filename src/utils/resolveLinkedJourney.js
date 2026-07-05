// Resolves a Roadmap Start block's journeyRef against the live useUserStore
// journeys data. Pure and store-agnostic so it can be unit-tested without
// mounting React or wiring a store — StartNode calls it with whatever
// `journeys` slice it reads from useUserStore.
//
// Returns the live journey item, or null if there is no ref, or if the
// referenced category/id no longer exists (e.g. the item was deleted from
// Profile after being linked).
export function resolveLinkedJourney(journeyRef, journeys) {
  if (!journeyRef) return null
  const list = journeys?.[journeyRef.category]
  if (!Array.isArray(list)) return null
  return list.find((item) => item.id === journeyRef.id) || null
}
