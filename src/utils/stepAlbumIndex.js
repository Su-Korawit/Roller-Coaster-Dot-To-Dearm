// Wrap-around index stepping for an album/carousel. Used by both ImageNode's
// prev/next controls and MediaLightbox's navigation so both agree on the same
// math. Returns 0 for an empty list to avoid a NaN/negative index.
export function stepAlbumIndex(index, delta, length) {
  if (length <= 0) return 0
  return (index + delta + length) % length
}
