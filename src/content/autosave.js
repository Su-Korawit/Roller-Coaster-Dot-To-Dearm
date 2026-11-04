// Debounced draft saver. Patches pushed inside one window are merged into a single
// save; a failed save keeps its patch and is retried on its own, waiting longer each
// time (2x, 4x, … up to 30 s), or sooner by the next push or flush.
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
  let failures = 0
  const MAX_RETRY_MS = 30000

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
      failures = 0
      setStatus(pending ? 'pending' : 'saved')
    } catch (e) {
      console.error('[autosave] save failed:', e)
      pending = { ...patch, ...pending }
      setStatus('error')
      failures += 1
      stopTimer()
      timer = setTimeoutFn(() => {
        timer = null
        enqueue()
      }, Math.min(delayMs * 2 ** failures, MAX_RETRY_MS))
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
      failures = 0
      setStatus('idle')
    },
  }
}
