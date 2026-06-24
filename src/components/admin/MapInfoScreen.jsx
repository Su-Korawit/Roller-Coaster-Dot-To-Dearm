import { useEffect, useRef, useState, useCallback } from 'react'
import { ref, uploadBytesResumable, listAll } from 'firebase/storage'
import { storage } from '../../firebase'
import { cloudAsset, bustCache } from '../../utils/cloudAsset'
import { getMapConfig, saveMapConfig } from '../../utils/mapConfig'
import { parseMapMeta } from '../../utils/tiledMapMeta'
import { autoMatchTilesets } from '../../utils/resolveTilesets'
import MapPreview from './MapPreview'
import StorageBrowser from './StorageBrowser'
import { useToast } from './Toast'

const TILESET_FOLDERS = ['sprites/tilesets', 'sprites/objects']
const sanitize = (name) => name.trim().replace(/\s+/g, '_')

// Fetch map JSON from Storage, falling back to local public/ copy.
async function loadMapJson(key) {
  const local = `/maps/${key}.json`
  const url = await cloudAsset(`maps/${key}.json`, { fallback: local })
  try {
    const res = await fetch(url)
    if (res.ok) return await res.json()
  } catch { /* fall through */ }
  const res = await fetch(local)
  return res.ok ? await res.json() : null
}

