import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import { ArrowLeft } from 'lucide-react'

export default function RoadmapPage() {
  const navigate = useNavigate()
  const nodes = useRoadmapStore((s) => s.nodes)
  const edges = useRoadmapStore((s) => s.edges)
  const setNodes = useRoadmapStore((s) => s.setNodes)
  const setEdges = useRoadmapStore((s) => s.setEdges)

  const onNodesChange = useCallback(
    (changes) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes],
  )
  const onEdgesChange = useCallback(
    (changes) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges],
  )

  return (
    <div className="h-full w-full flex flex-col bg-[#F4F7FC]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white shadow-sm z-10">
        <button
          onClick={() => navigate('/home')}
          aria-label="กลับหน้าหลัก"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="pixel-font text-[13px] text-ink font-bold">Roadmap</h1>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}
