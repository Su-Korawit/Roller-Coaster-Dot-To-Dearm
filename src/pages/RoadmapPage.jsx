import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft } from 'lucide-react'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import ProcessNode from '../components/roadmap/ProcessNode'

const nodeTypes = { process: ProcessNode }

export default function RoadmapPage() {
  const navigate = useNavigate()
  const nodes = useRoadmapStore((s) => s.nodes)
  const edges = useRoadmapStore((s) => s.edges)
  const setNodes = useRoadmapStore((s) => s.setNodes)
  const setEdges = useRoadmapStore((s) => s.setEdges)
  const addNode = useRoadmapStore((s) => s.addNode)
  const removeNode = useRoadmapStore((s) => s.removeNode)
  const connect = useRoadmapStore((s) => s.connect)
  const removeEdge = useRoadmapStore((s) => s.removeEdge)

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

  // Offset each new node slightly so stacked blocks stay separable
  const addProcessNode = useCallback(() => {
    const offset = nodes.length * 20
    addNode('process', { x: 100 + offset, y: 100 + offset })
  }, [addNode, nodes.length])

  const stableNodeTypes = useMemo(() => nodeTypes, [])

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
          nodeTypes={stableNodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls />

          {/* Tool palette */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white rounded-2xl shadow-md px-3 py-2 border border-gray-100">
            <span className="pixel-font text-[9px] text-gray-400 mr-1">Add</span>
            <button
              onClick={addProcessNode}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Add Process block"
            >
              <div className="w-8 h-8 rounded-xl bg-brand/20 border-2 border-brand/50" />
              <span className="pixel-font text-[8px] text-ink">Process</span>
            </button>
          </div>
        </ReactFlow>
      </div>
    </div>
  )
}
