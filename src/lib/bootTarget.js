// Load the map the app boots into. If the remembered (resume) map cannot be loaded, fall back to
// the normal entry map once and tell the caller to forget the resume point, so one broken map
// can never lock a student out on every reload.
export async function loadBootTarget({ target, entryKey, load, onResumeFailed }) {
  try {
    return { mapKey: target.mapKey, point: target.point, data: await load(target.mapKey) }
  } catch (e) {
    if (target.mapKey === entryKey) throw e
    onResumeFailed?.(target.mapKey, e)
    return { mapKey: entryKey, point: null, data: await load(entryKey) }
  }
}
