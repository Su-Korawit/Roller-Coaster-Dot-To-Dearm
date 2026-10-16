// Drops nodes the editor and renderer do not support, keeping everything around
// them. Without this the editor would discard a whole document over one unknown node.
const NODES = new Set([
  'doc', 'paragraph', 'heading', 'text', 'hardBreak', 'bulletList', 'orderedList', 'listItem',
  'blockquote', 'horizontalRule', 'image', 'table', 'tableRow', 'tableHeader', 'tableCell',
])
const MARKS = new Set(['bold', 'italic', 'link'])

function strip(node) {
  if (!node || typeof node !== 'object' || !NODES.has(node.type)) return null
  const out = { ...node }
  if (Array.isArray(node.content)) out.content = node.content.map(strip).filter(Boolean)
  if (Array.isArray(node.marks)) out.marks = node.marks.filter((m) => MARKS.has(m?.type))
  return out
}

export function stripUnsupported(doc) {
  return strip(doc) ?? { type: 'doc', content: [{ type: 'paragraph' }] }
}
