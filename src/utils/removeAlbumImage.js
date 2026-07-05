// Removes the image at `removeIndex` and returns a new { images, activeIndex }
// pair with activeIndex re-pointed so the same image stays showing where
// possible, clamped to a valid slot (or 0 for an empty result).
export function removeAlbumImage(images, activeIndex, removeIndex) {
  const nextImages = images.filter((_, i) => i !== removeIndex)
  if (nextImages.length === 0) return { images: nextImages, activeIndex: 0 }

  let nextActive = activeIndex
  if (removeIndex < activeIndex) nextActive = activeIndex - 1
  else if (removeIndex === activeIndex) nextActive = Math.min(activeIndex, nextImages.length - 1)

  return { images: nextImages, activeIndex: Math.min(Math.max(nextActive, 0), nextImages.length - 1) }
}
