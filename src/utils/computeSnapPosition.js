// Default block dimensions per node type, used when React Flow has not yet
// measured a node (node.measured is absent on first render).
export const BLOCK_SIZES = {
  process: { w: 160, h: 80 },
  condition: { w: 112, h: 112 },
  image: { w: 112, h: 112 },
  stageLabel: { w: 120, h: 40 },
}

// Returns the { x, y } the target block should move to so its entry handle
// touches the source block's exit handle (block-to-block snap, no edge line).
export function computeSnapPosition(sourceNode, targetNode, sourceHandle) {
  const sw = sourceNode.measured?.width ?? BLOCK_SIZES[sourceNode.type]?.w ?? 160
  const sh = sourceNode.measured?.height ?? BLOCK_SIZES[sourceNode.type]?.h ?? 80
  const tw = targetNode.measured?.width ?? BLOCK_SIZES[targetNode.type]?.w ?? 160
  const th = targetNode.measured?.height ?? BLOCK_SIZES[targetNode.type]?.h ?? 80
  const { x: sx, y: sy } = sourceNode.position

  switch (sourceHandle) {
    case 'top':
      return { x: sx + sw / 2 - tw / 2, y: sy - th }
    case 'bottom':
      return { x: sx + sw / 2 - tw / 2, y: sy + sh }
    case 'left':
      return { x: sx - tw, y: sy + sh / 2 - th / 2 }
    default: // 'right' or null
      return { x: sx + sw, y: sy + sh / 2 - th / 2 }
  }
}
