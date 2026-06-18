// Drag-delta -> object-position offset for a cover-filled image inside a block.
// The offset is stored as a 0-100% position on each axis (CSS object-position).
// Dragging the image one full block dimension swings the offset by 100%; the
// sign is inverted so dragging the image right reveals more of its left side.
// Result is clamped to [0,100] so the image can't be panned past its edges.
const clamp = (n) => Math.min(100, Math.max(0, n))

export function computeImageOffset(prev, delta, blockSize) {
  return {
    x: clamp(prev.x - (delta.dx / blockSize.w) * 100),
    y: clamp(prev.y - (delta.dy / blockSize.h) * 100),
  }
}
