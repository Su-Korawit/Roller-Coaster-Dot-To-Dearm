// Debounced draft saver. Patches pushed inside one window are merged into a single
// save; a failed save keeps its patch so the next push or flush retries it.
// status: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
export function createAutosaver({
  save,
  delayMs = 2000,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  onStatus,
}) {
  let pending = null
  let timer = null
  let status = 'idle'
  let chain = Promise.resolve()

  const setStatus = (next) => {
    status = next
    onStatus?.(next)
  }
  const stopTimer = () => {
    if (timer !== null) clearTimeoutFn(timer)
    timer = null
  }

  async function run() {
    if (!pending) return
    const patch = pending
    pending = null
    setStatus('saving')
    try {
      await save(patch)
      setStatus(pending ? 'pending' : 'saved')
    } catch (e) {
      console.error('[autosave] save failed:', e)
      pending = { ...patch, ...pending }
      setStatus('error')
    }
  }
  // Saves never overlap: each run starts after the previous one settled.
  const enqueue = () => {
    chain = chain.then(run)
    return chain
  }

  return {
    get status() {
      return status
    },
    push(patch) {
      pending = { ...pending, ...patch }
      setStatus('pending')
      stopTimer()
      timer = setTimeoutFn(() => {
        timer = null
        enqueue()
      }, delayMs)
    },
    flush() {
      stopTimer()
      return enqueue()
    },
    cancel() {
      stopTimer()
      pending = null
      setStatus('idle')
    },
  }
}
