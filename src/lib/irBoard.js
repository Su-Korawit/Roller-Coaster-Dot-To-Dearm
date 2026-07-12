import { isIdeaStatus, defaultReportData } from '../constants/irBoard.js'

// Distinguishes report ids minted within the same millisecond (e.g. appending
// in a loop) — Date.now() alone would collide.
let reportSeq = 0

function undirectedAdj(edges) {
  const map = new Map()
  for (const e of edges) {
    if (!map.has(e.source)) map.set(e.source, [])
    if (!map.has(e.target)) map.set(e.target, [])
    map.get(e.source).push(e.target)
    map.get(e.target).push(e.source)
  }
  return map
}

export function listIdeas(nodes, { includeDone = false } = {}) {
  return (nodes ?? [])
    .filter((n) => n.type === 'ideaRoot')
    .filter((n) => includeDone || n.data?.status !== 'done')
    .map((n) => ({
      id: n.id,
      title: n.data?.title ?? '',
      status: n.data?.status ?? 'idea',
    }))
}

/**
 * Collects the idea root and all nodes reachable via undirected BFS (edge
 * direction is ignored). Two ideas must not share nodes; if a node is reachable
 * from multiple roots, the first root that claims it wins — callers should
 * partition the graph so each block belongs to one idea.
 */
export function collectIdeaSubtree(ideaId, nodes, edges) {
  const byId = new Map((nodes ?? []).map((n) => [n.id, n]))
  const root = byId.get(ideaId)
  if (!root || root.type !== 'ideaRoot') {
    throw new Error(`ideaRoot not found: ${ideaId}`)
  }
  const adj = undirectedAdj(edges ?? [])
  const seen = new Set([ideaId])
  const queue = [ideaId]
  while (queue.length) {
    const cur = queue.shift()
    for (const next of adj.get(cur) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  const subNodes = [...seen].map((id) => byId.get(id)).filter(Boolean)
  const subEdges = (edges ?? []).filter((e) => seen.has(e.source) && seen.has(e.target))
  return { root, nodes: subNodes, edges: subEdges }
}

export function setIdeaStatus(nodes, ideaId, status) {
  if (!isIdeaStatus(status)) throw new Error(`invalid status: ${status}`)
  return (nodes ?? []).map((n) =>
    n.id === ideaId && n.type === 'ideaRoot'
      ? { ...n, data: { ...n.data, status } }
      : n,
  )
}

export function appendReportNode({ nodes, edges, ideaId, type, summary }) {
  if (type !== 'update' && type !== 'success') {
    throw new Error(`invalid report type: ${type}`)
  }
  const root = (nodes ?? []).find((n) => n.id === ideaId && n.type === 'ideaRoot')
  if (!root) throw new Error(`ideaRoot not found: ${ideaId}`)

  const existingReports = (nodes ?? []).filter(
    (n) => (n.type === 'update' || n.type === 'success') &&
      (edges ?? []).some((e) => e.source === ideaId && e.target === n.id),
  ).length

  const uid = `${Date.now()}-${++reportSeq}`
  const reportId = `node-ir-${uid}`
  const edgeId = `edge-ir-${uid}`
  const report = {
    id: reportId,
    type,
    position: {
      x: (root.position?.x ?? 0) + 180,
      y: (root.position?.y ?? 0) + 40 + existingReports * 120,
    },
    data: defaultReportData(summary),
  }
  return {
    nodes: [...(nodes ?? []), report],
    edges: [...(edges ?? []), { id: edgeId, source: ideaId, target: reportId }],
    reportId,
  }
}
