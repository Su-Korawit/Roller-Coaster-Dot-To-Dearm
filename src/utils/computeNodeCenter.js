import { BLOCK_SIZES } from './computeSnapPosition'

// World-space centre of a block — its position (top-left) plus half its size.
// Prefers React Flow's measured dimensions, falling back to the per-type
// default. Used to pan the canvas so a selected block sits centred on screen.
export function computeNodeCenter(node) {
  const w = node.measured?.width ?? BLOCK_SIZES[node.type]?.w ?? 160
  const h = node.measured?.height ?? BLOCK_SIZES[node.type]?.h ?? 80
  return {
    x: node.position.x + w / 2,
    y: node.position.y + h / 2,
  }
}
