import React, { useState, useEffect, useRef } from 'react'

const PERIOD_ICONS = {
  morning: '🌅',
  day: '☀️',
  evening: '🌆',
  night: '🌙',
}

const PERIOD_LABELS = {
  morning: '🌅 เช้าแล้ว!',
  day: '☀️ กลางวัน',
  evening: '🌆 ตะวันลับ',
  night: '🌙 ค่ำคืนมาถึง',
}

export function DayNightOverlay({ dayNight }) {
  const [progress, setProgress] = useState(0)
  const [period, setPeriod] = useState('morning')
  const [timeString, setTimeString] = useState('06:00')
  const [dayCount, setDayCount] = useState(1)
  const [overlayColor, setOverlayColor] = useState({ r: 255, g: 200, b: 100, alpha: 0.15 })
  const [periodToast, setPeriodToast] = useState(null)
  const toastTimerRef = useRef(null)

  useEffect(() => {
    if (!dayNight) return

    const intervalId = setInterval(() => {
      setProgress(dayNight.getProgress())
      setPeriod(dayNight.getPeriod())
      setTimeString(dayNight.getTimeString())
      setDayCount(dayNight.getDayCount())
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

  const styles = {
    colorOverlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: `rgba(${r},${g},${b},${alpha})`,
      pointerEvents: 'none',
      transition: 'background-color 2s ease',
      zIndex: 10,
    },
    hud: {
      position: 'fixed',
      top: 16,
      right: 16,
      backgroundColor: 'rgba(61, 43, 31, 0.75)',
      border: '2px solid #3d2b1f',
      padding: '8px 10px',
      zIndex: 11,
      pointerEvents: 'none',
      minWidth: 110,
    },
    hudDay: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 10,
      color: '#c8a96e',
      marginBottom: 2,
    },
    hudTime: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 14,
      fontWeight: 'bold',
      color: '#f0d9a0',
      marginBottom: 6,
    },
    progressBarOuter: {
      width: '100%',
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.15)',
      border: '1px solid #8b6343',
    },
    progressBarInner: {
      height: '100%',
      width: `${Math.round(progress * 100)}%`,
      backgroundColor: '#f5c542',
      transition: 'width 0.5s linear',
    },
    toast: {
      position: 'fixed',
      top: '30%',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(61, 43, 31, 0.9)',
      border: '3px solid #c8a96e',
      color: '#f0d9a0',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 16,
      fontWeight: 'bold',
      padding: '12px 24px',
      zIndex: 20,
      pointerEvents: 'none',
      animation: 'periodToastIn 0.3s ease',
      whiteSpace: 'nowrap',
    },
  }

  return (
    <>
      <style>{`
        @keyframes periodToastIn {
          from { transform: translateX(-50%) scale(0.8); opacity: 0; }
          to   { transform: translateX(-50%) scale(1);   opacity: 1; }
        }
      `}</style>

      <div style={styles.colorOverlay} />

      <div style={styles.hud}>
        <div style={styles.hudDay}>วันที่ {dayCount}</div>
        <div style={styles.hudTime}>
          {PERIOD_ICONS[period]} {timeString}
        </div>
        <div style={styles.progressBarOuter}>
          <div style={styles.progressBarInner} />
        </div>
      </div>

      {periodToast && (
        <div key={periodToast} style={styles.toast}>
          {periodToast}
        </div>
      )}
    </>
  )
}
