import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

// กันเคส env หายเงียบ (เช่น แก้ .env แล้วลืม restart dev server) ซึ่งทำให้
// auth ล้มทันทีแบบหา code ไม่เจอ — log ชื่อคีย์ที่ขาดให้เห็นชัดตั้งแต่ตอนโหลด
// databaseURL is required now that live presence (RTDB) is a real consumer — a
// missing/blank URL fails silently with an opaque "configure your DB URL" warning
// at the first joinWorld(), so surface it loudly at load like the auth keys.
const missingEnv = ['apiKey', 'authDomain', 'projectId', 'databaseURL'].filter((k) => !firebaseConfig[k])
if (missingEnv.length) {
  console.error('[firebase] missing config keys:', missingEnv.join(', '), '— ตรวจ .env แล้ว restart dev server')
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const rtdb = getDatabase(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)
