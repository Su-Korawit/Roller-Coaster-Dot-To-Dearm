// ============================================================================
// firestoreListener.js — ตัวจัดการ lifecycle ของ onSnapshot listener ที่ใช้ร่วมกัน
// ----------------------------------------------------------------------------
// สรุปการเปลี่ยนแปลง (Candidate 2 — Firestore listener lifecycle):
//   เดิม: useChatStore / useShopStore / useSocialStore ต่างถือ unsub ref ระดับ
//         module เอง (รวม 5 ตัว) แล้วเขียน logic "detach ตัวเก่าก่อน attach ตัวใหม่"
//         ซ้ำกันคนละสำเนาในทุก load*() — เป็นคู่แฝดฝั่ง read ของ SyncManager
//   ใหม่: รวม lifecycle ไว้ใน createFirestoreListener() ที่เดียว — แต่ละ store
//         สร้าง instance ต่อ listener แล้วเรียก attach()/detach()
//   หมายเหตุ: คงพฤติกรรมเดิมทุกอย่าง (attach แทนที่ของเดิม, คืน unsub) — detach()
//         มีไว้ให้ใช้ (เช่น cleanup ตอน logout) แต่ยังไม่ wire เพื่อไม่เปลี่ยน behavior
// ============================================================================
import { onSnapshot } from 'firebase/firestore'

/**
 * One Firestore onSnapshot listener slot. Holds the unsubscribe handle and
 * guarantees the previous subscription is torn down before a new one attaches.
 *
 * @returns {{ attach(query, handler): () => void, detach(): void }}
 */
export function createFirestoreListener() {
  let unsub = null

  return {
    // Detach any existing subscription, then attach a fresh one. Returns the
    // new unsubscribe fn (callers historically returned it for cleanup).
    attach(query, handler) {
      if (unsub) {
        unsub()
        unsub = null
      }
      unsub = onSnapshot(query, handler)
      return unsub
    },

    // Tear down the active subscription. Idempotent.
    detach() {
      if (unsub) {
        unsub()
        unsub = null
      }
    },
  }
}
