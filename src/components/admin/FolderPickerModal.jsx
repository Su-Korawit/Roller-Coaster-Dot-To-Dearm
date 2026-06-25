// src/components/admin/FolderPickerModal.jsx
import { useEffect, useState } from 'react'
import { listAssetFolders } from '../../utils/assetFolders'

export default function FolderPickerModal({ excludePath, onPick, onClose }) {
  const [folders, setFolders] = useState(null)

  useEffect(() => {
    listAssetFolders().then(setFolders).catch(() => setFolders([]))
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xs max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-800 text-sm">ย้ายไป Folder</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="p-3 overflow-y-auto space-y-0.5">
          {folders === null ? (
            <p className="text-gray-400 text-sm animate-pulse px-2">โหลด...</p>
          ) : folders
              .filter((f) => f.path !== excludePath)
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => onPick(f)}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-brand/5 transition-colors"
                >
                  <span>📁</span>
                  <span className="text-sm text-gray-800 flex-1">{f.displayName}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{f.path}</span>
                </button>
              ))}
        </div>
      </div>
    </div>
  )
}
