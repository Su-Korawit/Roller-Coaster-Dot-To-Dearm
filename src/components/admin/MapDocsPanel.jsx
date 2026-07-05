import guide from '../../data/mapDocs/tiled-guide.md?raw'
import Popup from '../ui/Popup'

// ── Minimal inline markdown renderer ─────────────────────────────────────────
// Handles: # headings, | tables, ``` code blocks, - bullet lists, **bold**, > blockquote, --- hr

function renderInline(text) {
  // **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    // `inline code`
    const codeParts = part.split(/(`[^`]+`)/g)
    return codeParts.map((cp, j) => {
      if (cp.startsWith('`') && cp.endsWith('`')) {
        return <code key={j} className="px-1 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[0.85em]">{cp.slice(1, -1)}</code>
      }
      return cp
    })
  })
}

function renderMarkdown(raw) {
  const lines = raw.split('\n')
  const nodes = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      nodes.push(
        <pre key={i} className="my-3 p-3 rounded-xl bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre">
          {codeLines.join('\n')}
        </pre>
      )
      i++
      continue
    }

    // HR
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="my-4 border-gray-200" />)
      i++; continue
    }

    // Headings
    const h3 = line.match(/^### (.+)/)
    const h2 = line.match(/^## (.+)/)
    const h1 = line.match(/^# (.+)/)
    if (h1) { nodes.push(<h1 key={i} className="text-xl font-bold text-gray-900 mt-4 mb-2">{renderInline(h1[1])}</h1>); i++; continue }
    if (h2) { nodes.push(<h2 key={i} className="text-base font-bold text-gray-800 mt-5 mb-1.5 border-b border-gray-100 pb-1">{renderInline(h2[1])}</h2>); i++; continue }
    if (h3) { nodes.push(<h3 key={i} className="text-sm font-semibold text-gray-700 mt-4 mb-1">{renderInline(h3[1])}</h3>); i++; continue }

    // Blockquote
    if (line.startsWith('> ')) {
      nodes.push(
        <blockquote key={i} className="border-l-4 border-brand/40 pl-3 my-2 text-sm text-gray-600 italic">
          {renderInline(line.slice(2))}
        </blockquote>
      )
      i++; continue
    }

    // Table — collect all pipe-delimited lines
    if (line.startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines.filter((r) => !/^\|[-| :]+\|$/.test(r.trim()))
      nodes.push(
        <div key={i} className="my-3 overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr>
                {rows[0].split('|').filter((_, ci) => ci > 0 && ci < rows[0].split('|').length - 1).map((cell, ci) => (
                  <th key={ci} className="px-3 py-2 bg-gray-50 border border-gray-200 text-left font-semibold text-gray-700 whitespace-nowrap">
                    {renderInline(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-gray-50/60'}>
                  {row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1).map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 border border-gray-200 text-gray-700">
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Bullet list — collect consecutive bullet lines
    if (/^[-*] /.test(line)) {
      const items = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      nodes.push(
        <ul key={i} className="my-2 space-y-1 list-disc list-inside">
          {items.map((item, ii) => (
            <li key={ii} className="text-sm text-gray-700">{renderInline(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    // Blank line
    if (line.trim() === '') { i++; continue }

    // Paragraph
    nodes.push(
      <p key={i} className="text-sm text-gray-700 leading-relaxed my-1.5">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return nodes
}

// ── MapDocsPanel overlay ──────────────────────────────────────────────────────

export default function MapDocsPanel({ onClose }) {
  return (
    <Popup variant="center" size="lg" onClose={onClose}>
      <div className="w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h4 className="font-semibold text-gray-800">คู่มือการสร้างแมพ</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          {renderMarkdown(guide)}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-gray-600 text-sm hover:bg-gray-100 transition-colors"
          >ปิด</button>
        </div>
      </div>
    </Popup>
  )
}
