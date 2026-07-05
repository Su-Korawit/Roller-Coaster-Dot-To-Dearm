import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { nodeTypes } from '../roadmap/nodeTypes'

// Read-only, non-interactive embed of the user's own Roadmap canvas — same
// useRoadmapStore data and node registry as the full RoadmapPage, just with
// every interaction prop turned off. Wrapped in its own ReactFlowProvider
// since it mounts independently of RoadmapPage's own instance. The whole
// thing is one tap target that opens the real, interactive Roadmap overlay.
export default function RoadmapPreview({ onOpen }) {
  const nodes = useRoadmapStore((s) => s.nodes)
  const edges = useRoadmapStore((s) => s.edges)

  if (nodes.length === 0) {
    return (
      <button
        onClick={onOpen}
        className="w-full h-32 rounded-2xl border-2 border-dashed border-purple-200 flex items-center justify-center text-purple-400 hover:border-purple-400 hover:text-purple-500 transition-colors text-sm"
      >
        No roadmap yet — tap to create one
      </button>
    )
  }

  return (
    <button
      onClick={onOpen}
      aria-label="เปิด Roadmap"
      className="w-full h-40 rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative"
    >
      <div className="absolute inset-0 pointer-events-none">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} color="#e2e8f0" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </button>
  )
}
