import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useFarmDataStore } from '../stores/useFarmDataStore.js'
import { PLANTS } from '../data/PlantData.js'
import { ITEMS } from '../data/ItemData.js'
import { SHOPS } from '../data/ShopData.js'

async function seedIfEmpty(colName, defaults, snap) {
  if (!snap.empty) return snap
  await Promise.all(
    Object.entries(defaults).map(([id, data]) => setDoc(doc(collection(db, colName), id), data))
  )
  return null // signal: use JS defaults
}

export async function hydrateFarmDataFromFirestore() {
  const [plantsSnap, itemsSnap, shopsSnap] = await Promise.all([
    getDocs(collection(db, 'farmPlants')),
    getDocs(collection(db, 'farmItems')),
    getDocs(collection(db, 'farmShops')),
  ])

  const plantsNull = await seedIfEmpty('farmPlants', PLANTS, plantsSnap)
  const itemsNull  = await seedIfEmpty('farmItems',  ITEMS,  itemsSnap)
  const shopsNull  = await seedIfEmpty('farmShops',  SHOPS,  shopsSnap)

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
