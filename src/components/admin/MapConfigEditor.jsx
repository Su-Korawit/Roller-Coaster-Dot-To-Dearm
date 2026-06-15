import { useEffect, useRef, useState } from 'react'
import { ref, uploadBytes, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../../firebase'
import { cloudAsset, bustCache } from '../../utils/cloudAsset'
import { getMapConfig, saveMapConfig } from '../../utils/mapConfig'
import StorageBrowser from './StorageBrowser'
import { useToast } from './Toast'

const TILESET_FOLDERS = ['sprites/tilesets', 'sprites/objects']
const MAP_FOLDERS = ['maps'] // module-level so the prop keeps a stable identity
const sanitize = (name) => name.trim().replace(/\s+/g, '_')

// Fetch a map JSON's text, preferring its Storage copy and falling back to the
// local public/ copy when the cloud URL is unreachable.
async function loadMapText(key) {
  const local = `/maps/${key}.json`
  const url = await cloudAsset(`maps/${key}.json`, { fallback: local })
  try {
    const res = await fetch(url)
    if (res.ok) return await res.text()
  } catch { /* fall through */ }
  const res = await fetch(local)
  return res.ok ? await res.text() : ''
}

// Rich editor for a single map: shows its layers (tick blocked/hidden) and the
// tileset assets it needs (Browse existing Storage file or Upload a new one),
// then persists the JSON + config.
export default function MapConfigEditor({ mapKey, adminUid, onClose, onSaved }) {
  const [loading, setLoading] = useState(true)
  const [parsed, setParsed]   = useState(null)
  const [jsonText, setJsonText] = useState(null)
  const [jsonDirty, setJsonDirty] = useState(false)
  const [jsonPickedMsg, setJsonPickedMsg] = useState(false) // brief inline feedback
  const [tilesets, setTilesets]   = useState({})
  const [collision, setCollision] = useState({})
  const [hidden, setHidden]       = useState({})
  const [browser, setBrowser]     = useState(null) // 'mapjson' | { name } | null
  const [saving, setSaving]       = useState(false)
  const [uploadingName, setUploadingName] = useState(null) // tileset name mid-upload
  const jsonInputRef = useRef(null)
  const pickedMsgTimer = useRef(null)
  const toast = useToast()

  // Clear the "picked" inline-message timer on unmount so it can't setState late.
  useEffect(() => () => clearTimeout(pickedMsgTimer.current), [])

  // Apply a parsed map + the stored config to local state.
  function applyMap(text, cfg) {
    let map
    try { map = JSON.parse(text) } catch { toast?.error('ไฟล์ไม่ใช่ JSON ที่ถูกต้อง'); return false }
    setParsed(map)
    setJsonText(text)
    const ts = {}
    ;(map.tilesets || []).forEach((t) => { ts[t.name] = cfg.tilesets?.[t.name] ?? '' })
    setTilesets(ts)
    setCollision({ ...(cfg.collision || {}) })
    setHidden({ ...(cfg.hidden || {}) })
    return true
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([loadMapText(mapKey), getMapConfig(mapKey)]).then(([text, cfg]) => {
      if (cancelled) return
      applyMap(text, cfg)
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey])

  const tileLayers = (parsed?.layers || []).filter((l) => l.type === 'tilelayer')
  const tilesetNames = (parsed?.tilesets || []).map((t) => t.name)
  const missingTilesets = tilesetNames.filter((n) => !tilesets[n])

  function handleJsonFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const ok = applyMap(e.target.result, { tilesets, collision, hidden })
      if (ok) setJsonDirty(true)
    }
    reader.readAsText(file)
  }

  async function handleBrowsePick(path) {
    const target = browser
    setBrowser(null)
    if (target === 'mapjson') {
      const url = await cloudAsset(path, { fallback: null })
      if (!url) { toast?.error('โหลดไฟล์ที่เลือกไม่สำเร็จ'); return }
      try {
        const res = await fetch(url)
        const text = await res.text()
        if (applyMap(text, { tilesets, collision, hidden })) {
          setJsonDirty(true)
          setJsonPickedMsg(true)
          clearTimeout(pickedMsgTimer.current)
          pickedMsgTimer.current = setTimeout(() => setJsonPickedMsg(false), 2000)
        }
      } catch { toast?.error('โหลดไฟล์ที่เลือกไม่สำเร็จ') }
    } else if (target?.name) {
      setTilesets((p) => ({ ...p, [target.name]: path }))
    }
  }

  function handleTilesetUpload(name, file) {
    if (!file) return
    const dest = `sprites/tilesets/${sanitize(name)}.png`
    setUploadingName(name)
    const task = uploadBytesResumable(ref(storage, dest), file, { contentType: file.type || 'image/png' })
    task.on(
      'state_changed',
      null,
      (err) => { toast?.error(err.message); setUploadingName(null) },
      () => {
        bustCache(dest)
        setTilesets((p) => ({ ...p, [name]: dest }))
        setUploadingName(null)
      },
    )
  }

  async function handleSave() {
    if (missingTilesets.length) {
      toast?.error(`ยังไม่ได้กำหนด asset: ${missingTilesets.join(', ')}`)
      return
    }
    setSaving(true)
    try {
      if (jsonDirty && jsonText != null) {
        await uploadBytes(ref(storage, `maps/${mapKey}.json`), new Blob([jsonText], { type: 'application/json' }), {
          contentType: 'application/json',
        })
        bustCache(`maps/${mapKey}.json`)
        // JSON is now in Storage; clear the dirty flag so a saveMapConfig failure
        // below doesn't force a redundant re-upload on retry.
        setJsonDirty(false)
      }
      await saveMapConfig(mapKey, { tilesets, collision, hidden }, adminUid)
      onSaved?.()
      onClose?.()
    } catch (err) {
      toast?.error(err.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-800">ตั้งค่าแมพ: {mapKey}.json</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {loading ? (
          <p className="p-6 text-gray-400 text-sm animate-pulse">กำลังโหลด...</p>
        ) : (
          <div className="p-5 overflow-y-auto space-y-6">
            {/* JSON source: 2 options */}
            <section>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">ไฟล์แมพ (.json)</p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => jsonInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-strong"
                >⬆ Upload ใหม่</button>
                <button
                  onClick={() => setBrowser('mapjson')}
                  className="px-3 py-1.5 rounded-lg border border-brand text-brand text-xs font-semibold hover:bg-brand/5"
                >📁 Browse Storage</button>
                {jsonPickedMsg && (
                  <span className="text-[11px] text-emerald-600 font-semibold">✓ โหลดแล้ว</span>
                )}
                {jsonDirty && !jsonPickedMsg && (
                  <span className="text-[11px] text-amber-600">• จะอัปโหลดทับตอนกด Save</span>
                )}
                <input ref={jsonInputRef} type="file" accept=".json" className="hidden"
                  onChange={(e) => handleJsonFile(e.target.files?.[0])} />
              </div>
            </section>

            {/* Layers */}
            <section>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Layers ({tileLayers.length})</p>
              <div className="space-y-1">
                {tileLayers.map((l) => (
                  <div key={l.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                    <span className="text-sm text-gray-800">{l.name}</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={!!collision[l.name]}
                          onChange={(e) => setCollision((p) => ({ ...p, [l.name]: e.target.checked }))} />
                        บล็อก (เดินผ่านไม่ได้)
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={!!hidden[l.name]}
                          onChange={(e) => setHidden((p) => ({ ...p, [l.name]: e.target.checked }))} />
                        ซ่อน
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Tilesets */}
            <section>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Assets / Tilesets ({tilesetNames.length})</p>
              <div className="space-y-2">
                {tilesetNames.map((name) => (
                  <div key={name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{name}</p>
                      <p className={`text-[11px] truncate ${tilesets[name] ? 'text-gray-500' : 'text-red-500'}`}>
                        {tilesets[name] || '⚠ ยังไม่ได้กำหนด asset'}
                      </p>
                    </div>
                    <button
                      onClick={() => setBrowser({ name })}
                      className="px-2.5 py-1 rounded-lg border border-brand text-brand text-xs font-semibold hover:bg-brand/5"
                    >📁 Browse</button>
                    <label className="px-2.5 py-1 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-strong cursor-pointer">
                      {uploadingName === name ? '...' : '⬆ Upload'}
                      <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp" className="hidden"
                        onChange={(e) => handleTilesetUpload(name, e.target.files?.[0])} />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-1.5 rounded-xl text-gray-600 text-sm hover:bg-gray-100">ยกเลิก</button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-1.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-strong disabled:opacity-50"
          >{saving ? 'กำลังบันทึก...' : 'Save'}</button>
        </div>
      </div>

      {browser && (
        <StorageBrowser
          folders={browser === 'mapjson' ? MAP_FOLDERS : TILESET_FOLDERS}
          title={browser === 'mapjson' ? 'เลือกไฟล์แมพ (.json)' : 'เลือก asset / tileset'}
          onPick={handleBrowsePick}
          onClose={() => setBrowser(null)}
        />
      )}
    </div>
  )
}
