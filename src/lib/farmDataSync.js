import { getDocs, doc, setDoc } from 'firebase/firestore'
import { cols } from './db.js'
import { useFarmDataStore } from '../stores/useFarmDataStore.js'
import { PLANTS } from '../data/PlantData.js'
import { ITEMS } from '../data/ItemData.js'
import { SHOPS } from '../data/ShopData.js'

async function seedIfEmpty(col, defaults, snap) {
  if (!snap.empty) return snap
  await Promise.all(
    Object.entries(defaults).map(([id, data]) => setDoc(doc(col, id), data))
  )
  return null // signal: use JS defaults
}

export async function hydrateFarmDataFromFirestore() {
  const [plantsSnap, itemsSnap, shopsSnap] = await Promise.all([
    getDocs(cols.farmPlants),
    getDocs(cols.farmItems),
    getDocs(cols.farmShops),
  ])

  const plantsNull = await seedIfEmpty(cols.farmPlants, PLANTS, plantsSnap)
  const itemsNull  = await seedIfEmpty(cols.farmItems,  ITEMS,  itemsSnap)
  const shopsNull  = await seedIfEmpty(cols.farmShops,  SHOPS,  shopsSnap)

  useFarmDataStore.getState().setPlants(
    plantsNull === null ? PLANTS : Object.fromEntries(plantsSnap.docs.map(d => [d.id, d.data()]))
  )
  useFarmDataStore.getState().setItems(
    itemsNull === null ? ITEMS : Object.fromEntries(itemsSnap.docs.map(d => [d.id, d.data()]))
  )
  useFarmDataStore.getState().setShops(
    shopsNull === null ? SHOPS : Object.fromEntries(shopsSnap.docs.map(d => [d.id, d.data()]))
  )
}
