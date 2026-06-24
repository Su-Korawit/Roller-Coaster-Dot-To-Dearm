import { ITEMS } from '../data/ItemData.js'

export class InventorySystem {
  constructor() {
    this.hotbar = Array(8).fill(null)
    this.storage = Array(30).fill(null)
    this.gold = 100
  }

  addItem(itemId, count = 1) {
    const item = ITEMS[itemId]
    if (!item) return false

    const stackMax = item.stackMax
    let remaining = count

    // Try to stack in hotbar first
    for (let i = 0; i < this.hotbar.length; i++) {
      const slot = this.hotbar[i]
      if (slot && slot.itemId === itemId) {
        const canAdd = stackMax - slot.count
        if (canAdd > 0) {
          const toAdd = Math.min(remaining, canAdd)
          slot.count += toAdd
          remaining -= toAdd
          if (remaining === 0) return true
        }
      }
    }

    // Fill empty hotbar slots
    for (let i = 0; i < this.hotbar.length; i++) {
      if (this.hotbar[i] === null) {
        const toAdd = Math.min(remaining, stackMax)
        this.hotbar[i] = { itemId, count: toAdd }
        remaining -= toAdd
        if (remaining === 0) return true
      }
    }

    // Try to stack in storage
    for (let i = 0; i < this.storage.length; i++) {
      const slot = this.storage[i]
      if (slot && slot.itemId === itemId) {
        const canAdd = stackMax - slot.count
        if (canAdd > 0) {
          const toAdd = Math.min(remaining, canAdd)
          slot.count += toAdd
          remaining -= toAdd
          if (remaining === 0) return true
        }
      }
    }

    // Fill empty storage slots
    for (let i = 0; i < this.storage.length; i++) {
      if (this.storage[i] === null) {
        const toAdd = Math.min(remaining, stackMax)
        this.storage[i] = { itemId, count: toAdd }
        remaining -= toAdd
        if (remaining === 0) return true
      }
    }

    return remaining === 0
  }

  removeItem(itemId, count = 1) {
    if (!this.hasItem(itemId, count)) return false

    let remaining = count

    // Remove from hotbar first
    for (let i = 0; i < this.hotbar.length; i++) {
      const slot = this.hotbar[i]
      if (slot && slot.itemId === itemId) {
        const toRemove = Math.min(remaining, slot.count)
        slot.count -= toRemove
        remaining -= toRemove
        if (slot.count === 0) this.hotbar[i] = null
        if (remaining === 0) return true
      }
    }

    // Remove from storage
    for (let i = 0; i < this.storage.length; i++) {
      const slot = this.storage[i]
      if (slot && slot.itemId === itemId) {
        const toRemove = Math.min(remaining, slot.count)
        slot.count -= toRemove
        remaining -= toRemove
        if (slot.count === 0) this.storage[i] = null
        if (remaining === 0) return true
      }
    }

    return remaining === 0
  }

  hasItem(itemId, count = 1) {
    return this.countItem(itemId) >= count
  }

  countItem(itemId) {
    let total = 0

    for (const slot of this.hotbar) {
      if (slot && slot.itemId === itemId) total += slot.count
    }

    for (const slot of this.storage) {
      if (slot && slot.itemId === itemId) total += slot.count
    }

    return total
  }

  getSeedList() {
    const seedMap = new Map()

    const collectSeeds = (slots) => {
      for (const slot of slots) {
        if (slot && ITEMS[slot.itemId]?.type === 'seed') {
          const itemId = slot.itemId
          const item = ITEMS[itemId]
          if (seedMap.has(itemId)) {
            const entry = seedMap.get(itemId)
            entry.count += slot.count
          } else {
            seedMap.set(itemId, {
              itemId,
              count: slot.count,
              name: item.name,
              iconIndex: item.iconIndex,
            })
          }
        }
      }
    }

    collectSeeds(this.hotbar)
    collectSeeds(this.storage)

    return Array.from(seedMap.values())
  }

  getProduceList() {
    const produceMap = new Map()

    const collectProduce = (slots) => {
      for (const slot of slots) {
        if (slot && ITEMS[slot.itemId]?.type === 'produce') {
          const itemId = slot.itemId
          const item = ITEMS[itemId]
          if (produceMap.has(itemId)) {
            const entry = produceMap.get(itemId)
            entry.count += slot.count
          } else {
            produceMap.set(itemId, {
              itemId,
              count: slot.count,
              name: item.name,
              sellPrice: item.sellPrice,
              iconIndex: item.iconIndex,
            })
          }
        }
      }
    }

    collectProduce(this.hotbar)
    collectProduce(this.storage)

    return Array.from(produceMap.values())
  }

  addGold(amount) {
    this.gold += amount
  }

  removeGold(amount) {
    if (this.gold < amount) return false
    this.gold -= amount
    return true
  }

  hasGold(amount) {
    return this.gold >= amount
  }

  getHotbarSlots() {
    return this.hotbar
  }

  getStorageSlots() {
    return this.storage
  }

  toJSON() {
    return {
      hotbar: this.hotbar,
      storage: this.storage,
      gold: this.gold,
    }
  }

  fromJSON(data) {
    if (data.hotbar && Array.isArray(data.hotbar)) {
      this.hotbar = data.hotbar.length === 8 ? data.hotbar : Array(8).fill(null)
    }
    if (data.storage && Array.isArray(data.storage)) {
      this.storage = data.storage.length === 30 ? data.storage : Array(30).fill(null)
    }
    if (typeof data.gold === 'number') {
      this.gold = data.gold
    }
  }
}

export const createInventory = () => new InventorySystem()
