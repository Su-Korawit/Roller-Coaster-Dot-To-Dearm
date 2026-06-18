export function isEditableTarget(el) {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if (el.getAttribute('contenteditable') != null && el.getAttribute('contenteditable') !== 'false') return true
  return false
}
