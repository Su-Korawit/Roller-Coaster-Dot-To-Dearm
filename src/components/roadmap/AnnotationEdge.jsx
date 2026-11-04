// Dashed free-annotation connector (Line tool). Unlike default edges it never
// participates in snap logic — it is pure decoration between two blocks.
import { BaseEdge, getBezierPath } from '@xyflow/react'

export default function AnnotationEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  return (
    <BaseEdge
      id={id}
      path={path}
      style={{ strokeDasharray: '6 4', stroke: 'var(--color-brand-strong, var(--color-brand-strong))', strokeWidth: 2 }}
    />
  )
}
