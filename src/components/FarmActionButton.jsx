import React from 'react'

export default function FarmActionButton({ label, onAction }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onAction() }}
      style={{
        position: 'absolute',
        bottom: 96,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        fontFamily: "'pixelFont-7', monospace",
        fontSize: 13,
        fontWeight: 'bold',
        color: 'var(--color-ink)',
        backgroundColor: 'var(--color-zone-earth-soft)',
        border: '3px solid var(--color-ink)',
        borderRadius: 6,
        cursor: 'pointer',
        zIndex: 50,
        boxShadow: '0 3px 0 rgba(0,0,0,0.3)',
      }}
    >
      {label}
    </button>
  )
}
