import ImageUploadButton from './ImageUploadButton'

const SAFE_LINK = /^(https?:\/\/|mailto:)/i
const btn = (active) =>
  `h-10 min-w-10 px-3 rounded-slot text-sm font-bold border border-hairline ${active ? 'bg-ink text-white' : 'bg-white text-ink'}`

export default function EditorToolbar({ editor, draftId }) {
  if (!editor) return null
  const run = (fn) => () => fn(editor.chain().focus()).run()

  const setLink = () => {
    const current = editor.getAttributes('link').href ?? ''
    const url = window.prompt('ลิงก์ (https://…)', current)
    if (url === null) return
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else if (SAFE_LINK.test(url.trim())) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
    } else {
      window.alert('ใส่ลิงก์ที่ขึ้นต้นด้วย https:// http:// หรือ mailto:')
    }
  }

  const addImage = (url) => {
    const alt = window.prompt('คำอธิบายรูป (สำหรับผู้อ่านที่มองไม่เห็นรูป)', '') ?? ''
    editor.chain().focus().setImage({ src: url, alt: alt.trim() }).run()
  }

  const items = [
    ['ตัวหนา', 'B', () => editor.isActive('bold'), run((c) => c.toggleBold())],
    ['ตัวเอียง', 'I', () => editor.isActive('italic'), run((c) => c.toggleItalic())],
    ['หัวข้อใหญ่', 'H2', () => editor.isActive('heading', { level: 2 }), run((c) => c.toggleHeading({ level: 2 }))],
    ['หัวข้อย่อย', 'H3', () => editor.isActive('heading', { level: 3 }), run((c) => c.toggleHeading({ level: 3 }))],
    ['รายการจุด', '• รายการ', () => editor.isActive('bulletList'), run((c) => c.toggleBulletList())],
    ['รายการเลข', '1. รายการ', () => editor.isActive('orderedList'), run((c) => c.toggleOrderedList())],
    ['อ้างอิง', '❝', () => editor.isActive('blockquote'), run((c) => c.toggleBlockquote())],
    ['ลิงก์', 'ลิงก์', () => editor.isActive('link'), setLink],
    ['ตาราง', 'ตาราง', () => editor.isActive('table'), run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))],
    ['เส้นคั่น', '—', () => false, run((c) => c.setHorizontalRule())],
  ]

  return (
    <div role="toolbar" aria-label="จัดรูปแบบ" className="flex flex-wrap gap-1 p-2 border-b border-hairline bg-mist">
      {items.map(([label, text, active, onClick]) => (
        <button key={label} type="button" aria-label={label} aria-pressed={active()} onClick={onClick} className={btn(active())}>
          {text}
        </button>
      ))}
      <ImageUploadButton draftId={draftId} label="รูปภาพ" onUploaded={addImage} className={btn(false)} />
    </div>
  )
}
