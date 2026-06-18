// Roadmap export schema (ADR-0001). A versioned, React-Flow-independent
// serialisation of a Roadmap (or a Selection subset). The contract a future AI
// generator reads/writes — kept stable even as the React Flow node shape changes.

const SCHEMA_VERSION = 1

// React Flow nodes/edges -> schema v1 envelope. width/height are emitted only
// when the node carries them (resizable stage labels); data is copied as-is.
export function toSchema(nodes, edges) {
  return {
    version: SCHEMA_VERSION,
    nodes: nodes.map((n) => {
      const out = { id: n.id, type: n.type, position: { x: n.position.x, y: n.position.y }, data: n.data }
      if (n.width != null) out.width = n.width
      if (n.height != null) out.height = n.height
      return out
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  }
}

// Narrow a board to a Selection: keep only the selected nodes and only the
// edges whose both endpoints are inside the selection (dangling edges to
// outside nodes are dropped). Used by export-selected.
export function selectSubset(nodes, edges, selectedIds) {
  const ids = new Set(selectedIds)
  return {
    nodes: nodes.filter((n) => ids.has(n.id)),
    edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
  }
}

// Schema v1 envelope -> React Flow nodes/edges. Throws on an unknown or missing
// version so a malformed file is rejected gracefully rather than silently
// corrupting the board.
export function fromSchema(schema) {
  if (!schema || schema.version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported roadmap schema version: ${schema?.version}`)
  }
  return {
    nodes: schema.nodes.map((n) => {
      const out = { id: n.id, type: n.type, position: { x: n.position.x, y: n.position.y }, data: n.data }
      if (n.width != null) out.width = n.width
      if (n.height != null) out.height = n.height
      return out
    }),
    edges: schema.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  }
}
