import { BLOCK_SIZES } from './computeSnapPosition'

function dims(node) {
  return {
    w: node.measured?.width ?? BLOCK_SIZES[node.type]?.w ?? 160,
    h: node.measured?.height ?? BLOCK_SIZES[node.type]?.h ?? 80,
  }
}

// Connectable dots for a node, in world coordinates, tagged with their role.
function getHandles(node) {
  const { w, h } = dims(node)
  const { x, y } = node.position
  switch (node.type) {
    case 'process':
    case 'ideaRoot':
    case 'update':
    case 'success':
      return [
        { role: 'target', id: null, x, y: y + h / 2 },
        { role: 'source', id: null, x: x + w, y: y + h / 2 },
        { role: 'source', id: 'top', x: x + w / 2, y },
        { role: 'source', id: 'bottom', x: x + w / 2, y: y + h },
      ]
    case 'condition':
      return [
        { role: 'target', id: null, x, y: y + h / 2 },
        { role: 'source', id: 'top', x: x + w / 2, y },
        { role: 'source', id: 'bottom', x: x + w / 2, y: y + h },
      ]
    case 'image':
      return [
        { role: 'source', id: 'left', x, y: y + h / 2 },
        { role: 'source', id: 'right', x: x + w, y: y + h / 2 },
        { role: 'source', id: 'top', x: x + w / 2, y },
        { role: 'source', id: 'bottom', x: x + w / 2, y: y + h },
      ]
    default:
      return []
  }
}

// When the dragged block is released, find the closest dot pair within
// `threshold`. Dots have no in/out direction — any dragged dot connects to any
// nearby dot. Returns the edge to add plus the position the dragged block must
// move to so the two dots coincide — or null if nothing is close. The edge is
// still oriented (a real source/target) for React Flow: a target dot becomes
// the edge target when one is involved, otherwise the dragged dot is the source.
export function findProximityConnection(draggedNode, otherNodes, threshold) {
  const draggedHandles = getHandles(draggedNode)
  let best = null

  for (const other of otherNodes) {
    for (const oh of getHandles(other)) {
      for (const dh of draggedHandles) {
        const dist = Math.hypot(dh.x - oh.x, dh.y - oh.y)
        if (dist > threshold) continue
        if (best && dist >= best.dist) continue
        const draggedIsSource = dh.role === 'source' || dh.role === oh.role
        best = {
          dist,
          connection: draggedIsSource
            ? { source: draggedNode.id, target: other.id, sourceHandle: dh.id, targetHandle: oh.id }
            : { source: other.id, target: draggedNode.id, sourceHandle: oh.id, targetHandle: dh.id },
          position: {
            x: draggedNode.position.x + (oh.x - dh.x),
            y: draggedNode.position.y + (oh.y - dh.y),
          },
        }
      }
    }
  }

  return best ? { connection: best.connection, position: best.position } : null
}
