import { Handle, useConnection, useNodeConnections, useNodeId } from '@xyflow/react'

// A connection dot wrapping a React Flow handle. Colour derives from THIS
// handle's live state: grey when free, green when an edge really terminates at
// this exact dot, brand-ring while a connection drag starts from it. Several
// dots on one block legitimately have no id (legacy boards store
// sourceHandle/targetHandle as null), so matching must be null-safe and
// role-aware rather than relying on unique handle ids.
export default function ConnectionDot({ type, position, id }) {
  const nodeId = useNodeId()
  const handleId = id ?? null

  // useNodeConnections without handleId returns every connection where this
  // node plays that role; narrow to the edges that terminate at THIS dot.
  const asSource = useNodeConnections({ handleType: 'source' })
    .filter((c) => c.source === nodeId && (c.sourceHandle ?? null) === handleId)
  const asTarget = useNodeConnections({ handleType: 'target' })
    .filter((c) => c.target === nodeId && (c.targetHandle ?? null) === handleId)
  const connected = asSource.length > 0 || asTarget.length > 0

  // True only while the user is dragging a new connection out of this dot.
  const connecting = useConnection((conn) =>
    conn.inProgress &&
    conn.fromNode?.id === nodeId &&
    (conn.fromHandle?.id ?? null) === handleId,
  )

  const tone = connecting
    ? '!bg-brand ring-2 ring-brand/40 shadow-[0_0_8px_2px_rgba(167,139,218,0.6)]'
    : connected
      ? '!bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]'
      : '!bg-gray-300'

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={`!w-3 !h-3 !border-white !border-2 ${tone}`}
    />
  )
}
