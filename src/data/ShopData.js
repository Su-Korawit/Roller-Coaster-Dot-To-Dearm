export const SHOPS = {
  seed_shop: {
    id: 'seed_shop',
    name: 'ร้านเมล็ดพันธุ์',
    triggerName: 'shop_seed',
    sells: [
      { itemId: 'rice_seed',   price: 5 },
      { itemId: 'tomato_seed', price: 8 },
    ],
    buysType: 'produce',
  },
}

export const getShop = (id) => SHOPS[id] ?? null
export const getShopByTrigger = (triggerName) =>
  Object.values(SHOPS).find(s => s.triggerName === triggerName) ?? null
