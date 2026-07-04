import { create } from 'zustand'
import {
  addDoc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { auth } from '../firebase'
import { refs, cols, queries, buildChatId } from '../lib/db'
import { createFirestoreListener } from '../lib/firestoreListener'
import { useUserStore } from './useUserStore'

export { buildChatId }

// Shared listener slots — own the detach-before-reattach lifecycle.
const chatsListener = createFirestoreListener()
const messagesListener = createFirestoreListener()

export const useChatStore = create((set) => ({
  chats: [],       // [{ id, members, lastMessage, lastMessageAt, fireStacks }]
  activeChat: null, // { chatId, otherUser }
  messages: [],    // [{ id, senderId, text, type, giftItem, createdAt }]
  participants: {}, // { [uid]: { displayName, photoURL, ... } } — profile cache

  // Attaches a real-time listener to every chat this user is a member of,
  // sorted by most recent message. Replaces any existing listener.
  // Returns the unsubscribe function for cleanup.
  loadChats: (uid) =>
    chatsListener.attach(queries.chatsByMember(uid), (snap) => {
      const chats = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.lastMessageAt?.toMillis?.() ?? 0
          const tb = b.lastMessageAt?.toMillis?.() ?? 0
          return tb - ta
        })
      set({ chats })
    }),

  // Sets the active chat in state and ensures the chat document exists in
  // Firestore. Only `members` is merged so re-opening never resets fireStacks
  // or lastMessage — those fields are written only by sendMessage.
  openChat: async (chatId, otherUser) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    set({ activeChat: { chatId, otherUser }, messages: [] })
    await setDoc(
      refs.chat(chatId),
      { members: [uid, otherUser.uid].sort() },
      { merge: true },
    )
  },

  // Writes a text message to the messages subcollection and updates chat
  // metadata. fireStacks increments at most once per calendar day per chat —
  // subsequent messages on the same day don't count as a new stack.
  // Admin chats (isAdminChat: true) never grant stacks.
  sendMessage: async (chatId, text) => {
    const uid = auth.currentUser?.uid
    if (!uid || !text.trim()) return
    const trimmed = text.trim()

    await addDoc(cols.chatMessages(chatId), {
      senderId: uid,
      text: trimmed,
      type: 'text',
      giftItem: null,
      createdAt: serverTimestamp(),
    })

    const today = new Date().toISOString().slice(0, 10)
    const chat = useChatStore.getState().chats.find((c) => c.id === chatId)
    const grantStack = chat?.lastStackDate !== today && !chat?.isAdminChat

    await updateDoc(refs.chat(chatId), {
      lastMessage: trimmed,
      lastMessageAt: serverTimestamp(),
      ...(grantStack && { fireStacks: increment(1), lastStackDate: today }),
    })

    if (grantStack) {
      useUserStore.getState().incrementStacks()
    }
  },

  // Shares a news item into a chat. Always grants a fireStack (unlike
  // sendMessage's once-per-day rule) — preserves NewsPanel.ShareSheet's
  // existing behavior exactly; this discrepancy is a known follow-up, not
  // something this extraction should silently fix.
  sendNewsShare: async (chatId, newsItem) => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    await addDoc(cols.chatMessages(chatId), {
      senderId: uid,
      text: `📰 ${newsItem.title}`,
      type: 'news',
      newsItem: { title: newsItem.title, url: newsItem.url, thumbnail: newsItem.poster },
      giftItem: null,
      createdAt: serverTimestamp(),
    })
    await updateDoc(refs.chat(chatId), {
      lastMessage: `📰 ${newsItem.title}`,
      lastMessageAt: serverTimestamp(),
      fireStacks: increment(1),
    })
    useUserStore.getState().incrementStacks()
  },

  // Sends a virtual-gift message and always grants a fireStack (same
  // always-grant behavior as sendNewsShare, not sendMessage's once-per-day
  // rule) — extracted verbatim from ChatPanel.jsx's GiftModal.handleGift.
  // Coin debit/rollback stays in the caller (GiftModal) as optimistic UI.
  sendGift: async (chatId, myUid, gift) => {
    await addDoc(cols.chatMessages(chatId), {
      senderId: myUid,
      text: `${gift.emoji} ${gift.name}`,
      type: 'gift',
      giftItem: { name: gift.name, emoji: gift.emoji, coins: gift.coins },
      createdAt: serverTimestamp(),
    })
    await updateDoc(refs.chat(chatId), {
      lastMessage: `${gift.emoji} ส่งของขวัญ`,
      lastMessageAt: serverTimestamp(),
      fireStacks: increment(1),
    })
    useUserStore.getState().incrementStacks()
  },

  // Attaches a real-time listener to a chat's messages, ordered oldest-first.
  // Replaces any existing messages listener. Returns the unsubscribe function.
  subscribeMessages: (chatId) =>
    messagesListener.attach(queries.messagesByChat(chatId), (snap) => {
      set({ messages: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
    }),

  // Standalone stacks increment — used for gifts/appointments.
  // Same 1-per-day-per-chat rule as sendMessage.
  incrementFireStacks: async (chatId) => {
    const today = new Date().toISOString().slice(0, 10)
    const chat = useChatStore.getState().chats.find((c) => c.id === chatId)
    const grantStack = chat?.lastStackDate !== today
    if (!grantStack) return
    await updateDoc(refs.chat(chatId), {
      fireStacks: increment(1),
      lastStackDate: today,
    })
    useUserStore.getState().incrementStacks()
  },

  // Fetches every not-yet-cached uid in `uids` and merges the results into
  // `participants`. Fire-and-forget style — callers don't need the return
  // value, just the updated cache.
  resolveParticipants: async (uids) => {
    const cache = useChatStore.getState().participants
    const needed = uids.filter((uid) => !cache[uid])
    if (needed.length === 0) return
    const entries = await Promise.all(
      needed.map(async (uid) => {
        const snap = await getDoc(refs.user(uid))
        return snap.exists() ? [uid, snap.data()] : null
      }),
    )
    const fresh = Object.fromEntries(entries.filter(Boolean))
    if (Object.keys(fresh).length === 0) return
    set((s) => ({ participants: { ...s.participants, ...fresh } }))
  },

  // Returns a single participant's profile, from cache if present, otherwise
  // fetches and caches it. Falls back to a placeholder for a missing doc so
  // callers always get a renderable user object.
  getOrFetchParticipant: async (uid) => {
    const cached = useChatStore.getState().participants[uid]
    if (cached) return cached
    const snap = await getDoc(refs.user(uid))
    const data = snap.exists() ? snap.data() : { uid, displayName: 'Unknown', photoURL: null }
    set((s) => ({ participants: { ...s.participants, [uid]: data } }))
    return data
  },
}))
