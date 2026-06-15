import { create } from 'zustand'
import {
  addDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { auth } from '../firebase'
import { refs, cols, queries, buildChatId } from '../lib/db'
import { useUserStore } from './useUserStore'

export { buildChatId }

// Module-level unsub refs — same pattern as useSocialStore.
// Kept outside Zustand state so replacing them doesn't trigger re-renders.
let _chatsUnsub = null
let _messagesUnsub = null

export const useChatStore = create((set) => ({
  chats: [],       // [{ id, members, lastMessage, lastMessageAt, fireStacks }]
  activeChat: null, // { chatId, otherUser }
  messages: [],    // [{ id, senderId, text, type, giftItem, createdAt }]

  // Attaches a real-time listener to every chat this user is a member of,
  // sorted by most recent message. Replaces any existing listener.
  // Returns the unsubscribe function for cleanup.
  loadChats: (uid) => {
    if (_chatsUnsub) { _chatsUnsub(); _chatsUnsub = null }
    _chatsUnsub = onSnapshot(queries.chatsByMember(uid), (snap) => {
      const chats = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.lastMessageAt?.toMillis?.() ?? 0
          const tb = b.lastMessageAt?.toMillis?.() ?? 0
          return tb - ta
        })
      set({ chats })
    })
    return _chatsUnsub
  },

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

  // Attaches a real-time listener to a chat's messages, ordered oldest-first.
  // Replaces any existing messages listener. Returns the unsubscribe function.
  subscribeMessages: (chatId) => {
    if (_messagesUnsub) { _messagesUnsub(); _messagesUnsub = null }
    _messagesUnsub = onSnapshot(queries.messagesByChat(chatId), (snap) => {
      set({ messages: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
    })
    return _messagesUnsub
  },

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
