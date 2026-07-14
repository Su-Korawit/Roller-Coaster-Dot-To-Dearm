import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import TrashZone from '../roadmap/TrashZone'
import BagFileNode from './BagFileNode'
import BagFolderNode from './BagFolderNode'
import {
  createBagFolder,
  deleteBagFolderDoc,
  deleteBagItemDoc,
  deleteBagNativeFile,
  moveBagItem,
  updateBagFolderPosition,
  updateBagItemPosition,
  uploadToBag,
} from '../../services/fileBag'
import { useBagClipboard } from '../../hooks/useBagClipboard'

const nodeTypes = { bagFile: BagFileNode, bagFolder: BagFolderNode }

const KIND_FILTER = {
  images: (i) => i.kind === 'image',
  videos: (i) => i.kind === 'video',
  files: (i) => i.kind === 'file',
  exports: (i) => i.kind === 'export' || i.source?.includes('export'),
  trash: () => false,
}

export default function BagCanvas({
  uid,
  folderId,
  items,
  folders,
  category = 'files',
  onOpenFolder,
  onRefresh,
  onQuotaExceeded,
}) {
  const trashRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isOverTrash, setIsOverTrash] = useState(false)
  const [selection, setSelection] = useState([])
  const [rfNodes, setRfNodes] = useState([])

  const itemsById = useMemo(() => {
    const map = {}
    items.forEach((i) => { map[i.id] = i })
    folders.forEach((f) => { map[f.id] = { ...f, _bagType: 'folder' } })
    return map
  }, [items, folders])

  useBagClipboard({
    enabled: true,
    selection,
    itemsById,
    folderId,
    onDuplicated: () => onRefresh?.(),
  })

  useEffect(() => {
    const filter = KIND_FILTER[category] ?? (() => true)
    const fileNodes = items.filter(filter).map((item) => ({
      id: item.id,
      type: 'bagFile',
      position: item.position ?? { x: 80, y: 80 },
      data: { name: item.name, kind: item.kind, storagePath: item.storagePath },
      selected: selection.includes(item.id),
    }))
    const folderNodes = (category === 'trash' ? [] : folders).map((f) => ({
      id: f.id,
      type: 'bagFolder',
      position: f.position ?? { x: 200, y: 80 },
      data: { name: f.name },
      selected: selection.includes(f.id),
    }))
    setRfNodes([...folderNodes, ...fileNodes])
  }, [items, folders, category, selection])

  const onNodesChange = useCallback((changes) => {
    setRfNodes((nds) => applyNodeChanges(changes, nds))
  }, [])

  const onSelectionChange = useCallback(({ nodes: selected }) => {
    setSelection(selected.map((n) => n.id))
  }, [])

  const onNodeDragStop = useCallback(async (_e, node) => {
    setIsDragging(false)
    setIsOverTrash(false)

    if (trashRef.current) {
      const rect = trashRef.current.getBoundingClientRect()
      const { clientX, clientY } = _e
      if (
        clientX >= rect.left && clientX <= rect.right
        && clientY >= rect.top && clientY <= rect.bottom
      ) {
        const item = itemsById[node.id]
        if (item?._bagType === 'folder') {
          await deleteBagFolderDoc(node.id)
        } else if (item) {
          await deleteBagItemDoc(node.id)
          await deleteBagNativeFile(item.storagePath)
        }
        onRefresh?.()
        return
      }
    }

    // Drop onto a folder?
    const folderHit = folders.find((f) => {
      if (f.id === node.id) return false
      const px = f.position?.x ?? 0
      const py = f.position?.y ?? 0
      const nx = node.position.x
      const ny = node.position.y
      return nx >= px - 20 && nx <= px + 132 && ny >= py - 20 && ny <= py + 132
    })
    if (folderHit && itemsById[node.id] && !itemsById[node.id]._bagType) {
      await moveBagItem(node.id, folderHit.id)
      onRefresh?.()
      return
    }

    if (itemsById[node.id]?._bagType === 'folder') {
      await updateBagFolderPosition(node.id, node.position)
    } else {
      await updateBagItemPosition(node.id, node.position)
    }
  }, [folders, itemsById, onRefresh])

  const onNodeDoubleClick = useCallback((_e, node) => {
    if (node.type === 'bagFolder') onOpenFolder?.(node.id)
  }, [onOpenFolder])

  const onDragOver = useCallback((e) => { e.preventDefault() }, [])
  const onDrop = useCallback(async (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !uid) return
    try {
      await uploadToBag({ uid, file, folderId })
      onRefresh?.()
    } catch (err) {
      if (err.code === 'BAG_QUOTA_EXCEEDED') onQuotaExceeded?.()
    }
  }, [uid, folderId, onRefresh, onQuotaExceeded])

  const handleNewFolder = useCallback(async () => {
    const name = window.prompt('ชื่อโฟลเดอร์', 'New Folder')
    if (!name?.trim() || !uid) return
    await createBagFolder({
      ownerUid: uid,
      name: name.trim(),
      parentId: folderId,
      position: { x: 120 + Math.random() * 80, y: 120 + Math.random() * 80 },
    })
    onRefresh?.()
  }, [uid, folderId, onRefresh])

  return (
    <div className="relative w-full h-full min-h-0" onDragOver={onDragOver} onDrop={onDrop}>
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={handleNewFolder}
          className="neo-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface"
        >
          + Folder
        </button>
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={rfNodes}
          edges={[]}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onSelectionChange={onSelectionChange}
          onNodeDragStart={() => setIsDragging(true)}
          onNodeDrag={(event) => {
            if (!trashRef.current) return
            const rect = trashRef.current.getBoundingClientRect()
            setIsOverTrash(
              event.clientX >= rect.left && event.clientX <= rect.right
              && event.clientY >= rect.top && event.clientY <= rect.bottom,
            )
          }}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={onNodeDoubleClick}
          nodesConnectable={false}
          edgesFocusable={false}
          fitView
          className="w-full h-full"
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls className="rf-touch-controls" />
        </ReactFlow>
      </ReactFlowProvider>
      <TrashZone ref={trashRef} visible={isDragging} over={isOverTrash} />
    </div>
  )
}
