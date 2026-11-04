// src/pages/MusicCallback.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { completeConnect } from '../services/spotifyConnect'

export default function MusicCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    // Run exactly once. React StrictMode double-invokes effects in dev; without
    // this guard completeConnect would exchange the single-use authorization
    // code twice → Spotify 400 invalid_grant.
    if (startedRef.current) return
    startedRef.current = true

    const error = params.get('error')
    const code = params.get('code')
    const state = params.get('state')
    if (error || !code || !state) { setFailed(true); return }
    completeConnect({ code, state })
      .then(() => navigate('/home', { replace: true }))
      .catch(() => setFailed(true))
  }, [params, navigate])

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
      {failed ? (
        <>
          <p className="thai-font text-ink">เชื่อม Spotify ไม่สำเร็จ ลองใหม่อีกครั้ง</p>
          <button onClick={() => navigate('/home', { replace: true })} className="pixel-font text-xs text-brand">
            กลับหน้าหลัก
          </button>
        </>
      ) : (
        <p className="thai-font text-brand">กำลังเชื่อม Spotify…</p>
      )}
    </div>
  )
}
