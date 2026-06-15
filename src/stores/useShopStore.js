import { create } from 'zustand'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { ref as storageRef, uploadBytes } from 'firebase/storage'
import { auth, db, functions, storage } from '../firebase'

// Module-level unsub refs — same pattern as useChatStore. Kept outside Zustand
// state so replacing them doesn't trigger re-renders.
let _productsUnsub = null
let _purchasesUnsub = null

export const useShopStore = create((set, get) => ({
  products: [],   // active catalogue, sorted by `order`
  purchases: [],  // this user's purchases, live status from the server

  // Live active catalogue. Sorted client-side so we don't need a composite index.
  loadProducts: () => {
    if (_productsUnsub) { _productsUnsub(); _productsUnsub = null }
    const q = query(collection(db, 'shopProducts'), where('active', '==', true))
    _productsUnsub = onSnapshot(q, (snap) => {
      const products = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      set({ products })
    })
    return _productsUnsub
  },

  // Live view of the signed-in user's purchases so payment cards reflect the
  // server-written status (WAITING_PAYMENT → VERIFYING → SUCCESS/FAILED/EXPIRED).
  loadPurchases: (uid) => {
    if (_purchasesUnsub) { _purchasesUnsub(); _purchasesUnsub = null }
    const q = query(collection(db, 'purchases'), where('uid', '==', uid))
    _purchasesUnsub = onSnapshot(q, (snap) => {
      set({ purchases: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
    })
    return _purchasesUnsub
  },

  getPurchase: (id) => get().purchases.find((p) => p.id === id),

  // Server sets the authoritative amount + coins from the catalogue.
  createPurchase: async (productId) => {
    const fn = httpsCallable(functions, 'createPurchase')
    const res = await fn({ productId })
    return res.data // { purchaseId, amount, coins, expiresAt }
  },

  // Upload the slip, then let the server verify it and credit coins.
  verifyPayment: async (purchaseId, file) => {
    const uid = auth.currentUser?.uid
    if (!uid) throw new Error('not signed in')
    await uploadBytes(storageRef(storage, `slips/${uid}/${purchaseId}`), file)
    const fn = httpsCallable(functions, 'verifyPayment')
    const res = await fn({ purchaseId })
    return res.data // { ok, reason?, coins? }
  },
}))
