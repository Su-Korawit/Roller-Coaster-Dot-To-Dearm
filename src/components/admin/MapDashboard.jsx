import { useState, useEffect, useRef, useCallback } from 'react'
import { ref, uploadBytes, listAll, deleteObject } from 'firebase/storage'
import { doc, deleteDoc } from 'firebase/firestore'
import { storage, db } from '../../firebase'
import { useAuthStore } from '../../stores/useAuthStore'
import { cloudAsset } from '../../utils/cloudAsset'
import { listMapConfigs, saveMapConfig } from '../../utils/mapConfig'
import { uniqueSlug } from '../../utils/mapSlug'
import { parseMapMeta } from '../../utils/tiledMapMeta'
import { autoMatchTilesets } from '../../utils/resolveTilesets'
import { validateMap } from '../../utils/validateMap'
import MapConfigEditor from './MapConfigEditor'
import MapInfoScreen from './MapInfoScreen'
import MapDocsPanel from './MapDocsPanel'
import { useToast } from './Toast'

// ── Health pill ───────────────────────────────────────────────────────────────

function HealthPill({ map }) {
  const ready = map.displayName && map.defaultSpawn
  if (ready) {
    return (
      <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold whitespace-nowrap">
        ✓ พร้อม
      </span>
    )
  }
  return (
    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold whitespace-nowrap">
      ⚠ ยังไม่ตั้งค่า
    </span>
  )
}

// ── Delete guard ──────────────────────────────────────────────────────────────