// Simple upload row with progress bar (mirrors AssetsSection's UploadRow pattern).
function TilesetUploadRow({ storagePath, onSuccess, disabled }) {
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = useCallback(
    (file) => {
      if (!file) return
      setError(null)
      setProgress(0)
      const task = uploadBytesResumable(ref(storage, storagePath), file, {
        contentType: file.type || 'image/png',
      })
      task.on(
        'state_changed',
        (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => { setError(err.message); setProgress(null) },
        () => {
          bustCache(storagePath)
          setProgress(null)
          onSuccess?.()
        },
      )
    },
    [storagePath, onSuccess],
  )

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null || disabled}
        className="px-2.5 py-1 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-strong transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {progress !== null ? `${progress}%` : 'อัปโหลด'}
      </button>
      {progress !== null && (
        <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <span className="text-red-500 text-[10px] truncate">{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}

// ── Main MapInfoScreen ────────────────────────────────────────────────────────

export default function MapInfoScreen({ mapKey, adminUid, onClose, onSaved }) {
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState(null)          // parseMapMeta result
  const [tileLayers, setTileLayers] = useState([]) // tile layers for collision/hidden UI
  const [displayName, setDisplayName] = useState('')
  const [defaultSpawn, setDefaultSpawn] = useState(null)
  const [multiplayer, setMultiplayer] = useState(true)
  const [editable, setEditable] = useState(true)
  const [isEntry, setIsEntry] = useState(false)
  const [tilesets, setTilesets] = useState({})    // name → storage path
  const [collision, setCollision] = useState({})
  const [hidden, setHidden] = useState({})
  const [browser, setBrowser] = useState(null)    // { name } | null
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      try {
        const [json, cfg] = await Promise.all([
          loadMapJson(mapKey),
          getMapConfig(mapKey),
        ])

        if (cancelled) return

        const parsedMeta = json
          ? parseMapMeta(json)
          : { spawns: [], defaultSpawnName: null, tilesetNames: [] }

        // Tile layers from the raw JSON (needed for collision/hidden checkboxes).
        const layers = json
          ? (json.layers || []).filter((l) => l.type === 'tilelayer')
          : []

        // Auto-match tilesets from Storage to fill gaps in existing cfg.
        let mergedTilesets = { ...(cfg.tilesets || {}) }
        try {
          const [tsResult, objResult] = await Promise.all([
            listAll(ref(storage, 'sprites/tilesets')).catch(() => ({ items: [] })),
            listAll(ref(storage, 'sprites/objects')).catch(() => ({ items: [] })),
          ])
          const storagePaths = [
            ...tsResult.items.map((i) => i.fullPath),
            ...objResult.items.map((i) => i.fullPath),
          ]
          const { matched } = autoMatchTilesets(parsedMeta.tilesetNames, storagePaths)
          // Prefer existing cfg mapping; fill gaps with auto-match result.
          parsedMeta.tilesetNames.forEach((name) => {
            if (!mergedTilesets[name] && matched[name]) {
              mergedTilesets[name] = matched[name]
            }
          })
        } catch { /* Storage unreachable — continue with cfg tilesets only */ }

        if (cancelled) return

        setMeta(parsedMeta)
        setTileLayers(layers)
        setDisplayName(cfg.displayName ?? mapKey)
        setDefaultSpawn(cfg.defaultSpawn ?? parsedMeta.defaultSpawnName ?? null)
        setMultiplayer(cfg.multiplayer ?? true)
        setEditable(cfg.editable ?? true)
        setIsEntry(cfg.isEntry ?? false)
        setTilesets(mergedTilesets)
        setCollision({ ...(cfg.collision || {}) })
        setHidden({ ...(cfg.hidden || {}) })
      } catch (err) {
        if (!cancelled) toast?.error('โหลดข้อมูลแมพไม่สำเร็จ: ' + (err.message || ''))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [mapKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBrowsePick(path) {
    const target = browser
    setBrowser(null)
    if (target?.name) {
      setTilesets((p) => ({ ...p, [target.name]: path }))
    }
  }

  function handleTilesetUploaded(name) {
    const dest = `sprites/tilesets/${sanitize(name)}.png`
    setTilesets((p) => ({ ...p, [name]: dest }))
    toast?.success(`อัปโหลด tileset "${name}" แล้ว`)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveMapConfig(
        mapKey,
        {
          tilesets,
          collision,
          hidden,
          displayName: displayName.trim() || mapKey,
          defaultSpawn,
          multiplayer,
          editable,
          isEntry,
        },
        adminUid,
      )
      toast?.success('บันทึก config แล้ว')
      onSaved?.()
      onClose?.()
    } catch (err) {
      toast?.error(err.message || 'บันทึกไม่สำเร็จ')
    } finally {
      if (mountedRef.current) setSaving(false)
    }
  }

  const tilesetNames = meta?.tilesetNames ?? []
  const spawns = meta?.spawns ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h4 className="font-semibold text-gray-800">ตั้งค่าแมพ</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {loading ? (
          <p className="p-6 text-gray-400 text-sm animate-pulse">กำลังโหลด...</p>
        ) : (
          <div className="p-5 overflow-y-auto space-y-6">
            {/* Map preview */}
            <section>
              <MapPreview mapKey={mapKey} height={200} />
            </section>

            {/* Basic info */}
            <section className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">ชื่อแมพ (แสดงผล)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Key (ไม่สามารถแก้ไขได้)</label>
                <code className="block px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 font-mono">
                  {mapKey}
                </code>
              </div>
            </section>

            {/* Default spawn radio */}
            {spawns.length > 0 && (
              <section className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Default Spawn</p>
                <div className="space-y-1">
                  {spawns.map((s) => (
                    <label
                      key={s.name}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                    >
                      <input
                        type="radio"
                        name={`spawn-${mapKey}`}
                        value={s.name}
                        checked={defaultSpawn === s.name}
                        onChange={() => setDefaultSpawn(s.name)}
                        className="accent-brand"
                      />
                      <span className="text-sm text-gray-800">{s.name}</span>
                      {s.isDefault && (
                        <span className="text-[10px] text-brand font-semibold ml-1">(default ใน Tiled)</span>
                      )}
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Capabilities */}
            <section className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Capabilities</p>
              <div className="space-y-1">
                {[
                  { id: 'multiplayer', label: 'Multiplayer', value: multiplayer, set: setMultiplayer },
                  { id: 'editable', label: 'Editable (ผู้เล่นแก้ไขได้)', value: editable, set: setEditable },
                  { id: 'isEntry', label: 'Entry map (แมพเริ่มต้น)', value: isEntry, set: setIsEntry },
                ].map(({ id, label, value, set }) => (
                  <label
                    key={id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => set(e.target.checked)}
                      className="accent-brand"
                    />
                    <span className="text-sm text-gray-800">{label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Tilesets */}
            {tilesetNames.length > 0 && (
              <section className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Assets / Tilesets ({tilesetNames.length})
                </p>
                <div className="space-y-2">
                  {tilesetNames.map((name) => (
                    <div key={name} className="px-3 py-2 rounded-lg bg-gray-50 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm text-gray-800 font-medium">{name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setBrowser({ name })}
                            className="px-2.5 py-1 rounded-lg border border-brand text-brand text-xs font-semibold hover:bg-brand/5 whitespace-nowrap"
                          >Browse</button>
                          <TilesetUploadRow
                            storagePath={`sprites/tilesets/${sanitize(name)}.png`}
                            onSuccess={() => handleTilesetUploaded(name)}
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={tilesets[name] ?? ''}
                        onChange={(e) => setTilesets((p) => ({ ...p, [name]: e.target.value }))}
                        placeholder="sprites/tilesets/..."
                        className={`w-full px-2 py-1 rounded border text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-brand/40 ${
                          tilesets[name]
                            ? 'border-gray-200 text-gray-600 bg-white'
                            : 'border-red-200 text-red-500 bg-red-50'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Collision / Hidden tile layers */}
            {tileLayers.length > 0 && (
              <section className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Layers ({tileLayers.length})
                </p>
                <div className="space-y-1">
                  {tileLayers.map((l) => (
                    <div
                      key={l.name}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50"
                    >
                      <span className="text-sm text-gray-800">{l.name}</span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!collision[l.name]}
                            onChange={(e) =>
                              setCollision((p) => ({ ...p, [l.name]: e.target.checked }))
                            }
                            className="accent-brand"
                          />
                          บล็อก
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!hidden[l.name]}
                            onChange={(e) =>
                              setHidden((p) => ({ ...p, [l.name]: e.target.checked }))
                            }
                            className="accent-brand"
                          />
                          ซ่อน
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-gray-600 text-sm hover:bg-gray-100 transition-colors"
          >ยกเลิก</button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-1.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-strong transition-colors disabled:opacity-50"
          >{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </div>

      {/* Storage browser for tileset pick */}
      {browser && (
        <StorageBrowser
          folders={TILESET_FOLDERS}
          title={`เลือก asset สำหรับ "${browser.name}"`}
          onPick={handleBrowsePick}
          onClose={() => setBrowser(null)}
        />
      )}
    </div>
  )
}
