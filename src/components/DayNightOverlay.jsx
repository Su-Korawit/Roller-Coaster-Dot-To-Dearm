import React, { useState, useEffect, useRef } from 'react'

const PERIOD_LABELS = {
  morning: 'เช้าแล้ว!',
  day: 'กลางวัน',
  evening: 'ตะวันลับ',
  night: 'ค่ำคืนมาถึง',
}

export function DayNightOverlay({ dayNight }) {
  const [overlayColor, setOverlayColor] = useState({ r: 255, g: 200, b: 100, alpha: 0.15 })
  const [periodToast, setPeriodToast] = useState(null)
  const toastTimerRef = useRef(null)

  useEffect(() => {
    if (!dayNight) return

    const intervalId = setInterval(() => {
      setOverlayColor(dayNight.getOverlayColor())
    }, 16)

    const handlePeriodChanged = ({ period: newPeriod }) => {
      clearTimeout(toastTimerRef.current)
      setPeriodToast(PERIOD_LABELS[newPeriod])
      toastTimerRef.current = setTimeout(() => setPeriodToast(null), 2000)
    }

    dayNight.on('periodChanged', handlePeriodChanged)

    return () => {
      clearInterval(intervalId)
      dayNight.off('periodChanged', handlePeriodChanged)
      clearTimeout(toastTimerRef.current)
    }
  }, [dayNight])

  const { r, g, b, alpha } = overlayColor

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: `rgba(${r},${g},${b},${alpha})`,
          pointerEvents: 'none',
          transition: 'background-color 2s ease',
          zIndex: 10,
        }}
      />
      {periodToast && (
        <>
          <style>{`
            @keyframes periodToastIn {
              from { transform: translateX(-50%) scale(0.8); opacity: 0; }
              to   { transform: translateX(-50%) scale(1);   opacity: 1; }
            }
          `}</style>
          <div
            key={periodToast}
            style={{
              position: 'fixed',
              top: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(61,43,31,0.9)',
              border: '3px solid var(--color-line-soft)',
              color: 'var(--color-mist)',
              fontFamily: 'pixelFont-7, monospace',
              fontSize: 16,
              fontWeight: 'bold',
              padding: '12px 24px',
              zIndex: 20,
              pointerEvents: 'none',
              animation: 'periodToastIn 0.3s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {periodToast}
          </div>
        </>
      )}
    </>
  )
}
