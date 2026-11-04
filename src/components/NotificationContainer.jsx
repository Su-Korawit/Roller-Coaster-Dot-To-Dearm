import React, { useState, useEffect, useRef } from 'react'
import { notify } from '../systems/NotificationSystem'

const MAX_VISIBLE = 4

const TYPE_STYLES = {
  success: { background: 'var(--color-zone-earth-soft)', border: 'var(--color-good-strong)' },
  error:   { background: 'var(--color-zone-health-soft)', border: 'var(--color-danger)' },
  info:    { background: 'var(--color-zone-sci-soft)', border: 'var(--color-zone-sci-deep)' },
  warning: { background: 'var(--color-zone-biz-soft)', border: 'var(--color-zone-biz-deep)' },
}

function NotificationCard({ notification }) {
  const [progress, setProgress] = useState(100)
  const intervalRef = useRef(null)

  useEffect(() => {
    const startTime = notification.createdAt
    const duration = notification.duration

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
    }, 50)

    return () => clearInterval(intervalRef.current)
  }, [notification.createdAt, notification.duration])

  const typeStyle = TYPE_STYLES[notification.type] ?? TYPE_STYLES.info

  const styles = {
    card: {
      backgroundColor: typeStyle.background,
      border: `2px solid ${typeStyle.border}`,
      padding: '8px 12px',
      marginBottom: 8,
      minWidth: 220,
      maxWidth: 280,
      animation: 'slideInRight 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
    },
    message: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 11,
      fontWeight: 'bold',
      color: 'var(--color-ink)',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
      lineHeight: 1.3,
    },
    progressBar: {
      height: 3,
      backgroundColor: typeStyle.border,
      width: `${progress}%`,
      transition: 'width 0.05s linear',
    },
    dismissBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 10,
      color: 'var(--color-ink)',
      padding: '0 2px',
      lineHeight: 1,
      opacity: 0.6,
    },
  }

  return (
    <div style={styles.card}>
      <button style={styles.dismissBtn} onClick={() => notify.dismiss(notification.id)}>
        ✕
      </button>
      <div style={styles.message}>
        <span>{notification.icon}</span>
        <span>{notification.message}</span>
      </div>
      <div style={styles.progressBar} />
    </div>
  )
}

export function NotificationContainer() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const unsubscribe = notify.on('changed', (notifications) => {
      setItems([...notifications])
    })
    return unsubscribe
  }, [])

  const visible = items.slice(-MAX_VISIBLE)

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1100,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column-reverse',
      }}>
        {visible.map(n => (
          <NotificationCard key={n.id} notification={n} />
        ))}
      </div>
    </>
  )
}
