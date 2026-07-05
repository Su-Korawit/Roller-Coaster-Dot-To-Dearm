import { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, X, MousePointer2, Download, Upload } from 'lucide-react'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import ProcessNode from '../components/roadmap/ProcessNode'
import ConditionNode from '../components/roadmap/ConditionNode'
import StageLabelNode from '../components/roadmap/StageLabelNode'
import ImageNode from '../components/roadmap/ImageNode'
import TrashZone from '../components/roadmap/TrashZone'
import SelectionActionBar from '../components/roadmap/SelectionActionBar'
import TimelineRuler from '../components/roadmap/TimelineRuler'
import { findProximityConnection } from '../utils/findProximityConnection'
import { computeNodeCenter } from '../utils/computeNodeCenter'
import { computeCenteredPosition } from '../utils/computeCenteredPosition'
import { computeDropPosition } from '../utils/computeDropPosition'
import { toSchema, selectSubset } from '../utils/roadmapExport'
import { useLongPressDrag } from '../hooks/useLongPressDrag'

const SNAP_THRESHOLD = 40

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
  const setpoint = useRoadmapStore((s) => s.setpoint)
  const selection = useRoadmapStore((s) => s.selection)
  const setSelection = useRoadmapStore((s) => s.setSelection)
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const removeSelection = useRoadmapStore((s) => s.removeSelection)
  const duplicateSelection = useRoadmapStore((s) => s.duplicateSelection)
  const importRoadmap = useRoadmapStore((s) => s.importRoadmap)
  const fileInputRef = useRef(null)

  // Mobile select mode — tapping a block toggles its selection membership.
  const [mobileSelectMode, setMobileSelectMode] = useState(false)

  // Trash zone
  const trashRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isOverTrash, setIsOverTrash] = useState(false)

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
    (_event, node) => {
      detachNode(node.id)
      setIsDragging(true)
    },
    [detachNode],
  )
  const onNodeDrag = useCallback(
    (event) => {
      if (!trashRef.current) return
      const rect = trashRef.current.getBoundingClientRect()
      const over = event.clientX >= rect.left && event.clientX <= rect.right &&
                   event.clientY >= rect.top  && event.clientY <= rect.bottom
      setIsOverTrash(over)
    },
    [],
  )
  // On drop: if pointer is over the trash zone, delete the node; otherwise snap/connect.
  const onNodeDragStop = useCallback(
    (event, node) => {
      setIsDragging(false)
      setIsOverTrash(false)
      if (trashRef.current) {
        const rect = trashRef.current.getBoundingClientRect()
        if (event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top  && event.clientY <= rect.bottom) {
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

  const stableNodeTypes = useMemo(() => nodeTypes, [])
  const stableEdgeTypes = useMemo(() => edgeTypes, [])

  // Timeline ruler stays in lockstep with the canvas viewport (pan + zoom).
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })
  const rfRef = useRef(null)
  const canvasRef = useRef(null)
  const onMove = useCallback((_event, vp) => setViewport(vp), [])
  // Ruler scrubbed -> pan the canvas horizontally to match.
  const onScrub = useCallback((x) => {
    rfRef.current?.setViewport({ ...rfRef.current.getViewport(), x })
  }, [])
  // Sync React Flow selection → store (fired by marquee/shift-click on desktop)
  const onSelectionChange = useCallback(
    ({ nodes: selected }) => {
      setSelection(selected.map((n) => n.id))
    },
    [setSelection],
  )

  // Selecting a block: mobile select mode toggles membership; otherwise pan to centre.
  const onNodeClick = useCallback((_event, node) => {
    if (mobileSelectMode) {
      setNodes(nodes.map((n) =>
        n.id === node.id ? { ...n, selected: !n.selected } : n,
      ))
      return
    }
    const c = computeNodeCenter(node)
    rfRef.current?.setCenter(c.x, c.y, { zoom: rfRef.current.getViewport().zoom, duration: 400 })
  }, [mobileSelectMode, nodes, setNodes])

  // Drop a new block at the centre of whatever the user is currently viewing
  // (not a fixed spot on the canvas). A small stagger keeps repeated adds from
  // stacking exactly on top of each other.
  const addAtCenter = useCallback((type) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const center = rfRef.current && rect
      ? rfRef.current.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 200, y: 200 }
    const jitter = (nodes.length % 8) * 14
    addNode(type, computeCenteredPosition({ x: center.x + jitter, y: center.y + jitter }, type))
  }, [addNode, nodes.length])

  // Desktop drag-and-drop: a toolbar button is dragged onto the canvas and
  // dropped at the pointer's position (converted screen -> flow space with
  // the same math addAtCenter uses). Additive to the existing click-to-add
  // toolbar behavior, not a replacement for it.
  const onCanvasDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])
  const onCanvasDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/roadmap-node-type')
    if (!type || !rfRef.current) return
    addNode(type, computeDropPosition({ clientX: e.clientX, clientY: e.clientY }, rfRef.current.screenToFlowPosition, type))
  }, [addNode])

  // Touch long-press drag: same drop-position math as the desktop path
  // (Task 2), triggered by the hook's onPointerUp instead of a native drop.
  const onTouchDrop = useCallback((type, { clientX, clientY }) => {
    if (!rfRef.current) return
    addNode(type, computeDropPosition({ clientX, clientY }, rfRef.current.screenToFlowPosition, type))
  }, [addNode])
  const { dragState, getHandlers } = useLongPressDrag(onTouchDrop)

  // Download a schema envelope as a JSON file.
  const downloadSchema = useCallback((schema, filename) => {
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Export the whole Roadmap as a schema-v1 JSON download.
  const handleExport = useCallback(() => {
    downloadSchema(toSchema(nodes, edges), 'roadmap.json')
  }, [nodes, edges, downloadSchema])

  // Export only the current Selection (internal edges kept, dangling dropped).
  const handleExportSelected = useCallback(() => {
    const subset = selectSubset(nodes, edges, selection)
    downloadSchema(toSchema(subset.nodes, subset.edges), 'roadmap-selection.json')
  }, [nodes, edges, selection, downloadSchema])

  // Import a schema-v1 JSON file, merging it into the current board.
  const handleImportFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    try {
      importRoadmap(JSON.parse(await file.text()))
    } catch {
      alert('ไฟล์ Roadmap ไม่ถูกต้อง (รองรับเฉพาะ schema v1)')
    }
  }, [importRoadmap])

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

        {/* Import / Export */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="นำเข้า Roadmap"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Upload size={18} strokeWidth={2} />
          </button>
          <button
            onClick={handleExport}
            aria-label="ส่งออก Roadmap"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Download size={18} strokeWidth={2} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="flex-1 relative" onDragOver={onCanvasDragOver} onDrop={onCanvasDrop}>
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
          onNodeClick={onNodeClick}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onSelectionChange={onSelectionChange}
          multiSelectionKeyCode="Shift"
          onInit={(instance) => {
            rfRef.current = instance
            const setpointNode = setpoint ? nodes.find((n) => n.id === setpoint) : null
            if (setpointNode) {
              const c = computeNodeCenter(setpointNode)
              instance.setCenter(c.x, c.y, { zoom: 1, duration: 0 })
            } else {
              instance.fitView({ duration: 0 })
            }
          }}
          onMove={onMove}
          connectionMode="loose"
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls />

          {/* Tool palette */}
          <Panel position="top-center">
            <div className="flex items-center gap-2 bg-white rounded-2xl shadow-md px-3 py-2 border border-gray-100 mt-2 max-w-[calc(100vw-1rem)] overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <span className="pixel-font text-[9px] text-gray-400 mr-1">Add</span>
              <button
                onClick={() => addAtCenter('process')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'process')}
                {...getHandlers('process')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Process block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/20 border-2 border-brand/50" />
                <span className="pixel-font text-[8px] text-ink">Process</span>
              </button>
              <button
                onClick={() => addAtCenter('condition')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'condition')}
                {...getHandlers('condition')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-accent-pink/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink"
                aria-label="Add Condition block"
              >
                <div className="w-8 h-8 rotate-45 bg-accent-pink/20 border-2 border-accent-pink/50" style={{ borderRadius: '6px' }} />
                <span className="pixel-font text-[8px] text-ink">Condition</span>
              </button>
              <button
                onClick={() => addAtCenter('stageLabel')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'stageLabel')}
                {...getHandlers('stageLabel')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Stage Label"
              >
                <div className="w-8 h-5 rounded-full bg-brand/20 border-2 border-brand/50 flex items-center justify-center">
                  <span className="pixel-font text-[6px] text-brand">Aa</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Stage</span>
              </button>
              <button
                onClick={() => addAtCenter('image')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'image')}
                {...getHandlers('image')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Image block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
                  <span className="text-[14px]">🖼️</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Image</span>
              </button>
              {/* Mobile select mode toggle */}
              <button
                onClick={() => {
                  if (mobileSelectMode) {
                    setMobileSelectMode(false)
                    clearSelection()
                    setNodes(nodes.map((n) => ({ ...n, selected: false })))
                  } else {
                    setMobileSelectMode(true)
                  }
                }}
                className={[
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl active:scale-95 transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden',
                  mobileSelectMode ? 'bg-brand/20 hover:bg-brand/30' : 'hover:bg-brand/10',
                ].join(' ')}
                aria-label={mobileSelectMode ? 'Exit select mode' : 'Enter select mode'}
                aria-pressed={mobileSelectMode}
              >
                <MousePointer2 size={16} className={mobileSelectMode ? 'text-brand' : 'text-gray-500'} strokeWidth={2} />
                <span className="pixel-font text-[8px] text-ink">Select</span>
              </button>
            </div>
          </Panel>

          {/* Selection action bar */}
          <Panel position="bottom-center">
            <SelectionActionBar
              count={selection.length}
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
            />
          </Panel>

        </ReactFlow>

        {/* Full-width time ruler, synced both ways with the viewport */}
        <TimelineRuler viewport={viewport} onScrub={onScrub} />

        {/* Trash zone — appears only while a block is being dragged */}
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
    </div>
  )
}
