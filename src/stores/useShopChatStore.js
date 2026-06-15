import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Cosmetic shop-chat log (AI text, payment cards, system notes). Persisted to
// localStorage like the rest of the app's client state — no money depends on it;
// the authoritative purchase record lives in Firestore (purchases collection).
const base = () => ({ id: crypto.randomUUID(), createdAt: Date.now() })

export const useShopChatStore = create(
  persist(
    (set, get) => ({
      messages: [],

      addText: (role, text) => {
        const msg = { ...base(), type: 'text', role, text }
        set({ messages: [...get().messages, msg] })
        return msg.id
      },

      addPaymentCard: (purchaseId) => {
        const msg = { ...base(), type: 'payment_card', purchaseId }
        set({ messages: [...get().messages, msg] })
        return msg.id
      },

      addSystemMessage: (tone, text) => {
        const msg = { ...base(), type: 'system_message', tone, text }
        set({ messages: [...get().messages, msg] })
        return msg.id
      },

      reset: () => set({ messages: [] }),
    }),
    { name: 'rc-shop-chat' },
  ),
)
