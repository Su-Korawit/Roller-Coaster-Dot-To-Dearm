import { BLOCK_SIZES } from './computeSnapPosition'

// Top-left position a new block of `type` needs so it is centred on a given
// world-space point — the inverse of computeNodeCenter. Used to drop a new
// block at the centre of whatever the user is currently viewing.
export function computeCenteredPosition(center, type) {
  const w = BLOCK_SIZES[type]?.w ?? 160
  const h = BLOCK_SIZES[type]?.h ?? 80
  return {
    x: center.x - w / 2,
    y: center.y - h / 2,
  }
}
