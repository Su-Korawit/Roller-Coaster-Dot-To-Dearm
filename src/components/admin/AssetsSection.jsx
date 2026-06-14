import { useState, useEffect, useRef, useCallback } from 'react'
import { ref, uploadBytes, uploadBytesResumable, getMetadata, listAll } from 'firebase/storage'
import { storage } from '../../firebase'
import { useAuthStore } from '../../stores/useAuthStore'
import { cloudAsset, bustCache } from '../../utils/cloudAsset'
import { MBTI_TYPES, GAME_ASSET_BY_KEY } from '../../game/assetManifest'
import MapConfigEditor from './MapConfigEditor'
import StorageBrowser from './StorageBrowser'

// Copy an existing Storage object onto a fixed game path (download + re-upload),
// used when "Browse" picks an existing file to stand in for a fixed asset slot.
async function copyStorageObject(srcPath, destPath) {
  const url = await cloudAsset(srcPath, { fallback: null })
  if (!url) throw new Error('โหลดไฟล์ต้นทางไม่สำเร็จ')
  const blob = await (await fetch(url)).blob()
  await uploadBytes(ref(storage, destPath), blob, { contentType: blob.type || 'image/png' })
  bustCache(destPath)
}

const FRAME = 48
const COLS  = 4
const FACING_ROWS = [0, 2, 1, 3]

// Animated spritesheet preview — uses a cloud URL when available, falls back to local.
function SpritePreview({ code, cloudUrl }) {
  const [frame, setFrame]   = useState(0)
  const [facing, setFacing] = useState(0)

  useEffect(() => {
    const walk = setInterval(() => setFrame((f) => (f + 1) % COLS), 125)
    const turn = setInterval(() => setFacing((d) => (d + 1) % FACING_ROWS.length), 900)
    return () => { clearInterval(walk); clearInterval(turn) }
  }, [])

  const scale  = 3
  const size   = FRAME * scale
  const row    = FACING_ROWS[facing]
  const sheet  = cloudUrl ?? GAME_ASSET_BY_KEY[code]?.localPath

  return (
    <div
      role="img"
      aria-label={`${code} sprite preview`}
      style={{
        width: size, height: size,
        backgroundImage: `url(${sheet})`,
        backgroundSize: `${FRAME * COLS * scale}px ${FRAME * COLS * scale}px`,
        backgroundPosition: `-${frame * size}px -${row * size}px`,
        imageRendering: 'pixelated',
      }}
    />
  )
}

