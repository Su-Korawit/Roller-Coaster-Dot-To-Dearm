import { useEffect, useCallback, useState, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from '../roadmap/nodeTypes'
import InvisibleEdge from '../roadmap/InvisibleEdge'
import TrashZone from '../roadmap/TrashZone'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { mountIrBoard, unmountIrBoard } from '../../services/irBoardSession'
import { findProximityConnection } from '../../utils/findProximityConnection'

const IR_PALETTE = [
  { type: 'ideaRoot', label: 'Idea Root' },
  { type: 'process', label: 'Process' },
  { type: 'image', label: 'Image' },
  { type: 'update', label: 'Update' },
  { type: 'success', label: 'Success' },
]

const SNAP_THRESHOLD = 40

// Blocks snap edge-to-edge — the default edge renders no line.
const edgeTypes = { default: InvisibleEdge }

export default function IdeaRequestSection() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const tokenRef = useRef(null)
  const trashRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isOverTrash, setIsOverTrash] = useState(false)
  const nodes = useRoadmapStore((s) => s.nodes)
  const edges = useRoadmapStore((s) => s.edges)
  const setNodes = useRoadmapStore((s) => s.setNodes)
  const setEdges = useRoadmapStore((s) => s.setEdges)
  const addNode = useRoadmapStore((s) => s.addNode)
  const connect = useRoadmapStore((s) => s.connect)
  const detachNode = useRoadmapStore((s) => s.detachNode)
  const removeNode = useRoadmapStore((s) => s.removeNode)
  const removeEdge = useRoadmapStore((s) => s.removeEdge)
  const syncStatus = useRoadmapStore((s) => s.syncStatus)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await mountIrBoard()
        if (cancelled) {
          await unmountIrBoard(token)
          return
        }
        tokenRef.current = token
        setReady(true)
      } catch (e) {
        if (!cancelled) setError(e.message ?? String(e))
      }
    })()
    return () => {
      cancelled = true
      unmountIrBoard(tokenRef.current)
      tokenRef.current = null
    }
  }, [])

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
  const onEdgesDelete = useCallback(
    (deleted) => deleted.forEach((e) => removeEdge(e.id)),
    [removeEdge],
  )

  // Dragging a block detaches it from all connections so it can be re-snapped elsewhere.
  const onNodeDragStart = useCallback(
    (_event, node) => {
      detachNode(node.id)
      setIsDragging(true)
    },
    [detachNode],
  )
  const onNodeDrag = useCallback((event) => {
    if (!trashRef.current) return
    const rect = trashRef.current.getBoundingClientRect()
    const over =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    setIsOverTrash(over)
  }, [])
  // On drop: if pointer is over the trash zone, delete the node; otherwise snap/connect.
  const onNodeDragStop = useCallback(
    (event, node) => {
      setIsDragging(false)
      setIsOverTrash(false)
      if (trashRef.current) {
        const rect = trashRef.current.getBoundingClientRect()
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          removeNode(node.id)
          return
        }
      }
      const others = nodes.filter((n) => n.id !== node.id)
      const match = findProximityConnection(node, others, SNAP_THRESHOLD)
      if (!match) return
      setNodes(nodes.map((n) => (n.id === node.id ? { ...n, position: match.position } : n)))
      setEdges(addEdge(match.connection, edges))
    },
    [nodes, edges, setNodes, setEdges, removeNode],
  )

  if (error) return <p className="p-6 text-sm text-red-600">IR Board: {error}</p>
  if (!ready) return <p className="p-6 text-sm text-ink-soft">Loading IR Board…</p>

  return (
    <div className="relative w-full h-full min-h-[480px] bg-surface">
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        {IR_PALETTE.map((p) => (
          <button
            key={p.type}
            type="button"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-ink/20 bg-white hover:border-brand"
            onClick={() => addNode(p.type, { x: 120 + Math.random() * 80, y: 120 + Math.random() * 80 })}
          >
            + {p.label}
          </button>
        ))}
        <span className="text-[10px] text-ink-soft self-center ml-2">sync: {syncStatus}</span>
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onConnect={(c) => connect(c)}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          deleteKeyCode={['Backspace', 'Delete']}
          connectionMode="loose"
          fitView
          className="w-full h-full"
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
      <TrashZone ref={trashRef} visible={isDragging} over={isOverTrash} />
    </div>
  )
}
