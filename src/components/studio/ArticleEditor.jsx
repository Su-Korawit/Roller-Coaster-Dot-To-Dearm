import { useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { parseBody, EMPTY_DOC } from '../../content/renderBody'
import { stripUnsupported } from '../../content/stripUnsupported'
import EditorToolbar from './EditorToolbar'

const SAFE_URI = /^(https?:|mailto:)/i

// Exactly what the whitelist renderer can show: StarterKit without code, code
// blocks, strike and underline; links limited to https/http/mailto.
const extensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    strike: false,
    underline: false,
    heading: { levels: [2, 3] },
    link: { openOnClick: false, isAllowedUri: (url) => SAFE_URI.test(url) },
  }),
  Image,
  Table,
  TableRow,
  TableHeader,
  TableCell,
]

export default function ArticleEditor({ initialBody, onChange, draftId }) {
  // Only the first body is used: the editor owns the text after that.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const content = useMemo(() => stripUnsupported(parseBody(initialBody) ?? EMPTY_DOC), [])
  const editor = useEditor({
    extensions,
    content,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: 'article-body min-h-64 p-4 focus:outline-none', 'aria-label': 'เนื้อหาบทความ' } },
    onUpdate: ({ editor: e }) => onChange(JSON.stringify(e.getJSON())),
  })

  return (
    <div className="px-card bg-white overflow-hidden">
      <EditorToolbar editor={editor} draftId={draftId} />
      <EditorContent editor={editor} />
    </div>
  )
}
