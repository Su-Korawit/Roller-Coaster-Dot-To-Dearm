export const PLANTS = {
  rice: {
    id: 'rice',
    name: 'ข้าว',
    seedKey: 'rice_seed',
    stages: 4,
    growTime: [15, 30, 60],
    size: { w: 1, h: 1 },
    yieldMin: 1,
    yieldMax: 3,
    spriteFrames: [1, 2, 3, 4],
  },
  tomato: {
    id: 'tomato',
    name: 'มะเขือเทศ',
    seedKey: 'tomato_seed',
    stages: 4,
    growTime: [20, 40, 80],
    size: { w: 1, h: 1 },
    yieldMin: 1,
    yieldMax: 2,
    spriteFrames: [7, 8, 9, 10],
  },
}

export const getPlant = (id) => PLANTS[id] ?? null
export const getAllPlants = () => Object.values(PLANTS)
