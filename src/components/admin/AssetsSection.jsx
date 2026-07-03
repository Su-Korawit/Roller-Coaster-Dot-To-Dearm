import { useState, useEffect, useRef, useCallback } from 'react'
import { ref, uploadBytesResumable, listAll } from 'firebase/storage'
import { storage } from '../../firebase'
import { cloudAsset, bustCache } from '../../utils/cloudAsset'
import { MBTI_TYPES, GAME_ASSET_BY_KEY } from '../../game/assetManifest'
import { copyStorageObject } from '../../utils/storageOps'
import StorageBrowser from './StorageBrowser'
import { useToast } from './Toast'

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
        flexShrink: 0,
      }}
    />
  )
}

// Reusable file upload row with progress bar.
function UploadRow({ storagePath, accept, onSuccess, label, disabled }) {
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
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null || disabled}
          className="flex-1 px-2 py-1 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-strong transition-colors disabled:opacity-50 text-center"
        >
          {progress !== null ? `${progress}%` : label ?? '⬆ อัปโหลด'}
        </button>
        {error && <span className="text-red-500 text-[10px] truncate">{error}</span>}
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

export function CharactersGrid({ onStatus }) {
  const [cloudUrls, setCloudUrls]     = useState({})
  const [uploaded, setUploaded]       = useState(new Set())
  const [loadingList, setLoadingList] = useState(true)
  const [browseCode, setBrowseCode]   = useState(null) // MBTI code being browsed
  const [busyCode, setBusyCode]       = useState(null) // code mid-copy
  const toast = useToast()
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Check which characters are already uploaded to Storage.
  const refreshList = useCallback(async () => {
    setLoadingList(true)
    try {
      const result = await listAll(ref(storage, 'rc/characters'))
      const names  = new Set(result.items.map((i) => i.name))
      setUploaded(names)
      onStatus?.({ cloudCount: names.size, total: MBTI_TYPES.length })
    } catch {
      // Storage unreachable (offline / rules / transient): leave the previous
      // badge value untouched rather than falsely reporting "all missing".
    } finally {
      setLoadingList(false)
    }
  }, [onStatus])

  useEffect(() => { refreshList() }, [refreshList])

  // Resolve cloud URLs for all types.
  useEffect(() => {
    MBTI_TYPES.forEach((code) => {
      const path = `rc/characters/${code}.png`
      cloudAsset(path, { fallback: null }).then((url) => {
        if (url && mountedRef.current) setCloudUrls((prev) => ({ ...prev, [code]: url }))
      })
    })
  }, [])

  const handleReplaced = useCallback((code) => {
    const path = `rc/characters/${code}.png`
    bustCache(path)
    cloudAsset(path, { fallback: null }).then((url) => {
      if (url && mountedRef.current) setCloudUrls((prev) => ({ ...prev, [code]: url }))
    })
    setUploaded((prev) => {
      const next = new Set([...prev, `${code}.png`])
      onStatus?.({ cloudCount: next.size, total: MBTI_TYPES.length })
      return next
    })
    toast?.success(`${code} อัปโหลดแล้ว`)
  }, [onStatus, toast])

  const handleBrowsePick = useCallback(async (srcPath) => {
    const code = browseCode
    setBrowseCode(null)
    if (!code) return
    setBusyCode(code)
    try {
      await copyStorageObject(srcPath, `rc/characters/${code}.png`)
      handleReplaced(code)
    } catch {
      toast?.error(`คัดลอกไฟล์ไม่สำเร็จ`)
    }
    finally { setBusyCode(null) }
  }, [browseCode, handleReplaced, toast])

  const cloudCount = [...uploaded].filter(n => MBTI_TYPES.includes(n.replace('.png',''))).length
  const missing = MBTI_TYPES.length - cloudCount

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800">Characters</h3>
          {!loadingList && (
            missing === 0
              ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">✓ {cloudCount}/{MBTI_TYPES.length} in cloud</span>
              : <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">⚠ {missing} ยังไม่ได้ upload</span>
          )}
        </div>
        <button onClick={refreshList} className="text-xs text-brand hover:underline">
          Refresh
        </button>
      </div>

      {loadingList ? (
        <p className="text-gray-400 text-sm animate-pulse">ตรวจสอบ Storage...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {MBTI_TYPES.map((code) => {
            const inCloud = uploaded.has(`${code}.png`)
            const busy = busyCode === code
            return (
              <div key={code} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                <SpritePreview code={code} cloudUrl={cloudUrls[code]} />
                <div className="flex items-center gap-1.5">
                  <span className="pixel-font text-[9px] text-gray-700">{code}</span>
                  {inCloud
                    ? <span className="text-[9px] text-emerald-600 font-semibold">✓ cloud</span>
                    : <span className="text-[9px] text-amber-500 font-semibold">local</span>
                  }
                </div>
                <UploadRow
                  storagePath={`rc/characters/${code}.png`}
                  accept=".png"
                  onSuccess={() => handleReplaced(code)}
                  label={busy ? '...' : '⬆ อัปโหลด'}
                  disabled={busy}
                />
                <button
                  onClick={() => setBrowseCode(code)}
                  disabled={busy}
                  className="w-full px-2 py-1 rounded-lg border border-brand text-brand text-xs font-semibold hover:bg-brand/5 disabled:opacity-50 text-center"
                >📁 เลือก</button>
              </div>
            )
          })}
        </div>
      )}

      {browseCode && (
        <StorageBrowser
          folders={['rc/characters']}
          title={`เลือก sprite สำหรับ ${browseCode}`}
          onPick={handleBrowsePick}
          onClose={() => setBrowseCode(null)}
        />
      )}
    </div>
  )
}

// ── Maps panel ────────────────────────────────────────────────────────────────
// Re-export MapDashboard under the MapsPanel name that AdminPage already imports.
// This keeps AdminPage untouched while the implementation moves to MapDashboard.
export { default as MapsPanel } from './MapDashboard'

// CharactersGrid and MapsPanel are rendered as independent, permission-scoped
// tabs by AdminPage — see src/pages/AdminPage.jsx.
