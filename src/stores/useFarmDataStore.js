import { create } from 'zustand'

export const useFarmDataStore = create((set) => ({
  plants: {},
  items: {},
  shops: {},
  setPlants: (plants) => set({ plants }),
  setItems: (items) => set({ items }),
  setShops: (shops) => set({ shops }),
}))
