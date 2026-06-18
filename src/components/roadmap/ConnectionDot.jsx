import { Handle, useNodeConnections } from '@xyflow/react'

// A connection dot wrapping a React Flow handle. One size everywhere; colour
// derives from this specific handle's live connection state — grey when free,
// green when wired to another block. Per-handle (filtered by handleId), so only
// the connected dot turns green, not every dot on the block.
export default function ConnectionDot({ type, position, id }) {
  const connections = useNodeConnections({ handleType: type, handleId: id ?? null })
  const connected = connections.length > 0

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={`!w-3 !h-3 !border-white !border-2 ${connected ? '!bg-green-400' : '!bg-gray-300'}`}
    />
  )
}