// Reusable file upload row with progress bar.
function UploadRow({ storagePath, accept, onSuccess, label }) {
  const [progress, setProgress]   = useState(null) // 0-100 | null
  const [error, setError]         = useState(null)
  const inputRef = useRef(null)

  const handleFile = useCallback((file) => {
    if (!file) return
    setError(null)
    setProgress(0)
    const task = uploadBytesResumable(ref(storage, storagePath), file)
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
  }, [storagePath, onSuccess])

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
          className="px-3 py-1 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-strong transition-colors disabled:opacity-50"
        >
          {progress !== null ? `${progress}%` : label ?? 'Replace'}
        </button>
        {error && <span className="text-red-500 text-xs truncate">{error}</span>}
      </div>
      {progress !== null && (
        <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}

// ── Character grid ────────────────────────────────────────────────────────────

function CharactersGrid() {
  const [cloudUrls, setCloudUrls]     = useState({})
  const [uploaded, setUploaded]       = useState(new Set())
  const [loadingList, setLoadingList] = useState(true)
  const [browseCode, setBrowseCode]   = useState(null) // MBTI code being browsed
  const [busyCode, setBusyCode]       = useState(null) // code mid-copy

  // Check which characters are already uploaded to Storage.
  const refreshList = useCallback(async () => {
    setLoadingList(true)
    try {
      const result = await listAll(ref(storage, 'sprites/characters'))
      const names  = new Set(result.items.map((i) => i.name))
      setUploaded(names)
    } catch {
      // Storage empty or rules not yet deployed — ignore
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { refreshList() }, [refreshList])

  // Resolve cloud URLs for all types.
  useEffect(() => {
    MBTI_TYPES.forEach((code) => {
      const path = `sprites/characters/${code}.png`
      cloudAsset(path, { fallback: null }).then((url) => {
        if (url) setCloudUrls((prev) => ({ ...prev, [code]: url }))
      })
    })
  }, [])

  const handleReplaced = useCallback((code) => {
    const path = `sprites/characters/${code}.png`
    bustCache(path)
    // Re-resolve and update preview
    cloudAsset(path, { fallback: null }).then((url) => {
      if (url) setCloudUrls((prev) => ({ ...prev, [code]: url }))
    })
    setUploaded((prev) => new Set([...prev, `${code}.png`]))
  }, [])

  const handleBrowsePick = useCallback(async (srcPath) => {
    const code = browseCode
    setBrowseCode(null)
    if (!code) return
    setBusyCode(code)
    try {
      await copyStorageObject(srcPath, `sprites/characters/${code}.png`)
      handleReplaced(code)
    } catch { /* surfaced as no-op; admin can retry */ }
    finally { setBusyCode(null) }
  }, [browseCode, handleReplaced])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Characters ({MBTI_TYPES.length})</h3>
        <button
          onClick={refreshList}
          className="text-xs text-brand hover:underline"
        >
          Refresh list
        </button>
      </div>

      {loadingList ? (
        <p className="text-gray-400 text-sm animate-pulse">ตรวจสอบ Storage...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {MBTI_TYPES.map((code) => {
            const inCloud = uploaded.has(`${code}.png`)
            return (
              <div key={code} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                <SpritePreview code={code} cloudUrl={cloudUrls[code]} />
                <span className="pixel-font text-[9px] text-gray-700">{code}</span>
                {!inCloud && (
                  <span className="text-[10px] text-amber-500 font-semibold">local only</span>
                )}
                <div className="flex items-center gap-1.5">
                  <UploadRow
                    storagePath={`sprites/characters/${code}.png`}
                    accept=".png"
                    onSuccess={() => handleReplaced(code)}
                    label={busyCode === code ? '...' : 'Upload'}
                  />
                  <button
                    onClick={() => setBrowseCode(code)}
                    disabled={busyCode === code}
                    className="px-2 py-1 rounded-lg border border-brand text-brand text-xs font-semibold hover:bg-brand/5 disabled:opacity-50"
                  >Browse</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {browseCode && (
        <StorageBrowser
          folders={['sprites/characters']}
          title={`เลือก sprite สำหรับ ${browseCode}`}
          onPick={handleBrowsePick}
          onClose={() => setBrowseCode(null)}
        />
      )}
    </div>
  )
}

// ── Maps list ─────────────────────────────────────────────────────────────────

const MAP_KEYS = ['test3', 'indoor']

function MapsPanel() {
  const [meta, setMeta]   = useState({})
  const [refresh, setRefresh] = useState(0)
  const [editKey, setEditKey] = useState(null)
  const adminUid = useAuthStore((s) => s.user?.uid)

  useEffect(() => {
    MAP_KEYS.forEach(async (key) => {
      const path = GAME_ASSET_BY_KEY[key]?.storagePath
      if (!path) return
      try {
        const m = await getMetadata(ref(storage, path))
        setMeta((prev) => ({ ...prev, [key]: { size: m.size, updated: m.updated } }))
      } catch {
        setMeta((prev) => ({ ...prev, [key]: null }))
      }
    })
  }, [refresh])

  const handleSaved = useCallback((key) => {
    const path = GAME_ASSET_BY_KEY[key]?.storagePath
    if (path) bustCache(path)
    setRefresh((n) => n + 1)
  }, [])

  return (
    <div>
      <h3 className="font-semibold text-gray-800 mb-4">Maps</h3>
      <div className="space-y-3">
        {MAP_KEYS.map((key) => {
          const m = meta[key]
          return (
            <div key={key} className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{key}.json</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {m === undefined ? 'ตรวจสอบ...' :
                   m === null     ? '⚠ ยังไม่ได้ upload ขึ้น Storage' :
                   `${(m.size / 1024).toFixed(1)} KB · updated ${new Date(m.updated).toLocaleDateString('th-TH')}`}
                </p>
              </div>
              <button
                onClick={() => setEditKey(key)}
                className="px-4 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-strong transition-colors"
              >ตั้งค่า / Replace</button>
            </div>
          )
        })}
      </div>

      {editKey && (
        <MapConfigEditor
          mapKey={editKey}
          adminUid={adminUid}
          onClose={() => setEditKey(null)}
          onSaved={() => handleSaved(editKey)}
        />
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AssetsSection() {
  return (
    <div className="space-y-12">
      <CharactersGrid />
      <MapsPanel />
    </div>
  )
}
