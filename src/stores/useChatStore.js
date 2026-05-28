import { create } from 'zustand'
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useUserStore } from './useUserStore'

// Canonical 1-to-1 chat id — sorted so both parties derive the same key
// regardless of who initiates. Export so callers can compute it before openChat.
export function buildChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_')
}

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
    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', uid),
    )
    _chatsUnsub = onSnapshot(q, (snap) => {
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
  // Firestore (merge:true preserves existing data on re-open).
  openChat: async (chatId, otherUser) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    set({ activeChat: { chatId, otherUser }, messages: [] })
    await setDoc(
      doc(db, 'chats', chatId),
      {
        members: [uid, otherUser.uid].sort(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        fireStacks: 0,
      },
      { merge: true },
    )
  },

  // Writes a text message to the messages subcollection, updates chat metadata,
  // and increments fireStacks + useUserStore.totalStacks in one Firestore write.
  sendMessage: async (chatId, text) => {
    const uid = auth.currentUser?.uid
    if (!uid || !text.trim()) return
    const trimmed = text.trim()

    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: uid,
      text: trimmed,
      type: 'text',
      giftItem: null,
      createdAt: serverTimestamp(),
    })

    // Merge lastMessage update + fireStacks increment in a single write
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: trimmed,
      lastMessageAt: serverTimestamp(),
      fireStacks: increment(1),
    })

    // Mirror to local stacks store (persisted in localStorage via rc-user-store)
    useUserStore.getState().incrementStacks()
  },

  // Attaches a real-time listener to a chat's messages, ordered oldest-first.
  // Replaces any existing messages listener. Returns the unsubscribe function.
  subscribeMessages: (chatId) => {
    if (_messagesUnsub) { _messagesUnsub(); _messagesUnsub = null }
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
    )
    _messagesUnsub = onSnapshot(q, (snap) => {
      set({ messages: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
    })
    return _messagesUnsub
  },

  // Standalone stacks increment — used for gifts, appointments, or any
  // non-text message type that should also count as a stack.
  incrementFireStacks: async (chatId) => {
    await updateDoc(doc(db, 'chats', chatId), { fireStacks: increment(1) })
    useUserStore.getState().incrementStacks()
  },
}))