function DeleteGuard({ mapKey, maps, onConfirm, onCancel }) {
  const [scanning, setScanning] = useState(true)
  const [inboundPortals, setInboundPortals] = useState([]) // [{fromKey, fromDisplay}]

  useEffect(() => {
    let cancelled = false
    async function scan() {
      const hits = []
      const others = maps.filter((m) => m.key !== mapKey)
      await Promise.all(
        others.map(async (m) => {
          try {
            const url = await cloudAsset(`maps/${m.key}.json`, { fallback: `/maps/${m.key}.json` })
            if (!url) return
            const res = await fetch(url)
            if (!res.ok) return
            const json = await res.json()
            const meta = parseMapMeta(json)
            const pointing = meta.portals.filter((p) => p.target === mapKey)
            if (pointing.length > 0) {
              hits.push({ fromKey: m.key, fromDisplay: m.displayName || m.key })
            }
          } catch {
            // Ignore unreadable maps during scan
          }
        }),
      )
      if (!cancelled) {
        setInboundPortals(hits)
        setScanning(false)
      }
    }
    scan()
    return () => { cancelled = true }
  }, [mapKey, maps])

  if (scanning) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 animate-pulse">
        กำลังตรวจ portals จากแมพอื่น...
      </div>
    )
  }

  return (
    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
      {inboundPortals.length > 0 ? (
        <>
          <p className="text-xs font-semibold text-red-700">คำเตือน</p>
          <p className="text-xs text-red-600">แมพต่อไปนี้มี portal ชี้มาที่ <strong>{mapKey}</strong> — การลบจะทำให้ portal เหล่านั้นพัง:</p>
          <ul className="text-xs text-red-600 list-disc list-inside space-y-0.5">
            {inboundPortals.map((hit) => (
              <li key={hit.fromKey}>{hit.fromDisplay} มี portal ชี้มาที่ {mapKey}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs font-semibold text-red-700">ยืนยันการลบแมพ <strong>{mapKey}</strong>?</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onConfirm}
          className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
        >ยืนยัน</button>
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
        >ยกเลิก</button>
      </div>
    </div>
  )
}

// ── Upload flow ───────────────────────────────────────────────────────────────

function UploadPanel({ existingKeys, maxOrder, adminUid, onDone, onCancel }) {
  // state: null → 'picking-name' → 'validating' → 'uploading' | show errors
  const [phase, setPhase]         = useState('picking-name') // we're already here after file pick
  const [parsedFile, setParsedFile] = useState(null)         // { file, json, meta }
  const [nameInput, setNameInput] = useState('')
  const [errors, setErrors]       = useState([])
  const [warnings, setWarnings]   = useState([])
  const [uploading, setUploading] = useState(false)
  const toast = useToast()

  const key = uniqueSlug(nameInput, existingKeys)
  const nameOk = nameInput.trim().length > 0

  const fileInputRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      let json
      try {
        json = JSON.parse(ev.target.result)
      } catch {
        toast?.error('ไฟล์ไม่ใช่ JSON ที่ถูกต้อง')
        return
      }
      const meta = parseMapMeta(json)
      setParsedFile({ file, json, meta })
      setErrors([])
      setWarnings([])
    }
    reader.readAsText(file)
  }

  async function handleValidateAndUpload() {
    if (!parsedFile || !nameOk) return
    setPhase('validating')
    setErrors([])
    setWarnings([])

    try {
      // List Storage tileset paths
      const [tilesetsResult, objectsResult] = await Promise.all([
        listAll(ref(storage, 'sprites/tilesets')).catch(() => ({ items: [] })),
        listAll(ref(storage, 'sprites/objects')).catch(() => ({ items: [] })),
      ])
      const storagePaths = [
        ...tilesetsResult.items.map((i) => i.fullPath),
        ...objectsResult.items.map((i) => i.fullPath),
      ]

      const r = autoMatchTilesets(parsedFile.meta.tilesetNames, storagePaths)
      const { errors: errs, warnings: warns } = validateMap({
        meta: parsedFile.meta,
        unmatchedTilesets: r.unmatched,
        existingMapKeys: existingKeys,
      })

      if (errs.length > 0) {
        setErrors(errs)
        setWarnings(warns)
        setPhase('picking-name')
        return
      }

      // No hard errors — proceed with upload
      setUploading(true)
      setPhase('uploading')

      await uploadBytes(
        ref(storage, `maps/${key}.json`),
        parsedFile.file,
        { contentType: 'application/json' },
      )

      await saveMapConfig(
        key,
        {
          tilesets: r.matched,
          collision: {},
          hidden: {},
          displayName: nameInput.trim(),
          order: maxOrder + 1,
          isEntry: false,
          defaultSpawn: parsedFile.meta.defaultSpawnName,
          multiplayer: true,
          editable: true,
        },
        adminUid,
      )

      // Show non-blocking warnings as toasts
      warns.forEach((w) => toast?.error(w))

      toast?.success(`อัปโหลดแมพ "${nameInput.trim()}" เรียบร้อย`)
      onDone?.()
    } catch (err) {
      setErrors([err.message || 'เกิดข้อผิดพลาด'])
      setPhase('picking-name')
      setUploading(false)
    }
  }

  const busy = phase === 'validating' || phase === 'uploading'

  return (
    <div className="mt-4 p-4 rounded-2xl bg-white border border-brand/30 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">อัปโหลดแมพใหม่</p>
        <button onClick={onCancel} disabled={busy} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
      </div>

      {/* File picker */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500 font-medium">ไฟล์แมพ (.json จาก Tiled)</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-strong transition-colors disabled:opacity-50"
          >เลือกไฟล์</button>
          {parsedFile && (
            <span className="text-xs text-emerald-600 font-semibold truncate">✓ {parsedFile.file.name}</span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Name input */}
      {parsedFile && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 font-medium">ชื่อแมพ (ใช้แสดงผล)</p>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="เช่น ทุ่งหญ้า, ห้องนอน..."
            disabled={busy}
            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50"
          />
          {nameInput.trim() && (
            <p className="text-[11px] text-gray-400">key: <span className="font-mono text-gray-600">{key}</span></p>
          )}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1">
          <p className="text-xs font-semibold text-red-700">ไม่สามารถอัปโหลดได้</p>
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-600">• {e}</p>
          ))}
        </div>
      )}

      {/* Warnings (shown while still allowing upload after fix) */}
      {warnings.length > 0 && errors.length === 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
          <p className="text-xs font-semibold text-amber-700">คำเตือน</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600">• {w}</p>
          ))}
        </div>
      )}

      {/* Action */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleValidateAndUpload}
          disabled={!parsedFile || !nameOk || busy}
          className="flex-1 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-strong transition-colors disabled:opacity-40"
        >
          {phase === 'validating' ? 'กำลังตรวจสอบ...' :
           phase === 'uploading'  ? 'กำลังอัปโหลด...' :
           'อัปโหลดแมพใหม่'}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40"
        >ยกเลิก</button>
      </div>
    </div>
  )
}

// ── Main MapDashboard ─────────────────────────────────────────────────────────

