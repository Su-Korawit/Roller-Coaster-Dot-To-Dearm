export const ITEMS = {
  rice_seed: {
    id: 'rice_seed',
    name: 'เมล็ดข้าว',
    type: 'seed',
    plantId: 'rice',
    buyPrice: 5,
    sellPrice: 2,
    stackMax: 99,
    iconIndex: 0,
  },
  tomato_seed: {
    id: 'tomato_seed',
    name: 'เมล็ดมะเขือเทศ',
    type: 'seed',
    plantId: 'tomato',
    buyPrice: 8,
    sellPrice: 3,
    stackMax: 99,
    iconIndex: 6,
  },
  rice: {
    id: 'rice',
    name: 'ข้าว',
    type: 'produce',
    buyPrice: null,
    sellPrice: 10,
    stackMax: 99,
    iconIndex: 5,
  },
  tomato: {
    id: 'tomato',
    name: 'มะเขือเทศ',
    type: 'produce',
    buyPrice: null,
    sellPrice: 15,
    stackMax: 99,
    iconIndex: 11,
  },
}

export const getItem = (id) => ITEMS[id] ?? null
export const getSeedItems = () => Object.values(ITEMS).filter(i => i.type === 'seed')
export const getProduceItems = () => Object.values(ITEMS).filter(i => i.type === 'produce')
