// Hand an image to the person: the system share sheet (Web Share API with files) when the browser
// supports it, a plain download otherwise. Resolves 'shared' | 'cancelled' | 'downloaded'; closing the
// share sheet is not an error and does not trigger a surprise download.
export async function shareImage(blob, name, { nav = globalThis.navigator, doc = globalThis.document, url = globalThis.URL, saveOnly = false } = {}) {
  if (!saveOnly) {
    const file = typeof File === 'function' ? new File([blob], name, { type: blob.type || 'image/png' }) : null
    if (file && typeof nav?.share === 'function' && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'I LOVE TCAS' })
        return 'shared'
      } catch (e) {
        if (e?.name === 'AbortError') return 'cancelled'
        // any other failure: fall through to the download so the person still gets the image
      }
    }
  }
  const href = url.createObjectURL(blob)
  const a = doc.createElement('a')
  a.href = href
  a.download = name
  doc.body.appendChild(a)
  a.click()
  a.remove()
  url.revokeObjectURL(href)
  return 'downloaded'
}
