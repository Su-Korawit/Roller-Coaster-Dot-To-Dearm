// Opt-in "share my room" image for the School World (ADR 0018). Privacy by
// default: other players' name labels are hidden while capturing, and the image
// only carries the brand watermark — never the student's name or school.

export const SHARE_WATERMARK = 'I LOVE TCAS · ilovetcas.com'

// Resolves to a PNG Blob, or null when the renderer cannot snapshot.
export async function captureRoomBlob(game, { watermark = SHARE_WATERMARK } = {}) {
  if (!game?.renderer?.snapshot) return null
  game.events.emit('setNamesVisible', false)
  try {
    const img = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('snapshot timeout')), 4000)
      game.renderer.snapshot((image) => { clearTimeout(t); resolve(image) })
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    const size = Math.max(12, Math.round(canvas.width / 40))
    ctx.font = `bold ${size}px sans-serif`
    ctx.textBaseline = 'bottom'
    const pad = Math.round(size * 0.6)
    const w = ctx.measureText(watermark).width
    ctx.fillStyle = 'rgba(26, 16, 53, 0.65)'
    ctx.fillRect(canvas.width - w - pad * 2, canvas.height - size - pad * 2, w + pad * 2, size + pad * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(watermark, canvas.width - w - pad, canvas.height - pad)

    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  } finally {
    game.events.emit('setNamesVisible', true)
  }
}

// Native share sheet where files are supported, otherwise a plain download.
export async function shareRoomImage(game) {
  const blob = await captureRoomBlob(game)
  if (!blob) return { ok: false, error: 'NO_SNAPSHOT' }
  const file = new File([blob], 'i-love-tcas-room.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: SHARE_WATERMARK })
      return { ok: true, via: 'share' }
    } catch (e) {
      if (e?.name === 'AbortError') return { ok: false, error: 'CANCELLED' }
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { ok: true, via: 'download' }
}
