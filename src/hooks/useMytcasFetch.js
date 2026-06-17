// ============================================================================
// useMytcasFetch.js — hook กลางสำหรับดึงข้อมูล TCAS จาก /api/mytcas
// ----------------------------------------------------------------------------
// สรุปการเปลี่ยนแปลง (Candidate 5 — shared useMytcasFetch):
//   เดิม: useMytcas.js มี hook 5 ตัวที่ใช้ boilerplate เหมือนกันเป๊ะ —
//         (cancelled flag + reset state + fetchTcas().then/catch/finally
//          + cleanup) ต่างกันแค่ params, deps และชื่อ field ที่คืน
//   ใหม่: รวม lifecycle ทั้งหมดไว้ที่ useMytcasFetch() ที่เดียว แล้วให้ hook
//         เดิมทั้ง 5 เป็น wrapper บาง ๆ ที่คงรูปร่าง return เดิมไว้ทุกตัว
//   เพิ่ม: refetch() (บังคับ bypass cache) ซึ่ง hook เดิมไม่มี
//   ย้าย fetchTcas + clientCache มาไว้ที่นี่ด้วย เพื่อเลี่ยง circular import
//         (useMytcas.js import hook นี้ ส่วน tcasLogoUrl ยังอยู่ที่ useMytcas.js)
// ============================================================================
import { useState, useEffect, useCallback } from 'react'

const BASE = '/api/mytcas'

const clientCache = new Map()

export async function fetchTcas(params = {}, { force = false } = {}) {
  const query = new URLSearchParams(params).toString()
  const url = query ? `${BASE}?${query}` : BASE
  if (!force && clientCache.has(url)) return clientCache.get(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TCAS API error: ${res.status}`)
  const data = await res.json()
  clientCache.set(url, data)
  return data
}

/**
 * Shared TCAS fetch lifecycle: loading / error / data, with cancellation on
 * unmount and a refetch() that bypasses the client cache.
 *
 * @param {object} params  query params passed to fetchTcas
 * @param {Array}  deps    dependency array that re-triggers the fetch
 * @param {object} [opts]
 * @param {boolean} [opts.enabled=true]  skip fetching while false (guarded params)
 * @returns {{ data: any, loading: boolean, error: Error|null, refetch: () => void }}
 */
export function useMytcasFetch(params, deps, { enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)

  // run() returns the effect cleanup; force=true bypasses the cache (refetch).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback((force = false) => {
    if (!enabled) return undefined
    let cancelled = false
    setData(null)
    setError(null)
    setLoading(true)
    fetchTcas(params, { force })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, deps)

  useEffect(() => run(false), [run])

  const refetch = useCallback(() => run(true), [run])

  return { data, loading, error, refetch }
}
