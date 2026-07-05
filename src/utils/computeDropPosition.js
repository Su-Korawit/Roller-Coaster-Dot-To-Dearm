import { computeCenteredPosition } from './computeCenteredPosition'

// Given a screen-space point (e.g. a drag/drop event's or a touch
// long-press-release's clientX/clientY) and the React Flow instance's
// `screenToFlowPosition` function, return the top-left position a new block
// of `type` should be created at so it is centred on that screen point.
// Shared by the desktop HTML5 drag-and-drop path (Task 2) and the touch
// long-press drag path (Task 3) so both drop a block in exactly the same
// spot relative to the pointer, using the same math as the existing
// click-to-add path (`addAtCenter` in RoadmapPage.jsx).
export function computeDropPosition({ clientX, clientY }, screenToFlowPosition, type) {
  const flowPoint = screenToFlowPosition({ x: clientX, y: clientY })
  return computeCenteredPosition(flowPoint, type)
}