export default function MapDashboard() {
  const [maps, setMaps]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [showDocs, setShowDocs]   = useState(false)         // MapDocsPanel
  const [editKey, setEditKey]     = useState(null)          // MapConfigEditor
  const [infoKey, setInfoKey]     = useState(null)          // MapInfoScreen
  const [deleteKey, setDeleteKey] = useState(null)          // key pending delete guard
  const [deletingKey, setDeletingKey] = useState(null)      // key mid-delete
  const adminUid = useAuthStore((s) => s.user?.uid)
  const toast = useToast()
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  const loadMaps = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listMapConfigs()
      if (mountedRef.current) setMaps(result)
    } catch (err) {
      toast?.error('โหลดรายการแมพไม่สำเร็จ: ' + (err.message || ''))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadMaps() }, [loadMaps])

  const existingKeys = maps.map((m) => m.key)
  const maxOrder = Math.max(0, ...maps.map((m) => m.order ?? 0))

  async function handleDeleteConfirm() {
    if (!deleteKey) return
    setDeletingKey(deleteKey)
    setDeleteKey(null)
    try {
      await Promise.all([
        deleteObject(ref(storage, `maps/${deleteKey}.json`)).catch(() => {}), // ok if not in storage
        deleteDoc(doc(db, 'mapConfigs', deleteKey)),
      ])
      toast?.success(`ลบแมพ "${deleteKey}" แล้ว`)
      await loadMaps()
    } catch (err) {
      toast?.error('ลบไม่สำเร็จ: ' + (err.message || ''))
    } finally {
      if (mountedRef.current) setDeletingKey(null)
    }
  }

  function handleUploadDone() {
    setShowUpload(false)
    loadMaps()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Maps</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMaps}
            disabled={loading}
            className="text-xs text-brand hover:underline disabled:opacity-50"
          >Refresh</button>
          <button
            onClick={() => setShowDocs(true)}
            className="px-3 py-1.5 rounded-xl border border-brand text-brand text-xs font-semibold hover:bg-brand/5 transition-colors"
          >คู่มือการสร้างแมพ</button>
          <button
            onClick={() => { setShowUpload(true); setDeleteKey(null) }}
            disabled={showUpload || loading}
            className="px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-strong transition-colors disabled:opacity-50"
          >อัปโหลดแมพใหม่</button>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <UploadPanel
          existingKeys={existingKeys}
          maxOrder={maxOrder}
          adminUid={adminUid}
          onDone={handleUploadDone}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {/* Map list */}
      {loading ? (
        <p className="text-gray-400 text-sm animate-pulse">โหลดรายการแมพ...</p>
      ) : maps.length === 0 ? (
        <p className="text-gray-400 text-sm">ยังไม่มีแมพ — อัปโหลดแมพแรกได้เลย</p>
      ) : (
        <div className="space-y-3 mt-4">
          {maps.map((map) => {
            const isDeleting = deletingKey === map.key
            const isPendingDelete = deleteKey === map.key
            return (
              <div key={map.key} className="rounded-2xl bg-white shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 p-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">
                        {map.displayName || map.key}
                      </p>
                      <span className="text-xs text-gray-400 font-mono">{map.key}</span>
                      <HealthPill map={map} />
                      {map.isEntry && (
                        <span className="px-1.5 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-semibold">entry</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      order: {map.order ?? 0}
                      {map.defaultSpawn ? ` · spawn: ${map.defaultSpawn}` : ' · ไม่มี spawn'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setInfoKey(map.key); setDeleteKey(null) }}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-strong transition-colors disabled:opacity-50"
                    >ตั้งค่า</button>
                    <button
                      onClick={() => {
                        if (isPendingDelete) {
                          setDeleteKey(null)
                        } else {
                          setDeleteKey(map.key)
                          setShowUpload(false)
                        }
                      }}
                      disabled={isDeleting}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                        isPendingDelete
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          : 'border border-red-300 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {isDeleting ? 'กำลังลบ...' : isPendingDelete ? 'ยกเลิก' : 'ลบ'}
                    </button>
                  </div>
                </div>

                {/* Delete guard inline */}
                {isPendingDelete && (
                  <div className="px-4 pb-4">
                    <DeleteGuard
                      mapKey={map.key}
                      maps={maps}
                      onConfirm={handleDeleteConfirm}
                      onCancel={() => setDeleteKey(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MapConfigEditor modal (legacy — kept for JSON re-upload workflow) */}
      {editKey && (
        <MapConfigEditor
          mapKey={editKey}
          adminUid={adminUid}
          onClose={() => setEditKey(null)}
          onSaved={() => {
            toast?.success('บันทึก config แล้ว')
            setEditKey(null)
            loadMaps()
          }}
        />
      )}

      {/* MapInfoScreen modal — opens via "ตั้งค่า" button */}
      {infoKey && (
        <MapInfoScreen
          mapKey={infoKey}
          adminUid={adminUid}
          onClose={() => setInfoKey(null)}
          onSaved={() => {
            setInfoKey(null)
            loadMaps()
          }}
        />
      )}

      {/* MapDocsPanel overlay — opens via "คู่มือการสร้างแมพ" button */}
      {showDocs && <MapDocsPanel onClose={() => setShowDocs(false)} />}
    </div>
  )
}
