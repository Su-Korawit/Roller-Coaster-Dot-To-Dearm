// 0..1 progress of a running session, from the server start timestamp (never from tick counts).
export function focusProgress({ startedAt, plannedMin, now = Date.now() }) {
  if (!Number.isFinite(startedAt) || !(plannedMin > 0)) return 0
  const p = (now - startedAt) / (plannedMin * 60000)
  return Math.min(1, Math.max(0, p))
}
