// Size an image to fit inside max×max, keeping its ratio. Never upscales.
export function fitWithin(width, height, max = 1600) {
  const scale = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
