import { Handle, useNodeConnections } from '@xyflow/react'

// A connection dot wrapping a React Flow handle. One size everywhere; colour
// derives from this specific handle's live connection state — grey when free,
// green when wired to another block. Per-handle (filtered by handleId), so only
// the connected dot turns green, not every dot on the block. Dots carry no
// in/out meaning, so a dot is "connected" whether it sits at the source or the
// target end of the edge.
export default function ConnectionDot({ type, position, id }) {
  const asSource = useNodeConnections({ handleType: 'source', handleId: id ?? null })
  const asTarget = useNodeConnections({ handleType: 'target', handleId: id ?? null })
  const connected = asSource.length > 0 || asTarget.length > 0

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={`!w-3 !h-3 !border-white !border-2 ${connected ? '!bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]' : '!bg-gray-300'}`}
    />
  )
}
