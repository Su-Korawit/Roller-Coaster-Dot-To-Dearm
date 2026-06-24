export const PLANTS = {
  turnip: {
    id: 'turnip',
    name: 'หัวผักกาด',
    seedKey: 'turnip_seed',
    stages: 4,
    growTime: [15, 30, 60],
    size: { w: 1, h: 1 },
    yieldMin: 1,
    yieldMax: 3,
  },
  carrot: {
    id: 'carrot',
    name: 'แครอท',
    seedKey: 'carrot_seed',
    stages: 4,
    growTime: [20, 40, 80],
    size: { w: 1, h: 1 },
    yieldMin: 1,
    yieldMax: 2,
  },
  potato: {
    id: 'potato',
    name: 'มันฝรั่ง',
    seedKey: 'potato_seed',
    stages: 4,
    growTime: [25, 50, 100],
    size: { w: 1, h: 1 },
    yieldMin: 2,
    yieldMax: 4,
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'ฟักทอง',
    seedKey: 'pumpkin_seed',
    stages: 4,
    growTime: [40, 80, 160],
    size: { w: 2, h: 2 },
    yieldMin: 1,
    yieldMax: 1,
  },
}

export const getPlant = (id) => PLANTS[id] ?? null
export const getAllPlants = () => Object.values(PLANTS)
