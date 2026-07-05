import { BLOCK_SIZES } from './computeSnapPosition'

// The shared horizontal reference line every stage's members align to.
// Rule: the main line Y is the vertical center of the FIRST stageLabel node
// in the array (first by array order, i.e. creation order — new nodes are
// appended in useRoadmapStore.addNode). This is deterministic and stable:
// moving or resizing a later stage never shifts where every other stage's
// members line up, which an average-of-all-stages rule would do on every
// drag. Returns null when there are no stageLabel nodes (nothing to align to).
export function computeMainLineY(nodes) {
  const firstStage = nodes.find((n) => n.type === 'stageLabel')
  if (!firstStage) return null
  const height = firstStage.height ?? BLOCK_SIZES.stageLabel.h
  return firstStage.position.y + height / 2
}
