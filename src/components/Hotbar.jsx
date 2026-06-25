import React from 'react'
import { ItemSprite } from './ItemSprite'

export function Hotbar({ slots = [], selectedIndex = 0, gold = 0, onSelectSlot = () => {} }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const slotSize = isMobile ? 40 : 44
  const gap = 4
  const visibleSlots = 4
  const maxScrollHeight = slotSize * visibleSlots + gap * (visibleSlots - 1) + 16

  const styles = {
    container: {
      position: 'fixed',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
    },
    goldDisplay: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#f5c542',
      textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
      textAlign: 'center',
      lineHeight: 1.2,
    },
    slotsColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: gap,
      backgroundColor: '#c8a96e',
      border: '3px solid #3d2b1f',
      padding: 6,
      overflowY: 'auto',
      maxHeight: maxScrollHeight,
      pointerEvents: 'auto',
      scrollbarWidth: 'none',
    },
    slot: {
      position: 'relative',
      width: slotSize,
      height: slotSize,
      backgroundColor: '#a89968',
      border: '2px solid #3d2b1f',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
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
      fontSize: '11px',
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
      fontSize: '9px',
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: '1px 3px',
      lineHeight: 1,
      textShadow: '1px 1px 0px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
      zIndex: 3,
    },
  }

  return (
    <div style={styles.container}>
      <div style={styles.goldDisplay}>{gold}g</div>
      <div style={styles.slotsColumn}>
        {slots.map((slot, i) => (
          <div
            key={i}
            style={{ ...styles.slot, ...(selectedIndex === i ? styles.slotSelected : {}) }}
            onClick={() => onSelectSlot(i)}
          >
            <img
              src="/assets/ui/emojis-free/Inventory_slot.png"
              alt=""
              style={styles.slotBg}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            {slot && (
              <>
                <ItemSprite itemId={slot.itemId} size={slotSize - 8} />
                <span style={styles.countBadge}>{slot.count}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
