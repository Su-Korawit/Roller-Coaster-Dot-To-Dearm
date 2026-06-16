// Session-scoped guard against crediting the same purchase twice (e.g. a slip
// resent in the gap before Firestore status updates). Mirrors the module-level
// refs in useShopStore. Cross-reload resends are already blocked server-side.
const credited = new Set()

export function creditForResult(purchaseId, result) {
  if (!result?.ok) return 0
  if (!Number.isFinite(result.coins) || result.coins <= 0) return 0
  if (credited.has(purchaseId)) return 0
  credited.add(purchaseId)
  return result.coins
}
