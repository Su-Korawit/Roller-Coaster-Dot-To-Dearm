import React, { useState, useEffect } from 'react'
import { getItemAbbr, getItemColor } from '../utils/itemHelpers'

export function SeedPicker({ isOpen = false, seeds = [], onSelect = () => {}, onClose = () => {} }) {
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setSelected(null)
    }
  }, [isOpen])

  const styles = {
    backdrop: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      display: isOpen ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
      pointerEvents: 'auto',
    },
    dialogContainer: {
      position: 'relative',
      width: 320,
      backgroundColor: '#d4a574',
      border: '4px solid #3d2b1f',
      backgroundImage: 'url(/assets/ui/Sprite\ sheets/Dialouge\ UI/dialog\ box/Small_Dialog_Box.png)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      padding: 16,
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
      animation: isOpen ? 'slideUp 0.2s ease' : 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
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
      color: '#3d2b1f',
      margin: 0,
    },
    closeButton: {
      width: 24,
      height: 24,
      backgroundColor: '#c8a96e',
      border: '2px solid #3d2b1f',
      color: '#3d2b1f',
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
    seedGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 8,
      minHeight: 80,
      maxHeight: 200,
      overflowY: 'auto',
      padding: 4,
    },
    seedCard: (isSelected) => ({
      position: 'relative',
      width: '100%',
      aspectRatio: '1 / 1',
      border: `2px solid ${isSelected ? '#e8a020' : '#3d2b1f'}`,
      backgroundColor: isSelected ? '#f5e642' : '#f0d9a0',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.1s',
      padding: 4,
      boxSizing: 'border-box',
    }),
    seedAbbr: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 20,
      fontWeight: 'bold',
      color: '#3d2b1f',
      textAlign: 'center',
      lineHeight: 1,
      marginBottom: 2,
    },
    seedName: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 8,
      fontWeight: 'bold',
      color: '#3d2b1f',
      textAlign: 'center',
      lineHeight: 1,
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    countBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 9,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: '1px 2px',
      lineHeight: 1,
      textShadow: '1px 1px 0px rgba(0,0,0,0.8)',
    },
    emptyState: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 80,
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 12,
      color: '#3d2b1f',
      textAlign: 'center',
      lineHeight: 1.4,
      whiteSpace: 'pre-wrap',
    },
    footer: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      marginTop: 8,
    },
    selectedInfo: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 11,
      color: '#3d2b1f',
      padding: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      border: '1px solid #3d2b1f',
      textAlign: 'center',
      minHeight: 20,
    },
    buttonRow: {
      display: 'flex',
      gap: 8,
      justifyContent: 'center',
    },
    confirmButton: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 12,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: selected ? '#6fb357' : '#999999',
      border: '2px solid #3d2b1f',
      padding: '6px 16px',
      cursor: selected ? 'pointer' : 'not-allowed',
      opacity: selected ? 1 : 0.6,
      transition: 'all 0.1s',
    },
    cancelButton: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 12,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: '#a06666',
      border: '2px solid #3d2b1f',
      padding: '6px 16px',
      cursor: 'pointer',
      transition: 'all 0.1s',
    },
  }

  const handleSelectSeed = (itemId) => {
    setSelected(itemId)
  }

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected)
      onClose()
    }
  }

  const selectedSeed = seeds.find(s => s.itemId === selected)

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .seed-picker-dialog::-webkit-scrollbar {
          width: 4px;
        }
        .seed-picker-dialog::-webkit-scrollbar-track {
          background: transparent;
        }
        .seed-picker-dialog::-webkit-scrollbar-thumb {
          background: #3d2b1f;
          border-radius: 2px;
        }
      `}</style>

      <div style={styles.backdrop} onClick={onClose}>
        <div
          className="seed-picker-dialog"
          style={styles.dialogContainer}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.header}>
            <h2 style={styles.title}>🌱 เลือกเมล็ดพันธุ์</h2>
            <button style={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          </div>

          {seeds.length === 0 ? (
            <div style={styles.emptyState}>ไม่มีเมล็ดพันธุ์\nไปซื้อที่ร้านก่อนนะ 🌿</div>
          ) : (
            <div style={styles.seedGrid}>
              {seeds.map((seed) => (
                <div
                  key={seed.itemId}
                  style={styles.seedCard(selected === seed.itemId)}
                  onClick={() => handleSelectSeed(seed.itemId)}
                >
                  <div style={styles.countBadge}>×{seed.count}</div>
                  <div style={styles.seedAbbr}>{getItemAbbr(seed.itemId)}</div>
                  <div style={styles.seedName}>{seed.name}</div>
                </div>
              ))}
            </div>
          )}

          <div style={styles.footer}>
            {selectedSeed && (
              <div style={styles.selectedInfo}>
                เลือก: {selectedSeed.name} ×1
              </div>
            )}
            <div style={styles.buttonRow}>
              <button style={styles.confirmButton} onClick={handleConfirm} disabled={!selected}>
                ปลูก
              </button>
              <button style={styles.cancelButton} onClick={onClose}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
