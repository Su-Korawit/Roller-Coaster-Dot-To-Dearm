import { useEffect, useCallback, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
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
import RoadmapToolbar, { IR_PALETTE_ITEMS } from '../roadmap/RoadmapToolbar'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { mountIrBoard, unmountIrBoard } from '../../services/irBoardSession'
import { findProximityConnection } from '../../utils/findProximityConnection'
import { computeDropPosition } from '../../utils/computeDropPosition'
import { computeCenteredPosition } from '../../utils/computeCenteredPosition'
import { toSchema, selectSubset } from '../../utils/roadmapExport'
import { useLongPressDrag } from '../../hooks/useLongPressDrag'

const SNAP_THRESHOLD = 40

// Blocks snap edge-to-edge — the default edge renders no line.
const edgeTypes = { default: InvisibleEdge }

export default function IdeaRequestSection() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [mobileSelectMode, setMobileSelectMode] = useState(false)
  const tokenRef = useRef(null)
  const rfRef = useRef(null)
  const canvasRef = useRef(null)
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
  const selection = useRoadmapStore((s) => s.selection)
  const setSelection = useRoadmapStore((s) => s.setSelection)
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const removeSelection = useRoadmapStore((s) => s.removeSelection)
  const duplicateSelection = useRoadmapStore((s) => s.duplicateSelection)
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

  const onSelectionChange = useCallback(
    ({ nodes: selected }) => {
      setSelection(selected.map((n) => n.id))
    },
    [setSelection],
  )

  const onNodeClick = useCallback((_event, node) => {
    if (!mobileSelectMode) return
    setNodes(nodes.map((n) =>
      n.id === node.id ? { ...n, selected: !n.selected } : n,
    ))
  }, [mobileSelectMode, nodes, setNodes])

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

  const addAtCenter = useCallback((type) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const center = rfRef.current && rect
      ? rfRef.current.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 200, y: 200 }
    const jitter = (nodes.length % 8) * 14
    addNode(type, computeCenteredPosition({ x: center.x + jitter, y: center.y + jitter }, type))
  }, [addNode, nodes.length])

  const onCanvasDragOver = useCallback((e) => { e.preventDefault() }, [])
  const onCanvasDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/roadmap-node-type')
    if (!type || !rfRef.current) return
    addNode(type, computeDropPosition({ clientX: e.clientX, clientY: e.clientY }, rfRef.current.screenToFlowPosition, type))
  }, [addNode])
  const onTouchDrop = useCallback((type, { clientX, clientY }) => {
    if (!rfRef.current) return
    addNode(type, computeDropPosition({ clientX, clientY }, rfRef.current.screenToFlowPosition, type))
  }, [addNode])
  const { dragState, getHandlers } = useLongPressDrag(onTouchDrop)

  const handleExportSelected = useCallback(() => {
    const subset = selectSubset(nodes, edges, selection)
    const blob = new Blob([JSON.stringify(toSchema(subset.nodes, subset.edges), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ir-selection.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges, selection])

  if (error) return <p className="p-6 text-sm text-red-600">IR Board: {error}</p>
  if (!ready) return <p className="p-6 text-sm text-ink-soft">Loading IR Board…</p>

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full min-h-0 flex-1 bg-surface"
      onDragOver={onCanvasDragOver}
      onDrop={onCanvasDrop}
    >
      <ReactFlowProvider>
        {/* The admin shell (min-h-screen + flex-1) gives this section a real
            flexed height but an *indefinite* CSS height, so ReactFlow's own
            h-full would resolve to 0px and the board renders blank
            (reactflow.dev/error#004). Absolute positioning sizes against the
            relative root's laid-out height instead of the indefinite chain. */}
        <div className="absolute inset-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={(instance) => { rfRef.current = instance }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onConnect={(c) => connect(c)}
            onNodeClick={onNodeClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onSelectionChange={onSelectionChange}
            deleteKeyCode={['Backspace', 'Delete']}
            connectionMode="loose"
            fitView
            className="w-full h-full"
          >
            <Background gap={20} color="#e2e8f0" />
            <Controls className="rf-touch-controls" />
            <RoadmapToolbar
              paletteItems={IR_PALETTE_ITEMS}
              onAddType={addAtCenter}
              getHandlers={getHandlers}
              mobileSelectMode={mobileSelectMode}
              onToggleSelectMode={() => {
                if (mobileSelectMode) {
                  setMobileSelectMode(false)
                  clearSelection()
                  setNodes(nodes.map((n) => ({ ...n, selected: false })))
                } else {
                  setMobileSelectMode(true)
                }
              }}
              selectionCount={selection.length}
              onDuplicate={duplicateSelection}
              onExport={handleExportSelected}
              onDelete={() => {
                removeSelection()
                setMobileSelectMode(false)
              }}
              onCancel={() => {
                clearSelection()
                setNodes(nodes.map((n) => ({ ...n, selected: false })))
                setMobileSelectMode(false)
              }}
              paletteExtra={
                <span className="text-[10px] text-ink-soft self-center ml-1 flex-shrink-0 whitespace-nowrap">
                  sync: {syncStatus}
                </span>
              }
            />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
      <TrashZone ref={trashRef} visible={isDragging} over={isOverTrash} />

      {/* Ghost preview for a touch long-press drag, portalled to
          document.body: the toolbar lives inside React Flow's transformed
          viewport, so a `fixed` child positioned via clientX/clientY here
          would otherwise inherit that transform (scaled/offset) instead of
          tracking the real screen position (same reasoning as the portal
          in ImagePickerModal.jsx). */}
      {dragState && createPortal(
        <div
          className="fixed z-50 pointer-events-none flex items-center justify-center rounded-xl border-2 border-brand/60 bg-brand/20 backdrop-blur-sm"
          style={{ left: dragState.x - 24, top: dragState.y - 24, width: 48, height: 48 }}
        >
          <span className="pixel-font text-[7px] text-brand">{dragState.type}</span>
        </div>,
        document.body,
      )}
    </div>
  )
}
