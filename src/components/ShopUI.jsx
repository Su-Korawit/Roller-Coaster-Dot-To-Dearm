import React, { useState, useEffect } from 'react'
import { getItemAbbr } from '../utils/itemHelpers'

const TYPE_COLORS = {
  buy: { btn: '#a8e6a3', border: '#3d8b3d' },
  sell: { btn: '#f5c542', border: '#8b7d3d' },
  sellAll: { btn: '#f5a050', border: '#8b5a20' },
}

function QuantitySelector({ value, min = 1, max = 99, onChange }) {
  const styles = {
    wrapper: { display: 'flex', alignItems: 'center', gap: 4 },
    btn: {
      width: 22,
      height: 22,
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
    count: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 12,
      fontWeight: 'bold',
      color: '#3d2b1f',
      minWidth: 24,
      textAlign: 'center',
    },
  }
  return (
    <div style={styles.wrapper}>
      <button style={styles.btn} onClick={() => onChange(Math.max(min, value - 1))}>-</button>
      <span style={styles.count}>{value}</span>
      <button style={styles.btn} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  )
}

export function ShopUI({
  isOpen = false,
  shop = null,
  stockList = [],
  produceList = [],
  gold = 0,
  onBuy = () => ({}),
  onSell = () => ({}),
  onSellAll = () => ({}),
  onClose = () => {},
}) {
  const [activeTab, setActiveTab] = useState('buy')
  const [buyQuantities, setBuyQuantities] = useState({})
  const [notification, setNotification] = useState(null)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const dialogWidth = isMobile ? 320 : 400
  const dialogHeight = isMobile ? 400 : 480

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('buy')
      setBuyQuantities({})
      setNotification(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 1500)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const getQty = (itemId) => buyQuantities[itemId] ?? 1
  const setQty = (itemId, v) => setBuyQuantities(prev => ({ ...prev, [itemId]: v }))

  const handleBuy = (item) => {
    const qty = getQty(item.itemId)
    const result = onBuy(item.itemId, qty)
    if (result?.success) {
      setNotification({ type: 'success', message: `ซื้อ ${item.name} x${qty} แล้ว!` })
    } else {
      setNotification({ type: 'error', message: result?.reason ?? 'เกิดข้อผิดพลาด' })
    }
  }

  const handleSell = (item, count) => {
    const result = onSell(item.itemId, count)
    if (result?.success) {
      setNotification({ type: 'success', message: `ขาย ${item.name} x${count} (+${result.goldEarned}g)` })
    } else {
      setNotification({ type: 'error', message: result?.reason ?? 'เกิดข้อผิดพลาด' })
    }
  }

  const handleSellAll = () => {
    const result = onSellAll()
    if (result?.success) {
      setNotification({ type: 'success', message: `ขายได้ ${result.totalEarned}g!` })
    } else {
      setNotification({ type: 'error', message: result?.reason ?? 'ไม่มีของขาย' })
    }
  }

  const totalProduceValue = produceList.reduce((sum, p) => sum + p.count * p.sellPrice, 0)

  const styles = {
    backdrop: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: isOpen ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
      pointerEvents: 'auto',
    },
    dialog: {
      position: 'relative',
      width: dialogWidth,
      maxHeight: dialogHeight,
      backgroundColor: '#f0d9a0',
      border: '4px solid #3d2b1f',
      backgroundImage: 'url(/assets/ui/Sprite\\ sheets/Dialouge\\ UI/dialog\\ box/Medium_Dialog_Box.png)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      animation: isOpen ? 'popIn 0.2s ease' : 'none',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    titleBlock: { display: 'flex', flexDirection: 'column', gap: 2 },
    title: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 15,
      fontWeight: 'bold',
      color: '#3d2b1f',
      margin: 0,
    },
    gold: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 12,
      color: '#f5c542',
      fontWeight: 'bold',
      textShadow: '1px 1px 0 rgba(0,0,0,0.3)',
    },
    closeBtn: {
      width: 24, height: 24,
      backgroundColor: '#c8a96e',
      border: '2px solid #3d2b1f',
      color: '#3d2b1f',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 13,
      fontWeight: 'bold',
      cursor: 'pointer',
      padding: 0,
      lineHeight: 1,
    },
    tabs: { display: 'flex', gap: 0 },
    tab: (active) => ({
      flex: 1,
      padding: '6px 0',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 12,
      fontWeight: 'bold',
      color: '#3d2b1f',
      backgroundColor: active ? '#c8a96e' : '#e8c98e',
      border: '2px solid #3d2b1f',
      borderBottom: active ? '2px solid #c8a96e' : '2px solid #3d2b1f',
      cursor: 'pointer',
      textAlign: 'center',
    }),
    content: {
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: 4,
      maxHeight: dialogHeight - 160,
    },
    itemRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.3)',
      border: '1px solid #8b6343',
      padding: '6px 8px',
    },
    itemAbbr: {
      width: 32,
      height: 32,
      backgroundColor: '#c8a96e',
      border: '2px solid #3d2b1f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 12,
      fontWeight: 'bold',
      flexShrink: 0,
    },
    itemInfo: { flex: 1 },
    itemName: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 11,
      fontWeight: 'bold',
      color: '#3d2b1f',
      lineHeight: 1.2,
    },
    itemSub: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 9,
      color: '#8b6343',
      lineHeight: 1.2,
    },
    actionArea: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
    },
    actionBtn: (color, border, disabled) => ({
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 10,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: disabled ? '#aaa' : color,
      border: `2px solid ${disabled ? '#888' : border}`,
      padding: '4px 8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      whiteSpace: 'nowrap',
    }),
    sellAllBtn: {
      width: '100%',
      padding: '8px 0',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 12,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: produceList.length === 0 ? '#aaa' : TYPE_COLORS.sellAll.btn,
      border: `2px solid ${produceList.length === 0 ? '#888' : TYPE_COLORS.sellAll.border}`,
      cursor: produceList.length === 0 ? 'not-allowed' : 'pointer',
      marginTop: 4,
    },
    emptyMsg: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 11,
      color: '#8b6343',
      textAlign: 'center',
      padding: '20px 0',
      lineHeight: 1.5,
    },
    notification: (type) => ({
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '5px 12px',
      backgroundColor: type === 'success' ? '#a8e6a3' : '#f5a3a3',
      border: '2px solid #3d2b1f',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: 10,
      fontWeight: 'bold',
      color: '#3d2b1f',
      whiteSpace: 'nowrap',
      zIndex: 10,
    }),
  }

  return (
    <>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .shop-content::-webkit-scrollbar { width: 4px; }
        .shop-content::-webkit-scrollbar-thumb { background: #3d2b1f; }
        .shop-content::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div style={styles.backdrop} onClick={onClose}>
        <div style={styles.dialog} onClick={e => e.stopPropagation()}>
          {notification && (
            <div style={styles.notification(notification.type)}>{notification.message}</div>
          )}

          <div style={styles.header}>
            <div style={styles.titleBlock}>
              <h2 style={styles.title}>🏪 {shop?.name ?? 'ร้านค้า'}</h2>
              <div style={styles.gold}>💰 {gold}g</div>
            </div>
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>

          <div style={styles.tabs}>
            <button style={styles.tab(activeTab === 'buy')} onClick={() => setActiveTab('buy')}>ซื้อ</button>
            <button style={styles.tab(activeTab === 'sell')} onClick={() => setActiveTab('sell')}>ขาย</button>
          </div>

          <div className="shop-content" style={styles.content}>
            {activeTab === 'buy' && stockList.map(item => {
              const qty = getQty(item.itemId)
              const total = item.price * qty
              const canAfford = gold >= total
              const maxAffordable = Math.max(1, Math.floor(gold / item.price))
              return (
                <div key={item.itemId} style={styles.itemRow}>
                  <div style={styles.itemAbbr}>{getItemAbbr(item.itemId)}</div>
                  <div style={styles.itemInfo}>
                    <div style={styles.itemName}>{item.name}</div>
                    <div style={styles.itemSub}>ราคา: {item.price}g × {qty} = {total}g | มี: {item.playerCount}</div>
                  </div>
                  <div style={styles.actionArea}>
                    <QuantitySelector
                      value={qty}
                      min={1}
                      max={Math.min(99, maxAffordable)}
                      onChange={(v) => setQty(item.itemId, v)}
                    />
                    <button
                      style={styles.actionBtn(TYPE_COLORS.buy.btn, TYPE_COLORS.buy.border, !canAfford)}
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford}
                    >
                      ซื้อ
                    </button>
                  </div>
                </div>
              )
            })}

            {activeTab === 'sell' && (
              <>
                {produceList.length === 0 ? (
                  <div style={styles.emptyMsg}>ไม่มีของขาย{'\n'}ไปเก็บผลผลิตก่อนนะ 🌾</div>
                ) : (
                  produceList.map(item => (
                    <div key={item.itemId} style={styles.itemRow}>
                      <div style={styles.itemAbbr}>{getItemAbbr(item.itemId)}</div>
                      <div style={styles.itemInfo}>
                        <div style={styles.itemName}>{item.name} ×{item.count}</div>
                        <div style={styles.itemSub}>ราคา: {item.sellPrice}g/ชิ้น | รวม: {item.count * item.sellPrice}g</div>
                      </div>
                      <div style={styles.actionArea}>
                        <button
                          style={styles.actionBtn(TYPE_COLORS.sell.btn, TYPE_COLORS.sell.border, false)}
                          onClick={() => handleSell(item, 1)}
                        >
                          ขาย 1
                        </button>
                        <button
                          style={styles.actionBtn(TYPE_COLORS.sell.btn, TYPE_COLORS.sell.border, false)}
                          onClick={() => handleSell(item, item.count)}
                        >
                          ทั้งหมด
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button style={styles.sellAllBtn} onClick={handleSellAll} disabled={produceList.length === 0}>
                  💰 ขายทั้งหมดเลย — {totalProduceValue}g
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
