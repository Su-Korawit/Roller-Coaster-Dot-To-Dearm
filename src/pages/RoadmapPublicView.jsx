import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ReactFlow, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getDocs } from 'firebase/firestore'
import { queries } from '../lib/db'
import { nodeTypes } from '../components/roadmap/nodeTypes'
import AnnotationEdge from '../components/roadmap/AnnotationEdge'
import InvisibleEdge from '../components/roadmap/InvisibleEdge'

const edgeTypes = { default: InvisibleEdge, annotation: AnnotationEdge }

// Public, unauthenticated, view-only Roadmap — reached via a shareId minted
// by ShareSheetModal's "Public link" toggle (never the raw Firestore
// sheetId, to avoid enumeration). Deliberately bypasses
// useRoadmapStore/syncManager entirely: it renders a one-shot snapshot in
// local component state, so a visitor's own guest/local roadmap is never
// touched and nothing here can write back to the shared board. Node
// internals (ProcessNode's <input>, etc.) stay mounted as-is for visual
// fidelity, but the `[&_.react-flow__node]` wrapper strips pointer-events
// off everything inside a node so nothing is focusable/editable — clicks
// fall through to the pane for pan/zoom instead. This avoids threading a
// readOnly prop through every node component (ProcessNode, ImageNode,
// FileNode, ConditionNode, IdeaRootNode…) for a view that must never touch
// StartNode.jsx either way.
export default function RoadmapPublicView() {
  const { shareId } = useParams()
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let alive = true
    getDocs(queries.sheetByShareId(shareId))
      .then((snap) => {
        if (!alive) return
        const docSnap = snap.docs[0]
        if (!docSnap) { setState({ status: 'not-found' }); return }
        const data = docSnap.data()
        setState({ status: 'ready', name: data.name ?? 'Roadmap', nodes: data.nodes ?? [], edges: data.edges ?? [] })
      })
      .catch(() => { if (alive) setState({ status: 'error' }) })
    return () => { alive = false }
  }, [shareId])

  if (state.status === 'loading') {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span className="pixel-font text-xs text-ink-soft">Loading...</span>
      </div>
    )
  }

  if (state.status !== 'ready') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-center px-6">
        <span className="text-3xl" aria-hidden="true">🔒</span>
        <p className="pixel-font text-xs text-ink">This Roadmap link isn't public</p>
        <p className="pixel-font text-xs text-ink-soft">It may have been unshared, or the link is wrong.</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-mist">
      <div className="shrink-0 px-4 py-2 border-b border-ink/10 bg-white flex items-center gap-2">
        <span className="pixel-font text-xs text-ink font-bold truncate">{state.name}</span>
        <span className="pixel-font text-xs text-ink-soft ml-auto">View only</span>
      </div>
      <div className="flex-1 relative [&_.react-flow__node]:pointer-events-none">
        <ReactFlow
          nodes={state.nodes}
          edges={state.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          fitView
        >
          <Background gap={20} color="var(--color-hairline)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  )
}
