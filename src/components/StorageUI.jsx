import React, { useState, useEffect } from 'react'
import { ItemSprite } from './ItemSprite'

function SlotGrid({
  slots,
  selectedSlot,
  isHotbar,
  onSlotClick,
  cols,
  slotSize,
}) {
  const styles = {
    grid: {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, ${slotSize}px)`,
      gap: 6,
      padding: 8,
      backgroundColor: 'rgba(200, 169, 110, 0.2)',
      border: '2px solid var(--color-line-soft)',
      borderRadius: 0,
    },
    slot: (isSelected, hasItem) => ({
      position: 'relative',
      width: slotSize,
      height: slotSize,
      backgroundColor: hasItem ? 'var(--color-line-soft)' : 'var(--color-line-soft)',
      border: `2px solid ${isSelected ? 'var(--color-warn)' : 'var(--color-ink)'}`,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.1s',
      boxShadow: isSelected ? 'inset 0 0 8px rgba(245, 230, 66, 0.5)' : 'none',
    }),
    itemAbbr: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: slotSize === 52 ? 18 : 14,
      fontWeight: 'bold',
      color: 'var(--color-ink)',
      textAlign: 'center',
      lineHeight: 1,
      textShadow: '1px 1px 0px rgba(0,0,0,0.3)',
      pointerEvents: 'none',
      zIndex: 2,
    },
    countBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      fontFamily: 'pixelFont-7, monospace',
      fontSize: slotSize === 52 ? 10 : 8,
      fontWeight: 'bold',
      color: 'var(--color-paper)',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: '1px 3px',
      lineHeight: 1,
      textShadow: '1px 1px 0px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
      zIndex: 3,
    },
  }

  return (
    <div style={styles.grid}>
      {slots.map((slot, index) => {
        const isSelected = selectedSlot?.index === index && selectedSlot?.isHotbar === isHotbar
        const hasItem = slot !== null && slot !== undefined
        return (
          <div
            key={index}
            style={styles.slot(isSelected, hasItem)}
            onClick={() => onSlotClick({ index, isHotbar })}
          >
            {hasItem && (
              <>
                <ItemSprite itemId={slot.itemId} size={slotSize - 12} />
                <div style={styles.countBadge}>{slot.count}</div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function StorageUI({
  isOpen = false,
  triggerType = 'house',
  hotbarSlots = [],
  storageSlots = [],
  gold = 0,
  onMoveToStorage = () => {},
  onMoveToHotbar = () => {},
  onSwapSlots = () => {},
  onClose = () => {},
}) {
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [notification, setNotification] = useState(null)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const slotSize = isMobile ? 40 : 52
  const dialogWidth = isMobile ? 360 : 480

  useEffect(() => {
    if (!isOpen) {
      setSelectedSlot(null)
      setNotification(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 1500)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleSlotClick = ({ index, isHotbar }) => {
    const slots = isHotbar ? hotbarSlots : storageSlots
    const slot = slots[index]

    if (!selectedSlot) {
      if (slot && slot !== null && slot !== undefined) {
        setSelectedSlot({ index, isHotbar })
      }
      return
    }

    if (selectedSlot.index === index && selectedSlot.isHotbar === isHotbar) {
      setSelectedSlot(null)
      return
    }

    if (selectedSlot.isHotbar !== isHotbar) {
      if (selectedSlot.isHotbar) {
        onMoveToStorage(selectedSlot.index, true)
      } else {
        onMoveToHotbar(selectedSlot.index)
      }
      setNotification({ type: 'success', message: 'ย้ายของแล้ว' })
    } else {
      onSwapSlots(selectedSlot.index, index, isHotbar)
      setNotification({ type: 'success', message: 'สลับของแล้ว' })
    }

    setSelectedSlot(null)
  }

  const titleMap = {
    house: '🏠 กระเป๋าของฉัน',
    chest: '📦 หีบสมบัติ',
  }

  const styles = {
    backdrop: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: isOpen ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 998,
      pointerEvents: 'auto',
    },
    dialogContainer: {
      position: 'relative',
      width: dialogWidth,
      maxHeight: '90vh',
      backgroundColor: 'var(--color-mist)',
      border: '4px solid var(--color-ink)',
      backgroundImage: 'url(/assets/ui/Sprite\\ sheets/Dialouge\\ UI/dialog\\ box/Big_Dialog_Box.png)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      padding: 12,
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.5)',
      animation: isOpen ? 'fadeInScale 0.3s ease' : 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      overflowY: 'auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    title: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 16,
      fontWeight: 'bold',
      color: 'var(--color-ink)',
      margin: 0,
    },
    goldDisplay: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 12,
      fontWeight: 'bold',
      color: 'var(--color-warn)',
      textShadow: '1px 1px 0px rgba(0,0,0,0.3)',
    },
    closeButton: {
      width: 24,
      height: 24,
      backgroundColor: 'var(--color-line-soft)',
      border: '2px solid var(--color-ink)',
      color: 'var(--color-ink)',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 14,
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      lineHeight: 1,
    },
    sectionLabel: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 11,
      fontWeight: 'bold',
      color: 'var(--color-ink)',
      marginTop: 4,
      marginBottom: 4,
      textTransform: 'uppercase',
      textShadow: '1px 1px 0px rgba(255,255,255,0.3)',
    },
    divider: {
      height: 2,
      backgroundColor: 'var(--color-line-soft)',
      margin: '8px 0',
    },
    arrowDivider: {
      textAlign: 'center',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 12,
      color: 'var(--color-line-soft)',
      margin: '4px 0',
    },
    hint: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 9,
      color: 'var(--color-ink-soft)',
      textAlign: 'center',
      marginTop: 4,
      display: isMobile ? 'none' : 'block',
    },
    notification: (type) => ({
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '6px 12px',
      backgroundColor: type === 'success' ? 'var(--color-zone-earth-soft)' : 'var(--color-zone-health-soft)',
      border: '2px solid var(--color-ink)',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 11,
      fontWeight: 'bold',
      color: 'var(--color-ink)',
      whiteSpace: 'nowrap',
      zIndex: 10,
    }),
  }

  return (
    <>
      <style>{`
        @keyframes fadeInScale {
          from {
            transform: scale(0.9) translateY(-20px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        .storage-dialog::-webkit-scrollbar {
          width: 4px;
        }
        .storage-dialog::-webkit-scrollbar-track {
          background: transparent;
        }
        .storage-dialog::-webkit-scrollbar-thumb {
          background: var(--color-ink);
          border-radius: 2px;
        }
      `}</style>

      <div style={styles.backdrop} onClick={onClose}>
        <div
          className="storage-dialog"
          style={styles.dialogContainer}
          onClick={(e) => e.stopPropagation()}
        >
          {notification && <div style={styles.notification(notification.type)}>{notification.message}</div>}

          <div style={styles.header}>
            <div>
              <h2 style={styles.title}>{titleMap[triggerType]}</h2>
              <div style={styles.goldDisplay}>💰 {gold}g</div>
            </div>
            <button style={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          </div>

          <div style={styles.divider} />

          <div style={styles.sectionLabel}>📍 แถบด่วน (Hotbar)</div>
          <SlotGrid
            slots={hotbarSlots}
            selectedSlot={selectedSlot}
            isHotbar={true}
            onSlotClick={handleSlotClick}
            cols={8}
            slotSize={slotSize}
          />

          <div style={styles.arrowDivider}>↕</div>

          <div style={styles.sectionLabel}>📦 กระเป๋าหลัก (Storage)</div>
          <SlotGrid
            slots={storageSlots}
            selectedSlot={selectedSlot}
            isHotbar={false}
            onSlotClick={handleSlotClick}
            cols={6}
            slotSize={slotSize}
          />

          <div style={styles.hint}>คลิกเพื่อเลือก → คลิกปลายทางเพื่อย้าย</div>
        </div>
      </div>
    </>
  )
}
