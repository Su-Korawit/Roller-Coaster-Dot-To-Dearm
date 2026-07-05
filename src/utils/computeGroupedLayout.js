import { BLOCK_SIZES } from './computeSnapPosition'
import { computeStageMembership } from './computeStageMembership'
import { computeMainLineY } from './computeMainLineY'

// Returns a NEW nodes array (input is never mutated) where every node that is
// a member of some stage (per computeStageMembership) has its position.y
// changed so its vertical center sits exactly on the shared main line (per
// computeMainLineY). Horizontal position (x) is left untouched.
export function computeGroupedLayout(nodes) {
  const mainLineY = computeMainLineY(nodes)
  if (mainLineY == null) return nodes.map((n) => ({ ...n }))

  const membership = computeStageMembership(nodes)
  const memberIds = new Set(Object.values(membership).flat())

  return nodes.map((node) => {
    if (!memberIds.has(node.id)) return { ...node }
    const height = node.measured?.height ?? BLOCK_SIZES[node.type]?.h ?? 80
    return {
      ...node,
      position: { ...node.position, y: mainLineY - height / 2 },
    }
  })
}
