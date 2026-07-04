import { create } from 'zustand'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../firebase'
import { cols, queries } from '../lib/db'
import { createFirestoreListener } from '../lib/firestoreListener'
import { uploadAsset } from '../utils/storageOps'

// Shared listener slots — own the detach-before-reattach lifecycle.
const productsListener = createFirestoreListener()
const purchasesListener = createFirestoreListener()

export const useShopStore = create((set, get) => ({
  products: [],   // active catalogue, sorted by `order`
  purchases: [],  // this user's purchases, live status from the server

  // Live active catalogue. Sorted client-side so we don't need a composite index.
  loadProducts: () =>
    productsListener.attach(queries.activeProducts(), (snap) => {
      const products = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      set({ products })
    }),

  // Live view of the signed-in user's purchases so payment cards reflect the
  // server-written status (WAITING_PAYMENT → VERIFYING → SUCCESS/FAILED/EXPIRED).
  loadPurchases: (uid) =>
    purchasesListener.attach(queries.purchasesByUser(uid), (snap) => {
      set({ purchases: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
    }),

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
    await uploadAsset(`slips/${uid}/${purchaseId}`, file)
    const fn = httpsCallable(functions, 'verifyPayment')
    const res = await fn({ purchaseId })
    return res.data // { ok, reason?, coins? }
  },
}))
