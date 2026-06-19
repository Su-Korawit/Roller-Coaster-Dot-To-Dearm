import { useWorldStore } from '../stores/useWorldStore'
import { useAuthStore } from '../stores/useAuthStore'
import { MAP_ITEMS } from '../constants/mapItems'
import { syncMapToFirestore } from '../lib/syncManager'

export default function MapPalette() {
  const user = useAuthStore((s) => s.user)
  const currentMapOwnerUid = useWorldStore((s) => s.currentMapOwnerUid)
  const editMode           = useWorldStore((s) => s.editMode)
  const selectedItemKey    = useWorldStore((s) => s.selectedItemKey)
  const toggleEditMode     = useWorldStore((s) => s.toggleEditMode)
  const setSelectedItem    = useWorldStore((s) => s.setSelectedItem)
  const mapObjects         = useWorldStore((s) => s.mapObjects)

  // Only the map owner sees the palette
  if (!user || currentMapOwnerUid !== user.uid) return null

  async function handleSave() {
    await syncMapToFirestore(user.uid, mapObjects)
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 56,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'auto',
      }}
    >
      {editMode && (
        <>
          {/* Palette items */}
          <div style={{ display: 'flex', gap: 8 }}>
            {MAP_ITEMS.map((item) => {
              const active = selectedItemKey === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedItem(active ? null : item.key)}
                  style={{
                    background: active ? '#a78bda' : 'rgba(26,16,53,0.85)',
                    border: active ? '2px solid #fff' : '2px solid rgba(167,139,218,0.5)',
                    borderRadius: 10,
                    color: '#fff',
                    padding: '6px 14px',
                    fontSize: 12,
                    fontFamily: 'Noto Sans Thai, sans-serif',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                    transition: 'background 0.15s',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            style={{
              background: 'linear-gradient(135deg, #a78bda, #7c3aed)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              padding: '7px 28px',
              fontSize: 13,
              fontFamily: 'Noto Sans Thai, sans-serif',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
            }}
          >
            บันทึก
          </button>
        </>
      )}

      {/* Toggle edit mode button */}
      <button
        onClick={() => {
          if (editMode) setSelectedItem(null)
          toggleEditMode()
        }}
        style={{
          background: editMode
            ? 'linear-gradient(135deg, #7c3aed, #a78bda)'
            : 'rgba(26,16,53,0.80)',
          border: editMode ? '2px solid #fff' : '2px solid rgba(167,139,218,0.5)',
          borderRadius: 20,
          color: '#fff',
          padding: '7px 20px',
          fontSize: 13,
          fontFamily: 'Noto Sans Thai, sans-serif',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
        }}
      >
        {editMode ? '✓ เสร็จแล้ว' : '✏️ ตกแต่งแมพ'}
      </button>
    </div>
  )
}
