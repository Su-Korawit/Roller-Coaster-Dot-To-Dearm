// src/components/admin/AssetsManagerSection.jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { ref, listAll, deleteObject, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../../firebase'
import { cloudAsset, bustCache } from '../../utils/cloudAsset'
import {
  listAssetFolders, createFolder, renameFolder, trashFolder,
  seedSystemFolders, folderSlug,
} from '../../utils/assetFolders'
import { moveFile, trashFile, restoreFile, fromTrashPath } from '../../utils/storageOps'
import FolderPickerModal from './FolderPickerModal'
import { useToast } from './Toast'
import { useAuthStore } from '../../stores/useAuthStore'

async function listAllRecursive(storageRef) {
  const result = await listAll(storageRef)
  const files = result.items.map((i) => i.fullPath)
  const sub = await Promise.all(result.prefixes.map((p) => listAllRecursive(p)))
  return [...files, ...sub.flat()]
}

function FolderSidebar({ folders, selectedPath, onSelect, onRenameFolder, onDeleteFolder, trashCount }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName]   = useState('')

  function startEdit(folder) {
    setEditingId(folder.id)
    setEditName(folder.displayName)
  }

  async function commitEdit(folder) {
    const trimmed = editName.trim()
    setEditingId(null)
    if (!trimmed || trimmed === folder.displayName) return
    await onRenameFolder(folder, trimmed)
  }

  return (
    <div className="w-48 shrink-0 border-r border-gray-100 pr-3 space-y-0.5">
      {folders.map((f) => (
        <div
          key={f.id}
          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer ${
            selectedPath === f.path
              ? 'bg-brand/10 text-brand'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
          onClick={() => onSelect(f.path)}
        >
          <span className="text-sm leading-none">📁</span>

          {editingId === f.id ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => commitEdit(f)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(f)
                if (e.key === 'Escape') setEditingId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 text-xs border border-brand rounded px-1 py-0.5 outline-none"
            />
          ) : (
            <span className="flex-1 min-w-0 text-xs truncate">{f.displayName}</span>
          )}

          {f.isSystem && (
            <span className="text-[9px] text-gray-400 shrink-0">sys</span>
          )}

          {!f.isSystem && editingId !== f.id && (
            <div
              className="hidden group-hover:flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => startEdit(f)}
                className="text-gray-400 hover:text-brand text-xs leading-none"
                title="Rename"
              >✏</button>
              <button
                onClick={() => onDeleteFolder(f)}
                className="text-gray-400 hover:text-red-500 text-xs leading-none"
                title="Delete"
              >🗑</button>
            </div>
          )}
        </div>
      ))}

      <div className="border-t border-gray-100 mt-2 pt-2">
        <div
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer ${
            selectedPath === '__trash__'
              ? 'bg-red-50 text-red-600'
              : 'hover:bg-gray-50 text-gray-500'
          }`}
          onClick={() => onSelect('__trash__')}
        >
          <span className="text-sm leading-none">🗑</span>
          <span className="flex-1 text-xs">Trash</span>
          {trashCount > 0 && (
            <span className="text-[9px] bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 font-semibold">
              {trashCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function FileCard({ path, onRename, onMove, onDelete }) {
  const [thumbUrl, setThumbUrl] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(path)
  const name    = path.split('/').pop()

  useEffect(() => {
    if (!isImage) return
    cloudAsset(path, { fallback: null }).then((url) => { if (url) setThumbUrl(url) })
  }, [path, isImage])

  return (
    <div className="relative flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
      {isImage && thumbUrl ? (
        <img
          src={thumbUrl}
          alt={name}
          className="h-14 w-14 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <div className="h-14 w-14 flex items-center justify-center text-gray-300 text-xs font-mono">
          {/\.json$/i.test(path) ? 'JSON' : '—'}
        </div>
      )}
      <span className="text-[10px] text-gray-600 break-all w-full text-center leading-tight">
        {name}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-sm leading-none px-1"
      >···</button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-7 right-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[100px]">
            <button
              onClick={() => { setMenuOpen(false); onRename(path) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
            >✏ Rename</button>
            <button
              onClick={() => { setMenuOpen(false); onMove(path) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
            >📂 Move to</button>
            <button
              onClick={() => { setMenuOpen(false); onDelete(path) }}
              className="block w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >🗑 Delete</button>
          </div>
        </>
      )}
    </div>
  )
}

function FileGrid({ folderPath, onFilesChanged }) {
  const [files, setFiles]           = useState(null)
  const [renamingPath, setRenamingPath] = useState(null)
  const [newName, setNewName]       = useState('')
  const [movingPath, setMovingPath] = useState(null)
  const [busy, setBusy]             = useState(false)
  const toast = useToast()
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadFiles = useCallback(async () => {
    setFiles(null)
    try {
      const result = await listAll(ref(storage, folderPath))
      if (mountedRef.current) setFiles(result.items.map((i) => i.fullPath))
    } catch {
      if (mountedRef.current) setFiles([])
    }
  }, [folderPath])

  useEffect(() => { loadFiles() }, [loadFiles])

  function handleUpload(file) {
    if (!file) return
    const dest = `${folderPath}/${file.name}`
    const task = uploadBytesResumable(ref(storage, dest), file)
    task.on(
      'state_changed',
      null,
      (err) => toast?.error(err.message),
      () => { bustCache(dest); loadFiles(); onFilesChanged?.() },
    )
  }

  async function handleRenameConfirm() {
    if (!renamingPath || !newName.trim()) { setRenamingPath(null); return }
    const folder = renamingPath.split('/').slice(0, -1).join('/')
    const dest   = `${folder}/${newName.trim()}`
    if (dest === renamingPath) { setRenamingPath(null); return }
    setBusy(true)
    try {
      await moveFile(renamingPath, dest)
      bustCache(renamingPath)
      bustCache(dest)
      toast?.success('เปลี่ยนชื่อแล้ว')
      loadFiles()
    } catch (err) {
      toast?.error(err.message || 'เปลี่ยนชื่อไม่สำเร็จ')
    } finally {
      setBusy(false)
      setRenamingPath(null)
    }
  }

  async function handleMove(path, targetFolder) {
    const filename = path.split('/').pop()
    const dest     = `${targetFolder.path}/${filename}`
    setBusy(true)
    setMovingPath(null)
    try {
      await moveFile(path, dest)
      bustCache(path)
      bustCache(dest)
      toast?.success(`ย้ายไป ${targetFolder.displayName} แล้ว`)
      loadFiles()
      onFilesChanged?.()
    } catch (err) {
      toast?.error(err.message || 'ย้ายไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(path) {
    setBusy(true)
    try {
      await trashFile(path)
      bustCache(path)
      toast?.success('ย้ายไป Trash แล้ว')
      loadFiles()
      onFilesChanged?.()
    } catch (err) {
      toast?.error(err.message || 'ลบไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <label className="px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-strong cursor-pointer">
          ⬆ Upload
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.gif,.webp,.json"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </label>
        <span className="text-xs text-gray-400 font-mono">{folderPath}/</span>
      </div>

      {files === null ? (
        <p className="text-gray-400 text-sm animate-pulse">โหลด...</p>
      ) : files.length === 0 ? (
        <p className="text-gray-400 text-sm">ยังไม่มีไฟล์ — อัปโหลดได้เลย</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map((path) => (
            <FileCard
              key={path}
              path={path}
              onRename={(p) => { setRenamingPath(p); setNewName(p.split('/').pop()) }}
              onMove={(p) => setMovingPath(p)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {renamingPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-xs space-y-3">
            <p className="font-semibold text-gray-800 text-sm">เปลี่ยนชื่อไฟล์</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameConfirm()
                if (e.key === 'Escape') setRenamingPath(null)
              }}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRenameConfirm}
                disabled={busy}
                className="flex-1 px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold disabled:opacity-50"
              >บันทึก</button>
              <button
                onClick={() => setRenamingPath(null)}
                disabled={busy}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs"
              >ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {movingPath && (
        <FolderPickerModal
          excludePath={folderPath}
          onPick={(targetFolder) => handleMove(movingPath, targetFolder)}
          onClose={() => setMovingPath(null)}
        />
      )}
    </div>
  )
}

function TrashView({ onFilesChanged, onTrashCountChange }) {
  const [files, setFiles]           = useState(null)
  const [clearing, setClearing]     = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const toast = useToast()
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadTrash = useCallback(async () => {
    setFiles(null)
    try {
      const all = await listAllRecursive(ref(storage, 'trash'))
      if (mountedRef.current) {
        setFiles(all)
        onTrashCountChange?.(all.length)
      }
    } catch {
      if (mountedRef.current) setFiles([])
    }
  }, [onTrashCountChange])

  useEffect(() => { loadTrash() }, [loadTrash])

  async function handleRestore(trashPath) {
    try {
      await restoreFile(trashPath)
      bustCache(fromTrashPath(trashPath))
      toast?.success('กู้คืนแล้ว')
      loadTrash()
      onFilesChanged?.()
    } catch (err) {
      toast?.error(err.message || 'กู้คืนไม่สำเร็จ')
    }
  }

  async function handlePermanentDelete(trashPath) {
    try {
      await deleteObject(ref(storage, trashPath))
      toast?.success('ลบถาวรแล้ว')
      loadTrash()
    } catch (err) {
      toast?.error(err.message || 'ลบไม่สำเร็จ')
    }
  }

  async function handleClearAll() {
    setClearing(true)
    setConfirmClear(false)
    try {
      await Promise.all((files ?? []).map((p) => deleteObject(ref(storage, p)).catch(() => {})))
      toast?.success('ล้าง Trash แล้ว')
      loadTrash()
      onFilesChanged?.()
    } catch (err) {
      toast?.error(err.message || 'ล้างไม่สำเร็จ')
    } finally {
      if (mountedRef.current) setClearing(false)
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-gray-700">Trash</span>
        {files !== null && files.length > 0 && (
          confirmClear ? (
            <>
              <span className="text-xs text-red-600">ลบถาวร {files.length} ไฟล์?</span>
              <button onClick={handleClearAll} disabled={clearing}
                className="px-3 py-1 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50">
                {clearing ? 'กำลังลบ...' : 'ยืนยัน'}
              </button>
              <button onClick={() => setConfirmClear(false)}
                className="px-3 py-1 rounded-xl border border-gray-200 text-gray-600 text-xs">
                ยกเลิก
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmClear(true)}
              className="px-3 py-1 rounded-xl border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50">
              ล้าง Trash ทั้งหมด
            </button>
          )
        )}
      </div>

      {files === null ? (
        <p className="text-gray-400 text-sm animate-pulse">โหลด...</p>
      ) : files.length === 0 ? (
        <p className="text-gray-400 text-sm">Trash ว่างเปล่า</p>
      ) : (
        <div className="space-y-2">
          {files.map((trashPath) => {
            const original = fromTrashPath(trashPath)
            const name     = trashPath.split('/').pop()
            return (
              <div key={trashPath} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm">
                <span className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate">→ {original}</p>
                </span>
                <button onClick={() => handleRestore(trashPath)}
                  className="px-2.5 py-1 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-strong">
                  Restore
                </button>
                <button onClick={() => handlePermanentDelete(trashPath)}
                  className="px-2.5 py-1 rounded-lg border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50">
                  ลบถาวร
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AssetsManagerSection() {
  const [folders, setFolders]           = useState([])
  const [selectedPath, setSelectedPath] = useState(null)
  const [trashCount, setTrashCount]     = useState(0)
  const [showCreate, setShowCreate]     = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)   // folder awaiting confirm
  const [deleteFileCount, setDeleteFileCount] = useState(0)
  const [deletingId, setDeletingId]     = useState(null)
  const [renameProgress, setRenameProgress] = useState(null) // "กำลังย้ายไฟล์ 2/5..."
  const toast = useToast()
  const uid = useAuthStore((s) => s.user?.uid)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadFolders = useCallback(async () => {
    try {
      await seedSystemFolders(uid)
      const list = await listAssetFolders()
      if (!mountedRef.current) return
      setFolders(list)
      setSelectedPath((prev) => prev ?? list[0]?.path ?? null)
    } catch {
      toast?.error('โหลด folders ไม่สำเร็จ')
    }
  }, [uid, toast])

  useEffect(() => { loadFolders() }, [loadFolders])

  async function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) return
    try {
      await createFolder(name, folders.map((f) => f.path), uid)
      setNewFolderName('')
      setShowCreate(false)
      await loadFolders()
    } catch (err) {
      toast?.error(err.message || 'สร้าง folder ไม่สำเร็จ')
    }
  }

  async function handleRenameFolder(folder, newDisplayName) {
    const slug    = folderSlug(newDisplayName)
    const newPath = `sprites/${slug}`
    if (folders.some((f) => f.path === newPath && f.id !== folder.id)) {
      toast?.error(`"${newPath}" ซ้ำกับ folder ที่มีอยู่แล้ว`)
      return
    }
    try {
      await renameFolder(folder.id, newDisplayName, newPath, uid)
      await loadFolders()

      const result = await listAll(ref(storage, folder.path)).catch(() => ({ items: [] }))
      const items  = result.items
      for (let i = 0; i < items.length; i++) {
        setRenameProgress(`กำลังย้ายไฟล์ ${i + 1}/${items.length}...`)
        const oldFile = items[i].fullPath
        const newFile = `${newPath}/${oldFile.split('/').pop()}`
        await moveFile(oldFile, newFile)
        bustCache(oldFile)
        bustCache(newFile)
      }
      setRenameProgress(null)
      setSelectedPath(newPath)
      toast?.success('เปลี่ยนชื่อ folder แล้ว')
    } catch (err) {
      setRenameProgress(null)
      toast?.error(err.message || 'เปลี่ยนชื่อไม่สำเร็จ')
    }
  }

  async function initiateDeleteFolder(folder) {
    const result = await listAll(ref(storage, folder.path)).catch(() => ({ items: [] }))
    setDeleteFileCount(result.items.length)
    setDeleteTarget(folder)
  }

  async function handleDeleteFolder() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setDeleteTarget(null)
    try {
      const result = await listAll(ref(storage, deleteTarget.path)).catch(() => ({ items: [] }))
      await Promise.all(result.items.map((item) => trashFile(item.fullPath).catch(() => {})))
      await trashFolder(deleteTarget.id, uid)
      toast?.success(`ย้าย folder "${deleteTarget.displayName}" ไป Trash แล้ว`)
      if (selectedPath === deleteTarget.path) setSelectedPath(null)
      await loadFolders()
    } catch (err) {
      toast?.error(err.message || 'ลบ folder ไม่สำเร็จ')
    } finally {
      if (mountedRef.current) setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Assets</h3>
        {showCreate ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') { setShowCreate(false); setNewFolderName('') }
              }}
              placeholder="ชื่อ folder ใหม่"
              className="px-2 py-1 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <button onClick={handleCreateFolder}
              className="px-3 py-1 rounded-xl bg-brand text-white text-xs font-semibold">สร้าง</button>
            <button onClick={() => { setShowCreate(false); setNewFolderName('') }}
              className="px-3 py-1 rounded-xl border border-gray-200 text-gray-600 text-xs">ยกเลิก</button>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-strong">
            + สร้าง Folder
          </button>
        )}
      </div>

      {renameProgress && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-brand/10 text-brand text-xs font-semibold">
          {renameProgress}
        </div>
      )}

      <div className="flex gap-4">
        <FolderSidebar
          folders={folders}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={initiateDeleteFolder}
          trashCount={trashCount}
        />

        <div className="flex-1 min-w-0">
          {selectedPath === '__trash__' ? (
            <TrashView
              onFilesChanged={loadFolders}
              onTrashCountChange={setTrashCount}
            />
          ) : selectedPath ? (
            <FileGrid
              key={selectedPath}
              folderPath={selectedPath}
              onFilesChanged={loadFolders}
            />
          ) : (
            <p className="text-gray-400 text-sm">เลือก folder จากซ้าย</p>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm space-y-3">
            <p className="font-semibold text-gray-800 text-sm">ลบ Folder "{deleteTarget.displayName}"?</p>
            <p className="text-xs text-gray-600">
              {deleteFileCount > 0
                ? `ไฟล์ ${deleteFileCount} ไฟล์จะถูกย้ายไป Trash`
                : 'Folder นี้ว่างเปล่า'}
            </p>
            <div className="flex gap-2">
              <button onClick={handleDeleteFolder}
                className="flex-1 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700">
                ยืนยัน
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
