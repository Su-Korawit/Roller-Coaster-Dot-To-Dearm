import React from 'react'
import { getItemAbbr, getItemColor } from '../utils/itemHelpers'

export function Hotbar({ slots = [], selectedIndex = 0, gold = 0, onSelectSlot = () => {} }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const slotSize = isMobile ? 40 : 48
  const gap = isMobile ? 4 : 8

  const styles = {
    container: {
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      pointerEvents: 'none',
      zIndex: 1000,
    },
    goldDisplay: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#f5c542',
      marginBottom: 8,
      paddingLeft: 8,
      textShadow: '2px 2px 0px rgba(0,0,0,0.3)',
    },
    slotsRow: {
      display: 'flex',
      gap: gap,
      backgroundColor: '#c8a96e',
      border: '4px solid #3d2b1f',
      padding: 8,
      pointerEvents: 'none',
    },
    slot: {
      position: 'relative',
      width: slotSize,
      height: slotSize,
      backgroundColor: '#a89968',
      border: '2px solid #3d2b1f',
      cursor: 'pointer',
      pointerEvents: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.1s',
    },
    slotSelected: {
      border: '2px solid #f5e642',
      boxShadow: 'inset 0 0 8px rgba(245, 230, 66, 0.5)',
      backgroundColor: '#b8a978',
    },
    slotBg: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      imageRendering: 'pixelated',
      opacity: 0.8,
    },
    itemAbbr: {
      position: 'relative',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: isMobile ? '11px' : '12px',
      fontWeight: 'bold',
      textAlign: 'center',
      lineHeight: 1,
      textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
      zIndex: 2,
    },
    countBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      fontFamily: 'pixelFont-7, monospace',
      fontSize: isMobile ? '9px' : '10px',
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: '1px 3px',
      lineHeight: 1,
      textShadow: '1px 1px 0px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
      zIndex: 3,
    },
  }

  return (
    <div style={styles.container}>
      <div style={styles.goldDisplay}>💰 {gold}g</div>
      <div style={styles.slotsRow}>
        {slots.map((slot, i) => (
          <div
            key={i}
            style={{
              ...styles.slot,
              ...(selectedIndex === i ? styles.slotSelected : {}),
            }}
            onClick={() => onSelectSlot(i)}
          >
            <img
              src="/assets/ui/emojis-free/Inventory_slot.png"
              alt=""
              style={styles.slotBg}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            {slot && (
              <>
                <span style={styles.itemAbbr}>{getItemAbbr(slot.itemId)}</span>
                <span style={styles.countBadge}>{slot.count}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
