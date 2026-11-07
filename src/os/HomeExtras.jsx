import { useState } from 'react'
import { LogOut } from 'lucide-react'
import OsSheet from './OsSheet'
import { AppTile } from './AppIcon'
import { findApp } from './apps'

// Folder icon: a rounded square showing up to four of its apps.
export function FolderTile({ folder, size = 60 }) {
  const apps = folder.appIds.map((id) => findApp(id)).filter(Boolean).slice(0, 4)
  const mini = Math.floor((size - 18) / 2)
  return (
    <span
      className="px-card flex items-center justify-center bg-paper/70 backdrop-blur-sm"
      style={{ width: size, height: size, borderRadius: 'var(--radius-slot)' }}
      aria-hidden="true"
    >
      <span className="grid grid-cols-2 gap-1">
        {[0, 1, 2, 3].map((i) => (apps[i]
          ? <AppTile key={apps[i].id} app={apps[i]} size={mini} />
          : <span key={i} className="rounded-[6px] bg-ink/10" style={{ width: mini, height: mini }} />))}
      </span>
    </span>
  )
}

// Open folder: rename, open an app, take an app out, or delete the folder (its apps go back to Home).
export function FolderSheet({ folder, onOpenApp, onRename, onTakeOut, onDelete, onClose }) {
  const [name, setName] = useState(folder.name)
  const apps = folder.appIds.map((id) => findApp(id)).filter(Boolean)
  return (
    <OsSheet title="โฟลเดอร์" onClose={onClose}>
      <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft mb-3">
        ชื่อโฟลเดอร์
        <input
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => onRename(folder.id, name)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className="px-input h-10 px-3 text-sm text-ink"
        />
      </label>
      {apps.length === 0 && <p className="thai-font text-sm text-ink-soft py-4 text-center">ยังว่างอยู่ ลากแอปจากหน้า Home มาวางบนโฟลเดอร์นี้</p>}
      <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[45vh] overflow-y-auto p-1">
        {apps.map((app) => (
          <li key={app.id} className="flex flex-col items-center gap-1 text-center">
            <button type="button" onClick={() => { onOpenApp(app); onClose() }} aria-label={`เปิด ${app.name}`} className="flex flex-col items-center gap-1 rounded-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <AppTile app={app} />
              <span className="thai-font text-xs truncate max-w-full">{app.name}</span>
            </button>
            <button type="button" onClick={() => onTakeOut(folder.id, app.id)} aria-label={`นำ ${app.name} ออกจากโฟลเดอร์`} className="thai-font text-xs text-ink-soft underline inline-flex items-center gap-0.5">
              <LogOut size={11} aria-hidden="true" /> นำออก
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => { onDelete(folder.id); onClose() }} className="px-btn w-full mt-4 py-2 thai-font text-sm font-bold bg-paper text-danger">ลบโฟลเดอร์</button>
    </OsSheet>
  )
}

const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

// A file dropped on Home: open it or remove it (it is only stored on this device).
export function FileSheet({ file, onOpen, onRemove, onClose }) {
  return (
    <OsSheet title="ไฟล์" onClose={onClose}>
      <p className="thai-font font-bold break-words">{file.name}</p>
      <p className="thai-font text-xs text-ink-soft mt-1">{kb(file.size)} · เก็บในเครื่องนี้เท่านั้น ไม่ได้อัปโหลดไปที่ไหน</p>
      <div className="flex gap-3 mt-5">
        <button type="button" onClick={() => { onOpen(file); onClose() }} className="px-btn flex-1 py-2.5 thai-font text-sm font-bold bg-brand-strong text-white">เปิด</button>
        <button type="button" onClick={() => { onRemove(file.id); onClose() }} className="px-btn flex-1 py-2.5 thai-font text-sm font-bold bg-paper text-danger">ลบไฟล์</button>
      </div>
    </OsSheet>
  )
}
