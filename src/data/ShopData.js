export const SHOPS = {
  seed_shop: {
    id: 'seed_shop',
    name: 'ร้านเมล็ดพันธุ์',
    triggerName: 'shop_seed',
    sells: [
      { itemId: 'turnip_seed',  price: 5  },
      { itemId: 'carrot_seed',  price: 8  },
      { itemId: 'potato_seed',  price: 6  },
      { itemId: 'pumpkin_seed', price: 20 },
    ],
    buysType: 'produce',
  },
}

export const getShop = (id) => SHOPS[id] ?? null
export const getShopByTrigger = (triggerName) =>
  Object.values(SHOPS).find(s => s.triggerName === triggerName) ?? null
