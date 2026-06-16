import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, X } from 'lucide-react'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import ProcessNode from '../components/roadmap/ProcessNode'
import ConditionNode from '../components/roadmap/ConditionNode'
import StageLabelNode from '../components/roadmap/StageLabelNode'
import ImageNode from '../components/roadmap/ImageNode'
import TimelineRuler from '../components/roadmap/TimelineRuler'

const nodeTypes = { process: ProcessNode, condition: ConditionNode, stageLabel: StageLabelNode, image: ImageNode }

// Blocks snap edge-to-edge, so connection lines are never drawn.
function InvisibleEdge() {
  return null
}
const edgeTypes = { default: InvisibleEdge }

export default function RoadmapPage({ onClose }) {
  const navigate = useNavigate()
  // Overlay mode (onClose provided) sits over the live game: transparent backdrop
  // and a close button. Route mode keeps the solid background and a back arrow.
  const overlay = Boolean(onClose)
  const handleBack = onClose ?? (() => navigate('/home'))
  const nodes = useRoadmapStore((s) => s.nodes)
  const edges = useRoadmapStore((s) => s.edges)
  const setNodes = useRoadmapStore((s) => s.setNodes)
  const setEdges = useRoadmapStore((s) => s.setEdges)
  const addNode = useRoadmapStore((s) => s.addNode)
  const removeNode = useRoadmapStore((s) => s.removeNode)
  const connect = useRoadmapStore((s) => s.connect)
  const removeEdge = useRoadmapStore((s) => s.removeEdge)
  const detachNode = useRoadmapStore((s) => s.detachNode)

  const onNodesChange = useCallback(
    (changes) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes],
  )
  const onEdgesChange = useCallback(
    (changes) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges],
  )
  const onNodesDelete = useCallback(
    (deleted) => deleted.forEach((n) => removeNode(n.id)),
    [removeNode],
  )
  const onConnect = useCallback(
    (params) => connect(params),
    [connect],
  )
  const onEdgesDelete = useCallback(
    (deleted) => deleted.forEach((e) => removeEdge(e.id)),
    [removeEdge],
  )
  // Dragging a block detaches it from all connections so it can be re-snapped elsewhere.
  const onNodeDragStart = useCallback(
    (_event, node) => detachNode(node.id),
    [detachNode],
  )

  const addProcessNode = useCallback(() => {
    const offset = nodes.length * 20
    addNode('process', { x: 100 + offset, y: 100 + offset })
  }, [addNode, nodes.length])

  const addConditionNode = useCallback(() => {
    const offset = nodes.length * 20
    addNode('condition', { x: 120 + offset, y: 120 + offset })
  }, [addNode, nodes.length])

  const addStageLabelNode = useCallback(() => {
    const offset = nodes.length * 20
    addNode('stageLabel', { x: 80 + offset, y: 40 + offset })
  }, [addNode, nodes.length])

  const addImageNode = useCallback(() => {
    const offset = nodes.length * 20
    addNode('image', { x: 140 + offset, y: 100 + offset })
  }, [addNode, nodes.length])

  const stableNodeTypes = useMemo(() => nodeTypes, [])
  const stableEdgeTypes = useMemo(() => edgeTypes, [])

  // Timeline ruler stays in lockstep with the canvas viewport (pan + zoom).
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })
  const rfRef = useRef(null)
  const onMove = useCallback((_event, vp) => setViewport(vp), [])
  // Ruler scrubbed -> pan the canvas horizontally to match.
  const onScrub = useCallback((x) => {
    rfRef.current?.setViewport({ ...rfRef.current.getViewport(), x })
  }, [])

  return (
    <div className={`h-full w-full flex flex-col ${overlay ? 'bg-transparent' : 'bg-[#F4F7FC]'}`}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white shadow-sm z-10">
        <button
          onClick={handleBack}
          aria-label={overlay ? 'ปิด Roadmap' : 'กลับหน้าหลัก'}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {overlay ? <X size={20} strokeWidth={2} /> : <ArrowLeft size={20} strokeWidth={2} />}
        </button>
        <h1 className="pixel-font text-[13px] text-ink font-bold">Roadmap</h1>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={stableNodeTypes}
          edgeTypes={stableEdgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          onNodeDragStart={onNodeDragStart}
          onInit={(instance) => { rfRef.current = instance }}
          onMove={onMove}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls />

          {/* Tool palette */}
          <Panel position="top-center">
            <div className="flex items-center gap-2 bg-white rounded-2xl shadow-md px-3 py-2 border border-gray-100 mt-2">
              <span className="pixel-font text-[9px] text-gray-400 mr-1">Add</span>
              <button
                onClick={addProcessNode}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Process block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/20 border-2 border-brand/50" />
                <span className="pixel-font text-[8px] text-ink">Process</span>
              </button>
              <button
                onClick={addConditionNode}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-accent-pink/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink"
                aria-label="Add Condition block"
              >
                <div className="w-8 h-8 rotate-45 bg-accent-pink/20 border-2 border-accent-pink/50" style={{ borderRadius: '6px' }} />
                <span className="pixel-font text-[8px] text-ink">Condition</span>
              </button>
              <button
                onClick={addStageLabelNode}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Stage Label"
              >
                <div className="w-8 h-5 rounded-full bg-brand/20 border-2 border-brand/50 flex items-center justify-center">
                  <span className="pixel-font text-[6px] text-brand">Aa</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Stage</span>
              </button>
              <button
                onClick={addImageNode}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Image block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
                  <span className="text-[14px]">🖼️</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Image</span>
              </button>
            </div>
          </Panel>

        </ReactFlow>

        {/* Full-width time ruler, synced both ways with the viewport */}
        <TimelineRuler viewport={viewport} onScrub={onScrub} />
      </div>
    </div>
  )
}
