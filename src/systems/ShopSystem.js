import { SHOPS, getShopByTrigger } from '../data/ShopData.js'
import { ITEMS, getItem } from '../data/ItemData.js'

export class ShopSystem {
  constructor(inventorySystem) {
    this.inventory = inventorySystem
    this.currentShopId = null
  }

  openShop(shopId) {
    this.currentShopId = shopId
    return SHOPS[shopId] ?? null
  }

  openShopByTrigger(triggerName) {
    const shop = getShopByTrigger(triggerName)
    if (shop) {
      this.currentShopId = shop.id
    }
    return shop
  }

  closeShop() {
    this.currentShopId = null
  }

  buy(itemId, count = 1) {
    if (!this.currentShopId) {
      return { success: false, reason: 'ไม่ได้เปิดร้าน' }
    }

    const shop = SHOPS[this.currentShopId]
    const listing = shop.sells.find(s => s.itemId === itemId)

    if (!listing) {
      return { success: false, reason: 'ไม่มีสินค้านี้' }
    }

    const total = listing.price * count

    if (!this.inventory.hasGold(total)) {
      return {
        success: false,
        reason: 'เงินไม่พอ',
        need: total,
        have: this.inventory.gold,
      }
    }

    this.inventory.removeGold(total)

    const addSuccess = this.inventory.addItem(itemId, count)
    if (!addSuccess) {
      this.inventory.addGold(total)
      return { success: false, reason: 'inventory เต็ม' }
    }

    return { success: true, goldSpent: total, newGold: this.inventory.gold }
  }

  sell(itemId, count = 1) {
    const item = getItem(itemId)

    if (!item || item.type !== 'produce') {
      return { success: false, reason: 'ขายสินค้านี้ไม่ได้' }
    }

    if (!this.inventory.hasItem(itemId, count)) {
      return {
        success: false,
        reason: 'ของไม่พอ',
        have: this.inventory.countItem(itemId),
      }
    }

    this.inventory.removeItem(itemId, count)
    const earned = item.sellPrice * count
    this.inventory.addGold(earned)

    return { success: true, goldEarned: earned, newGold: this.inventory.gold }
  }

  sellAll() {
    const produceList = this.inventory.getProduceList()

    if (produceList.length === 0) {
      return { success: false, reason: 'ไม่มีของขาย' }
    }

    let totalEarned = 0
    const soldItems = []

    for (const produce of produceList) {
      const item = getItem(produce.itemId)
      const earned = item.sellPrice * produce.count
      this.inventory.removeItem(produce.itemId, produce.count)
      totalEarned += earned

      soldItems.push({
        itemId: produce.itemId,
        count: produce.count,
        earned,
      })
    }

    this.inventory.addGold(totalEarned)

    return { success: true, totalEarned, soldItems }
  }

  getShopStock(shopId) {
    const shop = SHOPS[shopId]
    if (!shop) return []

    return shop.sells.map(listing => {
      const item = getItem(listing.itemId)
      return {
        itemId: listing.itemId,
        name: item.name,
        price: listing.price,
        iconIndex: item.iconIndex,
        playerCount: this.inventory.countItem(listing.itemId),
      }
    })
  }

  getCurrentShop() {
    return SHOPS[this.currentShopId] ?? null
  }

  isOpen() {
    return this.currentShopId !== null
  }
}

export const createShop = (inventorySystem) => new ShopSystem(inventorySystem)
