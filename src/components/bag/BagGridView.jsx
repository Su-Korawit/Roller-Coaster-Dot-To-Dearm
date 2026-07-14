import { useState } from 'react'
import { Folder, FileText, Image, Film, Package, MoreVertical, Plus } from 'lucide-react'
import {
  createBagFolder,
  deleteBagFolderDoc,
  deleteBagItemDoc,
  deleteBagNativeFile,
  duplicateBagItem,
  moveBagItem,
  uploadToBag,
} from '../../services/fileBag'

const KIND_ICON = {
  image: Image,
  video: Film,
  file: FileText,
  export: Package,
}

const KIND_FILTER = {
  images: (i) => i.kind === 'image',
  videos: (i) => i.kind === 'video',
  files: (i) => i.kind === 'file',
  exports: (i) => i.kind === 'export' || i.source?.includes('export'),
  trash: () => false,
}

export default function BagGridView({
  uid,
  folderId,
  items,
  folders,
  category = 'files',
  onOpenFolder,
  onRefresh,
  onQuotaExceeded,
}) {
  const [menuId, setMenuId] = useState(null)
  const filter = KIND_FILTER[category] ?? (() => true)
  const visibleItems = items.filter(filter)
  const visibleFolders = category === 'trash' ? [] : folders

  const onUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !uid) return
    try {
      await uploadToBag({ uid, file, folderId })
      onRefresh?.()
    } catch (err) {
      if (err.code === 'BAG_QUOTA_EXCEEDED') onQuotaExceeded?.()
    }
  }

  const onNewFolder = async () => {
    const name = window.prompt('ชื่อโฟลเดอร์', 'New Folder')
    if (!name?.trim() || !uid) return
    await createBagFolder({ ownerUid: uid, name: name.trim(), parentId: folderId })
    onRefresh?.()
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
      <div className="flex gap-2">
        <label className="neo-btn px-3 py-2 rounded-xl text-xs font-semibold bg-brand text-white cursor-pointer inline-flex items-center gap-1">
          <Plus size={14} /> Upload
          <input type="file" className="hidden" onChange={onUpload} />
        </label>
        <button type="button" onClick={onNewFolder} className="neo-btn px-3 py-2 rounded-xl text-xs font-semibold bg-surface">
          + Folder
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {visibleFolders.map((f) => (
          <div key={f.id} className="relative">
            <button
              type="button"
              onClick={() => onOpenFolder?.(f.id)}
              className="w-full aspect-square neo-card flex flex-col items-center justify-center gap-1 p-2"
            >
              <Folder size={28} className="text-brand" />
              <span className="text-[10px] text-ink line-clamp-2 text-center">{f.name}</span>
            </button>
            <TileMenu
              open={menuId === f.id}
              onToggle={() => setMenuId(menuId === f.id ? null : f.id)}
              actions={[
                {
                  label: 'Delete',
                  onClick: async () => {
                    await deleteBagFolderDoc(f.id)
                    setMenuId(null)
                    onRefresh?.()
                  },
                },
              ]}
            />
          </div>
        ))}
        {visibleItems.map((item) => {
          const Icon = KIND_ICON[item.kind] ?? FileText
          return (
            <div key={item.id} className="relative">
              <div className="w-full aspect-square neo-card flex flex-col items-center justify-center gap-1 p-2">
                <Icon size={28} className="text-brand" />
                <span className="text-[10px] text-ink line-clamp-2 text-center">{item.name}</span>
              </div>
              <TileMenu
                open={menuId === item.id}
                onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                actions={[
                  {
                    label: 'Duplicate',
                    onClick: async () => {
                      await duplicateBagItem(item, { folderId })
                      setMenuId(null)
                      onRefresh?.()
                    },
                  },
                  {
                    label: 'Move to root',
                    onClick: async () => {
                      await moveBagItem(item.id, null)
                      setMenuId(null)
                      onRefresh?.()
                    },
                  },
                  {
                    label: 'Delete',
                    onClick: async () => {
                      await deleteBagItemDoc(item.id)
                      await deleteBagNativeFile(item.storagePath)
                      setMenuId(null)
                      onRefresh?.()
                    },
                  },
                ]}
              />
            </div>
          )
        })}
      </div>

      {visibleFolders.length === 0 && visibleItems.length === 0 && (
        <p className="text-center text-sm text-ink-soft py-12">ยังไม่มีไฟล์ในโฟลเดอร์นี้</p>
      )}
    </div>
  )
}

function TileMenu({ open, onToggle, actions }) {
  return (
    <div className="absolute top-1 right-1">
      <button
        type="button"
        aria-label="More"
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className="w-7 h-7 rounded-lg bg-surface/90 border border-ink/10 flex items-center justify-center"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <ul className="absolute right-0 mt-1 z-20 neo-slab py-1 min-w-[8rem]">
          {actions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-brand/10"
                onClick={(e) => { e.stopPropagation(); a.onClick() }}
              >
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
