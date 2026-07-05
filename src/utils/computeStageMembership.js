import { BLOCK_SIZES } from './computeSnapPosition'
import { computeNodeCenter } from './computeNodeCenter'

// Returns { [stageId]: [memberId, ...] } — for every non-stageLabel node whose
// horizontal center falls within a stageLabel's [x, x + width] range. A node
// outside every stage's range is omitted entirely (no "unassigned" bucket).
// When a node's center falls inside more than one stage's range (overlapping
// stages), it is assigned to the stage whose left edge (x) is closest to the
// node's center — i.e. the stage with the largest x among the matches, since
// every matching stage's x is <= the node's center by definition of "in range".
export function computeStageMembership(nodes) {
  const stages = nodes
    .filter((n) => n.type === 'stageLabel')
    .map((n) => ({
      id: n.id,
      x: n.position.x,
      width: n.width ?? BLOCK_SIZES.stageLabel.w,
    }))

  const membership = {}
  for (const stage of stages) membership[stage.id] = []

  for (const node of nodes) {
    if (node.type === 'stageLabel') continue
    const { x: centerX } = computeNodeCenter(node)
    let best = null
    for (const stage of stages) {
      const inRange = centerX >= stage.x && centerX <= stage.x + stage.width
      if (!inRange) continue
      if (!best || stage.x > best.x) best = stage
    }
    if (best) membership[best.id].push(node.id)
  }

  return membership
}
