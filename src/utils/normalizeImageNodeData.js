// Normalizes an Image block's `data` into the multi-image album shape,
// migrating the legacy single-image shape ({ url, offset }) on read so
// existing roadmaps never lose data. Always returns { images, activeIndex }
// with activeIndex clamped to a valid slot (or 0 for an empty album).
export const DEFAULT_IMAGE_OFFSET = { x: 50, y: 50 }

export function normalizeImageNodeData(data) {
  if (!data) return { images: [], activeIndex: 0 }

  if (Array.isArray(data.images)) {
    const images = data.images
    const activeIndex = images.length === 0
      ? 0
      : Math.min(Math.max(data.activeIndex ?? 0, 0), images.length - 1)
    return { images, activeIndex }
  }

  if (data.url) {
    return {
      images: [{ url: data.url, offset: data.offset ?? DEFAULT_IMAGE_OFFSET }],
      activeIndex: 0,
    }
  }

  return { images: [], activeIndex: 0 }
}
