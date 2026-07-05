// Single shared registry of Roadmap node-type -> component. Both RoadmapPage
// (the interactive canvas) and ProfilePanel's RoadmapPreview (a read-only
// embed) render the same React Flow nodes/edges from useRoadmapStore, so both
// need this exact map — kept in one place so a new block type is registered
// once, not twice, and so ProfilePanel doesn't have to import all of
// RoadmapPage.jsx (which is lazy-loaded on its own) just to get this map.
import ProcessNode from './ProcessNode'
import ConditionNode from './ConditionNode'
import StageLabelNode from './StageLabelNode'
import ImageNode from './ImageNode'
import VideoNode from './VideoNode'
import StartNode from './StartNode'

export const nodeTypes = {
  process: ProcessNode,
  condition: ConditionNode,
  stageLabel: StageLabelNode,
  image: ImageNode,
  video: VideoNode,
  start: StartNode,
}
