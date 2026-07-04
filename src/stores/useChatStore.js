import { create } from 'zustand'
import {
  addDoc,
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
}))
