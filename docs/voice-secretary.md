# เลขา AI "พี่ใจดี" (Retell) — วิธีรันและเปิดใช้งาน

## โครงสร้าง
- `api/voice/[action].js` — Vercel entry เดียว: `status consent revoke stop resume phone schedule web-call webhook dial-due`
- `api/_voice/` — logic (`logic.js` กฎความยินยอม/ทดลอง/โควตา/เพดาน), `store.js` (Firestore transaction), `retell.js`, `handler.js`, `payments.js` (ช่องว่างรอผู้ให้บริการจ่ายเงิน)
- Client: `src/services/voiceSecretary.js`, `voiceCall.js`, `src/components/voice/VoiceSecretaryPanel.jsx` (แท็บ "พี่ใจดี" ใน Settings)
- Firestore: `voiceSecretary/{uid}` (server เขียนเท่านั้น, client อ่านของตัวเอง), `voiceGlobal/{วัน}` (ปิดทั้งหมด)

## ตัวแปร .env (ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามขึ้นต้น VITE_)
| ตัวแปร | ความหมาย |
|---|---|
| `RETELL_API_KEY` | คีย์ Retell (ห้าม commit/ห้ามพิมพ์) |
| `RETELL_AGENT_ID` | เช่น `agent_10815e6801c2626ecef1cb22ae` |
| `RETELL_FROM_NUMBER` | เบอร์โทรออก `+13192641997` |
| `TEST_PHONE_OWN` | เบอร์ของเจ้าของเอง ใช้ทดสอบโทรออก |
| `DIALING_ENABLED` | `true` เท่านั้นถึงจะโทรจริง (ค่าเริ่มต้น false) |
| `DIAL_ONLY_TEST_PHONE` | ค่าเริ่มต้น true = โทรได้เฉพาะ `TEST_PHONE_OWN`; ตั้ง `false` เมื่อเปิดโทรจริงให้นักเรียน |
| `CRON_SECRET` | ใช้ยืนยัน `POST /api/voice/dial-due` |
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account (ใน Vercel env) ให้ firebase-admin |
| `VOICE_*` | เพดาน: `VOICE_TRIAL_WEB_SECONDS` (600), `VOICE_TRIAL_WEB_SECONDS_PER_DAY` (300), `VOICE_PAID_WEB_SECONDS_PER_DAY` (900), `VOICE_WEB_CALL_SECONDS` (180), `VOICE_PHONE_CALLS_PER_DAY` (1), `VOICE_PHONE_CALL_SECONDS` (300), `VOICE_GLOBAL_DAILY_CALLS` (20), `VOICE_GLOBAL_DAILY_SECONDS` (3600) |

## รันในเครื่อง
```bash
npm run dev
```
ไม่มี `RETELL_API_KEY` = โหมดจำลอง (UI ขึ้นป้าย "โหมดทดลอง", ไม่มีเสียงจริง, ไม่หักโควตา) ใน production ที่ไม่มีคีย์ endpoint จะตอบ 503
`/api/*` ของ Vercel ต้องรันด้วย `vercel dev` (Vite dev ไม่เสิร์ฟ `/api`)

## Web Call (เปิดก่อน)
1. ใน Retell dashboard: ตั้งชื่อ agent "พี่ใจดี - เลขา AI", publish เวอร์ชันล่าสุด, ตั้ง **max call duration ≤ `VOICE_WEB_CALL_SECONDS`** (โควตาถูกจองเท่าค่านี้), ผูกเบอร์ +1 319 264-1997 ให้รับสาย/โทรออกกับ agent นี้
2. ตั้ง webhook ของ agent ไป `https://<โดเมน>/api/voice/webhook` (events: call_ended, call_analyzed)
3. (ไม่บังคับ) ให้ post-call analysis ดึง `callback_time` (HH:MM) เพื่ออัปเดตเวลาโทรกลับ
4. ตั้ง env ข้างบนใน Vercel แล้ว deploy (ต้อง HTTPS สำหรับไมค์)

## เปิดโหมดโทรจริง (ตามลำดับ ห้ามข้าม)
1. ทบทวนข้อความ PDPA/ผู้ปกครองกับผู้เชี่ยวชาญ (ดู DECISIONS.md: ผู้ใช้ <20 ปี, ช่องยินยอมแยกสำหรับเบอร์โทร)
2. ทดสอบกับเบอร์ตัวเอง: ตั้ง `TEST_PHONE_OWN`, `DIALING_ENABLED=true`; ใน Firestore ตั้ง `voiceSecretary/<uid ตัวเอง>.paid = true` (ยังไม่มีระบบจ่ายเงิน); ตั้งเวลาในแท็บ "พี่ใจดี" หรือยิง `POST /api/voice/dial-due` ด้วย `Authorization: Bearer $CRON_SECRET` และ body `{"uid":"<uid>"}` (ข้ามเวลานัด แต่ยังผ่านด่านยินยอม/โควตา/เพดาน/ช่วงเวลา 09-20)
3. ตั้งตัวเรียก `dial-due` ทุก ~15 นาที (Vercel Pro cron หรือ scheduler ภายนอก; Hobby ทำได้แค่วันละครั้ง จึงยังไม่ใส่ใน vercel.json)
4. ต่อระบบจ่ายเงินให้ตั้ง `paid` ผ่าน webhook ที่ตรวจแล้วเท่านั้น (`api/_voice/payments.js`) แล้วค่อยตั้ง `DIAL_ONLY_TEST_PHONE=false`

## ความปลอดภัยที่บังคับฝั่งเซิร์ฟเวอร์
uid มาจาก Firebase ID token เท่านั้น · ยินยอม/โควตา/เพดาน/เบอร์ ตรวจใน Firestore transaction (จองก่อน คืนส่วนเหลือตอน webhook) · webhook ตรวจลายเซ็น Retell · ไม่เก็บเสียง/ทรานสคริปต์ (เก็บเฉพาะสถานะสายและเวลานัด) · "ถอนความยินยอม" ลบเบอร์+เวลานัด · "หยุดรับสาย" มีผลทันที
