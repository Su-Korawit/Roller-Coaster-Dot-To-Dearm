import { useEffect, useState } from 'react'

// Device class drives the Home grid and where the clock lives (sketch: phone/tablet top bar,
// desktop bottom taskbar). Pure part is exported for tests.
export function deviceFor(width) {
  if (width < 640) return { device: 'phone', cols: 4, rows: 5 }
  if (width < 1024) return { device: 'tablet', cols: 6, rows: 4 }
  return { device: 'desktop', cols: 8, rows: 3 }
}

export function useDevice() {
  const [info, setInfo] = useState(() => deviceFor(typeof window === 'undefined' ? 390 : window.innerWidth))
  useEffect(() => {
    const onResize = () => setInfo((prev) => {
      const next = deviceFor(window.innerWidth)
      return next.device === prev.device ? prev : next
    })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return info
}

// True when the main pointer is a finger (phones, iPads — even an iPad in landscape, which is
// as wide as a desktop). Drives on-screen keypad vs. physical keyboard on the passcode screen.
export function isTouchPrimary() {
  try {
    return window.matchMedia('(pointer: coarse)').matches
  } catch {
    return false
  }
}

export function useTouchPrimary() {
  const [touch, setTouch] = useState(isTouchPrimary)
  useEffect(() => {
    let mq
    try { mq = window.matchMedia('(pointer: coarse)') } catch { return undefined }
    const onChange = () => setTouch(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return touch
}

export function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function formatTime(date) {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatDate(date) {
  return date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })
}
